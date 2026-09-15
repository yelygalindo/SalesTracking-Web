import { describe, expect, it } from 'vitest'
import { formatBytes, validateAttachment } from './attachmentValidation'
import type { AttachmentOptions } from '../api/projectDtos'

const options: AttachmentOptions = {
  maxFileSizeBytes: 1024,
  attachmentTypes: [{ value: 'Photo', label: 'Fotografía', description: 'Imagen' }],
  acceptedFormats: [{ description: 'JPEG', extensions: ['.jpg', '.jpeg'], contentTypes: ['image/jpeg'] }],
}

describe('validateAttachment', () => {
  it('acepta archivos que cumplen tamaño, extensión y MIME', () => {
    expect(validateAttachment(new File(['foto'], 'obra.jpg', { type: 'image/jpeg' }), options)).toBeNull()
  })

  it('rechaza extensiones no permitidas', () => {
    expect(validateAttachment(new File(['pdf'], 'obra.pdf', { type: 'application/pdf' }), options)).toContain('Formato no permitido')
  })

  it('rechaza contenido que no coincide con la extensión', () => {
    expect(validateAttachment(new File(['foto'], 'obra.jpg', { type: 'image/png' }), options)).toContain('no coincide')
  })

  it('rechaza archivos que superan el máximo', () => {
    expect(validateAttachment(new File([new Uint8Array(1025)], 'obra.jpg', { type: 'image/jpeg' }), options)).toContain('supera el máximo')
  })
})

describe('formatBytes', () => {
  it('presenta tamaños legibles', () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB')
  })
})
