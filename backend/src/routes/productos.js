const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchWhere = search ? 'AND (p.nombre LIKE ? OR p.codigo LIKE ?)' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM productos p WHERE p.activo = 1 ${searchWhere}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.activo = 1 ${searchWhere}
       ORDER BY p.nombre LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre 
       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

router.post('/', auditMiddleware('crear', 'productos'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, categoria_id, precio_venta, precio_compra, stock, stock_minimo, igv } = req.body;
    if (!codigo || !nombre || !precio_venta) {
      return res.status(400).json({ error: 'Codigo, nombre y precio venta requeridos' });
    }
    const [result] = await pool.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_venta, precio_compra, stock, stock_minimo, igv) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion, categoria_id || null, precio_venta, precio_compra || null, stock || 0, stock_minimo || 5, igv !== false]
    );
    if (stock > 0) {
      await pool.query(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial', ?)`,
        [result.insertId, stock, stock, req.usuario.id]
      );
    }
    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El codigo ya existe' });
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', auditMiddleware('actualizar', 'productos'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, categoria_id, precio_venta, precio_compra, stock_minimo, igv, activo, stock } = req.body;
    const [actual] = await pool.query('SELECT stock FROM productos WHERE id = ?', [req.params.id]);
    await pool.query(
      `UPDATE productos SET codigo=?, nombre=?, descripcion=?, categoria_id=?, precio_venta=?, precio_compra=?, stock_minimo=?, igv=?, activo=?, stock=? WHERE id=?`,
      [codigo, nombre, descripcion, categoria_id, precio_venta, precio_compra, stock_minimo, igv, activo, stock, req.params.id]
    );
    if (actual.length > 0 && stock !== undefined && parseInt(stock) !== actual[0].stock) {
      const diff = parseInt(stock) - actual[0].stock;
      await pool.query(
        'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, diff > 0 ? 'entrada' : 'salida', Math.abs(diff), actual[0].stock, parseInt(stock), 'Ajuste manual', req.usuario.id]
      );
    }
    res.json({ mensaje: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.get('/categorias/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar categorias' });
  }
});

router.get('/stock/bajo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre 
       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.activo = 1 AND p.stock <= p.stock_minimo ORDER BY p.stock ASC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar stock bajo' });
  }
});

module.exports = router;
