// Calendario .ics (iCalendar, RFC 5545) del año de una persona, como los de Deputy, Planday o Shiftbase: un evento por
// turno con su hora local de Madrid (la noche acaba al día siguiente) y las vacaciones como días completos seguidos.
// Se genera en el navegador: el nombre real, si lo hay, no sale de él. No toca la página: se prueba con Node.

const ZONA = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Madrid',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];
const escTexto = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Líneas de más de 75 octetos se parten (continuación con un espacio), sin cortar un carácter UTF-8.
function plegar(linea) {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;
  const partes = []; let actual = '', n = 0;
  for (const ch of linea) {
    const b = new TextEncoder().encode(ch).length;
    if (n + b > (partes.length ? 74 : 75)) { partes.push(actual); actual = ''; n = 0; }
    actual += ch; n += b;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}
const fecha = (iso) => iso.replace(/-/g, '');
const masDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const hora = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}${String(min % 60).padStart(2, '0')}00`;

export function calendarioICS(res, pi, { titulo = '', nombre = '', ahora = new Date() } = {}) {
  const p = res.personas[pi], D = res.D, T = res.turnos;
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const uidBase = `${p.id.replace(/\s+/g, '')}-${res.dias[0].fecha.slice(0, 4)}`;
  const quien = nombre || p.id;
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SAT Horarios//Cuadrante//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escTexto(`Turnos ${res.dias[0].fecha.slice(0, 4)} · ${quien}`)}`, 'X-WR-TIMEZONE:Europe/Madrid', ...ZONA];
  for (let d = 0; d < D; d++) {
    const t = T[res.grid[pi * D + d]], dia = res.dias[d];
    if (t.trabaja) {
      const fin = t.fm >= 1440 ? masDias(dia.fecha, 1) : dia.fecha;
      l.push('BEGIN:VEVENT', `UID:${uidBase}-${fecha(dia.fecha)}@sat-horarios`, `DTSTAMP:${sello}`,
        `DTSTART;TZID=Europe/Madrid:${fecha(dia.fecha)}T${hora(t.ini)}`, `DTEND;TZID=Europe/Madrid:${fecha(fin)}T${hora(t.fm % 1440)}`,
        `SUMMARY:${escTexto(`${t.codigo} · ${t.nombre}`)}`,
        `DESCRIPTION:${escTexto(`${titulo ? `${titulo}. ` : ''}${dia.festivo ? `Festivo: ${dia.festivo}. ` : ''}Turno de ${t.inicio} a ${t.fin}.`)}`,
        'TRANSP:OPAQUE', 'END:VEVENT');
    } else if (t.codigo === 'V' && !(d > 0 && T[res.grid[pi * D + d - 1]].codigo === 'V')) {
      // Vacaciones: un evento de día completo por tramo seguido.
      let n = 1; while (d + n < D && T[res.grid[pi * D + d + n]].codigo === 'V') n++;
      l.push('BEGIN:VEVENT', `UID:${uidBase}-V${fecha(dia.fecha)}@sat-horarios`, `DTSTAMP:${sello}`,
        `DTSTART;VALUE=DATE:${fecha(dia.fecha)}`, `DTEND;VALUE=DATE:${fecha(masDias(dia.fecha, n))}`,
        `SUMMARY:${escTexto(`Vacaciones (${n} ${n === 1 ? 'día' : 'días'})`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
  }
  l.push('END:VCALENDAR');
  return l.map(plegar).join('\r\n') + '\r\n';
}
