export interface Company { id: number; externalId: string; name: string }
export interface AuthUser {
  id: number; externalId: string; username: string; fullName: string; email: string
  company: Company; roles: string[]; permissions: string[]
}
export interface TokenSet { accessToken: string; refreshToken: string; expiresAtUtc: string }
export interface AuthSession extends TokenSet { user: AuthUser }
export interface LoginCredentials { email: string; password: string }
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous'
