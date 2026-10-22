import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

// Solo la clave pública "anon" va en el frontend. La seguridad la da RLS.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'sin-clave', {
  // PKCE: los enlaces de correo vuelven con ?code=… y no chocan con el #/ del HashRouter.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})
