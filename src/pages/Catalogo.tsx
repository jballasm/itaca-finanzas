import { useCallback, useState } from 'react'
import { edicionPrincipal, validarProducto, type FormProducto } from '../catalogo/reglas'
import { CampoHoja, Hoja, inputHoja } from '../components/Hoja'
import { Icon } from '../components/Icon'
import { BotonPrimario, Card, Pantalla } from '../components/ui'
import { useCarga } from '../lib/datos'
import { formatCLP } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { CategoriaProducto, Producto } from '../lib/types'

async function cargar() {
  const [cats, prods] = await Promise.all([
    supabase.from('categorias_producto').select('*').order('orden'),
    supabase.from('productos').select('*').order('precio', { ascending: false }),
  ])
  if (cats.error) throw cats.error
  if (prods.error) throw prods.error
  return { categorias: cats.data as CategoriaProducto[], productos: prods.data as Producto[] }
}

function precioTexto(p: Producto) {
  return p.precio_pack != null ? `${formatCLP(p.precio)} · ${p.unidades_pack} por ${formatCLP(p.precio_pack)}` : formatCLP(p.precio)
}

function TarjetaProducto({ p, onClick }: { p: Producto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-tarjeta border border-linea rounded-xl px-3.5 py-3 flex flex-col gap-0.5 text-left active:opacity-80 ${
        p.activo ? '' : 'opacity-55'
      }`}
    >
      <span className="font-serif text-[19px] font-semibold tracking-[0.12em] uppercase leading-tight break-words">{p.nombre}</span>
      <span className="text-[13px] text-tinta-2 cifra">{precioTexto(p)}</span>
    </button>
  )
}

function Seccion({ titulo, n }: { titulo: string; n: number }) {
  return (
    <div className="text-[11px] tracking-[0.28em] uppercase text-tinta-2 flex items-center gap-2.5 mt-1">
      {titulo}
      <div className="flex-1 h-px bg-linea" />
      <span className="cifra">{n}</span>
    </div>
  )
}

type Edicion = { modo: 'nuevo'; categoriaId?: string } | { modo: 'editar'; producto: Producto }

export function Catalogo() {
  const { datos, error, recargar } = useCarga(cargar)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [verInactivos, setVerInactivos] = useState(false)
  const cerrar = useCallback(() => setEdicion(null), [])

  const categorias = datos?.categorias ?? []
  const productos = datos?.productos ?? []
  const activos = productos.filter((p) => p.activo)
  const inactivos = productos.filter((p) => !p.activo)
  const conProductos = categorias.filter((c) => activos.some((p) => p.categoria_producto_id === c.id))
  const vacias = categorias.filter((c) => !activos.some((p) => p.categoria_producto_id === c.id))
  const edicionCat = edicionPrincipal(productos)

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-serif text-[30px] font-semibold leading-[1.1]">Catálogo</h1>
          {edicionCat && <div className="text-[11px] tracking-[0.28em] uppercase text-tinta-2">{edicionCat}</div>}
        </div>
        <button
          type="button"
          onClick={() => setEdicion({ modo: 'nuevo' })}
          className="h-11 px-3.5 rounded-full bg-tinta text-papel text-[14px] font-medium flex items-center gap-1.5 active:opacity-80"
        >
          <Icon name="mas" size={16} strokeWidth={2} />
          Producto
        </button>
      </div>

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}

      {conProductos.map((c) => {
        const lista = activos.filter((p) => p.categoria_producto_id === c.id)
        return (
          <section key={c.id} className="flex flex-col gap-3.5">
            <Seccion titulo={c.nombre} n={lista.length} />
            <div className="grid grid-cols-2 gap-2">
              {lista.map((p) => (
                <TarjetaProducto key={p.id} p={p} onClick={() => setEdicion({ modo: 'editar', producto: p })} />
              ))}
            </div>
          </section>
        )
      })}

      {vacias.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {vacias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEdicion({ modo: 'nuevo', categoriaId: c.id })}
              className="border border-dashed border-linea rounded-xl p-3.5 flex flex-col gap-1 text-left active:opacity-80"
            >
              <span className="text-[11px] tracking-[0.28em] uppercase text-tinta-2">{c.nombre}</span>
              <span className="font-serif italic text-[18px] text-tinta-2">{c.proximamente ? 'Próximamente' : 'Sin productos'}</span>
              <span className="text-[12px] text-tierra">+ Agregar el primero</span>
            </button>
          ))}
        </div>
      )}

      {inactivos.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setVerInactivos(!verInactivos)}
            className="self-start min-h-11 text-[14px] text-tinta-2 underline underline-offset-4"
          >
            {verInactivos ? 'Ocultar desactivados' : `Ver desactivados (${inactivos.length})`}
          </button>
          {verInactivos && (
            <div className="grid grid-cols-2 gap-2">
              {inactivos.map((p) => (
                <TarjetaProducto key={p.id} p={p} onClick={() => setEdicion({ modo: 'editar', producto: p })} />
              ))}
            </div>
          )}
        </>
      )}

      {edicion && (
        <FormularioProducto
          key={edicion.modo === 'editar' ? edicion.producto.id : `nuevo-${edicion.categoriaId ?? ''}`}
          edicion={edicion}
          categorias={categorias}
          productos={productos}
          edicionPorDefecto={edicionCat ?? ''}
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

function FormularioProducto({
  edicion, categorias, productos, edicionPorDefecto, onCerrar, onGuardado,
}: {
  edicion: Edicion
  categorias: CategoriaProducto[]
  productos: Producto[]
  edicionPorDefecto: string
  onCerrar: () => void
  onGuardado: () => void
}) {
  const p = edicion.modo === 'editar' ? edicion.producto : null
  const [f, setF] = useState<FormProducto>({
    nombre: p?.nombre ?? '',
    categoria_producto_id: p?.categoria_producto_id ?? (edicion.modo === 'nuevo' ? edicion.categoriaId : undefined) ?? categorias[0]?.id ?? '',
    precio: p ? String(p.precio) : '',
    conPack: p?.precio_pack != null,
    unidades_pack: p?.unidades_pack ? String(p.unidades_pack) : '2',
    precio_pack: p?.precio_pack ? String(p.precio_pack) : '',
    edicion: p ? (p.edicion ?? '') : edicionPorDefecto,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof FormProducto) => (v: string | boolean) => setF({ ...f, [k]: v })

  async function guardar() {
    const otros = productos.filter((x) => x.id !== p?.id).map((x) => x.nombre)
    const r = validarProducto(f, otros)
    if (typeof r === 'string') return setError(r)
    setGuardando(true)
    setError(null)
    try {
      const { error } = p
        ? await supabase.from('productos').update(r).eq('id', p.id)
        : await supabase.from('productos').insert({ ...r, activo: true })
      if (error) throw error
      // El primer producto de "Collares" la saca de Próximamente.
      const cat = categorias.find((c) => c.id === r.categoria_producto_id)
      if (cat?.proximamente) {
        const { error: e } = await supabase.from('categorias_producto').update({ proximamente: false }).eq('id', cat.id)
        if (e) throw e
      }
      onGuardado()
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar. Revisa tu conexión.')
      setGuardando(false)
    }
  }

  async function cambiarActivo() {
    if (!p) return
    setGuardando(true)
    const { error } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    if (error) {
      setError('No se pudo guardar. Revisa tu conexión.')
      setGuardando(false)
      return
    }
    onGuardado()
  }

  return (
    <Hoja titulo={p ? `Editar ${p.nombre}` : 'Nuevo producto'} abierta onCerrar={onCerrar}>
      <CampoHoja label="Nombre">
        <input className={inputHoja} value={f.nombre} onChange={(e) => set('nombre')(e.target.value)} placeholder="Ej: Santorini" />
      </CampoHoja>

      <div className="flex flex-col gap-1.5">
        <span className="etiqueta">Categoría</span>
        <div className="flex flex-wrap gap-1.5">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={f.categoria_producto_id === c.id}
              onClick={() => set('categoria_producto_id')(c.id)}
              className={`h-9 px-3 rounded-full text-[13px] ${
                f.categoria_producto_id === c.id ? 'bg-tinta text-papel font-medium' : 'border border-linea text-tinta'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CampoHoja label="Precio">
          <input className={`${inputHoja} cifra`} inputMode="numeric" value={f.precio} onChange={(e) => set('precio')(e.target.value)} placeholder="$0" />
        </CampoHoja>
        <CampoHoja label="Edición">
          <input className={inputHoja} value={f.edicion} onChange={(e) => set('edicion')(e.target.value)} placeholder="Edición 01" />
        </CampoHoja>
      </div>

      <label className="flex items-center gap-2.5 text-[14px] min-h-8">
        <input
          type="checkbox"
          checked={f.conPack}
          onChange={(e) => set('conPack')(e.target.checked)}
          className="w-[18px] h-[18px] accent-[var(--tierra)]"
        />
        Tiene precio por pack
      </label>
      {f.conPack && (
        <div className="grid grid-cols-2 gap-3">
          <CampoHoja label="Unidades">
            <input className={`${inputHoja} cifra`} inputMode="numeric" value={f.unidades_pack} onChange={(e) => set('unidades_pack')(e.target.value)} />
          </CampoHoja>
          <CampoHoja label="Precio del pack">
            <input className={`${inputHoja} cifra`} inputMode="numeric" value={f.precio_pack} onChange={(e) => set('precio_pack')(e.target.value)} placeholder="$0" />
          </CampoHoja>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-terracota">
          {error}
        </p>
      )}

      <BotonPrimario type="button" onClick={guardar} cargando={guardando}>
        {p ? 'Guardar cambios' : 'Agregar producto'}
      </BotonPrimario>

      {p && (
        <button type="button" onClick={cambiarActivo} disabled={guardando} className="min-h-11 text-[14px] text-tinta-2 underline underline-offset-4">
          {p.activo ? 'Desactivar (deja de aparecer al vender)' : 'Volver a activar'}
        </button>
      )}
      {p && (
        <p className="text-[12px] text-tinta-2 -mt-2">
          Cambiar el precio no modifica las ventas ya registradas.
        </p>
      )}
    </Hoja>
  )
}
