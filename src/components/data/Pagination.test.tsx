import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('navega y bloquea los límites', () => {
    const onChange = vi.fn(); render(<Pagination page={1} totalPages={3} totalItems={45} onChange={onChange}/>)
    expect(screen.getByLabelText('Página anterior')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Página siguiente'))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
