// Vista «Escenarios y versiones».
// · Escenarios: fotos con nombre del cuadrante de una sede (como los escenarios de Calabrio). Se guardan con la
//   configuración, se abren (sustituyen a la sede, se deshace con Ctrl+Z) y se comparan entre sí en «Comparar».
// · Versiones: cada «Guardar en el servidor» deja una copia con fecha y resumen de lo que cambió (como el historial de
//   Planday o la foto de publicación de Genesys). Se puede traer cualquiera al navegador para revisarla o volver a ella.
import { estado, esc, fmtNum, fmtFecha, cambiado, avisar, confirmar, modal, api, clonar, completar, resultadoDe, resumenCambios, nuevoId } from './nucleo.js';
import { infracciones, puntuacion } from './puntuacion.js';
import { PLANTILLAS_ESCENARIO, TURNOS_DOS_LINEAS } from './escenarios-plantilla.js';

const MAX_ESCENARIOS = 8;
let versiones = undefined;   // undefined = sin consultar; [] = ninguna
const cifras = new Map();     // escenario → { personas, punt }

function resumenEscenario(e) {
  if (!cifras.has(e.id)) {
    const r = resultadoDe(e.cfg);
    cifras.set(e.id, { personas: r.P, punt: puntuacion(r, e.cfg, infracciones(r, e.cfg)), mejora: !!e.cfg.mejora });
  }
  return cifras.get(e.id);
}
// Foto de la sede para un escenario: sin la lista de escenarios ni la marca de cuál está abierto.
const foto = (cfg) => { const { escenarios, escenarioAbierto, ...resto } = clonar(cfg); void escenarios; void escenarioAbierto; return resto; };
const fechaHora = (iso) => { try { return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } };

async function cargarVersiones(repintar) {
  try { versiones = (await api('versiones')).versiones || []; }
  catch (e) { versiones = null; avisar(`No se han podido leer las versiones. ${esc(e.message)}`, 'mal', 0); }
  repintar();
}

// Abre un escenario en su sede. Lo que había abierto se guarda antes en su propio escenario (así no se pierde nada al
// pasar de uno a otro); si no había ninguno abierto y hay cambios, se pregunta. Lo usan Escenarios y el selector de arriba.
export async function abrirEscenario(id) {
  const esc_ = (estado.todo.escenarios || []).find(x => x.id === id);
  if (!esc_) return false;
  const i = estado.todo.sedes.findIndex(s => s.id === esc_.sede);
  if (i < 0) return false;
  const sede = estado.todo.sedes[i];
  if (sede.escenarioAbierto === id) return false;
  const actual = (estado.todo.escenarios || []).find(x => x.id === sede.escenarioAbierto && x.sede === sede.id);
  let guardadoEn = '';
  if (actual) {
    if (JSON.stringify(foto(sede)) !== JSON.stringify(actual.cfg)) { actual.cfg = foto(sede); actual.fecha = new Date().toISOString(); cifras.delete(actual.id); guardadoEn = actual.nombre; }
  } else if (!(await confirmar(`¿Abrir «${esc_.nombre}»?`, `El cuadrante que hay ahora en ${sede.nombre} no está guardado como escenario: se sustituye por el de «${esc_.nombre}». Si quieres conservarlo, guárdalo antes como escenario. Se deshace con Ctrl+Z.`, 'Abrir', 'primario'))) return false;
  const nueva = completar({ ...estado.todo, sedes: estado.todo.sedes.map((s, j) => (j === i ? clonar(esc_.cfg) : s)) });
  estado.todo.sedes[i] = nueva.sedes[i];
  estado.todo.sedes[i].escenarioAbierto = esc_.id;
  // Lo que completar() rellena se guarda ya en el escenario, para que «con cambios» salga solo si se cambia algo.
  esc_.cfg = foto(estado.todo.sedes[i]);
  cambiado({ inmediato: true });
  avisar(`Abierto «${esc(esc_.nombre)}».${guardadoEn ? ` Lo que tenías se ha guardado en «${esc(guardadoEn)}».` : ''} Lo que cambies se queda en este escenario. Ctrl+Z vuelve al de antes.`, 'bien', 8000);
  return true;
}
export const escenarioAbierto = (cfg = estado.cfg) => (estado.todo.escenarios || []).find(x => x.id === cfg.escenarioAbierto && x.sede === cfg.id) || null;

// ¿La sede tiene cambios frente al escenario que está abierto?
const cambiosEsc = (e) => estado.cfg.escenarioAbierto === e.id && JSON.stringify(foto(estado.cfg)) !== JSON.stringify(e.cfg);

export function pintarEscenarios(raiz, repintar) {
  const cfg = estado.cfg;
  // De más reciente a más antiguo (por la fecha en que se guardó o se cambió por última vez).
  const esc_ = (estado.todo.escenarios || []).filter(e => e.sede === cfg.id).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  const cambios = estado.publicada ? resumenCambios() : '';
  if (estado.admin && versiones === undefined) { versiones = null; cargarVersiones(repintar); }
  const abiertoAhora = esc_.find(e => e.id === cfg.escenarioAbierto) || null;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Escenarios y versiones · ${esc(cfg.nombre)}</h1>
      <p>Guarda el cuadrante tal como está para probar otra cosa sin perderlo, y compara escenarios entre sí. Las versiones son las copias que deja cada «Guardar en el servidor».</p></div>
    <div class="fila-acciones"><button type="button" class="btn primario" data-es="guardar" ${esc_.length >= MAX_ESCENARIOS ? 'disabled title="Como mucho 8 escenarios por sede: borra alguno"' : ''}>Guardar como escenario…</button>
      ${PLANTILLAS_ESCENARIO.map(p => `<button type="button" class="btn" data-es="plantilla" data-plantilla="${p.id}" title="${esc(p.nota)}" ${esc_.length >= MAX_ESCENARIOS ? 'disabled' : ''}>Crear escenario: ${esc(p.nombre.toLowerCase())}</button>`).join('')}</div></div>

    ${abiertoAhora ? `<div class="banda ${cambiosEsc(abiertoAhora) ? '' : 'ok'}" role="status" style="margin-bottom:12px"><span>Estás editando el escenario <b>«${esc(abiertoAhora.nombre)}»</b>. Cambia lo que quieras en el cuadrante (pulsa una casilla) o en Parámetros, y vuelve aquí: ${cambiosEsc(abiertoAhora) ? '<b>tiene cambios sin guardar en el escenario</b>.' : 'ahora mismo coincide con el escenario.'}</span>
      ${cambiosEsc(abiertoAhora) ? `<button type="button" class="btn primario" data-es="actualizar" data-id="${esc(abiertoAhora.id)}">Guardar cambios en «${esc(abiertoAhora.nombre)}»</button>` : ''}
      <button type="button" class="btn" data-es="cerrar-escenario">Dejar de editarlo</button></div>` : ''}
    <section class="panel"><h2>Escenarios de ${esc(cfg.nombre)} (${fmtNum(esc_.length)} de ${MAX_ESCENARIOS})</h2>
      ${esc_.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Escenario</th><th scope="col">Guardado</th><th scope="col" class="num">Personas</th><th scope="col">Puntuación (duro · medio · blando)</th><th scope="col"></th></tr></thead><tbody>
        ${esc_.map(e => { const r = resumenEscenario(e), abierto = cfg.escenarioAbierto === e.id; return `<tr${abierto ? ' class="fila-abierta"' : ''}>
          <td><b>${esc(e.nombre)}</b>${abierto ? ` <span class="pildora si">abierto${cambiosEsc(e) ? ', con cambios sin guardar' : ''}</span>` : ''}${e.nota ? `<br><span class="tenue">${esc(e.nota)}</span>` : ''}${r.mejora ? '<br><span class="pildora">con mejora del reparto</span>' : ''}</td>
          <td>${esc(fechaHora(e.fecha))}</td><td class="num">${fmtNum(r.personas)}</td>
          <td>${fmtNum(-r.punt.duro || 0)} · ${fmtNum(-r.punt.medio || 0)} · ${fmtNum(-r.punt.blando || 0)}</td>
          <td class="num"><span class="fila-acciones" style="margin:0;justify-content:flex-end">
            <button type="button" class="btn mini" data-es="comparar" data-id="${esc(e.id)}">Comparar con el actual</button>
            ${abierto ? `<button type="button" class="btn mini primario" data-es="actualizar" data-id="${esc(e.id)}" ${cambiosEsc(e) ? '' : 'disabled title="No hay cambios"'}>Guardar cambios</button>` : `<button type="button" class="btn mini" data-es="abrir" data-id="${esc(e.id)}" title="Lo pone en el cuadrante para verlo y cambiarlo">Abrir para editar</button>`}
            <button type="button" class="btn mini" data-es="renombrar" data-id="${esc(e.id)}">Renombrar</button>
            <button type="button" class="btn mini peligro" data-es="borrar" data-id="${esc(e.id)}">Borrar</button></span></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="tenue">Todavía no hay escenarios. «Guardar como escenario…» hace una foto del cuadrante actual de esta sede (parámetros, cambios a mano y mejora del reparto).</p>'}
      <p class="tenue" style="margin-top:8px">Los escenarios se guardan con la configuración: en este navegador mientras pruebas y, con la sesión de administración, en el servidor al guardar.</p>
    </section>

    <section class="panel"><h2>Cambios sin guardar</h2>
      <p>${estado.publicada && cambios !== 'Sin cambios en el cuadrante.' ? esc(cambios) : 'Ninguno: lo que ves es la versión guardada en el servidor.'}</p></section>

    <section class="panel"><h2>Versiones guardadas en el servidor</h2>
      ${!estado.admin ? '<p class="tenue">Las versiones solo las ve la administración. Entra en Ajustes con la clave.</p>'
        : versiones == null ? '<p class="tenue">Consultando…</p>'
        : versiones.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Fecha</th><th scope="col">Qué cambió</th><th scope="col"></th></tr></thead><tbody>
          ${versiones.map((v, i) => `<tr><td>${esc(fechaHora(v.fecha))}${i === 0 ? ' <span class="pildora si">publicada</span>' : ''}</td><td>${esc(v.nota || '—')}</td>
            <td class="num"><button type="button" class="btn mini" data-es="version" data-id="${esc(v.id)}">Traer al navegador</button></td></tr>`).join('')}
        </tbody></table></div>
        <p class="tenue" style="margin-top:8px">«Traer al navegador» carga esa versión para revisarla (se deshace con Ctrl+Z). Para volver a ella del todo, guárdala en el servidor: queda como versión nueva. Se guardan las últimas 30.</p>`
        : '<p class="tenue">Todavía no hay versiones: se crean al guardar en el servidor.</p>'}
    </section>`;
}

export function eventosEscenarios(raiz, repintar, irA) {
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'escenarios') return;
    const b = e.target.closest('button[data-es]'); if (!b) return;
    const a = b.dataset.es, cfg = estado.cfg;
    const lista = estado.todo.escenarios || (estado.todo.escenarios = []);
    const esc_ = lista.find(x => x.id === b.dataset.id);
    if (a === 'guardar') {
      const nombre = await modal({
        titulo: 'Guardar como escenario',
        html: `<p class="tenue">Una foto del cuadrante actual de ${esc(cfg.nombre)}: parámetros, cambios a mano y mejora del reparto.</p>
          <label class="campo"><span>Nombre</span><input type="text" id="es-nombre" maxlength="60" value="Escenario ${lista.filter(x => x.sede === cfg.id).length + 1}"></label>
          <label class="campo" style="margin-top:8px"><span>Nota (opcional)</span><input type="text" id="es-nota" maxlength="200" placeholder="Qué tiene de especial"></label>`,
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Guardar', tipo: 'primario', valor: (velo) => ({ nombre: velo.querySelector('#es-nombre').value.trim(), nota: velo.querySelector('#es-nota').value.trim() }) }],
      });
      if (!nombre || !nombre.nombre) return;
      const id = nuevoId('esc');
      lista.push({ id, sede: cfg.id, nombre: nombre.nombre.slice(0, 60), nota: nombre.nota.slice(0, 200), fecha: new Date().toISOString(), cfg: foto(cfg) });
      cfg.escenarioAbierto = id;   // lo que se cambie a partir de ahora se puede guardar en él
      cambiado({ inmediato: true }); repintar();
      return avisar(`Escenario «${esc(nombre.nombre)}» guardado.`, 'bien');
    }
    if (a === 'plantilla') {
      const p = PLANTILLAS_ESCENARIO.find(x => x.id === b.dataset.plantilla);
      if (!p) return;
      if (p.sinVentana) {
        let nueva;
        try { nueva = p.crea(foto(cfg)); }
        catch (err) { return avisar(`No se ha podido crear el escenario: ${esc(err.message)}`, 'mal', 0); }
        lista.push({ id: nuevoId('esc'), sede: cfg.id, nombre: p.nombre, nota: p.nota.slice(0, 300), fecha: new Date().toISOString(), cfg: nueva });
        cambiado({ inmediato: true }); repintar();
        return avisar(`Escenario «${esc(p.nombre)}» creado para ${esc(cfg.nombre)}. Compáralo con el actual o ábrelo.`, 'bien', 8000);
      }
      const fila = (k, et) => { const t = TURNOS_DOS_LINEAS.find(x => x.codigo === k); return `<tr><td>${et}</td>
        <td><input type="time" id="dl-${k}-i" value="${t.inicio}" aria-label="${et}: entrada"></td><td><input type="time" id="dl-${k}-f" value="${t.fin}" aria-label="${et}: salida"></td></tr>`; };
      const op = await modal({
        titulo: 'Dos líneas de horario fijo',
        html: `<p class="tenue">Cada persona va siempre en su línea y entra siempre a la misma hora en su franja; el solape lo pone la otra línea. Comprueba que la mañana A empieza antes de que acabe la noche (relevo con solape). Después podrás cambiar las horas en Parámetros › Turnos.</p>
          <table class="tabla-lista"><thead><tr><th scope="col">Turno</th><th scope="col">Entrada</th><th scope="col">Salida</th></tr></thead><tbody>
          ${fila('MA', 'Mañana línea A')}${fila('TA', 'Tarde línea A')}${fila('MB', 'Mañana línea B')}${fila('TB', 'Tarde línea B')}</tbody></table>
          <label class="campo" style="margin-top:10px"><span>Personas en la línea A (%)</span><input type="number" id="dl-rep" value="50" min="0" max="100" style="width:90px"></label>`,
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Crear escenario', tipo: 'primario', valor: (velo) => ({
          reparto: (Number(velo.querySelector('#dl-rep').value) || 0) / 100,
          horas: Object.fromEntries(['MA', 'TA', 'MB', 'TB'].map(k => [k, [velo.querySelector(`#dl-${k}-i`).value, velo.querySelector(`#dl-${k}-f`).value]])) }) }],
      });
      if (!op) return;
      let nueva;
      try { nueva = p.crea(foto(cfg), op); }
      catch (err) { return avisar(`No se ha podido crear el escenario: ${esc(err.message)}`, 'mal', 0); }
      const h = (k) => op.horas[k].join('-');
      const nota = `Línea A ${h('MA')} / ${h('TA')}, línea B ${h('MB')} / ${h('TB')}; ${Math.round(op.reparto * 100)} % en la línea A.`;
      lista.push({ id: nuevoId('esc'), sede: cfg.id, nombre: p.nombre, nota, fecha: new Date().toISOString(), cfg: nueva });
      cambiado({ inmediato: true }); repintar();
      return avisar(`Escenario «${esc(p.nombre)}» creado a partir del cuadrante actual de ${esc(cfg.nombre)}. Ábrelo para verlo o compáralo con el actual.`, 'bien', 8000);
    }
    if (a === 'borrar' && esc_) {
      if (!(await confirmar(`¿Borrar «${esc_.nombre}»?`, 'Se puede deshacer con Ctrl+Z mientras no recargues la página.', 'Borrar'))) return;
      estado.todo.escenarios = lista.filter(x => x !== esc_); cifras.delete(esc_.id);
      if (cfg.escenarioAbierto === esc_.id) delete cfg.escenarioAbierto;
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'abrir' && esc_) { if (await abrirEscenario(esc_.id)) repintar(); return; }
    if (a === 'actualizar' && esc_) {
      esc_.cfg = foto(cfg); esc_.fecha = new Date().toISOString(); cifras.delete(esc_.id);
      cambiado({ inmediato: true }); repintar();
      return avisar(`Cambios guardados en «${esc(esc_.nombre)}».${estado.admin ? ' Para que lo vea todo el mundo, guarda también para todos (barra de abajo).' : ''}`, 'bien');
    }
    if (a === 'cerrar-escenario') { delete cfg.escenarioAbierto; cambiado({ inmediato: true }); return repintar(); }
    if (a === 'renombrar' && esc_) {
      const r = await modal({
        titulo: 'Renombrar el escenario',
        html: `<label class="campo"><span>Nombre</span><input type="text" id="es-nombre" maxlength="60" value="${esc(esc_.nombre)}"></label>
          <label class="campo" style="margin-top:8px"><span>Nota (opcional)</span><input type="text" id="es-nota" maxlength="300" value="${esc(esc_.nota || '')}"></label>`,
        botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Guardar', tipo: 'primario', valor: (velo) => ({ nombre: velo.querySelector('#es-nombre').value.trim(), nota: velo.querySelector('#es-nota').value.trim() }) }],
      });
      if (!r || !r.nombre) return;
      esc_.nombre = r.nombre.slice(0, 60); esc_.nota = r.nota.slice(0, 300);
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'comparar' && esc_) {
      Object.assign((estado.ui.comparativa ||= { filtro: '', orden: 'tema' }), { a: `esc:${esc_.id}`, b: 'actual' });
      return irA('comparativa');
    }
    if (a === 'version') {
      b.disabled = true;
      try {
        const { config } = await api('version', null, { id: b.dataset.id });
        const escenarios = estado.todo.escenarios;
        estado.todo = completar(config);
        if (!(config.escenarios || []).length && escenarios) estado.todo.escenarios = escenarios;
        cambiado({ inmediato: true }); repintar();
        avisar('Versión cargada en el navegador. Revísala; para volver a ella del todo, guárdala en el servidor. Ctrl+Z deshace.', 'bien', 9000);
      } catch (err) { avisar(`No se ha podido traer la versión. ${esc(err.message)}`, 'mal', 0); }
      b.disabled = false;
    }
  });
}

export const olvidarVersiones = () => { versiones = undefined; };
