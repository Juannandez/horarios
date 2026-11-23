// Vista «Escenarios y versiones».
// · Escenarios: fotos con nombre del cuadrante de una sede (como los escenarios de Calabrio). Se guardan con la
//   configuración, se abren (sustituyen a la sede, se deshace con Ctrl+Z) y se comparan entre sí en «Comparar».
// · Versiones: cada «Guardar en el servidor» deja una copia con fecha y resumen de lo que cambió (como el historial de
//   Planday o la foto de publicación de Genesys). Se puede traer cualquiera al navegador para revisarla o volver a ella.
import { estado, esc, fmtNum, fmtFecha, cambiado, avisar, confirmar, modal, api, clonar, completar, resultadoDe, resumenCambios, nuevoId } from './nucleo.js';
import { infracciones, puntuacion } from './puntuacion.js';
import { PLANTILLAS_ESCENARIO } from './escenarios-plantilla.js';

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
const fechaHora = (iso) => { try { return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } };

async function cargarVersiones(repintar) {
  try { versiones = (await api('versiones')).versiones || []; }
  catch (e) { versiones = null; avisar(`No se han podido leer las versiones. ${esc(e.message)}`, 'mal', 0); }
  repintar();
}

export function pintarEscenarios(raiz, repintar) {
  const cfg = estado.cfg;
  const esc_ = (estado.todo.escenarios || []).filter(e => e.sede === cfg.id);
  const cambios = estado.publicada ? resumenCambios() : '';
  if (estado.admin && versiones === undefined) { versiones = null; cargarVersiones(repintar); }
  raiz.innerHTML = `<div class="cabecera"><div><h1>Escenarios y versiones · ${esc(cfg.nombre)}</h1>
      <p>Guarda el cuadrante tal como está para probar otra cosa sin perderlo, y compara escenarios entre sí. Las versiones son las copias que deja cada «Guardar en el servidor».</p></div>
    <div class="fila-acciones"><button type="button" class="btn primario" data-es="guardar" ${esc_.length >= MAX_ESCENARIOS ? 'disabled title="Como mucho 8 escenarios por sede: borra alguno"' : ''}>Guardar como escenario…</button>
      ${PLANTILLAS_ESCENARIO.map(p => `<button type="button" class="btn" data-es="plantilla" data-plantilla="${p.id}" title="${esc(p.nota)}" ${esc_.length >= MAX_ESCENARIOS ? 'disabled' : ''}>Crear escenario: ${esc(p.nombre.toLowerCase())}</button>`).join('')}</div></div>

    <section class="panel"><h2>Escenarios de ${esc(cfg.nombre)} (${fmtNum(esc_.length)} de ${MAX_ESCENARIOS})</h2>
      ${esc_.length ? `<div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Escenario</th><th scope="col">Guardado</th><th scope="col" class="num">Personas</th><th scope="col">Puntuación (duro · medio · blando)</th><th scope="col"></th></tr></thead><tbody>
        ${esc_.map(e => { const r = resumenEscenario(e); return `<tr>
          <td><b>${esc(e.nombre)}</b>${e.nota ? `<br><span class="tenue">${esc(e.nota)}</span>` : ''}${r.mejora ? '<br><span class="pildora">con mejora del reparto</span>' : ''}</td>
          <td>${esc(fechaHora(e.fecha))}</td><td class="num">${fmtNum(r.personas)}</td>
          <td>${fmtNum(-r.punt.duro || 0)} · ${fmtNum(-r.punt.medio || 0)} · ${fmtNum(-r.punt.blando || 0)}</td>
          <td class="num"><span class="fila-acciones" style="margin:0;justify-content:flex-end">
            <button type="button" class="btn mini" data-es="comparar" data-id="${esc(e.id)}">Comparar con el actual</button>
            <button type="button" class="btn mini" data-es="abrir" data-id="${esc(e.id)}">Abrir</button>
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
      const { escenarios, ...sinNada } = { ...clonar(cfg) }; void escenarios;
      lista.push({ id: nuevoId('esc'), sede: cfg.id, nombre: nombre.nombre.slice(0, 60), nota: nombre.nota.slice(0, 200), fecha: new Date().toISOString(), cfg: sinNada });
      cambiado({ inmediato: true }); repintar();
      return avisar(`Escenario «${esc(nombre.nombre)}» guardado.`, 'bien');
    }
    if (a === 'plantilla') {
      const p = PLANTILLAS_ESCENARIO.find(x => x.id === b.dataset.plantilla);
      if (!p) return;
      let nueva;
      try { const { escenarios, ...sinNada } = clonar(cfg); void escenarios; nueva = p.crea(sinNada); }
      catch (err) { return avisar(`No se ha podido crear el escenario: ${esc(err.message)}`, 'mal', 0); }
      lista.push({ id: nuevoId('esc'), sede: cfg.id, nombre: p.nombre, nota: p.nota.slice(0, 200), fecha: new Date().toISOString(), cfg: nueva });
      cambiado({ inmediato: true }); repintar();
      return avisar(`Escenario «${esc(p.nombre)}» creado a partir del cuadrante actual de ${esc(cfg.nombre)}. Ábrelo para verlo o compáralo con el actual.`, 'bien', 8000);
    }
    if (a === 'borrar' && esc_) {
      if (!(await confirmar(`¿Borrar «${esc_.nombre}»?`, 'Se puede deshacer con Ctrl+Z mientras no recargues la página.', 'Borrar'))) return;
      estado.todo.escenarios = lista.filter(x => x !== esc_); cifras.delete(esc_.id);
      cambiado({ inmediato: true }); return repintar();
    }
    if (a === 'abrir' && esc_) {
      if (!(await confirmar(`¿Abrir «${esc_.nombre}»?`, `Sustituye el cuadrante actual de ${cfg.nombre} por el del escenario. Si quieres conservar el actual, guárdalo antes como escenario. Se deshace con Ctrl+Z.`, 'Abrir', 'primario'))) return;
      const i = estado.todo.sedes.findIndex(s => s.id === esc_.sede);
      const nueva = completar({ ...estado.todo, sedes: estado.todo.sedes.map((s, j) => (j === i ? clonar(esc_.cfg) : s)) });
      estado.todo.sedes[i] = nueva.sedes[i];
      cambiado({ inmediato: true }); repintar();
      return avisar(`Abierto «${esc(esc_.nombre)}». Ctrl+Z vuelve al de antes.`, 'bien');
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
