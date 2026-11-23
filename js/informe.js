// Informe de una persona del cuadrante: cifras del año y comprobación de cada regla, con las fechas
// que fallan. No toca la página: lo usan la vista Informes y el PDF, y se prueba con Node.
import { ORIGEN } from './motor.js';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fechaTxt = (iso) => `${Number(iso.slice(8))} ${MESES_CORTOS[Number(iso.slice(5, 7)) - 1]}`;
const h1 = (n) => (Math.round(n * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });

// Comprobaciones. Cada una devuelve { id, titulo, ok, resumen, fechas: [], norma } o null si no aplica.
// «norma» dice de dónde sale la regla, para que el informe se pueda defender.
export function analizarPersona(res, pi, cfg) {
  const p = res.personas[pi], D = res.D, T = res.turnos, dias = res.dias;
  const R = cfg.reglas || {};
  const reg = (k) => (R[k] && R[k].activo ? R[k].valor : null);
  const celda = (d) => T[res.grid[pi * D + d]];
  const org = (d) => res.origen[pi * D + d];
  const trabaja = (d) => d >= 0 && d < D && celda(d).trabaja;
  const noche = (d) => d >= 0 && d < D && celda(d).franja === 'noche';

  // ── Cifras ──
  const c = { mananas: 0, tardes: 0, noches: 0, trabajados: 0, libres: 0, vacaciones: 0, descansoExceso: 0, salientes: 0,
    festivosTrabajados: [], festivosLibres: [], ajustes: 0, manuales: 0, horas: 0 };
  const porCodigo = {};
  for (let d = 0; d < D; d++) {
    const t = celda(d);
    porCodigo[t.codigo] = (porCodigo[t.codigo] || 0) + 1;
    if (t.trabaja) {
      c.trabajados++; c.horas += t.horas;
      if (t.franja === 'manana') c.mananas++; else if (t.franja === 'tarde') c.tardes++; else c.noches++;
      if (dias[d].festivo) c.festivosTrabajados.push(dias[d]);
    } else {
      if (t.codigo === 'V') c.vacaciones++; else if (t.codigo === 'D') c.descansoExceso++; else if (t.codigo === 'SN') c.salientes++; else c.libres++;
      if (dias[d].festivo) c.festivosLibres.push(dias[d]);
    }
    if (org(d) === ORIGEN.CUBRE || org(d) === ORIGEN.RECORTE) c.ajustes++;
    if (org(d) === ORIGEN.MANUAL) c.manuales++;
  }
  const semanas = new Map(); // semana → { finde: bool, franjasLV: {}, franjasFinde: {} }
  for (let d = 0; d < D; d++) {
    const w = dias[d].semana, t = celda(d);
    if (!semanas.has(w)) semanas.set(w, { finde: false, lv: {}, fs: {}, primerDia: d });
    const s = semanas.get(w);
    if (!t.trabaja) continue;
    if (dias[d].finde) { s.finde = true; s.fs[t.franja] = (s.fs[t.franja] || 0) + 1; } else s.lv[t.franja] = (s.lv[t.franja] || 0) + 1;
  }
  c.fines = [...semanas.values()].filter(s => s.finde).length;

  const comp = [];
  const add = (x) => x && comp.push(x);

  // Horas
  {
    const tope = reg('tope');
    const dif = p.horas - p.objetivo;
    // Un exceso menor que el turno más corto no se puede quitar sin bajar de la jornada (1.480,5 h no es
    // múltiplo de 7): va a bolsa y no se avisa. Se avisa lo que pase de eso y del tope de bolsa.
    const turnoCorto = Math.min(...T.filter(t => t.trabaja && t.horas > 0).map(t => t.horas));
    const inevitable = dif > 0 && dif < turnoCorto;
    const ok = dif >= 0 && (tope == null || dif <= Number(tope) || inevitable);
    add({ id: 'horas', titulo: 'Horas del año frente a la jornada anual', ok,
      resumen: `${h1(p.horas)} h planificadas para ${h1(p.objetivo)} h${p.horasSueltas && p.sueltosEnJornada ? ` (jornada de ${h1(p.objetivoBase)} h + ${h1(p.horasSueltas)} h de los días sueltos de vacaciones, que se piden durante el año)` : ` de jornada${p.horasSueltas ? ` (los días sueltos de vacaciones, ${h1(p.horasSueltas)} h, no se planifican: se restan cuando se piden)` : ''}`}: ${dif >= 0 ? '+' : '-'}${h1(Math.abs(dif))} h${inevitable ? ', que van a bolsa (menos de un turno: no se pueden quitar sin bajar de la jornada)' : ''}${tope != null ? `. Bolsa admitida: ${h1(tope)} h` : ''}.${dif < 0 && (p.diasLibres || []).length ? ' Por su día libre fijo: con el máximo de días seguidos y el tope de fines de semana no caben más turnos. La sección lo revisa caso a caso.' : ''}`,
      fechas: [], norma: 'Jornada anual del grupo (Parámetros → Grupos)', normas: ['jornadaAnualTurnos6', 'sin6TurnoC', 'jornadaMalagaConAJ', 'noPlanificarBajoObligacion', 'horasBolsaPlanificadas'] });
  }
  // Noches al año
  if (reg('maxNoches') != null) {
    const oficio = Number(reg('maxNoches')), max = p.topeNoches != null ? p.topeNoches : oficio;
    add({ id: 'maxNoches', titulo: 'Noches al año', ok: c.noches <= max, resumen: `${c.noches} noches; tope ${max}${max > oficio ? ` (${oficio} de oficio + hasta ${max - oficio} cedidas)` : ''}.${p.nochesCedidas ? ` ${p.nochesCedidas} noches cedidas, que van a su bolsa de horas o se le devuelven con descansos.` : ''}`, fechas: [], norma: 'Regla «Máximo de noches al año»', normas: ['noches14DeOficio', 'tope14Noches', 'nochesAnuales'] });
  }
  // Bloques de noche
  if (R.bloquesNoche && R.bloquesNoche.activo) {
    const malos = [];
    for (let d = 0; d < D; d++) {
      if (!noche(d) || noche(d - 1)) continue;
      let n = 1; while (noche(d + n)) n++;
      if (n === 1 && d > 0 && d < D - 1) malos.push(`${fechaTxt(dias[d].fecha)} (noche suelta)`); // el 1-1 y el 31-12 siguen en el año de al lado
    }
    add({ id: 'bloquesNoche', titulo: `Noches en bloques (${R.bloquesNoche.valor})`, ok: malos.length === 0,
      resumen: malos.length ? `${malos.length} noches sueltas, fuera de bloque.` : 'Todas las noches van en bloque.', fechas: malos, norma: 'Regla «Noches en bloques»', normas: ['bloques223'] });
  }
  if (reg('maxNochesSeguidas') != null) {
    const max = Number(reg('maxNochesSeguidas')), malos = [];
    for (let d = 0; d < D; d++) { if (!noche(d) || noche(d - 1)) continue; let n = 1; while (noche(d + n)) n++; if (n > max) malos.push(`${fechaTxt(dias[d].fecha)}: ${n} noches`); }
    add({ id: 'maxNochesSeguidas', titulo: 'Noches seguidas', ok: !malos.length, resumen: malos.length ? `${malos.length} tramos con más de ${max} noches seguidas.` : `Nunca más de ${max} noches seguidas.`, fechas: malos, norma: 'Regla «Máximo de noches seguidas»', normas: ['maxNochesSeguidasOficio'] });
  }
  // Fines de semana
  if (reg('maxFines') != null && !p.exentoFines) {
    const max = Number(reg('maxFines'));
    add({ id: 'maxFines', titulo: 'Fines de semana trabajados', ok: c.fines <= max, resumen: `${c.fines} fines de semana con algún turno; tope ${max}.`, fechas: [], norma: 'Regla «Máximo de fines de semana al año»', normas: ['finesUnoDeTres', 'finesTopeReal'] });
  }
  if (reg('maxFinesSeguidos') != null && !p.exentoFines) {
    const max = Number(reg('maxFinesSeguidos')), malos = []; let racha = 0, inicio = null;
    for (const s of semanas.values()) {
      if (s.finde) { if (!racha) inicio = s.primerDia; racha++; if (racha === max + 1) malos.push(`desde la semana del ${fechaTxt(dias[inicio].fecha)}`); } else racha = 0;
    }
    add({ id: 'maxFinesSeguidos', titulo: 'Fines de semana seguidos', ok: !malos.length, resumen: malos.length ? `${malos.length} veces con más de ${max} fines de semana seguidos.` : `Nunca más de ${max} seguidos.`, fechas: malos, norma: 'Regla «Máximo de fines de semana seguidos» (práctica del horario de 2027)', normas: ['finesSeguidosMax'] });
  }
  if (reg('minFinesLibresMes') != null && !p.exentoFines) {
    // Fines de semana sin turno de cada mes (cuenta el mes del sábado).
    const min = Number(reg('minFinesLibresMes')), porMes = new Map();
    for (const s of semanas.values()) {
      let sab = null;
      for (let d = s.primerDia; d < Math.min(D, s.primerDia + 7); d++) if (dias[d].semana === dias[s.primerDia].semana && dias[d].dow === 5) sab = dias[d];
      if (!sab) continue;
      const m = porMes.get(sab.mes) || { libres: 0, fecha: sab.fecha };
      if (!s.finde) m.libres++;
      porMes.set(sab.mes, m);
    }
    const malos = [...porMes.values()].filter(m => m.libres < min).map(m => `${MESES_LARGOS[Number(m.fecha.slice(5, 7)) - 1]}: ${m.libres}`);
    add({ id: 'minFinesLibresMes', titulo: 'Fin de semana libre cada mes', ok: !malos.length, resumen: malos.length ? `${malos.length} meses con menos de ${min} fin${min === 1 ? '' : 'es'} de semana libre${min === 1 ? '' : 's'}.` : `Todos los meses tienen al menos ${min} fin${min === 1 ? '' : 'es'} de semana libre${min === 1 ? '' : 's'} (sábado y domingo sin turno).`, fechas: malos, norma: 'Regla «Fines de semana libres cada mes» (decisión de la sección; práctica del horario de 2027)', normas: ['finLibreCadaMes'] });
  }
  if (reg('minFinesLibresEntre') != null && !p.exentoFines) {
    // Patrón «2 de descanso y 1 de trabajo»: entre dos fines de semana trabajados, al menos N libres.
    const min = Number(reg('minFinesLibresEntre')), malos = []; let ultimo = -1, k = 0;
    for (const s of semanas.values()) {
      if (s.finde) { if (ultimo >= 0 && k - ultimo - 1 < min) malos.push(`semana del ${fechaTxt(dias[s.primerDia].fecha)} (${k - ultimo - 1} libre${k - ultimo - 1 === 1 ? '' : 's'} antes)`); ultimo = k; }
      k++;
    }
    add({ id: 'minFinesLibresEntre', titulo: `Patrón de fines de semana: ${min} de descanso y 1 de trabajo`, ok: !malos.length,
      resumen: malos.length ? `${malos.length} fines de semana trabajados con menos de ${min} libres antes.` : `Siempre al menos ${min} fines de semana libres entre dos trabajados.`,
      fechas: malos, norma: 'Regla «Fines de semana libres entre dos trabajados»', normas: ['finesUnoDeTres'] });
  }
  // Fin de semana coherente con la semana (sin tardes de fin de semana en semana de mañana y al revés)
  {
    const malos = [];
    for (const s of semanas.values()) {
      if (!s.finde) continue;
      const lv = (s.lv.manana || 0) >= (s.lv.tarde || 0) ? 'manana' : 'tarde';
      if (!(s.lv.manana || s.lv.tarde)) continue;
      if ((lv === 'manana' && s.fs.tarde) || (lv === 'tarde' && s.fs.manana)) malos.push(`semana del ${fechaTxt(dias[s.primerDia].fecha)}: ${lv === 'manana' ? 'mañana entre semana y tarde el fin de semana' : 'tarde entre semana y mañana el fin de semana'}`);
    }
    add({ id: 'coherenciaFinde', titulo: 'Fin de semana en el mismo turno que la semana', reivindicacion: true, ok: !malos.length,
      resumen: malos.length ? `${malos.length} fines de semana en turno distinto al de su semana.` : 'Todos los fines de semana van en el turno de su semana.', fechas: malos, norma: 'Reivindicación CGT (queja de 2024 sobre el rotatorio)', normas: ['finesCoherentesSemana', 'finesAlternosMT'] });
  }
  // Descanso entre jornadas
  if (reg('descanso') != null) {
    const h = Number(reg('descanso')), malos = [];
    for (let d = 1; d < D; d++) {
      const a = celda(d - 1), b = celda(d);
      if (a.trabaja && b.trabaja && b.ini + 1440 - a.fm < h * 60) malos.push(`${fechaTxt(dias[d - 1].fecha)} ${a.codigo} → ${fechaTxt(dias[d].fecha)} ${b.codigo}: ${h1((b.ini + 1440 - a.fm) / 60)} h`);
    }
    add({ id: 'descanso', titulo: `Descanso de ${h} h entre jornadas`, ok: !malos.length, resumen: malos.length ? `${malos.length} cambios de turno con menos de ${h} h de descanso.` : `Siempre al menos ${h} h entre un turno y el siguiente.`, fechas: malos, norma: 'Convenio y Estatuto de los Trabajadores (12 h entre jornadas)', normas: ['descansoEntreJornadas'] });
  }
  // Días seguidos
  if (reg('maxSeguidos') != null) {
    const max = Number(reg('maxSeguidos')), malos = [];
    for (let d = 0; d < D; d++) { if (!trabaja(d) || trabaja(d - 1)) continue; let n = 1; while (trabaja(d + n)) n++; if (n > max) malos.push(`${fechaTxt(dias[d].fecha)}: ${n} días seguidos`); }
    add({ id: 'maxSeguidos', titulo: 'Días de trabajo seguidos', ok: !malos.length, resumen: malos.length ? `${malos.length} rachas de más de ${max} días.` : `Nunca más de ${max} días seguidos.`, fechas: malos, norma: 'Regla «Máximo de días seguidos» (decisión de la sección: 5)', normas: ['maxDiasSeguidos'] });
  }
  // Descanso semanal: día y medio sin interrupción, acumulable en periodos de 14 días (ET art. 37.1).
  // Se comprueba que en cada quincena (dos semanas de lunes a domingo) haya al menos 3 días sin trabajar.
  {
    const malos = [];
    const lista = [...semanas.entries()];
    for (let i = 0; i + 1 < lista.length; i += 2) {
      const a = lista[i][1].primerDia, fin = lista[i + 1][1].primerDia + 7;
      let libres = 0; for (let d = a; d < Math.min(D, fin); d++) if (!trabaja(d)) libres++;
      if (fin - a === 14 && libres < 3) malos.push(`quincena del ${fechaTxt(dias[a].fecha)}: ${libres} días libres`);
    }
    add({ id: 'descansoSemanal', titulo: 'Descanso semanal (día y medio, acumulable en 14 días)', ok: !malos.length,
      resumen: malos.length ? `${malos.length} quincenas con menos de 3 días libres.` : 'Cada quincena tiene al menos 3 días libres.', fechas: malos, norma: 'Descanso semanal de 36 h acumulable en 14 días (comprobación aproximada)', normas: ['descansoSemanal36h'] });
  }
  // Festivos trabajados: hay que devolverlos
  if (c.festivosTrabajados.length) {
    add({ id: 'festivos', titulo: 'Festivos trabajados (a devolver)', ok: null,
      resumen: `${c.festivosTrabajados.length} festivos con turno: deben compensarse con un día de descanso (FM/FT).`,
      fechas: c.festivosTrabajados.map(d => `${fechaTxt(d.fecha)}: ${d.festivo}`), norma: 'Devolución de festivos (FM/FT)', normas: ['festivosAjusteAnual', 'festivosSabadoNoCuentan'] });
  }
  // Vacaciones
  const asig = res.vacaciones && res.vacaciones.porPersona.get(p.id);
  add({ id: 'vacaciones', titulo: 'Vacaciones en el cuadrante', ok: asig ? true : null,
    resumen: asig ? `${asig.periodo === 'fuera' ? 'Fuera de los periodos' : `Periodo ${asig.periodo}`}: del ${fechaTxt(asig.inicio)} al ${fechaTxt(asig.fin)} (${c.vacaciones} días). ${asig.motivo}.` : `${c.vacaciones} días de vacaciones (V).`, fechas: [], norma: 'Vacaciones del grupo (Parámetros → Grupos)', normas: ['vacacionesDias', 'bloqueEstival17'] });

  // ── Comprobaciones sacadas de la normativa (docs/fuentes-cgt/reglas-catalogo.md) ──
  const grupo = (cfg.grupos || []).find(g => g.id === p.grupo) || {};
  const soloLV = !!grupo.soloLaborables;
  // Más de 14 noches de oficio + 7 recibidas por cesión
  add({ id: 'nochesCesion', titulo: 'Noches por encima de las de oficio', ok: c.noches <= 21,
    resumen: c.noches > 14 ? `${c.noches} noches: ${c.noches - 14} por encima de las 14 de oficio${c.noches > 21 ? ', más de las 7 que se pueden recibir por cesión' : ' (deben ser cedidas y voluntarias)'}.` : 'Ninguna noche por encima de las 14 de oficio.',
    fechas: [], norma: '14 de oficio y hasta 7 recibidas por cesión', normas: ['cesionNochesAntes', 'receptoresNoches'] });
  // Grupos de lunes a viernes (C, P, línea 900): sin noches ni festivos
  if (soloLV) {
    const malos = [];
    for (let d = 0; d < D; d++) if (trabaja(d) && (celda(d).franja === 'noche' || dias[d].festivo)) malos.push(`${fechaTxt(dias[d].fecha)} ${celda(d).codigo}${dias[d].festivo ? ' (festivo)' : ''}`);
    add({ id: 'turnoC', titulo: 'Turno de lunes a viernes: sin noches ni festivos', ok: !malos.length, resumen: malos.length ? `${malos.length} días con noche o en festivo.` : 'Sin noches ni festivos trabajados.', fechas: malos, norma: 'Turno C, partido y línea 900', normas: ['turnosConNoches', 'festivosConTurno'] });
  }
  // Ningún turno de más de 12 horas
  {
    const malos = []; for (let d = 0; d < D; d++) if (celda(d).horas > 12) malos.push(`${fechaTxt(dias[d].fecha)} ${celda(d).codigo}: ${h1(celda(d).horas)} h`);
    add({ id: 'maxHorasDia', titulo: 'Ningún turno de más de 12 h', ok: !malos.length, resumen: malos.length ? `${malos.length} turnos de más de 12 h.` : 'Ningún turno pasa de 12 h.', fechas: malos, norma: 'Jornada máxima diaria', normas: ['maxHorasDia'] });
  }
  // Descanso tras un bloque de noches (reivindicación: al menos 2 días)
  if (c.noches) {
    const malos = [], minimo = reg('descansoTrasNoche') != null ? Number(reg('descansoTrasNoche')) : 2;
    for (let d = 0; d < D; d++) {
      if (!noche(d) || noche(d + 1)) continue; // último día del bloque
      let libres = 0; for (let x = d + 1; x < D && !trabaja(x); x++) libres++;
      if (d + minimo < D && libres < minimo) malos.push(`bloque que acaba el ${fechaTxt(dias[d].fecha)}: ${libres} ${libres === 1 ? 'día' : 'días'} sin turno`);
    }
    add({ id: 'descansoTrasNoche', titulo: `Al menos ${minimo} días sin turno tras un bloque de noches`, reivindicacion: reg('descansoTrasNoche') == null, ok: !malos.length,
      resumen: malos.length ? `${malos.length} bloques con menos de ${minimo} días de descanso después.` : `Tras cada bloque de noches hay al menos ${minimo} días sin turno.`, fechas: malos,
      norma: reg('descansoTrasNoche') != null ? 'Regla «Días sin turno después de un bloque de noches» (práctica actual: 3 o 5)' : 'Reivindicación: al menos 2 (la práctica actual da 3 o 5)', normas: ['descansoTrasBloqueNoche'] });
  }
  // Dos días de descanso por semana (reivindicación)
  {
    const malos = [];
    for (const s of semanas.values()) {
      if (s.primerDia + 7 > D) continue;
      let libres = 0; for (let x = s.primerDia; x < s.primerDia + 7; x++) if (!trabaja(x)) libres++;
      if (libres < 2) malos.push(`semana del ${fechaTxt(dias[s.primerDia].fecha)}: ${libres} ${libres === 1 ? 'día libre' : 'días libres'}`);
    }
    add({ id: 'dosDiasSemana', titulo: 'Dos días de descanso cada semana', reivindicacion: true, ok: !malos.length, resumen: malos.length ? `${malos.length} semanas con menos de 2 días sin turno.` : 'Todas las semanas tienen al menos 2 días sin turno.', fechas: malos, norma: 'Reivindicación sindical', normas: ['dosDiasDescansoSemana'] });
  }
  // Vacaciones: al menos 11 días entre el 1 de junio y el 31 de octubre; como mucho 1 suelto del 1-10 al 22-12
  if (c.vacaciones) {
    const anioTxt = String(cfg.anio);
    const enVerano = dias.filter(d => d.fecha >= `${anioTxt}-06-01` && d.fecha <= `${anioTxt}-10-31` && celda(d.i).codigo === 'V').length;
    add({ id: 'vacacionesVerano', titulo: 'Al menos 11 días de vacaciones entre junio y octubre', ok: enVerano >= 11, resumen: `${enVerano} días de vacaciones entre el 1 de junio y el 31 de octubre.`, fechas: [], norma: 'Convenio: mitad de las vacaciones en el periodo preferente', normas: ['vacacionesMitadVerano', 'bloqueEstival17'] });
    let sueltas = 0;
    for (let d = 0; d < D; d++) {
      if (celda(d).codigo !== 'V' || dias[d].fecha < `${anioTxt}-10-01` || dias[d].fecha > `${anioTxt}-12-22`) continue;
      if (!(d > 0 && celda(d - 1).codigo === 'V') && !(d + 1 < D && celda(d + 1).codigo === 'V')) sueltas++;
    }
    add({ id: 'vacacionesOctDic', titulo: 'Como mucho 1 día suelto de vacaciones entre el 1 de octubre y el 22 de diciembre', ok: sueltas <= 1, resumen: `${sueltas} días sueltos en ese periodo.`, fechas: [], norma: 'Protocolo de vacaciones', normas: ['vacacionesOctDic'] });
  }
  // Rotatorio: 3 semanas de mañana y 1 de tarde, y 70 % de turnos rotatorios por semestre (plus)
  const patron = (cfg.grupos || []).length ? (() => {
    let g = grupo; const vistos = new Set();
    while (g && g.patronDe && !vistos.has(g.id)) { vistos.add(g.id); g = cfg.grupos.find(x => x.id === g.patronDe) || null; }
    return (g && g.patron) || [];
  })() : [];
  const codigosPatron = new Set(patron);
  const franjasPatron = new Set(patron.map(cc => (T.find(t => t.codigo === cc) || {}).franja));
  if (franjasPatron.has('manana') && franjasPatron.has('tarde')) {
    let sm = 0, st = 0;
    for (const s of semanas.values()) { const m = s.lv.manana || 0, t = s.lv.tarde || 0; if (m > t) sm++; else if (t > m) st++; }
    const pct = sm + st ? Math.round(sm * 100 / (sm + st)) : 0;
    // Dato, no aviso: el 3+1 es la norma del rotatorio actual, que convive con turnos fijos. En un turno común
    // el reparto de mañanas y tardes sigue a lo que hay que cubrir.
    add({ id: 'rotacion3M1T', titulo: 'Semanas de mañana y de tarde', ok: null,
      resumen: `${sm} semanas de mañana y ${st} de tarde (${pct} % de mañana). En el rotatorio actual la norma es 3+1 (75 %).`, fechas: [], norma: 'Modelo de rotatorio vigente (como referencia)', normas: ['rotacion3M1T', 'rotacionIrregular'] });
    const semestres = [[0, 5], [6, 11]].map(([a, b]) => {
      let rot = 0, tot = 0;
      for (let d = 0; d < D; d++) { if (dias[d].mes < a || dias[d].mes > b || !trabaja(d)) continue; tot++; if (codigosPatron.has(celda(d).codigo)) rot++; }
      return tot ? Math.round(rot * 100 / tot) : 100;
    });
    add({ id: 'plusRotatorio', titulo: 'Turnos rotatorios por semestre (requisito del plus: 70 %)', ok: semestres.every(x => x >= 70),
      resumen: `Primer semestre ${semestres[0]} %, segundo semestre ${semestres[1]} %.`, fechas: [], norma: 'Convenio: plus rotatorio', normas: ['plusRotatorio70'] });
  }
  // Horas que generan pluses (dato)
  {
    let hNoche = 0, hFinde = 0, hFest = 0;
    for (let d = 0; d < D; d++) {
      const t = celda(d); if (!t.trabaja) continue;
      if (t.franja === 'noche') hNoche += t.horas;
      if (dias[d].finde) hFinde += t.horas;
      if (dias[d].festivo) hFest += t.horas;
    }
    add({ id: 'horasPlus', titulo: 'Horas con plus', ok: null, resumen: `${h1(hNoche)} h de noche, ${h1(hFinde)} h en sábado o domingo y ${h1(hFest)} h en festivo (por el día en que empieza el turno).`, fechas: [], norma: 'Pluses por hora del convenio', normas: ['plusesPorHora', 'franjaNocturna'] });
  }

  return { persona: p, cifras: c, porCodigo, comprobaciones: comp,
    // «revisar»: incumplimientos de la normativa. «propuestas»: reivindicaciones sindicales que no se cumplen.
    revisar: comp.filter(x => x.ok === false && !x.reivindicacion).length,
    propuestas: comp.filter(x => x.ok === false && x.reivindicacion).length, sede: cfg.nombre, anio: cfg.anio };
}
