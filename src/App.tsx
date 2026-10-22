import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { Logo } from './components/ui'
import { Inicio } from './pages/Inicio'
import { Login } from './pages/Login'
import { Ajustes, Catalogo, Movimientos, Nuevo, Reportes, Revisar } from './pages/Secciones'
import { Subir } from './pages/Subir'

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
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </AuthProvider>
  )
}
