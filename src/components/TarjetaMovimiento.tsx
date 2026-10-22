import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCLPConSigno } from '../lib/format'
import type { CategoriaGasto, Clasificacion } from '../lib/types'
import { mismaDecision } from '../revisar/aprendizaje'
import { clasificar, type Mov } from '../revisar/clasificar'
import { subtitulo, titulo } from '../revisar/presentacion'
import { Icon } from './Icon'

const CHIPS_VISIBLES = 6

interface Props {
  mov: Mov
  categorias: CategoriaGasto[]
  /** Otros movimientos pendientes con la misma clave y tipo. */
  iguales?: Mov[]
  /** 'editar': movimiento ya confirmado (pantalla Movimientos). */
  modo?: 'revisar' | 'editar'
  onGuardado: () => void
}

const btnBase = 'h-[46px] rounded-[10px] text-[14px] flex items-center justify-center px-2 active:opacity-80 disabled:opacity-50'
const btnOscuro = `${btnBase} bg-tinta text-papel font-medium`
const btnClaro = `${btnBase} border border-linea text-tinta`

function Casilla({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <label className="flex items-center gap-2.5 text-[13px] text-tinta-2 min-h-8">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[18px] h-[18px] accent-[var(--tierra)]"
      />
      {children}
    </label>
  )
}

export function TarjetaMovimiento({ mov, categorias, iguales = [], modo = 'revisar', onGuardado }: Props) {
  const inicialItaca = mov.clasificacion === 'itaca' && mov.tipo === 'gasto' && (mov.estado === 'sugerido' || modo === 'editar')
  const [eleccion, setEleccion] = useState<Clasificacion | null>(inicialItaca ? 'itaca' : null)
  const [categoria, setCategoria] = useState<string | null>(inicialItaca ? mov.categoria_gasto_id : null)
  const [todas, setTodas] = useState(false)
  const [recordar, setRecordar] = useState(true)
  const [aplicarIguales, setAplicarIguales] = useState(true)
  const [verDetalle, setVerDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esGasto = mov.tipo === 'gasto'
  const sugerido = mov.estado === 'sugerido'
  const nIguales = iguales.length
  const abierto = eleccion !== null

  async function guardar(clasificacion: Clasificacion, categoriaId: string | null) {
    const d = { clasificacion, categoria_gasto_id: clasificacion === 'itaca' && esGasto ? categoriaId : null }
    // Editar sin cambios no debe inflar la regla.
    if (modo === 'editar' && mov.clasificacion && mismaDecision({ clasificacion: mov.clasificacion, categoria_gasto_id: mov.categoria_gasto_id }, d)) {
      onGuardado()
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const movs = aplicarIguales ? [mov, ...iguales] : [mov]
      await clasificar(movs, d, { recordar, subtipo_ingreso: null })
      onGuardado()
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar. Revisa tu conexión.')
      setGuardando(false)
    }
  }

  function elegirNoItaca() {
    // Sin iguales y sin opciones que mostrar: se guarda al tiro.
    if (nIguales === 0 && modo === 'revisar') return guardar('no_itaca', null)
    setEleccion('no_itaca')
  }

  const visibles = todas ? categorias : categorias.slice(0, CHIPS_VISIBLES)
  const seleccionadaOculta = !todas && categoria && !visibles.some((c) => c.id === categoria)
  const sugerencia = sugerido && mov.clasificacion === 'itaca' && esGasto
    ? categorias.find((c) => c.id === mov.categoria_gasto_id)?.nombre
    : null

  return (
    <div
      className={`bg-tarjeta rounded-2xl p-4 flex flex-col gap-3 ${
        abierto ? 'border-[1.5px] border-tierra' : 'border border-linea'
      }`}
    >
      <button type="button" onClick={() => setVerDetalle(!verDetalle)} className="flex justify-between gap-2.5 text-left">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="font-medium text-[15px] break-words">{titulo(mov)}</div>
          <div className="text-[12px] text-tinta-2">
            {subtitulo(mov)}
            {sugerencia && <span className="text-oliva"> · Sugerido: {sugerencia}</span>}
          </div>
        </div>
        <div className={`font-medium cifra whitespace-nowrap ${esGasto ? 'text-terracota' : 'text-oliva'}`}>
          {formatCLPConSigno(mov.monto, mov.tipo)}
        </div>
      </button>
      {verDetalle && <p className="text-[12px] text-tinta-2 leading-relaxed -mt-1">{mov.descripcion_original}</p>}

      {!abierto && (
        <div className="grid grid-cols-2 gap-2">
          {esGasto ? (
            <button type="button" className={btnClaro} onClick={() => setEleccion('itaca')} disabled={guardando}>
              Ítaca
            </button>
          ) : (
            <Link to={`/venta/${mov.id}`} className={btnOscuro}>
              Ítaca · Venta
            </Link>
          )}
          <button
            type="button"
            className={modo === 'editar' && mov.clasificacion === 'no_itaca' ? btnOscuro : btnClaro}
            onClick={elegirNoItaca}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'No es de Ítaca'}
          </button>
        </div>
      )}

      {eleccion === 'itaca' && (
        <>
          <div className="text-[12px] tracking-[0.18em] uppercase text-tinta-2">Ítaca · ¿Qué tipo de gasto?</div>
          <div className="flex flex-wrap gap-1.5">
            {visibles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id)}
                aria-pressed={categoria === c.id}
                className={`h-9 px-3 rounded-full text-[13px] ${
                  categoria === c.id ? 'bg-tierra text-white font-medium' : 'border border-linea text-tinta'
                }`}
              >
                {c.nombre}
              </button>
            ))}
            {!todas && categorias.length > CHIPS_VISIBLES && (
              <button
                type="button"
                onClick={() => setTodas(true)}
                className={`h-9 px-3 rounded-full text-[13px] ${seleccionadaOculta ? 'bg-tierra text-white' : 'border border-linea text-tinta'}`}
              >
                Más…
              </button>
            )}
          </div>
        </>
      )}

      {eleccion === 'no_itaca' && (
        <div className="text-[12px] tracking-[0.18em] uppercase text-tinta-2">No es de Ítaca · se ignora en los resúmenes</div>
      )}

      {abierto && (
        <>
          <div className="flex flex-col">
            {mov.clave && <Casilla checked={recordar} onChange={setRecordar}>Recordar para próximas veces</Casilla>}
            {nIguales > 0 && (
              <Casilla checked={aplicarIguales} onChange={setAplicarIguales}>
                {`Aplicar también a ${nIguales === 1 ? 'el otro igual' : `los otros ${nIguales} iguales`}`}
              </Casilla>
            )}
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-terracota">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEleccion(null)
                setError(null)
              }}
              className={`${btnClaro} w-[46px] shrink-0`}
              aria-label="Volver"
            >
              <Icon name="volver" size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${btnOscuro} flex-1`}
              disabled={guardando || (eleccion === 'itaca' && !categoria)}
              onClick={() => guardar(eleccion!, categoria)}
            >
              {guardando ? 'Guardando…' : sugerido && eleccion === 'itaca' && categoria === mov.categoria_gasto_id ? 'Confirmar' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
