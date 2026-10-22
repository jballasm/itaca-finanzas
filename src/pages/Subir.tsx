import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { ErrorCartola } from '../import/bice'
import type { ResumenImportacion } from '../import/importar'
import { rangoFechas } from '../lib/format'

const NOMBRE_TIPO = { bice_cuenta: 'Cuenta corriente BICE', bice_tc: 'Tarjeta de crédito BICE' } as const

function Fila({ label, valor, tono = 'normal' }: { label: string; valor: number; tono?: 'normal' | 'suave' | 'oliva' | 'alerta' }) {
  const color = { normal: '', suave: 'text-tinta-2', oliva: 'text-oliva', alerta: 'text-alerta-texto' }[tono]
  return (
    <div className={`flex justify-between ${tono === 'suave' ? 'text-tinta-2' : ''}`}>
      <span>{label}</span>
      <span className={`cifra ${tono === 'suave' ? '' : 'font-medium'} ${color}`}>{valor}</span>
    </div>
  )
}

function Resumen({ r }: { r: ResumenImportacion }) {
  const aRevisar = r.porRevisar + r.sugeridosItaca
  return (
    <>
      <Card className="p-[18px] flex flex-col gap-3.5">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <Etiqueta>Listo</Etiqueta>
            <div className="font-medium">{NOMBRE_TIPO[r.tipo]}</div>
            {r.desde && r.hasta && <div className="text-[13px] text-tinta-2">{rangoFechas(r.desde, r.hasta)}</div>}
          </div>
          <div className="w-10 h-10 rounded-full bg-oliva-fondo text-oliva flex items-center justify-center">
            <Icon name="check" size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="h-px bg-linea" />
        <div className="flex flex-col gap-2.5 text-[15px]">
          <Fila label="Movimientos nuevos" valor={r.nuevas} />
          <Fila label="Ya estaban (duplicados)" valor={r.duplicadas} tono="suave" />
          <Fila label="Reconocidos: No es de Ítaca" valor={r.reconocidosNoItaca} />
          <Fila label="Sugeridos como Ítaca" valor={r.sugeridosItaca} tono="oliva" />
          <Fila label="Nuevos, por revisar" valor={r.porRevisar} tono="alerta" />
        </div>
      </Card>

      {aRevisar > 0 ? (
        <>
          <Link
            to="/revisar"
            className="h-[54px] rounded-xl bg-tinta text-papel text-[15px] font-medium tracking-[0.12em]
              flex items-center justify-center active:opacity-80"
          >
            REVISAR {aRevisar} {aRevisar === 1 ? 'MOVIMIENTO' : 'MOVIMIENTOS'}
          </Link>
          <div className="text-center text-[13px] text-tinta-2">
            {r.porRevisar} por revisar + {r.sugeridosItaca} {r.sugeridosItaca === 1 ? 'sugerencia' : 'sugerencias'} para confirmar
          </div>
        </>
      ) : (
        <div className="text-center text-[14px] text-tinta-2">
          {r.nuevas === 0 ? 'Esta cartola ya estaba cargada.' : 'Todo quedó clasificado. No hay nada por revisar.'}
        </div>
      )}
    </>
  )
}

export function Subir() {
  const input = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return
    setCargando(true)
    setError(null)
    setResumen(null)
    try {
      // SheetJS es pesado: se descarga solo al subir una cartola.
      const { importarCartola } = await import('../import/importar')
      setResumen(await importarCartola(archivo))
    } catch (err) {
      console.error(err)
      setError(err instanceof ErrorCartola ? err.message : 'No pudimos guardar los movimientos. Revisa tu conexión e intenta otra vez.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="Subir cartola" />

      <input
        ref={input}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={elegir}
      />
      <button
        type="button"
        disabled={cargando}
        onClick={() => input.current?.click()}
        className="border-[1.5px] border-dashed border-tierra rounded-2xl bg-tarjeta px-4 py-6
          flex flex-col items-center gap-2 text-tinta active:opacity-80 disabled:opacity-60"
      >
        <span className="text-tierra">
          <Icon name="subir" size={30} strokeWidth={1.6} />
        </span>
        <span className="text-[16px] font-medium">{cargando ? 'Leyendo cartola…' : resumen ? 'Subir otra cartola' : 'Elegir archivo Excel'}</span>
        <span className="text-[13px] text-tinta-2">Cartola BICE · cuenta corriente o tarjeta</span>
      </button>

      <div className="flex gap-2.5 items-start text-[13px] text-tinta-2 leading-[1.45]">
        <Icon name="candado" size={18} className="shrink-0 mt-px" />
        <div>El archivo se lee en tu celular y no se guarda. Solo quedan los movimientos.</div>
      </div>

      {error && (
        <Card className="p-[18px] border-terracota">
          <p role="alert" className="text-[15px] text-terracota">
            {error}
          </p>
        </Card>
      )}
      {resumen && <Resumen r={resumen} />}
    </Pantalla>
  )
}
