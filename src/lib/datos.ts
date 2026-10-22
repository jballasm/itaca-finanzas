import { useCallback, useEffect, useState } from 'react'
import { COLUMNAS_MOV, type Mov } from '../revisar/clasificar'
import { supabase } from './supabase'
import type { CategoriaGasto, Estado } from './types'

export async function cargarCategoriasGasto(): Promise<CategoriaGasto[]> {
  const { data, error } = await supabase.from('categorias_gasto').select('*').eq('activa', true).order('orden')
  if (error) throw error
  return data as CategoriaGasto[]
}

export async function cargarMovimientos(estados?: Estado[], limite = 1000): Promise<Mov[]> {
  let q = supabase.from('movimientos').select(COLUMNAS_MOV).order('fecha', { ascending: false }).order('created_at').limit(limite)
  if (estados) q = q.in('estado', estados)
  const { data, error } = await q
  if (error) throw error
  return data as Mov[]
}

/** Carga datos y permite recargar; `error` es un texto listo para mostrar. */
export function useCarga<T>(fn: () => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vivo = true
    fn()
      .then((d) => vivo && (setDatos(d), setError(null)))
      .catch((e) => {
        console.error(e)
        if (vivo) setError('No pudimos cargar los datos. Revisa tu conexión.')
      })
    return () => {
      vivo = false
    }
    // fn se define en cada render; recargamos solo con `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { datos, error, recargar }
}

/** Otros movimientos pendientes con la misma clave y tipo. */
export function igualesPendientes(m: Mov, pendientes: Mov[]): Mov[] {
  if (!m.clave) return []
  return pendientes.filter((o) => o.id !== m.id && o.clave === m.clave && o.tipo === m.tipo && o.estado !== 'confirmado')
}
