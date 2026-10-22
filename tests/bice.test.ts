import { describe, expect, it } from 'vitest'
import { detectarFormato, ErrorCartola, parseCartola, parseFecha, parseMonto } from '../src/import/bice'
import { leerExcel } from '../src/import/importar'
import { filasCuenta, filasTC, libroXlsx } from './fixtures'

describe('parseFecha', () => {
  it('fechas en español de la cuenta corriente', () => {
    expect(parseFecha('2 mar 2026')).toBe('2026-03-02')
    expect(parseFecha('15 dic 2025')).toBe('2025-12-15')
    expect(parseFecha('1 Ene 2026')).toBe('2026-01-01')
    expect(parseFecha('7 sept 2026')).toBe('2026-09-07')
    expect(parseFecha('7 de ago de 2026')).toBe('2026-08-07')
  })
  it('dd/mm/yyyy de la tarjeta', () => {
    expect(parseFecha('01/04/2026')).toBe('2026-04-01')
    expect(parseFecha('31/12/2025')).toBe('2025-12-31')
  })
  it('serial de Excel', () => {
    expect(parseFecha(46113)).toBe('2026-04-01')
  })
  it('rechaza lo que no es fecha', () => {
    expect(parseFecha('Saldo final')).toBeNull()
    expect(parseFecha('31/02/2026')).toBeNull()
    expect(parseFecha('')).toBeNull()
    expect(parseFecha(null)).toBeNull()
    expect(parseFecha(1234)).toBeNull()
  })
})

describe('parseMonto', () => {
  it('texto con $ y puntos de miles', () => {
    expect(parseMonto('$8.170')).toBe(8170)
    expect(parseMonto('$1.234.567')).toBe(1234567)
    expect(parseMonto('-$4.990')).toBe(4990)
  })
  it('numérico, siempre positivo', () => {
    expect(parseMonto(12990)).toBe(12990)
    expect(parseMonto(-150000)).toBe(150000)
  })
  it('rechaza texto', () => {
    expect(parseMonto('Total')).toBeNull()
    expect(parseMonto('')).toBeNull()
  })
})

describe('detectarFormato', () => {
  it('encuentra el encabezado de la cuenta en cualquier fila', () => {
    const f = detectarFormato(filasCuenta)
    expect(f.tipo).toBe('bice_cuenta')
    expect(f.filaEncabezado).toBe(5)
  })
  it('detecta la tarjeta de crédito', () => {
    const f = detectarFormato(filasTC)
    expect(f.tipo).toBe('bice_tc')
    expect(f.filaEncabezado).toBe(2)
  })
  it('falla con un archivo que no es cartola', () => {
    expect(() => detectarFormato([['Nombre', 'Edad'], ['A', 1]])).toThrow(ErrorCartola)
  })
})

describe('parseCartola · cuenta corriente', () => {
  const r = parseCartola(filasCuenta)

  it('lee solo filas de movimientos (ignora saldo y pie)', () => {
    expect(r.movimientos).toHaveLength(6)
    expect(r.desde).toBe('2026-03-02')
    expect(r.hasta).toBe('2026-03-15')
  })

  it('compra con débito', () => {
    expect(r.movimientos[0]).toMatchObject({
      fecha: '2026-03-02',
      tipo: 'gasto',
      monto: 8170,
      origen: 'bice_cuenta',
      medio: 'debito',
      clave: 'MERCERIA LA HEBRA',
      nro_operacion: '100001',
      cuota: null,
      clasificacion: null,
      estado: null,
    })
  })

  it('abono = ingreso por transferencia; la clave es el remitente sin RUT', () => {
    expect(r.movimientos[1]).toMatchObject({ tipo: 'ingreso', medio: 'transferencia', monto: 60000, clave: 'ANA PEREZ SOTO' })
  })

  it('transferencia enviada = gasto por transferencia', () => {
    expect(r.movimientos[2]).toMatchObject({ tipo: 'gasto', medio: 'transferencia', clave: 'CORREOS ENVIOS SPA' })
  })

  it('pasarela y comuna fuera de la clave', () => {
    expect(r.movimientos[3].clave).toBe('TIENDA DE HILOS')
  })

  it('guarda la descripción original para mostrarla', () => {
    expect(r.movimientos[1].descripcion_original).toContain('Transferencia de Ana Pérez Soto')
  })
})

describe('parseCartola · tarjeta de crédito', () => {
  const r = parseCartola(filasTC)

  it('lee los movimientos e ignora el total', () => {
    expect(r.movimientos).toHaveLength(4)
  })

  it('cargos = gasto con crédito y cuota', () => {
    expect(r.movimientos[1]).toMatchObject({
      fecha: '2026-04-03',
      tipo: 'gasto',
      medio: 'credito',
      monto: 15000,
      cuota: '2 de 3',
      clave: 'HERRAJES DEL SUR',
      origen: 'bice_tc',
    })
  })

  it('abonos (pago de la tarjeta) = No es de Ítaca automáticamente', () => {
    expect(r.movimientos[2]).toMatchObject({
      tipo: 'ingreso',
      monto: 150000,
      clasificacion: 'no_itaca',
      estado: 'confirmado',
    })
  })
})

describe('leerExcel (SheetJS de punta a punta)', () => {
  it('cuenta corriente', () => {
    const r = parseCartola(leerExcel(libroXlsx(filasCuenta)))
    expect(r.tipo).toBe('bice_cuenta')
    expect(r.movimientos).toHaveLength(6)
  })

  it('tarjeta de crédito', () => {
    const r = parseCartola(leerExcel(libroXlsx(filasTC)))
    expect(r.tipo).toBe('bice_tc')
    expect(r.movimientos.map((m) => m.monto)).toEqual([12990, 15000, 150000, 7480])
  })

  it('busca la hoja correcta si hay varias', () => {
    const r = parseCartola(leerExcel(libroXlsx(filasCuenta, 'Movimientos')))
    expect(r.movimientos).toHaveLength(6)
  })

  it('error claro si no es una cartola BICE', () => {
    expect(() => leerExcel(libroXlsx([['Hola'], ['mundo']]))).toThrow(ErrorCartola)
  })
})
