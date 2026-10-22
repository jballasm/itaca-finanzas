// Hoja inferior (bottom sheet) para editar sin salir de la pantalla.
import { useEffect, type ReactNode } from 'react'

export function Hoja({ titulo, abierta, onCerrar, children }: { titulo: string; abierta: boolean; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierta, onCerrar])

  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div
        className="relative w-full max-w-[480px] max-h-[90dvh] overflow-y-auto bg-papel rounded-t-[20px] border-t border-linea
          px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] flex flex-col gap-4"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-linea" aria-hidden="true" />
        <h2 className="font-serif text-[26px] font-semibold leading-tight">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

export const inputHoja =
  'h-12 w-full rounded-xl border border-linea bg-tarjeta px-4 text-[16px] text-tinta outline-none focus:border-tierra'

export function CampoHoja({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="etiqueta">{label}</span>
      {children}
    </label>
  )
}
