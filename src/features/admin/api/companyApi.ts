import { apiClient } from "@/lib/api/apiClient";

export interface CompanyTimeZone {
  timeZoneId: string;
}

export const companyApi = {
  timeZone: async () =>
    (await apiClient.get<CompanyTimeZone>("/api/companies/current/time-zone"))
      .data,
  updateTimeZone: async (timeZoneId: string) =>
    (
      await apiClient.put<CompanyTimeZone>(
        "/api/companies/current/time-zone",
        { timeZoneId },
      )
    ).data,
};
