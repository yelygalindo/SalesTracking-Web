import { emailPattern } from '@/lib/validation/email'

function requiredUrl(value: string | undefined, name: string) {
  const normalized = value?.trim().replace(/\/$/, '')
  if (!normalized) throw new Error(`La variable ${name} es obligatoria.`)
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch { throw new Error(`La variable ${name} debe ser una URL HTTP válida.`) }
  return normalized
}

// Optional: without a valid address the support page explains how to reach the team instead.
function optionalEmail(value: string | undefined) {
  const email = value?.trim()
  return email && emailPattern.test(email) ? email : undefined
}

// Optional: without a Turnstile site key the trial sign-up is sent without a captcha.
function optionalText(value: string | undefined) {
  return value?.trim() || undefined
}

export const env = {
  apiBaseUrl: requiredUrl(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL'),
  supportEmail: optionalEmail(import.meta.env.VITE_SUPPORT_EMAIL),
  turnstileSiteKey: optionalText(import.meta.env.VITE_TURNSTILE_SITE_KEY),
}
