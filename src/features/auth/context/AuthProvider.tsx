import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/authService'
import { AuthContext } from '@/features/auth/context/authContext'
import type { AuthStatus, AuthUser, LoginCredentials } from '@/features/auth/types/authTypes'
import { setAuthFailureHandler } from '@/lib/api/apiClient'
import { tokenStore } from '@/lib/api/tokenStore'
import { AppError } from '@/lib/api/apiError'
import { companyApi } from '@/features/admin/api/companyApi'
import { setCompanyTimeZone } from '@/lib/i18n/dateTime'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient(); const [status, setStatus] = useState<AuthStatus>('initializing'); const [user, setUser] = useState<AuthUser | null>(null); const [sessionExpired, setSessionExpired] = useState(false)
  const becomeAnonymous = useCallback((expired = false) => { tokenStore.clear(); queryClient.clear(); setCompanyTimeZone(null); setUser(null); setSessionExpired(expired); setStatus('anonymous') }, [queryClient])
  useEffect(() => { setAuthFailureHandler(() => becomeAnonymous(true)); return () => setAuthFailureHandler(() => undefined) }, [becomeAnonymous])
  useEffect(() => { let active = true; authService.restore().then(async restored => { if (!active) return; if (restored) { const zone = await companyApi.timeZone().catch(() => null); if (!active) return; setCompanyTimeZone(zone?.timeZoneId); } setUser(restored); setStatus(restored ? 'authenticated' : 'anonymous') }).catch(reason => { if (active) becomeAnonymous(reason instanceof AppError && reason.code === 'unauthorized') }); return () => { active = false } }, [becomeAnonymous])
  const login = useCallback(async (credentials: LoginCredentials) => { const current = await authService.login(credentials); const zone = await companyApi.timeZone().catch(() => null); setCompanyTimeZone(zone?.timeZoneId); setUser(current); setSessionExpired(false); setStatus('authenticated') }, [])
  const logout = useCallback(async () => { try { await authService.logout() } finally { becomeAnonymous(false) } }, [becomeAnonymous])
  const value = useMemo(() => ({ status, user, sessionExpired, login, logout }), [status, user, sessionExpired, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
