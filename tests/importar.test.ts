import { describe, expect, it } from 'vitest'
import { parseCartola } from '../src/import/bice'
import { calcularHuellas } from '../src/import/huella'
import { prepararImportacion } from '../src/import/importar'
import { aplicarRegla, indexarReglas, type ReglaMin } from '../src/import/reglas'
import { filasCuenta, filasTC } from './fixtures'

const regla = (p: Partial<ReglaMin>): ReglaMin => ({
  id: 'r1',
  clave: 'X',
  tipo: 'gasto',
  clasificacion: 'itaca',
  categoria_gasto_id: 'cat-hilos',
  confirmaciones: 2,
  correcciones: 0,
  activa: true,
  ...p,
})

const ninguna = async () => new Set<string>()

describe('huella', () => {
  it('es estable entre lecturas', async () => {
    const a = await calcularHuellas(parseCartola(filasCuenta).movimientos)
    const b = await calcularHuellas(parseCartola(filasCuenta).movimientos)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(a.length)
  })

  it('dos filas idénticas en el mismo archivo tienen huellas distintas', async () => {
    const fila = ['2 mar 2026', 'Cargos', '', 'Cargo por compra en CAFE el 01/03/2026', '$2.000']
    const { movimientos } = parseCartola([['Fecha', 'Categoría', 'Nº operación', 'Descripción', 'Monto'], fila, fila])
    const h = await calcularHuellas(movimientos)
    expect(h[0]).not.toBe(h[1])
  })

  it('cambia si cambia el monto', async () => {
    const [m] = parseCartola(filasCuenta).movimientos
    const [h1] = await calcularHuellas([m])
    const [h2] = await calcularHuellas([{ ...m, monto: m.monto + 1 }])
    expect(h1).not.toBe(h2)
  })
})

describe('aplicarRegla', () => {
  it('sin regla → por revisar', () => {
    expect(aplicarRegla('X', 'gasto', indexarReglas([])).estado).toBe('por_revisar')
  })

  it('Ítaca confiable → sugerido con categoría', () => {
    const d = aplicarRegla('X', 'gasto', indexarReglas([regla({})]))
    expect(d).toEqual({ estado: 'sugerido', clasificacion: 'itaca', categoria_gasto_id: 'cat-hilos', regla_id: 'r1' })
  })

  it('No es de Ítaca confiable → confirmado directo', () => {
    const d = aplicarRegla('X', 'gasto', indexarReglas([regla({ clasificacion: 'no_itaca', categoria_gasto_id: null })]))
    expect(d.estado).toBe('confirmado')
    expect(d.clasificacion).toBe('no_itaca')
  })

  it('requiere al menos 2 confirmaciones', () => {
    expect(aplicarRegla('X', 'gasto', indexarReglas([regla({ confirmaciones: 1 })])).estado).toBe('por_revisar')
  })

  it('requiere confianza ≥ 0,8', () => {
    // 4/5 = 0,8 → sí; 3/4 = 0,75 → no
    expect(aplicarRegla('X', 'gasto', indexarReglas([regla({ confirmaciones: 4, correcciones: 1 })])).estado).toBe('sugerido')
    expect(aplicarRegla('X', 'gasto', indexarReglas([regla({ confirmaciones: 3, correcciones: 1 })])).estado).toBe('por_revisar')
  })

  it('la regla es por tipo: una de gasto no aplica a un ingreso', () => {
    expect(aplicarRegla('X', 'ingreso', indexarReglas([regla({})])).estado).toBe('por_revisar')
  })

  it('ignora reglas inactivas', () => {
    expect(aplicarRegla('X', 'gasto', indexarReglas([regla({ activa: false })])).estado).toBe('por_revisar')
  })
})

describe('prepararImportacion', () => {
  const reglas: ReglaMin[] = [
    regla({ id: 'r-hebra', clave: 'MERCERIA LA HEBRA' }),
    regla({ id: 'r-super', clave: 'SUPERMERCADO EJEMPLO', clasificacion: 'no_itaca', categoria_gasto_id: null, confirmaciones: 5 }),
  ]

  it('resume nuevos, reconocidos, sugeridos y por revisar', async () => {
    const { resumen, nuevos } = await prepararImportacion(filasCuenta, reglas, ninguna)
    expect(resumen).toMatchObject({
      tipo: 'bice_cuenta',
      desde: '2026-03-02',
      hasta: '2026-03-15',
      filas: 6,
      nuevas: 6,
      duplicadas: 0,
      reconocidosNoItaca: 1,
      sugeridosItaca: 1,
      porRevisar: 4,
    })
    expect(nuevos.find((m) => m.clave === 'MERCERIA LA HEBRA')).toMatchObject({ estado: 'sugerido', regla_id: 'r-hebra' })
  })

  it('reimportar el mismo archivo = todo duplicado', async () => {
    const primera = await prepararImportacion(filasCuenta, [], ninguna)
    const yaGuardadas = new Set(primera.nuevos.map((m) => m.huella))
    const { resumen, nuevos } = await prepararImportacion(filasCuenta, [], async () => yaGuardadas)
    expect(nuevos).toHaveLength(0)
    expect(resumen.duplicadas).toBe(6)
  })

  it('TC: el pago de la tarjeta se reconoce como No es de Ítaca aunque no haya reglas', async () => {
    const { resumen } = await prepararImportacion(filasTC, [], ninguna)
    expect(resumen).toMatchObject({ tipo: 'bice_tc', reconocidosNoItaca: 1, porRevisar: 3 })
  })
})
