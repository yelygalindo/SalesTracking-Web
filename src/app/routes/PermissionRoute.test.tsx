import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth/context/authContext'
import { PermissionRoute } from './PermissionRoute'

const context: AuthContextValue = {
  status: 'authenticated',
  user: {
    id: 1,
    externalId: 'user-1',
    username: 'ana',
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    company: { id: 2, externalId: 'company-2', name: 'UrbanTrack' },
    roles: ['admin'],
    permissions: ['invitations.create'],
  },
  sessionExpired: false,
  login: vi.fn(),
  logout: vi.fn(),
}

describe('PermissionRoute', () => {
  it('permite una ruta cuando cumple cualquiera de los permisos requeridos', () => {
    render(<AuthContext.Provider value={context}><MemoryRouter initialEntries={['/admin']}><Routes><Route element={<PermissionRoute anyOf={['invitations.create','companies.create']}/>}><Route path="/admin" element={<p>Administración</p>}/></Route><Route path="/unauthorized" element={<p>Sin acceso</p>}/></Routes></MemoryRouter></AuthContext.Provider>)
    expect(screen.getByText('Administración')).toBeInTheDocument()
  })

  it('redirige a Forbidden cuando falta el permiso', () => {
    render(<AuthContext.Provider value={context}><MemoryRouter initialEntries={['/reports']}><Routes><Route element={<PermissionRoute permission="reports.read"/>}><Route path="/reports" element={<p>Reportes</p>}/></Route><Route path="/unauthorized" element={<p>Sin acceso</p>}/></Routes></MemoryRouter></AuthContext.Provider>)
    expect(screen.getByText('Sin acceso')).toBeInTheDocument()
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument()
  })
})
