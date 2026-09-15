import type { ReactNode } from 'react'
export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <label className={error ? 'field-error' : ''}><span>{label}{required && ' *'}</span>{children}{error && <small role="alert">{error}</small>}</label>
}
