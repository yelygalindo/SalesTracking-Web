import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { RefreshTokenResponseDto } from '@/features/auth/api/authDtos'
import { env } from '@/config/env'
import { AppError, normalizeApi } from '@/lib/api/apiError'
import { tokenStore, type TokenStore } from '@/lib/api/tokenStore'

interface RetriableConfig extends InternalAxiosRequestConfig { _retry?: boolean }
type AuthFailureHandler = () => void
let authFailureHandler: AuthFailureHandler = () => undefined
let trialExpiredHandler: AuthFailureHandler = () => undefined
export function setAuthFailureHandler(handler: AuthFailureHandler) { authFailureHandler = handler }
export function setTrialExpiredHandler(handler: AuthFailureHandler) { trialExpiredHandler = handler }

export function createApiClients(store: TokenStore, onAuthFailure: AuthFailureHandler, onTrialExpired: AuthFailureHandler = () => undefined) {
  const publicClient = axios.create({ baseURL: env.apiBaseUrl, timeout: 10_000, withCredentials: true, headers: { Accept: 'application/json' } })
  const apiClient = axios.create({ baseURL: env.apiBaseUrl, timeout: 10_000, withCredentials: true, headers: { Accept: 'application/json' } })
  let refreshPromise: Promise<RefreshTokenResponseDto> | null = null

  publicClient.interceptors.response.use(response => response, error => Promise.reject(normalizeApi(error)))
  apiClient.interceptors.request.use(config => {
    const accessToken = store.get()?.accessToken
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    return config
  })
  apiClient.interceptors.response.use(response => response, async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    if (error.response?.status !== 401 || !original || original._retry || original.url === '/api/auth/logout' || original.url === '/api/auth/refresh') {
      const normalized = normalizeApi(error)
      // The trial ended while the session was open: every company endpoint now refuses access.
      if (normalized.code === 'trialExpired') onTrialExpired()
      return Promise.reject(normalized)
    }
    original._retry = true
    try {
      refreshPromise ??= finalize(publicClient.post<RefreshTokenResponseDto>('/api/auth/refresh').then(response => { store.replace(response.data); return response.data }))
      const refreshed = await refreshPromise
      original.headers.Authorization = `Bearer ${refreshed.accessToken}`
      return apiClient(original)
    } catch {
      store.clear(); onAuthFailure()
      throw new AppError('unauthorized', 'Tu sesión expiró. Inicia sesión nuevamente.', 401)
    }
  })

  function finalize<T>(promise: Promise<T>) { return promise.finally(() => { refreshPromise = null }) }
  return { publicClient, apiClient }
}

const clients = createApiClients(tokenStore, () => authFailureHandler(), () => trialExpiredHandler())
export const publicApiClient: AxiosInstance = clients.publicClient
export const apiClient: AxiosInstance = clients.apiClient
