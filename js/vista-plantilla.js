// Vista Plantilla: las personas reales (nombre, colectivo, sede, turno actual, exención de noches y jornada), solo
// para administración. Se cifran en este navegador con una frase de paso; el servidor solo guarda el texto cifrado.
import { estado, esc, $, api, avisar, confirmar, regenerar, descargar } from './nucleo.js';
import { cifrar, descifrar, leerCsvPlantilla, CABECERA_PLANTILLA } from './plantilla.js';

const u = () => (estado.ui.plantilla ||= { buscar: '', sede: 'todas', colectivo: 'todos' });
let frase = '';            // solo en memoria de esta pestaña
let sobre = undefined;     // undefined = sin consultar; null = no hay plantilla en el servidor
let cambiada = false;

async function cargarSobre(repintar) {
  try { sobre = (await api('plantilla')).sobre || null; } catch (e) { sobre = null; avisar(`No se ha podido consultar la plantilla. ${esc(e.message)}`, 'mal', 0); }
  repintar();
}
const aplicar = () => { regenerar(); };

export function pintarPlantilla(raiz, repintar) {
  const sedes = estado.todo.sedes;
  if (!estado.admin) {
    raiz.innerHTML = `<div class="cabecera"><div><h1>Plantilla</h1><p>Las personas reales con sus nombres. Solo para administración.</p></div></div>
      <div class="panel"><p>Para verla, entra en Ajustes con la clave de administración.</p><button type="button" class="btn primario" data-ir="ajustes">Ir a Ajustes</button></div>`;
    return;
  }
  if (sobre === undefined && !estado.plantilla) { raiz.innerHTML = '<p class="tenue">Consultando la plantilla…</p>'; cargarSobre(repintar); return; }
  if (!estado.plantilla) {
    raiz.innerHTML = `<div class="cabecera"><div><h1>Plantilla</h1><p>Las personas reales, cifradas: el servidor solo guarda texto ilegible y los nombres se descifran en este navegador con la frase de paso.</p></div></div>
      <section class="panel" style="max-width:640px">
      ${sobre ? `<h2>Abrir la plantilla</h2><p class="tenue">Guardada el ${esc(new Date(sobre.fecha).toLocaleString('es-ES'))}.</p>
        <form class="fila-acciones" id="pl-abrir"><label class="oculto" for="pl-frase">Frase de paso</label><input type="password" id="pl-frase" placeholder="Frase de paso" autocomplete="off" required style="flex:1;min-width:220px"><button type="submit" class="btn primario">Abrir</button></form>`
      : `<h2>Crear la plantilla</h2><p class="tenue">Elige una frase de paso larga (12 caracteres o más) y guárdala en tu gestor de contraseñas. <b>Si se pierde, los nombres no se pueden recuperar</b>: habría que volver a importarlos.</p>
        <form class="campos" id="pl-crear"><label class="campo"><span>Frase de paso</span><input type="password" id="pl-f1" minlength="12" required autocomplete="new-password"></label>
          <label class="campo"><span>Repítela</span><input type="password" id="pl-f2" minlength="12" required autocomplete="new-password"></label><button type="submit" class="btn primario">Crear</button></form>`}
      </section>`;
    return;
  }
  const P = estado.plantilla.personas, f = u(), q = f.buscar.trim().toLowerCase();
  const codigos = new Map((estado.res.personas || []).filter(p => p.nombre).map(p => [p.nombre + '|' + estado.cfg.id + '|' + p.colectivo, p.id]));
  const lista = P.map((p, i) => ({ ...p, i })).filter(p => (f.sede === 'todas' || p.sede === f.sede) && (f.colectivo === 'todos' || p.colectivo === f.colectivo) && (!q || p.nombre.toLowerCase().includes(q) || (p.turnoActual || '').toLowerCase().includes(q)));
  const cuenta = (s, c) => P.filter(p => p.sede === s && p.colectivo === c).length;
  raiz.innerHTML = `<div class="cabecera"><div><h1>Plantilla real</h1><p>Abierta en esta pestaña. Con la plantilla abierta, el cuadrante, los informes y los PDF llevan los nombres; para el resto de la gente todo sigue anónimo.</p></div>
    <div class="fila-acciones" style="margin:0">
      <label class="btn" for="pl-importar">Importar CSV</label><input type="file" id="pl-importar" accept=".csv,text/csv,.txt" class="oculto">
      <button type="button" class="btn" data-pl="modelo">Plantilla CSV</button>
      <button type="button" class="btn" data-pl="exportar">Exportar CSV</button>
      <button type="button" class="btn primario" data-pl="guardar" ${cambiada ? '' : 'disabled'}>Guardar cifrada</button>
      <button type="button" class="btn" data-pl="cerrar">Cerrar</button></div></div>
    ${cambiada ? '<p class="banda aviso">Hay cambios en la plantilla sin guardar en el servidor.</p>' : ''}
    <div class="cifras">${sedes.map(s => `<div class="cifra"><b>${cuenta(s.id, 'TA') + cuenta(s.id, 'SUP')}</b><span>${esc(s.nombre)}: ${cuenta(s.id, 'TA')} teleasistentes y ${cuenta(s.id, 'SUP')} supervisores</span></div>`).join('')}
      <div class="cifra"><b>${P.filter(p => p.exentoNoches).length}</b><span>exentas de noches</span></div>
      <div class="cifra"><b>${P.filter(p => p.horasSemana < 35).length}</b><span>con jornada reducida</span></div></div>
    <div class="herramientas">
      <div class="grupo"><input type="text" id="pl-buscar" placeholder="Buscar nombre o turno" value="${esc(f.buscar)}" aria-label="Buscar" style="width:220px">
        <select id="pl-sede" aria-label="Sede"><option value="todas">Todas las sedes</option>${sedes.map(s => `<option value="${s.id}" ${f.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
        <select id="pl-col" aria-label="Colectivo"><option value="todos">Todos</option><option value="TA" ${f.colectivo === 'TA' ? 'selected' : ''}>Teleasistentes</option><option value="SUP" ${f.colectivo === 'SUP' ? 'selected' : ''}>Supervisores</option></select></div>
      <button type="button" class="btn" data-pl="anadir">Añadir persona</button>
    </div>
    <div class="tabla-caja"><table class="tabla-lista"><thead><tr><th scope="col">Código en ${esc(estado.cfg.nombre)}</th><th scope="col">Nombre</th><th scope="col">Colectivo</th><th scope="col">Sede</th><th scope="col">Turno actual</th><th scope="col">Exenta de noches</th><th scope="col" class="num">Horas/semana</th><th scope="col"></th></tr></thead><tbody>
      ${lista.map(p => `<tr><td class="tenue">${esc(codigos.get(p.nombre + '|' + p.sede + '|' + p.colectivo) || '—')}</td>
        <td><input type="text" data-pl-i="${p.i}" data-k="nombre" value="${esc(p.nombre)}" aria-label="Nombre" style="width:100%"></td>
        <td><select data-pl-i="${p.i}" data-k="colectivo" aria-label="Colectivo"><option value="TA" ${p.colectivo === 'TA' ? 'selected' : ''}>Teleasistencia</option><option value="SUP" ${p.colectivo === 'SUP' ? 'selected' : ''}>Supervisión</option></select></td>
        <td><select data-pl-i="${p.i}" data-k="sede" aria-label="Sede">${sedes.map(s => `<option value="${s.id}" ${p.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></td>
        <td><input type="text" data-pl-i="${p.i}" data-k="turnoActual" value="${esc(p.turnoActual || '')}" aria-label="Turno actual" style="width:110px"></td>
        <td><input type="checkbox" data-pl-i="${p.i}" data-k="exentoNoches" ${p.exentoNoches ? 'checked' : ''} aria-label="Exenta de noches"></td>
        <td class="num"><input type="number" min="5" max="40" step="0.5" data-pl-i="${p.i}" data-k="horasSemana" value="${esc(p.horasSemana || 35)}" aria-label="Horas semanales" style="width:80px"></td>
        <td class="num"><button type="button" class="btn mini peligro" data-pl="quitar" data-i="${p.i}">Quitar</button></td></tr>`).join('') || '<tr><td colspan="8">Sin personas. Importa un CSV o añade a mano.</td></tr>'}
    </tbody></table></div>
    <p class="tenue" style="margin-top:8px">Los códigos (TA 001…) siguen el orden de la plantilla dentro de cada sede y colectivo: si cambias el orden o quitas personas, cambian. Las solicitudes de vacaciones van por código.</p>`;
}

export function eventosPlantilla(raiz, repintar) {
  raiz.addEventListener('submit', async (e) => {
    if (estado.vista !== 'plantilla') return;
    e.preventDefault();
    if (e.target.id === 'pl-abrir') {
      const f = $('#pl-frase').value;
      try { estado.plantilla = await descifrar(sobre, f); frase = f; cambiada = false; aplicar(); avisar('Plantilla abierta en esta pestaña.', 'bien'); repintar(); }
      catch (err) { avisar(`${esc(err.message)} Revísala y vuelve a escribirla.`, 'mal', 0); $('#pl-frase').select(); }
    }
    if (e.target.id === 'pl-crear') {
      const a = $('#pl-f1').value, b = $('#pl-f2').value;
      if (a.length < 12) return avisar('La frase de paso es demasiado corta: usa 12 caracteres o más.', 'mal');
      if (a !== b) return avisar('Las dos frases no coinciden. Escríbelas otra vez.', 'mal');
      frase = a; estado.plantilla = { personas: [] }; cambiada = true; repintar();
    }
  });
  raiz.addEventListener('change', async (e) => {
    if (estado.vista !== 'plantilla') return;
    const el = e.target, f = u();
    if (el.dataset.plI != null) {
      const p = estado.plantilla.personas[Number(el.dataset.plI)], k = el.dataset.k;
      p[k] = el.type === 'checkbox' ? el.checked : k === 'horasSemana' ? Number(el.value) || 35 : el.value.trim();
      cambiada = true; aplicar(); repintar(); return;
    }
    if (el.id === 'pl-sede') { f.sede = el.value; repintar(); }
    if (el.id === 'pl-col') { f.colectivo = el.value; repintar(); }
    if (el.id === 'pl-importar' && el.files[0]) {
      try {
        const { personas, errores } = leerCsvPlantilla(await el.files[0].text(), estado.todo.sedes);
        if (!personas.length) throw new Error('no hay ninguna persona con nombre');
        const sustituir = !estado.plantilla.personas.length || await confirmar('¿Sustituir la plantilla?', `El fichero trae ${personas.length} personas. Se sustituye la plantilla abierta (${estado.plantilla.personas.length} personas). Hasta que guardes, no cambia nada en el servidor.`, 'Sustituir', 'primario');
        if (!sustituir) { el.value = ''; return; }
        estado.plantilla.personas = personas; cambiada = true; aplicar();
        avisar(`Importadas ${personas.length} personas.${errores.length ? ` ${errores.length} filas no se han podido leer: ${esc(errores.slice(0, 3).join('; '))}.` : ''} Pulsa «Guardar cifrada» para guardarlas.`, errores.length ? '' : 'bien', 0);
        repintar();
      } catch (err) { avisar(`No se ha podido importar: ${esc(err.message)}. Usa la plantilla CSV.`, 'mal', 0); }
      el.value = '';
    }
  });
  let t = 0;
  raiz.addEventListener('input', (e) => {
    if (estado.vista !== 'plantilla' || e.target.id !== 'pl-buscar') return;
    clearTimeout(t); t = setTimeout(() => { u().buscar = e.target.value; repintar(); const i = $('#pl-buscar'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
  });
  raiz.addEventListener('click', async (e) => {
    if (estado.vista !== 'plantilla') return;
    const b = e.target.closest('button[data-pl]'); if (!b) return;
    const a = b.dataset.pl, P = estado.plantilla?.personas;
    if (a === 'modelo') {
      const s = estado.todo.sedes;
      descargar('plantilla-personas.csv', '﻿' + [CABECERA_PLANTILLA, ['Nombre Apellido Apellido', 'teleasistencia', s[0].nombre, 'Rotatorio', 'no', '35', '', '', 'no', '', '', ''], ['Otro Nombre', 'supervisión', s[1]?.nombre || s[0].nombre, 'M1', 'sí', '25', 'Reducida 25 h', 'mañana', 'sí', 'X', '2027-03-01', '']].map(f => f.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    } else if (a === 'exportar') {
      if (!(await confirmar('¿Exportar con nombres?', 'El fichero sale sin cifrar y con datos personales. Guárdalo en un sitio seguro y no lo subas a ningún sitio compartido.', 'Exportar', 'primario'))) return;
      descargar('plantilla-personas.csv', '﻿' + [CABECERA_PLANTILLA, ...P.map(p => [p.nombre, p.colectivo === 'SUP' ? 'supervisión' : 'teleasistencia', (estado.todo.sedes.find(s => s.id === p.sede) || {}).nombre || p.sede, p.turnoActual || '', p.exentoNoches ? 'sí' : 'no', p.horasSemana || 35,
        p.contrato || '', p.franjas || '', p.sinFindes ? 'sí' : '', (p.diasLibres || []).map(d => 'LMXJVSD'[d]).join(','), p.alta || '', p.baja || ''])].map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    } else if (a === 'guardar') {
      b.disabled = true; b.textContent = 'Cifrando…';
      try { await api('guardar-plantilla', { sobre: await cifrar(estado.plantilla, frase) }); sobre = undefined; cambiada = false; avisar('Plantilla cifrada y guardada en el servidor.', 'bien'); }
      catch (err) { avisar(`No se ha guardado. ${esc(err.message)}`, 'mal', 0); }
      repintar();
    } else if (a === 'cerrar') {
      if (cambiada && !(await confirmar('¿Cerrar sin guardar?', 'Hay cambios sin guardar en el servidor y se perderán.', 'Cerrar sin guardar'))) return;
      estado.plantilla = null; frase = ''; cambiada = false; sobre = undefined; aplicar(); repintar();
    } else if (a === 'anadir') {
      P.push({ nombre: 'Nueva persona', colectivo: u().colectivo === 'SUP' ? 'SUP' : 'TA', sede: u().sede !== 'todas' ? u().sede : estado.cfg.id, turnoActual: '', exentoNoches: false, horasSemana: 35 });
      cambiada = true; aplicar(); repintar();
    } else if (a === 'quitar') {
      P.splice(Number(b.dataset.i), 1); cambiada = true; aplicar(); repintar();
    }
  });
}
