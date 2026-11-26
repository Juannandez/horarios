// Versión en GitHub Pages (<usuario>.github.io/<repositorio>/): sin servidor PHP. La configuración publicada es el
// fichero config.json del propio repositorio, una sola versión para todos.
// Para guardar, la administración escribe su CONTRASEÑA: descifra una clave de GitHub (token fine-grained, solo
// «Contents: Read and write» sobre este repositorio) guardada cifrada en acceso.json, en el propio repositorio
// (PBKDF2-SHA256 + AES-GCM, como la plantilla: js/plantilla.js). La clave descifrada vive solo en la pestaña
// (sessionStorage) y solo viaja a api.github.com. Sin contraseña queda la vía manual: descargar config.json y subirlo.
import { cifrar, descifrar } from './plantilla.js';
export const EN_GITHUB = typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname);
const FICHERO = 'config.json', ACCESO = 'acceso.json';
const CLAVE_SESION = 'horarios.github.sesion';   // token descifrado, solo en esta pestaña
const CLAVE_RECORDADA = 'horarios.github.recordada';   // o en este ordenador, si se pidió «recordar»
const CLAVE_COPIA = 'horarios.github.ultima';    // lo último que guardó este navegador (Pages tarda 1-2 min)

export function repoGithub() {
  const usuario = location.hostname.split('.')[0];
  const repo = location.pathname.split('/').filter(Boolean)[0] || `${usuario}.github.io`;
  return `${usuario}/${repo}`;
}
export const tokenSesion = () => { try { return sessionStorage.getItem(CLAVE_SESION) || localStorage.getItem(CLAVE_RECORDADA) || ''; } catch (e) { return ''; } };
export const sesionRecordada = () => { try { return !!localStorage.getItem(CLAVE_RECORDADA); } catch (e) { return false; } };
export function cerrarSesionGithub() { try { sessionStorage.removeItem(CLAVE_SESION); localStorage.removeItem(CLAVE_RECORDADA); } catch (e) { /* sin almacenamiento */ } }

async function gh(ruta, { crudo = false, metodo = 'GET', cuerpo, token = tokenSesion() } = {}) {
  const cab = { Accept: crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) cab.Authorization = `Bearer ${token}`;
  if (cuerpo) cab['Content-Type'] = 'application/json';
  let r;
  try { r = await fetch(`https://api.github.com/repos/${repoGithub()}${ruta}`, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: 'no-store' }); }
  catch (e) { throw new Error('No hay conexión con GitHub. Comprueba la conexión a internet.'); }
  if (r.ok) return crudo ? r.text() : r.json();
  let msg = '';
  try { msg = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
  const err = new Error(
    r.status === 401 ? 'GitHub no acepta la clave: puede haber caducado. Vuelve a preparar el acceso con una clave nueva (Ajustes).'
    : r.status === 403 ? (/rate limit/i.test(msg) ? 'GitHub ha limitado las consultas desde esta red: espera unos minutos.' : `La clave no tiene permiso para escribir en ${repoGithub()}: al crearla, elige ese repositorio y «Contents: Read and write».`)
    : r.status === 404 ? 'No se encuentra en GitHub.'
    : `GitHub ha respondido con un error (${r.status}${msg ? `: ${msg}` : ''}).`);
  err.status = r.status;
  throw err;
}

const leerPages = async (f) => { try { const r = await fetch(`${f}?t=${Date.now()}`, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };

// Lo publicado: config.json de Pages (sin caché) o, si es más reciente, lo que acaba de guardar este navegador.
export async function leerPublicada() {
  const pub = await leerPages(FICHERO);
  let mia = null;
  try { mia = JSON.parse(localStorage.getItem(CLAVE_COPIA) || 'null'); } catch (e) { /* no hay */ }
  const elegida = mia && mia.config && (!pub || String(mia.guardado) > String(pub.guardado || '')) ? mia : pub;
  return elegida && elegida.config ? elegida : null;
}

// ── Acceso con contraseña ──
export async function hayAcceso() { const a = await leerPages(ACCESO); return !!(a && a.datos && a.sal && a.iv); }
const base64 = (texto) => {
  const b = new TextEncoder().encode(texto); let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
};
const sha = async (f, token) => { try { return (await gh(`/contents/${f}`, { token })).sha; } catch (e) { if (e.status === 404) return undefined; throw e; } };
async function escribir(f, texto, mensaje, token) {
  const put = async (s) => gh(`/contents/${f}`, { metodo: 'PUT', token, cuerpo: { message: mensaje.slice(0, 300), content: base64(texto), ...(s ? { sha: s } : {}) } });
  try { await put(await sha(f, token)); }
  catch (e) { if (e.status !== 409 && e.status !== 422) throw e; await put(await sha(f, token)); }   // alguien guardó a la vez
}
// Una vez: comprueba la clave, la guarda cifrada con la contraseña en acceso.json y abre la sesión.
export async function crearAcceso(token, contrasena) {
  token = String(token || '').trim();
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) throw new Error('Eso no parece una clave de GitHub (empieza por «github_pat_»).');
  if (String(contrasena || '').length < 12) throw new Error('La contraseña tiene que tener 12 caracteres o más (mejor una frase).');
  const d = await gh('', { token });
  if (d.permissions && d.permissions.push === false) throw new Error(`Esa clave no puede escribir en ${repoGithub()}.`);
  const sobre = await cifrar({ token }, contrasena);
  await escribir(ACCESO, JSON.stringify(sobre), 'Acceso de administración (clave cifrada con contraseña)', token);
  try { sessionStorage.setItem(CLAVE_SESION, token); } catch (e) { /* sin almacenamiento */ }
}
export async function entrarConContrasena(contrasena, recordar = false) {
  const a = await leerPages(ACCESO);
  if (!a || !a.datos) throw new Error('Todavía no se ha preparado el acceso con contraseña (Ajustes → Preparar el acceso).');
  let datos;
  try { datos = await descifrar(a, contrasena); } catch (e) { throw new Error('La contraseña no es correcta.'); }
  if (!datos || !datos.token) throw new Error('El acceso guardado no es válido: vuelve a prepararlo.');
  try { sessionStorage.setItem(CLAVE_SESION, datos.token); if (recordar) localStorage.setItem(CLAVE_RECORDADA, datos.token); } catch (e) { /* sin almacenamiento */ }
}
export async function cambiarContrasena(nueva) {
  const token = tokenSesion();
  if (!token) throw new Error('Entra primero con la contraseña actual.');
  if (String(nueva || '').length < 12) throw new Error('La contraseña tiene que tener 12 caracteres o más.');
  await escribir(ACCESO, JSON.stringify(await cifrar({ token }, nueva)), 'Acceso de administración: contraseña cambiada', token);
}
export async function quitarAcceso() {
  const token = tokenSesion();
  if (!token) throw new Error('Entra primero con la contraseña.');
  await escribir(ACCESO, '{}', 'Acceso de administración quitado', token);
  cerrarSesionGithub();
}
// Guarda config.json para todos (una sola versión) y recuerda la copia hasta que Pages la sirva.
// conocido: la marca «guardado» de la versión de la que parte este ordenador. Si en GitHub hay una más nueva (guardada
// desde otro ordenador), no se pisa: se lanza un error con .nueva = true.
export async function guardarGithub(config, nota, conocido = '') {
  const token = tokenSesion();
  if (!token) throw new Error('Entra con la contraseña de administración para guardar.');
  if (conocido) {
    let remota = '';
    try { remota = JSON.parse(await gh(`/contents/${FICHERO}`, { crudo: true, token })).guardado || ''; } catch (e) { if (e.status !== 404) throw e; }
    if (remota && remota > conocido) {
      const err = new Error('Hay una versión más nueva guardada desde otro ordenador. Recarga la página para traerla (tus cambios de aquí siguen guardados en este ordenador).');
      err.nueva = true; throw err;
    }
  }
  const texto = ficheroPublicacion(config, nota);
  await escribir(FICHERO, texto, `Configuración: ${nota}`, token);
  try { localStorage.setItem(CLAVE_COPIA, texto); } catch (e) { /* sin almacenamiento */ }
  return JSON.parse(texto).guardado;
}

// La versión publicada ahora mismo en el repositorio (sin esperar a Pages): { guardado, nota, config }.
export async function leerRemota() {
  return JSON.parse(await gh(`/contents/${FICHERO}`, { crudo: true }));
}
// Las últimas versiones de config.json con su contenido (para encontrar sobre cuál se hizo un borrador antiguo).
export async function versionesConContenido(n = 12) {
  const lista = await gh(`/commits?path=${FICHERO}&per_page=${n}`);
  const out = [];
  for (const c of lista) {
    try { const d = JSON.parse(await gh(`/contents/${FICHERO}?ref=${c.sha}`, { crudo: true })); out.push({ sha: c.sha, guardado: d.guardado || '', config: d.config }); } catch (e) { /* esa versión no se puede leer */ }
  }
  return out;
}

// El fichero que se sube a GitHub: el mismo formato que lee leerPublicada().
export function ficheroPublicacion(config, nota) {
  return JSON.stringify({ guardado: new Date().toISOString(), nota, config }, null, 1);
}
// Página de subida de ficheros del repositorio (pide la sesión normal de github.com).
export const urlSubida = () => `https://github.com/${repoGithub()}/upload/main`;

// Versiones = historial de config.json en el repositorio.
export async function versionesGithub() {
  const lista = await gh(`/commits?path=${FICHERO}&per_page=30`);
  return lista.map(c => ({ id: c.sha, fecha: c.commit.author.date, nota: String(c.commit.message || '').replace(/^Configuración: /, '') }));
}
export async function versionGithub(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Versión no válida.');
  const d = JSON.parse(await gh(`/contents/${FICHERO}?ref=${sha}`, { crudo: true }));
  return d.config;
}
