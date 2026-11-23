// Comparación del cuadrante que genera la app con el horario real de 2027 de cada sede.
// HORARIO_2027 son solo cifras agregadas, sacadas el 20-11-2026 de los cuadrantes de teleasistentes de 2027
// (Sevilla: copia anónima; Málaga: hoja HORARIO). Los ficheros no están en el repositorio y no hay ningún dato
// personal: solo recuentos, medianas y porcentajes del personal activo a 35 h en turnos de lunes a domingo
// (rotatorio, M1, M2, T1 y T2). Método y detalle en docs/fuentes-cgt/horario-actual-2027-patrones.md.

export const HORARIO_2027 = {
  fuente: 'Cuadrantes de teleasistentes de 2027 (Sevilla y Málaga), estudio del 20-11-2026',
  ciclo: {
    semanas: 12,
    // Tipo de semana: franja de lunes a viernes + franja del fin de semana («-» = libre). Las noches se reparten
    // aparte, persona a persona, en semanas de este ciclo.
    tipos: 'M- M- TT M- MM MM T- M- MT M- T- MM',
    nota: 'Mismo ciclo en las dos sedes: 9 semanas de mañana y 3 de tarde, 5 fines de semana trabajados cada 12 semanas y uno de ellos (MT) de tarde en semana de mañana.',
  },
  sedes: {
    sevilla: {
      personas: 199, rotatorio: 107,
      finesMediana: 18, finesMax: 21, finesSeguidosOk: 97, finLibreCadaMes: 99,
      maxSeguidosOk: 93, maxSeguidosMax: 7,
      nochesMediana: 14, nochesMas14: 48,
      bloquesSueltas: 1, bloques2: 66, bloques3: 33,
      descansoMenos3: 2, descanso3o5: 78,
      semanasMenos2: 4, finesIncoherentes: 4, tardeAManana: 0,
      nochesBajoMinimo: 0, diasBajoMinimo: 1,
    },
    malaga: {
      personas: 203, rotatorio: 97,
      finesMediana: 18, finesMax: 22, finesSeguidosOk: 98, finLibreCadaMes: 100,
      maxSeguidosOk: 99, maxSeguidosMax: 6,
      nochesMediana: 22, nochesMas14: 54,
      bloquesSueltas: 1, bloques2: 66, bloques3: 33,
      descansoMenos3: 1, descanso3o5: 81,
      semanasMenos2: 6, finesIncoherentes: 4, tardeAManana: 1,
      nochesBajoMinimo: 19, diasBajoMinimo: null,
    },
  },
};

// Qué se compara. «mejor»: -1 si es mejor menos, 1 si es mejor más, 0 si solo es informativo.
export const METRICAS = [
  { k: 'duro', texto: 'Puntuación dura: incumplimientos de reglas que bloquean', mejor: -1, soloApp: true },
  { k: 'medio', texto: 'Puntuación media: personas que faltan para los mínimos (todas las franjas y colectivos)', mejor: -1, soloApp: true },
  { k: 'blando', texto: 'Puntuación blanda: avisos de reglas que avisan', mejor: -1, soloApp: true },
  { k: 'desequilibrio', texto: 'Desequilibrio del reparto de fines de semana, festivos y domingos (teleasistencia)', mejor: -1, soloApp: true },
  { k: 'nochesBajoMinimo', texto: 'Noches con menos teleasistentes que el mínimo', unidad: 'días', mejor: -1 },
  { k: 'diasBajoMinimo', texto: 'Días con alguna franja de mañana o tarde bajo el mínimo', unidad: 'días', mejor: -1 },
  { k: 'finesMediana', texto: 'Fines de semana trabajados al año (mediana)', mejor: -1 },
  { k: 'finesMax', texto: 'Fines de semana trabajados al año (máximo)', mejor: -1 },
  { k: 'finesSeguidosOk', texto: 'Personas con 2 fines de semana seguidos como mucho', unidad: '%', mejor: 1 },
  { k: 'finLibreCadaMes', texto: 'Personas con al menos un fin de semana libre cada mes', unidad: '%', mejor: 1 },
  { k: 'finesIncoherentes', texto: 'Fines de semana de tarde en semana de mañana, o al revés (mediana por persona)', mejor: -1 },
  { k: 'maxSeguidosOk', texto: 'Personas con 5 días seguidos de trabajo como mucho', unidad: '%', mejor: 1 },
  { k: 'maxSeguidosMax', texto: 'Racha más larga de días seguidos de trabajo', unidad: 'días', mejor: -1 },
  { k: 'semanasMenos2', texto: 'Semanas con menos de 2 días libres (mediana por persona)', mejor: -1 },
  { k: 'tardeAManana', texto: 'Tarde seguida de mañana al día siguiente (casos)', mejor: -1 },
  { k: 'nochesMediana', texto: 'Noches al año de quien hace noches (mediana)', mejor: 0 },
  { k: 'nochesMas14', texto: 'De quien hace noches, personas con más de 14', unidad: '%', mejor: -1 },
  { k: 'bloquesSueltas', texto: 'Noches sueltas (bloques de 1 noche)', unidad: '%', mejor: -1 },
  { k: 'bloques2', texto: 'Bloques de 2 noches', unidad: '%', mejor: 0 },
  { k: 'bloques3', texto: 'Bloques de 3 noches', unidad: '%', mejor: 0 },
  { k: 'descansoMenos3', texto: 'Bloques de noche con menos de 3 días libres después', unidad: '%', mejor: -1 },
  { k: 'descanso3o5', texto: 'Bloques de noche con 3, 4 o 5 días libres después', unidad: '%', mejor: 0 },
];

const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, t) => (t ? Math.round(100 * n / t) : null);

// Las mismas cifras sobre un cuadrante generado (res de motor.generar), para el colectivo dado. Solo cuenta a
// quien trabaja de lunes a domingo (sin grupos «solo laborables») y a jornada completa.
export function cifrasCuadrante(res, colectivo = 'TA') {
  const { D, dias, turnos: T, grid } = res;
  const per = res.personas.filter(p => p.colectivo === colectivo && !p.soloLaborables && (p.horasSemana == null || Number(p.horasSemana) === 35));
  const sabados = dias.filter(d => d.dow === 5);
  const lunes = dias.filter(d => d.dow === 0 && d.i + 7 <= D);
  const fines = [], finesMax = [], seguidosMax = [], semanasMenos2 = [], incoherentes = [], nochesCon = [];
  let finesOk = 0, mesOk = 0, seguidosOk = 0, tardeAManana = 0;
  const bloques = { 1: 0, 2: 0, 3: 0, otros: 0 }, descanso = { menos3: 0, de3a5: 0, total: 0 };
  for (const p of per) {
    const c = (d) => T[grid[p.pi * D + d]];
    const trab = (d) => d >= 0 && d < D && c(d).trabaja;
    // Fines de semana
    let nf = 0, racha = 0, rachaMax = 0; const libresMes = new Array(12).fill(0), hayMes = new Array(12).fill(false);
    for (const s of sabados) {
      const t = trab(s.i) || trab(s.i + 1);
      if (t) { nf++; racha++; rachaMax = Math.max(rachaMax, racha); } else { racha = 0; libresMes[s.mes]++; }
      hayMes[s.mes] = true;
    }
    fines.push(nf); finesMax.push(nf);
    if (rachaMax <= 2) finesOk++;
    if (hayMes.every((h, m) => !h || libresMes[m] >= 1)) mesOk++;
    // Días seguidos y semanas con pocos libres
    let r = 0, rm = 0;
    for (let d = 0; d < D; d++) { r = trab(d) ? r + 1 : 0; rm = Math.max(rm, r); }
    seguidosMax.push(rm); if (rm <= 5) seguidosOk++;
    semanasMenos2.push(lunes.filter(l => { let n = 0; for (let d = l.i; d < l.i + 7; d++) if (!trab(d)) n++; return n < 2; }).length);
    // Fin de semana de tarde en semana de mañana (o al revés)
    let inc = 0;
    for (const s of sabados) {
      const fs = [s.i, s.i + 1].filter(d => d < D && trab(d)).map(d => c(d).franja).filter(f => f === 'manana' || f === 'tarde');
      if (!fs.length) continue;
      let m = 0, t = 0; for (let d = s.i - 5; d < s.i; d++) if (d >= 0) { const f = c(d).franja; if (trab(d) && f === 'manana') m++; else if (trab(d) && f === 'tarde') t++; }
      if ((m > t && fs[0] === 'tarde') || (t > m && fs[0] === 'manana')) inc++;
    }
    incoherentes.push(inc);
    // Tarde seguida de mañana
    for (let d = 0; d + 1 < D; d++) if (trab(d) && trab(d + 1) && c(d).franja === 'tarde' && c(d + 1).franja === 'manana') tardeAManana++;
    // Noches: bloques y días libres después
    let n = 0;
    for (let d = 0; d < D;) {
      if (!(trab(d) && c(d).franja === 'noche')) { d++; continue; }
      let j = d; while (j < D && trab(j) && c(j).franja === 'noche') j++;
      const largo = j - d; n += largo;
      if (bloques[largo] != null) bloques[largo]++; else bloques.otros++;
      let k = j; while (k < D && !trab(k)) k++;
      if (k < D && j < D) { descanso.total++; const libres = k - j; if (libres < 3) descanso.menos3++; else if (libres <= 5) descanso.de3a5++; }
      d = j;
    }
    if (n) nochesCon.push(n);
  }
  const nb = bloques[1] + bloques[2] + bloques[3] + bloques.otros;
  return {
    personas: per.length,
    finesMediana: mediana(fines), finesMax: finesMax.length ? Math.max(...finesMax) : null,
    finesSeguidosOk: pct(finesOk, per.length), finLibreCadaMes: pct(mesOk, per.length),
    maxSeguidosOk: pct(seguidosOk, per.length), maxSeguidosMax: seguidosMax.length ? Math.max(...seguidosMax) : null,
    nochesMediana: mediana(nochesCon), nochesMas14: pct(nochesCon.filter(x => x > 14).length, nochesCon.length),
    bloquesSueltas: pct(bloques[1], nb), bloques2: pct(bloques[2], nb), bloques3: pct(bloques[3], nb),
    descansoMenos3: pct(descanso.menos3, descanso.total), descanso3o5: pct(descanso.de3a5, descanso.total),
    semanasMenos2: mediana(semanasMenos2), finesIncoherentes: mediana(incoherentes), tardeAManana,
    nochesBajoMinimo: new Set(res.huecos.filter(h => h.colectivo === colectivo && h.franja === 'noche').map(h => h.d)).size,
    diasBajoMinimo: new Set(res.huecos.filter(h => h.colectivo === colectivo && h.franja !== 'noche').map(h => h.d)).size,
  };
}

// Cada métrica con su valor real, el del cuadrante y si la app mejora (1), empata (0) o empeora (-1).
export function comparar(real, app, { conPuntuacion = false } = {}) {
  return METRICAS.filter(m => conPuntuacion || !m.soloApp).map(m => {
    const a = real ? real[m.k] : null, b = app ? app[m.k] : null;
    let veredicto = null;
    if (m.mejor && a != null && b != null) veredicto = Math.sign((b - a) * m.mejor);
    return { ...m, real: a, app: b, veredicto };
  });
}

// Tipos de semana de un patrón (lista de códigos por día, empezando en lunes), con la misma etiqueta que el ciclo
// de 2027: franja de lunes a viernes + franja del fin de semana. «N» si la semana tiene noches.
export function tiposSemana(patron, turnos) {
  const fr = new Map((turnos || []).map(t => [t.codigo, t.franja]));
  const letra = { manana: 'M', tarde: 'T', noche: 'N' };
  const out = [];
  for (let w = 0; w * 7 < (patron || []).length; w++) {
    const s = patron.slice(w * 7, w * 7 + 7).map(c => letra[fr.get(c)] || '-');
    const cuenta = {}; for (const x of s.slice(0, 5)) if (x !== '-') cuenta[x] = (cuenta[x] || 0) + 1;
    let a = Object.keys(cuenta).sort((x, y) => cuenta[y] - cuenta[x])[0] || '-';
    if (s.includes('N')) a = 'N';
    out.push(a + (s.slice(5).find(x => x !== '-') || '-'));
  }
  return out;
}
