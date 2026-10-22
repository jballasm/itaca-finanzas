import { beforeAll, describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { ErrorCartola } from '../src/import/bice'
import { esCartolaWebImpresa, parseEstadoCuentaPdf } from '../src/import/bicePdf'
import { agruparLineas, corregirTildes, leerPaginas, type Pagina } from '../src/import/pdfTexto'
import { CONTINUACION, estadosFalsos, pdfFalsoCompleto } from './fixturesPdf'

const leer = async (estados = estadosFalsos) => leerPaginas(pdfjs as never, await pdfFalsoCompleto(estados))

describe('corregirTildes', () => {
  it('codificación DOS pegada a letras', () => {
    expect(corregirTildes('Instrucci¢n')).toBe('Instrucción')
    expect(corregirTildes('Mar¡a Pe¤a')).toBe('María Peña')
  })
  it('no toca signos sueltos', () => {
    expect(corregirTildes('¡Hola!')).toBe('¡Hola!')
  })
})

describe('agruparLineas', () => {
  it('agrupa por altura y ordena', () => {
    const it = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 3 })
    const p = agruparLineas([it('b', 50, 100.5), it('a', 10, 100), it('arriba', 10, 200), it(' ', 0, 50)])
    expect(p.map((l) => l.frags.map((f) => f.s))).toEqual([['arriba'], ['a', 'b']])
  })
})

describe('Estado de cuenta BICE en PDF (falso, con pdf.js real)', () => {
  let paginas: Pagina[]
  beforeAll(async () => {
    paginas = await leer()
  })

  it('lee los dos estados y el período', () => {
    const r = parseEstadoCuentaPdf(paginas)
    expect(r.estados).toBe(2)
    expect(r.movimientos).toHaveLength(7)
    expect([r.desde, r.hasta]).toEqual(['2025-12-30', '2026-01-20'])
  })

  it('el estado de enero trae diciembre del año anterior', () => {
    expect(parseEstadoCuentaPdf(paginas).movimientos[0]).toMatchObject({ fecha: '2025-12-30', tipo: 'gasto', monto: 5000, clave: 'MERCERIA LA HEBRA' })
  })

  it('abono pegado a la primera palabra y tilde corregida', () => {
    const m = parseEstadoCuentaPdf(paginas).movimientos[1]
    expect(m).toMatchObject({ fecha: '2026-01-02', tipo: 'ingreso', monto: 230000, medio: 'transferencia' })
    expect(m.descripcion_original).toBe('Abono por Instrucción Automatica')
  })

  it('transferencia enviada en 3 líneas: clave = destinatario, sin el saldo diario', () => {
    const m = parseEstadoCuentaPdf(paginas).movimientos[2]
    expect(m).toMatchObject({ tipo: 'gasto', monto: 45000, medio: 'transferencia', clave: 'TALLER UNO SPA' })
    expect(m.descripcion_original).not.toContain('1.180.000')
  })

  it('una descripción que sigue en la página siguiente se une', () => {
    const m = parseEstadoCuentaPdf(paginas).movimientos[3]
    expect(m).toMatchObject({ tipo: 'ingreso', monto: 28000, clave: 'CLIENTA INVENTADA DOS' })
    expect(m.descripcion_original).toContain(CONTINUACION)
  })

  it('nº de sucursal fuera de la clave, giro en cajero y abono de otro banco', () => {
    const [, , , , starken, giro, abono] = parseEstadoCuentaPdf(paginas).movimientos
    expect(starken.clave).toBe('STARKEN')
    expect(giro).toMatchObject({ clave: 'GIRO CAJERO', monto: 20000 })
    expect(abono).toMatchObject({ tipo: 'ingreso', clave: 'CLIENTA TRES', monto: 60000 })
  })

  it('si los totales no cuadran con el resumen del banco, no importa nada', async () => {
    const malo = structuredClone(estadosFalsos)
    malo[1].resumen[3] = '61.000'
    await expect(async () => parseEstadoCuentaPdf(await leer(malo))).rejects.toThrow(/no cuadran/)
  })
})

describe('otros PDF', () => {
  it('PDF que no es de BICE', () => {
    expect(() => parseEstadoCuentaPdf([[{ y: 700, frags: [{ x: 10, xFin: 50, s: 'Factura' }] }]])).toThrow(ErrorCartola)
  })
  it('cartola impresa desde la web: mensaje específico', () => {
    const p: Pagina = [
      { y: 700, frags: [{ x: 90, xFin: 200, s: 'Movimientos de la Cuenta' }] },
      { y: 300, frags: [{ x: 90, xFin: 200, s: 'Saldos Diarios' }] },
    ]
    expect(esCartolaWebImpresa([p])).toBe(true)
    expect(() => parseEstadoCuentaPdf([p])).toThrow(/impresa desde la web/)
  })
})
