import { useState } from 'react'
import { mover } from '../catalogo/reglas'
import { inputHoja } from '../components/Hoja'
import { Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { useCarga } from '../lib/datos'
import { supabase } from '../lib/supabase'
import type { CategoriaGasto } from '../lib/types'

async function cargar() {
  const { data, error } = await supabase.from('categorias_gasto').select('*').order('orden')
  if (error) throw error
  return data as CategoriaGasto[]
}

const btnFlecha = 'w-9 h-9 rounded-full border border-linea flex items-center justify-center text-tinta-2 disabled:opacity-30'

export function CategoriasGasto() {
  const { datos, error, recargar } = useCarga(cargar)
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [nueva, setNueva] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const lista = datos ?? []
  const activas = lista.filter((c) => c.activa)
  const inactivas = lista.filter((c) => !c.activa)

  async function correr(op: () => PromiseLike<{ error: { code?: string } | null }>) {
    setOcupado(true)
    setAviso(null)
    const { error } = await op()
    setOcupado(false)
    if (error) {
      console.error(error)
      setAviso(error.code === '23505' ? 'Ya existe una categoría con ese nombre.' : 'No se pudo guardar. Revisa tu conexión.')
      return false
    }
    recargar()
    return true
  }

  async function reordenar(i: number, dir: -1 | 1) {
    const ids = mover(activas, i, dir)
    setOcupado(true)
    const res = await Promise.all(ids.map((id, orden) => supabase.from('categorias_gasto').update({ orden: orden + 1 }).eq('id', id)))
    setOcupado(false)
    if (res.some((r) => r.error)) setAviso('No se pudo reordenar.')
    recargar()
  }

  async function renombrar(c: CategoriaGasto) {
    const nombre = texto.trim()
    if (!nombre || nombre === c.nombre) return setEditando(null)
    if (await correr(() => supabase.from('categorias_gasto').update({ nombre }).eq('id', c.id))) setEditando(null)
  }

  async function agregar() {
    const nombre = nueva.trim()
    if (!nombre) return
    const orden = Math.max(0, ...lista.map((c) => c.orden)) + 1
    if (await correr(() => supabase.from('categorias_gasto').insert({ nombre, orden }))) setNueva('')
  }

  return (
    <Pantalla>
      <Encabezado titulo="Categorías de gasto" />
      <p className="text-[14px] text-tinta-2 leading-[1.45] -mt-1">
        El orden es el mismo en que aparecen al revisar. Las primeras seis se ven sin tocar «Más…».
      </p>

      {(error || aviso) && (
        <Card className="p-3">
          <p role="alert" className="text-[14px] text-terracota">{error ?? aviso}</p>
        </Card>
      )}

      <div className="bg-tarjeta border border-linea rounded-[14px] flex flex-col">
        {activas.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-2 px-3.5 py-2.5 ${i < activas.length - 1 ? 'border-b border-linea' : ''}`}>
            {editando === c.id ? (
              <input
                autoFocus
                className={`${inputHoja} h-10 flex-1`}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && renombrar(c)}
                onBlur={() => renombrar(c)}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditando(c.id)
                  setTexto(c.nombre)
                }}
                className="flex-1 text-left text-[15px] min-h-10"
              >
                {c.nombre}
              </button>
            )}
            <button type="button" aria-label={`Subir ${c.nombre}`} disabled={i === 0 || ocupado} onClick={() => reordenar(i, -1)} className={btnFlecha}>
              ↑
            </button>
            <button type="button" aria-label={`Bajar ${c.nombre}`} disabled={i === activas.length - 1 || ocupado} onClick={() => reordenar(i, 1)} className={btnFlecha}>
              ↓
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => correr(() => supabase.from('categorias_gasto').update({ activa: false }).eq('id', c.id))}
              className="text-[12px] text-tinta-2 underline underline-offset-2 px-1 min-h-10"
            >
              Ocultar
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className={`${inputHoja} flex-1`}
          placeholder="Nueva categoría"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={ocupado || !nueva.trim()}
          className="h-12 px-4 rounded-xl bg-tinta text-papel text-[14px] font-medium disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {inactivas.length > 0 && (
        <>
          <Etiqueta className="mt-2">Ocultas</Etiqueta>
          <div className="bg-tarjeta border border-linea rounded-[14px] flex flex-col">
            {inactivas.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-2 px-3.5 py-2.5 ${i < inactivas.length - 1 ? 'border-b border-linea' : ''}`}>
                <span className="flex-1 text-[15px] text-tinta-2">{c.nombre}</span>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => correr(() => supabase.from('categorias_gasto').update({ activa: true }).eq('id', c.id))}
                  className="text-[13px] text-tierra underline underline-offset-2 min-h-10 px-1"
                >
                  Mostrar
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-tinta-2">Las categorías ocultas no aparecen al revisar, pero los gastos ya clasificados las mantienen en Reportes.</p>
        </>
      )}
    </Pantalla>
  )
}
