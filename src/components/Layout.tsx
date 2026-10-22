import { Link, Outlet, useLocation } from 'react-router-dom'
import { Icon, type NombreIcono } from './Icon'

interface Item {
  to: string
  label: string
  icon: NombreIcono
  /** Rutas que también marcan este ítem (Subir cartola vive bajo Revisar). */
  tambien?: string[]
}

const IZQ: Item[] = [
  { to: '/', label: 'Inicio', icon: 'inicio', tambien: ['/movimientos', '/ajustes'] },
  { to: '/revisar', label: 'Revisar', icon: 'revisar', tambien: ['/subir', '/venta'] },
]
const DER: Item[] = [
  { to: '/reportes', label: 'Reportes', icon: 'reportes' },
  { to: '/catalogo', label: 'Catálogo', icon: 'catalogo' },
]

function NavItem({ item, activo }: { item: Item; activo: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={activo ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] ${
        activo ? 'text-tinta font-medium' : 'text-tinta-2'
      }`}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const activo = (i: Item) => pathname === i.to || (i.tambien ?? []).some((p) => pathname.startsWith(p))
  // Registrar venta tiene su propio pie fijo (render 05), sin navegación.
  const sinNav = pathname.startsWith('/venta/') || pathname === '/nuevo/venta'

  return (
    <div className="min-h-dvh flex flex-col max-w-[480px] mx-auto">
      <main className={`flex-1 ${sinNav ? '' : 'pb-[calc(84px+env(safe-area-inset-bottom))]'}`}>
        <Outlet />
      </main>
      {!sinNav && <nav
        aria-label="Navegación"
        className="fixed bottom-0 inset-x-0 z-10 bg-tarjeta border-t border-linea
          pb-[calc(10px+env(safe-area-inset-bottom))]"
      >
        <div className="max-w-[480px] mx-auto h-[74px] grid grid-cols-5 items-center">
          {IZQ.map((i) => (
            <NavItem key={i.to} item={i} activo={activo(i)} />
          ))}
          <Link
            to="/nuevo"
            aria-label="Agregar"
            className="justify-self-center w-[54px] h-[54px] -mt-[18px] rounded-full bg-tinta text-papel
              flex items-center justify-center active:opacity-80"
          >
            <Icon name="mas" size={24} strokeWidth={2} />
          </Link>
          {DER.map((i) => (
            <NavItem key={i.to} item={i} activo={activo(i)} />
          ))}
        </div>
      </nav>}
    </div>
  )
}
