import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { describe, expect, it } from 'vitest'
import { normalizeApi } from './apiError'

describe('normalizeApi', () => {
  it.each([
    [{ message: 'Credenciales inválidas.' }, 'Credenciales inválidas.', undefined],
    [{ error: 'Datos inválidos.', details: 'Revisa el correo.' }, 'Datos inválidos.', 'Revisa el correo.'],
  ])('normaliza contratos de error de la API', async (body, message, details) => {
    const client = axios.create(); new MockAdapter(client).onGet('/error').reply(400, body)
    const error = await client.get('/error').catch(reason => normalizeApi(reason))
    expect(error).toMatchObject({ code: 'validation', message, details })
  })
  it('reconoce la prueba gratuita vencida', async () => {
    const client = axios.create(); new MockAdapter(client).onPost('/login').reply(403, { code: 'trial_expired', message: 'Tu prueba gratuita terminó.' })
    const error = await client.post('/login').catch(reason => normalizeApi(reason))
    expect(error).toMatchObject({ code: 'trialExpired', status: 403, message: 'Tu prueba gratuita terminó.' })
  })
  it('normaliza errores de red', async () => {
    const client = axios.create(); new MockAdapter(client).onGet('/error').networkError()
    const error = await client.get('/error').catch(reason => normalizeApi(reason))
    expect(error).toMatchObject({ code: 'network', retryable: true })
  })
})
