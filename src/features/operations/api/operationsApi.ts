import { apiClient } from "@/lib/api/apiClient";

export interface SellerOption {
  externalId: string;
  displayName: string;
  email?: string;
}
export interface WorkdayVisit {
  externalId: string;
  targetType: string;
  targetExternalId: string;
  targetName: string;
  customerExternalId?: string | null;
  customerName?: string | null;
  checkInAtUtc: string;
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutAtUtc?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  notes?: string | null;
  result?: string | null;
}
export interface WorkdayLocation {
  externalId?: string;
  capturedAtUtc: string;
  latitude: number;
  longitude: number;
}
export interface Workday {
  id: string;
  sellerExternalId?: string | null;
  sellerName?: string | null;
  status: string;
  startedAtUtc: string;
  endedAtUtc?: string | null;
  note?: string | null;
  visitCount: number;
  locationCount: number;
  visits?: WorkdayVisit[];
}
export interface ActiveSeller {
  sellerExternalId: string;
  sellerName: string;
  status: string;
  startedAtUtc: string;
  lastLocation?: WorkdayLocation | null;
  lastUpdatedAtUtc?: string | null;
  currentVisit?: { name?: string | null; startedAtUtc?: string | null } | null;
}
export interface WorkdayFilters {
  from: string;
  to: string;
  sellerExternalId?: string;
}

const asList = <T>(value: T[] | { items: T[] }): T[] =>
  Array.isArray(value) ? value : value.items;

export const operationsApi = {
  sellers: async () =>
    (await apiClient.get<SellerOption[]>("/api/sellers")).data,
  activeSellers: async () =>
    asList(
      (
        await apiClient.get<ActiveSeller[] | { items: ActiveSeller[] }>(
          "/api/tracking/active-sellers",
        )
      ).data,
    ),
  workdays: async (filters: WorkdayFilters) =>
    asList(
      (
        await apiClient.get<Workday[] | { items: Workday[] }>("/api/workdays", {
          params: {
            from: filters.from,
            to: filters.to,
            sellerExternalId: filters.sellerExternalId || undefined,
          },
        })
      ).data,
    ),
  workday: async (workdayId: string) =>
    (await apiClient.get<Workday>(`/api/workdays/${workdayId}`)).data,
  locations: async (workdayId: string) =>
    asList(
      (
        await apiClient.get<WorkdayLocation[] | { items: WorkdayLocation[] }>(
          `/api/workdays/${workdayId}/locations`,
        )
      ).data,
    ),
};
