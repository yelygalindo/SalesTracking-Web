import { apiClient } from "@/lib/api/apiClient";

export interface OperationLabel {
  singular: string;
  plural: string;
}

export interface OperationLabels {
  customer: OperationLabel;
  project: OperationLabel;
  visit: OperationLabel;
}

export interface OperationModules {
  deliveries: boolean;
  catalog: boolean;
}

export interface OperationSettings {
  industryCode: string;
  industryName: string;
  /** "industry" while the company uses its industry defaults, "custom" once customized. */
  source: "industry" | "custom";
  labels: OperationLabels;
  modules: OperationModules;
  message?: string | null;
}

export interface OperationSettingsInput {
  customerLabelSingular: string;
  customerLabelPlural: string;
  projectLabelSingular: string;
  projectLabelPlural: string;
  visitLabelSingular: string;
  visitLabelPlural: string;
  deliveriesEnabled: boolean;
  catalogEnabled: boolean;
}

const path = "/api/companies/current/operation-settings";

export const operationSettingsApi = {
  current: async () => (await apiClient.get<OperationSettings>(path)).data,
  customize: async (input: OperationSettingsInput) =>
    (await apiClient.put<OperationSettings>(path, input)).data,
  reset: async () => (await apiClient.delete<OperationSettings>(path)).data,
  changeIndustry: async (industryCode: string) =>
    (
      await apiClient.put<OperationSettings>("/api/companies/current/industry", {
        industryCode,
      })
    ).data,
};
