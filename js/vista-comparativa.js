// Vista «Comparar»: dos cualesquiera entre el horario real de 2027 (solo cifras agregadas, ver js/comparativa.js),
// el cuadrante actual y los escenarios guardados de la sede (como la comparación de escenarios de Calabrio).
import { estado, esc, resultadoDe } from './nucleo.js';
import { HORARIO_2027, cifrasCuadrante, comparar, tiposSemana } from './comparativa.js';
import { resolverPatron } from './motor.js';
import { infracciones, puntuacion } from './puntuacion.js';
import { equidad } from './equidad.js';

const ui = () => (estado.ui.comparativa ||= { filtro: '', orden: 'tema', a: 'real', b: 'actual' });

// Cifras completas de un cuadrante generado: las de la comparación con 2027, la puntuación y el desequilibrio.
function cifrasDe(res, cfg) {
  const p = puntuacion(res, cfg, infracciones(res, cfg));
  const des = equidad(res, 'TA').filter(m => ['fines', 'festivos', 'domingos'].includes(m.k)).reduce((s, m) => s + m.desequilibrio, 0);
  return { ...cifrasCuadrante(res, 'TA'), duro: p.duro, medio: p.medio, blando: p.blando, desequilibrio: Math.round(des) };
}
const cache = new Map();   // escenario → cifras (los escenarios no cambian)
function opciones(cfg) {
  const lista = [];
  if (HORARIO_2027.sedes[cfg.id]) lista.push({ id: 'real', nombre: 'Horario real 2027' });
  lista.push({ id: 'actual', nombre: 'Este cuadrante' });
  for (const e of (estado.todo.escenarios || []).filter(x => x.sede === cfg.id)) lista.push({ id: `esc:${e.id}`, nombre: `Escenario «${e.nombre}»`, esc: e });
  return lista;
}
function cifrasOpcion(op, cfg) {
  if (!op) return null;
  if (op.id === 'real') return HORARIO_2027.sedes[cfg.id];
  if (op.id === 'actual') return cifrasDe(estado.res, cfg);
  if (!cache.has(op.id)) cache.set(op.id, cifrasDe(resultadoDe(op.esc.cfg), op.esc.cfg));
  return cache.get(op.id);
}
const fmt = (v, unidad) => (v == null ? '—' : `${String(v).replace('.', ',')}${unidad === '%' ? ' %' : ''}`);
const PILDORA = {
  1: '<span class="pildora si">Mejora</span>',
  0: '<span class="pildora">Igual</span>',
  '-1': '<span class="pildora" style="color:var(--bad);border-color:var(--bad)">Empeora</span>',
  null: '<span class="pildora" style="color:var(--muted)">Dato</span>',
};

function chipsCiclo(tipos) {
  return `<div class="fila-acciones" style="margin:0;gap:4px">${tipos.map((t, i) =>
    `<span class="pildora" title="Semana ${i + 1}: ${t[0] === '-' ? 'libre' : t[0]} de lunes a viernes, ${t[1] === '-' ? 'fin de semana libre' : `fin de semana ${t[1]}`}" style="cursor:default;font-family:var(--mono, monospace)">${esc(t)}</span>`).join('')}</div>`;
}

export function pintarComparativa(raiz) {
  const { cfg } = estado, u = ui();
  const ops = opciones(cfg);
  if (!ops.some(o => o.id === u.a)) u.a = ops[0].id;
  if (!ops.some(o => o.id === u.b)) u.b = 'actual';
  const opA = ops.find(o => o.id === u.a), opB = ops.find(o => o.id === u.b);
  const real = cifrasOpcion(opA, cfg), app = cifrasOpcion(opB, cfg);
  const filas = comparar(real, app, { conPuntuacion: u.a !== 'real' });
  const cuenta = (v) => filas.filter(f => f.veredicto === v).length;
  const vistas = filas
    .filter(f => !u.filtro || (u.filtro === 'dato' ? f.veredicto == null : String(f.veredicto) === u.filtro))
    .sort((a, b) => (u.orden === 'veredicto' ? (a.veredicto ?? 2) - (b.veredicto ?? 2) : 0));
  const grupo = (cfg.grupos || []).find(g => g.colectivo === 'TA' && !g.soloLaborables);
  const patron = grupo ? resolverPatron(grupo, cfg.grupos) : [];
  const tiposApp = tiposSemana(patron, cfg.turnos);
  raiz.innerHTML = `<div class="cabecera"><div><h1>Comparar · ${esc(cfg.nombre)}</h1>
      <p>Dos cuadrantes de ${esc(cfg.nombre)}, cifra a cifra: el horario real de 2027, el que sale ahora con tus parámetros o un escenario guardado (Cuadrante › Escenarios y versiones). Del horario real solo hay cifras agregadas: no se ha guardado ningún fichero ni ningún dato personal.</p></div></div>
    <div class="herramientas cmp-elegir"><div class="grupo"><span class="etiqueta">Comparar</span>
      <select data-cmp-a aria-label="Primero">${ops.filter(o => true).map(o => `<option value="${esc(o.id)}" ${o.id === u.a ? 'selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select><span class="tenue">con</span><select data-cmp-b aria-label="Segundo">${ops.filter(o => o.id !== 'real').map(o => `<option value="${esc(o.id)}" ${o.id === u.b ? 'selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select></div></div>
    <div class="cifras">
      <div class="cifra"><b>${cuenta(1)}</b><span>cifras en que «${esc(opB.nombre)}» mejora</span></div>
      <div class="cifra"><b>${cuenta(0)}</b><span>iguales</span></div>
      <div class="cifra"><b>${cuenta(-1)}</b><span>en que empeora</span></div>
      <div class="cifra"><b>${app.personas} · ${real ? real.personas : '—'}</b><span>teleasistentes a 35 h de lunes a domingo en cada uno</span></div>
    </div>
    <div class="herramientas">
      <div class="grupo" role="group" aria-label="Filtrar"><span class="etiqueta">Ver</span>
        ${[['', 'Todas'], ['1', 'Mejora'], ['0', 'Igual'], ['-1', 'Empeora'], ['dato', 'Solo datos']].map(([v, t]) => `<button type="button" class="btn mini" data-cmp-filtro="${v}" aria-pressed="${u.filtro === v}">${t}</button>`).join('')}</div>
      <div class="grupo" role="group" aria-label="Ordenar"><span class="etiqueta">Ordenar</span>
        ${[['tema', 'Por tema'], ['veredicto', 'Mejoras primero']].map(([v, t]) => `<button type="button" class="btn mini" data-cmp-orden="${v}" aria-pressed="${u.orden === v}">${t}</button>`).join('')}</div>
    </div>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Cifra</th><th scope="col" class="num">${esc(opA.nombre)}</th><th scope="col" class="num">${esc(opB.nombre)}</th><th scope="col">Resultado</th></tr></thead><tbody>
      ${vistas.map(f => `<tr><td>${esc(f.texto)}</td><td class="num">${fmt(f.real, f.unidad)}</td><td class="num"><b>${fmt(f.app, f.unidad)}</b></td><td>${PILDORA[f.veredicto]}</td></tr>`).join('')}
    </tbody></table></div>

    <section class="panel"><h2>El ciclo del horario actual y el de la app</h2>
      <p class="tenue">Cada casilla es una semana: la primera letra es la franja de lunes a viernes y la segunda la del fin de semana (M mañana, T tarde, N noches, «-» libre).</p>
      <h3>Horario 2027: ciclo de ${HORARIO_2027.ciclo.semanas} semanas</h3>
      ${chipsCiclo(HORARIO_2027.ciclo.tipos.split(' '))}
      <p class="tenue">${esc(HORARIO_2027.ciclo.nota)}</p>
      <h3>Turno rotatorio de la app: ${tiposApp.length} semanas</h3>
      ${tiposApp.length ? chipsCiclo(tiposApp) : '<p class="tenue">Sin patrón.</p>'}
      <p class="tenue">${tiposApp.filter(t => t[1] !== '-').length} fines de semana trabajados en ${tiposApp.length} semanas, ${tiposApp.filter(t => t[0] === 'M' && t[1] === 'T' || t[0] === 'T' && t[1] === 'M').length} de ellos en una franja distinta de su semana.</p>
    </section>

    <section class="panel"><h2>Cómo se ha calculado</h2>
      <ul class="tenue">
        <li>Horario 2027: personal activo a 35 h en turnos de lunes a domingo (rotatorio, M1, M2, T1 y T2). Fuera C, 9M, partido y fijos discontinuos. Celdas vacías y devoluciones de festivo cuentan como libres.</li>
        <li>Este cuadrante: teleasistentes a 35 h que trabajan de lunes a domingo. Vacaciones, saliente de noche y descanso por exceso cuentan como libres.</li>
        <li>«Fin de semana libre»: sábado y domingo sin ningún turno. Cuenta en el mes del sábado.</li>
        <li>Cobertura: noches y días en que el cuadrante queda por debajo de los mínimos de la sede. En el real, Sevilla 2027 cubre las noches todos los días y Málaga 2027 tiene 19 noches por debajo de su mínimo nuevo de 8.</li>
        <li>Fuente: ${esc(HORARIO_2027.fuente)}. Detalle en docs/fuentes-cgt/horario-actual-2027-patrones.md.</li>
      </ul></section>`;
}

export function eventosComparativa(raiz, repintar) {
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'comparativa') return;
    if (e.target.matches('[data-cmp-a]')) { ui().a = e.target.value; repintar(); }
    if (e.target.matches('[data-cmp-b]')) { ui().b = e.target.value; repintar(); }
  });
  raiz.addEventListener('click', (e) => {
    if (estado.vista !== 'comparativa') return;
    const f = e.target.closest('[data-cmp-filtro]'), o = e.target.closest('[data-cmp-orden]');
    if (f) { ui().filtro = f.dataset.cmpFiltro; repintar(); }
    if (o) { ui().orden = o.dataset.cmpOrden; repintar(); }
  });
}
