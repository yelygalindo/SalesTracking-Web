import type { TokenSet } from '@/features/auth/types/authTypes'
import { browserSessionStorage, type StoragePort } from '@/lib/storage/sessionStorage'
const key = 'urbantrack.auth.tokens'

export class TokenStore {
  constructor(private storage: StoragePort = browserSessionStorage()) {}
  get(): TokenSet | null {
    const raw = this.storage.getItem(key); if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<TokenSet>
      if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAtUtc) throw new Error()
      return parsed as TokenSet
    } catch { this.clear(); return null }
  }
  replace(tokens: TokenSet) { this.storage.setItem(key, JSON.stringify(tokens)) }
  clear() { this.storage.removeItem(key) }
}
export const tokenStore = new TokenStore()
