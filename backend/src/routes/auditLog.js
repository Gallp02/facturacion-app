const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', accion, tabla, usuario_id, desde, hasta } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(a.usuario_nombre LIKE ? OR a.detalle LIKE ? OR a.tabla LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (accion) { conditions.push('a.accion = ?'); params.push(accion); }
    if (tabla) { conditions.push('a.tabla = ?'); params.push(tabla); }
    if (usuario_id) { conditions.push('a.usuario_id = ?'); params.push(usuario_id); }
    if (desde) { conditions.push('a.created_at >= ?'); params.push(desde); }
    if (hasta) { conditions.push('a.created_at <= ?'); params.push(hasta + ' 23:59:59'); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM audit_log a ${where}`, params);
    const [rows] = await pool.query(
      `SELECT a.* FROM audit_log a ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar auditoria' });
  }
});

router.get('/resumen', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [acciones] = await pool.query(
      `SELECT accion, COUNT(*) as total FROM audit_log GROUP BY accion ORDER BY total DESC`
    );
    const [tablas] = await pool.query(
      `SELECT tabla, COUNT(*) as total FROM audit_log GROUP BY tabla ORDER BY total DESC`
    );
    const [usuarios] = await pool.query(
      `SELECT usuario_nombre, COUNT(*) as total FROM audit_log GROUP BY usuario_nombre ORDER BY total DESC LIMIT 10`
    );
    const [hoy] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_log WHERE DATE(created_at) = CURDATE()`
    );
    res.json({ acciones, tablas, usuarios, hoy: hoy[0].total });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen de auditoria' });
  }
});

module.exports = router;
