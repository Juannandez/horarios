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

import { calcularFestivos, domingoPascua } from './festivos.js';
import { asignarVacaciones, diasHabiles } from './vacaciones.js';
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
  let horas = (fm - ini) / 60, partido = false;
  // Turno partido: un segundo tramo el mismo día, después del primero (p. ej. 09:45-14:30 y 16:15-19:30). Cuenta las
  // horas de los dos tramos y, para el descanso entre jornadas, acaba al final del segundo.
  const i2 = minutos(t.inicio2), f2 = minutos(t.fin2);
  if (i2 != null && f2 != null && i2 >= fm && f2 > i2) { horas += (f2 - i2) / 60; fm = f2; partido = true; }
  return { ...t, trabaja, ini, fm, horas, partido };
}
// Cuartos de hora en que un turno está entero (para los mínimos por cuartos de hora): 0-95 del día en que empieza,
// 96-191 del día siguiente.
export function cuartosDeTurno(t) {
  if (!t || !t.trabaja) return [];
  const min = (x) => { const r = /^(\d{1,2}):(\d{2})$/.exec(x || ''); return r ? Number(r[1]) * 60 + Number(r[2]) : null; };
  const tramos = t.partido ? [[t.ini, min(t.fin)], [min(t.inicio2), t.fm]] : [[t.ini, t.fm]];
  const out = [];
  for (let q = 0; q < 192; q++) if (tramos.some(([a, b]) => a <= q * 15 && b >= (q + 1) * 15)) out.push(q);
  return out;
}
// Horas del reloj que cubre un turno (para los mínimos por horas): las horas en las que está al menos 30 minutos.
// 0-23 son del día en que empieza; 24-47, del día siguiente (la noche de 22 a 8 cubre 22, 23 y 24-31).
export function horasDeTurno(t) {
  if (!t || !t.trabaja) return [];
  const tramos = [];
  const min = (x) => { const r = /^(\d{1,2}):(\d{2})$/.exec(x || ''); return r ? Number(r[1]) * 60 + Number(r[2]) : null; };
  if (t.partido) { tramos.push([t.ini, min(t.fin)]); tramos.push([min(t.inicio2), t.fm]); } else tramos.push([t.ini, t.fm]);
  const out = [];
  for (let h = 0; h < 48; h++) {
    let n = 0;
    for (const [a, b] of tramos) n += Math.max(0, Math.min(b, (h + 1) * 60) - Math.max(a, h * 60));
    if (n >= 30) out.push(h);
  }
  return out;
}

// Texto de las horas de un turno: «08:15-15:15» o, si es partido, «09:45-14:30 y 16:15-19:30».
export const horarioTurno = (t) => (!t || !t.inicio ? '' : `${t.inicio}-${t.fin}${t.inicio2 && t.fin2 ? ` y ${t.inicio2}-${t.fin2}` : ''}`);

const pad = (n, w) => String(n).padStart(w, '0');
export const isoFecha = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;

// inicio: 'MM-DD' en que empieza el año del cuadrante (de partida, el 1 de enero; con '01-15', del 15 de enero al 14 de
// enero del año siguiente, para no cortar la Navidad). «mc» es el número de mes dentro del cuadrante (0, 1, 2…).
export function calendario(anio, festivos = [], inicio = '01-01') {
  const fest = new Map(festivos.filter(f => f && f.fecha).map(f => [f.fecha, f.nombre || 'Festivo']));
  const dias = [];
  const [mi, di] = /^\d{2}-\d{2}$/.test(inicio || '') ? inicio.split('-').map(Number) : [1, 1];
  const ini = new Date(Date.UTC(anio, mi - 1, di)), fin = new Date(Date.UTC(anio + 1, mi - 1, di));
  const dowIni = (ini.getUTCDay() + 6) % 7;              // 0 = lunes
  for (let dt = new Date(ini); dt < fin; dt.setUTCDate(dt.getUTCDate() + 1)) {
    const i = dias.length;
    const dow = (dt.getUTCDay() + 6) % 7;
    const fecha = isoFecha(dt);
    const festivo = fest.get(fecha) || '';
    const tipo = festivo || dow === 6 ? 'domingo' : dow === 5 ? 'sabado' : 'laborable';
    const mc = (dt.getUTCFullYear() - anio) * 12 + dt.getUTCMonth() - (mi - 1);
    dias.push({ i, fecha, dow, mes: dt.getUTCMonth(), mc, anio: dt.getUTCFullYear(), dia: dt.getUTCDate(), semana: Math.floor((i + dowIni) / 7), festivo, tipo, finde: dow >= 5 });
  }
  return dias;
}

// Periodos de alta de un grupo (fijos discontinuos): días del cuadrante en que están. Cada periodo:
//   { nombre, regla: 'fijo', desde: 'MM-DD', hasta: 'MM-DD' }   (si hasta < desde, cruza el año: 1-dic a 15-ene)
//   { nombre, regla: 'pascua', desde: -9, hasta: 0 }          (días desde el domingo de Pascua: Viernes de Dolores = −9)
//   { nombre, regla: 'fechas', desde: 'AAAA-MM-DD', hasta: 'AAAA-MM-DD' }
// Devuelve un Uint8Array con 1 en los días de alta.
export function diasDePeriodos(periodos, dias) {
  const alta = new Uint8Array(dias.length);
  const pos = new Map(dias.map(x => [x.fecha, x.i]));
  const iso = (ms) => isoFecha(new Date(ms));
  const marcar = (a, b) => { for (let t = Date.parse(`${a}T12:00:00Z`), f = Date.parse(`${b}T12:00:00Z`); t <= f; t += 864e5) { const d = pos.get(iso(t)); if (d != null) alta[d] = 1; } };
  const anios = [...new Set(dias.map(x => x.anio ?? Number(x.fecha.slice(0, 4))))];
  for (const p of periodos || []) {
    if (!p || p.activo === false) continue;
    if (p.regla === 'fechas' && /^\d{4}-\d{2}-\d{2}$/.test(p.desde || '') && /^\d{4}-\d{2}-\d{2}$/.test(p.hasta || '')) marcar(p.desde, p.hasta);
    else if (p.regla === 'pascua') for (const a of [anios[0] - 1, ...anios]) {
      const dom = Date.parse(`${domingoPascua(a)}T12:00:00Z`);
      marcar(iso(dom + (Number(p.desde) || 0) * 864e5), iso(dom + (Number(p.hasta) || 0) * 864e5));
    } else if (/^\d{2}-\d{2}$/.test(p.desde || '') && /^\d{2}-\d{2}$/.test(p.hasta || '')) for (const a of [anios[0] - 1, ...anios]) {
      marcar(`${a}-${p.desde}`, `${p.hasta < p.desde ? a + 1 : a}-${p.hasta}`);
    }
  }
  return alta;
}

// Solapes y horas de entrada que rotan: reglas que, sin tocar el patrón guardado, cambian un turno por otro
// ciertos días de la semana. Como cada persona empieza el ciclo en una semana distinta, el solape rota solo
// entre todo el grupo. Regla: { activo, grupo, base, turno, dias: [0-6, lunes = 0], cada, desfase }.
// «cada» = cada cuántas semanas con el turno base se aplica (1 = todas, 2 = una sí y otra no…).
export function aplicarSolapes(patron, grupoId, solapes, existe = () => true) {
  const reglas = (solapes || []).filter(r => r && r.activo && r.grupo === grupoId && r.base && r.turno && r.base !== r.turno && existe(r.turno));
  if (!reglas.length) return patron;
  const p = patron.slice(), semanas = p.length / 7;
  for (const r of reglas) {
    const dias = new Set((r.dias || []).map(Number));
    const cada = Math.max(1, Math.floor(Number(r.cada) || 1)), desfase = Math.max(0, Math.floor(Number(r.desfase) || 0));
    let k = 0;
    for (let w = 0; w < semanas; w++) {
      if (!p.slice(w * 7, w * 7 + 7).includes(r.base)) continue;
      if ((k + desfase) % cada === 0) for (const d of dias) if (p[w * 7 + d] === r.base) p[w * 7 + d] = r.turno;
      k++;
    }
  }
  return p;
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
  const minFinesLibresEntre = reg('minFinesLibresEntre', 2);   // patrón «2 de descanso y 1 de trabajo»
  const bloques = usa('bloquesNoche') ? parseBloques(R.bloquesNoche.valor) : null;
  const finesCoherentes = !!usa('finesCoherentes');
  const finCompleto = !!usa('finCompleto');             // fin de semana trabajado = sábado y domingo
  const maxEntradas = reg('maxEntradas', 4);             // horas de entrada distintas en el año
  const minLibresSemana = reg('minLibresSemana', 2);     // días libres como mínimo cada semana (lunes a domingo)
  const unaFranja = !!usa('unaFranjaSemana');            // el ajuste no mezcla mañana y tarde en una misma semana
  const minNoches = reg('minNoches', 14);                // noches como mínimo al año para quien hace noches
  const PUESTOS = Math.max(0, Number(cfg.puestos) || 0);  // puestos operativos en sala (0 = sin tope)
  // Fines de semana con bolsa (Cobertura y bolsa): el ajuste no pone a trabajar a nadie un sábado o domingo que libra;
  // lo que falte se deja en disponibilidad para la bolsa (código DB: localizable, no trabaja).
  const FINDES_BOLSA = !!(cfg.cobertura && cfg.cobertura.findesBolsa === true);
  // Los fijos discontinuos (refuerzo contratado para sus periodos) sí pueden ir en fin de semana, salvo que se diga que no.
  const FINDES_BOLSA_FD = !(cfg.cobertura && cfg.cobertura.findesBolsaFD === false);
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
  asegura('AJ', 'Día AJ (permiso del 24 y el 31 de diciembre)', '#F4D9A8', false);
  asegura('DB', 'Disponibilidad para bolsa (localizable, no trabaja)', '#FFE08A', false);
  const idx = new Map(lista.map((t, i) => [t.codigo, i]));
  const turnosMap = new Map(lista.map(t => [t.codigo, t]));
  const T = lista;
  const iV = idx.get('V'), iD = idx.get(CODIGO_RECORTE), iSN = idx.get('SN'), iB = idx.get('B');
  const franjaIdx = T.map(t => FR.indexOf(t.franja)); // -1 = libre
  // Horas de entrada distintas (para «máximo de horas de entrada»): índice de la hora de inicio de cada turno.
  const horasEntrada = [...new Set(T.filter(t => t.trabaja).map(t => t.ini))];
  const entradaIdx = T.map(t => (t.trabaja ? horasEntrada.indexOf(t.ini) : -1)), NE = Math.max(1, horasEntrada.length);

  // Festivos: la lista ya calculada, o se calcula aquí con la copia guardada de la fuente.
  const anio = Number(cfg.anio) || new Date().getFullYear();
  const inicioCuad = /^\d{2}-\d{2}$/.test(cfg.inicioCuadrante || '') ? cfg.inicioCuadrante : '01-01';
  const listaFestivos = Array.isArray(cfg.festivos) ? cfg.festivos
    : [...calcularFestivos(cfg.festivos || {}, anio).lista, ...(inicioCuad !== '01-01' ? calcularFestivos(cfg.festivos || {}, anio + 1).lista : [])];
  const dias = calendario(anio, listaFestivos, inicioCuad);
  const D = dias.length, W = dias[D - 1].semana + 1;
  // Ciclo que sigue de un año a otro: la semana del ciclo se cuenta desde el lunes de inicio (cfg.ciclo.inicio), no
  // desde el 1 de enero, para que el año siguiente empiece donde acabó este.
  const semanaCiclo0 = (() => {
    const c = cfg.ciclo || {};
    if (!c.continuo || !/^\d{4}-\d{2}-\d{2}$/.test(c.inicio || '')) return 0;
    const ref = Date.parse(`${c.inicio}T00:00:00Z`), dowRef = (new Date(ref).getUTCDay() + 6) % 7;
    const lunesAnio = Date.parse(`${dias[0].fecha}T00:00:00Z`) - dias[0].dow * 864e5;
    return Math.round((lunesAnio - (ref - dowRef * 864e5)) / (7 * 864e5));
  })();
  // ¿En qué festivo cuenta un turno? El de noche, en el día en que acaba si cfg.repartoFestivos.noche es «salida»
  // (convenio: el festivo de noche cuenta para quien sale del turno).
  const RF = { noche: 'salida', especiales: ['12-24', '12-25', '12-31', '01-01', '01-06'], historial: {}, fechasRotan: ['12-24', '12-31', '01-06'], rotan: {}, ...(cfg.repartoFestivos || {}) };
  const fechaSiguiente = (d) => (d + 1 < D ? dias[d + 1].fecha : isoFecha(new Date(Date.parse(`${dias[d].fecha}T12:00:00Z`) + 864e5)));
  const festivoSiguiente = (d) => (d + 1 < D ? dias[d + 1].festivo : fechaSiguiente(d).endsWith('01-01') ? 'Año Nuevo' : '');
  const cuentaEn = (d, t) => (t.franja === 'noche' && RF.noche === 'salida' ? { festivo: festivoSiguiente(d), fecha: fechaSiguiente(d) } : { festivo: dias[d].festivo, fecha: dias[d].fecha });
  const especiales = new Set((RF.especiales || []).map(x => String(x).slice(-5)));
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
    const patronBase = resolverPatron(g, cfg.grupos || []).map(c => (idx.has(c) ? c : 'L'));
    const patron = aplicarSolapes(patronBase, g.id, cfg.solapes, c => idx.has(c));
    patrones.set(g.id, patron);
    const semanas = patron.length / 7;
    const n = Math.min(Math.floor(tamGrupo(g)), 2000);
    const deReales = reales[g.colectivo] && reales[g.colectivo].length && primerGrupo[g.colectivo] === g.id ? reales[g.colectivo] : null;
    const ancho = n >= 100 ? 3 : 2;
    // Código de turno preferido del grupo para cada franja (el primero que aparece en su patrón).
    const pref = {};
    // Solo en las franjas que el grupo deja cubrir al ajuste.
    const permitidas = Array.isArray(g.franjasAjuste) ? g.franjasAjuste : FR;
    // Sin ese turno en su patrón (horario libre, fijos discontinuos): el del primer grupo de su colectivo que lo tenga.
    const deOtro = (f) => { for (const o of cfg.grupos || []) { if (o.colectivo !== g.colectivo) continue; const c = resolverPatron(o, cfg.grupos || []).find(x => idx.has(x) && turnosMap.get(x).franja === f); if (c) return c; } return null; };
    for (const f of FR) pref[f] = permitidas.includes(f) ? (patronBase.find(c => turnosMap.get(c).franja === f) || deOtro(f) || (T.find(t => t.franja === f) || {}).codigo) : null;
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
      // Reducción temporal (lactancia, cuidado de un familiar, tratamiento…): otro contrato entre dos fechas.
      let tramo = null;
      const red = esp.reduccion, cRed = red && red.contrato ? (cfg.contratos || []).find(c => c.id === red.contrato) : null;
      if (cRed && /^\d{4}-\d{2}-\d{2}$/.test(red.desde || "")) {
        const a = dias.findIndex(x => x.fecha >= red.desde), b = red.hasta ? dias.findIndex(x => x.fecha > red.hasta) : -1;
        const d0 = a < 0 ? D : a, d1 = b < 0 ? D : b;
        if (d1 > d0) {
          const sinN = exentoNoches || !!cRed.sinNoches;
          const fT = franjas.filter(f => !(f === 'noche' && sinN));
          const tcT = {};
          for (const f of FR) { const c = cRed.turnos && cRed.turnos[f]; if (c && idx.has(c) && turnosMap.get(c).franja === f) tcT[f] = c; }
          const prT = {};
          for (const f of FR) prT[f] = pref[f] && fT.includes(f) ? (tcT[f] || pref[f]) : null;
          tramo = { d0, d1, contrato: cRed.id, contratoNombre: cRed.nombre, horasSemana: Number(cRed.horasSemana) || 35, franjas: fT, turnoContrato: tcT, pref: prT, desde: red.desde, hasta: red.hasta || '' };
        }
      }
      // Días de alta: fuera de ellos, la persona no está (y su jornada anual se prorratea).
      // Refuerzos: el grupo puede tener fechas (p. ej. sustituciones de verano); manda la más restrictiva.
      const alta = [esp.alta, g.desde].filter(Boolean).sort().pop() || '';
      const baja = [esp.baja, g.hasta].filter(Boolean).sort()[0] || '';
      const dIni = alta ? dias.findIndex(x => x.fecha >= alta) : 0;
      const dFinB = baja ? dias.findIndex(x => x.fecha > baja) : -1;
      const desde = dIni < 0 ? D : dIni, hasta = dFinB < 0 ? D : dFinB;
      // Fijos discontinuos: solo están de alta en los periodos del grupo (Navidad, Semana Santa, Feria, verano…).
      const altaDias = Array.isArray(g.periodos) && g.periodos.length ? diasDePeriodos(g.periodos, dias) : null;
      let activos = Math.max(0, hasta - desde);
      if (altaDias) { activos = 0; for (let d = desde; d < hasta; d++) activos += altaDias[d]; }
      // Días de alta con la jornada de cada día (la reducción temporal cuenta con sus horas).
      const diasJornada = tramo ? activos - Math.max(0, Math.min(hasta, tramo.d1) - Math.max(desde, tramo.d0)) * (1 - tramo.horasSemana / horasSemana) : activos;
      personas.push({
        id, grupo: g.id, grupoNombre: g.nombre, colectivo: COL.includes(g.colectivo) ? g.colectivo : 'TA',
        orden: i, desfase: esp.semanaInicio ? (esp.semanaInicio - 1) % semanas : i % semanas, flexible: g.flexible !== false,
        // Jornada reducida: la anual en proporción a las horas semanales (35 h = jornada completa) y a los días de alta.
        objetivo: Math.round(base * horasSemana / 35 * (diasJornada / D) * 10) / 10, soloLaborables: !!g.soloLaborables, tramo,
        pref: prefP,
        nombre: real ? real.nombre : '', turnoActual: real ? real.turnoActual || '' : '', exentoNoches, horasSemana,
        contrato: contrato ? contrato.id : '', contratoNombre: contrato ? contrato.nombre : '', franjas, turnoContrato,
        sinFindes: esp.sinFindes, diasLibres: esp.diasLibres, desde, hasta, altaDias, diasAlta: activos,
        horarioLibre: !patronBase.some(c => turnosMap.get(c).franja !== 'libre'),
        // Condiciones propias del grupo (refuerzos flexibles): sin reglas de fines de semana o sin vacaciones.
        exentoFines: !!(g.condiciones && g.condiciones.libreFines), sinVacaciones: !!(g.condiciones && g.condiciones.sinVacaciones),
        // Noches que puede hacer por encima de las de oficio (cesión): «todos», o «voluntaria» si lo ha aceptado.
        extraNoches: maxNoches == null || exentoNoches ? 0 : (cesion.modo === 'todos' || (cesion.modo === 'voluntaria' && esp.cedeNoches))
          ? Math.max(0, Number(cesion.tope) - maxNoches) : 0,
        especial: !!altaDias || !!(contrato && contrato.id !== 'completa') || !!tramo || esp.franjas.length > 0 || esp.sinFindes || esp.diasLibres.length > 0 || desde > 0 || hasta < D || esp.semanaInicio > 0,
      });
    }
  }
  // Franjas, turno del contrato y turno preferido de una persona un día (con la reducción temporal, si la tiene).
  const enTramo = (p, d) => p.tramo && d >= p.tramo.d0 && d < p.tramo.d1;
  const franjasDe = (p, d) => (enTramo(p, d) ? p.tramo.franjas : p.franjas);
  const contratoDe = (p, d) => (enTramo(p, d) ? p.tramo.turnoContrato : p.turnoContrato);
  const prefDe = (pi, d, f) => { const p = personas[pi], c = (enTramo(p, d) ? p.tramo.pref : p.pref)[f]; return c == null ? null : idx.get(c); };
  // Días en que una persona puede trabajar: de alta, sin fin de semana si lo tiene libre y fuera de sus días libres fijos.
  function permitidoDia(p, d) {
    if (d < p.desde || d >= p.hasta) return false;
    if (p.altaDias && !p.altaDias[d]) return false;
    if (p.sinFindes && dias[d].finde) return false;
    if (p.diasLibres.length && p.diasLibres.includes(dias[d].dow)) return false;
    return true;
  }
  const P = personas.length;
  const grid = new Int16Array(P * D);
  const origen = new Uint8Array(P * D);
  const horas = new Float64Array(P), noches = new Int16Array(P), fines = new Int16Array(P);
  const entradaCuenta = new Int16Array(P * NE), nEntradas = new Int16Array(P);
  const finSem = new Uint8Array(P * W);
  const cob = COL.map(() => FR.map(() => new Int32Array(D)));
  const colIdx = personas.map(p => COL.indexOf(p.colectivo));

  // 1. Ciclo
  personas.forEach((p, pi) => {
    const patron = patrones.get(p.grupo);
    const semanas = patron.length / 7;
    for (let d = 0; d < D; d++) {
      const w = (((dias[d].semana + semanaCiclo0 + p.desfase) % semanas) + semanas) % semanas;
      // Los grupos de lunes a viernes (C, partido, línea 900) no trabajan los festivos.
      let codigo = p.soloLaborables && dias[d].festivo ? 'L' : patron[w * 7 + dias[d].dow];
      const f = turnosMap.get(codigo).franja;
      // Exención de noches y casos especiales: lo que la persona no hace pasa a libre (el ajuste lo cubre con otras).
      if (!permitidoDia(p, d) || (f !== 'libre' && !franjasDe(p, d).includes(f))) codigo = 'L';
      // Contrato: el turno del patrón se cambia por el del contrato (p. ej. RM1 → MR5 en una reducida de 25 h).
      else if (contratoDe(p, d)[f]) codigo = contratoDe(p, d)[f];
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
    vacaciones = asignarVacaciones(vacSede, personas.filter(p => !p.sinVacaciones), listaFestivos);
    const posDiaV = new Map(dias.map(d => [d.fecha, d.i]));
    const festV = new Set(listaFestivos.map(f => (typeof f === 'string' ? f : f.fecha)));
    // Cómo se cuentan (Vacaciones › Cómo se cuentan):
    //   «cuadrante» (de partida): son días hábiles de SU cuadrante. Desde el primer día del periodo, la V va solo en los
    //     días que le tocaba trabajar, hasta sumar los días del periodo (17); sus días libres siguen siendo libres.
    //   «naturales»: todos los días del periodo, del primero al último.
    const porCuadrante = vacSede.cuenta !== 'naturales';
    personas.forEach((p, pi) => {
      const a = vacaciones.porPersona.get(p.id);
      if (!a || !a.inicio) return;
      const d0 = posDiaV.get(a.inicio) ?? D, fin = posDiaV.get(a.fin) ?? -1;
      if (!porCuadrante) { for (let d = d0; d <= fin; d++) { grid[pi * D + d] = iV; origen[pi * D + d] = ORIGEN.VACACIONES; } return; }
      const n = diasHabiles(a.inicio, a.fin, festV);
      a.diasCuadrante = n;
      for (let d = d0, puestos = 0; d < D && puestos < n; d++) {
        if (!T[grid[pi * D + d]].trabaja) continue;
        grid[pi * D + d] = iV; origen[pi * D + d] = ORIGEN.VACACIONES; puestos++;
        a.finCuadrante = dias[d].fecha;
      }
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
  // Gente en sala por cuartos de hora (para los mínimos por cuartos): cqT[turno] = cuartos que cubre entero.
  const cqT = T.map(cuartosDeTurno), cobQ = COL.map(() => new Int16Array((D + 2) * 96));
  const sumar = (pi, d, ti, s) => {
    const t = T[ti];
    if (!t.trabaja) return;
    for (const q of cqT[ti]) cobQ[colIdx[pi]][d * 96 + q] += s;
    horas[pi] += s * t.horas;
    if (t.franja === 'noche') noches[pi] += s;
    { const k = pi * NE + entradaIdx[ti], antes = entradaCuenta[k]; entradaCuenta[k] += s; if (antes === 0 && s > 0) nEntradas[pi]++; else if (antes === 1 && s < 0) nEntradas[pi]--; }
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
  // Cada fila puede llevar el mínimo de cada día de la semana (dias: [L, M, X, J, V, S, D]) y de los festivos
  // (festivo). Si no, vale el formato antiguo: laborable (L-V), sábado y domingo (también festivos).
  const minimoDia = (m, d) => {
    if (Array.isArray(m.dias) && m.dias.length === 7) return Number(d.festivo ? (m.festivo ?? m.dias[6]) : m.dias[d.dow]) || 0;
    return Number(d.festivo ? (m.festivo ?? m.domingo) : d.dow === 6 ? m.domingo : d.dow === 5 ? m.sabado : m.laborable) || 0;
  };
  const tablaDia = COL.map(() => FR.map(() => new Int32Array(dias.length)));
  for (const m of cfg.minimos || []) {
    const c = COL.indexOf(m.colectivo), f = FR.indexOf(m.franja);
    if (c < 0 || f < 0) continue;
    for (const d of dias) tablaDia[c][f][d.i] = Math.max(tablaDia[c][f][d.i], minimoDia(m, d));
  }
  // Un 'MM-DD' cae en el año del cuadrante (con el año de 15 a 15 de enero, el 6 de enero es el del año siguiente).
  const enCuadrante = (x) => (/^\d{2}-\d{2}$/.test(x || '') ? posDia.get(`${anio}-${x}`) ?? posDia.get(`${anio + 1}-${x}`) : posDia.get(x));
  // Mínimos por horas (Parámetros › Mínimos): una tabla por colectivo con el mínimo de cada hora (0-23) de cada día
  // de la semana y de los festivos (fila 7). El ajuste sigue trabajando por franjas: el mínimo de cada franja un día es
  // el mayor de las horas que cubre su turno (el de mañana, de 8 a 15; el de noche, de 22 a 8 del día siguiente). Los
  // huecos por hora se miden aparte, al final, con todos los turnos (solapes incluidos).
  const MH = cfg.minimosHora && cfg.minimosHora.activo ? cfg.minimosHora : null;
  const minHora = (c, d, h) => {
    const tabla = MH && MH[COL[c]]; if (!Array.isArray(tabla)) return null;
    const dd = d + Math.floor(h / 24), hh = h % 24;
    const fila = dd < D ? (dias[dd].festivo ? 7 : dias[dd].dow) : (dias[D - 1].dow + 1) % 7;
    const v = Array.isArray(tabla[fila]) ? Number(tabla[fila][hh]) : NaN;
    return Number.isFinite(v) ? v : null;
  };
  // Mínimos por cuartos de hora (MH.cuartos[colectivo]: 8 filas × 96 cuartos, como la tabla de la empresa de 15 en 15
  // minutos). Si están, mandan sobre la tabla por horas, que queda solo para ver (el mayor de cada hora).
  const MC = MH && MH.cuartos && typeof MH.cuartos === 'object' ? MH.cuartos : null;
  const minCuarto = (c, d, q) => {
    const tabla = MC && MC[COL[c]]; if (!Array.isArray(tabla)) return null;
    const dd = d + Math.floor(q / 96), qq = q % 96;
    const fila = dd < D ? (dias[dd].festivo ? 7 : dias[dd].dow) : (dias[D - 1].dow + 1) % 7;
    const v = Array.isArray(tabla[fila]) ? Number(tabla[fila][qq]) : NaN;
    return Number.isFinite(v) ? v : null;
  };
  // ¿Se puede quitar el turno tiQuita de pi el día d (poniendo tiPone, si se da) sin dejar un cuarto bajo el mínimo?
  const cuartosOk = (pi, d, tiQuita, tiPone = null) => {
    const c = colIdx[pi];
    if (!MC || !Array.isArray(MC[COL[c]])) return true;
    const pone = tiPone != null ? new Set(cqT[tiPone]) : null;
    for (const q of cqT[tiQuita]) {
      if (pone && pone.has(q)) continue;
      if (d === 0 && q < 32) continue;
      const v = minCuarto(c, d, q);
      if (v != null && cobQ[c][d * 96 + q] - 1 < v) return false;
    }
    return true;
  };
  const turnoFranja = (col, f) => {
    for (const g of grupos) { if (g.colectivo !== col) continue; const c = resolverPatron(g, cfg.grupos || []).find(x => idx.has(x) && turnosMap.get(x).franja === f); if (c) return turnosMap.get(c); }
    return T.find(x => x.franja === f) || null;
  };
  // Horas de cada franja: las que cubre el turno preferido del colectivo en esa franja.
  const horasFranja = COL.map((col) => FR.map((f) => horasDeTurno(turnoFranja(col, f))));
  // Las horas de los extremos del turno (la primera y la última) no cuentan para la franja: las cubre a medias el turno
  // de al lado o un solape. Si ahí falta gente, sale como hueco por hora (hace falta otra hora de entrada o un solape).
  const nucleo = (hs) => (hs.length >= 4 ? hs.slice(1, -1) : hs);
  if (MH) for (let c = 0; c < COL.length; c++) {
    if (MC && Array.isArray(MC[COL[c]])) {
      // Por cuartos: el núcleo del turno de la franja (sin la primera ni la última hora).
      for (let f = 0; f < FR.length; f++) {
        const qs = cuartosDeTurno(turnoFranja(COL[c], FR[f])), nq = qs.length >= 16 ? qs.slice(4, -4) : qs;
        for (let d = 0; d < D; d++) { let m = 0; for (const q of nq) { const v = minCuarto(c, d, q); if (v != null && v > m) m = v; } tablaDia[c][f][d] = m; }
      }
      continue;
    }
    if (!Array.isArray(MH[COL[c]])) continue;
    for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) {
      let m = 0; for (const h of nucleo(horasFranja[c][f])) { const v = minHora(c, d, h); if (v != null && v > m) m = v; }
      tablaDia[c][f][d] = m;
    }
  }
  // Mínimos de un día concreto (p. ej. un teleasistente más en Nochebuena y Nochevieja): «suma» al del día o lo «fija».
  // fecha: 'MM-DD' (todos los años) o 'AAAA-MM-DD'.
  for (const m of Array.isArray(cfg.minimosFecha) ? cfg.minimosFecha : []) {
    const c = COL.indexOf(m && m.colectivo), f = FR.indexOf(m && m.franja);
    if (c < 0 || f < 0 || m.activo === false) continue;
    const d = enCuadrante(m.fecha);
    if (d == null) continue;
    const v = Math.floor(Number(m.valor) || 0);
    tablaDia[c][f][d] = m.modo === 'fija' ? Math.max(0, v) : Math.max(0, tablaDia[c][f][d] + v);
  }
  // Absentismo previsto (Parámetros › Mínimos): un porcentaje sobre el mínimo, de día y de noche por separado.
  //   cuenta: 'minimo' → el mínimo sube (y los huecos se miden con él, como hace la consultora con su 20 %);
  //           'margen' → solo se planifica gente de más si se puede (los huecos se siguen midiendo con el mínimo).
  const ABS = { dia: 0, noche: 0, cuenta: 'margen', ...(cfg.absentismo || {}) };
  const pctAbs = (f) => Math.max(0, Number(f === 2 ? ABS.noche : ABS.dia) || 0);
  if (ABS.cuenta === 'minimo') for (let c = 0; c < COL.length; c++) for (let f = 0; f < FR.length; f++) {
    const p = pctAbs(f); if (!p) continue;
    for (let d = 0; d < D; d++) tablaDia[c][f][d] = Math.ceil(tablaDia[c][f][d] * (1 + p / 100));
  }
  // «real»: el mínimo (y, en supervisión, la ratio). «necesidad»: lo que se planifica = mínimo + margen para imprevistos.
  // Los huecos se miden frente al mínimo real; el margen solo hace que el ajuste ponga gente de más si puede.
  const conMargen = (m, f) => {
    const x = Number(f === 2 ? margen.noche : margen.dia) || 0;
    let v = !x || !m ? m : margen.tipo === 'porcentaje' ? Math.ceil(m * (1 + x / 100)) : m + x;
    // El absentismo como margen: el mayor de los dos.
    if (ABS.cuenta !== 'minimo' && pctAbs(f) && m) v = Math.max(v, Math.ceil(m * (1 + pctAbs(f) / 100)));
    return v;
  };
  const real = COL.map((_, c) => FR.map((_, f) => Int32Array.from(tablaDia[c][f])));
  // Primero se planifica contra el mínimo real; el margen se añade en una pasada final (aplicarMargen), para que no
  // gaste noches ni fines de semana antes de tiempo.
  const necesidad = COL.map((_, c) => FR.map((_, f) => Int32Array.from(real[c][f])));
  const aplicarMargen = (c) => { for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) necesidad[c][f][d] = conMargen(real[c][f][d], f); };
  const hayMargen = (Number(margen.noche) || 0) > 0 || (Number(margen.dia) || 0) > 0 || (ABS.cuenta !== 'minimo' && (pctAbs(0) > 0 || pctAbs(2) > 0));
  const aplicarRatio = () => {
    if (!ratio || ratio <= 0) return;
    for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) {
      real[1][f][d] = Math.max(tablaDia[1][f][d], Math.ceil(cob[0][f][d] / ratio));
      necesidad[1][f][d] = real[1][f][d];
    }
  };

  // Tope de noches de cada persona. Mientras «cesionActiva» es false, solo las de oficio; después, también las cedidas.
  let cesionActiva = false;
  const topeNoches = (pi) => (maxNoches == null ? Infinity : maxNoches + (cesionActiva ? personas[pi].extraNoches : 0));
  // ¿Puede la persona pi hacer el turno ti el día d (en lugar de lo que tiene)?
  const trabajaEn = (pi, d) => d >= 0 && d < D && T[grid[pi * D + d]].trabaja;
  // Días sin turno de la semana (lunes a domingo) del día d; null si la semana no cae entera en el cuadrante.
  const libresSemana = (pi, d) => {
    const l = d - dias[d].dow;
    if (l < 0 || l + 6 >= D) return null;
    let n = 0; for (let x = l; x <= l + 6; x++) if (!T[grid[pi * D + x]].trabaja) n++;
    return n;
  };
  // Fin de semana coherente con su semana: si de lunes a viernes va más de mañana, el fin de semana trabajado no va de
  // tarde (y al revés). quita: un día de lunes a viernes que se va a quitar (para comprobarlo antes de quitarlo).
  const semanaCoherente = (pi, d, quita = -1) => {
    if (!finesCoherentes || personas[pi].horarioLibre) return true;   // los fijos discontinuos no tienen «semana de»
    const l = d - dias[d].dow; let m = 0, t = 0;
    for (let x = Math.max(0, l); x < Math.min(D, l + 5); x++) { if (x === quita) continue; const tt = T[grid[pi * D + x]]; if (!tt.trabaja) continue; if (tt.franja === 'manana') m++; else if (tt.franja === 'tarde') t++; }
    for (let x = l + 5; x <= l + 6; x++) {
      if (x < 0 || x >= D) continue; const tt = T[grid[pi * D + x]];
      if (!tt.trabaja) continue;
      if ((m > t && tt.franja === 'tarde') || (t > m && tt.franja === 'manana')) return false;
    }
    return true;
  };
  const puede = (pi, d, ti) => {
    const nuevo = T[ti], viejo = T[grid[pi * D + d]];
    if (!nuevo.trabaja) return true;
    if (FINDES_BOLSA && dias[d].finde && !viejo.trabaja && !(FINDES_BOLSA_FD && personas[pi].horarioLibre)) return false;   // nadie más a trabajar en fin de semana
    // Una sola franja de día por semana: en una semana de mañana no se pone una tarde (ni al revés).
    if (unaFranja && !personas[pi].horarioLibre && (nuevo.franja === 'manana' || nuevo.franja === 'tarde')) {
      const l = d - dias[d].dow; let mm = 0, tt = 0;
      for (let x = Math.max(0, l); x <= Math.min(D - 1, l + 6); x++) { if (x === d) continue; const t = T[grid[pi * D + x]]; if (!t.trabaja) continue; if (t.franja === 'manana') mm++; else if (t.franja === 'tarde') tt++; }
      if ((nuevo.franja === 'tarde' && mm > 0) || (nuevo.franja === 'manana' && tt > 0)) return false;
    }
    // Puestos en sala: el ajuste no pone a nadie más en una franja si ya están todos los puestos ocupados.
    if (PUESTOS && (!viejo.trabaja || viejo.franja !== nuevo.franja)) {
      const f = franjaIdx[ti]; let n = 0; for (let c = 0; c < COL.length; c++) n += cob[c][f][d];
      if (f >= 0 && n + 1 > PUESTOS) return false;
    }
    // Días libres cada semana: no se pone un turno en un día libre si la semana se queda con menos.
    if (minLibresSemana != null && !viejo.trabaja) { const n = libresSemana(pi, d); if (n != null && n - 1 < minLibresSemana) return false; }
    if (personas[pi].soloLaborables && dias[d].tipo !== 'laborable') return false;
    if (!permitidoDia(personas[pi], d) || !franjasDe(personas[pi], d).includes(nuevo.franja)) return false;
    { const tc = contratoDe(personas[pi], d)[nuevo.franja]; if (tc && tc !== nuevo.codigo) return false; }
    // Máximo de horas de entrada distintas en el año.
    if (maxEntradas != null && entradaCuenta[pi * NE + entradaIdx[ti]] === 0) {
      const sale = viejo.trabaja && entradaCuenta[pi * NE + entradaIdx[grid[pi * D + d]]] === 1 ? 1 : 0;
      if (nEntradas[pi] - sale + 1 > maxEntradas) return false;
    }
    // Fin de semana completo: no se trabaja solo el sábado o solo el domingo (salvo que el otro día no esté disponible:
    // vacaciones, baja, AJ…).
    if (finCompleto && !personas[pi].exentoFines && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0) {
      const o = dias[d].dow === 5 ? d + 1 : d - 1;
      if (o >= 0 && o < D && T[grid[pi * D + o]].disponible !== false) return false;
    }
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
    if (maxFines != null && !personas[pi].exentoFines && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && fines[pi] + 1 > maxFines) return false;
    if (maxFinesSeguidos != null && !personas[pi].exentoFines && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && rachaFines(pi, dias[d].semana) > maxFinesSeguidos) return false;
    if (minFinesLibresMes != null && !personas[pi].exentoFines && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && mesFinde[dias[d].semana] >= 0 && libresMes(pi, mesFinde[dias[d].semana]) - 1 < minFinesLibresMes) return false;
    if (minFinesLibresEntre != null && !personas[pi].exentoFines && dias[d].finde && !viejo.trabaja && finSem[pi * W + dias[d].semana] === 0 && pegados(pi, dias[d].semana)) return false;
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
  // ¿Hay otro fin de semana trabajado a menos de «minFinesLibresEntre» semanas de la semana w? (patrón 2 + 1)
  const pegados = (pi, w) => {
    for (let j = 1; j <= minFinesLibresEntre; j++) {
      if (w - j >= 0 && finSem[pi * W + w - j] > 0) return true;
      if (w + j < W && finSem[pi * W + w + j] > 0) return true;
    }
    return false;
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
        if (!permitidoDia(p, x) || !franjasDe(p, x).includes(tx.franja) || (contratoDe(p, x)[tx.franja] && contratoDe(p, x)[tx.franja] !== tx.codigo)) return false;
        if (finCompleto && !p.exentoFines && dias[x].finde && medioFinde(pi, x)) return false;
      }
      if (finCompleto && !personas[pi].exentoFines && dias[x].finde && !trabajaEn(pi, x) && medioFinde(pi, x)) return false;
      if (maxSeguidos != null && trabajaEn(pi, x) && racha(x, y => trabajaEn(pi, y)) > maxSeguidos) return false;
      if (maxNochesSeguidas != null && esNoche(pi, x) && racha(x, y => esNoche(pi, y)) > maxNochesSeguidas) return false;
      // Un bloque de noches que empieza en x necesita los días de descanso del bloque anterior ya cumplidos.
      if (descansoTrasNoche && esNoche(pi, x) && !esNoche(pi, x - 1)) {
        for (let y = x - 2; y >= Math.max(0, x - 1 - descansoTrasNoche); y--) if (esNoche(pi, y)) return false;
      }
      if (maxFinesSeguidos != null && !personas[pi].exentoFines && dias[x].finde && trabajaEn(pi, x)) {
        const w = dias[x].semana; let n = 1;
        for (let y = w - 1; y >= 0 && finSem[pi * W + y] > 0; y--) n++;
        for (let y = w + 1; y < W && finSem[pi * W + y] > 0; y++) n++;
        if (n > maxFinesSeguidos) return false;
      }
      if (minFinesLibresMes != null && !personas[pi].exentoFines && dias[x].finde && trabajaEn(pi, x) && mesFinde[dias[x].semana] >= 0 && libresMes(pi, mesFinde[dias[x].semana]) < minFinesLibresMes) return false;
      if (minFinesLibresEntre != null && !personas[pi].exentoFines && dias[x].finde && trabajaEn(pi, x) && pegados(pi, dias[x].semana)) return false;
    }
    if (maxNoches != null && noches[pi] > topeNoches(pi)) return false;
    if (maxFines != null && !personas[pi].exentoFines && fines[pi] > maxFines) return false;
    if (maxEntradas != null && nEntradas[pi] > maxEntradas) return false;
    if (minLibresSemana != null) for (let x = Math.max(0, a); x <= Math.min(D - 1, b); x++) {
      if (x !== a && dias[x].dow !== 0) continue;
      const n = libresSemana(pi, x); if (n != null && n < minLibresSemana) return false;
    }
    return true;
  };
  // Medio fin de semana: un día del fin de semana trabajado y el otro libre y disponible (no vacaciones, baja, AJ…).
  const medioFinde = (pi, x) => {
    const sab = dias[x].dow === 5 ? x : x - 1, dom = sab + 1;
    if (sab < 0 || dom >= D) return false;
    const a = T[grid[pi * D + sab]], b = T[grid[pi * D + dom]];
    return (a.trabaja && !b.trabaja && b.disponible !== false) || (b.trabaja && !a.trabaja && a.disponible !== false);
  };
  const libre = (pi, d) => {
    const t = T[grid[pi * D + d]];
    if (FINDES_BOLSA && dias[d].finde && !(FINDES_BOLSA_FD && personas[pi].horarioLibre)) return false;   // el fin de semana libre no se toca
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
          if (finCompleto && dias[d].finde && !p.exentoFines) { const o = dias[d].dow === 5 ? d + 1 : d - 1; if (o >= 0 && o < D && T[grid[pi * D + o]].trabaja) continue; }
          const sobra = cob[c][f][d] - necesidad[c][f][d];
          if (sobra < 1) continue;
          if (!cuartosOk(pi, d, ti)) continue;   // con mínimos por cuartos, que no deje un relevo corto
          if (!dias[d].finde && !semanaCoherente(pi, d, d)) continue;   // que su fin de semana siga en la franja de su semana
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

  // Equilibrar las noches (Equidad): las vacaciones, el AJ o los ajustes dejan a unas personas con menos noches que
  // otras (9 frente a 14). Se pasan bloques enteros de noches de lunes a viernes, sin festivos, de quien tiene más de
  // la media + 1 a quien tiene menos de la media − 1, si quien recibe puede: los días del bloque libres o con un turno
  // de día que sobra ese día, y su descanso tras las noches libre (si tenía turno de día, se le quita, también solo si
  // sobra). No se toca a quien trabaja ese fin de semana, así que fines y festivos no cambian. La cobertura de noche
  // tampoco (el bloque solo cambia de persona); las horas las reajustan luego recortar() y completar().
  // Fuera: fijos discontinuos, refuerzos de unos meses, quien no hace noches y las reducciones temporales. Se apaga
  // con cfg.equilibrarNoches = false.
  const equilibrarNoches = (c) => {
    if (cfg.equilibrarNoches === false || !bloques) return 0;
    // Solo quien está todo el año: un refuerzo de unos meses tiene menos noches por estar menos tiempo, no por reparto.
    const elegible = (pi) => { const p = personas[pi]; return p.pref && p.pref.noche && idx.has(p.pref.noche) && !p.exentoNoches && !p.horarioLibre && !p.altaDias && !p.tramo && !(p.desde > 0) && !(p.hasta < D); };
    const lista = porColectivo[c].filter(elegible);
    if (lista.length < 2) return 0;
    const media = lista.reduce((s, pi) => s + noches[pi], 0) / lista.length, tol = 1;
    const bloquesDe = (pi) => {
      const r = [];
      for (let d = 0; d < D; d++) {
        if (!esNoche(pi, d) || esNoche(pi, d - 1)) continue;
        let b = d; while (esNoche(pi, b + 1)) b++;
        let ok = true;
        for (let x = d; x <= b && ok; x++) if (origen[pi * D + x] === ORIGEN.MANUAL || dias[x].finde || dias[x].festivo) ok = false;
        if (ok) r.push([d, b]);
      }
      return r;
    };
    const tomar = (q, d, b) => {
      const fin = Math.min(D - 1, b + (descansoTrasNoche || 0)), ti = idx.get(personas[q].pref.noche);
      // Su fin de semana de esa semana (y de la siguiente si el descanso llega) tiene que estar libre.
      for (let x = Math.max(0, d - dias[d].dow); x <= Math.min(D - 1, fin + 6 - dias[fin].dow); x++) if (dias[x].finde && trabajaEn(q, x)) return false;
      for (let x = d; x <= fin; x++) {
        const k = q * D + x, t = T[grid[k]];
        if (!t.trabaja) { if (x <= b && !libre(q, x)) return false; continue; }
        if (!cambiable(k) || franjaIdx[grid[k]] === 2 || dias[x].festivo) return false;
        const f = franjaIdx[grid[k]];
        if (cob[c][f][x] - 1 < necesidad[c][f][x]) return false;
      }
      const antes = [];
      for (let x = d; x <= fin; x++) antes.push([grid[q * D + x], origen[q * D + x]]);
      for (let x = d; x <= fin; x++) {
        if (x <= b) poner(q, x, ti, ORIGEN.CUBRE);
        else if (T[grid[q * D + x]].trabaja) poner(q, x, iLibre, ORIGEN.RECORTE);
      }
      if (noches[q] <= topeNoches(q) && valida(q, Math.max(0, d - 1), Math.min(D - 1, fin + 1))) return true;
      for (let x = d; x <= fin; x++) poner(q, x, antes[x - d][0], antes[x - d][1]);
      return false;
    };
    let movidos = 0;
    for (let pasada = 0; pasada < 4; pasada++) {
      let hubo = false;
      const pobres = lista.filter(pi => noches[pi] < media - tol).sort((a, b) => noches[a] - noches[b]);
      for (const q of pobres) {
        for (let intento = 0; intento < 6 && noches[q] < media - tol; intento++) {
          const ricos = lista.filter(pi => noches[pi] > media + tol).sort((a, b) => noches[b] - noches[a]);
          let movio = false;
          for (const pi of ricos) {
            for (const [d, b] of bloquesDe(pi)) {
              const L = b - d + 1;
              if (noches[q] + L >= noches[pi] || noches[q] + L > media + tol) continue;
              if (!tomar(q, d, b)) continue;
              for (let x = d; x <= b; x++) poner(pi, x, iLibre, ORIGEN.RECORTE);
              movio = true; break;
            }
            if (movio) break;
          }
          if (!movio) break;
          movidos++; hubo = true;
        }
      }
      if (!hubo) break;
    }
    stats.nochesEquilibradas = (stats.nochesEquilibradas || 0) + movidos;
    return movidos;
  };

  // Quien hace noches y no llega al mínimo de noches del año (regla minNoches) recibe bloques de 2 noches entre semana
  // (lunes-martes o miércoles-jueves, sin festivos), donde menos gente de noche hay, si puede: días del bloque libres o
  // con un turno de día que sobra, y su descanso después libre. Las horas las reajustan luego recortar() y completar().
  const tomarBloqueNoche = (c, q, d, b) => {
    const fin = Math.min(D - 1, b + (descansoTrasNoche || 0)), ti = idx.get(personas[q].pref.noche);
    // Su fin de semana de esa semana (y de la siguiente si el descanso llega) tiene que estar libre.
    for (let x = Math.max(0, d - dias[d].dow); x <= Math.min(D - 1, fin + 6 - dias[fin].dow); x++) if (dias[x].finde && trabajaEn(q, x)) return false;
    for (let x = d; x <= fin; x++) {
      const k = q * D + x, t = T[grid[k]];
      if (!t.trabaja) { if (x <= b && !libre(q, x)) return false; continue; }
      if (!cambiable(k) || franjaIdx[grid[k]] === 2 || dias[x].festivo) return false;
      const f = franjaIdx[grid[k]];
      if (cob[c][f][x] - 1 < necesidad[c][f][x]) return false;
    }
    const antes = [];
    for (let x = d; x <= fin; x++) antes.push([grid[q * D + x], origen[q * D + x]]);
    for (let x = d; x <= fin; x++) {
      if (x <= b) poner(q, x, ti, ORIGEN.CUBRE);
      else if (T[grid[q * D + x]].trabaja) poner(q, x, iLibre, ORIGEN.RECORTE);
    }
    if (noches[q] <= topeNoches(q) && valida(q, Math.max(0, d - 1), Math.min(D - 1, fin + 1))) return true;
    for (let x = d; x <= fin; x++) poner(q, x, antes[x - d][0], antes[x - d][1]);
    return false;
  };
  const subirNoches = (c) => {
    if (minNoches == null || !bloques) return 0;
    const elegible = (pi) => { const p = personas[pi]; return p.pref && p.pref.noche && idx.has(p.pref.noche) && !p.exentoNoches && !p.horarioLibre && !p.altaDias && !p.tramo && !(p.desde > 0) && !(p.hasta < D) && franjasDe(p, 0).includes('noche'); };
    const inicios = []; for (let d = 0; d + 1 < D; d++) if ((dias[d].dow === 0 || dias[d].dow === 2) && !dias[d].festivo && !dias[d + 1].festivo) inicios.push(d);
    let puestos = 0;
    for (const q of porColectivo[c].filter(elegible)) {
      for (let vueltas = 0; noches[q] < minNoches && vueltas < 10; vueltas++) {
        const cand = inicios.map(d => [d, cob[c][2][d] + cob[c][2][d + 1]]).sort((a, b) => a[1] - b[1]);
        let ok = false;
        for (const [d] of cand) if (tomarBloqueNoche(c, q, d, d + 1)) { ok = true; puestos++; break; }
        if (!ok) break;
      }
      // Si le falta una sola noche: se alarga uno de sus bloques de 2 a 3 (el esquema 2-2-3 los admite), entre semana.
      if (noches[q] === minNoches - 1) {
        for (let d = 1; d < D - 1 && noches[q] < minNoches; d++) {
          if (!esNoche(q, d) || esNoche(q, d - 1) || !esNoche(q, d + 1) || esNoche(q, d + 2)) continue;   // bloque de 2: d, d+1
          for (const x of [d + 2, d - 1]) {
            if (x < 0 || x >= D || dias[x].finde || dias[x].festivo) continue;
            if (tomarBloqueNoche(c, q, x, x) && esNoche(q, x)) { puestos++; break; }
          }
        }
      }
    }
    stats.nochesSubidas = (stats.nochesSubidas || 0) + puestos;
    return puestos;
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
          const ti = prefDe(pi, d, FR[f]);
          if (ti == null) continue;
          const nota = horas[pi] / personas[pi].objetivo + (f === 2 ? noches[pi] / 14 : 0);
          if (nota >= mejorNota) continue;
          const modo = probar(c, pi, d, ti);
          if (modo) { mejorNota = nota; mejor = pi; mejorTi = ti; mejorModo = modo; }
        }
        if (mejor >= 0) { aplicar(mejor, d, mejorTi, mejorModo); stats.movidos++; hecho = true; }
        else if (f !== 2 && moverTramo(c, d, f)) { stats.movidos++; hecho = true; }
        else {
          // b) poner turno a alguien que libra ese día (si su libre «puede pasar a turno al planificar»)
          for (const pi of porColectivo[c]) {
            if (!libre(pi, d)) continue;
            const ti = prefDe(pi, d, FR[f]);
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

  // a2) Pasar de mañana a tarde (o al revés) los últimos días de trabajo antes de un descanso: desde el día d hasta su
  // siguiente día libre, entre semana y como mucho 3 días, si en su franja sobra gente todos esos días. No cambian ni
  // sus horas ni sus días libres (los dos días libres de la semana se mantienen) y entre turnos quedan las 12 h: de
  // mañana a tarde hay de sobra y tras la última tarde viene el descanso. Se prefiere el tramo más corto.
  const moverTramo = (c, d, f) => {
    let mejor = null;
    for (const pi of porColectivo[c]) {
      const k = pi * D + d, g = franjaIdx[grid[k]];
      if (g < 0 || g === 2 || g === f || !movible(pi, d) || dias[d].finde) continue;
      let e = d; while (e + 1 < D && T[grid[pi * D + e + 1]].trabaja) e++;
      const largo = e - d + 1;
      if (largo > 3 || (mejor && largo >= mejor.largo)) continue;
      let ok = true;
      for (let x = d; x <= e && ok; x++) {
        const kx = pi * D + x;
        if (dias[x].finde || dias[x].festivo || franjaIdx[grid[kx]] !== g || !movible(pi, x) || origen[kx] === ORIGEN.VACACIONES) ok = false;
        else if (cob[c][g][x] - 1 < necesidad[c][g][x] || prefDe(pi, x, FR[f]) == null) ok = false;
      }
      if (ok) mejor = { pi, e, largo };
      if (mejor && mejor.largo === 1) break;
    }
    if (!mejor) return false;
    const { pi, e } = mejor, antes = [];
    for (let x = d; x <= e; x++) { antes.push([grid[pi * D + x], origen[pi * D + x]]); poner(pi, x, prefDe(pi, x, FR[f]), ORIGEN.CUBRE); }
    const sinMezcla = () => { if (!unaFranja) return true; const l = d - dias[d].dow; for (let x = Math.max(0, l); x <= Math.min(D - 1, l + 6); x++) { const t = T[grid[pi * D + x]]; if (t.trabaja && (t.franja === 'manana' || t.franja === 'tarde') && t.franja !== FR[f]) return false; } return true; };
    if (valida(pi, Math.max(0, d - 1), Math.min(D - 1, e + 1)) && semanaCoherente(pi, d) && sinMezcla()) return true;
    for (let x = d; x <= e; x++) poner(pi, x, antes[x - d][0], antes[x - d][1]);
    return false;
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
            const ti = prefDe(pi, d, FR[f]);
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

  // Días AJ (permiso retribuido del 24 y el 31 de diciembre, convenio art. 36.3): cada persona libra esos días y le
  // cuentan como jornada (las horas del turno que no hace). Modos (cfg.aj.modo):
  //   «fijo»: el 24 y el 31 a quien trabaja de día esas fechas, mientras sobre gente en su franja (servicio 24 h: si
  //           libran todos, el día se queda vacío); a los demás, otro día de su turno entre «desde» y «hasta».
  //   «reparto»: entre «desde» y «hasta», donde más gente sobre (práctica de la empresa: del 20 al 31 de diciembre).
  //   «elegido»: en las fechas que elige cada persona (cfg.aj.elegidos[código]), aunque falte gente (el ajuste cubre
  //              el hueco); si no ha elegido, como «fijo».
  // Las noches no se tocan (van en bloque): quien hace noche el 24 o el 31 tiene su AJ otro día.
  const AJ = { activo: false, modo: 'fijo', fechas: ['12-24', '12-31'], desde: '12-20', hasta: '12-31', enJornada: true, elegidos: {}, ...(cfg.aj || {}) };
  if (AJ.activo && (AJ.fechas || []).length) {
    const iAJ = idx.get('AJ'), enAnio = enCuadrante;
    const d0 = enAnio(AJ.desde) ?? Math.max(0, D - 12), d1 = enAnio(AJ.hasta) ?? D - 1;
    const fijas = AJ.fechas.map(enAnio).filter(d => d != null), n = AJ.fechas.length;
    // Primero quien ya trabajó el 24 o el 31 en años anteriores (festivos que rotan): así libran ellos y trabaja quien
    // todavía no lo ha hecho.
    const rotanAJ = RF.rotan && typeof RF.rotan === 'object' ? RF.rotan : {};
    const yaTrab = (p) => AJ.fechas.filter(md => Array.isArray(rotanAJ[md]) && rotanAJ[md].includes(p.id)).length;
    const ordenAJ = personas.map((p, pi) => pi).sort((a, b) => yaTrab(personas[b]) - yaTrab(personas[a]) || a - b);
    for (const pi of ordenAJ) { const p = personas[pi];
      // Horario libre (fijos discontinuos): no tienen turnos del ciclo; el AJ va en un día de alta y cuenta como su
      // turno de mañana.
      const libreH = p.horarioLibre, tiM = prefDe(pi, 0, 'manana');
      const apto = (d) => d >= p.desde && d < p.hasta && origen[pi * D + d] === ORIGEN.CICLO && (libreH ? permitidoDia(p, d) && !T[grid[pi * D + d]].trabaja && T[grid[pi * D + d]].disponible !== false : T[grid[pi * D + d]].trabaja && franjaIdx[grid[pi * D + d]] !== 2);
      const sobra = (d) => { const f = libreH ? 0 : franjaIdx[grid[pi * D + d]]; return cob[colIdx[pi]][f][d] - necesidad[colIdx[pi]][f][d] + (libreH ? 1 : 0); };
      let quiere = AJ.modo === 'reparto' ? [] : fijas, siempre = false;
      const elegidos = AJ.modo === 'elegido' ? (AJ.elegidos || {})[p.id] : null;
      const listaE = (Array.isArray(elegidos) ? elegidos : elegidos && typeof elegidos === 'object' ? Object.values(elegidos) : []).filter(Boolean);
      if (listaE.length) { quiere = listaE.map(enAnio).filter(d => d != null); siempre = true; }
      const puestos = [];
      let horasAJ = 0;
      const pon = (d) => { horasAJ += libreH ? (tiM != null ? T[tiM].horas : 7) : T[grid[pi * D + d]].horas; poner(pi, d, iAJ, ORIGEN.VACACIONES); puestos.push(d); };
      for (const d of quiere) if (puestos.length < n && apto(d) && (siempre || sobra(d) >= 1)) pon(d);
      // El resto, en la ventana donde más gente sobre; si en la ventana solo tiene noches o libres, antes en diciembre.
      const dic = enCuadrante('12-01') ?? d0;
      for (const [a, b] of [[d0, d1], [Math.min(dic, d0), d1]]) while (puestos.length < n) {
        let mejor = -1, nota = -Infinity;
        for (let d = a; d <= b; d++) { if (!apto(d)) continue; const x = sobra(d); if (x > nota) { nota = x; mejor = d; } }
        if (mejor < 0) break;
        pon(mejor);
      }
      p.diasAJ = puestos.sort((a, b) => a - b).map(d => dias[d].fecha); p.ajFaltan = n - puestos.length;
      p.ajEnFecha = puestos.filter(d => quiere.includes(d)).length; p.ajQuiere = quiere.map(d => dias[d].fecha);
      if (AJ.enJornada) { p.horasAJ = Math.round(horasAJ * 10) / 10; p.objetivo = Math.round((p.objetivo - horasAJ) * 10) / 10; }
    }
  }

  if (ajusteActivo) {
    // Las noches cedidas (por encima de las de oficio) solo se usan cuando con las de oficio no se llega.
    const conCesion = (c) => { if (opciones.cesionDosPasadas) { cesionActiva = false; cubrir(c); } cesionActiva = true; cubrir(c); };
    // Margen para imprevistos: al final, con las noches de oficio y sin tocar lo ya cubierto.
    const conMargenFinal = (c) => { if (!hayMargen) return; aplicarMargen(c); cesionActiva = false; cubrir(c); recortar(c); completar(c); cesionActiva = true; };
    recortarNoches(0); equilibrarNoches(0); subirNoches(0); recortar(0); conCesion(0); recortar(0); completar(0); conMargenFinal(0);
    aplicarRatio();
    recortarNoches(1); equilibrarNoches(1); subirNoches(1); recortar(1); conCesion(1); recortar(1); completar(1); conMargenFinal(1);
  } else aplicarRatio();
  cesionActiva = true;   // desde aquí (mejora del reparto, avisos), cada persona con su tope propio

  // 3 bis c. Relevos por cuartos de hora (con mínimos por cuartos): si en un cuarto de hora falta gente (p. ej. de 14:45
  // a 15:00, cuando ya se ha ido la R1), se cambia ese día a alguien a otro turno de su misma franja y de las mismas
  // horas (R1 → R2 o R3; T2 → T1) que sí cubre ese cuarto, si los cuartos que deja no se quedan por debajo del mínimo y
  // puede (descansos, horas de entrada…). Solo turnos que esa persona ya hace en su ciclo. Se apaga con
  // cfg.cubrirRelevos = false.
  const cubrirRelevos = () => {
    if (cfg.cubrirRelevos === false || !ajusteActivo || !MC) return;
    let cambios = 0;
    for (let c = 0; c < COL.length; c++) {
      if (!Array.isArray(MC[COL[c]])) continue;
      const cq = T.map(cuartosDeTurno);
      const cob = new Int16Array((D + 1) * 96);
      for (let pi = 0; pi < P; pi++) if (colIdx[pi] === c) for (let d = 0; d < D; d++) { const ti = grid[pi * D + d]; if (T[ti].trabaja) for (const q of cq[ti]) cob[d * 96 + q]++; }
      // Turnos que hace cada grupo en su ciclo (las alternativas de cada uno: misma franja y mismas horas).
      const delGrupo = new Map();
      const alternativas = (pi, ti) => {
        // Los fijos discontinuos (horario libre) pueden pasar a la otra franja de día ese día (mañana ↔ tarde).
        if (personas[pi].horarioLibre) return ['manana', 'tarde'].map(f => prefDe(pi, 0, f)).filter(t2 => t2 != null && t2 !== ti && T[t2].trabaja && Math.abs((T[t2].horas || 0) - (T[ti].horas || 0)) < 1e-9);
        const g = personas[pi].grupo;
        if (!delGrupo.has(g)) { const gr = grupos.find(x => x.id === g); delGrupo.set(g, new Set(gr ? resolverPatron(gr, cfg.grupos || []).filter(x => idx.has(x)).map(x => idx.get(x)) : [])); }
        const t = T[ti];
        return [...delGrupo.get(g)].filter(t2 => t2 !== ti && T[t2].trabaja && T[t2].franja === t.franja && Math.abs((T[t2].horas || 0) - (t.horas || 0)) < 1e-9);
      };
      const minQ = (d, q) => minCuarto(c, d, q);
      for (let d = 0; d < D; d++) {
        for (let q = 0; q < 96; q++) {
          let falta = (minQ(d, q) ?? 0) - cob[d * 96 + q];
          let vueltas = 0;
          while (falta > 0 && vueltas++ < 20) {
            let hecho = false;
            for (const pi of porColectivo[c]) {
              const k = pi * D + d, ti = grid[k];
              if (!T[ti].trabaja || origen[k] === ORIGEN.MANUAL || origen[k] === ORIGEN.VACACIONES) continue;
              if (cq[ti].includes(q)) continue;
              for (const t2 of alternativas(pi, ti)) {
                const nuevos = cq[t2];
                if (!nuevos.includes(q)) continue;
                // Lo que deja de cubrir no puede quedarse por debajo del mínimo.
                const deja = cq[ti].filter(x => !nuevos.includes(x));
                if (deja.some(x => { const dd = d + Math.floor(x / 96), qq = x % 96; return dd < D && cob[dd * 96 + qq] - 1 < (minQ(dd, qq) ?? 0); })) continue;
                const o0 = origen[k];
                poner(pi, d, t2, ORIGEN.CUBRE);
                if (!valida(pi, Math.max(0, d - 1), Math.min(D - 1, d + 1)) || (maxEntradas != null && nEntradas[pi] > maxEntradas)) { poner(pi, d, ti, o0); continue; }
                for (const x of cq[ti]) { const dd = d + Math.floor(x / 96); if (dd < D) cob[dd * 96 + (x % 96)]--; }
                for (const x of nuevos) { const dd = d + Math.floor(x / 96); if (dd < D) cob[dd * 96 + (x % 96)]++; }
                cambios++; hecho = true; break;
              }
              if (hecho) break;
            }
            if (!hecho) break;
            falta = (minQ(d, q) ?? 0) - cob[d * 96 + q];
          }
        }
      }
    }
    stats.relevos = cambios;
  };

  // 3 bis d. Si aun así falta gente en algún cuarto de hora (p. ej. un sábado de verano de 15:15 a 16:00), se llama a
  // alguien que libra ese día para un turno que lo cubra (de los de su ciclo; los fijos discontinuos, el de esa franja),
  // empezando por quien menos horas lleva. Es subir el mínimo ese día lo justo para cubrir el relevo.
  const cubrirCuartos = () => {
    if (cfg.cubrirRelevos === false || !ajusteActivo || !MC) return;
    let puestos = 0;
    for (let c = 0; c < COL.length; c++) {
      if (!Array.isArray(MC[COL[c]])) continue;
      const codigos = new Map();
      const turnosDe = (pi, d) => {
        const p = personas[pi];
        if (p.horarioLibre) return FR.map(f => prefDe(pi, d, f)).filter(x => x != null);
        if (!codigos.has(p.grupo)) { const gr = grupos.find(x => x.id === p.grupo); codigos.set(p.grupo, [...new Set(gr ? resolverPatron(gr, cfg.grupos || []).filter(x => idx.has(x)).map(x => idx.get(x)) : [])].filter(t => T[t].trabaja && T[t].franja !== 'noche')); }
        return codigos.get(p.grupo);
      };
      for (let d = 0; d < D; d++) for (let q = 0; q < 96; q++) {
        if (d === 0 && q < 32) continue;
        let vueltas = 0;
        while ((minCuarto(c, d, q) ?? 0) - cobQ[c][d * 96 + q] > 0 && vueltas++ < 10) {
          let mejor = -1, mejorT = -1, nota = Infinity;
          for (const pi of porColectivo[c]) {
            if (!libre(pi, d)) continue;
            const n = horas[pi] / Math.max(1, personas[pi].objetivo);
            if (n >= nota) continue;
            for (const t of turnosDe(pi, d)) if (cqT[t].includes(q) && puede(pi, d, t)) { mejor = pi; mejorT = t; nota = n; break; }
          }
          if (mejor < 0) {
            // Un fijo discontinuo que no puede: trabaja este día y libra otro de esa semana, o el día siguiente (si al día
            // siguiente entraba de mañana y no le daría tiempo a descansar), en que sobre gente. Mismas horas.
            let hecho = false;
            for (const pi of porColectivo[c]) {
              if (hecho || !personas[pi].horarioLibre || !libre(pi, d)) continue;
              const l = d - dias[d].dow;
              for (let x = Math.max(0, l); x <= Math.min(D - 1, Math.max(l + 6, d + 1)) && !hecho; x++) {
                const kx = pi * D + x, tx = grid[kx];
                if (x === d || !T[tx].trabaja || T[tx].franja === 'noche' || origen[kx] === ORIGEN.MANUAL || origen[kx] === ORIGEN.VACACIONES) continue;
                const fx = franjaIdx[tx];
                if (cob[c][fx][x] - 1 < necesidad[c][fx][x] || !cuartosOk(pi, x, tx)) continue;
                const lx = grid[pi * D + d], o0 = origen[kx];
                poner(pi, x, iLibre, ORIGEN.RECORTE);
                const t = turnosDe(pi, d).find(tt => cqT[tt].includes(q) && Math.abs((T[tt].horas || 0) - (T[tx].horas || 0)) < 1e-9 && puede(pi, d, tt));
                if (t != null) { poner(pi, d, t, ORIGEN.CUBRE); if (valida(pi, Math.max(0, l - 1), Math.min(D - 1, Math.max(l + 7, d + 2)))) { hecho = true; puestos++; break; } poner(pi, d, lx, ORIGEN.CICLO); }
                poner(pi, x, tx, o0);
              }
            }
            if (!hecho) break;
            continue;
          }
          poner(mejor, d, mejorT, ORIGEN.CUBRE); puestos++;
        }
      }
    }
    stats.relevosLlamados = puestos;
  };

  // 3 bis e. Fines de semana: lo que falte (por franja o por cuartos) se deja en disponibilidad para la bolsa. Se marca
  // con DB a quien libra ese día y podría hacer ese turno (sin vacaciones, sin noches justo antes ni después), repartido
  // entre la plantilla (primero quien menos disponibilidades lleva). No trabaja ni suma horas: es la lista de la bolsa.
  const disponibilidad = [];
  const dejarDisponibilidad = () => {
    if (!FINDES_BOLSA || !ajusteActivo) return;
    const iDB = idx.get('DB'), nDisp = new Int16Array(P);
    for (let d = 0; d < D; d++) {
      for (let c = 0; c < COL.length; c++) for (let f = 0; f < FR.length; f++) {
        // Sábado y domingo; de noche, también el viernes (la noche del viernes al sábado es de fin de semana).
        if (!(dias[d].finde || (FR[f] === 'noche' && dias[d].dow === 4))) continue;
        // Lo que falta en la franja, o en el peor cuarto de hora de esa franja.
        let falta = real[c][f][d] - cob[c][f][d];
        if (MC && Array.isArray(MC[COL[c]])) {
          const tf = turnoFranja(COL[c], FR[f]);
          for (const q of tf ? cqT[idx.get(tf.codigo)] || [] : []) { const v = minCuarto(c, d, q); if (v != null) falta = Math.max(falta, v - cobQ[c][d * 96 + q]); }
        }
        for (let k = 0; k < falta; k++) {
          let mejor = -1;
          for (const pi of porColectivo[c]) {
            const kk = pi * D + d, t = T[grid[kk]];
            if (t.trabaja || t.codigo !== 'L' || origen[kk] === ORIGEN.MANUAL) continue;
            if (FR[f] === 'noche' ? !franjasDe(personas[pi], d).includes('noche') : !franjasDe(personas[pi], d).includes(FR[f])) continue;
            if (!permitidoDia(personas[pi], d) || (d > 0 && T[grid[kk - 1]].franja === 'noche') || (d < D - 1 && T[grid[kk + 1]].franja === 'noche')) continue;
            if (mejor < 0 || nDisp[pi] < nDisp[mejor]) mejor = pi;
          }
          if (mejor < 0) break;
          grid[mejor * D + d] = iDB; origen[mejor * D + d] = ORIGEN.CUBRE; nDisp[mejor]++;
          disponibilidad.push({ d, fecha: dias[d].fecha, colectivo: COL[c], franja: FR[f], persona: personas[mejor].id });
        }
      }
    }
    stats.disponibilidad = disponibilidad.length;
  };

  // 3 bis a. Librar festivos donde sobra gente: un festivo entre semana tiene un mínimo más bajo (el de festivo), así
  // que sobra gente. Quien más festivos lleva libra ese festivo (D) y hace un turno de la misma franja otro día entre
  // semana que libraba, donde menos gente haya y si puede (descansos, 2 días libres a la semana, fines…). Mismas horas; en el festivo nunca baja del
  // mínimo. Antes esto pasaba solo de rebote, al recortar horas a quien se pasaba. Se apaga con cfg.librarFestivos = false.
  const librarFestivos = () => {
    if (cfg.librarFestivos === false || !ajusteActivo) return;
    const fdias = dias.filter(x => x.festivo && !x.finde).map(x => x.i);
    if (!fdias.length) return;
    const nFest = new Int16Array(P);
    for (let pi = 0; pi < P; pi++) for (const d of fdias) if (T[grid[pi * D + d]].trabaja) nFest[pi]++;
    let librados = 0;
    for (let c = 0; c < COL.length; c++) {
      const lista = porColectivo[c].filter(pi => { const p = personas[pi]; return !p.horarioLibre && !p.altaDias && !p.tramo; });
      for (const d of fdias) {
        const trabajan = lista.filter(pi => { const k = pi * D + d, t = T[grid[k]]; return t.trabaja && (t.franja === 'manana' || t.franja === 'tarde') && (origen[k] === ORIGEN.CICLO || origen[k] === ORIGEN.CUBRE); })
          .sort((a, b) => nFest[b] - nFest[a]);
        for (const pi of trabajan) {
          const k = pi * D + d, ti = grid[k], f = franjaIdx[ti];
          if (cob[c][f][d] - 1 < necesidad[c][f][d] || !cuartosOk(pi, d, ti)) continue;
          // El otro día: libre, no festivo, donde menos gente haya en una franja que pueda hacer.
          let mejorD = -1, mejorTi = -1, mejorNota = Infinity;
          const o0 = origen[k];
          poner(pi, d, iD, ORIGEN.RECORTE);
          for (let d2 = 0; d2 < D; d2++) {
            // Entre semana y en la misma franja: no cambia sus fines de semana ni si la semana es de mañana o de tarde.
            if (d2 === d || dias[d2].festivo || dias[d2].finde || !libre(pi, d2)) continue;
            for (const g of [f]) {
              const t2 = prefDe(pi, d2, FR[g]);
              if (t2 == null || Math.abs((T[t2].horas || 0) - (T[ti].horas || 0)) > 1e-9) continue;
              const nota = (cob[c][g][d2] + 1) / Math.max(1, necesidad[c][g][d2]);
              if (nota >= mejorNota || !puede(pi, d2, t2)) continue;
              mejorNota = nota; mejorD = d2; mejorTi = t2;
            }
          }
          if (mejorD < 0) { poner(pi, d, ti, o0); continue; }
          const k2 = pi * D + mejorD, l2 = grid[k2], o2 = origen[k2];
          poner(pi, mejorD, mejorTi, ORIGEN.CUBRE);
          if (!valida(pi, Math.max(0, mejorD - 1), Math.min(D - 1, mejorD + 1)) || !valida(pi, Math.max(0, d - 1), Math.min(D - 1, d + 1))
            || !semanaCoherente(pi, d) || !semanaCoherente(pi, mejorD)) {
            poner(pi, mejorD, l2, o2); poner(pi, d, ti, o0); continue;
          }
          nFest[pi]--; librados++;
        }
      }
    }
    stats.festivosLibrados = librados;
  };

  // 3 bis. Festivos repartidos (Equidad): que nadie trabaje 2 festivos o más que otra persona de su colectivo. Se
  // cambian dos días entre dos personas: quien lleva más festivos libra un festivo entre semana (d) y a cambio trabaja
  // un día cercano no festivo (d2) que libraba quien lleva menos; esta hace el turno del festivo. Cada día sigue con la
  // misma gente en cada turno y cada persona con las mismas horas; solo se acepta si las dos pueden (descansos, rachas,
  // descanso tras las noches, fines coherentes, casos especiales). No se tocan fines de semana, noches, vacaciones ni
  // cambios a mano. Solo plantilla de todo el año. Se apaga con cfg.equilibrarFestivos = false.
  const festivosRepartidos = () => {
    const movidos = { dias: 0 };
    if (cfg.equilibrarFestivos === false || !ajusteActivo) return movidos;
    const fdias = dias.filter(x => x.festivo && !x.finde).map(x => x.i);
    if (!fdias.length) return movidos;
    const festTrab = new Int16Array(P);
    const contar = (pi) => { let n = 0; for (let d = 0; d < D; d++) { const t = T[grid[pi * D + d]]; if (t.trabaja && cuentaEn(d, t).festivo) n++; } return n; };
    const fijo = (pi, d) => { const o = origen[pi * D + d]; return o === ORIGEN.MANUAL || o === ORIGEN.VACACIONES || o === ORIGEN.AUSENCIA; };
    const deDia = (ti) => T[ti].trabaja && (T[ti].franja === 'manana' || T[ti].franja === 'tarde');
    const intentar = (a, b, d) => {
      const ta = grid[a * D + d], lb = grid[b * D + d];
      for (let k = 1; k <= 21; k++) for (const d2 of [d - k, d + k]) {
        if (d2 < 0 || d2 >= D || dias[d2].finde || dias[d2].festivo) continue;
        const tb = grid[b * D + d2], la = grid[a * D + d2];
        if (!deDia(tb) || fijo(b, d2) || !libre(a, d2)) continue;
        const oa = [origen[a * D + d], origen[a * D + d2]], ob = [origen[b * D + d], origen[b * D + d2]];
        poner(a, d, lb, ORIGEN.MEJORA); poner(b, d2, la, ORIGEN.MEJORA);
        if (puede(b, d, ta) && puede(a, d2, tb)) {
          poner(b, d, ta, ORIGEN.MEJORA); poner(a, d2, tb, ORIGEN.MEJORA);
          const r = (x) => [Math.max(0, x - 1), Math.min(D - 1, x + 1)];
          if (valida(a, ...r(d)) && valida(a, ...r(d2)) && valida(b, ...r(d)) && valida(b, ...r(d2))
            && semanaCoherente(a, d) && semanaCoherente(a, d2) && semanaCoherente(b, d) && semanaCoherente(b, d2)) return true;
        }
        poner(a, d, ta, oa[0]); poner(a, d2, la, oa[1]); poner(b, d, lb, ob[0]); poner(b, d2, tb, ob[1]);
      }
      return false;
    };
    for (let c = 0; c < COL.length; c++) {
      const lista = porColectivo[c].filter(pi => { const p = personas[pi]; return !p.horarioLibre && !p.altaDias && !p.tramo && !(p.desde > 0) && !(p.hasta < D); });
      if (lista.length < 2) continue;
      for (const pi of lista) festTrab[pi] = contar(pi);
      for (let vuelta = 0; vuelta < 8; vuelta++) {
        let hubo = false;
        const ricos = [...lista].sort((x, y) => festTrab[y] - festTrab[x]);
        const minimo = () => lista.reduce((mn, pi) => Math.min(mn, festTrab[pi]), Infinity);
        for (const a of ricos) {
          if (festTrab[a] - minimo() < 2) break;
          for (const d of fdias) {
            if (festTrab[a] - minimo() < 2) break;
            if (!deDia(grid[a * D + d]) || fijo(a, d)) continue;
            const pobres = lista.filter(b => b !== a && festTrab[a] - festTrab[b] >= 2 && libre(b, d)).sort((x, y) => festTrab[x] - festTrab[y]).slice(0, 120);
            for (const b of pobres) {
              if (!intentar(a, b, d)) continue;
              festTrab[a]--; festTrab[b]++; movidos.dias++; hubo = true;
              break;
            }
          }
        }
        if (!hubo) break;
      }
    }
    stats.festivosRepartidos = movidos.dias;
    return movidos;
  };
  librarFestivos();
  festivosRepartidos();
  cubrirRelevos();
  cubrirCuartos();
  dejarDisponibilidad();

  // 4. Equidad: intercambios de semanas enteras entre dos personas del mismo grupo (como el paso de equidad de
  // Calabrio o la búsqueda local de Timefold). Cada día sigue con la misma gente en cada franja (la cobertura no
  // cambia) y cada persona con las mismas horas; solo se acepta si no rompe ninguna regla que use el ajuste.
  // cfg.mejora.intercambios: [{ a, b, d, n }] (códigos de persona, primer día y número de días). Se aplican en orden;
  // los que ya no valen (porque ha cambiado otra cosa) se saltan.
  const mejora = { aplicados: [], saltados: 0, buscados: 0, coste0: 0, coste: 0 };
  const festivoTrab = new Int16Array(P), domingoTrab = new Int16Array(P), especialTrab = new Float64Array(P);
  const historialEsp = (pi) => Number((RF.historial || {})[personas[pi].id]) || 0;
  const recontarEquidad = (pi) => {
    let f = 0, dm = 0, e = 0;
    for (let d = 0; d < D; d++) {
      const t = T[grid[pi * D + d]];
      if (!t.trabaja) continue;
      const x = cuentaEn(d, t);
      if (x.festivo) f++;
      if (especiales.has(x.fecha.slice(5))) e++;
      if (dias[d].dow === 6) dm++;
    }
    festivoTrab[pi] = f; domingoTrab[pi] = dm; especialTrab[pi] = e + historialEsp(pi);
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
      if (!permitidoDia(p, d) || !franjasDe(p, d).includes(x.franja)) return false;
      if (contratoDe(p, d)[x.franja] && contratoDe(p, d)[x.franja] !== x.codigo) return false;
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
      if (minFinesLibresMes != null && !personas[pi].exentoFines && mesFinde[dias[d].semana] >= 0 && libresMes(pi, mesFinde[dias[d].semana]) < minFinesLibresMes) return false;
      if (minFinesLibresEntre != null && !personas[pi].exentoFines && pegados(pi, dias[d].semana)) return false;
    }
    // Y el fin de semana de cada semana tocada sigue en la franja de su semana (aunque el cambio sea entre semana).
    for (let d = a; d <= b; d++) if ((d === a || dias[d].dow === 0) && !semanaCoherente(pi, d)) return false;
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
    if (personas[pa].tramo || personas[pb].tramo) return false;   // con reducción temporal, sus semanas no se cambian
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
  // Festivos que no se repiten (24 y 31 de diciembre, 6 de enero): quien ya trabajó ese día en años anteriores no lo
  // vuelve a trabajar hasta que lo haya trabajado toda la plantilla (cfg.repartoFestivos.rotan: { '12-24': [códigos] }).
  // «Trabajar» un día = tener un turno que empieza ese día. Se intenta cambiar su semana con alguien del mismo grupo que
  // todavía no lo ha trabajado y libra ese día: la cobertura y las horas no cambian.
  const repeticiones = {};
  {
    const rotan = RF.rotan && typeof RF.rotan === 'object' ? RF.rotan : {};
    for (const md of RF.fechasRotan || []) {
      const d = enCuadrante(md); if (d == null) continue;
      const lista = Array.isArray(rotan[md]) ? rotan[md] : [];
      const ya = new Set(lista);
      const plantilla = personas.filter(p => !p.altaDias && p.hasta > p.desde);
      // Si ya lo ha trabajado todo el mundo, la vuelta empieza de nuevo.
      const completa = plantilla.length && plantilla.every(p => ya.has(p.id));
      if (completa) ya.clear();
      const trabaja = (pi) => T[grid[pi * D + d]].trabaja;
      const lunes = d - dias[d].dow, n = Math.min(7, D - Math.max(0, lunes)), d0 = Math.max(0, lunes);
      let cambiados = 0;
      for (let pa = 0; pa < P; pa++) {
        if (!ya.has(personas[pa].id) || !trabaja(pa)) continue;
        for (let pb = 0; pb < P; pb++) {
          if (pb === pa || ya.has(personas[pb].id) || trabaja(pb) || personas[pb].grupo !== personas[pa].grupo) continue;
          if (probarIntercambio(pa, pb, d0, n)) { if (!trabaja(pa)) { cambiados++; break; } intercambiar(pa, pb, d0, n); }
        }
      }
      const trabajan = personas.map((p, pi) => pi).filter(trabaja);
      repeticiones[md] = { fecha: dias[d].fecha, trabajan: trabajan.length, repiten: trabajan.filter(pi => ya.has(personas[pi].id)).map(pi => personas[pi].id),
        yaTrabajado: ya.size, plantilla: plantilla.length, vueltaNueva: !!completa, cambiados };
    }
  }
  // Coste de equidad: por grupo, suma de (valor − media)² de fines de semana, festivos y domingos trabajados.
  // Los intercambios no cambian los totales del grupo, así que la media no se mueve y el cambio se calcula al momento.
  const porGrupo = new Map();
  personas.forEach((p, pi) => { if (!porGrupo.has(p.grupo)) porGrupo.set(p.grupo, []); porGrupo.get(p.grupo).push(pi); });
  const medias = new Map();
  for (const [g, lista] of porGrupo) medias.set(g, [fines, festivoTrab, domingoTrab, especialTrab].map(v => lista.reduce((s, pi) => s + v[pi], 0) / lista.length));
  // Festivos especiales (Nochebuena, Navidad, Nochevieja, Año Nuevo, Reyes…), sumando los de años anteriores
  // (cfg.repartoFestivos.historial): quien los trabajó el año pasado tiende a librarlos este.
  const PESOS = [1, 2, 0.5, 1];   // fines, festivos (el doble: que nadie trabaje 2 más que otro), domingos, especiales
  // Los fijos discontinuos (horario libre, solo en sus periodos de alta) no entran: no se comparan con la plantilla.
  const fueraEquidad = (pi) => !!(personas[pi].horarioLibre || personas[pi].altaDias);
  const costePersona = (pi) => { if (fueraEquidad(pi)) return 0; const m = medias.get(personas[pi].grupo); return PESOS[0] * (fines[pi] - m[0]) ** 2 + PESOS[1] * (festivoTrab[pi] - m[1]) ** 2 + PESOS[2] * (domingoTrab[pi] - m[2]) ** 2 + PESOS[3] * (especialTrab[pi] - m[3]) ** 2; };
  const costeTotal = () => { let c = 0; for (let pi = 0; pi < P; pi++) c += costePersona(pi); return c; };
  mejora.coste0 = mejora.coste = costeTotal();
  // Búsqueda (solo si se pide, desde el botón «Mejorar reparto»): Late Acceptance (Burke y Bykov, 2017), con semilla
  // fija y tiempo límite. Se queda la mejor solución encontrada.
  if (opciones.buscarMejora) {
    const { ms = 3000, semilla = 1, alProgreso, aceptaIgual = false } = opciones.buscarMejora;
    let r = (semilla >>> 0) || 1;
    const azar = () => { r |= 0; r = r + 0x6D2B79F5 | 0; let t = Math.imul(r ^ r >>> 15, 1 | r); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gruposLista = [...porGrupo.values()].filter(l => l.length > 1 && !l.every(fueraEquidad));
    // Cada vuelta elige una persona al azar (los grupos grandes salen más) y otra de su mismo grupo.
    const elegibles = gruposLista.flat().filter(pi => !fueraEquidad(pi));
    const lunes = dias.filter(d => d.dow === 0 && d.i + 7 <= D).map(d => d.i);
    const L = 500, hist = new Float64Array(L).fill(mejora.coste);
    let coste = mejora.coste, mejor = coste, nMejor = mejora.aplicados.length;
    const nuevos = [...mejora.aplicados];
    const fin = Date.now() + ms;
    let it = 0;
    while (gruposLista.length && lunes.length) {
      if ((it & 255) === 0) { if (Date.now() > fin) break; if (alProgreso && (it & 16383) === 0) alProgreso({ it, coste: mejor, coste0: mejora.coste0 }); }
      it++;
      const pa = elegibles[Math.floor(azar() * elegibles.length)], lista = porGrupo.get(personas[pa].grupo);
      const pb = lista[Math.floor(azar() * lista.length)];
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
    const festivosCuentan = [], especialesTrab = [], entradas = new Set();
    for (let d = 0; d < D; d++) {
      const k = pi * D + d, t = T[grid[k]];
      if (origen[k] === ORIGEN.CUBRE || origen[k] === ORIGEN.RECORTE) ajustes++;
      if (origen[k] === ORIGEN.MANUAL) manuales++;
      if (t.franja === 'noche') { rn++; rnMax = Math.max(rnMax, rn); }
      else { if (rn === 1) sueltas++; rn = 0; }
      if (t.trabaja) {
        const x = cuentaEn(d, t);
        if (x.festivo) festivosCuentan.push({ fecha: x.fecha, festivo: x.festivo, d, codigo: t.codigo });
        if (especiales.has(x.fecha.slice(5))) especialesTrab.push(x.fecha);
        entradas.add(t.inicio);
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
    if (maxEntradas != null && entradas.size > maxEntradas) alertas.push(`${entradas.size} horas de entrada distintas (tope ${maxEntradas})`);
    // Bolsa de horas: saldo de partida + lo que queda a su favor en el cuadrante − lo que ya ha cogido (solicitudes).
    const inicial = Number((bolsaCfg.inicial || {})[p.id]) || 0, consumida = Number((bolsaCfg.consumida || {})[p.id]) || 0;
    let devueltas = 0; for (let d = 0; d < D; d++) if (grid[pi * D + d] === iD) devueltas++;
    const aFavor = Math.max(0, horas[pi] - p.objetivo);
    const bolsa = { inicial, aFavor: Math.round(aFavor * 10) / 10, consumida, saldo: Math.round((inicial + aFavor - consumida) * 10) / 10, diasDevueltos: devueltas };
    return { ...p, pi, festivosCuentan, especialesTrab, historialEspeciales: Number((RF.historial || {})[p.id]) || 0, horasEntrada: [...entradas].sort(), topeNoches: maxNoches == null ? null : topeNoches(pi), nochesCedidas: maxNoches == null ? 0 : Math.max(0, noches[pi] - maxNoches), bolsa, nochesSueltas: sueltas,
      // Horas y jornada como se ven: con los días AJ, que cuentan como jornada (convenio art. 36.3). Así la jornada es la
      // del convenio (1.480,5 h) y no la que queda por planificar. horasTrabajadas y objetivoPlan son sin los AJ.
      horas: horas[pi] + (p.horasAJ || 0), objetivo: p.objetivo + (p.horasAJ || 0), horasTrabajadas: horas[pi], objetivoPlan: p.objetivo,
      noches: noches[pi], fines: fines[pi], mananas: man, tardes: tar, trabajados: tra, ajustes, manuales, diferencia: horas[pi] - p.objetivo, alertas };
  });

  // Huecos por hora (solo con mínimos por horas): personas que faltan en cada hora de cada día frente a la tabla.
  let porHoras = null;
  if (MH) {
    const cobH = COL.map(() => new Int16Array((D + 1) * 24));
    const horasT = T.map(horasDeTurno);
    for (let pi = 0; pi < P; pi++) for (let d = 0; d < D; d++) { const ti = grid[pi * D + d]; if (!T[ti].trabaja) continue; for (const h of horasT[ti]) cobH[colIdx[pi]][d * 24 + h]++; }
    porHoras = { colectivos: {}, huecos: [], cuartos: !!MC };
    // Con mínimos por cuartos de hora, los huecos se miden cuarto a cuarto (en personas·hora: cada cuarto cuenta 1/4).
    const cobQ = MC ? COL.map(() => new Int16Array((D + 1) * 96)) : null;
    if (MC) { const cq = T.map(cuartosDeTurno); for (let pi = 0; pi < P; pi++) for (let d = 0; d < D; d++) { const ti = grid[pi * D + d]; if (!T[ti].trabaja) continue; for (const q of cq[ti]) cobQ[colIdx[pi]][d * 96 + q]++; } }
    for (let c = 0; c < COL.length; c++) {
      if (MC && Array.isArray(MC[COL[c]])) {
        const faltaHora = new Float64Array(24), diasCon = new Set(); let total = 0;
        for (let d = 0; d < D; d++) for (let q = 0; q < 96; q++) {
          if (d === 0 && q < 32) continue;   // la madrugada del primer día la cubre la noche del cuadrante anterior
          const v = minCuarto(c, d, q); if (v == null) continue;
          const falta = v - cobQ[c][d * 96 + q];
          if (falta > 0) { faltaHora[q >> 2] += falta / 4; total += falta / 4; diasCon.add(d); porHoras.huecos.push({ colectivo: COL[c], d, fecha: dias[d].fecha, hora: q >> 2, minuto: (q & 3) * 15, falta }); }
        }
        porHoras.colectivos[COL[c]] = { total, dias: diasCon.size, porHora: [...faltaHora], cuartos: true };
        continue;
      }
      if (!Array.isArray(MH[COL[c]])) continue;
      const faltaHora = new Float64Array(24), diasCon = new Set(); let total = 0;
      for (let d = 0; d < D; d++) for (let h = 0; h < 24; h++) {
        if (d === 0 && h < 8) continue;   // la madrugada del primer día la cubre la noche del cuadrante anterior
        const v = minHora(c, d, h); if (v == null) continue;
        const falta = v - cobH[c][d * 24 + h];
        if (falta > 0) { faltaHora[h] += falta; total += falta; diasCon.add(d); porHoras.huecos.push({ colectivo: COL[c], d, fecha: dias[d].fecha, hora: h, falta }); }
      }
      porHoras.colectivos[COL[c]] = { total, dias: diasCon.size, porHora: [...faltaHora] };
    }
  }

  // Puestos en sala: días y franjas con más gente que puestos (sumando los colectivos).
  const puestos = { valor: PUESTOS, max: 0, dias: [] };
  if (PUESTOS) for (let d = 0; d < D; d++) for (let f = 0; f < FR.length; f++) {
    let n = 0; for (let c = 0; c < COL.length; c++) n += cob[c][f][d];
    puestos.max = Math.max(puestos.max, n);
    if (n > PUESTOS) puestos.dias.push({ d, franja: FR[f], fecha: dias[d].fecha, enSala: n });
  }
  const huecos = [];
  // Aguante: cuántas personas pueden faltar cada día y franja sin bajar del mínimo real.
  const aguante = COL.map((_, c) => FR.map((_, f) => Int32Array.from(cob[c][f], (n, d) => n - real[c][f][d])));
  for (let c = 0; c < COL.length; c++) for (let f = 0; f < FR.length; f++) for (let d = 0; d < D; d++) {
    const falta = real[c][f][d] - cob[c][f][d];
    if (falta > 0) huecos.push({ colectivo: COL[c], franja: FR[f], d, fecha: dias[d].fecha, falta });
  }

  return {
    dias, personas: filas, turnos: T, turnosMap, idx, grid, origen, D, P,
    cobertura: cob, necesidad: real, necesidadPlan: necesidad, aguante, margen, absentismo: ABS, cesion, bolsa: bolsaCfg, colectivos: COL, franjas: FR, huecos, stats, vacaciones, mejora,
    patrones, ms: Date.now() - t0, semanaCiclo0, repartoFestivos: RF, aj: AJ, repeticiones, porHoras, puestos, disponibilidad,
    // Gente en sala y mínimo por cuartos de hora (para ver los mínimos por horas de un día en el cuadrante).
    cuartos: MH ? { cob: cobQ, min: (c, d, q) => (MC && Array.isArray(MC[COL[c]]) ? minCuarto(c, d, q) : minHora(c, d, Math.floor(q / 4))) } : null,
    codigo: (pi, d) => T[grid[pi * D + d]].codigo, inicioCuadrante: inicioCuad,
    // Meses del cuadrante, en orden (con el año de 15 a 15 de enero hay 13: enero partido en dos).
    meses: [...new Map(dias.map(x => [x.mc, { mc: x.mc, mes: x.mes, anio: x.anio }])).values()],
  };
}

export function fmtH(h) {
  return (Math.round(h * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
