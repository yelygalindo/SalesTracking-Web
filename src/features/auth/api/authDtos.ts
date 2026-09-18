import type { AccessSession, AuthUser } from '@/features/auth/types/authTypes'
export interface LoginRequestDto { email: string; password: string; deviceType: 'web' }
export interface LoginResponseDto extends AccessSession { user: AuthUser }
export type RefreshTokenResponseDto = AccessSession
export interface ForgotPasswordRequestDto { email: string }
export interface ResetPasswordRequestDto { token: string; newPassword: string; confirmPassword: string }
export interface DeviceTypeDto { value: string; label: string }
