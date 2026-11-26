// Vista Informes: el informe de cada persona (anónima) del cuadrante, con sus cifras, la comprobación de
// cada regla y su calendario. Se descarga en PDF, de una persona, de un grupo o de las que tienen algo a revisar.
import { estado, esc, $, MESES, DIAS_CORTOS, estiloTurno, avisar, descargar } from './nucleo.js';
import { calendarioICS } from './ics.js';
import { analizarPersona } from './informe.js';
import { pdfInformes } from './pdf.js';
import { fmtH } from './motor.js';

const ui = () => (estado.ui.informe ||= { pi: 0, buscar: '', comp: '' });

export function analizarTodas() {
  const { res, cfg } = estado;
  if (estado._informes && estado._informes.res === res) return estado._informes.lista;
  const lista = res.personas.map(p => analizarPersona(res, p.pi, cfg));
  estado._informes = { res, lista };
  return lista;
}

function marca(x) {
  if (x.ok === null) return '<span class="pildora">Dato</span>';
  if (x.ok) return '<span class="pildora si">OK</span>';
  return x.reivindicacion
    ? '<span class="pildora" style="color:var(--warn);border-color:var(--warn)">Propuesta sin cumplir</span>'
    : '<span class="pildora" style="color:var(--bad);border-color:var(--bad)">Revisar</span>';
}
const resumenEstado = (a) => (a.revisar || a.propuestas
  ? [a.revisar ? `${a.revisar} a revisar` : '', a.propuestas ? `${a.propuestas} propuestas sindicales sin cumplir` : ''].filter(Boolean).join(' · ')
  : 'todo en orden');

function calendario(pi) {
  const { res } = estado;
  return `<div class="cal-anio">${res.meses.map(({ mc: mes, mes: mm, anio }) => {
    const m = `${MESES[mm]}${res.meses.length > 12 ? ` ${anio}` : ''}`;
    const dias = res.dias.filter(d => d.mc === mes);
    const vacias = Array.from({ length: dias[0].dow }, () => '<span></span>').join('');
    return `<div class="cal-mes"><b>${m}</b><div class="cal-rejilla">${DIAS_CORTOS.map(d => `<i>${d}</i>`).join('')}${vacias}${dias.map(d => {
      const t = res.turnos[res.grid[pi * res.D + d.i]];
      return `<span style="${t.codigo === 'L' ? '' : estiloTurno(t)}" class="${d.festivo ? 'fest' : ''}" title="${d.dia} de ${m.toLowerCase()}: ${esc(t.nombre)}${d.festivo ? ` · ${esc(d.festivo)}` : ''}">${d.dia}<small>${t.codigo === 'L' ? '' : esc(t.codigo)}</small></span>`;
    }).join('')}</div></div>`;
  }).join('')}</div>`;
}

export function pintarInformes(raiz) {
  const { res, cfg } = estado, u = ui();
  const todas = analizarTodas();
  if (!res.personas[u.pi]) u.pi = 0;
  // Resumen de la sede: cuántas personas tienen cada comprobación a revisar
  const cuenta = new Map();
  for (const a of todas) for (const x of a.comprobaciones) if (x.ok === false) cuenta.set(x.id, { titulo: x.titulo, prop: !!x.reivindicacion, n: (cuenta.get(x.id)?.n || 0) + 1 });
  const q = u.buscar.trim().toLowerCase();
  const visibles = todas.filter(a => (!u.comp || a.comprobaciones.some(x => x.id === u.comp && x.ok === false)) && (!q || a.persona.id.toLowerCase().includes(q) || a.persona.grupoNombre.toLowerCase().includes(q) || (a.persona.nombre || '').toLowerCase().includes(q)));
  if (visibles.length && !visibles.some(a => a.persona.pi === u.pi)) u.pi = visibles[0].persona.pi;
  const a = todas[u.pi], p = a.persona, c = a.cifras;
  const grupos = [...new Set(visibles.map(x => x.persona.grupo))];
  raiz.innerHTML = `<div class="cabecera"><div><h1>Informes · ${esc(cfg.nombre)} ${esc(cfg.anio)}</h1>
      <p>Lo que hace cada persona del cuadrante y si cumple las reglas, con las fechas de lo que falla. Las personas son anónimas.</p></div>
    <div class="fila-acciones">
      <button type="button" class="btn primario" data-pdf="persona">PDF de ${esc(p.id)}</button>
      <button type="button" class="btn" data-ics="persona" title="Su año en un archivo de calendario: se abre en Google Calendar, el iPhone u Outlook">Calendario (.ics)</button>
      <button type="button" class="btn" data-pdf="grupo">PDF del grupo ${esc(p.grupoNombre)}</button>
      <button type="button" class="btn" data-pdf="lista" ${visibles.length ? '' : 'disabled'}>PDF de la lista (${visibles.length})</button>
    </div></div>

    <section class="panel"><h2>Toda la sede</h2>
      <p class="tenue">${todas.filter(x => x.revisar).length} de ${todas.length} personas tienen algo que revisar según la normativa, y ${todas.filter(x => x.propuestas).length} no cumplen alguna propuesta sindical. Pulsa una comprobación para ver solo esas personas.</p>
      <div class="fila-acciones" style="margin-top:0">
        <button type="button" class="btn mini" data-comp="" aria-pressed="${!u.comp}">Todas</button>
        ${[...cuenta].sort((x, y) => y[1].n - x[1].n).map(([id, v]) => `<button type="button" class="btn mini" data-comp="${id}" aria-pressed="${u.comp === id}">${v.prop ? 'Propuesta · ' : ''}${esc(v.titulo)}: ${v.n}</button>`).join('')}
      </div></section>

    <div class="herramientas">
      <div class="grupo"><label class="etiqueta" for="inf-persona">Persona</label>
        <select id="inf-persona">${grupos.map(g => `<optgroup label="${esc(todas.find(x => x.persona.grupo === g).persona.grupoNombre)}">${visibles.filter(x => x.persona.grupo === g).map(x =>
          `<option value="${x.persona.pi}" ${x.persona.pi === u.pi ? 'selected' : ''}>${esc(x.persona.id)}${x.persona.nombre ? ` · ${esc(x.persona.nombre)}` : ''}${x.revisar ? ` · ${x.revisar} a revisar` : ''}</option>`).join('')}</optgroup>`).join('')}</select>
        <button type="button" class="btn mini" data-mover="-1">Anterior</button><button type="button" class="btn mini" data-mover="1">Siguiente</button></div>
      <div class="grupo"><label class="oculto" for="inf-buscar">Filtrar</label><input type="text" id="inf-buscar" placeholder="Filtrar por código o grupo" value="${esc(u.buscar)}"></div>
    </div>

    <section class="panel"><h2>${p.nombre ? `${esc(p.nombre)} · ` : ''}${esc(p.id)} · ${esc(p.grupoNombre)}</h2>
      ${p.nombre ? `<p class="tenue">Turno actual: ${esc(p.turnoActual || 'sin dato')} · ${p.horasSemana < 35 ? `jornada de ${p.horasSemana} h semanales` : 'jornada completa'}${p.exentoNoches ? ' · exenta de noches' : ''}. Informe con datos personales: no lo compartas fuera de quien corresponda.</p>` : ''}
      <div class="cifras" style="margin-top:12px">
        <div class="cifra ${Math.abs(p.diferencia) > 7 || p.diferencia < 0 ? 'mal' : ''}"><b>${fmtH(p.horas)} h</b><span>de ${fmtH(p.objetivo)} h de jornada (${p.diferencia >= 0 ? '+' : '−'}${fmtH(Math.abs(p.diferencia))} h)${p.horasAJ ? `; incluye ${fmtH(p.horasAJ)} h de los días AJ` : ''}</span></div>
        <div class="cifra"><b>${c.trabajados}</b><span>días trabajados: ${c.mananas} mañanas, ${c.tardes} tardes y ${c.noches} noches</span></div>
        <div class="cifra"><b>${c.fines}</b><span>fines de semana con algún turno</span></div>
        <div class="cifra"><b>${c.vacaciones + c.libres + c.descansoExceso + c.salientes}</b><span>días sin trabajar: ${c.vacaciones} de vacaciones, ${c.libres} libres, ${c.descansoExceso} por exceso de jornada y ${c.salientes} salientes de noche</span></div>
        ${p.bolsa ? `<div class="cifra"><b>${fmtH(p.bolsa.saldo)} h</b><span>saldo de bolsa: ${fmtH(p.bolsa.inicial)} de partida + ${fmtH(p.bolsa.aFavor)} a favor en el cuadrante − ${fmtH(p.bolsa.consumida)} ya cogidas</span></div>` : ''}
        ${p.nochesCedidas ? `<div class="cifra"><b>${p.nochesCedidas}</b><span>noches cedidas (por encima de las de oficio; tope ${p.topeNoches})</span></div>` : ''}
        ${p.diasAusencia ? `<div class="cifra"><b>${p.diasAusencia}</b><span>días de baja o ausencia (jornada prorrateada)</span></div>` : ''}
      </div>
      <h3 style="margin:8px 0">Comprobaciones: ${resumenEstado(a)}</h3>
      <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Estado</th><th scope="col">Qué se comprueba</th><th scope="col">Resultado</th><th scope="col">Fuente</th></tr></thead><tbody>
        ${a.comprobaciones.map(x => `<tr><td>${marca(x)}</td><td><b>${esc(x.titulo)}</b></td><td>${esc(x.resumen)}${x.fechas.length ? `<details><summary>${x.fechas.length} fechas</summary><ul class="comentarios">${x.fechas.map(f => `<li>${esc(f)}</li>`).join('')}</ul></details>` : ''}</td><td class="tenue">${esc(x.norma)}${(x.normas || []).length ? `<br>${x.normas.map(n => `<button type="button" class="btn mini" data-norma="${esc(n)}" title="Ver en Normativa">${esc(n)}</button>`).join(' ')}` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <h3 style="margin:16px 0 8px">Calendario</h3>${calendario(u.pi)}
    </section>`;
}

export function eventosInformes(raiz, repintar) {
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'informes') return;
    const b = e.target.closest('button'); if (!b) return;
    const u = ui();
    if (b.dataset.comp != null) { u.comp = b.dataset.comp; return repintar(); }
    if (b.dataset.norma) { (estado.ui.normativa ||= {}).buscar = b.dataset.norma; location.hash = '#normativa'; return; }
    if (b.dataset.mover) {
      const op = [...$('#inf-persona', raiz).options].map(o => Number(o.value));
      const i = op.indexOf(u.pi) + Number(b.dataset.mover);
      if (op[i] != null) { u.pi = op[i]; repintar(); }
      return;
    }
    if (b.dataset.ics) {
      const { res, cfg } = estado, p = res.personas[u.pi];
      descargar(`calendario-${cfg.id}-${cfg.anio}-${p.id.replace(/\s+/g, '')}.ics`, calendarioICS(res, u.pi, { titulo: cfg.titulo || '', nombre: p.nombre || '' }), 'text/calendar;charset=utf-8');
      return avisar(`Calendario de ${esc(p.id)} descargado: ábrelo en el móvil o impórtalo en Google Calendar u Outlook. Si cambia el cuadrante, vuelve a descargarlo.`, 'bien');
    }
    if (b.dataset.pdf) {
      const { res, cfg } = estado, todas = analizarTodas();
      const q = u.buscar.trim().toLowerCase();
      let pis = [u.pi], nombre = `informe-${cfg.id}-${cfg.anio}-${res.personas[u.pi].id.replace(/\s+/g, '')}.pdf`;
      if (b.dataset.pdf === 'grupo') { const g = res.personas[u.pi].grupo; pis = res.personas.filter(p => p.grupo === g).map(p => p.pi); nombre = `informes-${cfg.id}-${cfg.anio}-${g}.pdf`; }
      if (b.dataset.pdf === 'lista') { pis = todas.filter(a => (!u.comp || a.comprobaciones.some(x => x.id === u.comp && x.ok === false)) && (!q || a.persona.id.toLowerCase().includes(q) || a.persona.grupoNombre.toLowerCase().includes(q))).map(a => a.persona.pi); nombre = `informes-${cfg.id}-${cfg.anio}-lista.pdf`; }
      const texto = b.textContent; b.disabled = true; b.textContent = `Generando ${pis.length} ${pis.length === 1 ? 'informe' : 'informes'}…`;
      try { await pdfInformes({ res, cfg, pis, nombreFichero: nombre }); avisar(`PDF descargado: ${pis.length} ${pis.length === 1 ? 'informe' : 'informes'}.`, 'bien'); }
      catch (err) { avisar(`No se ha generado el PDF. ${esc(err.message)}`, 'mal', 0); }
      b.disabled = false; b.textContent = texto;
    }
  });
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'informes') return;
    if (e.target.id === 'inf-persona') { ui().pi = Number(e.target.value); repintar(); }
  });
  let t = 0;
  raiz.addEventListener('input', (e) => {
    if (estado.vista !== 'informes' || e.target.id !== 'inf-buscar') return;
    clearTimeout(t); t = setTimeout(() => { ui().buscar = e.target.value; repintar(); setTimeout(() => { const i = $('#inf-buscar'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 250);
  });
}
