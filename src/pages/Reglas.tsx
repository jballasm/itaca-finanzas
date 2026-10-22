// "Lo que la app aprendió" (render 08).
import { useCallback, useMemo, useState } from 'react'
import { reglaEditada } from '../catalogo/reglas'
import { Hoja } from '../components/Hoja'
import { Icon } from '../components/Icon'
import { BotonPrimario, Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { esConfiable } from '../import/reglas'
import { sinTildes } from '../import/normalizar'
import { cargarCategoriasGasto, useCarga } from '../lib/datos'
import { supabase } from '../lib/supabase'
import type { CategoriaGasto, Clasificacion, Regla } from '../lib/types'
import { capitalizar } from '../revisar/presentacion'

async function cargar() {
  const [reglas, categorias] = await Promise.all([
    supabase.from('reglas').select('*').order('confirmaciones', { ascending: false }),
    cargarCategoriasGasto(),
  ])
  if (reglas.error) throw reglas.error
  return { reglas: reglas.data as Regla[], categorias }
}

const nombreRegla = (r: Regla) => (r.tipo === 'ingreso' ? capitalizar(r.clave) : r.clave)

function detalleRegla(r: Regla, categorias: Map<string, string>) {
  const partes = [r.tipo === 'gasto' ? 'Gasto' : 'Ingreso']
  if (r.clasificacion === 'itaca') {
    partes.push(r.tipo === 'gasto' ? (categorias.get(r.categoria_gasto_id ?? '') ?? 'Sin categoría') : 'Venta (clienta)')
  }
  partes.push(`${r.confirmaciones} ${r.confirmaciones === 1 ? 'vez' : 'veces'}`)
  if (!r.activa) partes.push('pausada')
  else if (!esConfiable(r)) partes.push('aprendiendo')
  return partes.join(' · ')
}

function Fila({ r, categorias, onEditar, ultima }: { r: Regla; categorias: Map<string, string>; onEditar: () => void; ultima: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-3 ${ultima ? '' : 'border-b border-linea'} ${r.activa ? '' : 'opacity-60'}`}>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="text-[15px] font-medium break-words">{nombreRegla(r)}</div>
        <div className="text-[12px] text-tinta-2">{detalleRegla(r, categorias)}</div>
      </div>
      <button type="button" onClick={onEditar} aria-label={`Editar regla ${nombreRegla(r)}`} className="w-11 h-11 flex items-center justify-center text-tinta-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16z" />
        </svg>
      </button>
    </div>
  )
}

export function Reglas() {
  const { datos, error, recargar } = useCarga(cargar)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Regla | null>(null)
  const cerrar = useCallback(() => setEditando(null), [])

  const categorias = useMemo(() => new Map((datos?.categorias ?? []).map((c) => [c.id, c.nombre])), [datos])
  const q = sinTildes(busqueda.trim()).toLowerCase()
  const reglas = (datos?.reglas ?? []).filter((r) => !q || sinTildes(r.clave).toLowerCase().includes(q))
  const itaca = reglas.filter((r) => r.clasificacion === 'itaca')
  const noItaca = reglas.filter((r) => r.clasificacion === 'no_itaca')

  return (
    <Pantalla>
      <Encabezado titulo="Lo que la app aprendió" />
      <p className="text-[14px] text-tinta-2 leading-[1.45] -mt-1">
        Cada vez que confirmas o corriges un movimiento, la app lo recuerda. Puedes cambiar o borrar cualquier regla.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] tracking-[0.18em] uppercase text-tinta-2">Buscar</span>
        <input
          type="search"
          placeholder="Comercio o persona"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="h-[46px] rounded-xl border border-linea bg-tarjeta px-3.5 text-[15px] outline-none focus:border-tierra placeholder:text-tinta-2"
        />
      </label>

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      <Etiqueta>Son de Ítaca</Etiqueta>
      <div className="bg-tarjeta border border-linea rounded-[14px] flex flex-col">
        {datos && itaca.length === 0 && <p className="px-3.5 py-3 text-[13px] text-tinta-2">Todavía no hay reglas de Ítaca.</p>}
        {itaca.map((r, i) => (
          <Fila key={r.id} r={r} categorias={categorias} onEditar={() => setEditando(r)} ultima={i === itaca.length - 1} />
        ))}
      </div>

      <Etiqueta>No son de Ítaca</Etiqueta>
      <div className="bg-tarjeta border border-linea rounded-[14px] flex flex-col">
        {noItaca.map((r) => (
          <Fila key={r.id} r={r} categorias={categorias} onEditar={() => setEditando(r)} ultima={false} />
        ))}
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="text-[15px] font-medium">Pago de tarjeta de crédito</div>
            <div className="text-[12px] text-tinta-2">Automática · siempre se ignora</div>
          </div>
          <div className="w-11 h-11 flex items-center justify-center text-tinta-2">
            <Icon name="candado" size={18} />
          </div>
        </div>
      </div>

      {editando && (
        <EditarRegla
          key={editando.id}
          regla={editando}
          categorias={datos?.categorias ?? []}
          onCerrar={cerrar}
          onGuardado={() => {
            cerrar()
            recargar()
          }}
        />
      )}
    </Pantalla>
  )
}

function EditarRegla({ regla, categorias, onCerrar, onGuardado }: { regla: Regla; categorias: CategoriaGasto[]; onCerrar: () => void; onGuardado: () => void }) {
  const [clasificacion, setClasificacion] = useState<Clasificacion>(regla.clasificacion)
  const [categoria, setCategoria] = useState<string | null>(regla.categoria_gasto_id)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esGasto = regla.tipo === 'gasto'

  async function ejecutar(op: () => PromiseLike<{ error: unknown }>) {
    setGuardando(true)
    setError(null)
    const { error } = await op()
    if (error) {
      console.error(error)
      setError('No se pudo guardar. Revisa tu conexión.')
      setGuardando(false)
      return
    }
    onGuardado()
  }

  const guardar = () => {
    if (clasificacion === 'itaca' && esGasto && !categoria) return setError('Elige una categoría.')
    return ejecutar(() =>
      supabase.from('reglas').update(reglaEditada(regla, { clasificacion, categoria_gasto_id: esGasto ? categoria : null })).eq('id', regla.id),
    )
  }

  return (
    <Hoja titulo={nombreRegla(regla)} abierta onCerrar={onCerrar}>
      <p className="text-[13px] text-tinta-2 -mt-2">
        {esGasto ? 'Gasto' : 'Ingreso'} · confirmada {regla.confirmaciones} {regla.confirmaciones === 1 ? 'vez' : 'veces'}
        {regla.correcciones > 0 && ` · corregida ${regla.correcciones} ${regla.correcciones === 1 ? 'vez' : 'veces'}`}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {(['itaca', 'no_itaca'] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={clasificacion === c}
            onClick={() => setClasificacion(c)}
            className={`h-[46px] rounded-[10px] text-[14px] ${clasificacion === c ? 'bg-tinta text-papel font-medium' : 'border border-linea'}`}
          >
            {c === 'itaca' ? (esGasto ? 'Ítaca' : 'Ítaca · Venta') : 'No es de Ítaca'}
          </button>
        ))}
      </div>

      {clasificacion === 'itaca' && esGasto && (
        <div className="flex flex-wrap gap-1.5">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              className={`h-9 px-3 rounded-full text-[13px] ${categoria === c.id ? 'bg-tierra text-white font-medium' : 'border border-linea'}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <p className="text-[12px] text-tinta-2">
        Al guardar, la regla queda lista para sugerir desde la próxima cartola. Los movimientos ya clasificados no cambian.
      </p>

      {error && (
        <p role="alert" className="text-[14px] text-terracota">
          {error}
        </p>
      )}

      <BotonPrimario type="button" onClick={guardar} cargando={guardando}>
        Guardar regla
      </BotonPrimario>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          disabled={guardando}
          onClick={() => ejecutar(() => supabase.from('reglas').update({ activa: !regla.activa }).eq('id', regla.id))}
          className="min-h-11 text-[14px] text-tinta-2 underline underline-offset-4"
        >
          {regla.activa ? 'Pausar' : 'Reactivar'}
        </button>
        {confirmarBorrar ? (
          <button
            type="button"
            disabled={guardando}
            onClick={() => ejecutar(() => supabase.from('reglas').delete().eq('id', regla.id))}
            className="min-h-11 px-3 rounded-lg bg-terracota text-white text-[14px] font-medium"
          >
            Sí, borrar
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmarBorrar(true)} className="min-h-11 text-[14px] text-terracota underline underline-offset-4">
            Borrar regla
          </button>
        )}
      </div>
    </Hoja>
  )
}
