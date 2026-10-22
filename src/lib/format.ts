const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/** $1.234.567 (sin decimales). */
export function formatCLP(monto: number): string {
  return clp.format(Math.round(monto)).replace(/\s/g, '')
}

/** +$60.000 / −$24.300 */
export function formatCLPConSigno(monto: number, tipo: 'ingreso' | 'gasto'): string {
  return (tipo === 'ingreso' ? '+' : '−') + formatCLP(monto)
}

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function partes(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return { a, m, d }
}

/** "2026-10-18" → "18 oct" */
export function fechaCorta(iso: string): string {
  const { m, d } = partes(iso)
  return `${d} ${MESES_CORTOS[m - 1]}`
}

/** Período de una importación: "1 – 31 oct 2026" o "28 sep – 27 oct 2026". */
export function rangoFechas(desde: string, hasta: string): string {
  const a = partes(desde)
  const b = partes(hasta)
  if (a.a === b.a && a.m === b.m) return `${a.d} – ${b.d} ${MESES_CORTOS[b.m - 1]} ${b.a}`
  const izq = a.a === b.a ? fechaCorta(desde) : `${fechaCorta(desde)} ${a.a}`
  return `${izq} – ${fechaCorta(hasta)} ${b.a}`
}
