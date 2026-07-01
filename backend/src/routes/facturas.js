const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { generateFacturaPDF } = require('../utils/pdfGenerator');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchWhere = search ? 'AND (f.numero_completo LIKE ? OR c.nombre LIKE ?)' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE 1=1 ${searchWhere}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT f.*, c.nombre as cliente_nombre, c.numero_documento, oc.codigo as orden_codigo, e.razon_social as empresa_razon_social, e.ruc as empresa_ruc
       FROM facturas f JOIN clientes c ON f.cliente_id = c.id LEFT JOIN ordenes_compra oc ON f.orden_id = oc.id LEFT JOIN empresas e ON f.empresa_id = e.id
       WHERE 1=1 ${searchWhere} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, total: count[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar facturas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, c.nombre as cliente_nombre, c.numero_documento, c.direccion, oc.codigo as orden_codigo,
              e.razon_social as empresa_razon_social, e.ruc as empresa_ruc
       FROM facturas f JOIN clientes c ON f.cliente_id = c.id
       LEFT JOIN ordenes_compra oc ON f.orden_id = oc.id
       LEFT JOIN empresas e ON f.empresa_id = e.id WHERE f.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

router.post('/', auditMiddleware('emitir', 'facturas'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { orden_id, cliente_id, tipo, empresa_id, subtotal, igv, total } = req.body;
    if (!cliente_id || !tipo) {
      await connection.rollback(); return res.status(400).json({ error: 'Cliente y tipo requeridos' });
    }
    const empId = empresa_id || 1;
    let orden = null;
    if (orden_id) {
      const [ordenes] = await connection.query(
        'SELECT * FROM ordenes_compra WHERE id = ? AND estado != "anulada"', [orden_id]
      );
      if (ordenes.length === 0) { await connection.rollback(); return res.status(400).json({ error: 'Orden no encontrada o anulada' }); }
      orden = ordenes[0];
    }
    const [empresaRows] = await connection.query('SELECT * FROM empresas WHERE id = ?', [empId]);
    if (empresaRows.length === 0) { await connection.rollback(); return res.status(400).json({ error: 'Empresa no encontrada' }); }
    const empresa = empresaRows[0];
    const serieKey = tipo === 'boleta' ? 'serie_boleta' : 'serie_factura';
    const correlativoKey = tipo === 'boleta' ? 'correlativo_boleta' : 'correlativo_factura';
    const serie = empresa[serieKey];
    const correlativo = empresa[correlativoKey];
    const st = orden ? orden.subtotal : parseFloat(subtotal);
    const igvVal = orden ? orden.igv : parseFloat(igv) || 0;
    const tt = orden ? orden.total : parseFloat(total);
    if (!orden && (isNaN(st) || isNaN(tt) || st <= 0 || tt <= 0)) {
      await connection.rollback(); return res.status(400).json({ error: 'Subtotal y total deben ser numeros validos (>0)' });
    }

    const [result] = await connection.query(
      `INSERT INTO facturas (serie, correlativo, orden_id, cliente_id, empresa_id, tipo, subtotal, igv, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [serie, correlativo, orden_id || null, cliente_id, empId, tipo, st, igvVal, tt]
    );
    await connection.query(`UPDATE empresas SET ${correlativoKey} = ? WHERE id = ?`, [correlativo + 1, empId]);
    if (orden_id) {
      await connection.query('UPDATE ordenes_compra SET estado = "completada" WHERE id = ?', [orden_id]);
    }
    await connection.commit();
    res.status(201).json({
      id: result.insertId,
      numero: `${serie}-${String(correlativo).padStart(8, '0')}`,
      empresa_id: empId,
      empresa_razon_social: empresa.razon_social,
      mensaje: 'Factura emitida correctamente'
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Error al emitir factura' });
  } finally {
    connection.release();
  }
});

router.put('/:id/estado-sunat', authorize('super_admin', 'admin'), auditMiddleware('actualizar_estado_sunat', 'facturas'), async (req, res) => {
  try {
    const { estado_sunat, cdr_xml } = req.body;
    if (!['pendiente', 'enviado', 'aceptado', 'rechazado'].includes(estado_sunat)) {
      return res.status(400).json({ error: 'Estado SUNAT invalido' });
    }
    await pool.query('UPDATE facturas SET estado_sunat = ?, cdr_xml = ? WHERE id = ?', [estado_sunat, cdr_xml || null, req.params.id]);
    res.json({ mensaje: 'Estado SUNAT actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado SUNAT' });
  }
});

// GET /:id/pdf - Generar PDF de factura
router.get('/:id/pdf', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, c.nombre as cliente_nombre, c.numero_documento, c.tipo_documento, c.direccion as cliente_direccion,
              e.razon_social as empresa_razon_social, e.ruc as empresa_ruc, e.direccion as empresa_direccion,
              e.telefono, e.email, e.web, e.banco_nombre, e.banco_tipo_cuenta, e.banco_numero_cuenta, e.banco_cci,
              e.yape, oc.codigo as orden_codigo, oc.notas
       FROM facturas f
       JOIN clientes c ON f.cliente_id = c.id
       LEFT JOIN ordenes_compra oc ON f.orden_id = oc.id
       LEFT JOIN empresas e ON f.empresa_id = e.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    const factura = rows[0];

    let items = [];
    if (factura.orden_id) {
      const [detalle] = await pool.query(
        `SELECT do.*, p.codigo, p.nombre, p.descripcion
         FROM detalle_orden do
         JOIN productos p ON do.producto_id = p.id
         WHERE do.orden_id = ?`,
        [factura.orden_id]
      );
      items = detalle;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.numero_completo}.pdf"`);
    const doc = generateFacturaPDF(factura, items);
    doc.pipe(res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

module.exports = router;
