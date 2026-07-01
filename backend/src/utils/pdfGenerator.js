const PDFDocument = require('pdfkit');
const path = require('path');
const { numeroALetras } = require('./numeroALetras');

function generateFacturaPDF(factura, items) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
  const left = 40;
  const right = 555;
  const contentW = right - left;

  let y = 30;

  // ===================== HEADER BLOCK =====================
  // Logo (left side, top)
  try {
    const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
    doc.image(logoPath, left, y, { width: 90 });
  } catch (e) { }

  // Document type + series-number (top right)
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#000');
  doc.text('FACTURA ELECTRÓNICA', right - 200, y, { width: 200, align: 'right' });
  doc.fontSize(11).font('Helvetica');
  doc.text(factura.numero_completo, right - 200, y + 18, { width: 200, align: 'right' });

  // YAPE
  if (factura.yape) {
    doc.fontSize(8).font('Helvetica');
    doc.text(`YAPE: ${factura.yape}`, right - 200, y + 36, { width: 200, align: 'right' });
  }

  // Company info (below logo)
  const companyY = y + 100;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
  doc.text(factura.empresa_razon_social || '', left, companyY);
  doc.fontSize(9).font('Helvetica');
  let cy = companyY + 15;
  doc.text(`R.U.C. ${factura.empresa_ruc || ''}`, left, cy); cy += 14;
  if (factura.empresa_direccion) {
    doc.text(factura.empresa_direccion, left, cy, { width: contentW * 0.5 }); cy += 14;
  }
  if (factura.telefono) {
    doc.text(`Tel: ${factura.telefono}`, left, cy); cy += 12;
  }
  if (factura.email) {
    doc.text(factura.email, left, cy); cy += 12;
  }
  if (factura.web) {
    doc.text(factura.web, left, cy); cy += 12;
  }

  y = Math.max(companyY + 100, cy) + 6;

  // ===================== SEPARATOR 1 =====================
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 14;

  // ===================== CLIENT + INVOICE DATA =====================
  // LEFT: Client data
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
  doc.text('DATOS DEL CLIENTE', left, y); y += 18;
  doc.fontSize(9).font('Helvetica');
  doc.text(`Razón Social: ${factura.cliente_nombre || ''}`, left, y); y += 14;
  const docTypeLabel = factura.tipo_documento === 'RUC' ? 'R.U.C.' : 'D.N.I.';
  doc.text(`${docTypeLabel}: ${factura.numero_documento || ''}`, left, y); y += 14;
  if (factura.cliente_direccion) {
    doc.text(`Dirección: ${factura.cliente_direccion}`, left, y, { width: contentW * 0.5 }); y += 14;
  }

  // RIGHT: Invoice metadata
  const metaX = left + contentW * 0.5 + 10;
  const metaW = contentW * 0.5 - 10;
  let my = y - 18 - 14 * 3; // rewind to align top

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('DATOS DE LA FACTURA', metaX, my); my += 18;

  const fecha = factura.created_at
    ? new Date(factura.created_at).toLocaleDateString('es-PE', { timeZone: 'UTC' })
    : '-';

  const metaItems = [
    ['Fecha de Emisión:', fecha],
    ['Forma de Pago:', 'CONTADO'],
    ['Moneda:', 'Soles'],
    ['N° Guía:', factura.guia_remision || '-'],
    ['O/C:', factura.orden_codigo || '-'],
  ];

  doc.fontSize(9);
  for (const [label, value] of metaItems) {
    doc.font('Helvetica-Bold').text(label, metaX, my, { width: metaW * 0.38, continued: true });
    doc.font('Helvetica').text(` ${value}`, { width: metaW * 0.62, align: 'left' });
    my += 14;
  }

  y = Math.max(y, my) + 8;

  // ===================== SEPARATOR 2 =====================
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 10;

  // ===================== ITEMS TABLE =====================
  const tableW = contentW;
  const colDefs = [
    { key: 'item', label: 'ITEM', width: 28, align: 'center' },
    { key: 'cant', label: 'CANT.', width: 42, align: 'right' },
    { key: 'unid', label: 'UNID/MED', width: 52, align: 'left' },
    { key: 'codigo', label: 'CÓDIGO', width: 65, align: 'left' },
    { key: 'desc', label: 'DESCRIPCIÓN', width: 220, align: 'left' },
    { key: 'vunit', label: 'V.UNIT. S/', width: 65, align: 'right' },
    { key: 'importe', label: 'IMPORTE S/', width: 65, align: 'right' },
  ];

  function getColX(idx) {
    let x = left;
    for (let i = 0; i < idx; i++) x += colDefs[i].width;
    return x;
  }

  function drawTableHeader(yPos) {
    // Header background
    doc.rect(left, yPos, tableW, 20).fill('#f0f0f0');
    doc.fillColor('#000').fontSize(7.5).font('Helvetica-Bold');
    colDefs.forEach((col, i) => {
      const cx = getColX(i);
      doc.text(col.label, cx + 3, yPos + 5, {
        width: col.width - 6,
        align: col.align
      });
    });
    // bottom line
    doc.moveTo(left, yPos + 20).lineTo(right, yPos + 20).strokeColor('#cccccc').stroke();
    return yPos + 20;
  }

  function drawTableRow(yPos, idx, row) {
    if (yPos + 18 > 780) {
      doc.addPage();
      yPos = 40;
      // Redraw header on new page
      yPos = drawTableHeader(yPos);
    }

    // Horizontal line
    doc.moveTo(left, yPos).lineTo(right, yPos).strokeColor('#eeeeee').stroke();

    doc.fontSize(7).font('Helvetica').fillColor('#000');
    const cells = [
      String(idx),
      String(row.cantidad || '-'),
      'UNIDADES',
      row.codigo || '',
      row.descripcion || row.nombre || '',
      parseFloat(row.precio_unitario || 0).toFixed(2),
      parseFloat(row.subtotal || 0).toFixed(2),
    ];

    colDefs.forEach((col, i) => {
      const cx = getColX(i);
      let val = cells[i];
      doc.text(val, cx + 3, yPos + 3, {
        width: col.width - 6,
        align: col.align
      });
    });

    return yPos + 17;
  }

  y = drawTableHeader(y);

  if (items && items.length > 0) {
    items.forEach((item, i) => {
      y = drawTableRow(y, i + 1, item);
    });
  } else {
    y = drawTableRow(y, 1, {
      cantidad: 1,
      codigo: '',
      descripcion: 'SEGÚN FACTURACIÓN DIRECTA',
      precio_unitario: factura.subtotal,
      subtotal: factura.subtotal,
    });
  }

  // Table bottom line
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 8;

  // ===================== TOTALS =====================
  const totalsW = 180;
  const totalsX = right - totalsW;

  const totalRows = [
    { label: 'Op. Gravadas', value: `S/ ${parseFloat(factura.subtotal).toFixed(2)}` },
    { label: 'Dscto Global', value: 'S/ 0.00' },
    { label: 'IGV (18.00%)', value: `S/ ${parseFloat(factura.igv).toFixed(2)}` },
  ];

  doc.fontSize(9);
  totalRows.forEach(r => {
    doc.font('Helvetica').text(r.label, totalsX, y, { width: totalsW * 0.55, align: 'left', continued: true });
    doc.font('Helvetica-Bold').text(r.value, { width: totalsW * 0.45, align: 'right' });
    y += 16;
  });

  // TOTAL box
  doc.rect(totalsX, y, totalsW, 24).fill('#000000');
  doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
  doc.text('TOTAL S/', totalsX + 8, y + 4, { width: totalsW * 0.5, align: 'left', continued: true });
  doc.text(`S/ ${parseFloat(factura.total).toFixed(2)}`, { width: totalsW * 0.5 - 8, align: 'right' });
  doc.fillColor('#000000');
  y += 32;

  // ===================== AMOUNT IN WORDS =====================
  doc.fontSize(9).font('Helvetica');
  const amountText = `SON: ${numeroALetras(parseFloat(factura.total))} SOLES`;
  doc.text(amountText, left, y);
  y += 22;

  // ===================== SEPARATOR =====================
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 10;

  // ===================== FOOTER =====================
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('INFORMACIÓN ADICIONAL', left, y); y += 16;

  doc.fontSize(8).font('Helvetica');
  doc.font('Helvetica-Bold').text('Observación: ', left, y, { continued: true });
  doc.font('Helvetica').text(factura.notas || '-');
  y += 13;
  doc.font('Helvetica-Bold').text('Elaborado por: ', left, y, { continued: true });
  doc.font('Helvetica').text('SISTEMA');
  y += 13;
  doc.font('Helvetica-Bold').text('Representación Impresa de la Factura Electrónica: ', left, y, { continued: true });
  doc.font('Helvetica').text(factura.numero_completo);
  y += 16;

  doc.fontSize(7).fillColor('#666666');
  doc.text('Consulte su CPE en: https://www.sunat.gob.pe', left, y); y += 11;
  doc.fillColor('#000000');

  // ===================== BANK INFO =====================
  if (factura.banco_nombre) {
    y += 6;
    doc.rect(left, y - 4, contentW, 1).fillColor('#cccccc').fill();
    y += 8;
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('DATOS BANCARIOS', left, y); y += 18;

    doc.fontSize(9);
    const bankItems = [
      ['Banco:', factura.banco_nombre],
      ['Tipo Cuenta:', factura.banco_tipo_cuenta],
      ['N° Cuenta:', factura.banco_numero_cuenta],
      ['CCI:', factura.banco_cci],
    ];
    bankItems.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, left, y, { width: 85, continued: true });
      doc.font('Helvetica').text(value || '');
      y += 14;
    });
  }

  doc.end();
  return doc;
}

module.exports = { generateFacturaPDF };
