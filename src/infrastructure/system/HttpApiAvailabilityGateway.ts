import type { ApiAvailabilityGateway } from '@/application/system/checkApiAvailability'
import { apiClient } from '@/lib/api/apiClient'
export class HttpApiAvailabilityGateway implements ApiAvailabilityGateway { async isAvailable(): Promise<boolean> { try { await apiClient.get('/health/ready'); return true } catch { return false } } }
