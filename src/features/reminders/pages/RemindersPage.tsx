import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/AppShell'
import { DataState } from '@/components/data/DataState'
import { notify } from '@/components/feedback/toast'
import { reminderApi, type SellerReminder } from '../api/reminderApi'

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const initialFrom = () => { const date = new Date(); date.setDate(date.getDate() - 30); return isoDate(date) }
const initialTo = () => { const date = new Date(); date.setDate(date.getDate() + 30); return isoDate(date) }

export function RemindersPage() {
  const cache = useQueryClient()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [status, setStatus] = useState<'all'|'pending'|'completed'>('pending')
  const filters = { from, to, completed: status === 'all' ? undefined : status === 'completed' }
  const query = useQuery({ queryKey: ['reminders', filters], queryFn: () => reminderApi.list(filters), enabled: Boolean(from && to && from <= to) })
  const complete = useMutation({
    mutationFn: (reminder: SellerReminder) => reminderApi.complete(reminder),
    onSuccess: async (_, reminder) => { notify(`Recordatorio de ${reminder.customerName} completado.`); await cache.invalidateQueries({ queryKey: ['reminders'] }) },
    onError: (error: Error) => notify(error.message, 'error'),
  })
  const invalidRange = Boolean(from && to && from > to)
  return <main className="customers-content reminders-page">
    <PageHeader eyebrow="Seguimiento comercial" title="Agenda de recordatorios" description="Consulta tus pendientes y seguimientos completados por fecha."/>
    <section className="reminder-filters" aria-label="Filtros de agenda">
      <label>Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label>
      <label>Hasta<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)}/></label>
      <label>Estado<select value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="pending">Pendientes</option><option value="completed">Completados</option><option value="all">Todos</option></select></label>
    </section>
    {invalidRange ? <div className="data-state error"><strong>Rango no válido</strong><p>La fecha final debe ser igual o posterior a la fecha inicial.</p></div> : <DataState loading={query.isLoading} error={query.error} isEmpty={!query.data?.length} empty="No hay recordatorios para este rango y estado.">
      <section className="reminder-agenda">{query.data?.map(item => <article className={item.completed ? 'completed' : ''} key={item.externalId}>
        <span className="reminder-icon">{item.completed ? <CheckCircle2/> : <CalendarClock/>}</span>
        <div><strong>{item.text}</strong><Link to={`/customers?selected=${encodeURIComponent(item.customerExternalId)}`}>{item.customerName}</Link></div>
        <time>{new Date(item.reminderAtUtc).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}</time>
        {!item.completed && <button disabled={complete.isPending} onClick={() => complete.mutate(item)}>Marcar completado</button>}
      </article>)}</section>
    </DataState>}
  </main>
}
