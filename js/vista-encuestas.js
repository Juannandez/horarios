// Vistas Encuestas (contestar y editar) y Resultados (agregados, solo administración).
import { estado, esc, $, $$, fmtNum, api, avisar, confirmar, cambiado, nuevoId, descargar, fmtFecha } from './nucleo.js';
import { TIPOS_PREGUNTA } from './datos-base.js';

const RESPONDIDAS = 'horarios.respondidas';
const respondidas = () => { try { return JSON.parse(localStorage.getItem(RESPONDIDAS) || '{}'); } catch (e) { return {}; } };

// ── Contestar ───────────────────────────────────────────────────────────────
function formulario(enc) {
  const preguntas = enc.preguntas.map((p, i) => {
    const req = p.obligatoria ? ' <span class="obligatoria" aria-hidden="true">*</span>' : '';
    const nombre = `q-${esc(p.id)}`;
    let control = '';
    if (p.tipo === 'unica' || p.tipo === 'multiple') {
      const tipo = p.tipo === 'unica' ? 'radio' : 'checkbox';
      control = `<fieldset><legend>${i + 1}. ${esc(p.texto)}${req}</legend><div class="opciones">${p.opciones.map(o =>
        `<label class="casilla"><input type="${tipo}" name="${nombre}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div></fieldset>`;
    } else if (p.tipo === 'escala') {
      control = `<fieldset><legend>${i + 1}. ${esc(p.texto)}${req}</legend><div class="opciones escala">${[1, 2, 3, 4, 5].map(n =>
        `<label><input type="radio" name="${nombre}" value="${n}"><span>${n}</span></label>`).join('')}</div>
        <p class="tenue" style="margin-top:6px">1 = muy mal · 5 = muy bien</p></fieldset>`;
    } else if (p.tipo === 'numero') {
      control = `<label for="${nombre}">${i + 1}. ${esc(p.texto)}${req}</label><input type="number" id="${nombre}" name="${nombre}" style="width:120px">`;
    } else {
      control = `<label for="${nombre}">${i + 1}. ${esc(p.texto)}${req}</label><textarea id="${nombre}" name="${nombre}" maxlength="2000"></textarea>`;
    }
    return `<div class="pregunta" data-pregunta="${esc(p.id)}">${control}</div>`;
  }).join('');
  const ya = respondidas()[enc.id];
  return `<form class="panel formulario" id="form-encuesta" data-encuesta="${esc(enc.id)}" novalidate>
    <h2>${esc(enc.titulo)}</h2><p class="tenue">${esc(enc.descripcion || '')}</p>
    <p class="tenue">Es anónima: no se guarda tu nombre, ni tu dirección, ni la hora; solo el día y tus respuestas. Las preguntas con <span class="obligatoria">*</span> son obligatorias.</p>
    ${ya ? `<p class="banda aviso">Ya contestaste esta encuesta en este navegador el ${fmtFecha(ya)}. Si la envías otra vez, contará como otra respuesta.</p>` : ''}
    ${preguntas}
    <div class="fila-acciones"><button type="submit" class="btn primario">Enviar respuesta</button><button type="button" class="btn" data-accion="volver">Volver a las encuestas</button></div>
  </form>`;
}

function leerFormulario(form, enc) {
  const r = {}, faltan = [];
  for (const p of enc.preguntas) {
    const nombre = `q-${p.id}`;
    let v;
    if (p.tipo === 'multiple') v = $$(`input[name="${CSS.escape(nombre)}"]:checked`, form).map(x => x.value);
    else if (p.tipo === 'unica' || p.tipo === 'escala') { const x = $(`input[name="${CSS.escape(nombre)}"]:checked`, form); v = x ? (p.tipo === 'escala' ? Number(x.value) : x.value) : ''; }
    else if (p.tipo === 'numero') { const x = form.elements[nombre]; v = x && x.value !== '' ? Number(x.value) : ''; }
    else { const x = form.elements[nombre]; v = x ? x.value.trim() : ''; }
    const vacio = v === '' || (Array.isArray(v) && !v.length);
    if (p.obligatoria && vacio) faltan.push(p);
    if (!vacio) r[p.id] = v;
  }
  return { r, faltan };
}

// ── Editor ──────────────────────────────────────────────────────────────────
function editor(enc, ei) {
  const preguntas = enc.preguntas.map((p, pi) => `<div class="pregunta-editor">
    <div class="campos">
      <label class="campo" style="flex:1;min-width:240px"><span>Pregunta ${pi + 1}</span><input type="text" data-ruta="encuestas.${ei}.preguntas.${pi}.texto" value="${esc(p.texto)}"></label>
      <label class="campo"><span>Tipo</span><select data-ruta="encuestas.${ei}.preguntas.${pi}.tipo" data-estructura="1">${TIPOS_PREGUNTA.map(t => `<option value="${t.id}" ${t.id === p.tipo ? 'selected' : ''}>${t.nombre}</option>`).join('')}</select></label>
      <label class="casilla"><input type="checkbox" data-ruta="encuestas.${ei}.preguntas.${pi}.obligatoria" data-tipo="bool" ${p.obligatoria ? 'checked' : ''}> Obligatoria</label>
      <span style="flex:1"></span>
      <button type="button" class="btn mini" data-accion="p-subir" data-e="${ei}" data-p="${pi}" ${pi === 0 ? 'disabled' : ''}>Subir</button>
      <button type="button" class="btn mini" data-accion="p-bajar" data-e="${ei}" data-p="${pi}" ${pi === enc.preguntas.length - 1 ? 'disabled' : ''}>Bajar</button>
      <button type="button" class="btn mini peligro" data-accion="p-quitar" data-e="${ei}" data-p="${pi}">Quitar</button>
    </div>
    ${p.tipo === 'unica' || p.tipo === 'multiple' ? `<label class="campo" style="margin-top:8px"><span>Opciones, una por línea</span><textarea data-ruta="encuestas.${ei}.preguntas.${pi}.opciones" data-tipo="lineas">${esc(p.opciones.join('\n'))}</textarea></label>` : ''}
  </div>`).join('');
  return `<article class="panel" aria-label="Encuesta ${esc(enc.titulo)}">
    <div class="campos" style="margin-top:0">
      <label class="campo" style="flex:1;min-width:240px"><span>Título</span><input type="text" data-ruta="encuestas.${ei}.titulo" value="${esc(enc.titulo)}"></label>
      <label class="casilla"><input type="checkbox" data-ruta="encuestas.${ei}.activa" data-tipo="bool" ${enc.activa ? 'checked' : ''}> Abierta</label>
      <button type="button" class="btn mini" data-accion="e-subir" data-e="${ei}" ${ei === 0 ? 'disabled' : ''}>Subir</button>
      <button type="button" class="btn mini" data-accion="e-duplicar" data-e="${ei}">Duplicar</button>
      <button type="button" class="btn mini peligro" data-accion="e-quitar" data-e="${ei}">Quitar encuesta</button>
    </div>
    <label class="campo" style="margin-top:8px"><span>Texto de presentación</span><textarea data-ruta="encuestas.${ei}.descripcion">${esc(enc.descripcion || '')}</textarea></label>
    <h3 style="margin:16px 0 8px">Preguntas</h3>${preguntas || '<p class="tenue">Esta encuesta no tiene preguntas todavía.</p>'}
    <div class="fila-acciones"><button type="button" class="btn" data-accion="p-anadir" data-e="${ei}">Añadir pregunta</button></div>
  </article>`;
}

export function pintarEncuestas(raiz) {
  const cfg = estado.todo, u = estado.ui;
  if (u.editarEncuestas && estado.admin) {
    raiz.innerHTML = `<div class="cabecera"><div><h1>Editar encuestas</h1><p>Añade, quita y ordena encuestas y preguntas. Los cambios se publican al guardar en el servidor.</p></div>
      <div class="fila-acciones"><button type="button" class="btn" data-accion="e-anadir">Añadir encuesta</button><button type="button" class="btn primario" data-accion="terminar-edicion">Terminar de editar</button></div></div>
      ${cfg.encuestas.map(editor).join('') || '<p class="tenue">No hay encuestas. Pulsa «Añadir encuesta».</p>'}`;
    return;
  }
  const enc = cfg.encuestas.find(e => e.id === u.encuesta && e.activa);
  if (enc) { raiz.innerHTML = formulario(enc); return; }
  const abiertas = cfg.encuestas.filter(e => e.activa);
  const ya = respondidas();
  raiz.innerHTML = `<div class="cabecera"><div><h1>Encuestas</h1><p>Encuestas anónimas de la sección, comunes a Sevilla y Málaga. Elige una para contestarla.</p></div>
    ${estado.admin ? '<button type="button" class="btn" data-accion="editar">Editar encuestas</button>' : ''}</div>
    ${estado.servidor !== 'ok' ? '<p class="banda mal">No hay conexión con el servidor: puedes ver las encuestas, pero las respuestas no se podrán enviar.</p>' : ''}
    <div class="encuestas">${abiertas.map(e => `<article class="panel"><h2>${esc(e.titulo)}</h2><p class="tenue">${esc(e.descripcion || '')}</p>
      <p class="tenue">${e.preguntas.length} preguntas${ya[e.id] ? ` · ya la contestaste el ${fmtFecha(ya[e.id])}` : ''}</p>
      <button type="button" class="btn primario" data-accion="abrir" data-id="${esc(e.id)}">Contestar</button></article>`).join('')
      || '<p class="tenue">No hay ninguna encuesta abierta ahora mismo.</p>'}</div>`;
}

export function eventosEncuestas(raiz, repintar) {
  raiz.addEventListener('submit', async (e) => {
    if (estado.vista !== 'encuestas' || e.target.id !== 'form-encuesta') return;
    e.preventDefault();
    const form = e.target;
    const enc = estado.todo.encuestas.find(x => x.id === form.dataset.encuesta);
    const { r, faltan } = leerFormulario(form, enc);
    $$('.pregunta', form).forEach(x => x.classList.remove('falta'));
    if (faltan.length) {
      const primera = $(`[data-pregunta="${CSS.escape(faltan[0].id)}"]`, form);
      avisar(`Falta contestar ${faltan.length === 1 ? 'una pregunta obligatoria' : `${faltan.length} preguntas obligatorias`}: «${esc(faltan[0].texto)}». Contéstala y vuelve a enviar.`, 'mal');
      primera && $('input, textarea', primera)?.focus();
      return;
    }
    const boton = $('button[type=submit]', form);
    boton.disabled = true; boton.textContent = 'Enviando…';
    try {
      await api('responder', { encuesta: enc.id, respuestas: r });
      const ya = respondidas(); ya[enc.id] = new Date().toISOString().slice(0, 10);
      try { localStorage.setItem(RESPONDIDAS, JSON.stringify(ya)); } catch (x) {}
      raiz.innerHTML = `<div class="panel formulario"><h2>Respuesta enviada</h2><p>Gracias. Tu respuesta a «${esc(enc.titulo)}» se ha guardado sin ningún dato tuyo.</p>
        <div class="fila-acciones"><button type="button" class="btn" data-accion="volver">Volver a las encuestas</button></div></div>`;
      estado.ui.encuesta = '';
    } catch (err) {
      avisar(`No se ha enviado la respuesta. ${esc(err.message)}`, 'mal', 0);
      boton.disabled = false; boton.textContent = 'Enviar respuesta';
    }
  });

  const leer = (el) => el.dataset.tipo === 'bool' ? el.checked : el.dataset.tipo === 'lineas' ? el.value.split('\n').map(x => x.trim()).filter(Boolean) : el.value;
  const alCambiar = (e, final) => {
    if (estado.vista !== 'encuestas' || !e.target.dataset.ruta) return;
    const partes = e.target.dataset.ruta.split('.');
    let o = estado.todo; for (const k of partes.slice(0, -1)) o = o[k];
    o[partes.at(-1)] = leer(e.target);
    cambiado();
    if (final && e.target.dataset.estructura) repintar();
  };
  raiz.addEventListener('input', (e) => { if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') alCambiar(e, false); });
  raiz.addEventListener('change', (e) => alCambiar(e, true));

  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'encuestas') return;
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const cfg = estado.todo, a = b.dataset.accion, ei = Number(b.dataset.e), pi = Number(b.dataset.p);
    const u = estado.ui;
    if (a === 'abrir') { u.encuesta = b.dataset.id; repintar(); window.scrollTo(0, 0); return; }
    if (a === 'volver') { u.encuesta = ''; return repintar(); }
    if (a === 'editar') { u.editarEncuestas = true; return repintar(); }
    if (a === 'terminar-edicion') { u.editarEncuestas = false; return repintar(); }
    const enc = cfg.encuestas[ei];
    if (a === 'e-anadir') cfg.encuestas.push({ id: nuevoId('enc'), titulo: 'Nueva encuesta', activa: false, descripcion: '', preguntas: [{ id: nuevoId('p'), tipo: 'unica', texto: 'Nueva pregunta', opciones: ['Sí', 'No'], obligatoria: true }] });
    else if (a === 'e-quitar') {
      if (!(await confirmar('¿Quitar esta encuesta?', `Se quita «${esc(enc.titulo)}» de la página. Las respuestas que ya haya en el servidor no se borran: puedes verlas o borrarlas en Resultados.`, 'Quitar encuesta'))) return;
      cfg.encuestas.splice(ei, 1);
    } else if (a === 'e-subir') [cfg.encuestas[ei - 1], cfg.encuestas[ei]] = [cfg.encuestas[ei], cfg.encuestas[ei - 1]];
    else if (a === 'e-duplicar') { const c = JSON.parse(JSON.stringify(enc)); c.id = nuevoId('enc'); c.titulo += ' (copia)'; c.activa = false; cfg.encuestas.splice(ei + 1, 0, c); }
    else if (a === 'p-anadir') enc.preguntas.push({ id: nuevoId('p'), tipo: 'unica', texto: 'Nueva pregunta', opciones: ['Sí', 'No'], obligatoria: false });
    else if (a === 'p-quitar') enc.preguntas.splice(pi, 1);
    else if (a === 'p-subir') [enc.preguntas[pi - 1], enc.preguntas[pi]] = [enc.preguntas[pi], enc.preguntas[pi - 1]];
    else if (a === 'p-bajar') [enc.preguntas[pi + 1], enc.preguntas[pi]] = [enc.preguntas[pi], enc.preguntas[pi + 1]];
    else return;
    cambiado();
    repintar();
  });
}

// ── Resultados ──────────────────────────────────────────────────────────────
let cache = null; // respuestas descargadas

function barras(filas, total) {
  const max = Math.max(1, ...filas.map(f => f.n));
  return `<div class="barras">${filas.map(f => `<span>${esc(f.etq)}</span>
    <div class="pista" title="${esc(f.etq)}: ${f.n} (${fmtNum(total ? f.n * 100 / total : 0)} %)"><div class="barra-valor" style="width:${(f.n / max) * 100}%"></div></div>
    <span class="cuenta"><b>${f.n}</b> · ${fmtNum(total ? f.n * 100 / total : 0)} %</span>`).join('')}</div>`;
}

function tarjetaPregunta(p, resp) {
  const u = estado.ui;
  const conValor = resp.filter(r => r.r[p.id] !== undefined && r.r[p.id] !== '');
  const n = conValor.length;
  let cuerpo = '';
  if (p.tipo === 'unica' || p.tipo === 'multiple') {
    const cuenta = new Map(p.opciones.map(o => [o, 0]));
    conValor.forEach(r => [].concat(r.r[p.id]).forEach(v => cuenta.set(v, (cuenta.get(v) || 0) + 1)));
    let filas = [...cuenta].map(([etq, c]) => ({ etq, n: c }));
    if (u.resOrden === 'votos') filas.sort((a, b) => b.n - a.n);
    cuerpo = barras(filas, n) + (p.tipo === 'multiple' ? '<p class="tenue" style="margin-top:6px">Se podían marcar varias: los porcentajes son sobre quienes contestaron y pueden sumar más de 100.</p>' : '');
  } else if (p.tipo === 'escala') {
    const filas = [5, 4, 3, 2, 1].map(v => ({ etq: String(v), n: conValor.filter(r => Number(r.r[p.id]) === v).length }));
    const media = n ? conValor.reduce((s, r) => s + Number(r.r[p.id]), 0) / n : 0;
    cuerpo = `<p>Media: <b>${n ? fmtNum(media, 1) : '—'}</b> sobre 5</p>` + barras(u.resOrden === 'votos' ? filas.sort((a, b) => b.n - a.n) : filas, n);
  } else if (p.tipo === 'numero') {
    const v = conValor.map(r => Number(r.r[p.id])).filter(Number.isFinite).sort((a, b) => a - b);
    cuerpo = v.length ? `<p>Media <b>${fmtNum(v.reduce((a, b) => a + b, 0) / v.length, 1)}</b> · mediana <b>${fmtNum(v[Math.floor(v.length / 2)], 1)}</b> · de ${fmtNum(v[0], 1)} a ${fmtNum(v.at(-1), 1)}</p>` : '<p class="tenue">Sin respuestas.</p>';
  } else {
    cuerpo = n ? `<ul class="comentarios">${conValor.map(r => `<li>${esc(r.r[p.id])} <span class="tenue">· ${fmtFecha(r.fecha)}</span></li>`).join('')}</ul>` : '<p class="tenue">Nadie ha escrito nada todavía.</p>';
  }
  return `<article class="panel"><h2>${esc(p.texto)}</h2><p class="tenue">${n} de ${resp.length} respuestas contestan esta pregunta.</p>${cuerpo}</article>`;
}

export async function pintarResultados(raiz, repintar, recargar = false) {
  if (!estado.admin) {
    raiz.innerHTML = `<div class="cabecera"><div><h1>Resultados</h1><p>Los resultados de las encuestas solo los ve la administración de la sección.</p></div></div>
      <div class="panel"><p>Para verlos, inicia sesión en Ajustes con la clave de administración.</p><button type="button" class="btn primario" data-ir="ajustes">Ir a Ajustes</button></div>`;
    return;
  }
  if (!cache || recargar) {
    raiz.innerHTML = '<p class="tenue">Descargando las respuestas…</p>';
    try { cache = (await api('resultados')).respuestas || []; }
    catch (e) { raiz.innerHTML = `<div class="panel"><h2>No se han podido cargar los resultados</h2><p>${esc(e.message)}</p><button type="button" class="btn" data-accion="recargar">Volver a intentarlo</button></div>`; return; }
  }
  const u = estado.ui, cfg = estado.todo;
  const ids = [...new Set([...cfg.encuestas.map(e => e.id), ...cache.map(r => r.encuesta)])];
  if (!u.resEncuesta || !ids.includes(u.resEncuesta)) u.resEncuesta = ids[0] || '';
  const enc = cfg.encuestas.find(e => e.id === u.resEncuesta) || { id: u.resEncuesta, titulo: `Encuesta quitada (${u.resEncuesta})`, preguntas: [] };
  const todas = cache.filter(r => r.encuesta === enc.id);
  const preguntas = enc.preguntas.length ? enc.preguntas : [...new Set(todas.flatMap(r => Object.keys(r.r)))].map(id => ({ id, texto: id, tipo: 'texto', opciones: [] }));
  const filtrables = preguntas.filter(p => p.tipo === 'unica' || p.tipo === 'escala');
  const f = u.resFiltro;
  const pf = filtrables.find(p => p.id === f.pregunta);
  const valoresFiltro = pf ? (pf.tipo === 'escala' ? ['1', '2', '3', '4', '5'] : pf.opciones) : [];
  const resp = pf && f.valor ? todas.filter(r => String(r.r[pf.id]) === f.valor) : todas;
  const nombre = (id) => (cfg.encuestas.find(e => e.id === id) || {}).titulo || `Encuesta quitada (${id})`;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Resultados</h1><p>Respuestas anónimas agregadas. Solo las ve la administración.</p></div>
    <div class="fila-acciones"><button type="button" class="btn" data-accion="recargar">Actualizar</button><button type="button" class="btn" data-accion="csv" ${todas.length ? '' : 'disabled'}>Exportar CSV</button>
      <button type="button" class="btn peligro" data-accion="borrar" ${todas.length ? '' : 'disabled'}>Borrar respuestas</button></div></div>
    <div class="herramientas">
      <div class="grupo"><label for="res-enc" class="etiqueta">Encuesta</label><select id="res-enc">${ids.map(id => `<option value="${esc(id)}" ${id === enc.id ? 'selected' : ''}>${esc(nombre(id))} (${cache.filter(r => r.encuesta === id).length})</option>`).join('')}</select></div>
      <div class="grupo"><label for="res-fp" class="etiqueta">Filtrar por</label><select id="res-fp"><option value="">Sin filtro</option>${filtrables.map(p => `<option value="${esc(p.id)}" ${p.id === f.pregunta ? 'selected' : ''}>${esc(p.texto)}</option>`).join('')}</select>
        ${pf ? `<select id="res-fv" aria-label="Respuesta del filtro"><option value="">Cualquier respuesta</option>${valoresFiltro.map(v => `<option ${String(v) === f.valor ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : ''}</div>
      <div class="grupo" role="group" aria-label="Ordenar opciones"><span class="etiqueta">Ordenar opciones</span>
        <button type="button" class="btn mini" data-accion="orden" data-valor="votos" aria-pressed="${u.resOrden === 'votos'}">Por votos</button>
        <button type="button" class="btn mini" data-accion="orden" data-valor="original" aria-pressed="${u.resOrden === 'original'}">Como en la encuesta</button></div>
    </div>
    <div class="cifras"><div class="cifra"><b>${fmtNum(resp.length)}</b><span>respuestas${resp.length !== todas.length ? ` con el filtro (de ${fmtNum(todas.length)})` : ''}</span></div>
      <div class="cifra"><b>${todas.length ? fmtFecha(todas.map(r => r.fecha).sort().at(-1)) : '—'}</b><span>última respuesta</span></div></div>
    ${resp.length ? preguntas.map(p => tarjetaPregunta(p, resp)).join('') : '<div class="panel"><p class="tenue">Todavía no hay respuestas para esta encuesta o este filtro.</p></div>'}`;
}

export function eventosResultados(raiz, repintar) {
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'resultados') return;
    const u = estado.ui;
    if (e.target.id === 'res-enc') { u.resEncuesta = e.target.value; u.resFiltro = { pregunta: '', valor: '' }; repintar(); }
    if (e.target.id === 'res-fp') { u.resFiltro = { pregunta: e.target.value, valor: '' }; repintar(); }
    if (e.target.id === 'res-fv') { u.resFiltro.valor = e.target.value; repintar(); }
  });
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'resultados') return;
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const u = estado.ui;
    if (b.dataset.accion === 'recargar') return pintarResultados(raiz, repintar, true);
    if (b.dataset.accion === 'orden') { u.resOrden = b.dataset.valor; return repintar(); }
    const enc = estado.todo.encuestas.find(x => x.id === u.resEncuesta) || { id: u.resEncuesta, titulo: u.resEncuesta, preguntas: [] };
    const todas = (cache || []).filter(r => r.encuesta === enc.id);
    if (b.dataset.accion === 'csv') {
      const cols = enc.preguntas.length ? enc.preguntas : [...new Set(todas.flatMap(r => Object.keys(r.r)))].map(id => ({ id, texto: id }));
      const celda = (v) => `"${String(Array.isArray(v) ? v.join(' | ') : v ?? '').replace(/"/g, '""')}"`;
      const csv = [['Fecha', ...cols.map(c => c.texto)].map(celda).join(';'), ...todas.map(r => [r.fecha, ...cols.map(c => r.r[c.id])].map(celda).join(';'))].join('\r\n');
      descargar(`resultados-${enc.id}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    }
    if (b.dataset.accion === 'borrar') {
      if (!(await confirmar('¿Borrar las respuestas?', `Se borran del servidor las ${todas.length} respuestas de «${esc(enc.titulo)}». No se puede deshacer: exporta el CSV antes si lo necesitas.`, 'Borrar respuestas'))) return;
      try { await api('borrar-resultados', { encuesta: enc.id }); avisar('Respuestas borradas.', 'bien'); pintarResultados(raiz, repintar, true); }
      catch (err) { avisar(`No se han borrado. ${esc(err.message)}`, 'mal', 0); }
    }
  });
}
