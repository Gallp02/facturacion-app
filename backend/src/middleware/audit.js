const pool = require('../config/database');

async function auditLog(usuarioId, usuarioNombre, accion, tabla, registroId = null, detalle = null) {
  try {
    await pool.query(
      'INSERT INTO audit_log (usuario_id, usuario_nombre, accion, tabla, registro_id, detalle) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, usuarioNombre, accion, tabla, registroId, detalle ? JSON.stringify(detalle) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

function auditMiddleware(accion, tabla) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.usuario) {
        const registroId = body?.id || req.params?.id || null;
        auditLog(
          req.usuario.id,
          req.usuario.nombre,
          accion,
          tabla,
          registroId,
          { body: req.body, params: req.params }
        );
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog, auditMiddleware };
