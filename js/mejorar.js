// «Mejorar reparto»: lanza la búsqueda en un Web Worker (js/mejora-worker.js) con la misma entrada que regenerar()
// y guarda en la sede la lista de intercambios encontrada (cfg.mejora). Con ella el motor rehace el mismo resultado
// al momento, y Deshacer (Ctrl+Z) la quita. Si el navegador no deja usar Workers, se busca en la página, más corto.
import { estado, cambiado, modal, avisar, esc, fmtNum, entradaMotor } from './nucleo.js';
import { generar } from './motor.js';

// La misma entrada que regenerar() (festivos de todo el cuadrante, también los de enero del año siguiente): si no,
// los intercambios encontrados no se pueden repetir luego en la página y se saltan.
const entrada = () => { const e = entradaMotor(); return { cfg: JSON.parse(JSON.stringify(e.cfg)), plantilla: e.plantilla }; };

function buscar(ms, semilla, alProgreso, alLanzar) {
  const { cfg, plantilla } = entrada();
  return new Promise((ok, mal) => {
    let w;
    try { w = new Worker(new URL('./mejora-worker.js', import.meta.url), { type: 'module' }); if (alLanzar) alLanzar(() => { w.terminate(); mal(Object.assign(new Error('cancelada'), { cancelada: true })); }); }
    catch (e) {
      // Sin Worker: en la propia página, con menos tiempo.
      try {
        const res = generar(cfg, { plantilla, buscarMejora: { ms: Math.min(ms, 1500), semilla } });
        return ok({ intercambios: res.mejora.intercambiosNuevos, coste0: res.mejora.coste0, coste: res.mejora.coste, buscados: res.mejora.buscados });
      } catch (err) { return mal(err); }
    }
    w.onmessage = (e) => {
      if (e.data.tipo === 'progreso') { alProgreso && alProgreso(e.data); return; }
      w.terminate();
      if (e.data.tipo === 'fin') ok(e.data); else mal(new Error(e.data.mensaje || 'error en la búsqueda'));
    };
    w.onerror = (e) => { w.terminate(); mal(new Error(e.message || 'no se ha podido lanzar la búsqueda')); };
    w.postMessage({ cfg, plantilla, ms, semilla });
  });
}

export async function mejorarReparto() {
  cancelarAuto();
  const cfg = estado.cfg, segundos = 6;
  const semilla = ((cfg.mejora && cfg.mejora.semilla) || 0) + 1;
  let cerrar = () => {};
  const espera = modal({
    titulo: 'Mejorando el reparto…',
    html: `<p>Se prueban intercambios de semanas enteras entre personas del mismo grupo: cada día queda con la misma gente en cada franja y cada persona con las mismas horas. Solo se acepta un intercambio si no rompe ninguna regla y reparte mejor los fines de semana, los festivos y los domingos.</p>
      <div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso"><div id="mejora-barra"></div></div>
      <p class="tenue" id="mejora-texto">Empezando…</p>`,
    botones: [],
    alAbrir: (velo, c) => { cerrar = c; },
  });
  const t0 = Date.now();
  const tic = setInterval(() => {
    const p = Math.min(100, Math.round((Date.now() - t0) / (segundos * 10)));
    const b = document.getElementById('mejora-barra'); if (b) b.style.width = `${p}%`;
  }, 100);
  try {
    const r = await buscar(segundos * 1000, semilla, (x) => {
      const t = document.getElementById('mejora-texto');
      if (t) t.textContent = `${fmtNum(x.it)} intercambios probados · desequilibrio ${fmtNum(Math.round(x.coste0))} → ${fmtNum(Math.round(x.coste))}`;
    });
    clearInterval(tic); cerrar(null); await espera;
    const antes = cfg.mejora && cfg.mejora.coste0 != null ? cfg.mejora.coste0 : r.coste0;
    if (!r.intercambios.length || r.coste >= r.coste0 - 1e-9) {
      avisar('No se ha encontrado ninguna mejora más sin romper reglas. El reparto ya está equilibrado para estas reglas y este patrón.', '', 6000);
      return false;
    }
    cfg.mejora = { intercambios: r.intercambios, semilla, coste0: antes, coste: r.coste, fecha: new Date().toISOString().slice(0, 10), base: huella(cfg) };
    cambiado({ inmediato: true });
    const pct = antes > 0 ? Math.round(100 * (1 - r.coste / antes)) : 0;
    avisar(`Reparto mejorado: el desequilibrio de fines de semana, festivos y domingos baja un ${pct} % (${fmtNum(Math.round(antes))} → ${fmtNum(Math.round(r.coste))}) con ${fmtNum(r.intercambios.length)} intercambios de semanas. La cobertura y las horas no cambian. Ctrl+Z lo deshace.`, 'bien', 9000);
    return true;
  } catch (err) {
    clearInterval(tic); cerrar(null);
    avisar(`No se ha podido mejorar el reparto. ${esc(err.message)}`, 'mal', 0);
    return false;
  }
}

export function quitarMejora() {
  if (!estado.cfg.mejora) return;
  cancelarAuto();
  delete estado.cfg.mejora;
  estado.cfg.mejoraAuto = false;   // si no, se volvería a buscar sola al momento
  cambiado({ inmediato: true });
  avisar('Quitada la mejora del reparto y apagada la mejora automática: el cuadrante vuelve a salir del ciclo y el ajuste. Ctrl+Z la recupera.', '', 7000);
}

// ── Mejora automática ────────────────────────────────────────────────────────────────────────────────────────────
// Cada vez que se calcula el horario, si la configuración ha cambiado desde la última búsqueda, se busca en segundo
// plano (sin ventana) unos segundos después del último cambio y se guardan los intercambios. La huella de la
// configuración (sin la propia mejora) queda en cfg.mejora.base: con la misma configuración no se vuelve a buscar, así
// que el cuadrante no cambia solo al abrir la app. Solo con permiso para guardar y sin la plantilla real abierta (los
// datos reales cambian el resultado y cada ordenador buscaría el suyo).
export function huella(cfg) {
  const { mejora, ...resto } = cfg;
  const s = JSON.stringify(resto);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}
const autoActiva = (cfg) => cfg.mejoraAuto !== false;
let temporizadorAuto = null, cancelar = null;
const avisarEstado = () => { if (typeof estado.alMejoraAuto === 'function') estado.alMejoraAuto(); };
function cancelarAuto() {
  clearTimeout(temporizadorAuto);
  if (cancelar) { cancelar(); cancelar = null; }
  if (estado.mejoraAuto && estado.mejoraAuto.estado === 'buscando') { estado.mejoraAuto = { estado: '' }; avisarEstado(); }
}
export function programarMejoraAuto(ms = 1500) {
  const cfg = estado.cfg;
  if (!cfg || !autoActiva(cfg) || !estado.admin || estado.plantilla) return;
  const h = huella(cfg);
  if (cfg.mejora && cfg.mejora.base === h) return;
  if (estado.mejoraAuto && estado.mejoraAuto.estado === 'buscando' && estado.mejoraAuto.huella === h) return;
  cancelarAuto();
  temporizadorAuto = setTimeout(() => lanzarAuto(h), ms);
}
async function lanzarAuto(h) {
  const cfg = estado.cfg;
  if (huella(cfg) !== h) return;
  const semilla = ((cfg.mejora && cfg.mejora.semilla) || 0) + 1;
  estado.mejoraAuto = { estado: 'buscando', huella: h }; avisarEstado();
  let r;
  try { r = await buscar(4000, semilla, null, (c) => { cancelar = c; }); }
  catch (e) { cancelar = null; if (!e.cancelada) { estado.mejoraAuto = { estado: 'error', error: e.message }; avisarEstado(); } return; }
  cancelar = null;
  // Si mientras tanto se ha cambiado algo (o de sede), no vale: ya se habrá programado otra búsqueda.
  if (estado.cfg !== cfg || huella(cfg) !== h) { estado.mejoraAuto = { estado: '' }; return avisarEstado(); }
  const antes = cfg.mejora && cfg.mejora.coste0 != null && cfg.mejora.intercambios && cfg.mejora.intercambios.length ? cfg.mejora.coste0 : r.coste0;
  const mejora = r.intercambios.length && r.coste < r.coste0 - 1e-9;
  cfg.mejora = mejora
    ? { intercambios: r.intercambios, semilla, coste0: antes, coste: r.coste, fecha: new Date().toISOString().slice(0, 10), base: h, auto: true }
    : { ...(cfg.mejora || { intercambios: [] }), semilla, base: h, auto: true };
  estado.mejoraAuto = { estado: 'hecho', coste0: antes, coste: mejora ? r.coste : r.coste0, intercambios: cfg.mejora.intercambios.length };
  cambiado({ inmediato: true, sinHistorial: true });
}
