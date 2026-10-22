// Registrar venta (render 05). Dos usos:
//   /venta/:id    → un abono de la cartola (o una venta manual que se edita)
//   /nuevo/venta  → venta nueva en efectivo o transferencia
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Card, Encabezado, Pantalla } from '../components/ui'
import { useCarga } from '../lib/datos'
import { fechaCorta, formatCLP } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { CategoriaProducto, Medio, Producto } from '../lib/types'
import { COLUMNAS_MOV, type Mov } from '../revisar/clasificar'
import { capitalizar, titulo } from '../revisar/presentacion'
import { ajusteContraMonto, itemsVenta, parseAjuste, subtotal, totalProductos, type Seleccion } from '../ventas/calculo'
import { crearVentaManual, guardarVentaExistente, hoyISO } from '../ventas/guardar'

const VISIBLES_POR_CATEGORIA = 4

async function cargar(id?: string) {
  const [cats, prods, mov, items] = await Promise.all([
    supabase.from('categorias_producto').select('*').order('orden'),
    supabase.from('productos').select('*').order('precio', { ascending: false }),
    id ? supabase.from('movimientos').select(COLUMNAS_MOV).eq('id', id).maybeSingle() : null,
    id ? supabase.from('venta_items').select('producto_id, cantidad').eq('movimiento_id', id) : null,
  ])
  for (const r of [cats, prods, mov, items]) if (r?.error) throw r.error
  // Desactivados no se ofrecen, salvo los que ya están en esta venta (si no, se perderían al guardar).
  const enVenta = new Set((items?.data ?? []).map((i) => i.producto_id as string))
  return {
    categorias: cats.data as CategoriaProducto[],
    productos: (prods.data as Producto[]).filter((p) => p.activo || enVenta.has(p.id)),
    mov: (mov?.data ?? null) as Mov | null,
    items: (items?.data ?? []) as { producto_id: string; cantidad: number }[],
  }
}

type Datos = Awaited<ReturnType<typeof cargar>>

export function Venta() {
  const { id } = useParams()
  const { datos, error } = useCarga(() => cargar(id))

  if (error) {
    return (
      <Pantalla>
        <Encabezado titulo="Registrar venta" />
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      </Pantalla>
    )
  }
  if (!datos) return <Pantalla><Encabezado titulo="Registrar venta" /></Pantalla>
  if (id && !datos.mov) {
    return (
      <Pantalla>
        <Encabezado titulo="Registrar venta" />
        <Card className="p-4"><p className="text-[14px] text-tinta-2">No encontramos ese movimiento.</p></Card>
      </Pantalla>
    )
  }
  return <FormularioVenta datos={datos} />
}

function Stepper({ nombre, cantidad, onCambio }: { nombre: string; cantidad: number; onCambio: (q: number) => void }) {
  const activo = cantidad > 0
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Quitar ${nombre}`}
        disabled={!activo}
        onClick={() => onCambio(cantidad - 1)}
        className={`w-10 h-10 rounded-full border border-linea bg-tarjeta text-[18px] ${activo ? 'text-tinta' : 'text-tinta-2'}`}
      >
        −
      </button>
      <div className={`w-7 text-center cifra ${activo ? 'font-medium' : 'text-tinta-2'}`}>{cantidad}</div>
      <button
        type="button"
        aria-label={`Agregar ${nombre}`}
        onClick={() => onCambio(cantidad + 1)}
        className={`w-10 h-10 rounded-full text-[18px] ${activo ? 'bg-tierra text-white' : 'border border-tierra bg-tarjeta text-tierra'}`}
      >
        +
      </button>
    </div>
  )
}

function FormularioVenta({ datos }: { datos: Datos }) {
  const navigate = useNavigate()
  const { mov, productos, categorias } = datos
  const desdeCartola = mov != null && mov.origen !== 'manual'
  const editando = mov?.estado === 'confirmado' && mov.subtipo_ingreso === 'venta'

  const [sel, setSel] = useState<Seleccion>(() => Object.fromEntries(datos.items.map((i) => [i.producto_id, i.cantidad])))
  const [medio, setMedio] = useState<Medio>(mov?.medio === 'efectivo' ? 'efectivo' : mov ? 'transferencia' : 'efectivo')
  const [fecha, setFecha] = useState(mov?.fecha ?? hoyISO())
  const [nota, setNota] = useState(mov?.nota ?? '')
  const [recordar, setRecordar] = useState(!editando)
  const conCategoria = categorias.filter((c) => productos.some((p) => p.categoria_producto_id === c.id) || c.proximamente)
  const [catActiva, setCatActiva] = useState(conCategoria.find((c) => !c.proximamente)?.id ?? null)
  const [verTodos, setVerTodos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { unidades, monto: montoProductos } = totalProductos(sel, productos)
  const ajusteInicialManual = mov?.origen === 'manual' ? mov.monto - totalProductos(sel, productos).monto : 0
  const [ajusteTexto, setAjusteTexto] = useState(ajusteInicialManual ? String(ajusteInicialManual) : '')

  const ajuste = desdeCartola ? ajusteContraMonto(mov!.monto, montoProductos) : parseAjuste(ajusteTexto)
  const total = desdeCartola ? mov!.monto : montoProductos + ajuste
  const cuadra = desdeCartola && unidades > 0 && ajuste === 0

  const lista = useMemo(() => productos.filter((p) => p.categoria_producto_id === catActiva), [productos, catActiva])
  // Los elegidos siempre visibles; del resto, los primeros.
  const visibles = verTodos ? lista : lista.filter((p, i) => i < VISIBLES_POR_CATEGORIA || (sel[p.id] ?? 0) > 0)
  const ocultos = lista.filter((p) => !visibles.includes(p))

  const nombreClienta = mov?.clave ? capitalizar(mov.clave) : null

  async function guardar() {
    setError(null)
    if (unidades === 0) return setError('Elige al menos un producto.')
    if (total <= 0) return setError('El total tiene que ser mayor a $0.')
    setGuardando(true)
    try {
      const items = itemsVenta(sel, productos)
      const n = nota.trim() || null
      if (mov) await guardarVentaExistente(mov, items, { recordar: recordar && !editando, nota: n, monto: total, medio, fecha })
      else await crearVentaManual(items, { fecha, monto: total, medio, nota: n })
      navigate(-1)
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar la venta. Revisa tu conexión.')
      setGuardando(false)
    }
  }

  return (
    <>
      <Pantalla>
        <Encabezado titulo={editando ? 'Editar venta' : 'Registrar venta'} />

        {mov && desdeCartola && (
          <Card className="px-4 py-3.5 flex justify-between items-center rounded-[14px]">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-[15px] font-medium break-words">{titulo(mov)}</div>
              <div className="text-[12px] text-tinta-2">{fechaCorta(mov.fecha)} · desde la cartola</div>
            </div>
            <div className="font-medium text-oliva cifra">{formatCLP(mov.monto)}</div>
          </Card>
        )}

        {!desdeCartola && (
          <>
            <div role="tablist" className="grid grid-cols-2 bg-arena rounded-xl p-1 gap-1">
              {(['transferencia', 'efectivo'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={medio === m}
                  onClick={() => setMedio(m)}
                  className={`h-10 rounded-[9px] text-[14px] ${medio === m ? 'bg-tarjeta font-medium' : 'text-tinta-2'}`}
                >
                  {m === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 text-[14px]">
              <span className="text-tinta-2">Fecha</span>
              <input
                type="date"
                value={fecha}
                max={hoyISO()}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-xl border border-linea bg-tarjeta px-3 text-[15px] text-tinta"
              />
            </label>
          </>
        )}

        <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1">
          {conCategoria.map((c) => {
            const tiene = productos.some((p) => p.categoria_producto_id === c.id)
            const activa = c.id === catActiva
            return (
              <button
                key={c.id}
                type="button"
                disabled={!tiene}
                onClick={() => {
                  setCatActiva(c.id)
                  setVerTodos(false)
                }}
                className={`h-[38px] px-3.5 rounded-full text-[13px] whitespace-nowrap shrink-0 ${
                  activa
                    ? 'bg-tinta text-papel font-medium'
                    : tiene
                      ? 'border border-linea text-tinta'
                      : 'border border-dashed border-linea text-tinta-2'
                }`}
              >
                {c.nombre}
                {!tiene && ' · pronto'}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col pb-[260px]">
          {visibles.map((p) => {
            const q = sel[p.id] ?? 0
            return (
              <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-linea">
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <div className="font-serif text-[20px] font-semibold tracking-[0.1em] uppercase">{p.nombre}</div>
                  <div className="text-[13px] text-tinta-2 cifra">
                    {formatCLP(p.precio)}
                    {p.precio_pack != null && ` · pack ${p.unidades_pack} × ${formatCLP(p.precio_pack)}`}
                    {q > 1 && subtotal(p, q) !== q * p.precio && (
                      <span className="text-oliva"> · {formatCLP(subtotal(p, q))}</span>
                    )}
                  </div>
                </div>
                <Stepper nombre={p.nombre} cantidad={q} onCambio={(n) => setSel({ ...sel, [p.id]: Math.max(0, n) })} />
              </div>
            )
          })}
          {ocultos.length > 0 && (
            <button type="button" onClick={() => setVerTodos(true)} className="text-left text-[13px] text-tinta-2 pt-2 min-h-11">
              + {ocultos.map((p) => p.nombre).join(', ')}
            </button>
          )}
        </div>
      </Pantalla>

      <div className="fixed bottom-0 inset-x-0 z-10 bg-tarjeta border-t border-linea">
        <div className="max-w-[480px] mx-auto px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-2.5">
          <div className="flex justify-between text-[14px]">
            <span className="text-tinta-2">Productos ({unidades})</span>
            <span className="cifra">{formatCLP(montoProductos)}</span>
          </div>

          {desdeCartola ? (
            <div className="flex justify-between text-[14px]">
              <span className="text-tinta-2">Ajuste o descuento</span>
              <span className="cifra">{ajuste < 0 ? '−' : ajuste > 0 ? '+' : ''}{formatCLP(Math.abs(ajuste))}</span>
            </div>
          ) : (
            <label className="flex justify-between items-center gap-3 text-[14px]">
              <span className="text-tinta-2">Ajuste o descuento</span>
              <input
                inputMode="numeric"
                placeholder="$0 (usa − para descuento)"
                value={ajusteTexto}
                onChange={(e) => setAjusteTexto(e.target.value)}
                className="h-9 w-[170px] rounded-lg border border-linea bg-papel px-2 text-right text-[14px] cifra"
              />
            </label>
          )}

          {ajuste !== 0 && (
            <input
              placeholder="Nota (ej: descuento a amiga, envío incluido)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="h-10 rounded-lg border border-linea bg-papel px-3 text-[14px]"
            />
          )}

          {desdeCartola ? (
            <div className={`flex justify-between items-center text-[14px] ${cuadra ? 'text-oliva' : 'text-tinta'}`}>
              <span className="flex items-center gap-1.5">
                {cuadra && <Icon name="check" size={16} strokeWidth={2.2} />}
                {cuadra ? 'Cuadra con la transferencia' : 'Total de la transferencia'}
              </span>
              <span className="font-medium cifra">{formatCLP(total)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-[15px]">
              <span className="font-medium">Total</span>
              <span className="font-medium cifra text-oliva">{formatCLP(total)}</span>
            </div>
          )}

          {nombreClienta && !editando && (
            <label className="flex items-center gap-2.5 text-[13px] text-tinta-2 min-h-8">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="w-[18px] h-[18px] accent-[var(--tierra)]"
              />
              Recordar a {nombreClienta} como clienta
            </label>
          )}

          {error && (
            <p role="alert" className="text-[13px] text-terracota">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="h-[54px] rounded-xl bg-tinta text-papel text-[15px] font-medium tracking-[0.14em] uppercase disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar venta'}
          </button>
        </div>
      </div>
    </>
  )
}
