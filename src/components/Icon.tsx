// Íconos de línea copiados de render/*.html (viewBox 24, trazo 1.8–2).
import type { SVGProps } from 'react'

const PATHS = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  revisar: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  mas: <path d="M12 5v14M5 12h14" />,
  reportes: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  catalogo: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  volver: <path d="M15 6l-6 6 6 6" />,
  siguiente: <path d="M9 6l6 6-6 6" />,
  abajo: <path d="M6 9l6 6 6-6" />,
  subir: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: <path d="M5 12l5 5 9-10" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  lista: <path d="M4 6h16M4 12h16M4 18h10" />,
} as const

export type NombreIcono = keyof typeof PATHS

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: NombreIcono
  size?: number
}

export function Icon({ name, size = 22, strokeWidth = 1.8, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
