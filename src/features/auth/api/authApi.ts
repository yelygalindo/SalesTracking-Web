import type { MessageResponse } from '@/types/api'
import type { AccessSession, AuthUser, LoginCredentials } from '@/features/auth/types/authTypes'
import type { DeviceTypeDto, ForgotPasswordRequestDto, LoginRequestDto, LoginResponseDto, RefreshTokenResponseDto, ResetPasswordRequestDto } from './authDtos'
import { apiClient, publicApiClient } from '@/lib/api/apiClient'

export const authApi = {
  async login(credentials: LoginCredentials) {
    const body: LoginRequestDto = { email: credentials.email.trim(), password: credentials.password, deviceType: 'web' }
    return (await publicApiClient.post<LoginResponseDto>('/api/auth/login', body, { headers: { 'X-Refresh-Token-Transport': 'cookie' } })).data
  },
  async me() { return (await apiClient.get<AuthUser>('/api/auth/me')).data },
  async refresh() { return (await publicApiClient.post<RefreshTokenResponseDto>('/api/auth/refresh')).data },
  async logout() { return (await apiClient.post<MessageResponse>('/api/auth/logout')).data },
  async forgotPassword(email: string) { const body: ForgotPasswordRequestDto = { email: email.trim() }; return (await publicApiClient.post<MessageResponse>('/api/auth/forgot-password', body)).data },
  async resetPassword(body: ResetPasswordRequestDto) { return (await publicApiClient.post<MessageResponse>('/api/auth/reset-password', body)).data },
  async deviceTypes() { return (await publicApiClient.get<DeviceTypeDto[]>('/api/auth/device-types')).data },
  asAccessSession(response: AccessSession): AccessSession { return { accessToken: response.accessToken } },
}
