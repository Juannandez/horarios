// Busca la mejora del reparto en segundo plano (Web Worker), para no parar la página: ejecuta el motor con
// «buscarMejora» y devuelve la lista de intercambios de semanas. La página la guarda en la configuración.
import { generar } from './motor.js';

self.onmessage = (e) => {
  const { cfg, plantilla, ms, semilla } = e.data;
  try {
    const res = generar(cfg, { plantilla, buscarMejora: { ms, semilla, alProgreso: (x) => self.postMessage({ tipo: 'progreso', ...x }) } });
    self.postMessage({ tipo: 'fin', intercambios: res.mejora.intercambiosNuevos, coste0: res.mejora.coste0, coste: res.mejora.coste, buscados: res.mejora.buscados });
  } catch (err) {
    self.postMessage({ tipo: 'error', mensaje: err.message });
  }
};
