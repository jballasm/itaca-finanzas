import { normalizarClave } from './normalizar'

export type TipoDescripcion = 'compra' | 'transferencia_recibida' | 'transferencia_enviada' | 'otro'

export interface ClaveExtraida {
  clave: string
  tipo: TipoDescripcion
}

// "Cargo por compra en COMERCIO el 02/03/2026" (a veces sin " el …")
const RE_COMPRA = /^\s*cargo\s+por\s+compra\s+en\s+(.+?)(?:\s+el\s+\d.*)?\s*$/i
// "Transferencia de NOMBRE Rut 12.345.678-9 desde Banco X"
const RE_TRANSF_DE = /^\s*transferencia\s+de\s+(.+?)(?:\s+rut\b.*|\s+desde\s+.*)?\s*$/i
// "Transferencia a NOMBRE Rut … Cuenta … Banco …"
const RE_TRANSF_A = /^\s*transferencia\s+a\s+(.+?)(?:\s+rut\b.*|\s+cuenta\b.*|\s+(?:al?|en)\s+banco\b.*|\s+banco\b.*)?\s*$/i

/**
 * Saca el comercio / remitente / destinatario desde la descripción de la
 * cartola de cuenta corriente BICE. Nunca incluye RUT.
 */
export function extraerClave(descripcion: string): ClaveExtraida {
  const d = descripcion.trim()
  let m: RegExpMatchArray | null

  if ((m = d.match(RE_COMPRA))) return { clave: normalizarClave(m[1]), tipo: 'compra' }
  if ((m = d.match(RE_TRANSF_DE))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_recibida' }
  if ((m = d.match(RE_TRANSF_A))) return { clave: normalizarClave(m[1]), tipo: 'transferencia_enviada' }

  return { clave: normalizarClave(d), tipo: 'otro' }
}
