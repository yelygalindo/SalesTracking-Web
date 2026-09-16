import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@/features/auth/types/authTypes'
import { createAuthorization } from './authorization'

const user: AuthUser = {
  id: 1,
  externalId: 'user-1',
  username: 'ana',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  company: { id: 2, externalId: 'company-2', name: 'UrbanTrack' },
  roles: ['Supervisor'],
  permissions: ['dashboard.read', 'reports.read'],
}

describe('authorization', () => {
  it('evalúa permisos sin distinguir mayúsculas y minúsculas', () => {
    const authorization = createAuthorization(user)
    expect(authorization.can('DASHBOARD.READ')).toBe(true)
    expect(authorization.canAny(['customers.read', 'reports.read'])).toBe(true)
    expect(authorization.canAll(['dashboard.read', 'reports.read'])).toBe(true)
    expect(authorization.canAll(['dashboard.read', 'customers.read'])).toBe(false)
  })

  it('consulta roles sin convertirlos en permisos', () => {
    const authorization = createAuthorization(user)
    expect(authorization.hasRole('supervisor')).toBe(true)
    expect(authorization.can('supervisor')).toBe(false)
  })

  it('deniega acceso cuando no existe usuario autenticado', () => {
    const authorization = createAuthorization(null)
    expect(authorization.can('dashboard.read')).toBe(false)
    expect(authorization.canAny(['dashboard.read'])).toBe(false)
    expect(authorization.canAll(['dashboard.read'])).toBe(false)
    expect(authorization.hasRole('admin')).toBe(false)
  })
})
