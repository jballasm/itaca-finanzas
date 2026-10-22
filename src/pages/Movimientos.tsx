import { useMemo, useState } from 'react'
import { TarjetaMovimiento } from '../components/TarjetaMovimiento'
import { Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { sinTildes } from '../import/normalizar'
import { cargarCategoriasGasto, cargarMovimientos, useCarga } from '../lib/datos'
import { formatCLPConSigno, MESES_LARGOS } from '../lib/format'
import type { Mov } from '../revisar/clasificar'
import { subtitulo, titulo } from '../revisar/presentacion'

type Filtro = 'todos' | 'itaca' | 'no_itaca' | 'pendientes'

const FILTROS: [Filtro, string][] = [
  ['todos', 'Todos'],
  ['itaca', 'Ítaca'],
  ['no_itaca', 'No Ítaca'],
  ['pendientes', 'Pendientes'],
]

const norm = (s: string) => sinTildes(s).toLowerCase()

function pasaFiltro(m: Mov, f: Filtro): boolean {
  if (f === 'pendientes') return m.estado !== 'confirmado'
  if (f === 'itaca') return m.estado === 'confirmado' && m.clasificacion === 'itaca'
  if (f === 'no_itaca') return m.estado === 'confirmado' && m.clasificacion === 'no_itaca'
  return true
}

function etiquetaEstado(m: Mov, categorias: Map<string, string>): { texto: string; color: string } {
  if (m.estado !== 'confirmado') return { texto: 'Por revisar', color: 'text-alerta-texto' }
  if (m.clasificacion === 'no_itaca') return { texto: 'No es de Ítaca', color: 'text-tinta-2' }
  if (m.tipo === 'ingreso') return { texto: m.subtipo_ingreso === 'venta' ? 'Ítaca · Venta' : 'Ítaca', color: 'text-oliva' }
  return { texto: `Ítaca · ${categorias.get(m.categoria_gasto_id ?? '') ?? 'Sin categoría'}`, color: 'text-tierra' }
}

export function Movimientos() {
  const { datos, error, recargar } = useCarga(() => Promise.all([cargarMovimientos(), cargarCategoriasGasto()]))
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)

  const [movs, categorias] = datos ?? [[], []]
  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias])

  const visibles = useMemo(() => {
    const q = norm(busqueda.trim())
    return movs.filter(
      (m) => pasaFiltro(m, filtro) && (!q || norm(`${titulo(m)} ${m.descripcion_original} ${m.clave}`).includes(q)),
    )
  }, [movs, filtro, busqueda])

  // Agrupar por mes, ya vienen ordenados por fecha descendente.
  const grupos = useMemo(() => {
    const g: { mes: string; items: Mov[] }[] = []
    for (const m of visibles) {
      const [a, mm] = m.fecha.split('-').map(Number)
      const mes = `${MESES_LARGOS[mm - 1]} ${a}`
      if (g.at(-1)?.mes !== mes) g.push({ mes, items: [] })
      g.at(-1)!.items.push(m)
    }
    return g
  }, [visibles])

  return (
    <Pantalla>
      <Encabezado titulo="Movimientos" />

      <input
        type="search"
        placeholder="Buscar comercio o persona"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="h-12 rounded-xl border border-linea bg-tarjeta px-4 text-[16px] outline-none focus:border-tierra placeholder:text-tinta-2"
      />

      <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-1">
        {FILTROS.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            aria-pressed={filtro === id}
            className={`h-9 px-3.5 rounded-full text-[13px] whitespace-nowrap ${
              filtro === id ? 'bg-tinta text-papel font-medium' : 'border border-linea text-tinta'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && (
        <Card className="p-4">
          <p className="text-[14px] text-terracota">{error}</p>
        </Card>
      )}
      {datos && visibles.length === 0 && <p className="text-[14px] text-tinta-2 text-center py-6">No hay movimientos.</p>}

      {grupos.map(({ mes, items }) => (
        <section key={mes} className="flex flex-col gap-1">
          <Etiqueta className="mt-2 mb-1">{mes}</Etiqueta>
          {items.map((m) =>
            abierto === m.id ? (
              <div key={m.id} className="my-1">
                <TarjetaMovimiento
                  mov={m}
                  categorias={categorias}
                  modo={m.estado === 'confirmado' ? 'editar' : 'revisar'}
                  onGuardado={() => {
                    setAbierto(null)
                    recargar()
                  }}
                />
                <button
                  type="button"
                  onClick={() => setAbierto(null)}
                  className="w-full min-h-11 text-[13px] text-tinta-2"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <button
                key={m.id}
                type="button"
                onClick={() => setAbierto(m.id)}
                className="flex items-center gap-3 py-2.5 border-b border-linea text-left"
              >
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <div className="text-[15px] truncate">{titulo(m)}</div>
                  <div className="text-[12px] text-tinta-2 truncate">
                    {subtitulo(m)} · <span className={etiquetaEstado(m, nombreCat).color}>{etiquetaEstado(m, nombreCat).texto}</span>
                  </div>
                </div>
                <div
                  className={`font-medium cifra whitespace-nowrap ${
                    m.clasificacion === 'no_itaca' ? 'text-tinta-2' : m.tipo === 'gasto' ? 'text-terracota' : 'text-oliva'
                  }`}
                >
                  {formatCLPConSigno(m.monto, m.tipo)}
                </div>
              </button>
            ),
          )}
        </section>
      ))}
    </Pantalla>
  )
}
