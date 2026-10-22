import { describe, expect, it } from 'vitest'
import { normalizarClave } from '../src/import/normalizar'
import { extraerClave } from '../src/import/claves'

describe('normalizarClave', () => {
  it('pasa a mayúsculas, quita tildes y colapsa espacios', () => {
    expect(normalizarClave('  Mercería   Ñandú ')).toBe('MERCERIA NANDU')
  })

  it('quita prefijos de pasarela', () => {
    expect(normalizarClave('MERCADOPAGO*TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('MERPAGO*TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('MP *TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('PAYU *TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('PAYSCAN TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('*TIENDA DE HILOS')).toBe('TIENDA DE HILOS')
  })

  it('no confunde "MP" dentro de una palabra', () => {
    expect(normalizarClave('MPLUS ESTUDIO')).toBe('MPLUS ESTUDIO')
  })

  it('quita comunas y ciudades al final', () => {
    expect(normalizarClave('TIENDA DE HILOS LAS CONDES')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('TIENDA DE HILOS SANTIAGO CENTRO')).toBe('TIENDA DE HILOS')
    expect(normalizarClave('FARMACIA EJEMPLO ÑUÑOA')).toBe('FARMACIA EJEMPLO')
    expect(normalizarClave('Tienda de Hilos Vitacura')).toBe('TIENDA DE HILOS')
  })

  it('no deja la clave vacía si solo había una comuna', () => {
    expect(normalizarClave('SANTIAGO')).toBe('SANTIAGO')
  })

  it('quita texto de tasa de interés', () => {
    expect(normalizarClave('HERRAJES DEL SUR TASA INT. 0,00%')).toBe('HERRAJES DEL SUR')
    expect(normalizarClave('HERRAJES DEL SUR TASA INT 1,5 %')).toBe('HERRAJES DEL SUR')
  })

  it('quita RUT y códigos numéricos largos', () => {
    expect(normalizarClave('ANA PEREZ 11.111.111-1')).toBe('ANA PEREZ')
    expect(normalizarClave('TIENDA 004512 HILOS')).toBe('TIENDA HILOS')
  })

  it('variantes del mismo comercio dan la misma clave', () => {
    const variantes = [
      'MERCADOPAGO*TIENDA DE HILOS SANTIAGO',
      'MP *Tienda de Hilos',
      'tienda de hilos  providencia',
    ]
    expect(new Set(variantes.map(normalizarClave)).size).toBe(1)
  })
})

describe('extraerClave', () => {
  it('compra: toma el comercio sin la fecha', () => {
    expect(extraerClave('Cargo por compra en MERCERIA LA HEBRA LAS CONDES el 01/03/2026')).toEqual({
      clave: 'MERCERIA LA HEBRA',
      tipo: 'compra',
    })
  })

  it('transferencia recibida: remitente sin RUT ni banco', () => {
    expect(extraerClave('Transferencia de Ana Pérez Soto Rut 11.111.111-1 desde Banco Estado')).toEqual({
      clave: 'ANA PEREZ SOTO',
      tipo: 'transferencia_recibida',
    })
  })

  it('transferencia recibida sin RUT', () => {
    expect(extraerClave('Transferencia de Ana Pérez Soto desde Banco Estado').clave).toBe('ANA PEREZ SOTO')
  })

  it('transferencia enviada: destinatario sin RUT ni cuenta', () => {
    expect(
      extraerClave('Transferencia a Correos Envíos SpA Rut 76.000.000-0 Cuenta 123456 Banco Chile'),
    ).toEqual({ clave: 'CORREOS ENVIOS SPA', tipo: 'transferencia_enviada' })
  })

  describe('formato real "Transferencia de A … desde Banco X a B …"', () => {
    const desc =
      'Transferencia de Persona Prueba Uno Rut 11 .111.111-1 desde Banco BICE a Taller Uno Spa Rut 77.777.777-7 a Cuenta Vista de BICE, el 2026-03-16 a las 10:00:00.'
    it('cargo → la clave es el destinatario', () => {
      expect(extraerClave(desc, 'gasto')).toEqual({ clave: 'TALLER UNO SPA', tipo: 'transferencia_enviada' })
    })
    it('abono → la clave es el remitente', () => {
      expect(extraerClave(desc, 'ingreso')).toEqual({ clave: 'PERSONA PRUEBA UNO', tipo: 'transferencia_recibida' })
    })
    it('funciona aunque falte la palabra Rut', () => {
      const sinRut = 'Transferencia de Clienta Tres 33.333.333-3 desde Banco BICE a Persona Prueba Uno Rut 11.111.111-1 a Cuenta Corriente de BICE, el 2026-03-20 a las 09:00:00.'
      expect(extraerClave(sinRut, 'ingreso').clave).toBe('CLIENTA TRES')
    })
  })

  it('abono por transferencia de otro banco', () => {
    expect(
      extraerClave('Abono por transferencia de Clienta Inventada Dos Rut 22.222.222-2 desde B.Santander el 17/03/2026 a las 12:30', 'ingreso'),
    ).toEqual({ clave: 'CLIENTA INVENTADA DOS', tipo: 'transferencia_recibida' })
  })

  it('compra con "el" pegado a la fecha', () => {
    expect(extraerClave('Cargo por compra en LIBRERIA EJEMPLO el18/03/2026 a las 11:22:33 hrs., monto 5990.').clave).toBe(
      'LIBRERIA EJEMPLO',
    )
  })

  it('compra por pasarela con código pegado', () => {
    expect(extraerClave('Cargo por compra en MERPAGO*7TIENDA el 12/02/2026 a las 10:00:00 hrs., monto 9990.').clave).toBe('7TIENDA')
  })

  it('otra descripción: se normaliza completa', () => {
    expect(extraerClave('Comisión mantención')).toEqual({ clave: 'COMISION MANTENCION', tipo: 'otro' })
  })

  it('nunca deja un RUT en la clave', () => {
    const { clave } = extraerClave('Transferencia de JUAN TEST 12345678-K desde Banco X')
    expect(clave).not.toMatch(/\d/)
  })
})
