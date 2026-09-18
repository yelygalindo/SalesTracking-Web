import MockAdapter from 'axios-mock-adapter'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiClient, publicApiClient } from '@/lib/api/apiClient'
import { tokenStore } from '@/lib/api/tokenStore'
import { authService } from './authService'

const user = { id: 1, externalId: 'user-1', username: 'ana', fullName: 'Ana Pérez', email: 'ana@example.com', company: { id: 2, externalId: 'company-2', name: 'UrbanTrack' }, roles: ['manager'], permissions: ['dashboard.read'] }
describe('authService', () => {
  const publicMock = new MockAdapter(publicApiClient); const apiMock = new MockAdapter(apiClient)
  beforeEach(() => { publicMock.reset(); apiMock.reset(); tokenStore.clear() })
  it('inicia sesión con el contrato exacto y guarda tokens', async () => {
    publicMock.onPost('/api/auth/login').reply(200, { user, accessToken: 'a' })
    await expect(authService.login({ email: ' ana@example.com ', password: 'secret123' })).resolves.toEqual(user)
    expect(JSON.parse(publicMock.history.post[0].data)).toEqual({ email: 'ana@example.com', password: 'secret123', deviceType: 'web' })
    expect(publicMock.history.post[0].headers?.['X-Refresh-Token-Transport']).toBe('cookie')
    expect(tokenStore.get()).toEqual({ accessToken: 'a' })
  })
  it('propaga credenciales incorrectas sin almacenar tokens', async () => {
    publicMock.onPost('/api/auth/login').reply(401, { message: 'Credenciales inválidas.' })
    await expect(authService.login({ email: 'bad@example.com', password: 'wrong' })).rejects.toMatchObject({ code: 'unauthorized', message: 'Credenciales inválidas.' })
    expect(tokenStore.get()).toBeNull()
  })
  it('restaura la sesión desde la cookie HttpOnly sin enviar body', async () => {
    publicMock.onPost('/api/auth/refresh').reply(200, { accessToken: 'renewed' })
    apiMock.onGet('/api/auth/me').reply(200, user)
    await expect(authService.restore()).resolves.toEqual(user)
    expect(publicMock.history.post[0].data).toBeUndefined()
    expect(tokenStore.get()).toEqual({ accessToken: 'renewed' })
  })
  it('hace logout remoto y limpia localmente incluso si la API falla', async () => {
    tokenStore.replace({ accessToken: 'a' }); apiMock.onPost('/api/auth/logout').networkError()
    await expect(authService.logout()).rejects.toBeDefined()
    expect(apiMock.history.post[0].data).toBeUndefined(); expect(tokenStore.get()).toBeNull()
  })
})
