// Asistente «Nuevo horario»: de un listado de nombres a un cuadrante revisado, paso a paso (como el alta de cuadrante
// de Quinyx o Planday). Cada paso reutiliza los controles de Parámetros: lo que se cambia aquí es lo mismo que allí.
// Dirección: #nuevo/<paso>.
import { estado, esc, fmtNum, cambiado, avisar, ponerSede, confirmar, clonar } from './nucleo.js';
import { seccionContratos, seccionReglas, seccionMinimos, seccionCobertura } from './vista-parametros.js';
import { CONJUNTOS_REGLAS } from './datos-base.js';
import { infracciones, puntuacion } from './puntuacion.js';
import { equidad } from './equidad.js';
import { mejorarReparto } from './mejorar.js';

const PASOS = [
  { id: 'sede', titulo: 'Sede y año' },
  { id: 'personas', titulo: 'Personas' },
  { id: 'contratos', titulo: 'Contratos y casos especiales' },
  { id: 'reglas', titulo: 'Reglas' },
  { id: 'cobertura', titulo: 'Cobertura y bolsa' },
  { id: 'minimos', titulo: 'Mínimos' },
  { id: 'revisar', titulo: 'Generar y revisar' },
];
const pasoActual = () => Math.max(0, PASOS.findIndex(p => p.id === estado.sub));

function pasoSede(cfg) {
  return `<section class="panel"><h2>¿Para qué sede y año?</h2>
    <p class="tenue">Cada sede tiene su propio cuadrante. Lo que cambies en una no toca a la otra.</p>
    <div class="fila-acciones segmentado" role="group" aria-label="Sede">${estado.todo.sedes.map(s => `<button type="button" data-nv-sede="${esc(s.id)}" aria-pressed="${s.id === estado.sede}">${esc(s.nombre)}</button>`).join('')}</div>
    <div class="campos" style="margin-top:12px">
      <label class="campo"><span>Año</span><input type="number" data-ruta="anio" data-tipo="num" value="${esc(cfg.anio)}" min="2020" max="2100" style="width:110px"></label>
      <label class="campo"><span>Título del cuadrante</span><input type="text" data-ruta="titulo" value="${esc(cfg.titulo || '')}" style="width:320px"></label>
    </div>
    <p class="tenue" style="margin-top:12px">¿Quieres empezar de cero? <button type="button" class="enlace" data-accion="partida-sede">Volver a los valores de partida de ${esc(cfg.nombre)}</button> (se puede deshacer con Ctrl+Z).</p>
  </section>`;
}

function pasoPersonas(cfg) {
  const reales = estado.plantilla ? estado.plantilla.personas.filter(p => p.sede === cfg.id) : null;
  const cuenta = (c) => (reales ? reales.filter(p => p.colectivo === c).length : 0);
  return `<section class="panel"><h2>¿Quién entra en el cuadrante?</h2>
    ${reales ? `<p>Plantilla real abierta: <b>${fmtNum(cuenta('TA'))}</b> teleasistentes y <b>${fmtNum(cuenta('SUP'))}</b> supervisores en ${esc(cfg.nombre)}. Mandan sobre el número de personas de cada grupo.
        ${reales.filter(p => p.horasSemana < 35 || p.contrato).length ? `${fmtNum(reales.filter(p => p.horasSemana < 35 || p.contrato).length)} con jornada reducida o contrato propio.` : ''}</p>`
      : '<p>Sin plantilla real abierta: el cuadrante sale con personas anónimas (TA 001, SUP 01…), tantas como digas en cada grupo.</p>'}
    <div class="fila-acciones"><button type="button" class="btn ${reales ? '' : 'primario'}" data-ir="plantilla">${reales ? 'Ver o cambiar la plantilla' : 'Importar el listado de nombres'}</button></div>
    <p class="tenue">El listado es un CSV con <b>nombre; colectivo; sede</b> y, si hace falta, turno actual, exención de noches, horas a la semana y casos especiales: <b>contrato</b> (p. ej. «Reducida 25 h»), <b>franjas</b> (mañana, tarde, noche), <b>sin_findes</b>, <b>dias_libres</b> (L,M,X,J,V,S,D), <b>alta</b> y <b>baja</b> (AAAA-MM-DD). Los nombres se cifran en tu navegador; el servidor no los ve. Solo administración.</p>
    <h3 style="margin-top:14px">Personas por grupo</h3>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Grupo</th><th scope="col">Colectivo</th><th scope="col" class="num">Personas</th></tr></thead><tbody>
      ${cfg.grupos.map((g, i) => `<tr><td>${esc(g.nombre)}</td><td>${g.colectivo === 'SUP' ? 'Supervisión' : 'Teleasistencia'}</td>
        <td class="num"><input type="number" data-ruta="grupos.${i}.personas" data-tipo="num" value="${esc(g.personas)}" min="0" max="2000" aria-label="Personas de ${esc(g.nombre)}" ${reales ? 'title="Con la plantilla abierta manda el número de la plantilla"' : ''}></td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}

function pasoReglas(cfg) {
  return `<section class="panel"><h2>Punto de partida</h2>
    <p class="tenue">Elige un conjunto de reglas para empezar (como los conjuntos por convenio de Quinyx) y ajústalo abajo.</p>
    <div class="apariencias">${CONJUNTOS_REGLAS.map(c => `<div class="apariencia" style="flex-direction:column"><b>${esc(c.nombre)}</b><small>${esc(c.texto)}</small>
      <button type="button" class="btn mini" data-nv-conjunto="${c.id}" style="margin-top:8px;align-self:flex-start">Usar este conjunto</button></div>`).join('')}</div></section>
    ${seccionReglas(cfg)}`;
}

function pasoRevisar(cfg) {
  const { res } = estado, p = puntuacion(res, cfg, infracciones(res, cfg));
  const eq = equidad(res, 'TA'), m = (k) => eq.find(x => x.k === k);
  const especiales = res.personas.filter(x => x.especial).length;
  const bajo = res.personas.filter(x => x.horas < x.objetivo - 1e-9).length;
  return `<section class="panel"><h2>Así queda</h2>
    <p class="tenue">El cuadrante se rehace solo con cada cambio. Revisa la puntuación, mejora el reparto si quieres y ábrelo para mirarlo con calma.</p>
    <div class="cifras">
      <div class="cifra"><b>${fmtNum(res.P)}</b><span>personas (${fmtNum(especiales)} con caso especial)</span></div>
      <div class="cifra ${p.duro ? 'mal' : ''}"><b>${fmtNum(-p.duro || 0)}</b><span>puntuación dura: reglas que bloquean incumplidas</span></div>
      <div class="cifra ${p.medio ? 'mal' : ''}"><b>${fmtNum(-p.medio || 0)}</b><span>puntuación media: personas que faltan para los mínimos</span></div>
      <div class="cifra"><b>${fmtNum(-p.blando || 0)}</b><span>puntuación blanda: avisos</span></div>
      <div class="cifra ${bajo ? 'mal' : ''}"><b>${fmtNum(bajo)}</b><span>personas por debajo de su jornada</span></div>
      <div class="cifra"><b>${fmtNum(m('fines').min)}–${fmtNum(m('fines').max)}</b><span>fines de semana trabajados (teleasistencia)</span></div>
    </div>
    <div class="fila-acciones">
      <button type="button" class="btn primario" data-nv="mejorar">${cfg.mejora ? 'Mejorar más el reparto' : 'Mejorar el reparto'}</button>
      <button type="button" class="btn" data-ir="cuadrante">Ver el cuadrante</button>
      <button type="button" class="btn" data-ir="equidad">Ver la equidad</button>
      <button type="button" class="btn" data-ir="informes">Ver los informes</button>
    </div>
    <p class="tenue">${estado.admin ? 'Cuando esté bien, guárdalo en el servidor con la barra de abajo.' : 'Estás probando en tu navegador: para que lo vea todo el mundo, entra en Ajustes con la clave de administración y guarda.'}</p>
  </section>`;
}

export function pintarNuevo(raiz) {
  const cfg = estado.cfg, i = pasoActual(), paso = PASOS[i];
  const cuerpo = paso.id === 'sede' ? pasoSede(cfg) : paso.id === 'personas' ? pasoPersonas(cfg) : paso.id === 'contratos' ? seccionContratos(cfg)
    : paso.id === 'reglas' ? pasoReglas(cfg) : paso.id === 'cobertura' ? seccionCobertura(cfg) : paso.id === 'minimos' ? seccionMinimos(cfg) : pasoRevisar(cfg);
  raiz.innerHTML = `<div class="cabecera"><div><h1>Nuevo horario · ${esc(cfg.nombre)} ${esc(cfg.anio)}</h1>
      <p>De un listado de nombres a un cuadrante revisado, paso a paso. Todo se puede volver a cambiar luego en Parámetros, y Ctrl+Z deshace.</p></div></div>
    <ol class="asis-pasos" aria-label="Pasos">${PASOS.map((p, j) => `<li class="${j === i ? 'actual' : j < i ? 'hecho' : ''}"><a href="#nuevo/${p.id}" ${j === i ? 'aria-current="step"' : ''}><span class="pn">${j + 1}</span>${esc(p.titulo)}</a></li>`).join('')}</ol>
    ${cuerpo}
    <div class="fila-acciones pasos-nav">
      ${i > 0 ? `<button type="button" class="btn" data-nv-ir="${PASOS[i - 1].id}">← ${esc(PASOS[i - 1].titulo)}</button>` : '<span></span>'}
      ${i < PASOS.length - 1 ? `<button type="button" class="btn primario" data-nv-ir="${PASOS[i + 1].id}">${esc(PASOS[i + 1].titulo)} →</button>` : '<button type="button" class="btn primario" data-ir="cuadrante">Ir al cuadrante</button>'}
    </div>`;
}

export function eventosNuevo(raiz, repintar) {
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'nuevo') return;
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.nvIr) { location.hash = `#nuevo/${b.dataset.nvIr}`; return; }
    if (b.dataset.nvSede) { ponerSede(b.dataset.nvSede); return repintar(); }
    if (b.dataset.nvConjunto) {
      const c = CONJUNTOS_REGLAS.find(x => x.id === b.dataset.nvConjunto);
      if (!(await confirmar(`¿Usar «${c.nombre}»?`, 'Sustituye las reglas de esta sede por las del conjunto. Se puede deshacer con Ctrl+Z.', 'Usar'))) return;
      estado.cfg.reglas = { ...clonar(c.reglas()), ajuste: estado.cfg.reglas.ajuste || { activo: true } };
      cambiado({ inmediato: true }); repintar();
      return avisar(`Reglas de «${esc(c.nombre)}» puestas en ${esc(estado.cfg.nombre)}.`, 'bien');
    }
    if (b.dataset.nv === 'mejorar') { if (await mejorarReparto()) repintar(); }
  });
}
