import { describe, expect, it } from 'vitest'
import { TokenStore } from './tokenStore'
import type { StoragePort } from '@/lib/storage/sessionStorage'

class MemoryStorage implements StoragePort {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('TokenStore', () => {
  it('sustituye access y refresh token en una única escritura', () => {
    const storage = new MemoryStorage(); const store = new TokenStore(storage)
    store.replace({ accessToken: 'old-a' })
    store.replace({ accessToken: 'new-a' })
    expect(store.get()).toEqual({ accessToken: 'new-a' })
    expect(storage.values.size).toBe(1)
  })
  it('descarta almacenamiento corrupto', () => {
    const storage = new MemoryStorage(); storage.setItem('urbantrack.auth.tokens', '{bad')
    expect(new TokenStore(storage).get()).toBeNull(); expect(storage.values.size).toBe(0)
  })
})
