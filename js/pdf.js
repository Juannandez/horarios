// PDF del cuadrante (por colectivo) y de los informes por persona, generados en el navegador con jsPDF
// (js/vendor/jspdf-4.2.1.umd.min.js, licencia MIT). Nada sale del navegador: el PDF se descarga.
// Las fuentes estándar del PDF solo tienen letras latinas: se evitan símbolos como ≥ o −.
import { ORIGEN, horarioTurno, margenesCuartos } from './motor.js';
import { analizarPersona } from './informe.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const FRANJA = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const TINTA = [18, 36, 43], GRIS = [83, 98, 104], LINEA = [210, 214, 216], TITULO = [0, 53, 77], MAL = [163, 52, 52];

// Las fuentes estándar del PDF no tienen algunos símbolos: se cambian por equivalentes que sí tienen.
const limpiar = (t) => String(t).replace(/→/g, '>').replace(/≈/g, '~').replace(/[−–—]/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[«»]/g, '"').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');
function conTextoLimpio(doc) {
  const original = doc.text.bind(doc), partir = doc.splitTextToSize.bind(doc);
  doc.text = (t, ...r) => original(Array.isArray(t) ? t.map(limpiar) : limpiar(t), ...r);
  doc.splitTextToSize = (t, ...r) => partir(limpiar(t), ...r);
  return doc;
}

let cargando = null;
export function cargarJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  cargando = cargando || new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/jspdf-4.2.1.umd.min.js';
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { cargando = null; mal(new Error('No se ha podido cargar el generador de PDF.')); };
    document.head.append(s);
  });
  return cargando;
}

const rgb = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || '') || [0, 'ffffff']; return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)); };
const lum = (c) => { const v = c.map(x => x / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const tintaSobre = (c) => (lum(c) > 0.35 ? TINTA : [255, 255, 255]);
const hoy = () => new Date().toLocaleDateString('es-ES');
const h1 = (n) => (Math.round(n * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });

function pie(doc, texto) {
  const n = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
    doc.text(texto, 8, H - 4);
    doc.text(`Página ${i} de ${n}`, W - 8, H - 4, { align: 'right' });
  }
}

// ── Cuadrante de un colectivo, mes a mes, A4 apaisado ─────────────────────────
// Nombre del mes «k» del cuadrante (con el año de 15 a 15 de enero hay dos eneros: se añade el año).
const nomMes = (res, k) => { const m = (res.meses || []).find(x => x.mc === k); return m ? `${MESES[m.mes]}${res.meses.length > 12 ? ` ${m.anio}` : ''}` : MESES[k]; };

export async function pdfCuadrante({ res, cfg, colectivo, mesDesde = 0, mesHasta = 11, personas, escenario = '' }) {
  const jsPDF = await cargarJsPDF();
  const doc = conTextoLimpio(new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true }));
  const W = 297, H = 210, M = 8;
  const nombreCol = colectivo === 'SUP' ? 'Supervisores' : 'Teleasistentes';
  const lista = (personas || res.personas).filter(p => p.colectivo === colectivo);
  const ci = res.colectivos.indexOf(colectivo);
  const colores = res.turnos.map(t => rgb(t.color));
  const usados = new Set(); lista.forEach(p => { for (let d = 0; d < res.D; d++) usados.add(res.grid[p.pi * res.D + d]); });
  let primera = true;

  for (let mes = mesDesde; mes <= mesHasta; mes++) {
    const dias = res.dias.filter(d => (d.mc ?? d.mes) === mes);
    const xNom = M, wNom = 20, xGr = xNom + wNom, wGr = lista.some(p => p.nombre) ? 40 : 26, wRes = 9;
    const x0 = xGr + wGr, wDia = (W - M - x0 - 3 * wRes) / dias.length;
    const altoFila = 4.3, yCab = M + 9, yFilas = yCab + 7;
    // Al pie: sobre el mínimo (3 franjas), total ese día y, con mínimos por cuartos, relevos.
    const conRelevos = !!(res.porHoras && res.porHoras.cuartos && colectivo === 'TA');
    const filasCob = 4 + (conRelevos ? 1 : 0), yMax = H - M - 10 - (filasCob + 1) * altoFila;
    const porPagina = Math.max(1, Math.floor((yMax - yFilas) / altoFila));
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));

    for (let pg = 0; pg < paginas; pg++) {
      if (!primera) doc.addPage(); primera = false;
      // Título
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TITULO);
      doc.text(`Cuadrante ${cfg.anio} · ${cfg.nombre}${escenario ? ` · ${escenario}` : ''} · ${nombreCol} · ${nomMes(res, mes)}`, M, M + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
      doc.text(`${cfg.titulo || ''} · ${lista.some(p => p.nombrePrueba) ? 'Nombres de prueba (inventados)' : lista.some(p => p.nombre) ? 'CONFIDENCIAL: con nombres' : 'Personas anónimas por código'} · ${paginas > 1 ? `hoja ${pg + 1} de ${paginas} del mes` : ''}`, M, M + 7.5);
      // Cabecera de días
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRIS); doc.text('PERSONA', xNom + 1, yCab + 4.5); doc.text(lista.some(p => p.nombre) ? 'NOMBRE' : 'GRUPO', xGr + 1, yCab + 4.5);
      dias.forEach((d, j) => {
        const x = x0 + j * wDia;
        if (d.finde || d.festivo) { doc.setFillColor(...(d.festivo ? [250, 228, 228] : [236, 236, 236])); doc.rect(x, yCab, wDia, 7 + Math.min(porPagina, lista.length - pg * porPagina) * altoFila, 'F'); }
        doc.setTextColor(...(d.festivo ? MAL : TINTA)); doc.text(String(d.dia), x + wDia / 2, yCab + 3, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.text(DIAS[d.dow] + (d.festivo ? 'F' : ''), x + wDia / 2, yCab + 6, { align: 'center' }); doc.setFont('helvetica', 'bold');
      });
      const xr = x0 + dias.length * wDia;
      doc.setTextColor(...GRIS); ['Horas', 'Noch.', 'FS'].forEach((t, k) => doc.text(t, xr + k * wRes + wRes - 1, yCab + 4.5, { align: 'right' }));
      // Filas
      const trozo = lista.slice(pg * porPagina, (pg + 1) * porPagina);
      trozo.forEach((p, i) => {
        const y = yFilas + i * altoFila;
        doc.setDrawColor(...LINEA); doc.setLineWidth(0.1); doc.line(M, y + altoFila, W - M, y + altoFila);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...TINTA); doc.text(p.id, xNom + 1, y + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(p.nombre || p.grupoNombre, wGr - 2)[0], xGr + 1, y + 3);
        dias.forEach((d, j) => {
          const k = p.pi * res.D + d.i, ti = res.grid[k], t = res.turnos[ti], x = x0 + j * wDia;
          if (t.codigo !== 'L') {
            doc.setFillColor(...colores[ti]); doc.rect(x + 0.2, y + 0.3, wDia - 0.4, altoFila - 0.6, 'F');
            doc.setTextColor(...tintaSobre(colores[ti])); doc.setFont('helvetica', 'bold'); doc.setFontSize(5);
            doc.text(t.codigo, x + wDia / 2, y + 2.9, { align: 'center' });
          }
          const o = res.origen[k];
          if (o === ORIGEN.CUBRE || o === ORIGEN.RECORTE || o === ORIGEN.MANUAL) { // marca de ajuste o de cambio a mano
            doc.setFillColor(...(o === ORIGEN.MANUAL ? MAL : TITULO)); doc.circle(x + wDia - 0.9, y + 0.9, 0.45, 'F');
          }
        });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...(p.alertas.length ? MAL : TINTA));
        [h1(p.horas), String(p.noches), String(p.fines)].forEach((t, kk) => doc.text(t, xr + kk * wRes + wRes - 1, y + 3, { align: 'right' }));
      });
      // Cobertura al final de la última hoja del mes
      if (pg === paginas - 1 && ci >= 0) {
        let y = yFilas + trozo.length * altoFila + 1.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...TITULO);
        doc.text(`${nombreCol} sobre el mínimo (+ de más, - en rojo lo que falta; B: disponibilidad para la bolsa)`, xNom + 1, y + 3);
        y += altoFila;
        const disp = new Map(); for (const x of res.disponibilidad || []) if (x.colectivo === colectivo) { const k = `${x.d}|${x.franja}`; disp.set(k, (disp.get(k) || 0) + 1); }
        res.franjas.forEach((f, fi) => {
          const ms = dias.map(d => res.necesidad[ci][fi][d.i]), mMin = Math.min(...ms), mMax = Math.max(...ms);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS); doc.text(`${FRANJA[f]} (mín. ${mMin === mMax ? mMin : `${mMin}-${mMax}`})`, xGr + 1, y + 3);
          dias.forEach((d, j) => {
            const n = res.cobertura[ci][fi][d.i], m = res.necesidad[ci][fi][d.i], x = x0 + j * wDia, b = disp.get(`${d.i}|${f}`) || 0;
            doc.setTextColor(...(n < m && b < m - n ? MAL : TINTA)); doc.setFont('helvetica', n < m ? 'bold' : 'normal');
            doc.text(n < m ? (b >= m - n ? `B${m - n}` : `-${m - n}`) : n > m ? `+${n - m}` : '0', x + wDia / 2, y + 3, { align: 'center' });
          });
          y += altoFila;
        });
        // Total de personas que trabajan ese día.
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...TINTA); doc.text(`${nombreCol} ese día`, xNom + 1, y + 3);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS); doc.text('en total', xGr + 1, y + 3);
        dias.forEach((d, j) => { let n = 0; for (let fi = 0; fi < res.franjas.length; fi++) n += res.cobertura[ci][fi][d.i]; doc.setTextColor(...TINTA); doc.text(String(n), x0 + j * wDia + wDia / 2, y + 3, { align: 'center' }); });
        y += altoFila;
        // Relevos por cuartos de hora: lo que falta en el peor cuarto de cada día.
        if (conRelevos) {
          const peor = new Map(); for (const h of res.porHoras.huecos) if (h.colectivo === 'TA') peor.set(h.d, Math.max(peor.get(h.d) || 0, h.falta));
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...TINTA); doc.text('Relevos (cuartos de hora)', xNom + 1, y + 3);
          dias.forEach((d, j) => { const v = peor.get(d.i); doc.setTextColor(...(v ? MAL : TINTA)); doc.setFont('helvetica', v ? 'bold' : 'normal'); doc.text(v ? `-${v}` : 'ok', x0 + j * wDia + wDia / 2, y + 3, { align: 'center' }); });
          y += altoFila;
        }
      }
      // Leyenda
      let lx = M, ly = H - M - 5;
      doc.setFontSize(6);
      res.turnos.forEach((t, ti) => {
        if (!usados.has(ti)) return;
        const etiqueta = `${t.codigo} ${t.nombre}${t.trabaja ? ` ${horarioTurno(t)}` : ''}`;
        const ancho = doc.getTextWidth(etiqueta) + 7;
        if (lx + ancho > W - M) { lx = M; ly += 3.5; }
        doc.setFillColor(...colores[ti]); doc.setDrawColor(...LINEA); doc.rect(lx, ly - 2.3, 3.5, 2.8, 'FD');
        doc.setTextColor(...TINTA); doc.setFont('helvetica', 'normal'); doc.text(etiqueta, lx + 4.5, ly);
        lx += ancho;
      });
    }
  }
  // Al final, los mínimos por horas de cada día, un mes por página (con mínimos por horas o por cuartos de hora).
  for (let mes = mesDesde; mes <= mesHasta; mes++) {
    const dias = res.dias.filter(d => (d.mc ?? d.mes) === mes);
    paginaHoras(doc, { res, cfg, ci, dias, titulo: `Mínimos por horas ${cfg.anio} · ${cfg.nombre}${escenario ? ` · ${escenario}` : ''} · ${nombreCol} · ${nomMes(res, mes)}` });
  }
  const conNombres = lista.some(p => p.nombre);
  pie(doc, `Generado el ${hoy()} · Punto azul: puesto por el ajuste · Punto rojo: cambio a mano · F: festivo${conNombres ? ' · CONFIDENCIAL: contiene datos personales' : ''}`);
  const trozo = escenario ? `-${escenario.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
  doc.save(`cuadrante-${cfg.id || 'sede'}${trozo}-${cfg.anio}-${colectivo === 'SUP' ? 'supervisores' : 'teleasistentes'}.pdf`);
}

// Mínimos por horas de un mes: una fila por hora y una columna por día. En cada casilla, arriba el mínimo de esa hora
// (el mayor de sus cuartos de hora) y abajo cuántas personas hay de más (+) o de menos (-, en rojo) en el peor cuarto
// de hora de esa hora. En ámbar, por debajo del margen de Cobertura y bolsa (de 7:45 a 22:00). Sin mínimos, no sale.
const AMBAR = [146, 90, 0], FONDO_MAL = [250, 222, 222], FONDO_AMBAR = [253, 238, 200], BOLSA = [31, 92, 153], FONDO_BOLSA = [222, 234, 248];
function paginaHoras(doc, { res, cfg, ci, dias, titulo }) {
  if (!res.cuartos || ci < 0 || !dias.length) return false;
  const MQ = margenesCuartos(cfg), mgLV = Math.max(0, ...MQ.lv), mgFS = Math.max(0, ...MQ.fs), porTramos = Array.isArray((cfg.cobertura || {}).margenTramos) && cfg.cobertura.margenTramos.length > 0;
  // Casillas: { min, dif, ambar } por hora y día (null: sin mínimo, p. ej. la madrugada del primer día).
  const casillas = Array.from({ length: 24 }, (_, h) => dias.map((d) => {
    let min = null, dif = null, ambar = false; const mq = MQ.de(d);
    for (let q = h * 4; q < h * 4 + 4; q++) {
      const m = res.cuartos.min(ci, d.i, q); if (m == null) continue;
      const v = res.cuartos.cob[ci][d.i * 96 + q] - m;
      min = min == null ? m : Math.max(min, m); dif = dif == null ? v : Math.min(dif, v);
      if (mq[q] && v < mq[q]) ambar = true;
    }
    return min == null ? null : { min, dif, ambar: ambar && dif >= 0 };
  }));
  if (!casillas.some(f => f.some(Boolean))) return false;
  // Disponibilidad para la bolsa (B) de cada día: quien libra y queda localizable para cubrir lo que falte.
  const col = res.colectivos[ci], bDia = dias.map(d => (res.disponibilidad || []).filter(x => x.d === d.i && x.colectivo === col).length);
  const W = 297, H = 210, M = 8, xNom = M, wNom = 20, x0 = xNom + wNom, wDia = (W - M - x0) / dias.length;
  const alto = 6.4;
  doc.addPage();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TITULO);
  doc.text(titulo, M, M + 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
  const sub = doc.splitTextToSize(`En cada casilla: arriba, el mínimo de esa hora; abajo, las personas en sala por encima (+) o por debajo (-, en rojo) del mínimo en el peor cuarto de hora de esa hora.${mgLV || mgFS ? (porTramos ? ` En ámbar, por debajo del margen pedido en cada tramo del día (hasta +${mgLV} de lunes a viernes; hasta +${mgFS} en sábado, domingo y festivo).` : ` En ámbar, por debajo del margen pedido de 7:45 a 22:00 (+${mgLV} de lunes a viernes; +${mgFS} en sábado, domingo y festivo).`) : ''} En azul con B, lo que falta y queda cubierto con disponibilidad para la bolsa (personas que libran y están localizables).`, W - 2 * M);
  doc.text(sub, M, M + 7.5);
  const yCab = M + 7.5 + sub.length * 2.9 + 0.5, yFilas = yCab + 7;
  // Cabecera de días
  doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRIS); doc.text('HORA', xNom + 1, yCab + 4.5);
  dias.forEach((d, j) => {
    const x = x0 + j * wDia;
    if (d.finde || d.festivo) { doc.setFillColor(...(d.festivo ? [250, 228, 228] : [236, 236, 236])); doc.rect(x, yCab, wDia, 7 + 25 * alto, 'F'); }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...(d.festivo ? MAL : TINTA)); doc.text(String(d.dia), x + wDia / 2, yCab + 3, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text(DIAS[d.dow] + (d.festivo ? 'F' : ''), x + wDia / 2, yCab + 6, { align: 'center' });
  });
  let faltan = 0, justas = 0, enBolsa = 0, sinMin = false;
  for (let h = 0; h < 24; h++) {
    const y = yFilas + h * alto;
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.1); doc.line(M, y + alto, W - M, y + alto);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...TINTA);
    doc.text(`${String(h).padStart(2, '0')}:00-${String((h + 1) % 24).padStart(2, '0')}:00`, xNom + 1, y + alto / 2 + 1);
    casillas[h].forEach((c, j) => {
      const x = x0 + j * wDia;
      if (!c) { sinMin = true; doc.setFillColor(245, 245, 245); doc.rect(x + 0.2, y + 0.2, wDia - 0.4, alto - 0.4, 'F'); return; }
      const bolsa = c.dif < 0 && bDia[j] >= -c.dif;
      if (bolsa) { enBolsa++; doc.setFillColor(...FONDO_BOLSA); doc.rect(x + 0.2, y + 0.2, wDia - 0.4, alto - 0.4, 'F'); }
      else if (c.dif < 0) { faltan++; doc.setFillColor(...FONDO_MAL); doc.rect(x + 0.2, y + 0.2, wDia - 0.4, alto - 0.4, 'F'); }
      else if (c.ambar) { justas++; doc.setFillColor(...FONDO_AMBAR); doc.rect(x + 0.2, y + 0.2, wDia - 0.4, alto - 0.4, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(...GRIS);
      doc.text(String(c.min), x + wDia / 2, y + 2.4, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.6); doc.setTextColor(...(bolsa ? BOLSA : c.dif < 0 ? MAL : c.ambar ? AMBAR : TINTA));
      doc.text(bolsa ? `B${-c.dif}` : c.dif > 0 ? `+${c.dif}` : String(c.dif), x + wDia / 2, y + 5.1, { align: 'center' });
    });
  }
  // Fila de la disponibilidad para la bolsa de cada día.
  { const y = yFilas + 24 * alto;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...BOLSA); doc.text('Disponib. (B)', xNom + 1, y + alto / 2 + 1);
    dias.forEach((d, j) => { if (!bDia[j]) return; doc.text(String(bDia[j]), x0 + j * wDia + wDia / 2, y + alto / 2 + 1, { align: 'center' }); }); }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...TINTA);
  const yR = yFilas + 25 * alto + 3.5;
  doc.text(`Este mes: ${faltan ? `${faltan} horas-día por debajo del mínimo` : 'ninguna hora por debajo del mínimo'}${enBolsa ? ` · ${enBolsa} cubiertas con disponibilidad para la bolsa` : ''}${mgLV || mgFS ? ` · ${justas} por debajo del margen` : ''}${sinMin ? ' · En gris: de 0:00 a 8:00 del primer día, la noche del cuadrante anterior.' : ''}`, M, yR);
  return true;
}

// ── Informes por persona, A4 vertical, una persona por hoja ────────────────────
export async function pdfInformes({ res, cfg, pis, nombreFichero }) {
  const jsPDF = await cargarJsPDF();
  const doc = conTextoLimpio(new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }));
  const W = 210, H = 297, M = 14;
  const colores = res.turnos.map(t => rgb(t.color));
  pis.forEach((pi, n) => {
    if (n) doc.addPage();
    const a = analizarPersona(res, pi, cfg), p = a.persona, c = a.cifras;
    let y = M + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...TITULO);
    doc.text(`Informe ${p.nombre ? `${p.nombre} (${p.id})` : p.id}`, M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text(`${cfg.nombre} · ${cfg.anio} · ${p.colectivo === 'SUP' ? 'Supervisión' : 'Teleasistencia'} · ${p.grupoNombre}`, M, y + 6);
    y += 14;
    // Resumen en dos columnas
    const filas = [
      ['Horas planificadas', `${h1(p.horas)} h`], ['Jornada anual', `${h1(p.objetivo)} h`],
      ['Diferencia', `${p.diferencia >= 0 ? '+' : '-'}${h1(Math.abs(p.diferencia))} h`], ['Días trabajados', String(c.trabajados)],
      ['Mañanas / tardes / noches', `${c.mananas} / ${c.tardes} / ${c.noches}`], ['Fines de semana trabajados', String(c.fines)],
      ['Vacaciones', `${c.vacaciones} días`], ['Libres / descanso por exceso / salientes', `${c.libres} / ${c.descansoExceso} / ${c.salientes}`],
      ['Festivos trabajados / libres', `${c.festivosTrabajados.length} / ${c.festivosLibres.length}`], ['Cambios del ajuste / a mano', `${c.ajustes} / ${c.manuales}`],
    ];
    doc.setFontSize(9);
    filas.forEach(([k, v], i) => {
      const col = i % 2, fila = Math.floor(i / 2), x = M + col * ((W - 2 * M) / 2), yy = y + fila * 6;
      doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal'); doc.text(k, x, yy);
      doc.setTextColor(...TINTA); doc.setFont('helvetica', 'bold'); doc.text(v, x + (W - 2 * M) / 2 - 4, yy, { align: 'right' });
    });
    y += Math.ceil(filas.length / 2) * 6 + 4;
    // Comprobaciones
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TITULO);
    doc.text(`Comprobaciones: ${a.revisar || a.propuestas ? [a.revisar ? `${a.revisar} a revisar` : '', a.propuestas ? `${a.propuestas} propuestas sindicales sin cumplir` : ''].filter(Boolean).join(' · ') : 'todo en orden'}`, M, y); y += 5;
    for (const x of a.comprobaciones) {
      if (y > H - 24) { doc.addPage(); y = M + 4; } // sigue en otra hoja, sin cortar nada
      const marca = x.ok === null ? 'DATO' : x.ok ? 'OK' : x.reivindicacion ? 'PROPUESTA' : 'REVISAR';
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...(x.ok === false ? (x.reivindicacion ? [116, 84, 0] : MAL) : x.ok ? [51, 102, 48] : GRIS));
      doc.text(marca, M, y);
      doc.setTextColor(...TINTA); doc.text(x.titulo, M + 19, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
      const lineas = doc.splitTextToSize(`${x.resumen}${x.fechas.length ? ` ${x.fechas.slice(0, 6).join('; ')}${x.fechas.length > 6 ? `; y ${x.fechas.length - 6} más` : ''}.` : ''} Fuente: ${x.norma}${(x.normas || []).length ? ` (${x.normas.join(', ')})` : ''}.`, W - 2 * M - 19);
      doc.text(lineas, M + 19, y + 3.6);
      y += 3.6 + lineas.length * 3.4 + 1.6;
    }
    // Calendario del año: 12 meses en 3 columnas (unos 110 mm). Si no cabe, va en la hoja siguiente.
    y += 3;
    const nMeses = (res.meses || []).length || 12;
    if (y + 112 + (nMeses > 12 ? 25 : 0) > H - 10) { doc.addPage(); y = M + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TITULO); doc.text('Calendario', M, y); y += 3;
    const anchoMes = (W - 2 * M - 8) / 3, celda = anchoMes / 7, altoC = 3.3;
    for (let mes = 0; mes < nMeses; mes++) {
      const cx = M + (mes % 3) * (anchoMes + 4), cy = y + Math.floor(mes / 3) * (altoC * 7 + 3);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...TINTA); doc.text(nomMes(res, mes), cx, cy + 2.5);
      const dias = res.dias.filter(d => (d.mc ?? d.mes) === mes);
      const fila0 = dias[0].dow;
      dias.forEach((d) => {
        const pos = fila0 + d.dia - 1, col = pos % 7, fila = Math.floor(pos / 7);
        const x = cx + col * celda, yy = cy + 3.5 + fila * altoC;
        const ti = res.grid[pi * res.D + d.i], t = res.turnos[ti];
        if (t.codigo !== 'L') { doc.setFillColor(...colores[ti]); doc.rect(x + 0.15, yy + 0.15, celda - 0.3, altoC - 0.3, 'F'); }
        doc.setFontSize(4.6); doc.setFont('helvetica', d.festivo ? 'bold' : 'normal');
        doc.setTextColor(...(t.codigo !== 'L' ? tintaSobre(colores[ti]) : d.festivo ? MAL : GRIS));
        doc.text(t.codigo === 'L' ? String(d.dia) : `${d.dia} ${t.codigo}`, x + celda / 2, yy + 2.3, { align: 'center' });
      });
    }
  });
  const conNombres = pis.some(pi => res.personas[pi].nombre);
  pie(doc, `Generado el ${hoy()} · ${conNombres ? 'CONFIDENCIAL: contiene datos personales' : 'Personas anónimas por código'} · Comprobación automática: revisa con la normativa los puntos marcados`);
  doc.save(nombreFichero || `informe-${cfg.id}-${cfg.anio}.pdf`);
}
