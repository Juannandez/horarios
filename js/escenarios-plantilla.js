// Escenarios de ejemplo que se crean con un botón en «Escenarios y versiones». No tocan el cuadrante: se añaden a la
// lista y se abren o se comparan como cualquier otro.
import { resolverPatron } from './motor.js';

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
  const g = c.grupos.find(x => x.colectivo === 'TA' && !x.patronDe && !x.desde && !x.hasta && !x.soloLaborables);
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

export const PLANTILLAS_ESCENARIO = [
  { id: 'dos-lineas', nombre: 'Dos líneas de horario fijo', crea: dosLineas,
    nota: 'Dos líneas de horario fijo con el mismo rotatorio: cada persona entra siempre a la misma hora en su franja y el solape lo pone la otra línea. Horas y reparto a elegir.' },
];
