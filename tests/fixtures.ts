// Cartolas BICE FALSAS que imitan el formato real. Nombres, RUT y comercios
// son inventados. Se generan en memoria; nunca se guardan archivos .xlsx.
import { utils, write } from 'xlsx'
import type { Filas } from '../src/import/bice'

// Igual que la cartola real: la columna A viene vacía y, después de los
// movimientos, hay un bloque "Saldos diarios" con fechas y montos.
const TITULAR = 'Persona Prueba Uno Rut 11.111.111-1 desde Banco BICE'
export const filasCuenta: Filas = (
  [
    ['Banco BICE'],
    ['Cartola de cuenta corriente'],
    ['Titular:', 'PERSONA DE PRUEBA'],
    ['Cuenta:', '00-00000-0'],
    [],
    ['Fecha', 'Categoría', 'Nº operación', 'Descripción', 'Monto'],
    ['2 mar 2026', 'Cargos', '100001', 'Cargo por compra en MERCERIA LA HEBRA LAS CONDES el 01/03/2026', '$8.170'],
    ['3 mar 2026', 'Abonos', '100002', 'Transferencia de Ana Pérez Soto Rut 11.111.111-1 desde Banco Estado', '$60.000'],
    ['5 mar 2026', 'Cargos', '100003', 'Transferencia a Correos Envíos SpA Rut 76.000.000-0 Cuenta 123456 Banco Chile', '$4.990'],
    ['10 mar 2026', 'Cargos', '100004', 'Cargo por compra en MERCADOPAGO*TIENDA DE HILOS SANTIAGO el 09/03/2026', '$24.300'],
    ['12 mar 2026', 'Cargos', '100005', 'Comisión mantención', '$3.500'],
    ['15 mar 2026', 'Cargos', '100006', 'Cargo por compra en SUPERMERCADO EJEMPLO VITACURA el 14/03/2026', '$45.210'],
    // Formatos reales observados:
    ['16 mar 2026', 'Cargos', '100007',
      `Transferencia de ${TITULAR} a Taller Uno Spa Rut 77.777.777-7 a Cuenta Vista de BICE, el 2026-03-16 a las 10:00:00.`, '$15.000'],
    ['17 mar 2026', 'Abonos', '100008',
      'Abono por transferencia de Clienta Inventada Dos Rut 22.222.222-2 desde B.Santander el 17/03/2026 a las 12:30', '$28.000'],
    ['18 mar 2026', 'Cargos', '100009',
      'Cargo por compra en LIBRERIA EJEMPLO el18/03/2026 a las 11:22:33 hrs., monto 5990.', '$5.990'],
    [],
    ['Saldos diarios'],
    ['Fecha', 'Saldo contable', 'Sobregiro usado'],
    ['2 mar 2026', '$100.000', '$0'],
    ['3 mar 2026', '$160.000', '$0'],
    [],
    ['© 2026 Banco BICE'],
    ['Información sujeta a verificación. Banco BICE.'],
  ] as Filas
).map((f) => [null, ...f])

export const filasTC: Filas = [
  ['Movimientos Nacionales de Tarjeta de Crédito'],
  ['Tarjeta terminada en 0000'],
  ['Fecha', 'Categoria', 'Detalle', 'Cuotas', 'Monto $'],
  ['01/04/2026', 'Cargos', 'PAYU *PACKAGING BONITO PROVIDENCIA', '1 de 1', 12990],
  ['03/04/2026', 'Cargos', 'MP *HERRAJES DEL SUR TASA INT. 0,00%', '2 de 3', 15000],
  ['10/04/2026', 'Abonos', 'PAGO TARJETA', '', -150000],
  ['15/04/2026', 'Cargos', 'FARMACIA EJEMPLO NUNOA', '1 de 1', 7480],
  ['', '', 'Total', '', 185470],
]

export function libroXlsx(filas: Filas, hoja = 'Hoja1'): ArrayBuffer {
  const wb = utils.book_new()
  utils.book_append_sheet(wb, utils.aoa_to_sheet(filas), hoja)
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
