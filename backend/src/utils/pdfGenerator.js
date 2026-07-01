const PDFDocument = require('pdfkit');
const path = require('path');
const { numeroALetras } = require('./numeroALetras');

// Convert sample baseline y to pdfkit top-of-text y.
// pdfkit text(x,y) uses y as TOP of text, pymupdf origin is BASELINE.
function sy(baselineY, fontSize) {
  // pdfkit text(x,y) places the cap-top at y; the baseline is at y + 0.714*fontSize
  return baselineY - 0.714 * fontSize;
}

function generateFacturaPDF(factura, items) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: false });
  const L = 26;
  const R = 569;
  const CW = R - L;
  const PG = 800;

  const C = {
    teal: '#212721', white: '#FFFFFF', black: '#000000',
    grayBar: '#A4A4A4', grayCell: '#D5D5D5',
    hdr: '#007599', row1: '#F5F5F5', row2: '#E6E6E6', row3: '#DEDEDE',
    green: '#5BAA01', grid: '#DEDEDE',
  };

  function fc(color) { doc.fillColor(color); }

  // ===================== PAGE BACKGROUND =====================
  doc.rect(L, 6, CW, 806).fill('#FFFFFF');

  // ===================== LOGO =====================
  try {
    doc.image(path.join(__dirname, '../../../frontend/public/logo.png'), L, 30, { width: 85, height: 85 });
  } catch (e) { }

  // ===================== TOP RIGHT HEADER (using sample x, adjusted y) =====================
  fc(C.teal);
  doc.fontSize(10.8).font('Helvetica');
  doc.text('R.U.C. ' + (factura.empresa_ruc || ''), 388, sy(43, 10.8));

  doc.fontSize(10.8).font('Helvetica-Bold');
  doc.text('FACTURA ELECTRÓNICA', 375, sy(64, 10.8));

  doc.fontSize(10.8).font('Helvetica');
  doc.text(factura.numero_completo, 403, sy(86, 10.8));

  // ===================== COMPANY INFO (LEFT, using sample x/y) =====================
  fc(C.teal);
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(factura.empresa_razon_social || '', 109, sy(77, 9));

  doc.fontSize(7.2).font('Helvetica');
  if (factura.empresa_direccion) {
    doc.text(factura.empresa_direccion, 60, sy(91, 7.2));
  }
  if (factura.telefono) {
    doc.text(`Teléf: ${factura.telefono}`, 74, sy(109, 7.2));
  }
  if (factura.email) {
    doc.text(`Email: ${factura.email}`, 111, sy(118, 7.2));
  }
  if (factura.web) {
    doc.text(factura.web, 78, sy(127, 7.2));
  }

  // ===================== GRAY BAR 1 - CLIENT DATA =====================
  doc.rect(L, 139, CW, 33).fill(C.grayBar);
  fc(C.teal);
  doc.fontSize(7.8).font('Helvetica-Bold');
  doc.text('RAZÓN SOCIAL:', 30, sy(150, 7.8));
  doc.font('Helvetica');
  doc.text(factura.cliente_nombre || '', 89, sy(150, 7.8));

  doc.font('Helvetica-Bold');
  doc.text('R.U.C.:', 30, sy(160, 7.8));
  doc.font('Helvetica');
  doc.text(factura.numero_documento || '', 53, sy(160, 7.8));

  doc.font('Helvetica-Bold');
  doc.text('DIRECCIÓN:', 30, sy(169, 7.8));
  doc.font('Helvetica');
  doc.text(factura.cliente_direccion || '', 75, sy(169, 7.8));

  // ===================== GRAY BAR 2 - METADATA =====================
  doc.rect(L, 177, CW, 31).fill(C.grayBar);

  const metaSubCols = [
    { x: 31, w: 149 }, { x: 181, w: 133 },
    { x: 315, w: 74 }, { x: 390, w: 140 }, { x: 531, w: 33 },
  ];
  metaSubCols.forEach(mc => doc.rect(mc.x, 181, mc.w, 12).fill(C.grayCell));

  fc(C.teal);
  doc.fontSize(7.2).font('Helvetica-Bold');
  doc.text('FECHA DE EMISIÓN', 72, sy(190, 7.2));
  doc.text('FORMA DE PAGO', 218, sy(190, 7.2));
  doc.text('MONEDA', 336, sy(190, 7.2));
  doc.text('NÚMERO DE GUÍA', 429, sy(190, 7.2));
  doc.text('O/C', 541, sy(190, 7.2));

  const fecha = factura.created_at
    ? new Date(factura.created_at).toLocaleDateString('es-PE', { timeZone: 'UTC' })
    : '-';

  doc.fontSize(7.8).font('Helvetica');
  fc(C.teal);
  doc.text(fecha, 84, sy(203, 7.8));
  doc.text('CONTADO', 227, sy(203, 7.8));
  doc.text('Soles', 343, sy(203, 7.8));

  // ===================== ITEMS TABLE =====================
  const colDefs = [
    { x: L, w: 24, a: 'center' },
    { x: L + 24, w: 28, a: 'right' },
    { x: L + 52, w: 47, a: 'left' },
    { x: L + 99, w: 46, a: 'left' },
    { x: L + 145, w: 273, a: 'left' },
    { x: L + 418, w: 44, a: 'right' },
    { x: L + 462, w: 81, a: 'right' },
  ];
  const headLabels = ['ITEM', 'CANT.', 'UNID/MED', 'CÓDIGO', 'DESCRIPCIÓN', 'V. UNIT. S/', 'IMPORTE S/'];
  // Exact sample x positions for each header label
  const hdrX = [29, 53, 83, 133, 283, 449, 508];
  const rowColors = [C.row1, C.row2, C.row3];
  const rowH = 13;

  function drawTableHeader(yPos) {
    colDefs.forEach(c => doc.rect(c.x, yPos, c.w, rowH).fill(C.hdr));
    fc(C.white);
    doc.fontSize(7.2).font('Helvetica-Bold');
    headLabels.forEach((label, i) => {
      doc.text(label, hdrX[i], yPos + 3);
    });
    colDefs.forEach(c => doc.rect(c.x, yPos + rowH, c.w, 1).fill(C.grid));
    return yPos + rowH + 1;
  }

  function drawTableRow(yPos, idx, row) {
    if (yPos + rowH + 50 > PG) {
      doc.addPage(); yPos = 40;
      yPos = drawTableHeader(yPos);
    }
    const color = rowColors[Math.min(idx - 1, 2)];
    colDefs.forEach(c => doc.rect(c.x, yPos, c.w, rowH).fill(color));
    fc(C.teal);
    doc.fontSize(7.2).font('Helvetica');
    const vals = [
      String(idx), String(row.cantidad || '-'), 'UNIDADES',
      row.codigo || '', row.descripcion || row.nombre || '',
      parseFloat(row.precio_unitario || 0).toFixed(2),
      parseFloat(row.subtotal || 0).toFixed(2),
    ];
    colDefs.forEach((c, i) => {
      doc.text(vals[i], c.x + 3, yPos + 3, { width: c.w - 6, align: c.a });
    });
    colDefs.forEach(c => doc.rect(c.x, yPos + rowH, c.w, 1).fill(C.grid));
    return yPos + rowH + 1;
  }

  let rowY = drawTableHeader(213);

  if (items && items.length > 0) {
    items.forEach((item, i) => { rowY = drawTableRow(rowY, i + 1, item); });
  } else {
    rowY = drawTableRow(rowY, 1, {
      cantidad: 1, codigo: '', descripcion: 'SEGÚN FACTURACIÓN DIRECTA',
      precio_unitario: factura.subtotal, subtotal: factura.subtotal,
    });
  }

  // Footer row - amount in words
  doc.rect(L, rowY, CW, 14).fill(C.row2);
  fc(C.black);
  doc.fontSize(7.2).font('Helvetica-Bold');
  doc.text(`SON ${numeroALetras(parseFloat(factura.total))} SOLES`, L + 2, rowY + 3, { width: CW - 4 });
  doc.rect(L, rowY + 14, CW, 1).fill(C.grid);
  let aftY = rowY + 15;

  // ===================== SEPARATOR + TOTALS + OBSERVATION =====================
  // If items fit on page 1, use sample absolute coordinates; otherwise relative
  const singlePage = (aftY <= 290);

  let sepY;
  if (singlePage) {
    sepY = 290;
  } else {
    sepY = aftY + 10;
    if (sepY + 110 > PG) { doc.addPage(); sepY = 40; }
  }

  doc.rect(L, sepY, 362, 1).fill(C.grid);
  doc.rect(388, sepY, CW - 388, 1).fill(C.grid);

  // LEFT: Observation & Elaborated by
  fc(C.teal);
  doc.fontSize(7.2).font('Helvetica-Bold');
  let obsTop = singlePage ? sy(299, 7.2) : sepY + 4;
  doc.text('Observación: ', L + 1, obsTop);
  doc.font('Helvetica');
  doc.text(factura.notas || '-', L + 1 + doc.widthOfString('Observación: '), obsTop);
  let elabTop = singlePage ? sy(308, 7.2) : obsTop + 9;
  doc.font('Helvetica');
  doc.text('Elaborado por: SISTEMA', L + 1, elabTop);

  // RIGHT: Totals
  let totTop = singlePage ? sy(301, 7.2) : sepY + 6;
  doc.fontSize(7.2).font('Helvetica-Bold');
  const tRows = [
    { l: 'OP. GRAVADAS', v: `S/ ${parseFloat(factura.subtotal).toFixed(2)}` },
    { l: 'DSCTO GLOBAL', v: 'S/ 0.00' },
    { l: 'IGV (18.00%)', v: `S/ ${parseFloat(factura.igv).toFixed(2)}` },
  ];
  tRows.forEach(r => {
    fc(C.black);
    doc.text(r.l, 392, totTop, { width: 100, align: 'left' });
    doc.text(r.v, 492, totTop, { width: 75, align: 'right' });
    totTop += 13;
  });

  // Total box
  let boxTop = singlePage ? 330 : totTop;
  doc.rect(390, boxTop, 103, 14).fill(C.hdr);
  doc.rect(390, boxTop, 103, 14).fill(C.green);
  doc.rect(493, boxTop, 74, 14).fill(C.hdr);
  doc.rect(493, boxTop, 74, 14).fill(C.green);
  fc(C.white);
  doc.fontSize(7.2).font('Helvetica-Bold');
  doc.text('TOTALES', 395, boxTop + 3, { width: 93, align: 'left' });
  doc.text(`S/ ${parseFloat(factura.total).toFixed(2)}`, 498, boxTop + 3, { width: 64, align: 'right' });
  let afterBox = boxTop + 14;

  // ===================== QR / FOOTER BOX =====================
  let qrTop = singlePage ? 356 : afterBox + 15;
  if (qrTop + 55 > PG) { doc.addPage(); qrTop = 40; }
  doc.rect(143, qrTop, 309, 50).fill(C.grayBar);
  fc(C.black);
  doc.fontSize(7.2).font('Helvetica');
  fc(C.teal);
  doc.text(`Representación Impresa de la Factura Electrónica ${factura.numero_completo}`,
    196, qrTop + 16, { width: 250 });
  doc.text('Consulte su CPE en:', 196, qrTop + 25, { width: 250 });
  doc.text('https://www.sunat.gob.pe', 196, qrTop + 33, { width: 250 });
  qrTop += 55;

  // ===================== YAPE =====================
  let yapeTop = singlePage ? 424 : qrTop + 5;
  if (yapeTop + 10 > PG) { doc.addPage(); yapeTop = 40; }
  if (factura.yape) {
    fc(C.teal);
    doc.fontSize(7.8).font('Helvetica');
    doc.text(`YAPE: ${factura.yape}`, L, singlePage ? sy(424, 7.8) : yapeTop);
  }

  // ===================== BANK INFO =====================
  let bankTop = singlePage ? 426 : yapeTop + 10;
  if (bankTop + 40 > PG) { doc.addPage(); bankTop = 40; }
  if (factura.banco_nombre) {
    doc.rect(L, bankTop, CW, 36).fill(C.grayBar);
    const bankCols = [
      { x: 31, w: 207 }, { x: 239, w: 132 },
      { x: 372, w: 77 }, { x: 450, w: 114 },
    ];
    bankCols.forEach(bc => doc.rect(bc.x, bankTop + 4, bc.w, 12).fill(C.grayCell));

    fc(C.teal);
    doc.fontSize(7.2).font('Helvetica-Bold');
    doc.text('BANCO', 122, singlePage ? sy(439, 7.2) : bankTop + 7);
    doc.text('TIPO DE CUENTA', 276, singlePage ? sy(439, 7.2) : bankTop + 7);
    doc.text('NRO DE CUENTA', 382, singlePage ? sy(439, 7.2) : bankTop + 7);
    doc.text('CCI', 501, singlePage ? sy(439, 7.2) : bankTop + 7);

    doc.fontSize(7.2).font('Helvetica');
    fc(C.teal);
    doc.text(factura.banco_nombre, 63, singlePage ? sy(453, 7.2) : bankTop + 21);
    doc.text('CUENTA_CORRIENTE - SOLES', 240, singlePage ? sy(453, 7.2) : bankTop + 21);
    doc.text(factura.banco_numero_cuenta || '', 372, singlePage ? sy(453, 7.2) : bankTop + 21);
    doc.text(factura.banco_cci || '', 451, singlePage ? sy(453, 7.2) : bankTop + 21);
  }

  doc.end();
  return doc;
}

module.exports = { generateFacturaPDF };
