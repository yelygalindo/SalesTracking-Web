import { createContext } from 'react'
import type { AuthStatus, AuthUser, LoginCredentials } from '@/features/auth/types/authTypes'
export interface AuthContextValue {
  status: AuthStatus; user: AuthUser | null; sessionExpired: boolean
  login(credentials: LoginCredentials): Promise<void>; logout(): Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
