// Pone la apariencia y el menú antes de pintar, para que no parpadeen (como estatico/tema.js de Gestlogix).
// Cada apariencia es un fondo de color (data-sf-theme) y, si hace falta, un diseño encima (data-tema). La misma
// tabla está en js/nucleo.js (APARIENCIAS). La de cada navegador va en localStorage; la de todos, en el servidor.
(function () {
  var MAPA = { day: ['day', ''], silver: ['day', 'silver'], bm: ['day', 'bm'], midnight: ['midnight', ''], night: ['night', ''] };
  var raiz = document.documentElement, t = null, corto = false;
  try { t = localStorage.getItem('horarios.tema'); corto = localStorage.getItem('horarios.menu.corto') === '1'; } catch (e) { /* sin almacenamiento */ }
  if (t && MAPA[t]) {
    raiz.setAttribute('data-sf-theme', MAPA[t][0]);
    if (MAPA[t][1]) raiz.setAttribute('data-tema', MAPA[t][1]);
    raiz.setAttribute('data-apariencia', t);
  }
  if (corto) raiz.setAttribute('data-menu', 'corto');
})();
