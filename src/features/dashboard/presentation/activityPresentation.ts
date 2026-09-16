import { BellPlus, Building2, CheckCircle2, FileText, MapPin, Pencil, Route, UserRoundPen, type LucideIcon } from 'lucide-react'

export interface ActivityPresentation { label: string; Icon: LucideIcon; tone: 'blue' | 'green' | 'orange' }

const presentations: Record<string, ActivityPresentation> = {
  customernoteadded: { label: 'Nota agregada', Icon: Pencil, tone: 'blue' },
  customerremindercreated: { label: 'Recordatorio creado', Icon: BellPlus, tone: 'orange' },
  customerremindercompleted: { label: 'Recordatorio completado', Icon: CheckCircle2, tone: 'green' },
  customerupdated: { label: 'Cliente actualizado', Icon: UserRoundPen, tone: 'blue' },
  projectupdated: { label: 'Proyecto actualizado', Icon: Building2, tone: 'blue' },
  projectvisitcheckincreated: { label: 'Visita iniciada', Icon: MapPin, tone: 'orange' },
  projectvisitcheckoutcreated: { label: 'Visita finalizada', Icon: Route, tone: 'green' },
  projectattachmentadded: { label: 'Archivo agregado', Icon: FileText, tone: 'blue' },
}

const normalize = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase()

export function presentActivityType(type: string): ActivityPresentation {
  const value = normalize(type)
  if (presentations[value]) return presentations[value]
  if (value.includes('attachment') || value.includes('file')) return presentations.projectattachmentadded
  if (value.includes('checkout') || value.includes('visitcompleted')) return presentations.projectvisitcheckoutcreated
  if (value.includes('checkin') || value.includes('visitstarted')) return presentations.projectvisitcheckincreated
  if (value.includes('reminder') && value.includes('complet')) return presentations.customerremindercompleted
  if (value.includes('reminder')) return presentations.customerremindercreated
  if (value.includes('note')) return presentations.customernoteadded
  if (value.includes('project')) return presentations.projectupdated
  return presentations.customerupdated
}
