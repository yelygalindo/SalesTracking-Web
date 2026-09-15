import { authApi } from '@/features/auth/api/authApi'
import type { LoginCredentials } from '@/features/auth/types/authTypes'
import { AppError } from '@/lib/api/apiError'
import { tokenStore } from '@/lib/api/tokenStore'

export const authService = {
  async login(credentials: LoginCredentials) {
    if (!credentials.email.trim() || !credentials.password) throw new AppError('validation', 'Ingresa tu correo y contraseña.', 400)
    const response = await authApi.login(credentials)
    tokenStore.replace(authApi.asTokenSet(response))
    return response.user
  },
  async restore() {
    if (!tokenStore.get()) return null
    return authApi.me()
  },
  async logout() {
    const refreshToken = tokenStore.get()?.refreshToken
    try { if (refreshToken) await authApi.logout(refreshToken) } finally { tokenStore.clear() }
  },
  forgotPassword: authApi.forgotPassword,
  resetPassword: authApi.resetPassword,
}
