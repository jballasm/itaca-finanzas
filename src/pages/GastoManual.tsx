import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotonPrimario, Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { cargarCategoriasGasto, useCarga } from '../lib/datos'
import { formatCLP } from '../lib/format'
import type { Medio } from '../lib/types'
import { crearGastoManual, hoyISO } from '../ventas/guardar'

const inputCls = 'h-12 w-full rounded-xl border border-linea bg-tarjeta px-4 text-[16px] outline-none focus:border-tierra'

export function GastoManual() {
  const navigate = useNavigate()
  const { datos: categorias, error: errCarga } = useCarga(cargarCategoriasGasto)
  const [descripcion, setDescripcion] = useState('')
  const [montoTexto, setMontoTexto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [medio, setMedio] = useState<Medio>('efectivo')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setError] = useState<string | null>(null)
  const error = errorForm ?? errCarga

  const monto = Number(montoTexto.replace(/\D/g, '') || '0')

  async function guardar() {
    setError(null)
    if (!descripcion.trim()) return setError('Escribe qué fue el gasto.')
    if (monto <= 0) return setError('Ingresa el monto.')
    if (!categoria) return setError('Elige una categoría.')
    setGuardando(true)
    try {
      await crearGastoManual({ fecha, monto, medio, descripcion: descripcion.trim(), categoria_gasto_id: categoria })
      navigate(-1)
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar. Revisa tu conexión.')
      setGuardando(false)
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="Gasto manual" />

      <label className="flex flex-col gap-2">
        <Etiqueta>¿Qué fue?</Etiqueta>
        <input className={inputCls} placeholder="Ej: hilos en la feria" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </label>

      <label className="flex flex-col gap-2">
        <Etiqueta>Monto</Etiqueta>
        <input
          className={`${inputCls} cifra`}
          inputMode="numeric"
          placeholder="$0"
          value={monto ? formatCLP(monto) : montoTexto}
          onChange={(e) => setMontoTexto(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <Etiqueta>Fecha</Etiqueta>
          <input type="date" className={inputCls} value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <div className="flex flex-col gap-2">
          <Etiqueta>Pago</Etiqueta>
          <div className="grid grid-cols-2 bg-arena rounded-xl p-1 gap-1 h-12">
            {(['efectivo', 'transferencia'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={medio === m}
                onClick={() => setMedio(m)}
                className={`rounded-[9px] text-[13px] ${medio === m ? 'bg-tarjeta font-medium' : 'text-tinta-2'}`}
              >
                {m === 'efectivo' ? 'Efectivo' : 'Transf.'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Etiqueta>Categoría</Etiqueta>
        <div className="flex flex-wrap gap-1.5">
          {(categorias ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              className={`h-9 px-3 rounded-full text-[13px] ${
                categoria === c.id ? 'bg-tierra text-white font-medium' : 'border border-linea text-tinta'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="p-3">
          <p role="alert" className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      <BotonPrimario type="button" onClick={guardar} cargando={guardando}>
        Guardar gasto
      </BotonPrimario>
    </Pantalla>
  )
}
