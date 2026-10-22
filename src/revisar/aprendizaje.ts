// Cómo cambia una regla cuando Tere decide sobre un movimiento (plan §7, pasos 3–4).
import type { Clasificacion, Regla } from '../lib/types'

export interface DecisionTere {
  clasificacion: Clasificacion
  /** Solo para gastos de Ítaca. */
  categoria_gasto_id: string | null
}

export type CamposRegla = Pick<Regla, 'clasificacion' | 'categoria_gasto_id' | 'confirmaciones' | 'correcciones' | 'activa'>

export function mismaDecision(a: DecisionTere, b: DecisionTere): boolean {
  return a.clasificacion === b.clasificacion && (a.categoria_gasto_id ?? null) === (b.categoria_gasto_id ?? null)
}

/**
 * Nuevo estado de la regla tras `veces` decisiones iguales.
 * - Sin regla: se crea con esas confirmaciones.
 * - Misma decisión: suma confirmaciones.
 * - Decisión distinta (corrección): la regla adopta la nueva decisión, suma
 *   una corrección y las confirmaciones parten de nuevo; así tiene que volver
 *   a ganarse la confianza antes de sugerir otra vez.
 */
export function aprender(prev: CamposRegla | undefined, d: DecisionTere, veces = 1): CamposRegla {
  if (!prev) {
    return { clasificacion: d.clasificacion, categoria_gasto_id: d.categoria_gasto_id, confirmaciones: veces, correcciones: 0, activa: true }
  }
  if (mismaDecision(prev, d)) {
    return { ...prev, confirmaciones: prev.confirmaciones + veces, activa: true }
  }
  return {
    clasificacion: d.clasificacion,
    categoria_gasto_id: d.categoria_gasto_id,
    confirmaciones: veces,
    correcciones: prev.correcciones + 1,
    activa: true,
  }
}
