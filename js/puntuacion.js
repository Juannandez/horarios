// Puntuación del cuadrante e infracciones casilla a casilla (como Timefold, Quinyx y el «Roster Analyser» de HealthRoster).
// Cada regla del catálogo tiene un nivel:
//   · «bloquea»: el ajuste nunca la incumple y un cambio a mano que la rompa se rechaza → puntuación DURA;
//   · «avisa»: el ajuste la respeta si puede; a mano se permite y sale en el panel → puntuación BLANDA;
//   · «informe»: el ajuste no la tiene en cuenta; solo sale en los informes → no puntúa.
// La puntuación MEDIA son las personas que faltan frente a los mínimos (huecos).
// No toca la página: se prueba con Node.
import { nivelRegla } from './datos-base.js';

export const NIVELES = [
  { id: 'bloquea', nombre: 'Bloquea', texto: 'El ajuste nunca la incumple y no deja cambios a mano que la rompan.' },
  { id: 'avisa', nombre: 'Avisa', texto: 'El ajuste la respeta si puede. A mano se permite, con aviso.' },
  { id: 'informe', nombre: 'Solo informe', texto: 'El ajuste no la tiene en cuenta. Sale en los informes.' },
];
export const nivelDe = nivelRegla;

const TITULOS = {
  descanso: (v) => `Menos de ${v} h de descanso entre turnos`,
  maxSeguidos: (v) => `Más de ${v} días seguidos`,
  maxNoches: (v) => `Más de ${v} noches al año`,
  bloquesNoche: () => 'Noches sueltas (fuera de bloque)',
  maxNochesSeguidas: (v) => `Más de ${v} noches seguidas`,
  descansoTrasNoche: (v) => `Menos de ${v} días libres tras las noches`,
  maxFines: (v) => `Más de ${v} fines de semana al año`,
  maxFinesSeguidos: (v) => `Más de ${v} fines de semana seguidos`,
  minFinesLibresMes: (v) => `Mes con menos de ${v} fin${Number(v) === 1 ? '' : 'es'} de semana libre${Number(v) === 1 ? '' : 's'}`,
  minFinesLibresEntre: (v) => `Menos de ${v} fines de semana libres entre dos trabajados`,
  finesCoherentes: () => 'Fin de semana en otro turno que su semana',
  finCompleto: () => 'Fin de semana partido (solo el sábado o solo el domingo)',
  maxEntradas: (v) => `Más de ${v} horas de entrada distintas en el año`,
  minLibresSemana: (v) => `Semana con menos de ${v} días libres`,
  unaFranjaSemana: () => 'Semana con mañanas y tardes mezcladas',
  tope: (v) => `Más de ${v} h por encima de la jornada`,
};

// Infracciones de las reglas activas: { k, nivel, titulo, casos: [{ pi, dias: [d…], texto }] }.
export function infracciones(res, cfg) {
  const R = (cfg && cfg.reglas) || {};
  const activa = (k) => R[k] && R[k].activo;
  const val = (k) => Number(R[k].valor);
  const { D, dias, turnos: T, grid, personas } = res;
  const W = dias[D - 1].semana + 1;
  const sabados = dias.filter(d => d.dow === 5);
  const salida = {};
  for (const k of Object.keys(TITULOS)) if (activa(k)) salida[k] = { k, nivel: nivelDe(k, R[k]), titulo: TITULOS[k](R[k].valor), casos: [] };
  const turnoCorto = Math.min(...T.filter(t => t.trabaja && t.horas > 0).map(t => t.horas));

  for (let pi = 0; pi < personas.length; pi++) {
    const p = personas[pi];
    const t = (d) => T[grid[pi * D + d]];
    const trab = (d) => d >= 0 && d < D && t(d).trabaja;
    const noche = (d) => trab(d) && t(d).franja === 'noche';
    const caso = (k, ds, texto) => salida[k].casos.push({ pi, dias: ds, texto });

    if (salida.descanso) {
      const h = val('descanso');
      for (let d = 1; d < D; d++) {
        const a = t(d - 1), b = t(d);
        if (a.trabaja && b.trabaja && b.ini + 1440 - a.fm < h * 60) caso('descanso', [d - 1, d], `${a.codigo} → ${b.codigo}: ${((b.ini + 1440 - a.fm) / 60).toLocaleString('es-ES')} h`);
      }
    }
    if (salida.maxSeguidos) {
      const max = val('maxSeguidos');
      for (let d = 0; d < D; d++) {
        if (!trab(d) || trab(d - 1)) continue;
        let n = 1; while (trab(d + n)) n++;
        if (n > max) caso('maxSeguidos', Array.from({ length: n }, (_, i) => d + i), `${n} días seguidos`);
      }
    }
    if (salida.maxNoches) {
      // Cada persona con su tope: las de oficio más las cedidas que le permita la cesión (Cobertura y bolsa).
      const max = p.topeNoches != null ? p.topeNoches : val('maxNoches'); let n = 0; const sobran = [];
      for (let d = 0; d < D; d++) if (noche(d) && ++n > max) sobran.push(d);
      if (sobran.length) caso('maxNoches', sobran, `${n} noches`);
    }
    if (salida.bloquesNoche || salida.maxNochesSeguidas || salida.descansoTrasNoche) {
      for (let d = 0; d < D; d++) {
        if (!noche(d) || noche(d - 1)) continue;
        let n = 1; while (noche(d + n)) n++;
        const bloque = Array.from({ length: n }, (_, i) => d + i);
        // Una noche el 1 de enero o el 31 de diciembre sigue en el año de al lado: no es suelta.
        if (salida.bloquesNoche && n === 1 && d > 0 && d < D - 1) caso('bloquesNoche', bloque, 'noche suelta');
        if (salida.maxNochesSeguidas && n > val('maxNochesSeguidas')) caso('maxNochesSeguidas', bloque, `${n} noches seguidas`);
        if (salida.descansoTrasNoche) {
          const min = val('descansoTrasNoche'), fin = d + n;
          let libres = 0; while (fin + libres < D && !trab(fin + libres)) libres++;
          if (fin + min < D && libres < min) caso('descansoTrasNoche', [...bloque, fin + libres], `${libres} ${libres === 1 ? 'día libre' : 'días libres'} después`);
        }
      }
    }
    // Fines de semana: por sábado (con su domingo)
    const finde = sabados.map(s => ({ s, dias: [s.i, s.i + 1].filter(x => x < D), trab: trab(s.i) || trab(s.i + 1) }));
    if (salida.maxFines && !p.exentoFines) {
      const max = val('maxFines'); let n = 0; const sobran = [];
      for (const f of finde) if (f.trab && ++n > max) sobran.push(...f.dias.filter(trab));
      if (sobran.length) caso('maxFines', sobran, `${n} fines de semana`);
    }
    if (salida.maxFinesSeguidos && !p.exentoFines) {
      const max = val('maxFinesSeguidos'); let racha = 0;
      for (const f of finde) {
        racha = f.trab ? racha + 1 : 0;
        if (racha > max) caso('maxFinesSeguidos', f.dias.filter(trab), `${racha} fines de semana seguidos`);
      }
    }
    if (salida.minFinesLibresMes && !p.exentoFines) {
      const min = val('minFinesLibresMes');
      for (let m = 0; m < 12; m++) {
        const delMes = finde.filter(f => f.s.mes === m);
        if (!delMes.length) continue;
        const libres = delMes.filter(f => !f.trab).length;
        if (libres < min) caso('minFinesLibresMes', delMes.flatMap(f => f.dias.filter(trab)), `${libres} libres en el mes`);
      }
    }
    if (salida.minFinesLibresEntre && !p.exentoFines) {
      const min = val('minFinesLibresEntre'); let ultimo = -1;
      finde.forEach((f, k) => {
        if (!f.trab) return;
        if (ultimo >= 0 && k - ultimo - 1 < min) caso('minFinesLibresEntre', f.dias.filter(trab), `${k - ultimo - 1} libre${k - ultimo - 1 === 1 ? '' : 's'} desde el anterior trabajado`);
        ultimo = k;
      });
    }
    if (salida.finesCoherentes && !p.horarioLibre) {   // los fijos discontinuos no tienen «semana de mañana o de tarde»
      for (const f of finde) {
        if (!f.trab) continue;
        let m = 0, ta = 0;
        for (let d = f.s.i - 5; d < f.s.i; d++) if (trab(d)) { if (t(d).franja === 'manana') m++; else if (t(d).franja === 'tarde') ta++; }
        const malos = f.dias.filter(d => trab(d) && ((m > ta && t(d).franja === 'tarde') || (ta > m && t(d).franja === 'manana')));
        if (malos.length) caso('finesCoherentes', malos, m > ta ? 'tarde en semana de mañana' : 'mañana en semana de tarde');
      }
    }
    if (salida.finCompleto && !p.exentoFines) {
      // El otro día sin turno y disponible (no vacaciones, baja, AJ…): fin de semana partido.
      for (const f of finde) {
        if (f.dias.length < 2) continue;
        const [a, b] = f.dias;
        if (trab(a) !== trab(b) && t(trab(a) ? b : a).disponible !== false) caso('finCompleto', [trab(a) ? a : b], trab(a) ? 'solo el sábado' : 'solo el domingo');
      }
    }
    if (salida.unaFranjaSemana && !p.horarioLibre) {
      for (let l = 0; l + 6 < D; l++) {
        if (dias[l].dow !== 0) continue;
        const m = [], t2 = []; for (let x = l; x <= l + 6; x++) if (trab(x)) { if (t(x).franja === 'manana') m.push(x); else if (t(x).franja === 'tarde') t2.push(x); }
        if (m.length && t2.length) caso('unaFranjaSemana', m.length >= t2.length ? t2 : m, `${m.length} de mañana y ${t2.length} de tarde`);
      }
    }
    if (salida.minLibresSemana) {
      const min = val('minLibresSemana');
      for (let l = 0; l + 6 < D; l++) {
        if (dias[l].dow !== 0) continue;
        const trabajados = []; for (let x = l; x <= l + 6; x++) if (trab(x)) trabajados.push(x);
        if (7 - trabajados.length < min) caso('minLibresSemana', trabajados, `semana del ${dias[l].fecha.slice(8)}/${dias[l].fecha.slice(5, 7)}: ${7 - trabajados.length} ${7 - trabajados.length === 1 ? 'día libre' : 'días libres'}`);
      }
    }
    if (salida.maxEntradas) {
      const max = val('maxEntradas'), vistas = new Map();
      for (let d = 0; d < D; d++) if (trab(d)) { const h = t(d).inicio; if (!vistas.has(h)) vistas.set(h, d); }
      if (vistas.size > max) caso('maxEntradas', [...vistas.values()].slice(max), `${vistas.size} horas de entrada: ${[...vistas.keys()].sort().join(', ')}`);
    }
    if (salida.tope) {
      const exceso = p.horas - p.objetivo;
      if (exceso > val('tope') && exceso >= turnoCorto) caso('tope', [], `${exceso.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h de más`);
    }
  }
  return Object.values(salida);
}

// Puntuación en tres niveles. Cuanto más cerca de 0, mejor; se compara primero el duro, luego el medio y luego el blando.
export function puntuacion(res, cfg, lista = infracciones(res, cfg)) {
  const n = (nivel) => lista.filter(x => x.nivel === nivel).reduce((s, x) => s + x.casos.length, 0);
  const medio = res.huecos.reduce((s, h) => s + h.falta, 0);
  return { duro: n('bloquea'), medio, blando: n('avisa'), informe: n('informe') };
}
export const comparaPuntuacion = (a, b) => (a.duro - b.duro) || (a.medio - b.medio) || (a.blando - b.blando);

// Mapa casilla → reglas incumplidas (para el triángulo de la esquina): clave pi*D+d.
export function mapaCasillas(res, lista) {
  const m = new Map();
  for (const x of lista) for (const c of x.casos) for (const d of c.dias) {
    const k = c.pi * res.D + d;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ k: x.k, nivel: x.nivel, titulo: x.titulo, texto: c.texto });
  }
  return m;
}
