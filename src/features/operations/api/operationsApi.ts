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
export interface WorkdayRouteSegment {
  type: "LineString";
  coordinates: [number, number][];
}
export interface WorkdayLocationsResponse {
  routePoints: WorkdayLocation[];
  segments: WorkdayRouteSegment[];
  mapMatched: boolean;
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
  workdayExternalId?: string | null;
  status?: string;
  startedAtUtc: string;
  lastLocation?: WorkdayLocation | null;
  lastLocationAtUtc?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  lastUpdatedAtUtc?: string | null;
  currentVisit?: { name?: string | null; startedAtUtc?: string | null } | null;
}
export interface OperationVisit {
  externalId: string;
  projectExternalId?: string | null;
  projectName?: string | null;
  customerExternalId?: string | null;
  customerName?: string | null;
  visitedAtUtc: string;
  checkOutAtUtc?: string | null;
  result?: string | null;
  sellerExternalId?: string | null;
  sellerName?: string | null;
}
export interface WorkdayFilters {
  from: string;
  to: string;
  sellerExternalId?: string;
}
export interface SellerRouteFilters {
  sellerExternalId: string;
  fromUtc: string;
  toUtc: string;
}

const normalizeActiveSeller = (seller: ActiveSeller): ActiveSeller => {
  const hasCoordinates =
    Number.isFinite(seller.latitude) && Number.isFinite(seller.longitude);
  const capturedAtUtc =
    seller.lastLocationAtUtc ?? seller.lastUpdatedAtUtc ?? seller.startedAtUtc;

  return {
    ...seller,
    status: seller.status || "open",
    lastUpdatedAtUtc: seller.lastUpdatedAtUtc ?? seller.lastLocationAtUtc,
    lastLocation:
      seller.lastLocation ??
      (hasCoordinates
        ? {
            capturedAtUtc,
            latitude: seller.latitude!,
            longitude: seller.longitude!,
          }
        : null),
  };
};

const asList = <T>(value: T[] | { items: T[] }): T[] =>
  Array.isArray(value) ? value : value.items;

export function normalizeWorkdayLocations(
  value: unknown,
): WorkdayLocationsResponse {
  if (Array.isArray(value)) {
    return { routePoints: value as WorkdayLocation[], segments: [], mapMatched: false };
  }

  if (!value || typeof value !== "object") {
    return { routePoints: [], segments: [], mapMatched: false };
  }

  const response = value as Record<string, unknown>;
  const routePoints = Array.isArray(response.routePoints)
    ? (response.routePoints as WorkdayLocation[])
    : Array.isArray(response.items)
      ? (response.items as WorkdayLocation[])
      : [];

  return {
    routePoints,
    segments: Array.isArray(response.segments)
      ? (response.segments as WorkdayRouteSegment[])
      : [],
    mapMatched: response.mapMatched === true,
  };
}

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
    ).map(normalizeActiveSeller),
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
    normalizeWorkdayLocations(
      (
        await apiClient.get<unknown>(
          `/api/workdays/${workdayId}/locations`,
        )
      ).data,
    ),
  sellerRoute: async (filters: SellerRouteFilters) =>
    normalizeWorkdayLocations(
      (
        await apiClient.get<unknown>("/api/seller-routes", {
          params: {
            sellerExternalId: filters.sellerExternalId,
            fromUtc: filters.fromUtc,
            toUtc: filters.toUtc,
          },
        })
      ).data,
    ),
  visits: async (filters: WorkdayFilters) =>
    asList(
      (
        await apiClient.get<OperationVisit[] | { items: OperationVisit[] }>(
          "/api/visits",
          {
            params: {
              from: filters.from,
              to: filters.to,
              sellerExternalId: filters.sellerExternalId || undefined,
            },
          },
        )
      ).data,
    ),
};
