const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchWhere = search ? 'WHERE (u.nombre LIKE ? OR u.email LIKE ?)' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM usuarios u ${searchWhere}`, params);
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.telefono, u.activo, u.rol_id, r.nombre as rol
       FROM usuarios u JOIN roles r ON u.rol_id = r.id ${searchWhere} ORDER BY u.nombre LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

router.get('/roles', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar roles' });
  }
});

router.post('/', authorize('super_admin'), auditMiddleware('crear', 'usuarios'), async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol_id } = req.body;
    if (!nombre || !email || !password || !rol_id) {
      return res.status(400).json({ error: 'Nombre, email, password y rol requeridos' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, telefono, rol_id) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hashedPassword, telefono, rol_id]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Usuario creado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El email ya existe' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/:id', authorize('super_admin'), auditMiddleware('actualizar', 'usuarios'), async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol_id, activo } = req.body;
    const fields = [];
    const params = [];
    if (nombre) { fields.push('nombre=?'); params.push(nombre); }
    if (email) { fields.push('email=?'); params.push(email); }
    if (telefono !== undefined) { fields.push('telefono=?'); params.push(telefono); }
    if (rol_id) { fields.push('rol_id=?'); params.push(rol_id); }
    if (activo !== undefined) { fields.push('activo=?'); params.push(activo); }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push('password=?'); params.push(hashedPassword);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Sin datos para actualizar' });
    params.push(req.params.id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id=?`, params);
    res.json({ mensaje: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

module.exports = router;
