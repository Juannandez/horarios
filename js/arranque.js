// Vigila el arranque de la app. Si a los 12 s no ha pintado nada (un script que no llega, un error de JavaScript, una
// red que corta las peticiones), cambia «Cargando el cuadrante…» por un aviso que explica qué pasa y qué probar.
// Es un script clásico (no módulo): funciona aunque falle la carga de los módulos. Sin código en línea, por la CSP.
(function () {
  var fallos = [];
  var nombre = function (url) { try { return new URL(url, location.href).pathname.replace(/^.*\/horarios\//, ''); } catch (e) { return String(url || ''); } };
  // Fase de captura: así llegan también los errores de carga de <script>, <link> y módulos importados.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) fallos.push('No ha llegado ' + nombre(t.src || t.href) + '.');
    else if (e.message) fallos.push(e.message + (e.filename ? ' (' + nombre(e.filename) + ')' : ''));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason; fallos.push((r && r.message) || String(r));
  });

  function aviso() {
    if (window.horariosListo) return;
    var main = document.getElementById('principal');
    if (!main) return;
    var p = function (texto, clase) { var x = document.createElement('p'); if (clase) x.className = clase; x.textContent = texto; return x; };
    var sec = document.createElement('section'); sec.className = 'panel';
    var h = document.createElement('h2'); h.textContent = 'No se ha podido cargar la app';
    sec.appendChild(h);
    sec.appendChild(p('La página ha llegado, pero alguna parte de la app no se ha cargado o no ha arrancado.'));
    if (fallos.length) sec.appendChild(p('Detalle: ' + fallos.slice(0, 3).join(' · '), 'tenue'));
    var ul = document.createElement('ul');
    [
      'Si estás en la red del trabajo (Junta de Andalucía), el filtro de la red (Zscaler) puede estar bloqueando esta web. Pruébala desde el móvil con datos o desde casa. Si allí carga, pide a informática (CAU) que permitan sat.gestlogix.com.',
      'Si acabamos de publicar una versión nueva, el navegador puede tener ficheros a medias: recarga con Ctrl+F5 (en el Mac, Cmd+Mayús+R).',
      'Si sigue sin cargar, prueba con otro navegador.'
    ].forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    sec.appendChild(ul);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn primario'; b.textContent = 'Reintentar';
    b.addEventListener('click', function () { location.reload(); });
    var fila = document.createElement('div'); fila.className = 'fila-acciones'; fila.appendChild(b);
    sec.appendChild(fila);
    main.replaceChildren(sec);
  }
  setTimeout(aviso, 12000);
})();
