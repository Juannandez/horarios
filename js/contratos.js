// Contratos (perfiles de jornada, como los «agreements» de Quinyx o los contratos de Skello) y turnos a medida para las
// jornadas reducidas. No toca la página: se prueba con Node.
//
// Un contrato: { id, nombre, horasSemana, sinNoches, turnos: { manana, tarde, noche } }. En «turnos», el código que
// sustituye al del patrón en cada franja ('' = el del patrón). Una reducción de jornada trabaja los mismos días que el
// ciclo, con turnos más cortos: 35 h son 7 h al día; 25 h, 5 h al día.

export const CONTRATOS = () => [
  { id: 'completa', nombre: 'Jornada completa', horasSemana: 35, sinNoches: false, turnos: { manana: '', tarde: '', noche: '' } },
  { id: 'r30', nombre: 'Reducida 30 h', horasSemana: 30, sinNoches: true, turnos: { manana: '', tarde: '', noche: '' } },
  { id: 'r25', nombre: 'Reducida 25 h', horasSemana: 25, sinNoches: true, turnos: { manana: '', tarde: '', noche: '' } },
  { id: 'r20', nombre: 'Reducida 20 h', horasSemana: 20, sinNoches: true, turnos: { manana: '', tarde: '', noche: '' } },
];

const aMin = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
const aHora = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
// Aclara un color hacia el blanco (para distinguir el turno reducido del completo).
const aclarar = (hex, k = 0.35) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#DDDDDD';
  const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).map(v => Math.round(v + (255 - v) * k));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

// Turnos de mañana y tarde a medida para un contrato: misma hora de entrada que el turno de mañana de referencia y
// misma hora de salida que el de tarde, con las horas diarias del contrato (horasSemana / 5).
// Devuelve { nuevos: [turno…], mapa: { manana, tarde } } sin repetir códigos que ya existen.
export function turnosAMedida(contrato, turnos, referencia = {}) {
  const horasDia = Math.round((Number(contrato.horasSemana) || 35) / 5 * 2) / 2;
  const base = (franja, preferido) => turnos.find(t => t.codigo === preferido && t.franja === franja) || turnos.find(t => t.franja === franja && t.inicio && t.fin);
  const nuevos = [], mapa = {};
  for (const [franja, letra, pref] of [['manana', 'M', referencia.manana || 'RM1'], ['tarde', 'T', referencia.tarde || 'RT1']]) {
    const b = base(franja, pref);
    if (!b) continue;
    const ini = franja === 'manana' ? aMin(b.inicio) : aMin(b.fin) - horasDia * 60;
    const fin = ini + horasDia * 60;
    const etiqueta = String(horasDia).replace('.', '');
    const codigo = `${letra}R${etiqueta}`.slice(0, 5);
    const existe = turnos.find(t => t.codigo === codigo) || nuevos.find(t => t.codigo === codigo);
    if (!existe) nuevos.push({ codigo, nombre: `${franja === 'manana' ? 'Mañana' : 'Tarde'} reducida ${String(horasDia).replace('.', ',')} h`, inicio: aHora(ini), fin: aHora(fin), franja, color: aclarar(b.color) });
    mapa[franja] = codigo;
  }
  return { nuevos, mapa, horasDia };
}

// Casos especiales de una persona, ya normalizados. Mezcla los de la sede (cfg.especiales, por código de persona) con
// los de la plantilla real (cifrada), que mandan.
export function casoEspecial(cfgEsp = {}, real = null) {
  const e = { ...(cfgEsp || {}) };
  if (real) for (const k of ['contrato', 'franjas', 'sinFindes', 'diasLibres', 'alta', 'baja', 'semanaInicio', 'cedeNoches']) if (real[k] != null && real[k] !== '') e[k] = real[k];
  const lista = (x) => (Array.isArray(x) ? x : String(x || '').split(',')).map(s => String(s).trim()).filter(Boolean);
  return {
    contrato: e.contrato || '',
    franjas: lista(e.franjas),                                     // [] = todas
    sinFindes: !!e.sinFindes,
    diasLibres: lista(e.diasLibres).map(Number).filter(n => n >= 0 && n <= 6),   // 0 = lunes … 6 = domingo
    alta: /^\d{4}-\d{2}-\d{2}$/.test(e.alta || '') ? e.alta : '',
    baja: /^\d{4}-\d{2}-\d{2}$/.test(e.baja || '') ? e.baja : '',
    semanaInicio: Number(e.semanaInicio) > 0 ? Math.floor(Number(e.semanaInicio)) : 0,
    cedeNoches: !!e.cedeNoches,                                   // acepta ceder noches (cesión voluntaria)
    // Reducción temporal: otro contrato entre dos fechas (lactancia, cuidado de un familiar, tratamiento…).
    reduccion: e.reduccion && e.reduccion.contrato && /^\d{4}-\d{2}-\d{2}$/.test(e.reduccion.desde || '')
      ? { contrato: String(e.reduccion.contrato), desde: e.reduccion.desde, hasta: /^\d{4}-\d{2}-\d{2}$/.test(e.reduccion.hasta || '') ? e.reduccion.hasta : '' }
      : { contrato: (e.reduccion && e.reduccion.contrato) || '', desde: (e.reduccion && e.reduccion.desde) || '', hasta: (e.reduccion && e.reduccion.hasta) || '' },
  };
}
