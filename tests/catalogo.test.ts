import { describe, expect, it } from 'vitest'
import { edicionPrincipal, mover, reglaEditada, validarProducto, type FormProducto } from '../src/catalogo/reglas'
import { aplicarRegla, indexarReglas } from '../src/import/reglas'

const base: FormProducto = {
  nombre: 'Santorini',
  categoria_producto_id: 'collares',
  precio: '45.000',
  conPack: false,
  unidades_pack: '2',
  precio_pack: '',
  edicion: 'Edición 02',
}

describe('validarProducto', () => {
  it('producto simple', () => {
    expect(validarProducto(base, [])).toEqual({
      nombre: 'Santorini', categoria_producto_id: 'collares', precio: 45000, precio_pack: null, unidades_pack: null, edicion: 'Edición 02',
    })
  })
  it('nombre repetido aunque cambien tildes o mayúsculas', () => {
    expect(validarProducto({ ...base, nombre: 'naxos' }, ['Náxos'])).toMatch(/Ya existe/)
  })
  it('requiere precio', () => {
    expect(validarProducto({ ...base, precio: '' }, [])).toMatch(/precio/)
  })
  it('pack válido', () => {
    const r = validarProducto({ ...base, conPack: true, precio: '23990', precio_pack: '40.990' }, [])
    expect(r).toMatchObject({ precio_pack: 40990, unidades_pack: 2 })
  })
  it('pack que no es más barato se rechaza', () => {
    expect(validarProducto({ ...base, conPack: true, precio: '20000', precio_pack: '40000' }, [])).toMatch(/menos/)
  })
  it('pack de 1 unidad se rechaza', () => {
    expect(validarProducto({ ...base, conPack: true, unidades_pack: '1', precio_pack: '1000' }, [])).toMatch(/2 o más/)
  })
  it('edición vacía queda en null', () => {
    expect(validarProducto({ ...base, edicion: '  ' }, [])).toMatchObject({ edicion: null })
  })
})

describe('reglaEditada', () => {
  it('queda lista para sugerir aunque tuviera pocas confirmaciones o correcciones', () => {
    const r = reglaEditada({ confirmaciones: 1 }, { clasificacion: 'itaca', categoria_gasto_id: 'envios' })
    expect(r).toEqual({ clasificacion: 'itaca', categoria_gasto_id: 'envios', confirmaciones: 2, correcciones: 0, activa: true })
    const d = aplicarRegla('X', 'gasto', indexarReglas([{ id: 'r', clave: 'X', tipo: 'gasto', ...r }]))
    expect(d.estado).toBe('sugerido')
  })
  it('No es de Ítaca borra la categoría', () => {
    expect(reglaEditada({ confirmaciones: 5 }, { clasificacion: 'no_itaca', categoria_gasto_id: 'envios' })).toMatchObject({
      categoria_gasto_id: null,
      confirmaciones: 5,
    })
  })
})

describe('mover y edición', () => {
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('mover', () => {
    expect(mover(lista, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(mover(lista, 2, 1)).toEqual(['a', 'b', 'c'])
  })
  it('edicionPrincipal ignora desactivados', () => {
    expect(
      edicionPrincipal([
        { edicion: 'Edición 01', activo: true },
        { edicion: 'Edición 01', activo: true },
        { edicion: 'Edición 02', activo: true },
        { edicion: 'Edición 02', activo: false },
        { edicion: 'Edición 02', activo: false },
      ]),
    ).toBe('Edición 01')
  })
})
