// Vista Vacaciones: periodos estivales con sus plazas, la solicitud de cada persona (por código anónimo), el sorteo y
// el resultado. Las solicitudes se escriben aquí o se importan de un CSV; la app no lee correos.
import { estado, esc, $, $$, cambiado, avisar, confirmar, descargar, fmtFecha, fmtNum } from './nucleo.js';
import { diasHabiles, diasNaturales } from './vacaciones.js';

const MOTIVO_CORTO = (m) => (m || '').replace('Periodo pedido (ganó el sorteo)', 'Pedido, ganó el sorteo').replace('Periodo pedido (con preferencia)', 'Pedido, con preferencia');
const fechaCorta = (iso) => (iso ? `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}` : '');

function filas(vac, res) {
  const u = (estado.ui.vac ||= { buscar: '', colectivo: 'todos', solo: '' });
  const q = u.buscar.trim().toLowerCase();
  const sol = vac.solicitudes;
  return res.personas.filter(p => (u.colectivo === 'todos' || p.colectivo === u.colectivo) && (!q || p.id.toLowerCase().includes(q))
    && (!u.solo || (u.solo === 'con' ? sol[p.id] && sol[p.id].periodo : u.solo === 'cambio' ? /^Cambio por sorteo/.test(res.vacaciones?.porPersona.get(p.id)?.motivo || '') : !(sol[p.id] && sol[p.id].periodo))));
}

export function pintarVacaciones(raiz) {
  const { cfg, res } = estado, vac = cfg.vacaciones, u = (estado.ui.vac ||= { buscar: '', colectivo: 'todos', solo: '' });
  const fest = new Set((estado.festivos?.lista || []).map(f => f.fecha));
  const r = res.vacaciones;
  const porPeriodo = r ? new Map(r.periodos.map(p => [p.n, p])) : new Map();
  const lista = filas(vac, res);
  const nSol = Object.values(vac.solicitudes).filter(s => s && s.periodo).length;
  const opcPeriodo = (sel) => `<option value="">Sin solicitud</option>${vac.periodos.map(p => `<option value="${p.n}" ${String(sel) === String(p.n) ? 'selected' : ''}>${p.n}: ${fechaCorta(p.inicio)}-${fechaCorta(p.fin)}</option>`).join('')}<option value="fuera" ${sel === 'fuera' ? 'selected' : ''}>Fuera de periodo</option>`;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Vacaciones · ${esc(cfg.nombre)} ${esc(cfg.anio)}</h1>
      <p>Vacaciones estivales por periodos, como las organiza Procesos horarios: cada persona pide un periodo, se respetan las plazas y, si un periodo se llena, se sortea.</p></div>
    <div class="fila-acciones" style="margin:0">
      <label class="btn" for="vac-importar">Importar solicitudes (CSV)</label><input type="file" id="vac-importar" accept=".csv,text/csv" class="oculto">
      <button type="button" class="btn" data-vac="plantilla">Plantilla CSV</button>
      <button type="button" class="btn" data-vac="exportar">Exportar resultado (CSV)</button></div></div>

    <section class="panel"><h2>Cómo se reparten</h2>
      <div class="campos" style="margin-top:0">
        <label class="casilla"><input type="radio" name="vac-modo" value="periodos" ${vac.modo === 'periodos' ? 'checked' : ''}> Por periodos y solicitudes</label>
        <label class="casilla"><input type="radio" name="vac-modo" value="escalonado" ${vac.modo !== 'periodos' ? 'checked' : ''}> Escalonadas automáticas por grupo (Parámetros → Grupos)</label>
      </div>
      ${vac.modo === 'periodos' ? `<div class="campos">
        <label class="campo"><span>Días hábiles del periodo</span><input type="number" min="1" max="30" data-vac-campo="diasHabiles" data-tipo="num" value="${esc(vac.diasHabiles)}"></label>
        <label class="campo"><span>Días sueltos fuera del cuadrante</span><input type="number" min="0" max="15" data-vac-campo="diasSueltos" data-tipo="num" value="${esc(vac.diasSueltos)}"></label>
        <label class="campo" title="Protocolo de vacaciones: 1. Los sindicatos piden más. Sale en el informe de cada persona."><span>Días sueltos como mucho entre el 1-oct y el 22-dic</span><input type="number" min="0" max="15" data-vac-campo="sueltosOctDic" data-tipo="num" value="${esc(vac.sueltosOctDic ?? 1)}"></label>
        <label class="campo"><span>Semilla del sorteo</span><input type="text" data-vac-campo="semilla" value="${esc(vac.semilla)}" style="width:160px"></label>
        <button type="button" class="btn mini" data-vac="nuevo-sorteo">Sortear de nuevo</button>
      </div>
      <label class="casilla" style="margin-top:8px"><input type="checkbox" data-vac-campo="sueltosEnJornada" data-tipo="bool" ${vac.sueltosEnJornada ? 'checked' : ''}><span>Sumar los días sueltos a la jornada del cuadrante</span></label>
      <p class="tenue" style="margin-top:8px">Los días sueltos (hasta los 22 del año) se piden durante el año y no van en el cuadrante. ${vac.sueltosEnJornada
        ? `Ahora sus horas (${esc(vac.diasSueltos * (vac.horasDia || 7))} h) se suman a la jornada a planificar, como en el cuadrante real de 2027 (1.480,5 + 35 h = 1.519 h planificadas), y luego cada persona cambia esos turnos por días libres.`
        : 'Ahora la jornada a planificar es la del convenio (1.480,5 h en Sevilla, 1.494,5 h en Málaga): los días sueltos se restan cuando cada persona los pide. Si marcas la casilla, se suman a la jornada, como en el cuadrante real de 2027.'} La semilla hace que el sorteo se pueda repetir y comprobar: con la misma semilla sale siempre el mismo resultado.${vac.nota ? ` ${esc(vac.nota)}` : ''}</p>` : ''}
    </section>

    ${vac.modo === 'periodos' ? `<section class="panel"><h2>Periodos y plazas</h2>
      <div class="tabla-caja" style="max-height:none"><table class="tabla-lista"><thead><tr><th scope="col">Nº</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col" class="num">Naturales</th><th scope="col" class="num">Hábiles</th>
        <th scope="col" class="num">Plazas teleasist.</th><th scope="col" class="num">Plazas superv.</th><th scope="col" class="num">Piden</th><th scope="col" class="num">Asignadas</th><th scope="col"></th></tr></thead><tbody>
        ${vac.periodos.map((p, i) => { const e = porPeriodo.get(p.n); const lleno = e && (e.pedidas.TA + e.pedidas.SUP) > (e.plazas.TA + e.plazas.SUP);
          return `<tr><td>${p.n}</td>
          <td><input type="date" data-vac-per="${i}" data-k="inicio" value="${esc(p.inicio)}" aria-label="Inicio del periodo ${p.n}"></td>
          <td><input type="date" data-vac-per="${i}" data-k="fin" value="${esc(p.fin)}" aria-label="Fin del periodo ${p.n}"></td>
          <td class="num">${p.inicio && p.fin ? diasNaturales(p.inicio, p.fin) : '—'}</td><td class="num">${p.inicio && p.fin ? diasHabiles(p.inicio, p.fin, fest) : '—'}</td>
          <td class="num"><input type="number" min="0" data-vac-per="${i}" data-k="TA" value="${esc(p.plazas.TA)}" aria-label="Plazas de teleasistencia"></td>
          <td class="num"><input type="number" min="0" data-vac-per="${i}" data-k="SUP" value="${esc(p.plazas.SUP)}" aria-label="Plazas de supervisión"></td>
          <td class="num" style="${lleno ? 'color:var(--bad);font-weight:600' : ''}">${e ? e.pedidas.TA + e.pedidas.SUP : 0}${lleno ? ' · sorteo' : ''}</td>
          <td class="num">${e ? `${e.asignadas.TA + e.asignadas.SUP} de ${e.plazas.TA + e.plazas.SUP}` : '—'}</td>
          <td class="num"><button type="button" class="btn mini peligro" data-vac="quitar-periodo" data-i="${i}">Quitar</button></td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="fila-acciones"><button type="button" class="btn" data-vac="anadir-periodo">Añadir periodo</button></div>
      ${r && r.sinPlaza.length ? `<p class="banda mal">${r.sinPlaza.length} personas no caben en ningún periodo: añade plazas o periodos.</p>` : ''}
    </section>

    ${r && r.sorteo.length ? `<section class="panel"><h2>Sorteos</h2><p class="tenue">Periodos con más peticiones que plazas. Orden de salida del sorteo: las primeras se quedan el periodo; las demás eligen, por este orden, entre los periodos de menor demanda.</p>
      ${r.sorteo.map(x => `<details><summary>Periodo ${x.periodo}: ${esc(x.detalle)}</summary><p class="tenue">${x.orden.map((c, i) => `${i + 1}. ${esc(c)}`).join(' · ')}</p></details>`).join('')}</section>` : ''}

    <section class="panel"><h2>Solicitudes (${nSol} de ${res.P})</h2>
      <p class="tenue">Una fila por persona, con su código anónimo. Para una pareja, escribe en «Pareja» el código de la otra persona: van en una sola solicitud y el sorteo vale para las dos.</p>
      <div class="herramientas" style="margin-top:8px">
        <div class="grupo"><label class="oculto" for="vac-buscar">Buscar</label><input type="text" id="vac-buscar" placeholder="Buscar código" value="${esc(u.buscar)}" style="width:160px">
          <select id="vac-col" aria-label="Colectivo"><option value="todos">Todos</option><option value="TA" ${u.colectivo === 'TA' ? 'selected' : ''}>Teleasistentes</option><option value="SUP" ${u.colectivo === 'SUP' ? 'selected' : ''}>Supervisores</option></select>
          <select id="vac-solo" aria-label="Mostrar"><option value="">Todas</option><option value="con" ${u.solo === 'con' ? 'selected' : ''}>Con solicitud</option><option value="sin" ${u.solo === 'sin' ? 'selected' : ''}>Sin solicitud</option><option value="cambio" ${u.solo === 'cambio' ? 'selected' : ''}>Cambiadas por sorteo</option></select></div>
      </div>
      <datalist id="vac-codigos">${res.personas.map(p => `<option value="${esc(p.id)}">`).join('')}</datalist>
      <div class="tabla-caja"><table class="tabla-lista"><thead><tr><th scope="col">Persona</th><th scope="col">Pide</th><th scope="col">Fechas (fuera)</th><th scope="col" class="num">Días</th><th scope="col">Ajuste</th>
        <th scope="col">Exenta</th><th scope="col">Igualdad 5.7</th><th scope="col">Pareja</th><th scope="col">Le toca</th></tr></thead><tbody>
        ${lista.map(p => { const s = vac.solicitudes[p.id] || {}; const a = r?.porPersona.get(p.id);
          return `<tr><th scope="row">${esc(p.id)}</th>
          <td><select data-vac-sol="${esc(p.id)}" data-k="periodo" aria-label="Periodo que pide ${esc(p.id)}">${opcPeriodo(s.periodo ?? '')}</select></td>
          <td>${s.periodo === 'fuera' ? `<input type="date" data-vac-sol="${esc(p.id)}" data-k="inicio" value="${esc(s.inicio || '')}" aria-label="Desde"> <input type="date" data-vac-sol="${esc(p.id)}" data-k="fin" value="${esc(s.fin || '')}" aria-label="Hasta">` : '<span class="tenue">—</span>'}</td>
          <td class="num"><input type="number" min="12" max="${esc(vac.diasHabiles)}" data-vac-sol="${esc(p.id)}" data-k="dias" data-tipo="num" value="${esc(s.dias || vac.diasHabiles)}" aria-label="Días hábiles" style="width:64px"></td>
          <td><select data-vac-sol="${esc(p.id)}" data-k="ajuste" aria-label="Dónde se quitan los días">${[['final', 'Al final'], ['inicio', 'Al principio'], ['ambos', 'En ambos']].map(([v, t]) => `<option value="${v}" ${(s.ajuste || 'final') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-vac-sol="${esc(p.id)}" data-k="exento" data-tipo="bool" ${s.exento ? 'checked' : ''} aria-label="Exenta de sorteo por el de 2026"></td>
          <td><input type="checkbox" data-vac-sol="${esc(p.id)}" data-k="igualdad" data-tipo="bool" ${s.igualdad ? 'checked' : ''} aria-label="Medida 5.7 del Plan de Igualdad"></td>
          <td><input type="text" list="vac-codigos" data-vac-sol="${esc(p.id)}" data-k="pareja" value="${esc(s.pareja || '')}" style="width:96px" aria-label="Código de la pareja"></td>
          <td>${a ? `<b>${a.periodo === 'fuera' ? 'Fuera' : `Periodo ${a.periodo}`}</b> · ${fechaCorta(a.inicio)}-${fechaCorta(a.fin)}<br><span class="tenue">${esc(MOTIVO_CORTO(a.motivo))}</span>` : vac.modo === 'periodos' ? '<span style="color:var(--bad)">Sin plaza</span>' : '<span class="tenue">Escalonadas</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>
    </section>` : ''}

    <section class="panel"><h2>Cómo se piden (correo de Procesos horarios)</h2>
      <ul>
        <li>Cada persona elige un periodo y manda un correo a Procesos horarios con el asunto «VACACIONES ESTIVALES ${esc(cfg.anio)} (Nº PERIODO ELEGIDO)». Plazo: hasta el 30 de abril a las 08:00.</li>
        <li>Quien no conteste o lo haga fuera de plazo va a los periodos con vacantes, después de la asignación.</li>
        <li>Se pueden pedir fechas fuera de los periodos, o disfrutar de 12 a 16 días en lugar de 17, diciendo dónde se quitan (al principio, al final o en ambos).</li>
        <li>Si un periodo tiene más peticiones que plazas, se sortea. Quien sale en el sorteo elige, por orden de salida, entre los periodos no escogidos o de menor demanda.</li>
        <li>Las parejas del SAT pueden pedir juntas: el sorteo vale para las dos. Entre puestos distintos, el orden es supervisión, teleoperación y teleasistencia.</li>
        <li>Quien tuvo que cambiar de periodo en el sorteo del año anterior no entra en sorteo y tiene preferencia. También la medida 5.7 del Plan de Igualdad, con documentación.</li>
      </ul>
      <p class="tenue">Esta página no lee el correo: las peticiones llegan a un buzón de la empresa y llevan nombres. Sirve para simular el reparto con los códigos anónimos del cuadrante, o para meter las peticiones que la sección conozca.</p>
    </section>`;
}

const CABECERA_CSV = ['codigo', 'periodo', 'dias', 'ajuste', 'exenta', 'igualdad57', 'pareja', 'inicio', 'fin'];

export function eventosVacaciones(raiz, repintar) {
  const vac = () => estado.cfg.vacaciones;
  const guardar = () => { cambiado({ inmediato: true }); };
  raiz.addEventListener('change', async (e) => {
    if (estado.vista !== 'vacaciones') return;
    const el = e.target, v = vac();
    if (el.name === 'vac-modo') { v.modo = el.value; guardar(); return; }
    if (el.dataset.vacCampo) { v[el.dataset.vacCampo] = el.dataset.tipo === 'num' ? Number(el.value) : el.dataset.tipo === 'bool' ? el.checked : el.value; guardar(); return; }
    if (el.dataset.vacPer != null) {
      const p = v.periodos[Number(el.dataset.vacPer)], k = el.dataset.k;
      if (k === 'TA' || k === 'SUP') p.plazas[k] = Math.max(0, Number(el.value) || 0); else p[k] = el.value;
      guardar(); return;
    }
    if (el.dataset.vacSol) {
      const id = el.dataset.vacSol, k = el.dataset.k;
      const s = (v.solicitudes[id] ||= {});
      s[k] = el.dataset.tipo === 'bool' ? el.checked : el.dataset.tipo === 'num' ? Number(el.value) : el.value.trim();
      if (k === 'periodo' && s.periodo && s.periodo !== 'fuera') s.periodo = Number(s.periodo);
      if (!s.periodo && !s.exento && !s.igualdad && !s.pareja) delete v.solicitudes[id];
      guardar(); return;
    }
    const u = estado.ui.vac;
    if (el.id === 'vac-col') { u.colectivo = el.value; repintar(); }
    if (el.id === 'vac-solo') { u.solo = el.value; repintar(); }
    if (el.id === 'vac-importar' && el.files[0]) {
      try {
        const texto = await el.files[0].text();
        const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
        const sep = lineas[0].includes(';') ? ';' : ',';
        const cab = lineas[0].split(sep).map(c => c.trim().toLowerCase().replace(/"/g, ''));
        const col = (n) => cab.indexOf(n);
        if (col('codigo') < 0 || col('periodo') < 0) throw new Error('faltan las columnas «codigo» y «periodo»');
        const ids = new Set(estado.res.personas.map(p => p.id));
        let n = 0, malos = 0;
        for (const l of lineas.slice(1)) {
          const c = l.split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
          const id = c[col('codigo')];
          if (!ids.has(id)) { malos++; continue; }
          const per = c[col('periodo')];
          const s = { periodo: per === 'fuera' ? 'fuera' : per ? Number(per) : '' };
          if (col('dias') >= 0 && c[col('dias')]) s.dias = Number(c[col('dias')]);
          if (col('ajuste') >= 0 && c[col('ajuste')]) s.ajuste = c[col('ajuste')];
          if (col('exenta') >= 0) s.exento = /^(s[ií]|1|x|true)$/i.test(c[col('exenta')] || '');
          if (col('igualdad57') >= 0) s.igualdad = /^(s[ií]|1|x|true)$/i.test(c[col('igualdad57')] || '');
          if (col('pareja') >= 0 && c[col('pareja')]) s.pareja = c[col('pareja')];
          if (col('inicio') >= 0 && c[col('inicio')]) s.inicio = c[col('inicio')];
          if (col('fin') >= 0 && c[col('fin')]) s.fin = c[col('fin')];
          v.solicitudes[id] = s; n++;
        }
        guardar();
        avisar(`Importadas ${n} solicitudes.${malos ? ` ${malos} filas con un código que no existe en el cuadrante se han saltado.` : ''}`, malos ? '' : 'bien');
      } catch (err) { avisar(`No se ha podido importar: ${esc(err.message)}. Usa la plantilla CSV.`, 'mal', 0); }
      el.value = '';
    }
  });
  let t = 0;
  raiz.addEventListener('input', (e) => {
    if (estado.vista !== 'vacaciones' || e.target.id !== 'vac-buscar') return;
    clearTimeout(t); t = setTimeout(() => { estado.ui.vac.buscar = e.target.value; repintar(); const i = $('#vac-buscar'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
  });
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'vacaciones') return;
    const b = e.target.closest('button[data-vac]'); if (!b) return;
    const v = vac(), a = b.dataset.vac;
    if (a === 'anadir-periodo') {
      const ult = v.periodos[v.periodos.length - 1];
      const mas = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
      v.periodos.push({ n: (ult?.n || 0) + 1, inicio: ult ? mas(ult.inicio, 7) : `${estado.cfg.anio}-06-21`, fin: ult ? mas(ult.fin, 7) : `${estado.cfg.anio}-07-13`, plazas: { ...(ult?.plazas || { TA: 0, SUP: 0 }) } });
      guardar();
    } else if (a === 'quitar-periodo') {
      const p = v.periodos[Number(b.dataset.i)];
      const piden = Object.values(v.solicitudes).filter(s => String(s.periodo) === String(p.n)).length;
      if (piden && !(await confirmar('¿Quitar este periodo?', `${piden} personas piden el periodo ${p.n}. Se quedarán sin solicitud y pasarán a los periodos con vacantes.`, 'Quitar periodo'))) return;
      v.periodos.splice(Number(b.dataset.i), 1);
      for (const s of Object.values(v.solicitudes)) if (String(s.periodo) === String(p.n)) s.periodo = '';
      guardar();
    } else if (a === 'nuevo-sorteo') {
      v.semilla = `sorteo-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}`; guardar();
      avisar('Sorteo repetido con otra semilla. Para volver al anterior, escribe su semilla.');
    } else if (a === 'plantilla') {
      const ej = estado.res.personas.slice(0, 3).map((p, i) => [p.id, [3, 'fuera', 6][i], i === 2 ? 14 : '', i === 2 ? 'inicio' : '', i === 0 ? 'si' : '', '', i === 0 ? estado.res.personas[5]?.id || '' : '', i === 1 ? `${estado.cfg.anio}-10-04` : '', i === 1 ? `${estado.cfg.anio}-10-22` : '']);
      descargar(`plantilla-vacaciones-${estado.cfg.id}.csv`, '﻿' + [CABECERA_CSV, ...ej].map(f => f.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    } else if (a === 'exportar') {
      const r = estado.res.vacaciones; if (!r) return avisar('Las vacaciones están en modo escalonado: no hay reparto por periodos que exportar.');
      const filas = [['codigo', 'colectivo', 'pide', 'le_toca', 'inicio', 'fin', 'motivo']];
      for (const p of estado.res.personas) { const x = r.porPersona.get(p.id); const s = v.solicitudes[p.id] || {}; filas.push([p.id, p.colectivo, s.periodo || '', x ? x.periodo : 'sin plaza', x?.inicio || '', x?.fin || '', x?.motivo || '']); }
      descargar(`vacaciones-${estado.cfg.id}-${estado.cfg.anio}.csv`, '﻿' + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    }
  });
}
