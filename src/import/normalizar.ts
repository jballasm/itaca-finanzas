// Normalización de la "clave" (comercio / remitente) para que las reglas calcen
// aunque la cartola escriba el mismo comercio de formas distintas. Plan §6.

/** Prefijos de pasarelas de pago. Se quitan repetidamente del inicio. */
const PREFIJOS_PASARELA = ['MERCADOPAGO', 'MERPAGO', 'PAYSCAN', 'PAYU', 'MP']

/** Comunas / ciudades frecuentes que BICE agrega al final del comercio. */
const SUFIJOS_LUGAR = [
  'LAS CONDES', 'LO BARNECHEA', 'VITACURA', 'PROVIDENCIA', 'NUNOA', 'LA REINA',
  'PENALOLEN', 'MACUL', 'LA FLORIDA', 'PUENTE ALTO', 'MAIPU', 'SAN MIGUEL',
  'ESTACION CENTRAL', 'RECOLETA', 'INDEPENDENCIA', 'HUECHURABA', 'QUILICURA',
  'CONCHALI', 'CERRILLOS', 'SAN BERNARDO', 'COLINA', 'CHICUREO', 'LAMPA',
  'SANTIAGO CENTRO', 'SANTIAGO', 'STGO', 'VINA DEL MAR', 'VALPARAISO',
  'CONCEPCION', 'RANCAGUA', 'TEMUCO', 'LA SERENA', 'ANTOFAGASTA', 'CHILE', 'CL',
]

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const RE_PREFIJO = new RegExp(`^(?:${PREFIJOS_PASARELA.map(escapar).join('|')})(?:\\s|\\*|$)+`)
// Ordenadas de más larga a más corta para que "SANTIAGO CENTRO" gane sobre "SANTIAGO".
const RE_SUFIJO = new RegExp(
  `(?:\\s+(?:${[...SUFIJOS_LUGAR].sort((a, b) => b.length - a.length).map(escapar).join('|')}))+$`,
)

/** Quita tildes y diacríticos ("Ñuñoa" → "Nunoa"). */
export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** RUT chileno: 12.345.678-9, 12345678-K, 12345678K. */
export const RE_RUT = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/g

export function normalizarClave(texto: string): string {
  let s = sinTildes(texto).toUpperCase()

  s = s.replace(RE_RUT, ' ')
  s = s.replace(/TASA\s+INT\.?\s*[\d.,]+\s*%?/g, ' ')
  // Asteriscos de pasarela ("MP *TIENDA") y puntuación suelta.
  s = s.replace(/[*_#]+/g, ' ')
  s = s.replace(/[^\w\s&.\-]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()

  let previo: string
  do {
    previo = s
    s = s.replace(RE_PREFIJO, '').trim()
  } while (s !== previo)

  // Números largos sueltos (códigos de terminal, nº de sucursal).
  s = s.replace(/\b\d{4,}\b/g, ' ').replace(/\s+/g, ' ').trim()

  const sinLugar = s.replace(RE_SUFIJO, '').trim()
  // Si el texto era solo una comuna, no lo dejamos vacío.
  if (sinLugar) s = sinLugar

  s = s.replace(/[\s.\-]+$/g, '').trim()
  return s
}
