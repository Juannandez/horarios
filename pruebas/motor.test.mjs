// Prueba del motor con los datos de partida de cada sede: node pruebas/motor.test.mjs
import { generar, estimarPatron, prepararTurno } from '../js/motor.js';
import { CONFIG_BASE } from '../js/datos-base.js';
import assert from 'node:assert/strict';

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
assert.equal(prepararTurno({ codigo: 'N', inicio: '22:00', fin: '08:00', franja: 'noche' }).horas, 10);

for (const sede of CONFIG_BASE.sedes) {
  const r = generar(structuredClone(sede));
  console.log(`\n== ${sede.nombre}: ${r.P} personas, ${r.ms} ms`, r.stats);
  const porGrupo = {};
  for (const p of r.personas) (porGrupo[p.grupo] ??= []).push(p);
  for (const [g, ps] of Object.entries(porGrupo)) {
    console.log(g.padEnd(6), String(ps.length).padStart(3), 'horas', med(ps.map(p => p.horas)), 'noches', med(ps.map(p => p.noches)), 'máx', Math.max(...ps.map(p => p.noches)),
      'fines', med(ps.map(p => p.fines)), 'avisos', ps.filter(p => p.alertas.length).length);
  }
  const huecos = {};
  for (const h of r.huecos) huecos[`${h.colectivo} ${h.franja}`] = (huecos[`${h.colectivo} ${h.franja}`] || 0) + h.falta;
  console.log('huecos', huecos);
  assert.equal(r.D, 365);
  assert.ok(r.P > 0);
  // Nadie por debajo de su objetivo y ningún patrón de partida con más días seguidos de los permitidos.
  for (const p of r.personas) {
    // Los refuerzos temporales (grupo con fechas) solo cubren huecos: pueden quedar por debajo de su jornada prorrateada.
    if (p.grupo !== 'rv') assert.ok(p.horas >= p.objetivo - 7, `${p.id} con ${p.horas} h`);
    assert.ok(!p.alertas.some(a => a.includes('días seguidos')), `${p.id}: ${p.alertas}`);
  }
}
const tm = new Map(CONFIG_BASE.sedes[0].turnos.map(t => [t.codigo, prepararTurno(t)]));
console.log('\npatrón rotatorio:', estimarPatron(CONFIG_BASE.sedes[0].grupos[0].patron, tm));
console.log('OK');

// ── Noches en bloques (2-2-3), reglas que se quitan y festivos ───────────────
import { parseBloques } from '../js/motor.js';
import { calcularFestivos, domingoPascua } from '../js/festivos.js';
assert.deepEqual(parseBloques('2-2-3'), [[0, 1], [2, 3], [4, 5, 6]]);
assert.equal(parseBloques('2-2-2'), null);
{
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  sede.festivos = calcularFestivos(sede.festivos, 2027).lista;
  const r = generar(sede);
  // Las noches que pone el ajuste van en bloques completos: lunes-martes, miércoles-jueves o viernes-domingo.
  let malos = 0, bloquesAjuste = 0;
  for (const p of r.personas) {
    for (let d = 0; d < r.D; d++) {
      const k = p.pi * r.D + d;
      if (r.turnos[r.grid[k]].franja !== 'noche' || r.origen[k] !== 2) continue;
      if (d > 0 && r.turnos[r.grid[k - 1]].franja === 'noche') continue; // no es inicio de bloque
      let n = 1; while (d + n < r.D && r.turnos[r.grid[k + n]].franja === 'noche') n++;
      const dow = r.dias[d].dow; bloquesAjuste++;
      const ok = (dow === 0 && n === 2) || (dow === 2 && n === 2) || (dow === 4 && n === 3) || d === 0 || d + n === r.D;
      if (!ok) malos++;
    }
  }
  console.log('bloques de noche puestos por el ajuste:', bloquesAjuste, '· fuera de 2-2-3:', malos);
  assert.ok(bloquesAjuste > 0 && malos === 0);
  // Quitar una regla: sin tope de noches, alguien puede pasar de 14.
  const sin = structuredClone(sede); delete sin.reglas.maxNoches;
  const r2 = generar(sin);
  console.log('sin tope de noches, máximo:', Math.max(...r2.personas.map(p => p.noches)));
}
{
  assert.equal(domingoPascua(2027), '2027-03-28');
  const sev = calcularFestivos(CONFIG_BASE.sedes[0].festivos, 2027).lista.map(h => h.fecha);
  const mal = calcularFestivos(CONFIG_BASE.sedes[1].festivos, 2027).lista.map(h => h.fecha);
  // BOJA 84/2026 (anexo) + BOJA 210/2026 (locales).
  const andalucia = ['2027-01-01', '2027-01-06', '2027-03-01', '2027-03-25', '2027-03-26', '2027-05-01', '2027-08-16', '2027-10-12', '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25'];
  assert.deepEqual(sev, [...andalucia, '2027-04-14', '2027-05-27'].sort());
  assert.deepEqual(mal, [...andalucia, '2027-08-19', '2027-09-08'].sort());
  console.log('festivos 2027 = BOJA en Sevilla y Málaga');
}
console.log('OK bloques, reglas y festivos');

// ── Informes y normativa ──────────────────────────────────────────────────────
import { analizarPersona } from '../js/informe.js';
import { NORMATIVA } from '../js/normativa.js';
import { REGLAS_CATALOGO } from '../js/datos-base.js';
{
  const ids = new Set(NORMATIVA.map(r => r.id));
  assert.ok(NORMATIVA.length >= 190);
  for (const r of REGLAS_CATALOGO) for (const n of r.normas || []) assert.ok(ids.has(n), `regla ${r.k}: norma ${n} no existe`);
  for (const sede of CONFIG_BASE.sedes) {
    const cfg = structuredClone(sede);
    const r = generar(cfg);
    let revisar = 0;
    for (let pi = 0; pi < r.P; pi++) {
      const a = analizarPersona(r, pi, cfg);
      for (const x of a.comprobaciones) for (const n of x.normas || []) assert.ok(ids.has(n), `${x.id}: norma ${n} no existe`);
      // El continuo no trabaja festivos ni noches.
      const c = a.comprobaciones.find(x => x.id === 'turnoC');
      if (c) assert.equal(c.ok, true, `${a.persona.id}: ${c.resumen}`);
      if (a.revisar) revisar++;
    }
    console.log(`${sede.nombre}: informes de ${r.P} personas, ${revisar} con algo que revisar según la normativa`);
  }
}
console.log('OK informes y normativa');

// ── Vacaciones por periodos y sorteo ──────────────────────────────────────────
import { asignarVacaciones, diasHabiles } from '../js/vacaciones.js';
{
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  for (const p of sede.vacaciones.periodos) assert.equal(diasHabiles(p.inicio, p.fin, new Set(['2027-08-16'])) >= 16, true);
  const personas = Array.from({ length: 60 }, (_, i) => ({ id: `TA ${String(i + 1).padStart(3, '0')}`, colectivo: 'TA' }));
  const vac = { ...sede.vacaciones, periodos: sede.vacaciones.periodos.map(p => ({ ...p, plazas: { TA: 6, SUP: 0 } })), solicitudes: {} };
  personas.slice(0, 12).forEach(p => { vac.solicitudes[p.id] = { periodo: 4 }; });
  vac.solicitudes['TA 001'].exento = true; vac.solicitudes['TA 002'].pareja = 'TA 050';
  const a = asignarVacaciones(vac, personas), b = asignarVacaciones(vac, personas);
  assert.deepEqual([...a.porPersona], [...b.porPersona], 'misma semilla, mismo sorteo');
  assert.equal(a.porPersona.get('TA 001').periodo, 4, 'la persona exenta conserva su periodo');
  assert.equal(a.porPersona.get('TA 002').periodo, a.porPersona.get('TA 050').periodo, 'la pareja va junta');
  assert.equal(a.periodos.find(p => p.n === 4).asignadas.TA, 6, 'no se pasa de las plazas');
  assert.equal(a.sinPlaza.length, 0);
  const r = generar(sede);
  assert.ok(r.vacaciones && r.vacaciones.porPersona.size === r.personas.filter(p => !p.sinVacaciones).length, 'todas las personas con vacaciones (menos los refuerzos sin vacaciones)');
  console.log('OK vacaciones: sorteo reproducible, preferencia, parejas y plazas');
}

// ── Horario actual de 2027: fin de semana libre cada mes y comparación ────────
import { HORARIO_2027, cifrasCuadrante, comparar, tiposSemana } from '../js/comparativa.js';
{
  for (const sede of CONFIG_BASE.sedes) {
    assert.ok(sede.reglas.minFinesLibresEntre?.activo, 'patrón de fines de semana 2 + 1 activo de partida');
    const r = generar(structuredClone(sede));
    const a = cifrasCuadrante(r, 'TA');
    assert.equal(a.finLibreCadaMes, 100, `${sede.nombre}: todas con un fin de semana libre cada mes`);
    assert.equal(a.finesSeguidosOk, 100, `${sede.nombre}: nunca más de 2 fines seguidos`);
    assert.ok(a.maxSeguidosMax <= 5);
    const filas = comparar(HORARIO_2027.sedes[sede.id], a);
    assert.equal(filas.length, 18);
    console.log(`${sede.nombre}: frente a 2027 mejora ${filas.filter(f => f.veredicto === 1).length}, igual ${filas.filter(f => f.veredicto === 0).length}, empeora ${filas.filter(f => f.veredicto === -1).map(f => f.k).join(', ') || 'ninguna'}`);
    // Al quitar la regla, el informe la deja de comprobar; con un tope imposible, avisa.
    const cfg2 = structuredClone(sede); cfg2.reglas.minFinesLibresMes = { activo: true, valor: 5 };
    const inf = analizarPersona(r, 0, cfg2).comprobaciones.find(x => x.id === 'minFinesLibresMes');
    assert.equal(inf.ok, false, 'con 5 fines libres al mes como mínimo, falla');
  }
  assert.deepEqual(tiposSemana(['RM1', 'RM1', 'RM1', 'RM1', 'RM1', 'L', 'L', 'L', 'L', 'RT1', 'RT1', 'RT1', 'RT1', 'RT1'], CONFIG_BASE.sedes[0].turnos), ['M-', 'TT']);
  console.log('OK horario 2027: fin de semana libre cada mes, fines seguidos y comparación');
}

// ── Niveles de regla y puntuación ─────────────────────────────────────────────
import { infracciones, puntuacion, comparaPuntuacion, mapaCasillas } from '../js/puntuacion.js';
{
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  const r = generar(sede);
  const l = infracciones(r, sede), p = puntuacion(r, sede, l);
  console.log('puntuación Sevilla:', p);
  assert.ok(p.duro <= 2, 'casi sin incumplimientos de reglas que bloquean');
  assert.equal(p.medio, r.huecos.reduce((s, h) => s + h.falta, 0));
  assert.equal(l.find(x => x.k === 'descanso').nivel, 'bloquea');
  assert.equal(l.find(x => x.k === 'maxFines').nivel, 'avisa');
  assert.ok(mapaCasillas(r, l) instanceof Map);
  // «Solo informe»: el ajuste no la tiene en cuenta, pero se sigue contando aparte.
  const s2 = structuredClone(sede); s2.reglas.maxNoches = { activo: true, valor: 5, nivel: 'informe' };
  const r2 = generar(s2), l2 = infracciones(r2, s2), p2 = puntuacion(r2, s2, l2);
  assert.ok(r2.personas.some(x => x.noches > 5), 'con nivel «informe» el ajuste no recorta noches');
  assert.ok(p2.informe > 0 && l2.find(x => x.k === 'maxNoches').nivel === 'informe');
  assert.equal(comparaPuntuacion({ duro: 0, medio: 9, blando: 0 }, { duro: 1, medio: 0, blando: 0 }) < 0, true, 'el duro manda');
  console.log('OK niveles de regla y puntuación');
}

// ── Equidad y mejora del reparto ──────────────────────────────────────────────
import { equidad } from '../js/equidad.js';
{
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  const r0 = generar(sede), p0 = puntuacion(r0, sede);
  const r = generar(sede, { buscarMejora: { ms: 1500, semilla: 3 } });
  assert.ok(r.mejora.coste < r.mejora.coste0, 'la búsqueda baja el desequilibrio');
  sede.mejora = { intercambios: r.mejora.intercambiosNuevos };
  const r2 = generar(sede), p2 = puntuacion(r2, sede);
  assert.equal(r2.mejora.saltados, 0, 'los intercambios guardados se vuelven a aplicar todos');
  assert.ok(Math.abs(r2.mejora.costeFinal - r.mejora.coste) < 1e-6, 'mismo resultado al regenerar');
  assert.ok(p2.duro <= p0.duro && p2.medio <= p0.medio, 'la mejora no empeora ni las reglas que bloquean ni la cobertura');
  r0.personas.forEach((p, i) => assert.ok(Math.abs(p.horas - r2.personas[i].horas) < 1e-9, 'mismas horas'));
  for (let c = 0; c < 2; c++) for (let f = 0; f < 3; f++) for (let d = 0; d < r0.D; d++) assert.equal(r0.cobertura[c][f][d], r2.cobertura[c][f][d]);
  const e0 = equidad(r0, 'TA'), e2 = equidad(r2, 'TA');
  const des = (e) => e.filter(m => ['fines', 'festivos', 'domingos'].includes(m.k)).reduce((s, m) => s + m.desequilibrio, 0);
  console.log(`equidad TA: desequilibrio ${des(e0).toFixed(0)} → ${des(e2).toFixed(0)} con ${sede.mejora.intercambios.length} intercambios`);
  assert.ok(des(e2) < des(e0));
  console.log('OK equidad y mejora del reparto');
}

// ── Contratos, turnos a medida y casos especiales ─────────────────────────────
import { turnosAMedida } from '../js/contratos.js';
import { leerCsvPlantilla } from '../js/plantilla.js';
{
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  const c = sede.contratos.find(x => x.id === 'r25');
  const { nuevos, mapa } = turnosAMedida(c, sede.turnos);
  assert.deepEqual(nuevos.map(t => `${t.codigo} ${t.inicio}-${t.fin}`), ['MR5 08:15-13:15', 'TR5 17:00-22:00']);
  sede.turnos.push(...nuevos); c.turnos = { ...c.turnos, ...mapa };
  sede.especiales = { 'TA 001': { contrato: 'r25' }, 'TA 002': { franjas: 'manana' }, 'TA 003': { sinFindes: true }, 'TA 004': { diasLibres: [2] }, 'TA 005': { alta: '2027-07-01' } };
  const r = generar(sede);
  const ver = (id, fn) => { const pi = r.personas.findIndex(p => p.id === id); const out = []; for (let d = 0; d < r.D; d++) { const t = r.turnos[r.grid[pi * r.D + d]]; if (t.trabaja && fn(t, r.dias[d])) out.push(d); } return { p: r.personas[pi], n: out.length }; };
  const a = ver('TA 001', t => !['MR5', 'TR5'].includes(t.codigo));
  assert.equal(a.n, 0, 'la reducida de 25 h solo hace MR5 y TR5'); assert.equal(a.p.objetivo, 1057.5, '25/35 de 1.480,5 h (los días sueltos no se suman de partida)');
  assert.equal(ver('TA 002', t => t.franja !== 'manana').n, 0, 'solo mañanas');
  assert.ok(Math.abs(ver('TA 002', () => false).p.horas - ver('TA 002', () => false).p.objetivo) < 7, 'solo mañanas llega a su jornada');
  assert.equal(ver('TA 003', (t, d) => d.finde).n, 0, 'sin fines de semana');
  assert.equal(ver('TA 004', (t, d) => d.dow === 2).n, 0, 'miércoles libre');
  assert.equal(ver('TA 005', (t, d) => d.fecha < '2027-07-01').n, 0, 'de alta desde julio');
  // CSV con casos especiales
  const csv = leerCsvPlantilla('nombre;colectivo;sede;contrato;franjas;sin_findes;dias_libres;alta\nPersona Ficticia;TA;Sevilla;Reducida 25 h;mañana;sí;X,J;2027-03-01', [{ id: 'sevilla', nombre: 'Sevilla' }]);
  assert.deepEqual(csv.personas[0], { nombre: 'Persona Ficticia', colectivo: 'TA', sede: 'sevilla', turnoActual: '', exentoNoches: false, horasSemana: 35, contrato: 'Reducida 25 h', franjas: 'manana', sinFindes: true, diasLibres: [2, 3], alta: '2027-03-01' });
  console.log('OK contratos, turnos a medida y casos especiales');
}

// ── Ida y vuelta por el servidor (PHP convierte {} en []) y resumen de cambios ─
import { completar, resumenCambios } from '../js/nucleo.js';
{
  const ida = JSON.parse(JSON.stringify(CONFIG_BASE).replace(/"(manuales|solicitudes|especiales)":\{\}/g, '"$1":[]'));
  const c = completar(ida);
  c.sedes[0].manuales['TA 001|2027-01-04'] = 'L';
  const vuelta = JSON.parse(JSON.stringify(c));
  assert.deepEqual(vuelta.sedes[0].manuales, { 'TA 001|2027-01-04': 'L' }, 'los cambios a mano no se pierden tras pasar por PHP');
  assert.equal(JSON.stringify(completar(vuelta)), JSON.stringify(vuelta), 'completar es idempotente');
  const antes = completar(JSON.parse(JSON.stringify(CONFIG_BASE)));
  assert.match(resumenCambios(antes, vuelta), /Sevilla: 1 cambio a mano/);
  assert.equal(resumenCambios(antes, antes), 'Sin cambios en el cuadrante.');
  console.log('OK ida y vuelta por el servidor y resumen de cambios');
}

// ── Calendario .ics ───────────────────────────────────────────────────────────
import { calendarioICS } from '../js/ics.js';
{
  const r = generar(structuredClone(CONFIG_BASE.sedes[0]));
  const pi = r.personas.findIndex(p => r.turnos.some((t, i) => t.franja === 'noche' && r.grid.slice(p.pi * r.D, (p.pi + 1) * r.D).includes(i)));
  const ics = calendarioICS(r, pi, { titulo: 'Prueba, con coma', ahora: new Date('2026-11-22T10:00:00Z') });
  const lineas = ics.split('\r\n');
  assert.equal(lineas[0], 'BEGIN:VCALENDAR'); assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(lineas.every(x => new TextEncoder().encode(x).length <= 75), 'líneas de 75 octetos como mucho');
  const eventos = (ics.match(/BEGIN:VEVENT/g) || []).length, trabajados = r.personas[pi].trabajados;
  const vac = (ics.match(/SUMMARY:Vacaciones/g) || []).length;
  assert.equal(eventos - vac, trabajados, 'un evento por turno trabajado');
  // La noche empieza a las 22:00 y acaba al día siguiente a las 08:00
  const noche = ics.split('BEGIN:VEVENT').find(e => e.includes('SUMMARY:N '));
  const ini = /DTSTART;TZID=Europe\/Madrid:(\d{8})T220000/.exec(noche), fin = /DTEND;TZID=Europe\/Madrid:(\d{8})T080000/.exec(noche);
  assert.ok(ini && fin && Number(fin[1]) > Number(ini[1]), 'la noche acaba al día siguiente');
  assert.ok(ics.includes('Prueba\\, con coma'), 'comas escapadas');
  console.log(`OK calendario .ics (${eventos} eventos, ${vac} de vacaciones)`);
}

// ── Jornada sin días sueltos, día libre fijo y cero incumplimientos de partida ─
{
  for (const sede of CONFIG_BASE.sedes) {
    const s = structuredClone(sede), r = generar(s), p = puntuacion(r, s);
    const base = Number(s.grupos[0].horasObjetivo);
    assert.equal(r.personas[0].objetivo, base, `${s.nombre}: jornada del convenio, sin los días sueltos`);
    assert.equal(p.duro, 0, `${s.nombre}: ninguna regla que bloquea incumplida`);
    assert.equal(p.blando, 0, `${s.nombre}: ningún aviso`);
    assert.ok(r.personas.every(x => x.noches <= x.topeNoches), `${s.nombre}: nadie pasa de su tope de noches (oficio + cesión)`);
    assert.ok(r.personas.every(x => x.horas >= x.objetivo - 1e-9), `${s.nombre}: nadie por debajo de su jornada`);
    console.log(`${s.nombre}: puntuación ${p.duro} · ${p.medio} · ${p.blando}`);
  }
  const s2 = structuredClone(CONFIG_BASE.sedes[0]); s2.vacaciones.sueltosEnJornada = true;
  assert.equal(generar(s2).personas[0].objetivo, 1515.5, 'con «sumar los días sueltos», 1.480,5 + 35 h');
  // Día libre fijo: si no caben más turnos, aviso con el motivo
  const s3 = structuredClone(CONFIG_BASE.sedes[0]); s3.especiales = { 'TA 004': { diasLibres: [2] } };
  const r3 = generar(s3), p4 = r3.personas.find(x => x.id === 'TA 004');
  if (p4.horas < p4.objetivo) assert.ok(p4.alertas.some(a => a.includes('día libre fijo')), 'el aviso explica el día libre fijo');
  console.log(`TA 004 con miércoles libre: ${p4.horas} de ${p4.objetivo} h`);
  console.log('OK jornada del convenio, día libre fijo y cero incumplimientos');
}

// ── Cobertura y bolsa: cesión de noches, ausencias, refuerzos, margen, bolsa y aguante ─
{
  const huecosNoche = (r) => r.huecos.filter(h => h.franja === 'noche').reduce((a, h) => a + h.falta, 0);
  // Sin cesión, Málaga no cubre las noches (24 supervisores × 14 < 365); con la de partida (tope 18), casi todas
  // (con el patrón de fines de semana 2 + 1 quedan unas pocas de fin de semana).
  const sin = structuredClone(CONFIG_BASE.sedes[1]); sin.cobertura.cesion.modo = 'ninguna';
  const conC = structuredClone(CONFIG_BASE.sedes[1]);
  const r0 = generar(sin), r1 = generar(conC);
  assert.ok(huecosNoche(r0) > 30 && huecosNoche(r1) <= 10, `Málaga: huecos de noche ${huecosNoche(r0)} → ${huecosNoche(r1)}`);
  assert.equal(puntuacion(r1, conC).duro, 0);
  assert.ok(r1.personas.every(p => p.noches <= 18) && r1.personas.some(p => p.nochesCedidas > 0));
  // Cesión voluntaria: solo quien la acepta pasa de 14.
  const vol = structuredClone(CONFIG_BASE.sedes[1]); vol.cobertura.cesion.modo = 'voluntaria'; vol.especiales = { 'SUP 01': { cedeNoches: true }, 'SUP 02': { cedeNoches: true } };
  const rv = generar(vol);
  assert.ok(rv.personas.filter(p => p.nochesCedidas > 0).every(p => ['SUP 01', 'SUP 02'].includes(p.id)), 'solo los voluntarios ceden noches');
  // Ausencia: días B, jornada prorrateada y la noche sigue cubierta por otras personas.
  const aus = structuredClone(CONFIG_BASE.sedes[0]); aus.cobertura.ausencias = [{ persona: 'TA 010', tipo: 'baja', desde: '2027-03-01', hasta: '2027-03-31' }];
  const ra = generar(aus), pa = ra.personas.find(p => p.id === 'TA 010');
  assert.equal(pa.diasAusencia, 31);
  assert.ok(pa.objetivo < 1480.5 && pa.objetivo > 1300, `jornada prorrateada: ${pa.objetivo}`);
  for (let d = ra.dias.findIndex(x => x.fecha === '2027-03-01'); d <= ra.dias.findIndex(x => x.fecha === '2027-03-31'); d++) assert.equal(ra.codigo(pa.pi, d), 'B');
  // Refuerzo: grupo con fechas.
  const ref = structuredClone(CONFIG_BASE.sedes[1]);
  ref.grupos.push({ ...structuredClone(ref.grupos[0]), id: 'ref', nombre: 'Refuerzo de verano', prefijo: 'REF', personas: 4, desde: '2027-07-01', hasta: '2027-09-15', patron: [], patronDe: 'ta', condiciones: { libreFines: true, sinVacaciones: true } });
  const rr = generar(ref), refs = rr.personas.filter(p => p.grupo === 'ref');
  assert.equal(refs.length, 4);
  for (const p of refs) for (let d = 0; d < rr.D; d++) if (rr.turnos[rr.grid[p.pi * rr.D + d]].trabaja) assert.ok(rr.dias[d].fecha >= '2027-07-01' && rr.dias[d].fecha <= '2027-09-15', 'el refuerzo solo trabaja en sus fechas');
  // El ajuste es voraz: 4 personas más no garantizan menos huecos de noche en concreto, pero sí en total (con holgura).
  const total = (r) => r.huecos.reduce((x, h) => x + h.falta, 0);
  assert.ok(total(rr) <= total(r1) + 3, `huecos totales ${total(r1)} → ${total(rr)} con el refuerzo`);
  // Margen: más días con gente de sobra de noche, y los huecos se siguen midiendo frente al mínimo real.
  const mar = structuredClone(CONFIG_BASE.sedes[0]); mar.cobertura.margen = { noche: 1, dia: 0, tipo: 'personas' };
  const rm = generar(mar), rb = generar(structuredClone(CONFIG_BASE.sedes[0]));
  const justas = (r) => [...r.aguante[0][2]].filter(x => x === 0).length;
  assert.ok(justas(rm) < justas(rb), `noches justas ${justas(rb)} → ${justas(rm)} con margen`);
  assert.ok(rm.personas.every(p => p.horas >= p.objetivo - 1e-9), 'el margen no deja a nadie por debajo de su jornada');
  // Bolsa: «acumular» deja hasta el tope a favor; el saldo descuenta lo consumido.
  const bo = structuredClone(CONFIG_BASE.sedes[0]); bo.cobertura.bolsa = { modo: 'acumular', tope: 35, inicial: { 'TA 001': 10 }, consumida: { 'TA 001': 4 } };
  const rbo = generar(bo), p1 = rbo.personas.find(p => p.id === 'TA 001');
  assert.ok(rbo.personas.every(p => p.horas - p.objetivo <= 35 + 10), 'nadie pasa del tope de bolsa');
  assert.equal(p1.bolsa.saldo, Math.round((10 + p1.bolsa.aFavor - 4) * 10) / 10);
  console.log(`OK cobertura y bolsa (Málaga: ${huecosNoche(r0)} → ${huecosNoche(r1)} huecos de noche; noches justas en Sevilla ${justas(rb)} → ${justas(rm)} con margen)`);
}

// ── Comprobar antes de pedir (complementa Portal Horario) ─────────────────────
import { comprobar, resumenSolicitud } from '../js/comprobar.js';
{
  const s = structuredClone(CONFIG_BASE.sedes[0]), r = generar(s);
  const d = r.dias.findIndex(x => x.fecha === '2027-03-10');
  const conFranja = (f) => r.personas.find(p => p.colectivo === 'TA' && r.turnos[r.grid[p.pi * r.D + d]].franja === f);
  const m = conFranja('manana'), t = conFranja('tarde');
  // Cambio de mañana por tarde: la cobertura de esas franjas no cambia (uno sube y otro baja).
  const c = comprobar(r, s, { tipo: 'cambio', persona: m.id, companero: t.id, desde: '2027-03-10' });
  assert.equal(c.cambios.length, 2);
  assert.ok(c.minimosOk && c.cobertura.every(x => x.antes === x.despues));
  // Un día de asunto propio baja en 1 su franja; con mucha gente de sobra, cumple mínimos.
  const ap = comprobar(r, s, { tipo: 'ap', persona: m.id, desde: '2027-03-10' });
  assert.equal(ap.cobertura[0].despues, ap.cobertura[0].antes - 1);
  assert.ok(ap.minimosOk);
  // Día de bolsa con más horas que el saldo: no es viable.
  const bo = comprobar(r, s, { tipo: 'bolsaDia', persona: m.id, desde: '2027-03-10' });
  assert.ok(bo.bolsa && bo.bolsa.gasta === 7 && bo.viable === (bo.bolsa.saldo >= 7));
  assert.match(resumenSolicitud(r, { tipo: 'cambio', persona: m.id, companero: t.id, desde: '2027-03-10' }, c), /Cambio de turno/);
  // Una noche de supervisión: si el único supervisor de esa noche pide el día, deja la franja bajo mínimo.
  const sup = r.personas.find(p => p.colectivo === 'SUP' && r.turnos[r.grid[p.pi * r.D + d]].franja === 'noche' && r.cobertura[1][2][d] === r.necesidad[1][2][d]);
  if (sup) { const x = comprobar(r, s, { tipo: 'ap', persona: sup.id, desde: '2027-03-10' }); assert.equal(x.minimosOk, false); assert.equal(x.viable, false); }
  console.log('OK comprobar antes de pedir');
}

// ── Solapes y horas de entrada que rotan ─────────────────────────────────────
import { aplicarSolapes } from '../js/motor.js';
{
  const pat = ['RM1', 'RM1', 'RM1', 'RM1', 'RM1', 'L', 'L', 'RT1', 'RT1', 'RT1', 'RT1', 'RT1', 'L', 'L', 'RM1', 'RM1', 'RM1', 'RM1', 'RM1', 'L', 'L'];
  const r = { activo: true, grupo: 'ta', base: 'RM1', turno: 'S1', dias: [2], cada: 1, desfase: 0 };
  assert.deepEqual(aplicarSolapes(pat, 'ta', [r]).map((c, i) => c === 'S1' ? i : -1).filter(i => i >= 0), [2, 16], 'miércoles de las semanas de mañana');
  assert.deepEqual(aplicarSolapes(pat, 'ta', [{ ...r, cada: 2 }]).filter(c => c === 'S1').length, 1, 'una de cada dos semanas de mañana');
  assert.equal(aplicarSolapes(pat, 'ta', [{ ...r, activo: false }]), pat, 'desactivada no cambia nada');
  assert.equal(aplicarSolapes(pat, 'sup', [r]), pat, 'solo en su grupo');
  const sede = structuredClone(CONFIG_BASE.sedes[0]);
  sede.solapes = [{ ...sede.solapes[0], activo: true, cada: 1 }];
  const res = generar(sede), s1 = res.idx.get('S1');
  const enMiercoles = res.dias.filter(d => d.dow === 2).some(d => res.personas.some((p, pi) => res.grid[pi * res.D + d.i] === s1));
  assert.ok(enMiercoles, 'hay solapes los miércoles');
  const p = puntuacion(res, sede);
  assert.equal(p.duro, 0, 'con solape: ninguna regla que bloquea incumplida');
  assert.ok(res.personas.every(x => x.horas >= x.objetivo - 1e-9), 'con solape: nadie por debajo de su jornada');
  console.log(`OK solapes (${res.grid.filter(c => c === s1).length} turnos S1 en Sevilla; puntuación ${p.duro} · ${p.medio} · ${p.blando})`);
}

// ── Escenario de ejemplo: dos líneas de horario fijo ─────────────────────────
import { dosLineas } from '../js/escenarios-plantilla.js';
{
  for (const sede of CONFIG_BASE.sedes) {
    const s = dosLineas(structuredClone(sede)), r = generar(s), p = puntuacion(r, s);
    const usa = (c) => r.grid.includes(r.idx.get(c));
    assert.ok(['MA', 'TA', 'MB', 'TB'].every(usa), `${sede.nombre}: salen los turnos de las dos líneas`);
    assert.ok(!usa('RM1') && !usa('RT1'), 'el rotatorio anterior desaparece');
    const a = s.grupos.find(g => g.id === 'ta'), b = s.grupos.find(g => g.id === 'tb');
    assert.equal(a.personas + b.personas, sede.grupos.find(g => g.id === 'ta').personas, 'mitad y mitad');
    assert.equal(p.duro, 0, `${sede.nombre}: dos líneas sin reglas que bloquean incumplidas`);
    assert.ok(r.personas.filter(x => x.grupo !== 'rv').every(x => x.horas >= x.objetivo - 1e-9), 'nadie por debajo de su jornada');
    const h = {}; for (const x of r.huecos) h[`${x.colectivo} ${x.franja}`] = (h[`${x.colectivo} ${x.franja}`] || 0) + x.falta;
    console.log(`${sede.nombre} con dos líneas: puntuación ${p.duro} · ${p.medio} · ${p.blando}`, JSON.stringify(h));
  }
  console.log('OK escenario de dos líneas de horario fijo');
}

// ── Escenario de ejemplo: mínimos de la consultora ───────────────────────────
import { minimosConsultora } from '../js/escenarios-plantilla.js';
{
  const todo = completar(structuredClone(CONFIG_BASE));
  for (const sede of todo.sedes) {
    const s = minimosConsultora(sede), m = s.minimos.find(x => x.colectivo === 'TA' && x.franja === 'manana');
    assert.equal(m.dias[0], sede.id === 'sevilla' ? 89 : 86, 'punta L-V de la consultora');
    const r = generar(s), p = puntuacion(r, s);
    const h = {}; for (const x of r.huecos) h[`${x.colectivo} ${x.franja}`] = (h[`${x.colectivo} ${x.franja}`] || 0) + x.falta;
    console.log(`${sede.nombre} con los mínimos de la consultora: puntuación ${p.duro} · ${p.medio} · ${p.blando}`, JSON.stringify(h));
  }
  console.log('OK escenario de mínimos de la consultora');
}

// ── Rotatorio de partida: una semana de tarde cada 3 y 1 fin de semana de cada 3 ─
{
  const pat = CONFIG_BASE.sedes[0].grupos[0].patron, sem = pat.length / 7;
  const tipo = (w) => { const d = pat.slice(w * 7, w * 7 + 7); return d.some(c => c === 'N') ? 'N' : d.some(c => c === 'RT1') ? 'T' : d.some(c => c === 'RM1') ? 'M' : '-'; };
  const tipos = Array.from({ length: sem }, (_, w) => tipo(w));
  assert.equal(sem, 27);
  assert.equal(tipos.filter(t => t === 'T').length, 8, '8 semanas de tarde');
  assert.equal(tipos.filter(t => t === 'M').length, 15, '15 semanas de mañana');
  const fines = Array.from({ length: sem }, (_, w) => pat[w * 7 + 5] !== 'L' || pat[w * 7 + 6] !== 'L').map((x, w) => x ? w : -1).filter(w => w >= 0);
  assert.deepEqual(fines, [2, 5, 8, 11, 14, 17, 20, 23, 26], 'un fin de semana de cada 3');
  const s = structuredClone(CONFIG_BASE.sedes[0]), r = generar(s);
  const ta = r.personas.filter(p => p.grupo === 'ta');
  const cs = ta.map(p => analizarPersona(r, p.pi, s).comprobaciones.find(x => x.id === 'tardeCada'));
  const bien = cs.filter(c => c && c.ok).length;
  assert.ok(bien > ta.length / 2, `la mayoría cumple una de cada 3 (${bien} de ${ta.length})`);
  console.log(`OK rotatorio 2 + 1: ${tipos.join('')} · ${bien} de ${ta.length} personas dentro de «una de cada 3» (±2 semanas)`);
}
