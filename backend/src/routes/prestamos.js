const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchWhere = search
      ? 'WHERE c.nombre LIKE ? OR c.apodo LIKE ? OR c.numero_documento LIKE ? OR p.numero_origen LIKE ?'
      : '';
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];

    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM prestamos p JOIN clientes c ON c.id = p.cliente_id ${searchWhere}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.numero_documento as cliente_doc, c.apodo as cliente_apodo,
        (SELECT COUNT(*) FROM cuotas_prestamo WHERE prestamo_id = p.id AND estado = 'vencido') as cuotas_vencidas,
        (SELECT COUNT(*) FROM cuotas_prestamo WHERE prestamo_id = p.id AND estado = 'pendiente') as cuotas_pendientes
       FROM prestamos p
       JOIN clientes c ON c.id = p.cliente_id
       ${searchWhere}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar prestamos' });
  }
});

router.get('/alertas', async (req, res) => {
  try {
    const [vencidas] = await pool.query(
      `SELECT cp.id, cp.fecha_vencimiento, cp.monto, cp.estado,
              p.id as prestamo_id, p.numero_origen, p.monto_total,
              c.nombre as cliente_nombre, c.apodo as cliente_apodo, c.numero_documento as cliente_doc
       FROM cuotas_prestamo cp
       JOIN prestamos p ON p.id = cp.prestamo_id
       JOIN clientes c ON c.id = p.cliente_id
       WHERE cp.estado = 'pendiente' AND cp.fecha_vencimiento <= CURDATE()
       ORDER BY cp.fecha_vencimiento ASC`
    );
    const [proximas] = await pool.query(
      `SELECT cp.id, cp.fecha_vencimiento, cp.monto, cp.estado,
              p.id as prestamo_id, p.numero_origen, p.monto_total,
              c.nombre as cliente_nombre, c.apodo as cliente_apodo, c.numero_documento as cliente_doc
       FROM cuotas_prestamo cp
       JOIN prestamos p ON p.id = cp.prestamo_id
       JOIN clientes c ON c.id = p.cliente_id
       WHERE cp.estado = 'pendiente' AND cp.fecha_vencimiento > CURDATE() AND cp.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY cp.fecha_vencimiento ASC`
    );
    res.json({ vencidas, proximas, total_vencidas: vencidas.length, total_proximas: proximas.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [prestamos] = await pool.query(
      `SELECT p.*, c.nombre as cliente_nombre, c.numero_documento as cliente_doc, c.apodo as cliente_apodo
       FROM prestamos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
      [req.params.id]
    );
    if (prestamos.length === 0) return res.status(404).json({ error: 'Prestamo no encontrado' });
    const [cuotas] = await pool.query(
      'SELECT * FROM cuotas_prestamo WHERE prestamo_id = ? ORDER BY numero ASC',
      [req.params.id]
    );
    res.json({ ...prestamos[0], cuotas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener prestamo' });
  }
});

router.post('/', auditMiddleware('crear', 'prestamos'), async (req, res) => {
  try {
    const { cliente_id, monto_total, numero_origen, cuotas, fecha_inicio, cuotas_data } = req.body;
    if (!cliente_id || !monto_total || !numero_origen || !cuotas || !fecha_inicio) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const montoCuota = Math.round((parseFloat(monto_total) / parseInt(cuotas)) * 100) / 100;

    let fechaFin;
    if (cuotas_data && cuotas_data.length > 0) {
      fechaFin = cuotas_data[cuotas_data.length - 1].fecha_vencimiento;
    } else {
      const f = new Date(fecha_inicio);
      f.setMonth(f.getMonth() + parseInt(cuotas) - 1);
      fechaFin = f.toISOString().split('T')[0];
    }

    const [result] = await pool.query(
      'INSERT INTO prestamos (cliente_id, monto_total, numero_origen, cuotas, monto_cuota, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cliente_id, monto_total, numero_origen, parseInt(cuotas), montoCuota, fecha_inicio, fechaFin]
    );
    const prestamoId = result.insertId;

    if (cuotas_data && cuotas_data.length > 0) {
      for (let i = 0; i < cuotas_data.length; i++) {
        await pool.query(
          'INSERT INTO cuotas_prestamo (prestamo_id, numero, fecha_vencimiento, monto) VALUES (?, ?, ?, ?)',
          [prestamoId, i + 1, cuotas_data[i].fecha_vencimiento, cuotas_data[i].monto]
        );
      }
    } else {
      const diff = Math.round((parseFloat(monto_total) - montoCuota * parseInt(cuotas)) * 100) / 100;
      for (let i = 1; i <= parseInt(cuotas); i++) {
        const fecha = new Date(fecha_inicio);
        fecha.setMonth(fecha.getMonth() + i - 1);
        const fec = fecha.toISOString().split('T')[0];
        const monto = i === parseInt(cuotas) ? Math.round((montoCuota + diff) * 100) / 100 : montoCuota;
        await pool.query(
          'INSERT INTO cuotas_prestamo (prestamo_id, numero, fecha_vencimiento, monto) VALUES (?, ?, ?, ?)',
          [prestamoId, i, fec, monto]
        );
      }
    }

    res.status(201).json({ id: prestamoId, mensaje: 'Prestamo creado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear prestamo' });
  }
});

router.put('/:id/cuotas/:cuotaId/pagar', auditMiddleware('pagar', 'prestamos'), async (req, res) => {
  try {
    const { fecha_pago } = req.body;
    await pool.query(
      "UPDATE cuotas_prestamo SET estado = 'pagado', fecha_pago = ? WHERE id = ? AND prestamo_id = ?",
      [fecha_pago || new Date().toISOString().split('T')[0], req.params.cuotaId, req.params.id]
    );

    const [pendientes] = await pool.query(
      'SELECT COUNT(*) as cnt FROM cuotas_prestamo WHERE prestamo_id = ? AND estado != ?',
      [req.params.id, 'pagado']
    );

    if (pendientes[0].cnt === 0) {
      await pool.query("UPDATE prestamos SET estado = 'pagado' WHERE id = ?", [req.params.id]);
    }

    res.json({ mensaje: 'Cuota pagada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al pagar cuota' });
  }
});

module.exports = router;
