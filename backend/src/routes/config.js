const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM configuracion ORDER BY clave');
    const config = {};
    rows.forEach(row => { config[row.clave] = row.valor; });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
});

router.put('/', authorize('super_admin'), auditMiddleware('actualizar', 'configuracion'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [clave, valor] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
        [clave, valor, valor]
      );
    }
    res.json({ mensaje: 'Configuracion actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuracion' });
  }
});

module.exports = router;
