// Gráficos simples en HTML (render 02 y 06): barras con etiqueta directa del monto.
import { useState, type ReactNode } from 'react'
import { formatCLP, MESES_CORTOS, MESES_LARGOS } from '../lib/format'
import { porcentajes, type Fila, type Mes, type Totales } from '../reportes/agregar'

const nombreMesCorto = (mes: Mes) => MESES_CORTOS[Number(mes.slice(5, 7)) - 1]
const nombreMesLargo = (mes: Mes) => MESES_LARGOS[Number(mes.slice(5, 7)) - 1]
const miles = (n: number) => Math.round(n / 1000).toLocaleString('es-CL')

/**
 * Ganancia neta por mes. El mes destacado va en oliva intenso, el resto suave;
 * las pérdidas bajan de la línea base en terracota. Tocar una barra muestra el detalle.
 */
export function BarrasMensuales({ serie, destacado, alto = 100 }: { serie: ({ mes: Mes } & Totales)[]; destacado: Mes; alto?: number }) {
  const [elegido, setElegido] = useState<Mes | null>(null)
  // Una sola escala: la línea base se ubica según cuánto pesan ganancias y pérdidas.
  const maxPos = Math.max(0, ...serie.map((s) => s.neta))
  const maxNeg = Math.max(0, ...serie.map((s) => -s.neta))
  const hayNegativos = maxNeg > 0
  const pxPorPeso = alto / Math.max(1, maxPos + maxNeg)
  const altoPos = maxPos * pxPorPeso
  const altoNeg = maxNeg * pxPorPeso
  const escala = (v: number) => (v === 0 ? 0 : Math.max(3, Math.abs(v) * pxPorPeso))
  const detalle = serie.find((s) => s.mes === (elegido ?? destacado))

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }}>
        {serie.map((s) => {
          const actual = s.mes === destacado
          const activo = s.mes === (elegido ?? destacado)
          const h = escala(s.neta)
          return (
            <button
              key={s.mes}
              type="button"
              onClick={() => setElegido(s.mes === elegido ? null : s.mes)}
              aria-label={`${nombreMesLargo(s.mes)}: ganancia neta ${formatCLP(s.neta)}`}
              className="flex flex-col items-center"
            >
              <div className="w-full flex flex-col justify-end items-center gap-1" style={{ height: altoPos + 16 }}>
                {s.neta > 0 && (
                  <span className={`text-[10px] cifra ${activo ? 'text-tinta font-medium' : 'text-tinta-2'}`}>{miles(s.neta)}</span>
                )}
                {s.neta >= 0 && (
                  <div
                    className={`w-full rounded-t ${actual ? 'bg-oliva' : 'bg-oliva-suave'} ${activo && !actual ? 'ring-2 ring-oliva ring-offset-1 ring-offset-tarjeta' : ''}`}
                    style={{ height: h }}
                  />
                )}
              </div>
              {hayNegativos && (
                <div className="w-full flex flex-col items-center gap-1 border-t border-linea" style={{ height: altoNeg + 16 }}>
                  {s.neta < 0 && (
                    <>
                      <div className={`w-full rounded-b ${actual ? 'bg-terracota' : 'bg-terracota-suave'}`} style={{ height: h }} />
                      <span className={`text-[10px] cifra ${activo ? 'text-tinta font-medium' : 'text-tinta-2'}`}>−{miles(-s.neta)}</span>
                    </>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div
        className="grid gap-2.5 text-center text-[11px] text-tinta-2"
        style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }}
      >
        {serie.map((s) => (
          <div key={s.mes} className={s.mes === destacado ? 'text-tinta font-medium' : ''}>
            {nombreMesCorto(s.mes)}
          </div>
        ))}
      </div>
      <div className="text-[11px] text-tinta-2 flex justify-between gap-2">
        <span>Miles de pesos</span>
        {detalle && (
          <span className="cifra text-right">
            {nombreMesLargo(detalle.mes).replace(/^./, (c) => c.toUpperCase())}: +{formatCLP(detalle.ingresos)} · −{formatCLP(detalle.gastos)}
          </span>
        )}
      </div>
    </div>
  )
}

function Encabezado({ titulo, total, color }: { titulo: string; total?: number; color?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <div className="etiqueta">{titulo}</div>
      {total != null && <div className={`text-[13px] font-medium cifra ${color ?? ''}`}>{formatCLP(total)}</div>}
    </div>
  )
}

export function TarjetaGrafico({ children }: { children: ReactNode }) {
  return <div className="bg-tarjeta border border-linea rounded-2xl p-4 flex flex-col gap-2.5">{children}</div>
}

/** Gastos por categoría: nombre y monto arriba, barra debajo (render 06). */
export function BarrasGastos({ filas, total }: { filas: Fila[]; total: number }) {
  const max = Math.max(1, ...filas.map((f) => f.monto))
  return (
    <TarjetaGrafico>
      <Encabezado titulo="Gastos por categoría" total={total} color="text-terracota" />
      {filas.length === 0 && <Vacio texto="Sin gastos de Ítaca en este período." />}
      {filas.map((f) => (
        <div key={f.id} className="flex flex-col gap-1">
          <div className="flex justify-between text-[13px]">
            <span>{f.nombre}</span>
            <span className="cifra">{formatCLP(f.monto)}</span>
          </div>
          <div className="h-2 bg-arena rounded">
            <div className="h-2 bg-terracota rounded" style={{ width: `${Math.max(2, (f.monto / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </TarjetaGrafico>
  )
}

/** Ventas por producto: "Sifnos ×2", barra, monto (render 06). */
export function BarrasProductos({ filas, ajustes }: { filas: Fila[]; ajustes: number }) {
  const max = Math.max(1, ...filas.map((f) => f.monto))
  const total = filas.reduce((s, f) => s + f.monto, 0)
  return (
    <TarjetaGrafico>
      <Encabezado titulo="Ventas por producto" total={total} color="text-oliva" />
      {filas.length === 0 && <Vacio texto="Sin ventas registradas en este período." />}
      {filas.length > 0 && (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2.5 gap-y-2 items-center text-[13px]">
          {filas.map((f) => (
            <div key={f.id} className="contents">
              <span className="whitespace-nowrap">
                {f.nombre} ×{f.unidades}
              </span>
              <div className="h-2 bg-oliva rounded" style={{ width: `${Math.max(3, (f.monto / max) * 100)}%` }} />
              <span className="text-right cifra">{formatCLP(f.monto)}</span>
            </div>
          ))}
        </div>
      )}
      {ajustes !== 0 && filas.length > 0 && (
        <div className="flex justify-between text-[12px] text-tinta-2 border-t border-linea pt-2">
          <span>{ajustes < 0 ? 'Descuentos y ajustes' : 'Ajustes y otros ingresos'}</span>
          <span className="cifra">
            {ajustes < 0 ? '−' : '+'}
            {formatCLP(Math.abs(ajustes))}
          </span>
        </div>
      )}
    </TarjetaGrafico>
  )
}

const COLORES_CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)']

/**
 * Participación por categoría de producto: una barra apilada con 2px de
 * separación y etiqueta directa (nombre, % y monto) para cada parte.
 * El color sigue a la categoría (orden del catálogo), no a su posición en el ranking.
 */
export function BarraCategorias({ filas, ordenCatalogo }: { filas: Fila[]; ordenCatalogo: string[] }) {
  const pct = porcentajes(filas.map((f) => f.monto))
  const color = (id: string) => {
    const i = ordenCatalogo.indexOf(id)
    return i >= 0 && i < COLORES_CAT.length ? COLORES_CAT[i] : 'var(--tinta-2)'
  }
  return (
    <TarjetaGrafico>
      <Encabezado titulo="Por categoría de producto" />
      {filas.length === 0 ? (
        <Vacio texto="Sin ventas registradas en este período." />
      ) : (
        <>
          <div className="flex h-3.5 rounded-full overflow-hidden gap-0.5">
            {filas.map((f, i) => (
              <div key={f.id} title={`${f.nombre} ${pct[i]}%`} style={{ width: `${pct[i]}%`, background: color(f.id), minWidth: 4 }} />
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px]">
            {filas.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color(f.id) }} aria-hidden="true" />
                <span>
                  <span className="font-medium">{f.nombre}</span> <span className="cifra">{pct[i]}% · {formatCLP(f.monto)}</span>
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </TarjetaGrafico>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-[13px] text-tinta-2 py-1">{texto}</p>
}

/** Pastilla "Octubre 2026 ▾" con selector nativo (render 02). */
export function SelectorMes({ mes, meses, onCambio }: { mes: Mes; meses: Mes[]; onCambio: (m: Mes) => void }) {
  const etiqueta = (m: Mes) => {
    const n = nombreMesLargo(m)
    return `${n[0].toUpperCase()}${n.slice(1)} ${m.slice(0, 4)}`
  }
  return (
    <label className="relative h-11 px-3.5 rounded-full border border-linea bg-tarjeta text-[14px] font-medium flex items-center gap-1.5">
      {etiqueta(mes)}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <select
        aria-label="Mes"
        value={mes}
        onChange={(e) => onCambio(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {meses.map((m) => (
          <option key={m} value={m}>
            {etiqueta(m)}
          </option>
        ))}
      </select>
    </label>
  )
}
