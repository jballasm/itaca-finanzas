import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { Logo } from './components/ui'
import { GastoManual } from './pages/GastoManual'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
import { Movimientos } from './pages/Movimientos'
import { Revisar } from './pages/Revisar'
import { Reportes } from './pages/Reportes'
import { Catalogo } from './pages/Catalogo'
import { CategoriasGasto } from './pages/CategoriasGasto'
import { Reglas } from './pages/Reglas'
import { Ajustes, Nuevo } from './pages/Secciones'
import { MesProvider } from './reportes/datos'
import { Subir } from './pages/Subir'
import { Venta } from './pages/Venta'

function Rutas() {
  const { session, cargando, recuperando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Logo className="w-20 h-10 opacity-60 animate-pulse" />
      </div>
    )
  }
  if (recuperando) return <Login vistaInicial="nueva" />
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="revisar" element={<Revisar />} />
        <Route path="subir" element={<Subir />} />
        <Route path="nuevo" element={<Nuevo />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="movimientos" element={<Movimientos />} />
        <Route path="venta/:id" element={<Venta />} />
        <Route path="nuevo/venta" element={<Venta />} />
        <Route path="nuevo/gasto" element={<GastoManual />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="ajustes/reglas" element={<Reglas />} />
        <Route path="ajustes/categorias" element={<CategoriasGasto />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MesProvider>
        <HashRouter>
          <Rutas />
        </HashRouter>
      </MesProvider>
    </AuthProvider>
  )
}
