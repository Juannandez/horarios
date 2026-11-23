// Arranque de la app: navegación, sesión, barra de guardado y vista Ajustes.
import { DEMO } from './nucleo.js';
import { repoGithub } from './github.js';
import { estado, esc, $, $$, cargar, alRegenerar, cambiosSinGuardar, guardarEnServidor, descartarCambios, entrar, salirSesion,
  avisar, confirmar, ponerTema, ponerMenuCorto, APARIENCIAS, deshacer, rehacer, puedeDeshacer, puedeRehacer, descargar, completar, cambiado, clonar, fmtFecha, ponerSede, api } from './nucleo.js';
import { CONFIG_BASE } from './datos-base.js';
import { icono } from './iconos.js';
import { pintarCuadrante, eventosCuadrante } from './vista-cuadrante.js';
import { pintarParametros, eventosParametros, refrescarResumenParametros } from './vista-parametros.js';
import { pintarEncuestas, eventosEncuestas, pintarResultados, eventosResultados } from './vista-encuestas.js';
import { pintarInformes, eventosInformes } from './vista-informes.js';
import { pintarNormativa, eventosNormativa } from './vista-normativa.js';
import { pintarComparativa, eventosComparativa } from './vista-comparativa.js';
import { pintarEquidad, eventosEquidad } from './vista-equidad.js';
import { pintarNuevo, eventosNuevo } from './vista-nuevo.js';
import { pintarMi, eventosMi, PORTAL_HORARIO } from './vista-mi.js';
import { pintarEscenarios, eventosEscenarios, olvidarVersiones } from './vista-escenarios.js';
import { pintarVacaciones, eventosVacaciones } from './vista-vacaciones.js';
import { pintarPlantilla, eventosPlantilla } from './vista-plantilla.js';

const raiz = $('#principal');
const VISTAS = ['cuadrante', 'mi', 'nuevo', 'parametros', 'vacaciones', 'informes', 'equidad', 'comparativa', 'escenarios', 'normativa', 'plantilla', 'encuestas', 'resultados', 'ajustes'];

// Administración en la versión de GitHub: se entra con un token de GitHub que solo puede escribir en este repositorio.
function ajustesGithub() {
  const repo = esc(repoGithub());
  if (estado.admin) return `<p>Sesión de administración en este ordenador (la clave de GitHub se guarda solo en este navegador).</p>
    <div class="fila-acciones"><button type="button" class="btn primario" data-accion="guardar" ${cambiosSinGuardar() ? '' : 'disabled'}>Guardar para todos</button><button type="button" class="btn" data-accion="salir">Cerrar sesión y olvidar la clave</button></div>
    <p class="banda">El repositorio es público: no escribas nombres ni datos de salud en notas, ausencias ni escenarios. La plantilla con nombres no se guarda aquí.</p>`;
  return `<p class="tenue">Sin sesión puedes ver el cuadrante y probar cambios en tu navegador. Para guardar la configuración para todos, entra con una clave de GitHub que pueda escribir en ${repo}.</p>
    <form class="fila-acciones" id="form-entrar"><label class="oculto" for="clave">Clave de GitHub</label>
      <input type="password" id="clave" autocomplete="off" spellcheck="false" placeholder="Clave de GitHub (github_pat_…)" required style="width:min(420px,100%)">
      <button type="submit" class="btn primario">Entrar</button></form>
    <details style="margin-top:10px"><summary>Cómo crear la clave (3 minutos, una vez)</summary><ol class="tenue">
      <li>En github.com, con tu cuenta: foto → <b>Settings</b> → <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b> (o abre github.com/settings/personal-access-tokens/new).</li>
      <li>Nombre: «horarios». Caducidad: 30 o 90 días.</li>
      <li><b>Repository access</b>: «Only select repositories» → <b>${repo}</b>.</li>
      <li><b>Permissions</b> → Repository permissions → <b>Contents: Read and write</b>. Nada más.</li>
      <li><b>Generate token</b>, cópialo y pégalo aquí arriba. No lo mandes por correo ni lo pegues en ningún chat.</li></ol></details>`;
}

function pintarAjustes() {
  const tema = document.documentElement.dataset.apariencia || 'day';
  const servidor = estado.servidor === 'ok'
    ? `Conectado al servidor.${estado.guardado ? ` Última versión guardada: ${fmtFecha(estado.guardado.slice(0, 10))}.` : ' Todavía no se ha guardado ninguna configuración: se usan los valores de partida.'}`
    : estado.servidor === 'demo'
      ? (estado.admin
        ? `Versión de GitHub con sesión de administración. «Guardar para todos» publica la configuración en el repositorio ${repoGithub()}; quien abra la web la ve en 1-2 minutos.${estado.guardado ? ` Última vez guardada: ${fmtFecha(estado.guardado.slice(0, 10))}.` : ''}`
        : `Versión de GitHub. Se ve la configuración publicada${estado.guardado ? ` (guardada el ${fmtFecha(estado.guardado.slice(0, 10))})` : ' (de partida: todavía no se ha guardado ninguna)'}. Lo que cambies se queda en este navegador hasta que la administración lo guarde para todos.`)
      : 'Sin conexión con el servidor. La página funciona, pero los cambios solo se guardan en este navegador y las encuestas no se pueden enviar.';
  raiz.innerHTML = `<div class="cabecera"><div><h1>Ajustes</h1><p>${esc(servidor)}</p></div></div>
    <section class="panel"><h2>Apariencia</h2><p class="tenue">Las de Gestlogix. Se guarda en este navegador.${estado.admin ? ' Con «Usar para todos», también en el servidor como apariencia por defecto.' : ''}</p>
      <div class="apariencias" role="radiogroup" aria-label="Apariencia">${APARIENCIAS.map(([v, t, d]) =>
        `<label class="apariencia"><input type="radio" name="tema" value="${v}" ${tema === v ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}</div>
      ${estado.admin ? '<div class="fila-acciones"><button type="button" class="btn mini" data-accion="tema-todos">Usar para todos</button></div>' : ''}
      <p class="tenue" style="margin-top:10px">Fondo de capas: imagen de Vecteezy (licencia gratuita), la misma de Gestlogix.</p></section>
    <section class="panel"><h2>Portal Horario</h2><p class="tenue">El sistema oficial de la Agencia para pedir cambios, días y horas de bolsa. «Mi horario» comprueba antes si se cubren los mínimos y lleva a esta dirección para pedirlo.</p>
      <label class="campo"><span>Dirección</span><input type="url" id="portal-horario" value="${esc(estado.todo.portalHorario || PORTAL_HORARIO)}" style="width:min(560px,100%)" ${estado.admin ? '' : 'disabled title="Solo administración"'}></label></section>
    <section class="panel"><h2>Administración</h2>
      ${DEMO ? ajustesGithub() : estado.admin
        ? `<p>Sesión de administración iniciada en esta pestaña. Puedes guardar la configuración y ver los resultados de las encuestas.</p>
           <div class="fila-acciones"><button type="button" class="btn primario" data-accion="guardar" ${cambiosSinGuardar() ? '' : 'disabled'}>Guardar en el servidor</button><button type="button" class="btn" data-accion="salir">Cerrar sesión</button></div>
           <h3 style="margin-top:16px">Cambiar la clave</h3>
           <form class="fila-acciones" id="form-clave" style="margin-top:8px">
             <label class="oculto" for="clave-actual">Clave actual</label><input type="password" id="clave-actual" autocomplete="current-password" placeholder="Clave actual" required>
             <label class="oculto" for="clave-nueva">Clave nueva</label><input type="password" id="clave-nueva" autocomplete="new-password" placeholder="Clave nueva (12 caracteres o más)" minlength="12" required>
             <button type="submit" class="btn">Cambiar clave</button></form>`
        : estado.claveConfigurada === false
          ? '<p>Todavía no hay clave de administración en el servidor. Crea el secreto ADMIN_CLAVE en GitHub y vuelve a desplegar (README, paso 3).</p>'
          : `<p class="tenue">Sin sesión puedes ver el cuadrante, probar cambios en tu navegador y contestar encuestas. Para guardar la configuración para todos y ver resultados, entra con la clave.</p>
           <form class="fila-acciones" id="form-entrar"><label class="oculto" for="clave">Clave de administración</label>
             <input type="password" id="clave" autocomplete="current-password" placeholder="Clave de administración" required ${estado.servidor === 'ok' ? '' : 'disabled'}>
             <button type="submit" class="btn primario" ${estado.servidor === 'ok' ? '' : 'disabled'}>Entrar</button></form>`}
    </section>
    <section class="panel"><h2>Datos</h2><p class="tenue">Exporta la configuración para guardar una copia o pasarla a otra persona. Importar sustituye la configuración con la que estás trabajando.</p>
      <div class="fila-acciones">
        <button type="button" class="btn" data-accion="exportar">Exportar configuración</button>
        <label class="btn" for="importar">Importar configuración</label><input type="file" id="importar" accept="application/json,.json" class="oculto">
        <button type="button" class="btn" data-accion="exportar-cuadrante">Exportar cuadrante de ${esc(estado.cfg.nombre)} (CSV)</button>
        <button type="button" class="btn peligro" data-accion="partida">Volver a los valores de partida de todo</button>
      </div></section>
    <section class="panel"><h2>Privacidad</h2><p class="tenue">El cuadrante usa códigos anónimos (TA-R 001, SUP-M 01): no hay nombres en ninguna parte. Las encuestas no guardan nombre, dirección IP ni hora; solo el día y las respuestas. Las respuestas se guardan en el servidor de la sección y solo las ve la administración.</p></section>`;
}

function pintar() {
  pintarMenu();
  const v = estado.vista;
  if (v === 'cuadrante') pintarCuadrante(raiz);
  if (v === 'parametros') pintarParametros(raiz);
  if (v === 'informes') pintarInformes(raiz);
  if (v === 'equidad') pintarEquidad(raiz);
  if (v === 'nuevo') pintarNuevo(raiz);
  if (v === 'mi') pintarMi(raiz);
  if (v === 'escenarios') pintarEscenarios(raiz, pintar);
  if (v === 'comparativa') pintarComparativa(raiz);
  if (v === 'normativa') pintarNormativa(raiz);
  if (v === 'vacaciones') pintarVacaciones(raiz);
  if (v === 'plantilla') pintarPlantilla(raiz, pintar);
  if (v === 'encuestas') pintarEncuestas(raiz);
  if (v === 'resultados') pintarResultados(raiz, pintar);
  if (v === 'ajustes') pintarAjustes();
  pintarSedes();
  pintarSesion();
  pintarBarraGuardar();
}

// Menú lateral como el de Gestlogix: apartados con su título y una entrada con icono por página.
const MENU = [
  ['Cuadrante', [['cuadrante', 'Cuadrante', 'calendario'], ['mi', 'Mi horario', 'usuario'], ['vacaciones', 'Vacaciones', 'sol'], ['informes', 'Informes', 'informes'], ['equidad', 'Equidad', 'barras'], ['comparativa', 'Comparar', 'balanza'], ['escenarios', 'Escenarios y versiones', 'capas']]],
  ['Configuración', [['nuevo', 'Nuevo horario', 'nuevo'], ['parametros', 'Parámetros', 'ajustes'], ['plantilla', 'Plantilla', 'usuarios'], ['normativa', 'Normativa', 'libro']]],
  ['Encuestas', [['encuestas', 'Encuestas', 'checklist'], ['resultados', 'Resultados', 'tarta']]],
  ['Cuenta', [['ajustes', 'Ajustes', 'usuario']]],
];
// Menú v2 de Gestlogix: un bloque plegable por apartado (todos abiertos de partida; lo plegado se recuerda en este
// navegador). Con el menú corto (botón «) solo quedan los iconos, y el título de cada entrada sale al pasar el ratón.
const plegados = () => { try { return new Set(JSON.parse(localStorage.getItem('horarios.menu.plegados') || '[]')); } catch (e) { return new Set(); } };
function pintarMenu() {
  // Con el menú corto no hay títulos de bloque para volver a abrirlos: se enseñan todos los iconos.
  const corto = document.documentElement.dataset.menu === 'corto';
  const cerrados = corto ? new Set() : plegados();
  $('#menu').innerHTML = MENU.map(([titulo, entradas]) => `<details class="bloque" data-bloque="${esc(titulo)}" ${cerrados.has(titulo) ? '' : 'open'}><summary><h4>${titulo}</h4></summary>${entradas.map(([v, t, i]) =>
    `<a href="#${v}" data-vista="${v}" title="${esc(t)}" class="${v === estado.vista ? 'activa' : ''}" ${v === estado.vista ? 'aria-current="page"' : ''}><span class="con-ico">${icono(i)}${t}</span></a>`).join('')}</details>`).join('');
}
function cerrarMenu() { document.body.classList.remove('menu-abierto'); $('#abrir-menu').setAttribute('aria-expanded', 'false'); }

function pintarSedes() {
  $('#sedes').innerHTML = estado.todo.sedes.map(x =>
    `<button type="button" data-sede="${esc(x.id)}" aria-pressed="${x.id === estado.sede}">${esc(x.nombre)}</button>`).join('');
  // En Encuestas y Resultados la sede no cambia nada: se atenúan para no confundir.
  $('#sedes').style.opacity = ['encuestas', 'resultados'].includes(estado.vista) ? '.45' : '';
}

function pintarSesion() {
  const b = $('#sesion');
  b.textContent = estado.admin ? 'Administración' : estado.servidor === 'ok' ? 'Sin sesión' : estado.servidor === 'demo' ? 'Demostración' : 'Sin conexión';
  b.classList.toggle('si', estado.admin);
  b.classList.toggle('sec', true);
  b.title = estado.admin ? 'Sesión de administración iniciada' : 'Pulsa para ir a Ajustes';
}

function pintarBarraGuardar() {
  const caja = $('#barra-guardar');
  const hay = cambiosSinGuardar();
  if ((!hay && !puedeRehacer()) || estado.vista === 'resultados') { caja.innerHTML = ''; return; }
  // Deshacer y rehacer (también con Ctrl+Z y Ctrl+Mayús+Z), como Sling o Deputy.
  const historia = `<span class="fila-acciones historia" style="margin:0">
      <button type="button" class="btn mini" data-accion="deshacer" ${puedeDeshacer() ? '' : 'disabled'} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">↶ Deshacer</button>
      <button type="button" class="btn mini" data-accion="rehacer" ${puedeRehacer() ? '' : 'disabled'} title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer">↷</button></span>`;
  if (!hay) { caja.innerHTML = `<div class="guardar-barra" role="region" aria-label="Deshacer">${historia}</div>`; return; }
  caja.innerHTML = estado.admin
    ? `<div class="guardar-barra" role="region" aria-label="Cambios sin guardar">${historia}<span>Hay cambios que todavía no están en el servidor.</span>
        <span class="fila-acciones" style="margin:0"><button type="button" class="btn" data-accion="descartar">Descartar</button><button type="button" class="btn primario" data-accion="guardar">${DEMO ? 'Guardar para todos' : 'Guardar en el servidor'}</button></span></div>`
    : `<div class="guardar-barra" role="region" aria-label="Cambios de prueba">${historia}<span>Cambios de prueba: no se guardan y al recargar vuelve la versión publicada, la única que ve todo el mundo. Para cambiarla, entra como administración en Ajustes.</span>
        <span class="fila-acciones" style="margin:0"><button type="button" class="btn" data-accion="descartar">Volver a la versión publicada</button></span></div>`;
}

// Ctrl+Z / Ctrl+Mayús+Z (o Ctrl+Y): deshace o rehace. Dentro de un cuadro de texto manda el del navegador.
function hacerHistoria(atras) {
  if (!(atras ? deshacer() : rehacer())) return;
  pintar();
  avisar(atras ? 'Cambio deshecho.' : 'Cambio rehecho.', '', 2500);
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  e.preventDefault();
  hacerHistoria(k === 'z' && !e.shiftKey);
});

// La dirección es «#vista» o «#vista/apartado» (Parámetros: #parametros/turnos).
function leerHash() { const [v, sub] = location.hash.slice(1).split('/'); return { v, sub: sub || '' }; }
function ir(vista, sub = estado.sub || '') {
  if (!VISTAS.includes(vista)) vista = 'cuadrante';
  if (vista !== estado.vista) sub = sub || '';
  estado.vista = vista; estado.sub = sub;
  const hash = `#${vista}${sub ? `/${sub}` : ''}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  pintar();
  raiz.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function guardar() {
  try { await guardarEnServidor(); olvidarVersiones(); avisar(DEMO ? 'Guardado en GitHub (y como versión nueva). Todo el mundo lo verá en 1-2 minutos, al recargar la página.' : 'Configuración guardada en el servidor (y como versión nueva). Ya la ve todo el mundo.', 'bien', DEMO ? 9000 : undefined); }
  catch (e) { avisar(`No se ha guardado. ${esc(e.message)}`, 'mal', 0); }
  pintar();
}

function exportarCuadrante() {
  const { res } = estado;
  const filas = [['Persona', 'Grupo', ...res.dias.map(d => d.fecha), 'Horas', 'Noches', 'Fines de semana']];
  for (const p of res.personas) filas.push([p.id, p.grupoNombre, ...res.dias.map(d => res.codigo(p.pi, d.i)), String(p.horas).replace('.', ','), p.noches, p.fines]);
  descargar(`cuadrante-${estado.cfg.id}-${estado.cfg.anio}.csv`, '﻿' + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

// ── Eventos globales ────────────────────────────────────────────────────────
$('#menu').addEventListener('click', (e) => { if (e.target.closest('a[data-vista]')) cerrarMenu(); });
$('#abrir-menu').addEventListener('click', () => { const abierto = document.body.classList.toggle('menu-abierto'); $('#abrir-menu').setAttribute('aria-expanded', String(abierto)); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });
$('#sesion').addEventListener('click', () => ir('ajustes'));
$('#sedes').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-sede]');
  if (!b) return;
  ponerSede(b.dataset.sede);
  if (['encuestas', 'resultados', 'ajustes'].includes(estado.vista)) ir('cuadrante'); else pintar();
});
// Solo las direcciones de páginas (#cuadrante, #parametros…) cambian de página; cualquier otra se ignora.
// Botones secundarios: la clase «sec» de Gestlogix. Sin ella, la apariencia Blue Manager pinta de azul en relieve todos
// los botones (también las casillas del cuadrante); con ella, solo los principales, como en la demo.
const marcarSecundarios = (n) => {
  if (n.nodeType !== 1) return;
  if (n.matches('button:not(.primario):not(.sec)')) n.classList.add('sec');
  n.querySelectorAll('button:not(.primario):not(.sec)').forEach(b => b.classList.add('sec'));
};
new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(marcarSecundarios); }).observe($('#app'), { childList: true, subtree: true });
marcarSecundarios($('#app'));
window.addEventListener('hashchange', () => { const { v, sub } = leerHash(); if (VISTAS.includes(v)) ir(v, sub); });
$('#plegar-menu').addEventListener('click', () => { ponerMenuCorto(document.documentElement.dataset.menu !== 'corto'); pintarMenu(); });
$('#menu').addEventListener('toggle', (e) => {
  const d = e.target.closest && e.target.closest('details.bloque'); if (!d || document.documentElement.dataset.menu === 'corto') return;
  const c = plegados(); if (d.open) c.delete(d.dataset.bloque); else c.add(d.dataset.bloque);
  try { localStorage.setItem('horarios.menu.plegados', JSON.stringify([...c])); } catch (err) { /* sin almacenamiento */ }
}, true);
let tBuscar = 0;
$('#buscar').addEventListener('input', (e) => {
  clearTimeout(tBuscar);
  tBuscar = setTimeout(() => { estado.ui.buscar = e.target.value; if (estado.vista !== 'cuadrante') ir('cuadrante'); else pintar(); }, 150);
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-accion], [data-ir]');
  if (!b) return;
  if (b.dataset.ir) return ir(b.dataset.ir);
  const a = b.dataset.accion;
  if (a === 'guardar') return guardar();
  if (a === 'deshacer' || a === 'rehacer') return hacerHistoria(a === 'deshacer');
  if (a === 'descartar') {
    if (!(await confirmar('¿Descartar los cambios?', 'Vuelves a la configuración publicada en el servidor. Si te arrepientes, «Deshacer» la recupera mientras no recargues la página.', 'Descartar cambios'))) return;
    descartarCambios(); return pintar();
  }
  if (estado.vista !== 'ajustes') return;
  if (a === 'salir') { salirSesion(); avisar('Sesión cerrada.'); return pintar(); }
  if (a === 'tema-todos') { estado.todo.tema = document.documentElement.dataset.apariencia || 'day'; cambiado(); avisar('Tema por defecto cambiado. Guarda en el servidor para aplicarlo a todos.'); return pintar(); }
  if (a === 'exportar') return descargar('configuracion-horarios.json', JSON.stringify(estado.todo, null, 2));
  if (a === 'exportar-cuadrante') return exportarCuadrante();
  if (a === 'partida') {
    if (!(await confirmar('¿Volver a los valores de partida de todo?', 'Se sustituyen los parámetros y cambios a mano de las dos sedes y las encuestas por los valores de partida. Las respuestas del servidor no se tocan. Hasta que guardes, solo cambia en tu navegador.', 'Volver a los de partida'))) return;
    estado.todo = completar(clonar(CONFIG_BASE)); cambiado({ inmediato: true }); avisar('Valores de partida cargados.'); return pintar();
  }
});

raiz.addEventListener('change', async (e) => {
  if (estado.vista !== 'ajustes') return;
  if (e.target.name === 'tema') ponerTema(e.target.value);
  if (e.target.id === 'portal-horario' && estado.admin) { const v = e.target.value.trim(); if (/^https:\/\//.test(v)) { estado.todo.portalHorario = v; cambiado(); avisar('Dirección de Portal Horario cambiada. Guarda en el servidor para que la vea todo el mundo.'); } else avisar('La dirección tiene que empezar por https://', 'mal'); }
  if (e.target.id === 'importar' && e.target.files[0]) {
    try {
      const datos = JSON.parse(await e.target.files[0].text());
      if (!datos || (!Array.isArray(datos.sedes) && !Array.isArray(datos.grupos))) throw new Error('no tiene sedes ni grupos');
      estado.todo = completar(datos); cambiado({ inmediato: true });
      avisar('Configuración importada. Revisa el cuadrante y guarda en el servidor si quieres publicarla.', 'bien');
      pintar();
    } catch (err) { avisar(`No se ha podido importar el fichero: ${esc(err.message)}. Elige un JSON exportado desde esta página.`, 'mal', 0); }
  }
});
raiz.addEventListener('submit', async (e) => {
  if (estado.vista !== 'ajustes') return;
  if (e.target.id === 'form-clave') {
    e.preventDefault();
    const actual = $('#clave-actual').value, nueva = $('#clave-nueva').value;
    if (nueva.length < 12) return avisar('La clave nueva es demasiado corta. Usa 12 caracteres o más.', 'mal');
    try { await api('cambiar-clave', { actual, nueva }); avisar('Clave cambiada. Úsala la próxima vez que entres.', 'bien'); e.target.reset(); }
    catch (err) { avisar(`No se ha cambiado la clave. ${esc(err.message)}`, 'mal', 0); }
    return;
  }
  if (e.target.id !== 'form-entrar') return;
  e.preventDefault();
  const clave = $('#clave').value;
  try { await entrar(clave); avisar(DEMO ? 'Clave de GitHub aceptada: ya puedes guardar para todos.' : 'Sesión de administración iniciada.', 'bien'); pintar(); }
  catch (err) { avisar(`No se ha iniciado la sesión. ${esc(err.message)}`, 'mal', 0); $('#clave').select(); }
});

eventosCuadrante(raiz, pintar);
eventosParametros(raiz, pintar);
eventosEncuestas(raiz, pintar);
eventosResultados(raiz, pintar);
eventosInformes(raiz, pintar);
eventosNormativa(raiz, pintar);
eventosComparativa(raiz, pintar);
eventosEquidad(raiz, pintar, (v) => ir(v));
eventosNuevo(raiz, pintar);
eventosMi(raiz, pintar);
eventosEscenarios(raiz, pintar, (v) => ir(v));
eventosVacaciones(raiz, pintar);
eventosPlantilla(raiz, pintar);
// Desde el cuadrante, pulsar el código de una persona abre su informe.
raiz.addEventListener('click', (e) => {
  const th = e.target.closest('th[data-informe]');
  if (!th || estado.vista !== 'cuadrante') return;
  (estado.ui.informe ||= { pi: 0, buscar: '', comp: '' }).pi = Number(th.dataset.informe);
  estado.ui.informe.buscar = ''; estado.ui.informe.comp = '';
  ir('informes');
});

// Al recalcular: el cuadrante se repinta entero; en Parámetros solo los resúmenes (para no perder el foco).
alRegenerar(() => {
  if (estado.vista === 'cuadrante') pintarCuadrante(raiz);
  else if (estado.vista === 'parametros') refrescarResumenParametros(raiz);
  else if (estado.vista === 'informes') pintarInformes(raiz);
  else if (estado.vista === 'comparativa') pintarComparativa(raiz);
  else if (estado.vista === 'equidad') pintarEquidad(raiz);
  else if (estado.vista === 'nuevo' && estado.sub === 'revisar') pintarNuevo(raiz);
  else if (estado.vista === 'mi') pintarMi(raiz);
  else if (estado.vista === 'vacaciones') { const y = window.scrollY, c = document.querySelector('#principal .tabla-caja:last-of-type'), t = c ? c.scrollTop : 0; pintarVacaciones(raiz); window.scrollTo(0, y); const c2 = document.querySelector('#principal .tabla-caja:last-of-type'); if (c2) c2.scrollTop = t; }
  pintarBarraGuardar();
});

await cargar();
const borrador = cambiosSinGuardar();
{ const { v, sub } = leerHash(); estado.vista = VISTAS.includes(v) ? v : 'cuadrante'; estado.sub = estado.vista === v ? sub : ''; }
ponerMenuCorto(document.documentElement.dataset.menu === 'corto', false);
pintar();
window.horariosListo = true; // js/arranque.js: la app ha arrancado
if (borrador) avisar('Se ha recuperado lo que estabas cambiando en este navegador. Si no lo quieres, pulsa «Descartar» abajo.', '', 9000);
if (estado.servidor === 'demo' && !estado.admin) avisar('Versión de GitHub: ves la configuración publicada. Lo que cambies se queda en este navegador; la administración lo guarda para todos desde Ajustes.', '', 7000);
else if (estado.servidor !== 'ok') avisar('No hay conexión con el servidor: la página funciona con los valores de partida o con tus cambios de este navegador.', 'mal', 9000);
