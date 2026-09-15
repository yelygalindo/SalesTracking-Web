import type { AttachmentOptions } from '../api/projectDtos'

export function validateAttachment(file: File | null, options?: AttachmentOptions): string | null {
  if (!file) return 'Selecciona un archivo.'
  if (!options) return 'No se pudieron consultar las reglas de archivos.'
  if (file.size > options.maxFileSizeBytes) return `El archivo supera el máximo de ${formatBytes(options.maxFileSizeBytes)}.`
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
  const format = options.acceptedFormats.find(item => item.extensions.some(value => value.toLowerCase() === extension))
  if (!format) return `Formato no permitido. Usa ${options.acceptedFormats.flatMap(item => item.extensions).join(', ')}.`
  if (!format.contentTypes.some(value => value.toLowerCase() === file.type.toLowerCase())) return 'El tipo de contenido del archivo no coincide con su extensión.'
  return null
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
