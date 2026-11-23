// Festivos de una sede para un año: fuente automática + fiestas locales con regla + correcciones a mano.
// No toca la página ni el servidor: se prueba con Node (pruebas/motor.test.mjs).

const pad = (n) => String(n).padStart(2, '0');
const iso = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const fechaUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const masDias = (s, n) => { const dt = fechaUTC(s); dt.setUTCDate(dt.getUTCDate() + n); return iso(dt); };
export const diaSemana = (s) => (fechaUTC(s).getUTCDay() + 6) % 7; // 0 = lunes … 6 = domingo

// Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher).
export function domingoPascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

// Fecha de una fiesta local en un año: fija (MM-DD) o N días después del domingo de Pascua.
export function fechaLocal(local, anio) {
  if (local.regla === 'pascua') return masDias(domingoPascua(anio), Number(local.dias) || 0);
  const m = /^(\d{2})-(\d{2})$/.exec(local.fecha || '');
  return m ? `${anio}-${m[1]}-${m[2]}` : null;
}

// Identifica una fuente: si cambia, la descarga anterior ya no vale.
export function claveFuente(fuente = {}) {
  const tipo = fuente.tipo || 'ninguna';
  const conUrl = tipo === 'ics' || tipo === 'json';
  return `${tipo}|${conUrl ? '' : String(fuente.region || '').toUpperCase()}|${conUrl ? fuente.url || '' : ''}`;
}

// descarga: { clave, anio, lista: [{ fecha, nombre }], fecha } recién bajada del servidor (o null).
export function calcularFestivos(fest = {}, anio, descarga = null) {
  const fuente = fest.fuente || { tipo: 'ninguna' };
  const clave = claveFuente(fuente);
  const vale = (x) => x && x.anio === anio && x.clave === clave && Array.isArray(x.lista);
  const usada = vale(descarga) ? descarga : vale(fest.cache) ? fest.cache : null;
  const porFecha = new Map();
  const poner = (h) => { if (h.fecha && h.fecha.startsWith(`${anio}-`) && !porFecha.has(h.fecha)) porFecha.set(h.fecha, h); };

  for (const h of (usada && usada.lista) || []) {
    let fecha = h.fecha, nota = '';
    if (fuente.trasladarDomingos && diaSemana(fecha) === 6) {
      fecha = masDias(fecha, 1);
      nota = `trasladado del domingo ${Number(h.fecha.slice(8))}/${Number(h.fecha.slice(5, 7))}`;
    }
    poner({ fecha, nombre: h.nombre, origen: 'fuente', nota });
  }
  for (const l of fest.locales || []) {
    const fecha = fechaLocal(l, anio);
    if (fecha) poner({ fecha, nombre: l.nombre, origen: 'local', nota: l.regla === 'pascua' ? `Pascua + ${l.dias} días` : 'fecha fija' });
  }
  for (const e of fest.extra || []) if (e && e.fecha) poner({ fecha: e.fecha, nombre: e.nombre || 'Festivo', origen: 'mano', nota: '' });

  const quitar = new Set(fest.quitar || []);
  const todos = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    lista: todos.filter(h => !quitar.has(h.fecha)),
    quitados: todos.filter(h => quitar.has(h.fecha)),
    fuente: {
      tipo: fuente.tipo || 'ninguna', clave,
      estado: fuente.tipo === 'ninguna' ? 'ninguna' : usada ? (usada === descarga ? 'descargada' : 'guardada') : 'sin-datos',
      fecha: usada ? usada.fecha : '', n: usada ? usada.lista.length : 0,
    },
  };
}
