import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth/context/authContext'
import { ProtectedRoute } from './ProtectedRoute'

const anonymous: AuthContextValue = { status: 'anonymous', user: null, sessionExpired: false, trialExpired: false, login: vi.fn(), logout: vi.fn() }
describe('ProtectedRoute', () => {
  it('redirige a login cuando no existe sesión', () => {
    render(<AuthContext.Provider value={anonymous}><MemoryRouter initialEntries={['/private']}><Routes><Route element={<ProtectedRoute/>}><Route path="/private" element={<p>Privado</p>}/></Route><Route path="/login" element={<p>Inicio de sesión</p>}/></Routes></MemoryRouter></AuthContext.Provider>)
    expect(screen.getByText('Inicio de sesión')).toBeInTheDocument(); expect(screen.queryByText('Privado')).not.toBeInTheDocument()
  })
  it('lleva a la pantalla de prueba vencida cuando la prueba terminó con la sesión abierta', () => {
    render(<AuthContext.Provider value={{ ...anonymous, trialExpired: true }}><MemoryRouter initialEntries={['/private']}><Routes><Route element={<ProtectedRoute/>}><Route path="/private" element={<p>Privado</p>}/></Route><Route path="/trial-expired" element={<p>Prueba vencida</p>}/></Routes></MemoryRouter></AuthContext.Provider>)
    expect(screen.getByText('Prueba vencida')).toBeInTheDocument()
  })
})
