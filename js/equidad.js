// Equidad del reparto (como el informe de reparto de Calabrio o el «load balancing» de Timefold): cómo quedan
// repartidos entre las personas los fines de semana, las noches, los festivos, los domingos y las horas.
// Los valores van prorrateados por los días de alta (y las horas, además, por la jornada). No toca la página.

export const METRICAS_EQUIDAD = [
  { k: 'fines', nombre: 'Fines de semana trabajados', corto: 'Fines de semana' },
  { k: 'noches', nombre: 'Noches', corto: 'Noches' },
  { k: 'festivos', nombre: 'Festivos trabajados', corto: 'Festivos' },
  { k: 'domingos', nombre: 'Domingos trabajados', corto: 'Domingos' },
  { k: 'horas', nombre: 'Horas del año', corto: 'Horas' },
];

const media = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);

// Personas de un colectivo que trabajan de lunes a domingo, con sus valores por métrica.
export function valoresEquidad(res, colectivo) {
  const { D, dias, turnos: T, grid } = res;
  return res.personas.filter(p => p.colectivo === colectivo && !p.soloLaborables).map(p => {
    let festivos = 0, domingos = 0;
    for (let d = 0; d < D; d++) {
      if (!T[grid[p.pi * D + d]].trabaja) continue;
      if (dias[d].festivo) festivos++;
      if (dias[d].dow === 6) domingos++;
    }
    // Una jornada reducida trabaja los mismos días con turnos más cortos: los días (fines, noches, festivos, domingos)
    // se prorratean solo por los días de alta; las horas, además, por la jornada.
    const kDias = p.hasta != null && p.desde != null ? Math.max(1, p.hasta - p.desde) / D : 1;
    const kHoras = kDias * (Number(p.horasSemana) || 35) / 35;
    const v = { fines: p.fines, noches: p.noches, festivos, domingos, horas: p.horas };
    const n = Object.fromEntries(Object.entries(v).map(([m, x]) => [m, x / (m === 'horas' ? kHoras : kDias)]));
    return { pi: p.pi, id: p.id, nombre: p.nombre || '', grupo: p.grupoNombre, k: kDias, v, n };
  });
}

// Resumen de cada métrica: media, desviación, mínimo, máximo, histograma y atípicos (a más de 1,5 desviaciones).
export function equidad(res, colectivo) {
  const filas = valoresEquidad(res, colectivo);
  return METRICAS_EQUIDAD.map(m => {
    const v = filas.map(f => f.n[m.k]);
    const mu = media(v), sd = Math.sqrt(media(v.map(x => (x - mu) ** 2)));
    const hist = new Map();
    for (const x of v) { const b = Math.round(x); hist.set(b, (hist.get(b) || 0) + 1); }
    // Atípico: a más de 1,5 desviaciones y, además, a más de 1 unidad (7 h en horas): con todo muy igualado, 16 frente
    // a 17 fines de semana no es «salirse de lo normal».
    const umbral = Math.max(1.5 * sd, m.k === 'horas' ? 7 : 1);
    const atipicos = sd > 0 ? filas.filter(f => Math.abs(f.n[m.k] - mu) > umbral) : [];
    return {
      ...m, personas: filas.length, media: mu, sd, min: v.length ? Math.min(...v) : 0, max: v.length ? Math.max(...v) : 0,
      desequilibrio: v.reduce((s, x) => s + (x - mu) ** 2, 0),
      hist: [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([x, n]) => ({ x, n })),
      atipicos,
    };
  });
}
