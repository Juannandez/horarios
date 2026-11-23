import { CONTRATOS } from './contratos.js';
// Valores de partida de la app. Salen de lo que ya hay en docs/fuentes-cgt:
// - horarios y códigos: leyenda-codigos.md y horarios-sevilla-2027.md (NOMENCLATURAS 2027);
// - plantilla por grupos: cuadrante de Sevilla 2027 (teleasistentes) y de supervisores 2027;
// - mínimos: Anexo 2 "Mínimos SAT 2013" de Sevilla (calculo-minimos.md, cobertura-pg.md);
// - reglas: líneas rojas del plan de trabajo (14 noches, 1 de cada 3 fines de semana, 1.480,5 h, ratio 1:16).
// Todo es editable desde la página Parámetros. Las personas son anónimas: solo códigos (TA 001, SUP 01).

const S = (txt) => txt.trim().split(/\s+/);

// ── Turno rotatorio común para toda la plantilla (teleasistencia y supervisión) ──────────────────
// Ciclo de 26 semanas; cada fila es una semana de lunes a domingo. Cumple, comprobado con un script:
// - noches en bloques 2-2-3 (lunes-martes, miércoles-jueves, viernes-domingo): 7 por ciclo, 14 al año;
// - tras las noches, 5, 3 y 7 días sin turno (práctica actual: 3 o 5);
// - nunca más de 5 días seguidos ni un cambio de turno sin 12 h de descanso;
// - 8 fines de semana por ciclo (16 al año), siempre en el turno de su semana;
// - unos 4,3 días de trabajo por semana: 1.600 h al año antes de vacaciones y ajustes.
const SEMANA = {
  M5: 'RM1 RM1 RM1 RM1 RM1 L L',  T5: 'RT1 RT1 RT1 RT1 RT1 L L',  T4: 'L RT1 RT1 RT1 RT1 L L',
  Mw: 'L L RM1 RM1 RM1 RM1 RM1',  Tw: 'L L RT1 RT1 RT1 RT1 RT1',
  NA: 'N N L L L L L',            NB: 'L L N N L L L',            NC: 'L L L L N N N',  OFF: 'L L L L L L L',
};
const ROTATORIO_COMUN = 'M5 T5 Mw T4 M5 NA T5 Tw T4 M5 Mw NB M5 Tw T4 M5 Mw T4 NC OFF T5 Tw T4 M5 Mw T4'
  .split(' ').flatMap(w => S(SEMANA[w]));

const VAC = () => ({ activo: true, dias: 30, desde: '06-01', hasta: '09-30' });

// Vacaciones estivales por periodos (correo de Procesos horarios de Sevilla para 2027): 11 periodos de 17 días
// hábiles; 24 plazas de teleasistencia por periodo (M-R-P 17, C 2, T 4, 9M 1). Las de supervisión no vienen en el
// correo: 3 por periodo es orientativo. Los 5 días que faltan hasta los 22 se piden sueltos y no van en el cuadrante.
const vacacionesPeriodos = (plazasTA, plazasSUP, nota) => ({
  modo: 'periodos', diasHabiles: 17, diasSueltos: 5, horasDia: 7, semilla: 'estival-2027', nota,
  periodos: [
    ['2027-06-21', '2027-07-13'], ['2027-06-28', '2027-07-20'], ['2027-07-05', '2027-07-27'], ['2027-07-12', '2027-08-03'],
    ['2027-07-19', '2027-08-10'], ['2027-07-26', '2027-08-18'], ['2027-08-02', '2027-08-25'], ['2027-08-09', '2027-09-01'],
    ['2027-08-16', '2027-09-08'], ['2027-08-23', '2027-09-14'], ['2027-08-30', '2027-09-21'],
  ].map(([inicio, fin], i) => ({ n: i + 1, inicio, fin, plazas: { TA: plazasTA, SUP: plazasSUP } })),
  solicitudes: {},   // { 'TA 001': { periodo: 3 | 'fuera', dias: 17, ajuste: 'final', inicio, fin, exento, igualdad, pareja } }
});
const TODAS = ['manana', 'tarde', 'noche'];

// Turnos que no son de trabajo: existen en todas las sedes y no se pueden quitar.
const LIBRES = () => [
  { codigo: 'L',  nombre: 'Libre',            inicio: '', fin: '', franja: 'libre', color: '#FFFFFF', disponible: true,  fijo: true },
  { codigo: 'V',  nombre: 'Vacaciones',       inicio: '', fin: '', franja: 'libre', color: '#7FC07C', disponible: false, fijo: true },
  { codigo: 'D',  nombre: 'Descanso por exceso de jornada', inicio: '', fin: '', franja: 'libre', color: '#DCE8EE', disponible: false, fijo: true },
  { codigo: 'SN', nombre: 'Saliente de noche', inicio: '', fin: '', franja: 'libre', color: '#C9D3E8', disponible: false, fijo: true },
  { codigo: 'B',  nombre: 'Baja o ausencia', inicio: '', fin: '', franja: 'libre', color: '#E8C9C9', disponible: false, fijo: true },
  { codigo: 'BO', nombre: 'Día de bolsa de horas', inicio: '', fin: '', franja: 'libre', color: '#D9E7C6', disponible: false, fijo: true },
  { codigo: 'AP', nombre: 'Asunto propio', inicio: '', fin: '', franja: 'libre', color: '#E6D8F0', disponible: false, fijo: true },
  { codigo: 'VS', nombre: 'Día suelto de vacaciones', inicio: '', fin: '', franja: 'libre', color: '#B9DDB6', disponible: false, fijo: true },
];

// Nivel de cada regla (como Quinyx y Skello): «bloquea» (el ajuste nunca la incumple y no se deja romper a mano),
// «avisa» (el ajuste la respeta si puede; a mano se permite con aviso) o «informe» (el ajuste no la tiene en cuenta).
export const NIVEL_DEFECTO = {
  descanso: 'bloquea', maxSeguidos: 'bloquea', maxNoches: 'bloquea', maxNochesSeguidas: 'bloquea', descansoTrasNoche: 'bloquea',
  bloquesNoche: 'bloquea', tope: 'bloquea', ratio: 'bloquea',
  maxFines: 'avisa', maxFinesSeguidos: 'avisa', minFinesLibresMes: 'avisa', finesCoherentes: 'avisa',
};
export const nivelRegla = (k, r) => (r && r.nivel) || NIVEL_DEFECTO[k] || 'avisa';

// Conjuntos de reglas de partida, como los «rule sets» por convenio de Quinyx: se eligen en el asistente «Nuevo horario».
export const CONJUNTOS_REGLAS = [
  { id: 'seccion', nombre: 'Propuesta de la sección', texto: 'Máximo 17 fines de semana (1 de cada 3), al menos uno libre cada mes y nunca más de 2 seguidos, fin de semana en el turno de su semana, 5 días seguidos como mucho, 14 noches en bloques 2-2-3 y 3 días libres tras las noches.',
    reglas: () => REGLAS() },
  { id: 'practica2027', nombre: 'Práctica del horario de 2027', texto: 'Lo que hace el horario real de 2027: hasta 18 fines de semana, fines de semana de tarde en semana de mañana permitidos, hasta 6 días seguidos y el resto igual.',
    reglas: () => ({ ...REGLAS(), maxFines: { activo: true, valor: 18, nivel: 'avisa' }, finesCoherentes: { activo: false, valor: true }, maxSeguidos: { activo: true, valor: 6, nivel: 'bloquea' } }) },
];

// Catálogo de reglas: en Parámetros se añaden y se quitan de cada sede. El motor aplica las que estén.
// «normas»: ids de js/normativa.js en que se apoya. «sinFuente»: el valor lo propone la app, no sale de la normativa.
export const REGLAS_CATALOGO = [
  { k: 'maxNoches',         texto: 'Máximo de noches al año por persona', unidad: 'noches', defecto: 14, normas: ['noches14DeOficio', 'tope14Noches', 'nochesAnuales'] },
  { k: 'bloquesNoche',      texto: 'Noches en bloques: días seguidos de cada bloque, de lunes a domingo', unidad: '2-2-3 = L-M, X-J, V-S-D', defecto: '2-2-3', texto_libre: true, normas: ['bloques223'] },
  { k: 'maxNochesSeguidas', texto: 'Máximo de noches seguidas', unidad: 'noches', defecto: 3, normas: ['maxNochesSeguidasOficio'] },
  { k: 'descansoTrasNoche', texto: 'Días sin turno después de un bloque de noches (el primero es el saliente)', unidad: 'días', defecto: 3, normas: ['descansoTrasBloqueNoche'], decision: 'Práctica del cuadrante actual: 3 días (5 tras el bloque de viernes a domingo). Reivindicación: al menos 2.' },
  { k: 'maxFines',          texto: 'Máximo de fines de semana trabajados al año (1 de cada 3 ≈ 17)', unidad: 'fines de semana', defecto: 17, normas: ['finesUnoDeTres', 'finesTopeReal'] },
  { k: 'finesCoherentes',   texto: 'Fin de semana en el mismo turno que su semana (sin tardes de fin de semana en semana de mañana, ni al revés)', unidad: '', defecto: true, sinValor: true, normas: ['finesCoherentesSemana'] },
  { k: 'maxFinesSeguidos',  texto: 'Máximo de fines de semana seguidos trabajados', unidad: 'fines de semana', defecto: 2, normas: ['finesSeguidosMax'], decision: 'Horario actual de 2027: en el 97 % del personal de lunes a domingo (Sevilla y Málaga) nunca hay más de 2 fines de semana seguidos trabajados.' },
  { k: 'minFinesLibresMes', texto: 'Fines de semana libres completos (sábado y domingo sin turno) como mínimo cada mes', unidad: 'fines de semana', defecto: 1, normas: ['finLibreCadaMes'], decision: 'Decisión de la sección (20-11-2026): «un fin de semana al mes como el horario que tenemos ahora». En el horario de 2027 lo cumple el 99 % en Sevilla y el 100 % en Málaga.' },
  { k: 'descanso',          texto: 'Descanso mínimo entre el fin de un turno y el inicio del siguiente', unidad: 'horas', defecto: 12, normas: ['descansoEntreJornadas'] },
  { k: 'maxSeguidos',       texto: 'Máximo de días de trabajo seguidos', unidad: 'días', defecto: 5, decision: 'Decisión de la sección (20-11-2026): 5 días. Coincide con el máximo del patrón de la consultora y con la petición de CGT de «sin semanas de 6 días».', normas: ['maxDiasSeguidos'] },
  { k: 'tope',              texto: 'Horas por encima del objetivo que se admiten sin aviso (bolsa)', unidad: 'horas', defecto: 0, decision: 'Decisión de la sección (20-11-2026): 0 h, cualquier exceso sobre la jornada se avisa. En el cuadrante de 2027 lo más común son 3,5 h a bolsa.', normas: ['horasBolsaPlanificadas'] },
  { k: 'ratio',             texto: 'Teleasistentes por supervisor en cada franja (sube el mínimo de supervisión)', unidad: 'por supervisor', defecto: 16, normas: ['ratioSupervision'] },
];

// Cobertura y bolsa de partida. Cesión: noches por encima de las de oficio («todos», «voluntaria» o «ninguna»).
// Bolsa: «devolver» (lo hecho de más vuelve como descanso en el año), «acumular» (queda a favor hasta el tope) o «ambas».
export const COBERTURA = (topeCesion = 16) => ({
  cesion: { modo: 'todos', tope: topeCesion },
  bolsa: { modo: 'ambas', tope: 35, inicial: {}, consumida: {} },
  margen: { noche: 0, dia: 0, tipo: 'personas' },
  ausencias: [],
  aguante: { avisar: true },
});

export const REGLAS = () => ({
  maxNoches:   { activo: true, valor: 14 },
  bloquesNoche: { activo: true, valor: '2-2-3' },
  maxNochesSeguidas: { activo: true, valor: 3 },
  descansoTrasNoche: { activo: true, valor: 3 },
  finesCoherentes: { activo: true, valor: true },
  maxFines:    { activo: true, valor: 17 },
  maxFinesSeguidos: { activo: true, valor: 2 },
  minFinesLibresMes: { activo: true, valor: 1 },
  descanso:    { activo: true, valor: 12 },
  maxSeguidos: { activo: true, valor: 5 },
  tope:        { activo: true, valor: 0 },   // horas por encima del objetivo que se admiten sin aviso (bolsa): decisión de la sección
  ratio:       { activo: true, valor: 16 },  // teleasistentes por supervisor en cada franja
  ajuste:      { activo: true },
});

// ── Festivos ──────────────────────────────────────────────────────────────────
// Cada sede tiene una FUENTE automática (nacionales y autonómicos), sus fiestas LOCALES con una regla
// que vale para todos los años, y correcciones a mano por año. Al cambiar de año se recalculan solos.
//   fuente.tipo: 'nager' (date.nager.at) · 'openholidays' (openholidaysapi.org) · 'ics' · 'json' · 'ninguna'
//   fuente.trasladarDomingos: el festivo que cae en domingo pasa al lunes (lo hace siempre Andalucía).
//   locales: { regla: 'fija', fecha: 'MM-DD' } o { regla: 'pascua', dias: N } (N días después del domingo de Pascua).
// Comprobado con 2027: Nager.Date + traslado de domingos = Decreto 84/2026 (BOJA 84, 5-5-2026), y las
// locales coinciden con la Resolución de 23-10-2026 (BOJA 210, 29-10-2026).
const ENLACES_ANDALUCIA = [
  { texto: 'Junta de Andalucía: calendario laboral (todos los años)', url: 'https://www.juntadeandalucia.es/temas/trabajar/relaciones/calendario.html' },
  { texto: 'BOE 13-10-2026: fiestas laborales de 2027 (nacionales y por comunidad)', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-21254' },
  { texto: 'BOJA 5-5-2026: Decreto 84/2026, fiestas de Andalucía para 2027', url: 'https://www.juntadeandalucia.es/eboja/2026/84/BOJA26-084-00002-5812-01_00337048.pdf' },
  { texto: 'BOJA 29-10-2026: fiestas locales de 2027 de todos los municipios', url: 'https://www.juntadeandalucia.es/eboja/2026/210/BOJA26-210-00021-14189-01_00345419.pdf' },
];
// Lo que devuelve Nager.Date para Andalucía en 2027 (descargado el 20-11-2026), para funcionar sin conexión.
const CACHE_ANDALUCIA_2027 = {
  clave: 'nager|ES-AN|', anio: 2027, fecha: '2026-11-20', lista: [
    { fecha: '2027-01-01', nombre: 'Año Nuevo' }, { fecha: '2027-01-06', nombre: 'Día de Reyes / Epifanía del Señor' },
    { fecha: '2027-02-28', nombre: 'Día de Andalucía' }, { fecha: '2027-03-25', nombre: 'Jueves Santo' },
    { fecha: '2027-03-26', nombre: 'Viernes Santo' }, { fecha: '2027-05-01', nombre: 'Fiesta del trabajo' },
    { fecha: '2027-08-15', nombre: 'Asunción' }, { fecha: '2027-10-12', nombre: 'Fiesta Nacional de España' },
    { fecha: '2027-11-01', nombre: 'Día de todos los Santos' }, { fecha: '2027-12-06', nombre: 'Día de la Constitución' },
    { fecha: '2027-12-08', nombre: 'Inmaculada Concepción' }, { fecha: '2027-12-25', nombre: 'Navidad' },
  ],
};
const festivosAndalucia = (locales) => ({
  fuente: { tipo: 'nager', region: 'ES-AN', url: '', trasladarDomingos: true },
  locales,
  extra: [],     // a mano, de un año concreto: { fecha: 'AAAA-MM-DD', nombre }
  quitar: [],    // fechas que da la fuente y no valen: 'AAAA-MM-DD'
  enlaces: ENLACES_ANDALUCIA.map(e => ({ ...e })),
  cache: JSON.parse(JSON.stringify(CACHE_ANDALUCIA_2027)),
});

const grupo = (id, colectivo, nombre, prefijo, personas, patron, extra = {}) => ({
  id, colectivo, nombre, prefijo, personas, patron: patron || [], patronDe: '', flexible: true, horasObjetivo: 1480.5,
  franjasAjuste: TODAS, vacaciones: VAC(), ...extra,
});

// ── Sevilla: cuadrantes de 2027 (horarios-sevilla-2027.md y horarios-supervisores-sevilla-2027.md),
//    mínimos del Anexo 2 de 2013.
const SEVILLA = {
  id: 'sevilla',
  nombre: 'Sevilla',
  titulo: 'SAT Sevilla · propuesta de cuadrante',
  anio: 2027,
  turnos: [
    { codigo: 'RM1', nombre: 'Mañana rotatorio', inicio: '08:15', fin: '15:15', franja: 'manana', color: '#FFD37A' },
    { codigo: 'M1',  nombre: 'Mañana 1',         inicio: '07:45', fin: '14:45', franja: 'manana', color: '#F7BF4F' },
    { codigo: 'M2',  nombre: 'Mañana 2',         inicio: '08:00', fin: '15:00', franja: 'manana', color: '#F2D9A0' },
    { codigo: 'C1',  nombre: 'Continuo',         inicio: '09:00', fin: '16:00', franja: 'manana', color: '#C9E4C5' },
    { codigo: 'RT1', nombre: 'Tarde rotatorio',  inicio: '15:00', fin: '22:00', franja: 'tarde',  color: '#F39A5E' },
    { codigo: 'T1',  nombre: 'Tarde 1',          inicio: '15:00', fin: '22:00', franja: 'tarde',  color: '#E8794A' },
    { codigo: 'T2',  nombre: 'Tarde 2',          inicio: '16:00', fin: '23:00', franja: 'tarde',  color: '#F6B89A' },
    { codigo: 'N',   nombre: 'Noche',            inicio: '22:00', fin: '08:00', franja: 'noche',  color: '#2E4A86' },
    ...LIBRES(),
  ],
  // Un solo turno rotatorio. Plantilla de 2027: 256 teleasistentes (antes rotatorio 117, fijos
  // discontinuos 25, mañana 48, tarde 49 y continuo 17) y 29 supervisores.
  grupos: [
    grupo('ta', 'TA', 'Turno rotatorio común', 'TA', 256, ROTATORIO_COMUN),
    grupo('sup', 'SUP', 'Turno rotatorio común (supervisión)', 'SUP', 29, [], { patronDe: 'ta' }),
  ],
  // Mínimos por franja y tipo de día. "domingo" vale también para festivos.
  minimos: [
    { colectivo: 'TA',  franja: 'manana', laborable: 47, sabado: 39, domingo: 29 },
    { colectivo: 'TA',  franja: 'tarde',  laborable: 37, sabado: 29, domingo: 28 },
    { colectivo: 'TA',  franja: 'noche',  laborable: 8,  sabado: 8,  domingo: 8 },
    { colectivo: 'SUP', franja: 'manana', laborable: 2,  sabado: 2,  domingo: 2 },
    { colectivo: 'SUP', franja: 'tarde',  laborable: 2,  sabado: 2,  domingo: 2 },
    { colectivo: 'SUP', franja: 'noche',  laborable: 1,  sabado: 1,  domingo: 1 },
  ],
  reglas: REGLAS(),
  vacaciones: vacacionesPeriodos(24, 3, 'Periodos y plazas del correo de Procesos horarios de Sevilla (2027). Supervisión: 3 plazas, orientativo.'),
  festivos: festivosAndalucia([
    { nombre: 'Miércoles de Feria (local)', regla: 'pascua', dias: 17 },
    { nombre: 'Corpus Christi (local)', regla: 'pascua', dias: 60 },
  ]),
  manuales: {},
  contratos: CONTRATOS(),   // perfiles de jornada (Parámetros › Contratos y casos especiales)
  // Cobertura y bolsa (Parámetros › Cobertura y bolsa). Con 16 noches de tope para quien ceda, Sevilla cubre todas las noches (3 noches cedidas en total).
  cobertura: COBERTURA(16),
  especiales: {},           // casos especiales por código de persona: { "TA 017": { contrato, franjas, sinFindes, diasLibres, alta, baja, semanaInicio } }   // cambios a mano en el cuadrante: { "TA-R 001|2027-03-02": "L" }
};

// ── Málaga: cuadrante de teleasistentes de 2027 (horarios-malaga-2026-2027.md), mínimos nuevos
//    desde el 15-10-2026 y 1.494,5 h de referencia. De la supervisión de Málaga no hay cuadrante:
//    la plantilla de supervisores es ORIENTATIVA (proporcional a la de Sevilla) y hay que cambiarla.
const MALAGA = {
  id: 'malaga',
  nombre: 'Málaga',
  titulo: 'SAT Málaga · propuesta de cuadrante',
  anio: 2027,
  turnos: [
    { codigo: 'RM1', nombre: 'Mañana rotatorio', inicio: '08:15', fin: '15:15', franja: 'manana', color: '#FFD37A' },
    { codigo: 'RMF', nombre: 'Mañana fijo discontinuo', inicio: '08:00', fin: '15:00', franja: 'manana', color: '#FBE3A6' },
    { codigo: 'M1',  nombre: 'Mañana 1',         inicio: '07:45', fin: '14:45', franja: 'manana', color: '#F7BF4F' },
    { codigo: 'M2',  nombre: 'Mañana 2',         inicio: '08:00', fin: '15:00', franja: 'manana', color: '#F2D9A0' },
    { codigo: 'C1',  nombre: 'Continuo',         inicio: '09:00', fin: '16:00', franja: 'manana', color: '#C9E4C5' },
    { codigo: 'RT1', nombre: 'Tarde rotatorio',  inicio: '15:00', fin: '22:00', franja: 'tarde',  color: '#F39A5E' },
    { codigo: 'T1',  nombre: 'Tarde 1',          inicio: '15:00', fin: '22:00', franja: 'tarde',  color: '#E8794A' },
    { codigo: 'T2',  nombre: 'Tarde 2',          inicio: '16:00', fin: '23:00', franja: 'tarde',  color: '#F6B89A' },
    { codigo: 'N',   nombre: 'Noche',            inicio: '22:00', fin: '08:00', franja: 'noche',  color: '#2E4A86' },
    ...LIBRES(),
  ],
  // Un solo turno rotatorio. Plantilla de 2027: 242 teleasistentes (antes R1 e iR1 98, fijos discontinuos 22,
  // M2 46, M1 27, T1 27, T2 17 y continuo 5) y 24 supervisores (orientativo: no hay cuadrante de supervisión).
  grupos: [
    grupo('ta', 'TA', 'Turno rotatorio común', 'TA', 242, ROTATORIO_COMUN, { horasObjetivo: 1494.5 }),
    grupo('sup', 'SUP', 'Turno rotatorio común (supervisión)', 'SUP', 24, [], { patronDe: 'ta', horasObjetivo: 1494.5 }),
  ],
  // Mínimos de Málaga desde el 15-10-2026: punta 09:45-14:30, tarde 16:45-19:45 y noche.
  minimos: [
    { colectivo: 'TA',  franja: 'manana', laborable: 46, sabado: 35, domingo: 28 },
    { colectivo: 'TA',  franja: 'tarde',  laborable: 32, sabado: 26, domingo: 25 },
    { colectivo: 'TA',  franja: 'noche',  laborable: 8,  sabado: 8,  domingo: 8 },
    { colectivo: 'SUP', franja: 'manana', laborable: 2,  sabado: 2,  domingo: 2 },
    { colectivo: 'SUP', franja: 'tarde',  laborable: 2,  sabado: 2,  domingo: 2 },
    { colectivo: 'SUP', franja: 'noche',  laborable: 1,  sabado: 1,  domingo: 1 },
  ],
  reglas: REGLAS(),
  vacaciones: vacacionesPeriodos(22, 3, 'Orientativo: mismos periodos que Sevilla y plazas repartidas por plantilla. Cámbialos con los de Málaga.'),
  festivos: festivosAndalucia([
    { nombre: 'Incorporación de Málaga a la Corona de Castilla (local)', regla: 'fija', fecha: '08-19' },
    { nombre: 'Virgen de la Victoria (local)', regla: 'fija', fecha: '09-08' },
  ]),
  manuales: {},
  contratos: CONTRATOS(),   // perfiles de jornada (Parámetros › Contratos y casos especiales)
  // Cobertura y bolsa (Parámetros › Cobertura y bolsa). Con 18 de tope Málaga pasa de 58 personas-noche sin cubrir a 3 (unas 39 noches cedidas); el bloque que queda se cubre con un refuerzo de verano.
  cobertura: COBERTURA(18),
  especiales: {},           // casos especiales por código de persona: { "TA 017": { contrato, franjas, sinFindes, diasLibres, alta, baja, semanaInicio } }
};

export const SEDES_BASE = [SEVILLA, MALAGA];

export const ENCUESTAS_BASE = [
  {
    id: 'preferencias', titulo: 'Preferencias de turno', activa: true,
    descripcion: 'Encuesta anónima de la Sección Sindical CGT sobre el sistema de turnos del SAT. Tarda 2 minutos.',
    preguntas: [
      { id: 'p0', tipo: 'unica', texto: '¿En qué sede trabajas?', opciones: ['Sevilla', 'Málaga'], obligatoria: true },
      { id: 'p1', tipo: 'unica', texto: '¿En qué colectivo trabajas?', opciones: ['Teleasistencia', 'Supervisión'], obligatoria: true },
      { id: 'p2', tipo: 'unica', texto: '¿Qué turno tienes ahora?', opciones: ['Rotatorio', 'Mañana fija', 'Tarde fija', 'Continuo', 'Fijo discontinuo'], obligatoria: true },
      { id: 'p3', tipo: 'unica', texto: '¿Qué te parece un turno común para toda la plantilla?', opciones: ['A favor', 'A favor con condiciones', 'En contra', 'No lo tengo claro'], obligatoria: true },
      { id: 'p4', tipo: 'unica', texto: '¿Cuántas noches al año estarías dispuesto o dispuesta a hacer?', opciones: ['Ninguna', 'Hasta 14', 'Entre 15 y 28', 'Más de 28'], obligatoria: true },
      { id: 'p5', tipo: 'unica', texto: '¿Cómo prefieres los fines de semana?', opciones: ['1 de cada 3', '1 de cada 4', 'Me da igual si se compensa', 'Otra opción'], obligatoria: true },
      { id: 'p6', tipo: 'multiple', texto: '¿Qué es lo más importante para ti? Marca todo lo que quieras.', opciones: ['Saber el cuadrante con antelación', 'Fines de semana coherentes con la semana', 'Tope real de noches', 'Poder cambiar turnos', 'Mantener el plus rotativo', 'Turnos fijos'], obligatoria: false },
      { id: 'p7', tipo: 'texto', texto: '¿Algo más que quieras contarnos?', opciones: [], obligatoria: false },
    ],
  },
  {
    id: 'valoracion', titulo: 'Valoración del cuadrante', activa: true,
    descripcion: 'Dinos qué te parece el cuadrante que genera esta página para tu sede con los parámetros actuales.',
    preguntas: [
      { id: 'v0', tipo: 'unica', texto: '¿En qué sede trabajas?', opciones: ['Sevilla', 'Málaga'], obligatoria: true },
      { id: 'v1', tipo: 'unica', texto: '¿En qué colectivo trabajas?', opciones: ['Teleasistencia', 'Supervisión'], obligatoria: true },
      { id: 'v2', tipo: 'escala', texto: 'Del 1 al 5, ¿cómo valoras el reparto de noches?', opciones: [], obligatoria: true },
      { id: 'v3', tipo: 'escala', texto: 'Del 1 al 5, ¿cómo valoras el reparto de fines de semana?', opciones: [], obligatoria: true },
      { id: 'v4', tipo: 'escala', texto: 'Del 1 al 5, ¿cómo valoras la rotación de mañanas y tardes?', opciones: [], obligatoria: true },
      { id: 'v5', tipo: 'texto', texto: '¿Qué cambiarías?', opciones: [], obligatoria: false },
    ],
  },
];

// Configuración completa: una por sede (independientes) y lo común (tema y encuestas).
export const CONFIG_BASE = {
  version: 2,
  tema: 'day',
  sedes: SEDES_BASE,
  encuestas: ENCUESTAS_BASE,
};

export const TIPOS_FUENTE = [
  { id: 'nager', nombre: 'Nager.Date (nacionales y autonómicos)', region: true },
  { id: 'openholidays', nombre: 'OpenHolidays API (nacionales y autonómicos)', region: true },
  { id: 'ics', nombre: 'Calendario ICS (dirección web)', url: true },
  { id: 'json', nombre: 'Fichero JSON (dirección web)', url: true },
  { id: 'ninguna', nombre: 'Ninguna: solo a mano' },
];

export const FRANJAS = [
  { id: 'manana', nombre: 'Mañana' },
  { id: 'tarde', nombre: 'Tarde' },
  { id: 'noche', nombre: 'Noche' },
];
export const FRANJA_NOMBRE = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', libre: 'Libre o ausencia' };
export const COLECTIVOS = [
  { id: 'TA', nombre: 'Teleasistentes' },
  { id: 'SUP', nombre: 'Supervisores' },
];
export const TIPOS_PREGUNTA = [
  { id: 'unica', nombre: 'Una respuesta' },
  { id: 'multiple', nombre: 'Varias respuestas' },
  { id: 'escala', nombre: 'Escala del 1 al 5' },
  { id: 'numero', nombre: 'Número' },
  { id: 'texto', nombre: 'Texto libre' },
];
