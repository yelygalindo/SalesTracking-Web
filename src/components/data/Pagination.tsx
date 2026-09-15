import { ChevronLeft, ChevronRight } from 'lucide-react'
export function Pagination({ page, totalPages, totalItems, onChange }: { page: number; totalPages: number; totalItems?: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <footer className="pagination"><span>{totalItems == null ? '' : `${totalItems} registros`}</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior"><ChevronLeft/></button><span>Página {page} de {totalPages}</span><button disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Página siguiente"><ChevronRight/></button></div></footer>
}
