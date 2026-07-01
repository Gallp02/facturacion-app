const PDFDocument = require('pdfkit');
const path = require('path');
const { numeroALetras } = require('./numeroALetras');

function generateFacturaPDF(factura, items) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
  const left = 40;
  const right = 555;
  const contentW = right - left;
  const pageBottom = 790;

  let y = 30;

  // ===================== HEADER =====================
  try {
    const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
    doc.image(logoPath, left, y, { width: 85, height: 85 });
  } catch (e) { }

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#000');
  doc.text('FACTURA ELECTRÓNICA', right - 210, y, { width: 210, align: 'right' });
  doc.fontSize(11).font('Helvetica');
  doc.text(factura.numero_completo, right - 210, y + 20, { width: 210, align: 'right' });
  if (factura.yape) {
    doc.fontSize(8);
    doc.text(`YAPE: ${factura.yape}`, right - 210, y + 40, { width: 210, align: 'right' });
  }

  const companyY = y + 95;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(factura.empresa_razon_social || '', left, companyY);

  let cy = companyY + 16;
  doc.fontSize(9).font('Helvetica');
  doc.text(`R.U.C. ${factura.empresa_ruc || ''}`, left, cy); cy += 15;
  if (factura.empresa_direccion) {
    const h = doc.heightOfString(factura.empresa_direccion, { width: contentW * 0.5 });
    doc.text(factura.empresa_direccion, left, cy, { width: contentW * 0.5 });
    cy += Math.max(h + 4, 15);
  }
  if (factura.telefono) { doc.text(`Tel: ${factura.telefono}`, left, cy); cy += 15; }
  if (factura.email) { doc.text(factura.email, left, cy); cy += 15; }
  if (factura.web) { doc.text(factura.web, left, cy); cy += 15; }

  y = Math.max(companyY + 115, cy);

  // ===================== SEPARATOR 1 =====================
  y += 25;
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 25;

  // ===================== CLIENT + INVOICE DATA =====================
  const clientStartY = y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('DATOS DEL CLIENTE', left, y); y += 18;
  doc.fontSize(8.5).font('Helvetica');
  const cliLabelW = 75;
  doc.text('Razón Social:', left, y, { width: cliLabelW, continued: true });
  doc.text(factura.cliente_nombre || '', { width: contentW * 0.5 - cliLabelW });
  y += 14;
  const docTypeLabel = factura.tipo_documento === 'RUC' ? 'R.U.C.:' : 'D.N.I.:';
  doc.text(docTypeLabel, left, y, { width: cliLabelW, continued: true });
  doc.text(factura.numero_documento || '', { width: contentW * 0.5 - cliLabelW });
  y += 14;
  if (factura.cliente_direccion) {
    const dir = `Dirección: ${factura.cliente_direccion}`;
    const h = doc.heightOfString(dir, { width: contentW * 0.55 });
    doc.text(dir, left, y, { width: contentW * 0.55 });
    y += Math.max(h + 4, 14);
  }

  const metaX = left + contentW * 0.5 + 15;
  const metaW = contentW * 0.5 - 15;
  let my = clientStartY;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('DATOS DE LA FACTURA', metaX, my); my += 18;

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
    doc.font('Helvetica-Bold').text(l, metaX, my, { width: lblW, continued: true });
    doc.font('Helvetica').text(` ${v}`, { width: metaW - lblW });
    my += 14;
  }

  y = Math.max(y, my) + 4;

  // ===================== SEPARATOR 2 =====================
  y += 25;
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 25;

  // ===================== ITEMS TABLE =====================
  if (y > pageBottom) { doc.addPage(); y = 40; }

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
    if (yPos + 22 > pageBottom) { doc.addPage(); yPos = 40; }
    doc.rect(left, yPos, tableW, 22).fill('#f0f0f0');
    doc.fillColor('#000').fontSize(7.5).font('Helvetica-Bold');
    colDefs.forEach((c, i) => doc.text(c.label, colX(i) + 3, yPos + 6, { width: c.w - 6, align: c.a }));
    doc.fillColor('#cccccc').moveTo(left, yPos + 22).lineTo(right, yPos + 22).stroke();
    return yPos + 22;
  }

  function drawRow(yPos, idx, row) {
    if (yPos + 18 > pageBottom) {
      doc.addPage();
      yPos = drawHdr(40);
    }
    doc.fillColor('#eeeeee').moveTo(left, yPos).lineTo(right, yPos).stroke();
    doc.fillColor('#000').fontSize(7).font('Helvetica');
    const vals = [
      String(idx), String(row.cantidad || '-'), 'UNIDADES',
      row.codigo || '', row.descripcion || row.nombre || '',
      `${parseFloat(row.precio_unitario || 0).toFixed(2)}`,
      `${parseFloat(row.subtotal || 0).toFixed(2)}`,
    ];
    colDefs.forEach((c, i) => doc.text(vals[i], colX(i) + 3, yPos + 3, { width: c.w - 6, align: c.a }));
    return yPos + 18;
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

  doc.fillColor('#cccccc').moveTo(left, y).lineTo(right, y).stroke();
  y += 25;

  // ===================== TOTALS =====================
  if (y + 100 > pageBottom) { doc.addPage(); y = 40; }

  const tW = 190;
  const tX = right - tW;

  doc.fontSize(9);
  const tRows = [
    { l: 'Op. Gravadas', v: `S/ ${parseFloat(factura.subtotal).toFixed(2)}` },
    { l: 'Dscto Global', v: 'S/ 0.00' },
    { l: 'IGV (18.00%)', v: `S/ ${parseFloat(factura.igv).toFixed(2)}` },
  ];
  tRows.forEach(r => {
    doc.font('Helvetica').text(r.l, tX, y, { width: tW * 0.5, align: 'left', continued: true });
    doc.font('Helvetica-Bold').text(r.v, { width: tW * 0.5, align: 'right' });
    y += 15;
  });

  doc.rect(tX, y, tW, 26).fill('#000');
  doc.fillColor('#FFF').fontSize(12).font('Helvetica-Bold');
  doc.text('TOTAL S/', tX + 8, y + 5, { width: 80, align: 'left', continued: true });
  doc.text(`S/ ${parseFloat(factura.total).toFixed(2)}`, { width: tW - 96, align: 'right' });
  doc.fillColor('#000');
  y += 34;

  // ===================== AMOUNT IN WORDS =====================
  y += 6;
  doc.fontSize(9).font('Helvetica');
  doc.text(`SON: ${numeroALetras(parseFloat(factura.total))} SOLES`, left, y);
  y += 26;

  // ===================== SEPARATOR =====================
  y += 25;
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#cccccc').stroke();
  y += 25;

  // ===================== FOOTER =====================
  if (y + 80 > pageBottom) { doc.addPage(); y = 40; }

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('INFORMACIÓN ADICIONAL', left, y); y += 16;

  doc.fontSize(8).font('Helvetica');
  doc.text(`Observación: ${factura.notas || '-'}`, left, y); y += 14;
  doc.text(`Elaborado por: SISTEMA`, left, y); y += 14;
  doc.text(`Representación Impresa de la Factura Electrónica: ${factura.numero_completo}`, left, y);
  y += 16;
  doc.fillColor('#666').text('Consulte su CPE en: https://www.sunat.gob.pe', left, y); y += 14;
  doc.fillColor('#000');

  // ===================== BANK INFO =====================
  if (factura.banco_nombre) {
    if (y + 90 > pageBottom) { doc.addPage(); y = 40; }
    y += 25;
    doc.rect(left, y, contentW, 1).fillColor('#ccc').fill();
    y += 20;
    doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
    doc.text('DATOS BANCARIOS', left, y); y += 18;
    doc.fontSize(9);
    const bItems = [
      ['Banco:', factura.banco_nombre],
      ['Tipo Cuenta:', factura.banco_tipo_cuenta],
      ['N° Cuenta:', factura.banco_numero_cuenta],
      ['CCI:', factura.banco_cci],
    ];
    const blW = 70;
    bItems.forEach(([l, v]) => {
      doc.font('Helvetica-Bold').text(l, left, y, { width: blW, continued: true });
      doc.font('Helvetica').text(v || '', { width: contentW - blW });
      y += 14;
    });
  }

  doc.end();
  return doc;
}

module.exports = { generateFacturaPDF };
