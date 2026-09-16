import { apiClient } from "@/lib/api/apiClient";
import { AppError } from "@/lib/api/apiError";

export interface DashboardMetrics {
  activeCustomers?: number;
  activeProjects?: number;
  pendingDeliveries?: number;
  overdueDeliveries?: number;
  completedDeliveriesThisMonth?: number;
  todayFollowUps?: number;
}

export interface DashboardProjectItem {
  projectExternalId: string;
  type?: string;
  name: string;
  customerName: string | null;
  sellerName?: string | null;
  statusId?: number;
  statusName?: string | null;
  progressPercentage: number;
  latitude?: number | null;
  longitude?: number | null;
  nextFollowUp?: { reminderAtUtc: string; text?: string | null } | null;
  detailUrl?: string | null;
}

export interface DashboardMapFilters {
  statusId?: number;
  sellerExternalId?: string;
}
export interface DashboardSeller {
  externalId: string;
  displayName: string;
}
interface RawDashboardMapItem extends Partial<DashboardProjectItem> {
  id?: string;
  status?: string;
  customer?: string | { name?: string | null } | null;
  seller?:
    string | { name?: string | null; displayName?: string | null } | null;
}

export interface DashboardActivityItem {
  projectExternalId: string;
  projectName: string;
  eventTypeName: string;
  title: string | null;
  userName: string | null;
  occurredAtUtc: string;
}

export interface DashboardFollowUpItem {
  reminderExternalId: string;
  customerExternalId: string;
  customerName: string;
  projectName?: string | null;
  text: string;
  reminderAtUtc: string;
  assignedToName: string;
}

export interface DashboardUrgentDelivery {
  deliveryExternalId: string;
  projectExternalId: string;
  projectName: string;
  customerName?: string | null;
  productName?: string | null;
  statusName: string;
  committedDateUtc: string;
  isOverdue: boolean;
}

interface DashboardSummaryResponse extends DashboardMetrics {
  metrics?: DashboardMetrics;
  urgentDeliveries?: DashboardUrgentDelivery[];
}

interface AggregatedDashboardResponse {
  metrics: DashboardMetrics;
  projectLocations: DashboardProjectItem[];
  recentActivity: DashboardActivityItem[];
  upcomingFollowUps: DashboardFollowUpItem[];
  urgentDeliveries: DashboardUrgentDelivery[];
}

export interface DashboardData {
  metrics: DashboardMetrics;
  projectItems: DashboardProjectItem[];
  recentActivity: DashboardActivityItem[];
  upcomingFollowUps: DashboardFollowUpItem[];
  urgentDeliveries: DashboardUrgentDelivery[];
}

export const dashboardApi = {
  mapItems: async (filters: DashboardMapFilters = {}) => {
    let items: RawDashboardMapItem[];
    const params = {
      statusId: filters.statusId,
      sellerExternalId: filters.sellerExternalId,
    };
    try {
      items = (
        await apiClient.get<RawDashboardMapItem[]>("/api/dashboard/map-items", {
          params,
        })
      ).data;
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "notFound")
        throw error;
      items = (
        await apiClient.get<AggregatedDashboardResponse>("/api/dashboard", {
          params,
        })
      ).data.projectLocations;
    }
    return items.map((item) => ({
      projectExternalId: item.projectExternalId || item.id || "",
      type: item.type,
      name: item.name || "Proyecto",
      customerName:
        item.customerName ??
        (typeof item.customer === "string"
          ? item.customer
          : item.customer?.name) ??
        null,
      sellerName:
        item.sellerName ??
        (typeof item.seller === "string"
          ? item.seller
          : item.seller?.displayName || item.seller?.name) ??
        null,
      statusId: item.statusId,
      statusName: item.statusName || item.status || null,
      progressPercentage: item.progressPercentage ?? 0,
      latitude: item.latitude,
      longitude: item.longitude,
      nextFollowUp: item.nextFollowUp,
      detailUrl: item.detailUrl,
    }));
  },
  sellers: async () =>
    (await apiClient.get<DashboardSeller[]>("/api/sellers")).data,
  get: async (): Promise<DashboardData> => {
    try {
      const response =
        await apiClient.get<AggregatedDashboardResponse>("/api/dashboard");
      return {
        metrics: response.data.metrics,
        projectItems: response.data.projectLocations ?? [],
        recentActivity: response.data.recentActivity ?? [],
        upcomingFollowUps: response.data.upcomingFollowUps ?? [],
        urgentDeliveries: response.data.urgentDeliveries ?? [],
      };
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "notFound")
        throw error;
    }

    const [summary, mapItems, recentActivity, upcomingFollowUps] =
      await Promise.all([
        apiClient.get<DashboardSummaryResponse>("/api/dashboard/summary"),
        apiClient.get<DashboardProjectItem[]>("/api/dashboard/map-items"),
        apiClient.get<DashboardActivityItem[]>(
          "/api/dashboard/recent-activity",
        ),
        apiClient.get<DashboardFollowUpItem[]>(
          "/api/dashboard/upcoming-follow-ups",
        ),
      ]);
    const summaryData = summary.data;
    return {
      metrics: summaryData.metrics ?? summaryData,
      urgentDeliveries: summaryData.urgentDeliveries ?? [],
      projectItems: mapItems.data,
      recentActivity: recentActivity.data,
      upcomingFollowUps: upcomingFollowUps.data,
    };
  },
};
