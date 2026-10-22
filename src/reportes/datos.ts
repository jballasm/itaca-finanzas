import { createContext, createElement, useContext, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { mesDe, primerDia, ultimoDia, type Mes, type MovReporte } from './agregar'

interface FilaBD {
  id: string
  fecha: string
  tipo: 'gasto' | 'ingreso'
  monto: number
  categoria_gasto_id: string | null
  subtipo_ingreso: 'venta' | 'otro' | null
  venta_items: {
    cantidad: number
    precio_unitario: number
    producto_id: string
    productos: { nombre: string; categoria_producto_id: string } | null
  }[]
}

/** Movimientos confirmados como Ítaca entre dos meses, con sus productos. */
export async function cargarItaca(desde: Mes, hasta: Mes): Promise<MovReporte[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select(
      'id, fecha, tipo, monto, categoria_gasto_id, subtipo_ingreso, venta_items(cantidad, precio_unitario, producto_id, productos(nombre, categoria_producto_id))',
    )
    .eq('estado', 'confirmado')
    .eq('clasificacion', 'itaca')
    .gte('fecha', primerDia(desde))
    .lte('fecha', ultimoDia(hasta))
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as FilaBD[]).map((m) => ({
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo,
    monto: m.monto,
    categoria_gasto_id: m.categoria_gasto_id,
    subtipo_ingreso: m.subtipo_ingreso,
    items: m.venta_items.map((i) => ({
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      producto_id: i.producto_id,
      producto: i.productos?.nombre ?? 'Producto',
      categoria_producto_id: i.productos?.categoria_producto_id ?? '',
    })),
  }))
}

export async function cargarNombres(tabla: 'categorias_gasto' | 'categorias_producto'): Promise<Map<string, string>> {
  const { data, error } = await supabase.from(tabla).select('id, nombre')
  if (error) throw error
  return new Map(data.map((r) => [r.id as string, r.nombre as string]))
}

// Mes elegido, compartido por Inicio y Reportes.
const Ctx = createContext<{ mes: Mes; setMes: (m: Mes) => void } | null>(null)

export const mesActual = (): Mes => mesDe(new Date().toLocaleDateString('sv-SE'))

export function MesProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState<Mes>(mesActual)
  return createElement(Ctx.Provider, { value: { mes, setMes } }, children)
}

export function useMes() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useMes fuera de MesProvider')
  return c
}
