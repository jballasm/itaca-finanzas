import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Logo, Pantalla, Proximamente } from '../components/ui'
import { supabase } from '../lib/supabase'

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

export function Inicio() {
  const pendientes = usePendientes()

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <Logo className="w-11 h-[22px]" />
          <div className="font-serif text-[22px] font-semibold tracking-[0.14em]">ÍTACA</div>
        </div>
        <Link to="/ajustes" aria-label="Ajustes" className="w-11 h-11 flex items-center justify-center text-tinta-2">
          <Icon name="ajustes" />
        </Link>
      </div>

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

      <Link
        to="/subir"
        className="bg-tarjeta border border-linea rounded-2xl px-4 py-3.5 flex items-center gap-3 min-h-11"
      >
        <span className="text-tierra">
          <Icon name="subir" />
        </span>
        <span className="flex-1 text-[15px] font-medium">Subir cartola BICE</span>
        <Icon name="siguiente" size={18} strokeWidth={2} />
      </Link>

      <Link
        to="/movimientos"
        className="bg-tarjeta border border-linea rounded-2xl px-4 py-3.5 flex items-center gap-3 min-h-11"
      >
        <span className="text-tierra">
          <Icon name="lista" />
        </span>
        <span className="flex-1 text-[15px] font-medium">Todos los movimientos</span>
        <Icon name="siguiente" size={18} strokeWidth={2} />
      </Link>

      <Proximamente texto="Aquí verás la ganancia neta del mes, ingresos y gastos de Ítaca, y el gráfico de los últimos 6 meses." />
    </Pantalla>
  )
}
