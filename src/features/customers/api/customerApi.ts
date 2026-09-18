import { apiClient } from "@/lib/api/apiClient";
import type { MessageResponse } from "@/types/api";
import type {
  ChangeCustomerStatusDto,
  CreateCustomerDto,
  CustomerDetailDto,
  CustomerNoteDto,
  CustomerReminderDto,
  CustomerStatusDto,
  CustomersResponseDto,
  IdMessageDto,
  SellerDto,
  TimelineResponseDto,
  UpdateCustomerDto,
} from "./customerDtos";
import { translateValue } from "@/lib/i18n/labels";
import type { ImportCommitRequest, ImportCommitResult, ImportPreview, SpreadsheetRow } from "@/types/spreadsheetImport";

export interface CustomerFilters {
  search?: string;
  status?: string;
  externalUserId?: string;
  page: number;
  pageSize: number;
}
export interface CustomerImportResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const statusValues: Record<string, string> = {
  Prospecto: "prospect",
  Contactado: "contacted",
  Activo: "active",
};

export const customerApi = {
  async importTemplate() {
    return (await apiClient.get<Blob>("/api/customers/imports/template", { responseType: "blob" })).data;
  },
  async validateImport(rows: SpreadsheetRow[]) {
    return (await apiClient.post<ImportPreview>("/api/customers/imports/validate", { rows })).data;
  },
  async commitImport(importId: string, request: ImportCommitRequest) {
    return (await apiClient.post<ImportCommitResult>(`/api/customers/imports/${importId}/commit`, request)).data;
  },
  async importCsv(file: File) {
    const data = new FormData();
    data.append("file", file);
    return (
      await apiClient.post<CustomerImportResult>("/api/customers/import", data)
    ).data;
  },
  async exportCsv() {
    return (
      await apiClient.get<Blob>("/api/customers/export", {
        responseType: "blob",
      })
    ).data;
  },
  async list(filters: CustomerFilters) {
    const params = {
      ...filters,
      status: filters.status
        ? (statusValues[filters.status] ?? filters.status)
        : undefined,
    };
    const response = await apiClient.get<CustomersResponseDto>(
      "/api/customers",
      { params },
    );
    return {
      ...response.data,
      customers: response.data.customers.map((customer) => ({
        ...customer,
        status: translateValue(customer.status),
      })),
    };
  },
  async statuses() {
    const response = await apiClient.get<CustomerStatusDto[]>(
      "/api/customers/statuses",
    );
    return response.data;
  },
  async detail(externalId: string) {
    const response = await apiClient.get<CustomerDetailDto>(
      `/api/customers/${externalId}`,
    );
    return response.data;
  },
  async create(input: CreateCustomerDto) {
    const response = await apiClient.post<IdMessageDto>(
      "/api/customers",
      input,
    );
    return response.data;
  },
  async update(externalId: string, input: UpdateCustomerDto) {
    const response = await apiClient.put<MessageResponse>(
      `/api/customers/${externalId}`,
      input,
    );
    return response.data;
  },
  async changeStatus(externalId: string, input: ChangeCustomerStatusDto) {
    const response = await apiClient.patch<MessageResponse>(
      `/api/customers/${externalId}/status`,
      input,
    );
    return response.data;
  },
  async remove(externalId: string) {
    const response = await apiClient.delete<MessageResponse>(
      `/api/customers/${externalId}`,
    );
    return response.data;
  },
  async sellers() {
    return (await apiClient.get<SellerDto[]>("/api/sellers")).data;
  },
  async notes(externalId: string) {
    return (
      await apiClient.get<CustomerNoteDto[]>(
        `/api/customers/${externalId}/notes`,
      )
    ).data;
  },
  async addNote(externalId: string, text: string) {
    return (
      await apiClient.post<IdMessageDto>(`/api/customers/${externalId}/notes`, {
        text,
        occurredAtUtc: new Date().toISOString(),
        clientRequestId: crypto.randomUUID(),
      })
    ).data;
  },
  async reminders(externalId: string) {
    return (
      await apiClient.get<CustomerReminderDto[]>(
        `/api/customers/${externalId}/reminders`,
      )
    ).data;
  },
  async addReminder(
    externalId: string,
    text: string,
    reminderAtUtc: string,
    assignedToId: string | null,
  ) {
    return (
      await apiClient.post<IdMessageDto>(
        `/api/customers/${externalId}/reminders`,
        {
          text,
          reminderAtUtc,
          assignedToId,
          clientRequestId: crypto.randomUUID(),
        },
      )
    ).data;
  },
  async completeReminder(externalId: string, reminderId: string) {
    return (
      await apiClient.patch<MessageResponse>(
        `/api/customers/${externalId}/reminders/${reminderId}/complete`,
        { clientRequestId: crypto.randomUUID() },
      )
    ).data;
  },
  async timeline(externalId: string) {
    return (
      await apiClient.get<TimelineResponseDto>(
        `/api/customers/${externalId}/timeline`,
        { params: { page: 1, pageSize: 50 } },
      )
    ).data;
  },
};
