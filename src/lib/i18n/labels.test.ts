import { describe, expect, it } from 'vitest'
import { translateValue } from './labels'

describe('translateValue', () => {
  it('traduce valores técnicos', () => {
    expect(translateValue('active')).toBe('Activo')
    expect(translateValue('contacted')).toBe('Contactado')
    expect(translateValue('on_hold')).toBe('En pausa')
    expect(translateValue('sent')).toBe('Enviado')
  })

  it('conserva valores desconocidos', () => {
    expect(translateValue('Personalizado')).toBe('Personalizado')
  })
})
