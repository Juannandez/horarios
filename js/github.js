// Versión en GitHub Pages (<usuario>.github.io/<repositorio>/): sin servidor PHP. La configuración publicada es el
// fichero config.json del propio repositorio; la administración la guarda con la API de GitHub y un token
// «fine-grained» con permiso solo de «Contents: Read and write» sobre ese repositorio. El token se queda en el
// navegador de quien lo pone (localStorage) y no sale a ningún sitio más que a api.github.com.
export const EN_GITHUB = typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname);
const FICHERO = 'config.json';
const CLAVE_TOKEN = 'horarios.github.token';
const CLAVE_COPIA = 'horarios.github.ultima';   // lo último que guardó este navegador (Pages tarda 1-2 min en publicarlo)

export function repoGithub() {
  const usuario = location.hostname.split('.')[0];
  const repo = location.pathname.split('/').filter(Boolean)[0] || `${usuario}.github.io`;
  return `${usuario}/${repo}`;
}
export const tokenGithub = () => { try { return localStorage.getItem(CLAVE_TOKEN) || ''; } catch (e) { return ''; } };
export function olvidarToken() { try { localStorage.removeItem(CLAVE_TOKEN); } catch (e) { /* sin almacenamiento */ } }

async function gh(ruta, { metodo = 'GET', cuerpo, token = tokenGithub(), crudo = false } = {}) {
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
    r.status === 401 ? 'GitHub no acepta la clave: puede estar mal copiada o caducada. Crea otra (Ajustes → cómo crear la clave).'
    : r.status === 403 ? `La clave no tiene permiso para escribir en ${repoGithub()}. Al crearla, elige ese repositorio y «Contents: Read and write».${/rate limit/i.test(msg) ? ' (También puede ser el límite de consultas de GitHub: espera unos minutos.)' : ''}`
    : r.status === 404 ? 'No se encuentra en GitHub.'
    : `GitHub ha respondido con un error (${r.status}${msg ? `: ${msg}` : ''}).`);
  err.status = r.status;
  throw err;
}

// Lo publicado: config.json de Pages (sin caché) o, si es más reciente, lo último que guardó este navegador.
export async function leerPublicada() {
  let pub = null;
  try { const r = await fetch(`${FICHERO}?t=${Date.now()}`, { cache: 'no-store' }); if (r.ok) pub = await r.json(); } catch (e) { /* no hay */ }
  let mia = null;
  try { mia = JSON.parse(localStorage.getItem(CLAVE_COPIA) || 'null'); } catch (e) { /* no hay */ }
  const elegida = mia && (!pub || String(mia.guardado) > String(pub.guardado || '')) ? mia : pub;
  return elegida && elegida.config ? elegida : null;
}

export async function comprobarToken(token) {
  const d = await gh('', { token });
  if (d.permissions && d.permissions.push === false) throw new Error(`Esa clave no puede escribir en ${repoGithub()}.`);
  try { localStorage.setItem(CLAVE_TOKEN, token); } catch (e) { /* sin almacenamiento */ }
}

// UTF-8 → base64 sin perder tildes ni eñes.
function base64(texto) {
  const b = new TextEncoder().encode(texto);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
async function shaActual() {
  try { return (await gh(`/contents/${FICHERO}`)).sha; } catch (e) { if (e.status === 404) return undefined; throw e; }
}

export async function guardarGithub(config, nota) {
  const cuerpo = { guardado: new Date().toISOString(), nota, config };
  const texto = JSON.stringify(cuerpo, null, 1);
  const put = async (sha) => gh(`/contents/${FICHERO}`, { metodo: 'PUT', cuerpo: { message: `Configuración: ${nota}`.slice(0, 300), content: base64(texto), ...(sha ? { sha } : {}) } });
  try { await put(await shaActual()); }
  catch (e) {
    if (e.status !== 409 && e.status !== 422) throw e;
    await put(await shaActual());   // alguien guardó a la vez: se vuelve a pedir la versión y se reintenta una vez
  }
  try { localStorage.setItem(CLAVE_COPIA, texto); } catch (e) { /* sin almacenamiento */ }
  return cuerpo.guardado;
}

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
