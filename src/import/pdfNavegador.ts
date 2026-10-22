// pdf.js para el navegador. Versión "legacy": funciona en Safari / Chrome de
// celulares más antiguos. Se carga solo al subir un PDF.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { leerPaginas, type Pagina } from './pdfTexto'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export function leerPdf(datos: ArrayBuffer): Promise<Pagina[]> {
  return leerPaginas(pdfjs as unknown as Parameters<typeof leerPaginas>[0], datos)
}
