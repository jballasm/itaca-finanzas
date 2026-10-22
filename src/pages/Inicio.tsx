import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarrasMensuales, SelectorMes } from '../components/graficos'
import { Icon } from '../components/Icon'
import { Card, Etiqueta, Logo, Pantalla } from '../components/ui'
import { useCarga } from '../lib/datos'
import { fechaCorta, formatCLP, formatCLPConSigno, MESES_LARGOS } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  delMes, primerDia, rangoMeses, resumenVenta, serieMensual, sumarMeses, totales, ultimoDia, variacion, type MovReporte,
} from '../reportes/agregar'
import { titulo } from '../revisar/presentacion'
import { cargarItaca, cargarNombres, mesActual, useMes } from '../reportes/datos'

const MESES_GRAFICO = 6

function usePendientes() {
  const [n, setN] = useState<{ total: number; sugeridos: number } | null>(null)
  useEffect(() => {
    const contar = (estado: string) =>
      supabase.from('movimientos').select('id', { count: 'exact', head: true }).eq('estado', estado)
    Promise.all([contar('por_revisar'), contar('sugerido')]).then(([a, b]) => {
      if (a.error || b.error) return
      setN({ total: (a.count ?? 0) + (b.count ?? 0), sugeridos: b.count ?? 0 })
    })
  }, [])
  return n
}

/** Últimos 24 meses para el selector. */
export function mesesSelector(): string[] {
  const hoy = mesActual()
  return rangoMeses(sumarMeses(hoy, -23), hoy).reverse()
}

function tituloItaca(m: MovReporte, categorias: Map<string, string>, descripciones: Map<string, string>) {
  if (m.tipo === 'ingreso') {
    return {
      titulo: m.items.length ? `Venta · ${resumenVenta(m.items)}` : 'Ingreso de Ítaca',
      detalle: descripciones.get(m.id) ?? '',
    }
  }
  return { titulo: descripciones.get(m.id) ?? 'Gasto', detalle: categorias.get(m.categoria_gasto_id ?? '') ?? 'Sin categoría' }
}

const MEDIO: Record<string, string> = { transferencia: 'Transferencia', efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito' }

export function Inicio() {
  const { mes, setMes } = useMes()
  const pendientes = usePendientes()
  const primerMes = sumarMeses(mes, -(MESES_GRAFICO - 1))
  const { datos, error } = useCargaPorMes(mes, primerMes)

  const movs = datos?.movs ?? []
  const delMesActual = delMes(movs, mes)
  const t = totales(delMesActual)
  const anterior = totales(delMes(movs, sumarMeses(mes, -1)))
  const v = variacion(t.neta, anterior.neta)
  const serie = serieMensual(movs, rangoMeses(primerMes, mes))
  const nombreMes = MESES_LARGOS[Number(mes.slice(5)) - 1]
  const nombreAnterior = MESES_LARGOS[Number(sumarMeses(mes, -1).slice(5)) - 1]
  const ultimos = delMesActual.slice(0, 5)

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <Logo className="w-11 h-[22px]" />
          <div className="font-serif text-[22px] font-semibold tracking-[0.14em]">ÍTACA</div>
        </div>
        <SelectorMes mes={mes} meses={mesesSelector()} onCambio={setMes} />
      </div>

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      <Card className="p-5 flex flex-col gap-3.5">
        <Etiqueta>Ganancia neta · {nombreMes}</Etiqueta>
        <div className={`font-serif text-[50px] font-semibold leading-none cifra ${t.neta < 0 ? 'text-terracota' : 'text-oliva'}`}>
          {t.neta < 0 ? '−' : ''}
          {formatCLP(Math.abs(t.neta))}
        </div>
        <div className="text-[13px] text-tinta-2 min-h-[1lh]">
          {datos && (v == null ? `Sin datos de ${nombreAnterior} para comparar` : `${v > 0 ? '+' : ''}${v}% vs ${nombreAnterior}`)}
        </div>
        <div className="h-px bg-linea" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-tinta-2">Ingresos Ítaca</div>
            <div className="text-[20px] font-medium cifra">{formatCLP(t.ingresos)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-tinta-2">Gastos Ítaca</div>
            <div className="text-[20px] font-medium cifra text-terracota">{formatCLP(t.gastos)}</div>
          </div>
        </div>
      </Card>

      {pendientes && pendientes.total > 0 && (
        <Link
          to="/revisar"
          className="bg-alerta-suave border border-alerta rounded-[14px] px-4 py-3.5 flex items-center gap-3 text-tinta"
        >
          <div className="w-[34px] h-[34px] rounded-full bg-alerta text-white flex items-center justify-center font-medium text-[15px] cifra">
            {pendientes.total}
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="font-medium text-[15px]">Movimientos por revisar</div>
            {pendientes.sugeridos > 0 && (
              <div className="text-[13px] text-tinta-2">{pendientes.sugeridos} con sugerencia lista</div>
            )}
          </div>
          <Icon name="siguiente" size={18} strokeWidth={2} />
        </Link>
      )}

      <Card className="px-[18px] pt-[18px] pb-3.5 flex flex-col gap-3">
        <Etiqueta>Ganancia neta · últimos {MESES_GRAFICO} meses</Etiqueta>
        <BarrasMensuales serie={serie} destacado={mes} alto={100} />
      </Card>

      <div className="flex flex-col gap-2">
        <Etiqueta>Últimos de Ítaca</Etiqueta>
        {datos && ultimos.length === 0 && (
          <p className="text-[14px] text-tinta-2 py-2">Aún no hay movimientos de Ítaca en {nombreMes}.</p>
        )}
        {ultimos.map((m) => {
          const fila = tituloItaca(m, datos!.categorias, datos!.descripciones)
          const detalle = fila.detalle
          return (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-linea">
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="text-[15px] truncate">{fila.titulo}</div>
                <div className="text-[12px] text-tinta-2 truncate">
                  {fechaCorta(m.fecha)}
                  {detalle && ` · ${detalle}`}
                </div>
              </div>
              <div className={`font-medium cifra whitespace-nowrap ${m.tipo === 'ingreso' ? 'text-oliva' : 'text-terracota'}`}>
                {formatCLPConSigno(m.monto, m.tipo)}
              </div>
            </div>
          )
        })}
        <div className="flex justify-between">
          <Link to="/movimientos" className="min-h-11 flex items-center text-[14px] text-tierra underline underline-offset-4">
            Todos los movimientos
          </Link>
          <Link to="/ajustes" className="min-h-11 flex items-center gap-1.5 text-[14px] text-tinta-2">
            <Icon name="ajustes" size={18} />
            Ajustes
          </Link>
        </div>
      </div>
    </Pantalla>
  )
}

/** Datos de Inicio: movimientos Ítaca + nombres de categorías + descripción corta. */
function useCargaPorMes(mes: string, desde: string) {
  const r = useCarga(async () => {
    const [movs, categorias, extra] = await Promise.all([
      cargarItaca(desde, mes),
      cargarNombres('categorias_gasto'),
      supabase
        .from('movimientos')
        .select('id, medio, origen, descripcion_original, clave, tipo, fecha, cuota, nota')
        .eq('estado', 'confirmado')
        .eq('clasificacion', 'itaca')
        .gte('fecha', primerDia(mes))
        .lte('fecha', ultimoDia(mes)),
    ])
    if (extra.error) throw extra.error
    // Ingresos: "18 oct · Transferencia"; gastos: nombre del comercio.
    const descripciones = new Map(
      extra.data.map((m) => [
        m.id as string,
        m.tipo === 'ingreso' ? MEDIO[m.medio as string] ?? '' : titulo(m as Parameters<typeof titulo>[0]),
      ]),
    )
    return { movs, categorias, descripciones }
  })
  const { recargar } = r
  useEffect(recargar, [mes, recargar])
  return r
}
