const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchWhere = search ? 'WHERE c.nombre LIKE ? OR c.numero_documento LIKE ? OR c.email LIKE ?' : '';
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM clientes c ${searchWhere}`, params);
    const [rows] = await pool.query(
      `SELECT c.* FROM clientes c ${searchWhere} ORDER BY c.nombre LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar clientes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

router.post('/', auditMiddleware('crear', 'clientes'), async (req, res) => {
  try {
    const { tipo_documento, numero_documento, nombre, email, telefono, direccion } = req.body;
    if (!numero_documento || !nombre) return res.status(400).json({ error: 'Numero documento y nombre requeridos' });
    const [result] = await pool.query(
      'INSERT INTO clientes (tipo_documento, numero_documento, nombre, email, telefono, direccion) VALUES (?, ?, ?, ?, ?, ?)',
      [tipo_documento || 'DNI', numero_documento, nombre, email, telefono, direccion]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Cliente creado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El numero de documento ya existe' });
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', auditMiddleware('actualizar', 'clientes'), async (req, res) => {
  try {
    const { tipo_documento, numero_documento, nombre, email, telefono, direccion } = req.body;
    await pool.query(
      'UPDATE clientes SET tipo_documento=?, numero_documento=?, nombre=?, email=?, telefono=?, direccion=? WHERE id=?',
      [tipo_documento, numero_documento, nombre, email, telefono, direccion, req.params.id]
    );
    res.json({ mensaje: 'Cliente actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

module.exports = router;
