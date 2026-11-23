// Vista «Mi horario» (#mi), pensada para el móvil: el cuadrante de una persona y «Comprobar antes de pedir». La app no
// tramita solicitudes: eso se hace en Portal Horario (el sistema oficial de la Agencia). Aquí se mira antes si lo que se
// va a pedir cubre los mínimos, qué reglas rompería y cómo queda la bolsa, y se copia un resumen para pegarlo allí.
import { estado, esc, $, fmtNum, MESES, DIAS_CORTOS, estiloTurno, avisar, cambiado, descargar } from './nucleo.js';
import { fmtH } from './motor.js';
import { comprobar, resumenSolicitud, TIPOS_SOLICITUD } from './comprobar.js';
import { calendarioICS } from './ics.js';
import { FRANJA_NOMBRE } from './datos-base.js';

export const PORTAL_HORARIO = 'https://www.juntadeandalucia.es/agenciadeserviciossocialesydependencia/controlpresencia/';
const ui = () => (estado.ui.mi ||= { mes: new Date().getMonth(), sol: { tipo: 'cambio', desde: '', hasta: '', companero: '', horas: 2 }, resultado: null });
const claveYo = () => `horarios.yo.${estado.cfg.id}`;
const leerYo = () => { try { return localStorage.getItem(claveYo()) || ''; } catch (e) { return ''; } };
const ponerYo = (id) => { try { localStorage.setItem(claveYo(), id); } catch (e) { /* sin almacenamiento */ } };

function mes(res, pi, m) {
  const D = res.D, dias = res.dias.filter(d => d.mes === m);
  const huecos = (dias[0].dow + 7) % 7;
  return `<div class="mi-mes" role="grid" aria-label="${MESES[m]}">
    ${DIAS_CORTOS.map(x => `<div class="mi-cab" role="columnheader">${x}</div>`).join('')}
    ${'<div></div>'.repeat(huecos)}
    ${dias.map(d => { const t = res.turnos[res.grid[pi * D + d.i]]; return `<div class="mi-dia${d.finde ? ' finde' : ''}${d.festivo ? ' festivo' : ''}" role="gridcell" title="${esc(t.nombre)}${d.festivo ? ` · ${esc(d.festivo)}` : ''}">
      <span class="mi-n">${d.dia}</span><span class="muestra" style="${estiloTurno(t)}">${t.codigo === 'L' ? '·' : esc(t.codigo)}</span></div>`; }).join('')}
  </div>`;
}

function resultado(res, r) {
  if (!r) return '';
  if (r.error) return `<section class="panel"><p class="mal">${esc(r.error)}</p></section>`;
  const x = r.x;
  return `<section class="panel mi-resultado"><h2>${x.viable ? '<span class="pildora si">Se puede pedir</span>' : '<span class="pildora" style="color:var(--bad);border-color:var(--bad)">Revisar antes de pedir</span>'}</h2>
    ${x.sinTurno ? '<p>Ese día no cambia nada: no tiene turno o el compañero tiene el mismo.</p>' : ''}
    <ul class="mi-lista">
      <li>${x.minimosOk ? '✔ Se cubren los mínimos.' : '✖ Deja alguna franja por debajo del mínimo.'}</li>
      <li>${x.reglasOk ? (x.reglas.length ? '⚠ Solo avisos de reglas.' : '✔ No rompe ninguna regla.') : '✖ Rompe una regla que bloquea.'}</li>
      ${x.bolsa ? `<li>${x.bolsa.ok ? '✔' : '✖'} Bolsa: saldo ${fmtH(x.bolsa.saldo)} h, gasta ${fmtH(x.bolsa.gasta)} h, quedan ${fmtH(x.bolsa.queda)} h.</li>` : ''}
    </ul>
    ${x.cobertura.length ? `<div class="tabla-caja" style="max-height:260px"><table class="tabla-lista"><thead><tr><th scope="col">Día</th><th scope="col">Franja</th><th scope="col" class="num">Antes</th><th scope="col" class="num">Después</th><th scope="col" class="num">Mínimo</th><th scope="col" class="num">Aguanta</th></tr></thead><tbody>
      ${x.cobertura.map(c => `<tr class="${c.ok ? (c.justo ? 'justo' : '') : 'mal'}"><td>${esc(c.fecha)}</td><td>${esc(c.colectivo === 'SUP' ? 'Supervisión' : 'Teleasist.')} · ${esc(FRANJA_NOMBRE[c.franja] || c.franja)}</td><td class="num">${c.antes}</td><td class="num"><b>${c.despues}${c.parcial ? ' (sale antes)' : ''}</b></td><td class="num">${c.minimo}</td><td class="num">${c.aguante}</td></tr>`).join('')}
    </tbody></table></div>` : ''}
    ${x.reglas.length ? `<h3>Reglas</h3><ul class="mi-lista">${x.reglas.map(n => `<li>${n.nivel === 'bloquea' ? '✖' : '⚠'} ${esc(n.persona)}: ${esc(n.titulo)} (${esc(n.texto)})</li>`).join('')}</ul>` : ''}
    <p class="tenue">${esc(r.texto)}</p>
    <div class="fila-acciones">
      <a class="btn primario" href="${esc(estado.todo.portalHorario || PORTAL_HORARIO)}" target="_blank" rel="noopener noreferrer">Pedirlo en Portal Horario</a>
      <button type="button" class="btn" data-mi="copiar">Copiar el resumen</button>
      ${estado.admin ? '<button type="button" class="btn" data-mi="anotar" title="Para adpersat o la sección, cuando ya está concedido en Portal Horario">Anotarlo en el cuadrante</button>' : ''}
    </div></section>`;
}

export function pintarMi(raiz) {
  const { res, cfg } = estado, u = ui();
  let yo = leerYo(); if (!res.personas.some(p => p.id === yo)) yo = res.personas[0].id;
  const pi = res.personas.findIndex(p => p.id === yo), p = res.personas[pi];
  const s = u.sol;
  if (!s.desde) { s.desde = res.dias.find(d => d.mes === u.mes)?.fecha || res.dias[0].fecha; }
  const companeros = res.personas.filter(q => q.colectivo === p.colectivo && q.id !== p.id);
  const dSol = res.dias.findIndex(d => d.fecha === s.desde);
  const turnoDe = (q) => (dSol >= 0 ? res.turnos[res.grid[q.pi * res.D + dSol]].codigo : '');
  raiz.innerHTML = `<div class="cabecera"><div><h1>Mi horario · ${esc(cfg.nombre)} ${esc(cfg.anio)}</h1>
      <p>Tu cuadrante y una comprobación antes de pedir un cambio, horas de bolsa o un día. Las solicitudes se tramitan en <a href="${esc(estado.todo.portalHorario || PORTAL_HORARIO)}" target="_blank" rel="noopener noreferrer">Portal Horario</a>.</p></div></div>
    <section class="panel"><div class="campos" style="margin:0">
      <label class="campo"><span>Soy</span><select id="mi-yo">${res.personas.map(q => `<option value="${esc(q.id)}" ${q.id === yo ? 'selected' : ''}>${esc(q.id)}${q.nombre ? ` · ${esc(q.nombre)}` : ''}</option>`).join('')}</select></label>
      <button type="button" class="btn mini" data-mi="ics">Mi calendario (.ics)</button></div>
      <div class="cifras" style="margin-top:12px">
        <div class="cifra"><b>${fmtH(p.horas)} h</b><span>de ${fmtH(p.objetivo)} h de jornada</span></div>
        <div class="cifra"><b>${p.noches}</b><span>noches${p.nochesCedidas ? ` (${p.nochesCedidas} cedidas)` : ''}</span></div>
        <div class="cifra"><b>${p.fines}</b><span>fines de semana</span></div>
        <div class="cifra"><b>${fmtH(p.bolsa ? p.bolsa.saldo : 0)} h</b><span>saldo de bolsa</span></div>
      </div></section>
    <section class="panel"><div class="mi-nav"><button type="button" class="btn mini" data-mi-mes="-1" ${u.mes <= 0 ? 'disabled' : ''} aria-label="Mes anterior">←</button>
      <h2>${MESES[u.mes]}</h2><button type="button" class="btn mini" data-mi-mes="1" ${u.mes >= 11 ? 'disabled' : ''} aria-label="Mes siguiente">→</button></div>
      ${mes(res, pi, u.mes)}</section>
    <section class="panel"><h2>Comprobar antes de pedir</h2>
      <div class="campos">
        <label class="campo"><span>Qué quieres pedir</span><select id="mi-tipo">${TIPOS_SOLICITUD.map(t => `<option value="${t.id}" ${s.tipo === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></label>
        <label class="campo"><span>${['baja', 'ap', 'suelto', 'cambio'].includes(s.tipo) ? 'Desde' : 'Día'}</span><input type="date" id="mi-desde" value="${esc(s.desde)}" min="${res.dias[0].fecha}" max="${res.dias[res.D - 1].fecha}"></label>
        ${['baja', 'ap', 'suelto', 'cambio'].includes(s.tipo) ? `<label class="campo"><span>Hasta (opcional)</span><input type="date" id="mi-hasta" value="${esc(s.hasta || '')}" min="${esc(s.desde)}" max="${res.dias[res.D - 1].fecha}"></label>` : ''}
        ${s.tipo === 'cambio' ? `<label class="campo"><span>Con</span><select id="mi-comp">${companeros.map(q => `<option value="${esc(q.id)}" ${q.id === s.companero ? 'selected' : ''}>${esc(q.id)}${q.nombre ? ` · ${esc(q.nombre)}` : ''} (${esc(turnoDe(q))})</option>`).join('')}</select></label>` : ''}
        ${s.tipo === 'bolsaHoras' ? `<label class="campo"><span>Horas</span><input type="number" id="mi-horas" value="${esc(s.horas)}" min="0.5" max="12" step="0.5" style="width:90px"></label>` : ''}
        <button type="button" class="btn primario" data-mi="comprobar">Comprobar</button>
      </div>
      <p class="tenue">El ${esc(s.desde)} tienes ${esc(dSol >= 0 ? res.turnos[res.grid[pi * res.D + dSol]].nombre : '—')}. Se aplica sobre el cuadrante tal como está: los mínimos, las reglas y tu bolsa.</p>
    </section>
    ${resultado(res, u.resultado)}`;
}

export function eventosMi(raiz, repintar) {
  const leer = () => {
    const u = ui(), s = u.sol;
    s.tipo = $('#mi-tipo', raiz)?.value || s.tipo;
    s.desde = $('#mi-desde', raiz)?.value || s.desde;
    s.hasta = $('#mi-hasta', raiz)?.value || '';
    if ($('#mi-comp', raiz)) s.companero = $('#mi-comp', raiz).value;
    if ($('#mi-horas', raiz)) s.horas = Number($('#mi-horas', raiz).value) || 0;
  };
  raiz.addEventListener('change', (e) => {
    if (estado.vista !== 'mi') return;
    if (e.target.id === 'mi-yo') { ponerYo(e.target.value); ui().resultado = null; return repintar(); }
    if (['mi-tipo', 'mi-desde', 'mi-hasta', 'mi-comp', 'mi-horas'].includes(e.target.id)) { leer(); ui().resultado = null; repintar(); }
  });
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'mi') return;
    const b = e.target.closest('button'); if (!b) return;
    const u = ui(), { res, cfg } = estado;
    if (b.dataset.miMes) { u.mes = Math.min(11, Math.max(0, u.mes + Number(b.dataset.miMes))); return repintar(); }
    const yo = $('#mi-yo', raiz).value;
    if (b.dataset.mi === 'ics') {
      const pi = res.personas.findIndex(p => p.id === yo);
      descargar(`calendario-${cfg.id}-${cfg.anio}-${yo.replace(/\s+/g, '')}.ics`, calendarioICS(res, pi, { titulo: cfg.titulo || '', nombre: res.personas[pi].nombre || '' }), 'text/calendar;charset=utf-8');
      return;
    }
    if (b.dataset.mi === 'comprobar') {
      leer();
      const sol = { ...u.sol, persona: yo };
      try { const x = comprobar(res, cfg, sol); u.resultado = { sol, x, texto: resumenSolicitud(res, sol, x) }; }
      catch (err) { u.resultado = { error: err.message }; }
      return repintar();
    }
    if (b.dataset.mi === 'copiar' && u.resultado && u.resultado.texto) {
      try { await navigator.clipboard.writeText(u.resultado.texto); avisar('Resumen copiado: pégalo en tu solicitud de Portal Horario.', 'bien'); }
      catch (err) { avisar('No se ha podido copiar. Selecciona el texto y cópialo a mano.', 'mal'); }
      return;
    }
    if (b.dataset.mi === 'anotar' && u.resultado && u.resultado.x) {
      // Para adpersat o la sección: lo concedido en Portal Horario se refleja en el cuadrante de la app.
      const { sol, x } = u.resultado;
      if (sol.tipo === 'baja') cfg.cobertura.ausencias.push({ persona: sol.persona, tipo: 'baja', desde: sol.desde, hasta: sol.hasta || sol.desde, nota: '' });
      else for (const c of x.cambios) cfg.manuales[`${res.personas[c.pi].id}|${res.dias[c.d].fecha}`] = res.turnos[c.ti].codigo;
      if (x.bolsa) cfg.cobertura.bolsa.consumida[sol.persona] = Math.round(((Number(cfg.cobertura.bolsa.consumida[sol.persona]) || 0) + x.bolsa.gasta) * 10) / 10;
      u.resultado = null; cambiado({ inmediato: true }); repintar();
      return avisar('Anotado en el cuadrante. Ctrl+Z lo deshace; para que lo vea todo el mundo, guarda en el servidor.', 'bien');
    }
  });
}
