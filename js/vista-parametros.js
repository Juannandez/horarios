// Vista Parámetros: todo lo que define el cuadrante, en listas donde se añade y se quita.
import { estado, esc, $, $$, DIAS_CORTOS, MESES, fmtNum, estiloTurno, confirmar, modal, cambiado, leerRuta, ponerRuta, nuevoId, tinta, sedeBase, clonar, avisar, pedirFestivos } from './nucleo.js';
import { estimarPatron, prepararTurno, resolverPatron, aplicarSolapes, fmtH } from './motor.js';
import { COLECTIVOS, FRANJAS, FRANJA_NOMBRE, REGLAS_CATALOGO, TIPOS_FUENTE, nivelRegla, ROTATORIOS } from './datos-base.js';
import { aplicarRotatorio, minimosHoraDesdeFranjas, tablaHoraConsultora } from './escenarios-plantilla.js';
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
    <div class="campos">${campo('Título del cuadrante', txt('titulo', cfg.titulo, 'style="width:320px"'))}${campo('Año', num('anio', cfg.anio, 'min="2020" max="2100"'))}
      ${campo('El año del cuadrante va', sel('inicioCuadrante', cfg.inicioCuadrante || '01-01', [['01-01', `Del 1 de enero al 31 de diciembre de ${cfg.anio}`], ['01-15', `Del 15 de enero de ${cfg.anio} al 14 de enero de ${Number(cfg.anio) + 1} (sin cortar la Navidad)`]], 'data-estructura="1"'))}</div>
    ${cfg.inicioCuadrante === '01-15' ? `<p class="tenue">Del 15 de enero al 14 de enero: la Navidad entera (del 24 de diciembre al 6 de enero) cae en el mismo cuadrante. Los festivos del 1 al 14 de enero de ${Number(cfg.anio) + 1} se toman de la fuente si ya están publicados; si no, Año Nuevo y Reyes.</p>` : ''}

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
      <td>${libre ? '<span class="tenue">—</span>' : `<span style="display:inline-flex;gap:4px"><input type="time" data-ruta="turnos.${i}.inicio2" value="${esc(t.inicio2 || '')}" aria-label="Segundo tramo: inicio"><input type="time" data-ruta="turnos.${i}.fin2" value="${esc(t.fin2 || '')}" aria-label="Segundo tramo: fin"></span>${t.inicio2 && !p.partido ? '<br><small style="color:var(--bad)">Tiene que empezar después del primero</small>' : ''}`}</td>
      <td class="num">${libre ? '—' : fmtH(p.horas) + ' h'}</td>
      <td>${t.fijo ? `<span class="tenue">${FRANJA_NOMBRE.libre}</span>` : sel(`turnos.${i}.franja`, t.franja, [...FRANJAS.map(f => [f.id, f.nombre]), ['libre', FRANJA_NOMBRE.libre]], 'aria-label="Franja" data-estructura="1"')}</td>
      <td>${libre && t.codigo !== 'D' && t.codigo !== 'SN' ? chk(`turnos.${i}.disponible`, t.disponible !== false, 'Puede pasar a turno al planificar', 'title="Al hacer el cuadrante del año, el ajuste puede convertir este día libre en un día de trabajo para cubrir un mínimo o completar la jornada. No es una llamada: va ya en el cuadrante publicado (punto azul)."') : ''}</td>
      <td class="num">${t.fijo ? '<span class="tenue">Fijo</span>' : `<button type="button" class="btn mini peligro" data-accion="quitar" data-lista="turnos" data-i="${i}">Quitar</button>`}</td></tr>`;
  }).join('');
  return `<section class="panel" id="sec-turnos"><h2>Turnos</h2>
    <p class="tenue">Los turnos de mañana, tarde y noche cubren su franja. Los de «libre o ausencia» no suman horas. Si marcas «Puede pasar a turno al planificar», al hacer el cuadrante del año el ajuste puede convertir ese día libre en un día de trabajo, para cubrir un mínimo o completar la jornada (sale con un punto azul). No es una llamada: va ya en el cuadrante que se publica. Sin marcarlo, nadie trabaja nunca en sus días libres del patrón y los fijos discontinuos, que no tienen patrón, no trabajan. Un turno partido (como el P, de 09:45 a 14:30 y de 16:15 a 19:30) lleva un segundo tramo el mismo día: cuenta las horas de los dos y cubre la franja que elijas.</p>
    <div class="herramientas"><div class="grupo" role="group" aria-label="Ordenar turnos"><span class="etiqueta">Ordenar</span>
      ${[['franja', 'Franja'], ['codigo', 'Código'], ['inicio', 'Hora de inicio'], ['lista', 'Como se crearon']].map(([v, t]) => `<button type="button" class="btn mini" data-accion="orden-turnos" data-valor="${v}" aria-pressed="${ordenTurnos === v}">${t}</button>`).join('')}</div></div>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista tabla-turnos"><thead><tr><th scope="col">Color</th><th scope="col">Muestra</th><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col" title="Turno partido: segundo tramo del mismo día">2.º tramo (partido)</th><th scope="col" class="num">Horas</th><th scope="col">Franja</th><th scope="col">Ajuste</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>
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
  // Turnos que más usa ya el patrón de este grupo en cada franja (para proponerlos al poner un rotatorio).
  const usado = (f) => { const n = new Map(); for (const c of patron) if ((turnosMap.get(c) || {}).franja === f) n.set(c, (n.get(c) || 0) + 1); return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] || ''; };
  const opcionesFr = (f, actual) => cfg.turnos.filter(t => t.franja === f).map(t => `<option value="${esc(t.codigo)}" ${t.codigo === actual ? 'selected' : ''}>${esc(t.codigo)} ${esc(t.inicio || '')}-${esc(t.fin || '')}</option>`).join('');
  const codigosPatron = [...new Set(patron)].filter(c => turnosMap.has(c));
  const rotatorios = !g.desde && !g.hasta && !g.soloLaborables && !(g.periodos || []).length ? `<div class="herramientas rot-herr">
    <div class="grupo"><label for="rot-${gi}">Poner un rotatorio</label>
      <select id="rot-${gi}">${ROTATORIOS.map(r => `<option value="${r.id}">${esc(r.nombre)}</option>`).join('')}</select>
      <label for="rot-m-${gi}">con mañana</label><select id="rot-m-${gi}">${opcionesFr('manana', usado('manana'))}</select>
      <label for="rot-t-${gi}">tarde</label><select id="rot-t-${gi}">${opcionesFr('tarde', usado('tarde'))}</select>
      <label for="rot-n-${gi}">noche</label><select id="rot-n-${gi}">${opcionesFr('noche', usado('noche'))}</select>
      <button type="button" class="btn mini primario" data-accion="aplicar-rotatorio" data-g="${gi}">Poner</button></div>
    <div class="grupo"><label for="cam-a-${gi}">En este patrón, cambiar</label>
      <select id="cam-a-${gi}">${codigosPatron.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <label for="cam-b-${gi}">por</label><select id="cam-b-${gi}">${cfg.turnos.map(t => `<option>${esc(t.codigo)}</option>`).join('')}</select>
      <button type="button" class="btn mini" data-accion="patron-cambiar" data-g="${gi}">Cambiar</button></div></div>` : '';
  const semanas = patron.length / 7;
  const opciones = cfg.turnos.map(t => t.codigo);
  const filas = Array.from({ length: semanas }, (_, w) => `<tr><th scope="row" class="tenue">S${w + 1}</th>${DIAS_CORTOS.map((_, d) => {
    const c = patron[w * 7 + d], t = turnosMap.get(c) || turnosMap.get('L');
    return `<td><select data-patron="${gi}" data-pos="${w * 7 + d}" style="${estiloTurno(t)}" aria-label="Semana ${w + 1}, ${DIAS_CORTOS[d]}">${opciones.map(o => `<option ${o === c ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
  }).join('')}<td><button type="button" class="btn mini" data-accion="semana-duplicar" data-g="${gi}" data-w="${w}" title="Duplica la semana ${w + 1}">Duplicar</button>
    <button type="button" class="btn mini peligro" data-accion="semana-quitar" data-g="${gi}" data-w="${w}" ${semanas <= 1 ? 'disabled' : ''}>Quitar</button></td></tr>`).join('');
  return `${origen}${rotatorios}<div class="patron"><table><thead><tr><th></th>${DIAS_CORTOS.map(d => `<th scope="col">${d}</th>`).join('')}<th></th></tr></thead><tbody>${filas}</tbody></table></div>
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
  const ci = cfg.ciclo || {}, g0 = cfg.grupos.find(g => !g.patronDe) || cfg.grupos[0];
  const sem0 = g0 ? Math.max(1, resolverPatron(g0, cfg.grupos).length / 7) : 1;
  const enSemana = (((res.semanaCiclo0 || 0) % sem0) + sem0) % sem0 + 1;
  return `<section class="panel" id="sec-grupos"><h2>Grupos y patrones</h2>
    <p class="tenue">Cada grupo repite su patrón semana a semana. Cada persona empieza en una semana distinta del ciclo, para que el grupo quede repartido. Para que supervisores y teleasistentes tengan el mismo rotatorio, elige «El mismo que…».</p>
    <div class="campos">
      ${chk('ciclo.continuo', ci.continuo, 'El ciclo sigue de un año a otro (no vuelve a empezar el 1 de enero)', 'data-estructura="1"')}
      ${ci.continuo ? campo('Semana 1 del ciclo: la del lunes', `<input type="date" data-ruta="ciclo.inicio" value="${esc(ci.inicio || '')}" aria-label="Lunes de la semana 1 del ciclo">`) : ''}
    </div>
    <p class="tenue">${ci.continuo ? `En ${esc(cfg.anio)}, la primera semana del año es la ${enSemana}.ª del ciclo${g0 ? ` de «${esc(g0.nombre)}» (${sem0} semanas)` : ''}: cada persona sigue donde acabó el año anterior.` : 'Cada año, la persona 1 vuelve a la semana 1 del ciclo el 1 de enero.'}</p>
    ${tarjetas}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-grupo" data-colectivo="TA">Añadir grupo de teleasistentes</button>
      <button type="button" class="btn" data-accion="anadir-grupo" data-colectivo="SUP">Añadir grupo de supervisores</button></div></section>`;
}

const DIAS_MIN = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_MIN_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export function seccionMinimos(cfg) {
  const filas = cfg.minimos.map((m, i) => {
    const dias = Array.isArray(m.dias) && m.dias.length === 7 ? m.dias : [m.laborable, m.laborable, m.laborable, m.laborable, m.laborable, m.sabado, m.domingo];
    const fes = m.festivo ?? m.domingo ?? dias[6];
    return `<tr>
    <td>${sel(`minimos.${i}.colectivo`, m.colectivo, COLECTIVOS.map(c => [c.id, c.nombre]), 'aria-label="Colectivo"')}</td>
    <td>${sel(`minimos.${i}.franja`, m.franja, FRANJAS.map(f => [f.id, f.nombre]), 'aria-label="Franja"')}</td>
    ${dias.map((v, k) => `<td class="num${k >= 5 ? ' finde' : ''}">${num(`minimos.${i}.dias.${k}`, v ?? 0, `min="0" style="width:58px" aria-label="${DIAS_MIN_LARGO[k]}"`)}</td>`).join('')}
    <td class="num finde">${num(`minimos.${i}.festivo`, fes ?? 0, 'min="0" style="width:58px" aria-label="Festivo"')}</td>
    <td class="num"><button type="button" class="btn mini" data-accion="minimo-lv" data-i="${i}" title="Pone el valor del lunes de martes a viernes">L → M-V</button>
      <button type="button" class="btn mini peligro" data-accion="quitar" data-lista="minimos" data-i="${i}">Quitar</button></td></tr>`;
  }).join('');
  return `<section class="panel" id="sec-minimos"><h2>Mínimos</h2>
    <p class="tenue">Personas en sala por franja y día: cada día de la semana por separado y los festivos aparte (un festivo usa su columna aunque caiga entre semana). Valores de partida: Anexo 2 «Mínimos SAT 2013» de Sevilla. Si hay dos filas iguales, vale la más alta. En supervisión, el mínimo sube además con la ratio de Reglas. «L → M-V» copia el lunes al resto de la semana.</p>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Colectivo</th><th scope="col">Franja</th>${DIAS_MIN.map((d, k) => `<th scope="col" class="num" title="${DIAS_MIN_LARGO[k]}">${d}</th>`).join('')}<th scope="col" class="num">Festivo</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="minimos">Añadir mínimo</button></div></section>
  ${seccionPuestos(cfg)}
  ${seccionAbsentismo(cfg)}
  ${seccionMinimosHora(cfg)}
  ${seccionMinimosFecha(cfg)}`;
}

// Puestos operativos en sala: tope de personas a la vez (sumando teleasistencia y supervisión). 0 = sin tope.
function seccionPuestos(cfg) {
  const p = estado.res.puestos || { valor: 0, max: 0, dias: [] };
  return `<section class="panel" id="sec-puestos"><h2>Puestos en sala</h2>
    <p class="tenue">Cuántas personas caben a la vez en la sala (puestos operativos), sumando teleasistencia y supervisión. El ajuste no pone a nadie más en una franja cuando ya están todos ocupados, y el cuadrante marca en naranja los días que el ciclo los pasa. 0 = sin tope.</p>
    <div class="campos">${campo('Puestos operativos', num('puestos', cfg.puestos ?? 0, 'min="0" max="2000" style="width:100px" data-estructura="1"'))}</div>
    ${p.valor ? `<p>Máximo en sala: <b>${fmtNum(p.max)}</b> de ${fmtNum(p.valor)} puestos${p.dias.length ? ` · <span style="color:var(--bad)"><b>${fmtNum(p.dias.length)}</b> franjas en el año con más gente que puestos</span>` : ' · ningún día los pasa'}.</p>` : ''}
  </section>`;
}

// Absentismo previsto: porcentaje sobre el mínimo, de día y de noche; como mínimo (cuenta en los huecos) o como margen.
function seccionAbsentismo(cfg) {
  const a = cfg.absentismo || { dia: 0, noche: 0, cuenta: 'margen' }, res = estado.res;
  const d = res.dias.findIndex(x => !x.finde && !x.festivo && x.mes === 2);
  const ej = (f) => (d >= 0 ? `${fmtNum(res.necesidadPlan[0][f][d])}` : '—');
  return `<section class="panel" id="sec-absentismo"><h2>Absentismo previsto</h2>
    <p class="tenue">Un porcentaje sobre el mínimo para cubrir bajas y ausencias. La consultora suma un 20 % fijo a todas las horas. Aquí se elige el porcentaje (0 = nada) y cómo cuenta:</p>
    <div class="campos">
      ${campo('De día (mañana y tarde), %', num('absentismo.dia', a.dia ?? 0, 'min="0" max="100" step="1" style="width:90px" data-estructura="1"'))}
      ${campo('De noche, %', num('absentismo.noche', a.noche ?? 0, 'min="0" max="100" step="1" style="width:90px" data-estructura="1"'))}
      ${campo('Cómo cuenta', sel('absentismo.cuenta', a.cuenta || 'margen', [['margen', 'Como margen: gente de más si se puede (los huecos se miden con el mínimo)'], ['minimo', 'Como mínimo: sube el mínimo (los huecos se miden con él)']], 'data-estructura="1"'))}
    </div>
    <p>Teleasistencia, un martes de marzo: se planifica para <b>${ej(0)}</b> de mañana, <b>${ej(1)}</b> de tarde y <b>${ej(2)}</b> de noche${a.cuenta === 'minimo' ? ' (mínimo con el absentismo)' : ' (mínimo + margen de absentismo)'}.</p>
  </section>`;
}

// Mínimos por horas: una tabla por colectivo (24 horas × lunes … domingo y festivo).
const FILAS_HORA = ['L', 'M', 'X', 'J', 'V', 'S', 'D', 'Fest.'];
function seccionMinimosHora(cfg) {
  const mh = cfg.minimosHora || {}, u = (estado.ui.minHora ||= { col: 'TA' }), col = u.col;
  const tabla = Array.isArray(mh[col]) ? mh[col] : null, ph = estado.res.porHoras, falta = ph && ph.colectivos[col];
  const cuerpo = tabla ? Array.from({ length: 24 }, (_, h) => `<tr><th scope="row">${String(h).padStart(2, '0')}:00</th>
      ${FILAS_HORA.map((_, f) => `<td class="num${f >= 5 ? ' finde' : ''}">${num(`minimosHora.${col}.${f}.${h}`, (tabla[f] || [])[h] ?? 0, `min="0" style="width:54px" aria-label="${FILAS_HORA[f]} a las ${h}"`)}</td>`).join('')}
      <td class="num" style="${falta && falta.porHora[h] ? 'color:var(--bad);font-weight:600' : ''}">${falta ? fmtNum(Math.round(falta.porHora[h])) || '—' : ''}</td></tr>`).join('') : '';
  return `<section class="panel" id="sec-minimos-hora"><h2>Mínimos por horas</h2>
    <p class="tenue">En lugar de un mínimo por franja, uno por cada hora del día (de lunes a domingo y festivos). El ajuste sigue trabajando por franjas: el mínimo de cada franja sale de las horas centrales de su turno (la mañana de 9 a 14, la tarde de 16 a 21, la noche de 23 a 7). Las horas de los extremos (las 8, las 15, las 22…) se cuentan aparte: si ahí falta gente, hace falta otra hora de entrada o un solape. Una persona cuenta en una hora si está al menos 30 minutos.</p>
    <div class="campos">${chk('minimosHora.activo', mh.activo, 'Usar los mínimos por horas', 'data-estructura="1" data-mh-activar="1"')}</div>
    ${mh.activo ? `<div class="herramientas"><div class="grupo" role="group" aria-label="Colectivo">${COLECTIVOS.map(c => `<button type="button" class="btn mini" data-accion="mh-col" data-valor="${c.id}" aria-pressed="${col === c.id}">${esc(c.nombre)}</button>`).join('')}</div>
      <div class="grupo"><button type="button" class="btn mini" data-accion="mh-franjas">Rellenar desde los mínimos por franja</button>
        ${col === 'TA' && ['sevilla', 'malaga'].includes(cfg.id) ? '<button type="button" class="btn mini" data-accion="mh-consultora" title="Demanda planificada por la consultora en su informe (Escenario 3): media anual del pico + 20 % de absentismo + 40 % de la otra central">Usar la demanda por horas de la consultora</button>' : ''}
        <button type="button" class="btn mini" data-accion="mh-lv">L → M-V</button></div></div>
      ${cuartosTabla(mh, col)}
      ${falta ? `<p>${falta.total ? `En el año faltan <b>${fmtNum(Math.round(falta.total))}</b> personas-hora en ${fmtNum(falta.dias)} días (última columna: por hora${falta.cuartos ? ', midiendo cuarto a cuarto' : ''}).` : 'Todas las horas cubiertas.'}</p>` : ''}
      <div class="tabla-caja" style="max-height:560px"><table class="tabla-lista tabla-horas"><thead><tr><th scope="col">Hora</th>${FILAS_HORA.map(f => `<th scope="col" class="num">${f}</th>`).join('')}<th scope="col" class="num" title="Personas-hora que faltan en el año">Faltan</th></tr></thead><tbody>${cuerpo}</tbody></table></div>` : ''}
  </section>`;
}

// Mínimos por cuartos de hora (la tabla de la empresa de 15 en 15 minutos): mandan sobre la de horas, que queda como el
// mayor de cada hora. Se ven aquí (solo lectura) y se pueden quitar para volver a la tabla por horas.
function cuartosTabla(mh, col) {
  const t = mh && mh.cuartos && mh.cuartos[col];
  if (!Array.isArray(t)) return '';
  const hm = (q) => `${String(Math.floor(q / 4)).padStart(2, '0')}:${String((q % 4) * 15).padStart(2, '0')}`;
  // Se juntan los cuartos seguidos con las mismas cifras en todas las columnas.
  const filas = []; let a = 0;
  for (let q = 1; q <= 96; q++) if (q === 96 || FILAS_HORA.some((_, f) => (t[f] || [])[q] !== (t[f] || [])[a])) { filas.push([a, q]); a = q; }
  return `<div class="banda" style="margin:8px 0"><b>Mínimos por cuartos de hora${mh.cuartosNota ? ` (${esc(mh.cuartosNota)})` : ''}.</b> Mandan sobre la tabla de abajo, que muestra el mayor de cada hora. El mínimo de cada franja sale de los cuartos centrales de su turno, y los huecos se miden cuarto a cuarto.
      <details style="margin-top:6px"><summary>Ver la tabla por cuartos</summary>
      <div class="tabla-caja" style="max-height:420px"><table class="tabla-lista tabla-horas"><thead><tr><th scope="col">Desde</th><th scope="col">Hasta</th>${FILAS_HORA.map(f => `<th scope="col" class="num">${f}</th>`).join('')}</tr></thead><tbody>
        ${filas.map(([x, y]) => `<tr><th scope="row">${hm(x)}</th><td>${y === 96 ? '24:00' : hm(y)}</td>${FILAS_HORA.map((_, f) => `<td class="num${f >= 5 ? ' finde' : ''}">${fmtNum((t[f] || [])[x] ?? 0)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></details>
      <div class="fila-acciones" style="margin-top:6px"><button type="button" class="btn mini" data-accion="mh-quitar-cuartos">Quitar los cuartos y usar la tabla por horas</button></div></div>`;
}

// Mínimos de un día concreto (convenio: un teleasistente más en Nochebuena y Nochevieja).
function seccionMinimosFecha(cfg) {
  const lista = cfg.minimosFecha || [];
  const filas = lista.map((m, i) => `<tr>
    <td>${chk(`minimosFecha.${i}.activo`, m.activo !== false, '<span class="oculto">Activo</span>')}</td>
    <td><input type="date" data-ruta="minimosFecha.${i}.fecha" data-tipo="mmdd" value="${cfg.anio}-${esc(String(m.fecha || '01-01').slice(-5))}" aria-label="Día y mes"></td>
    <td>${txt(`minimosFecha.${i}.nota`, m.nota || '', 'aria-label="Nota" style="width:140px"')}</td>
    <td>${sel(`minimosFecha.${i}.colectivo`, m.colectivo, COLECTIVOS.map(c => [c.id, c.nombre]), 'aria-label="Colectivo"')}</td>
    <td>${sel(`minimosFecha.${i}.franja`, m.franja, FRANJAS.map(f => [f.id, f.nombre]), 'aria-label="Franja"')}</td>
    <td>${sel(`minimosFecha.${i}.modo`, m.modo || 'suma', [['suma', 'Sumar al del día'], ['fija', 'Poner exactamente']], 'aria-label="Cómo"')}</td>
    <td class="num">${num(`minimosFecha.${i}.valor`, m.valor ?? 0, 'style="width:64px" aria-label="Personas"')}</td>
    <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="minimosFecha" data-i="${i}">Quitar</button></td></tr>`).join('');
  return `<section class="panel" id="sec-minimos-fecha"><h2>Mínimos de días concretos</h2>
    <p class="tenue">Para un día del año que necesita otra cifra que su día de la semana: por ejemplo, un teleasistente más de noche en Nochebuena y Nochevieja (convenio). «Sumar» añade al mínimo de ese día; «Poner exactamente» lo sustituye. Vale para todos los años.</p>
    ${lista.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Activo</th><th scope="col">Día</th><th scope="col">Nota</th><th scope="col">Colectivo</th><th scope="col">Franja</th><th scope="col">Cómo</th><th scope="col" class="num">Personas</th><th scope="col"></th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="tenue">No hay días concretos.</p>'}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir" data-lista="minimosFecha">Añadir día concreto</button></div></section>`;
}

// Navidad y festivos: días AJ, cómputo del festivo de noche y reparto de los festivos especiales (también entre años).
const ESPECIALES_TIPICOS = [['12-24', 'Nochebuena'], ['12-25', 'Navidad'], ['12-31', 'Nochevieja'], ['01-01', 'Año Nuevo'], ['01-06', 'Reyes']];
export function seccionNavidad(cfg) {
  const res = estado.res, aj = cfg.aj || {}, rf = cfg.repartoFestivos || {};
  const mmdd = (ruta, valor) => `<input type="date" data-ruta="${ruta}" data-tipo="mmdd" value="${cfg.anio}-${esc(String(valor || '12-24').slice(-5))}" min="${cfg.anio}-01-01" max="${cfg.anio}-12-31">`;
  // Resultado de los AJ
  const conAJ = res.personas.filter(p => p.diasAJ);
  const en = {}; let otros = 0, sin = 0;
  for (const p of conAJ) { for (const f of p.diasAJ) { const k = f.slice(5); if ((aj.fechas || []).includes(k)) en[k] = (en[k] || 0) + 1; else otros++; } if (p.ajFaltan && p.hasta > p.desde && res.dias[p.hasta - 1].mes === 11) sin++; }
  const nombreDe = (id) => (res.personas.find(p => p.id === id) || {}).nombre || '';
  const elegidos = Object.entries(aj.elegidos || {}).sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }));
  const sinEleccion = res.personas.filter(p => !(aj.elegidos || {})[p.id]);
  const listaE = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
  // Festivos especiales
  const fechasFest = res.dias.filter(d => d.festivo).map(d => [d.fecha.slice(5), d.festivo]);
  const opciones = [...ESPECIALES_TIPICOS, ...fechasFest.filter(([k]) => !ESPECIALES_TIPICOS.some(([t]) => t === k))];
  const esp = new Set(rf.especiales || []);
  const ta = res.personas.filter(p => p.colectivo === 'TA' && p.hasta - p.desde > 300);
  const totales = ta.map(p => (p.especialesTrab || []).length + (p.historialEspeciales || 0)).sort((a, b) => a - b);
  const media = totales.length ? totales.reduce((a, b) => a + b, 0) / totales.length : 0;
  const nHist = Object.keys(rf.historial || {}).length;
  return `<section class="panel" id="sec-aj"><h2>Días AJ (24 y 31 de diciembre)</h2>
    <p class="tenue">El 24 y el 31 de diciembre son permiso retribuido (convenio, art. 36.3): cada persona libra ${(aj.fechas || []).length} días AJ que le cuentan como jornada. Quien trabaja a turnos esos días los disfruta cuando el servicio lo permite. Las noches no se tocan (van en bloque): quien hace noche el 24 o el 31 tiene su AJ otro día de la ventana.</p>
    <div class="campos">
      ${chk('aj.activo', aj.activo, 'Poner los días AJ en el cuadrante', 'data-estructura="1"')}
      ${aj.activo ? `${campo('Dónde', sel('aj.modo', aj.modo || 'fijo', [['fijo', 'El 24 y el 31 mientras sobre gente; si no, otro día'], ['reparto', 'Repartidos en la ventana, donde más gente sobre (práctica de la empresa)'], ['elegido', 'En los días que elige cada persona (petición de CGT)']], 'data-estructura="1"'))}
      ${campo('Días', `<span style="display:inline-flex;gap:4px">${(aj.fechas || []).map((f, k) => mmdd(`aj.fechas.${k}`, f)).join('')}</span>`)}
      ${campo('Ventana: desde', mmdd('aj.desde', aj.desde || '12-20'))}${campo('hasta', mmdd('aj.hasta', aj.hasta || '12-31'))}
      ${chk('aj.enJornada', aj.enJornada !== false, 'Cuentan como jornada (las horas del turno que no se hace)')}` : ''}
    </div>
    ${aj.activo ? `<p>Resultado: ${(aj.fechas || []).map(f => `<b>${fmtNum(en[f] || 0)}</b> personas con AJ el ${Number(f.slice(3))}-${f.slice(0, 2)}`).join(' · ')} · <b>${fmtNum(otros)}</b> AJ en otro día de la ventana${sin ? ` · <span style="color:var(--bad)"><b>${fmtNum(sin)}</b> personas sin sitio para algún AJ</span>` : ''}.</p>` : ''}
    ${aj.activo && aj.modo === 'elegido' ? `<h3 style="margin:16px 0 8px">Días elegidos</h3>
      <p class="tenue">Se respetan aunque falte gente (el ajuste cubre el hueco). Quien no elige, como «el 24 y el 31».</p>
      ${elegidos.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Persona</th><th scope="col">Primer AJ</th><th scope="col">Segundo AJ</th><th scope="col"></th></tr></thead><tbody>
        ${elegidos.map(([id, v]) => { const l = listaE(v); return `<tr><th scope="row">${esc(id)}${nombreDe(id) ? `<br><span class="tenue">${esc(nombreDe(id))}</span>` : ''}</th>
          ${[0, 1].map(k => `<td><input type="date" data-aj-elegido="${esc(id)}" data-k="${k}" value="${esc(l[k] || '')}" min="${cfg.anio}-01-01" max="${cfg.anio}-12-31" aria-label="AJ ${k + 1}"></td>`).join('')}
          <td class="num"><button type="button" class="btn mini peligro" data-accion="aj-quitar" data-id="${esc(id)}">Quitar</button></td></tr>`; }).join('')}
      </tbody></table></div>` : ''}
      <div class="herramientas"><div class="grupo"><label class="oculto" for="aj-nueva">Persona</label><select id="aj-nueva">${sinEleccion.map(p => `<option value="${esc(p.id)}">${esc(p.id)}${p.nombre ? ` · ${esc(p.nombre)}` : ''}</option>`).join('')}</select>
        <button type="button" class="btn" data-accion="aj-anadir" ${sinEleccion.length ? '' : 'disabled'}>Añadir elección</button></div></div>` : ''}
  </section>
  <section class="panel" id="sec-festivos-reparto"><h2>Festivos: cómputo y reparto</h2>
    <div class="campos">${campo('El festivo de noche cuenta para', sel('repartoFestivos.noche', rf.noche || 'salida', [['salida', 'Quien sale del turno (convenio)'], ['entrada', 'Quien entra en el turno']]))}</div>
    <p class="tenue">Con «quien sale», la noche del 24 al 25 cuenta como festivo de Navidad y la del 31 al 1 como Año Nuevo. Se usa para los festivos a devolver del informe de cada persona y para repartir los festivos con equidad.</p>
    <h3 style="margin:16px 0 8px">Festivos especiales</h3>
    <p class="tenue">Los que se reparten aparte, con equidad y sin que toquen siempre a los mismos: «Mejorar reparto» (en el cuadrante) iguala por grupo los de este año más los de años anteriores.</p>
    <div class="campos" role="group" aria-label="Festivos especiales">${opciones.map(([k, n]) => `<label class="casilla"><input type="checkbox" data-especial="${esc(k)}" ${esp.has(k) ? 'checked' : ''}><span>${esc(n)} (${Number(k.slice(3))}-${k.slice(0, 2)})</span></label>`).join('')}</div>
    <p>Teleasistencia (todo el año): de media <b>${fmtNum(media, 1)}</b> festivos especiales por persona${nHist ? ', con los de años anteriores' : ''}; entre <b>${totales[0] ?? 0}</b> y <b>${totales.at(-1) ?? 0}</b>.</p>
    <h3 style="margin:16px 0 8px">Días que no se repiten hasta que los haya trabajado toda la plantilla</h3>
    <p class="tenue">Quien trabajó uno de estos días no lo vuelve a trabajar hasta que lo haya trabajado todo el mundo; luego empieza otra vuelta. Cuenta el turno que empieza ese día (la noche del 24 es del 24). Para el 24 y el 31, el AJ se da primero a quien ya lo trabajó; para los demás, el ajuste cambia su semana con alguien que aún no lo ha trabajado, si puede sin tocar la cobertura ni las horas.</p>
    <div class="campos" role="group" aria-label="Días que rotan">${ESPECIALES_TIPICOS.map(([k, n]) => `<label class="casilla"><input type="checkbox" data-rotan="${esc(k)}" ${(rf.fechasRotan || []).includes(k) ? 'checked' : ''}><span>${esc(n)} (${Number(k.slice(3))}-${k.slice(0, 2)})</span></label>`).join('')}</div>
    ${(rf.fechasRotan || []).length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Día</th><th scope="col" class="num">Ya lo han trabajado</th><th scope="col" class="num">Lo trabajan este año</th><th scope="col" class="num">Repiten</th></tr></thead><tbody>
      ${(rf.fechasRotan || []).map(k => { const x = (res.repeticiones || {})[k]; return x ? `<tr><td>${Number(k.slice(3))}-${k.slice(0, 2)}${x.vueltaNueva ? ' <span class="pildora">vuelta nueva</span>' : ''}</td><td class="num">${fmtNum(x.yaTrabajado)} de ${fmtNum(x.plantilla)}</td><td class="num">${fmtNum(x.trabajan)}</td><td class="num" style="${x.repiten.length ? 'color:var(--bad);font-weight:600' : ''}">${fmtNum(x.repiten.length)}</td></tr>` : `<tr><td>${Number(k.slice(3))}-${k.slice(0, 2)}</td><td colspan="3" class="tenue">No cae en este cuadrante.</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="rotan-guardar">Apuntar quién los trabaja en ${esc(cfg.anio)}</button>
      ${Object.keys(rf.rotan || {}).some(k => (rf.rotan[k] || []).length) ? '<button type="button" class="btn peligro" data-accion="rotan-borrar">Borrar quién los ha trabajado</button>' : ''}</div>` : ''}
    <h3 style="margin:16px 0 8px">Años anteriores</h3>
    <p class="tenue">${nHist ? `Hay historial de ${fmtNum(nHist)} personas${rf.anioHistorial ? ` (hasta ${esc(rf.anioHistorial)})` : ''}. Cuenta en el reparto de este año.` : 'Sin historial. Al terminar el año, guarda los de este cuadrante: el año que viene, quien los trabajó tenderá a librarlos.'} Va por código de persona: con el ciclo que sigue de un año a otro, cada código es la misma persona.</p>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="historial-guardar">Sumar los de ${esc(cfg.anio)} al historial</button>
      ${nHist ? '<button type="button" class="btn peligro" data-accion="historial-borrar">Borrar el historial</button>' : ''}</div>
  </section>`;
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
  const discontinuos = cfg.grupos.map((g, i) => ({ g, i })).filter(({ g }) => Array.isArray(g.periodos) && g.periodos.length);
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
  <section class="panel" id="sec-discontinuos"><h2>Fijos discontinuos</h2>
    <p class="tenue">Refuerzo con periodos de alta (Navidad, Semana Santa, Feria, verano). Sin patrón: el ajuste les pone mañana, tarde o noche donde falta gente (horario libre). Su jornada sale en proporción a los días de alta, como en el horario real de 2027 (R1.FD de Málaga: unas 757 h). Sin vacaciones en el cuadrante y sin las reglas de fines de semana.</p>
    ${discontinuos.map(({ g, i }) => {
      const ps = estado.res.personas.filter(p => p.grupo === g.id), p0 = ps[0];
      const med = (k) => { const v = ps.map(p => p[k]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 0; };
      const regla = (pe, k) => pe.regla === 'pascua'
        ? `${num(`grupos.${i}.periodos.${k}.desde`, pe.desde, 'style="width:64px" aria-label="Desde (días desde Pascua)"')} a ${num(`grupos.${i}.periodos.${k}.hasta`, pe.hasta, 'style="width:64px" aria-label="Hasta (días desde Pascua)"')} <span class="tenue">días desde el domingo de Pascua</span>`
        : pe.regla === 'fechas'
          ? `<input type="date" data-ruta="grupos.${i}.periodos.${k}.desde" value="${esc(pe.desde)}" aria-label="Desde"> a <input type="date" data-ruta="grupos.${i}.periodos.${k}.hasta" value="${esc(pe.hasta)}" aria-label="Hasta">`
          : `<input type="date" data-ruta="grupos.${i}.periodos.${k}.desde" data-tipo="mmdd" value="${cfg.anio}-${esc(pe.desde)}" aria-label="Desde"> a <input type="date" data-ruta="grupos.${i}.periodos.${k}.hasta" data-tipo="mmdd" value="${cfg.anio}-${esc(pe.hasta)}" aria-label="Hasta"> <span class="tenue">todos los años</span>`;
      return `<h3 style="margin:12px 0 8px">${esc(g.nombre)}</h3>
      <div class="campos">${campo('Personas', num(`grupos.${i}.personas`, g.personas, 'min="0" max="500" style="width:80px"'))}</div>
      <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Periodo</th><th scope="col">Cómo</th><th scope="col">Fechas</th><th scope="col"></th></tr></thead><tbody>
        ${g.periodos.map((pe, k) => `<tr><td>${txt(`grupos.${i}.periodos.${k}.nombre`, pe.nombre || '', 'aria-label="Nombre" style="width:170px"')}</td>
          <td>${sel(`grupos.${i}.periodos.${k}.regla`, pe.regla || 'fijo', [['fijo', 'Mismas fechas cada año'], ['pascua', 'Según la Pascua'], ['fechas', 'Fechas de un año']], 'aria-label="Cómo" data-estructura="1"')}</td>
          <td>${regla(pe, k)}</td>
          <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar" data-lista="grupos.${i}.periodos" data-i="${k}">Quitar</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="fila-acciones"><button type="button" class="btn mini" data-accion="periodo-anadir" data-g="${i}">Añadir periodo</button></div>
      <p>${p0 ? `<b>${fmtNum(p0.diasAlta)}</b> días de alta en el cuadrante · jornada de <b>${fmtH(p0.objetivo + (p0.horasAJ || 0))}</b> h · de mediana ${fmtNum(med('mananas'))} mañanas, ${fmtNum(med('tardes'))} tardes, ${fmtNum(med('noches'))} noches y ${fmtNum(med('fines'))} fines de semana` : 'Sin personas.'}</p>`;
    }).join('') || '<p class="tenue">No hay ningún grupo de fijos discontinuos.</p>'}
    ${discontinuos.length ? '' : '<div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-discontinuos">Añadir fijos discontinuos (24 personas)</button></div>'}
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
      <td><span class="fechas-pila">${sel(`${r}.contrato`, e.contrato, [['', 'El del grupo'], ...cfg.contratos.map(c => [c.id, `${c.nombre} (${String(c.horasSemana).replace('.', ',')} h)`])], 'aria-label="Contrato" title="Contrato"')}${sel(`${r}.franjas`, e.franjas.join(','), OPC_FRANJAS, 'aria-label="Franjas" title="Franjas que puede hacer"')}</span></td>
      <td class="centro">${chk(`${r}.sinFindes`, e.sinFindes, '<span class="oculto">Sin fines de semana</span>')}</td>
      <td><span class="dias-libres" role="group" aria-label="Días libres fijos">${DIAS_LETRA.map((l, dw) => `<label title="${DIAS_CORTOS[dw] || l}"><input type="checkbox" data-dias-libres="${esc(id)}" value="${dw}" ${e.diasLibres.includes(dw) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</span></td>
      <td><span class="fechas-pila"><input type="date" data-ruta="${r}.alta" value="${esc(e.alta)}" aria-label="Alta" title="Alta"><input type="date" data-ruta="${r}.baja" value="${esc(e.baja)}" aria-label="Baja" title="Baja"></span></td>
      <td class="num">${num(`${r}.semanaInicio`, e.semanaInicio || '', 'min="0" aria-label="Semana de inicio en el ciclo" style="width:70px"')}</td>
      <td>${sel(`${r}.reduccion.contrato`, e.reduccion.contrato, [['', 'Sin reducción'], ...cfg.contratos.filter(c => c.id !== 'completa').map(c => [c.id, `${c.nombre} (${String(c.horasSemana).replace('.', ',')} h)`])], 'aria-label="Reducción temporal: contrato" data-estructura="1"')}
        ${e.reduccion.contrato ? `<br><input type="date" data-ruta="${r}.reduccion.desde" value="${esc(e.reduccion.desde)}" aria-label="Reducción desde"> <input type="date" data-ruta="${r}.reduccion.hasta" value="${esc(e.reduccion.hasta)}" aria-label="Reducción hasta">` : ''}</td>
      <td class="num"><button type="button" class="btn mini peligro" data-accion="quitar-especial" data-id="${esc(id)}" aria-label="Quitar el caso de ${esc(id)}" title="Quitar">✕</button></td></tr>`;
  }).join('');
  const sinCaso = personas.filter(p => !(cfg.especiales || {})[p.id]);
  return `<section class="panel" id="sec-contratos"><h2>Contratos</h2>
    <p class="tenue">Perfiles de jornada, como en Quinyx o Skello. Una jornada reducida trabaja los mismos días que su ciclo con turnos más cortos: «Turnos a medida» crea los de mañana y tarde con las horas del día (horas a la semana ÷ 5) y los pone en el contrato. Su jornada anual sale en proporción (25 h = 25/35 de la completa).</p>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Contrato</th><th scope="col" class="num">Horas/semana</th><th scope="col">Noches</th><th scope="col">Turno de mañana</th><th scope="col">Turno de tarde</th><th scope="col" class="num">Personas</th><th scope="col"></th></tr></thead><tbody>${filasC}</tbody></table></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="anadir-contrato">Añadir contrato</button></div></section>
  <section class="panel" id="sec-especiales"><h2>Casos especiales</h2>
    <p class="tenue">Lo que cada persona tiene distinto del ciclo de su grupo: contrato, franjas que puede hacer, sin fines de semana, días libres fijos (conciliación), fechas de alta y de baja, la semana del ciclo en que empieza (como el «Base schedule» de Quinyx) y una reducción temporal con fechas (lactancia, cuidado de un familiar, tratamiento: otro contrato solo esos días). El ajuste cubre con otras personas lo que ella no hace. Van por código de persona; con la plantilla real abierta, también se ve el nombre.</p>
    <div class="herramientas"><div class="grupo">
      <label class="oculto" for="esp-nueva">Persona</label><select id="esp-nueva">${sinCaso.map(p => `<option value="${esc(p.id)}">${esc(p.id)}${p.nombre ? ` · ${esc(p.nombre)}` : ''}</option>`).join('')}</select>
      <button type="button" class="btn" data-accion="anadir-especial" ${sinCaso.length ? '' : 'disabled'}>Añadir caso</button></div>
      <div class="grupo"><label class="oculto" for="esp-buscar">Buscar</label><input type="text" id="esp-buscar" placeholder="Buscar código o nombre" value="${esc(u.buscar)}" style="width:200px"></div></div>
    ${ids.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista tabla-especiales"><thead><tr><th scope="col">Persona</th><th scope="col">Contrato / franjas</th><th scope="col" class="centro">Sin fines de semana</th><th scope="col">Días libres fijos</th><th scope="col">Alta / baja</th><th scope="col" class="num">Semana de inicio</th><th scope="col" title="Otro contrato entre dos fechas: lactancia, cuidado de un familiar, tratamiento…">Reducción temporal</th><th scope="col"></th></tr></thead><tbody>${filasE || '<tr><td colspan="8">Nadie con ese código o nombre.</td></tr>'}</tbody></table></div>`
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
  { id: 'navidad', titulo: 'Navidad y festivos', icono: 'calendario', pinta: seccionNavidad,
    resumen: (cfg, res) => { const n = res.personas.reduce((a, p) => a + (p.diasAJ || []).length, 0); return cfg.aj && cfg.aj.activo ? `${fmtNum(n)} días AJ · festivo de noche: ${(cfg.repartoFestivos || {}).noche === 'entrada' ? 'quien entra' : 'quien sale'}` : 'Sin días AJ'; } },
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
  minimos: () => ({ colectivo: 'TA', franja: 'manana', laborable: 0, sabado: 0, domingo: 0, dias: [0, 0, 0, 0, 0, 0, 0], festivo: 0 }),
  absentismo: () => ({ dia: 0, noche: 0, cuenta: 'margen' }),
  minimosFecha: () => ({ activo: true, colectivo: 'TA', franja: 'noche', fecha: '12-24', modo: 'suma', valor: 1, nota: '' }),
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
    if (el.dataset.ajElegido != null) {
      if (!final) return;
      const id = el.dataset.ajElegido, v = cfg.aj.elegidos[id];
      const l = (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []).slice(0, 2);
      while (l.length < 2) l.push('');
      l[Number(el.dataset.k)] = el.value;
      cfg.aj.elegidos[id] = l;
      return cambiado();
    }
    if (el.dataset.rotan != null) {
      if (!final) return;
      cfg.repartoFestivos.fechasRotan = $$('input[data-rotan]:checked', raiz).map(x => x.dataset.rotan);
      cambiado(); return setTimeout(() => repintar(), 200);
    }
    if (el.dataset.especial != null) {
      if (!final) return;
      cfg.repartoFestivos.especiales = $$('input[data-especial]:checked', raiz).map(x => x.dataset.especial);
      cambiado(); return setTimeout(() => repintar(), 200);
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
    if (ruta === 'minimosHora.activo' && valor) { const t = minimosHoraDesdeFranjas(cfg); for (const c of ['TA', 'SUP']) if (!Array.isArray(cfg.minimosHora[c])) cfg.minimosHora[c] = t[c]; }
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
    if (a === 'minimo-lv') {
      const m = cfg.minimos[i]; if (!m || !Array.isArray(m.dias)) return;
      for (let k = 1; k < 5; k++) m.dias[k] = m.dias[0];
      cambiado({ inmediato: true }); return repintar();
    }
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
    if (a === 'mh-col') { (estado.ui.minHora ||= {}).col = b.dataset.valor; return repintar(); }
    if (a === 'mh-franjas' || a === 'mh-consultora') {
      const col = (estado.ui.minHora || {}).col || 'TA';
      const t = a === 'mh-franjas' ? minimosHoraDesdeFranjas(cfg)[col] : tablaHoraConsultora(cfg.id);
      if (!t) return;
      cfg.minimosHora = { ...(cfg.minimosHora || {}), activo: true, [col]: t };
      cambiado({ inmediato: true }); repintar();
      return avisar(a === 'mh-franjas' ? 'Tabla rellenada con los mínimos de cada franja.' : 'Tabla con la demanda por horas de la consultora (Escenario 3). Mira la columna «Faltan».', 'bien');
    }
    if (a === 'mh-quitar-cuartos') {
      const col = (estado.ui.minHora || {}).col || 'TA';
      if (cfg.minimosHora && cfg.minimosHora.cuartos) { delete cfg.minimosHora.cuartos[col]; if (!Object.keys(cfg.minimosHora.cuartos).length) delete cfg.minimosHora.cuartos; }
      cambiado({ inmediato: true }); repintar();
      return avisar('Quitados los mínimos por cuartos de hora: ahora mandan los de la tabla por horas. Ctrl+Z lo deshace.', '', 7000);
    }
    if (a === 'mh-lv') {
      const col = (estado.ui.minHora || {}).col || 'TA', t = cfg.minimosHora && cfg.minimosHora[col];
      if (!Array.isArray(t)) return;
      for (let f = 1; f < 5; f++) t[f] = t[0].slice();
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'periodo-anadir') {
      cfg.grupos[Number(b.dataset.g)].periodos.push({ nombre: 'Nuevo periodo', regla: 'fechas', desde: `${cfg.anio}-04-01`, hasta: `${cfg.anio}-04-07` });
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'anadir-discontinuos') {
      const base = sedeBase(cfg.id).grupos.find(g => g.id === 'fd');
      if (base) cfg.grupos.push(clonar(base));
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'aplicar-rotatorio') {
      const gi = b.dataset.g, id = $(`#rot-${gi}`, raiz).value, rot = ROTATORIOS.find(r => r.id === id), g = cfg.grupos[Number(gi)];
      const op = { grupo: gi, manana: $(`#rot-m-${gi}`, raiz).value, tarde: $(`#rot-t-${gi}`, raiz).value, noche: $(`#rot-n-${gi}`, raiz).value };
      if (!(await confirmar(`¿Poner «${esc(rot.nombre)}» en «${esc(g.nombre)}»?`, `Con mañana ${esc(op.manana)}, tarde ${esc(op.tarde)} y noche ${esc(op.noche)}. Sustituye el patrón de semanas de este grupo (los cambios hechos a mano en él se pierden; Ctrl+Z lo deshace). Pone también «una semana de tarde cada N» y «un fin de semana de cada 3».`, 'Poner'))) return;
      aplicarRotatorio(cfg, id, op);
      cambiado({ inmediato: true }); repintar();
      return avisar(`«${esc(rot.nombre)}» puesto en «${esc(g.nombre)}» (${esc(op.manana)} / ${esc(op.tarde)} / ${esc(op.noche)}).`, 'bien');
    }
    if (a === 'patron-cambiar') {
      const gi = b.dataset.g, g = cfg.grupos[Number(gi)], de = $(`#cam-a-${gi}`, raiz).value, por = $(`#cam-b-${gi}`, raiz).value;
      if (!de || !por || de === por) return;
      const n = g.patron.filter(c => c === de).length;
      g.patron = g.patron.map(c => (c === de ? por : c));
      cambiado({ inmediato: true }); repintar();
      return avisar(`En «${esc(g.nombre)}»: ${n} casillas de ${esc(de)} pasan a ${esc(por)}.`, 'bien');
    }
    if (a === 'aj-anadir') {
      const id = $('#aj-nueva', raiz) && $('#aj-nueva', raiz).value;
      if (!id) return;
      cfg.aj.elegidos[id] = cfg.aj.fechas.map(f => `${cfg.anio}-${f}`);
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'aj-quitar') { delete cfg.aj.elegidos[b.dataset.id]; cambiado({ inmediato: true }); return repintar(); }
    if (a === 'historial-guardar') {
      const h = cfg.repartoFestivos.historial;
      if (cfg.repartoFestivos.anioHistorial != null && Number(cfg.repartoFestivos.anioHistorial) >= Number(cfg.anio)
        && !(await confirmar('¿Sumar otra vez?', `El historial ya llega hasta ${esc(cfg.repartoFestivos.anioHistorial)}. Si sumas los de ${esc(cfg.anio)}, contarán dos veces.`, 'Sumar'))) return;
      let n = 0;
      for (const p of estado.res.personas) { const k = (p.especialesTrab || []).length; if (k) { h[p.id] = (Number(h[p.id]) || 0) + k; n++; } }
      cfg.repartoFestivos.anioHistorial = cfg.anio;
      cambiado({ inmediato: true }); repintar();
      return avisar(`Sumados los festivos especiales de ${cfg.anio} de ${n} personas. Para el año que viene, cambia el año en «Año y festivos».`, 'bien');
    }
    if (a === 'rotan-guardar') {
      // Suma a quien trabaja cada día en este cuadrante; si con eso ya está toda la plantilla, empieza otra vuelta.
      const res = estado.res, rf = cfg.repartoFestivos;
      for (const k of rf.fechasRotan || []) {
        const x = (res.repeticiones || {})[k]; if (!x) continue;
        const d = res.dias.find(y => y.fecha === x.fecha).i;
        const hoy = res.personas.filter((p, pi) => !p.altaDias && res.turnos[res.grid[pi * res.D + d]].trabaja).map(p => p.id);
        const antes = x.vueltaNueva ? [] : (rf.rotan[k] || []);
        rf.rotan[k] = [...new Set([...antes, ...hoy])];
      }
      cambiado({ inmediato: true }); repintar();
      return avisar(`Apuntado quién trabaja esos días en ${cfg.anio}. Para el año que viene, cambia el año: se intentará que no repitan.`, 'bien');
    }
    if (a === 'rotan-borrar') {
      if (!(await confirmar('¿Borrar quién ha trabajado esos días?', 'Empieza la vuelta desde cero.', 'Borrar'))) return;
      cfg.repartoFestivos.rotan = {}; cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'historial-borrar') {
      if (!(await confirmar('¿Borrar el historial?', 'Se pierden los festivos especiales de años anteriores de todas las personas.', 'Borrar'))) return;
      cfg.repartoFestivos.historial = {}; cfg.repartoFestivos.anioHistorial = null;
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
      const partes = [['turnos', 'Turnos'], ['solapes', 'Solapes y horas de entrada que rotan'], ['grupos', 'Grupos y patrones (personas por grupo incluidas)'], ['contratos', 'Contratos y turnos a medida'], ['minimos', 'Mínimos'], ['minimosFecha', 'Mínimos de días concretos'], ['reglas', 'Reglas'], ['aj', 'Días AJ (sin los días que ha elegido cada persona)'], ['repartoFestivos', 'Cómputo y reparto de festivos (sin el historial de las personas)'], ['ciclo', 'Ciclo que sigue de un año a otro'], ['cobertura', 'Cobertura y bolsa (sin las bajas de personas)'], ['vacaciones', 'Vacaciones (periodos y plazas, sin las peticiones)'], ['festivos', 'Festivos (ojo: las fiestas locales son de cada ciudad)']];
      const elegido = await modal({
        titulo: `Copiar a ${cfg.nombre} lo de otra sede`,
        html: `<p>Cada sede tiene su propio horario. Para no repetir el trabajo, copia a <b>${esc(cfg.nombre)}</b> lo que ya tengas hecho en la otra. Lo copiado sustituye lo que tiene ${esc(cfg.nombre)} en esas partes; lo demás no cambia y se puede deshacer con Ctrl+Z.</p>
          <label class="campo"><span>Desde</span><select id="copiar-desde">${otras.map(o => `<option value="${esc(o.id)}">${esc(o.nombre)}</option>`).join('')}</select></label>
          <div class="opciones" style="margin-top:12px">${partes.map(([k, t]) => `<label class="casilla"><input type="checkbox" value="${k}" data-copiar ${k === 'reglas' ? 'checked' : ''}> ${t}</label>`).join('')}</div>`,
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Copiar', tipo: 'primario', valor: (velo) => ({ desde: $('#copiar-desde', velo).value, que: $$('[data-copiar]:checked', velo).map(x => x.value) }) }],
      });
      if (!elegido || !elegido.que.length) return;
      const origen = estado.todo.sedes.find(x => x.id === elegido.desde);
      for (const k of elegido.que) {
        cfg[k] = clonar(origen[k]);
        // Lo que es de cada persona o de cada ciudad no se copia: las bajas, las peticiones de vacaciones.
        if (k === 'cobertura' && cfg.cobertura) cfg.cobertura.ausencias = [];
        if (k === 'vacaciones' && cfg.vacaciones) cfg.vacaciones.solicitudes = {};
        if (k === 'aj' && cfg.aj) cfg.aj.elegidos = {};
        if (k === 'repartoFestivos' && cfg.repartoFestivos) { cfg.repartoFestivos.historial = {}; cfg.repartoFestivos.anioHistorial = null; }
      }
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
