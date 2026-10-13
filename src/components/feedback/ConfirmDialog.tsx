import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * `danger` is for actions that remove data; `warning` for reversible ones, such as
 * deactivating a user, which only need a heads-up.
 */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', busy, tone = 'danger', onConfirm, onCancel }: { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; busy?: boolean; tone?: 'danger' | 'warning'; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) cancelRef.current?.focus() }, [open])
  if (!open) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}><section className={`confirm-dialog confirm-dialog--${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">{tone === 'warning' && <span className="confirm-dialog-icon" aria-hidden="true"><AlertTriangle /></span>}<h2 id="dialog-title">{title}</h2><p id="dialog-description">{description}</p><footer><button ref={cancelRef} onClick={onCancel}>{cancelLabel}</button><button className={tone === 'warning' ? 'warning-button' : 'danger-button'} disabled={busy} onClick={onConfirm}>{busy ? 'Procesando…' : confirmLabel}</button></footer></section></div>
}
