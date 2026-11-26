// Estado compartido, servidor, modales y utilidades de la app.
import { CONFIG_BASE, SEDES_BASE, AJ_BASE, REPARTO_FESTIVOS, CICLO } from './datos-base.js';
import { generar } from './motor.js';
import { calcularFestivos, claveFuente } from './festivos.js';
import { EN_GITHUB, leerPublicada, versionesGithub, versionGithub, tokenSesion, entrarConContrasena, cerrarSesionGithub, guardarGithub, leerRemota, versionesConContenido } from './github.js';

const API = 'api/api.php';
const CLAVE_BORRADOR = 'horarios.borrador';
const CLAVE_SESION = 'horarios.sesion';
const CLAVE_SEDE = 'horarios.sede';

export const estado = {
  todo: null,           // configuración completa: { tema, encuestas, sedes: [...] }
  sede: 'sevilla',      // pestaña de sede activa
  publicada: null,      // la guardada en el servidor (texto JSON)
  plantilla: null,      // personas reales descifradas (solo en memoria de esta pestaña): { personas: [...] }
  descargas: {},        // festivos bajados de la fuente: { 'clave|año': { clave, anio, lista, fecha } | { error } }
  festivos: null,       // festivos que se aplican a la sede y año activos (calcularFestivos)
  res: null,            // cuadrante generado
  admin: false,
  token: '',
  servidor: 'cargando', // ok | sin-conexion | cargando
  claveConfigurada: true,
  guardado: '',
  vista: 'cuadrante',
  sub: '',               // apartado dentro de la vista (#parametros/turnos)
  ui: {
    modo: 'mes', mesDesde: 0, mesHasta: 0, colectivo: 'todos', grupo: 'todos', resaltar: '', soloAvisos: false, buscar: '', infraccion: '',
    orden: { campo: 'id', dir: 1 }, encuesta: '', editarEncuestas: false, resEncuesta: '', resFiltro: { pregunta: '', valor: '' }, resOrden: 'votos',
  },
  // Configuración de la sede activa. Cada sede tiene sus propios turnos, grupos, mínimos, reglas,
  // festivos y cambios a mano; lo que se añade o se quita en una no toca a la otra.
  get cfg() { return this.todo.sedes.find(x => x.id === this.sede) || this.todo.sedes[0]; },
};

// ── Utilidades ──────────────────────────────────────────────────────────────
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clonar = (o) => JSON.parse(JSON.stringify(o));
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const fmtNum = (n, dec = 0) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtFecha = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1].toLowerCase()} de ${y}`; };
export const nuevoId = (pre) => `${pre}-${Math.random().toString(36).slice(2, 8)}`;

// Texto oscuro o claro sobre un color de fondo, el que dé más contraste.
const lum = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 1;
  const v = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
export const tinta = (hex) => {
  const L = lum(hex);
  return (L + 0.05) / (0.0137 + 0.05) >= (1.05) / (L + 0.05) ? '#12242B' : '#FFFFFF';
};
// Los días sin turno de color claro (libre, saliente, descanso) no van en blanco en los temas oscuros: se mezclan
// con el fondo del panel y dejan solo un tinte de su color. light-dark() sigue el color-scheme de cada tema.
const apagado = (t) => t.trabaja === false || t.franja === 'libre';
export const estiloTurno = (t) => (apagado(t) && lum(t.color) > 0.5
  ? `background:light-dark(${t.color}, color-mix(in srgb, ${t.color} 12%, var(--panel)));color:light-dark(${tinta(t.color)}, var(--muted))`
  : `background:${t.color};color:${tinta(t.color)}`);

export function leerRuta(obj, ruta) { return ruta.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
export function ponerRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  const ultimo = partes.pop();
  // Crea los objetos intermedios que falten (p. ej. grupos.3.condiciones.libreFines en un refuerzo sin condiciones).
  const destino = partes.reduce((o, k) => (o[k] == null ? (o[k] = {}) : o[k]), obj);
  destino[ultimo] = valor;
}

// ── Avisos ──────────────────────────────────────────────────────────────────
export function avisar(texto, tipo = '', ms = 6000) {
  const caja = $('#avisos');
  const div = document.createElement('div');
  div.className = `banda ${tipo === 'bien' ? 'ok' : tipo}`;
  div.innerHTML = `<span>${texto}</span>`;
  const cerrar = document.createElement('button');
  cerrar.className = 'btn mini discreto'; cerrar.type = 'button'; cerrar.textContent = 'Cerrar';
  cerrar.onclick = () => div.remove();
  div.append(cerrar);
  caja.append(div);
  if (ms) setTimeout(() => div.remove(), ms);
}

// ── Modal propio (nada de alert, confirm ni prompt) ─────────────────────────
export function modal({ titulo, html = '', botones = [{ texto: 'Cerrar', valor: null }], alAbrir }) {
  return new Promise((resolver) => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <h2 id="modal-titulo">${esc(titulo)}</h2><div class="cuerpo">${html}</div>
      <div class="botones"></div></div>`;
    const anterior = document.activeElement;
    const cerrar = (valor) => { velo.remove(); document.removeEventListener('keydown', tecla); anterior && anterior.focus && anterior.focus(); resolver(valor); };
    const caja = $('.botones', velo);
    botones.forEach(b => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = `btn ${b.tipo || ''}`; el.textContent = b.texto;
      el.onclick = () => cerrar(typeof b.valor === 'function' ? b.valor(velo) : b.valor);
      caja.append(el);
    });
    // Pulsar fuera solo cierra si el ratón baja y sube en el velo.
    let bajoEnVelo = false;
    velo.addEventListener('mousedown', e => { bajoEnVelo = e.target === velo; });
    velo.addEventListener('mouseup', e => { if (bajoEnVelo && e.target === velo) cerrar(null); bajoEnVelo = false; });
    const tecla = (e) => {
      if (e.key === 'Escape') cerrar(null);
      if (e.key === 'Tab') {
        const foco = $$('button, input, select, textarea, [tabindex="0"]', velo).filter(x => !x.disabled);
        if (!foco.length) return;
        const i = foco.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); foco[foco.length - 1].focus(); }
        else if (!e.shiftKey && i === foco.length - 1) { e.preventDefault(); foco[0].focus(); }
      }
    };
    document.addEventListener('keydown', tecla);
    $('#modales').append(velo);
    if (alAbrir) alAbrir(velo, cerrar);
    const primero = $('input, select, textarea', velo) || $('.botones .btn:last-child', velo);
    primero && primero.focus();
  });
}
export const confirmar = (titulo, texto, si = 'Sí, seguir', tipo = 'peligro') =>
  modal({ titulo, html: `<p>${texto}</p>`, botones: [{ texto: 'Cancelar', valor: false }, { texto: si, tipo, valor: true }] });

// ── Servidor ────────────────────────────────────────────────────────────────
// «espera»: milisegundos antes de dar el servidor por perdido (una red que retiene la petición no deja colgada la app).
export async function api(accion, cuerpo, parametros = {}, espera = 30000) {
  if (DEMO) {
    if (accion === 'versiones') return { versiones: await versionesGithub() };
    if (accion === 'version') return { config: await versionGithub(String(parametros.id || '')) };
    throw new Error('No está disponible en la versión de GitHub: necesita el servidor de sat.gestlogix.com.');
  }
  const corte = typeof AbortController === 'function' ? new AbortController() : null;
  const reloj = corte ? setTimeout(() => corte.abort(), espera) : 0;
  const op = { method: cuerpo ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: corte ? corte.signal : undefined };
  if (estado.token) op.headers['X-Sesion'] = estado.token;
  if (cuerpo) op.body = JSON.stringify(cuerpo);
  let r;
  const extra = Object.entries(parametros).map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('');
  try { r = await fetch(`${API}?accion=${encodeURIComponent(accion)}${extra}`, op); }
  catch (e) { clearTimeout(reloj); throw new Error('No hay conexión con el servidor. Comprueba tu conexión a internet y vuelve a intentarlo.'); }
  let datos = null;
  try { datos = await r.json(); } catch (e) { /* el servidor no ha devuelto JSON: probablemente no hay PHP */ }
  clearTimeout(reloj);
  if (!datos) throw new Error('El servidor no ha respondido como se esperaba. Puede que no tenga PHP activado: revisa el README.');
  if (!r.ok) {
    if (r.status === 401) { estado.admin = false; estado.token = ''; guardarSesion(); }
    throw new Error([datos.error, datos.hacer].filter(Boolean).join(' '));
  }
  return datos;
}

function guardarSesion() {
  if (DEMO) return;   // en GitHub la sesión la lleva js/github.js
  try { estado.token ? sessionStorage.setItem(CLAVE_SESION, estado.token) : sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
}

// Versión en GitHub Pages (sin PHP): la configuración publicada es config.json del repositorio (js/github.js).
export const DEMO = EN_GITHUB;

export async function cargar() {
  try { estado.token = sessionStorage.getItem(CLAVE_SESION) || ''; } catch (e) {}
  let delServidor = null;
  if (DEMO) {
    estado.servidor = 'demo';
    const pub = await leerPublicada();
    if (pub) { delServidor = pub.config; estado.guardado = pub.guardado || ''; }
    estado.admin = !!tokenSesion();   // la contraseña ya se escribió en esta pestaña
  } else try {
    const d = await api('estado', null, {}, 8000); // al arrancar: si en 8 s no contesta, se sigue sin conexión
    estado.servidor = 'ok';
    estado.admin = !!d.admin;
    if (!d.admin) { estado.token = ''; guardarSesion(); }
    estado.claveConfigurada = !!d.claveConfigurada;
    estado.guardado = d.guardado || '';
    delServidor = d.config;
  } catch (e) {
    estado.servidor = 'sin-conexion';
  }
  const base = completar(delServidor || clonar(CONFIG_BASE));
  estado.publicada = JSON.stringify(base);
  let borrador = null;
  try { borrador = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null'); } catch (e) {}
  // Una sola versión para todos: solo la administración recupera lo que dejó a medias. Sin sesión, al abrir se ve
  // siempre la versión publicada (los cambios de prueba no sobreviven a recargar la página).
  // En GitHub (sin sesiones) lo de este ordenador se guarda hasta que se publica o se descarta.
  if (borrador && !estado.admin && !DEMO) { borrador = null; borrarBorrador(); }
  // En GitHub: si el borrador de este ordenador se hizo sobre una versión publicada más antigua que la de ahora (se ha
  // guardado desde otro ordenador), no se carga encima: se aparta y se avisa, para no pisar lo nuevo.
  // Ahora se juntan: lo cambiado aquí se pone encima de la versión nueva (fusión a tres bandas con la versión de la que
  // partía el borrador). Si no se sabe de cuál partía, se busca en el historial la que más se le parece.
  if (borrador && DEMO) {
    let baseBorrador = null, baseJSON = null;
    try { baseBorrador = localStorage.getItem(CLAVE_BORRADOR + '.base'); baseJSON = localStorage.getItem(CLAVE_BORRADOR + '.baseJSON'); } catch (e) { /* sin almacenamiento */ }
    if (baseBorrador != null && estado.guardado && baseBorrador < estado.guardado) {
      let baseCfg = null;
      try { baseCfg = baseJSON ? completar(JSON.parse(baseJSON)) : estado.admin ? await buscarBase(completar(borrador)) : null; } catch (e) { baseCfg = null; }
      if (baseCfg) { borrador = fusionar(baseCfg, completar(borrador), base); estado.borradorJuntado = true; }
      else {
        try { localStorage.setItem(CLAVE_BORRADOR + '.apartado', JSON.stringify(borrador)); } catch (e) { /* sin almacenamiento */ }
        borrador = null; borrarBorrador();
        estado.borradorApartado = true;
      }
    }
  }
  // Lo que una versión anterior de la app apartó (sin juntarlo): se recupera juntándolo con la versión de ahora.
  if (!borrador && DEMO && estado.admin) {
    let ap = null;
    try { ap = JSON.parse(localStorage.getItem(CLAVE_BORRADOR + '.apartado') || 'null'); } catch (e) { ap = null; }
    if (ap) {
      try {
        const apCfg = completar(ap), baseCfg = await buscarBase(apCfg);
        if (baseCfg) {
          const junto = completar(fusionar(baseCfg, apCfg, base));
          if (JSON.stringify(junto) !== estado.publicada) { borrador = junto; estado.borradorRecuperado = true; }
          localStorage.removeItem(CLAVE_BORRADOR + '.apartado');
        }
      } catch (e) { /* se queda apartado */ }
    }
  }
  estado.todo = borrador ? completar(borrador) : base;
  if (borrador && JSON.stringify(estado.todo) === estado.publicada) borrarBorrador();
  let sede = '';
  try { sede = localStorage.getItem(CLAVE_SEDE) || ''; } catch (e) {}
  if (estado.todo.sedes.some(x => x.id === sede)) estado.sede = sede;
  aplicarTemaPorDefecto();
  reiniciarHistorial();
  regenerar();
}

// Rellena lo que falte en una configuración antigua o importada, sin pisar lo que haya.
// Acepta también la versión 1 (una sola sede, la de Sevilla).
export function completar(cfg) {
  const base = clonar(CONFIG_BASE);
  if (!cfg || typeof cfg !== 'object') return base;
  let todo = cfg;
  if (!Array.isArray(cfg.sedes)) {
    const { tema, encuestas, version, ...sede } = cfg;
    todo = { tema, encuestas, sedes: [{ ...sede, id: 'sevilla', nombre: 'Sevilla', titulo: sede.nombre }] };
  }
  const c = { version: 2, tema: todo.tema || base.tema, encuestas: Array.isArray(todo.encuestas) ? todo.encuestas : base.encuestas, sedes: [],
    // Escenarios: fotos con nombre del cuadrante de una sede (como los escenarios de Calabrio), para comparar.
    escenarios: Array.isArray(todo.escenarios) ? todo.escenarios.filter(e => e && e.id && e.sede && e.cfg) : [],
    // Dirección de Portal Horario (el sistema oficial de solicitudes); vacío = la de partida.
    portalHorario: typeof todo.portalHorario === 'string' && /^https:\/\//.test(todo.portalHorario) ? todo.portalHorario : '' };
  for (const b of base.sedes) {
    const s = todo.sedes.find(x => x && x.id === b.id);
    c.sedes.push(s ? completarSede(s, b) : b);
  }
  for (const s of todo.sedes) if (s && s.id && !c.sedes.some(x => x.id === s.id)) c.sedes.push(completarSede(s, base.sedes[0]));
  return c;
}

// PHP guarda el JSON como arrays asociativos: un objeto vacío ({}) vuelve del servidor como lista vacía ([]).
// Los campos que son diccionarios se normalizan aquí; si no, lo que se añadiera después a una lista con claves de texto
// se perdería al guardar (JSON.stringify no las escribe).
const dicc = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

export function completarSede(cfg, base) {
  const c = { ...base, ...cfg };
  // Las reglas se añaden y se quitan: no se rellenan con las de partida si ya hay.
  c.reglas = cfg.reglas && typeof cfg.reglas === 'object' && !Array.isArray(cfg.reglas) ? { ...cfg.reglas } : base.reglas;
  if (!c.reglas.ajuste) c.reglas.ajuste = { activo: true };
  for (const k of ['turnos', 'grupos', 'minimos']) if (!Array.isArray(c[k])) c[k] = base[k];
  // Festivos: la versión anterior era una lista de fechas; ahora es fuente + locales + correcciones.
  if (!c.festivos || Array.isArray(c.festivos) || typeof c.festivos !== 'object') c.festivos = base.festivos;
  c.festivos = { fuente: { tipo: 'ninguna', region: '', url: '', trasladarDomingos: true }, locales: [], extra: [], quitar: [], enlaces: [], cache: null, ...c.festivos };
  c.manuales = dicc(c.manuales);
  if (!Array.isArray(c.solapes)) c.solapes = clonar(base.solapes || []);
  // Mínimos por día de la semana (L…D) y festivo. Los antiguos (laborable, sábado, domingo y festivo) se pasan solos.
  for (const m of c.minimos) {
    if (!Array.isArray(m.dias) || m.dias.length !== 7) {
      const l = Number(m.laborable) || 0, s = Number(m.sabado) || 0, d = Number(m.domingo) || 0;
      m.dias = [l, l, l, l, l, s, d];
    }
    if (m.festivo == null) m.festivo = Number(m.domingo ?? m.dias[6]) || 0;
  }
  if (!Array.isArray(c.contratos)) c.contratos = JSON.parse(JSON.stringify(base.contratos || []));
  if (!c.especiales || typeof c.especiales !== 'object' || Array.isArray(c.especiales)) c.especiales = {};
  // Cobertura y bolsa: lo que falte se completa con los valores de partida de la sede.
  {
    const b = base.cobertura || {}, x = dicc(c.cobertura);
    c.cobertura = {
      cesion: { modo: 'ninguna', tope: 14, ...dicc(b.cesion), ...dicc(x.cesion) },
      bolsa: { modo: 'devolver', tope: 0, ...dicc(b.bolsa), ...dicc(x.bolsa) },
      margen: { noche: 0, dia: 0, tipo: 'personas', ...dicc(b.margen), ...dicc(x.margen) },
      ausencias: Array.isArray(x.ausencias) ? x.ausencias : [],
      aguante: { avisar: true, ...dicc(b.aguante), ...dicc(x.aguante) },
    };
    c.cobertura.bolsa.inicial = dicc(c.cobertura.bolsa.inicial);
    c.cobertura.bolsa.consumida = dicc(c.cobertura.bolsa.consumida);
  }
  // Navidad y festivos, ciclo continuo y mínimos por fecha (lo que falte, con los valores de partida).
  c.aj = { ...AJ_BASE(), ...dicc(base.aj), ...dicc(cfg.aj) }; c.aj.elegidos = dicc(c.aj.elegidos);
  if (!Array.isArray(c.aj.fechas)) c.aj.fechas = AJ_BASE().fechas;
  c.minimosHora = { activo: false, ...dicc(c.minimosHora) };
  c.absentismo = { dia: 0, noche: 0, cuenta: 'margen', ...dicc(c.absentismo) };
  if (!Array.isArray(c.minimosFecha)) c.minimosFecha = Array.isArray(base.minimosFecha) ? clonar(base.minimosFecha) : [];
  c.repartoFestivos = { ...REPARTO_FESTIVOS(), ...dicc(base.repartoFestivos), ...dicc(cfg.repartoFestivos) };
  c.repartoFestivos.historial = dicc(c.repartoFestivos.historial);
  c.repartoFestivos.rotan = dicc(c.repartoFestivos.rotan);
  if (!Array.isArray(c.repartoFestivos.fechasRotan)) c.repartoFestivos.fechasRotan = REPARTO_FESTIVOS().fechasRotan;
  if (!Array.isArray(c.repartoFestivos.especiales)) c.repartoFestivos.especiales = REPARTO_FESTIVOS().especiales;
  c.ciclo = { ...CICLO(), ...dicc(base.ciclo), ...dicc(cfg.ciclo) };
  if (!c.vacaciones || typeof c.vacaciones !== 'object') c.vacaciones = base.vacaciones ? JSON.parse(JSON.stringify(base.vacaciones)) : { modo: 'escalonado' };
  c.vacaciones = { modo: 'escalonado', diasHabiles: 17, diasSueltos: 5, horasDia: 7, semilla: 'sorteo', periodos: [], solicitudes: {}, sueltosEnJornada: false, sueltosOctDic: 1, ...c.vacaciones };
  c.vacaciones.solicitudes = dicc(c.vacaciones.solicitudes);
  for (const x of c.contratos) x.turnos = { manana: '', tarde: '', noche: '', ...dicc(x.turnos) };
  for (const g of c.grupos) {
    g.vacaciones = { activo: false, dias: 30, desde: '06-01', hasta: '09-30', ...(g.vacaciones || {}) };
    if (!Array.isArray(g.patron)) g.patron = [];
  }
  return c;
}

export function sedeBase(id) { return clonar(SEDES_BASE.find(x => x.id === id) || SEDES_BASE[0]); }

export function ponerSede(id) {
  if (!estado.todo.sedes.some(x => x.id === id) || id === estado.sede) return;
  estado.sede = id;
  estado.ui.grupo = 'todos';
  try { localStorage.setItem(CLAVE_SEDE, id); } catch (e) {}
  regenerar();
}

export function cambiosSinGuardar() { return JSON.stringify(estado.todo) !== estado.publicada; }

// ── Juntar cambios (fusión a tres bandas) ───────────────────────────────────────────────────────────────────────
// base: la versión sobre la que se trabajaba; mio: lo de este ordenador; remoto: la versión más nueva guardada desde
// otro sitio. Lo que solo ha cambiado uno, se queda; si han cambiado los dos lo mismo, gana lo de este ordenador. Los
// objetos se juntan campo a campo y las listas con identificador (sedes, escenarios, grupos, turnos) elemento a elemento.
const igualJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const esObjeto = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const claveDe = (x) => (esObjeto(x) ? x.id ?? x.codigo ?? null : null);
const conClaves = (l) => Array.isArray(l) && l.length > 0 && l.every(x => claveDe(x) != null);
export function fusionar(base, mio, remoto) {
  if (igualJSON(mio, base)) return remoto;
  if (igualJSON(remoto, base) || igualJSON(remoto, mio)) return mio;
  if (esObjeto(mio) && esObjeto(remoto) && esObjeto(base)) {
    const out = { ...remoto };
    for (const k of new Set([...Object.keys(mio), ...Object.keys(remoto), ...Object.keys(base)])) {
      const v = fusionar(base[k], mio[k], remoto[k]);
      if (v === undefined) delete out[k]; else out[k] = v;
    }
    return out;
  }
  if (conClaves(mio) && conClaves(remoto) && (conClaves(base) || (Array.isArray(base) && !base.length))) {
    const mapa = (l) => new Map(l.map(x => [claveDe(x), x]));
    const B = mapa(base), M = mapa(mio), R = mapa(remoto), out = [];
    for (const x of mio) {
      const k = claveDe(x);
      if (!R.has(k) && B.has(k) && igualJSON(B.get(k), x)) continue;      // lo borraron allí y aquí no se tocó
      out.push(R.has(k) ? fusionar(B.get(k), x, R.get(k)) : x);
    }
    for (const x of remoto) { const k = claveDe(x); if (!M.has(k) && !B.has(k)) out.push(x); }   // nuevo de allí
    return out;
  }
  return mio;
}
// Diferencia aproximada entre dos configuraciones (cuántas partes de cada sede y de lo general no coinciden).
function distancia(a, b) {
  let n = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (k !== 'sedes' && !igualJSON(a[k], b[k])) n++;
  for (const sa of a.sedes || []) {
    const sb = (b.sedes || []).find(x => x.id === sa.id);
    if (!sb) { n += 50; continue; }
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (!igualJSON(sa[k], sb[k])) n++;
  }
  return n;
}
// Sobre qué versión publicada se hizo un borrador antiguo: la del historial que más se le parece.
async function buscarBase(borrador) {
  const versiones = await versionesConContenido(12);
  let mejor = null, d0 = Infinity;
  for (const v of versiones) { if (!v.config) continue; const d = distancia(borrador, completar(v.config)); if (d < d0) { d0 = d; mejor = v; } }
  return mejor ? completar(mejor.config) : null;
}
export function borrarBorrador() { try { for (const x of ['', '.base', '.baseJSON', '.baseGuardado']) localStorage.removeItem(CLAVE_BORRADOR + x); } catch (e) {} }

let temporizador = 0;
const oyentes = new Set();
export const alRegenerar = (fn) => oyentes.add(fn);

// Nombres de prueba: una etiqueta genérica al lado del código («Teleasistente 001», «Supervisor/a 01»…) para
// enseñar la app como si tuviera plantilla, sin datos reales. No cambia el reparto. Se recuerda en este navegador.
const CLAVE_PRUEBA = 'horarios.nombresPrueba';
const ETIQUETA_PRUEBA = { TA: 'Teleasistente', SUP: 'Supervisor/a', RV: 'Refuerzo de verano', TB: 'Teleasistente línea B' };
export const nombresPrueba = () => { try { return localStorage.getItem(CLAVE_PRUEBA) === '1'; } catch (e) { return false; } };
export function ponerNombresPrueba(si) {
  try { si ? localStorage.setItem(CLAVE_PRUEBA, '1') : localStorage.removeItem(CLAVE_PRUEBA); } catch (e) { /* sin almacenamiento */ }
  regenerar();
}
function nombrarPrueba(res) {
  if (!res || estado.plantilla || !nombresPrueba()) return res;
  for (const p of res.personas) {
    const m = String(p.id).match(/^(.*?)\s*(\d+)$/), pref = m ? m[1].trim() : '', num = m ? m[2] : p.id;
    p.nombre = `${ETIQUETA_PRUEBA[pref] || (p.colectivo === 'SUP' ? 'Supervisor/a' : p.grupoNombre || 'Persona')} ${num}`;
    p.nombrePrueba = true;
  }
  return res;
}

// Festivos de todos los días del cuadrante. Con el año de 15 a 15 de enero hacen falta también los del 1 al 14 de enero
// del año siguiente: los de la fuente si ya están; si no, Año Nuevo y Reyes (pasados al lunes si caen en domingo).
function festivosCuadrante(cfgSede, delAnio) {
  const anio = Number(cfgSede.anio);
  if (!/^\d{2}-\d{2}$/.test(cfgSede.inicioCuadrante || '') || cfgSede.inicioCuadrante === '01-01') return delAnio;
  const sig = calcularFestivos(cfgSede.festivos, anio + 1, estado.descargas[`${claveFuente(cfgSede.festivos.fuente)}|${anio + 1}`]).lista;
  const fijos = [['01-01', 'Año Nuevo'], ['01-06', 'Epifanía del Señor']].map(([md, nombre]) => {
    let f = `${anio + 1}-${md}`;
    if (cfgSede.festivos.fuente && cfgSede.festivos.fuente.trasladarDomingos && new Date(`${f}T12:00:00Z`).getUTCDay() === 0) f = `${anio + 1}-${md.slice(0, 3)}${String(Number(md.slice(3)) + 1).padStart(2, '0')}`;
    return { fecha: f, nombre, origen: 'fuente', nota: 'del año siguiente' };
  });
  const enero = sig.filter(h => h.fecha < `${anio + 1}-02-01`);
  return [...delAnio, ...(enero.length ? enero : fijos)];
}

// Lo que recibe el motor: la sede con los festivos de todo el cuadrante y la plantilla real si está abierta. Lo usan
// regenerar() y la búsqueda de la mejora del reparto (js/mejorar.js), que tiene que partir exactamente de lo mismo.
export function entradaMotor(cfg = estado.cfg) {
  return {
    cfg: { ...cfg, festivos: festivosCuadrante(cfg, estado.festivos.lista) },
    plantilla: estado.plantilla ? estado.plantilla.personas.filter(p => p.sede === cfg.id) : null,
  };
}
export function regenerar() {
  const cfg = estado.cfg, anio = Number(cfg.anio);
  estado.festivos = calcularFestivos(cfg.festivos, anio, estado.descargas[`${claveFuente(cfg.festivos.fuente)}|${anio}`]);
  const e = entradaMotor(cfg);
  estado.res = nombrarPrueba(generar(e.cfg, { plantilla: e.plantilla }));
  pedirFestivos(cfg);
  oyentes.forEach(fn => fn());
}
// Cada cambio en los parámetros pasa por aquí: guarda el borrador y recalcula al momento.
// ── Deshacer y rehacer (como Sling o Deputy) ─────────────────────────────────
// Antes de cada cambio se guarda una foto de la configuración. Los cambios seguidos de un mismo campo (escribir en un
// cuadro) cuentan como uno solo si llegan con menos de 1 s entre ellos.
const historial = { atras: [], adelante: [], foto: '', ultimo: 0, max: 50 };
export function reiniciarHistorial() { historial.atras = []; historial.adelante = []; historial.foto = JSON.stringify(estado.todo); }
export const puedeDeshacer = () => historial.atras.length > 0;
export const puedeRehacer = () => historial.adelante.length > 0;
function apuntarHistorial(sinHistorial = false) {
  const ahora = JSON.stringify(estado.todo);
  // Cambios que hace la app sola (la mejora automática del reparto): se suman a la foto actual, sin paso propio de
  // deshacer; Ctrl+Z vuelve a antes del cambio de la persona.
  if (sinHistorial) { historial.foto = ahora; return; }
  if (!historial.foto) { historial.foto = ahora; return; }
  if (ahora === historial.foto) return;
  const t = Date.now();
  if (t - historial.ultimo > 1000 || !historial.atras.length) {
    historial.atras.push(historial.foto);
    if (historial.atras.length > historial.max) historial.atras.shift();
  }
  historial.ultimo = t; historial.adelante = []; historial.foto = ahora;
}
function irAFoto(de, a) {
  if (!de.length) return false;
  a.push(JSON.stringify(estado.todo));
  estado.todo = completar(JSON.parse(de.pop()));
  historial.foto = JSON.stringify(estado.todo); historial.ultimo = 0;
  try { localStorage.setItem(CLAVE_BORRADOR, historial.foto); } catch (e) { /* sin almacenamiento */ }
  regenerar();
  return true;
}
export const deshacer = () => irAFoto(historial.atras, historial.adelante);
export const rehacer = () => irAFoto(historial.adelante, historial.atras);

export function cambiado({ inmediato = false, sinHistorial = false } = {}) {
  apuntarHistorial(sinHistorial);
  try {
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(estado.todo)); localStorage.setItem(CLAVE_BORRADOR + '.base', estado.guardado || '');
    // La versión sobre la que se trabaja: si mientras tanto se guarda otra desde otro sitio, se juntan las dos.
    if (localStorage.getItem(CLAVE_BORRADOR + '.baseGuardado') !== (estado.guardado || '')) {
      localStorage.setItem(CLAVE_BORRADOR + '.baseJSON', estado.publicada || ''); localStorage.setItem(CLAVE_BORRADOR + '.baseGuardado', estado.guardado || '');
    }
  } catch (e) {}
  clearTimeout(temporizador);
  if (inmediato) regenerar();
  else temporizador = setTimeout(regenerar, 180);
  programarAutoguardado();
}

// Trae la versión más nueva del repositorio y pone encima lo cambiado aquí (fusión a tres bandas).
export async function juntarConRemota() {
  const r = await leerRemota();
  const remoto = completar(r.config), base = JSON.parse(estado.publicada);
  const sede = estado.sede;
  estado.todo = completar(fusionar(base, estado.todo, remoto));
  estado.publicada = JSON.stringify(remoto); estado.guardado = r.guardado;
  if (estado.todo.sedes.some(x => x.id === sede)) estado.sede = sede;
  historial.foto = JSON.stringify(estado.todo);
  regenerar();
}

// Guardado automático (versión de GitHub con la contraseña puesta): unos segundos después del último cambio, se guarda
// para todos solo. estado.auto: { estado: 'pendiente'|'guardando'|'hecho'|'error'|'conflicto', hora, error }.
let temporizadorAuto = null;
const avisarAuto = () => { if (typeof estado.alAutoguardar === 'function') estado.alAutoguardar(); };
export function programarAutoguardado(ms = 6000) {
  if (!DEMO || !estado.admin) return;
  if (estado.auto && estado.auto.estado === 'conflicto') return;
  clearTimeout(temporizadorAuto);
  estado.auto = { ...(estado.auto || {}), estado: 'pendiente' }; avisarAuto();
  temporizadorAuto = setTimeout(autoguardar, ms);
}
export async function autoguardar() {
  if (!DEMO || !estado.admin) return;
  if (!cambiosSinGuardar()) { estado.auto = { ...(estado.auto || {}), estado: estado.auto && estado.auto.hora ? 'hecho' : '' }; return avisarAuto(); }
  if (estado.auto && estado.auto.estado === 'guardando') return programarAutoguardado(3000);
  estado.auto = { ...(estado.auto || {}), estado: 'guardando' }; avisarAuto();
  let juntado = false;
  try {
    try { await guardarEnServidor(); }
    catch (e) {
      if (!e.nueva) throw e;
      // Hay una versión más nueva (guardada desde otro ordenador o por la sección): se juntan las dos y se guarda.
      await juntarConRemota(); juntado = true;
      await guardarEnServidor();
    }
    estado.auto = { estado: 'hecho', juntado, hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
    // Si se cambió algo mientras se guardaba, otra vuelta.
    if (cambiosSinGuardar()) programarAutoguardado(3000);
  } catch (e) {
    estado.auto = { estado: e.nueva ? 'conflicto' : 'error', error: e.message };
  }
  avisarAuto();
}

export async function entrar(clave, recordar = false) {
  if (DEMO) { await entrarConContrasena(clave, recordar); estado.admin = true; if (cambiosSinGuardar()) programarAutoguardado(1500); return; }
  const d = await api('entrar', { clave });
  estado.token = d.token; estado.admin = true; guardarSesion();
}
export function salirSesion() { if (DEMO) cerrarSesionGithub(); estado.token = ''; estado.admin = false; guardarSesion(); if (estado.plantilla) { estado.plantilla = null; regenerar(); } }

// Baja los festivos de la fuente de una sede para su año, una vez por sesión (el servidor guarda copia
// 7 días). Al llegar, se rehace el cuadrante. Si falla, se siguen usando los últimos guardados.
export async function pedirFestivos(cfg, refrescar = false) {
  const f = cfg.festivos.fuente, anio = Number(cfg.anio);
  if (!f || f.tipo === 'ninguna' || estado.servidor !== 'ok') return;
  const k = `${claveFuente(f)}|${anio}`;
  if (estado.descargas[k] && !refrescar) return;
  estado.descargas[k] = { pendiente: true };
  try {
    estado.descargas[k] = await api('festivos', { fuente: f, anio, refrescar });
  } catch (e) {
    estado.descargas[k] = { error: e.message };
  }
  if (cfg === estado.cfg) regenerar();
  // Con el año de 15 a 15 de enero, también los del año siguiente (del 1 al 14 de enero).
  if (cfg.inicioCuadrante && cfg.inicioCuadrante !== '01-01') pedirFestivos({ ...cfg, anio: anio + 1, inicioCuadrante: '01-01' }, refrescar).then(() => { if (cfg === estado.cfg) regenerar(); });
}

// Qué ha cambiado frente a la versión publicada, en una línea (va como nota de la versión en el servidor).
export function resumenCambios(antes = estado.publicada ? JSON.parse(estado.publicada) : null, ahora = estado.todo) {
  if (!antes) return 'Primera versión guardada.';
  const NOMBRES = { anio: 'año', titulo: 'título', festivos: 'festivos', turnos: 'turnos', contratos: 'contratos', especiales: 'casos especiales', grupos: 'grupos y patrones',
    minimos: 'mínimos', reglas: 'reglas', vacaciones: 'vacaciones', mejora: 'mejora del reparto' };
  const partes = [];
  for (const s of ahora.sedes) {
    const v = (antes.sedes || []).find(x => x.id === s.id) || {};
    // La copia de la última descarga de festivos (festivos.cache) no es un cambio de quien edita.
    const sinCache = (k, x) => (k === 'festivos' && x ? { ...x, cache: null } : x);
    const listas = Object.keys(NOMBRES).filter(k => JSON.stringify(sinCache(k, s[k]) ?? null) !== JSON.stringify(sinCache(k, v[k]) ?? null)).map(k => NOMBRES[k]);
    const ma = Object.keys(s.manuales || {}), mv = v.manuales || {};
    const nMan = ma.filter(k => mv[k] !== s.manuales[k]).length + Object.keys(mv).filter(k => !(k in (s.manuales || {}))).length;
    if (nMan) listas.push(`${nMan} ${nMan === 1 ? 'cambio' : 'cambios'} a mano`);
    if (listas.length) partes.push(`${s.nombre}: ${listas.join(', ')}`);
  }
  if (JSON.stringify(ahora.encuestas) !== JSON.stringify(antes.encuestas)) partes.push('encuestas');
  if ((ahora.escenarios || []).length !== (antes.escenarios || []).length) partes.push('escenarios');
  return partes.join(' · ') || 'Sin cambios en el cuadrante.';
}

// El resultado de una configuración de sede cualquiera (un escenario, una versión) sin tocar el estado.
export function resultadoDe(cfgSede) {
  const anio = Number(cfgSede.anio);
  const fest = calcularFestivos(cfgSede.festivos, anio, estado.descargas[`${claveFuente(cfgSede.festivos.fuente)}|${anio}`] || cfgSede.festivos.cache);
  const reales = estado.plantilla ? estado.plantilla.personas.filter(p => p.sede === cfgSede.id) : null;
  return nombrarPrueba(generar({ ...cfgSede, festivos: festivosCuadrante(cfgSede, fest.lista) }, { plantilla: reales }));
}

export async function guardarEnServidor() {
  // La última descarga de festivos de cada sede se guarda con la configuración: así funciona sin conexión.
  for (const sede of estado.todo.sedes) {
    const d = estado.descargas[`${claveFuente(sede.festivos.fuente)}|${Number(sede.anio)}`];
    if (d && Array.isArray(d.lista)) sede.festivos.cache = d;
  }
  const d = DEMO ? { guardado: await guardarGithub(estado.todo, resumenCambios(), estado.guardado) } : await api('guardar', { config: estado.todo, nota: resumenCambios() });
  estado.publicada = JSON.stringify(estado.todo);
  estado.guardado = d.guardado;
  borrarBorrador();
}
export function descartarCambios() {
  apuntarHistorial();
  historial.atras.push(historial.foto); historial.adelante = [];
  estado.todo = JSON.parse(estado.publicada);
  historial.foto = JSON.stringify(estado.todo);
  borrarBorrador();
  regenerar();
}

// ── Tema ────────────────────────────────────────────────────────────────────
export function temaLocal() { try { return localStorage.getItem('horarios.tema') || ''; } catch (e) { return ''; } }
// Las apariencias de Gestlogix: [clave, nombre, qué es, fondo (data-sf-theme), diseño (data-tema)].
export const APARIENCIAS = [
  ['day', 'Light', 'Blanco y gris muy claro.', 'day', ''],
  ['silver', 'Silver', 'Gris perla con las tarjetas blancas flotando.', 'day', 'silver'],
  ['bm', 'Blue Manager', 'Menú azul marino en degradado y botones en relieve.', 'day', 'bm'],
  ['midnight', 'Dark Blue', 'Oscuro, con un punto azul.', 'midnight', ''],
  ['night', 'Black', 'Gris casi negro, neutro, sin color.', 'night', ''],
];
export function ponerTema(t, guardarLocal = true) {
  const a = APARIENCIAS.find(x => x[0] === t) || APARIENCIAS[0], raiz = document.documentElement;
  raiz.setAttribute('data-sf-theme', a[3]);
  if (a[4]) raiz.dataset.tema = a[4]; else delete raiz.dataset.tema;
  raiz.dataset.apariencia = a[0];
  if (guardarLocal) try { localStorage.setItem('horarios.tema', a[0]); } catch (e) { /* sin almacenamiento */ }
}
// El menú plegado a solo iconos, como el raíl de Gestlogix. Se recuerda en este navegador.
export function ponerMenuCorto(corto, guardar = true) {
  if (corto) document.documentElement.dataset.menu = 'corto'; else delete document.documentElement.dataset.menu;
  const b = document.getElementById('plegar-menu');
  if (b) { b.textContent = corto ? '»' : '«'; b.setAttribute('aria-label', corto ? 'Desplegar el menú' : 'Plegar el menú'); b.setAttribute('aria-expanded', String(!corto)); }
  if (guardar) try { localStorage.setItem('horarios.menu.corto', corto ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
}
function aplicarTemaPorDefecto() { if (!temaLocal() && estado.todo.tema) ponerTema(estado.todo.tema, false); }

export function descargar(nombre, texto, tipo = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
