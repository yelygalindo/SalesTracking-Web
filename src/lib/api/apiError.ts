import axios from 'axios'
import type { ErrorResponse, MessageResponse } from '@/types/api'

export type AppErrorCode = 'validation' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'rateLimited' | 'network' | 'server' | 'unknown'
export class AppError extends Error {
  constructor(public code: AppErrorCode, message: string, public status?: number, public details?: string, public retryable = false) { super(message); this.name = 'AppError' }
}
const codes: Record<number, AppErrorCode> = { 400: 'validation', 401: 'unauthorized', 403: 'forbidden', 404: 'notFound', 409: 'conflict', 429: 'rateLimited' }
const messages: Record<number, string> = { 400: 'Los datos enviados no son válidos.', 401: 'Tu sesión no es válida.', 403: 'No tienes permiso para realizar esta acción.', 404: 'No se encontró el recurso solicitado.', 409: 'La información cambió. Actualiza e intenta nuevamente.', 429: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }

export function normalizeApi(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (!axios.isAxiosError<MessageResponse | ErrorResponse>(error)) return new AppError('unknown', 'Ocurrió un error inesperado.')
  if (!error.response) return new AppError('network', 'No fue posible conectar con UrbanTrack.', undefined, undefined, true)
  const status = error.response.status; const data = error.response.data
  const message = data && 'message' in data ? data.message : data && 'error' in data ? data.error : messages[status] ?? (status >= 500 ? 'UrbanTrack no está disponible temporalmente.' : 'No fue posible completar la solicitud.')
  const details = data && 'details' in data ? data.details ?? undefined : undefined
  return new AppError(codes[status] ?? (status >= 500 ? 'server' : 'unknown'), message, status, details, status >= 500)
}
