import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

const LOGO = `${import.meta.env.BASE_URL}logo.png`

export function Logo({ className = '' }: { className?: string }) {
  return <img src={LOGO} alt="" className={`logo-img ${className}`} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-tarjeta border border-linea rounded-2xl ${className}`}>{children}</div>
}

export function Etiqueta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`etiqueta ${className}`}>{children}</div>
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & { cargando?: boolean }

/** Botón primario del render: tinta, 54px, mayúsculas espaciadas. */
export function BotonPrimario({ children, cargando, disabled, className = '', ...rest }: BotonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || cargando}
      className={`h-[54px] w-full rounded-xl bg-tinta text-papel text-[15px] font-medium uppercase tracking-[0.12em]
        flex items-center justify-center transition-opacity disabled:opacity-50 active:opacity-80 ${className}`}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  )
}

/** Encabezado de pantalla: volver + título serif. */
export function Encabezado({ titulo, volver = true, accion }: { titulo: string; volver?: boolean; accion?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-2">
      {volver && (
        <button
          type="button"
          aria-label="Volver"
          onClick={() => navigate(-1)}
          className="w-11 h-11 -ml-3 flex items-center justify-center text-tinta"
        >
          <Icon name="volver" strokeWidth={2} />
        </button>
      )}
      <h1 className="font-serif text-[30px] font-semibold leading-tight flex-1">{titulo}</h1>
      {accion}
    </div>
  )
}

/** Contenido de cada pantalla con el padding del render (28/20). */
export function Pantalla({ children }: { children: ReactNode }) {
  return <div className="px-5 pt-7 pb-6 flex flex-col gap-4">{children}</div>
}

export function Proximamente({ texto }: { texto: string }) {
  return (
    <Card className="p-5 flex flex-col gap-2">
      <Etiqueta>Próximamente</Etiqueta>
      <p className="text-[15px] text-tinta-2 leading-relaxed">{texto}</p>
    </Card>
  )
}
