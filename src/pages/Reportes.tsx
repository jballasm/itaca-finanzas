import { useEffect, useState } from 'react'
import { BarraCategorias, BarrasGastos, BarrasMensuales, BarrasProductos, SelectorMes, TarjetaGrafico } from '../components/graficos'
import { Card, Etiqueta, Pantalla } from '../components/ui'
import { useCarga } from '../lib/datos'
import { formatCLP } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  ajustesVentas, enMeses, gastosPorCategoria, rangoMeses, serieMensual, sumarMeses, totales,
  ventasPorCategoriaProducto, ventasPorProducto, type Mes,
} from '../reportes/agregar'
import { cargarItaca, cargarNombres, useMes } from '../reportes/datos'
import { mesesSelector } from './Inicio'

type Periodo = 'mes' | '3m' | 'anio'

function mesesDelPeriodo(mes: Mes, p: Periodo): Mes[] {
  if (p === 'mes') return [mes]
  if (p === '3m') return rangoMeses(sumarMeses(mes, -2), mes)
  return rangoMeses(`${mes.slice(0, 4)}-01`, mes) // año calendario hasta el mes elegido
}

export function Reportes() {
  const { mes, setMes } = useMes()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const meses = mesesDelPeriodo(mes, periodo)
  // Siempre traemos 12 meses: cambiar de pestaña no vuelve a consultar.
  const desde = sumarMeses(mes, -11) < meses[0] ? sumarMeses(mes, -11) : meses[0]

  const { datos, error, recargar } = useCarga(async () => {
    const [movs, catGasto, catProd, ordenProd] = await Promise.all([
      cargarItaca(desde, mes),
      cargarNombres('categorias_gasto'),
      cargarNombres('categorias_producto'),
      supabase.from('categorias_producto').select('id').order('orden'),
    ])
    if (ordenProd.error) throw ordenProd.error
    return { movs, catGasto, catProd, ordenProd: ordenProd.data.map((r) => r.id as string) }
  })
  useEffect(recargar, [mes, recargar])

  const movs = enMeses(datos?.movs ?? [], meses)
  const t = totales(movs)
  const serie = serieMensual(datos?.movs ?? [], meses.length > 1 ? meses : rangoMeses(sumarMeses(mes, -5), mes))

  return (
    <Pantalla>
      <div className="flex justify-between items-center gap-3">
        <h1 className="font-serif text-[30px] font-semibold">Reportes</h1>
        <SelectorMes mes={mes} meses={mesesSelector()} onCambio={setMes} />
      </div>

      <div role="tablist" className="grid grid-cols-3 bg-arena rounded-xl p-1 gap-1">
        {(
          [
            ['mes', 'Mes'],
            ['3m', '3 meses'],
            ['anio', 'Año'],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={periodo === id}
            onClick={() => setPeriodo(id)}
            className={`h-10 rounded-[9px] text-[14px] ${periodo === id ? 'bg-tarjeta font-medium' : 'text-tinta-2'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      {datos && (
        <>
          <TarjetaGrafico>
            <div className="flex justify-between items-baseline gap-2">
              <Etiqueta>Ganancia neta</Etiqueta>
              <div className={`text-[13px] font-medium cifra ${t.neta < 0 ? 'text-terracota' : 'text-oliva'}`}>
                {t.neta < 0 ? '−' : ''}
                {formatCLP(Math.abs(t.neta))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-tinta-2">Ingresos</span>
                <span className="cifra">{formatCLP(t.ingresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tinta-2">Gastos</span>
                <span className="cifra text-terracota">{formatCLP(t.gastos)}</span>
              </div>
            </div>
            <BarrasMensuales serie={serie} destacado={mes} alto={80} />
          </TarjetaGrafico>

          <BarrasGastos filas={gastosPorCategoria(movs, datos.catGasto)} total={t.gastos} />
          <BarrasProductos filas={ventasPorProducto(movs)} ajustes={ajustesVentas(movs)} />
          <BarraCategorias filas={ventasPorCategoriaProducto(movs, datos.catProd)} ordenCatalogo={datos.ordenProd} />

          <p className="text-[12px] text-tinta-2 text-center">
            Solo cuenta lo confirmado como Ítaca. Lo pendiente de revisar no aparece aquí.
          </p>
        </>
      )}
    </Pantalla>
  )
}
