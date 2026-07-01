const { generateFacturaPDF } = require('./src/utils/pdfGenerator');
const fs = require('fs');

const doc = generateFacturaPDF(
  {
    numero_completo: 'F001-00000001',
    empresa_razon_social: 'J & R INVERSIONES JIPPI E.I.R.L.',
    empresa_ruc: '20553920648',
    empresa_direccion: 'AV. 1ERO DE MAYO MZA. B-3 LOTE. 2 ASOC SOC UNION DE COLONIZ',
    telefono: '(01) 280-6150 | 999 855 513 / 999 231 925 / 999 588 832',
    email: 'inversionesjippiventas@gmail.com',
    web: 'ventas@abrazaderasduker.com - www.abrazaderasduker.com',
    cliente_nombre: 'REPUESTOS AUTOMOTRIZ VALVERDE E.I.R.L.',
    tipo_documento: 'RUC',
    numero_documento: '20547233001',
    cliente_direccion: 'AV. NICOLAS AYLLON NRO. 3326 VEINTISIETE DE ABRIL LIMA - LIMA - ATE ATE - LIMA - LIMA',
    created_at: '2025-01-15T10:30:00Z',
    guia_remision: '',
    orden_codigo: '',
    subtotal: 2919.66,
    igv: 525.54,
    total: 3445.20,
    notas: 'V.CELIA',
    yape: '999 588 832',
    banco_nombre: 'BANCO DE CREDITO DEL PERU - BCP',
    banco_tipo_cuenta: 'CUENTA_CORRIENTE - SOLES',
    banco_numero_cuenta: '1912105140040',
    banco_cci: '00219100210514004052',
  },
  [
    { cantidad: 700, codigo: '25-40 F9', descripcion: '25-40 F9 W1 ABRAZADERA DUKER', precio_unitario: 0.98, subtotal: 688.14 },
    { cantidad: 700, codigo: '90-110 F9', descripcion: '90-110 F9 W1 ABRAZADERA DUKER', precio_unitario: 1.53, subtotal: 1073.73 },
    { cantidad: 690, codigo: '100-120F9', descripcion: '100-120 F9 W1 ABRAZADERA DUKER', precio_unitario: 1.68, subtotal: 1157.80 },
  ]
);

const ws = fs.createWriteStream('test-output.pdf');
doc.pipe(ws);
ws.on('finish', () => {
  const stat = fs.statSync('test-output.pdf');
  console.log('PDF:', stat.size, 'bytes');
  console.log('Path:', __dirname + '/test-output.pdf');
});
