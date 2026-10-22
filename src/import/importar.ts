import { read, utils } from 'xlsx'
import { supabase } from '../lib/supabase'
import type { TipoCartola } from '../lib/types'
import { ErrorCartola, parseCartola, type Filas, type MovimientoParseado, type ResultadoParse } from './bice'
import { parseEstadoCuentaPdf } from './bicePdf'
import { calcularHuellas } from './huella'
import { aplicarRegla, indexarReglas, type Decision, type ReglaMin } from './reglas'

export type MovimientoAInsertar = Omit<MovimientoParseado, 'estado' | 'clasificacion'> &
  Decision & { huella: string }

export interface ResumenImportacion {
  tipo: TipoCartola
  formato: 'excel' | 'pdf'
  desde: string | null
  hasta: string | null
  filas: number
  nuevas: number
  duplicadas: number
  reconocidosNoItaca: number
  sugeridosItaca: number
  porRevisar: number
}

export interface CartolaLeida extends ResultadoParse {
  formato: 'excel' | 'pdf'
  archivo: string
}

/** Lee el Excel en el navegador. El archivo nunca sale del dispositivo. */
export function leerExcel(datos: ArrayBuffer): Filas {
  const wb = read(datos, { type: 'array' })
  // Tomamos la primera hoja que se reconozca como cartola BICE.
  let primerError: unknown
  for (const nombre of wb.SheetNames) {
    const filas = utils.sheet_to_json<Filas[number]>(wb.Sheets[nombre], { header: 1, raw: true, defval: null })
    try {
      parseCartola(filas)
      return filas
    } catch (e) {
      primerError ??= e
    }
  }
  throw primerError ?? new ErrorCartola('El archivo está vacío.')
}

const esPdf = (a: File) => a.type === 'application/pdf' || /\.pdf$/i.test(a.name)

/** Excel o PDF → movimientos, en el dispositivo. */
export async function leerCartola(archivo: File): Promise<CartolaLeida> {
  const datos = await archivo.arrayBuffer()
  if (esPdf(archivo)) {
    // pdf.js pesa: se descarga solo si se sube un PDF.
    const { leerPdf } = await import('./pdfNavegador')
    return { ...parseEstadoCuentaPdf(await leerPdf(datos)), formato: 'pdf', archivo: archivo.name }
  }
  return { ...parseCartola(leerExcel(datos)), formato: 'excel', archivo: archivo.name }
}

/** Deja solo los movimientos desde una fecha (YYYY-MM-DD). */
export function filtrarDesde<T extends ResultadoParse>(r: T, desde: string | null): T {
  if (!desde) return r
  const movimientos = r.movimientos.filter((m) => m.fecha >= desde)
  const fechas = movimientos.map((m) => m.fecha).sort()
  return { ...r, movimientos, desde: fechas[0] ?? null, hasta: fechas[fechas.length - 1] ?? null }
}

/** Parte pura: aplica reglas y separa duplicados. */
export async function prepararImportacion(
  cartola: ResultadoParse & { formato?: 'excel' | 'pdf' },
  reglas: ReglaMin[],
  huellasExistentes: (huellas: string[]) => Promise<Set<string>>,
): Promise<{ resumen: ResumenImportacion; nuevos: MovimientoAInsertar[] }> {
  const { tipo, movimientos, desde, hasta } = cartola
  if (movimientos.length === 0) throw new ErrorCartola('No hay movimientos para importar en ese período.')

  const huellas = await calcularHuellas(movimientos)
  const existentes = await huellasExistentes(huellas)
  const idx = indexarReglas(reglas)

  const nuevos: MovimientoAInsertar[] = []
  movimientos.forEach((m, i) => {
    if (existentes.has(huellas[i])) return
    // Lo que impone el formato (pagos de TC) gana sobre las reglas.
    const decision: Decision = m.estado
      ? { estado: m.estado, clasificacion: m.clasificacion, categoria_gasto_id: null, regla_id: null }
      : aplicarRegla(m.clave, m.tipo, idx)
    nuevos.push({ ...m, ...decision, huella: huellas[i] })
  })

  const contar = (pred: (m: MovimientoAInsertar) => boolean) => nuevos.filter(pred).length
  return {
    nuevos,
    resumen: {
      tipo,
      formato: cartola.formato ?? 'excel',
      desde,
      hasta,
      filas: movimientos.length,
      nuevas: nuevos.length,
      duplicadas: movimientos.length - nuevos.length,
      reconocidosNoItaca: contar((m) => m.estado === 'confirmado' && m.clasificacion === 'no_itaca'),
      sugeridosItaca: contar((m) => m.estado === 'sugerido'),
      porRevisar: contar((m) => m.estado === 'por_revisar'),
    },
  }
}

const LOTE = 200

function lotes<T>(xs: T[], n = LOTE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}

async function huellasEnBase(huellas: string[]): Promise<Set<string>> {
  const set = new Set<string>()
  for (const lote of lotes(huellas)) {
    const { data, error } = await supabase.from('movimientos').select('huella').in('huella', lote)
    if (error) throw error
    data.forEach((r) => set.add(r.huella as string))
  }
  return set
}

/** Guarda en Supabase una cartola ya leída (y filtrada). */
export async function importarCartola(cartola: CartolaLeida): Promise<ResumenImportacion> {
  const { data: reglas, error: errReglas } = await supabase
    .from('reglas')
    .select('id, clave, tipo, clasificacion, categoria_gasto_id, confirmaciones, correcciones, activa')
    .eq('activa', true)
  if (errReglas) throw errReglas

  const { resumen, nuevos } = await prepararImportacion(cartola, reglas as ReglaMin[], huellasEnBase)

  const { data: imp, error: errImp } = await supabase
    .from('importaciones')
    .insert({
      archivo_nombre: cartola.archivo,
      tipo: resumen.tipo,
      periodo_desde: resumen.desde,
      periodo_hasta: resumen.hasta,
      filas: resumen.filas,
      nuevas: resumen.nuevas,
      duplicadas: resumen.duplicadas,
    })
    .select('id')
    .single()
  if (errImp) throw errImp

  for (const lote of lotes(nuevos)) {
    const { error } = await supabase.from('movimientos').insert(
      lote.map((m) => ({
        importacion_id: imp.id,
        fecha: m.fecha,
        tipo: m.tipo,
        monto: m.monto,
        origen: m.origen,
        medio: m.medio,
        descripcion_original: m.descripcion_original,
        clave: m.clave,
        cuota: m.cuota,
        nro_operacion: m.nro_operacion,
        estado: m.estado,
        clasificacion: m.clasificacion,
        categoria_gasto_id: m.categoria_gasto_id,
        regla_id: m.regla_id,
        huella: m.huella,
      })),
    )
    if (error) throw error
  }

  return resumen
}
