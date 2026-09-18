import MockAdapter from 'axios-mock-adapter'
import { describe, expect, it, vi } from 'vitest'
import { createApiClients } from './apiClient'
import { TokenStore } from './tokenStore'
import type { StoragePort } from '@/lib/storage/sessionStorage'

class MemoryStorage implements StoragePort { value: string | null = null; getItem() { return this.value }; setItem(_key: string, value: string) { this.value = value }; removeItem() { this.value = null } }

describe('auth interceptor', () => {
  it('comparte un refresh concurrente y reintenta cada solicitud una vez', async () => {
    const store = new TokenStore(new MemoryStorage()); store.replace({ accessToken: 'expired' })
    const onFailure = vi.fn(); const { apiClient, publicClient } = createApiClients(store, onFailure)
    const apiMock = new MockAdapter(apiClient); const publicMock = new MockAdapter(publicClient); let refreshCalls = 0
    publicMock.onPost('/api/auth/refresh').reply(async () => { refreshCalls += 1; await new Promise(resolve => setTimeout(resolve, 10)); return [200, { accessToken: 'new-a' }] })
    apiMock.onGet(/\/resource/).reply(config => config.headers?.Authorization === 'Bearer new-a' ? [200, { ok: true }] : [401])
    const results = await Promise.all([apiClient.get('/resource/1'), apiClient.get('/resource/2')])
    expect(results.map(result => result.data.ok)).toEqual([true, true]); expect(refreshCalls).toBe(1); expect(store.get()?.accessToken).toBe('new-a'); expect(onFailure).not.toHaveBeenCalled()
  })
  it('limpia la sesión si el refresh falla y no entra en bucle', async () => {
    const store = new TokenStore(new MemoryStorage()); store.replace({ accessToken: 'expired' })
    const onFailure = vi.fn(); const { apiClient, publicClient } = createApiClients(store, onFailure)
    const apiMock = new MockAdapter(apiClient); const publicMock = new MockAdapter(publicClient)
    apiMock.onGet('/protected').reply(401); publicMock.onPost('/api/auth/refresh').reply(401, { message: 'Refresh token inválido o expirado.' })
    await expect(apiClient.get('/protected')).rejects.toMatchObject({ code: 'unauthorized' })
    expect(publicMock.history.post).toHaveLength(1); expect(apiMock.history.get).toHaveLength(1); expect(store.get()).toBeNull(); expect(onFailure).toHaveBeenCalledOnce()
  })
  it('normaliza un 403 sin renovar ni cerrar la sesión', async () => {
    const store = new TokenStore(new MemoryStorage()); store.replace({ accessToken: 'valid' })
    const onFailure = vi.fn(); const { apiClient, publicClient } = createApiClients(store, onFailure)
    const apiMock = new MockAdapter(apiClient); const publicMock = new MockAdapter(publicClient)
    apiMock.onGet('/forbidden').reply(403, { message: 'No tienes permiso.' })
    await expect(apiClient.get('/forbidden')).rejects.toMatchObject({ code: 'forbidden', status: 403 })
    expect(publicMock.history.post).toHaveLength(0); expect(store.get()?.accessToken).toBe('valid'); expect(onFailure).not.toHaveBeenCalled()
  })
})
