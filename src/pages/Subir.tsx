import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { BotonPrimario, Card, Encabezado, Etiqueta, Pantalla } from '../components/ui'
import { ErrorCartola } from '../import/bice'
import type { CartolaLeida, ResumenImportacion } from '../import/importar'
import { rangoFechas } from '../lib/format'

const NOMBRE_TIPO = { bice_cuenta: 'Cuenta BICE', bice_tc: 'Tarjeta de crédito BICE' } as const
/** Archivos que cubren más que esto preguntan desde qué fecha importar. */
const DIAS_SIN_PREGUNTAR = 45

const nombreCartola = (tipo: keyof typeof NOMBRE_TIPO, formato: 'excel' | 'pdf') =>
  `${NOMBRE_TIPO[tipo]}${formato === 'pdf' ? ' · PDF' : ''}`

function dias(desde: string | null, hasta: string | null) {
  if (!desde || !hasta) return 0
  return (Date.parse(hasta) - Date.parse(desde)) / 86400000
}

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
            <div className="font-medium">{nombreCartola(r.tipo, r.formato)}</div>
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
          {r.nuevas === 0 ? 'Estos movimientos ya estaban cargados.' : 'Todo quedó clasificado. No hay nada por revisar.'}
        </div>
      )}
    </>
  )
}

/** Paso intermedio para archivos largos (p. ej. el estado de cuenta anual en PDF). */
function ElegirDesde({
  cartola,
  onImportar,
  onCancelar,
}: {
  cartola: CartolaLeida
  onImportar: (desde: string | null) => void
  onCancelar: () => void
}) {
  const [desde, setDesde] = useState(cartola.desde ?? '')
  const incluidos = cartola.movimientos.filter((m) => !desde || m.fecha >= desde)
  const fechas = incluidos.map((m) => m.fecha).sort()
  const n = incluidos.length

  return (
    <>
      <Card className="p-[18px] flex flex-col gap-3">
        <Etiqueta>Archivo leído</Etiqueta>
        <div className="font-medium">{nombreCartola(cartola.tipo, cartola.formato)}</div>
        <div className="text-[13px] text-tinta-2">
          {cartola.desde && cartola.hasta && rangoFechas(cartola.desde, cartola.hasta)} · {cartola.movimientos.length} movimientos
        </div>
        <div className="h-px bg-linea" />
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px]">¿Desde qué fecha quieres importar?</span>
          <input
            type="date"
            value={desde}
            min={cartola.desde ?? undefined}
            max={cartola.hasta ?? undefined}
            onChange={(e) => setDesde(e.target.value)}
            className="h-12 rounded-xl border border-linea bg-papel px-3 text-[16px] text-tinta"
          />
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDesde(cartola.desde ?? '')}
            className="h-9 px-3 rounded-full border border-linea text-[13px]"
          >
            Todo el archivo
          </button>
        </div>
        <p className="text-[13px] text-tinta-2">
          {n === 0
            ? 'No hay movimientos desde esa fecha.'
            : `Se importarán ${n} ${n === 1 ? 'movimiento' : 'movimientos'} (${rangoFechas(fechas[0], fechas[fechas.length - 1])}).`}
        </p>
      </Card>
      <BotonPrimario type="button" disabled={n === 0} onClick={() => onImportar(desde || null)}>
        Importar {n} {n === 1 ? 'movimiento' : 'movimientos'}
      </BotonPrimario>
      <button type="button" onClick={onCancelar} className="min-h-11 text-[14px] text-tinta-2 underline underline-offset-4">
        Elegir otro archivo
      </button>
    </>
  )
}

type Fase =
  | { paso: 'elegir' }
  | { paso: 'leyendo' }
  | { paso: 'desde'; cartola: CartolaLeida }
  | { paso: 'guardando' }
  | { paso: 'listo'; resumen: ResumenImportacion }

export function Subir() {
  const input = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>({ paso: 'elegir' })
  const [error, setError] = useState<string | null>(null)

  function fallo(err: unknown) {
    console.error(err)
    setError(err instanceof ErrorCartola ? err.message : 'No pudimos leer o guardar la cartola. Revisa tu conexión e intenta otra vez.')
    setFase({ paso: 'elegir' })
  }

  async function guardar(cartola: CartolaLeida, desde: string | null) {
    setFase({ paso: 'guardando' })
    try {
      const { importarCartola, filtrarDesde } = await import('../import/importar')
      setFase({ paso: 'listo', resumen: await importarCartola(filtrarDesde(cartola, desde)) })
    } catch (err) {
      fallo(err)
    }
  }

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!archivo) return
    setError(null)
    setFase({ paso: 'leyendo' })
    try {
      // SheetJS y pdf.js son pesados: se descargan solo al subir una cartola.
      const { leerCartola } = await import('../import/importar')
      const cartola = await leerCartola(archivo)
      if (dias(cartola.desde, cartola.hasta) > DIAS_SIN_PREGUNTAR) setFase({ paso: 'desde', cartola })
      else await guardar(cartola, null)
    } catch (err) {
      fallo(err)
    }
  }

  const ocupado = fase.paso === 'leyendo' || fase.paso === 'guardando'

  return (
    <Pantalla>
      <Encabezado titulo="Subir cartola" />

      <input
        ref={input}
        type="file"
        accept=".xlsx,.xls,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={elegir}
      />
      {fase.paso !== 'desde' && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => input.current?.click()}
          className="border-[1.5px] border-dashed border-tierra rounded-2xl bg-tarjeta px-4 py-6
            flex flex-col items-center gap-2 text-tinta active:opacity-80 disabled:opacity-60"
        >
          <span className="text-tierra">
            <Icon name="subir" size={30} strokeWidth={1.6} />
          </span>
          <span className="text-[16px] font-medium">
            {fase.paso === 'leyendo'
              ? 'Leyendo cartola…'
              : fase.paso === 'guardando'
                ? 'Guardando movimientos…'
                : fase.paso === 'listo'
                  ? 'Subir otra cartola'
                  : 'Elegir archivo Excel o PDF'}
          </span>
          <span className="text-[13px] text-tinta-2">Cartola BICE en Excel · Estado de cuenta en PDF</span>
        </button>
      )}

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
      {fase.paso === 'desde' && (
        <ElegirDesde cartola={fase.cartola} onImportar={(d) => guardar(fase.cartola, d)} onCancelar={() => setFase({ paso: 'elegir' })} />
      )}
      {fase.paso === 'listo' && <Resumen r={fase.resumen} />}
    </Pantalla>
  )
}
