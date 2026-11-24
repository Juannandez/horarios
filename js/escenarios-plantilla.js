// Escenarios de ejemplo que se crean con un botón en «Escenarios y versiones». No tocan el cuadrante: se añaden a la
// lista y se abren o se comparan como cualquier otro.
import { resolverPatron, prepararTurno, horasDeTurno } from './motor.js';
import { ROTATORIOS } from './datos-base.js';

const copia = (o) => JSON.parse(JSON.stringify(o));

// Dos líneas de horario fijo (propuesta 1 del estudio de solapes, docs/fuentes-cgt/estudio-solapes-turnos.md):
// cada persona tiene siempre la misma hora de entrada en su franja, y el solape lo pone la otra línea.
//   Línea A: mañana 07:45-14:45 · tarde 14:45-21:45 (15 min de solape con la noche 22-08, que no cambia).
//   Línea B: mañana 08:15-15:15 · tarde 15:15-22:15 (solape de 08:15-14:45, 14:45-15:15 y 22:00-22:15).
// Las horas de las dos líneas y el reparto se eligen al crear el escenario (y luego se cambian en Turnos).
// El grupo de teleasistencia con patrón propio se parte en dos mitades con el mismo rotatorio (mismas semanas y
// fines de semana); solo cambian las horas. Supervisión y refuerzos siguen el patrón de la línea A.
export const TURNOS_DOS_LINEAS = [
  { codigo: 'MA', nombre: 'Mañana línea A', inicio: '07:45', fin: '14:45', franja: 'manana', color: '#FFD37A' },
  { codigo: 'TA', nombre: 'Tarde línea A', inicio: '14:45', fin: '21:45', franja: 'tarde', color: '#F39A5E' },
  { codigo: 'MB', nombre: 'Mañana línea B', inicio: '08:15', fin: '15:15', franja: 'manana', color: '#FBE9B7' },
  { codigo: 'TB', nombre: 'Tarde línea B', inicio: '15:15', fin: '22:15', franja: 'tarde', color: '#F7C3A0' },
];

// opciones: { reparto: parte de la línea A (0-1), horas: { MA: ['07:45', '14:45'], TA: […], MB: […], TB: […] } }
export function dosLineas(sede, opciones = {}) {
  const reparto = Math.min(1, Math.max(0, Number(opciones.reparto ?? 0.5)));
  const horas = opciones.horas || {};
  const c = copia(sede);
  const g = c.grupos.find(x => x.colectivo === 'TA' && !x.patronDe && !x.desde && !x.hasta && !x.soloLaborables && !(x.periodos || []).length);
  if (!g) throw new Error('No hay un grupo de teleasistencia con patrón propio para partir en dos líneas.');
  // El patrón del grupo con los turnos del rotatorio (los de mañana y tarde más usados) cambiados por los de cada línea.
  const patron = resolverPatron(g, c.grupos);
  const franja = new Map(c.turnos.map(t => [t.codigo, t.franja]));
  const masUsado = (f) => {
    const n = new Map(); for (const x of patron) if (franja.get(x) === f) n.set(x, (n.get(x) || 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const m = masUsado('manana'), t = masUsado('tarde');
  if (!m || !t) throw new Error('El patrón del grupo no tiene turnos de mañana y tarde.');
  const conLinea = (ma, ta) => patron.map(x => (x === m ? ma : x === t ? ta : x));
  const hora = (v) => (/^\d{2}:\d{2}$/.test(String(v || '')) ? v : null);
  for (const nt of TURNOS_DOS_LINEAS) {
    const t0 = { ...copia(nt) }, h = horas[nt.codigo];
    if (h && hora(h[0]) && hora(h[1])) { t0.inicio = h[0]; t0.fin = h[1]; }
    const ya = c.turnos.findIndex(x => x.codigo === nt.codigo);
    if (ya >= 0) c.turnos[ya] = { ...c.turnos[ya], inicio: t0.inicio, fin: t0.fin };
    else c.turnos.splice(c.turnos.findIndex(x => x.franja === 'libre'), 0, t0);
  }
  const hh = (k) => c.turnos.find(x => x.codigo === k);
  const total = Math.floor(Number(g.personas) || 0), nA = Math.ceil(total * reparto);
  const nombre = (l, m, t) => `Línea ${l} (${hh(m).inicio}-${hh(m).fin} / ${hh(t).inicio}-${hh(t).fin})`;
  const b = { ...copia(g), id: 'tb', nombre: nombre('B', 'MB', 'TB'), prefijo: 'TB', personas: total - nA, patron: conLinea('MB', 'TB'), patronDe: '' };
  Object.assign(g, { nombre: nombre('A', 'MA', 'TA'), personas: nA, patron: conLinea('MA', 'TA'), patronDe: '' });
  c.grupos.splice(c.grupos.indexOf(g) + 1, 0, b);
  // Las reglas de solape sobre el turno anterior ya no tienen sentido.
  for (const r of c.solapes || []) if (r.base === m || r.base === t) r.activo = false;
  return c;
}

// Mínimos de teleasistencia que dimensionó la consultora (Escenario 3, 09-09-2026), por día de la semana.
// Fuente: docs/fuentes-cgt/analisis-informe-consultora.md §2-3. Sevilla: lo que pide su patrón (89 punta L-V, 59 tarde
// L-V, 44 punta en fin de semana, 9 de noche). Málaga: 86 punta L-V y 9 de noche del patrón; tarde L-V (53) y fin
// de semana (47 sábado, 43 domingo) son su «necesidad» de 2025. La tarde de fin de semana no la da: se deja la actual.
// El festivo vale como domingo. Supervisión, sin cambios.
export const MINIMOS_CONSULTORA = {
  sevilla: { manana: { lv: 89, s: 44, d: 44 }, tarde: { lv: 59 }, noche: { lv: 9, s: 9, d: 9 } },
  malaga: { manana: { lv: 86, s: 47, d: 43 }, tarde: { lv: 53 }, noche: { lv: 9, s: 9, d: 9 } },
};
export function minimosConsultora(sede) {
  const c = copia(sede), m = MINIMOS_CONSULTORA[c.id];
  if (!m) throw new Error(`No hay mínimos de la consultora para ${c.nombre}.`);
  for (const fila of c.minimos.filter(x => x.colectivo === 'TA' && m[x.franja])) {
    const v = m[fila.franja];
    const dias = Array.isArray(fila.dias) && fila.dias.length === 7 ? fila.dias.slice() : [fila.laborable, fila.laborable, fila.laborable, fila.laborable, fila.laborable, fila.sabado, fila.domingo].map(Number);
    for (let k = 0; k < 5; k++) dias[k] = v.lv;
    if (v.s != null) dias[5] = v.s;
    if (v.d != null) dias[6] = v.d;
    fila.dias = dias; fila.festivo = dias[6];
  }
  return c;
}

// Pone uno de los rotatorios de ejemplo (datos-base.js, ROTATORIOS) en el grupo de teleasistencia con patrón propio,
// con los turnos de mañana, tarde y noche que ya use el grupo, y ajusta las reglas que lo acompañan: «una semana de
// tarde cada N» y «2 fines de semana libres entre dos trabajados» (un fin de semana de cada 3). Cambia cfg en su sitio.
export function aplicarRotatorio(cfg, id) {
  const rot = ROTATORIOS.find(r => r.id === id);
  if (!rot) throw new Error('Rotatorio desconocido.');
  const g = cfg.grupos.find(x => x.colectivo === 'TA' && !x.patronDe && !x.desde && !x.hasta && !x.soloLaborables && !(x.periodos || []).length) || cfg.grupos.find(x => !x.patronDe);
  if (!g) throw new Error('No hay un grupo con patrón propio.');
  const franja = new Map(cfg.turnos.map(t => [t.codigo, t.franja]));
  const actual = resolverPatron(g, cfg.grupos);
  const masUsado = (f, def) => {
    const n = new Map(); for (const x of actual) if (franja.get(x) === f) n.set(x, (n.get(x) || 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] || (franja.get(def) === f ? def : (cfg.turnos.find(t => t.franja === f) || {}).codigo) || def;
  };
  const cambio = { RM1: masUsado('manana', 'RM1'), RT1: masUsado('tarde', 'RT1'), N: masUsado('noche', 'N') };
  g.patron = rot.patron().map(c => cambio[c] || c);
  const R = cfg.reglas || (cfg.reglas = {});
  R.tardeCada = { ...(R.tardeCada || { nivel: 'informe' }), activo: true, valor: rot.tardeCada };
  R.minFinesLibresEntre = { ...(R.minFinesLibresEntre || {}), activo: true, valor: 2 };
  return { grupo: g, turnos: cambio };
}

// Mínimos por horas a partir de los de cada franja: cada hora, el de la franja cuyo turno la cubre (el mayor si hay
// varias). Devuelve { TA: [8][24], SUP: [8][24] } (filas: lunes … domingo y festivo).
export function minimosHoraDesdeFranjas(cfg) {
  const turnos = new Map(cfg.turnos.map(t => [t.codigo, prepararTurno(t)]));
  const horas = (col, f) => {
    for (const g of cfg.grupos) { if (g.colectivo !== col) continue; const c = resolverPatron(g, cfg.grupos).find(x => turnos.has(x) && turnos.get(x).franja === f); if (c) return horasDeTurno(turnos.get(c)); }
    const t = [...turnos.values()].find(x => x.franja === f); return t ? horasDeTurno(t) : [];
  };
  const out = {};
  for (const col of ['TA', 'SUP']) {
    const tabla = Array.from({ length: 8 }, () => Array(24).fill(0));
    for (const m of cfg.minimos.filter(x => x.colectivo === col)) {
      const dias = Array.isArray(m.dias) && m.dias.length === 7 ? m.dias : [m.laborable, m.laborable, m.laborable, m.laborable, m.laborable, m.sabado, m.domingo];
      const valores = [...dias, m.festivo ?? m.domingo ?? dias[6]];
      for (const h of horas(col, m.franja)) for (let fila = 0; fila < 8; fila++) {
        // Las horas de la noche después de medianoche son del día siguiente.
        const fi = h >= 24 ? (fila === 7 ? 7 : (fila + 1) % 7) : fila;
        tabla[fi][h % 24] = Math.max(tabla[fi][h % 24], Number(valores[fila]) || 0);
      }
    }
    out[col] = tabla;
  }
  return out;
}

// Demanda por horas que planificó la consultora (Informe Completo, Escenario 3, 09-09-2026; tablas de cobertura por
// día): teleasistencia, de 0 a 23 h. Lunes a viernes iguales; sábado y domingo iguales; el festivo, como el domingo.
export const MINIMOS_HORA_CONSULTORA = {
  sevilla: { lv: [9, 9, 9, 9, 9, 9, 9, 25, 70, 89, 89, 89, 89, 89, 89, 70, 59, 59, 59, 59, 59, 59, 34, 9], fs: [9, 9, 9, 9, 9, 9, 9, 17, 30, 44, 44, 44, 44, 44, 44, 35, 33, 33, 33, 33, 33, 33, 25, 9] },
  malaga: { lv: [9, 9, 9, 9, 9, 9, 9, 24, 60, 86, 86, 86, 86, 86, 86, 62, 56, 56, 56, 56, 56, 56, 32, 9], fs: [9, 9, 9, 9, 9, 9, 9, 17, 26, 42, 42, 42, 42, 42, 42, 33, 34, 34, 34, 34, 34, 34, 25, 9] },
};
export const tablaHoraConsultora = (sede) => {
  const x = MINIMOS_HORA_CONSULTORA[sede]; if (!x) return null;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(f => (f < 5 ? x.lv : x.fs).slice());
};

export const PLANTILLAS_ESCENARIO = [
  { id: 'dos-lineas', nombre: 'Dos líneas de horario fijo', crea: dosLineas,
    nota: 'Dos líneas de horario fijo con el mismo rotatorio: cada persona entra siempre a la misma hora en su franja y el solape lo pone la otra línea. Horas y reparto a elegir.' },
  { id: 'minimos-consultora', nombre: 'Mínimos de la consultora', crea: (s) => minimosConsultora(s), sinVentana: true,
    nota: 'Mínimos de teleasistencia del estudio de la consultora (Escenario 3): Sevilla 89 punta L-V, 59 tarde L-V, 44 fin de semana, 9 noche; Málaga 86 punta L-V, 53 tarde L-V, 47/43 sábado/domingo, 9 noche (tarde L-V y fin de semana de Málaga = su «necesidad» 2025). Tarde de fin de semana: la actual.' },
];
