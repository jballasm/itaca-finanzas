// Lógica pura de Catálogo y Ajustes.
import { CONFIRMACIONES_MINIMAS } from '../import/reglas'
import type { Clasificacion, Regla } from '../lib/types'

export interface FormProducto {
  nombre: string
  categoria_producto_id: string
  precio: string
  conPack: boolean
  unidades_pack: string
  precio_pack: string
  edicion: string
}

export interface ProductoValido {
  nombre: string
  categoria_producto_id: string
  precio: number
  precio_pack: number | null
  unidades_pack: number | null
  edicion: string | null
}

const entero = (s: string) => Number(s.replace(/\D/g, '') || 'NaN')

/** Valida el formulario y devuelve el producto o un mensaje de error. */
export function validarProducto(f: FormProducto, nombresExistentes: string[]): ProductoValido | string {
  const nombre = f.nombre.trim().replace(/\s+/g, ' ')
  if (!nombre) return 'Ponle un nombre al producto.'
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (nombresExistentes.some((n) => norm(n) === norm(nombre))) return `Ya existe un producto llamado ${nombre}.`
  if (!f.categoria_producto_id) return 'Elige una categoría.'
  const precio = entero(f.precio)
  if (!Number.isFinite(precio) || precio <= 0) return 'Ingresa el precio.'

  let precio_pack: number | null = null
  let unidades_pack: number | null = null
  if (f.conPack) {
    unidades_pack = entero(f.unidades_pack)
    precio_pack = entero(f.precio_pack)
    if (!Number.isFinite(unidades_pack) || unidades_pack < 2) return 'El pack tiene que ser de 2 o más unidades.'
    if (!Number.isFinite(precio_pack) || precio_pack <= 0) return 'Ingresa el precio del pack.'
    if (precio_pack >= precio * unidades_pack) return 'El pack debería costar menos que comprar las unidades por separado.'
  }
  return { nombre, categoria_producto_id: f.categoria_producto_id, precio, precio_pack, unidades_pack, edicion: f.edicion.trim() || null }
}

/**
 * Cuando Tere cambia una regla a mano, es una decisión segura: queda lista
 * para sugerir desde la próxima cartola, sin esperar confirmaciones.
 */
export function reglaEditada(
  prev: Pick<Regla, 'confirmaciones'>,
  d: { clasificacion: Clasificacion; categoria_gasto_id: string | null },
): Pick<Regla, 'clasificacion' | 'categoria_gasto_id' | 'confirmaciones' | 'correcciones' | 'activa'> {
  return {
    clasificacion: d.clasificacion,
    categoria_gasto_id: d.clasificacion === 'itaca' ? d.categoria_gasto_id : null,
    confirmaciones: Math.max(prev.confirmaciones, CONFIRMACIONES_MINIMAS),
    correcciones: 0,
    activa: true,
  }
}

/** Mueve el elemento `i` una posición (−1 arriba, +1 abajo) y devuelve el nuevo orden de ids. */
export function mover<T extends { id: string }>(lista: T[], i: number, dir: -1 | 1): string[] {
  const j = i + dir
  const ids = lista.map((x) => x.id)
  if (j < 0 || j >= ids.length) return ids
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  return ids
}

/** Edición más usada del catálogo activo ("Edición 01"). */
export function edicionPrincipal(productos: { edicion: string | null; activo: boolean }[]): string | null {
  const c = new Map<string, number>()
  for (const p of productos) if (p.activo && p.edicion) c.set(p.edicion, (c.get(p.edicion) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}
