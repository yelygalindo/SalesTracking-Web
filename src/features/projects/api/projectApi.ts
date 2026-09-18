import { apiClient } from "@/lib/api/apiClient";
import type { MessageResponse } from "@/types/api";
import type {
  Attachment,
  AttachmentOptions,
  AttachmentUpload,
  Material,
  Paged,
  ProjectDetail,
  ProjectInput,
  ProjectNote,
  ProjectReminder,
  ProjectStatus,
  ProjectSummary,
  ProjectVisit,
  TimelineItem,
} from "./projectDtos";
import type {
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  SpreadsheetRow,
} from "@/types/spreadsheetImport";
import { normalizeImportRows } from "@/lib/import/normalizeImportRows";
const id = () => crypto.randomUUID();
export interface ProjectFilters {
  status?: string;
  customerId?: string;
  sellerId?: string;
  page: number;
  pageSize: number;
}
export const projectApi = {
  importTemplate: async () =>
    (
      await apiClient.get<Blob>("/api/projects/imports/template", {
        responseType: "blob",
        headers: { "Cache-Control": "no-cache" },
      })
    ).data,
  validateImport: async (rows: SpreadsheetRow[]) => {
    return (
      await apiClient.post<ImportPreview>("/api/projects/imports/validate", {
        rows: normalizeImportRows(rows),
      })
    ).data;
  },
  commitImport: async (importId: string, request: ImportCommitRequest) =>
    (
      await apiClient.post<ImportCommitResult>(
        `/api/projects/imports/${importId}/commit`,
        request,
      )
    ).data,
  list: async (filters: ProjectFilters | string, legacyPage?: number) => {
    const params: ProjectFilters =
      typeof filters === "string"
        ? { status: filters || undefined, page: legacyPage ?? 1, pageSize: 20 }
        : filters;
    return (
      await apiClient.get<Paged<ProjectSummary>>("/api/projects", { params })
    ).data;
  },
  detail: async (externalId: string) =>
    (await apiClient.get<ProjectDetail>(`/api/projects/${externalId}`)).data,
  statuses: async () =>
    (await apiClient.get<ProjectStatus[]>("/api/projects/statuses")).data,
  create: async (input: ProjectInput) =>
    (
      await apiClient.post<ProjectDetail>("/api/projects", {
        ...input,
        clientRequestId: id(),
      })
    ).data,
  update: async (project: ProjectDetail, input: ProjectInput) =>
    (
      await apiClient.put<MessageResponse>(
        `/api/projects/${project.externalId}`,
        { ...input, expectedUpdatedAtUtc: project.updatedAtUtc },
      )
    ).data,
  changeStatus: async (externalId: string, statusId: number) =>
    (
      await apiClient.patch<MessageResponse>(
        `/api/projects/${externalId}/status`,
        { statusId, clientRequestId: id() },
      )
    ).data,
  remove: async (externalId: string) =>
    (await apiClient.delete<MessageResponse>(`/api/projects/${externalId}`))
      .data,
  materials: async (externalId: string) =>
    (
      await apiClient.get<{ items: Material[] }>(
        `/api/projects/${externalId}/materials-summary`,
      )
    ).data.items,
  attachments: async (externalId: string) =>
    (
      await apiClient.get<Attachment[]>(
        `/api/projects/${externalId}/attachments`,
      )
    ).data,
  downloadAttachmentsArchive: async (externalId: string) => {
    const response = await apiClient.get<Blob>(
      `/api/projects/${externalId}/attachments/archive`,
      { responseType: "blob" },
    );
    const disposition = String(response.headers["content-disposition"] ?? "");
    const matched = disposition.match(
      /filename\*?=(?:UTF-8''|["']?)([^"';]+)/i,
    )?.[1];
    return {
      blob: response.data,
      fileName: matched
        ? decodeURIComponent(matched)
        : `adjuntos-proyecto-${externalId}.zip`,
    };
  },
  attachmentOptions: async () =>
    (await apiClient.get<AttachmentOptions>("/api/project-attachments/options"))
      .data,
  upload: async (externalId: string, input: AttachmentUpload) => {
    const body = new FormData();
    body.append("file", input.file);
    body.append("attachmentType", input.attachmentType);
    body.append("caption", input.caption);
    body.append("isCover", String(input.isCover));
    body.append("visitExternalId", input.visitExternalId);
    body.append("occurredAtUtc", input.occurredAtUtc);
    body.append("clientRequestId", id());
    return (
      await apiClient.post(`/api/projects/${externalId}/attachments`, body)
    ).data;
  },
  deleteAttachment: async (projectId: string, attachmentId: string) =>
    (
      await apiClient.delete(
        `/api/projects/${projectId}/attachments/${attachmentId}`,
      )
    ).data,
  setCover: async (projectId: string, attachmentId: string) =>
    (
      await apiClient.put<MessageResponse>(
        `/api/projects/${projectId}/attachments/${attachmentId}/cover`,
        { clientRequestId: id() },
      )
    ).data,
  timeline: async (externalId: string) =>
    (
      await apiClient.get<Paged<TimelineItem>>(
        `/api/projects/${externalId}/timeline`,
        { params: { page: 1, pageSize: 50 } },
      )
    ).data,
  notes: async (id: string) =>
    (await apiClient.get<ProjectNote[]>(`/api/projects/${id}/notes`)).data,
  addNote: async (id: string, content: string) =>
    (
      await apiClient.post(`/api/projects/${id}/notes`, {
        content,
        occurredAtUtc: new Date().toISOString(),
        clientRequestId: crypto.randomUUID(),
      })
    ).data,
  reminders: async (id: string) =>
    (await apiClient.get<ProjectReminder[]>(`/api/projects/${id}/reminders`))
      .data,
  addReminder: async (id: string, text: string, reminderAtUtc: string) =>
    (
      await apiClient.post(`/api/projects/${id}/reminders`, {
        text,
        reminderAtUtc,
        assignedToId: null,
        clientRequestId: crypto.randomUUID(),
      })
    ).data,
  completeReminder: async (id: string, reminderId: string) =>
    (
      await apiClient.patch(
        `/api/projects/${id}/reminders/${reminderId}/complete`,
        { clientRequestId: crypto.randomUUID() },
      )
    ).data,
  rescheduleReminder: async (
    id: string,
    reminderId: string,
    reminderAtUtc: string,
  ) =>
    (
      await apiClient.patch(
        `/api/projects/${id}/reminders/${reminderId}/reschedule`,
        { reminderAtUtc },
      )
    ).data,
  visits: async (id: string) =>
    (await apiClient.get<ProjectVisit[]>(`/api/projects/${id}/visits`)).data,
};
