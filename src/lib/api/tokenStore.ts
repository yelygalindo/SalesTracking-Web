import type { AccessSession } from '@/features/auth/types/authTypes'
import type { StoragePort } from '@/lib/storage/sessionStorage'
const key = 'urbantrack.auth.tokens'

// Elimina sesiones heredadas que podían contener el refresh token antes de
// migrar el flujo web a cookie HttpOnly. La sesión actual vive sólo en memoria.
try {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(key)
} catch {
  // Algunos navegadores pueden bloquear el storage; no afecta la sesión en memoria.
}

function memoryStorage(): StoragePort {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue },
    removeItem: () => { value = null },
  }
}

export class TokenStore {
  constructor(private storage: StoragePort = memoryStorage()) {}
  get(): AccessSession | null {
    const raw = this.storage.getItem(key); if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<AccessSession>
      if (!parsed.accessToken) throw new Error()
      return { accessToken: parsed.accessToken }
    } catch { this.clear(); return null }
  }
  replace(tokens: AccessSession) { this.storage.setItem(key, JSON.stringify(tokens)) }
  clear() { this.storage.removeItem(key) }
}
export const tokenStore = new TokenStore()
