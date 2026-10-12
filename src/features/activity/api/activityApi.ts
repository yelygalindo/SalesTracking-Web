import { apiClient } from "@/lib/api/apiClient";

export interface ActivityItem {
  externalId: string;
  eventType: string;
  resourceType: string;
  resourceExternalId?: string | null;
  title: string;
  description?: string | null;
  occurredAtUtc: string;
  sellerExternalId?: string | null;
  sellerName?: string | null;
  relatedEntityType?: string | null;
  relatedEntityName?: string | null;
}

export interface ActivityPage {
  items: ActivityItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/** Values accepted by the `type` filter of /api/activity. */
export type ActivityType =
  | "workday"
  | "visit"
  | "project"
  | "customer"
  | "delivery"
  | "reminder"
  | "note";

export interface ActivityFilters {
  sellerExternalId?: string;
  fromUtc?: string;
  toUtc?: string;
  type?: ActivityType;
  page: number;
  pageSize: number;
}

// Timestamps are stored without zone; the API may omit the "Z" even though they are UTC.
export const asUtc = (value: string) =>
  /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;

export const activityApi = {
  list: async (filters: ActivityFilters): Promise<ActivityPage> => {
    const { data } = await apiClient.get<ActivityPage>("/api/activity", {
      params: {
        sellerExternalId: filters.sellerExternalId || undefined,
        from: filters.fromUtc,
        to: filters.toUtc,
        type: filters.type,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
    return {
      ...data,
      items: (data.items ?? []).map((item) => ({
        ...item,
        occurredAtUtc: asUtc(item.occurredAtUtc),
      })),
    };
  },
};
