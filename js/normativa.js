// Normativa de turnos del SAT: 250 reglas (catálogo de las fuentes + vacaciones del correo de Procesos horarios + reunión del 18-11-2026) sacadas de docs/fuentes-cgt (convenio, actas de la Comisión,
// protocolo P.41, correos del comité y de las secciones, cuadrantes de 2027, encuestas). Generado desde
// docs/fuentes-cgt/reglas-catalogo.md el 20-11-2026: si cambia el catálogo, se vuelve a generar.
// Reunión del 18-11-2026: de su transcripción (docs/fuentes-cgt/reunion-18-11-2026.md); no hubo acuerdos formales.
export const NORMATIVA = [
{
"id": "jornadaAnualGeneral",
"tema": "Jornada anual y horas",
"regla": "La jornada general es de 35 h semanales de promedio en cómputo anual, con un máximo anual descontadas vacaciones y fiestas.",
"valor": "1.575 h/año (= 225 días × 7 h); 1.582 h en año bisiesto (2024)",
"ambito": "TA+SUP · ambas · C y jornada ordinaria",
"estado": "norma vigente",
"fuente": "convenio.md §1 (art. 28.1: \"máximo de 1.575 horas anuales\"); acuerdos-comision.md 2023-2025 (Acta CP 34, 11-07-2024)",
"comprobable": "Sí: sumar horas de turnos (+ AJ) y comparar con 1.575 (o 1.582 si bisiesto)"
},
{
"id": "jornadaAnualTurnos6",
"tema": "Jornada anual y horas",
"regla": "Los turnos de lunes a domingo tienen una jornada un 6 % inferior a la general, sin pérdida de salario, compensada en días y reflejada en el cuadrante.",
"valor": "1.480,5 h/año (1.575 × 0,94)",
"ambito": "TA+SUP · ambas · L-D 6 % (M1, M2, T1, T2, R, P)",
"estado": "norma vigente",
"fuente": "convenio.md §1 (art. 31.2; DT 6ª; Acuerdo 30-7-18); acuerdos-comision.md (Acta CP 34: \"realiza 1.480,50 horas anuales incluidas en el cuadrante\")",
"comprobable": "Sí: suma de horas de la fila frente a 1.480,5"
},
{
"id": "sin6TurnoC",
"tema": "Jornada anual y horas",
"regla": "El turno C (L-V, sin festivos) no tiene la reducción del 6 %.",
"valor": "0 %; 1.575 h",
"ambito": "TA+SUP · ambas · C",
"estado": "norma vigente",
"fuente": "convenio.md §1 (\"No se aplica al turno C\"); correos-eml.md §1 (acta 23-06-2023: compensación \"0 %\")",
"comprobable": "Sí: grupo C → objetivo 1.575 h"
},
{
"id": "jornadaMalagaConAJ",
"tema": "Jornada anual y horas",
"regla": "El cuadrante de Málaga expresa la obligación anual incluyendo los 2 días AJ (14 h).",
"valor": "1.494,5 h (L-D 6 %) y 1.589 h (C) en 2027",
"ambito": "TA · Mál",
"estado": "práctica de la empresa",
"fuente": "horarios-malaga-2026-2027.md §2 (\"H. Anuales\": 1.494,5 / 1.589); informe-planificacion.md §4 (\"el cuadrante pone 1.494,5 al incluir los 2 días AJ\")",
"comprobable": "Sí: en Málaga, objetivo = 1.494,5 / 1.589 sin contar AJ como trabajado; en Sevilla, 1.480,5 / 1.575 contando AJ como 7 h"
},
{
"id": "horasCuadranteEsperadas",
"tema": "Jornada anual y horas",
"regla": "Las horas que suman los turnos del cuadrante equivalen a la obligación + 35 h de los 5 días sueltos de vacaciones (no planificados) + el exceso que va a bolsa.",
"valor": "Sevilla 1.519 h = 1.480,5 + 35 + 3,5; Málaga 1.533 h = 1.494,5 + 35 + 3,5; C Málaga 1.610 h",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-malaga-2026-2027.md §2 (\"1.533 h… igual a 1.494,5 + 35 h de vacaciones pendientes + 3,5 h a bolsa\"); horarios-sevilla-2027.md §2 (1.519 h)",
"comprobable": "Sí: horas de la fila − obligación − 35 = horas a bolsa; avisar si < 0 o muy alto"
},
{
"id": "noPlanificarBajoObligacion",
"tema": "Jornada anual y horas",
"regla": "Nadie debe quedar planificado por debajo de su obligación anual.",
"valor": "horas fila ≥ obligación",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §2 (\"Nadie está planificado por debajo de su obligación, siempre que los días AJ cuenten como trabajados\")",
"comprobable": "Sí: horas fila (con AJ) ≥ 1.480,5 / 1.575"
},
{
"id": "horasBolsaPlanificadas",
"tema": "Jornada anual y horas",
"regla": "El exceso planificado sobre la obligación va a la bolsa de horas, sin ajustar en días.",
"valor": "3,5 h lo más común en 2027 (rango 0-6,5 h; casos de 18,5 h a revisar); tope de aviso: sin fuente",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §2 (\"HORAS BOLSA 2027\"); acuerdos-comision.md 2019 (25-09-2019: \"Horas sobrantes a bolsa, sin ajuste en días\")",
"comprobable": "Sí: calcular exceso y marcar valores atípicos (el umbral de aviso no tiene fuente)"
},
{
"id": "sinContinuidadEntreAnios",
"tema": "Jornada anual y horas",
"regla": "El cuadrante no arrastra saldos entre años.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "acuerdos-comision.md 2019 (25-09-2019: \"no existe continuidad\" entre años)",
"comprobable": "No (afecta a la generación)"
},
{
"id": "bisiestoDescanso",
"tema": "Jornada anual y horas",
"regla": "En año bisiesto, los turnos L-D tienen un día más de descanso y los turnos L-V suman 7 h a la bolsa.",
"valor": "+1 día (L-D); +7 h a bolsa (C y L-V)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2019 (25-09-2019: \"+1 día de descanso\"; \"El turno C suma +7 h\"); 2023-2025 (Acta CP 34: \"Turnos de lunes a viernes: +7 h a la bolsa\")",
"comprobable": "Sí: en bisiesto, objetivo C = 1.582 y bolsa +7"
},
{
"id": "jornadaProporcionalReduccion",
"tema": "Jornada anual y horas",
"regla": "Con jornada reducida, la obligación anual es proporcional a la jornada semanal.",
"valor": "obligación × H. SEMANAL / 35 (fórmula: sin fuente explícita)",
"ambito": "TA+SUP · ambas · reducciones",
"estado": "dudosa",
"fuente": "convenio.md §10 (art. 38.1: reducción \"con salario proporcional\"); horarios-anteriores.md (filas a menos de 35 h). La fórmula de horas no está escrita",
"comprobable": "Sí, si se acepta la fórmula: comparar horas con obligación prorrateada"
},
{
"id": "maxHorasDia",
"tema": "Jornada anual y horas",
"regla": "La jornada diaria en turnos puede ser irregular pero no superar 12 h.",
"valor": "≤ 12 h/día",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §2 (art. 28.2)",
"comprobable": "Sí: ninguna celda (ni suma de celdas de un día) > 12 h"
},
{
"id": "pausaJornada",
"tema": "Jornada anual y horas",
"regla": "Si la jornada continuada pasa de 6 h, hay derecho a una pausa que cuenta como trabajo efectivo.",
"valor": "30 min (convenio); mínimo legal de 15 min (Prevención, 2013)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §2 (art. 32); correos-buzon.md §2.9 (2013)",
"comprobable": "No (no figura en el cuadrante)"
},
{
"id": "horasExtraCompensacion",
"tema": "Jornada anual y horas",
"regla": "Las horas extraordinarias se compensan con descanso, a razón de 1,75 h por hora, en los 4 meses siguientes; el pago en dinero es excepcional.",
"valor": "1 × 1,75; 4 meses",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §2 (art. 33 y DT 1ª; Ley 3/2012)",
"comprobable": "No (fuera del cuadrante planificado)"
},
{
"id": "horasExtraPagadas",
"tema": "Jornada anual y horas",
"regla": "Pagar las horas extra en dinero.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-buzon.md §2.9 (\"demanda histórica\" de CGT); en 2026 ya se pagan con un modelo \"híbrido\" no pactado (CCOO, 05-02-2026)",
"comprobable": "No"
},
{
"id": "excesoJornadaReal",
"tema": "Jornada anual y horas",
"regla": "Se denuncia que más de 100 personas superan la jornada anual, en algunos casos hasta 2 días.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §2.9 (UGT, 17-11-2026)",
"comprobable": "Sí: horas vividas > obligación (necesita cuadrante vivido)"
},
{
"id": "horariosEspecialesComputoAnual",
"tema": "Jornada anual y horas",
"regla": "Las reducciones de horario de Navidad (8:00-14:30), Semana Santa y Feria (8:00-14:00) y verano (8:00-15:00) se aplican a turnos o se disfrutan en cómputo anual.",
"valor": "horas no cuantificadas",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "convenio.md §6 y Dudas 4 (Acuerdo 35 h de 20-12-2016; no está en el I Convenio, que absorbe condiciones anteriores)",
"comprobable": "No"
},
{
"id": "cambioHoraNoche",
"tema": "Jornada anual y horas",
"regla": "La noche del cambio de hora dura 11 h (invierno: 1 h a favor) o 9 h (verano: 1 h pendiente de devolver).",
"valor": "11 h / 9 h",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §5 (RRHH, 2017)",
"comprobable": "Sí: si hay N la noche del último domingo de octubre o de marzo, contar 11 o 9 h"
},
{
"id": "permiso24y31",
"tema": "Días de ajuste (AJ, 24 y 31 de diciembre)",
"regla": "El 24 y el 31 de diciembre son permiso retribuido; quien trabaja a turnos esos días lo disfruta cuando el servicio lo permita.",
"valor": "2 días",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §6 (art. 36.3)",
"comprobable": "Sí: 2 días AJ por persona"
},
{
"id": "ajDosDias",
"tema": "Días de ajuste (AJ, 24 y 31 de diciembre)",
"regla": "El cuadrante pone 2 días AJ (\"ajuste día permiso 24/31 dic.\") a cada persona y los computa como 7 h.",
"valor": "2 AJM/AJT; 7 h cada uno",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "leyenda-codigos.md (actualización: AJM/AJT); horarios-malaga-2026-2027.md §2 (AJ = 2); horarios-supervisores-sevilla-2027.md (\"AJ cuenta 7 h\")",
"comprobable": "Sí: contar AJ* = 2"
},
{
"id": "ajFechasReparto",
"tema": "Días de ajuste (AJ, 24 y 31 de diciembre)",
"regla": "La empresa reparte los AJ entre el 20 y el 31 de diciembre, no necesariamente el 24 y el 31.",
"valor": "Sevilla 2027: solo 31 de 304 filas el 24 y el 31",
"ambito": "TA+SUP · Sev (y SUP Sev 22-31 dic.)",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §6; horarios-supervisores-sevilla-2027.md §4",
"comprobable": "Sí: fechas de los AJ"
},
{
"id": "ajEl24y31OElegir",
"tema": "Días de ajuste (AJ, 24 y 31 de diciembre)",
"regla": "Los AJ deben caer el 24 y el 31 o en las fechas que elija la persona.",
"valor": "24 y 31 dic. o a elección",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-completo-seccion.md §9.8; plan-de-trabajo.md Fase 4; convenio.md §16 (CGT 2016: \"por libre elección\")",
"comprobable": "Sí: AJ en 24 y 31 dic. (si no, aviso)"
},
{
"id": "ajFinDeSemana",
"tema": "Días de ajuste (AJ, 24 y 31 de diciembre)",
"regla": "Si el 24 o el 31 caen en fin de semana, no hay AJ (2023, ambos en domingo) o deberían darse 2 días más.",
"valor": "2023: sin AJ; CGT 2016: +2 días",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "leyenda-codigos.md §2 (AJM: \"En 2023 no hay AJ (24 y 31/12/2023 eran domingos)\"); convenio.md §16 (propuesta CGT 2016)",
"comprobable": "Sí: según el año, AJ esperados = nº de 24/31 en día laborable (criterio no escrito)"
},
{
"id": "vacacionesDias",
"tema": "Vacaciones",
"regla": "Las vacaciones son de 22 días laborables al año, disfrutables hasta el 15 de enero del año siguiente.",
"valor": "22 días; hasta el 15-01",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (art. 34.1)",
"comprobable": "Parcial: el cuadrante solo trae el bloque estival (17); los 5 sueltos no figuran"
},
{
"id": "vacacionesAntiguedad",
"tema": "Vacaciones",
"regla": "Días adicionales de vacaciones por antigüedad, que se añaden a alguno de los bloques.",
"valor": "23 a los 15 años; 24 a los 20; 25 a los 25; 26 a los 30",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (art. 34.2); leyenda-codigos.md (VE, \"deberán añadir estos días a alguno de sus bloques\")",
"comprobable": "Sí, si la ficha trae la antigüedad: V totales esperadas"
},
{
"id": "vacacionesFraccionSAT",
"tema": "Vacaciones",
"regla": "En el SAT se pueden disfrutar hasta 5 días sueltos y el resto en hasta 2 periodos de al menos 5 días; se ofertan turnos de vacaciones.",
"valor": "≤ 5 sueltos; ≤ 2 periodos ≥ 5 días",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (art. 34.1, cláusula del SAT)",
"comprobable": "Sí: contar bloques de V consecutivas y su longitud"
},
{
"id": "vacacionesMitadVerano",
"tema": "Vacaciones",
"regla": "La mitad de las vacaciones se disfruta preferentemente entre el 1 de junio y el 31 de octubre.",
"valor": "≥ 11 días entre 01-06 y 31-10 (preferente)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (art. 34.1); analisis-informe-consultora.md §4.9",
"comprobable": "Sí: V entre 01-06 y 31-10 ≥ 11"
},
{
"id": "bloqueEstival17",
"tema": "Vacaciones",
"regla": "El bloque estival es de 17 días hábiles (23 naturales), entre junio y septiembre, empezando el lunes más próximo al 20 de junio, en periodos fijos.",
"valor": "17 días hábiles; 11 periodos (Sevilla)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (P.41 v8 §4.3); correos-eml.md §6 (borrador 2021); correos-buzon.md §2.8 (\"11 periodos\")",
"comprobable": "Sí: 17 V seguidas en días hábiles dentro de un periodo oficial"
},
{
"id": "vacacionesModalidades",
"tema": "Vacaciones",
"regla": "Tres modalidades: A (17 estivales + 5 sueltos), B (2 bloques: estival de 9 a 17 días y otro de 5 a 11), C (B + hasta 5 sueltos).",
"valor": "A / B / C",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (apartado 5.3, sept. 2021); acuerdos-comision.md 2022 (\"Punto VACACIONES\", sept. 2022)",
"comprobable": "Sí: el patrón de V debe encajar en una de las tres"
},
{
"id": "vacacionesContradiccion11",
"tema": "Vacaciones",
"regla": "El apartado 5.3 dice a la vez \"límite de 11 días obligatorios en periodo estival\" y que el estival es de 9 a 17 días.",
"valor": "9 / 11 / 17",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "convenio.md Dudas 2",
"comprobable": "No hasta aclararlo"
},
{
"id": "vacacionesNocheSueltas",
"tema": "Vacaciones",
"regla": "En turno de noche, como máximo 2 días sueltos de vacaciones, pedidos con 72 h; en mañana o tarde, con 48 h.",
"valor": "≤ 2 en noche; 72 h / 48 h",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (P.41 v8 §4.3); cobertura-pg.md §1.5; acuerdos-comision.md 2022",
"comprobable": "Sí (en el cuadrante vivido): V sobre días que eran N ≤ 2"
},
{
"id": "vacacionesOctDic",
"tema": "Vacaciones",
"regla": "Entre el 1 de octubre y el 22 de diciembre, como máximo 1 día suelto de vacaciones.",
"valor": "≤ 1",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (P.41 v8 §4.3); correos-buzon.md §2.8 (en 2025 se permitió más, de forma excepcional)",
"comprobable": "Sí: V sueltas entre 01-10 y 22-12 ≤ 1"
},
{
"id": "vacacionesAnulacion",
"tema": "Vacaciones",
"regla": "Se pueden anular o mover con 15 días de antelación, manteniendo al menos 9 días en el periodo asignado.",
"valor": "15 días; ≥ 9 días",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (5.3); correos-eml.md §6",
"comprobable": "No (trámite)"
},
{
"id": "vacacionesSorteo",
"tema": "Vacaciones",
"regla": "Si hay más peticiones que plazas, sorteo; las parejas pueden ir juntas; quien tuvo que cambiar de periodo por sorteo queda exento al año siguiente.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (P.41 v8 §4.3); acuerdos-comision.md 2018 (prioridad de quien no pudo disfrutar el periodo elegido)",
"comprobable": "No (necesita el historial)"
},
{
"id": "vacacionesPrioridadesIgualdad",
"tema": "Vacaciones",
"regla": "Prioridad en la elección para quien tiene régimen de vacaciones fijado por sentencia de separación o divorcio y para víctimas de violencia de género.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (Plan de Igualdad 5.7 y 7.6)",
"comprobable": "No"
},
{
"id": "vacacionesCalendario",
"tema": "Vacaciones",
"regla": "Peticiones del 16 de enero a las 8:00 del 6 de febrero, sorteo 5 días después y publicación a finales de marzo.",
"valor": "16-01 → 06-02 08:00",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "convenio.md §7 y Dudas 2 (5.3, 2021, frente a la v8); correos-eml.md §3 (el sondeo de 2022 cambió el orden)",
"comprobable": "No"
},
{
"id": "vacacionesAntesDePublicar",
"tema": "Vacaciones",
"regla": "Las vacaciones estivales se eligen antes de publicar el cuadrante.",
"valor": "sorteo de estivales en junio-septiembre del año anterior",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "encuestas.md §2.3 (80,28 % a favor, 2022); correos-eml.md §3 (sorteo 08-09-2023 para 2024); correos-buzon.md (sorteo estivales 2027 el 23-06-2026)",
"comprobable": "No"
},
{
"id": "vacacionesTurnoC",
"tema": "Vacaciones",
"regla": "El turno C tiene periodos de vacaciones propios.",
"valor": "—",
"ambito": "TA · Sev · C",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2019 (19-03-2019)",
"comprobable": "No"
},
{
"id": "vacacionesRepartoJunOct",
"tema": "Vacaciones",
"regla": "Repartir las vacaciones de verano entre junio y octubre (en vez de concentrarlas del 21-06 al 21-09).",
"valor": "—",
"ambito": "TA · ambas",
"estado": "dudosa",
"fuente": "analisis-informe-consultora.md §4.9 (propuesta implícita de la consultora, no acordada)",
"comprobable": "No"
},
{
"id": "vacacionesNochesReasignadas",
"tema": "Vacaciones",
"regla": "Si caen noches en el periodo de vacaciones, Adpersat las reasigna.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §6 (borrador del protocolo de vacaciones, 30-04-2021)",
"comprobable": "Sí: ningún día con V y N a la vez; nº de N se mantiene"
},
{
"id": "apDias",
"tema": "Asuntos propios (AP)",
"regla": "Hasta 5 días de asuntos propios al año sin justificar, disfrutables hasta el 15 de enero del año siguiente.",
"valor": "5 días (+2 a los 18 años de servicio; +1 por cada 3 años desde los 24)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §8 (art. 36.2)",
"comprobable": "Parcial: los AP no suelen figurar en el cuadrante anual (leyenda-codigos.md, AP)"
},
{
"id": "apPorHoras",
"tema": "Asuntos propios (AP)",
"regla": "Dos de los AP se pueden disfrutar por horas, a 7 h por día, con fracción mínima de 1 h.",
"valor": "2 días; 7 h/día; mín. 1 h",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §8 (art. 36.2)",
"comprobable": "No"
},
{
"id": "apPorHorasNoche",
"tema": "Asuntos propios (AP)",
"regla": "Equivalencia de AP por horas en noches de 10 h.",
"valor": "sin fuente",
"ambito": "TA · ambas · noche",
"estado": "dudosa",
"fuente": "convenio.md Dudas 5",
"comprobable": "No"
},
{
"id": "apSabadoFestivo",
"tema": "Asuntos propios (AP)",
"regla": "Cada festivo que cae en sábado da un AP más, con un máximo de 2 al año.",
"valor": "+1 por festivo en sábado; máx. 2",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2014 (acta de 04-03-2014) y 2023-2025 (Acta CP 34: \"Festivos en sábado: como máximo 2 días\"); correos-eml.md §3 (2024: \"2 AP por sábados festivos\")",
"comprobable": "Sí: AP esperados = 5 + min(2, festivos en sábado)"
},
{
"id": "apPlazoYMinimos",
"tema": "Asuntos propios (AP)",
"regla": "Los AP se piden con 2 días de antelación, por orden de llegada, sujetos a los mínimos de sala globales y por franja, y se resuelven con 30 días.",
"valor": "2 días; resolución 30 días",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §8 (art. 36.2; P.41 v8 §5); cobertura-pg.md §1.5",
"comprobable": "No"
},
{
"id": "apMaxNoche",
"tema": "Asuntos propios (AP)",
"regla": "Como máximo 2 AP al año en turno de noche, y solo si se cubren por bolsa (no se sustituye con menos de 48 h).",
"valor": "≤ 2/año",
"ambito": "TA · ambas · con noches",
"estado": "norma vigente",
"fuente": "convenio.md §8 (P.41 v8 §5); correos-buzon.md §2.1 (PAT pág. 24)",
"comprobable": "Sí (cuadrante vivido): APN ≤ 2"
},
{
"id": "apPeriodosEspeciales",
"tema": "Asuntos propios (AP)",
"regla": "En periodos especiales los AP tienen plazo propio y sorteo, y se deniegan a quien lo disfrutó el mismo día del año anterior.",
"valor": "Navidad 2025-26: plazo hasta el 17-11 a las 08:00; sorteo el 18-11",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §8 (P.41 v8 §5); correos-buzon.md §2.8",
"comprobable": "No (necesita el historial)"
},
{
"id": "apPlazo45dias",
"tema": "Asuntos propios (AP)",
"regla": "El plazo de AP de periodos especiales debe acabar 45 días naturales antes del periodo.",
"valor": "45 días",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-buzon.md §2.8 (UGT, 22-01-2025)",
"comprobable": "No"
},
{
"id": "apHasta28Feb",
"tema": "Asuntos propios (AP)",
"regla": "Poder disfrutar AP y vacaciones hasta el 28 de febrero del año siguiente.",
"valor": "hasta el 28-02",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "acuerdos-comision.md 2021 (CGT, Anexo IV); correos-buzon.md §2.8 (concedido de forma excepcional para 2025; pedido para 2026)",
"comprobable": "No"
},
{
"id": "apOcho",
"tema": "Asuntos propios (AP)",
"regla": "8 días de asuntos particulares (propuesta para el I Convenio).",
"valor": "8",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "convenio.md §16 (CGT, 2016; no pasó al texto)",
"comprobable": "No"
},
{
"id": "prevalenciaPermisos",
"tema": "Prioridad de permisos y regla de los 20 días",
"regla": "Orden de prevalencia: 1) bloques de vacaciones; 2) vacaciones sueltas; 3) AP; 4) cambios y autocambios (todo a 1 mes vista); 5) horas de libre disposición (44A/45A); 6) devolución de horas (libre disposición y bolsa, a 1 semana vista).",
"valor": "orden 1-6",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "correos-buzon.md §2.7 (Comisión 19-03-2025, en vigor desde el 01-04-2025); correos-comite.md §4. Antes: convenio.md §7 (P.41 §6)",
"comprobable": "No (orden de tramitación)"
},
{
"id": "regla20dias",
"tema": "Prioridad de permisos y regla de los 20 días",
"regla": "Las peticiones hechas en los 20 primeros días naturales tras publicarse el cuadrante tienen la misma antigüedad.",
"valor": "20 días naturales",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §7 (P.41 §6); correos-eml.md §3 (2024: hasta el 05-12-2023)",
"comprobable": "No"
},
{
"id": "regla20diasTrasCorreccion",
"tema": "Prioridad de permisos y regla de los 20 días",
"regla": "Si el cuadrante se publica con errores, el plazo de 20 días debería contar desde la publicación corregida.",
"valor": "—",
"ambito": "TA · Sev",
"estado": "dudosa",
"fuente": "correos-comite-completo.md (K-T001, 17-11-2026)",
"comprobable": "No"
},
{
"id": "festivosConTurno",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Los turnos L-D (M1, M2, T1, T2, R, P) trabajan festivos; C (y línea 900) no.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023); horarios-anteriores.md §2 (P.41 v8 §1.2)",
"comprobable": "Sí: en C, ningún turno en festivo"
},
{
"id": "festivosAjusteAnual",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Los festivos trabajados o descansados se ajustan anualmente; el turno L-D recibe un día de devolución (FM/FT) por cada festivo del año.",
"valor": "F = nº de festivos del calendario (12 en 2024 y 2027; 14 en 2023)",
"ambito": "TA+SUP · ambas · L-D",
"estado": "norma vigente",
"fuente": "convenio.md §6 (P.41 v8 §7); leyenda-codigos.md (FM/FT \"DEVOLUC. FESTIVO\"); horarios-malaga-2026-2027.md §2 (F = 12)",
"comprobable": "Sí: contar F* = nº de festivos oficiales no caídos en sábado"
},
{
"id": "festivosSabadoNoCuentan",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Los festivos que caen en sábado no generan devolución F (se dan como AP).",
"valor": "2024: 13 → 12 festivos",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §4 (CGT 2024: \"sólo deben de haber 12 festivos\"; la Jefatura corrige los 13); horarios-anteriores.md §6",
"comprobable": "Sí: F ≠ festivos en sábado"
},
{
"id": "festivosSabadoCuenten",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Que los festivos en sábado cuenten como festivos trabajados.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-eml.md §8 (UGT, 13-12-2023)",
"comprobable": "Sí, si se adopta"
},
{
"id": "festivoDomingoALunes",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "En turnos sin festivos, el festivo que cae en domingo se traslada al lunes.",
"valor": "—",
"ambito": "TA+SUP · ambas · C",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2018 (nota 13-12-2018)",
"comprobable": "Sí: en C, libre el lunes siguiente a un festivo en domingo"
},
{
"id": "festivoNocheSaliente",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "El festivo de noche se computa a la persona que sale del turno de noche.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §6 (P.41 v8 §7)",
"comprobable": "Sí: N que acaba en un festivo cuenta como festivo trabajado"
},
{
"id": "festivosR1Malaga",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "En el R1 de Málaga, los festivos que caen en sábado tienen condición de festivo.",
"valor": "—",
"ambito": "TA · Mál · R1 (sistema anterior a 2024)",
"estado": "dudosa",
"fuente": "convenio.md §6 (Acta 30-1-19). El R1 sin noches de Málaga desapareció con el acuerdo de 23-06-2023",
"comprobable": "No"
},
{
"id": "festivosEspeciales",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Festivo especial: 1 y 6 de enero, Jueves y Viernes Santo, 25 de diciembre y la tarde del 5 de enero, del 24 y del 31 de diciembre; incluye la noche que empieza el día anterior.",
"valor": "lista cerrada",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §6 (art. 43.7)",
"comprobable": "Sí: contar festivos especiales trabajados por persona"
},
{
"id": "festivosEspecialesEquitativo",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Repartir los festivos especiales (25-12, 1-1, 6-1) de forma equitativa y teniendo en cuenta lo trabajado el año anterior.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-eml.md §6 (C-T011, 2022) y §8 (UGT, 13-12-2023); correos-buzon.md §2.11 (CGT, 28-05-2024: \"lo van a estudiar\")",
"comprobable": "Sí: desviación del nº de festivos especiales trabajados frente a la media del grupo"
},
{
"id": "festivosNumeroCorrecto",
"tema": "Festivos y su devolución (FM/FT)",
"regla": "Ninguna persona debe tener más devoluciones F que festivos tiene el año.",
"valor": "≤ nº festivos",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §4 (casillas con 13 en 2024, corregidas por la Jefatura)",
"comprobable": "Sí: F* ≤ nº festivos"
},
{
"id": "franjaNocturna",
"tema": "Noches",
"regla": "Se considera jornada nocturna la realizada entre las 22:00 y las 8:00.",
"valor": "22:00-08:00",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (arts. 31.5 y 43.7.1)",
"comprobable": "Sí: horas en esa franja (plus de nocturnidad)"
},
{
"id": "duracionNoche",
"tema": "Noches",
"regla": "El turno de noche dura 10 h (22:00-08:00); el convenio no lo dice expresamente.",
"valor": "10 h",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "leyenda-codigos.md §2 (NOMENCLATURA: \"N 22:00 08:00 10:00\"); convenio.md No encontrado",
"comprobable": "Sí: N = 10 h en el cómputo"
},
{
"id": "turnosConNoches",
"tema": "Noches",
"regla": "Hacen noches los turnos L-D de mañana, tarde y rotatorio; no las hacen P, C, la línea 900 ni las personas exentas.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023); encuestas.md §2.1 (no hacen noches: línea 900, mayores de 50, PES, C y P)",
"comprobable": "Sí: en P, C y 9M/900M, N = 0"
},
{
"id": "nochesAnuales",
"tema": "Noches",
"regla": "Número de noches de oficio por persona y año.",
"valor": "Sevilla: 14-18 (P.41 v8); el modelo 2-2-3 y los cuadrantes dan 14",
"ambito": "TA+SUP · Sev; TA Mál desde 2024",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §1.2: \"entre 14 y 18 noches anuales\"); correos-eml.md §5 (modelo 2-2-3: 14); horarios-sevilla-2027.md §3 (104 personas con 14)",
"comprobable": "Sí: contar N* (sin cesiones) en 14-18"
},
{
"id": "noches14DeOficio",
"tema": "Noches",
"regla": "La empresa asigna 14 noches de oficio a quien hace noches por su turno.",
"valor": "14",
"ambito": "TA+SUP · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §3; horarios-malaga-2026-2027.md §3 (59 personas con 14); correos-eml.md §4 (CGT 2024: \"la media de noches es 14\")",
"comprobable": "Sí: N* = 14"
},
{
"id": "nochesMalagaAntiguas",
"tema": "Noches",
"regla": "Málaga (sistema 2019-2023): 21-22 noches TA y 30-32 SUP en M y T.",
"valor": "21-22 / 30-32",
"ambito": "TA+SUP · Mál",
"estado": "dudosa",
"fuente": "convenio.md §4 (P.41 v8); superado por el acuerdo de 23-06-2023 para TA (\"turnos… de Málaga quedan igualados a los de Sevilla\"); no consta para SUP",
"comprobable": "Sí: aviso si una fila de Málaga se acerca a esas cifras"
},
{
"id": "tope14Noches",
"tema": "Noches",
"regla": "Máximo de 14 noches al año de oficio, como tope real.",
"valor": "≤ 14",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.4; plan-de-trabajo.md Fase 2; correos-comite.md §6 (56,9 % \"No hacer más de 14 noches\", 2025)",
"comprobable": "Sí: N* ≤ 14 (salvo cesiones voluntarias)"
},
{
"id": "bloques223",
"tema": "Noches",
"regla": "Las noches se hacen en bloques 2-2-3: bloques de 2 que empiezan en lunes o miércoles y bloques de 3 de viernes a domingo.",
"valor": "2-2-3 (14 = 4 bloques de 2 + 2 de 3)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023: \"Bloques 2-2-3\"); cobertura-pg.md §4.1 (\"3 desde 2023\"); horarios-anteriores.md §5-6 (bloques L-M, X-J y V-S-D)",
"comprobable": "Sí: agrupar N consecutivas; cada bloque de 2 empieza L o X y cada bloque de 3 en V"
},
{
"id": "bloques43Antiguo",
"tema": "Noches",
"regla": "Bloques de 4 y 3 noches en Sevilla.",
"valor": "4+3",
"ambito": "TA+SUP · Sev",
"estado": "dudosa",
"fuente": "convenio.md §4 (P.41 v8); correos-eml.md Dudas 1 (aún en el anexo de junio de 2023); superado por 2-2-3",
"comprobable": "—"
},
{
"id": "maxNochesSeguidasOficio",
"tema": "Noches",
"regla": "Máximo de noches seguidas en el cuadrante de oficio.",
"valor": "3 (por el modelo 2-2-3)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1; encuestas.md §3 (\"con 2+2+3, como mucho 3 seguidas\")",
"comprobable": "Sí: racha máxima de N ≤ 3"
},
{
"id": "descansoTrasBloqueNoche",
"tema": "Noches",
"regla": "Días libres tras un bloque de noches.",
"valor": "práctica: 3 o 5 días; reivindicación: al menos 2",
"ambito": "TA · Sev",
"estado": "práctica de la empresa",
"fuente": "horarios-anteriores.md §5-6 (3 libres en 761 casos, 5 en 602); informe-planificacion.md §9.4 (\"con 2 días libres después\")",
"comprobable": "Sí: días sin turno tras el último N del bloque"
},
{
"id": "exencionNochesMayores50",
"tema": "Noches",
"regla": "Las personas mayores de 50 años pueden optar voluntariamente por no hacer noches; se comunica en marzo del año anterior al que se cumplen los 50, tiene vigencia anual y se puede revocar avisando en marzo.",
"valor": "> 50 años; voluntaria; anual",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §4; no está en el convenio); acuerdos-comision.md 2018 (plazo para 2019)",
"comprobable": "Sí, si la ficha trae la opción: N = 0 si está acogida"
},
{
"id": "exencionNochesMayores55",
"tema": "Noches",
"regla": "Exención o tope de noches a partir de los 55 años.",
"valor": "sin fuente",
"ambito": "—",
"estado": "dudosa",
"fuente": "No aparece (convenio.md No encontrado: búsqueda \"55 años\")",
"comprobable": "—"
},
{
"id": "exencionNochesAlConvenio",
"tema": "Noches",
"regla": "Llevar al convenio la exención de noches para mayores de 50.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.5; plan-de-trabajo.md Fase 5",
"comprobable": "—"
},
{
"id": "nochesEmbarazo",
"tema": "Noches",
"regla": "Durante el embarazo se puede no hacer trabajo nocturno ni a turnos, cobrando el 100 % de los complementos de nocturnidad.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (art. 55; Plan de Igualdad 6.1)",
"comprobable": "No (dato de salud: no tratar en la app)"
},
{
"id": "nochesEspeciales",
"tema": "Noches",
"regla": "Noches especiales (Semana Santa, Feria de Sevilla, Semana Blanca, Feria de Málaga y Navidad del 23-12 al 6-01): primero voluntariado y, si no basta, sorteo; quedan exentos quien no hace noches por su turno, quien ya hizo alguna desde 2019 y los mayores de 50 que no hacen noches.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §4.2); correos-buzon.md §2.6 (sorteo 2026, 9 plazas por noche)",
"comprobable": "No (necesita el historial)"
},
{
"id": "nocheNochebuenaVieja",
"tema": "Noches",
"regla": "En Nochebuena y Nochevieja hay un teleasistente más por central.",
"valor": "10 en Sevilla, 8 en Málaga",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §4.2.4); horarios-anteriores.md §7",
"comprobable": "Cuadrante global: contar N el 24 y el 31 de diciembre"
},
{
"id": "cesionNochesAntes",
"tema": "Noches",
"regla": "Con el horario sin publicar, la cesión de noches se hace por listas, en bloques completos, con un máximo de noches recibidas.",
"valor": "máx. 7 recibidas",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §9); acuerdos-comision.md 2021 (todas las secciones rechazan suprimirla)",
"comprobable": "Sí: N recibidas ≤ 7, es decir, N* ≤ 14 + 7 = 21"
},
{
"id": "cesionNochesDespues",
"tema": "Noches",
"regla": "Con el horario publicado, se pueden ceder de 1 a 7 noches a una persona concreta, avisando con al menos 15 días.",
"valor": "1-7 noches; 15 días",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 (P.41 v8 §9)",
"comprobable": "No (trámite)"
},
{
"id": "receptoresNoches",
"tema": "Noches",
"regla": "En la práctica hay personas con 26-30 noches (receptoras de noches cedidas), por encima de 14 + 7.",
"valor": "Sevilla 2027: 73 con 26-28; Málaga 2027: unas 66 con 27-30",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §3; horarios-malaga-2026-2027.md §3; horarios-anteriores.md Dudas 3 (\"28 noches supera 14 + 7\")",
"comprobable": "Sí: aviso si N* > 21"
},
{
"id": "cesionTope30",
"tema": "Noches",
"regla": "Limitar la cesión a un máximo de 30 noches por horario anual.",
"valor": "30",
"ambito": "TA · ambas",
"estado": "dudosa",
"fuente": "acuerdos-comision.md 2021 (propuesta del SAT en el Anexo IV; no consta acuerdo)",
"comprobable": "Sí: N* ≤ 30 si se adoptara"
},
{
"id": "bolsaNochesMax",
"tema": "Noches",
"regla": "Por bolsa se ofrecen como máximo 3 turnos de noche a la misma persona (4 hasta 2022); encadenar más es voluntario, con un tope de 7 seguidas.",
"valor": "3 ofrecidos (desde 2023); ≤ 7 seguidas",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §4.1 (Procedimiento 5/22: \"como máximo 4 turnos de noches (3 desde 2023)… máximo 7 turnos de noches seguidas\")",
"comprobable": "Sí (cuadrante vivido): racha de N ≤ 7"
},
{
"id": "reduccionNocheCompleta",
"tema": "Noches",
"regla": "Quien tiene reducción por guarda legal y acepta una noche de bolsa la hace completa.",
"valor": "—",
"ambito": "TA · ambas · reducciones",
"estado": "norma vigente",
"fuente": "convenio.md §10 (P.41); cobertura-pg.md §4.1",
"comprobable": "Sí: N de 10 h aunque la H. SEMANAL < 35"
},
{
"id": "nochesMalagaT1",
"tema": "Noches",
"regla": "En Málaga 2027 el T1 casi no tiene noches y M2 hace el doble.",
"valor": "T1 mediana 0; M2 mediana 28",
"ambito": "TA · Mál",
"estado": "práctica de la empresa",
"fuente": "horarios-malaga-2026-2027.md §2-3",
"comprobable": "Sí: comparar N* por grupo"
},
{
"id": "nochesSupervision",
"tema": "Noches",
"regla": "Supervisores: noches por persona y año.",
"valor": "Sevilla 14-18 (P.41) / 14 de mediana en 2027; Málaga 30-32 (P.41 v8)",
"ambito": "SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 y §11; horarios-supervisores-sevilla-2027.md §2 (5 personas con 24-54)",
"comprobable": "Sí: N* por fila"
},
{
"id": "finesUnoDeTres",
"tema": "Fines de semana",
"regla": "Los turnos L-D trabajan 1 de cada 3 fines de semana.",
"valor": "1/3 ≈ 17 al año",
"ambito": "TA · ambas · L-D (incluido P)",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023, Sevilla y Málaga); acuerdos-comision.md §2 (anexo I 2017); horarios-anteriores.md §6 (CGT: \"17 fines de semana de trabajo y 35 de descanso\")",
"comprobable": "Sí: contar semanas con algún turno en S o D; ≤ 17"
},
{
"id": "fines17Mas2Nocturnos",
"tema": "Fines de semana",
"regla": "La empresa interpreta que se trabajan 17 fines de semana diurnos más 2 nocturnos (19) para quien hace noches sin cesiones.",
"valor": "19",
"ambito": "TA · ambas · con noches",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §4 (Jefatura, 15-11-2023)",
"comprobable": "Sí: fines con turno de día ≤ 17 y con N ≤ 2"
},
{
"id": "finesRealesCuadrante",
"tema": "Fines de semana",
"regla": "En la práctica se trabajan 18 o más fines de semana (el 91 % en Sevilla 2027; 20-23 vividos en Málaga 2026).",
"valor": "Sevilla 2027: 18 (136), 19 (39), 20 (46), 21 (12)",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "horarios-sevilla-2027.md §4; horarios-malaga-2026-2027.md §2",
"comprobable": "Sí: mismo recuento"
},
{
"id": "finesTopeReal",
"tema": "Fines de semana",
"regla": "1 de cada 3 fines de semana como máximo real, no de media (17 al año).",
"valor": "≤ 17",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.4; informe-completo-seccion.md §9.4; analisis-informe-consultora.md §5",
"comprobable": "Sí: ≤ 17"
},
{
"id": "finesMalagaAntiguos",
"tema": "Fines de semana",
"regla": "Málaga (sistema 2019-2023): M y T 2 de cada 4; R1 1 de cada 4; R2 y P 1 de cada 3.",
"valor": "2/4, 1/4, 1/3",
"ambito": "TA · Mál",
"estado": "dudosa",
"fuente": "convenio.md §3 (P.41 v8); superado por el acuerdo de 23-06-2023",
"comprobable": "—"
},
{
"id": "finesSupervision",
"tema": "Fines de semana",
"regla": "Supervisores: fines de semana trabajados al año.",
"valor": "Sevilla M/T 12/13 (P.41) y 13 en 2027 (1 de cada 4); Málaga M/T 21/22, R1 13, R2 17/18, P 18 (P.41 v8)",
"ambito": "SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §11; horarios-supervisores-sevilla-2027.md §2; correos-eml.md §5 (premisas de 2022: \"12/13 fines de semana al año\")",
"comprobable": "Sí: contar fines trabajados"
},
{
"id": "finesFDMinimo",
"tema": "Fines de semana",
"regla": "Fijos discontinuos: al menos 1 fin de semana de descanso de cada 4 en verano y Navidad.",
"valor": "≥ 1 libre de cada 4",
"ambito": "TA · ambas · FD",
"estado": "dudosa",
"fuente": "correos-buzon.md §2.4 (propuesta de la Agencia, 22-10-2025; no consta aprobación)",
"comprobable": "Sí: en cada ventana de 4 semanas de verano o Navidad, ≥ 1 fin libre"
},
{
"id": "finesFDTodos",
"tema": "Fines de semana",
"regla": "Al turno RFD se le hace trabajar todos los fines de semana y mezclar mañanas y tardes en la misma semana.",
"valor": "todos",
"ambito": "TA · Sev · FD",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §2.4 (T002, 29-01-2026)",
"comprobable": "Sí: fines trabajados en el periodo de contrato"
},
{
"id": "finesSeguidosMax",
"tema": "Fines de semana",
"regla": "Como mucho 2 fines de semana seguidos trabajados: el fin de semana libre llega, como tarde, a la tercera semana.",
"valor": "2 (97 % en Sevilla y 98 % en Málaga)",
"ambito": "TA · ambas · lunes a domingo",
"estado": "práctica de la empresa",
"fuente": "Cuadrantes de teleasistentes de 2027, estudio del 20-11-2026 (horario-actual-2027-patrones.md §3)",
"comprobable": "Sí: racha de fines trabajados"
},
{
"id": "finLibreCadaMes",
"tema": "Fines de semana",
"regla": "Al menos un fin de semana libre completo (sábado y domingo sin turno) cada mes.",
"valor": "≥ 1 al mes (99 % en Sevilla y 100 % en Málaga en 2027)",
"ambito": "TA · ambas · lunes a domingo",
"estado": "práctica de la empresa",
"fuente": "Cuadrantes de teleasistentes de 2027 (horario-actual-2027-patrones.md §3). La sección lo pide para el modelo nuevo el 20-11-2026: «un fin de semana al mes como el horario que tenemos ahora»",
"comprobable": "Sí: fines sin turno por mes"
},
{
"id": "finesCompletos2027",
"tema": "Fines de semana",
"regla": "El fin de semana se trabaja entero: sábado y domingo, o ninguno de los dos.",
"valor": "menos del 1 % de fines partidos",
"ambito": "TA · ambas · lunes a domingo",
"estado": "práctica de la empresa",
"fuente": "Cuadrantes de teleasistentes de 2027 (horario-actual-2027-patrones.md §3)",
"comprobable": "Sí: fines con un solo día de turno"
},
{
"id": "ciclo12Semanas2027",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "El rotatorio sigue un ciclo de 12 semanas: 9 de mañana y 3 de tarde, con 5 fines de semana trabajados cada 12 semanas. Las noches se reparten aparte, persona a persona.",
"valor": "M- M- TT M- MM MM T- M- MT M- T- MM",
"ambito": "TA · ambas · R",
"estado": "práctica de la empresa",
"fuente": "Cuadrantes de teleasistentes de 2027 (horario-actual-2027-patrones.md §2)",
"comprobable": "Sí: tipo de semana del cuadrante"
},
{
"id": "semanasUnDiaLibre2027",
"tema": "Descansos",
"regla": "En el horario de 2027 casi todo el personal tiene semanas (lunes a domingo) con un solo día libre: mediana de 4 al año en Sevilla y 6 en Málaga.",
"valor": "4 (Sevilla) · 6 (Málaga)",
"ambito": "TA · ambas · lunes a domingo",
"estado": "práctica de la empresa",
"fuente": "Cuadrantes de teleasistentes de 2027 (horario-actual-2027-patrones.md §4)",
"comprobable": "Sí: días sin turno por semana"
},
{
"id": "finesCambioAlternancia",
"tema": "Fines de semana",
"regla": "En cada horario se cambia la alternancia de fines de semana del rotatorio para no trabajar siempre los mismos festivos (según CGT, solo se aplicó al R1).",
"valor": "—",
"ambito": "TA · Sev · R",
"estado": "dudosa",
"fuente": "correos-eml.md §6 (delegada CGT, diciembre de 2022)",
"comprobable": "No (compara años)"
},
{
"id": "rotacion3M1T",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "El rotatorio sigue el modelo de 3 semanas de mañana y 1 de tarde.",
"valor": "3M + 1T (≈ 131-137 mañanas y 60-66 tardes al año)",
"ambito": "TA+SUP · ambas · R",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023: \"3 semanas de mañana, 1 semana de tarde\"); horarios-anteriores.md §6 (CGT: \"131 mañana, 66 tardes y 14 noches\")",
"comprobable": "Sí: clasificar cada semana por su turno predominante y comprobar la secuencia 3+1"
},
{
"id": "rotacionIrregular",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "En la práctica la rotación no es estricta (en 2024, 31 semanas de mañana, 13 de tarde y 8 mixtas).",
"valor": "—",
"ambito": "TA · Sev · R",
"estado": "práctica de la empresa",
"fuente": "horarios-anteriores.md §6; correos-eml.md §4 (CGT: \"No se cumple la rotación de 3 de mañana y una tarde\")",
"comprobable": "Sí: mismo recuento"
},
{
"id": "finesAlternosMT",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Los fines de semana del rotatorio alternan mañana y tarde (\"uno de mañana y el siguiente de tarde\"), aunque no coincida con la semana.",
"valor": "alternos",
"ambito": "TA · Sev · R",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §4 (Jefatura, 15-11-2023); horarios-sevilla-2027.md §5 (125 de 125 filas con 2-4 fines de tarde en semanas de mañana)",
"comprobable": "Sí: fines de RT en semanas RM"
},
{
"id": "finesCoherentesSemana",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "En el rotatorio, el fin de semana va en el mismo turno que la semana (sin tardes de fin de semana en semanas de mañana).",
"valor": "0 fines de tarde en semana de mañana",
"ambito": "TA · ambas · R",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.4; plan-de-trabajo.md Fase 4; correos-eml.md §4 (CGT 2024)",
"comprobable": "Sí: para cada fin trabajado, turno del S/D = turno predominante de L-V de esa semana"
},
{
"id": "plusRotatorio70",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Para cobrar el plus de turno rotatorio hay que hacer al menos el 70 % de las jornadas de mañana y de tarde de cada semestre; la IT de más de 21 días, las vacaciones y los permisos cuentan como trabajo efectivo; los decimales de hasta 0,50 se redondean a la baja.",
"valor": "≥ 70 % por semestre; 20,50 → 20",
"ambito": "TA+SUP · ambas · R",
"estado": "norma vigente",
"fuente": "convenio.md §15 (art. 43.8; P.41 §12; Acta 30-1-19)",
"comprobable": "Sí: por semestre, RM y RT hechas (contando V y permisos) ≥ 70 % de las del modelo"
},
{
"id": "plusRotatorioImportes",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Importe del plus de turno rotatorio (12 pagas).",
"valor": "ROT. I 1.680 €; ROT. II 1.945,80 € (2018)",
"ambito": "TA · ambas · R",
"estado": "norma vigente",
"fuente": "convenio.md §15 (tabla 5)",
"comprobable": "No (nómina)"
},
{
"id": "plusRotatorioSin70",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Eliminar el requisito del 70 % del plus rotatorio.",
"valor": "—",
"ambito": "TA · ambas · R",
"estado": "reivindicación CGT/comité",
"fuente": "acuerdos-comision.md 2021 (CGT durante la COVID); encuestas.md §2.5 (T003); correos-eml.md §8 (C-T004)",
"comprobable": "—"
},
{
"id": "plusRotativoRevision",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "La revisión del plus rotativo iría con la modificación del convenio desde enero de 2027; el nuevo turno debe mejorar, o como mínimo mantener, las condiciones del rotativo.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-comite.md §1 (CGT, 18/19-11-2026); informe-completo-seccion.md §1",
"comprobable": "—"
},
{
"id": "plusTardePartido",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Complemento de turno de tarde (solo sistema de turnos L-D y personal de turno de tarde) y de partido.",
"valor": "tarde 1.320 €/año; partido 960 €/año",
"ambito": "TA · ambas · T1/T2 y P",
"estado": "norma vigente",
"fuente": "convenio.md §15 (arts. 43.9 y 43.10; tabla 5); acuerdos-comision.md §3 (Acta CP 16)",
"comprobable": "No (nómina)"
},
{
"id": "plusesPorHora",
"tema": "Rotatorio: coherencia de la semana y plus",
"regla": "Pluses por hora efectiva: nocturnidad (acumulable al de fin de semana o festivo), fin de semana, festivo ordinario y festivo especial (estos tres, incompatibles entre sí: se cobra el mayor); devengo del 16 al 15.",
"valor": "4,65 / 2,33 / 4,00 / 7,00 €/h (2018)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §4 y §6 (art. 43.7 y tabla 7). Los importes de 2026 (5,58 / 2,81…) no tienen fuente oficial",
"comprobable": "Sí: horas N, horas en S/D, horas en festivo y en festivo especial (para estimar pluses)"
},
{
"id": "descansoEntreJornadas",
"tema": "Descansos",
"regla": "Entre el final de una jornada y el inicio de la siguiente deben pasar al menos 12 h.",
"valor": "≥ 12 h",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §5 (art. 28.3)",
"comprobable": "Sí: con las horas de cada código, hueco entre fin de un turno e inicio del siguiente ≥ 12 h (p. ej. T2 23:00 → M1 07:45 = 8 h 45 min, incumple)"
},
{
"id": "descansoReducido7h",
"tema": "Descansos",
"regla": "En cambios de turno y coberturas por bolsa el descanso puede bajar a 7 h, compensando la diferencia en los días siguientes (versión 2021; la v8 no exige compensación).",
"valor": "≥ 7 h",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §5 y Dudas 1 (P.41; cita al RD 1561/1995, escrito \"1561/1965\"); acuerdos-comision.md 2021 (09-02-2021); cobertura-pg.md §4.1",
"comprobable": "Sí (cuadrante vivido): ningún hueco < 7 h; los de 7-12 h, solo en cambios o bolsa"
},
{
"id": "descansoSemanal36h",
"tema": "Descansos",
"regla": "Descanso semanal de 36 h ininterrumpidas (día y medio), acumulable por periodos de hasta 14 días; en turnos, el medio día se puede acumular hasta 4 semanas o separarse del día completo.",
"valor": "36 h; 14 días; 4 semanas",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §5 (art. 28.4)",
"comprobable": "Sí: en cada ventana de 14 días, ≥ 2 periodos de 36 h sin turno (o el equivalente acumulado)"
},
{
"id": "maxDiasSeguidos",
"tema": "Descansos",
"regla": "Máximo de días de trabajo seguidos.",
"valor": "sin fuente normativa (la app usa 6); se deriva solo del art. 28.4",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "No hay cifra en las fuentes. Referencias: el patrón de la consultora tiene un máximo de 5 (analisis-informe-consultora.md §1); CGT pide \"R2 sin semanas de 6 días\" (acuerdos-comision.md 2020-2021)",
"comprobable": "Sí, técnicamente: racha máxima de días con turno"
},
{
"id": "dosDiasDescansoSemana",
"tema": "Descansos",
"regla": "Descanso mínimo de 2 días por semana.",
"valor": "2 días/semana",
"ambito": "TA · Sev",
"estado": "reivindicación CGT/comité",
"fuente": "correos-comite-completo.md §2 (contrapropuesta del Comité de Sevilla, 23-03-2017, punto 8)",
"comprobable": "Sí: días sin turno por semana ≥ 2"
},
{
"id": "noAbandonarHastaRelevo",
"tema": "Descansos",
"regla": "No se puede dejar el puesto hasta que llegue el relevo; la persona responsable decide quién prolonga la jornada.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §2 (art. 31.4)",
"comprobable": "No"
},
{
"id": "conciliacionPlanificacion",
"tema": "Descansos",
"regla": "El horario del SAT depende de las necesidades del servicio, con una planificación previa compatible con la vida personal y familiar.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §2 (art. 30.2)",
"comprobable": "No"
},
{
"id": "minimosConsenso",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Los mínimos se fijan por tramo horario y tipo de día con las llamadas entrantes, las simultáneas y algunas salientes, y cambiarlos exige consenso en la Comisión de turnos.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.1 (P.41 v8 §1.3.1: \"se consensuará en la Comisión\"); correos-comite-completo.md §3",
"comprobable": "No"
},
{
"id": "minimosSevilla2013",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Tabla de mínimos de Sevilla (Anexo 2, \"Mínimos SAT 2013\").",
"valor": "punta 09:45-14:30: 47 / 39 / 29; tarde 16:45-20:00: 37 / 29 / 28; noche 23:00-07:30: 8 / 8 / 8; tabla completa de 19 tramos en la fuente",
"ambito": "TA · Sev",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.2",
"comprobable": "Cuadrante global: personas por tramo ≥ mínimo"
},
{
"id": "minimosSevillaNoche9",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "La hoja de mínimos de la Agencia de junio de 2023 da 9 de noche en Sevilla (y 9 de 07:30 a 08:00) y algunos tramos distintos (16:45-19:45: 37; 19:45-21:30: 30; 21:30-22:00: 19).",
"valor": "noche 9 / 9 / 9",
"ambito": "TA · Sev",
"estado": "dudosa",
"fuente": "correos-eml.md §7; calculo-minimos.md (\"Hay que aclarar cuál está vigente\")",
"comprobable": "Cuadrante global"
},
{
"id": "minimosMalaga2013",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Tabla de mínimos de Málaga del Anexo 2 (\"Mínimos SAT 2013\"), que el P.41 da como vigente.",
"valor": "punta 09:45-14:30: 40 / 33 / 26; tarde 16:45-20:00: 31 / 25 / 24; noche 23:00-07:30: 7 / 7 / 7. La hoja \"hasta el 14-10-2026\" del cuadrante de 2026 difiere en algunos tramos (p. ej. tarde 30 / 24 / 23; 08:30-09:15: 20 / 18 / 13 frente a 22 / 19 / 14)",
"ambito": "TA · Mál",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.2; horarios-malaga-2026-2027.md §4",
"comprobable": "Cuadrante global: personas por tramo ≥ mínimo"
},
{
"id": "minimosMalaga2026",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Málaga aplica una tabla nueva desde el 15-10-2026, sin acuerdo en la Comisión.",
"valor": "punta 46 / 35 / 28; tarde 32 / 26 / 25; noche 8 / 8 / 8; tabla completa de 21 tramos en la fuente",
"ambito": "TA · Mál",
"estado": "práctica de la empresa",
"fuente": "horarios-malaga-2026-2027.md §4 (\"MÍNIMOS CENTRAL MALAGA A PARTIR DEL 15/10/2026\")",
"comprobable": "Cuadrante global: 2027 tiene 19 noches por debajo de 8"
},
{
"id": "minimosSevillaVerano2025",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "En verano de 2025 Sevilla aplicó mínimos de tarde de fin de semana más altos, sin acuerdo.",
"valor": "sábado tarde 35 (en vez de 29); domingo tarde 34 (en vez de 28)",
"ambito": "TA · Sev",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §2.5; correos-comite-completo.md §3 (denuncia ante la Inspección, 25-06-2025)",
"comprobable": "Cuadrante global"
},
{
"id": "minimosRetirarSubidas",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Retirar las subidas unilaterales y recalcular los mínimos con datos y nivel de servicio explícito, con margen también de noche.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.2; informe-completo-seccion.md §9.2; calculo-minimos.md",
"comprobable": "—"
},
{
"id": "minimosSabadoIgualDomingo",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Igualar el mínimo de sábados y festivos locales al de domingos y festivos autonómicos; tramo 22:00-22:15 con 14.",
"valor": "—",
"ambito": "TA · Sev",
"estado": "reivindicación CGT/comité",
"fuente": "correos-comite-completo.md §2 (CCOO-CGT, 2018); correos-eml.md §7 (UGT pide igualar el sábado al domingo)",
"comprobable": "—"
},
{
"id": "minimosTramos15",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Tramos de 15 minutos con un tope de 2 teleasistentes menos por tramo para conceder licencias.",
"valor": "−2 por tramo de 15 min",
"ambito": "TA · ambas",
"estado": "dudosa",
"fuente": "correos-comite-completo.md §4 (comentario del borrador v7 del P.41, 2018)",
"comprobable": "—"
},
{
"id": "denegacionPor15Min",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Se deniegan permisos por no llegar al mínimo durante 15 minutos; los sindicatos piden que solo se deniegue si el incumplimiento dura 1 h.",
"valor": "1 h",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "cobertura-pg.md §2 (Anexo IV, 2021); acuerdos-comision.md 2020",
"comprobable": "—"
},
{
"id": "minimosLinea900",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Mínimos de la línea 900.",
"valor": "7 M + 1 T (5 M + 1 T en periodos especiales), 2019; hoy 4 de mañana",
"ambito": "TA · Sev · 900",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2019 (19-03-2019); correos-eml.md §7 (CCOO, 14-12-2023)",
"comprobable": "Cuadrante global"
},
{
"id": "minimosNocheSinMargen",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "De noche el mínimo coincide con la dotación del turno, sin margen para ausencias.",
"valor": "margen 0",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "cobertura-pg.md §1.2 (cálculo propio); analisis-informe-consultora.md §2",
"comprobable": "Cuadrante global: N por noche frente al mínimo"
},
{
"id": "permisosSujetosMinimos",
"tema": "Mínimos de sala por franja y tipo de día",
"regla": "Vacaciones, AP, cambios, cesiones de noches y devoluciones de horas están sujetos a los mínimos; la bolsa de conciliación del 35.12, no.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.5 (P.41 v8; Acta CP 14: \"no incluir la referencia a los mínimos de sala\")",
"comprobable": "No"
},
{
"id": "ratioSupervision",
"tema": "Supervisión",
"regla": "Un supervisor/a por cada 16 teleasistentes en cada momento; el decimal se redondea a la baja desde 0,5 inclusive.",
"valor": "1:16; 72/16 = 4,5 → 4; 73/16 = 4,56 → 5",
"ambito": "SUP · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.3 (P.41 v8 §1.3.2); correos-comite-completo.md §4 (borrador 2018)",
"comprobable": "Cuadrante global: SUP por franja ≥ redondeo(TA/16)"
},
{
"id": "ningunTurnoSinSupervision",
"tema": "Supervisión",
"regla": "No habrá ningún turno sin supervisión.",
"valor": "≥ 1 SUP por turno (también de noche)",
"ambito": "SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §11; cobertura-pg.md §1.3",
"comprobable": "Cuadrante global: Sevilla 2027 tiene 39 noches sin supervisor"
},
{
"id": "supervisionFinDeSemana",
"tema": "Supervisión",
"regla": "En Sevilla, fines de semana y festivos: 3 supervisores de mañana, 2 de tarde y 1 de noche.",
"valor": "3 / 2 / 1",
"ambito": "SUP · Sev",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.3 (procedimiento de suplente, 2019); correos-comite-completo.md §4 (borrador 2018); correos-eml.md §5 (premisas 2022)",
"comprobable": "Cuadrante global"
},
{
"id": "supervisorSuplente",
"tema": "Supervisión",
"regla": "Hay un supervisor suplente por fin de semana, festivo y turno (mañana y tarde); entra si la ausencia no se cubre por bolsa (más de 48 h: disponibilidad; menos de 48 h: horas extra).",
"valor": "1 por turno",
"ambito": "SUP · Sev (en Málaga no hay retén, 2018)",
"estado": "norma vigente",
"fuente": "convenio.md §11 (P.41 v8; Acta 30-1-19); acuerdos-comision.md 2018",
"comprobable": "Sí: marcas sm/st en fines y festivos (hoja RETEN)"
},
{
"id": "ratio1a20",
"tema": "Supervisión",
"regla": "Cambiar la ratio a 1/20.",
"valor": "1:20",
"ambito": "SUP · ambas",
"estado": "dudosa",
"fuente": "cobertura-pg.md §1.3 (UGT-CCOO, Anexo IV 2021); acuerdos-comision.md Dudas (el anexo III de 2017 parece decir \"TA/10\")",
"comprobable": "—"
},
{
"id": "supervisionMananaFinde4",
"tema": "Supervisión",
"regla": "Subir a 4 los supervisores de mañana en fin de semana.",
"valor": "4",
"ambito": "SUP · Sev",
"estado": "reivindicación CGT/comité",
"fuente": "cobertura-pg.md §1.3 (grupo de supervisores, 2021)",
"comprobable": "—"
},
{
"id": "supervisionCyT",
"tema": "Supervisión",
"regla": "En Sevilla, la supervisión C y T no puede coincidir más de 2 días.",
"valor": "2 días",
"ambito": "SUP · Sev",
"estado": "dudosa",
"fuente": "acuerdos-comision.md 2019 (19-03-2019; sentido no claro)",
"comprobable": "—"
},
{
"id": "supervisoresMalaga",
"tema": "Supervisión",
"regla": "Faltan 5 supervisores en Málaga para igualar horarios según el acuerdo firmado; 2 de tarde en Sevilla.",
"valor": "5 / 2",
"ambito": "SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-comite-completo.md §9 (17-11-2025)",
"comprobable": "—"
},
{
"id": "modelosSoloConAcuerdo",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Los modelos y particularidades de los turnos de los servicios 24 h no pueden modificarse sin acuerdo en la Comisión de turnos.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §14 (art. 31.1)",
"comprobable": "No"
},
{
"id": "horariosTurnos2027",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Horarios vigentes de cada código.",
"valor": "M1 07:45-14:45; M2 08:00-15:00; RM1/RT1 08:15-15:15 / 15:00-22:00; T1 15:00-22:00; T2 16:00-23:00; C1 09:00-16:00; P1 09:45-14:30 y 16:15-19:30; N 22:00-08:00; RM1.FD/RT1.FD 08:00-15:00 / 15:00-22:00",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023 y mesa técnica 06-06-2023); horarios-malaga-2026-2027.md §1 (NOMENCLATURAS 2027); horarios-sevilla-2027.md",
"comprobable": "Sí: cada código de la fila existe en la leyenda"
},
{
"id": "variantes30h",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Variantes de 30 h y códigos numerados para jornadas reducidas.",
"valor": "p. ej. M1(30H) 07:45-13:45; RM(30H) 09:00-15:00",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1; leyenda-codigos.md §2 (M13…, RM11…, \"solo aparecen en filas con H. SEMANAL inferior a 35 h\")",
"comprobable": "Sí: códigos reducidos solo en filas < 35 h"
},
{
"id": "plazasPorTurno",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Plazas por turno de teleasistentes.",
"valor": "Sevilla 269 (M1 33, M2 20, T1 29, T2 19, R 134, P 7, C 27); Málaga 225 (M1 31, M2 50, T1 30, T2 15, R 89, P 5, C 5)",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023)",
"comprobable": "Cuadrante global: filas por grupo"
},
{
"id": "ochentaPlazasManana",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "En Sevilla siempre habrá 80 plazas fijas de mañana (C + M1 + M2).",
"valor": "80",
"ambito": "TA · Sev",
"estado": "norma vigente",
"fuente": "correos-eml.md §1-2 (acta 23-06-2023; CCOO, 29-08-2023)",
"comprobable": "Cuadrante global"
},
{
"id": "turnoCAExtinguir",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "El turno C es a extinguir y sus plazas pasan a M1/M2.",
"valor": "—",
"ambito": "TA · ambas · C",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023)",
"comprobable": "No"
},
{
"id": "igualacionMalagaSevilla",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Málaga debía igualar descansos con Sevilla (acuerdo de 2017); en 2023 se igualaron los turnos. CGT sostiene que se debían igualar los descansos, no los turnos.",
"valor": "—",
"ambito": "TA · Mál",
"estado": "reivindicación CGT/comité",
"fuente": "acuerdos-comision.md 2017 (compromisos para Málaga); correos-eml.md §1 (votación 23-06-2023)",
"comprobable": "—"
},
{
"id": "criteriosAsignacion",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Criterios para asignar turno: necesidades del servicio, antigüedad en el puesto (solo supervisores), antigüedad en el SAT, letra del año y preferencias; quien no consigue el turno pedido se queda en el suyo.",
"valor": "orden fijo",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §12 (P.41 v8 §4); correos-eml.md §2",
"comprobable": "No"
},
{
"id": "letraDelAnio",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "La letra se sortea el 1 de marzo (o en marzo) y el orden es ascendente o descendente según el año sea par o impar.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §12; correos-eml.md §2 (Jefatura, 29-06-2023)",
"comprobable": "No"
},
{
"id": "preferenciasEstructuraPrimero",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Las preferencias del personal de estructura se ejecutan antes de asignar turno al personal nuevo.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-buzon.md §2.3 (CCOO, \"tal y como marca el acuerdo de horarios\")",
"comprobable": "No"
},
{
"id": "interinosSinCambio",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "El personal interino no puede cambiar de turno durante su contrato.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §2 (RRHH, acta 23-06-2023)",
"comprobable": "No"
},
{
"id": "turnosFijosPorAntiguedad",
"tema": "Modelos de turno vigentes, plazas y asignación",
"regla": "Mantener la opción de turnos fijos (mañana o tarde) por antigüedad.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.5; informe-completo-seccion.md §9.5",
"comprobable": "—"
},
{
"id": "partidoVoluntario",
"tema": "Turno partido",
"regla": "El turno partido es voluntario; las plazas sobrantes pasan al rotatorio.",
"valor": "—",
"ambito": "TA · ambas · P",
"estado": "norma vigente",
"fuente": "correos-buzon.md §2.1 (CGT, 16-05-2025: \"EL ACUERDO DE TURNOS… DICE QUE EL TURNO PARTIDO ES VOLUNTARIO\"); correos-eml.md §1",
"comprobable": "No"
},
{
"id": "partidoCondiciones",
"tema": "Turno partido",
"regla": "El partido es de lunes a domingo, sin noches, con festivos, 1 de cada 3 fines de semana y con el 6 %.",
"valor": "09:45-14:30 y 16:15-19:30",
"ambito": "TA · ambas · P",
"estado": "norma vigente",
"fuente": "correos-eml.md §1 (acta 23-06-2023)",
"comprobable": "Sí: N = 0; fines ≤ 17"
},
{
"id": "partidoAExtinguir",
"tema": "Turno partido",
"regla": "El partido es a extinguir (en Málaga quien lo tiene puede quedarse).",
"valor": "—",
"ambito": "TA · ambas · P",
"estado": "norma vigente",
"fuente": "correos-eml.md §1",
"comprobable": "No"
},
{
"id": "partidoImpuesto",
"tema": "Turno partido",
"regla": "Se impuso el partido al personal de refuerzo de tablets.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §1.1 y §2.1 (CGT, \"Al juzgado… otra vez\", 16-05-2025)",
"comprobable": "No"
},
{
"id": "turnoRFD",
"tema": "Fijos discontinuos (FD)",
"regla": "Existe un turno rotatorio para el personal fijo discontinuo, con horario para todo el periodo del contrato y plus de rotatorio.",
"valor": "24 plazas por sede (48 en total); 25 filas en Sevilla y 22 en Málaga en 2027",
"ambito": "TA · ambas · FD",
"estado": "norma vigente",
"fuente": "correos-buzon.md §2.4 (Comisión 15-07-2025, aprobado por CCOO y UGT; CGT en contra); horarios-sevilla-2027.md §1; horarios-malaga-2026-2027.md §1",
"comprobable": "No"
},
{
"id": "fdHorasYNoches",
"tema": "Fijos discontinuos (FD)",
"regla": "En Málaga 2027 el FD tiene unas 757 h, 5 noches y 16 fines de semana.",
"valor": "757 h; 5 N",
"ambito": "TA · Mál · FD",
"estado": "práctica de la empresa",
"fuente": "horarios-malaga-2026-2027.md §2",
"comprobable": "Sí: horas y N de la fila FD"
},
{
"id": "fdSinHorarioAnual",
"tema": "Fijos discontinuos (FD)",
"regla": "El FD no tiene horario anual hasta que el resto pide sus vacaciones y AP.",
"valor": "—",
"ambito": "TA · Sev · FD",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §2.4 (T002)",
"comprobable": "No"
},
{
"id": "fdIgualdad",
"tema": "Fijos discontinuos (FD)",
"regla": "Fijos discontinuos con los mismos descansos y la misma regla de fines de semana que el resto, y horario anual conocido de antemano.",
"valor": "—",
"ambito": "TA · ambas · FD",
"estado": "reivindicación CGT/comité",
"fuente": "informe-planificacion.md §9.6; informe-completo-seccion.md §9.7; correos-buzon.md §2.4 (5 motivos de CGT)",
"comprobable": "Sí: aplicar a la fila FD las mismas reglas de fines y descansos"
},
{
"id": "publicacion2Meses",
"tema": "Publicación del cuadrante",
"regla": "El cuadrante anual se publica con al menos 2 meses de antelación, abarca el año natural e incluye jornadas, descansos y horario; solo se modifica por circunstancias excepcionales.",
"valor": "≥ 2 meses (antes del 1 de noviembre)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §12 (art. 31.3)",
"comprobable": "Sí, si se registra la fecha: publicación ≤ 31-10"
},
{
"id": "publicacion1Octubre",
"tema": "Publicación del cuadrante",
"regla": "Se intentará publicar el 1 de octubre.",
"valor": "01-10",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §12 (P.41 v8 §13.1); correos-eml.md §8 (UGT pide \"Horario publicado a 01/10\")",
"comprobable": "Sí, con la fecha"
},
{
"id": "publicacionReal",
"tema": "Publicación del cuadrante",
"regla": "En la práctica se publica en noviembre, tras unos 4 días de revisión sindical.",
"valor": "2024: enviado el 03-11, publicado el 15-11-2023",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "correos-eml.md §3; correos-comite-completo.md §5; correos-buzon.md (supervisores 2027: observaciones hasta el 11-11-2026)",
"comprobable": "Sí, con la fecha"
},
{
"id": "publicacion31Octubre",
"tema": "Publicación del cuadrante",
"regla": "El cuadrante se elabora antes del 31 de octubre de cada año.",
"valor": "31-10",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "correos-eml.md §3 (mesa del convenio, 17-07-2017); correos-eml.md Dudas 3",
"comprobable": "—"
},
{
"id": "corteDeAnio",
"tema": "Publicación del cuadrante",
"regla": "El último turno del año es la noche del 31-12, que acaba a las 08:00 del 1-01.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2018 (02-10-2018; CGT en contra)",
"comprobable": "Sí: la N del 31-12 pertenece al año que acaba"
},
{
"id": "cuadrante15Enero",
"tema": "Publicación del cuadrante",
"regla": "Que el cuadrante vaya del 15 de enero al 15 de enero o cubra la Navidad completa.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "acuerdos-comision.md 2021 (rechazado \"atendiendo al convenio actual\"); correos-buzon.md §2.11 (CGT 2024)",
"comprobable": "—"
},
{
"id": "computoHorarioEnCuadrante",
"tema": "Publicación del cuadrante",
"regla": "El cuadrante debe traer el cómputo horario anual de cada persona (como en Málaga).",
"valor": "—",
"ambito": "TA · Sev",
"estado": "reivindicación CGT/comité",
"fuente": "correos-eml.md §4 (CGT 2024); informe-planificacion.md §9.7",
"comprobable": "Sí: la app debe mostrarlo por fila"
},
{
"id": "confidencialidadHorario",
"tema": "Publicación del cuadrante",
"regla": "Se puede pedir que el horario personal no se publique con el del resto.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §12 (P.41 v8 §13.2)",
"comprobable": "No"
},
{
"id": "cambioTurno48h",
"tema": "Cambios de turno y autocambios",
"regla": "Los cambios de turno se piden por escrito con al menos 48 h y los autoriza la persona responsable; los pluses los cobra quien hace el turno.",
"valor": "48 h",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §3 (art. 31.6; P.41 §8)",
"comprobable": "No"
},
{
"id": "cambioSujetoMinimos",
"tema": "Cambios de turno y autocambios",
"regla": "Los cambios de turno solo se autorizan si se cumplen los mínimos de cada turno.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §1.5",
"comprobable": "No"
},
{
"id": "cambioNoArrastre",
"tema": "Cambios de turno y autocambios",
"regla": "Los cambios de turno \"no arrastran\" el horario, salvo el partido y las reducciones por guarda legal.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "acuerdos-comision.md 2018 (nota 13-12-2018)",
"comprobable": "No"
},
{
"id": "autocambios",
"tema": "Cambios de turno y autocambios",
"regla": "Autocambios: 2 al mes por correo y 3 por AHORA; no se puede librar por autocambio en Navidad, Semana Santa, vacaciones de verano, noches, festivos ni fines de semana; a 1 mes vista.",
"valor": "2 / 3 al mes",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "correos-buzon.md §2.7 (Comisión 19-03-2025, en vigor desde el 01-04-2025); correos-comite.md §4. La v8 los prohibía (\"En ningún caso es posible la realización de autocambios\")",
"comprobable": "Sí (cuadrante vivido): autocambios por mes ≤ 3; ninguno en fechas prohibidas"
},
{
"id": "autocambiosPlazoMaximo",
"tema": "Cambios de turno y autocambios",
"regla": "Plazo máximo entre el día trabajado y el librado en un autocambio.",
"valor": "sin fuente (pendiente de fijar en el P.41)",
"ambito": "TA · ambas",
"estado": "dudosa",
"fuente": "correos-buzon.md §2.7 (Jefatura, 17-12-2025: \"por error no se aprobó\")",
"comprobable": "—"
},
{
"id": "autocambiosTodoElAnio",
"tema": "Cambios de turno y autocambios",
"regla": "Autocambios todo el año, también en vacaciones y periodos especiales.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "correos-buzon.md §2.7 (CCOO 2025-2026; CGT los pide como medida permanente desde 2021)",
"comprobable": "—"
},
{
"id": "cambioSensible",
"tema": "Cambios de turno y autocambios",
"regla": "Quien tiene adaptación horaria por ser especialmente sensible puede cambiar turnos con personas de franja similar.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §10 (Acta 30-1-19)",
"comprobable": "No"
},
{
"id": "reduccionGuardaLegal",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Reducción por guarda legal de menor de 12 años, persona con discapacidad o familiar hasta 2.º grado, de un octavo a la mitad; la concreción horaria corresponde a la persona dentro de su jornada ordinaria; preaviso de 15 días.",
"valor": "1/8 a 1/2; menor de 12 años",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §10 (art. 38.1 del convenio)",
"comprobable": "Sí: H. SEMANAL entre 17:30 y 30:37 (35 × 7/8 a 35 × 1/2) y horario dentro de la franja del turno"
},
{
"id": "reduccionMenor14",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Ampliar la edad del menor a 14 años.",
"valor": "14 años",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "convenio.md §10 (Plan de Igualdad 5.5; no consta que se aprobara)",
"comprobable": "—"
},
{
"id": "reduccionesNoGarantizadas",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Con el cambio de sistema de 2019, la empresa no garantizó las reducciones acumuladas; quien tenía 30 h y lo pidió pasó a 35 h.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "acuerdos-comision.md 2018 (02-10-2018)",
"comprobable": "No"
},
{
"id": "adaptacion348ET",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Adaptación de jornada del art. 34.8 del Estatuto de los Trabajadores.",
"valor": "sin fuente en convenio ni protocolo",
"ambito": "TA+SUP · ambas",
"estado": "dudosa",
"fuente": "convenio.md §10 y No encontrado; correos-buzon.md §2.7 (CGT se abstiene en la prevalencia del \"5 % de horas por conciliación (art. 34.8 ET)\")",
"comprobable": "No"
},
{
"id": "flexibilidadExcluyeTurnos",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "La flexibilidad horaria de hasta 2 h excluye el régimen de turnos.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §10 (art. 35.16)",
"comprobable": "No"
},
{
"id": "violenciaGeneroTurno",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Las víctimas de violencia de género pueden elegir turno.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §10 (Plan de Igualdad 7.5)",
"comprobable": "No (dato sensible)"
},
{
"id": "otrasReducciones",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Otras reducciones: hasta el 50 % retribuido 1 mes por enfermedad muy grave de familiar de 1.er grado; reducción progresiva tras tratamientos graves (50/20/10 %); lactancia de 1 h diaria o 4 semanas.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §10 (arts. 38.2, 35.10 y 35.6)",
"comprobable": "No (dato sensible)"
},
{
"id": "reducidasEnModeloNuevo",
"tema": "Reducciones y adaptaciones de jornada",
"regla": "Garantizar que las personas con jornada reducida o adaptada no quedan fuera del modelo nuevo (24 en Sevilla y 22 en Málaga).",
"valor": "—",
"ambito": "TA · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "informe-completo-seccion.md §2.4 y §9.6; escrito-peticion-documentacion.md punto 3",
"comprobable": "—"
},
{
"id": "bolsaHorasSAT",
"tema": "Bolsas de horas y de sustitución",
"regla": "Única bolsa de horas por persona (vacaciones, formación, noches, ajustes); se consume o compensa hasta el 28 de febrero del año siguiente, pidiéndolo con 48 h y respetando mínimos.",
"valor": "hasta el 28-02",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §9 (P.41 v8 §3)",
"comprobable": "Sí: saldo de bolsa por fila"
},
{
"id": "bolsaArrastre",
"tema": "Bolsas de horas y de sustitución",
"regla": "Arrastrar el saldo positivo de horas al año siguiente.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "reivindicación CGT/comité",
"fuente": "convenio.md §9 (preparación de reuniones, 2025); informe-planificacion.md §9.8",
"comprobable": "—"
},
{
"id": "bolsaConciliacion",
"tema": "Bolsas de horas y de sustitución",
"regla": "Bolsa de conciliación: hasta el 5 % de la jornada anual, recuperable en 3 meses; fracción mínima de 15 min y máxima del 50 % de la jornada diaria; se pide con 2 días; en turnos con el 6 % se recupera en días de descanso y/o entre la primera entrada de mañana y la última salida de tarde.",
"valor": "78 h 45 min sobre 1.575 h; sobre 1.480,5 h serían unas 74 h (dudoso)",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "convenio.md §9 (art. 35.12 e infografía) y Dudas 6; acuerdos-comision.md §3 (Actas CP 4, 14 y 16)",
"comprobable": "No"
},
{
"id": "bolsasSustitucion",
"tema": "Bolsas de horas y de sustitución",
"regla": "Coberturas: con más de 48 h, bolsa de disponibilidad (1 × 1, solo para quien tiene turnos L-D con noches); con 48 h o menos, horas compensatorias (1 × 1,75, abierta a todo el personal); orden por horas acumuladas, fecha y letra; prioridad a bloques; MGAI desde el 24-11-2025.",
"valor": "1 × 1 / 1 × 1,75",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §4.1 (Procedimiento 5/22); correos-buzon.md §2.6 (MGAI)",
"comprobable": "No (fuera del cuadrante planificado)"
},
{
"id": "coberturaSoloSiMinimosOrigen",
"tema": "Bolsas de horas y de sustitución",
"regla": "Una cobertura solo es posible si se cumplen los mínimos del turno de procedencia.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §4.1",
"comprobable": "No"
},
{
"id": "bolsaPenalizaciones",
"tema": "Bolsas de horas y de sustitución",
"regla": "Penalizaciones de la bolsa: no penaliza rechazar noches en periodos especiales ni llamadas con menos de 2 h; renuncia hasta 10 días laborables antes con penalización; espera de 5 min entre llamadas.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §4.1 y Dudas 5 (10 min en versiones anteriores)",
"comprobable": "No"
},
{
"id": "sustitucionBajas21",
"tema": "Bolsas de horas y de sustitución",
"regla": "Las bajas se sustituyen a partir de 21 días.",
"valor": "21 días",
"ambito": "TA · ambas",
"estado": "práctica de la empresa",
"fuente": "correos-buzon.md §2.10 (CCOO, 26-06-2025)",
"comprobable": "No"
},
{
"id": "etArt348",
"tema": "Estatuto de los Trabajadores y otras leyes citadas",
"regla": "Art. 34.8 ET (adaptación de jornada): citado, pero sin cláusula en el convenio ni en el P.41.",
"valor": "—",
"ambito": "ambos",
"estado": "dudosa",
"fuente": "convenio.md §10",
"comprobable": "No"
},
{
"id": "etArt41",
"tema": "Estatuto de los Trabajadores y otras leyes citadas",
"regla": "Art. 41 ET (modificación sustancial): base del conflicto colectivo de CGT contra la subida de mínimos de 2016.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "norma vigente",
"fuente": "cobertura-pg.md §2; correos-eml.md §7",
"comprobable": "No"
},
{
"id": "rd1561",
"tema": "Estatuto de los Trabajadores y otras leyes citadas",
"regla": "RD 1561/1995 de jornadas especiales: base para reducir el descanso entre jornadas a 7 h (los documentos lo citan como \"1561/1965\", errata).",
"valor": "7 h",
"ambito": "ambos",
"estado": "norma vigente",
"fuente": "convenio.md §5; cobertura-pg.md §4.1",
"comprobable": "(Ver descansoReducido7h)"
},
{
"id": "ley3_2012",
"tema": "Estatuto de los Trabajadores y otras leyes citadas",
"regla": "Ley 3/2012: las horas extra se compensan con descanso y el pago es excepcional.",
"valor": "—",
"ambito": "ambos",
"estado": "norma vigente",
"fuente": "convenio.md §2; cobertura-pg.md §4.1",
"comprobable": "No"
},
{
"id": "etArt34_36_37_38",
"tema": "Estatuto de los Trabajadores y otras leyes citadas",
"regla": "Arts. 34, 36, 37 y 38 del Estatuto de los Trabajadores (jornada, trabajo nocturno, descanso semanal y vacaciones).",
"valor": "sin fuente",
"ambito": "—",
"estado": "dudosa",
"fuente": "No se citan en ninguna fuente (los artículos 34, 36 y 38 que aparecen son del I Convenio, no del ET)",
"comprobable": "—"
},
{
"id": "vacPeriodosEstivales",
"tema": "Vacaciones",
"regla": "Las vacaciones estivales se eligen entre periodos fijos de 17 días hábiles (23-24 naturales), de lunes a martes o miércoles.",
"valor": "11 periodos del 21-06 al 21-09-2027",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "Sí: el tramo de V coincide con un periodo"
},
{
"id": "vacPlazasPorPeriodo",
"tema": "Vacaciones",
"regla": "Cada periodo tiene un número máximo de plazas por turno.",
"valor": "M-R-P 17, C 2, T 4, 9M 1 (24 por periodo en teleasistencia)",
"ambito": "TA · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "Cuadrante global: personas de vacaciones por periodo ≤ plazas"
},
{
"id": "vacPlazoEleccion",
"tema": "Vacaciones",
"regla": "La elección se manda por correo a Procesos horarios con el asunto «VACACIONES ESTIVALES 2027 (Nº PERIODO ELEGIDO)».",
"valor": "hasta el 30-04 a las 08:00",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No (trámite)"
},
{
"id": "vacSinRespuesta",
"tema": "Vacaciones",
"regla": "Quien no contesta o lo hace fuera de plazo va a los periodos con vacantes, después de la asignación.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No (trámite)"
},
{
"id": "vacFueraDePeriodo",
"tema": "Vacaciones",
"regla": "Se pueden pedir las vacaciones fuera de los periodos establecidos, por correo y antes del plazo.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No"
},
{
"id": "vacMenosDias",
"tema": "Vacaciones",
"regla": "Se pueden disfrutar de 12 a 16 días en lugar de 17, diciendo dónde se aplica el ajuste: al principio, al final o en ambos.",
"valor": "12-16 días",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "Sí: días hábiles de V dentro del periodo"
},
{
"id": "vacSorteo",
"tema": "Vacaciones",
"regla": "Si un periodo tiene más peticiones que plazas, se sortea quién cambia de periodo.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No (necesita las peticiones)"
},
{
"id": "vacEleccionTrasSorteo",
"tema": "Vacaciones",
"regla": "Quien sale en el sorteo elige, por orden de salida, entre los periodos no escogidos o de menor demanda.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No"
},
{
"id": "vacParejas",
"tema": "Vacaciones",
"regla": "Las parejas del SAT a turnos legalmente reconocidas pueden pedir juntas: una sola solicitud y el sorteo vale para las dos.",
"valor": "voluntario",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "Sí: las dos personas con el mismo periodo"
},
{
"id": "vacOrdenParejasPuesto",
"tema": "Vacaciones",
"regla": "En parejas de distinto puesto, el sorteo se hace en este orden: supervisión, teleoperación y teleasistencia.",
"valor": "1º SUP, 2º teleoperación, 3º TA",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No"
},
{
"id": "vacExentoSorteo",
"tema": "Vacaciones",
"regla": "Quien tuvo que cambiar de periodo en el sorteo del año anterior no entra en sorteo y tiene preferencia.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No (necesita el historial)"
},
{
"id": "vacIgualdad57",
"tema": "Vacaciones",
"regla": "Quien se acoge a la medida 5.7 del Plan de Igualdad lo indica en la solicitud, con documentación actualizada.",
"valor": "—",
"ambito": "TA+SUP · Sev",
"estado": "práctica de la empresa",
"fuente": "Correo de Procesos horarios de Sevilla: vacaciones estivales 2027",
"comprobable": "No (dato personal: no se trata en la app)"
},
{
"id": "pgPatronCiclico",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El cuadrante sale de un patrón cíclico (rueda) de N semanas: cada persona empieza en una semana y, al acabar la última, vuelve a la primera. Todo el mundo hace los mismos turnos, horas y rotaciones.",
"valor": "Mál: 10 semanas (sin noches) y 20 (con noches); Sev: 17 semanas (sin noches) y 26 (con noches)",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:44:35] y [1:14:08], consultora (PG Planning): «lo que nos parece óptimo de cara a que las personas todas hagan los mismos turnos, las mismas horas, las mismas rotaciones… es utilizar un patrón de trabajo»; «Aquí hay uno de 17 semanas, este es el de los que no hacen noches y el otro es de 26 semanas»",
"comprobable": "Sí: la fila de cada persona es la del patrón desplazada k semanas (comparar las filas del grupo)"
},
{
"id": "pgDosPatronesNoches",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "En cada sede hay dos patrones complementarios: uno para quien no hace noches y otro, con noches, que cubre lo que el primero no cubre.",
"valor": "Mál: 50 sin noches (había 49, se redondea a un múltiplo) + 180 con noches; Sev: unas 33 sin noches",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:49:29], consultora (PG Planning): «las personas que no hacían noche en esta área eran 49 personas… se ha valorado la opción de hacerle con 50 personas sin hacer noche y el resto rotan en otro patrón»; [0:52:05]: «en Sevilla no son 50… 33»",
"comprobable": "Sí: en el patrón sin noches, N = 0"
},
{
"id": "pgTamanoPatron",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "La longitud del patrón depende de las personas del colectivo y de las que hacen falta por semana (personas = semanas × personas por semana). Si cambia la plantilla o el número de exentos de noche, hay que rehacer el patrón.",
"valor": "10 semanas × 5 personas = 50; 20 semanas × 9 = 180",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:51:18], consultora (PG Planning): «este es de 10 semanas, en grupos de 5 personas»; [0:50:39]: «con que contrates a un empleado más, ya el patrón te tiene que cambiar»",
"comprobable": "Cuadrante global: personas del grupo = semanas × personas por semana"
},
{
"id": "pgTurnosManana",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Tres turnos de mañana con entrada escalonada, de 7 h.",
"valor": "M7 07-14; M8 08-15; M9 09-16",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:54:49], consultora (PG Planning): «de mañana tendríamos tres turnos uno de 7 a 2, uno de 8 a 3 y uno de 9 a 4»",
"comprobable": "Sí: códigos y horas de cada celda"
},
{
"id": "pgTurnosTarde",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Tres turnos de tarde: dos de 8 h y uno de 7 h.",
"valor": "T14 14-22 (8 h); T15 15-23 (8 h); T16 16-23 (7 h)",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:54:49], consultora (PG Planning): «el T14 empieza de 14 a 22 el T15 de 15 a 23 y un T16… de 16 a 23»; [0:56:38]: «Y la tarde, una hora»",
"comprobable": "Sí: horas de cada celda"
},
{
"id": "pgNoche8h",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Noche de 23:00 a 07:00, de 8 h (hoy es de 22:00 a 08:00, 10 h).",
"valor": "23:00-07:00; 8 h",
"ambito": "TA · ambas · con noches",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:54:49] y [0:56:38], consultora (PG Planning): «las noches irían desde las 23 hasta las 7 horas»; «De 23 a 7. O son de 8 horas»",
"comprobable": "Sí: N = 8 h (frente a duracionNoche, 10 h, ya en catálogo)"
},
{
"id": "pgEntradaEscalonada",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "La hora de entrada se escalona (7, 8 y 9 h; 14, 15 y 16 h) para seguir la demanda por franja, y puede cambiar de un día a otro en la misma semana.",
"valor": "3 entradas de mañana y 3 de tarde",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:05:40], consultora (PG Planning): «¿Por qué se entra de manera escalonada a las 7, a las 8 y a las 9? … porque no necesitamos los mismos a las 11 que a las 7»",
"comprobable": "Sí: nº de horas de entrada distintas por semana y persona"
},
{
"id": "pgDotacionNoche",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Personas de noche por central: el estudio daba 18, pero la Agencia pidió un máximo de 9 y el patrón usa 9.",
"valor": "estudio: 18 por central (36 en total); patrón: 9",
"ambito": "TA · ambas · noche",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:59:26], consultora (PG Planning): «A nosotros se nos ha pedido poner 9, pero en nuestro estudio nos salían 18 personas de noche, no 9»; [0:56:02]: «en cada semana habría 9 personas, con lo cual estaríamos cubriendo 9 turnos de noche»",
"comprobable": "Cuadrante global: N por noche = 9"
},
{
"id": "pgBloquesNoche",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Las noches se agrupan en bloques de 2 y uno de 3 de viernes a domingo, para no trabajar el viernes y librar el resto del fin de semana. En el patrón de 20 semanas salen 7 noches, unas 18 al año.",
"valor": "bloques 2 + 3 (V-S-D) + 2; 7 N cada 20 semanas ≈ 18 N/año (cálculo propio)",
"ambito": "TA · Mál · con noches",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:56:02], consultora (PG Planning): «dos noches, aquí hay tres… que trabajen las del viernes, el sábado y el domingo juntas y aquí estarían las otras dos noches»; [1:08:51]: «7 N8 por cada 20 semanas»",
"comprobable": "Sí: agrupar N seguidas; los bloques de 3 en V-S-D; N/año ≈ 18 (frente a noches14DeOficio, 14)"
},
{
"id": "pgHorasAnuales",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "La rotación da 1.639 h sin vacaciones y unas 1.517 h quitando «un mes» de vacaciones, para que cuadre con la jornada del convenio.",
"valor": "1.639 h (sin vacaciones, desde la semana 1); 1.517 h (con vacaciones)",
"ambito": "TA · ambas · L-D",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:07:59], consultora (PG Planning): «La rotación sale en 1639 horas sin vacaciones… si yo quito un mes de vacaciones… se quedará en 1517»; [1:07:52]: «el cuadrante está hecho para que cuadre con eso»",
"comprobable": "Sí: horas de la fila frente a 1.480,5 (o 1.494,5 en Málaga); ver horasCuadranteEsperadas, ya en catálogo"
},
{
"id": "pgSoloDescansoLegal",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Solo se aplican los descansos legales: las semanas se equilibran en número de turnos y días libres y se cumple el descanso semanal. No se exige que la semana sea del mismo turno ni hay criterios de salud laboral o conciliación.",
"valor": "descanso legal; nadie hace solo mañanas o solo tardes",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:01:08] y [1:01:24], consultora (PG Planning): «criterios de descanso que son los obligados»; «El único requerimiento que hemos tenido es que había X personas que no podían hacer noches. El resto, todo el mundo, podía hacer todo»",
"comprobable": "Sí: descansoEntreJornadas y descansoSemanal36h (ya en catálogo); turnos distintos en una misma semana"
},
{
"id": "pgEquilibrioFines",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Los fines de semana, los «festivos» (la transcripción dice «finanzas») y los turnos quedan equilibrados entre personas gracias al patrón.",
"valor": "sin cifra; la media por persona depende de la semana de inicio",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:47:45], consultora (PG Planning): «los fines de semana están equilibrados, las finanzas están equilibradas y los turnos estén equilibrados»; [1:07:24]: «Depende de la semana en la que empieza a trabajar»",
"comprobable": "Sí: desviación de fines, festivos y tardes entre las filas del grupo"
},
{
"id": "pgSinPartidoNiCortos",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Ni turnos partidos ni turnos más cortos: se acepta que algunas franjas tengan alguna persona de más.",
"valor": "0 partidos; sobrecobertura puntual",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:14:08], consultora (PG Planning): «por no partir los turnos, ni hacer turnos partiendo, ni hacer turnos más cortos, que se está cubriendo alguna persona de más»",
"comprobable": "Cuadrante global: personas presentes − necesarias por franja ≥ 0"
},
{
"id": "pgCoberturaPorLlamadas",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "La dotación por franja (L-V, fin de semana y noche) sale de un año de llamadas entrantes, salientes y condicionadas, con estudios separados por sede. De noche se pone menos gente de la que pedirían las llamadas.",
"valor": "1 año de llamadas; «mínimos» propuestos: «86 y 96» (sentido dudoso)",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [0:42:03], consultora (PG Planning): «nos pasaron información de las llamadas, tanto entrantes como salientes, condicionadas y no condicionadas»; [1:33:53], CCOO: «ponen esos 86», Agencia: «y 96»",
"comprobable": "Cuadrante global: cobertura por franja ≥ necesidad (falta la tabla)"
},
{
"id": "pgContinuidadEntreAnios",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El patrón se asigna a cada persona y sigue de un año a otro: lo que no se completa un año continúa al siguiente.",
"valor": "ciclo continuo",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:15:11], consultora (PG Planning): «se pone un año y se va continuando año tras año… lo que no se hace un año, pues continúa el año siguiente»",
"comprobable": "Sí: comparar la última semana de un año con la primera del siguiente (contradice sinContinuidadEntreAnios, ya en catálogo)"
},
{
"id": "pgVacacionesSobrePatron",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Primero se monta el patrón y luego se colocan las vacaciones y los permisos, que cubre el personal de sustitución.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "propuesta de la consultora",
"fuente": "Reunión 18-11-2026, [1:15:11], consultora (PG Planning): «a continuación… se ponen las vacaciones y todos los permisos a los que tenéis derecho… hay unas personas para sustituir»",
"comprobable": "No (orden de elaboración; choca con vacacionesAntesDePublicar, ya en catálogo)"
},
{
"id": "minimosNocheActual",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Mínimo de teleasistentes de noche hoy: 10 en Sevilla y 8 en Málaga, tras subir uno en cada sede.",
"valor": "Sev 10; Mál 8",
"ambito": "TA · ambas · noche",
"estado": "situación actual (dicho en la reunión)",
"fuente": "Reunión 18-11-2026, [0:59:46], Agencia: «ahora mismo son 10 y 8. 10 en Sevilla y 8»; [1:00:35], CCOO: «se han subido uno y uno»; [0:28:10], Gerencia: «los mínimos en la noche son 10 y pueden ser 9»",
"comprobable": "Cuadrante global: N por noche ≥ 10 (Sev) / 8 (Mál). Contradice minimosSevilla2013 (8) y minimosSevillaNoche9 (9)"
},
{
"id": "sieteTiposTurno",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Hoy conviven 7 tipos de turno o criterios, que la Gerencia y la Agencia consideran fuente de desorden y desigualdad.",
"valor": "7",
"ambito": "TA · ambas",
"estado": "situación actual (dicho en la reunión)",
"fuente": "Reunión 18-11-2026, [0:14:00], Gerencia: «Ahora tenemos 7 tipos de turnos»; [1:22:53], Agencia: «siete criterios diferentes por la desigualdad que también se genera»",
"comprobable": "Cuadrante global: nº de grupos de turno (coincide con plazasPorTurno: M1, M2, T1, T2, R, P, C)"
},
{
"id": "patronActual26",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El rotatorio actual ya es un patrón genérico de 26 semanas que se repite dos veces al año y se retoca tras publicarlo (vacaciones, periodos especiales, encuestas).",
"valor": "26 semanas × 2 = 52",
"ambito": "TA · ambas · R",
"estado": "situación actual (dicho en la reunión)",
"fuente": "Reunión 18-11-2026, [1:42:12], CCOO: «un patrón de 26 semanas que se repite dos veces al año 52 semanas… genérico para todo el mundo»",
"comprobable": "Sí: semana k y semana k+26 de la fila del rotatorio iguales salvo ajustes"
},
{
"id": "mismoTurnoSemana",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "En el rotatorio actual cada semana es de un solo turno (mañana o tarde) y, como mucho, se combina con noches.",
"valor": "M o T por semana; como mucho M+N o T+N",
"ambito": "TA · ambas · R",
"estado": "situación actual (dicho en la reunión); propuesta CCOO/UGT de mantenerlo",
"fuente": "Reunión 18-11-2026, [0:57:35], CCOO: «nosotros no trabajamos mañanas, tardes y noches… Trabajamos o de mañana, o de tarde»; [1:29:07], UGT: «como mucho mañana y noche, tarde y noche, es lo que hacemos ahora mismo»",
"comprobable": "Sí: en cada semana L-D, turnos de día de un solo tipo (M o T) más N como mucho"
},
{
"id": "cuadranteAnioNatural",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El cuadrante va por año natural (corta el 31-12) porque con los horarios trimestrales o cuatrimestrales de antes no se podían controlar las horas anuales.",
"valor": "01-01 a 31-12",
"ambito": "TA · ambas",
"estado": "situación actual (dicho en la reunión)",
"fuente": "Reunión 18-11-2026, [1:35:16], CCOO: «salía trimestral el horario o cuatrimestral. Y no había nadie de controlar las horas… Por eso se puso el año natural»",
"comprobable": "Sí (relacionado con corteDeAnio, ya en catálogo)"
},
{
"id": "linea900Dotacion",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "En la línea 900 hay ahora 2 personas, antes 3, y parte del personal asignado está en un despacho haciendo trámites.",
"valor": "2 (antes 3)",
"ambito": "TA · Sev · 900",
"estado": "dudosa",
"fuente": "Reunión 18-11-2026, [1:50:28], CCOO: «tenemos dos personas que tienen que trabajar a 900 que antes había tres»",
"comprobable": "Cuadrante global (no encaja con minimosLinea900: «hoy 4 de mañana»)"
},
{
"id": "tareasNoTelefonicas",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Parte del personal de sala se dedica cada día a tareas que no son atender llamadas: servicio técnico, vinculación de dispositivos, UNEI, solicitudes de dependencia.",
"valor": "servicio técnico: más de 15 TA al día (UGT: 15 de mañana, 30 en total); UNEI: «20 y tantas» personas; unas 40 al día para otras entidades",
"ambito": "TA · Sev",
"estado": "situación actual (dicho en la reunión)",
"fuente": "Reunión 18-11-2026, [1:50:12], CCOO: «el servicio técnico consume diariamente más de 15 teleasistentes»; [1:48:22], UGT: «Hay 20 y tantas personas trabajando para UNEI»; [1:51:26], CCOO: «40 personas consumiendo recursos para otras entidades»",
"comprobable": "Cuadrante global: descontar ese personal de la cobertura de llamadas (falta el dato oficial)"
},
{
"id": "turnoUnicoParaTodos",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Un único sistema de turno igual para toda la plantilla, que mejore las condiciones de la mayoría, en lugar de los 7 criterios actuales.",
"valor": "«un turno para todo el mundo, entre comillas»",
"ambito": "TA · ambas",
"estado": "acuerdo de la reunión (premisa de trabajo anotada por la Agencia; también la plantea la representación sindical)",
"fuente": "Reunión 18-11-2026, [1:28:22], representación sindical: «la premisa básica es que sea un horario para todo el mundo igual»; [1:55:40], Agencia: «Un turno para todo el mundo, entre comillas, ¿no? Sí. Y yo eso es lo que me he apuntado»",
"comprobable": "Cuadrante global: todas las filas del grupo con el mismo patrón y las mismas reglas"
},
{
"id": "noEmpeorarRotatorio",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El modelo nuevo no debe empeorar el rotatorio actual: ni más tardes ni más fines de semana.",
"valor": "tardes ≤ las actuales (≈ 60-66/año, según rotacion3M1T); fines ≤ 17",
"ambito": "TA · ambas · R",
"estado": "acuerdo de la reunión (premisa anotada por la Agencia: «no peorar»); la piden UGT, CCOO y CGT",
"fuente": "Reunión 18-11-2026, [1:20:55], UGT: «es una premisa que no empeore el rotatorio actual»; [1:28:38], representación sindical: «no empeorar el rotatorio que tenemos no hacer más tarde no hacer más fines de semana»; [1:55:40], Agencia: «Y no peorar las… Sí, sí. Eso es lo que me he apuntado»",
"comprobable": "Sí: tardes, fines y noches por fila del modelo nuevo ≤ las del rotatorio actual (relacionado con plusRotativoRevision, ya en catálogo)"
},
{
"id": "calendarioAntes20Dic",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Cada persona debe saber el 20 de diciembre qué días trabaja el año siguiente.",
"valor": "antes del 20-12",
"ambito": "TA+SUP · ambas",
"estado": "propuesta de la empresa (objetivo de la Gerencia)",
"fuente": "Reunión 18-11-2026, [0:15:32], Gerencia: «que la gente el día 20 de diciembre pues tenga claro cuáles son los días que va a trabajar el año que viene»",
"comprobable": "Sí, con la fecha de publicación (es más tarde que publicacion2Meses, ya en catálogo: antes del 1-11)"
},
{
"id": "modeloEstable3a6Anios",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El acuerdo debe dar estabilidad varios años, sin pelear la plantilla cada año.",
"valor": "3-6 años",
"ambito": "TA · ambas",
"estado": "propuesta de la empresa",
"fuente": "Reunión 18-11-2026, [0:15:32], Gerencia: «una decisión que nos dé tranquilidad durante un tiempo 4, 5, 6, 3»; [0:28:10]: «lo que yo no puedo es pelearme por 30 todos los años»",
"comprobable": "No"
},
{
"id": "jornada30hMasPlantilla",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Hipótesis de la Gerencia: con 25 personas más y jornada de 30 h firmaría «mañana», para 3 años, si se demuestra que cubre las 24 h.",
"valor": "+25 personas; 30 h/semana; 3 años",
"ambito": "TA · ambas",
"estado": "propuesta de la empresa (hipótesis condicionada)",
"fuente": "Reunión 18-11-2026, [0:20:27], Gerencia: «si metemos a 25 personas más pero la jornada laboral la bajamos a 30 horas mañana firmamos ahora durante 3 años»",
"comprobable": "Cuadrante global: simular la cobertura con 30 h y +25 personas"
},
{
"id": "absentismoEnDimensionado",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El dimensionado debe incluir el absentismo previsible (bajas, resfriados), sin «autoengañarse».",
"valor": "sin cifra (se oye «el 25», sentido dudoso)",
"ambito": "TA · ambas",
"estado": "propuesta de la empresa",
"fuente": "Reunión 18-11-2026, [0:21:34], Gerencia: «no es que no hemos tenido en cuenta el absentismo… No nos autoengañemos»",
"comprobable": "Cuadrante global: margen sobre los mínimos (relacionado con minimosNocheSinMargen, ya en catálogo)"
},
{
"id": "teletrabajoParcial",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Estudiar un porcentaje de teletrabajo (por ejemplo, para mayores de 55 años) en los próximos años; los medios técnicos están en estudio.",
"valor": "sin cifra; mayores de 55 como ejemplo",
"ambito": "TA · ambas",
"estado": "propuesta de la empresa (en estudio)",
"fuente": "Reunión 18-11-2026, [0:21:34], Gerencia: «hay un tanto por ciento de teletrabajo. Estamos estudiando los medios técnicos… la gente que tenga más de 55 años»",
"comprobable": "No"
},
{
"id": "todosOchoATres",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Si se quiere una sola hora de entrada, la mañana podría ser toda de 8 a 3 (la consultora avisa de que cambiaría el reparto de mañanas).",
"valor": "M 08-15 para todos",
"ambito": "TA · ambas",
"estado": "propuesta de la empresa (planteada como posibilidad)",
"fuente": "Reunión 18-11-2026, [1:18:09], Agencia: «se pone todo de 8 a 3 si es lo que se quiere»",
"comprobable": "Sí: una sola hora de entrada de mañana"
},
{
"id": "nocturnidadTardeHasta23",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Argumento de la Agencia: la noche de 8 h «queda compensada» porque la tarde hasta las 23:00 cobra 1 h de nocturnidad.",
"valor": "1 h de nocturnidad (22-23) por cada T15/T16",
"ambito": "TA · ambas",
"estado": "dudosa (argumento que le dieron a la Agencia; no lo comprobó)",
"fuente": "Reunión 18-11-2026, [1:29:17], Agencia: «se mete otro turno de la tarde hasta las 11, y ahí cobras una hora de nocturnidad, entonces va a estar compensado»",
"comprobable": "Sí: horas entre las 22:00 y las 08:00 por fila (franjaNocturna, ya en catálogo), modelo actual frente al nuevo"
},
{
"id": "premisasAntesDelModelo",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Antes de diseñar un modelo hay que acordar las premisas y los objetivos de cada parte, como en 2016.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "propuesta CGT",
"fuente": "Reunión 18-11-2026, [0:16:57], CGT: «las dos partes expresamos cuáles eran los objetivos»; [1:11:28]: «nos teníamos que haber propuesto de acuerdo primero en las premisas»",
"comprobable": "No"
},
{
"id": "mismaHoraEntrada",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Entrar todos los días a la misma hora y no cambiar la hora de entrada dentro de la semana.",
"valor": "1 hora de entrada por persona y semana (mejor, por turno)",
"ambito": "TA · ambas",
"estado": "propuesta CGT",
"fuente": "Reunión 18-11-2026, [1:11:28], CGT: «no hay cabeza humana que consigue entrando unos días a una hora y otros días a otra, incluso cambiando la hora de entrada en la misma semana»; [1:40:13]: «¿Todo el mundo trabaja a la misma hora? Esa es la premisa»",
"comprobable": "Sí: horas de entrada distintas por semana = 1"
},
{
"id": "mismoTurnoSemanaMantener",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Mantener la semana de un solo turno (M o T), como mucho con noches.",
"valor": "ver 2.2",
"ambito": "TA · ambas · R",
"estado": "propuesta CCOO/UGT (con apoyo de la representación sindical)",
"fuente": "Reunión 18-11-2026, [1:28:38], representación sindical: «que en la misma semana se haga el mismo turno»",
"comprobable": "Sí (ver 2.2)"
},
{
"id": "criteriosSaludConciliacion",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Incluir criterios de salud laboral, biorritmos, conciliación y género (80-85 % de mujeres), no solo los descansos legales.",
"valor": "80 % de mujeres (85 % en Sevilla, según CCOO)",
"ambito": "TA · ambas",
"estado": "propuesta CCOO/UGT",
"fuente": "Reunión 18-11-2026, [0:58:39], CCOO: «no habéis tenido en cuenta criterios de salud laboral los biorritmos»; [1:25:20], UGT: «no puedes abstraerte… de que el 80% de los transcientes son mujeres»",
"comprobable": "Parcial: secuencias M→T→N en la misma semana, cambios de turno por semana"
},
{
"id": "noche10hDebate",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Decidir si la noche sigue siendo de 10 h, que es lo que pide la gente en sala, frente a las 8 h de la consultora.",
"valor": "10 h (actual) o 8 h (consultora)",
"ambito": "TA · ambas · noche",
"estado": "dudosa (debate abierto)",
"fuente": "Reunión 18-11-2026, [1:29:10], representación sindical: «Otro debate es las noches, si queremos que sigan siendo de 10 horas, porque lo que escucho yo en sala es lo que quiere la gente»",
"comprobable": "Sí: duración de N"
},
{
"id": "turnos8h",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Estudiar turnos de 8 h: más horas al día y menos días al año. Ya se planteó y descartó en 2017; CCOO advierte de que dejaría más huecos y pide simularlo antes de consultar a la plantilla.",
"valor": "8 h/día",
"ambito": "TA · ambas",
"estado": "propuesta CGT («globo sonda», a estudiar)",
"fuente": "Reunión 18-11-2026, [1:43:26], CGT: «la idea de las 8 horas en 2017 se puso encima de la mesa se descartó… trabajan más cada día pero trabajan menos días»; [1:44:02], CCOO: «con un modelo donde el horario sea de… 8 horas se van a quedar más descubiertos»",
"comprobable": "Sí: días trabajados/año y cobertura simulada"
},
{
"id": "patronRotaFestivos",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Con un patrón que se repite, comprobar que la misma persona no trabaja todos los años el mismo festivo.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "propuesta CGT",
"fuente": "Reunión 18-11-2026, [1:31:44], CGT: «puede llegar un momento… en el que la misma persona trabaje el jueves santo todos los años»",
"comprobable": "Sí, con varios años: festivos trabajados por persona y año (relacionado con festivosEspecialesEquitativo, ya en catálogo)"
},
{
"id": "capacidadPuestosSala",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El solape de mañana y tarde está limitado por el número de puestos (ordenadores) de la sala.",
"valor": "sin cifra",
"ambito": "TA · ambas",
"estado": "propuesta CGT",
"fuente": "Reunión 18-11-2026, [1:18:43], CGT: «el número de ordenadores que te hagan falta… puedes tener simultáneamente el turno de mañana con el turno de tarde… y necesitas ordenadores suficientes»",
"comprobable": "Cuadrante global: personas presentes a la vez ≤ puestos (falta el dato)"
},
{
"id": "solapesYPrioridadesEmpresa",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Pedir al área de Teleasistencia que defina sus requisitos: horas de entrada, si se permite el solape de turnos y cuánto, mínimos y si hay un solo turno.",
"valor": "—",
"ambito": "TA+SUP · ambas",
"estado": "propuesta CGT (UGT añade «vuestros mínimos también»)",
"fuente": "Reunión 18-11-2026, [1:46:02], CGT: «tiene que haber varios turnos de entrada… el solapé se permite, el solapé de los turnos no se permite»; [1:33:15]: «solapes mínimos»",
"comprobable": "No (es un requisito de entrada al diseño)"
},
{
"id": "guardiaLlamadasEntrantes",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "En algunas franjas (noche, tarde, festivos, fines de semana) poner menos personas, pero dedicadas solo a las llamadas entrantes y sin otras tareas.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "propuesta CCOO/UGT (UGT)",
"fuente": "Reunión 18-11-2026, [1:47:19], UGT: «en alguna franja horaria que se esté de guardia y que haya menos personas pero que estén dedicadas a la atención de llamadas entrantes»",
"comprobable": "No"
},
{
"id": "reordenarProtocoloYTareas",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "Antes de dimensionar, revisar el protocolo (1.080 páginas, muchas sin uso) y sacar de la sala las tareas ajenas a la atención de llamadas.",
"valor": "—",
"ambito": "TA · ambas",
"estado": "propuesta CCOO/UGT (CCOO)",
"fuente": "Reunión 18-11-2026, [0:23:23], CCOO: «había 1.080 páginas… de las 1080 se pueden ser 20 o 30 resumidas»; [0:26:19]: «Es todo aquello del protocolo que hace años que no se está haciendo»",
"comprobable": "No"
},
{
"id": "modeloSupervision",
"tema": "Reunión de la Comisión del 18-11-2026",
"regla": "El estudio no incluye a supervisión: hay que saber con qué base se hará su horario.",
"valor": "—",
"ambito": "SUP · ambas",
"estado": "propuesta CCOO/UGT (CCOO)",
"fuente": "Reunión 18-11-2026, [1:09:49], CCOO: «queremos saber en qué base se va a hacer los supervisores»",
"comprobable": "No"
}
];
export const FALTA_EN_FUENTES = [
"Acta oficial de la reunión del 18-11-2026: hay transcripción (fuera del repositorio) y su resumen en docs/fuentes-cgt/reunion-18-11-2026.md, pero no acta; unos 30 puntos de la transcripción hay que revisarlos con el audio.",
"Una búsqueda en todo el repositorio de \"audio\", \"grabación\", \"transcripción\" y ficheros .mp3, .m4a, .wav u .ogg no da ningún resultado. La única mención a \"audio\" es un escrito de 2020 sobre la calidad del audio de las llamadas (cobertura-pg.md).",
"Tampoco hay actas de la Comisión de 2024 a 2026: 28-05-2024, 19-03-2025, 15-07-2025 y mesa técnica de 22-10-2025. De las de 2025 solo hay convocatorias y crónicas; los adjuntos no se abrieron.",
"Tampoco están las actas de la comisión de 2016, del 17-01-2019 ni del 18-02-2021.",
"El P.41 vigente (la versión de 2022 es un escaneo de 41,9 MB sin texto), su Anexo III (tipos de cambio de turno, ilegible) y el procedimiento del supervisor suplente.",
"Los procedimientos de autocambios y de cobertura V1-V3 (2025) y la tabla \"Prevalencias de permisos\".",
"La comunicación y la justificación de la subida de mínimos de Málaga del 15-10-2026, y cualquier tabla de mínimos oficial posterior a 2013 que no sea la de la hoja del cuadrante.",
"Los escenarios 1 y 2 de la consultora y el fichero \"Capacidad Operativa V3 2025 completo\" (volumen y duración de llamadas).",
"Los cuadrantes de supervisores de Málaga 2027, los de Sevilla de 2018 a 2022, 2025 y 2026, y el de Málaga 2023 (ZIP cifrado).",
"La leyenda completa de códigos: siguen sin definir C, \",\", \".\", SUP., OXC., FO/FOR., LNR, 9M, los grupos \"i\" e \"I\" y la \"O\" en filas enteras.",
"Las 2 propuestas de horario de CCOO para los fijos discontinuos y el detalle del turno RFD acordado.",
"Duración del turno de noche en el convenio (solo consta la franja 22:00-08:00) y su hora de inicio y fin oficiales fuera de las hojas de nomenclatura.",
"Exención o tope de noches a partir de los 55 años.",
"Tope máximo de noches por persona distinto del rango 14-18 más la cesión de 7.",
"Máximo de días de trabajo seguidos y máximo de fines de semana seguidos.",
"Umbral de horas a bolsa que debe dar aviso.",
"Plazo máximo entre el día trabajado y el librado en un autocambio.",
"Fórmula de horas anuales para jornada reducida.",
"Equivalencia de AP por horas en noches de 10 h.",
"Texto de los arts. 34, 36, 37 y 38 del Estatuto de los Trabajadores, que las fuentes no citan, y cualquier regulación del art. 34.8 ET en el SAT.",
"Teletrabajo en el SAT: no está regulado.",
"Resultados del segundo sondeo de noches 2-2-3 (2022), del sondeo de noches de supervisión (2022) y de los de Málaga (2017 y 2020).",
"Contenido de los Google Forms (encuesta CGT de turnos de Málaga de 2023, asamblea de Málaga de 2024 y otros).",
"Resolución de la Inspección de Trabajo sobre las denuncias de 2024 y 2025."
];
