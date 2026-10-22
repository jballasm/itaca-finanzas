import type { MovimientoParseado } from './bice'

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Huella anti-duplicados (plan §6). */
export function huellaBase(m: MovimientoParseado): string {
  return [m.origen, m.fecha, m.monto, m.descripcion_original, m.nro_operacion ?? '', m.cuota ?? ''].join('|')
}

/**
 * Calcula las huellas de un archivo. Si dentro del mismo archivo hay filas
 * idénticas (dos compras iguales el mismo día), cada repetición recibe un
 * sufijo `#n`, así ambas se guardan y reimportar el archivo sigue sin duplicar.
 */
export async function calcularHuellas(movs: MovimientoParseado[]): Promise<string[]> {
  const vistas = new Map<string, number>()
  return Promise.all(
    movs.map((m) => {
      const base = huellaBase(m)
      const n = vistas.get(base) ?? 0
      vistas.set(base, n + 1)
      return sha256(n === 0 ? base : `${base}#${n}`)
    }),
  )
}
