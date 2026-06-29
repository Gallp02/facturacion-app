const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [ventasHoy] = await pool.query(
      `SELECT COUNT(*) as total_ordenes, COALESCE(SUM(total), 0) as total_ventas
       FROM ordenes_compra WHERE DATE(created_at) = CURDATE()`
    );

    const [productosBajoStock] = await pool.query(
      'SELECT COUNT(*) as total FROM productos WHERE activo = 1 AND stock <= stock_minimo'
    );

    const [ordenesPendientes] = await pool.query(
      "SELECT COUNT(*) as total FROM ordenes_compra WHERE estado = 'pendiente'"
    );

    const [clientes] = await pool.query('SELECT COUNT(*) as total FROM clientes');

    const [ventasPorDia] = await pool.query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as ordenes, SUM(total) as total
       FROM ordenes_compra
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY fecha`
    );

    res.json({
      ventas_hoy: ventasHoy[0],
      productos_bajo_stock: productosBajoStock[0].total,
      ordenes_pendientes: ordenesPendientes[0].total,
      total_clientes: clientes[0].total,
      ventas_ultimos_7_dias: ventasPorDia
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar dashboard' });
  }
});

router.get('/ordenes-por-usuario', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.nombre, u.email, COUNT(oc.id) as total_ordenes,
              COALESCE(SUM(oc.total), 0) as total_ventas
       FROM usuarios u
       LEFT JOIN ordenes_compra oc ON u.id = oc.usuario_id
       WHERE u.activo = 1
       GROUP BY u.id, u.nombre, u.email
       ORDER BY total_ordenes DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

router.get('/ventas-por-categoria', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cat.nombre as name, COALESCE(SUM(d.subtotal), 0) as value
       FROM detalle_orden d
       JOIN productos p ON d.producto_id = p.id
       JOIN categorias cat ON p.categoria_id = cat.id
       JOIN ordenes_compra oc ON d.orden_id = oc.id
       WHERE oc.estado != 'anulada'
       GROUP BY cat.id, cat.nombre
       ORDER BY value DESC`
    );
    const total = rows.reduce((s, r) => s + parseFloat(r.value), 0);
    res.json(rows.map(r => ({ ...r, value: parseFloat(r.value), percentage: total > 0 ? Math.round((parseFloat(r.value) / total) * 100) : 0 })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas por categoria' });
  }
});

router.get('/estado-ordenes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT estado, COUNT(*) as value
       FROM ordenes_compra
       GROUP BY estado
       ORDER BY value DESC`
    );
    const labels = { pendiente: 'Pendiente', aprobada: 'Aprobada', completada: 'Completada', anulada: 'Anulada' };
    res.json(rows.map(r => ({ name: labels[r.estado] || r.estado, value: Number(r.value) })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estado de ordenes' });
  }
});

router.get('/top-productos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.nombre as name, CAST(SUM(d.cantidad) AS UNSIGNED) as value
       FROM detalle_orden d
       JOIN productos p ON d.producto_id = p.id
       JOIN ordenes_compra oc ON d.orden_id = oc.id
       WHERE oc.estado != 'anulada'
       GROUP BY p.id, p.nombre
       ORDER BY value DESC
       LIMIT 5`
    );
    res.json(rows.map(r => ({ ...r, value: Number(r.value) })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener top productos' });
  }
});

router.get('/tipo-factura', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tipo as name, COUNT(*) as value
       FROM facturas
       GROUP BY tipo
       ORDER BY value DESC`
    );
    res.json(rows.map(r => ({ ...r, value: Number(r.value) })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipo de facturas' });
  }
});

router.get('/movimientos-stock', authorize('super_admin', 'admin', 'almacen'), async (req, res) => {
  try {
    const { producto_id, desde, hasta } = req.query;
    let query = `
      SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
             u.nombre as usuario_nombre
      FROM movimientos_stock m
      JOIN productos p ON m.producto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1`;
    const params = [];

    if (producto_id) { query += ' AND m.producto_id = ?'; params.push(producto_id); }
    if (desde) { query += ' AND m.created_at >= ?'; params.push(desde); }
    if (hasta) { query += ' AND m.created_at <= ?'; params.push(hasta); }

    query += ' ORDER BY m.created_at DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte de movimientos' });
  }
});

module.exports = router;
