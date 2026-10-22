// Cálculos de Inicio y Reportes. Solo cuenta lo confirmado como Ítaca:
// lo "No es de Ítaca" y lo pendiente de revisar no entra en ningún resumen.

export interface ItemReporte {
  cantidad: number
  precio_unitario: number
  producto_id: string
  producto: string
  categoria_producto_id: string
}

export interface MovReporte {
  id: string
  fecha: string // YYYY-MM-DD
  tipo: 'gasto' | 'ingreso'
  monto: number
  categoria_gasto_id: string | null
  subtipo_ingreso: 'venta' | 'otro' | null
  items: ItemReporte[]
}

/** "2026-10" */
export type Mes = string

export const mesDe = (fecha: string): Mes => fecha.slice(0, 7)

export function sumarMeses(mes: Mes, n: number): Mes {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

/** Meses desde `desde` hasta `hasta`, ambos incluidos. */
export function rangoMeses(desde: Mes, hasta: Mes): Mes[] {
  const out: Mes[] = []
  for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) out.push(m)
  return out
}

export function primerDia(mes: Mes): string {
  return `${mes}-01`
}

export function ultimoDia(mes: Mes): string {
  const [a, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, '0')}`
}

export interface Totales {
  ingresos: number
  gastos: number
  neta: number
}

export function totales(movs: MovReporte[]): Totales {
  let ingresos = 0
  let gastos = 0
  for (const m of movs) {
    if (m.tipo === 'ingreso') ingresos += m.monto
    else gastos += m.monto
  }
  return { ingresos, gastos, neta: ingresos - gastos }
}

export function delMes(movs: MovReporte[], mes: Mes): MovReporte[] {
  return movs.filter((m) => mesDe(m.fecha) === mes)
}

export function enMeses(movs: MovReporte[], meses: Mes[]): MovReporte[] {
  const s = new Set(meses)
  return movs.filter((m) => s.has(mesDe(m.fecha)))
}

export function serieMensual(movs: MovReporte[], meses: Mes[]): ({ mes: Mes } & Totales)[] {
  return meses.map((mes) => ({ mes, ...totales(delMes(movs, mes)) }))
}

/**
 * Variación de la ganancia neta respecto al mes anterior, en %.
 * null si no hay base comparable (mes anterior en 0).
 */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 100)
}

export interface Fila {
  id: string
  nombre: string
  monto: number
  unidades?: number
}

export function gastosPorCategoria(movs: MovReporte[], nombres: Map<string, string>): Fila[] {
  const acc = new Map<string, number>()
  for (const m of movs) {
    if (m.tipo !== 'gasto') continue
    const k = m.categoria_gasto_id ?? ''
    acc.set(k, (acc.get(k) ?? 0) + m.monto)
  }
  return [...acc]
    .map(([id, monto]) => ({ id, nombre: nombres.get(id) ?? 'Sin categoría', monto }))
    .sort((a, b) => b.monto - a.monto)
}

export function ventasPorProducto(movs: MovReporte[]): Fila[] {
  const acc = new Map<string, Fila>()
  for (const m of movs) {
    for (const i of m.items) {
      const f = acc.get(i.producto_id) ?? { id: i.producto_id, nombre: i.producto, monto: 0, unidades: 0 }
      f.monto += i.cantidad * i.precio_unitario
      f.unidades! += i.cantidad
      acc.set(i.producto_id, f)
    }
  }
  return [...acc.values()].sort((a, b) => b.monto - a.monto || b.unidades! - a.unidades!)
}

export function ventasPorCategoriaProducto(movs: MovReporte[], nombres: Map<string, string>): Fila[] {
  const acc = new Map<string, number>()
  for (const m of movs) {
    for (const i of m.items) acc.set(i.categoria_producto_id, (acc.get(i.categoria_producto_id) ?? 0) + i.cantidad * i.precio_unitario)
  }
  return [...acc]
    .map(([id, monto]) => ({ id, nombre: nombres.get(id) ?? 'Otros', monto }))
    .sort((a, b) => b.monto - a.monto)
}

/**
 * Diferencia entre lo cobrado y el precio de catálogo de los productos
 * (descuentos, envíos cobrados, ingresos de Ítaca que no son venta).
 */
export function ajustesVentas(movs: MovReporte[]): number {
  let cobrado = 0
  let productos = 0
  for (const m of movs) {
    if (m.tipo !== 'ingreso') continue
    cobrado += m.monto
    for (const i of m.items) productos += i.cantidad * i.precio_unitario
  }
  return cobrado - productos
}

/** Porcentajes enteros que suman 100 (método del mayor resto). */
export function porcentajes(montos: number[]): number[] {
  const total = montos.reduce((s, x) => s + x, 0)
  if (total <= 0) return montos.map(() => 0)
  const exactos = montos.map((x) => (x / total) * 100)
  const base = exactos.map(Math.floor)
  let falta = 100 - base.reduce((s, x) => s + x, 0)
  const orden = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of orden) {
    if (falta <= 0) break
    base[i]++
    falta--
  }
  return base
}

/** "Venta · Sifnos ×1, Aura ×2" */
export function resumenVenta(items: ItemReporte[]): string {
  return items.map((i) => `${i.producto} ×${i.cantidad}`).join(', ')
}
