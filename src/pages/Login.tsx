import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { BotonPrimario, Logo } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'
import { supabase, supabaseConfigurado } from '../lib/supabase'

type Vista = 'ingresar' | 'olvide' | 'nueva'

const inputCls =
  'h-[54px] w-full rounded-xl border border-linea bg-tarjeta px-4 text-[17px] text-tinta outline-none focus:border-tierra'

function Campo({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[12px] uppercase tracking-[0.18em] text-tinta-2">{label}</span>
      <input {...props} className={inputCls} />
    </label>
  )
}

function mensajeError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(msg)) return 'Falta confirmar el correo.'
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera un momento.'
  if (/password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  return 'Algo falló. Revisa tu conexión e intenta otra vez.'
}

export function Login({ vistaInicial = 'ingresar' }: { vistaInicial?: Vista }) {
  const { terminarRecuperacion } = useAuth()
  const [vista, setVista] = useState<Vista>(vistaInicial)
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setCargando(true)
    try {
      if (vista === 'ingresar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave })
        if (error) throw error
      } else if (vista === 'olvide') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + window.location.pathname,
        })
        if (error) throw error
        setAviso('Te enviamos un correo con un enlace para crear una nueva contraseña.')
      } else {
        const { error } = await supabase.auth.updateUser({ password: clave })
        if (error) throw error
        terminarRecuperacion()
      }
    } catch (err) {
      setError(mensajeError(err instanceof Error ? err.message : String(err)))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-dvh max-w-[480px] mx-auto px-8 pt-[100px] pb-10 flex flex-col">
      <div className="flex flex-col items-center text-center">
        <Logo className="w-[110px] h-[55px]" />
        <div className="font-serif text-[40px] font-medium tracking-[0.12em] leading-none mt-5">ÍTACA</div>
        <div className="text-[12px] tracking-[0.4em] text-tinta-2 mt-4">FINANZAS</div>
        <div className="w-10 h-px bg-tierra mt-5" />
        <div className="font-serif italic text-[22px] text-tinta-2 mt-5">
          {vista === 'nueva' ? 'Nueva contraseña' : 'Hola, Tere'}
        </div>
      </div>

      <form onSubmit={enviar} className="mt-16 flex flex-col gap-4">
        {!supabaseConfigurado && (
          <p className="text-[13px] text-terracota">Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).</p>
        )}
        {vista !== 'nueva' && (
          <Campo
            label="Correo"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        {vista !== 'olvide' && (
          <Campo
            label={vista === 'nueva' ? 'Nueva contraseña' : 'Contraseña'}
            type="password"
            autoComplete={vista === 'nueva' ? 'new-password' : 'current-password'}
            minLength={vista === 'nueva' ? 6 : undefined}
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        )}

        {error && (
          <p role="alert" className="text-[14px] text-terracota">
            {error}
          </p>
        )}
        {aviso && <p className="text-[14px] text-oliva">{aviso}</p>}

        <BotonPrimario type="submit" cargando={cargando} className="mt-2 tracking-[0.2em]">
          {vista === 'ingresar' ? 'Ingresar' : vista === 'olvide' ? 'Enviar enlace' : 'Guardar contraseña'}
        </BotonPrimario>

        {vista !== 'nueva' && (
          <button
            type="button"
            onClick={() => {
              setVista(vista === 'ingresar' ? 'olvide' : 'ingresar')
              setError(null)
              setAviso(null)
            }}
            className="self-center min-h-11 text-[15px] text-tierra underline underline-offset-4"
          >
            {vista === 'ingresar' ? '¿Olvidaste tu contraseña?' : 'Volver a ingresar'}
          </button>
        )}
      </form>

      <div className="mt-auto pt-12 text-center text-[12px] tracking-[0.3em] text-tinta-2">JOYAS CON HISTORIA</div>
    </div>
  )
}
