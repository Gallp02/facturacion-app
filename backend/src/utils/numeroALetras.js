function numeroALetras(num) {
  const unidades = ['CERO', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);

  function convertirGrupo(n) {
    let r = '';
    if (n === 0) return 'CERO';
    if (n === 100) return 'CIEN';
    if (n > 99) {
      r += centenas[Math.floor(n / 100)] + ' ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        r += (r && n === 1 ? 'UN' : unidades[n]);
        return r.trim();
      }
      r += decenas[Math.floor(n / 10)];
      const u = n % 10;
      if (u > 0) {
        if (Math.floor(n / 10) === 2) {
          r = 'VEINTI' + unidades[u].toLowerCase();
        } else {
          r += ' Y ' + unidades[u];
        }
      }
    }
    return r.trim();
  }

  function convertirEntero(n) {
    if (n === 0) return 'CERO';
    let r = '';
    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;

    if (millones > 0) {
      if (millones === 1) r += 'UN MILLON ';
      else r += convertirGrupo(millones) + ' MILLONES ';
    }
    if (miles > 0) {
      if (miles === 1) r += 'MIL ';
      else r += convertirGrupo(miles) + ' MIL ';
    }
    if (resto > 0) {
      r += convertirGrupo(resto);
    }
    return r.trim();
  }

  let resultado = convertirEntero(entero);
  if (decimal > 0) {
    resultado += ' CON ' + String(decimal).padStart(2, '0') + '/100';
  } else {
    resultado += ' CON 00/100';
  }

  return resultado;
}

module.exports = { numeroALetras };
