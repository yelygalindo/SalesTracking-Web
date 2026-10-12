import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/authService'
import { AuthContext } from '@/features/auth/context/authContext'
import type { AuthStatus, AuthUser, LoginCredentials } from '@/features/auth/types/authTypes'
import { setAuthFailureHandler, setTrialExpiredHandler } from '@/lib/api/apiClient'
import { tokenStore } from '@/lib/api/tokenStore'
import { AppError } from '@/lib/api/apiError'
import { companyApi } from '@/features/admin/api/companyApi'
import { setCompanyTimeZone } from '@/lib/i18n/dateTime'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient(); const [status, setStatus] = useState<AuthStatus>('initializing'); const [user, setUser] = useState<AuthUser | null>(null); const [sessionExpired, setSessionExpired] = useState(false); const [trialExpired, setTrialExpired] = useState(false); const endingTrial = useRef(false)
  const becomeAnonymous = useCallback((expired = false) => { tokenStore.clear(); queryClient.clear(); setCompanyTimeZone(null); setUser(null); setSessionExpired(expired); setTrialExpired(false); setStatus('anonymous') }, [queryClient])
  useEffect(() => { setAuthFailureHandler(() => becomeAnonymous(true)); return () => setAuthFailureHandler(() => undefined) }, [becomeAnonymous])
  // Several requests can fail at once when the trial ends; the session is closed only once.
  const endTrialSession = useCallback(() => { if (endingTrial.current) return; endingTrial.current = true; void authService.logout().catch(() => undefined).finally(() => { endingTrial.current = false; becomeAnonymous(false); setTrialExpired(true) }) }, [becomeAnonymous])
  useEffect(() => { setTrialExpiredHandler(endTrialSession); return () => setTrialExpiredHandler(() => undefined) }, [endTrialSession])
  useEffect(() => { let active = true; authService.restore().then(async restored => { if (!active) return; if (restored) { const zone = await companyApi.timeZone().catch(() => null); if (!active) return; setCompanyTimeZone(zone?.timeZoneId); } setUser(restored); setStatus(restored ? 'authenticated' : 'anonymous') }).catch(reason => { if (active) becomeAnonymous(reason instanceof AppError && reason.code === 'unauthorized') }); return () => { active = false } }, [becomeAnonymous])
  const login = useCallback(async (credentials: LoginCredentials) => { const current = await authService.login(credentials); const zone = await companyApi.timeZone().catch(() => null); setCompanyTimeZone(zone?.timeZoneId); setUser(current); setSessionExpired(false); setTrialExpired(false); setStatus('authenticated') }, [])
  const logout = useCallback(async () => { try { await authService.logout() } finally { becomeAnonymous(false) } }, [becomeAnonymous])
  const value = useMemo(() => ({ status, user, sessionExpired, trialExpired, login, logout }), [status, user, sessionExpired, trialExpired, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
