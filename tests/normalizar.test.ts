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

  it('otra descripción: se normaliza completa', () => {
    expect(extraerClave('Comisión mantención')).toEqual({ clave: 'COMISION MANTENCION', tipo: 'otro' })
  })

  it('nunca deja un RUT en la clave', () => {
    const { clave } = extraerClave('Transferencia de JUAN TEST 12345678-K desde Banco X')
    expect(clave).not.toMatch(/\d/)
  })
})
