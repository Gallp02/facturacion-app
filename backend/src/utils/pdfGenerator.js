const PDFDocument = require('pdfkit');
const path = require('path');
const { numeroALetras } = require('./numeroALetras');

function generateFacturaPDF(factura, items) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: false });
  const L = 26;
  const R = 569;
  const CW = R - L;
  const PG = 800;

  // colors from sample PDF
  const C_TEAL = '#212721';
  const C_WHITE = '#FFFFFF';
  const C_BLACK = '#000000';
  const C_GRAY_BAR = '#A4A4A4';
  const C_GRAY_CELL = '#D5D5D5';
  const C_TABLE_HDR = '#007599';
  const C_ROW1 = '#F5F5F5';
  const C_ROW2 = '#E6E6E6';
  const C_ROW3 = '#DEDEDE';
  const C_GREEN = '#5BAA01';
  const C_GRID = '#DEDEDE';

  function addPageIfNeeded(needed, bottom) {
    if (bottom + needed > PG) { doc.addPage(); return L; }
    return bottom;
  }

  let y = 0;

  // ===================== PAGE BACKGROUND =====================
  doc.rect(L, 6, CW, 812 - 6).fill(C_WHITE);

  // ===================== TOP RIGHT HEADER =====================
  doc.fillColor(C_TEAL);
  doc.fontSize(10.8).font('Helvetica');
  doc.text(factura.empresa_ruc || '', 388, 43);

  doc.fontSize(10.8).font('Helvetica-Bold');
  doc.text('FACTURA ELECTRÓNICA', 375, 64);

  doc.fontSize(10.8).font('Helvetica');
  doc.text(factura.numero_completo, 403, 86);

  // ===================== LOGO / LEFT COMPANY INFO =====================
  let logoRight = 109;
  try {
    const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
    doc.image(logoPath, L, 30, { width: 75, height: 75 });
    logoRight = L + 75 + 8;
  } catch (e) { }

  doc.fillColor(C_TEAL);
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(factura.empresa_razon_social || '', logoRight, 77);

  doc.fontSize(7.2).font('Helvetica');
  let ly = 91;
  if (factura.empresa_direccion) {
    doc.text(factura.empresa_direccion, logoRight, ly);
    ly += 9;
  }

  let telefonoText = '';
  if (factura.telefono) telefonoText += `Teléf: ${factura.telefono}`;
  if (telefonoText) { doc.text(telefonoText, logoRight, ly); ly += 9; }

  if (factura.email) { doc.text(`Email: ${factura.email}`, logoRight, ly); ly += 9; }
  if (factura.web) { doc.text(factura.web, logoRight, ly); ly += 9; }

  y = Math.max(ly + 4, 139);

  // ===================== GRAY BAR 1 - CLIENT DATA =====================
  y = addPageIfNeeded(50, y);
  doc.rect(L, 139, CW, 33).fill(C_GRAY_BAR);
  doc.fillColor(C_TEAL);
  doc.fontSize(7.8).font('Helvetica-Bold');
  doc.text('RAZÓN SOCIAL:', 30, 150);
  doc.font('Helvetica');
  doc.text(factura.cliente_nombre || '', 89, 150);

  doc.font('Helvetica-Bold');
  doc.text('R.U.C.:', 30, 160);
  doc.font('Helvetica');
  doc.text(factura.numero_documento || '', 53, 160);

  doc.font('Helvetica-Bold');
  doc.text('DIRECCIÓN:', 30, 169);
  doc.font('Helvetica');
  if (factura.cliente_direccion) {
    doc.text(factura.cliente_direccion, 75, 169);
  }

  y = 177;

  // ===================== GRAY BAR 2 - INVOICE METADATA =====================
  y = addPageIfNeeded(40, y);
  doc.rect(L, 177, CW, 31).fill(C_GRAY_BAR);

  const metaCols = [
    { x: 31, w: 149, label: 'FECHA DE EMISIÓN', lx: 72 },
    { x: 181, w: 133, label: 'FORMA DE PAGO', lx: 218 },
    { x: 315, w: 74, label: 'MONEDA', lx: 336 },
    { x: 390, w: 140, label: 'NÚMERO DE GUÍA', lx: 429 },
    { x: 531, w: 33, label: 'O/C', lx: 541 },
  ];

  metaCols.forEach(mc => {
    doc.rect(mc.x, 181, mc.w, 12).fill(C_GRAY_CELL);
  });

  doc.fillColor(C_TEAL).fontSize(7.2).font('Helvetica-Bold');
  metaCols.forEach(mc => {
    doc.text(mc.label, mc.lx, 190);
  });

  const fecha = factura.created_at
    ? new Date(factura.created_at).toLocaleDateString('es-PE', { timeZone: 'UTC' })
    : '-';

  doc.fontSize(7.8).font('Helvetica');
  doc.fillColor(C_TEAL);
  doc.text(fecha, 84, 203);
  doc.text('CONTADO', 227, 203);
  doc.text('Soles', 343, 203);

  y = 213;

  // ===================== TABLE =====================
  y = addPageIfNeeded(80, y);

  const colDefs = [
    { x: L, w: 24, a: 'center', label: 'ITEM' },
    { x: L + 24, w: 28, a: 'right', label: 'CANT.' },
    { x: L + 52, w: 47, a: 'left', label: 'UNID/MED' },
    { x: L + 99, w: 46, a: 'left', label: 'CÓDIGO' },
    { x: L + 145, w: 273, a: 'left', label: 'DESCRIPCIÓN' },
    { x: L + 418, w: 44, a: 'right', label: 'V. UNIT. S/' },
    { x: L + 462, w: 81, a: 'right', label: 'IMPORTE S/' },
  ];

  // header
  colDefs.forEach(c => {
    doc.rect(c.x, 213, c.w, 13).fill(C_TABLE_HDR);
  });
  doc.fillColor(C_WHITE).fontSize(7.2).font('Helvetica-Bold');
  colDefs.forEach((c, i) => {
    doc.text(c.label, c.x + 3, 222, { width: c.w - 6, align: c.a });
  });

  // grid lines at y=226
  colDefs.forEach(c => {
    doc.rect(c.x, 226, c.w, 1).fill(C_GRID);
  });

  let rowY = 226;
  const rowH = 13;
  const rowColors = [C_ROW1, C_ROW2, C_ROW3];

  function drawRow(yPos, idx, row) {
    if (yPos + rowH + 30 > PG) {
      doc.addPage();
      yPos = L;
      // redraw header on new page
      colDefs.forEach(c => {
        doc.rect(c.x, yPos, c.w, 13).fill(C_TABLE_HDR);
      });
      doc.fillColor(C_WHITE).fontSize(7.2).font('Helvetica-Bold');
      colDefs.forEach((c, i) => {
        doc.text(c.label, c.x + 3, yPos + 9, { width: c.w - 6, align: c.a });
      });
      colDefs.forEach(c => {
        doc.rect(c.x, yPos + 13, c.w, 1).fill(C_GRID);
      });
      yPos += 14;
    }

    const color = rowColors[Math.min(idx - 1, 2)];
    const vals = [
      String(idx), String(row.cantidad || '-'), 'UNIDADES',
      row.codigo || '', row.descripcion || row.nombre || '',
      parseFloat(row.precio_unitario || 0).toFixed(2),
      parseFloat(row.subtotal || 0).toFixed(2),
    ];

    colDefs.forEach((c, i) => {
      doc.rect(c.x, yPos, c.w, rowH).fill(color);
    });

    doc.fillColor(C_TEAL).fontSize(7.2).font('Helvetica');
    colDefs.forEach((c, i) => {
      doc.text(vals[i], c.x + 3, yPos + 3, { width: c.w - 6, align: c.a });
    });

    // bottom grid line
    colDefs.forEach(c => {
      doc.rect(c.x, yPos + rowH, c.w, 1).fill(C_GRID);
    });

    return yPos + rowH + 1;
  }

  if (items && items.length > 0) {
    items.forEach((item, i) => { rowY = drawRow(rowY, i + 1, item); });
  } else {
    rowY = drawRow(rowY, 1, {
      cantidad: 1, codigo: '', descripcion: 'SEGÚN FACTURACIÓN DIRECTA',
      precio_unitario: factura.subtotal, subtotal: factura.subtotal,
    });
  }

  // footer row (full width) with amount in words
  doc.rect(L, rowY, CW, 14).fill(C_ROW2);
  doc.fillColor(C_BLACK).fontSize(7.2).font('Helvetica-Bold');
  doc.text(`SON ${numeroALetras(parseFloat(factura.total))} SOLES`, L + 1, rowY + 3, { width: CW - 2 });
  doc.rect(L, rowY + 14, CW, 1).fill(C_GRID);

  rowY += 15;

  // ===================== SEPARATOR LINE + TOTALS + OBSERVATION =====================
  // separator line at y=290
  let sepY = Math.max(rowY + 10, 290);
  if (sepY + 60 > PG) { doc.addPage(); sepY = L + 10; }

  doc.rect(L, sepY, 362, 1).fill(C_GRID);
  doc.rect(388, sepY, CW - 388, 1).fill(C_GRID);

  // LEFT side: Observation + Elaborado por
  doc.fillColor(C_TEAL);
  doc.fontSize(7.2).font('Helvetica-Bold');
  let obY = sepY + 9;
  doc.text('Observación: ', L + 1, obY);
  doc.font('Helvetica');
  doc.text(factura.notas || '-', L + 1 + doc.widthOfString('Observación: '), obY);

  obY += 9;
  doc.font('Helvetica');
  doc.text('Elaborado por: SISTEMA', L + 1, obY);

  // RIGHT side: Totals
  let ttY = sepY + 11;
  const tX = 392;
  const tLabelW = 100;
  const tValW = 70;

  doc.fontSize(7.2).font('Helvetica-Bold');
  const tRows = [
    { l: 'OP. GRAVADAS', v: `S/ ${parseFloat(factura.subtotal).toFixed(2)}` },
    { l: 'DSCTO GLOBAL', v: 'S/ 0.00' },
    { l: 'IGV (18.00%)', v: `S/ ${parseFloat(factura.igv).toFixed(2)}` },
  ];
  tRows.forEach(r => {
    doc.fillColor(C_BLACK);
    doc.text(r.l, tX, ttY, { width: tLabelW, align: 'left' });
    doc.text(r.v, tX + tLabelW, ttY, { width: tValW, align: 'right' });
    ttY += 13;
  });

  // total box - green on top of blue
  const totBoxX = 390;
  const totBoxW = 103;
  const totBoxH = 14;
  doc.rect(totBoxX, ttY, totBoxW, totBoxH).fill(C_TABLE_HDR);
  doc.rect(totBoxX, ttY, totBoxW, totBoxH).fill(C_GREEN);
  const totValX = 493;
  const totValW = 74;
  doc.rect(totValX, ttY, totValW, totBoxH).fill(C_TABLE_HDR);
  doc.rect(totValX, ttY, totValW, totBoxH).fill(C_GREEN);
  doc.fillColor(C_WHITE).fontSize(7.2).font('Helvetica-Bold');
  doc.text('TOTALES', totBoxX + 5, ttY + 3, { width: totBoxW - 10, align: 'left' });
  doc.text(`S/ ${parseFloat(factura.total).toFixed(2)}`, totValX + 5, ttY + 3, { width: totValW - 10, align: 'right' });
  ttY += totBoxH;

  // ===================== QR / FOOTER BOX =====================
  let qrY = Math.max(ttY + 10, 356);
  if (qrY + 60 > PG) { doc.addPage(); qrY = L + 10; }
  doc.rect(143, qrY, 309, 50).fill(C_GRAY_BAR);

  doc.fillColor(C_BLACK).fontSize(7.2).font('Helvetica');
  doc.text(`Representación Impresa de la Factura Electrónica ${factura.numero_completo}`, 196, qrY + 16, { width: 250, align: 'left' });
  doc.text('Consulte su CPE en:', 196, qrY + 25, { width: 250, align: 'left' });
  doc.text('https://www.sunat.gob.pe', 196, qrY + 33, { width: 250, align: 'left' });

  // ===================== YAPE =====================
  let yaY = Math.max(qrY + 60, 424);
  if (yaY + 8 > PG) { doc.addPage(); yaY = L + 10; }
  if (factura.yape) {
    doc.fillColor(C_TEAL).fontSize(7.8).font('Helvetica');
    doc.text(`YAPE: ${factura.yape}`, L, yaY);
    yaY += 4;
  }

  // ===================== BANK INFO =====================
  let bankY = Math.max(yaY + 4, 426);
  if (bankY + 45 > PG) { doc.addPage(); bankY = L + 10; }
  if (factura.banco_nombre) {
    doc.rect(L, bankY, CW, 36).fill(C_GRAY_BAR);

    const bankCols = [
      { x: 31, w: 207, label: 'BANCO', lx: 122 },
      { x: 239, w: 132, label: 'TIPO DE CUENTA', lx: 276 },
      { x: 372, w: 77, label: 'NRO DE CUENTA', lx: 382 },
      { x: 450, w: 114, label: 'CCI', lx: 501 },
    ];
    bankCols.forEach(bc => {
      doc.rect(bc.x, bankY + 4, bc.w, 12).fill(C_GRAY_CELL);
    });

    doc.fillColor(C_TEAL).fontSize(7.2).font('Helvetica-Bold');
    bankCols.forEach(bc => {
      doc.text(bc.label, bc.lx, bankY + 10);
    });

    doc.fontSize(7.2).font('Helvetica');
    doc.fillColor(C_TEAL);
    doc.text(factura.banco_nombre, 63, bankY + 24);
    doc.text(`CUENTA_CORRIENTE - SOLES`, 240, bankY + 24);
    doc.text(factura.banco_numero_cuenta || '', 372, bankY + 24);
    doc.text(factura.banco_cci || '', 451, bankY + 24);
  }

  doc.end();
  return doc;
}

module.exports = { generateFacturaPDF };
