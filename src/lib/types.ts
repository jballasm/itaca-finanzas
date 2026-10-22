// Tipos de las tablas de Supabase (supabase/migrations/001_schema.sql).

export type TipoMovimiento = 'gasto' | 'ingreso'
export type Origen = 'bice_cuenta' | 'bice_tc' | 'manual'
export type TipoCartola = Exclude<Origen, 'manual'>
export type Medio = 'transferencia' | 'efectivo' | 'debito' | 'credito'
export type Estado = 'por_revisar' | 'sugerido' | 'confirmado'
export type Clasificacion = 'itaca' | 'no_itaca'
export type SubtipoIngreso = 'venta' | 'otro'

export interface CategoriaGasto {
  id: string
  user_id: string
  nombre: string
  orden: number
  activa: boolean
}

export interface CategoriaProducto {
  id: string
  user_id: string
  nombre: string
  orden: number
  proximamente: boolean
}

export interface Producto {
  id: string
  user_id: string
  categoria_producto_id: string
  nombre: string
  precio: number
  precio_pack: number | null
  unidades_pack: number | null
  edicion: string | null
  activo: boolean
}

export interface Importacion {
  id: string
  user_id: string
  archivo_nombre: string
  tipo: TipoCartola
  periodo_desde: string | null
  periodo_hasta: string | null
  filas: number
  nuevas: number
  duplicadas: number
  created_at: string
}

export interface Movimiento {
  id: string
  user_id: string
  importacion_id: string | null
  fecha: string
  tipo: TipoMovimiento
  monto: number
  origen: Origen
  medio: Medio
  descripcion_original: string
  clave: string
  cuota: string | null
  nro_operacion: string | null
  estado: Estado
  clasificacion: Clasificacion | null
  categoria_gasto_id: string | null
  subtipo_ingreso: SubtipoIngreso | null
  regla_id: string | null
  nota: string | null
  huella: string
  created_at: string
  updated_at: string
}

export interface VentaItem {
  id: string
  user_id: string
  movimiento_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export interface Regla {
  id: string
  user_id: string
  clave: string
  tipo: TipoMovimiento
  clasificacion: Clasificacion
  categoria_gasto_id: string | null
  confirmaciones: number
  correcciones: number
  activa: boolean
  updated_at: string
}
