import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthCtx {
  session: Session | null
  cargando: boolean
  /** true cuando llegó desde el correo "recuperar contraseña". */
  recuperando: boolean
  terminarRecuperacion: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      // Limpia ?code=… de la URL después del intercambio.
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{ session, cargando, recuperando, terminarRecuperacion: () => setRecuperando(false) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}
