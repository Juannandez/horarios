// Excel del cuadrante de un colectivo (todo el año, con la persona y el grupo fijos al desplazarse a la derecha):
//  1. Cuadrante: un día por columna, con el color de cada turno, y al pie la gente sobre el mínimo y el total del día.
//  2. Leyenda y detalles: turnos con su horario, escenario, reglas activas y otros datos.
//  3. Informe: las comprobaciones del año (3 + 1, noches, mínimos, puestos, jornada, fines de semana) y las reglas.
//  4. Mínimos por horas: cada hora de cada día, el mínimo y cuántos hay de más o de menos (en el peor cuarto).
// Todo se calcula en el navegador con el resultado del motor: no sale nada de aquí.
import { horarioTurno, margenesCuartos, ORIGEN } from './motor.js';
import { infracciones } from './puntuacion.js';
import { REGLAS_CATALOGO } from './datos-base.js';
import { crearXlsx } from './xlsx.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const FRANJA = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const ROJO = '#A33434', GRIS = '#536268', TITULO = '#00354D', FINDE = '#ECECEC', FEST = '#FAE4E4', AMBAR = '#FDEEC8', AZUL = '#DEEAF8';
const tinta = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#12242B'; const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#12242B' : '#FFFFFF'; };
const num = (n) => Math.round(n * 10) / 10;
const fmt = (n) => num(n).toLocaleString('es-ES');

// Comprobaciones del año para un colectivo (las del informe que se manda con el cuadrante).
export function comprobaciones(res, cfg, colectivo = 'TA') {
  const ci = res.colectivos.indexOf(colectivo), D = res.D;
  const lista = res.personas.filter(p => p.colectivo === colectivo), rot = lista.filter(p => !p.horarioLibre && !p.altaDias);
  const t = (p, d) => res.turnos[res.grid[p.pi * D + d]];
  const reg = (k) => (cfg.reglas || {})[k] && cfg.reglas[k].activo !== false ? cfg.reglas[k].valor : null;
  const entre = Number(reg('semanasEntreTardes')) || 3;
  let tardesJuntas = 0, nocheTarde = 0, mezcla = 0;
  const l0 = res.dias.findIndex(x => x.dow === 0);
  for (const p of rot) {
    let ult = -99, w = 0;
    for (let l = l0; l + 6 < D; l += 7, w++) {
      let m = 0, tt = 0; for (let x = l; x <= l + 6; x++) { const z = t(p, x); if (!z.trabaja) continue; if (z.franja === 'manana') m++; else if (z.franja === 'tarde') tt++; }
      if (m && tt) mezcla++;
      if (tt) { if (w - ult - 1 < entre && ult >= 0) tardesJuntas++; ult = w; }
    }
    for (let d = 1; d < D; d++) if (t(p, d).franja === 'noche' && t(p, d).trabaja && t(p, d - 1).franja === 'tarde') nocheTarde++;
  }
  // Mínimos por cuartos de hora: entre semana y en fin de semana o festivo; lo que falta con y sin bolsa.
  let negLV = 0, negLVb = 0, negFS = 0, negFSb = 0, diasMargen = 0; const horasFS = new Set(), horasLV = new Set();
  const MQ = margenesCuartos(cfg);
  if (res.cuartos && ci >= 0) for (let d = 0; d < D; d++) {
    const fs = res.dias[d].finde || res.dias[d].festivo, b = (res.disponibilidad || []).filter(x => x.d === d && x.colectivo === colectivo).length, mq = MQ.de(res.dias[d]);
    let bajo = false;
    for (let q = 0; q < 96; q++) {
      const v = res.cuartos.min(ci, d, q); if (v == null) continue;
      const x = res.cuartos.cob[ci][d * 96 + q] - v;
      if (x < 0) { if (!fs) { negLV++; if (b >= -x) negLVb++; horasLV.add(`${String(q >> 2).padStart(2, '0')}:00`); } else { negFS++; if (b >= -x) negFSb++; horasFS.add(`${String(q >> 2).padStart(2, '0')}:${String((q & 3) * 15).padStart(2, '0')}`); } }
      else if (x < mq[q]) bajo = true;
    }
    if (bajo) diasMargen++;
  }
  const noches = {}; for (let d = 0; d < D; d++) { const k = res.cobertura[ci][2][d] - res.necesidad[ci][2][d]; noches[k] = (noches[k] || 0) + 1; }
  const exactas = noches[0] || 0;
  const horas = rot.map(p => p.horas), fines = rot.map(p => p.fines), nn = rot.filter(p => p.noches > 0).map(p => p.noches);
  const mm = (a) => (a.length ? [Math.min(...a), Math.max(...a)] : [0, 0]);
  const inf = infracciones(res, cfg);
  return {
    personas: rot.length, total: lista.length,
    filas: [
      ['Tres semanas de mañana entre dos de tarde', tardesJuntas ? `${tardesJuntas} fallos` : 'se cumple siempre (0 fallos)', !tardesJuntas],
      ['Noche el día después de una tarde', String(nocheTarde), !nocheTarde],
      ['Semanas con mañanas y tardes mezcladas', String(mezcla), !mezcla],
      [`Noches con justo el mínimo`, `${exactas} de ${D}`, exactas === D],
      ['Lunes a viernes por debajo del mínimo (cuartos de hora)', negLV ? `${negLV}${negLVb ? `, ${negLVb} cubiertos con bolsa` : ''}${horasLV.size ? ` (de ${[...horasLV].sort()[0]} a ${[...horasLV].sort().slice(-1)[0]})` : ''}` : '0', !negLV || negLVb === negLV],
      ['Fines de semana y festivos por debajo del mínimo (cuartos de hora)', negFS ? `${negFS}${negFSb ? `, ${negFSb} cubiertos con bolsa` : ''}${horasFS.size ? ` (a las ${[...horasFS].slice(0, 4).join(', ')})` : ''}` : '0', !negFS || negFSb === negFS],
      ['Días con algún cuarto por debajo del margen pedido', String(diasMargen), null],
      [`Teleasistentes en sala a la vez`, res.puestos && res.puestos.valor ? `${res.puestos.max} como máximo (hay ${res.puestos.valor} puestos)` : 'sin tope de puestos', !(res.puestos && res.puestos.valor && res.puestos.max > res.puestos.valor)],
      ['Jornada (horas al año)', `entre ${fmt(mm(horas)[0])} y ${fmt(mm(horas)[1])} h`, null],
      ['Fines de semana por persona', `${mm(fines)[0]}-${mm(fines)[1]} al año`, null],
      ['Noches por persona (quien hace noches)', `${mm(nn)[0]}-${mm(nn)[1]} al año · ${rot.length - nn.length} sin noches`, null],
      ['Disponibilidad para la bolsa (días-persona en el año)', String((res.disponibilidad || []).filter(x => x.colectivo === colectivo).length), null],
    ],
    reglas: inf.filter(z => z.casos.length).map(z => [z.titulo, z.nivel, z.casos.length]),
  };
}

export function excelCuadrante({ res, cfg, colectivo = 'TA', personas, escenario = '' }) {
  const ci = res.colectivos.indexOf(colectivo), D = res.D, dias = res.dias;
  const lista = (personas || res.personas).filter(p => p.colectivo === colectivo);
  const nombreCol = colectivo === 'SUP' ? 'Supervisores' : 'Teleasistentes';
  const titulo = `Cuadrante ${cfg.anio} · ${cfg.nombre}${escenario ? ` · ${escenario}` : ''} · ${nombreCol}`;
  const conNombre = lista.some(p => p.nombre);
  const C0 = 2;   // columnas fijas: persona y grupo (o nombre)
  const fondoDia = (d) => (d.festivo ? FEST : d.finde ? FINDE : null);

  // ── Hoja 1: cuadrante ──
  const f1 = [];
  f1.push([{ v: titulo, negrita: true, tinta: TITULO }]);
  f1.push([{ v: `${cfg.titulo || ''} · ${conNombre ? 'CONFIDENCIAL: con nombres' : 'Personas anónimas por código'} · Generado el ${new Date().toLocaleDateString('es-ES')}`, tinta: GRIS }]);
  const filaMes = [{ v: '', negrita: true }, { v: '' }], filaDia = [{ v: 'Persona', negrita: true, borde: true }, { v: conNombre ? 'Nombre' : 'Grupo', negrita: true, borde: true }], filaSem = [{ v: '', borde: true }, { v: '', borde: true }];
  const combinar = [];
  const col = (k) => { let s = ''; k++; while (k > 0) { const m = (k - 1) % 26; s = String.fromCharCode(65 + m) + s; k = Math.floor((k - 1) / 26); } return s; };
  let iniMes = 0;
  dias.forEach((d, j) => {
    const nuevoMes = j === 0 || d.mes !== dias[j - 1].mes;
    if (nuevoMes) { if (j > 0) combinar.push(`${col(C0 + iniMes)}3:${col(C0 + j - 1)}3`); iniMes = j; }
    filaMes.push(nuevoMes ? { v: `${MESES[d.mes]} ${d.anio}`, negrita: true, tinta: TITULO } : '');
    filaDia.push({ v: d.dia, negrita: true, centro: true, borde: true, fondo: fondoDia(d), tinta: d.festivo ? ROJO : null });
    filaSem.push({ v: DIAS[d.dow] + (d.festivo ? 'F' : ''), centro: true, borde: true, fondo: fondoDia(d), tinta: d.festivo ? ROJO : null });
  });
  combinar.push(`${col(C0 + iniMes)}3:${col(C0 + D - 1)}3`);
  for (const t of ['Horas', 'Noches', 'Fines']) { filaMes.push(''); filaDia.push({ v: t, negrita: true, borde: true }); filaSem.push({ v: '', borde: true }); }
  f1.push(filaMes, filaDia, filaSem);
  for (const p of lista) {
    const fila = [{ v: p.id, negrita: true, borde: true }, { v: p.nombre || p.grupoNombre, borde: true, tinta: GRIS }];
    for (let d = 0; d < D; d++) {
      const k = p.pi * D + d, t = res.turnos[res.grid[k]];
      if (t.codigo === 'L') { fila.push({ v: '', borde: true, fondo: fondoDia(dias[d]) }); continue; }
      const marca = res.origen[k] === ORIGEN.MANUAL ? '*' : '';
      fila.push({ v: t.codigo + marca, centro: true, borde: true, fondo: t.color || '#FFFFFF', tinta: tinta(t.color) });
    }
    fila.push({ v: num(p.horas), borde: true, tinta: p.alertas.length ? ROJO : null }, { v: p.noches, borde: true }, { v: p.fines, borde: true });
    f1.push(fila);
  }
  // Pie: sobre el mínimo por franja, total del día y disponibilidad para la bolsa.
  if (ci >= 0) {
    f1.push([]);
    const disp = new Map(); for (const x of res.disponibilidad || []) if (x.colectivo === colectivo) { const k = `${x.d}|${x.franja}`; disp.set(k, (disp.get(k) || 0) + 1); }
    res.franjas.forEach((f, fi) => {
      const fila = [{ v: `${nombreCol} sobre el mínimo`, negrita: true }, { v: FRANJA[f] || f, tinta: GRIS }];
      for (let d = 0; d < D; d++) {
        const n = res.cobertura[ci][fi][d], m = res.necesidad[ci][fi][d], b = disp.get(`${d}|${f}`) || 0, x = n - m;
        fila.push(x < 0 ? { v: b >= -x ? `B${-x}` : x, centro: true, negrita: true, tinta: b >= -x ? '#1F5C99' : ROJO, fondo: b >= -x ? AZUL : '#FADEDE' } : { v: x, centro: true, fondo: fondoDia(dias[d]) });
      }
      f1.push(fila);
    });
    const tot = [{ v: `${nombreCol} ese día`, negrita: true }, { v: 'en total', tinta: GRIS }];
    for (let d = 0; d < D; d++) { let n = 0; for (let fi = 0; fi < res.franjas.length; fi++) n += res.cobertura[ci][fi][d]; tot.push({ v: n, centro: true, fondo: fondoDia(dias[d]) }); }
    f1.push(tot);
  }
  const hoja1 = { nombre: 'Cuadrante', filas: f1, anchos: [10, conNombre ? 26 : 22, ...Array(D).fill(4.6), 8, 7, 6], fijas: { filas: 5, cols: C0 }, combinar };

  // ── Hoja 2: leyenda y detalles ──
  const usados = new Set(); lista.forEach(p => { for (let d = 0; d < D; d++) usados.add(res.grid[p.pi * D + d]); });
  const f2 = [[{ v: 'Leyenda de turnos', negrita: true, tinta: TITULO }], [], [{ v: 'Código', negrita: true, borde: true }, { v: 'Turno', negrita: true, borde: true }, { v: 'Horario', negrita: true, borde: true }, { v: 'Franja', negrita: true, borde: true }, { v: 'Horas', negrita: true, borde: true }]];
  res.turnos.forEach((t, ti) => { if (!usados.has(ti)) return; f2.push([{ v: t.codigo, centro: true, borde: true, fondo: t.color || '#FFFFFF', tinta: tinta(t.color) }, { v: t.nombre, borde: true }, { v: t.trabaja ? horarioTurno(t) : '', borde: true }, { v: FRANJA[t.franja] || '', borde: true }, { v: t.trabaja ? num(t.horas) : '', borde: true }]); });
  f2.push([], [{ v: 'Marcas', negrita: true, tinta: TITULO }], ['Columna gris: sábado o domingo. Columna rosa y «F»: festivo.'], ['«*» tras el código: cambio hecho a mano.'], ['Al pie, «B»: lo que falta queda cubierto con disponibilidad para la bolsa (personas que libran y están localizables).'], ['Horas en rojo: la persona tiene algún aviso (jornada, noches, fines de semana o descansos).']);
  f2.push([], [{ v: 'Detalles', negrita: true, tinta: TITULO }]);
  const det = [
    ['Sede', cfg.nombre], ['Año del cuadrante', `${dias[0].fecha} a ${dias[D - 1].fecha}`], ['Escenario', escenario || '—'], ['Colectivo', `${nombreCol}: ${lista.length} personas`],
    ['Grupos', cfg.grupos.filter(g => g.colectivo === colectivo).map(g => `${g.nombre} (${g.personas ?? g.n ?? ''})`).join(' · ')],
    ['Puestos en sala', cfg.puestos ? `${cfg.puestos} (solo teleasistencia)` : 'sin tope'],
    ['Margen sobre el mínimo', (() => { const MQ = margenesCuartos(cfg); return `hasta +${Math.max(...MQ.lv)} de lunes a viernes y +${Math.max(...MQ.fs)} en fin de semana y festivo (de 7:45 a 22:00)`; })()],
    ['Noches', (cfg.cobertura || {}).nochesExactas ? 'siempre el mínimo exacto' : 'sin ajustar'],
    ['Vacaciones de verano', `${((cfg.vacaciones || {}).periodos || []).length} periodos · plazas de teleasistencia por periodo: ${[...new Set(((cfg.vacaciones || {}).periodos || []).map(p => p.plazas && p.plazas.TA))].join(', ')}`],
  ];
  det.forEach(([a, b]) => f2.push([{ v: a, negrita: true }, { v: b }]));
  f2.push([], [{ v: 'Reglas activas', negrita: true, tinta: TITULO }], [{ v: 'Regla', negrita: true, borde: true }, { v: 'Valor', negrita: true, borde: true }, { v: 'Nivel', negrita: true, borde: true }]);
  for (const r of REGLAS_CATALOGO) { const x = (cfg.reglas || {})[r.k]; if (!x || x.activo === false) continue; f2.push([{ v: r.texto, borde: true }, { v: r.sinValor ? 'sí' : `${x.valor ?? ''} ${r.unidad || ''}`.trim(), borde: true }, { v: x.nivel || '', borde: true }]); }
  const hoja2 = { nombre: 'Leyenda y detalles', filas: f2, anchos: [34, 60, 16, 12, 8] };

  // ── Hoja 3: informe ──
  const c = comprobaciones(res, cfg, colectivo);
  const f3 = [[{ v: `${escenario || cfg.nombre}, comprobado año entero (${c.personas} personas del rotatorio${c.total > c.personas ? `, ${c.total - c.personas} fijos discontinuos aparte` : ''})`, negrita: true, tinta: TITULO }], [],
    [{ v: 'Regla', negrita: true, borde: true }, { v: 'Resultado', negrita: true, borde: true }]];
  for (const [a, b, ok] of c.filas) f3.push([{ v: a, borde: true }, { v: b, borde: true, fondo: ok === false ? '#FADEDE' : ok === true ? '#E3F2E8' : null }]);
  f3.push([], [{ v: 'Avisos del panel de reglas', negrita: true, tinta: TITULO }], [{ v: 'Regla', negrita: true, borde: true }, { v: 'Nivel', negrita: true, borde: true }, { v: 'Casos', negrita: true, borde: true }]);
  if (!c.reglas.length) f3.push([{ v: 'Ninguna regla incumplida', borde: true }]);
  for (const [a, n, k] of c.reglas) f3.push([{ v: a, borde: true }, { v: n, borde: true, tinta: n === 'bloquea' ? ROJO : null }, { v: k, borde: true }]);
  const hoja3 = { nombre: 'Informe', filas: f3, anchos: [62, 64, 10] };

  // ── Hoja 4: mínimos por horas (cada hora de cada día: mínimo y en sala menos el mínimo, en el peor cuarto) ──
  const hojas = [hoja1, hoja2, hoja3];
  if (res.cuartos && ci >= 0) {
    const MQ = margenesCuartos(cfg);
    const f4 = [[{ v: `Mínimos por horas · ${titulo}`, negrita: true, tinta: TITULO }], [{ v: 'Cada día, dos filas por hora: el mínimo de esa hora y cuántos hay de más (+) o de menos (-) en el peor cuarto de hora. Ámbar: por debajo del margen. Azul con B: lo que falta, cubierto con disponibilidad para la bolsa.', tinta: GRIS }]];
    f4.push([{ v: 'Hora', negrita: true, borde: true }, { v: '', borde: true }, ...dias.map(d => ({ v: `${d.dia}/${d.mes + 1}`, negrita: true, centro: true, borde: true, fondo: fondoDia(d), tinta: d.festivo ? ROJO : null }))]);
    f4.push([{ v: '', borde: true }, { v: '', borde: true }, ...dias.map(d => ({ v: DIAS[d.dow], centro: true, borde: true, fondo: fondoDia(d) }))]);
    const bDia = dias.map(d => (res.disponibilidad || []).filter(x => x.d === d.i && x.colectivo === colectivo).length);
    for (let h = 0; h < 24; h++) {
      const fm = [{ v: `${String(h).padStart(2, '0')}:00`, negrita: true, borde: true }, { v: 'mínimo', tinta: GRIS, borde: true }];
      const fd = [{ v: '', borde: true }, { v: 'de más / menos', tinta: GRIS, borde: true }];
      dias.forEach((d, j) => {
        let min = null, dif = null, ambar = false; const mq = MQ.de(d);
        for (let q = h * 4; q < h * 4 + 4; q++) { const m = res.cuartos.min(ci, d.i, q); if (m == null) continue; const v = res.cuartos.cob[ci][d.i * 96 + q] - m; min = min == null ? m : Math.max(min, m); dif = dif == null ? v : Math.min(dif, v); if (mq[q] && v < mq[q]) ambar = true; }
        if (min == null) { fm.push({ v: '', borde: true, fondo: '#F5F5F5' }); fd.push({ v: '', borde: true, fondo: '#F5F5F5' }); return; }
        fm.push({ v: min, centro: true, borde: true, tinta: GRIS, fondo: fondoDia(d) });
        const bolsa = dif < 0 && bDia[j] >= -dif;
        fd.push({ v: bolsa ? `B${-dif}` : dif, centro: true, negrita: true, borde: true, tinta: bolsa ? '#1F5C99' : dif < 0 ? ROJO : null, fondo: bolsa ? AZUL : dif < 0 ? '#FADEDE' : ambar ? AMBAR : fondoDia(d) });
      });
      f4.push(fm, fd);
    }
    hojas.push({ nombre: 'Mínimos por horas', filas: f4, anchos: [8, 15, ...Array(D).fill(5.2)], fijas: { filas: 4, cols: 2 } });
  }
  return crearXlsx(hojas);
}
