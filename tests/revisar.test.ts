import { describe, expect, it } from 'vitest'
import { aplicarRegla, indexarReglas } from '../src/import/reglas'
import { aprender, mismaDecision } from '../src/revisar/aprendizaje'
import { confirmables, type Mov } from '../src/revisar/clasificar'
import { capitalizar, subtitulo, titulo } from '../src/revisar/presentacion'

const hilos = { clasificacion: 'itaca', categoria_gasto_id: 'cat-hilos' } as const
const envios = { clasificacion: 'itaca', categoria_gasto_id: 'cat-envios' } as const
const noItaca = { clasificacion: 'no_itaca', categoria_gasto_id: null } as const

describe('aprender', () => {
  it('primera decisión crea la regla', () => {
    expect(aprender(undefined, hilos)).toEqual({ ...hilos, confirmaciones: 1, correcciones: 0, activa: true })
  })

  it('aplicar a N iguales cuenta N confirmaciones', () => {
    expect(aprender(undefined, noItaca, 3).confirmaciones).toBe(3)
  })

  it('misma decisión suma confirmaciones', () => {
    const r = aprender(aprender(undefined, hilos), hilos)
    expect(r).toMatchObject({ confirmaciones: 2, correcciones: 0 })
  })

  it('cambiar la categoría es una corrección: adopta la nueva y reinicia confirmaciones', () => {
    const prev = { ...hilos, confirmaciones: 5, correcciones: 0, activa: true }
    expect(aprender(prev, envios)).toEqual({ ...envios, confirmaciones: 1, correcciones: 1, activa: true })
  })

  it('cambiar Ítaca por No es de Ítaca también es corrección', () => {
    const prev = { ...hilos, confirmaciones: 2, correcciones: 1, activa: true }
    expect(aprender(prev, noItaca)).toMatchObject({ clasificacion: 'no_itaca', categoria_gasto_id: null, correcciones: 2 })
  })

  it('una regla desactivada vuelve a activarse al confirmarla', () => {
    expect(aprender({ ...hilos, confirmaciones: 3, correcciones: 0, activa: false }, hilos).activa).toBe(true)
  })

  it('ciclo completo con el motor de sugerencias', () => {
    const conId = (c: ReturnType<typeof aprender>) => ({ id: 'r', clave: 'TIENDA', tipo: 'gasto' as const, ...c })
    const sugerir = (c: ReturnType<typeof aprender>) => aplicarRegla('TIENDA', 'gasto', indexarReglas([conId(c)])).estado

    let r = aprender(undefined, hilos)
    expect(sugerir(r)).toBe('por_revisar') // 1 confirmación no basta
    r = aprender(r, hilos)
    expect(sugerir(r)).toBe('sugerido') // 2/2
    r = aprender(r, envios)
    expect(sugerir(r)).toBe('por_revisar') // corregida: 1/2
    for (let i = 0; i < 3; i++) r = aprender(r, envios)
    expect(r).toMatchObject({ confirmaciones: 4, correcciones: 1 })
    expect(sugerir(r)).toBe('sugerido') // 4/5 = 0,8
  })

  it('mismaDecision trata null y undefined igual', () => {
    expect(mismaDecision(noItaca, { clasificacion: 'no_itaca', categoria_gasto_id: undefined as unknown as null })).toBe(true)
  })
})

const mov = (p: Partial<Mov>): Mov => ({
  id: '1',
  fecha: '2026-10-18',
  tipo: 'gasto',
  monto: 1000,
  origen: 'bice_cuenta',
  medio: 'debito',
  descripcion_original: 'Cargo por compra en STARKEN el 15/10/2026',
  clave: 'STARKEN',
  cuota: null,
  nro_operacion: null,
  estado: 'por_revisar',
  clasificacion: null,
  categoria_gasto_id: null,
  subtipo_ingreso: null,
  regla_id: null,
  nota: null,
  importacion_id: null,
  ...p,
})

describe('confirmables (confirmar en bloque)', () => {
  it('incluye gastos sugeridos y excluye ventas', () => {
    const lista = [
      mov({ id: 'g', estado: 'sugerido', clasificacion: 'itaca', categoria_gasto_id: 'c' }),
      mov({ id: 'v', tipo: 'ingreso', estado: 'sugerido', clasificacion: 'itaca' }),
      mov({ id: 'p', estado: 'por_revisar' }),
    ]
    expect(confirmables(lista).map((m) => m.id)).toEqual(['g'])
  })
})

describe('presentación', () => {
  it('capitalizar', () => {
    expect(capitalizar('ANA PEREZ SOTO')).toBe('Ana Perez Soto')
    expect(capitalizar('ÑANDÚ-SUR')).toBe('Ñandú-Sur')
  })

  it('compra con débito', () => {
    const m = mov({})
    expect(titulo(m)).toBe('STARKEN')
    expect(subtitulo(m)).toBe('18 oct · Compra con débito')
  })

  it('transferencia recibida', () => {
    const m = mov({
      tipo: 'ingreso',
      medio: 'transferencia',
      clave: 'CAMILA ROJAS',
      descripcion_original: 'Abono por transferencia de Camila Rojas Rut 11.111.111-1 desde B.Santander el 18/10/2026',
    })
    expect(titulo(m)).toBe('Transferencia de Camila Rojas')
    expect(subtitulo(m)).toBe('18 oct · Abono cuenta corriente')
  })

  it('transferencia enviada en formato real', () => {
    const m = mov({
      medio: 'transferencia',
      clave: 'TALLER UNO SPA',
      descripcion_original:
        'Transferencia de Persona Prueba Rut 11.111.111-1 desde Banco BICE a Taller Uno Spa Rut 77.777.777-7 a Cuenta Vista de BICE, el 2026-10-18',
    })
    expect(titulo(m)).toBe('Transferencia a Taller Uno Spa')
    expect(subtitulo(m)).toBe('18 oct · Transferencia enviada')
  })

  it('tarjeta de crédito con cuotas', () => {
    const m = mov({ origen: 'bice_tc', medio: 'credito', clave: 'HERRAJES DEL SUR', cuota: '2 de 3' })
    expect(titulo(m)).toBe('HERRAJES DEL SUR')
    expect(subtitulo(m)).toBe('18 oct · Tarjeta de crédito · cuota 2 de 3')
  })

  it('descripción desconocida se recorta', () => {
    const m = mov({ descripcion_original: 'Comisión mantención', clave: 'COMISION MANTENCION' })
    expect(titulo(m)).toBe('Comisión mantención')
    expect(subtitulo(m)).toBe('18 oct · Cargo cuenta corriente')
  })
})
