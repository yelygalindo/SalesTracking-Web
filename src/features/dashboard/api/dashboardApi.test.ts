import MockAdapter from 'axios-mock-adapter'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/lib/api/apiClient'
import { dashboardApi } from './dashboardApi'

describe('dashboardApi', () => {
  const api = new MockAdapter(apiClient)
  beforeEach(() => api.reset())

  it('consume el endpoint agregado disponible en la API actual', async () => {
    api.onGet('/api/dashboard').reply(200, {
      metrics: { activeCustomers: 8 },
      projectLocations: [{ projectExternalId: 'p-1', name: 'Obra Central', customerName: 'Acme', progressPercentage: 60 }],
      recentActivity: [],
      upcomingFollowUps: [],
      urgentDeliveries: [],
    })

    const result = await dashboardApi.get()

    expect(result.metrics.activeCustomers).toBe(8)
    expect(result.projectItems).toHaveLength(1)
    expect(api.history.get.map(({ url }) => url)).toEqual(['/api/dashboard'])
  })

  it('usa el contrato dividido cuando no existe el recurso agregado', async () => {
    api.onGet('/api/dashboard').reply(404)
    api.onGet('/api/dashboard/summary').reply(200, { metrics: { activeCustomers: 8 }, urgentDeliveries: [] })
    api.onGet('/api/dashboard/map-items').reply(200, [])
    api.onGet('/api/dashboard/recent-activity').reply(200, [])
    api.onGet('/api/dashboard/upcoming-follow-ups').reply(200, [])

    const result = await dashboardApi.get()

    expect(result.metrics.activeCustomers).toBe(8)
    expect(api.history.get.map(({ url }) => url)).toEqual([
      '/api/dashboard',
      '/api/dashboard/summary',
      '/api/dashboard/map-items',
      '/api/dashboard/recent-activity',
      '/api/dashboard/upcoming-follow-ups',
    ])
  })

  it('conserva el identificador del vendedor en los puntos del mapa', async () => {
    api.onGet('/api/dashboard/map-items').reply(200, [{ projectExternalId: 'p-1', name: 'Obra', sellerExternalId: 'seller-1', sellerName: 'Elma', latitude: -17.7, longitude: -63.1 }])
    const result = await dashboardApi.mapItems()
    expect(result[0].sellerExternalId).toBe('seller-1')
  })
})
