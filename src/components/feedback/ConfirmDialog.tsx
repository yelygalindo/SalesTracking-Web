import { useEffect, useRef } from 'react'
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', busy, onConfirm, onCancel }: { open: boolean; title: string; description: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) cancelRef.current?.focus() }, [open])
  if (!open) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description"><h2 id="dialog-title">{title}</h2><p id="dialog-description">{description}</p><footer><button ref={cancelRef} onClick={onCancel}>Cancelar</button><button className="danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Procesando…' : confirmLabel}</button></footer></section></div>
}
