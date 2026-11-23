// Vista Normativa: las 190 reglas sacadas de las fuentes (docs/fuentes-cgt/reglas-catalogo.md), con filtros,
// orden y, para cada una, dónde la usa la app: en el ajuste del cuadrante, en los informes o solo de consulta.
import { estado, esc, fmtNum } from './nucleo.js';
import { NORMATIVA, FALTA_EN_FUENTES } from './normativa.js';
import { REGLAS_CATALOGO } from './datos-base.js';
import { analizarTodas } from './vista-informes.js';

// Los estados se agrupan para filtrar: las fuentes los escriben con matices («propuesta CGT (globo sonda)»…).
const ESTADOS = ['norma vigente', 'práctica de la empresa', 'situación actual (reunión)', 'premisa acordada (reunión)', 'propuesta de la empresa', 'propuesta de la consultora', 'propuesta sindical', 'dudosa'];
const clase = (e) => {
  const t = (e || '').toLowerCase();
  if (t.startsWith('norma vigente')) return 'norma vigente';
  if (t.startsWith('práctica')) return 'práctica de la empresa';
  if (t.startsWith('situación actual')) return 'situación actual (reunión)';
  if (t.startsWith('acuerdo')) return 'premisa acordada (reunión)';
  if (t.startsWith('propuesta de la empresa')) return 'propuesta de la empresa';
  if (t.startsWith('propuesta de la consultora')) return 'propuesta de la consultora';
  if (t.startsWith('reivindicación') || t.startsWith('propuesta')) return 'propuesta sindical';
  return 'dudosa';
};
const TEMAS = [...new Set(NORMATIVA.map(r => r.tema))];
// Reglas que se aplican a través de otros parámetros (mínimos, festivos, grupos).
const USO_PARAMETROS = {
  minimosSevilla2013: 'Mínimos de Sevilla (Parámetros → Mínimos)', minimosMalaga2026: 'Mínimos de Málaga (Parámetros → Mínimos)',
  minimosMalaga2013: 'Referencia de los mínimos de Málaga hasta el 14-10-2026', ningunTurnoSinSupervision: 'Mínimo de 1 supervisor por franja (Parámetros → Mínimos)',
  supervisionFinDeSemana: 'Mínimos de supervisión (Parámetros → Mínimos)', festivoDomingoALunes: 'Festivos: «Pasar al lunes los festivos que caen en domingo»',
  festivosConTurno: 'Grupos de lunes a viernes: no trabajan festivos', turnosConNoches: 'Grupos de lunes a viernes: sin noches (franjas del ajuste)',
  jornadaAnualTurnos6: 'Horas objetivo de cada grupo (1.480,5 h)', sin6TurnoC: 'Horas objetivo del continuo (1.575 h)', jornadaMalagaConAJ: 'Horas objetivo de Málaga (1.494,5 / 1.589 h)',
  duracionNoche: 'Turno N de 22:00 a 08:00 (10 h)', franjaNocturna: 'Turno N de 22:00 a 08:00',
};

function usos() {
  const mapa = new Map();
  const poner = (id, texto) => { if (!mapa.has(id)) mapa.set(id, new Set()); mapa.get(id).add(texto); };
  const reglas = estado.cfg.reglas || {};
  for (const r of REGLAS_CATALOGO) for (const n of r.normas || []) poner(n, `Ajuste: «${r.texto}»${reglas[r.k] ? (reglas[r.k].activo ? ' (activa)' : ' (desactivada)') : ' (quitada en esta sede)'}`);
  for (const a of analizarTodas()) for (const x of a.comprobaciones) for (const n of x.normas || []) poner(n, `Informe: «${x.titulo}»`);
  for (const [id, t] of Object.entries(USO_PARAMETROS)) poner(id, t);
  return mapa;
}

export function pintarNormativa(raiz) {
  const u = (estado.ui.normativa ||= {});
  u.buscar ??= ''; u.tema ??= ''; u.estado ??= ''; u.uso ??= ''; u.orden ??= 'tema';
  const mapa = usos();
  const q = u.buscar.trim().toLowerCase();
  let lista = NORMATIVA.filter(r =>
    (!u.tema || r.tema === u.tema) && (!u.estado || clase(r.estado) === u.estado) &&
    (!u.uso || (u.uso === 'app' ? mapa.has(r.id) : u.uso === 'consulta' ? !mapa.has(r.id) : /^s[ií]/i.test(r.comprobable))) &&
    (!q || [r.id, r.regla, r.valor, r.ambito, r.fuente].some(t => t.toLowerCase().includes(q))));
  const ordenes = { tema: (a, b) => TEMAS.indexOf(a.tema) - TEMAS.indexOf(b.tema), estado: (a, b) => ESTADOS.indexOf(clase(a.estado)) - ESTADOS.indexOf(clase(b.estado)), id: (a, b) => a.id.localeCompare(b.id), app: (a, b) => (mapa.has(b.id) - mapa.has(a.id)) };
  lista = [...lista].sort((a, b) => ordenes[u.orden](a, b) || ordenes.tema(a, b));
  const colorEstado = { 'norma vigente': 'var(--ok)', 'práctica de la empresa': 'var(--muted)', 'situación actual (reunión)': 'var(--muted)', 'premisa acordada (reunión)': 'var(--ok)',
    'propuesta de la empresa': 'var(--gl-titulo)', 'propuesta de la consultora': 'var(--gl-titulo)', 'propuesta sindical': 'var(--gl-acento)', 'dudosa': 'var(--warn)' };
  const sel = (id, valor, opciones, todas) => `<select id="${id}"><option value="">${todas}</option>${opciones.map(([v, t]) => `<option value="${esc(v)}" ${v === valor ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Normativa</h1>
      <p>${NORMATIVA.length} reglas de turnos sacadas de las fuentes de la sección: convenio, actas de la Comisión, protocolo P.41, correos del comité y de las secciones, cuadrantes de 2027, encuestas, el correo de vacaciones de Procesos horarios y la reunión de la Comisión del 18-11-2026 (de su transcripción). Para cada una: de dónde sale, si se puede comprobar en un cuadrante y dónde la usa esta app.</p></div></div>
    <div class="cifras">${ESTADOS.map(e => `<div class="cifra"><b>${NORMATIVA.filter(r => clase(r.estado) === e).length}</b><span>${e}</span></div>`).join('')}
      <div class="cifra"><b>${NORMATIVA.filter(r => mapa.has(r.id)).length}</b><span>se usan en la app (ajuste, informes o parámetros)</span></div></div>
    <div class="herramientas">
      <div class="grupo"><label class="oculto" for="nor-buscar">Buscar</label><input type="text" id="nor-buscar" placeholder="Buscar en las reglas" value="${esc(u.buscar)}" style="width:240px"></div>
      <div class="grupo">${sel('nor-tema', u.tema, TEMAS.map(t => [t, t]), 'Todos los temas')}${sel('nor-estado', u.estado, ESTADOS.map(e => [e, e]), 'Cualquier estado')}
        ${sel('nor-uso', u.uso, [['app', 'Se usan en la app'], ['consulta', 'Solo consulta'], ['comprobable', 'Comprobables en un cuadrante']], 'Todas')}</div>
      <div class="grupo" role="group" aria-label="Ordenar"><span class="etiqueta">Ordenar</span>
        ${[['tema', 'Tema'], ['estado', 'Estado'], ['id', 'Código'], ['app', 'Usadas primero']].map(([v, t]) => `<button type="button" class="btn mini" data-nor-orden="${v}" aria-pressed="${u.orden === v}">${t}</button>`).join('')}</div>
    </div>
    <p class="tenue">${fmtNum(lista.length)} reglas.</p>
    <div class="tabla-caja"><table class="tabla-lista"><thead><tr><th scope="col">Tema</th><th scope="col">Regla</th><th scope="col">Valor y ámbito</th><th scope="col">Estado</th><th scope="col">Fuente</th><th scope="col">En la app</th></tr></thead><tbody>
      ${lista.map(r => `<tr id="norma-${esc(r.id)}">
        <td class="tenue">${esc(r.tema)}</td>
        <td><b>${esc(r.regla)}</b><br><span class="tenue">${esc(r.id)}</span></td>
        <td>${esc(r.valor)}<br><span class="tenue">${esc(r.ambito)}</span></td>
        <td><span class="pildora" style="color:${colorEstado[clase(r.estado)] || 'var(--muted)'};border-color:currentColor;cursor:default">${esc(clase(r.estado))}</span>${clase(r.estado) !== r.estado ? `<br><span class="tenue">${esc(r.estado)}</span>` : ''}</td>
        <td class="tenue">${esc(r.fuente)}</td>
        <td>${mapa.has(r.id) ? [...mapa.get(r.id)].map(t => `<div>${esc(t)}</div>`).join('') : `<span class="tenue">Solo consulta. ${esc(r.comprobable)}</span>`}</td></tr>`).join('')
        || '<tr><td colspan="6">Ninguna regla con estos filtros.</td></tr>'}
    </tbody></table></div>
    <section class="panel" style="margin-top:16px"><h2>Lo que falta en las fuentes</h2>
      <p class="tenue">Documentos o datos que no están en el repositorio y harían falta para completar o confirmar reglas.</p>
      <ul>${FALTA_EN_FUENTES.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
}

export function eventosNormativa(raiz, repintar) {
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'normativa') return;
    const u = estado.ui.normativa;
    if (e.target.id === 'nor-tema') { u.tema = e.target.value; repintar(); }
    if (e.target.id === 'nor-estado') { u.estado = e.target.value; repintar(); }
    if (e.target.id === 'nor-uso') { u.uso = e.target.value; repintar(); }
  });
  raiz.addEventListener('click', (e) => {
    if (estado.vista !== 'normativa') return;
    const b = e.target.closest('button[data-nor-orden]');
    if (b) { estado.ui.normativa.orden = b.dataset.norOrden; repintar(); }
  });
  let t = 0;
  raiz.addEventListener('input', (e) => {
    if (estado.vista !== 'normativa' || e.target.id !== 'nor-buscar') return;
    clearTimeout(t); t = setTimeout(() => {
      estado.ui.normativa.buscar = e.target.value; repintar();
      const i = document.getElementById('nor-buscar'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    }, 250);
  });
}
