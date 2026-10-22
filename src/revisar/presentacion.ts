// Cómo se muestra un movimiento en las tarjetas (render 04-revisar).
import { extraerClave } from '../import/claves'
import { fechaCorta } from '../lib/format'
import type { Movimiento } from '../lib/types'

type MovMin = Pick<Movimiento, 'fecha' | 'tipo' | 'origen' | 'medio' | 'descripcion_original' | 'clave' | 'cuota' | 'nota'>

/** "ANA PEREZ SOTO" → "Ana Perez Soto" */
export function capitalizar(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase())
}

function recortar(s: string, n = 48): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

export function titulo(m: MovMin): string {
  if (m.origen === 'manual') return m.nota?.trim() || (m.tipo === 'ingreso' ? 'Ingreso en efectivo' : 'Gasto manual')
  if (m.origen === 'bice_tc') return m.clave || recortar(m.descripcion_original)
  const { tipo } = extraerClave(m.descripcion_original, m.tipo)
  if (tipo === 'compra') return m.clave
  if (tipo === 'transferencia_recibida') return `Transferencia de ${capitalizar(m.clave)}`
  if (tipo === 'transferencia_enviada') return `Transferencia a ${capitalizar(m.clave)}`
  return recortar(m.descripcion_original)
}

export function detalle(m: MovMin): string {
  if (m.origen === 'manual') return m.medio === 'efectivo' ? 'Efectivo' : 'Transferencia'
  if (m.origen === 'bice_tc') {
    if (m.tipo === 'ingreso') return 'Pago tarjeta de crédito'
    return m.cuota && m.cuota !== '1 de 1' ? `Tarjeta de crédito · cuota ${m.cuota}` : 'Tarjeta de crédito'
  }
  const { tipo } = extraerClave(m.descripcion_original, m.tipo)
  if (tipo === 'compra') return 'Compra con débito'
  if (tipo === 'transferencia_enviada') return 'Transferencia enviada'
  return m.tipo === 'ingreso' ? 'Abono cuenta corriente' : 'Cargo cuenta corriente'
}

export function subtitulo(m: MovMin): string {
  return `${fechaCorta(m.fecha)} · ${detalle(m)}`
}
