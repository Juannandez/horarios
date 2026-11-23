// «Mejorar reparto»: lanza la búsqueda en un Web Worker (js/mejora-worker.js) con la misma entrada que regenerar()
// y guarda en la sede la lista de intercambios encontrada (cfg.mejora). Con ella el motor rehace el mismo resultado
// al momento, y Deshacer (Ctrl+Z) la quita. Si el navegador no deja usar Workers, se busca en la página, más corto.
import { estado, cambiado, modal, avisar, esc, fmtNum } from './nucleo.js';
import { generar } from './motor.js';

const entrada = () => {
  const cfg = estado.cfg;
  return {
    cfg: JSON.parse(JSON.stringify({ ...cfg, festivos: estado.festivos.lista })),
    plantilla: estado.plantilla ? estado.plantilla.personas.filter(p => p.sede === cfg.id) : null,
  };
};

function buscar(ms, semilla, alProgreso) {
  const { cfg, plantilla } = entrada();
  return new Promise((ok, mal) => {
    let w;
    try { w = new Worker(new URL('./mejora-worker.js', import.meta.url), { type: 'module' }); }
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
  const cfg = estado.cfg, segundos = 4;
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
    cfg.mejora = { intercambios: r.intercambios, semilla, coste0: antes, coste: r.coste, fecha: new Date().toISOString().slice(0, 10) };
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
  delete estado.cfg.mejora;
  cambiado({ inmediato: true });
  avisar('Quitada la mejora del reparto: el cuadrante vuelve a salir del ciclo y el ajuste. Ctrl+Z la recupera.', '', 6000);
}
