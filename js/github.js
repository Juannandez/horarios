// Versión en GitHub Pages (<usuario>.github.io/<repositorio>/): sin servidor PHP. La configuración publicada es el
// fichero config.json del propio repositorio. Sin claves: para publicar, se descarga config.json y se sube al
// repositorio desde github.com con la sesión normal («Add file → Upload files → Commit changes»).
export const EN_GITHUB = typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname);
const FICHERO = 'config.json';

export function repoGithub() {
  const usuario = location.hostname.split('.')[0];
  const repo = location.pathname.split('/').filter(Boolean)[0] || `${usuario}.github.io`;
  return `${usuario}/${repo}`;
}
async function gh(ruta, { crudo = false } = {}) {
  const cab = { Accept: crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let r;
  try { r = await fetch(`https://api.github.com/repos/${repoGithub()}${ruta}`, { headers: cab, cache: 'no-store' }); }
  catch (e) { throw new Error('No hay conexión con GitHub. Comprueba la conexión a internet.'); }
  if (r.ok) return crudo ? r.text() : r.json();
  let msg = '';
  try { msg = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
  const err = new Error(r.status === 404 ? 'No se encuentra en GitHub.' : r.status === 403 ? 'GitHub ha limitado las consultas desde esta red: espera unos minutos.' : `GitHub ha respondido con un error (${r.status}${msg ? `: ${msg}` : ''}).`);
  err.status = r.status;
  throw err;
}

// Lo publicado: config.json de Pages, sin caché. Si no hay, se usan los valores de partida.
export async function leerPublicada() {
  let pub = null;
  try { const r = await fetch(`${FICHERO}?t=${Date.now()}`, { cache: 'no-store' }); if (r.ok) pub = await r.json(); } catch (e) { /* no hay */ }
  return pub && pub.config ? pub : null;
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
