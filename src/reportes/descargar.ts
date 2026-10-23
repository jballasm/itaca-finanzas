import { supabase } from '../lib/supabase'
import { titulo } from '../revisar/presentacion'
import { delMes, primerDia, sumarMeses, totales, ultimoDia, type Mes } from './agregar'
import { cargarItaca, cargarNombres } from './datos'
import { generarReporteMensual, nombreArchivo, type DatosReporte } from './pdfMensual'

const MEDIO: Record<string, string> = { transferencia: 'Transferencia', efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito' }

async function cargarDatos(mes: Mes): Promise<DatosReporte> {
  const anterior = sumarMeses(mes, -1)
  const [movs, catGasto, catProd, orden, extra, pendientes, logo] = await Promise.all([
    cargarItaca(anterior, mes),
    cargarNombres('categorias_gasto'),
    cargarNombres('categorias_producto'),
    supabase.from('categorias_producto').select('id').order('orden'),
    supabase
      .from('movimientos')
      .select('id, medio, origen, descripcion_original, clave, tipo, fecha, cuota, nota')
      .eq('estado', 'confirmado')
      .eq('clasificacion', 'itaca')
      .gte('fecha', primerDia(mes))
      .lte('fecha', ultimoDia(mes)),
    supabase
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .neq('estado', 'confirmado')
      .gte('fecha', primerDia(mes))
      .lte('fecha', ultimoDia(mes)),
    fetch(`${import.meta.env.BASE_URL}logo.png`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
  ])
  if (orden.error) throw orden.error
  if (extra.error) throw extra.error
  if (pendientes.error) throw pendientes.error

  const hoy = new Date()
  return {
    mes,
    generado: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
    movs: delMes(movs, mes),
    anterior: totales(delMes(movs, anterior)),
    categoriasGasto: catGasto,
    categoriasProducto: catProd,
    ordenCategoriasProducto: orden.data.map((r) => r.id as string),
    descripciones: new Map(extra.data.map((m) => [m.id as string, titulo(m as Parameters<typeof titulo>[0])])),
    medios: new Map(extra.data.map((m) => [m.id as string, MEDIO[m.medio as string] ?? ''])),
    pendientes: pendientes.count ?? 0,
    logoPng: logo ? new Uint8Array(logo) : undefined,
  }
}

/**
 * Genera el PDF y lo entrega: en el celular abre el menú de compartir
 * (WhatsApp, Archivos, Drive…); en el computador lo descarga.
 */
export async function descargarReporte(mes: Mes): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const bytes = await generarReporteMensual(await cargarDatos(mes))
  const nombre = nombreArchivo(mes)
  const archivo = new File([bytes as BlobPart], nombre, { type: 'application/pdf' })

  const esMovil = matchMedia('(pointer: coarse)').matches
  if (esMovil && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre })
      return 'compartido'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado'
      // Si compartir falla, se descarga igual.
    }
  }
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'descargado'
}
