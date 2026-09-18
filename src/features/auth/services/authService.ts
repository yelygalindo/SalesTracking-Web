import { authApi } from '@/features/auth/api/authApi'
import type { LoginCredentials } from '@/features/auth/types/authTypes'
import { AppError } from '@/lib/api/apiError'
import { tokenStore } from '@/lib/api/tokenStore'

export const authService = {
  async login(credentials: LoginCredentials) {
    if (!credentials.email.trim() || !credentials.password) throw new AppError('validation', 'Ingresa tu correo y contraseña.', 400)
    const response = await authApi.login(credentials)
    tokenStore.replace(authApi.asAccessSession(response))
    return response.user
  },
  async restore() {
    if (!tokenStore.get()) {
      try {
        tokenStore.replace(await authApi.refresh())
      } catch (error) {
        if (error instanceof AppError && error.code === 'unauthorized') return null
        throw error
      }
    }
    return authApi.me()
  },
  async logout() {
    try { if (tokenStore.get()) await authApi.logout() } finally { tokenStore.clear() }
  },
  forgotPassword: authApi.forgotPassword,
  resetPassword: authApi.resetPassword,
}
