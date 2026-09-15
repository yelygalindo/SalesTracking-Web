import type { AuthUser, TokenSet } from '@/features/auth/types/authTypes'
export interface LoginRequestDto { email: string; password: string; deviceType: 'web' }
export interface LoginResponseDto extends TokenSet { user: AuthUser }
export interface RefreshTokenRequestDto { refreshToken: string }
export type RefreshTokenResponseDto = TokenSet
export interface LogoutRequestDto { refreshToken: string }
export interface ForgotPasswordRequestDto { email: string }
export interface ResetPasswordRequestDto { token: string; newPassword: string; confirmPassword: string }
export interface DeviceTypeDto { value: string; label: string }
