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
