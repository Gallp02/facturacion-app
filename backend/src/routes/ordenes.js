const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware, auditLog } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

function generarCodigo() {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OC-${fecha}-${rand}`;
}

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', estado } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    if (search) { conditions.push('(oc.codigo LIKE ? OR c.nombre LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (estado) { conditions.push('oc.estado = ?'); params.push(estado); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM ordenes_compra oc JOIN clientes c ON oc.cliente_id = c.id ${where}`, params);
    const [rows] = await pool.query(
      `SELECT oc.*, c.nombre as cliente_nombre, c.numero_documento, u.nombre as usuario_nombre
       FROM ordenes_compra oc JOIN clientes c ON oc.cliente_id = c.id JOIN usuarios u ON oc.usuario_id = u.id
       ${where} ORDER BY oc.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar ordenes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [ordenes] = await pool.query(
      `SELECT oc.*, c.nombre as cliente_nombre, c.numero_documento, c.direccion, u.nombre as usuario_nombre
       FROM ordenes_compra oc JOIN clientes c ON oc.cliente_id = c.id JOIN usuarios u ON oc.usuario_id = u.id WHERE oc.id = ?`,
      [req.params.id]
    );
    if (ordenes.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    const [detalle] = await pool.query(
      `SELECT d.*, p.nombre as producto_nombre, p.codigo as producto_codigo
       FROM detalle_orden d JOIN productos p ON d.producto_id = p.id WHERE d.orden_id = ?`,
      [req.params.id]
    );
    res.json({ ...ordenes[0], detalle });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener orden' });
  }
});

router.post('/', auditMiddleware('crear', 'ordenes_compra'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { cliente_id, items, notas } = req.body;
    if (!cliente_id || !items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cliente y items requeridos' });
    }
    let subtotal = 0;
    for (const item of items) {
      const [productos] = await connection.query(
        'SELECT id, precio_venta, igv, nombre FROM productos WHERE id = ? AND activo = 1 FOR UPDATE',
        [item.producto_id]
      );
      if (productos.length === 0) { await connection.rollback(); return res.status(400).json({ error: `Producto ID ${item.producto_id} no encontrado` }); }
      const nom = productos[0].nombre || 'ID ' + item.producto_id;
      const almacenId = item.almacen_id || 1;
      const cajas = item.cajas || 0;
      const unitario = item.unitario || 0;
      const cantidad = cajas + unitario;

      // Check stock in producto_almacen
      const [pa] = await connection.query(
        'SELECT stock_cajas, stock_unitario FROM producto_almacen WHERE producto_id = ? AND almacen_id = ? FOR UPDATE',
        [item.producto_id, almacenId]
      );
      if (pa.length === 0) { await connection.rollback(); return res.status(400).json({ error: `Producto ${nom} sin stock en almacen seleccionado` }); }
      if (pa[0].stock_cajas < cajas) { await connection.rollback(); return res.status(400).json({ error: `Stock insuficiente de cajas para ${nom}` }); }
      if (pa[0].stock_unitario < unitario) { await connection.rollback(); return res.status(400).json({ error: `Stock insuficiente de unidades para ${nom}` }); }

      item.precio = parseFloat(productos[0].precio_venta);
      item.subtotal = item.precio * cantidad;
      item.cantidad_total = cantidad;
      subtotal += item.subtotal;
    }
    const igvPorcentaje = 0.18;
    const igv = subtotal * igvPorcentaje;
    const total = subtotal + igv;
    const codigo = generarCodigo();
    const usuarioId = req.usuario.id;

    const [ordenResult] = await connection.query(
      'INSERT INTO ordenes_compra (codigo, cliente_id, usuario_id, subtotal, igv, total, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [codigo, cliente_id, usuarioId, subtotal, igv, total, notas]
    );
    const ordenId = ordenResult.insertId;

    for (const item of items) {
      const almacenId = item.almacen_id || 1;
      const cajas = item.cajas || 0;
      const unitario = item.unitario || 0;
      const cantidad = item.cantidad_total;

      await connection.query(
        'INSERT INTO detalle_orden (orden_id, producto_id, cantidad, precio_unitario, subtotal, almacen_id, cajas, unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [ordenId, item.producto_id, cantidad, item.precio, item.subtotal, almacenId, cajas, unitario]
      );

      // Deduct from producto_almacen
      await connection.query(
        'UPDATE producto_almacen SET stock_cajas = stock_cajas - ?, stock_unitario = stock_unitario - ? WHERE producto_id = ? AND almacen_id = ?',
        [cajas, unitario, item.producto_id, almacenId]
      );

      // Also update total stock in productos table for backward compat
      await connection.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [cantidad, item.producto_id]
      );

      await connection.query(
        'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id, almacen_id, cajas, unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.producto_id, 'salida', cantidad, 0, 0, `Orden: ${codigo}`, usuarioId, almacenId, cajas, unitario]
      );
    }
    await connection.commit();
    res.status(201).json({ id: ordenId, codigo, mensaje: 'Orden creada y stock actualizado' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Error al crear orden' });
  } finally {
    connection.release();
  }
});

router.put('/:id/estado', authorize('super_admin', 'admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { estado } = req.body;
    const nuevoEstado = estado;
    if (!['pendiente', 'aprobada', 'completada', 'anulada'].includes(nuevoEstado)) {
      await connection.rollback(); connection.release();
      return res.status(400).json({ error: 'Estado invalido' });
    }
    const [ordenes] = await connection.query('SELECT estado FROM ordenes_compra WHERE id = ?', [req.params.id]);
    if (ordenes.length === 0) { await connection.rollback(); connection.release(); return res.status(404).json({ error: 'Orden no encontrada' }); }
    const estadoAnterior = ordenes[0].estado;

    await connection.beginTransaction();

    if (nuevoEstado === 'anulada' && estadoAnterior !== 'anulada') {
      const [detalle] = await connection.query(
        'SELECT producto_id, cantidad, almacen_id, cajas, unitario FROM detalle_orden WHERE orden_id = ?', [req.params.id]
      );
      for (const d of detalle) {
        const almacenId = d.almacen_id || 1;
        const cajas = d.cajas || 0;
        const unitario = d.unitario || 0;
        const cantidad = d.cantidad;

        await connection.query(
          'UPDATE producto_almacen SET stock_cajas = stock_cajas + ?, stock_unitario = stock_unitario + ? WHERE producto_id = ? AND almacen_id = ?',
          [cajas, unitario, d.producto_id, almacenId]
        );
        const [prod] = await connection.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [d.producto_id]);
        const stockNuevo = prod[0].stock + cantidad;
        await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [stockNuevo, d.producto_id]);
        await connection.query(
          'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id, almacen_id, cajas, unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [d.producto_id, 'entrada', cantidad, prod[0].stock, stockNuevo, `Anulacion Orden: ${req.params.id}`, req.usuario.id, almacenId, cajas, unitario]
        );
      }
    }

    await connection.query('UPDATE ordenes_compra SET estado = ? WHERE id = ?', [nuevoEstado, req.params.id]);
    await connection.commit();
    if (req.usuario) {
      await auditLog(req.usuario.id, req.usuario.nombre, 'cambiar_estado', 'ordenes_compra', parseInt(req.params.id), { estado: nuevoEstado, estado_anterior: estadoAnterior });
    }
    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Error al actualizar estado' });
  } finally {
    connection.release();
  }
});

module.exports = router;
