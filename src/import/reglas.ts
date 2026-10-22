import type { Clasificacion, Estado, Regla, TipoMovimiento } from '../lib/types'

// Motor de aprendizaje (plan §7).
export const CONFIANZA_MINIMA = 0.8
export const CONFIRMACIONES_MINIMAS = 2

export type ReglaMin = Pick<
  Regla,
  'id' | 'clave' | 'tipo' | 'clasificacion' | 'categoria_gasto_id' | 'confirmaciones' | 'correcciones' | 'activa'
>

export function confianza(r: Pick<Regla, 'confirmaciones' | 'correcciones'>): number {
  const total = r.confirmaciones + r.correcciones
  return total === 0 ? 0 : r.confirmaciones / total
}

export function esConfiable(r: ReglaMin): boolean {
  return r.activa && r.confirmaciones >= CONFIRMACIONES_MINIMAS && confianza(r) >= CONFIANZA_MINIMA
}

export interface Decision {
  estado: Estado
  clasificacion: Clasificacion | null
  categoria_gasto_id: string | null
  regla_id: string | null
}

export const claveRegla = (clave: string, tipo: TipoMovimiento) => `${tipo}:${clave}`

export function indexarReglas(reglas: ReglaMin[]): Map<string, ReglaMin> {
  return new Map(reglas.map((r) => [claveRegla(r.clave, r.tipo), r]))
}

/**
 * Regla confiable "No es de Ítaca" → se confirma sola (no va a Revisar).
 * Regla confiable "Ítaca" → queda como sugerencia, Tere la confirma.
 * Sin regla o con baja confianza → por revisar.
 */
export function aplicarRegla(clave: string, tipo: TipoMovimiento, reglas: Map<string, ReglaMin>): Decision {
  const r = clave ? reglas.get(claveRegla(clave, tipo)) : undefined
  if (!r || !esConfiable(r)) {
    return { estado: 'por_revisar', clasificacion: null, categoria_gasto_id: null, regla_id: null }
  }
  return {
    estado: r.clasificacion === 'no_itaca' ? 'confirmado' : 'sugerido',
    clasificacion: r.clasificacion,
    categoria_gasto_id: r.clasificacion === 'itaca' && tipo === 'gasto' ? r.categoria_gasto_id : null,
    regla_id: r.id,
  }
}
