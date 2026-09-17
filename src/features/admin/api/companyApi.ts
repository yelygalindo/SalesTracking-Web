import { apiClient } from "@/lib/api/apiClient";

export interface CompanyTimeZone {
  timeZoneId: string;
}

export interface CompanyUserCapacity {
  companyExternalId: string;
  userLimit: number;
  activeUserCount: number;
  pendingInvitationCount: number;
  usedSlots: number;
  availableSlots: number;
}

export interface ManagedCompany {
  externalId: string;
  name: string;
  status: "active" | "inactive";
  timeZoneId: string;
  userLimit: number;
  activeUserCount: number;
  pendingInvitationCount: number;
  availableSlots: number;
  createdAtUtc: string;
}

export interface CompanyPage {
  items: ManagedCompany[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CompanyFilters {
  search?: string;
  status?: "active" | "inactive";
  page: number;
  pageSize: number;
}

export const companyApi = {
  list: async ({ search, status, page, pageSize }: CompanyFilters) =>
    (
      await apiClient.get<CompanyPage>("/api/companies", {
        params: { search: search || undefined, status, page, pageSize },
      })
    ).data,
  userCapacity: async () =>
    (
      await apiClient.get<CompanyUserCapacity>(
        "/api/companies/current/user-capacity",
      )
    ).data,
  updateUserLimit: async (companyExternalId: string, userLimit: number) =>
    (
      await apiClient.patch<CompanyUserCapacity>(
        `/api/companies/${companyExternalId}/user-limit`,
        { userLimit },
      )
    ).data,
  timeZone: async () =>
    (await apiClient.get<CompanyTimeZone>("/api/companies/current/time-zone"))
      .data,
  updateTimeZone: async (timeZoneId: string) =>
    (
      await apiClient.put<CompanyTimeZone>("/api/companies/current/time-zone", {
        timeZoneId,
      })
    ).data,
};
