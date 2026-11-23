// Vista Parámetros: todo lo que define el cuadrante, en listas donde se añade y se quita.
import { estado, esc, $, $$, DIAS_CORTOS, MESES, fmtNum, estiloTurno, confirmar, modal, cambiado, leerRuta, ponerRuta, nuevoId, tinta, sedeBase, clonar, avisar, pedirFestivos } from './nucleo.js';
import { estimarPatron, prepararTurno, resolverPatron, aplicarSolapes, fmtH } from './motor.js';
import { COLECTIVOS, FRANJAS, FRANJA_NOMBRE, REGLAS_CATALOGO, TIPOS_FUENTE, nivelRegla } from './datos-base.js';
import { NIVELES } from './puntuacion.js';
import { turnosAMedida, casoEspecial } from './contratos.js';
import { fechaLocal, diaSemana } from './festivos.js';
import { icono } from './iconos.js';

let ordenTurnos = 'franja';
// Vistas que usan los controles de Parámetros (el asistente «Nuevo horario» los reutiliza).
const VISTAS_PARAM = ['parametros', 'nuevo'];

const campo = (etq, control) => `<label class="campo"><span>${etq}</span>${control}</label>`;
const num = (ruta, valor, extra = '') => `<input type="number" data-ruta="${ruta}" data-tipo="num" value="${esc(valor)}" ${extra}>`;
const txt = (ruta, valor, extra = '') => `<input type="text" data-ruta="${ruta}" value="${esc(valor)}" ${extra}>`;
const chk = (ruta, valor, etq, extra = '') => `<label class="casilla"><input type="checkbox" data-ruta="${ruta}" data-tipo="bool" ${valor ? 'checked' : ''} ${extra}><span>${etq}</span></label>`;
const sel = (ruta, valor, opciones, extra = '') => `<select data-ruta="${ruta}" ${extra}>${opciones.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;

const fechaCorta = (iso) => `${DIAS_CORTOS[diaSemana(iso)]} ${Number(iso.slice(8))} de ${MESES[Number(iso.slice(5, 7)) - 1].toLowerCase()}`;
const ORIGEN_FESTIVO = { fuente: 'Fuente automática', local: 'Fiesta local', mano: 'Añadido a mano' };

function estadoFuente(cfg) {
  const f = estado.festivos.fuente, anio = cfg.anio;
  const nombre = (TIPOS_FUENTE.find(t => t.id === f.tipo) || {}).nombre || f.tipo;
  const d = Object.entries(estado.descargas).find(([k]) => k === `${f.clave}|${anio}`);
  const err = d && d[1].error;
  if (f.estado === 'ninguna') return 'Sin fuente automática: solo cuentan las fiestas locales y las añadidas a mano.';
  if (d && d[1].pendiente) return `Descargando los festivos de ${anio}…`;
  if (f.estado === 'descargada') return `${f.n} festivos de ${anio} descargados de ${nombre} el ${f.fecha}.`;
  if (f.estado === 'guardada') return `${f.n} festivos de ${anio} de ${nombre}, guardados el ${f.fecha}${err ? `. No se ha podido actualizar: ${err}` : ''}.`;
  return `<span style="color:var(--bad)">Todavía no hay festivos de ${anio} de ${esc(nombre)}${err ? `: ${esc(err)}` : estado.servidor === 'ok' ? '' : ' (sin conexión con el servidor)'}. Añádelos a mano o cambia de fuente.</span>`;
}

function tablaFestivos(cfg) {
  const F = estado.festivos;
  const filas = F.lista.map(h => `<tr><td>${fechaCorta(h.fecha)}</td><td>${esc(h.nombre)}</td>
    <td class="tenue">${ORIGEN_FESTIVO[h.origen]}${h.nota ? ` · ${esc(h.nota)}` : ''}</td>
    <td class="num">${h.origen === 'mano'
      ? `<button type="button" class="btn mini peligro" data-accion="fest-quitar-mano" data-fecha="${h.fecha}">Quitar</button>`
      : `<button type="button" class="btn mini" data-accion="fest-quitar" data-fecha="${h.fecha}" title="No contar este día como festivo en ${cfg.anio}">No aplicar</button>`}</td></tr>`).join('');
  const quitados = F.quitados.length ? `<p class="tenue" style="margin-top:8px">No se aplican: ${F.quitados.map(h =>
    `${fechaCorta(h.fecha)} (${esc(h.nombre)}) <button type="button" class="btn mini" data-accion="fest-restaurar" data-fecha="${h.fecha}">Volver a aplicar</button>`).join(' · ')}</p>` : '';
  return `<div id="festivos-efectivos"><h3 style="margin:16px 0 8px">Festivos de ${esc(cfg.anio)} que se aplican (${F.lista.length})</h3>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Día</th><th scope="col">Festivo</th><th scope="col">De dónde sale</th><th scope="col"></th></tr></thead><tbody>${filas || '<tr><td colspan="4">No hay festivos.</td></tr>'}</tbody></table></div>
    ${quitados}</div>`;
}

export function seccionGeneral(cfg) {
  const fe = cfg.festivos, fu = fe.fuente, tipo = TIPOS_FUENTE.find(t => t.id === fu.tipo) || TIPOS_FUENTE.at(-1);
  const locales = fe.locales.map((l, i) => `<tr>
    <td>${txt(`festivos.locales.${i}.nombre`, l.nombre, 'aria-label="Nombre de la fiesta local" style="width:100%"')}</td>
    <td>${sel(`festivos.locales.${i}.regla`, l.regla, [['fija', 'Fecha fija'], ['pascua', 'Días después del domingo de Pascua']], 'aria-label="Regla" data-estructura="1"')}</td>
    <td>${l.regla === 'pascua'
      ? num(`festivos.locales.${i}.dias`, l.dias ?? 0, 'min="-60" max="120" aria-label="Días después de Pascua"')
      : `<input type="date" data-ruta="festivos.locales.${i}.fecha" data-tipo="mmdd" value="${cfg.anio}-${esc(l.fecha || '01-01')}" aria-label="Día y mes">`}</td>
    <td class="tenue">${fechaLocal(l, Number(cfg.anio)) ? fechaCorta(fechaLocal(l, Number(cfg.anio))) : '—'}</td>
    <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="festivos.locales" data-i="${i}">Quitar</button></td></tr>`).join('');
  const extra = fe.extra.map((e, i) => `<tr>
    <td><input type="date" data-ruta="festivos.extra.${i}.fecha" value="${esc(e.fecha)}" aria-label="Fecha"></td>
    <td>${txt(`festivos.extra.${i}.nombre`, e.nombre, 'aria-label="Nombre" style="width:100%"')}</td>
    <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="festivos.extra" data-i="${i}">Quitar</button></td></tr>`).join('');
  const enlaces = fe.enlaces.map((e, i) => `<tr>
    <td><a href="${esc(/^https?:\/\//.test(e.url) ? e.url : '#')}" target="_blank" rel="noopener noreferrer">${esc(e.texto || e.url)}</a></td>
    <td>${txt(`festivos.enlaces.${i}.texto`, e.texto, 'aria-label="Texto del enlace" style="width:100%"')}</td>
    <td>${txt(`festivos.enlaces.${i}.url`, e.url, 'aria-label="Dirección" style="width:100%" data-estructura="1"')}</td>
    <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="festivos.enlaces" data-i="${i}">Quitar</button></td></tr>`).join('');
  return `<section class="panel" id="sec-general"><h2>Año y festivos</h2>
    <p class="tenue">Los festivos cuentan como domingo para los mínimos. Se calculan solos para el año que pongas: la fuente automática da los nacionales y autonómicos, y las fiestas locales se repiten cada año con su regla.</p>
    <div class="campos">${campo('Título del cuadrante', txt('titulo', cfg.titulo, 'style="width:320px"'))}${campo('Año', num('anio', cfg.anio, 'min="2020" max="2100"'))}</div>

    <h3 style="margin:16px 0 8px">Fuente automática (nacionales y autonómicos)</h3>
    <div class="campos" style="margin-top:0">
      ${campo('Fuente', sel('festivos.fuente.tipo', fu.tipo, TIPOS_FUENTE.map(t => [t.id, t.nombre]), 'data-estructura="1"'))}
      ${tipo.region ? campo('Región (código ISO)', txt('festivos.fuente.region', fu.region, 'maxlength="9" style="width:110px" placeholder="ES-AN" data-estructura="1"')) : ''}
      ${tipo.url ? campo('Dirección (https://…)', txt('festivos.fuente.url', fu.url, 'style="width:360px" placeholder="https://…" data-estructura="1"')) : ''}
      ${fu.tipo !== 'ninguna' ? chk('festivos.fuente.trasladarDomingos', fu.trasladarDomingos, 'Pasar al lunes los festivos que caen en domingo', 'data-estructura="1"') : ''}
      ${fu.tipo !== 'ninguna' && estado.admin ? '<button type="button" class="btn mini" data-accion="fest-actualizar">Descargar de nuevo</button>' : ''}
    </div>
    <p class="estimacion" id="estado-fuente">${estadoFuente(cfg)}</p>

    <h3 style="margin:16px 0 8px">Fiestas locales (se calculan cada año)</h3>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Fiesta</th><th scope="col">Regla</th><th scope="col">Día</th><th scope="col">En ${esc(cfg.anio)}</th><th scope="col"></th></tr></thead><tbody>${locales || '<tr><td colspan="5">Sin fiestas locales.</td></tr>'}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="festivos.locales">Añadir fiesta local</button></div>

    <h3 style="margin:16px 0 8px">Añadidos a mano</h3>
    <p class="tenue">Para un día concreto que no da la fuente (por ejemplo, un traslado que decida un ayuntamiento).</p>
    ${extra ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Fecha</th><th scope="col">Festivo</th><th scope="col"></th></tr></thead><tbody>${extra}</tbody></table></div>` : ''}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="festivos.extra">Añadir festivo a mano</button></div>

    ${tablaFestivos(cfg)}

    <h3 style="margin:16px 0 8px">Fuentes oficiales para comprobar</h3>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Abrir</th><th scope="col">Texto</th><th scope="col">Dirección</th><th scope="col"></th></tr></thead><tbody>${enlaces || '<tr><td colspan="4">Sin enlaces.</td></tr>'}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="festivos.enlaces">Añadir enlace</button></div></section>`;
}

function seccionTurnos(cfg) {
  const orden = cfg.turnos.map((t, i) => [t, i]);
  const fo = { manana: 0, tarde: 1, noche: 2, libre: 3 };
  if (ordenTurnos === 'franja') orden.sort((a, b) => fo[a[0].franja] - fo[b[0].franja] || String(a[0].inicio).localeCompare(String(b[0].inicio)));
  if (ordenTurnos === 'codigo') orden.sort((a, b) => a[0].codigo.localeCompare(b[0].codigo));
  if (ordenTurnos === 'inicio') orden.sort((a, b) => String(a[0].inicio || '99').localeCompare(String(b[0].inicio || '99')));
  const filas = orden.map(([t, i]) => {
    const p = prepararTurno(t);
    const libre = t.franja === 'libre';
    return `<tr>
      <td><input type="color" data-ruta="turnos.${i}.color" value="${esc(t.color || '#FFFFFF')}" aria-label="Color de ${esc(t.codigo)}"></td>
      <td><span class="muestra" style="${estiloTurno(t)}">${esc(t.codigo)}</span></td>
      <td>${t.fijo ? `<span class="tenue">${esc(t.codigo)}</span>` : txt(`turnos.${i}.codigo`, t.codigo, 'maxlength="5" style="width:70px" aria-label="Código" data-estructura="1"')}</td>
      <td>${txt(`turnos.${i}.nombre`, t.nombre, 'aria-label="Nombre del turno"')}</td>
      <td>${libre ? '<span class="tenue">—</span>' : `<input type="time" data-ruta="turnos.${i}.inicio" value="${esc(t.inicio)}" aria-label="Hora de inicio">`}</td>
      <td>${libre ? '<span class="tenue">—</span>' : `<input type="time" data-ruta="turnos.${i}.fin" value="${esc(t.fin)}" aria-label="Hora de fin">`}</td>
      <td class="num">${libre ? '—' : fmtH(p.horas) + ' h'}</td>
      <td>${t.fijo ? `<span class="tenue">${FRANJA_NOMBRE.libre}</span>` : sel(`turnos.${i}.franja`, t.franja, [...FRANJAS.map(f => [f.id, f.nombre]), ['libre', FRANJA_NOMBRE.libre]], 'aria-label="Franja" data-estructura="1"')}</td>
      <td>${libre && t.codigo !== 'D' && t.codigo !== 'SN' ? chk(`turnos.${i}.disponible`, t.disponible !== false, 'Se le puede llamar') : ''}</td>
      <td class="num">${t.fijo ? '<span class="tenue">Fijo</span>' : `<button type="button" class="btn mini peligro" data-accion="quitar" data-lista="turnos" data-i="${i}">Quitar</button>`}</td></tr>`;
  }).join('');
  return `<section class="panel" id="sec-turnos"><h2>Turnos</h2>
    <p class="tenue">Los turnos de mañana, tarde y noche cubren su franja. Los de «libre o ausencia» no suman horas; si marcas «Se le puede llamar», el ajuste puede poner a esa persona a trabajar ese día.</p>
    <div class="herramientas"><div class="grupo" role="group" aria-label="Ordenar turnos"><span class="etiqueta">Ordenar</span>
      ${[['franja', 'Franja'], ['codigo', 'Código'], ['inicio', 'Hora de inicio'], ['lista', 'Como se crearon']].map(([v, t]) => `<button type="button" class="btn mini" data-accion="orden-turnos" data-valor="${v}" aria-pressed="${ordenTurnos === v}">${t}</button>`).join('')}</div></div>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista tabla-turnos"><thead><tr><th scope="col">Color</th><th scope="col">Muestra</th><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col" class="num">Horas</th><th scope="col">Franja</th><th scope="col">Ajuste</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="turnos">Añadir turno</button></div></section>
    ${seccionSolapes(cfg)}`;
}

// Solapes y horas de entrada que rotan: cambian un turno por otro ciertos días, sin tocar el patrón (motor.js,
// aplicarSolapes). Cada persona empieza el ciclo en una semana distinta, así que el cambio rota entre el grupo.
function seccionSolapes(cfg) {
  const trabajan = cfg.turnos.filter(t => t.franja !== 'libre');
  const opT = trabajan.map(t => [t.codigo, `${t.codigo} ${t.inicio}–${t.fin}`]);
  const grupos = cfg.grupos.map(g => [g.id, g.nombre]);
  const filas = (cfg.solapes || []).map((r, i) => {
    const g = cfg.grupos.find(x => x.id === r.grupo);
    let efecto = '';
    if (g) {
      const base = resolverPatron(g, cfg.grupos), con = aplicarSolapes(base, g.id, [{ ...r, activo: true }]);
      const cambios = con.reduce((a, c, k) => a + (c !== base[k] ? 1 : 0), 0);
      efecto = cambios ? `Cada persona lo hace unos ${fmtNum(cambios * 52 / (base.length / 7))} días al año (${cambios} en el ciclo de ${base.length / 7} semanas).`
        : `No cambia nada: el turno ${esc(r.base)} no sale esos días en el patrón de «${esc(g.nombre)}».`;
    }
    return `<tr class="${r.activo ? '' : 'apagada'}">
      <td>${chk(`solapes.${i}.activo`, r.activo, 'Activa', 'data-estructura="1"')}</td>
      <td>${sel(`solapes.${i}.grupo`, r.grupo, grupos, 'aria-label="Grupo" data-estructura="1"')}</td>
      <td>${sel(`solapes.${i}.base`, r.base, opT, 'aria-label="Turno que se cambia" data-estructura="1"')}</td>
      <td>${sel(`solapes.${i}.turno`, r.turno, opT, 'aria-label="Turno de solape" data-estructura="1"')}</td>
      <td><div class="dias-libres">${DIAS_CORTOS.map((d, k) => `<label class="casilla"><input type="checkbox" data-solape="${i}" data-dia="${k}" ${(r.dias || []).map(Number).includes(k) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></td>
      <td>${sel(`solapes.${i}.cada`, r.cada || 1, [[1, 'Todas las semanas'], [2, '1 de cada 2'], [3, '1 de cada 3'], [4, '1 de cada 4']], 'aria-label="Cada cuántas semanas" data-tipo="num" data-estructura="1"')}
        ${Number(r.cada) > 1 ? `<br>${sel(`solapes.${i}.desfase`, r.desfase || 0, Array.from({ length: Number(r.cada) }, (_, k) => [k, k ? `Empezando en la ${k + 1}.ª` : 'Empezando en la 1.ª']), 'aria-label="Desfase" data-tipo="num" data-estructura="1"')}` : ''}</td>
      <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="solapes" data-i="${i}">Quitar</button></td></tr>
      <tr class="${r.activo ? '' : 'apagada'}"><td></td><td colspan="6" class="tenue">${efecto}</td></tr>`;
  }).join('');
  return `<section class="panel" id="sec-solapes"><h2>Solapes y horas de entrada que rotan</h2>
    <p class="tenue">Cambia un turno por otro (por ejemplo, un solape de 11:00 a 18:00) ciertos días de la semana, sin tocar el patrón. Como cada persona va en una semana distinta del ciclo, el cambio rota solo: unos días se entra a una hora y otros a otra. Activa o desactiva cada regla cuando quieras. El turno de solape cuenta para los mínimos de su franja (la que pongas arriba en «Turnos»); para un horario nuevo, créalo antes con «Añadir turno».</p>
    ${filas ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Activa</th><th scope="col">Grupo</th><th scope="col">En lugar de</th><th scope="col">Se entra con</th><th scope="col">Días</th><th scope="col">Semanas</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="tenue">No hay reglas de solape.</p>'}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="solapes">Añadir regla de solape</button></div></section>`;
}

function editorPatron(g, gi, cfg, turnosMap) {
  const patron = resolverPatron(g, cfg.grupos);
  const est = estimarPatron(patron, turnosMap);
  const R = cfg.reglas;
  const marca = (v, r, fmt) => `<b class="${R[r] && R[r].activo && v > R[r].valor + 0.5 ? 'mal' : ''}">${fmt(v)}</b>`;
  const resumen = `<p class="estimacion">Ciclo de ${est.semanas} semanas · ${fmtNum(est.diasSemana, 1)} días por semana ·
    unas ${marca(est.horasAnio, '__', v => fmtNum(v))} h al año antes de vacaciones y ajustes ·
    ${marca(est.nochesAnio, 'maxNoches', v => fmtNum(v))} noches · ${marca(est.finesAnio, 'maxFines', v => fmtNum(v))} fines de semana al año</p>`;
  const otros = cfg.grupos.filter(o => o.id !== g.id && !o.patronDe);
  const origen = `<div class="campos">${campo('Patrón', `<select data-ruta="grupos.${gi}.patronDe" data-estructura="1">
      <option value="">Propio de este grupo</option>${otros.map(o => `<option value="${esc(o.id)}" ${g.patronDe === o.id ? 'selected' : ''}>El mismo que «${esc(o.nombre)}»</option>`).join('')}</select>`)}</div>`;
  if (g.patronDe) return origen + resumen;
  const semanas = patron.length / 7;
  const opciones = cfg.turnos.map(t => t.codigo);
  const filas = Array.from({ length: semanas }, (_, w) => `<tr><th scope="row" class="tenue">S${w + 1}</th>${DIAS_CORTOS.map((_, d) => {
    const c = patron[w * 7 + d], t = turnosMap.get(c) || turnosMap.get('L');
    return `<td><select data-patron="${gi}" data-pos="${w * 7 + d}" style="${estiloTurno(t)}" aria-label="Semana ${w + 1}, ${DIAS_CORTOS[d]}">${opciones.map(o => `<option ${o === c ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
  }).join('')}<td><button type="button" class="btn mini" data-accion="semana-duplicar" data-g="${gi}" data-w="${w}" title="Duplica la semana ${w + 1}">Duplicar</button>
    <button type="button" class="btn mini peligro" data-accion="semana-quitar" data-g="${gi}" data-w="${w}" ${semanas <= 1 ? 'disabled' : ''}>Quitar</button></td></tr>`).join('');
  return `${origen}<div class="patron"><table><thead><tr><th></th>${DIAS_CORTOS.map(d => `<th scope="col">${d}</th>`).join('')}<th></th></tr></thead><tbody>${filas}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn mini" data-accion="semana-anadir" data-g="${gi}">Añadir semana libre</button></div>${resumen}`;
}

export function seccionGrupos(cfg) {
  const turnosMap = new Map(cfg.turnos.map(t => [t.codigo, prepararTurno(t)]));
  ['L', 'V', 'D', 'SN'].forEach(c => { if (!turnosMap.has(c)) turnosMap.set(c, prepararTurno({ codigo: c, franja: 'libre', color: '#FFFFFF' })); });
  const res = estado.res;
  const tarjetas = cfg.grupos.map((g, gi) => {
    const ps = res.personas.filter(p => p.grupo === g.id);
    const med = (k) => { const v = ps.map(p => p[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const v = g.vacaciones;
    const mmdd = (ruta, valor) => `<input type="date" data-ruta="${ruta}" data-tipo="mmdd" value="${cfg.anio}-${esc(valor)}" min="${cfg.anio}-01-01" max="${cfg.anio}-12-31">`;
    return `<article class="grupo-tarjeta" aria-label="Grupo ${esc(g.nombre)}">
      <header>${txt(`grupos.${gi}.nombre`, g.nombre, 'aria-label="Nombre del grupo" style="width:240px"')}
        ${sel(`grupos.${gi}.colectivo`, g.colectivo, COLECTIVOS.map(c => [c.id, c.nombre]), 'aria-label="Colectivo"')}
        <span class="tenue">${ps.length ? `Resultado: mediana de ${fmtH(med('horas'))} h, ${med('noches')} noches y ${med('fines')} fines de semana; ${ps.filter(p => p.alertas.length).length} con avisos` : 'Sin personas'}</span>
        <span style="flex:1"></span>
        <button type="button" class="btn mini" data-accion="subir" data-lista="grupos" data-i="${gi}" ${gi === 0 ? 'disabled' : ''}>Subir</button>
        <button type="button" class="btn mini" data-accion="bajar" data-lista="grupos" data-i="${gi}" ${gi === cfg.grupos.length - 1 ? 'disabled' : ''}>Bajar</button>
        <button type="button" class="btn mini" data-accion="duplicar-grupo" data-i="${gi}">Duplicar</button>
        <button type="button" class="btn mini peligro" data-accion="quitar-grupo" data-i="${gi}">Quitar</button></header>
      <div class="campos">
        ${campo('Personas', `<span style="display:inline-flex;gap:4px"><button type="button" class="btn mini" data-accion="personas" data-i="${gi}" data-valor="-1" aria-label="Una persona menos">−</button>${num(`grupos.${gi}.personas`, g.personas, 'min="0" max="2000" aria-label="Personas"')}<button type="button" class="btn mini" data-accion="personas" data-i="${gi}" data-valor="1" aria-label="Una persona más">+</button></span>`)}
        ${campo('Código de las personas', txt(`grupos.${gi}.prefijo`, g.prefijo, 'maxlength="8" style="width:90px"'))}
        ${campo('Horas objetivo al año', num(`grupos.${gi}.horasObjetivo`, g.horasObjetivo, 'step="0.5" style="width:90px"'))}
        ${chk(`grupos.${gi}.flexible`, g.flexible !== false, 'El ajuste puede cambiar sus turnos', 'data-estructura="1"')}
        ${g.flexible !== false ? chk(`grupos.${gi}.soloLaborables`, !!g.soloLaborables, 'Solo de lunes a viernes (sin fines de semana ni festivos)') : ''}
        ${g.flexible !== false ? `<span class="campo"><span>Franjas que el ajuste le puede poner</span><span style="display:flex;gap:12px">${FRANJAS.map(f =>
          `<label class="casilla"><input type="checkbox" data-franja-ajuste="${gi}" value="${f.id}" ${(g.franjasAjuste || ['manana', 'tarde', 'noche']).includes(f.id) ? 'checked' : ''}> ${f.nombre}</label>`).join('')}</span></span>` : ''}
      </div>
      <div class="campos">
        ${chk(`grupos.${gi}.vacaciones.activo`, v.activo, 'Vacaciones escalonadas')}
        ${v.activo ? `${campo('Días seguidos', num(`grupos.${gi}.vacaciones.dias`, v.dias, 'min="0" max="60"'))}${campo('Desde', mmdd(`grupos.${gi}.vacaciones.desde`, v.desde))}${campo('Hasta', mmdd(`grupos.${gi}.vacaciones.hasta`, v.hasta))}` : ''}
      </div>
      <details ${g.patronDe ? '' : 'open'}><summary>Patrón de turnos</summary>${editorPatron(g, gi, cfg, turnosMap)}</details>
    </article>`;
  }).join('');
  return `<section class="panel" id="sec-grupos"><h2>Grupos y patrones</h2>
    <p class="tenue">Cada grupo repite su patrón semana a semana. Cada persona empieza en una semana distinta del ciclo, para que el grupo quede repartido. Para que supervisores y teleasistentes tengan el mismo rotatorio, elige «El mismo que…».</p>
    ${tarjetas}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-grupo" data-colectivo="TA">Añadir grupo de teleasistentes</button>
      <button type="button" class="btn" data-accion="anadir-grupo" data-colectivo="SUP">Añadir grupo de supervisores</button></div></section>`;
}

export function seccionMinimos(cfg) {
  const filas = cfg.minimos.map((m, i) => `<tr>
    <td>${sel(`minimos.${i}.colectivo`, m.colectivo, COLECTIVOS.map(c => [c.id, c.nombre]), 'aria-label="Colectivo"')}</td>
    <td>${sel(`minimos.${i}.franja`, m.franja, FRANJAS.map(f => [f.id, f.nombre]), 'aria-label="Franja"')}</td>
    <td class="num">${num(`minimos.${i}.laborable`, m.laborable, 'min="0" aria-label="De lunes a viernes"')}</td>
    <td class="num">${num(`minimos.${i}.sabado`, m.sabado, 'min="0" aria-label="Sábado"')}</td>
    <td class="num">${num(`minimos.${i}.domingo`, m.domingo, 'min="0" aria-label="Domingo y festivo"')}</td>
    <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="minimos" data-i="${i}">Quitar</button></td></tr>`).join('');
  return `<section class="panel" id="sec-minimos"><h2>Mínimos</h2>
    <p class="tenue">Personas en sala por franja y tipo de día. Valores de partida: Anexo 2 «Mínimos SAT 2013» de Sevilla. Si hay dos filas iguales, vale la más alta. En supervisión, el mínimo sube además con la ratio de Reglas.</p>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Colectivo</th><th scope="col">Franja</th><th scope="col" class="num">Lunes a viernes</th><th scope="col" class="num">Sábado</th><th scope="col" class="num">Domingo y festivo</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="minimos">Añadir mínimo</button></div></section>`;
}

export function seccionReglas(cfg) {
  const claves = Object.keys(cfg.reglas).filter(k => k !== 'ajuste');
  const orden = (k) => { const i = REGLAS_CATALOGO.findIndex(r => r.k === k); return i < 0 ? 999 : i; };
  claves.sort((x, y) => orden(x) - orden(y));
  const filas = claves.map(k => {
    const r = REGLAS_CATALOGO.find(x => x.k === k) || { k, texto: k, unidad: '' };
    const v = cfg.reglas[k];
    const control = r.sinValor ? '<span class="tenue">—</span>' : r.texto_libre
      ? txt(`reglas.${k}.valor`, v.valor, `style="width:90px" aria-label="${esc(r.texto)}" ${v.activo ? '' : 'disabled'}`)
      : num(`reglas.${k}.valor`, v.valor, `min="0" step="${k === 'tope' ? '0.5' : '1'}" aria-label="${esc(r.texto)}" ${v.activo ? '' : 'disabled'}`);
    const fuente = r.decision ? `<br><span class="tenue">${esc(r.decision)}</span>`
      : r.sinFuente ? '<br><span class="tenue" style="color:var(--warn)">Valor propuesto por la app: no sale de la normativa.</span>'
      : (r.normas || []).length ? `<br><span class="tenue">Normativa: ${r.normas.map(esc).join(', ')}</span>` : '';
    const nivel = k === 'ratio' ? '<span class="tenue">—</span>'
      : sel(`reglas.${k}.nivel`, nivelRegla(k, v), NIVELES.map(n => [n.id, n.nombre]), `aria-label="Nivel de ${esc(r.texto)}" class="nivel-${nivelRegla(k, v)}" ${v.activo ? '' : 'disabled'} data-estructura="1"`);
    return `<tr><td>${chk(`reglas.${k}.activo`, v.activo, '<span class="oculto">Activa</span>')}</td><td>${esc(r.texto)}${fuente}</td>
      <td class="num">${control}</td><td class="tenue">${esc(r.unidad)}</td><td>${nivel}</td>
      <td class="num"><button type="button" class="btn mini peligro" data-accion="regla-quitar" data-k="${esc(k)}">Quitar</button></td></tr>`;
  }).join('');
  const disponibles = REGLAS_CATALOGO.filter(r => !cfg.reglas[r.k]);
  return `<section class="panel" id="sec-reglas"><h2>Reglas</h2>
    <p class="tenue">Cada regla tiene un nivel, como en Quinyx o Skello. <b>Bloquea</b>: el ajuste nunca la incumple y no deja un cambio a mano que la rompa. <b>Avisa</b>: el ajuste la respeta si puede; a mano se permite y sale en el panel de infracciones del cuadrante. <b>Solo informe</b>: el ajuste no la tiene en cuenta y solo sale en los informes. Puedes desactivar una para ver qué pasa sin ella, quitarla o añadir otra.</p>
    <div class="campos" style="margin-bottom:12px">${chk('reglas.ajuste.activo', cfg.reglas.ajuste?.activo !== false, '<b>Ajuste automático</b>: recorta el exceso de horas, cubre los mínimos moviendo o llamando a gente y completa a quien no llega a su objetivo')}</div>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Activa</th><th scope="col">Regla</th><th scope="col" class="num">Valor</th><th scope="col"></th><th scope="col">Nivel</th><th scope="col"></th></tr></thead><tbody>${filas || '<tr><td colspan="6">No hay reglas: el ajuste solo cubre mínimos y horas.</td></tr>'}</tbody></table></div>
    ${disponibles.length ? `<div class="fila-acciones"><label class="oculto" for="regla-nueva">Regla para añadir</label>
      <select id="regla-nueva">${disponibles.map(r => `<option value="${r.k}">${esc(r.texto)}</option>`).join('')}</select>
      <button type="button" class="btn" data-accion="regla-anadir">Añadir regla</button></div>` : '<p class="tenue" style="margin-top:8px">Están todas las reglas disponibles.</p>'}</section>`;
}


// ── Cobertura y bolsa: noches cedidas, bolsa de horas, margen, bajas y ausencias, refuerzos y aguante ──
const TIPOS_AUSENCIA = [['baja', 'Baja'], ['permiso', 'Permiso'], ['excedencia', 'Excedencia'], ['otra', 'Otra']];
export function seccionCobertura(cfg) {
  const cob = cfg.cobertura, res = estado.res, u = (estado.ui.cobertura ||= { buscar: '', bolsaBuscar: '' });
  const personas = res.personas;
  const nombre = (id) => { const p = personas.find(x => x.id === id); return p && p.nombre ? ` · ${esc(p.nombre)}` : ''; };
  const huecos = (f) => res.huecos.filter(h => h.franja === f).reduce((a, h) => a + h.falta, 0);
  const cedidas = personas.reduce((a, p) => a + (p.nochesCedidas || 0), 0), quienes = personas.filter(p => p.nochesCedidas > 0).length;
  const justos = (c, f) => [...res.aguante[c][f]].filter(x => x === 0).length;
  const q = u.buscar.trim().toLowerCase();
  // Noches cedidas
  const voluntarios = cob.cesion.modo === 'voluntaria' ? `<div class="tabla-caja" style="max-height:260px"><table class="tabla-lista"><thead><tr><th scope="col">Acepta ceder</th><th scope="col">Persona</th><th scope="col" class="num">Noches</th></tr></thead><tbody>
      ${personas.filter(p => p.pref.noche && (!q || p.id.toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q))).slice(0, 300).map(p => `<tr>
        <td><input type="checkbox" data-voluntario="${esc(p.id)}" ${(cfg.especiales[p.id] || {}).cedeNoches ? 'checked' : ''} aria-label="${esc(p.id)} acepta ceder noches"></td>
        <td>${esc(p.id)}${nombre(p.id)}</td><td class="num">${p.noches}${p.nochesCedidas ? ` (${p.nochesCedidas} cedidas)` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '';
  // Bolsa
  const qb = u.bolsaBuscar.trim().toLowerCase();
  const filasBolsa = personas.filter(p => !qb || p.id.toLowerCase().includes(qb) || (p.nombre || '').toLowerCase().includes(qb))
    .sort((a, b) => b.bolsa.saldo - a.bolsa.saldo).slice(0, 60).map(p => `<tr><td>${esc(p.id)}${nombre(p.id)}</td>
      <td class="num">${num(`cobertura.bolsa.inicial.${p.id}`, cob.bolsa.inicial[p.id] || 0, 'step="0.5" aria-label="Saldo de partida"')}</td>
      <td class="num">${fmtH(p.bolsa.aFavor)}</td><td class="num">${fmtH(p.bolsa.consumida)}</td><td class="num"><b>${fmtH(p.bolsa.saldo)}</b></td><td class="num">${p.bolsa.diasDevueltos}</td></tr>`).join('');
  // Ausencias
  const aus = cob.ausencias.map((a, i) => ({ a, i })).filter(({ a }) => !q || String(a.persona).toLowerCase().includes(q))
    .sort((x, y) => String(x.a.desde).localeCompare(String(y.a.desde)));
  const opcPersonas = personas.map(p => [p.id, `${p.id}${p.nombre ? ` · ${p.nombre}` : ''}`]);
  const refuerzos = cfg.grupos.map((g, i) => ({ g, i })).filter(({ g }) => g.desde || g.hasta);
  return `<section class="panel" id="sec-cobertura"><h2>Noches cedidas</h2>
    <p class="tenue">Las 14 noches son de oficio. Por encima, son noches cedidas: el ajuste solo las usa si nadie más puede cubrir esa noche, empezando por quien menos lleva, y sus horas van a la bolsa de cada persona. La normativa admite hasta 7 cedidas (21 en total). Ahora: <b>${fmtNum(cedidas)}</b> noches cedidas entre ${fmtNum(quienes)} personas · <b>${fmtNum(huecos('noche'))}</b> personas-noche sin cubrir.</p>
    <div class="campos">
      ${campo('Quién puede ceder', sel('cobertura.cesion.modo', cob.cesion.modo, [['ninguna', 'Nadie (tope de 14)'], ['voluntaria', 'Solo quien lo acepta'], ['todos', 'Cualquiera, si hace falta']], 'data-estructura="1"'))}
      ${campo('Tope de noches con las cedidas', num('cobertura.cesion.tope', cob.cesion.tope, 'min="14" max="40" style="width:90px"'))}
    </div>${voluntarios ? `<div class="herramientas"><div class="grupo"><input type="text" id="cob-buscar" placeholder="Buscar código o nombre" value="${esc(u.buscar)}" style="width:220px" aria-label="Buscar"></div></div>${voluntarios}` : ''}
  </section>
  <section class="panel"><h2>Bolsa de horas</h2>
    <p class="tenue">Las horas que alguien hace de más (noches cedidas, picos) son horas a su favor. <b>Devolver</b>: el ajuste se las devuelve con descansos (D) en días en que sobra gente. <b>Acumular</b>: se quedan en su bolsa hasta el tope y las coge cuando las pide (en Portal Horario). <b>Las dos</b>: devuelve lo que puede y el resto queda en bolsa. El saldo = partida + a favor en el cuadrante − lo ya cogido.</p>
    <div class="campos">
      ${campo('Cómo se compensan', sel('cobertura.bolsa.modo', cob.bolsa.modo, [['devolver', 'Devolver con descansos en el año'], ['acumular', 'Acumular en la bolsa'], ['ambas', 'Las dos: devolver y el resto a la bolsa']], 'data-estructura="1"'))}
      ${campo('Tope a favor por persona (h)', num('cobertura.bolsa.tope', cob.bolsa.tope, 'min="0" step="0.5" style="width:90px"'))}
    </div>
    <div class="herramientas"><div class="grupo"><input type="text" id="bolsa-buscar" placeholder="Buscar código o nombre" value="${esc(u.bolsaBuscar)}" style="width:220px" aria-label="Buscar en la bolsa"></div>
      <div class="grupo"><label class="btn mini" for="bolsa-csv">Importar saldos de partida (CSV)</label><input type="file" id="bolsa-csv" accept=".csv,text/csv,.txt" class="oculto"></div></div>
    <div class="tabla-caja" style="max-height:340px"><table class="tabla-lista"><thead><tr><th scope="col">Persona</th><th scope="col" class="num">Saldo de partida</th><th scope="col" class="num">A favor en el cuadrante</th><th scope="col" class="num">Ya cogido</th><th scope="col" class="num">Saldo</th><th scope="col" class="num">Días devueltos</th></tr></thead><tbody>${filasBolsa}</tbody></table></div>
    <p class="tenue" style="margin-top:6px">Se ven las 60 con más saldo; busca para ver otras. CSV: «código;horas» (p. ej. «TA 017;12,5»).</p>
  </section>
  <section class="panel"><h2>Bajas y ausencias</h2>
    <p class="tenue">Bajas, permisos o excedencias con fechas (sin diagnósticos ni motivos de salud). Esos días la persona no trabaja (código B), el ajuste cubre su hueco con otras personas y su jornada anual se prorratea.</p>
    ${aus.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Persona</th><th scope="col">Tipo</th><th scope="col">Desde</th><th scope="col">Hasta</th><th scope="col">Nota</th><th scope="col"></th></tr></thead><tbody>
      ${aus.map(({ a, i }) => `<tr><td>${sel(`cobertura.ausencias.${i}.persona`, a.persona, opcPersonas, 'aria-label="Persona"')}</td>
        <td>${sel(`cobertura.ausencias.${i}.tipo`, a.tipo || 'baja', TIPOS_AUSENCIA, 'aria-label="Tipo"')}</td>
        <td><input type="date" data-ruta="cobertura.ausencias.${i}.desde" value="${esc(a.desde || '')}" aria-label="Desde"></td>
        <td><input type="date" data-ruta="cobertura.ausencias.${i}.hasta" value="${esc(a.hasta || '')}" aria-label="Hasta"></td>
        <td>${txt(`cobertura.ausencias.${i}.nota`, a.nota || '', 'maxlength="80" aria-label="Nota" placeholder="Sin datos de salud"')}</td>
        <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar-ausencia" data-i="${i}">Quitar</button></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="tenue">No hay ausencias.</p>'}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-ausencia">Añadir ausencia</button></div>
  </section>
  <section class="panel"><h2>Refuerzos temporales</h2>
    <p class="tenue">Personal extra entre unas fechas (sustituciones de verano, bolsa de sustitución). Es un grupo con su número de personas y su patrón, que solo está esas fechas. Puede tener condiciones propias, más flexibles que la plantilla: por ejemplo, trabajar fines de semana sin el patrón 2 + 1 o no tener vacaciones en ese tramo.</p>
    ${refuerzos.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Grupo</th><th scope="col" class="num">Personas</th><th scope="col">Desde</th><th scope="col">Hasta</th><th scope="col">Condiciones propias (flexibles)</th></tr></thead><tbody>
      ${refuerzos.map(({ g, i }) => `<tr><td>${txt(`grupos.${i}.nombre`, g.nombre, 'aria-label="Nombre"')}</td><td class="num">${num(`grupos.${i}.personas`, g.personas, 'min="0" aria-label="Personas"')}</td>
        <td><input type="date" data-ruta="grupos.${i}.desde" value="${esc(g.desde || '')}" aria-label="Desde"></td><td><input type="date" data-ruta="grupos.${i}.hasta" value="${esc(g.hasta || '')}" aria-label="Hasta"></td>
        <td>${chk(`grupos.${i}.condiciones.libreFines`, !!(g.condiciones && g.condiciones.libreFines), 'Fines de semana sin las reglas de fines (patrón 2 + 1, topes)', 'data-estructura="1"')}
          ${chk(`grupos.${i}.condiciones.sinVacaciones`, !!(g.condiciones && g.condiciones.sinVacaciones), 'Sin vacaciones (temporal)', 'data-estructura="1"')}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="tenue">No hay refuerzos.</p>'}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-refuerzo" data-colectivo="TA">Añadir refuerzo de teleasistencia</button><button type="button" class="btn" data-accion="anadir-refuerzo" data-colectivo="SUP">Añadir refuerzo de supervisión</button></div>
  </section>
  <section class="panel"><h2>Margen para imprevistos y aguante</h2>
    <p class="tenue">El margen hace que el ajuste ponga gente de más sobre el mínimo, si puede, para que una baja de última hora no deje la franja descubierta. Se cubre al final, con las noches de oficio y sin dejar a nadie por debajo de su jornada. Los huecos se siguen midiendo frente al mínimo real.</p>
    <div class="campos">
      ${campo('De noche', num('cobertura.margen.noche', cob.margen.noche, 'min="0" style="width:90px"'))}
      ${campo('De día (mañana y tarde)', num('cobertura.margen.dia', cob.margen.dia, 'min="0" style="width:90px"'))}
      ${campo('En', sel('cobertura.margen.tipo', cob.margen.tipo, [['personas', 'personas'], ['porcentaje', '% del mínimo']]))}
      ${chk('cobertura.aguante.avisar', cob.aguante.avisar, 'Marcar en el cuadrante los días justos (aguanta 0 bajas)')}
    </div>
    <p>Días justos (si falta una persona, se baja del mínimo): teleasistencia ${FRANJAS.map((f, fi) => `${f.nombre.toLowerCase()} <b>${fmtNum(justos(0, fi))}</b>`).join(' · ')} · supervisión ${FRANJAS.map((f, fi) => `${f.nombre.toLowerCase()} <b>${fmtNum(justos(1, fi))}</b>`).join(' · ')}.</p>
  </section>`;
}

const DIAS_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const OPC_FRANJAS = [['', 'Todas las franjas'], ['manana', 'Solo mañanas'], ['tarde', 'Solo tardes'], ['manana,tarde', 'Mañanas y tardes (sin noches)'], ['noche', 'Solo noches']];

// Contratos (perfiles de jornada) y casos especiales por persona, como los contratos de Quinyx o Skello.
export function seccionContratos(cfg) {
  const turnosDe = (f) => [['', 'El del patrón'], ...cfg.turnos.filter(t => t.franja === f).map(t => [t.codigo, `${t.codigo} · ${t.nombre}${t.inicio ? ` (${t.inicio}–${t.fin})` : ''}`])];
  const usos = (id) => estado.res.personas.filter(p => p.contrato === id).length;
  const filasC = cfg.contratos.map((c, i) => `<tr>
    <td>${txt(`contratos.${i}.nombre`, c.nombre, 'aria-label="Nombre del contrato" style="width:170px"')}</td>
    <td class="num">${num(`contratos.${i}.horasSemana`, c.horasSemana, 'min="1" max="40" step="0.5" aria-label="Horas a la semana" data-estructura="1"')}</td>
    <td>${chk(`contratos.${i}.sinNoches`, c.sinNoches, 'Sin noches', 'data-estructura="1"')}</td>
    <td>${sel(`contratos.${i}.turnos.manana`, (c.turnos || {}).manana || '', turnosDe('manana'), 'aria-label="Turno de mañana" data-estructura="1"')}</td>
    <td>${sel(`contratos.${i}.turnos.tarde`, (c.turnos || {}).tarde || '', turnosDe('tarde'), 'aria-label="Turno de tarde" data-estructura="1"')}</td>
    <td class="num">${fmtNum(usos(c.id))}</td>
    <td class="num"><span class="fila-acciones" style="margin:0;justify-content:flex-end">
      ${Number(c.horasSemana) < 35 ? `<button type="button" class="btn mini" data-accion="turnos-medida" data-i="${i}" title="Crea turnos de ${String(Math.round(c.horasSemana / 5 * 2) / 2).replace('.', ',')} h de mañana y de tarde y los pone en este contrato">Turnos a medida</button>` : ''}
      ${c.id === 'completa' ? '' : `<button type="button" class="btn mini peligro" data-accion="quitar-contrato" data-i="${i}">Quitar</button>`}</span></td></tr>`).join('');
  const personas = estado.res.personas;
  const ids = Object.keys(cfg.especiales || {}).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  const nombreDe = (id) => (personas.find(p => p.id === id) || {}).nombre || '';
  const u = (estado.ui.especiales ||= { buscar: '' }), q = u.buscar.trim().toLowerCase();
  const visibles = ids.filter(id => !q || id.toLowerCase().includes(q) || nombreDe(id).toLowerCase().includes(q));
  const filasE = visibles.map(id => {
    const e = casoEspecial(cfg.especiales[id]), r = `especiales.${id}`;
    return `<tr>
      <th scope="row">${esc(id)}${nombreDe(id) ? `<br><span class="tenue">${esc(nombreDe(id))}</span>` : ''}</th>
      <td>${sel(`${r}.contrato`, e.contrato, [['', 'El del grupo'], ...cfg.contratos.map(c => [c.id, `${c.nombre} (${String(c.horasSemana).replace('.', ',')} h)`])], 'aria-label="Contrato"')}</td>
      <td>${sel(`${r}.franjas`, e.franjas.join(','), OPC_FRANJAS, 'aria-label="Franjas"')}</td>
      <td>${chk(`${r}.sinFindes`, e.sinFindes, 'Sin fines de semana')}</td>
      <td><span class="dias-libres" role="group" aria-label="Días libres fijos">${DIAS_LETRA.map((l, dw) => `<label title="${DIAS_CORTOS[dw] || l}"><input type="checkbox" data-dias-libres="${esc(id)}" value="${dw}" ${e.diasLibres.includes(dw) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</span></td>
      <td><input type="date" data-ruta="${r}.alta" value="${esc(e.alta)}" aria-label="Alta"></td>
      <td><input type="date" data-ruta="${r}.baja" value="${esc(e.baja)}" aria-label="Baja"></td>
      <td class="num">${num(`${r}.semanaInicio`, e.semanaInicio || '', 'min="0" aria-label="Semana de inicio en el ciclo" style="width:70px"')}</td>
      <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar-especial" data-id="${esc(id)}">Quitar</button></td></tr>`;
  }).join('');
  const sinCaso = personas.filter(p => !(cfg.especiales || {})[p.id]);
  return `<section class="panel" id="sec-contratos"><h2>Contratos</h2>
    <p class="tenue">Perfiles de jornada, como en Quinyx o Skello. Una jornada reducida trabaja los mismos días que su ciclo con turnos más cortos: «Turnos a medida» crea los de mañana y tarde con las horas del día (horas a la semana ÷ 5) y los pone en el contrato. Su jornada anual sale en proporción (25 h = 25/35 de la completa).</p>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Contrato</th><th scope="col" class="num">Horas/semana</th><th scope="col">Noches</th><th scope="col">Turno de mañana</th><th scope="col">Turno de tarde</th><th scope="col" class="num">Personas</th><th scope="col"></th></tr></thead><tbody>${filasC}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-contrato">Añadir contrato</button></div></section>
  <section class="panel" id="sec-especiales"><h2>Casos especiales</h2>
    <p class="tenue">Lo que cada persona tiene distinto del ciclo de su grupo: contrato, franjas que puede hacer, sin fines de semana, días libres fijos (conciliación), fechas de alta y de baja, y la semana del ciclo en que empieza (como el «Base schedule» de Quinyx). El ajuste cubre con otras personas lo que ella no hace. Van por código de persona; con la plantilla real abierta, también se ve el nombre.</p>
    <div class="herramientas"><div class="grupo">
      <label class="oculto" for="esp-nueva">Persona</label><select id="esp-nueva">${sinCaso.map(p => `<option value="${esc(p.id)}">${esc(p.id)}${p.nombre ? ` · ${esc(p.nombre)}` : ''}</option>`).join('')}</select>
      <button type="button" class="btn" data-accion="anadir-especial" ${sinCaso.length ? '' : 'disabled'}>Añadir caso</button></div>
      <div class="grupo"><label class="oculto" for="esp-buscar">Buscar</label><input type="text" id="esp-buscar" placeholder="Buscar código o nombre" value="${esc(u.buscar)}" style="width:200px"></div></div>
    ${ids.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista tabla-especiales"><thead><tr><th scope="col">Persona</th><th scope="col">Contrato</th><th scope="col">Franjas</th><th scope="col">Fines de semana</th><th scope="col">Días libres fijos</th><th scope="col">Alta</th><th scope="col">Baja</th><th scope="col" class="num">Semana de inicio</th><th scope="col"></th></tr></thead><tbody>${filasE || '<tr><td colspan="9">Nadie con ese código o nombre.</td></tr>'}</tbody></table></div>`
      : '<p class="tenue">Todavía no hay casos especiales: todo el mundo sigue el ciclo de su grupo con jornada completa.</p>'}
  </section>`;
}

// Apartados de Parámetros: uno por pantalla (#parametros/turnos), con un submenú como los ajustes de Gestlogix v2.
// Cada entrada enseña su recuento y, si hay algo que mirar, una marca con el número.
const APARTADOS = [
  { id: 'general', titulo: 'Año y festivos', icono: 'calendario', pinta: seccionGeneral,
    resumen: (cfg, res) => `${res.dias.filter(d => d.festivo).length} festivos en ${cfg.anio}` },
  { id: 'turnos', titulo: 'Turnos', icono: 'reloj', pinta: seccionTurnos,
    resumen: (cfg) => { const t = cfg.turnos.filter(x => x.franja !== 'libre').length; return `${t} de trabajo · ${cfg.turnos.length - t} de libre o ausencia`; } },
  { id: 'contratos', titulo: 'Contratos y casos especiales', icono: 'reloj', pinta: seccionContratos,
    resumen: (cfg) => { const n = Object.keys(cfg.especiales || {}).length; return `${cfg.contratos.length} contratos · ${n} ${n === 1 ? 'caso especial' : 'casos especiales'}`; } },
  { id: 'cobertura', titulo: 'Cobertura y bolsa', icono: 'escudo', pinta: seccionCobertura,
    resumen: (cfg, res) => { const n = res.personas.reduce((a, p) => a + (p.nochesCedidas || 0), 0); return `${n} noches cedidas · ${cfg.cobertura.ausencias.length} ausencias`; },
    aviso: (cfg, res) => res.huecos.reduce((a, h) => a + h.falta, 0), avisoTexto: 'personas que faltan para los mínimos' },
  { id: 'grupos', titulo: 'Grupos y patrones', icono: 'usuarios', pinta: seccionGrupos,
    resumen: (cfg, res) => `${cfg.grupos.length} ${cfg.grupos.length === 1 ? 'grupo' : 'grupos'} · ${fmtNum(res.P)} personas`,
    aviso: (cfg, res) => res.personas.filter(p => p.alertas.length).length, avisoTexto: 'personas con avisos' },
  { id: 'minimos', titulo: 'Mínimos', icono: 'informes', pinta: seccionMinimos,
    resumen: (cfg) => `${cfg.minimos.length} ${cfg.minimos.length === 1 ? 'mínimo' : 'mínimos'} por franja y día`,
    aviso: (cfg, res) => new Set(res.huecos.map(h => h.d)).size, avisoTexto: 'días con algún hueco' },
  { id: 'reglas', titulo: 'Reglas', icono: 'escudo', pinta: seccionReglas,
    resumen: (cfg) => { const k = Object.keys(cfg.reglas).filter(x => x !== 'ajuste'); return `${k.filter(x => cfg.reglas[x].activo).length} de ${k.length} activas`; } },
];
const apartadoActual = () => APARTADOS.find(a => a.id === estado.sub) || APARTADOS[0];

function navParametros() {
  const { cfg, res } = estado, actual = apartadoActual();
  return APARTADOS.map(a => {
    const n = a.aviso ? a.aviso(cfg, res) : 0;
    return `<a href="#parametros/${a.id}" class="${a === actual ? 'activa' : ''}" ${a === actual ? 'aria-current="page"' : ''}>
      ${icono(a.icono)}<span class="pn-texto"><b>${a.titulo}</b><small>${esc(a.resumen(cfg, res))}</small></span>
      ${n ? `<span class="pn-aviso" title="${n} ${a.avisoTexto}">${n > 99 ? '99+' : n}</span>` : ''}</a>`;
  }).join('');
}

export function pintarParametros(raiz) {
  const cfg = estado.cfg, actual = apartadoActual(), y = window.scrollY;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Parámetros · ${esc(cfg.nombre)}</h1><p>Lo que define el cuadrante de ${esc(cfg.nombre)}. No toca a la otra sede. Cada cambio se aplica al momento; para que lo vea todo el mundo, guárdalo en el servidor.</p></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="copiar-sede">Copiar de la otra sede…</button>
      <details class="menu-mas"><summary class="btn" aria-label="Más acciones">${icono('mas')}</summary>
        <div class="menu-mas-lista" role="menu"><button type="button" role="menuitem" class="peligro" data-accion="partida-sede">Volver a los valores de partida de ${esc(cfg.nombre)}</button></div></details></div></div>
    <div class="param-rejilla">
      <nav class="param-nav" aria-label="Apartados de Parámetros">${navParametros()}</nav>
      <div class="param-cuerpo">${actual.pinta(cfg)}</div>
    </div>`;  window.scrollTo(0, y);
}

// Actualiza solo los textos de resultado de cada grupo, sin repintar los campos (para no perder el foco).
export function refrescarResumenParametros(raiz) {
  const cfg = estado.cfg;
  const nav = $('.param-nav', raiz); if (nav) nav.innerHTML = navParametros();
  const ef = $('#estado-fuente', raiz); if (ef) ef.innerHTML = estadoFuente(cfg);
  const tf = $('#festivos-efectivos', raiz); if (tf) tf.outerHTML = tablaFestivos(cfg);
  const turnosMap = new Map(cfg.turnos.map(t => [t.codigo, prepararTurno(t)]));
  $$('.grupo-tarjeta', raiz).forEach((tarjeta, gi) => {
    const g = cfg.grupos[gi]; if (!g) return;
    const ps = estado.res.personas.filter(p => p.grupo === g.id);
    const med = (k) => { const v = ps.map(p => p[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const span = $('header .tenue', tarjeta);
    if (span) span.textContent = ps.length ? `Resultado: mediana de ${fmtH(med('horas'))} h, ${med('noches')} noches y ${med('fines')} fines de semana; ${ps.filter(p => p.alertas.length).length} con avisos` : 'Sin personas';
    const est = $('.estimacion', tarjeta);
    if (est) {
      const e = estimarPatron(resolverPatron(g, cfg.grupos).map(c => (turnosMap.has(c) ? c : 'L')), turnosMap);
      est.innerHTML = `Ciclo de ${e.semanas} semanas · ${fmtNum(e.diasSemana, 1)} días por semana · unas <b>${fmtNum(e.horasAnio)}</b> h al año antes de vacaciones y ajustes · <b>${fmtNum(e.nochesAnio)}</b> noches · <b>${fmtNum(e.finesAnio)}</b> fines de semana al año`;
    }
  });
}

const NUEVOS = {
  'festivos.extra': (cfg) => ({ fecha: `${cfg.anio}-01-01`, nombre: 'Nuevo festivo' }),
  'festivos.locales': () => ({ nombre: 'Nueva fiesta local', regla: 'fija', fecha: '01-01' }),
  'festivos.enlaces': () => ({ texto: 'Nuevo enlace', url: 'https://' }),
  turnos: (cfg) => {
    let n = 1; while (cfg.turnos.some(t => t.codigo === `X${n}`)) n++;
    return { codigo: `X${n}`, nombre: 'Nuevo turno', inicio: '09:00', fin: '16:00', franja: 'manana', color: '#B9D7EA' };
  },
  minimos: () => ({ colectivo: 'TA', franja: 'manana', laborable: 0, sabado: 0, domingo: 0 }),
  solapes: (cfg) => {
    const t = cfg.turnos.filter(x => x.franja !== 'libre');
    const base = (t.find(x => x.codigo === 'RM1') || t[0] || {}).codigo || '';
    const otro = (t.find(x => x.codigo !== base && /^S/.test(x.codigo)) || t.find(x => x.codigo !== base) || {}).codigo || '';
    return { activo: true, grupo: (cfg.grupos[0] || {}).id || '', base, turno: otro, dias: [2], cada: 1, desfase: 0 };
  },
};

export function eventosParametros(raiz, repintar) {
  // El menú «Más» se cierra al pulsar fuera o al elegir una opción.
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.menu-mas[open]').forEach(d => { if (!d.contains(e.target) || e.target.closest('.menu-mas-lista button')) d.open = false; });
  });
  const leerValor = (el) => {
    if (el.dataset.tipo === 'bool') return el.checked;
    if (el.dataset.tipo === 'num') return el.value === '' ? 0 : Number(el.value);
    if (el.dataset.tipo === 'mmdd') return el.value ? el.value.slice(5) : '01-01';
    return el.value;
  };
  const alCambiar = (e, final) => {
    if (!VISTAS_PARAM.includes(estado.vista)) return;
    const el = e.target;
    const cfg = estado.cfg;
    if (el.dataset.patron != null) {
      const g = cfg.grupos[Number(el.dataset.patron)];
      g.patron[Number(el.dataset.pos)] = el.value;
      const t = cfg.turnos.find(x => x.codigo === el.value);
      if (t) { el.style.background = t.color; el.style.color = tinta(t.color); }
      return cambiado();
    }
    if (el.dataset.solape != null) {
      if (!final) return;
      const r = cfg.solapes[Number(el.dataset.solape)], d = Number(el.dataset.dia);
      const dias = new Set((r.dias || []).map(Number));
      if (el.checked) dias.add(d); else dias.delete(d);
      r.dias = [...dias].sort();
      cambiado(); return repintar();
    }
    if (el.dataset.voluntario != null) {
      if (!final) return;
      const id = el.dataset.voluntario;
      cfg.especiales[id] = { ...(cfg.especiales[id] || {}), cedeNoches: el.checked };
      return cambiado();
    }
    if (el.id === 'cob-buscar') { (estado.ui.cobertura ||= { buscar: '', bolsaBuscar: '' }).buscar = el.value; if (final) repintar(); return; }
    if (el.id === 'bolsa-buscar') { (estado.ui.cobertura ||= { buscar: '', bolsaBuscar: '' }).bolsaBuscar = el.value; if (final) repintar(); return; }
    if (el.id === 'bolsa-csv') {
      if (!final || !el.files[0]) return;
      el.files[0].text().then(t => {
        let n = 0;
        for (const l of t.replace(/^\uFEFF/, '').split(/\r?\n/)) {
          const [id, h] = l.split(/[;,\t]/).map(x => (x || '').trim().replace(/^"|"$/g, ''));
          const v = Number(String(h || '').replace(',', '.'));
          if (id && Number.isFinite(v) && estado.res.personas.some(p => p.id === id)) { cfg.cobertura.bolsa.inicial[id] = v; n++; }
        }
        cambiado({ inmediato: true }); repintar(); avisar(`${n} saldos de partida importados.`, n ? 'bien' : 'mal');
      });
      return;
    }
    if (el.dataset.diasLibres != null) {
      if (!final) return;
      const id = el.dataset.diasLibres;
      cfg.especiales[id] = { ...(cfg.especiales[id] || {}), diasLibres: $$(`input[data-dias-libres="${CSS.escape(id)}"]:checked`, raiz).map(x => Number(x.value)) };
      return cambiado();
    }
    if (el.id === 'esp-buscar') { (estado.ui.especiales ||= { buscar: '' }).buscar = el.value; if (final) repintar(); return; }
    if (el.dataset.franjaAjuste != null) {
      if (!final) return;
      const g = cfg.grupos[Number(el.dataset.franjaAjuste)];
      g.franjasAjuste = $$(`input[data-franja-ajuste="${el.dataset.franjaAjuste}"]:checked`, raiz).map(x => x.value);
      return cambiado();
    }
    if (!el.dataset.ruta) return;
    const ruta = el.dataset.ruta;
    const antes = leerRuta(cfg, ruta);
    let valor = leerValor(el);
    if (ruta.endsWith('.codigo')) {
      valor = String(valor).toUpperCase().replace(/[^A-Z0-9ÑÁÉÍÓÚ.]/g, '').slice(0, 5);
      if (!final) return;
      if (!valor || cfg.turnos.some(t => t.codigo === valor && t.codigo !== antes)) { el.value = antes; return; }
      // Renombra el código en todos los patrones y cambios a mano.
      cfg.grupos.forEach(g => { g.patron = g.patron.map(c => (c === antes ? valor : c)); });
      for (const k of Object.keys(cfg.manuales)) if (cfg.manuales[k] === antes) cfg.manuales[k] = valor;
    }
    if (ruta === 'anio') {
      if (!final || !(valor >= 2020 && valor <= 2100)) return;
    }
    if (ruta.endsWith('.patronDe') && !valor && antes) {
      // Al pasar a patrón propio, se parte de una copia del que usaba.
      const g = cfg.grupos[Number(ruta.split('.')[1])];
      g.patron = resolverPatron(g, cfg.grupos).slice();
    }
    ponerRuta(cfg, ruta, valor);
    if (ruta.startsWith('reglas.') && ruta.endsWith('.activo')) { const n = el.closest('tr') && $('input[type=number]', el.closest('tr')); if (n) n.disabled = !valor; }
    cambiado();
    if (el.dataset.estructura || ruta.endsWith('.vacaciones.activo') || ruta.endsWith('.color') || ruta === 'anio') {
      if (final) setTimeout(() => { repintar(); }, 200);
    }
  };
  raiz.addEventListener('input', (e) => { if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') alCambiar(e, false); });
  raiz.addEventListener('change', (e) => alCambiar(e, true));

  raiz.addEventListener('click', async (e) => {
    if (!VISTAS_PARAM.includes(estado.vista)) return;
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const cfg = estado.cfg, a = b.dataset.accion, i = Number(b.dataset.i);
    const lista = b.dataset.lista && leerRuta(cfg, b.dataset.lista);
    if (a === 'turnos-medida') {
      const c = cfg.contratos[i];
      const { nuevos, mapa, horasDia } = turnosAMedida(c, cfg.turnos);
      cfg.turnos.push(...nuevos);
      c.turnos = { ...(c.turnos || {}), ...mapa };
      cambiado({ inmediato: true }); repintar();
      return avisar(`${nuevos.length ? `Creados ${nuevos.map(t => `${esc(t.codigo)} (${esc(t.inicio)}–${esc(t.fin)})`).join(' y ')}` : 'Los turnos a medida ya existían'}: ${String(horasDia).replace('.', ',')} h al día para «${esc(c.nombre)}».`, 'bien');
    }
    if (a === 'anadir-ausencia') {
      const p = estado.res.personas[0];
      cfg.cobertura.ausencias.push({ persona: p ? p.id : '', tipo: 'baja', desde: `${cfg.anio}-01-01`, hasta: `${cfg.anio}-01-07`, nota: '' });
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'quitar-ausencia') { cfg.cobertura.ausencias.splice(i, 1); cambiado({ inmediato: true }); return repintar(); }
    if (a === 'anadir-refuerzo') {
      const col = b.dataset.colectivo, base = cfg.grupos.find(g => g.colectivo === col && !g.soloLaborables) || cfg.grupos[0];
      const n = cfg.grupos.filter(g => g.desde || g.hasta).length + 1;
      cfg.grupos.push({ ...clonar(base), id: nuevoId('ref'), nombre: `Refuerzo ${n} (${col === 'SUP' ? 'supervisión' : 'teleasistencia'})`, prefijo: `${col === 'SUP' ? 'RS' : 'RT'}${n}`,
        personas: 4, patron: [], patronDe: base.patronDe || base.id, desde: `${cfg.anio}-07-01`, hasta: `${cfg.anio}-09-15` });
      cambiado({ inmediato: true }); repintar();
      return avisar('Refuerzo añadido: 4 personas del 1 de julio al 15 de septiembre con el patrón del grupo. Cambia el número y las fechas en la tabla.', 'bien');
    }
    if (a === 'anadir-contrato') {
      let n = 1; while (cfg.contratos.some(c => c.id === `c${n}`)) n++;
      cfg.contratos.push({ id: `c${n}`, nombre: 'Nuevo contrato', horasSemana: 30, sinNoches: true, turnos: { manana: '', tarde: '', noche: '' } });
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'quitar-contrato') {
      const c = cfg.contratos[i], n = Object.values(cfg.especiales).filter(e => e && e.contrato === c.id).length;
      if (n && !(await confirmar(`¿Quitar «${c.nombre}»?`, `Lo tienen ${n} personas en sus casos especiales: pasarán a la jornada de su grupo.`, 'Quitar'))) return;
      cfg.contratos.splice(i, 1);
      for (const e of Object.values(cfg.especiales)) if (e && e.contrato === c.id) delete e.contrato;
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'anadir-especial') {
      const id = $('#esp-nueva', raiz) && $('#esp-nueva', raiz).value;
      if (!id) return;
      cfg.especiales[id] = { contrato: '', franjas: '', sinFindes: false, diasLibres: [], alta: '', baja: '', semanaInicio: 0 };
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'quitar-especial') { delete cfg.especiales[b.dataset.id]; cambiado({ inmediato: true }); return repintar(); }
    if (a === 'anadir') lista.push(NUEVOS[b.dataset.lista](cfg));
    else if (a === 'quitar') {
      if (b.dataset.lista === 'turnos') {
        const t = cfg.turnos[i];
        const usos = cfg.grupos.filter(g => g.patron.includes(t.codigo)).length;
        if (usos && !(await confirmar('¿Quitar este turno?', `El turno ${esc(t.codigo)} aparece en el patrón de ${usos} grupo(s). Esas casillas pasarán a libre.`, 'Quitar turno'))) return;
        cfg.grupos.forEach(g => { g.patron = g.patron.map(c => (c === t.codigo ? 'L' : c)); });
      }
      lista.splice(i, 1);
    } else if (a === 'subir' || a === 'bajar') {
      const j = a === 'subir' ? i - 1 : i + 1;
      [lista[i], lista[j]] = [lista[j], lista[i]];
    } else if (a === 'fest-quitar') { if (!cfg.festivos.quitar.includes(b.dataset.fecha)) cfg.festivos.quitar.push(b.dataset.fecha); }
    else if (a === 'fest-restaurar') cfg.festivos.quitar = cfg.festivos.quitar.filter(f => f !== b.dataset.fecha);
    else if (a === 'fest-quitar-mano') cfg.festivos.extra = cfg.festivos.extra.filter(e => e.fecha !== b.dataset.fecha);
    else if (a === 'fest-actualizar') { pedirFestivos(cfg, true); return repintar(); }
    else if (a === 'regla-quitar') delete cfg.reglas[b.dataset.k];
    else if (a === 'regla-anadir') {
      const k = $('#regla-nueva', raiz).value, r = REGLAS_CATALOGO.find(x => x.k === k);
      if (r) cfg.reglas[k] = { activo: true, valor: r.defecto };
    }
    else if (a === 'orden-turnos') { ordenTurnos = b.dataset.valor; return repintar(); }
    else if (a === 'personas') { const g = cfg.grupos[i]; g.personas = Math.max(0, Number(g.personas) + Number(b.dataset.valor)); }
    else if (a === 'quitar-grupo') {
      const g = cfg.grupos[i];
      const dependen = cfg.grupos.filter(o => o.patronDe === g.id);
      const extra = dependen.length ? ` ${dependen.map(o => `«${esc(o.nombre)}»`).join(', ')} usa su patrón y se quedará con una copia.` : '';
      if (!(await confirmar('¿Quitar este grupo?', `Se quitan las ${g.personas} personas de «${esc(g.nombre)}» del cuadrante, con sus cambios a mano.${extra}`, 'Quitar grupo'))) return;
      const patron = resolverPatron(g, cfg.grupos);
      dependen.forEach(o => { o.patronDe = ''; o.patron = patron.slice(); });
      const pre = `${g.prefijo} `;
      for (const k of Object.keys(cfg.manuales)) if (k.startsWith(pre)) delete cfg.manuales[k];
      cfg.grupos.splice(i, 1);
    } else if (a === 'duplicar-grupo') {
      const g = JSON.parse(JSON.stringify(cfg.grupos[i]));
      g.id = nuevoId('g'); g.nombre += ' (copia)'; g.prefijo = prefijoLibre(cfg, g.prefijo);
      cfg.grupos.splice(i + 1, 0, g);
    } else if (a === 'anadir-grupo') {
      const col = b.dataset.colectivo;
      const ref = cfg.grupos.find(g => g.colectivo === 'TA' && !g.patronDe);
      cfg.grupos.push({ id: nuevoId('g'), colectivo: col, nombre: col === 'SUP' ? 'Nuevo grupo de supervisión' : 'Nuevo grupo', prefijo: prefijoLibre(cfg, col === 'SUP' ? 'SUP-N' : 'TA-N'),
        personas: 5, patron: [], patronDe: ref ? ref.id : '', flexible: true, horasObjetivo: 1480.5, vacaciones: { activo: true, dias: 30, desde: '06-01', hasta: '09-30' } });
    } else if (a === 'partida-sede') {
      if (!(await confirmar(`¿Volver a los valores de partida de ${esc(cfg.nombre)}?`, `Se sustituyen los turnos, grupos, mínimos, reglas, festivos y cambios a mano de ${esc(cfg.nombre)}. La otra sede y las encuestas no se tocan. Hasta que guardes, solo cambia en tu navegador.`, 'Volver a los de partida'))) return;
      const i2 = estado.todo.sedes.findIndex(x => x.id === cfg.id);
      estado.todo.sedes[i2] = sedeBase(cfg.id);
    } else if (a === 'copiar-sede') {
      const otras = estado.todo.sedes.filter(x => x.id !== cfg.id);
      const partes = [['turnos', 'Turnos'], ['grupos', 'Grupos y patrones'], ['minimos', 'Mínimos'], ['reglas', 'Reglas'], ['festivos', 'Festivos']];
      const elegido = await modal({
        titulo: `Copiar a ${cfg.nombre} desde otra sede`,
        html: `<p>Elige de dónde y qué copiar. Lo copiado sustituye lo que tiene ${esc(cfg.nombre)} en esas listas; lo demás no cambia.</p>
          <label class="campo"><span>Desde</span><select id="copiar-desde">${otras.map(o => `<option value="${esc(o.id)}">${esc(o.nombre)}</option>`).join('')}</select></label>
          <div class="opciones" style="margin-top:12px">${partes.map(([k, t]) => `<label class="casilla"><input type="checkbox" value="${k}" data-copiar ${k === 'reglas' ? 'checked' : ''}> ${t}</label>`).join('')}</div>`,
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Copiar', tipo: 'primario', valor: (velo) => ({ desde: $('#copiar-desde', velo).value, que: $$('[data-copiar]:checked', velo).map(x => x.value) }) }],
      });
      if (!elegido || !elegido.que.length) return;
      const origen = estado.todo.sedes.find(x => x.id === elegido.desde);
      for (const k of elegido.que) cfg[k] = clonar(origen[k]);
      if (elegido.que.includes('turnos') && !elegido.que.includes('grupos')) {
        const codigos = new Set(cfg.turnos.map(t => t.codigo));
        cfg.grupos.forEach(g => { g.patron = g.patron.map(c => (codigos.has(c) ? c : 'L')); });
      }
      avisar(`Copiado de ${esc(origen.nombre)} a ${esc(cfg.nombre)}: ${elegido.que.length} lista(s).`, 'bien');
    } else if (a.startsWith('semana-')) {
      const g = cfg.grupos[Number(b.dataset.g)], w = Number(b.dataset.w);
      g.patron = resolverPatron(g, cfg.grupos);
      if (a === 'semana-anadir') g.patron.push('L', 'L', 'L', 'L', 'L', 'L', 'L');
      if (a === 'semana-duplicar') g.patron.splice((w + 1) * 7, 0, ...g.patron.slice(w * 7, w * 7 + 7));
      if (a === 'semana-quitar') g.patron.splice(w * 7, 7);
    } else return;
    cambiado({ inmediato: true });
    repintar();
  });
}

function prefijoLibre(cfg, base) {
  let p = base, n = 2;
  while (cfg.grupos.some(g => g.prefijo === p)) p = `${base}${n++}`;
  return p;
}
