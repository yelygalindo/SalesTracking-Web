function requiredUrl(value: string | undefined, name: string) {
  const normalized = value?.trim().replace(/\/$/, '')
  if (!normalized) throw new Error(`La variable ${name} es obligatoria.`)
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch { throw new Error(`La variable ${name} debe ser una URL HTTP válida.`) }
  return normalized
}

export const env = { apiBaseUrl: requiredUrl(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL') }
