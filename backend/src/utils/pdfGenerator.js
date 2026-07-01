const PDFDocument = require('pdfkit');
const path = require('path');
const { numeroALetras } = require('./numeroALetras');

function generateFacturaPDF(factura, items) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
  const left = 40;
  const right = 555;
  const contentW = right - left;
  const pageBottom = 765;

  let y = 35;

  // ===================== HEADER =====================
  try {
    const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
    doc.image(logoPath, left, y, { width: 85, height: 85 });
  } catch (e) { }

  doc.fillColor('#000');
  doc.fontSize(13).font('Helvetica-Bold');
  doc.text('FACTURA ELECTRÓNICA', right - 200, y, { width: 200, align: 'right' });
  doc.fontSize(11).font('Helvetica');
  doc.text(factura.numero_completo, right - 200, y + 20, { width: 200, align: 'right' });
  if (factura.yape) {
    doc.fontSize(8);
    doc.text(`YAPE: ${factura.yape}`, right - 200, y + 42, { width: 200, align: 'right' });
  }

  const companyY = y + 95;
  doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
  doc.text(factura.empresa_razon_social || '', left, companyY);

  let cy = companyY + 16;
  doc.fillColor('#000').fontSize(9).font('Helvetica');
  doc.text(`R.U.C. ${factura.empresa_ruc || ''}`, left, cy); cy += 13;
  if (factura.empresa_direccion) {
    const dir = factura.empresa_direccion;
    const h = doc.heightOfString(dir, { width: contentW * 0.55 });
    doc.text(dir, left, cy, { width: contentW * 0.55 });
    cy += Math.max(h + 3, 13);
  }
  if (factura.telefono) { doc.text(`Tel: ${factura.telefono}`, left, cy); cy += 12; }
  if (factura.email) { doc.text(factura.email, left, cy); cy += 12; }
  if (factura.web) { doc.text(factura.web, left, cy); cy += 12; }

  y = Math.max(companyY + 110, cy) + 4;

  // ===================== SEPARATOR 1 =====================
  if (y + 20 > pageBottom) { doc.addPage(); y = 40; }
  doc.strokeColor('#aaaaaa').moveTo(left, y).lineTo(right, y).stroke();
  y += 10;

  // ===================== CLIENT + INVOICE DATA =====================
  const clientStartY = y;
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
  doc.text('DATOS DEL CLIENTE', left, y); y += 16;
  doc.fontSize(8.5).font('Helvetica');
  const cliLabelW = 75;
  doc.fillColor('#000');
  doc.text('Razón Social:', left, y, { width: cliLabelW, continued: true });
  doc.text(factura.cliente_nombre || '', { width: contentW * 0.5 - cliLabelW });
  y += 13;
  const docTypeLabel = factura.tipo_documento === 'RUC' ? 'R.U.C.:' : 'D.N.I.:';
  doc.fillColor('#000');
  doc.text(docTypeLabel, left, y, { width: cliLabelW, continued: true });
  doc.text(factura.numero_documento || '', { width: contentW * 0.5 - cliLabelW });
  y += 13;
  if (factura.cliente_direccion) {
    const dir = `Dirección: ${factura.cliente_direccion}`;
    const h = doc.heightOfString(dir, { width: contentW * 0.55 });
    doc.fillColor('#000');
    doc.text(dir, left, y, { width: contentW * 0.55 });
    y += Math.max(h + 3, 13);
  }

  const metaX = left + contentW * 0.5 + 15;
  const metaW = contentW * 0.5 - 15;
  let my = clientStartY;
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
  doc.text('DATOS DE LA FACTURA', metaX, my); my += 16;

  const fecha = factura.created_at
    ? new Date(factura.created_at).toLocaleDateString('es-PE', { timeZone: 'UTC' })
    : '-';

  doc.fontSize(8.5);
  const metaPairs = [
    { l: 'Fecha de Emisión:', v: fecha },
    { l: 'Forma de Pago:', v: 'CONTADO' },
    { l: 'Moneda:', v: 'Soles' },
    { l: 'N° Guía:', v: factura.guia_remision || '-' },
    { l: 'O/C:', v: factura.orden_codigo || '-' },
  ];
  const lblW = 75;
  for (const { l, v } of metaPairs) {
    doc.fillColor('#000');
    doc.font('Helvetica-Bold').text(l, metaX, my, { width: lblW, continued: true });
    doc.font('Helvetica').text(` ${v}`, { width: metaW - lblW });
    my += 13;
  }

  y = Math.max(y, my) + 4;

  // ===================== SEPARATOR 2 =====================
  if (y + 20 > pageBottom) { doc.addPage(); y = 40; }
  doc.strokeColor('#aaaaaa').moveTo(left, y).lineTo(right, y).stroke();
  y += 8;

  // ===================== ITEMS TABLE =====================
  if (y + 30 > pageBottom) { doc.addPage(); y = 40; }

  const colDefs = [
    { label: 'ITEM', w: 24, a: 'center' },
    { label: 'CANT.', w: 38, a: 'right' },
    { label: 'UNID/MED', w: 46, a: 'left' },
    { label: 'CÓDIGO', w: 56, a: 'left' },
    { label: 'DESCRIPCIÓN', w: 202, a: 'left' },
    { label: 'V.UNIT S/', w: 66, a: 'right' },
    { label: 'IMPORTE S/', w: 72, a: 'right' },
  ];
  const tableW = colDefs.reduce((s, c) => s + c.w, 0);

  function colX(i) { let x = left; for (let j = 0; j < i; j++) x += colDefs[j].w; return x; }

  function drawHdr(yPos) {
    if (yPos + 22 > pageBottom - 20) { doc.addPage(); yPos = 40; }
    doc.rect(left, yPos, tableW, 20).fill('#f0f0f0');
    doc.fillColor('#000').fontSize(7.5).font('Helvetica-Bold');
    colDefs.forEach((c, i) => doc.text(c.label, colX(i) + 3, yPos + 5, { width: c.w - 6, align: c.a }));
    doc.strokeColor('#cccccc').moveTo(left, yPos + 20).lineTo(right, yPos + 20).stroke();
    return yPos + 20;
  }

  function drawRow(yPos, idx, row) {
    if (yPos + 16 > pageBottom - 20) {
      doc.addPage();
      yPos = drawHdr(40);
    }
    doc.strokeColor('#e0e0e0').moveTo(left, yPos).lineTo(right, yPos).stroke();
    doc.fillColor('#000').fontSize(7).font('Helvetica');
    const vals = [
      String(idx), String(row.cantidad || '-'), 'UNIDADES',
      row.codigo || '', row.descripcion || row.nombre || '',
      `${parseFloat(row.precio_unitario || 0).toFixed(2)}`,
      `${parseFloat(row.subtotal || 0).toFixed(2)}`,
    ];
    colDefs.forEach((c, i) => doc.text(vals[i], colX(i) + 3, yPos + 2, { width: c.w - 6, align: c.a }));
    return yPos + 16;
  }

  y = drawHdr(y);

  if (items && items.length > 0) {
    items.forEach((item, i) => { y = drawRow(y, i + 1, item); });
  } else {
    y = drawRow(y, 1, {
      cantidad: 1, codigo: '', descripcion: 'SEGÚN FACTURACIÓN DIRECTA',
      precio_unitario: factura.subtotal, subtotal: factura.subtotal,
    });
  }

  doc.strokeColor('#cccccc').moveTo(left, y).lineTo(right, y).stroke();
  y += 10;

  // ===================== TOTALS =====================
  if (y + 110 > pageBottom) { doc.addPage(); y = 40; }

  const tW = 190;
  const tX = right - tW;

  doc.fillColor('#000').fontSize(9);
  const tRows = [
    { l: 'Op. Gravadas', v: `S/ ${parseFloat(factura.subtotal).toFixed(2)}` },
    { l: 'Dscto Global', v: 'S/ 0.00' },
    { l: 'IGV (18.00%)', v: `S/ ${parseFloat(factura.igv).toFixed(2)}` },
  ];
  tRows.forEach(r => {
    doc.fillColor('#000').font('Helvetica').text(r.l, tX, y, { width: tW * 0.5, align: 'left', continued: true });
    doc.font('Helvetica-Bold').text(r.v, { width: tW * 0.5, align: 'right' });
    y += 14;
  });

  doc.rect(tX, y, tW, 26).fill('#000');
  doc.fillColor('#FFF').fontSize(11).font('Helvetica-Bold');
  doc.text('TOTAL S/', tX + 8, y + 5, { width: 80, align: 'left', continued: true });
  doc.text(`S/ ${parseFloat(factura.total).toFixed(2)}`, { width: tW - 96, align: 'right' });
  doc.fillColor('#000');
  y += 32;

  // ===================== AMOUNT IN WORDS =====================
  y += 4;
  doc.fillColor('#000').fontSize(9).font('Helvetica');
  doc.text(`SON: ${numeroALetras(parseFloat(factura.total))} SOLES`, left, y);
  y += 18;

  // ===================== SEPARATOR =====================
  if (y + 20 > pageBottom) { doc.addPage(); y = 40; }
  doc.strokeColor('#aaaaaa').moveTo(left, y).lineTo(right, y).stroke();
  y += 8;

  // ===================== FOOTER =====================
  if (y + 90 > pageBottom) { doc.addPage(); y = 40; }

  doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
  doc.text('INFORMACIÓN ADICIONAL', left, y); y += 14;

  doc.fontSize(8).font('Helvetica');
  doc.fillColor('#000');
  doc.text(`Observación: ${factura.notas || '-'}`, left, y); y += 12;
  doc.text(`Elaborado por: SISTEMA`, left, y); y += 12;
  doc.text(`Representación Impresa de la Factura Electrónica: ${factura.numero_completo}`, left, y);
  y += 14;
  doc.fillColor('#666').text('Consulte su CPE en: https://www.sunat.gob.pe', left, y); y += 12;
  doc.fillColor('#000');

  // ===================== BANK INFO =====================
  if (factura.banco_nombre) {
    if (y + 100 > pageBottom) { doc.addPage(); y = 40; }
    y += 8;
    doc.strokeColor('#cccccc').moveTo(left, y).lineTo(right, y).stroke();
    y += 12;
    doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
    doc.text('DATOS BANCARIOS', left, y); y += 16;
    doc.fontSize(9);
    const bItems = [
      ['Banco:', factura.banco_nombre],
      ['Tipo Cuenta:', factura.banco_tipo_cuenta],
      ['N° Cuenta:', factura.banco_numero_cuenta],
      ['CCI:', factura.banco_cci],
    ];
    const blW = 70;
    bItems.forEach(([l, v]) => {
      doc.fillColor('#000');
      doc.font('Helvetica-Bold').text(l, left, y, { width: blW, continued: true });
      doc.font('Helvetica').text(v || '', { width: contentW - blW });
      y += 13;
    });
  }

  doc.end();
  return doc;
}

module.exports = { generateFacturaPDF };
