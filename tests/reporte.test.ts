import { describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { leerPaginas, textoLinea } from '../src/import/pdfTexto'
import type { MovReporte } from '../src/reportes/agregar'
import { generarReporteMensual, nombreArchivo, type DatosReporte } from '../src/reportes/pdfMensual'

const item = (producto: string, cantidad: number, precio: number, cat = 'aros') => ({
  producto_id: producto, producto, cantidad, precio_unitario: precio, categoria_producto_id: cat,
})

function datos(n = 6): DatosReporte {
  const movs: MovReporte[] = [
    { id: 'v1', fecha: '2026-10-18', tipo: 'ingreso', monto: 60000, categoria_gasto_id: null, subtipo_ingreso: 'venta', items: [item('Sifnos', 1, 60000)] },
    { id: 'v2', fecha: '2026-10-20', tipo: 'ingreso', monto: 40990, categoria_gasto_id: null, subtipo_ingreso: 'venta', items: [item('Aura', 2, 20495, 'pulseras')] },
    ...Array.from({ length: n }, (_, i): MovReporte => ({
      id: `g${i}`, fecha: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, tipo: 'gasto', monto: 1000 + i,
      categoria_gasto_id: i % 2 ? 'hilos' : 'envios', subtipo_ingreso: null, items: [],
    })),
  ]
  return {
    mes: '2026-10',
    generado: '2026-10-23',
    movs,
    anterior: { ingresos: 50000, gastos: 10000, neta: 40000 },
    categoriasGasto: new Map([['hilos', 'Hilos y materiales'], ['envios', 'Envíos']]),
    categoriasProducto: new Map([['aros', 'Aros'], ['pulseras', 'Pulseras']]),
    ordenCategoriasProducto: ['aros', 'pulseras'],
    descripciones: new Map(movs.map((m) => [m.id, m.id === 'g1' ? 'Mercería Łódź' : `Comercio ${m.id}`])),
    medios: new Map([['v1', 'Transferencia'], ['v2', 'Efectivo']]),
    pendientes: 3,
  }
}

async function textos(bytes: Uint8Array) {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const paginas = await leerPaginas(pdfjs as never, buf)
  return paginas.map((p) => p.map(textoLinea).join('\n'))
}

describe('reporte mensual PDF', () => {
  it('incluye resumen, gráficos, detalle y la nota de pendientes', async () => {
    const [p1] = await textos(await generarReporteMensual(datos()))
    const plano = p1.replace(/(\S) (?=\S( |$))/g, '$1') // las etiquetas van con letras espaciadas
    expect(plano).toContain('ÍTACA')
    expect(p1).toContain('$94.975') // 100.990 − 6.015
    expect(p1).toContain('+137% vs septiembre')
    expect(p1).toContain('Hilos y materiales')
    expect(p1).toContain('Sifnos ×1')
    expect(p1).toContain('Aros 59% · $60.000')
    expect(p1).toContain('Venta · Aura ×2')
    expect(p1).toContain('Hay 3 movimientos de este mes por revisar')
    expect(p1).toContain('Página 1 de 1')
  })

  it('caracteres fuera de WinAnsi no rompen el PDF', async () => {
    const [p1] = await textos(await generarReporteMensual(datos()))
    expect(p1).toContain('Mercer')
  })

  it('muchos movimientos: pagina y numera', async () => {
    const pags = await textos(await generarReporteMensual(datos(90)))
    expect(pags.length).toBeGreaterThan(1)
    expect(pags.at(-1)).toContain(`Página ${pags.length} de ${pags.length}`)
    expect(pags.at(-1)).toContain('Ganancia neta del mes')
  })

  it('mes vacío', async () => {
    const d = { ...datos(0), movs: [], pendientes: 0 }
    const [p1] = await textos(await generarReporteMensual(d))
    expect(p1).toContain('No hay movimientos confirmados como Ítaca este mes.')
    expect(p1).toContain('No quedan movimientos de este mes por revisar.')
  })

  it('nombre de archivo', () => {
    expect(nombreArchivo('2026-10')).toBe('Itaca_reporte_2026-10.pdf')
  })
})
