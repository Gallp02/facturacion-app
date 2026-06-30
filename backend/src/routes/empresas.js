const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM empresas ORDER BY razon_social');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

router.get('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM empresas WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

router.post('/', authorize('super_admin'), auditMiddleware('crear', 'empresas'), async (req, res) => {
  try {
    const { ruc, razon_social, direccion, serie_boleta, serie_factura } = req.body;
    if (!ruc || !razon_social) return res.status(400).json({ error: 'RUC y razon social requeridos' });
    const [result] = await pool.query(
      'INSERT INTO empresas (ruc, razon_social, direccion, serie_boleta, serie_factura) VALUES (?, ?, ?, ?, ?)',
      [ruc, razon_social, direccion, serie_boleta || 'B001', serie_factura || 'F001']
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Empresa creada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

router.put('/:id', authorize('super_admin'), auditMiddleware('actualizar', 'empresas'), async (req, res) => {
  try {
    const { ruc, razon_social, direccion, serie_boleta, serie_factura, correlativo_boleta, correlativo_factura, activa } = req.body;
    const fields = []; const params = [];
    if (ruc !== undefined) { fields.push('ruc=?'); params.push(ruc); }
    if (razon_social !== undefined) { fields.push('razon_social=?'); params.push(razon_social); }
    if (direccion !== undefined) { fields.push('direccion=?'); params.push(direccion); }
    if (serie_boleta !== undefined) { fields.push('serie_boleta=?'); params.push(serie_boleta); }
    if (serie_factura !== undefined) { fields.push('serie_factura=?'); params.push(serie_factura); }
    if (correlativo_boleta !== undefined) { fields.push('correlativo_boleta=?'); params.push(correlativo_boleta); }
    if (correlativo_factura !== undefined) { fields.push('correlativo_factura=?'); params.push(correlativo_factura); }
    if (activa !== undefined) { fields.push('activa=?'); params.push(activa); }
    if (fields.length === 0) return res.status(400).json({ error: 'Sin datos para actualizar' });
    params.push(req.params.id);
    await pool.query(`UPDATE empresas SET ${fields.join(', ')} WHERE id=?`, params);
    res.json({ mensaje: 'Empresa actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

module.exports = router;
