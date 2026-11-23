// Vacaciones estivales por persona, como las organiza Procesos horarios (correo de 2027):
// - periodos fijos con sus plazas por colectivo; 17 días hábiles (de lunes a viernes no festivos) por periodo;
// - cada persona pide un periodo (o fechas fuera de los periodos) y puede disfrutar de 12 a 16 días en lugar de
//   17, quitando días al principio, al final o en ambos;
// - tienen preferencia quienes perdieron el sorteo del año anterior y quienes se acogen a la medida 5.7 del Plan
//   de Igualdad; una pareja va en una sola solicitud y el sorteo vale para las dos personas;
// - si un periodo tiene más peticiones que plazas, se sortea; quien pierde elige, por orden de salida del sorteo,
//   entre los periodos de menor demanda; quien no pide nada va a los periodos con vacantes.
// No toca la página: se usa desde el motor y la vista Vacaciones, y se prueba con Node.

const pad = (n) => String(n).padStart(2, '0');
const fechaUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const masDias = (s, n) => { const dt = fechaUTC(s); dt.setUTCDate(dt.getUTCDate() + n); return iso(dt); };
const dow = (s) => (fechaUTC(s).getUTCDay() + 6) % 7;

// Sorteo reproducible: la misma semilla da siempre el mismo orden (mulberry32).
function azar(semilla) {
  let h = 1779033703 ^ String(semilla).length;
  for (const c of String(semilla)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const barajar = (lista, rnd) => { const l = lista.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

// Días hábiles de un tramo: de lunes a viernes que no son festivo.
export function diasHabiles(inicio, fin, festivos = new Set()) {
  let n = 0;
  for (let d = inicio; d <= fin; d = masDias(d, 1)) if (dow(d) < 5 && !festivos.has(d)) n++;
  return n;
}
export const diasNaturales = (inicio, fin) => Math.round((fechaUTC(fin) - fechaUTC(inicio)) / 86400000) + 1;

// Fechas reales de una persona dentro de su periodo, quitando días hábiles si disfruta menos de los del periodo.
export function recortarTramo(inicio, fin, dias, ajuste, festivos = new Set()) {
  let a = inicio, b = fin, sobran = Math.max(0, diasHabiles(inicio, fin, festivos) - dias);
  const habil = (d) => dow(d) < 5 && !festivos.has(d);
  let lado = ajuste === 'inicio' ? 'inicio' : 'final';
  while (sobran > 0 && a <= b) {
    if (lado === 'inicio') { while (a <= b && !habil(a)) a = masDias(a, 1); a = masDias(a, 1); while (a <= b && !habil(a)) a = masDias(a, 1); }
    else { while (b >= a && !habil(b)) b = masDias(b, -1); b = masDias(b, -1); while (b >= a && !habil(b)) b = masDias(b, -1); }
    sobran--;
    if (ajuste === 'ambos') lado = lado === 'inicio' ? 'final' : 'inicio';
  }
  return a <= b ? { inicio: a, fin: b } : null;
}

// personas: [{ id, colectivo }]. Devuelve { porPersona: Map(id → asignación), periodos: [...], sorteo: [...], sinPlaza: [...] }.
export function asignarVacaciones(vac, personas, festivos = []) {
  const fest = new Set(festivos.map(f => (typeof f === 'string' ? f : f.fecha)));
  const periodos = (vac.periodos || []).filter(p => p && p.inicio && p.fin && p.inicio <= p.fin)
    .map((p, i) => ({ ...p, n: p.n ?? i + 1, plazas: { TA: Number(p.plazas?.TA) || 0, SUP: Number(p.plazas?.SUP) || 0 }, pedidas: { TA: 0, SUP: 0 }, asignadas: { TA: 0, SUP: 0 } }));
  const porN = new Map(periodos.map(p => [String(p.n), p]));
  const sol = vac.solicitudes || {};
  const existe = new Map(personas.map(p => [p.id, p]));
  const resultado = new Map();
  const rnd = azar(vac.semilla || 'sorteo');

  // Unidades: una persona o una pareja (las dos con la solicitud de la primera).
  const vistas = new Set(), unidades = [];
  for (const p of personas) {
    if (vistas.has(p.id)) continue;
    const s = sol[p.id] || {};
    const otra = s.pareja && existe.has(s.pareja) && s.pareja !== p.id && !vistas.has(s.pareja) ? existe.get(s.pareja) : null;
    const miembros = otra ? [p, otra] : [p];
    miembros.forEach(m => vistas.add(m.id));
    unidades.push({ miembros, s, preferente: !!(s.exento || s.igualdad || (otra && (sol[otra.id]?.exento || sol[otra.id]?.igualdad))) });
  }
  const cabe = (per, u) => { const n = { TA: 0, SUP: 0 }; u.miembros.forEach(m => n[m.colectivo]++); return ['TA', 'SUP'].every(c => per.asignadas[c] + n[c] <= per.plazas[c]); };
  const dar = (per, u, motivo) => u.miembros.forEach(m => {
    per.asignadas[m.colectivo]++;
    const s = sol[m.id] || u.s;
    const tramo = recortarTramo(per.inicio, per.fin, Math.min(Number(s.dias) || vac.diasHabiles || 17, diasHabiles(per.inicio, per.fin, fest)), s.ajuste || 'final', fest);
    resultado.set(m.id, { periodo: per.n, ...tramo, motivo, pedido: u.s.periodo || '' });
  });

  // 1. Fuera de periodo: se respetan las fechas pedidas (no ocupan plaza de ningún periodo).
  const conPeriodo = [], sinSolicitud = [];
  for (const u of unidades) {
    const s = u.s;
    if (s.periodo === 'fuera' && s.inicio && s.fin && s.inicio <= s.fin) {
      u.miembros.forEach(m => resultado.set(m.id, { periodo: 'fuera', inicio: s.inicio, fin: s.fin, motivo: 'Fuera de los periodos, a petición propia', pedido: 'fuera' }));
    } else if (s.periodo && porN.has(String(s.periodo))) {
      const per = porN.get(String(s.periodo)); u.miembros.forEach(m => per.pedidas[m.colectivo]++); conPeriodo.push(u);
    } else sinSolicitud.push(u);
  }
  // 2. Preferentes primero; después el resto. Si no caben, sorteo entre quienes piden ese periodo.
  const sorteo = [], perdedores = [];
  for (const preferentes of [true, false]) {
    for (const per of periodos) {
      const piden = barajar(conPeriodo.filter(u => u.preferente === preferentes && String(u.s.periodo) === String(per.n)), rnd);
      // Por colectivo: las plazas de supervisión no sirven para teleasistencia, ni al revés.
      const n = { TA: 0, SUP: 0 }; piden.forEach(u => u.miembros.forEach(m => n[m.colectivo]++));
      const libres = { TA: per.plazas.TA - per.asignadas.TA, SUP: per.plazas.SUP - per.asignadas.SUP };
      const hay = ['TA', 'SUP'].some(c => n[c] > libres[c]);
      for (const u of piden) {
        if (cabe(per, u)) dar(per, u, preferentes ? 'Periodo pedido (con preferencia)' : hay ? 'Periodo pedido (ganó el sorteo)' : 'Periodo pedido');
        else perdedores.push(u);
      }
      if (hay && !preferentes) sorteo.push({ periodo: per.n, detalle: ['TA', 'SUP'].filter(c => n[c] > libres[c]).map(c => `${n[c]} peticiones de ${c === 'TA' ? 'teleasistencia' : 'supervisión'} para ${Math.max(0, libres[c])} plazas`).join(' y '),
        orden: piden.map(u => u.miembros.map(m => m.id).join(' + ')) });
    }
  }
  // 3. Quien pierde elige, por orden de salida, entre los periodos de menor demanda con hueco.
  const menorDemanda = (u, original) => periodos.filter(p => cabe(p, u)).sort((a, b) =>
    (a.pedidas.TA + a.pedidas.SUP) - (b.pedidas.TA + b.pedidas.SUP) || Math.abs(a.n - original) - Math.abs(b.n - original))[0];
  const sinPlaza = [];
  for (const u of perdedores) {
    const per = menorDemanda(u, Number(u.s.periodo));
    if (per) dar(per, u, `Cambio por sorteo: pidió el ${u.s.periodo}`); else u.miembros.forEach(m => sinPlaza.push(m.id));
  }
  // 4. Sin solicitud: a los periodos con más vacantes.
  for (const u of sinSolicitud) {
    const per = periodos.filter(p => cabe(p, u)).sort((a, b) =>
      ((b.plazas.TA + b.plazas.SUP) - (b.asignadas.TA + b.asignadas.SUP)) - ((a.plazas.TA + a.plazas.SUP) - (a.asignadas.TA + a.asignadas.SUP)) || a.n - b.n)[0];
    if (per) dar(per, u, 'Sin solicitud: periodo con vacantes'); else u.miembros.forEach(m => sinPlaza.push(m.id));
  }
  return { porPersona: resultado, periodos, sorteo, sinPlaza };
}

// Periodos estivales de 2027 del correo de Procesos horarios de Sevilla. Plazas por periodo y turno de teleasistencia:
// M-R-P 17, C 2, T 4 y 9M 1 = 24. Con un solo turno rotatorio, las 24 plazas son del turno común.
export const PERIODOS_SEVILLA_2027 = [
  ['2027-06-21', '2027-07-13'], ['2027-06-28', '2027-07-20'], ['2027-07-05', '2027-07-27'], ['2027-07-12', '2027-08-03'],
  ['2027-07-19', '2027-08-10'], ['2027-07-26', '2027-08-18'], ['2027-08-02', '2027-08-25'], ['2027-08-09', '2027-09-01'],
  ['2027-08-16', '2027-09-08'], ['2027-08-23', '2027-09-14'], ['2027-08-30', '2027-09-21'],
];
