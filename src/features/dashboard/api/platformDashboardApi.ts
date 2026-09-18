import { apiClient } from "@/lib/api/apiClient";
export interface PlatformDashboard {
  totalCompanies: number;
  activeCompanies: number;
  activeUsers: number;
  pendingInvitations: number;
  totalCustomers: number;
  activeProjects: number;
  pendingDeliveries: number;
}
export const platformDashboardApi = {
  get: async () =>
    (await apiClient.get<PlatformDashboard>("/api/platform/dashboard")).data,
};
