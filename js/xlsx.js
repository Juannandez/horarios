// Libro de Excel (.xlsx) hecho a mano, sin librerías: un ZIP sin comprimir con las hojas en XML (Office Open XML).
// hojas: [{ nombre, filas: [[celda]], anchos: [n], fijas: { filas, cols }, combinar: ['A1:C1'] }]
// celda: null, un número, un texto o { v, fondo: '#RRGGBB', tinta: '#RRGGBB', negrita, centro, borde }
// Devuelve (promesa) un Blob listo para descargar.

const enc = new TextEncoder();
const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colLetra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const hex = (c) => (/^#?[0-9a-f]{6}$/i.test(c || '') ? c.replace('#', '').toUpperCase() : null);

// ── CRC32 y ZIP (método 0: guardado, sin comprimir) ─────────────────────────────────────────────────────────────
const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
// Comprime con el «deflate» del propio navegador (CompressionStream) si lo tiene; si no, se guarda sin comprimir.
async function desinflar(d) {
  if (typeof CompressionStream !== 'function') return null;
  try { return new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); } catch (e) { return null; }
}
async function zip(ficheros) {
  const partes = [], central = []; let off = 0;
  const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF], u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
  for (const [nombre, texto] of ficheros) {
    const n = enc.encode(nombre), d = enc.encode(texto), c = crc32(d), z = await desinflar(d), met = z ? 8 : 0, datos = z || d;
    const cab = new Uint8Array([0x50, 0x4B, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(met), ...u16(0), ...u16(0x21), ...u32(c), ...u32(datos.length), ...u32(d.length), ...u16(n.length), ...u16(0)]);
    partes.push(cab, n, datos);
    central.push(new Uint8Array([0x50, 0x4B, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(met), ...u16(0), ...u16(0x21), ...u32(c), ...u32(datos.length), ...u32(d.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), n);
    off += cab.length + n.length + datos.length;
  }
  const tamC = central.reduce((a, x) => a + x.length, 0);
  const fin = new Uint8Array([0x50, 0x4B, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(ficheros.length), ...u16(ficheros.length), ...u32(tamC), ...u32(off), ...u16(0)]);
  return new Blob([...partes, ...central, fin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── Libro ───────────────────────────────────────────────────────────────────────────────────────────────────────
export async function crearXlsx(hojas) {
  // Estilos: uno por combinación de fondo, tinta, negrita, centrado y borde.
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const fonts = ['<font><sz val="10"/><name val="Calibri"/></font>'];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const mapaFill = new Map(), mapaFont = new Map(), mapaXf = new Map();
  const estilo = (c) => {
    if (!c || typeof c !== 'object') return 0;
    const f = hex(c.fondo), t = hex(c.tinta), clave = `${f}|${t}|${!!c.negrita}|${!!c.centro}|${!!c.borde}|${!!c.ajustar}`;
    if (mapaXf.has(clave)) return mapaXf.get(clave);
    let fillId = 0; if (f) { if (!mapaFill.has(f)) { mapaFill.set(f, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${f}"/><bgColor indexed="64"/></patternFill></fill>`); } fillId = mapaFill.get(f); }
    const fk = `${t}|${!!c.negrita}`; let fontId = 0;
    if (t || c.negrita) { if (!mapaFont.has(fk)) { mapaFont.set(fk, fonts.length); fonts.push(`<font>${c.negrita ? '<b/>' : ''}<sz val="10"/>${t ? `<color rgb="FF${t}"/>` : ''}<name val="Calibri"/></font>`); } fontId = mapaFont.get(fk); }
    const al = c.centro || c.ajustar ? `<alignment${c.centro ? ' horizontal="center" vertical="center"' : ''}${c.ajustar ? ' wrapText="1" vertical="top"' : ''}/>` : '';
    const id = xfs.length;
    xfs.push(`<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${c.borde ? 1 : 0}" xfId="0"${fillId ? ' applyFill="1"' : ''}${fontId ? ' applyFont="1"' : ''}${c.borde ? ' applyBorder="1"' : ''}${al ? ` applyAlignment="1">${al}</xf>` : '/>'}`);
    mapaXf.set(clave, id); return id;
  };
  const hojasXml = hojas.map((h) => {
    const filas = h.filas.map((fila, r) => {
      const celdas = fila.map((c, k) => {
        if (c == null || c === '') { const s = c && typeof c === 'object' ? estilo(c) : 0; return s ? `<c r="${colLetra(k)}${r + 1}" s="${s}"/>` : ''; }
        const v = typeof c === 'object' ? c.v : c, s = estilo(c), ref = `${colLetra(k)}${r + 1}`;
        if (v == null || v === '') return s ? `<c r="${ref}" s="${s}"/>` : '';
        if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${v}</v></c>`;
        return `<c r="${ref}"${s ? ` s="${s}"` : ''} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}">${celdas}</row>`;
    }).join('');
    const fx = h.fijas || {}, panel = fx.filas || fx.cols
      ? `<sheetViews><sheetView workbookViewId="0"><pane${fx.cols ? ` xSplit="${fx.cols}"` : ''}${fx.filas ? ` ySplit="${fx.filas}"` : ''} topLeftCell="${colLetra(fx.cols || 0)}${(fx.filas || 0) + 1}" activePane="${fx.filas && fx.cols ? 'bottomRight' : fx.filas ? 'bottomLeft' : 'topRight'}" state="frozen"/></sheetView></sheetViews>`
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const cols = (h.anchos || []).length ? `<cols>${h.anchos.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const merge = (h.combinar || []).length ? `<mergeCells count="${h.combinar.length}">${h.combinar.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${panel}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${filas}</sheetData>${merge}</worksheet>`;
  });
  const nombres = hojas.map((h, i) => xml(String(h.nombre || `Hoja ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD2D6D8"/></left><right style="thin"><color rgb="FFD2D6D8"/></right><top style="thin"><color rgb="FFD2D6D8"/></top><bottom style="thin"><color rgb="FFD2D6D8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs></styleSheet>`;
  const ficheros = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', estilos],
    ...hojasXml.map((x, i) => [`xl/worksheets/sheet${i + 1}.xml`, x]),
  ];
  return zip(ficheros);
}
