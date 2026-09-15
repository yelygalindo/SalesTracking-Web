import { describe, expect, it } from 'vitest'
import { checkApiAvailability, type ApiAvailabilityGateway } from './checkApiAvailability'

describe('checkApiAvailability', () => {
  it.each([[true, 'available'], [false, 'unavailable']] as const)(
    'maps %s to %s', async (isAvailable, expected) => {
      const gateway: ApiAvailabilityGateway = { isAvailable: async () => isAvailable }
      await expect(checkApiAvailability(gateway)).resolves.toBe(expected)
    },
  )
})
