// Texto de un PDF con posiciones, agrupado en líneas. pdf.js se recibe por
// parámetro: en el navegador se usa con su worker y en los tests la versión de Node.

export interface Fragmento {
  x: number
  xFin: number
  s: string
}

export interface Linea {
  y: number
  frags: Fragmento[]
}

export type Pagina = Linea[]

interface ItemPdf {
  str: string
  transform: number[]
  width: number
}

interface PdfJs {
  getDocument(src: { data: Uint8Array; useSystemFonts?: boolean; isEvalSupported?: boolean }): {
    promise: Promise<{
      numPages: number
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>
    }>
    destroy(): Promise<void>
  }
}

const TOLERANCIA_Y = 2.5

/**
 * Algunos estados de BICE traen tildes en la codificación antigua de DOS
 * ("Instrucci¢n", "Mar¡a"). Se corrigen solo dentro de una palabra.
 */
const DOS: Record<string, string> = { '¡': 'í', '¢': 'ó', '£': 'ú', '¤': 'ñ', '¥': 'Ñ' }
export function corregirTildes(s: string): string {
  return s.replace(/(?<=\p{L})[¡¢£¤¥]/gu, (c) => DOS[c])
}

/** Agrupa fragmentos por línea (misma altura), de arriba hacia abajo y de izquierda a derecha. */
export function agruparLineas(items: ItemPdf[]): Pagina {
  const lineas: Linea[] = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const y = it.transform[5]
    const x = it.transform[4]
    let l = lineas.find((ln) => Math.abs(ln.y - y) <= TOLERANCIA_Y)
    if (!l) lineas.push((l = { y, frags: [] }))
    l.frags.push({ x, xFin: x + it.width, s: corregirTildes(it.str.replace(/\s+/g, ' ').trim()) })
  }
  for (const l of lineas) l.frags.sort((a, b) => a.x - b.x)
  return lineas.sort((a, b) => b.y - a.y)
}

export async function leerPaginas(pdfjs: PdfJs, datos: ArrayBuffer): Promise<Pagina[]> {
  const tarea = pdfjs.getDocument({ data: new Uint8Array(datos), useSystemFonts: true, isEvalSupported: false })
  const doc = await tarea.promise
  try {
    const paginas: Pagina[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const { items } = await (await doc.getPage(n)).getTextContent()
      paginas.push(agruparLineas(items as ItemPdf[]))
    }
    return paginas
  } finally {
    await tarea.destroy()
  }
}

export const textoLinea = (l: Linea) => l.frags.map((f) => f.s).join(' ')
