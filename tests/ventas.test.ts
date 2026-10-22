import { describe, expect, it } from 'vitest'
import { ajusteContraMonto, itemsVenta, parseAjuste, subtotal, totalProductos } from '../src/ventas/calculo'

const sifnos = { id: 'sifnos', precio: 60000, precio_pack: null, unidades_pack: null }
const aura = { id: 'aura', precio: 23990, precio_pack: 40990, unidades_pack: 2 }

describe('subtotal', () => {
  it('precio simple', () => {
    expect(subtotal(sifnos, 2)).toBe(120000)
    expect(subtotal(sifnos, 0)).toBe(0)
  })
  it('pack de Aura', () => {
    expect(subtotal(aura, 1)).toBe(23990)
    expect(subtotal(aura, 2)).toBe(40990)
    expect(subtotal(aura, 3)).toBe(40990 + 23990)
    expect(subtotal(aura, 4)).toBe(2 * 40990)
  })
})

describe('totalProductos e items', () => {
  const sel = { sifnos: 1, aura: 2 }
  it('suma unidades y monto', () => {
    expect(totalProductos(sel, [sifnos, aura])).toEqual({ unidades: 3, monto: 60000 + 40990 })
  })
  it('items con precio unitario efectivo (pack incluido)', () => {
    expect(itemsVenta(sel, [sifnos, aura])).toEqual([
      { producto_id: 'sifnos', cantidad: 1, precio_unitario: 60000 },
      { producto_id: 'aura', cantidad: 2, precio_unitario: 20495 },
    ])
  })
  it('no incluye productos en 0', () => {
    expect(itemsVenta({ sifnos: 0, aura: 1 }, [sifnos, aura]).map((i) => i.producto_id)).toEqual(['aura'])
  })
})

describe('ajuste', () => {
  it('contra el monto de la transferencia', () => {
    expect(ajusteContraMonto(60000, 60000)).toBe(0)
    expect(ajusteContraMonto(55000, 60000)).toBe(-5000) // descuento
    expect(ajusteContraMonto(63500, 60000)).toBe(3500) // envío cobrado
  })
  it('parseAjuste', () => {
    expect(parseAjuste('')).toBe(0)
    expect(parseAjuste('3.500')).toBe(3500)
    expect(parseAjuste('-$5.000')).toBe(-5000)
    expect(parseAjuste('−2000')).toBe(-2000)
  })
})
