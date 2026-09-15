import type { ReactNode } from 'react'
export function DataState({ loading, error, empty, isEmpty, children }: { loading: boolean; error?: Error | null; empty: string; isEmpty: boolean; children: ReactNode }) {
  if (loading) return <div className="data-state"><span className="spinner"/><p>Cargando información…</p></div>
  if (error) return <div className="data-state error"><strong>No pudimos cargar la información</strong><p>{error.message}</p></div>
  if (isEmpty) return <div className="data-state"><strong>Sin resultados</strong><p>{empty}</p></div>
  return <>{children}</>
}
