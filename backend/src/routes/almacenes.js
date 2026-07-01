const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM almacenes WHERE activo = 1 ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar almacenes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM almacenes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Almacen no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener almacen' });
  }
});

router.post('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { nombre, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO almacenes (nombre, direccion) VALUES (?, ?)', [nombre, direccion || null]);
    res.status(201).json({ id: result.insertId, mensaje: 'Almacen creado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El nombre ya existe' });
    res.status(500).json({ error: 'Error al crear almacen' });
  }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { nombre, direccion, activo } = req.body;
    await pool.query('UPDATE almacenes SET nombre = ?, direccion = ?, activo = ? WHERE id = ?',
      [nombre, direccion, activo !== undefined ? activo : true, req.params.id]);
    res.json({ mensaje: 'Almacen actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar almacen' });
  }
});

// GET stock de un producto en todos los almacenes
router.get('/producto/:productoId/stock', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pa.*, a.nombre as almacen_nombre
       FROM producto_almacen pa
       JOIN almacenes a ON pa.almacen_id = a.id
       WHERE pa.producto_id = ? AND a.activo = 1
       ORDER BY a.nombre`,
      [req.params.productoId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar stock' });
  }
});

// PUT stock de un producto en un almacen (ajuste manual)
router.put('/producto/:productoId/stock', authorize('super_admin', 'admin', 'almacen'), async (req, res) => {
  try {
    const { almacen_id, stock_cajas, stock_unitario } = req.body;
    if (!almacen_id) return res.status(400).json({ error: 'almacen_id requerido' });
    await pool.query(
      'INSERT INTO producto_almacen (producto_id, almacen_id, stock_cajas, stock_unitario) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE stock_cajas = ?, stock_unitario = ?',
      [req.params.productoId, almacen_id, stock_cajas || 0, stock_unitario || 0, stock_cajas || 0, stock_unitario || 0]
    );
    res.json({ mensaje: 'Stock actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

module.exports = router;
