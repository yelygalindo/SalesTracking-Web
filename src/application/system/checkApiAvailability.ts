import type { SystemStatus } from '@/domain/system/SystemStatus'
export interface ApiAvailabilityGateway { isAvailable(): Promise<boolean> }
export async function checkApiAvailability(gateway: ApiAvailabilityGateway): Promise<SystemStatus> { return (await gateway.isAvailable()) ? 'available' : 'unavailable' }
