import { publicApiClient } from "@/lib/api/apiClient";

export interface Industry {
  code: string;
  name: string;
}

export const industryApi = {
  list: async () => (await publicApiClient.get<Industry[]>("/api/industries")).data,
};
