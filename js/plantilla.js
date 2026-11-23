// Plantilla real (nombres y datos de cada persona), cifrada en el navegador. El servidor solo guarda el texto
// cifrado: sin la frase de paso nadie, ni quien entre en el servidor, puede leer los nombres.
// Cifrado: clave derivada de la frase con PBKDF2-SHA-256 (310.000 vueltas, sal aleatoria) y AES-GCM de 256 bits.

const ITERACIONES = 310000;
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function clave(frase, sal) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(frase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(datos, frase) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await clave(frase, sal);
  const texto = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(datos)));
  return { v: 1, kdf: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: b64(sal), iv: b64(iv), datos: b64(texto) };
}

export async function descifrar(sobre, frase) {
  const k = await clave(frase, deB64(sobre.sal));
  try {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) }, k, deB64(sobre.datos));
    return JSON.parse(new TextDecoder().decode(plano));
  } catch (e) {
    throw new Error('La frase de paso no es correcta.');
  }
}

// CSV de personas: nombre;colectivo;sede;turno_actual;exento_noches;horas_semana
// Columnas opcionales de casos especiales: contrato (código o nombre), franjas (mañana, tarde, noche, separadas por
// comas), sin_findes (sí/no), dias_libres (L,M,X,J,V,S,D), alta y baja (AAAA-MM-DD).
export const CABECERA_PLANTILLA = ['nombre', 'colectivo', 'sede', 'turno_actual', 'exento_noches', 'horas_semana', 'contrato', 'franjas', 'sin_findes', 'dias_libres', 'alta', 'baja'];
const LETRAS_DIA = { l: 0, m: 1, x: 2, j: 3, v: 4, s: 5, d: 6 };
const FRANJA_TXT = { m: 'manana', t: 'tarde', n: 'noche' };
const siNo = (t) => /^(s[ií]|1|x|true|verdadero)$/i.test(String(t || '').trim());
const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function leerCsvPlantilla(texto, sedes) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lineas.length) throw new Error('el fichero está vacío');
  const sep = lineas[0].includes(';') ? ';' : lineas[0].includes('\t') ? '\t' : ',';
  const cab = lineas[0].split(sep).map(c => normal(c.replace(/"/g, '')).replace(/\s+/g, '_'));
  const col = (n) => cab.indexOf(n);
  if (col('nombre') < 0) throw new Error('falta la columna «nombre»');
  const personas = [], errores = [];
  lineas.slice(1).forEach((l, i) => {
    const c = l.split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
    const nombre = c[col('nombre')];
    if (!nombre) return;
    const colectivoTxt = normal(col('colectivo') >= 0 ? c[col('colectivo')] : 'TA');
    const colectivo = /^(sup|superv)/.test(colectivoTxt) ? 'SUP' : 'TA';
    const sedeTxt = normal(col('sede') >= 0 ? c[col('sede')] : sedes[0].nombre);
    const sede = sedes.find(s => normal(s.nombre) === sedeTxt || s.id === sedeTxt);
    if (!sede) { errores.push(`fila ${i + 2}: sede «${c[col('sede')]}» desconocida`); return; }
    const horas = col('horas_semana') >= 0 && c[col('horas_semana')] ? Number(String(c[col('horas_semana')]).replace(',', '.')) : 35;
    const txt = (n) => (col(n) >= 0 ? String(c[col(n)] || '').trim() : '');
    const fecha = (n) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(n)) ? txt(n) : '');
    const persona = { nombre, colectivo, sede: sede.id, turnoActual: txt('turno_actual'),
      exentoNoches: col('exento_noches') >= 0 && siNo(c[col('exento_noches')]), horasSemana: horas > 0 && horas <= 40 ? horas : 35 };
    // Casos especiales (opcionales): van cifrados con el resto de la fila.
    if (txt('contrato')) persona.contrato = txt('contrato');
    const fr = txt('franjas').split(/[,/ ]+/).map(x => FRANJA_TXT[normal(x)[0]]).filter(Boolean);
    if (fr.length) persona.franjas = [...new Set(fr)].join(',');
    if (col('sin_findes') >= 0 && siNo(c[col('sin_findes')])) persona.sinFindes = true;
    const dl = txt('dias_libres').split(/[,/ ]+/).map(x => LETRAS_DIA[normal(x)[0]]).filter(x => x != null);
    if (dl.length) persona.diasLibres = [...new Set(dl)];
    if (fecha('alta')) persona.alta = fecha('alta');
    if (fecha('baja')) persona.baja = fecha('baja');
    personas.push(persona);
  });
  return { personas, errores };
}
