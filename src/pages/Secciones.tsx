// Pantallas que se construyen en fases siguientes (plan §11).
import { Link } from 'react-router-dom'
import { Icon, type NombreIcono } from '../components/Icon'
import { BotonPrimario, Card, Encabezado, Pantalla, Proximamente } from '../components/ui'
import { supabase } from '../lib/supabase'

function Opcion({ to, icon, titulo, detalle }: { to?: string; icon: NombreIcono; titulo: string; detalle: string }) {
  const contenido = (
    <>
      <span className="text-tierra">
        <Icon name={icon} />
      </span>
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{titulo}</span>
        <span className="text-[13px] text-tinta-2">{detalle}</span>
      </span>
      {to && <Icon name="siguiente" size={18} strokeWidth={2} />}
    </>
  )
  const cls = 'bg-tarjeta border border-linea rounded-2xl px-4 py-3.5 flex items-center gap-3 min-h-11'
  return to ? (
    <Link to={to} className={cls}>
      {contenido}
    </Link>
  ) : (
    <div className={`${cls} opacity-60`}>{contenido}</div>
  )
}

export function Revisar() {
  return (
    <Pantalla>
      <Encabezado titulo="Revisar" volver={false} />
      <Opcion to="/subir" icon="subir" titulo="Subir cartola" detalle="Cuenta corriente o tarjeta BICE" />
      <Proximamente texto="Aquí vas a confirmar cada movimiento como Ítaca o No es de Ítaca." />
    </Pantalla>
  )
}

export function Nuevo() {
  return (
    <Pantalla>
      <Encabezado titulo="Agregar" />
      <Opcion to="/subir" icon="subir" titulo="Subir cartola" detalle="Excel de BICE" />
      <Opcion icon="mas" titulo="Venta en efectivo" detalle="Próximamente" />
      <Opcion icon="mas" titulo="Gasto manual" detalle="Próximamente" />
    </Pantalla>
  )
}

export function Reportes() {
  return (
    <Pantalla>
      <Encabezado titulo="Reportes" volver={false} />
      <Proximamente texto="Ganancia neta por mes, gastos por categoría y ventas por producto." />
    </Pantalla>
  )
}

export function Catalogo() {
  return (
    <Pantalla>
      <Encabezado titulo="Catálogo" volver={false} />
      <Proximamente texto="Productos por categoría con su precio. Podrás agregar, editar o desactivar." />
    </Pantalla>
  )
}

export function Movimientos() {
  return (
    <Pantalla>
      <Encabezado titulo="Movimientos" />
      <Proximamente texto="Historial con buscador y filtros." />
    </Pantalla>
  )
}

export function Ajustes() {
  return (
    <Pantalla>
      <Encabezado titulo="Ajustes" />
      <Opcion icon="lista" titulo="Reglas aprendidas" detalle="Próximamente" />
      <Opcion icon="lista" titulo="Categorías de gasto" detalle="Próximamente" />
      <Card className="p-4 flex flex-col gap-3">
        <BotonPrimario type="button" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </BotonPrimario>
      </Card>
    </Pantalla>
  )
}
