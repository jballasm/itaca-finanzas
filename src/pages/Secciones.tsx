import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Icon, type NombreIcono } from '../components/Icon'
import { BotonPrimario, Encabezado, Pantalla } from '../components/ui'
import { supabase } from '../lib/supabase'

function Opcion({ to, icon, titulo, detalle }: { to: string; icon: NombreIcono; titulo: string; detalle: string }) {
  return (
    <Link to={to} className="bg-tarjeta border border-linea rounded-2xl px-4 py-3.5 flex items-center gap-3 min-h-11">
      <span className="text-tierra">
        <Icon name={icon} />
      </span>
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{titulo}</span>
        <span className="text-[13px] text-tinta-2">{detalle}</span>
      </span>
      <Icon name="siguiente" size={18} strokeWidth={2} />
    </Link>
  )
}

export function Nuevo() {
  return (
    <Pantalla>
      <Encabezado titulo="Agregar" />
      <Opcion to="/subir" icon="subir" titulo="Subir cartola" detalle="Excel de BICE" />
      <Opcion to="/nuevo/venta" icon="mas" titulo="Venta" detalle="En efectivo o transferencia que no está en la cartola" />
      <Opcion to="/nuevo/gasto" icon="mas" titulo="Gasto manual" detalle="Pagado en efectivo o fuera de BICE" />
    </Pantalla>
  )
}

export function Ajustes() {
  const { session } = useAuth()
  return (
    <Pantalla>
      <Encabezado titulo="Ajustes" />
      <Opcion to="/ajustes/reglas" icon="revisar" titulo="Lo que la app aprendió" detalle="Ver, cambiar o borrar reglas" />
      <Opcion to="/ajustes/categorias" icon="lista" titulo="Categorías de gasto" detalle="Agregar, renombrar, ordenar u ocultar" />
      <Opcion to="/catalogo" icon="catalogo" titulo="Catálogo" detalle="Productos y precios" />
      <Opcion to="/movimientos" icon="lista" titulo="Todos los movimientos" detalle="Historial con buscador" />

      <div className="mt-4 flex flex-col gap-2">
        {session?.user.email && <p className="text-[13px] text-tinta-2 text-center">Sesión iniciada como {session.user.email}</p>}
        <BotonPrimario type="button" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </BotonPrimario>
      </div>
    </Pantalla>
  )
}
