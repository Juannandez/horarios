// Vista «Equidad»: cómo quedan repartidos fines de semana, noches, festivos, domingos y horas entre las personas
// (como el informe de reparto de Calabrio), quién se sale de lo normal y el botón «Mejorar reparto».
import { estado, esc, fmtNum } from './nucleo.js';
import { equidad } from './equidad.js';
import { COLECTIVOS } from './datos-base.js';
import { mejorarReparto, quitarMejora } from './mejorar.js';

const ui = () => (estado.ui.equidad ||= { colectivo: 'TA', metrica: '', orden: 'desvio' });
const n1 = (x) => fmtNum(x, Number.isInteger(x) ? 0 : 1);

// Histograma: una sola serie (sin leyenda; el título la nombra), barras finas con la punta redondeada, un hueco de
// 2 px entre ellas, la media como línea discontinua, y el valor de cada barra al pasar el ratón.
function histograma(m) {
  if (!m.hist.length) return '<p class="tenue">Sin datos.</p>';
  const W = 320, H = 120, pad = { l: 28, r: 8, t: 8, b: 22 };
  const xs = m.hist.map(h => h.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const paso = 1, nCol = Math.round((x1 - x0) / paso) + 1;
  const ancho = (W - pad.l - pad.r) / nCol, maxN = Math.max(...m.hist.map(h => h.n));
  const y = (n) => H - pad.b - (n / maxN) * (H - pad.t - pad.b);
  const barras = m.hist.map(h => {
    const i = Math.round((h.x - x0) / paso), bx = pad.l + i * ancho + 1, bw = Math.max(2, ancho - 2), by = y(h.n), bh = H - pad.b - by;
    const r = Math.min(4, bw / 2, bh);
    return `<path class="eq-barra" d="M${bx},${H - pad.b} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - r} Q${bx + bw},${by} ${bx + bw},${by + r} V${H - pad.b} Z"><title>${n1(h.x)}${m.k === 'horas' ? ' h' : ''}: ${fmtNum(h.n)} ${h.n === 1 ? 'persona' : 'personas'}</title></path>`;
  }).join('');
  const xm = pad.l + ((m.media - x0) / paso + 0.5) * ancho;
  const etiquetas = [x0, x1].map((v, j) => `<text x="${j ? W - pad.r : pad.l}" y="${H - 6}" text-anchor="${j ? 'end' : 'start'}" class="eq-eje">${n1(v)}${m.k === 'horas' ? ' h' : ''}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="eq-hist" role="img" aria-label="${esc(m.nombre)}: de ${n1(m.min)} a ${n1(m.max)}, media ${n1(m.media)}">
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}" class="eq-base"/>
    <text x="${pad.l - 4}" y="${pad.t + 8}" text-anchor="end" class="eq-eje">${fmtNum(maxN)}</text>
    ${barras}
    <line x1="${xm}" x2="${xm}" y1="${pad.t}" y2="${H - pad.b}" class="eq-media"><title>Media: ${n1(m.media)}</title></line>
    ${etiquetas}</svg>`;
}

export function pintarEquidad(raiz) {
  const { res, cfg } = estado, u = ui();
  const mets = equidad(res, u.colectivo);
  const mej = cfg.mejora;
  const aplicados = res.mejora ? res.mejora.aplicados.length : 0;
  const atipicos = new Map();
  for (const m of mets) if (!u.metrica || u.metrica === m.k) for (const f of m.atipicos) {
    const a = atipicos.get(f.pi) || { f, motivos: [], desvio: 0 };
    a.motivos.push(`${m.corto}: ${n1(f.v[m.k])} (media ${n1(m.media)})`);
    a.desvio = Math.max(a.desvio, Math.abs(f.n[m.k] - m.media) / (m.sd || 1));
    atipicos.set(f.pi, a);
  }
  const lista = [...atipicos.values()].sort(u.orden === 'codigo' ? (a, b) => a.f.id.localeCompare(b.f.id, 'es', { numeric: true }) : (a, b) => b.desvio - a.desvio);
  raiz.innerHTML = `<div class="cabecera"><div><h1>Equidad · ${esc(cfg.nombre)}</h1>
      <p>Cómo quedan repartidos entre las personas los fines de semana, las noches, los festivos, los domingos y las horas. Los valores van en proporción a los días de alta y, las horas, también a la jornada. Quien se aleja de la media más de 1,5 desviaciones (y más de 1 fin de semana, noche, festivo o domingo, o de 7 h) sale abajo.</p></div>
    <div class="fila-acciones">
      ${mej ? '<button type="button" class="btn" data-eq="quitar">Quitar la mejora</button>' : ''}
      <button type="button" class="btn primario" data-eq="mejorar">${mej ? 'Mejorar más' : 'Mejorar reparto'}</button></div></div>
    ${mej ? `<section class="panel"><p style="margin:0"><b>Mejora aplicada</b> (${esc(mej.fecha || '')}): ${fmtNum(aplicados)} intercambios de semanas${res.mejora && res.mejora.saltados ? ` (${fmtNum(res.mejora.saltados)} ya no valen y se han saltado)` : ''}. Desequilibrio ${fmtNum(Math.round(mej.coste0 || 0))} → ${fmtNum(Math.round(res.mejora ? res.mejora.costeFinal : 0))}. La cobertura y las horas de cada persona son las mismas que sin la mejora. Las semanas intercambiadas llevan un borde punteado azul en el cuadrante.</p></section>` : ''}
    <div class="herramientas">
      <div class="grupo segmentado" role="group" aria-label="Colectivo">${COLECTIVOS.map(c => `<button type="button" data-eq-col="${c.id}" aria-pressed="${u.colectivo === c.id}">${esc(c.nombre)}</button>`).join('')}</div>
      <div class="grupo" role="group" aria-label="Métrica"><span class="etiqueta">Atípicos de</span>
        <button type="button" class="btn mini" data-eq-met="" aria-pressed="${!u.metrica}">Todas</button>
        ${mets.map(m => `<button type="button" class="btn mini" data-eq-met="${m.k}" aria-pressed="${u.metrica === m.k}">${esc(m.corto)}</button>`).join('')}</div>
    </div>
    <div class="eq-rejilla">${mets.map(m => `<section class="panel eq-tarjeta">
        <h2>${esc(m.nombre)}</h2>
        <div class="eq-cifras"><span><b>${n1(Math.round(m.media * 10) / 10)}</b> media</span><span><b>${n1(Math.round(m.sd * 10) / 10)}</b> desviación</span><span><b>${n1(Math.round(m.min * 10) / 10)}–${n1(Math.round(m.max * 10) / 10)}</b> rango</span><span><b>${fmtNum(m.atipicos.length)}</b> atípicos</span></div>
        ${histograma(m)}
      </section>`).join('')}</div>
    <section class="panel"><h2>Personas que se salen de lo normal (${fmtNum(lista.length)})</h2>
      <div class="herramientas" style="margin:0 0 8px"><div class="grupo" role="group" aria-label="Ordenar"><span class="etiqueta">Ordenar</span>
        <button type="button" class="btn mini" data-eq-orden="desvio" aria-pressed="${u.orden === 'desvio'}">Más alejadas primero</button>
        <button type="button" class="btn mini" data-eq-orden="codigo" aria-pressed="${u.orden === 'codigo'}">Código</button></div></div>
      ${lista.length ? `<div class="tabla-caja"><table class="tabla-lista"><thead><tr><th scope="col">Persona</th><th scope="col">Grupo</th><th scope="col">Qué se sale</th><th scope="col" class="num">Desviaciones</th></tr></thead><tbody>
        ${lista.map(a => `<tr><th scope="row"><button type="button" class="enlace" data-eq-informe="${a.f.pi}">${esc(a.f.id)}</button>${a.f.nombre ? ` <span class="tenue">${esc(a.f.nombre)}</span>` : ''}</th><td>${esc(a.f.grupo)}</td><td>${a.motivos.map(esc).join(' · ')}</td><td class="num">${fmtNum(a.desvio, 1)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="tenue">Nadie se sale de lo normal.</p>'}
    </section>`;
}

export function eventosEquidad(raiz, repintar, irA) {
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'equidad') return;
    const b = e.target.closest('button'); if (!b) return;
    const u = ui();
    if (b.dataset.eqCol) { u.colectivo = b.dataset.eqCol; return repintar(); }
    if (b.dataset.eqMet != null) { u.metrica = b.dataset.eqMet; return repintar(); }
    if (b.dataset.eqOrden) { u.orden = b.dataset.eqOrden; return repintar(); }
    if (b.dataset.eqInforme) { (estado.ui.informe ||= { pi: 0, buscar: '', comp: '' }).pi = Number(b.dataset.eqInforme); estado.ui.informe.buscar = ''; estado.ui.informe.comp = ''; return irA('informes'); }
    if (b.dataset.eq === 'mejorar') { if (await mejorarReparto()) repintar(); return; }
    if (b.dataset.eq === 'quitar') { quitarMejora(); return repintar(); }
  });
}
