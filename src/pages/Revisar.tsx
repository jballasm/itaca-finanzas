import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TarjetaMovimiento } from '../components/TarjetaMovimiento'
import { Card, Pantalla } from '../components/ui'
import { cargarCategoriasGasto, cargarMovimientos, igualesPendientes, useCarga } from '../lib/datos'
import { confirmables, confirmarSugerencias } from '../revisar/clasificar'

type Pestana = 'por_revisar' | 'sugerido'

export function Revisar() {
  const { datos, error, recargar } = useCarga(() =>
    Promise.all([cargarMovimientos(['por_revisar', 'sugerido']), cargarCategoriasGasto()]),
  )
  const [pestana, setPestana] = useState<Pestana>('por_revisar')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const [pendientes, categorias] = datos ?? [[], []]
  const porRevisar = pendientes.filter((m) => m.estado === 'por_revisar')
  const sugeridos = pendientes.filter((m) => m.estado === 'sugerido')
  const enBloque = confirmables(sugeridos)
  const lista = pestana === 'por_revisar' ? porRevisar : sugeridos

  async function confirmarTodas() {
    setConfirmando(true)
    setAviso(null)
    try {
      const n = await confirmarSugerencias(sugeridos)
      setAviso(`${n} ${n === 1 ? 'sugerencia confirmada' : 'sugerencias confirmadas'}.`)
      recargar()
    } catch (e) {
      console.error(e)
      setAviso('No se pudieron confirmar. Revisa tu conexión.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-[30px] font-semibold">Revisar</h1>
        <Link
          to="/subir"
          className="h-11 px-3.5 rounded-full border border-linea bg-tarjeta text-[14px] font-medium flex items-center gap-1.5"
        >
          <Icon name="subir" size={16} strokeWidth={2} />
          Cartola
        </Link>
      </div>

      <div role="tablist" className="grid grid-cols-2 bg-arena rounded-xl p-1 gap-1">
        {(
          [
            ['por_revisar', `Por revisar · ${porRevisar.length}`],
            ['sugerido', `Sugeridos · ${sugeridos.length}`],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={`h-10 rounded-[9px] text-[14px] ${
              pestana === id ? 'bg-tarjeta text-tinta font-medium' : 'text-tinta-2'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {enBloque.length > 0 && (
        <button
          type="button"
          onClick={confirmarTodas}
          disabled={confirmando}
          className="h-12 rounded-xl border border-oliva bg-oliva-fondo text-oliva text-[14px] font-medium
            flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Icon name="check" size={18} strokeWidth={2.2} />
          {confirmando
            ? 'Confirmando…'
            : `Confirmar ${enBloque.length === 1 ? 'la sugerencia' : `las ${enBloque.length} sugerencias`}`}
        </button>
      )}
      {aviso && <p className="text-[13px] text-tinta-2 text-center">{aviso}</p>}

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      {datos && lista.length === 0 && (
        <Card className="p-5 flex flex-col items-center gap-2 text-center">
          <span className="w-10 h-10 rounded-full bg-oliva-fondo text-oliva flex items-center justify-center">
            <Icon name="check" size={20} strokeWidth={2.2} />
          </span>
          <p className="text-[15px] font-medium">
            {pestana === 'por_revisar' ? 'No hay movimientos por revisar' : 'No hay sugerencias pendientes'}
          </p>
          <p className="text-[13px] text-tinta-2">
            {pestana === 'por_revisar' && sugeridos.length > 0
              ? 'Revisa la pestaña Sugeridos.'
              : 'Sube una cartola nueva cuando tengas otro mes.'}
          </p>
        </Card>
      )}

      {lista.map((m) => (
        <TarjetaMovimiento
          key={m.id}
          mov={m}
          categorias={categorias}
          iguales={igualesPendientes(m, pendientes)}
          onGuardado={recargar}
        />
      ))}

      <Link to="/movimientos" className="self-center min-h-11 flex items-center text-[14px] text-tierra underline underline-offset-4">
        Ver todos los movimientos
      </Link>
    </Pantalla>
  )
}
