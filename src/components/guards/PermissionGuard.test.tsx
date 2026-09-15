import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth/context/authContext'
import { PermissionGuard } from './PermissionGuard'

const context: AuthContextValue = { status: 'authenticated', user: { id: 1, externalId: 'u', username: 'user', fullName: 'User', email: 'u@test.com', company: { id: 1, externalId: 'c', name: 'Company' }, roles: [], permissions: ['dashboard.read'] }, sessionExpired: false, login: vi.fn(), logout: vi.fn() }
describe('PermissionGuard', () => {
  it('muestra únicamente contenido autorizado', () => {
    render(<AuthContext.Provider value={context}><PermissionGuard permission="dashboard.read"><p>Permitido</p></PermissionGuard><PermissionGuard permission="reports.read"><p>Oculto</p></PermissionGuard></AuthContext.Provider>)
    expect(screen.getByText('Permitido')).toBeInTheDocument(); expect(screen.queryByText('Oculto')).not.toBeInTheDocument()
  })
})
