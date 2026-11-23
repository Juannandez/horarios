// «Comprobar antes de pedir»: qué pasaría si se concede una solicitud, aplicada sobre el cuadrante tal como está (sin
// rehacer el ajuste). Para el personal y para adpersat, antes de tramitarla en Portal Horario. No toca la página.
//
// Solicitud: { tipo: 'cambio'|'bolsaDia'|'bolsaHoras'|'ap'|'suelto'|'baja', persona, companero, desde, hasta, horas }
import { infracciones } from './puntuacion.js';

export const TIPOS_SOLICITUD = [
  { id: 'cambio', nombre: 'Cambio de turno con un compañero', codigo: null },
  { id: 'bolsaDia', nombre: 'Día de bolsa de horas', codigo: 'BO' },
  { id: 'bolsaHoras', nombre: 'Horas sueltas de bolsa', codigo: null },
  { id: 'ap', nombre: 'Asunto propio', codigo: 'AP' },
  { id: 'suelto', nombre: 'Día suelto de vacaciones', codigo: 'VS' },
  { id: 'baja', nombre: 'Baja o ausencia', codigo: 'B' },
];

const fechasEntre = (res, desde, hasta) => res.dias.filter(d => d.fecha >= desde && d.fecha <= (hasta || desde)).map(d => d.i);

// Celdas que cambia la solicitud: [{ pi, d, ti }] (ti = índice del turno nuevo).
export function cambiosDe(res, sol) {
  const pi = res.personas.findIndex(p => p.id === sol.persona);
  if (pi < 0) throw new Error('No se encuentra a esa persona en el cuadrante.');
  const dias = fechasEntre(res, sol.desde, sol.hasta);
  if (!dias.length) throw new Error('Las fechas no están en el año del cuadrante.');
  const tipo = TIPOS_SOLICITUD.find(t => t.id === sol.tipo);
  if (!tipo) throw new Error('Tipo de solicitud desconocido.');
  const D = res.D, cambios = [];
  if (sol.tipo === 'cambio') {
    const qi = res.personas.findIndex(p => p.id === sol.companero);
    if (qi < 0 || qi === pi) throw new Error('Elige un compañero distinto.');
    for (const d of dias) {
      const a = res.grid[pi * D + d], b = res.grid[qi * D + d];
      if (a !== b) { cambios.push({ pi, d, ti: b }); cambios.push({ pi: qi, d, ti: a }); }
    }
  } else if (tipo.codigo) {
    const ti = res.idx.get(tipo.codigo);
    if (ti == null) throw new Error(`El turno ${tipo.codigo} no existe en esta sede.`);
    for (const d of dias) if (res.grid[pi * D + d] !== ti) cambios.push({ pi, d, ti });
  }
  return { pi, dias, cambios };
}

export function comprobar(res, cfg, sol) {
  const { pi, dias, cambios } = cambiosDe(res, sol);
  const D = res.D, T = res.turnos, p = res.personas[pi];
  const grid = res.grid.slice();
  for (const c of cambios) grid[c.pi * D + c.d] = c.ti;
  // Cobertura de cada día y franja tocados, antes y después, frente al mínimo real.
  const colDe = (x) => res.colectivos.indexOf(res.personas[x].colectivo);
  const tocados = new Map();
  const apunta = (c, f, d, delta) => { const k = `${c}|${f}|${d}`; tocados.set(k, (tocados.get(k) || 0) + delta); };
  for (const c of cambios) {
    const antes = T[res.grid[c.pi * D + c.d]], despues = T[c.ti], col = colDe(c.pi);
    if (antes.trabaja) apunta(col, res.franjas.indexOf(antes.franja), c.d, -1);
    if (despues.trabaja) apunta(col, res.franjas.indexOf(despues.franja), c.d, +1);
  }
  // Horas sueltas de bolsa: la persona sale antes o entra después; cuenta como media persona menos en su franja.
  if (sol.tipo === 'bolsaHoras') for (const d of dias) { const t = T[res.grid[pi * D + d]]; if (t.trabaja) apunta(colDe(pi), res.franjas.indexOf(t.franja), d, 0); }
  const cobertura = [];
  for (const [k, delta] of tocados) {
    const [c, f, d] = k.split('|').map(Number);
    const antes = res.cobertura[c][f][d], minimo = res.necesidad[c][f][d], despues = antes + delta;
    cobertura.push({ fecha: res.dias[d].fecha, d, colectivo: res.colectivos[c], franja: res.franjas[f], antes, despues, minimo,
      aguante: despues - minimo, ok: despues >= minimo, justo: despues === minimo, parcial: sol.tipo === 'bolsaHoras' });
  }
  cobertura.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.franja.localeCompare(b.franja));
  // Reglas: lo que se rompería de nuevo en las personas afectadas (frente al cuadrante actual).
  const afectados = new Set(cambios.map(c => c.pi));
  const clave = (x, c) => `${x.k}|${c.pi}|${c.dias.join(',')}`;
  const antes = new Set(), nuevas = [];
  for (const x of infracciones(res, cfg)) for (const c of x.casos) if (afectados.has(c.pi)) antes.add(clave(x, c));
  for (const x of infracciones({ ...res, grid }, cfg)) for (const c of x.casos) {
    if (!afectados.has(c.pi) || antes.has(clave(x, c))) continue;
    nuevas.push({ k: x.k, nivel: x.nivel, titulo: x.titulo, persona: res.personas[c.pi].id, texto: c.texto, fechas: c.dias.map(d => res.dias[d].fecha) });
  }
  // Bolsa: horas que gasta (día de bolsa: las del turno que deja; horas sueltas: las pedidas) y saldo que queda.
  let bolsa = null;
  if (sol.tipo === 'bolsaDia' || sol.tipo === 'bolsaHoras') {
    const gasta = sol.tipo === 'bolsaHoras' ? Number(sol.horas) || 0 : dias.reduce((a, d) => a + (T[res.grid[pi * D + d]].horas || 0), 0);
    const saldo = p.bolsa ? p.bolsa.saldo : 0;
    bolsa = { saldo, gasta, queda: Math.round((saldo - gasta) * 10) / 10, ok: saldo - gasta >= -1e-9 };
  }
  const minimosOk = cobertura.every(c => c.ok);
  const bloquea = nuevas.filter(n => n.nivel === 'bloquea');
  const sinTurno = !cambios.length && sol.tipo !== 'bolsaHoras';
  return {
    persona: p.id, companero: sol.companero || '', cambios, cobertura, reglas: nuevas, bolsa,
    minimosOk, reglasOk: !bloquea.length, sinTurno,
    viable: !sinTurno && minimosOk && !bloquea.length && (!bolsa || bolsa.ok),
  };
}

// Texto para pegar en la solicitud de Portal Horario.
export function resumenSolicitud(res, sol, r) {
  const tipo = TIPOS_SOLICITUD.find(t => t.id === sol.tipo);
  const fechas = sol.hasta && sol.hasta !== sol.desde ? `del ${sol.desde} al ${sol.hasta}` : `el ${sol.desde}`;
  const l = [`${tipo.nombre} ${fechas}${sol.tipo === 'cambio' ? ` con ${sol.companero}` : ''}${sol.tipo === 'bolsaHoras' ? ` (${sol.horas} h)` : ''}.`];
  if (sol.tipo === 'cambio') for (const c of r.cambios.filter(c => c.pi === r.cambios[0]?.pi)) {
    const d = res.dias[c.d], mio = res.turnos[res.grid[c.pi * res.D + c.d]].codigo, suyo = res.turnos[c.ti].codigo;
    l.push(`${d.fecha}: yo ${mio} → ${suyo}.`);
  }
  l.push(r.minimosOk ? 'Se cubren los mínimos de todos los días y franjas afectados.' : `Deja bajo mínimo: ${r.cobertura.filter(c => !c.ok).map(c => `${c.fecha} ${c.franja} (${c.despues} de ${c.minimo})`).join(', ')}.`);
  if (r.reglas.length) l.push(`Reglas: ${r.reglas.map(x => `${x.persona}: ${x.titulo} (${x.texto})`).join('; ')}.`);
  if (r.bolsa) l.push(`Bolsa: saldo ${r.bolsa.saldo} h, gasta ${r.bolsa.gasta} h, quedan ${r.bolsa.queda} h.`);
  return l.join(' ');
}
