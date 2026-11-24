// Vista Cuadrante: el horario de cada persona, con filtros, orden, cobertura y cambios a mano.
import { estado, esc, $, $$, MESES, DIAS_CORTOS, fmtNum, fmtFecha, estiloTurno, modal, cambiado, avisar } from './nucleo.js';
import { ORIGEN, fmtH, horarioTurno } from './motor.js';
import { pdfCuadrante } from './pdf.js';
import { COLECTIVOS, FRANJA_NOMBRE } from './datos-base.js';
import { infracciones, puntuacion, mapaCasillas } from './puntuacion.js';
import { mejorarReparto } from './mejorar.js';

// Cómo se puede ordenar la lista de personas. «sube»/«baja»: cómo se lee cada sentido.
const ORDENES = [
  { campo: 'id', texto: 'Código de la persona', sube: 'de TA 001 en adelante', baja: 'del último código al primero' },
  { campo: 'grupo', texto: 'Grupo', sube: 'por grupo, en el orden de Parámetros', baja: 'por grupo, al revés' },
  { campo: 'horas', texto: 'Horas trabajadas en el año', sube: 'de menos a más horas', baja: 'de más a menos horas' },
  { campo: 'diferencia', texto: 'Horas por encima o por debajo de su jornada', sube: 'primero quien más le falta para su jornada', baja: 'primero quien más horas tiene de más (bolsa)' },
  { campo: 'noches', texto: 'Noches en el año', sube: 'de menos a más noches', baja: 'de más a menos noches' },
  { campo: 'fines', texto: 'Fines de semana trabajados', sube: 'de menos a más fines de semana', baja: 'de más a menos fines de semana' },
  { campo: 'avisos', texto: 'Avisos (incumplimientos de la persona)', sube: 'de menos a más avisos', baja: 'primero quien más avisos tiene' },
];

function personasVisibles() {
  const { res } = estado, u = estado.ui;
  const q = u.buscar.trim().toLowerCase();
  const ordenGrupo = new Map(estado.cfg.grupos.map((g, i) => [g.id, i]));
  let lista = res.personas.filter(p =>
    (u.colectivo === 'todos' || p.colectivo === u.colectivo) &&
    (u.grupo === 'todos' || p.grupo === u.grupo) &&
    (!u.soloAvisos || p.alertas.length) &&
    (!u.infraccion || (datosInfracciones().porPersona.get(p.pi) || new Set()).has(u.infraccion)) &&
    (!q || p.id.toLowerCase().includes(q) || p.grupoNombre.toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q)));
  const { campo, dir } = u.orden;
  const valor = (p) => campo === 'grupo' ? ordenGrupo.get(p.grupo) * 10000 + p.orden
    : campo === 'id' ? null : campo === 'avisos' ? p.alertas.length : p[campo];
  lista.sort((a, b) => {
    if (campo === 'id') return dir * a.id.localeCompare(b.id, 'es', { numeric: true });
    return dir * (valor(a) - valor(b)) || a.id.localeCompare(b.id, 'es', { numeric: true });
  });
  return lista;
}

// ── Selección de varias casillas (como Skello o Deputy) ──
// Clave de cada casilla: «código de persona|fecha», la misma que los cambios a mano. Mayús+clic selecciona un
// rectángulo desde la última casilla; Ctrl+clic (Cmd en el Mac) añade o quita una. Con el teclado: flechas para
// moverse, Mayús+flechas para ampliar, el código del turno para ponerlo, Supr para quitar el cambio a mano, Esc.
const sel = { celdas: new Set(), ancla: null };
let focoPendiente = null;
const claveDe = (pi, d) => `${estado.res.personas[pi].id}|${estado.res.dias[d].fecha}`;
const celdaDe = (el) => ({ pi: Number(el.dataset.p), d: Number(el.dataset.d) });
function marcarSeleccion(raiz) {
  $$('.cuadrante .celda.sel', raiz).forEach(el => el.classList.toggle('sel', false));
  if (sel.celdas.size) $$('.cuadrante .celda', raiz).forEach(el => { if (sel.celdas.has(claveDe(Number(el.dataset.p), Number(el.dataset.d)))) el.classList.add('sel'); });
  pintarBarraSeleccion(raiz);
}
function pintarBarraSeleccion(raiz) {
  let barra = $('#barra-sel', raiz);
  if (!sel.celdas.size) { if (barra) barra.hidden = true; return; }
  if (!barra) { barra = document.createElement('div'); barra.id = 'barra-sel'; barra.setAttribute('role', 'region'); barra.setAttribute('aria-label', 'Casillas seleccionadas'); raiz.append(barra); }
  barra.hidden = false;
  const { res } = estado;
  barra.innerHTML = `<b>${fmtNum(sel.celdas.size)}</b> ${sel.celdas.size === 1 ? 'casilla' : 'casillas'}
    <label class="oculto" for="sel-codigo">Turno para las casillas</label>
    <select id="sel-codigo">${res.turnos.map(t => `<option value="${esc(t.codigo)}">${esc(t.codigo)} · ${esc(t.nombre)}</option>`).join('')}</select>
    <button type="button" class="btn mini primario" data-sel="poner">Poner</button>
    <button type="button" class="btn mini" data-sel="quitar">Quitar cambios a mano</button>
    <button type="button" class="btn mini discreto" data-sel="nada" aria-label="Deseleccionar">✕</button>`;
}
function seleccionarRectangulo(a, b) {
  const filas = personasVisibles().map(p => p.pi);
  const fa = filas.indexOf(a.pi), fb = filas.indexOf(b.pi);
  if (fa < 0 || fb < 0) return;
  for (let f = Math.min(fa, fb); f <= Math.max(fa, fb); f++)
    for (let d = Math.min(a.d, b.d); d <= Math.max(a.d, b.d); d++) sel.celdas.add(claveDe(filas[f], d));
}
// Pone un código (o quita el cambio a mano) en varias casillas de una vez. Las que romperían una regla que bloquea
// se quedan como estaban, y se dice cuáles.
function aplicarACasillas(claves, codigo) {
  const cfg = estado.cfg, antes = new Map(claves.map(k => [k, cfg.manuales[k]]));
  for (const k of claves) { if (codigo === '__quitar') delete cfg.manuales[k]; else cfg.manuales[k] = codigo; }
  cambiado({ inmediato: true });
  let rechazadas = 0;
  const motivos = new Set();
  if (codigo !== '__quitar') {
    const { res } = estado, malas = new Set();
    for (const x of datosInfracciones().lista) if (x.nivel === 'bloquea') for (const c of x.casos) for (const d of c.dias) {
      const k = `${res.personas[c.pi].id}|${res.dias[d].fecha}`;
      if (antes.has(k)) { malas.add(k); motivos.add(x.titulo); }
    }
    for (const k of malas) { const v = antes.get(k); if (v == null) delete cfg.manuales[k]; else cfg.manuales[k] = v; rechazadas++; }
    if (rechazadas) cambiado({ inmediato: true });
  }
  const hechas = claves.length - rechazadas;
  avisar(codigo === '__quitar' ? `Quitados los cambios a mano de ${fmtNum(hechas)} casillas. Ctrl+Z lo deshace.`
    : `${esc(codigo)} puesto en ${fmtNum(hechas)} ${hechas === 1 ? 'casilla' : 'casillas'}.${rechazadas ? ` ${fmtNum(rechazadas)} no se han cambiado porque incumplirían: ${[...motivos].map(esc).join(' · ')} (reglas que bloquean).` : ''} Ctrl+Z lo deshace.`,
    rechazadas ? 'mal' : 'bien', rechazadas ? 9000 : 4000);
}

// Infracciones y puntuación del cuadrante actual (se calculan una vez por cuadrante generado).
export function datosInfracciones() {
  const { res, cfg } = estado;
  if (estado._inf && estado._inf.res === res && estado._inf.reglas === cfg.reglas) return estado._inf;
  const lista = infracciones(res, cfg);
  const porPersona = new Map();
  for (const x of lista) for (const c of x.casos) { if (!porPersona.has(c.pi)) porPersona.set(c.pi, new Set()); porPersona.get(c.pi).add(x.k); }
  estado._inf = { res, reglas: cfg.reglas, lista, mapa: mapaCasillas(res, lista), punt: puntuacion(res, cfg, lista), porPersona };
  return estado._inf;
}

// Panel de infracciones (como Quinyx, 7shifts o el «Roster Analyser»): la puntuación y cada regla con su recuento.
// Pulsar una regla deja en el cuadrante solo a quien la incumple.
function panelInfracciones() {
  const { lista, punt } = datosInfracciones(), u = estado.ui;
  const orden = { bloquea: 0, avisa: 1, informe: 2 };
  const filas = [...lista].sort((a, b) => orden[a.nivel] - orden[b.nivel] || b.casos.length - a.casos.length);
  const personas = (x) => new Set(x.casos.map(c => c.pi)).size;
  const chip = (x) => `<button type="button" class="inf-regla nivel-${x.nivel}" data-infraccion="${x.k}" aria-pressed="${u.infraccion === x.k}" ${x.casos.length ? '' : 'disabled'}
      title="${esc(x.titulo)}: ${x.casos.length} casos en ${personas(x)} personas">
      <span class="inf-n">${fmtNum(x.casos.length)}</span><span>${esc(x.titulo)}</span></button>`;
  return `<section class="panel inf-panel" aria-label="Infracciones y puntuación">
    <div class="inf-cab"><h2>Puntuación</h2>
      <span class="inf-punt ${punt.duro ? 'mal' : 'bien'}" title="Incumplimientos de reglas que bloquean (deben ser 0)"><b>${fmtNum(-punt.duro || 0)}</b> duro</span>
      <span class="inf-punt ${punt.medio ? 'medio' : 'bien'}" title="Personas que faltan frente a los mínimos"><b>${fmtNum(-punt.medio || 0)}</b> medio</span>
      <span class="inf-punt ${punt.blando ? 'aviso' : 'bien'}" title="Avisos de reglas que avisan"><b>${fmtNum(-punt.blando || 0)}</b> blando</span>
      <span class="tenue">Cuanto más cerca de 0, mejor: primero el duro, luego la cobertura y luego los avisos.</span>
      ${u.infraccion ? '<button type="button" class="btn mini" data-infraccion="">Ver a todo el mundo</button>' : ''}</div>
    <div class="inf-lista">${filas.map(chip).join('') || '<span class="tenue">No hay reglas activas.</span>'}</div>
  </section>`;
}

function cifras() {
  const { res } = estado;
  const faltaTA = res.huecos.filter(h => h.colectivo === 'TA').reduce((s, h) => s + h.falta, 0);
  const faltaSUP = res.huecos.filter(h => h.colectivo === 'SUP').reduce((s, h) => s + h.falta, 0);
  const diasHueco = new Set(res.huecos.map(h => h.d)).size;
  const conAvisos = res.personas.filter(p => p.alertas.length).length;
  const ajustes = res.stats.movidos + res.stats.cubiertos;
  return `<div class="cifras">
    <div class="cifra ${faltaTA + faltaSUP ? 'mal' : ''}"><b>${fmtNum(faltaTA + faltaSUP)}</b><span>turnos sin cubrir frente al mínimo, en ${fmtNum(diasHueco)} días (teleasistencia ${fmtNum(faltaTA)} · supervisión ${fmtNum(faltaSUP)})</span></div>
    <div class="cifra"><b>${fmtNum(ajustes)}</b><span>turnos que el ajuste ha movido o añadido para cubrir mínimos u horas</span></div>
    <div class="cifra ${conAvisos ? 'mal' : ''}"><b>${fmtNum(conAvisos)}</b><span>personas con algún aviso (noches, fines de semana, horas o descansos)</span></div>
    <div class="cifra"><b>${fmtNum(res.P)}</b><span>personas en ${estado.cfg.grupos.length} grupos</span></div>
    <div class="cifra"><b>${fmtNum(new Set(res.aguante[0].flatMap(f => [...f].map((x, d) => (x === 0 ? d : -1)).filter(d => d >= 0))).size)}</b><span>días justos en teleasistencia (alguna franja aguanta 0 bajas) · ${fmtNum(res.personas.reduce((a, p) => a + (p.nochesCedidas || 0), 0))} noches cedidas</span></div>
  </div>`;
}

function herramientas() {
  const u = estado.ui, cfg = estado.cfg;
  const seg = (nombre, valor, opciones) => `<div class="segmentado" role="group" aria-label="${nombre}">${opciones.map(([v, t]) =>
    `<button type="button" data-ui="${nombre}" data-valor="${v}" aria-pressed="${String(valor) === String(v)}">${t}</button>`).join('')}</div>`;
  const grupos = cfg.grupos.filter(g => u.colectivo === 'todos' || g.colectivo === u.colectivo);
  return `<div class="herramientas">
    <div class="grupo">${seg('modo', u.modo, [['mes', 'Mes'], ['anio', 'Resumen del año']])}</div>
    ${u.modo === 'mes' ? `<div class="grupo">
      <button type="button" class="btn" data-mes="-1" aria-label="Meses anteriores">Anterior</button>
      <label class="oculto" for="sel-desde">Desde</label>
      <select id="sel-desde">${MESES.map((m, i) => `<option value="${i}" ${i === u.mesDesde ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <span class="tenue">a</span>
      <label class="oculto" for="sel-hasta">Hasta</label>
      <select id="sel-hasta">${MESES.map((m, i) => `<option value="${i}" ${i === u.mesHasta ? 'selected' : ''}>${m} ${cfg.anio}</option>`).join('')}</select>
      <button type="button" class="btn" data-mes="1" aria-label="Meses siguientes">Siguiente</button>
      <button type="button" class="btn mini" data-meses="todo" aria-pressed="${u.mesDesde === 0 && u.mesHasta === 11}">Todo el año</button></div>` : ''}
    <div class="grupo">${seg('colectivo', u.colectivo, [['todos', 'Todos'], ...COLECTIVOS.map(c => [c.id, c.nombre])])}</div>
    <div class="grupo"><label class="oculto" for="sel-grupo">Grupo</label>
      <select id="sel-grupo"><option value="todos">Todos los grupos</option>${grupos.map(g => `<option value="${esc(g.id)}" ${u.grupo === g.id ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select>
      <label class="casilla"><input type="checkbox" id="solo-avisos" ${u.soloAvisos ? 'checked' : ''}> Solo con avisos</label></div>
  </div>
  <div class="herramientas"><div class="grupo"><label for="sel-orden" class="etiqueta">Ordenar por</label>
    <select id="sel-orden">${ORDENES.map(o => `<option value="${o.campo}" ${u.orden.campo === o.campo ? 'selected' : ''}>${esc(o.texto)}</option>`).join('')}</select>
    <button type="button" class="btn mini" data-orden-dir="1" title="Cambia el sentido del orden" aria-label="Cambiar el sentido">⇅ Al revés</button>
    <span class="tenue">${esc((() => { const o = ORDENES.find(x => x.campo === u.orden.campo) || ORDENES[0]; return `Ahora: ${u.orden.dir > 0 ? o.sube : o.baja}.`; })())}</span></div></div>`;
}

function leyenda() {
  const { res } = estado, u = estado.ui;
  const usados = new Set();
  for (let i = 0; i < res.grid.length; i++) usados.add(res.grid[i]);
  // Solo los turnos que salen en este cuadrante: el resto (M1, M2, C1…) siguen configurados en Parámetros › Turnos.
  const turnos = res.turnos.filter((t, i) => usados.has(i));
  const sinUsar = estado.cfg.turnos.filter(c => !turnos.some(t => t.codigo === c.codigo)).length;
  return `<div class="leyenda" role="group" aria-label="Resaltar un turno">${turnos.map(t =>
    `<button type="button" data-resaltar="${esc(t.codigo)}" aria-pressed="${u.resaltar === t.codigo}" title="Resalta ${esc(t.nombre)}">
      <span class="muestra" style="${estiloTurno(t)}">${esc(t.codigo)}</span>${esc(t.nombre)}${t.trabaja ? ` <span class="tenue">${esc(horarioTurno(t))}</span>` : ''}</button>`).join('')}
      ${sinUsar ? `<a class="tenue leyenda-mas" href="#parametros/turnos" title="Turnos configurados que no salen en este cuadrante">+${sinUsar} turnos configurados sin usar</a>` : ''}</div>
    <div class="marcas-leyenda">
      <span><i class="aj"></i> Turno puesto por el ajuste</span>
      <span><i class="man"></i> Cambio a mano</span>
      <span><i class="mej"></i> Semana intercambiada por la mejora del reparto</span>
      <span><i class="inf-b"></i> Incumple una regla que bloquea</span>
      <span><i class="inf-a"></i> Incumple una regla que avisa</span>
      <span>Columna con fondo: fin de semana · número en rojo con «F»: festivo · «−3» abajo: faltan 3 para el mínimo</span>
      <span>Pulsa una casilla para cambiarla a mano. Mayús+clic selecciona un rectángulo y Ctrl+clic (Cmd en el Mac) suma casillas. Con el teclado${estado.ui.mesHasta - estado.ui.mesDesde >= 3 ? ' (elige 3 meses o menos)' : ''}: flechas, Mayús+flechas, el código del turno (R, M, 1…) y Supr. Ctrl+Z deshace.</span>
    </div>`;
}

function tablaMes(lista) {
  const { res } = estado, u = estado.ui;
  const dias = res.dias.filter(d => d.mes >= u.mesDesde && d.mes <= u.mesHasta);
  const D = res.D;
  const iRes = u.resaltar ? res.idx.get(u.resaltar) : -1;
  const mapa = datosInfracciones().mapa;
  const varios = u.mesHasta > u.mesDesde;
  const ligera = u.mesHasta - u.mesDesde >= 3;
  virtual = null;
  const cab = dias.map(d => `<th scope="col" class="dia ${d.finde ? 'finde' : ''} ${d.festivo ? 'festivo' : ''} ${varios && d.dia === 1 ? 'inicio-mes' : ''}" ${d.festivo ? `title="${esc(d.festivo)}"` : ''}>${varios && d.dia === 1 ? `<span class="mes-corto">${MESES[d.mes].slice(0, 3)}</span>` : ''}${d.dia}<small>${DIAS_CORTOS[d.dow]}</small></th>`).join('');
  // Un color por turno como clase (t0, t1…): mucho menos HTML que repetir el estilo en cada casilla.
  const hojaColores = `<style>${res.turnos.map((t, i) => `.cuadrante .t${i}{${estiloTurno(t)}}`).join('')}</style>`;
  const fila = (p) => {
    const celdas = dias.map(d => {
      const k = p.pi * D + d.i, ti = res.grid[k], o = res.origen[k], t = res.turnos[ti];
      const inf = mapa.get(k);
      const grave = inf ? (inf.some(x => x.nivel === 'bloquea') ? ' inf-b' : inf.some(x => x.nivel === 'avisa') ? ' inf-a' : ' inf-i') : '';
      const cls = `celda${o === ORIGEN.CUBRE || o === ORIGEN.RECORTE ? ' aj' : ''}${o === ORIGEN.MANUAL ? ' man' : ''}${o === ORIGEN.MEJORA ? ' mej' : ''}${iRes >= 0 && ti !== iRes ? ' atenuada' : ''}${grave}${sel.celdas.size && sel.celdas.has(`${p.id}|${d.fecha}`) ? ' sel' : ''}`;
      const texto = t.codigo === 'L' ? '' : esc(t.codigo);
      const avisoInf = inf ? ` · ${inf.map(x => `${x.titulo} (${x.texto})`).join(' · ')}` : '';
      // Hasta 3 meses, cada casilla es un botón (se cambia también con el teclado). Con más meses,
      // celdas simples que se pulsan con el ratón: la tabla del año entero se pinta mucho más rápido.
      return ligera
        ? `<td class="c ${cls}${d.finde ? ' finde' : ''} t${ti}" data-p="${p.pi}" data-d="${d.i}"${inf ? ` title="${esc(avisoInf.slice(3))}"` : ''}>${texto}</td>`
        : `<td class="c ${d.finde ? 'finde' : ''}"><button type="button" class="${cls} t${ti}" data-p="${p.pi}" data-d="${d.i}"${inf ? ` title="${esc(avisoInf.slice(3))}"` : ''} aria-label="${esc(p.id)}, ${d.dia} de ${MESES[d.mes].toLowerCase()}: ${esc(t.nombre)}${esc(avisoInf)}">${texto}</button></td>`;
    }).join('');
    const al = p.alertas.length ? ' alerta' : '';
    return `<tr><th scope="row" class="fija enlace" data-informe="${p.pi}" title="Ver el informe de ${esc(p.id)}">${esc(p.id)}</th><td class="fija2" title="${esc(p.nombre || p.grupoNombre)}">${esc(p.nombre || p.grupoNombre)}</td>${celdas}
      <td class="res${al}" title="${esc(p.alertas.join(' · ') || 'Sin avisos')}">${fmtH(p.horas)}</td><td class="res">${p.noches}</td><td class="res">${p.fines}</td></tr>`;
  };
  // Tablas grandes (p. ej. el año entero): solo se pintan las filas que se ven y se van cambiando al
  // desplazarse. Así el año entero se abre al momento.
  virtual = lista.length * dias.length > 12000 ? { lista, fila, columnas: dias.length + 5, inicio: -1 } : null;
  const filas = virtual ? filasVirtuales(0, 40) : lista.map(fila).join('');
  // Cobertura: personas en sala frente al mínimo
  const cols = u.colectivo === 'todos' ? ['TA', 'SUP'] : [u.colectivo];
  const pie = [];
  for (const c of cols) {
    const ci = res.colectivos.indexOf(c);
    res.franjas.forEach((f, fi) => {
      const celdas = dias.map(d => {
        const n = res.cobertura[ci][fi][d.i], m = res.necesidad[ci][fi][d.i];
        const justo = estado.cfg.cobertura.aguante.avisar && n === m && m > 0;
        return n < m ? `<td class="c falta" title="${n} de ${m}: faltan ${m - n}">−${m - n}</td>` : `<td class="c${justo ? ' justo' : ''}" title="${n} (mínimo ${m}): aguanta ${n - m} ${n - m === 1 ? 'baja' : 'bajas'}">${n}</td>`;
      }).join('');
      pie.push(`<tr><th scope="row" class="fija">${c === 'TA' ? 'Teleasist.' : 'Supervis.'}</th><td class="fija2">${FRANJA_NOMBRE[f]}</td>${celdas}<td></td><td></td><td></td></tr>`);
    });
  }
  const pieFijo = pie.slice(0, 3).join(''), pieResto = pie.slice(3).join('');
  return `${hojaColores}<div class="tabla-caja"><table class="cuadrante">
    <caption class="oculto">Cuadrante de ${MESES[u.mesDesde].toLowerCase()}${u.mesHasta !== u.mesDesde ? ` a ${MESES[u.mesHasta].toLowerCase()}` : ''} de ${estado.cfg.anio}</caption>
    <thead><tr><th scope="col" class="fija">Persona</th><th scope="col" class="fija2">${estado.plantilla || (estado.res && estado.res.personas.some(x => x.nombrePrueba)) ? 'Nombre' : 'Grupo'}</th>${cab}
      <th scope="col" class="num" title="Horas en el año">Horas</th><th scope="col" class="num" title="Noches en el año">Noch.</th><th scope="col" class="num" title="Fines de semana trabajados en el año">FS</th></tr></thead>
    <tbody>${filas || `<tr><td colspan="${dias.length + 5}" style="padding:16px">No hay personas con estos filtros. Quita alguno o añade un grupo en Parámetros.</td></tr>`}</tbody>
    <tfoot>${pieFijo}${pieResto}</tfoot></table></div>`;
}

const ALTO_FILA = 28;
let virtual = null;
function filasVirtuales(inicio, fin) {
  const { lista, fila, columnas } = virtual;
  inicio = Math.max(0, inicio); fin = Math.min(lista.length, fin);
  const hueco = (n) => (n > 0 ? `<tr aria-hidden="true"><td colspan="${columnas}" style="height:${n * ALTO_FILA}px;padding:0;border:0"></td></tr>` : '');
  return hueco(inicio) + lista.slice(inicio, fin).map(fila).join('') + hueco(lista.length - fin);
}
function moverVirtual(caja) {
  if (!virtual) return;
  const tbody = $('tbody', caja);
  const cabeza = $('thead', caja).offsetHeight;
  const primera = Math.floor(Math.max(0, caja.scrollTop - cabeza) / ALTO_FILA);
  const inicio = Math.max(0, primera - 15);
  if (Math.abs(inicio - virtual.inicio) < 8 && virtual.inicio >= 0) return;
  virtual.inicio = inicio;
  tbody.innerHTML = filasVirtuales(inicio, inicio + Math.ceil(caja.clientHeight / ALTO_FILA) + 30);
}

function tablaAnio(lista) {
  const { res } = estado, u = estado.ui;
  const cabOrden = (campo, texto, num = true) => {
    const activo = u.orden.campo === campo;
    return `<th scope="col" class="${num ? 'num' : ''}" aria-sort="${activo ? (u.orden.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-orden" data-orden="${campo}">${texto}${activo ? (u.orden.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`;
  };
  const filas = lista.slice(0, 2000).map(p => `<tr>
    <th scope="row">${esc(p.id)}</th><td>${esc(p.grupoNombre)}</td>
    <td class="num">${fmtH(p.horas)}</td><td class="num">${fmtH(p.objetivo)}</td>
    <td class="num" style="${Math.abs(p.diferencia) > 7 ? 'color:var(--bad);font-weight:600' : ''}">${p.diferencia >= 0 ? '+' : '−'}${fmtH(Math.abs(p.diferencia))}</td>
    <td class="num">${p.mananas}</td><td class="num">${p.tardes}</td><td class="num">${p.noches}</td><td class="num">${p.fines}</td><td class="num">${p.ajustes}</td>
    <td>${p.alertas.length ? `<span style="color:var(--bad)">${esc(p.alertas.join(' · '))}</span>` : '<span class="tenue">Sin avisos</span>'}</td></tr>`).join('');
  // Huecos por mes
  const filasHuecos = [];
  for (const c of res.colectivos) for (const f of res.franjas) {
    const meses = Array(12).fill(0);
    res.huecos.filter(h => h.colectivo === c && h.franja === f).forEach(h => { meses[res.dias[h.d].mes] += h.falta; });
    filasHuecos.push(`<tr><th scope="row">${c === 'TA' ? 'Teleasistencia' : 'Supervisión'} · ${FRANJA_NOMBRE[f]}</th>${meses.map(n => `<td class="num" style="${n ? 'color:var(--bad);font-weight:600' : ''}">${n || '—'}</td>`).join('')}<td class="num"><b>${meses.reduce((a, b) => a + b, 0) || '—'}</b></td></tr>`);
  }
  return `<div class="panel"><h2>Turnos sin cubrir por mes</h2><p class="tenue">Cuántos turnos faltan para llegar al mínimo en cada franja. Para reducirlos, añade personas, cambia patrones o revisa los topes en Parámetros.</p>
    <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Franja</th>${MESES.map(m => `<th scope="col" class="num">${m.slice(0, 3)}</th>`).join('')}<th scope="col" class="num">Total</th></tr></thead><tbody>${filasHuecos.join('')}</tbody></table></div></div>
    <div class="tabla-caja"><table class="tabla-lista"><caption class="oculto">Resumen anual por persona</caption><thead><tr>
    ${cabOrden('id', 'Persona', false)}${cabOrden('grupo', 'Grupo', false)}${cabOrden('horas', 'Horas')}<th scope="col" class="num">Objetivo</th>${cabOrden('diferencia', 'Diferencia')}
    <th scope="col" class="num">Mañanas</th><th scope="col" class="num">Tardes</th>${cabOrden('noches', 'Noches')}${cabOrden('fines', 'Fines de semana')}<th scope="col" class="num">Ajustes</th>${cabOrden('avisos', 'Avisos', false)}
    </tr></thead><tbody>${filas}</tbody></table></div>`;
}

export function pintarCuadrante(raiz) {
  const u = estado.ui;
  const lista = personasVisibles();
  const scroll = $('.tabla-caja', raiz);
  const pos = scroll ? [scroll.scrollLeft, scroll.scrollTop] : null;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Cuadrante ${esc(estado.cfg.anio)} · ${esc(estado.cfg.nombre)}</h1>
    <p>${esc(estado.cfg.titulo || '')}. Personas anónimas por código. Cambia cualquier dato en Parámetros y el cuadrante se rehace al momento (${estado.res.ms} ms).</p></div>
    <div class="fila-acciones" style="margin:0">
      <button type="button" class="btn" data-pdf-col="TA">PDF teleasistentes</button>
      <button type="button" class="btn" data-pdf-col="SUP">PDF supervisores</button>
      <button type="button" class="btn primario" data-mejorar="1" title="Intercambia semanas entre personas del mismo grupo para repartir mejor fines de semana, festivos y domingos, sin tocar la cobertura ni las horas">${estado.cfg.mejora ? 'Mejorar más el reparto' : 'Mejorar reparto'}</button></div></div>
    ${cifras()}${panelInfracciones()}${herramientas()}
    ${u.modo === 'mes' ? leyenda() + tablaMes(lista) : tablaAnio(lista)}
    <p class="tenue" style="margin-top:8px">${fmtNum(lista.length)} de ${fmtNum(estado.res.P)} personas.</p>`;
  const nuevo = $('.tabla-caja:last-of-type', raiz);
  if (pos && nuevo) { nuevo.scrollLeft = pos[0]; nuevo.scrollTop = pos[1]; }
  pintarBarraSeleccion(raiz);
  if (focoPendiente) {
    const pi = estado.res.personas.findIndex(x => x.id === focoPendiente.id);
    const el = pi >= 0 && $(`.cuadrante .celda[data-p="${pi}"][data-d="${focoPendiente.d}"]`, raiz);
    if (el) el.focus({ preventScroll: true });
    focoPendiente = null;
  }
  if (virtual && nuevo) {
    let pendiente = false;
    nuevo.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; moverVirtual(nuevo); }); } }, { passive: true });
    moverVirtual(nuevo);
  }
}

export function eventosCuadrante(raiz, repintar) {
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'cuadrante') return;
    const casilla = e.target.closest('.cuadrante .celda');
    if (casilla) {
      const c = celdaDe(casilla), k = claveDe(c.pi, c.d);
      if (e.shiftKey && sel.ancla) { seleccionarRectangulo(sel.ancla, c); return marcarSeleccion(raiz); }
      if (e.ctrlKey || e.metaKey) { if (sel.celdas.has(k)) sel.celdas.delete(k); else sel.celdas.add(k); sel.ancla = c; return marcarSeleccion(raiz); }
      if (sel.celdas.size) { sel.celdas.clear(); marcarSeleccion(raiz); }
      sel.ancla = c;
      return cambiarCelda(c.pi, c.d);
    }
    const bs = e.target.closest('[data-sel]');
    if (bs) {
      if (bs.dataset.sel === 'nada') { sel.celdas.clear(); return marcarSeleccion(raiz); }
      const claves = [...sel.celdas]; sel.celdas.clear();
      return aplicarACasillas(claves, bs.dataset.sel === 'quitar' ? '__quitar' : $('#sel-codigo', raiz).value);
    }
    const b = e.target.closest('button');
    if (!b) return;
    const u = estado.ui;
    if (b.dataset.ui) {
      u[b.dataset.ui] = b.dataset.valor;
      if (b.dataset.ui === 'colectivo') u.grupo = 'todos';
      return repintar();
    }
    if (b.dataset.mes) {
      // Mueve el tramo entero: con 3 meses elegidos, «Siguiente» pasa a los 3 siguientes.
      const largo = u.mesHasta - u.mesDesde + 1, paso = Number(b.dataset.mes) * largo;
      const desde = Math.min(Math.max(0, u.mesDesde + paso), 12 - largo);
      u.mesDesde = desde; u.mesHasta = desde + largo - 1;
      return repintar();
    }
    if (b.dataset.meses === 'todo') { u.mesDesde = 0; u.mesHasta = 11; return repintar(); }
    if (b.dataset.ordenDir) { u.orden = { ...u.orden, dir: -u.orden.dir }; return repintar(); }
    if (b.dataset.orden) {
      // Cabeceras de la tabla de cifras: mismo campo cambia el sentido; otro campo empieza por «de más a menos» en las cifras.
      const c = b.dataset.orden;
      u.orden = u.orden.campo === c ? { campo: c, dir: -u.orden.dir } : { campo: c, dir: ['horas', 'noches', 'fines', 'avisos', 'diferencia'].includes(c) ? -1 : 1 };
      return repintar();
    }
    if (b.dataset.mejorar) { if (await mejorarReparto()) repintar(); return; }
    if (b.dataset.infraccion != null) { u.infraccion = u.infraccion === b.dataset.infraccion ? '' : b.dataset.infraccion; return repintar(); }
    if (b.dataset.resaltar != null) { u.resaltar = u.resaltar === b.dataset.resaltar ? '' : b.dataset.resaltar; return repintar(); }
    if (b.dataset.pdfCol) {
      const col = b.dataset.pdfCol, u2 = estado.ui;
      const personas = personasVisibles().filter(p => p.colectivo === col);
      if (!personas.length) return avisar(`No hay ${col === 'SUP' ? 'supervisores' : 'teleasistentes'} con los filtros actuales. Quita algún filtro y vuelve a probar.`, 'mal');
      const texto = b.textContent; b.disabled = true; b.textContent = 'Generando PDF…';
      try {
        await pdfCuadrante({ res: estado.res, cfg: estado.cfg, colectivo: col, mesDesde: u2.mesDesde, mesHasta: u2.mesHasta, personas });
        avisar(`PDF descargado: ${personas.length} ${col === 'SUP' ? 'supervisores' : 'teleasistentes'}, de ${MESES[u2.mesDesde].toLowerCase()} a ${MESES[u2.mesHasta].toLowerCase()}.`, 'bien');
      } catch (err) { avisar(`No se ha generado el PDF. ${esc(err.message)}`, 'mal', 0); }
      b.disabled = false; b.textContent = texto;
      return;
    }
  });
  // Teclado en las casillas (vistas de hasta 3 meses, donde cada casilla es un botón).
  let buffer = '', tBuffer = 0;
  raiz.addEventListener('keydown', (e) => {
    if (estado.vista !== 'cuadrante') return;
    const el = e.target.closest && e.target.closest('button.celda');
    if (!el) return;
    const c = celdaDe(el);
    const mover = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (mover) {
      e.preventDefault();
      const tr = el.closest('tr');
      let destino = null;
      if (mover[1]) destino = $(`button.celda[data-d="${c.d + mover[1]}"]`, tr);
      else {
        let fila = mover[0] < 0 ? tr.previousElementSibling : tr.nextElementSibling;
        while (fila && !$('button.celda', fila)) fila = mover[0] < 0 ? fila.previousElementSibling : fila.nextElementSibling;
        destino = fila && $(`button.celda[data-d="${c.d}"]`, fila);
      }
      if (!destino) return;
      if (e.shiftKey) { if (!sel.ancla) sel.ancla = c; sel.celdas.add(claveDe(c.pi, c.d)); seleccionarRectangulo(sel.ancla, celdaDe(destino)); marcarSeleccion(raiz); }
      else sel.ancla = celdaDe(destino);
      destino.focus();
      return;
    }
    if (e.key === 'Escape' && sel.celdas.size) { sel.celdas.clear(); marcarSeleccion(raiz); return; }
    const objetivo = () => (sel.celdas.size && sel.celdas.has(claveDe(c.pi, c.d)) ? [...sel.celdas] : [claveDe(c.pi, c.d)]);
    const enfocarDespues = () => { focoPendiente = { id: estado.res.personas[c.pi].id, d: c.d }; };
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const cl = objetivo(); sel.celdas.clear(); enfocarDespues();
      return aplicarACasillas(cl, '__quitar');
    }
    // El código del turno, letra a letra (p. ej. «R», «M», «1» → RM1). Se aplica en cuanto no hay duda.
    if (e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      buffer += e.key.toUpperCase(); clearTimeout(tBuffer);
      const codigos = estado.res.turnos.map(t => t.codigo);
      const candidatos = codigos.filter(x => x.toUpperCase().startsWith(buffer));
      const exacto = codigos.find(x => x.toUpperCase() === buffer);
      const aplicar = (cod) => { buffer = ''; const cl = objetivo(); sel.celdas.clear(); enfocarDespues(); aplicarACasillas(cl, cod); };
      if (!candidatos.length) { buffer = ''; avisar(`No hay ningún turno que empiece por «${esc(e.key.toUpperCase())}».`, 'mal', 2500); return; }
      if (candidatos.length === 1) return aplicar(candidatos[0]);
      tBuffer = setTimeout(() => { if (exacto) aplicar(exacto); else buffer = ''; }, 700);
    }
  });
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'cuadrante') return;
    if (e.target.id === 'sel-desde') { const u = estado.ui; u.mesDesde = Number(e.target.value); if (u.mesHasta < u.mesDesde) u.mesHasta = u.mesDesde; repintar(); }
    if (e.target.id === 'sel-hasta') { const u = estado.ui; u.mesHasta = Number(e.target.value); if (u.mesDesde > u.mesHasta) u.mesDesde = u.mesHasta; repintar(); }
    if (e.target.id === 'sel-grupo') { estado.ui.grupo = e.target.value; repintar(); }
    if (e.target.id === 'sel-orden') { const c = e.target.value; estado.ui.orden = { campo: c, dir: ['horas', 'noches', 'fines', 'avisos', 'diferencia'].includes(c) ? -1 : 1 }; repintar(); }
    if (e.target.id === 'solo-avisos') { estado.ui.soloAvisos = e.target.checked; repintar(); }
  });
}

async function cambiarCelda(pi, d) {
  const { res, cfg } = estado;
  const p = res.personas[pi], dia = res.dias[d];
  const clave = `${p.id}|${dia.fecha}`;
  const actual = res.turnos[res.grid[pi * res.D + d]];
  const esManual = clave in cfg.manuales;
  const origenTxt = ['del ciclo de su grupo', 'de vacaciones', 'puesto por el ajuste', 'puesto por el ajuste', 'cambiado a mano', 'intercambiado por la mejora del reparto'][res.origen[pi * res.D + d]];
  const html = `<p>${esc(p.id)} (${esc(p.grupoNombre)}), ${fmtFecha(dia.fecha)}${dia.festivo ? `, festivo: ${esc(dia.festivo)}` : ''}. Ahora tiene <b>${esc(actual.nombre)}</b>, ${origenTxt}.</p>
    <p class="tenue">Un cambio a mano manda sobre el ciclo y el ajuste no lo toca. Se guarda con la configuración.</p>
    ${(() => {
      const usados = new Set(res.grid);
      const boton = (t) => `<button type="button" data-codigo="${esc(t.codigo)}" style="${estiloTurno(t)}">${esc(t.codigo)}<small>${esc(t.nombre)}</small></button>`;
      const enUso = res.turnos.filter((t, i) => usados.has(i)), otros = res.turnos.filter((t, i) => !usados.has(i));
      return `<div class="rejilla-codigos">${enUso.map(boton).join('')}</div>${otros.length ? `<details style="margin-top:10px"><summary>Otros turnos configurados (${otros.length})</summary><div class="rejilla-codigos" style="margin-top:8px">${otros.map(boton).join('')}</div></details>` : ''}`;
    })()}`;
  const botones = [{ texto: 'Cancelar', valor: null }];
  if (esManual) botones.unshift({ texto: 'Quitar el cambio a mano', tipo: 'peligro', valor: '__quitar' });
  const r = await modal({
    titulo: 'Cambia el turno de este día', html, botones,
    alAbrir: (velo, cerrar) => $$('[data-codigo]', velo).forEach(el => { el.onclick = () => cerrar(el.dataset.codigo); }),
  });
  if (r == null) return;
  const antes = cfg.manuales[clave];
  if (r === '__quitar') delete cfg.manuales[clave];
  else cfg.manuales[clave] = r;
  cambiado({ inmediato: true });
  // Las reglas que bloquean no se pueden romper a mano (como el «hard stop» de Quinyx): se deshace y se explica.
  if (r !== '__quitar') {
    const piNuevo = estado.res.personas.findIndex(x => x.id === p.id);
    const rotas = datosInfracciones().lista.filter(x => x.nivel === 'bloquea')
      .flatMap(x => x.casos.filter(c => c.pi === piNuevo && (c.dias.includes(d) || !c.dias.length)).map(c => `${x.titulo} (${c.texto})`));
    if (rotas.length) {
      if (antes == null) delete cfg.manuales[clave]; else cfg.manuales[clave] = antes;
      cambiado({ inmediato: true });
      avisar(`No se ha hecho el cambio: incumple ${rotas.map(esc).join(' · ')}. Es una regla que bloquea; si quieres permitirlo, ponla en «Avisa» en Parámetros › Reglas.`, 'mal', 9000);
    }
  }
}
