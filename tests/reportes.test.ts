import { describe, expect, it } from 'vitest'
import {
  ajustesVentas, delMes, gastosPorCategoria, porcentajes, rangoMeses, resumenVenta, serieMensual,
  sumarMeses, totales, ultimoDia, variacion, ventasPorCategoriaProducto, ventasPorProducto, type MovReporte,
} from '../src/reportes/agregar'

const item = (producto: string, cantidad: number, precio: number, cat = 'aros') => ({
  producto_id: producto.toLowerCase(), producto, cantidad, precio_unitario: precio, categoria_producto_id: cat,
})

const movs: MovReporte[] = [
  { id: '1', fecha: '2026-10-18', tipo: 'ingreso', monto: 60000, categoria_gasto_id: null, subtipo_ingreso: 'venta', items: [item('Sifnos', 1, 60000)] },
  { id: '2', fecha: '2026-10-20', tipo: 'ingreso', monto: 95000, categoria_gasto_id: null, subtipo_ingreso: 'venta',
    items: [item('Paros', 2, 30000), item('Aura', 2, 20495, 'pulseras')] },
  { id: '3', fecha: '2026-10-16', tipo: 'gasto', monto: 24300, categoria_gasto_id: 'hilos', subtipo_ingreso: null, items: [] },
  { id: '4', fecha: '2026-10-02', tipo: 'gasto', monto: 4990, categoria_gasto_id: 'envios', subtipo_ingreso: null, items: [] },
  { id: '5', fecha: '2026-10-05', tipo: 'gasto', monto: 10000, categoria_gasto_id: 'hilos', subtipo_ingreso: null, items: [] },
  { id: '6', fecha: '2026-09-10', tipo: 'gasto', monto: 50000, categoria_gasto_id: 'hilos', subtipo_ingreso: null, items: [] },
]

describe('meses', () => {
  it('sumarMeses cruza el año', () => {
    expect(sumarMeses('2026-11', 2)).toBe('2027-01')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
  })
  it('rangoMeses', () => {
    expect(rangoMeses('2026-05', '2026-10')).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
  })
  it('ultimoDia', () => {
    expect(ultimoDia('2026-02')).toBe('2026-02-28')
    expect(ultimoDia('2028-02')).toBe('2028-02-29')
    expect(ultimoDia('2026-10')).toBe('2026-10-31')
  })
})

describe('totales', () => {
  it('ganancia neta del mes', () => {
    expect(totales(delMes(movs, '2026-10'))).toEqual({ ingresos: 155000, gastos: 39290, neta: 115710 })
  })
  it('serie con meses vacíos y negativos', () => {
    expect(serieMensual(movs, ['2026-08', '2026-09'])).toEqual([
      { mes: '2026-08', ingresos: 0, gastos: 0, neta: 0 },
      { mes: '2026-09', ingresos: 0, gastos: 50000, neta: -50000 },
    ])
  })
  it('variación', () => {
    expect(variacion(294540, 251000)).toBe(17)
    expect(variacion(100, -100)).toBe(200)
    expect(variacion(100, 0)).toBeNull()
  })
})

describe('agrupaciones', () => {
  const oct = delMes(movs, '2026-10')
  it('gastos por categoría, de mayor a menor', () => {
    const r = gastosPorCategoria(oct, new Map([['hilos', 'Hilos y materiales'], ['envios', 'Envíos']]))
    expect(r).toEqual([
      { id: 'hilos', nombre: 'Hilos y materiales', monto: 34300 },
      { id: 'envios', nombre: 'Envíos', monto: 4990 },
    ])
  })
  it('ventas por producto con unidades (empate en $ → más unidades primero)', () => {
    expect(ventasPorProducto(oct).map((f) => [f.nombre, f.unidades, f.monto])).toEqual([
      ['Paros', 2, 60000],
      ['Sifnos', 1, 60000],
      ['Aura', 2, 40990],
    ])
  })
  it('ventas por categoría de producto', () => {
    expect(ventasPorCategoriaProducto(oct, new Map([['aros', 'Aros'], ['pulseras', 'Pulseras']]))).toEqual([
      { id: 'aros', nombre: 'Aros', monto: 120000 },
      { id: 'pulseras', nombre: 'Pulseras', monto: 40990 },
    ])
  })
  it('ajustes = cobrado − precio de productos', () => {
    expect(ajustesVentas(oct)).toBe(155000 - 160990)
  })
})

describe('porcentajes', () => {
  it('suman 100', () => {
    expect(porcentajes([325000, 107990])).toEqual([75, 25])
    expect(porcentajes([1, 1, 1])).toEqual([34, 33, 33])
    expect(porcentajes([0, 0])).toEqual([0, 0])
  })
})

it('resumenVenta', () => {
  expect(resumenVenta([item('Sifnos', 1, 60000), item('Aura', 2, 20495)])).toBe('Sifnos ×1, Aura ×2')
})
