// Guardar decisiones de Tere en Supabase y hacer aprender a las reglas.
import { supabase } from '../lib/supabase'
import type { Movimiento, Regla, SubtipoIngreso } from '../lib/types'
import { aprender, type DecisionTere } from './aprendizaje'

export const COLUMNAS_MOV =
  'id, fecha, tipo, monto, origen, medio, descripcion_original, clave, cuota, nro_operacion, estado, clasificacion, categoria_gasto_id, subtipo_ingreso, regla_id, nota, importacion_id'

export type Mov = Pick<
  Movimiento,
  | 'id' | 'fecha' | 'tipo' | 'monto' | 'origen' | 'medio' | 'descripcion_original' | 'clave' | 'cuota'
  | 'nro_operacion' | 'estado' | 'clasificacion' | 'categoria_gasto_id' | 'subtipo_ingreso' | 'regla_id' | 'nota' | 'importacion_id'
>

const COLUMNAS_REGLA = 'id, clave, tipo, clasificacion, categoria_gasto_id, confirmaciones, correcciones, activa'

/** Crea o ajusta la regla de (clave, tipo) y devuelve su id. */
async function aprenderRegla(clave: string, tipo: Mov['tipo'], d: DecisionTere, veces: number): Promise<string> {
  const { data: prev, error } = await supabase
    .from('reglas')
    .select(COLUMNAS_REGLA)
    .eq('clave', clave)
    .eq('tipo', tipo)
    .maybeSingle<Regla>()
  if (error) throw error

  const campos = aprender(prev ?? undefined, d, veces)
  if (prev) {
    const { error: e } = await supabase.from('reglas').update(campos).eq('id', prev.id)
    if (e) throw e
    return prev.id
  }
  const { data, error: e } = await supabase.from('reglas').insert({ clave, tipo, ...campos }).select('id').single()
  if (e) throw e
  return data.id as string
}

export interface OpcionesClasificar {
  /** "Recordar para próximas veces": crea / ajusta la regla. */
  recordar: boolean
  subtipo_ingreso?: SubtipoIngreso | null
}

/**
 * Confirma uno o varios movimientos con la misma clave y tipo con una decisión.
 * Todos cuentan para la regla (por eso "aplicar a los iguales" acelera el aprendizaje).
 */
export async function clasificar(movs: Mov[], d: DecisionTere, op: OpcionesClasificar): Promise<void> {
  if (movs.length === 0) return
  const { clave, tipo } = movs[0]
  if (movs.some((m) => m.clave !== clave || m.tipo !== tipo)) throw new Error('clasificar: movimientos con distinta clave')

  const reglaId = op.recordar && clave ? await aprenderRegla(clave, tipo, d, movs.length) : null
  const esItaca = d.clasificacion === 'itaca'

  const { error } = await supabase
    .from('movimientos')
    .update({
      estado: 'confirmado',
      clasificacion: d.clasificacion,
      categoria_gasto_id: esItaca && tipo === 'gasto' ? d.categoria_gasto_id : null,
      subtipo_ingreso: esItaca && tipo === 'ingreso' ? (op.subtipo_ingreso ?? null) : null,
      regla_id: reglaId,
    })
    .in('id', movs.map((m) => m.id))
  if (error) throw error

  // Si deja de ser una venta, sus productos ya no corresponden.
  if (!(esItaca && op.subtipo_ingreso === 'venta')) {
    const ventas = movs.filter((m) => m.subtipo_ingreso === 'venta').map((m) => m.id)
    if (ventas.length) {
      const { error: e } = await supabase.from('venta_items').delete().in('movimiento_id', ventas)
      if (e) throw e
    }
  }
}

/**
 * "Confirmar todas las sugerencias": solo gastos. Las ventas siempre piden
 * productos (plan §7.7), así que los ingresos sugeridos no se confirman en bloque.
 */
export function confirmables(sugeridos: Mov[]): Mov[] {
  return sugeridos.filter((m) => m.estado === 'sugerido' && m.clasificacion && (m.tipo === 'gasto' || m.clasificacion === 'no_itaca'))
}

export async function confirmarSugerencias(sugeridos: Mov[]): Promise<number> {
  const movs = confirmables(sugeridos)
  if (movs.length === 0) return 0

  const porRegla = new Map<string, number>()
  for (const m of movs) if (m.regla_id) porRegla.set(m.regla_id, (porRegla.get(m.regla_id) ?? 0) + 1)

  if (porRegla.size) {
    const { data: reglas, error } = await supabase.from('reglas').select('id, confirmaciones').in('id', [...porRegla.keys()])
    if (error) throw error
    for (const r of reglas) {
      const { error: e } = await supabase
        .from('reglas')
        .update({ confirmaciones: (r.confirmaciones as number) + (porRegla.get(r.id as string) ?? 0) })
        .eq('id', r.id)
      if (e) throw e
    }
  }

  const { error } = await supabase.from('movimientos').update({ estado: 'confirmado' }).in('id', movs.map((m) => m.id))
  if (error) throw error
  return movs.length
}
