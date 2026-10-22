import { normalizarClave } from '../import/normalizar'
import { supabase } from '../lib/supabase'
import type { Medio } from '../lib/types'
import { clasificar, type Mov } from '../revisar/clasificar'
import type { ItemVenta } from './calculo'

async function reemplazarItems(movimientoId: string, items: ItemVenta[]) {
  const { error: e1 } = await supabase.from('venta_items').delete().eq('movimiento_id', movimientoId)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('venta_items').insert(items.map((i) => ({ ...i, movimiento_id: movimientoId })))
  if (e2) throw e2
}

/** Venta sobre un movimiento existente (de la cartola o manual que se edita). */
export async function guardarVentaExistente(
  mov: Mov,
  items: ItemVenta[],
  op: { recordar: boolean; nota: string | null; monto?: number; medio?: Medio; fecha?: string },
) {
  await reemplazarItems(mov.id, items)
  await clasificar([mov], { clasificacion: 'itaca', categoria_gasto_id: null }, { recordar: op.recordar, subtipo_ingreso: 'venta' })
  const cambios: Record<string, unknown> = { nota: op.nota }
  if (mov.origen === 'manual') Object.assign(cambios, { monto: op.monto, medio: op.medio, fecha: op.fecha })
  const { error } = await supabase.from('movimientos').update(cambios).eq('id', mov.id)
  if (error) throw error
}

const huellaManual = () => `manual:${crypto.randomUUID()}`

export async function crearVentaManual(
  items: ItemVenta[],
  op: { fecha: string; monto: number; medio: Medio; nota: string | null },
) {
  const { data, error } = await supabase
    .from('movimientos')
    .insert({
      fecha: op.fecha,
      tipo: 'ingreso',
      monto: op.monto,
      origen: 'manual',
      medio: op.medio,
      descripcion_original: op.medio === 'efectivo' ? 'Venta en efectivo' : 'Venta por transferencia',
      clave: '',
      estado: 'confirmado',
      clasificacion: 'itaca',
      subtipo_ingreso: 'venta',
      nota: op.nota,
      huella: huellaManual(),
    })
    .select('id')
    .single()
  if (error) throw error
  try {
    await reemplazarItems(data.id as string, items)
  } catch (e) {
    // No dejar una venta sin productos.
    await supabase.from('movimientos').delete().eq('id', data.id)
    throw e
  }
}

export async function crearGastoManual(op: {
  fecha: string
  monto: number
  medio: Medio
  descripcion: string
  categoria_gasto_id: string
}) {
  const { error } = await supabase.from('movimientos').insert({
    fecha: op.fecha,
    tipo: 'gasto',
    monto: op.monto,
    origen: 'manual',
    medio: op.medio,
    descripcion_original: op.descripcion,
    clave: normalizarClave(op.descripcion),
    estado: 'confirmado',
    clasificacion: 'itaca',
    categoria_gasto_id: op.categoria_gasto_id,
    nota: op.descripcion,
    huella: huellaManual(),
  })
  if (error) throw error
}

export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
