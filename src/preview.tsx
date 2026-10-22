// Solo desarrollo: vista previa de los gráficos con datos inventados.
// Se abre con `npm run dev` en /itaca-finanzas/preview.html. No se publica.
import { createRoot } from 'react-dom/client'
import { BarraCategorias, BarrasGastos, BarrasMensuales, BarrasProductos } from './components/graficos'
import './index.css'

const serie = [
  { mes: '2026-05', ingresos: 300000, gastos: 180000, neta: 120000 },
  { mes: '2026-06', ingresos: 320000, gastos: 135000, neta: 185000 },
  { mes: '2026-07', ingresos: 80000, gastos: 142000, neta: -62000 },
  { mes: '2026-08', ingresos: 400000, gastos: 162000, neta: 238000 },
  { mes: '2026-09', ingresos: 410000, gastos: 159000, neta: 251000 },
  { mes: '2026-10', ingresos: 432990, gastos: 138450, neta: 294540 },
]

createRoot(document.getElementById('root')!).render(
  <div className="max-w-[390px] mx-auto px-5 py-7 flex flex-col gap-4">
    <div className="bg-tarjeta border border-linea rounded-2xl px-[18px] pt-[18px] pb-3.5 flex flex-col gap-3">
      <div className="etiqueta">Ganancia neta · últimos 6 meses</div>
      <BarrasMensuales serie={serie} destacado="2026-10" />
    </div>
    <BarrasGastos
      total={138450}
      filas={[
        { id: '1', nombre: 'Hilos y materiales', monto: 58300 },
        { id: '2', nombre: 'Herrajes y broches', monto: 24900 },
        { id: '3', nombre: 'Envíos', monto: 21750 },
      ]}
    />
    <BarrasProductos
      ajustes={-5000}
      filas={[
        { id: 'a', nombre: 'Sifnos', unidades: 2, monto: 120000 },
        { id: 'b', nombre: 'Paros', unidades: 3, monto: 90000 },
        { id: 'c', nombre: 'Penélope', unidades: 1, monto: 28000 },
      ]}
    />
    <BarraCategorias
      ordenCatalogo={['aros', 'pulseras', 'collares', 'carteras']}
      filas={[
        { id: 'aros', nombre: 'Aros', monto: 325000 },
        { id: 'pulseras', nombre: 'Pulseras', monto: 107990 },
      ]}
    />
  </div>,
)
