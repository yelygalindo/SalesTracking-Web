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
  it('normaliza errores de red', async () => {
    const client = axios.create(); new MockAdapter(client).onGet('/error').networkError()
    const error = await client.get('/error').catch(reason => normalizeApi(reason))
    expect(error).toMatchObject({ code: 'network', retryable: true })
  })
})
