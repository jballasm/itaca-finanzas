// Cálculo de una venta: precios de catálogo, packs y ajuste.
import type { Producto } from '../lib/types'

export type PrecioProducto = Pick<Producto, 'id' | 'precio' | 'precio_pack' | 'unidades_pack'>

/** Subtotal aplicando el precio de pack por cada grupo completo (Aura: 2 por $40.990). */
export function subtotal(p: PrecioProducto, cantidad: number): number {
  if (cantidad <= 0) return 0
  if (p.precio_pack != null && p.unidades_pack && p.unidades_pack > 1) {
    const packs = Math.floor(cantidad / p.unidades_pack)
    return packs * p.precio_pack + (cantidad - packs * p.unidades_pack) * p.precio
  }
  return cantidad * p.precio
}

export type Seleccion = Record<string, number> // producto_id → cantidad

export function totalProductos(sel: Seleccion, productos: PrecioProducto[]): { unidades: number; monto: number } {
  let unidades = 0
  let monto = 0
  for (const p of productos) {
    const q = sel[p.id] ?? 0
    unidades += q
    monto += subtotal(p, q)
  }
  return { unidades, monto }
}

export interface ItemVenta {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

/**
 * Filas para venta_items. El precio unitario es el promedio efectivo
 * (con pack incluido) para que cantidad × precio_unitario ≈ subtotal.
 */
export function itemsVenta(sel: Seleccion, productos: PrecioProducto[]): ItemVenta[] {
  return productos
    .filter((p) => (sel[p.id] ?? 0) > 0)
    .map((p) => {
      const q = sel[p.id]
      return { producto_id: p.id, cantidad: q, precio_unitario: Math.round(subtotal(p, q) / q) }
    })
}

/** Desde la cartola el total está fijo: el ajuste es lo que falta o sobra. */
export function ajusteContraMonto(montoMovimiento: number, montoProductos: number): number {
  return montoMovimiento - montoProductos
}

/** "+$1.234" → 1234; "-2.000" → -2000; texto vacío → 0. */
export function parseAjuste(texto: string): number {
  const negativo = /^\s*[-−]/.test(texto)
  const n = Number(texto.replace(/[^\d]/g, '') || '0')
  return negativo ? -n : n
}
