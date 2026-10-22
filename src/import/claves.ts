import type { TipoMovimiento } from '../lib/types'
import { normalizarClave } from './normalizar'

export type TipoDescripcion = 'compra' | 'transferencia_recibida' | 'transferencia_enviada' | 'otro'

export interface ClaveExtraida {
  clave: string
  tipo: TipoDescripcion
}

// Formatos vistos en cartolas reales de BICE (cuenta corriente):
//   Cargo por compra en COMERCIO el 01/03/2026 a las …   (a veces "el01/03/2026")
//   Transferencia de ORIGEN Rut … desde Banco BICE a DESTINO Rut … a Cuenta …
//   Abono por transferencia de ORIGEN Rut … desde B.Santander el …
//   Transferencia a DESTINO Rut … (formato del plan, se mantiene por si aparece)
//   Cargo por transferencia a DESTINO a Cuenta … de B.Santander el …   (PDF)
//   Cargo por Giro en CAJERO El …   (giro en cajero automático)
//   Devolucion por compra en COMERCIO el …
const RE_COMPRA = /^\s*(?:cargo|devoluci[oó]n)\s+por\s+compra\s+en\s+(.+?)(?:\s+el\s*\d.*)?\s*$/i
const RE_GIRO = /^\s*cargo\s+por\s+giro\b/i
const RE_CARGO_TRANSF_A = /^\s*cargo\s+por\s+transferencia\s+a\s+(.+?)(?:\s+rut\b.*|\s+a\s+cuenta\b.*|\s+desde\b.*|\s+el\s*\d.*)?\s*$/i
const RE_TRANSF_DE_A = /^\s*transferencia\s+de\s+(.+?)\s+(?:rut\s+)?[\d.\s]+-\s*[\dkK]\s+desde\s+.+?\s+a\s+(.+?)\s+(?:rut\s+)?[\d.\s]+-\s*[\dkK]\b/i
const RE_ABONO_DE = /^\s*abono\s+por\s+transferencia\s+de\s+(.+?)(?:\s+rut\b.*|\s+desde\s+.*)?\s*$/i
const RE_TRANSF_DE = /^\s*transferencia\s+de\s+(.+?)(?:\s+rut\b.*|\s+desde\s+.*)?\s*$/i
const RE_TRANSF_A = /^\s*transferencia\s+a\s+(.+?)(?:\s+rut\b.*|\s+cuenta\b.*|\s+(?:al?|en)\s+banco\b.*|\s+banco\b.*)?\s*$/i

/**
 * Saca el comercio / remitente / destinatario desde la descripción de la
 * cartola de cuenta corriente BICE. Nunca incluye RUT.
 * En "Transferencia de A … a B", la contraparte depende del signo:
 * si es un cargo la clave es B (a quién se pagó); si es un abono, A (quién pagó).
 */
export function extraerClave(descripcion: string, tipoMov?: TipoMovimiento): ClaveExtraida {
  const d = descripcion.replace(/\s+/g, ' ').trim()
  let m: RegExpMatchArray | null

  if ((m = d.match(RE_COMPRA))) return { clave: normalizarClave(m[1]), tipo: 'compra' }
  if (RE_GIRO.test(d)) return { clave: 'GIRO CAJERO', tipo: 'otro' }
  if ((m = d.match(RE_CARGO_TRANSF_A))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_enviada' }
  if ((m = d.match(RE_TRANSF_DE_A))) {
    return tipoMov === 'gasto'
      ? { clave: normalizarClave(m[2]), tipo: 'transferencia_enviada' }
      : { clave: normalizarClave(m[1]), tipo: 'transferencia_recibida' }
  }
  if ((m = d.match(RE_ABONO_DE))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_recibida' }
  if ((m = d.match(RE_TRANSF_DE))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_recibida' }
  if ((m = d.match(RE_TRANSF_A))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_enviada' }

  return { clave: normalizarClave(d), tipo: 'otro' }
}
