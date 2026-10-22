import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { CampoHoja, Hoja, inputHoja } from '../components/Hoja'
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

function CambiarClave({ onCerrar }: { onCerrar: () => void }) {
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [estado, setEstado] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (clave.length < 8) return setEstado({ tipo: 'error', texto: 'Usa al menos 8 caracteres.' })
    if (clave !== repetir) return setEstado({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setGuardando(false)
    if (error) {
      console.error(error)
      const igual = /different from the old/i.test(error.message)
      return setEstado({ tipo: 'error', texto: igual ? 'Debe ser distinta a la actual.' : 'No se pudo cambiar. Revisa tu conexión.' })
    }
    setEstado({ tipo: 'ok', texto: 'Listo. Desde ahora usa la nueva contraseña.' })
    setClave('')
    setRepetir('')
  }

  return (
    <Hoja titulo="Cambiar contraseña" abierta onCerrar={onCerrar}>
      <CampoHoja label="Nueva contraseña">
        <input type="password" autoComplete="new-password" className={inputHoja} value={clave} onChange={(e) => setClave(e.target.value)} />
      </CampoHoja>
      <CampoHoja label="Repetir">
        <input type="password" autoComplete="new-password" className={inputHoja} value={repetir} onChange={(e) => setRepetir(e.target.value)} />
      </CampoHoja>
      {estado && (
        <p role="status" className={`text-[14px] ${estado.tipo === 'ok' ? 'text-oliva' : 'text-terracota'}`}>
          {estado.texto}
        </p>
      )}
      <BotonPrimario type="button" onClick={guardar} cargando={guardando}>
        Guardar contraseña
      </BotonPrimario>
    </Hoja>
  )
}

export function Ajustes() {
  const { session } = useAuth()
  const [cambiarClave, setCambiarClave] = useState(false)
  const cerrar = useCallback(() => setCambiarClave(false), [])
  return (
    <Pantalla>
      <Encabezado titulo="Ajustes" />
      <Opcion to="/ajustes/reglas" icon="revisar" titulo="Lo que la app aprendió" detalle="Ver, cambiar o borrar reglas" />
      <Opcion to="/ajustes/categorias" icon="lista" titulo="Categorías de gasto" detalle="Agregar, renombrar, ordenar u ocultar" />
      <Opcion to="/catalogo" icon="catalogo" titulo="Catálogo" detalle="Productos y precios" />
      <Opcion to="/movimientos" icon="lista" titulo="Todos los movimientos" detalle="Historial con buscador" />

      <div className="mt-4 flex flex-col gap-2">
        {session?.user.email && <p className="text-[13px] text-tinta-2 text-center">Sesión iniciada como {session.user.email}</p>}
        <button
          type="button"
          onClick={() => setCambiarClave(true)}
          className="h-[54px] rounded-xl border border-linea bg-tarjeta text-[15px] font-medium"
        >
          Cambiar contraseña
        </button>
        <BotonPrimario type="button" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </BotonPrimario>
      </div>
      {cambiarClave && <CambiarClave onCerrar={cerrar} />}
    </Pantalla>
  )
}
