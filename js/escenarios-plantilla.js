// Escenarios de ejemplo que se crean con un botón en «Escenarios y versiones». No tocan el cuadrante: se añaden a la
// lista y se abren o se comparan como cualquier otro.
import { resolverPatron } from './motor.js';

const copia = (o) => JSON.parse(JSON.stringify(o));

// Dos líneas de horario fijo (propuesta 1 del estudio de solapes, docs/fuentes-cgt/estudio-solapes-turnos.md):
// cada persona tiene siempre la misma hora de entrada en su franja, y el solape lo pone la otra línea.
//   Línea A: mañana 07:45-14:45 · tarde 14:45-21:45 (15 min de solape con la noche 22-08, que no cambia).
//   Línea B: mañana 09:00-16:00 · tarde 16:00-23:00 (solape de 14:45-16:00 y de 22:00-23:00).
// El grupo de teleasistencia con patrón propio se parte en dos mitades con el mismo rotatorio (mismas semanas y
// fines de semana); solo cambian las horas. Supervisión y refuerzos siguen el patrón de la línea A.
export const TURNOS_DOS_LINEAS = [
  { codigo: 'MA', nombre: 'Mañana línea A', inicio: '07:45', fin: '14:45', franja: 'manana', color: '#FFD37A' },
  { codigo: 'TA', nombre: 'Tarde línea A', inicio: '14:45', fin: '21:45', franja: 'tarde', color: '#F39A5E' },
  { codigo: 'MB', nombre: 'Mañana línea B', inicio: '09:00', fin: '16:00', franja: 'manana', color: '#FBE9B7' },
  { codigo: 'TB', nombre: 'Tarde línea B', inicio: '16:00', fin: '23:00', franja: 'tarde', color: '#F7C3A0' },
];

export function dosLineas(sede, reparto = 0.5) {
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
  for (const nt of TURNOS_DOS_LINEAS) if (!c.turnos.some(x => x.codigo === nt.codigo)) c.turnos.splice(c.turnos.findIndex(x => x.franja === 'libre'), 0, copia(nt));
  const total = Math.floor(Number(g.personas) || 0), nA = Math.ceil(total * reparto);
  const b = { ...copia(g), id: 'tb', nombre: 'Línea B (09-16 / 16-23)', prefijo: 'TB', personas: total - nA, patron: conLinea('MB', 'TB'), patronDe: '' };
  Object.assign(g, { nombre: 'Línea A (07:45-14:45 / 14:45-21:45)', personas: nA, patron: conLinea('MA', 'TA'), patronDe: '' });
  c.grupos.splice(c.grupos.indexOf(g) + 1, 0, b);
  // Las reglas de solape sobre el turno anterior ya no tienen sentido.
  for (const r of c.solapes || []) if (r.base === m || r.base === t) r.activo = false;
  return c;
}

export const PLANTILLAS_ESCENARIO = [
  { id: 'dos-lineas', nombre: 'Dos líneas de horario fijo', crea: dosLineas,
    nota: 'Línea A 07:45-14:45 / 14:45-21:45 (15 min de solape con la noche) y línea B 09-16 / 16-23 (solapes de 14:45-16 y 22-23), mitad y mitad, mismo rotatorio. Cada persona entra siempre a la misma hora en su franja.' },
];
