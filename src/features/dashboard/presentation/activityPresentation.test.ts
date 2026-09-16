import { describe, expect, it } from 'vitest'
import { presentActivityType } from './activityPresentation'

describe('presentActivityType', () => {
  it.each([
    ['CustomerReminderCompleted', 'Recordatorio completado'],
    ['CustomerNoteAdded', 'Nota agregada'],
    ['ProjectVisitCheckInCreated', 'Visita iniciada'],
    ['ProjectVisitCheckOutCreated', 'Visita finalizada'],
    ['ProjectAttachmentAdded', 'Archivo agregado'],
    ['ProjectUpdated', 'Proyecto actualizado'],
  ])('traduce %s a un texto de negocio', (type, expected) => {
    expect(presentActivityType(type).label).toBe(expected)
  })
})
