export interface Company { id: number; externalId: string; name: string }
export interface AuthUser {
  id: number; externalId: string; username: string; fullName: string; email: string
  company: Company; roles: string[]; permissions: string[]
}
export interface AccessSession { accessToken: string }
export interface AuthSession extends AccessSession { user: AuthUser }
export interface LoginCredentials { email: string; password: string }
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous'
