// Lectura de cartolas Banco BICE (plan §6). Recibe las filas tal como las
// entrega SheetJS (`sheet_to_json(ws, { header: 1, raw: true })`), sin depender
// del número de fila donde están los encabezados.

import type { Clasificacion, Estado, Medio, TipoCartola, TipoMovimiento } from '../lib/types'
import { extraerClave } from './claves'
import { normalizarClave, sinTildes } from './normalizar'

export type Celda = string | number | boolean | Date | null | undefined
export type Filas = Celda[][]

export interface MovimientoParseado {
  fecha: string // YYYY-MM-DD
  tipo: TipoMovimiento
  monto: number // CLP entero, siempre positivo
  origen: TipoCartola
  medio: Medio
  descripcion_original: string
  clave: string
  cuota: string | null
  nro_operacion: string | null
  /** Clasificación fija que impone el formato (p. ej. pagos de la tarjeta). */
  clasificacion: Clasificacion | null
  estado: Estado | null
}

export interface ResultadoParse {
  tipo: TipoCartola
  movimientos: MovimientoParseado[]
  desde: string | null
  hasta: string | null
}

export class ErrorCartola extends Error {}

// ---------- utilidades de celdas ----------

const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (a: number, m: number, d: number) => `${a}-${pad(m)}-${pad(d)}`

function fechaValida(a: number, m: number, d: number): string | null {
  if (!a || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCMonth() !== m - 1) return null
  return iso(a, m, d)
}

/** Texto de encabezado comparable: minúsculas, sin tildes ni símbolos. */
function normEncabezado(c: Celda): string {
  return sinTildes(String(c ?? ''))
    .toLowerCase()
    .replace(/[º°$.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fecha de la cartola → "YYYY-MM-DD".
 * Acepta "2 mar 2026", "02/03/2026", "2026-03-02", serial de Excel o Date.
 */
export function parseFecha(c: Celda): string | null {
  if (c == null || c === '') return null
  if (c instanceof Date) {
    if (isNaN(c.getTime())) return null
    return iso(c.getFullYear(), c.getMonth() + 1, c.getDate())
  }
  if (typeof c === 'number') {
    // Serial de Excel (días desde 1899-12-30). Rango razonable: 2000–2100.
    if (c < 36526 || c > 73051) return null
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(c) * 86400000)
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
  }
  const s = sinTildes(String(c)).toLowerCase().trim()
  let m = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+)?(\d{4})$/)
  if (m && MESES[m[2]]) return fechaValida(+m[3], MESES[m[2]], +m[1])
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return fechaValida(+m[3], +m[2], +m[1])
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return fechaValida(+m[1], +m[2], +m[3])
  return null
}

/** "$8.170" → 8170 · "-$1.234" → 1234 · 8170 → 8170. Siempre positivo. */
export function parseMonto(c: Celda): number | null {
  if (c == null || c === '') return null
  if (typeof c === 'number') return Number.isFinite(c) ? Math.abs(Math.round(c)) : null
  const s = String(c).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null
  return Math.abs(Math.round(Number(s)))
}

function texto(c: Celda): string {
  if (c == null) return ''
  return String(c).replace(/\s+/g, ' ').trim()
}

// ---------- detección de formato ----------

interface Columnas {
  fecha: number
  categoria: number
  descripcion: number
  monto: number
  nroOperacion: number // -1 si no existe
  cuotas: number // -1 si no existe
}

interface Formato {
  tipo: TipoCartola
  filaEncabezado: number
  col: Columnas
}

const BUSCAR_EN_FILAS = 40

function indice(h: string[], pred: (x: string) => boolean): number {
  return h.findIndex(pred)
}

export function detectarFormato(filas: Filas): Formato {
  const limite = Math.min(filas.length, BUSCAR_EN_FILAS)
  for (let i = 0; i < limite; i++) {
    const h = (filas[i] ?? []).map(normEncabezado)
    const fecha = indice(h, (x) => x === 'fecha')
    const categoria = indice(h, (x) => x === 'categoria')
    const monto = indice(h, (x) => x.startsWith('monto'))
    if (fecha < 0 || categoria < 0 || monto < 0) continue

    const detalle = indice(h, (x) => x === 'detalle')
    const cuotas = indice(h, (x) => x.startsWith('cuota'))
    if (detalle >= 0 && cuotas >= 0) {
      return {
        tipo: 'bice_tc',
        filaEncabezado: i,
        col: { fecha, categoria, descripcion: detalle, monto, cuotas, nroOperacion: -1 },
      }
    }

    const descripcion = indice(h, (x) => x.startsWith('descripcion'))
    if (descripcion >= 0) {
      return {
        tipo: 'bice_cuenta',
        filaEncabezado: i,
        col: {
          fecha,
          categoria,
          descripcion,
          monto,
          cuotas: -1,
          nroOperacion: indice(h, (x) => /^n ?(de )?operacion$|^numero de operacion$|^nro operacion$/.test(x)),
        },
      }
    }
  }
  throw new ErrorCartola(
    'No reconocimos el archivo. Sube la cartola de cuenta corriente o de tarjeta de crédito de BICE en Excel.',
  )
}

// ---------- parseo ----------

function tipoPorCategoria(c: Celda): TipoMovimiento | null {
  const s = normEncabezado(c)
  if (s.startsWith('cargo')) return 'gasto'
  if (s.startsWith('abono')) return 'ingreso'
  return null
}

function parseFila(f: Celda[], fmt: Formato): MovimientoParseado | null {
  const { col, tipo: origen } = fmt
  const fecha = parseFecha(f[col.fecha])
  const monto = parseMonto(f[col.monto])
  const tipo = tipoPorCategoria(f[col.categoria])
  const descripcion = texto(f[col.descripcion])
  // Filas vacías, subtotales y pies de página no tienen fecha + monto + categoría.
  if (!fecha || monto == null || monto === 0 || !tipo || !descripcion) return null

  if (origen === 'bice_cuenta') {
    const { clave, tipo: tipoDesc } = extraerClave(descripcion, tipo)
    const nro = col.nroOperacion >= 0 ? texto(f[col.nroOperacion]) : ''
    return {
      fecha,
      tipo,
      monto,
      origen,
      medio: tipo === 'ingreso' || tipoDesc === 'transferencia_enviada' ? 'transferencia' : 'debito',
      descripcion_original: descripcion,
      clave,
      cuota: null,
      nro_operacion: nro || null,
      clasificacion: null,
      estado: null,
    }
  }

  const cuota = texto(f[col.cuotas])
  // En la TC los abonos son pagos de la tarjeta: nunca son de Ítaca.
  const esPago = tipo === 'ingreso'
  return {
    fecha,
    tipo,
    monto,
    origen,
    medio: 'credito',
    descripcion_original: descripcion,
    clave: normalizarClave(descripcion),
    cuota: cuota || null,
    nro_operacion: null,
    clasificacion: esPago ? 'no_itaca' : null,
    estado: esPago ? 'confirmado' : null,
  }
}

export function parseCartola(filas: Filas): ResultadoParse {
  const fmt = detectarFormato(filas)
  const movimientos: MovimientoParseado[] = []
  for (let i = fmt.filaEncabezado + 1; i < filas.length; i++) {
    const m = parseFila(filas[i] ?? [], fmt)
    if (m) movimientos.push(m)
  }
  const fechas = movimientos.map((m) => m.fecha).sort()
  return {
    tipo: fmt.tipo,
    movimientos,
    desde: fechas[0] ?? null,
    hasta: fechas[fechas.length - 1] ?? null,
  }
}
