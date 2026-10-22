// "Estado de cuenta" BICE FALSO en PDF, con la misma disposición que el real
// (posiciones x/y, varios estados mensuales, resumen al pie). Datos inventados.
import { PDFDocument, StandardFonts } from 'pdf-lib'

type Fila =
  | { nro: number; of: number; cargo?: string; abono?: string; desc: string[]; dm: string; saldo?: string }

interface EstadoFalso {
  emision: string // dd/mm/aaaa
  paginas: Fila[][]
  resumen: [string, string, string, string, string] // saldo inicial, giro cajero, otros cargos, depósitos, saldo final
}

const X = { nro: 61, of: 75, cargoFin: 141, abono: 163, desc: 201, fecha: 485, saldo: 536 }

export async function pdfEstadoFalso(estados: EstadoFalso[]): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const t = (page: ReturnType<typeof pdf.addPage>, s: string, x: number, y: number) => page.drawText(s, { x, y, size: 7, font })

  for (const e of estados) {
    e.paginas.forEach((filas, i) => {
      const page = pdf.addPage([612, 792])
      t(page, 'ESTADO DE CUENTA', 438, 736)
      t(page, 'CUENTA', 486, 720)
      t(page, 'VISTA', 536, 720)
      t(page, `Fecha: ${e.emision}`, 441, 690)
      t(page, 'NOMBRE PERSONA INVENTADA', 42, 671)
      t(page, 'MOVIMIENTOS', 42, 608)
      t(page, 'DE SU CUENTA', 128, 608)
      t(page, 'Nro', 50, 595)
      t(page, 'Of', 74, 595)
      t(page, 'Giros', 114, 595)
      t(page, 'Depósitos Descripción de la Transacción', 148, 595)
      t(page, 'Fecha', 484, 595)
      t(page, 'Saldo', 543, 595)
      t(page, 'Doc', 50, 586)
      t(page, 'D/M', 489, 586)
      t(page, 'Diario', 538, 586)

      let y = 574
      for (const f of filas) {
        t(page, String(f.nro), f.nro >= 10 ? 56 : X.nro, y)
        t(page, String(f.of), X.of, y)
        if (f.cargo) t(page, f.cargo, X.cargoFin - font.widthOfTextAtSize(f.cargo, 7), y)
        // En el real el abono viene pegado a la primera palabra: "230.000 Abono".
        const [primera, ...resto] = f.desc
        if (f.abono) t(page, `${f.abono} ${primera}`, X.abono, y)
        else if (primera) t(page, primera, X.desc, y)
        t(page, f.dm, X.fecha, y)
        if (f.saldo) t(page, f.saldo, X.saldo, y)
        y -= 12
        for (const linea of resto) {
          if (linea) t(page, linea, X.desc, y)
          y -= 12
        }
      }

      t(page, 'RESUMEN', 42, 78)
      t(page, 'ESTADO ACTUAL', 100, 78)
      t(page, 'Saldo Inicial', 98, 68)
      t(page, 'Giro Cajero Aut.', 193, 68)
      t(page, 'Otros', 314, 68)
      t(page, 'Cargos', 336, 68)
      t(page, 'Depositos/Abonos', 406, 68)
      t(page, 'Saldo', 530, 68)
      t(page, 'Final', 552, 68)
      const ultima = i === e.paginas.length - 1
      const valores = ultima ? e.resumen : (['0', '0', '0', '0', '0'] as const)
      ;[139, 245, 352, 458, 565].forEach((x, k) => t(page, valores[k], x, 59))
    })
  }
  const bytes = await pdf.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const TITULAR = 'Transferencia de Persona Inventada Rut 11.111.111-1'

/** Dos estados: el de enero trae movimientos de diciembre; uno parte la descripción entre páginas. */
export const estadosFalsos: EstadoFalso[] = [
  {
    emision: '05/01/2026',
    paginas: [
      [
        { nro: 1, of: 15, cargo: '5.000', desc: ['Cargo por Compra en MERCERIA LA HEBRA El 30/12/2025 a', 'las 10:00:00., Monto 5.000'], dm: '30/12' },
        { nro: 2, of: 7, abono: '230.000', desc: ['Abono por Instrucci¢n Automatica'], dm: '02/01' },
        { nro: 3, of: 1, cargo: '45.000', dm: '02/01', saldo: '1.180.000', desc: [
          TITULAR,
          'desde Banco BICE a Taller Uno Spa Rut 77.777.777-7',
          'a Cuenta Vista de BICE, el 2026-01-02 a las 10:00',
        ] },
        // Esta descripción sigue en la página siguiente.
        { nro: 4, of: 1, abono: '28.000', dm: '03/01', desc: ['Transferencia de Clienta Inventada Dos Rut 22.222.222-2'] },
      ],
      [], // solo trae la continuación de la fila 4 (ver pdfFalsoCompleto)
    ],
    resumen: ['1.000.000', '0', '50.000', '258.000', '1.208.000'],
  },
  {
    emision: '04/02/2026',
    paginas: [
      [
        { nro: 1, of: 15, cargo: '12.990', desc: ['Cargo por Compra en STARKEN 123 El 10/01/2026 a las', '12:00:00., Monto 12.990'], dm: '12/01' },
        { nro: 2, of: 15, cargo: '20.000', desc: ['Cargo por Giro en CAJERO CENTRO 001 El 15/01/2026 a', 'las 09:00:00., Monto 20.000'], dm: '15/01' },
        { nro: 3, of: 7, abono: '60.000', desc: ['Abono por transferencia de Clienta Tres Rut', '33.333.333-3 desde B.Chile el 20/01/2026 a las 12:19'], dm: '20/01', saldo: '1.235.010' },
      ],
    ],
    resumen: ['1.208.000', '20.000', '12.990', '60.000', '1.235.010'],
  },
]

export const CONTINUACION = 'desde Banco Estado a Persona Inventada Rut 11.111.111-1 a Cuenta Vista de BICE'

/** El PDF falso, con la continuación de la fila 4 al inicio de la página 2. */
export async function pdfFalsoCompleto(estados = estadosFalsos): Promise<ArrayBuffer> {
  const doc = await PDFDocument.load(await pdfEstadoFalso(estados))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.getPage(1).drawText(CONTINUACION, { x: X.desc, y: 574, size: 7, font })
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
