// "Estado de cuenta" BICE en PDF (Cuenta Vista / Cuenta Corriente).
// Un archivo puede traer varios estados mensuales seguidos. Cada página:
//   encabezado con "Fecha: dd/mm/aaaa" (emisión del estado)
//   columnas: Nro | Of | Giros | Depósitos | Descripción de la Transacción | Fecha D/M | Saldo Diario
//   cada movimiento empieza en una línea con Nro y sigue en las líneas de abajo
//   la última página del estado trae RESUMEN ESTADO ACTUAL con los totales.

import { armarMovimientoCuenta, ErrorCartola, parseMonto, type MovimientoParseado, type ResultadoParse } from './bice'
import { sinTildes } from './normalizar'
import { textoLinea, type Linea, type Pagina } from './pdfTexto'

const norm = (s: string) => sinTildes(s).toLowerCase()
const RE_MONTO = /^(\d{1,3}(?:\.\d{3})*)(?:\s+(.*))?$/
const RE_DM = /^(\d{2})\/(\d{2})$/

interface Columnas {
  yEncabezado: number
  xOf: number
  xDepositos: number
  xDescripcion: number
  xFecha: number
  xSaldo: number
}

interface Resumen {
  saldoInicial: number
  giros: number
  otrosCargos: number
  depositos: number
  saldoFinal: number
}

interface Estado {
  emision: { d: number; m: number; a: number }
  etiqueta: string
  movimientos: MovimientoParseado[]
  resumen: Resumen | null
}

function columnas(p: Pagina): Columnas | null {
  for (const l of p) {
    const giros = l.frags.find((f) => norm(f.s) === 'giros')
    const dep = l.frags.find((f) => norm(f.s).startsWith('depositos'))
    if (!giros || !dep) continue
    const nro = l.frags.find((f) => norm(f.s) === 'nro')
    const of = l.frags.find((f) => norm(f.s) === 'of')
    const fecha = l.frags.find((f) => norm(f.s) === 'fecha')
    const saldo = l.frags.find((f) => norm(f.s) === 'saldo')
    if (!nro || !of || !fecha || !saldo) continue
    // "Depósitos Descripción de la Transacción" viene en un solo fragmento.
    return { yEncabezado: l.y, xOf: of.x, xDepositos: dep.x, xDescripcion: dep.x + 40, xFecha: fecha.x, xSaldo: saldo.x }
  }
  return null
}

function emision(p: Pagina): Estado['emision'] | null {
  for (const l of p) {
    const m = textoLinea(l).match(/Fecha:\s*(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) return { d: +m[1], m: +m[2], a: +m[3] }
  }
  return null
}

/** Valores de "RESUMEN ESTADO ACTUAL" (solo la última página del estado los trae distintos de 0). */
function resumen(p: Pagina): Resumen | null {
  const i = p.findIndex((l) => norm(textoLinea(l)).includes('saldo inicial') && norm(textoLinea(l)).includes('saldo'))
  if (i < 0 || !p[i + 1]) return null
  const v = p[i + 1].frags.map((f) => parseMonto(f.s))
  if (v.length !== 5 || v.some((x) => x == null)) return null
  const [saldoInicial, giros, otrosCargos, depositos, saldoFinal] = v as number[]
  if (v.every((x) => x === 0)) return null
  return { saldoInicial, giros, otrosCargos, depositos, saldoFinal }
}

export function esEstadoCuentaPdf(paginas: Pagina[]): boolean {
  const p = paginas[0]
  return !!p && p.some((l) => norm(textoLinea(l)).includes('estado de cuenta')) && columnas(p) != null
}

/** Página impresa desde la web del banco ("Cartola movimientos"): otro formato. */
export function esCartolaWebImpresa(paginas: Pagina[]): boolean {
  const t = norm(paginas.slice(0, 2).map((p) => p.map(textoLinea).join(' ')).join(' '))
  return t.includes('movimientos de la cuenta') && t.includes('saldos diarios')
}

interface Borrador {
  nro: number
  tipo: 'gasto' | 'ingreso'
  monto: number
  dm: [number, number]
  partes: string[]
}

function esAncla(l: Linea, c: Columnas): boolean {
  const f = l.frags[0]
  return !!f && f.x < c.xOf - 2 && /^\d+$/.test(f.s)
}

function leerAncla(l: Linea, c: Columnas): Borrador | null {
  const nro = Number(l.frags[0].s)
  let tipo: Borrador['tipo'] | null = null
  let monto: number | null = null
  let dm: [number, number] | null = null
  const partes: string[] = []
  for (const f of l.frags.slice(1)) {
    if (f.x < c.xOf + 15 && /^\d+$/.test(f.s)) continue // código de oficina / transacción
    if (monto == null && f.x < c.xDescripcion) {
      const m = f.s.match(RE_MONTO)
      if (m) {
        monto = parseMonto(m[1])
        tipo = f.x < c.xDepositos ? 'gasto' : 'ingreso'
        if (m[2]) partes.push(m[2]) // "230.000 Abono" viene pegado
        continue
      }
    }
    const d = f.s.match(RE_DM)
    if (d && f.x >= c.xFecha - 8 && f.x < c.xSaldo - 10 && !dm) {
      dm = [+d[1], +d[2]]
      continue
    }
    if (f.x >= c.xSaldo - 20 && parseMonto(f.s) != null) continue // saldo diario
    partes.push(f.s)
  }
  if (monto == null || !tipo || !dm || monto === 0) return null
  return { nro, tipo, monto, dm, partes }
}

function cerrar(b: Borrador, e: Estado['emision']): MovimientoParseado {
  const [d, m] = b.dm
  // El estado de enero trae movimientos de diciembre del año anterior.
  const a = m > e.m ? e.a - 1 : e.a
  const fecha = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const descripcion = b.partes.join(' ').replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim()
  return armarMovimientoCuenta({ fecha, tipo: b.tipo, monto: b.monto, descripcion, nro: null })
}

const fmt = (e: Estado['emision']) => `${String(e.d).padStart(2, '0')}/${String(e.m).padStart(2, '0')}/${e.a}`

export function parseEstadoCuentaPdf(paginas: Pagina[]): ResultadoParse & { estados: number } {
  if (!esEstadoCuentaPdf(paginas)) {
    if (esCartolaWebImpresa(paginas)) {
      throw new ErrorCartola(
        'Este PDF es la cartola impresa desde la web, y no la podemos leer. Descarga el «Estado de cuenta» en PDF o la cartola en Excel.',
      )
    }
    throw new ErrorCartola('No reconocimos este PDF. Sube el «Estado de cuenta» de BICE en PDF o la cartola en Excel.')
  }

  const estados: Estado[] = []
  let actual: Borrador | null = null
  let estado: Estado | null = null
  let c: Columnas | null = null

  const guardar = () => {
    if (actual && estado) estado.movimientos.push(cerrar(actual, estado.emision))
    actual = null
  }

  for (const p of paginas) {
    const e = emision(p)
    c = columnas(p) ?? c
    if (!e || !c) continue
    const etiqueta = fmt(e)
    if (!estado || estado.etiqueta !== etiqueta) {
      guardar()
      estado = { emision: e, etiqueta, movimientos: [], resumen: null }
      estados.push(estado)
    }
    const yFin = p.find((l) => norm(textoLinea(l)).startsWith('resumen'))?.y ?? -Infinity
    for (const l of p) {
      if (l.y >= c.yEncabezado - 12 || l.y <= yFin) continue // encabezado y pie
      if (esAncla(l, c)) {
        guardar()
        actual = leerAncla(l, c)
        continue
      }
      // Línea de continuación de la descripción (puede seguir en la página siguiente).
      if (actual) actual.partes.push(...l.frags.filter((f) => f.x >= c!.xDescripcion - 10).map((f) => f.s))
    }
    estado.resumen = resumen(p) ?? estado.resumen
  }
  guardar()

  // Validación contra los totales del banco: si no cuadra, no se importa nada.
  for (const e of estados) {
    if (!e.resumen) continue
    const cargos = e.movimientos.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
    const abonos = e.movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
    const esperadoCargos = e.resumen.giros + e.resumen.otrosCargos
    if (cargos !== esperadoCargos || abonos !== e.resumen.depositos) {
      throw new ErrorCartola(
        `No pudimos leer bien el estado del ${e.etiqueta}: los totales no cuadran con los del banco ` +
          `(cargos ${cargos} vs ${esperadoCargos}, abonos ${abonos} vs ${e.resumen.depositos}). No se importó nada.`,
      )
    }
  }

  const movimientos = estados.flatMap((e) => e.movimientos)
  if (movimientos.length === 0) throw new ErrorCartola('El PDF no tiene movimientos.')
  const fechas = movimientos.map((m) => m.fecha).sort()
  return { tipo: 'bice_cuenta', movimientos, desde: fechas[0], hasta: fechas[fechas.length - 1], estados: estados.length }
}
