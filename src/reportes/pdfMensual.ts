// Reporte mensual en PDF (A4), generado en el dispositivo con pdf-lib.
// Solo incluye lo confirmado como Ítaca.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { fechaCorta, formatCLP, MESES_LARGOS } from '../lib/format'
import {
  ajustesVentas, gastosPorCategoria, porcentajes, resumenVenta, totales, variacion, ventasPorCategoriaProducto,
  ventasPorProducto, type Mes, type MovReporte, type Totales,
} from './agregar'

export interface DatosReporte {
  mes: Mes
  generado: string // YYYY-MM-DD
  movs: MovReporte[] // del mes, confirmados como Ítaca
  anterior: Totales
  categoriasGasto: Map<string, string>
  categoriasProducto: Map<string, string>
  ordenCategoriasProducto: string[]
  /** Título visible de cada movimiento (comercio, persona). */
  descripciones: Map<string, string>
  medios: Map<string, string>
  pendientes: number
  logoPng?: Uint8Array
}

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const C = {
  papel: hex('#F4EEE4'),
  arena: hex('#E9DFD0'),
  tarjeta: hex('#FBF8F3'),
  tinta: hex('#3A3127'),
  tinta2: hex('#6B5F51'),
  linea: hex('#DCD1C0'),
  tierra: hex('#8B6A45'),
  terracota: hex('#B0532F'),
  oliva: hex('#5E6C2A'),
  cat: ['#B06A2A', '#2F74A6', '#C49A1C', '#8E4A86'].map(hex),
}

const A4: [number, number] = [595.28, 841.89]
const M = 48 // margen
const ANCHO = A4[0] - 2 * M

const nombreMes = (mes: Mes) => MESES_LARGOS[Number(mes.slice(5, 7)) - 1]
const titulo = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Fuentes {
  serif: PDFFont
  serifB: PDFFont
  sans: PDFFont
  sansB: PDFFont
}

/** Las fuentes estándar del PDF solo traen el juego WinAnsi: el resto se reemplaza. */
function seguro(f: PDFFont, s: string): string {
  const ok = new Set(f.getCharacterSet())
  return [...s.replace(/−/g, '-')].map((c) => (ok.has(c.codePointAt(0)!) ? c : '?')).join('')
}

class Lienzo {
  page!: PDFPage
  y = 0
  paginas = 0
  constructor(
    private doc: PDFDocument,
    public f: Fuentes,
    private pie: string,
  ) {}

  nueva() {
    this.page = this.doc.addPage(A4)
    this.paginas++
    this.y = A4[1] - M
  }

  /** Salta de página si no queda espacio. */
  espacio(alto: number) {
    if (this.y - alto < M + 24) this.nueva()
  }

  texto(s: string, x: number, y: number, o: { f?: PDFFont; size?: number; color?: RGB; derecha?: boolean; tracking?: number } = {}) {
    const f = o.f ?? this.f.sans
    const size = o.size ?? 9
    let t = seguro(f, s)
    if (o.tracking) {
      // Espaciado de letras para las etiquetas en mayúsculas.
      let cx = o.derecha ? x - this.ancho(t, f, size, o.tracking) : x
      for (const ch of t) {
        this.page.drawText(ch, { x: cx, y, size, font: f, color: o.color ?? C.tinta })
        cx += f.widthOfTextAtSize(ch, size) + o.tracking
      }
      return
    }
    const w = f.widthOfTextAtSize(t, size)
    this.page.drawText(t, { x: o.derecha ? x - w : x, y, size, font: f, color: o.color ?? C.tinta })
  }

  ancho(s: string, f: PDFFont, size: number, tracking = 0) {
    const t = seguro(f, s)
    return f.widthOfTextAtSize(t, size) + tracking * Math.max(0, t.length - 1)
  }

  /** Recorta con "…" para que quepa en `max` puntos. */
  recortar(s: string, f: PDFFont, size: number, max: number) {
    let t = seguro(f, s)
    if (f.widthOfTextAtSize(t, size) <= max) return t
    while (t.length > 1 && f.widthOfTextAtSize(t + '...', size) > max) t = t.slice(0, -1)
    return t.trimEnd() + '...'
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    if (w <= 0 || h <= 0) return
    this.page.drawRectangle({ x, y, width: w, height: h, color })
  }

  linea(y: number) {
    this.page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: C.linea })
  }

  etiqueta(s: string, x = M, color = C.tinta2) {
    this.texto(s.toUpperCase(), x, this.y, { size: 7.5, color, tracking: 1.6 })
  }

  piePaginas() {
    const total = this.paginas
    this.doc.getPages().forEach((p, i) => {
      const t = seguro(this.f.sans, `${this.pie}  ·  Página ${i + 1} de ${total}`)
      p.drawText(t, { x: M, y: M - 18, size: 7, font: this.f.sans, color: C.tinta2 })
    })
  }
}

function seccion(l: Lienzo, nombre: string, total?: { valor: number; color: RGB }) {
  l.espacio(60)
  l.y -= 22
  l.etiqueta(nombre)
  if (total) l.texto(formatCLP(total.valor), A4[0] - M, l.y, { f: l.f.sansB, size: 9.5, color: total.color, derecha: true })
  l.y -= 8
  l.linea(l.y)
  l.y -= 14
}

function vacio(l: Lienzo, s: string) {
  l.texto(s, M, l.y, { size: 9, color: C.tinta2 })
  l.y -= 14
}

export async function generarReporteMensual(d: DatosReporte): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const nombre = `${titulo(nombreMes(d.mes))} ${d.mes.slice(0, 4)}`
  doc.setTitle(`Ítaca · Reporte ${nombre}`)
  doc.setAuthor('Ítaca Finanzas')
  doc.setCreator('Ítaca Finanzas')
  doc.setLanguage('es-CL')

  const f: Fuentes = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifB: await doc.embedFont(StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansB: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  const [a, m, dd] = d.generado.split('-')
  const l = new Lienzo(doc, f, `Ítaca Finanzas · Reporte ${nombre} · generado el ${Number(dd)}/${Number(m)}/${a}`)
  l.nueva()

  // ---------- Encabezado ----------
  if (d.logoPng) {
    const img = await doc.embedPng(d.logoPng)
    const w = 46
    l.page.drawImage(img, { x: M, y: l.y - 22, width: w, height: (w * img.height) / img.width })
  }
  l.texto('ÍTACA', M + (d.logoPng ? 56 : 0), l.y - 16, { f: f.serifB, size: 20, tracking: 3 })
  l.texto(`Reporte mensual · ${nombre}`.toUpperCase(), A4[0] - M, l.y - 14, { size: 7.5, color: C.tinta2, tracking: 1.4, derecha: true })
  l.y -= 40
  l.linea(l.y)

  // ---------- Ganancia neta ----------
  const t = totales(d.movs)
  const v = variacion(t.neta, d.anterior.neta)
  l.y -= 26
  l.etiqueta(`Ganancia neta · ${nombreMes(d.mes)}`)
  l.y -= 38
  l.texto(`${t.neta < 0 ? '-' : ''}${formatCLP(Math.abs(t.neta))}`, M, l.y, { f: f.serifB, size: 34, color: t.neta < 0 ? C.terracota : C.oliva })
  const mesAnt = MESES_LARGOS[(Number(d.mes.slice(5, 7)) + 10) % 12]
  l.texto(v == null ? `Sin datos de ${mesAnt} para comparar` : `${v > 0 ? '+' : ''}${v}% vs ${mesAnt}`, A4[0] - M, l.y + 6, {
    size: 9,
    color: C.tinta2,
    derecha: true,
  })
  l.y -= 26
  const col2 = M + ANCHO / 2
  l.texto('Ingresos Ítaca', M, l.y, { size: 8.5, color: C.tinta2 })
  l.texto('Gastos Ítaca', col2, l.y, { size: 8.5, color: C.tinta2 })
  l.y -= 16
  l.texto(formatCLP(t.ingresos), M, l.y, { f: f.sansB, size: 13 })
  l.texto(formatCLP(t.gastos), col2, l.y, { f: f.sansB, size: 13, color: C.terracota })
  l.y -= 6

  // ---------- Gastos por categoría ----------
  const gastos = gastosPorCategoria(d.movs, d.categoriasGasto)
  seccion(l, 'Gastos por categoría', { valor: t.gastos, color: C.terracota })
  if (gastos.length === 0) vacio(l, 'Sin gastos de Ítaca este mes.')
  const maxG = Math.max(1, ...gastos.map((g) => g.monto))
  for (const g of gastos) {
    l.espacio(26)
    l.texto(g.nombre, M, l.y, { size: 9 })
    l.texto(formatCLP(g.monto), A4[0] - M, l.y, { size: 9, derecha: true })
    l.y -= 9
    l.rect(M, l.y - 4, ANCHO, 4.5, C.arena)
    l.rect(M, l.y - 4, Math.max(2, (g.monto / maxG) * ANCHO), 4.5, C.terracota)
    l.y -= 19
  }

  // ---------- Ventas por producto ----------
  const prods = ventasPorProducto(d.movs)
  const totalProd = prods.reduce((s, p) => s + p.monto, 0)
  seccion(l, 'Ventas por producto', { valor: totalProd, color: C.oliva })
  if (prods.length === 0) vacio(l, 'Sin ventas registradas este mes.')
  const maxP = Math.max(1, ...prods.map((p) => p.monto))
  const xBarra = M + 120
  const anchoBarra = ANCHO - 120 - 80
  for (const p of prods) {
    l.espacio(18)
    l.texto(l.recortar(`${p.nombre} ×${p.unidades}`, f.sans, 9, 112), M, l.y, { size: 9 })
    l.rect(xBarra, l.y, Math.max(3, (p.monto / maxP) * anchoBarra), 5, C.oliva)
    l.texto(formatCLP(p.monto), A4[0] - M, l.y, { size: 9, derecha: true })
    l.y -= 16
  }
  const aj = ajustesVentas(d.movs)
  if (aj !== 0 && prods.length) {
    l.texto(aj < 0 ? 'Descuentos y ajustes' : 'Ajustes y otros ingresos', M, l.y, { size: 8.5, color: C.tinta2 })
    l.texto(`${aj < 0 ? '-' : '+'}${formatCLP(Math.abs(aj))}`, A4[0] - M, l.y, { size: 8.5, color: C.tinta2, derecha: true })
    l.y -= 14
  }

  // ---------- Por categoría de producto ----------
  const cats = ventasPorCategoriaProducto(d.movs, d.categoriasProducto)
  if (cats.length) {
    seccion(l, 'Por categoría de producto')
    const pct = porcentajes(cats.map((c) => c.monto))
    let x = M
    cats.forEach((c, i) => {
      const w = (pct[i] / 100) * ANCHO
      const k = d.ordenCategoriasProducto.indexOf(c.id)
      l.rect(x, l.y - 2, Math.max(3, w - 2), 9, C.cat[k] ?? C.tinta2)
      x += w
    })
    l.y -= 18
    let lx = M
    cats.forEach((c, i) => {
      const k = d.ordenCategoriasProducto.indexOf(c.id)
      l.rect(lx, l.y, 7, 7, C.cat[k] ?? C.tinta2)
      const txt = `${c.nombre} ${pct[i]}% · ${formatCLP(c.monto)}`
      l.texto(txt, lx + 11, l.y, { size: 9 })
      lx += l.ancho(txt, f.sans, 9) + 28
    })
    l.y -= 10
  }

  // ---------- Detalle ----------
  seccion(l, `Movimientos de Ítaca (${d.movs.length})`)
  const cols = { fecha: M, desc: M + 44, cat: M + 290, monto: A4[0] - M }
  const encabezado = () => {
    for (const [txt, x, der] of [['FECHA', cols.fecha, false], ['DETALLE', cols.desc, false], ['CATEGORÍA', cols.cat, false], ['MONTO', cols.monto, true]] as const) {
      l.texto(txt, x, l.y, { size: 7, color: C.tinta2, tracking: 1, derecha: der })
    }
    l.y -= 15
  }
  if (d.movs.length === 0) vacio(l, 'No hay movimientos confirmados como Ítaca este mes.')
  else encabezado()
  const ordenados = [...d.movs].sort((x, y) => x.fecha.localeCompare(y.fecha))
  for (const mv of ordenados) {
    if (l.y - 14 < M + 24) {
      l.nueva()
      encabezado()
    }
    const desc =
      mv.tipo === 'ingreso'
        ? mv.items.length
          ? `Venta · ${resumenVenta(mv.items)}`
          : (d.descripciones.get(mv.id) ?? 'Ingreso')
        : (d.descripciones.get(mv.id) ?? 'Gasto')
    const cat =
      mv.tipo === 'ingreso'
        ? `Venta${d.medios.get(mv.id) ? ` · ${d.medios.get(mv.id)}` : ''}`
        : (d.categoriasGasto.get(mv.categoria_gasto_id ?? '') ?? 'Sin categoría')
    l.texto(fechaCorta(mv.fecha), cols.fecha, l.y, { size: 8.5, color: C.tinta2 })
    l.texto(l.recortar(desc, f.sans, 8.5, cols.cat - cols.desc - 10), cols.desc, l.y, { size: 8.5 })
    l.texto(l.recortar(cat, f.sans, 8.5, cols.monto - cols.cat - 70), cols.cat, l.y, { size: 8.5, color: C.tinta2 })
    l.texto(`${mv.tipo === 'ingreso' ? '+' : '-'}${formatCLP(mv.monto)}`, cols.monto, l.y, {
      size: 8.5,
      color: mv.tipo === 'ingreso' ? C.oliva : C.terracota,
      derecha: true,
    })
    l.y -= 5
    l.page.drawLine({ start: { x: M, y: l.y }, end: { x: A4[0] - M, y: l.y }, thickness: 0.3, color: C.linea })
    l.y -= 10
  }
  if (d.movs.length) {
    l.espacio(20)
    l.y -= 4
    l.texto('Ganancia neta del mes', cols.desc, l.y, { f: f.sansB, size: 9 })
    l.texto(`${t.neta < 0 ? '-' : ''}${formatCLP(Math.abs(t.neta))}`, cols.monto, l.y, {
      f: f.sansB,
      size: 9,
      color: t.neta < 0 ? C.terracota : C.oliva,
      derecha: true,
    })
    l.y -= 16
  }

  // ---------- Nota ----------
  // Una línea: cabe hasta justo sobre el pie, sin abrir una página solo para ella.
  l.y -= 6
  if (l.y < M) l.nueva()
  const nota =
    d.pendientes > 0
      ? `Incluye solo lo confirmado como Ítaca. Hay ${d.pendientes} ${d.pendientes === 1 ? 'movimiento' : 'movimientos'} de este mes por revisar que no están en el reporte.`
      : 'Incluye solo lo confirmado como Ítaca. No quedan movimientos de este mes por revisar.'
  l.texto(nota, M, l.y, { size: 8, color: C.tinta2 })

  l.piePaginas()
  return doc.save()
}

/** "Itaca_reporte_2026-10.pdf" */
export const nombreArchivo = (mes: Mes) => `Itaca_reporte_${mes}.pdf`
