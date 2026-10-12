import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataState } from './DataState'

describe('DataState', () => {
  it('muestra un estado vacío accesible', () => {
    render(<DataState loading={false} isEmpty empty="No hay registros"><span>contenido</span></DataState>)
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByText('No hay registros')).toBeInTheDocument()
  })
  it('muestra el contenido cuando hay datos', () => {
    render(<DataState loading={false} isEmpty={false} empty=""><span>contenido</span></DataState>)
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })
})

describe('DataState errores', () => {
  it('explica la falta de conexión y permite reintentar', async () => {
    const { AppError } = await import('@/lib/api/apiError')
    const { fireEvent } = await import('@testing-library/react')
    let retried = 0
    render(<DataState loading={false} isEmpty={false} empty="" error={new AppError('network', 'x', undefined, undefined, true)} onRetry={() => { retried += 1 }}><span>contenido</span></DataState>)
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión con UrbanTrack')
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(retried).toBe(1)
  })
  it('no ofrece reintentar cuando falta permiso', async () => {
    const { AppError } = await import('@/lib/api/apiError')
    render(<DataState loading={false} isEmpty={false} empty="" error={new AppError('forbidden', 'Sin permiso.', 403)} onRetry={() => undefined}><span>contenido</span></DataState>)
    expect(screen.getByText('No tienes acceso a esta información')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reintentar/ })).not.toBeInTheDocument()
  })
  it('muestra un esqueleto mientras carga', () => {
    render(<DataState loading isEmpty={false} empty=""><span>contenido</span></DataState>)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })
})

describe('DataState mensajes técnicos', () => {
  it('oculta errores de programación al usuario', () => {
    render(<DataState loading={false} isEmpty={false} empty="" error={new TypeError("Cannot read properties of undefined")}><span /></DataState>)
    expect(screen.queryByText(/Cannot read/)).not.toBeInTheDocument()
    expect(screen.getByText(/Algo salió mal/)).toBeInTheDocument()
  })
})
