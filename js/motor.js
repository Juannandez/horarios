// Motor del cuadrante. No toca la página: recibe la configuración y devuelve el cuadrante.
//
// Pasos (modo mixto):
//   1. Ciclo: cada grupo repite su patrón de semanas; cada persona empieza en una semana distinta
//      del ciclo (desfase), para que el grupo quede repartido.
//   2. Vacaciones: un bloque por persona, escalonado dentro de la ventana del grupo.
//   3. Cambios a mano: mandan sobre todo lo demás y el ajuste no los toca.
//   4. Recorte de horas: si alguien pasa de su objetivo anual, se le quitan días donde sobra gente
//      (primero festivos, luego fines de semana). Nadie baja de su objetivo.
//   5. Cobertura: donde falta gente frente al mínimo, se mueve a alguien de otra franja del mismo día
//      que vaya sobrada y, si no se puede, se llama a alguien que libra. Siempre respetando las reglas.
//   6. Se repite el recorte para compensar las horas añadidas.
//   Teleasistentes primero; luego supervisores, cuyo mínimo sube con la ratio 1:N.

import { calcularFestivos } from './festivos.js';
import { asignarVacaciones } from './vacaciones.js';
import { nivelRegla } from './datos-base.js';
import { casoEspecial } from './contratos.js';

export const ORIGEN = { CICLO: 0, VACACIONES: 1, CUBRE: 2, RECORTE: 3, MANUAL: 4, MEJORA: 5, AUSENCIA: 6 };
const FR = ['manana', 'tarde', 'noche'];
const COL = ['TA', 'SUP'];
const CODIGO_RECORTE = 'D';
const SALTO = 151; // primo: recorre todos los días del año sin repetir

const minutos = (hhmm) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function prepararTurno(t) {
  const trabaja = t.franja !== 'libre';
  // ini y fm: minutos desde las 00:00 del día del turno (fm pasa de 1440 si acaba al día siguiente).
  let ini = minutos(t.inicio), fm = minutos(t.fin);
  if (!trabaja || ini == null || fm == null) return { ...t, trabaja, ini: 0, fm: 0, horas: 0 };
  if (fm <= ini) fm += 1440;
  return { ...t, trabaja, ini, fm, horas: (fm - ini) / 60 };
}

const pad = (n, w) => String(n).padStart(w, '0');
export const isoFecha = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;

export function calendario(anio, festivos = []) {
  const fest = new Map(festivos.filter(f => f && f.fecha).map(f => [f.fecha, f.nombre || 'Festivo']));
  const dias = [];
  const ini = new Date(Date.UTC(anio, 0, 1));
  const dowIni = (ini.getUTCDay() + 6) % 7;              // 0 = lunes
  for (let dt = new Date(ini); dt.getUTCFullYear() === anio; dt.setUTCDate(dt.getUTCDate() + 1)) {
    const i = dias.length;
    const dow = (dt.getUTCDay() + 6) % 7;
    const fecha = isoFecha(dt);
    const festivo = fest.get(fecha) || '';
    const tipo = festivo || dow === 6 ? 'domingo' : dow === 5 ? 'sabado' : 'laborable';
    dias.push({ i, fecha, dow, mes: dt.getUTCMonth(), dia: dt.getUTCDate(), semana: Math.floor((i + dowIni) / 7), festivo, tipo, finde: dow >= 5 });
  }
  return dias;
}

export function resolverPatron(grupo, grupos, visto = new Set()) {
  if (grupo.patronDe && !visto.has(grupo.id)) {
    const otro = grupos.find(g => g.id === grupo.patronDe);
    if (otro) { visto.add(grupo.id); return resolverPatron(otro, grupos, visto); }
  }
  const p = (grupo.patron || []).slice();
  if (!p.length) return ['L', 'L', 'L', 'L', 'L', 'L', 'L'];
  while (p.length % 7) p.push('L');
  return p;
}

// Cifras de un patrón por sí solo, llevadas a un año, para el editor de patrones.
export function estimarPatron(patron, turnosMap) {
  const semanas = patron.length / 7;
  let horas = 0, noches = 0, trabajo = 0, finesCiclo = 0;
  for (let w = 0; w < semanas; w++) {
    let finde = false;
    for (let d = 0; d < 7; d++) {
      const t = turnosMap.get(patron[w * 7 + d]);
      if (!t || !t.trabaja) continue;
      trabajo++; horas += t.horas;
      if (t.franja === 'noche') noches++;
      if (d >= 5) finde = true;
    }
    if (finde) finesCiclo++;
  }
  const k = 365 / patron.length;
  return { semanas, diasSemana: trabajo / semanas, horasAnio: horas * k, nochesAnio: noches * k, finesAnio: finesCiclo * 52.14 / semanas };
}

// Bloques de noche: «2-2-3» = lunes-martes, miércoles-jueves y viernes-domingo. Devuelve los días
// de la semana (0 = lunes) de cada bloque, o null si el texto no suma 7 días.
export function parseBloques(texto) {
  const tam = String(texto || '').split(/[^0-9]+/).filter(Boolean).map(Number);
  if (!tam.length || tam.some(n => n < 1) || tam.reduce((a, b) => a + b, 0) !== 7) return null;
  const res = []; let d = 0;
  for (const n of tam) { res.push(Array.from({ length: n }, (_, i) => d + i)); d += n; }
  return res;
}

// opciones.plantilla: personas reales de la sede (descifradas en el navegador): { nombre, colectivo, turnoActual,
// exentoNoches, horasSemana }. Si hay, fijan el número de personas de cada colectivo (en su primer grupo), y cada
// código lleva su nombre, su exención de noches y su jornada proporcional.
export function generar(cfgEntrada, opciones = {}) {
  const t0 = Date.now();
  const cfg = cfgEntrada;
  const R = cfg.reglas || {};
  // Las reglas «solo informe» no condicionan el ajuste: solo salen en los informes y en el panel.
  const usa = (k) => R[k] && R[k].activo && nivelRegla(k, R[k]) !== 'informe';
  const reg = (k, def) => (usa(k) ? Number(R[k].valor ?? def) : null);
  const maxNoches = reg('maxNoches', 14), maxFines = reg('maxFines', 17), descanso = reg('descanso', 12);
  const maxSeguidos = reg('maxSeguidos', 6), tope = reg('tope', 0), ratio = reg('ratio', 16);
  const maxNochesSeguidas = reg('maxNochesSeguidas', 3), maxFinesSeguidos = reg('maxFinesSeguidos', 2);
  const minFinesLibresMes = reg('minFinesLibresMes', 1);
  const bloques = usa('bloquesNoche') ? parseBloques(R.bloquesNoche.valor) : null;
  const finesCoherentes = !!usa('finesCoherentes');
  const descansoTrasNoche = reg('descansoTrasNoche', 3) || 0;
  const ajusteActivo = !R.ajuste || R.ajuste.activo !== false;
  // Cobertura y bolsa (Parámetros › Cobertura y bolsa): cesión de noches, bolsa de horas, margen, ausencias y aguante.
  const COB = cfg.cobertura || {};
  const cesion = { modo: 'ninguna', tope: maxNoches || 14, ...(COB.cesion || {}) };
  const bolsaCfg = { modo: 'devolver', tope: 0, inicial: {}, consumida: {}, ...(COB.bolsa || {}) };
  const margen = { noche: 0, dia: 0, tipo: 'personas', ...(COB.margen || {}) };

  // Turnos: L, V y D existen siempre.
  const lista = (cfg.turnos || []).filter(t => t && t.codigo).map(prepararTurno);
  const asegura = (codigo, nombre, color, disponible) => {
    if (!lista.some(t => t.codigo === codigo)) lista.push(prepararTurno({ codigo, nombre, franja: 'libre', color, disponible, fijo: true }));
  };
  asegura('L', 'Libre', '#FFFFFF', true);
  asegura('V', 'Vacaciones', '#7FC07C', false);
  asegura(CODIGO_RECORTE, 'Descanso por exceso de jornada', '#DCE8EE', false);
  asegura('SN', 'Saliente de noche', '#C9D3E8', false);
  asegura('B', 'Baja o ausencia', '#E8C9C9', false);
  asegura('BO', 'Día de bolsa de horas', '#D9E7C6', false);
  asegura('AP', 'Asunto propio', '#E6D8F0', false);
  asegura('VS', 'Día suelto de vacaciones', '#B9DDB6', false);
  const idx = new Map(lista.map((t, i) => [t.codigo, i]));
  const turnosMap = new Map(lista.map(t => [t.codigo, t]));
  const T = lista;
  const iV = idx.get('V'), iD = idx.get(CODIGO_RECORTE), iSN = idx.get('SN'), iB = idx.get('B');
  const franjaIdx = T.map(t => FR.indexOf(t.franja)); // -1 = libre

  // Festivos: la lista ya calculada, o se calcula aquí con la copia guardada de la fuente.
  const anio = Number(cfg.anio) || new Date().getFullYear();
  const listaFestivos = Array.isArray(cfg.festivos) ? cfg.festivos : calcularFestivos(cfg.festivos || {}, anio).lista;
  const dias = calendario(anio, listaFestivos);
  const D = dias.length, W = dias[D - 1].semana + 1;
  // Mes de cada fin de semana (el del sábado) y fines de semana de cada mes, para «al menos N fines libres al mes».
  const mesFinde = new Int8Array(W).fill(-1);
  for (const x of dias) if (x.dow === 5) mesFinde[x.semana] = x.mes;
  const findesMes = Array.from({ length: 12 }, () => []);
  for (let w = 0; w < W; w++) if (mesFinde[w] >= 0) findesMes[mesFinde[w]].push(w);

  // Personas
  const reales = { TA: [], SUP: [] };
  for (const r of opciones.plantilla || []) if (reales[r.colectivo]) reales[r.colectivo].push(r);
  const primerGrupo = {};
  for (const g of cfg.grupos || []) if (g && !primerGrupo[g.colectivo]) primerGrupo[g.colectivo] = g.id;
  const tamGrupo = (g) => (reales[g.colectivo] && reales[g.colectivo].length ? (primerGrupo[g.colectivo] === g.id ? reales[g.colectivo].length : 0) : Number(g.personas));
  const grupos = (cfg.grupos || []).filter(g => g && tamGrupo(g) > 0);
  const personas = [];
  const patrones = new Map();
  for (const g of grupos) {
    const patron = resolverPatron(g, cfg.grupos || []).map(c => (idx.has(c) ? c : 'L'));
    patrones.set(g.id, patron);
    const semanas = patron.length / 7;
    const n = Math.min(Math.floor(tamGrupo(g)), 2000);
    const deReales = reales[g.colectivo] && reales[g.colectivo].length && primerGrupo[g.colectivo] === g.id ? reales[g.colectivo] : null;
    const ancho = n >= 100 ? 3 : 2;
    // Código de turno preferido del grupo para cada franja (el primero que aparece en su patrón).
    const pref = {};
    // Solo en las franjas que el grupo deja cubrir al ajuste.
    const permitidas = Array.isArray(g.franjasAjuste) ? g.franjasAjuste : FR;
    for (const f of FR) pref[f] = permitidas.includes(f) ? (patron.find(c => turnosMap.get(c).franja === f) || (T.find(t => t.franja === f) || {}).codigo) : null;
    for (let i = 0; i < n; i++) {
      const real = deReales ? deReales[i] : null;
      const base = Number(g.horasObjetivo) || 1480.5;
      const id = `${g.prefijo || g.nombre.slice(0, 3).toUpperCase()} ${pad(i + 1, ancho)}`;
      // Casos especiales (Parámetros › Contratos y casos especiales, o columnas de la plantilla real).
      const esp = casoEspecial((cfg.especiales || {})[id], real);
      const nombreC = String(esp.contrato || '').toLowerCase().trim();
      const contrato = nombreC ? (cfg.contratos || []).find(c => c.id === esp.contrato || String(c.nombre).toLowerCase().trim() === nombreC) || null : null;
      const horasSemana = contrato ? Number(contrato.horasSemana) || 35 : real && real.horasSemana > 0 ? Number(real.horasSemana) : 35;
      const exentoNoches = !!((real && real.exentoNoches) || (contrato && contrato.sinNoches) || (esp.franjas.length && !esp.franjas.includes('noche')));
      // Franjas que puede hacer y turno de cada una (el del contrato, si lo tiene; si no, el del grupo).
      const franjas = FR.filter(f => (!esp.franjas.length || esp.franjas.includes(f)) && !(f === 'noche' && exentoNoches));
      const turnoContrato = {};
      for (const f of FR) { const c = contrato && contrato.turnos && contrato.turnos[f]; if (c && idx.has(c) && turnosMap.get(c).franja === f) turnoContrato[f] = c; }
      const prefP = {};
      for (const f of FR) prefP[f] = pref[f] && franjas.includes(f) ? (turnoContrato[f] || pref[f]) : null;
      // Días de alta: fuera de ellos, la persona no está (y su jornada anual se prorratea).
      // Refuerzos: el grupo puede tener fechas (p. ej. sustituciones de verano); manda la más restrictiva.
      const alta = [esp.alta, g.desde].filter(Boolean).sort().pop() || '';
      const baja = [esp.baja, g.hasta].filter(Boolean).sort()[0] || '';
      const dIni = alta ? dias.findIndex(x => x.fecha >= alta) : 0;
      const dFinB = baja ? dias.findIndex(x => x.fecha > baja) : -1;
      const desde = dIni < 0 ? D : dIni, hasta = dFinB < 0 ? D : dFinB;
      const activos = Math.max(0, hasta - desde);
      personas.push({
        id, grupo: g.id, grupoNombre: g.nombre, colectivo: COL.includes(g.colectivo) ? g.colectivo : 'TA',
        orden: i, desfase: esp.semanaInicio ? (esp.semanaInicio - 1) % semanas : i % semanas, flexible: g.flexible !== false,
        // Jornada reducida: la anual en proporción a las horas semanales (35 h = jornada completa) y a los días de alta.
        objetivo: Math.round(base * horasSemana / 35 * (activos / D) * 10) / 10, soloLaborables: !!g.soloLaborables,
        pref: prefP,
        nombre: real ? real.nombre : '', turnoActual: real ? real.turnoActual || '' : '', exentoNoches, horasSemana,
        contrato: contrato ? contrato.id : '', contratoNombre: contrato ? contrato.nombre : '', franjas, turnoContrato,
        sinFindes: esp.sinFindes, diasLibres: esp.diasLibres, desde, hasta,
        // Noches que puede hacer por encima de las de oficio (cesión): «todos», o «voluntaria» si lo ha aceptado.
        extraNoches: maxNoches == null || exentoNoches ? 0 : (cesion.modo === 'todos' || (cesion.modo === 'voluntaria' && esp.cedeNoches))
          ? Math.max(0, Number(cesion.tope) - maxNoches) : 0,
        especial: !!(contrato && contrato.id !== 'completa') || esp.franjas.length > 0 || esp.sinFindes || esp.diasLibres.length > 0 || desde > 0 || hasta < D || esp.semanaInicio > 0,
      });
    }
  }
  // Días en que una persona puede trabajar: de alta, sin fin de semana si lo tiene libre y fuera de sus días libres fijos.
  function permitidoDia(p, d) {
    if (d < p.desde || d >= p.hasta) return false;
    if (p.sinFindes && dias[d].finde) return false;
    if (p.diasLibres.length && p.diasLibres.includes(dias[d].dow)) return false;
    return true;
  }
  const P = personas.length;
  const grid = new Int16Array(P * D);
  const origen = new Uint8Array(P * D);
  const horas = new Float64Array(P), noches = new Int16Array(P), fines = new Int16Array(P);
  const finSem = new Uint8Array(P * W);
  const cob = COL.map(() => FR.map(() => new Int32Array(D)));
  const colIdx = personas.map(p => COL.indexOf(p.colectivo));

  // 1. Ciclo
  personas.forEach((p, pi) => {
    const patron = patrones.get(p.grupo);
    const semanas = patron.length / 7;
    for (let d = 0; d < D; d++) {
      const w = (dias[d].semana + p.desfase) % semanas;
      // Los grupos de lunes a viernes (C, partido, línea 900) no trabajan los festivos.
      let codigo = p.soloLaborables && dias[d].festivo ? 'L' : patron[w * 7 + dias[d].dow];
      const f = turnosMap.get(codigo).franja;
      // Exención de noches y casos especiales: lo que la persona no hace pasa a libre (el ajuste lo cubre con otras).
      if (!permitidoDia(p, d) || (f !== 'libre' && !p.franjas.includes(f))) codigo = 'L';
      // Contrato: el turno del patrón se cambia por el del contrato (p. ej. RM1 → MR5 en una reducida de 25 h).
      else if (p.turnoContrato[f]) codigo = p.turnoContrato[f];
      grid[pi * D + d] = idx.get(codigo);
    }
  });

  // 2. Vacaciones
  const diaDelAnio = (mmdd) => {
    const m = /^(\d{2})-(\d{2})$/.exec(mmdd || '');
    if (!m) return null;
    const f = `${dias[0].fecha.slice(0, 4)}-${m[1]}-${m[2]}`;
    const d = dias.find(x => x.fecha === f);
    return d ? d.i : null;
  };
  // a) Por periodos y solicitudes (como Procesos horarios): cada persona, su tramo.
  const vacSede = cfg.vacaciones && cfg.vacaciones.modo === 'periodos' ? cfg.vacaciones : null;
  let vacaciones = null;
  if (vacSede) {
    vacaciones = asignarVacaciones(vacSede, personas, listaFestivos);
    const posDiaV = new Map(dias.map(d => [d.fecha, d.i]));
    personas.forEach((p, pi) => {
      const a = vacaciones.porPersona.get(p.id);
      if (!a || !a.inicio) return;
      for (let d = posDiaV.get(a.inicio) ?? D, fin = posDiaV.get(a.fin) ?? -1; d <= fin; d++) { grid[pi * D + d] = iV; origen[pi * D + d] = ORIGEN.VACACIONES; }
    });
    // Los días sueltos de vacaciones no van en el cuadrante: se restan cuando cada persona los pide. De partida la
    // jornada planificada es la del convenio (1.480,5 h). Con «sueltosEnJornada» se suman a la jornada, como hace el
    // cuadrante real de 2027 (1.480,5 + 35 h de 5 días sueltos), para que luego se cambien por días libres.
    const extra = (Number(vacSede.diasSueltos) || 0) * (Number(vacSede.horasDia) || 7);
    personas.forEach(p => {
      const e = Math.round(extra * (p.horasSemana || 35) / 35 * (p.hasta - p.desde) / D * 10) / 10;
      p.objetivoBase = p.objetivo; p.horasSueltas = e; p.sueltosEnJornada = !!vacSede.sueltosEnJornada;
      if (vacSede.sueltosEnJornada) p.objetivo += e;
    });
  }
  // b) Escalonadas por grupo (modo antiguo).
  for (const g of vacSede ? [] : grupos) {
    const v = g.vacaciones;
    if (!v || !v.activo || !(Number(v.dias) > 0)) continue;
    const desde = diaDelAnio(v.desde) ?? 0, hasta = diaDelAnio(v.hasta) ?? D - 1;
    const largo = Math.min(Number(v.dias), D);
    const huecos = Math.max(1, hasta - desde + 2 - largo);
    const del = personas.map((p, i) => [p, i]).filter(([p]) => p.grupo === g.id);
    del.forEach(([p, pi], k) => {
      const inicio = Math.min(D - largo, desde + Math.floor(k * huecos / del.length));
      for (let d = inicio; d < inicio + largo; d++) { grid[pi * D + d] = iV; origen[pi * D + d] = ORIGEN.VACACIONES; }
    });
  }

  // 2b. Las vacaciones pueden cortar un bloque de noches del ciclo: la noche que queda suelta pasa a libre.
  {
    const iL = idx.get('L');
    for (let pi = 0; pi < P; pi++) for (let d = 0; d < D; d++) {
      const k = pi * D + d;
      if (franjaIdx[grid[k]] !== 2 || origen[k] !== ORIGEN.CICLO) continue;
      const antes = d > 0 && franjaIdx[grid[k - 1]] === 2, despues = d < D - 1 && franjaIdx[grid[k + 1]] === 2;
      const pegaV = (d > 0 && grid[k - 1] === iV) || (d < D - 1 && grid[k + 1] === iV);
      if (!antes && !despues && pegaV) grid[k] = iL;
    }
  }

  // 2c. Bajas y ausencias (Parámetros › Cobertura y bolsa): esos días no trabaja (código B) y el ajuste cubre su hueco
  // con otras personas. Su jornada anual se prorratea por los días que no está.
  {
    const posP = new Map(personas.map((p, i) => [p.id, i]));
    const posD = new Map(dias.map(x => [x.fecha, x.i]));
    for (const a of Array.isArray(COB.ausencias) ? COB.ausencias : []) {
      const pi = posP.get(a && a.persona); if (pi == null || !a.desde) continue;
      const d0 = posD.get(a.desde) ?? (a.desde < dias[0].fecha ? 0 : null);
      const d1 = posD.get(a.hasta || a.desde) ?? ((a.hasta || a.desde) > dias[D - 1].fecha ? D - 1 : null);
      if (d0 == null || d1 == null) continue;
      for (let d = d0; d <= d1; d++) if (origen[pi * D + d] !== ORIGEN.VACACIONES) { grid[pi * D + d] = iB; origen[pi * D + d] = ORIGEN.AUSENCIA; }
    }
    personas.forEach((p, pi) => {
      let n = 0; for (let d = p.desde; d < p.hasta; d++) if (origen[pi * D + d] === ORIGEN.AUSENCIA) n++;
      p.diasAusencia = n;
      if (n && p.hasta > p.desde) p.objetivo = Math.round(p.objetivo * (1 - n / (p.hasta - p.desde)) * 10) / 10;
    });
  }

  // 3. Cambios a mano
  const posPersona = new Map(personas.map((p, i) => [p.id, i]));
  const posDia = new Map(dias.map(d => [d.fecha, d.i]));
  for (const [clave, codigo] of Object.entries(cfg.manuales || {})) {
    const [pid, fecha] = clave.split('|');
    const pi = posPersona.get(pid), d = posDia.get(fecha);
    if (pi == null || d == null || !idx.has(codigo)) continue;
    grid[pi * D + d] = idx.get(codigo); origen[pi * D + d] = ORIGEN.MANUAL;
  }

  // Contadores
  const sumar = (pi, d, ti, s) => {
    const t = T[ti];
    if (!t.trabaja) return;
    horas[pi] += s * t.horas;
    if (t.franja === 'noche') noches[pi] += s;
    cob[colIdx[pi]][franjaIdx[ti]][d] += s;
    if (dias[d].finde) {
      const k = pi * W + dias[d].semana;
      const antes = finSem[k];
      finSem[k] += s;
      if (antes === 0 && finSem[k] === 1) fines[pi]++;
      if (antes === 1 && finSem[k] === 0) fines[pi]--;
    }
  };
  for (let pi = 0; pi < P; pi++) for (let d = 0; d < D; d++) sumar(pi, d, grid[pi * D + d], 1);
  const poner = (pi, d, ti, o) => {
    sumar(pi, d, grid[pi * D + d], -1);
    grid[pi * D + d] = ti; origen[pi * D + d] = o;
    sumar(pi, d, ti, 1);
  };

  // Necesidad: tabla de mínimos (y, en supervisión, la ratio).
  const tabla = COL.map(() => FR.map(() => ({ laborable: 0, sabado: 0, domingo: 0 })));
  for (const m of cfg.minimos || []) {
    const c = COL.indexOf(m.colectivo), f = FR.indexOf(m.franja);
    if (c < 0 || f < 0) continue;
    for (const k of ['laborable', 'sabado', 'domingo']) tabla[c][f][k] = Math.max(tabla[c][f][k], Number(m[k]) || 0);
  }
  // «real»: el mínimo (y, en supervisión, la ratio). «necesidad»: lo que se planifica = mínimo + margen para imprevistos.
  // Los huecos se miden frente al mínimo real; el margen solo hace que el ajuste ponga gente de más si puede.
  const conMargen = (m, f) => {
    const x = Number(f === 2 ? margen.noche : margen.dia) || 0;
    if (!x || !m) return m;
    return margen.tipo === 'porcentaje' ? Math.ceil(m * (1 + x / 100)) : m + x;
  };
  const real = COL.map((_, c) => FR.map((_, f) => Int32Array.from(dias, d => tabla[c][f][d.tipo])));
  // Primero se planifica contra el mínimo real; el margen se añade en una pasada final (aplicarMargen), para que no
  // gaste noches ni fines de semana antes de tiempo.
  const necesidad = COL.map((_, c) => FR.map((_, f) => Int32Array.from(real[c][f])));
  const aplicarMargen = (c) => { for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) necesidad[c][f][d] = conMargen(real[c][f][d], f); };
  const hayMargen = (Number(margen.noche) || 0) > 0 || (Number(margen.dia) || 0) > 0;
  const aplicarRatio = () => {
    if (!ratio || ratio <= 0) return;
    for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) {
      real[1][f][d] = Math.max(tabla[1][f][dias[d].tipo], Math.ceil(cob[0][f][d] / ratio));
      necesidad[1][f][d] = real[1][f][d];
    }
  };

  // Tope de noches de cada persona. Mientras «cesionActiva» es false, solo las de oficio; después, también las cedidas.
  let cesionActiva = false;
  const topeNoches = (pi) => (maxNoches == null ? Infinity : maxNoches + (cesionActiva ? personas[pi].extraNoches : 0));
  // ¿Puede la persona pi hacer el turno ti el día d (en lugar de lo que tiene)?
  const trabajaEn = (pi, d) => d >= 0 && d < D && T[grid[pi * D + d]].trabaja;
  const puede = (pi, d, ti) => {
    const nuevo = T[ti], viejo = T[grid[pi * D + d]];
    if (!nuevo.trabaja) return true;
    if (personas[pi].soloLaborables && dias[d].tipo !== 'laborable') return false;
    if (!permitidoDia(personas[pi], d) || !personas[pi].franjas.includes(nuevo.franja)) return false;
    if (personas[pi].turnoContrato[nuevo.franja] && personas[pi].turnoContrato[nuevo.franja] !== nuevo.codigo) return false;
    if (descanso != null) {
      if (d > 0) { const a = T[grid[pi * D + d - 1]]; if (a.trabaja && nuevo.ini + 1440 - a.fm < descanso * 60) return false; }
      if (d < D - 1) { const b = T[grid[pi * D + d + 1]]; if (b.trabaja && b.ini + 1440 - nuevo.fm < descanso * 60) return false; }
    }
    if (maxSeguidos != null && !viejo.trabaja) {
      let n = 1;
      for (let x = d - 1; trabajaEn(pi, x); x--) n++;
      for (let x = d + 1; trabajaEn(pi, x); x++) n++;
      if (n > maxSeguidos) return false;
    }
    if (maxNoches != null && nuevo.franja === 'noche' && viejo.franja !== 'noche' && noches[pi] + 1 > topeNoches(pi)) return false;
    if (maxFines != null && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && fines[pi] + 1 > maxFines) return false;
    if (maxFinesSeguidos != null && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && rachaFines(pi, dias[d].semana) > maxFinesSeguidos) return false;
    if (minFinesLibresMes != null && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && mesFinde[dias[d].semana] >= 0 && libresMes(pi, mesFinde[dias[d].semana]) - 1 < minFinesLibresMes) return false;
    // Tras un bloque de noches, sus días de descanso no se tocan.
    if (descansoTrasNoche && nuevo.franja !== 'noche') {
      for (let j = 1; j <= descansoTrasNoche; j++) if (esNoche(pi, d - j)) return false;
    }
    // Fin de semana en el turno de su semana: si de lunes a viernes va de mañana, el fin de semana no va de tarde.
    if (finesCoherentes && dias[d].finde && (nuevo.franja === 'manana' || nuevo.franja === 'tarde')) {
      const lunes = d - dias[d].dow; let m = 0, t = 0;
      for (let x = Math.max(0, lunes); x < Math.min(D, lunes + 5); x++) { const f = T[grid[pi * D + x]].franja; if (f === 'manana') m++; else if (f === 'tarde') t++; }
      if ((m > t && nuevo.franja === 'tarde') || (t > m && nuevo.franja === 'manana')) return false;
    }
    // Y al revés: un turno de lunes a viernes no puede dejar el fin de semana ya trabajado en la otra franja.
    if (finesCoherentes && !dias[d].finde && (nuevo.franja === 'manana' || nuevo.franja === 'tarde')) {
      const lunes = d - dias[d].dow; let m = 0, t = 0;
      for (let x = Math.max(0, lunes); x < Math.min(D, lunes + 5); x++) {
        const f = x === d ? nuevo.franja : T[grid[pi * D + x]].franja;
        if (f === 'manana') m++; else if (f === 'tarde') t++;
      }
      for (let x = lunes + 5; x <= lunes + 6; x++) {
        if (x < 0 || x >= D || !T[grid[pi * D + x]].trabaja) continue;
        const f = T[grid[pi * D + x]].franja;
        if ((m > t && f === 'tarde') || (t > m && f === 'manana')) return false;
      }
    }
    if (maxNochesSeguidas != null && nuevo.franja === 'noche') {
      let n = 1;
      for (let x = d - 1; esNoche(pi, x); x--) n++;
      for (let x = d + 1; esNoche(pi, x); x++) n++;
      if (n > maxNochesSeguidas) return false;
    }
    return true;
  };
  const esNoche = (pi, x) => x >= 0 && x < D && franjaIdx[grid[pi * D + x]] === 2;
  // Semanas seguidas con fin de semana trabajado, contando la semana w como trabajada.
  const rachaFines = (pi, w) => {
    let n = 1;
    for (let x = w - 1; x >= 0 && finSem[pi * W + x] > 0; x--) n++;
    for (let x = w + 1; x < W && finSem[pi * W + x] > 0; x++) n++;
    return n;
  };
  // Fines de semana sin ningún turno de una persona en un mes.
  const libresMes = (pi, m) => { let n = 0; for (const w of findesMes[m]) if (finSem[pi * W + w] === 0) n++; return n; };
  // Comprueba las reglas en los días a..b de una persona después de cambiarlos (para los bloques de noche).
  const valida = (pi, a, b) => {
    for (let x = Math.max(0, a - 1); x <= Math.min(D - 2, b); x++) {
      const t1 = T[grid[pi * D + x]], t2 = T[grid[pi * D + x + 1]];
      if (descanso != null && t1.trabaja && t2.trabaja && t2.ini + 1440 - t1.fm < descanso * 60) return false;
    }
    const racha = (x, f) => { let n = 1; for (let y = x - 1; y >= 0 && f(y); y--) n++; for (let y = x + 1; y < D && f(y); y++) n++; return n; };
    for (let x = a; x <= b; x++) {
      if (trabajaEn(pi, x)) {
        const tx = T[grid[pi * D + x]], p = personas[pi];
        if (!permitidoDia(p, x) || !p.franjas.includes(tx.franja) || (p.turnoContrato[tx.franja] && p.turnoContrato[tx.franja] !== tx.codigo)) return false;
      }
      if (maxSeguidos != null && trabajaEn(pi, x) && racha(x, y => trabajaEn(pi, y)) > maxSeguidos) return false;
      if (maxNochesSeguidas != null && esNoche(pi, x) && racha(x, y => esNoche(pi, y)) > maxNochesSeguidas) return false;
      // Un bloque de noches que empieza en x necesita los días de descanso del bloque anterior ya cumplidos.
      if (descansoTrasNoche && esNoche(pi, x) && !esNoche(pi, x - 1)) {
        for (let y = x - 2; y >= Math.max(0, x - 1 - descansoTrasNoche); y--) if (esNoche(pi, y)) return false;
      }
      if (maxFinesSeguidos != null && dias[x].finde && trabajaEn(pi, x)) {
        const w = dias[x].semana; let n = 1;
        for (let y = w - 1; y >= 0 && finSem[pi * W + y] > 0; y--) n++;
        for (let y = w + 1; y < W && finSem[pi * W + y] > 0; y++) n++;
        if (n > maxFinesSeguidos) return false;
      }
      if (minFinesLibresMes != null && dias[x].finde && trabajaEn(pi, x) && mesFinde[dias[x].semana] >= 0 && libresMes(pi, mesFinde[dias[x].semana]) < minFinesLibresMes) return false;
    }
    if (maxNoches != null && noches[pi] > topeNoches(pi)) return false;
    if (maxFines != null && fines[pi] > maxFines) return false;
    return true;
  };
  const libre = (pi, d) => {
    const t = T[grid[pi * D + d]];
    return !t.trabaja && t.disponible !== false && origen[pi * D + d] !== ORIGEN.MANUAL;
  };
  const movible = (pi, d) => origen[pi * D + d] !== ORIGEN.MANUAL && origen[pi * D + d] !== ORIGEN.CUBRE;

  const porColectivo = COL.map((_, c) => personas.map((p, i) => i).filter(i => colIdx[i] === c && personas[i].flexible));
  const stats = { cubiertos: 0, movidos: 0, recortados: 0 };

  const recortar = (c) => {
    let hubo = true, vueltas = 0;
    while (hubo && vueltas++ < 400) {
      hubo = false;
      for (const pi of porColectivo[c]) {
        const p = personas[pi];
        let mejor = -1, mejorNota = -Infinity;
        for (let d = 0; d < D; d++) {
          const k = pi * D + d, ti = grid[k], t = T[ti];
          if (!t.trabaja || origen[k] !== ORIGEN.CICLO) continue;
          if (horas[pi] - t.horas < p.objetivo + (bolsaCfg.modo === 'acumular' ? Number(bolsaCfg.tope) || 0 : 0)) continue;
          const f = franjaIdx[ti];
          if (bloques && f === 2) continue; // las noches van en bloque: no se quita una suelta
          const sobra = cob[c][f][d] - necesidad[c][f][d];
          if (sobra < 1) continue;
          const nota = (dias[d].festivo ? 1000 : 0) + (dias[d].finde ? 500 : 0) + sobra / Math.max(1, necesidad[c][f][d]) * 100;
          if (nota > mejorNota) { mejorNota = nota; mejor = d; }
        }
        if (mejor >= 0) { poner(pi, mejor, iD, ORIGEN.RECORTE); stats.recortados++; hubo = true; }
      }
    }
  };

  // Prueba si pi puede hacer ti el día d. En noche, si el día siguiente choca con el descanso
  // y ese día sobra gente en su franja, se le da libre (saliente de noche).
  const probar = (c, pi, d, ti) => {
    if (puede(pi, d, ti)) return 1;
    if (franjaIdx[ti] !== 2 || d >= D - 1) return 0;
    const k2 = pi * D + d + 1, t2 = grid[k2];
    if (!T[t2].trabaja || origen[k2] !== ORIGEN.CICLO) return 0;
    const g2 = franjaIdx[t2];
    if (cob[c][g2][d + 1] - 1 < necesidad[c][g2][d + 1]) return 0;
    poner(pi, d + 1, iSN, ORIGEN.CUBRE);
    const ok = puede(pi, d, ti);
    poner(pi, d + 1, t2, ORIGEN.CICLO);
    return ok ? 2 : 0;
  };
  const aplicar = (pi, d, ti, modo) => {
    if (modo === 2) poner(pi, d + 1, iSN, ORIGEN.CUBRE);
    poner(pi, d, ti, ORIGEN.CUBRE);
  };

  // Quien pasa del tope de noches por su ciclo pierde un bloque entero de noches (no una suelta),
  // en fechas en que sobra gente de noche. Esos días pasan a descanso.
  const recortarNoches = (c) => {
    if (maxNoches == null) return;
    for (const pi of porColectivo[c]) {
      let vueltas = 0;
      while (noches[pi] > topeNoches(pi) && vueltas++ < 10) {
        let mejor = null, mejorSobra = 0;
        for (let d = 0; d < D; d++) {
          if (!esNoche(pi, d) || esNoche(pi, d - 1)) continue;
          let b = d; while (esNoche(pi, b + 1)) b++;
          let ok = true, sobra = Infinity;
          for (let x = d; x <= b && ok; x++) {
            if (origen[pi * D + x] !== ORIGEN.CICLO) ok = false;
            else sobra = Math.min(sobra, cob[c][2][x] - 1 - necesidad[c][2][x]);
          }
          if (ok && sobra >= 0 && sobra + 1 > mejorSobra) { mejorSobra = sobra + 1; mejor = [d, b]; }
        }
        if (!mejor) { if (!pasarBloque(pi, c)) break; continue; }
        for (let x = mejor[0]; x <= mejor[1]; x++) { poner(pi, x, iD, ORIGEN.RECORTE); stats.recortados++; }
      }
    }
  };
  // Si no sobra gente de noche en ningún bloque suyo, el bloque (empezando por el último del año) pasa entero a otra
  // persona del mismo colectivo que tenga hueco en su tope de noches y esté libre esos días: la cobertura no cambia
  // y nadie pasa del tope. Se elige a quien menos noches tiene. Las horas las reajustan luego recortar() y completar().
  const iLibre = idx.get('L');
  const pasarBloque = (pi, c) => {
    const lista = [];
    for (let d = 0; d < D; d++) {
      if (!esNoche(pi, d) || esNoche(pi, d - 1)) continue;
      let b = d; while (esNoche(pi, b + 1)) b++;
      let ok = true;
      for (let x = d; x <= b; x++) if (origen[pi * D + x] === ORIGEN.MANUAL) ok = false;
      if (ok) lista.push([d, b]);
    }
    for (const [d, b] of lista.reverse()) {
      const largo = b - d + 1;
      const candidatos = porColectivo[c]
        .filter(q => q !== pi && personas[q].pref.noche && noches[q] + largo <= topeNoches(q))
        .filter(q => { for (let x = d; x <= b; x++) if (!libre(q, x)) return false; return true; })
        .sort((a, b2) => noches[a] - noches[b2]);
      for (const q of candidatos) {
        const ti = idx.get(personas[q].pref.noche);
        const antes = [];
        for (let x = d; x <= b; x++) { antes.push([grid[q * D + x], origen[q * D + x]]); poner(q, x, ti, ORIGEN.CUBRE); }
        // Tras el bloque, sus días de descanso tienen que estar libres.
        let vale = valida(q, Math.max(0, d - 1), Math.min(D - 1, b + 1));
        for (let j = 1; vale && j <= (descansoTrasNoche || 0) && b + j < D; j++) if (trabajaEn(q, b + j)) vale = false;
        if (vale) {
          for (let x = d; x <= b; x++) { poner(pi, x, iLibre, ORIGEN.RECORTE); stats.recortados++; }
          return true;
        }
        for (let x = d; x <= b; x++) poner(q, x, antes[x - d][0], antes[x - d][1]);
      }
    }
    return false;
  };

  // Cubre la noche del día d con un bloque entero (p. ej. viernes a domingo) de una sola persona.
  // Cada día del bloque tiene que estar libre o en una franja que va sobrada ese día. Tras el bloque,
  // si el día siguiente choca con el descanso y sobra gente, ese día pasa a saliente de noche.
  const bloqueDe = (d) => {
    const dow = dias[d].dow, b = bloques.find(l => l.includes(dow));
    return [Math.max(0, d - (dow - b[0])), Math.min(D - 1, d + (b[b.length - 1] - dow))];
  };
  // Un turno de día que un bloque de noche puede sustituir (si en su franja sobra gente): el del ciclo o uno que haya
  // puesto el propio ajuste. Los cambios a mano y la mejora del reparto no se tocan.
  const cambiable = (k) => origen[k] === ORIGEN.CICLO || origen[k] === ORIGEN.CUBRE;
  const cubrirBloque = (c, d) => {
    const [a, b] = bloqueDe(d);
    const cand = [];
    for (const pi of porColectivo[c]) {
      const codigo = personas[pi].pref.noche;
      if (codigo == null) continue;
      let nuevas = 0, ok = true;
      for (let x = a; x <= b && ok; x++) {
        const k = pi * D + x, g = franjaIdx[grid[k]];
        if (g === 2) continue;
        if (personas[pi].soloLaborables && dias[x].tipo !== 'laborable') ok = false;
        else if (libre(pi, x)) nuevas++;
        else if (g >= 0 && cambiable(k) && cob[c][g][x] - 1 >= necesidad[c][g][x]) nuevas++;
        else ok = false;
      }
      if (!ok || !nuevas || (maxNoches != null && noches[pi] + nuevas > topeNoches(pi))) continue;
      // Las noches cedidas (por encima de las de oficio) solo si no hay nadie que las pueda hacer de oficio.
      const cedida = maxNoches != null && noches[pi] + nuevas > maxNoches ? 100 : 0;
      cand.push([cedida + horas[pi] / personas[pi].objetivo + noches[pi] / 14 + (dias[b].finde ? fines[pi] / 17 : 0), pi, idx.get(codigo)]);
    }
    cand.sort((x, y) => x[0] - y[0]);
    for (const [, pi, ti] of cand) {
      const cambios = [];
      const cambia = (x, nt) => { cambios.push([x, grid[pi * D + x], origen[pi * D + x]]); poner(pi, x, nt, ORIGEN.CUBRE); };
      for (let x = a; x <= b; x++) if (franjaIdx[grid[pi * D + x]] !== 2) cambia(x, ti);
      // Descanso tras el bloque: «descansoTrasNoche» días sin turno (al menos 1, el saliente). Si uno de esos
      // días tenía turno, pasa a saliente solo si ese día sobra gente en su franja; si no, este bloque no vale.
      let vale = true;
      const diasDescanso = Math.max(1, descansoTrasNoche);
      for (let x = b + 1; x <= Math.min(D - 1, b + diasDescanso) && vale; x++) {
        const k2 = pi * D + x, t2 = T[grid[k2]], g2 = franjaIdx[grid[k2]];
        if (t2.trabaja) {
          if (cambiable(k2) && cob[c][g2][x] - 1 >= necesidad[c][g2][x]) cambia(x, iSN); else vale = false;
        } else if (libre(pi, x)) cambia(x, iSN);
      }
      if (vale && valida(pi, a, Math.min(D - 1, b + diasDescanso))) { stats.cubiertos++; return true; }
      for (let i = cambios.length - 1; i >= 0; i--) poner(pi, cambios[i][0], cambios[i][1], cambios[i][2]);
    }
    return false;
  };

  const cubrir = (c) => {
    const orden = [2, 0, 1]; // noche primero: es la franja que más cuesta cubrir
    // Con noches en bloque, primero las noches más difíciles: las de los días con más gente de vacaciones (verano) y las de
    // fin de semana. Si se dejan para el final, quien podría hacerlas ya ha gastado su tope de noches en otras fechas.
    if (bloques && necesidad[c][2].some((n, d) => n > cob[c][2][d])) {
      const enVacaciones = dias.map(x => { let n = 0; for (const pi of porColectivo[c]) if (grid[pi * D + x.i] === iV) n++; return n; });
      const dificiles = dias.map(x => x.i).filter(d => necesidad[c][2][d] > cob[c][2][d])
        .sort((a, b) => (enVacaciones[b] + (dias[b].finde ? 1000 : 0)) - (enVacaciones[a] + (dias[a].finde ? 1000 : 0)) || a - b);
      for (const d of dificiles) while (necesidad[c][2][d] - cob[c][2][d] > 0 && cubrirBloque(c, d));
    }
    // Los días se recorren salteados (no de enero a diciembre) para que los topes de noches y
    // fines de semana no se agoten en los primeros meses.
    for (let k = 0; k < D; k++) for (const f of orden) {
      const d = (k * SALTO) % D;
      let falta = necesidad[c][f][d] - cob[c][f][d];
      if (bloques && f === 2) {
        while (necesidad[c][f][d] - cob[c][f][d] > 0 && cubrirBloque(c, d));
        continue;
      }
      while (falta > 0) {
        let hecho = false;
        // a) mover a alguien de una franja del mismo día que va sobrada
        let mejor = -1, mejorTi = -1, mejorModo = 0, mejorNota = Infinity;
        for (const pi of porColectivo[c]) {
          const k = pi * D + d, actual = grid[k], g = franjaIdx[actual];
          if (g < 0 || g === f || !movible(pi, d)) continue;
          if (bloques && g === 2) continue; // una noche no se mueve: rompería su bloque
          if (cob[c][g][d] - 1 < necesidad[c][g][d]) continue;
          const ti = personas[pi].pref[FR[f]] == null ? null : idx.get(personas[pi].pref[FR[f]]);
          if (ti == null) continue;
          const nota = horas[pi] / personas[pi].objetivo + (f === 2 ? noches[pi] / 14 : 0);
          if (nota >= mejorNota) continue;
          const modo = probar(c, pi, d, ti);
          if (modo) { mejorNota = nota; mejor = pi; mejorTi = ti; mejorModo = modo; }
        }
        if (mejor >= 0) { aplicar(mejor, d, mejorTi, mejorModo); stats.movidos++; hecho = true; }
        else {
          // b) llamar a alguien que libra ese día
          for (const pi of porColectivo[c]) {
            if (!libre(pi, d)) continue;
            const ti = personas[pi].pref[FR[f]] == null ? null : idx.get(personas[pi].pref[FR[f]]);
            if (ti == null) continue;
            const nota = horas[pi] / personas[pi].objetivo + (f === 2 ? noches[pi] / 14 : 0) + (dias[d].finde ? fines[pi] / 17 : 0);
            if (nota >= mejorNota) continue;
            const modo = probar(c, pi, d, ti);
            if (modo) { mejorNota = nota; mejor = pi; mejorTi = ti; mejorModo = modo; }
          }
          if (mejor >= 0) { aplicar(mejor, d, mejorTi, mejorModo); stats.cubiertos++; hecho = true; }
        }
        if (!hecho) break;
        falta--;
      }
    }
  };

  // Quien queda por debajo de su objetivo recibe turnos en sus días libres, donde menos gente hay.
  const completar = (c) => {
    for (const pi of porColectivo[c]) {
      let vueltas = 0;
      while (horas[pi] < personas[pi].objetivo && vueltas++ < 400) {   // casos especiales (solo mañanas…) pueden necesitar muchos turnos
        let mejorD = -1, mejorTi = -1, mejorNota = Infinity;
        for (let d = 0; d < D; d++) {
          if (!libre(pi, d)) continue;
          for (let f = 0; f < FR.length; f++) {
            if (bloques && f === 2) continue; // no se añaden noches sueltas
            const ti = personas[pi].pref[FR[f]] == null ? null : idx.get(personas[pi].pref[FR[f]]);
            if (ti == null) continue;
            const nota = (cob[c][f][d] + 1) / Math.max(1, necesidad[c][f][d]);
            if (nota >= mejorNota || !puede(pi, d, ti)) continue;
            mejorNota = nota; mejorD = d; mejorTi = ti;
          }
        }
        if (mejorD < 0) break;
        poner(pi, mejorD, mejorTi, ORIGEN.CUBRE); stats.cubiertos++;
      }
    }
  };

  if (ajusteActivo) {
    // Las noches cedidas (por encima de las de oficio) solo se usan cuando con las de oficio no se llega.
    const conCesion = (c) => { if (opciones.cesionDosPasadas) { cesionActiva = false; cubrir(c); } cesionActiva = true; cubrir(c); };
    // Margen para imprevistos: al final, con las noches de oficio y sin tocar lo ya cubierto.
    const conMargenFinal = (c) => { if (!hayMargen) return; aplicarMargen(c); cesionActiva = false; cubrir(c); recortar(c); completar(c); cesionActiva = true; };
    recortarNoches(0); recortar(0); conCesion(0); recortar(0); completar(0); conMargenFinal(0);
    aplicarRatio();
    recortarNoches(1); recortar(1); conCesion(1); recortar(1); completar(1); conMargenFinal(1);
  } else aplicarRatio();
  cesionActiva = true;   // desde aquí (mejora del reparto, avisos), cada persona con su tope propio

  // 4. Equidad: intercambios de semanas enteras entre dos personas del mismo grupo (como el paso de equidad de
  // Calabrio o la búsqueda local de Timefold). Cada día sigue con la misma gente en cada franja (la cobertura no
  // cambia) y cada persona con las mismas horas; solo se acepta si no rompe ninguna regla que use el ajuste.
  // cfg.mejora.intercambios: [{ a, b, d, n }] (códigos de persona, primer día y número de días). Se aplican en orden;
  // los que ya no valen (porque ha cambiado otra cosa) se saltan.
  const mejora = { aplicados: [], saltados: 0, buscados: 0, coste0: 0, coste: 0 };
  const festivoTrab = new Int16Array(P), domingoTrab = new Int16Array(P);
  const recontarEquidad = (pi) => {
    let f = 0, dm = 0;
    for (let d = 0; d < D; d++) if (T[grid[pi * D + d]].trabaja) { if (dias[d].festivo) f++; if (dias[d].dow === 6) dm++; }
    festivoTrab[pi] = f; domingoTrab[pi] = dm;
  };
  for (let pi = 0; pi < P; pi++) recontarEquidad(pi);
  const movibleSemana = (pi, d0, n) => {
    if (!personas[pi].flexible) return false;
    for (let d = d0; d < d0 + n; d++) {
      const o = origen[pi * D + d], t = T[grid[pi * D + d]];
      if (o === ORIGEN.MANUAL || o === ORIGEN.VACACIONES || o === ORIGEN.AUSENCIA || t.codigo === 'V' || t.codigo === 'B') return false;
      if (personas[pi].exentoNoches && t.franja === 'noche') return false;
    }
    return true;
  };
  const horasTramo = (pi, d0, n) => { let h = 0; for (let d = d0; d < d0 + n; d++) h += T[grid[pi * D + d]].horas || 0; return h; };
  const iguales = (pa, pb, d0, n) => { for (let d = d0; d < d0 + n; d++) if (grid[pa * D + d] !== grid[pb * D + d]) return false; return true; };
  // Reglas que no mira valida(): descanso tras las noches, noches sueltas, fin de semana coherente, fines libres al mes.
  const validaExtra = (pi, a, b) => {
    const t = (d) => T[grid[pi * D + d]];
    // Casos especiales: días de alta, fines de semana o días libres fijos, franjas y turno del contrato.
    const p = personas[pi];
    for (let d = a; d <= b; d++) {
      const x = t(d);
      if (!x.trabaja) continue;
      if (!permitidoDia(p, d) || !p.franjas.includes(x.franja)) return false;
      if (p.turnoContrato[x.franja] && p.turnoContrato[x.franja] !== x.codigo) return false;
    }
    for (let d = Math.max(0, a - 10); d <= Math.min(D - 1, b + 1); d++) {
      if (!esNoche(pi, d)) continue;
      if (bloques && !esNoche(pi, d - 1) && !esNoche(pi, d + 1) && d > 0 && d < D - 1) return false;
      if (descansoTrasNoche && !esNoche(pi, d + 1)) for (let j = 1; j <= descansoTrasNoche && d + j < D; j++) if (t(d + j).trabaja) return false;
    }
    for (let d = a; d <= b; d++) {
      if (!dias[d].finde || !t(d).trabaja) continue;
      if (finesCoherentes && (t(d).franja === 'manana' || t(d).franja === 'tarde')) {
        const lunes = d - dias[d].dow; let m = 0, ta = 0;
        for (let x = Math.max(0, lunes); x < Math.min(D, lunes + 5); x++) { const f = t(x).franja; if (t(x).trabaja && f === 'manana') m++; else if (t(x).trabaja && f === 'tarde') ta++; }
        if ((m > ta && t(d).franja === 'tarde') || (ta > m && t(d).franja === 'manana')) return false;
      }
      if (minFinesLibresMes != null && mesFinde[dias[d].semana] >= 0 && libresMes(pi, mesFinde[dias[d].semana]) < minFinesLibresMes) return false;
    }
    return true;
  };
  const intercambiar = (pa, pb, d0, n) => {
    for (let d = d0; d < d0 + n; d++) {
      const ta = grid[pa * D + d], tb = grid[pb * D + d];
      if (ta === tb) continue;
      poner(pa, d, tb, ORIGEN.MEJORA); poner(pb, d, ta, ORIGEN.MEJORA);
    }
    recontarEquidad(pa); recontarEquidad(pb);
  };
  const deshacerIntercambio = (pa, pb, d0, n, origA, origB) => {
    for (let d = d0; d < d0 + n; d++) {
      const ta = grid[pa * D + d], tb = grid[pb * D + d];
      if (ta !== tb) { poner(pa, d, tb, origA[d - d0]); poner(pb, d, ta, origB[d - d0]); }
      else { origen[pa * D + d] = origA[d - d0]; origen[pb * D + d] = origB[d - d0]; }
    }
    recontarEquidad(pa); recontarEquidad(pb);
  };
  // Intenta un intercambio: true si queda hecho (y válido).
  const probarIntercambio = (pa, pb, d0, n) => {
    if (pa === pb || pa < 0 || pb < 0 || d0 < 0 || d0 + n > D) return false;
    if (personas[pa].grupo !== personas[pb].grupo || personas[pa].horasSemana !== personas[pb].horasSemana) return false;
    if (!movibleSemana(pa, d0, n) || !movibleSemana(pb, d0, n) || iguales(pa, pb, d0, n)) return false;
    if (Math.abs(horasTramo(pa, d0, n) - horasTramo(pb, d0, n)) > 1e-9) return false;
    const origA = origen.slice(pa * D + d0, pa * D + d0 + n), origB = origen.slice(pb * D + d0, pb * D + d0 + n);
    intercambiar(pa, pb, d0, n);
    const a = Math.max(0, d0 - 1), b = Math.min(D - 1, d0 + n);
    if (valida(pa, a, b) && valida(pb, a, b) && validaExtra(pa, d0, d0 + n - 1) && validaExtra(pb, d0, d0 + n - 1)) return true;
    deshacerIntercambio(pa, pb, d0, n, origA, origB);
    return false;
  };
  for (const x of (cfg.mejora && Array.isArray(cfg.mejora.intercambios) ? cfg.mejora.intercambios : [])) {
    const pa = posPersona.get(x.a), pb = posPersona.get(x.b);
    if (pa != null && pb != null && probarIntercambio(pa, pb, Number(x.d), Number(x.n))) mejora.aplicados.push({ a: x.a, b: x.b, d: Number(x.d), n: Number(x.n) });
    else mejora.saltados++;
  }
  // Coste de equidad: por grupo, suma de (valor − media)² de fines de semana, festivos y domingos trabajados.
  // Los intercambios no cambian los totales del grupo, así que la media no se mueve y el cambio se calcula al momento.
  const porGrupo = new Map();
  personas.forEach((p, pi) => { if (!porGrupo.has(p.grupo)) porGrupo.set(p.grupo, []); porGrupo.get(p.grupo).push(pi); });
  const medias = new Map();
  for (const [g, lista] of porGrupo) medias.set(g, [fines, festivoTrab, domingoTrab].map(v => lista.reduce((s, pi) => s + v[pi], 0) / lista.length));
  const PESOS = [1, 1, 0.5];
  const costePersona = (pi) => { const m = medias.get(personas[pi].grupo); return PESOS[0] * (fines[pi] - m[0]) ** 2 + PESOS[1] * (festivoTrab[pi] - m[1]) ** 2 + PESOS[2] * (domingoTrab[pi] - m[2]) ** 2; };
  const costeTotal = () => { let c = 0; for (let pi = 0; pi < P; pi++) c += costePersona(pi); return c; };
  mejora.coste0 = mejora.coste = costeTotal();
  // Búsqueda (solo si se pide, desde el botón «Mejorar reparto»): Late Acceptance (Burke y Bykov, 2017), con semilla
  // fija y tiempo límite. Se queda la mejor solución encontrada.
  if (opciones.buscarMejora) {
    const { ms = 3000, semilla = 1, alProgreso, aceptaIgual = false } = opciones.buscarMejora;
    let r = (semilla >>> 0) || 1;
    const azar = () => { r |= 0; r = r + 0x6D2B79F5 | 0; let t = Math.imul(r ^ r >>> 15, 1 | r); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gruposLista = [...porGrupo.values()].filter(l => l.length > 1);
    const lunes = dias.filter(d => d.dow === 0 && d.i + 7 <= D).map(d => d.i);
    const L = 500, hist = new Float64Array(L).fill(mejora.coste);
    let coste = mejora.coste, mejor = coste, nMejor = mejora.aplicados.length;
    const nuevos = [...mejora.aplicados];
    const fin = Date.now() + ms;
    let it = 0;
    while (gruposLista.length && lunes.length) {
      if ((it & 255) === 0) { if (Date.now() > fin) break; if (alProgreso && (it & 16383) === 0) alProgreso({ it, coste: mejor, coste0: mejora.coste0 }); }
      it++;
      const lista = gruposLista[Math.floor(azar() * gruposLista.length)];
      const pa = lista[Math.floor(azar() * lista.length)], pb = lista[Math.floor(azar() * lista.length)];
      const n = azar() < 0.25 ? 14 : 7;
      const d0 = lunes[Math.floor(azar() * lunes.length)];
      if (d0 + n > D) continue;
      const antes = costePersona(pa) + costePersona(pb);
      const oa = origen.slice(pa * D + d0, pa * D + d0 + n), ob = origen.slice(pb * D + d0, pb * D + d0 + n);
      if (!probarIntercambio(pa, pb, d0, n)) continue;
      const nuevoCoste = coste - antes + costePersona(pa) + costePersona(pb);
      if (nuevoCoste < coste - 1e-9 || (aceptaIgual && (nuevoCoste <= coste || nuevoCoste <= hist[it % L]))) {
        coste = nuevoCoste; nuevos.push({ a: personas[pa].id, b: personas[pb].id, d: d0, n });
        if (coste < mejor - 1e-9) { mejor = coste; nMejor = nuevos.length; }
      } else deshacerIntercambio(pa, pb, d0, n, oa, ob); // rechazado: vuelve como estaba
      hist[it % L] = coste;
    }
    mejora.buscados = it;
    // La lista buena es la que llega a la mejor solución. Para dejar la cuadrícula en ese punto, se deshace lo que
    // vino después (en orden inverso; cada intercambio es su propio inverso).
    for (let i = nuevos.length - 1; i >= nMejor; i--) {
      const x = nuevos[i];
      intercambiar(posPersona.get(x.a), posPersona.get(x.b), x.d, x.n);
    }
    mejora.intercambiosNuevos = nuevos.slice(0, nMejor);
    mejora.coste = mejor;
  }
  mejora.costeFinal = costeTotal();

  // Resultado por persona
  const filas = personas.map((p, pi) => {
    let man = 0, tar = 0, tra = 0, ajustes = 0, manuales = 0, malDescanso = 0, racha = 0, rachaMax = 0, rn = 0, rnMax = 0, sueltas = 0;
    for (let d = 0; d < D; d++) {
      const k = pi * D + d, t = T[grid[k]];
      if (origen[k] === ORIGEN.CUBRE || origen[k] === ORIGEN.RECORTE) ajustes++;
      if (origen[k] === ORIGEN.MANUAL) manuales++;
      if (t.franja === 'noche') { rn++; rnMax = Math.max(rnMax, rn); }
      else { if (rn === 1) sueltas++; rn = 0; }
      if (t.trabaja) {
        tra++; racha++; rachaMax = Math.max(rachaMax, racha);
        if (t.franja === 'manana') man++; else if (t.franja === 'tarde') tar++;
        if (descanso != null && d > 0) { const a = T[grid[k - 1]]; if (a.trabaja && t.ini + 1440 - a.fm < descanso * 60) malDescanso++; }
      } else racha = 0;
    }
    const alertas = [];
    if (maxNoches != null && noches[pi] > topeNoches(pi)) alertas.push(`${noches[pi]} noches (tope ${topeNoches(pi)})`);
    if (maxFines != null && fines[pi] > maxFines) alertas.push(`${fines[pi]} fines de semana (tope ${maxFines})`);
    if (horas[pi] < p.objetivo) alertas.push(`${fmtH(p.objetivo - horas[pi])} h por debajo del objetivo${p.diasLibres.length ? ' (por su día libre fijo: no caben más turnos sin romper reglas; la sección lo revisa)' : ''}`);
    // Un exceso menor que el turno más corto no se puede quitar sin bajar de la jornada: va a bolsa sin aviso.
    const turnoCorto = Math.min(...T.filter(t => t.trabaja && t.horas > 0).map(t => t.horas));
    const exceso = horas[pi] - p.objetivo;
    if (tope != null && exceso > tope && exceso >= turnoCorto) alertas.push(`${fmtH(exceso)} h por encima del objetivo`);
    if (malDescanso) alertas.push(`${malDescanso} cambios de turno sin ${descanso} h de descanso`);
    if (maxSeguidos != null && rachaMax > maxSeguidos) alertas.push(`${rachaMax} días seguidos (tope ${maxSeguidos})`);
    if (maxNochesSeguidas != null && rnMax > maxNochesSeguidas) alertas.push(`${rnMax} noches seguidas (tope ${maxNochesSeguidas})`);
    // Bolsa de horas: saldo de partida + lo que queda a su favor en el cuadrante − lo que ya ha cogido (solicitudes).
    const inicial = Number((bolsaCfg.inicial || {})[p.id]) || 0, consumida = Number((bolsaCfg.consumida || {})[p.id]) || 0;
    let devueltas = 0; for (let d = 0; d < D; d++) if (grid[pi * D + d] === iD) devueltas++;
    const aFavor = Math.max(0, horas[pi] - p.objetivo);
    const bolsa = { inicial, aFavor: Math.round(aFavor * 10) / 10, consumida, saldo: Math.round((inicial + aFavor - consumida) * 10) / 10, diasDevueltos: devueltas };
    return { ...p, pi, topeNoches: maxNoches == null ? null : topeNoches(pi), nochesCedidas: maxNoches == null ? 0 : Math.max(0, noches[pi] - maxNoches), bolsa, nochesSueltas: sueltas, horas: horas[pi], noches: noches[pi], fines: fines[pi], mananas: man, tardes: tar, trabajados: tra, ajustes, manuales, diferencia: horas[pi] - p.objetivo, alertas };
  });

  const huecos = [];
  // Aguante: cuántas personas pueden faltar cada día y franja sin bajar del mínimo real.
  const aguante = COL.map((_, c) => FR.map((_, f) => Int32Array.from(cob[c][f], (n, d) => n - real[c][f][d])));
  for (let c = 0; c < COL.length; c++) for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) {
    const falta = real[c][f][d] - cob[c][f][d];
    if (falta > 0) huecos.push({ colectivo: COL[c], franja: FR[f], d, fecha: dias[d].fecha, falta });
  }

  return {
    dias, personas: filas, turnos: T, turnosMap, idx, grid, origen, D, P,
    cobertura: cob, necesidad: real, necesidadPlan: necesidad, aguante, margen, cesion, bolsa: bolsaCfg, colectivos: COL, franjas: FR, huecos, stats, vacaciones, mejora,
    patrones, ms: Date.now() - t0,
    codigo: (pi, d) => T[grid[pi * D + d]].codigo,
  };
}

export function fmtH(h) {
  return (Math.round(h * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
