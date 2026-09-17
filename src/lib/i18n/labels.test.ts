import { describe, expect, it } from 'vitest'
import { translateValue } from './labels'

describe('translateValue', () => {
  it('traduce valores técnicos', () => {
    expect(translateValue('active')).toBe('Activo')
    expect(translateValue('contacted')).toBe('Contactado')
    expect(translateValue('on_hold')).toBe('En pausa')
    expect(translateValue('sent')).toBe('Enviado')
    expect(translateValue('Partial')).toBe('Parcial')
    expect(translateValue('Delivered')).toBe('Entregado')
  })

  it('conserva valores desconocidos', () => {
    expect(translateValue('Personalizado')).toBe('Personalizado')
  })
})
