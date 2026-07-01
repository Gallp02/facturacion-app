const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'almacen'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', tipo, producto_id, usuario_id, desde, hasta } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(p.nombre LIKE ? OR p.codigo LIKE ? OR u.nombre LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (tipo) { conditions.push('m.tipo = ?'); params.push(tipo); }
    if (producto_id) { conditions.push('m.producto_id = ?'); params.push(producto_id); }
    if (usuario_id) { conditions.push('m.usuario_id = ?'); params.push(usuario_id); }
    if (desde) { conditions.push('m.created_at >= ?'); params.push(desde); }
    if (hasta) { conditions.push('m.created_at <= ?'); params.push(hasta + ' 23:59:59'); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM movimientos_stock m JOIN productos p ON m.producto_id = p.id JOIN usuarios u ON m.usuario_id = u.id ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo, u.nombre as usuario_nombre, a.nombre as almacen_nombre
       FROM movimientos_stock m JOIN productos p ON m.producto_id = p.id JOIN usuarios u ON m.usuario_id = u.id LEFT JOIN almacenes a ON m.almacen_id = a.id
       ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar movimientos de stock' });
  }
});

router.get('/by-producto/:productoId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.nombre as usuario_nombre
       FROM movimientos_stock m JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.producto_id = ? ORDER BY m.created_at DESC LIMIT 100`,
      [req.params.productoId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos del producto' });
  }
});

router.post('/', authorize('super_admin', 'admin', 'almacen'), async (req, res) => {
  try {
    const { producto_id, tipo, cantidad, referencia, almacen_id, cajas, unitario } = req.body;
    if (!producto_id || !tipo || !cantidad) {
      return res.status(400).json({ error: 'Producto, tipo y cantidad requeridos' });
    }
    if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo invalido. Use: entrada, salida, ajuste' });
    }

    const [productos] = await pool.query('SELECT id, stock, nombre FROM productos WHERE id = ? AND activo = 1', [producto_id]);
    if (productos.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const cant = parseInt(cantidad);
    if (cant <= 0) return res.status(400).json({ error: 'Cantidad debe ser mayor a 0' });

    const almacenId = almacen_id || 1;
    const c = parseInt(cajas) || 0;
    const u = parseInt(unitario) || 0;

    // Update producto_almacen
    const [pa] = await pool.query('SELECT stock_cajas, stock_unitario FROM producto_almacen WHERE producto_id = ? AND almacen_id = ?', [producto_id, almacenId]);
    if (pa.length === 0) {
      await pool.query('INSERT INTO producto_almacen (producto_id, almacen_id, stock_cajas, stock_unitario) VALUES (?, ?, ?, ?)', [producto_id, almacenId, 0, 0]);
    }

    if (tipo === 'entrada') {
      await pool.query('UPDATE producto_almacen SET stock_cajas = stock_cajas + ?, stock_unitario = stock_unitario + ? WHERE producto_id = ? AND almacen_id = ?', [c, u, producto_id, almacenId]);
    } else if (tipo === 'salida') {
      const [pa2] = await pool.query('SELECT stock_cajas, stock_unitario FROM producto_almacen WHERE producto_id = ? AND almacen_id = ?', [producto_id, almacenId]);
      if (pa2[0].stock_cajas < c) return res.status(400).json({ error: `Stock insuficiente de cajas. Actual: ${pa2[0].stock_cajas}` });
      if (pa2[0].stock_unitario < u) return res.status(400).json({ error: `Stock insuficiente de unidades. Actual: ${pa2[0].stock_unitario}` });
      await pool.query('UPDATE producto_almacen SET stock_cajas = stock_cajas - ?, stock_unitario = stock_unitario - ? WHERE producto_id = ? AND almacen_id = ?', [c, u, producto_id, almacenId]);
    } else {
      // ajuste: positive adds, negative subtracts
      if (c >= 0) {
        await pool.query('UPDATE producto_almacen SET stock_cajas = stock_cajas + ? WHERE producto_id = ? AND almacen_id = ?', [c, producto_id, almacenId]);
      } else {
        await pool.query('UPDATE producto_almacen SET stock_cajas = stock_cajas - ? WHERE producto_id = ? AND almacen_id = ?', [Math.abs(c), producto_id, almacenId]);
      }
      if (u >= 0) {
        await pool.query('UPDATE producto_almacen SET stock_unitario = stock_unitario + ? WHERE producto_id = ? AND almacen_id = ?', [u, producto_id, almacenId]);
      } else {
        await pool.query('UPDATE producto_almacen SET stock_unitario = stock_unitario - ? WHERE producto_id = ? AND almacen_id = ?', [Math.abs(u), producto_id, almacenId]);
      }
    }

    const stockAnterior = productos[0].stock;
    let stockNuevo;
    if (tipo === 'entrada') {
      stockNuevo = stockAnterior + cant;
    } else if (tipo === 'salida') {
      if (stockAnterior < cant) return res.status(400).json({ error: `Stock insuficiente. Actual: ${stockAnterior}` });
      stockNuevo = stockAnterior - cant;
    } else {
      stockNuevo = stockAnterior + cant;
    }

    await pool.query('UPDATE productos SET stock = ? WHERE id = ?', [stockNuevo, producto_id]);
    const [result] = await pool.query(
      'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id, almacen_id, cajas, unitario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [producto_id, tipo, cant, stockAnterior, stockNuevo, referencia || `Ajuste manual (${tipo})`, req.usuario.id, almacenId, c, u]
    );

    if (req.usuario) {
      await auditLog(req.usuario.id, req.usuario.nombre, 'crear_movimiento_stock', 'movimientos_stock', result.insertId, { producto_id, tipo, cantidad, stock_anterior: stockAnterior, stock_nuevo: stockNuevo, almacen_id: almacenId, cajas: c, unitario: u });
    }

    res.status(201).json({ id: result.insertId, mensaje: 'Movimiento registrado', stock_nuevo: stockNuevo });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
});

module.exports = router;
