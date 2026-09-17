import { apiClient } from "@/lib/api/apiClient";

export interface Item { externalId: string; productExternalId: string; productName: string; unitName: string; quantity: number; deliveredQuantity: number }
export interface Delivery { id: number; externalId: string; projectExternalId: string; projectName: string; sellerExternalId: string; sellerName: string; statusId: number; statusName: string; committedDateUtc: string; deliveredDateUtc: string | null; notes: string | null; createdAtUtc: string; updatedAtUtc: string | null; attachmentCount: number; items: Item[] }
export interface Status { deliveryStatusId: number; name: string; description: string; isActive: boolean }
export interface Input { projectExternalId: string; committedDateUtc: string; notes: string | null; items: { productExternalId: string; quantity: number }[] }
interface Page { items: Delivery[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface ReceiptResult { id?: string | null; message: string; updatedAtUtc: string; receiptExternalId: string | null }
export interface DeliveryAttachment { externalId: string; receiptExternalId: string; fileName: string; contentType: string; sizeBytes: number; attachmentType: string; caption: string | null; downloadUrl: string; uploadedByUserName: string; createdAtUtc: string }
export interface DeliveryAttachmentsResponse { items: DeliveryAttachment[]; failedFiles: string[]; message?: string | null }
export interface DeliveryAttachmentOptions { maxFileSizeBytes: number; maxFilesPerReceipt: number; attachmentTypes: { value: string; label: string; description: string }[]; acceptedFormats: { description: string; extensions: string[]; contentTypes: string[] }[] }

const uuid = () => crypto.randomUUID();
const blobResult = (response: { data: Blob; headers: Record<string, unknown> }, fallback: string) => {
  const disposition = String(response.headers["content-disposition"] ?? "");
  const matched = disposition.match(/filename\*?=(?:UTF-8''|["']?)([^"';]+)/i)?.[1];
  return { blob: response.data, fileName: matched ? decodeURIComponent(matched) : fallback };
};

export const deliveryApi = {
  list: async (statusId: number | undefined, page: number) => (await apiClient.get<Page>("/api/deliveries", { params: { statusId, page, pageSize: 20 } })).data,
  detail: async (id: string) => (await apiClient.get<Delivery>(`/api/deliveries/${id}`)).data,
  statuses: async () => (await apiClient.get<Status[]>("/api/delivery-statuses")).data,
  create: async (input: Input) => (await apiClient.post("/api/deliveries", { ...input, clientRequestId: uuid() })).data,
  update: async (delivery: Delivery, input: Input) => (await apiClient.put(`/api/deliveries/${delivery.externalId}`, { ...input, clientRequestId: uuid(), expectedUpdatedAtUtc: delivery.updatedAtUtc })).data,
  status: async (delivery: Delivery, statusId: number) => (await apiClient.patch(`/api/deliveries/${delivery.externalId}/status`, { statusId, deliveredDateUtc: null, clientRequestId: uuid(), expectedUpdatedAtUtc: delivery.updatedAtUtc })).data,
  receipt: async (delivery: Delivery, quantities: Record<string, number>) => (await apiClient.post<ReceiptResult>(`/api/deliveries/${delivery.externalId}/receipts`, { receivedAtUtc: new Date().toISOString(), notes: null, clientRequestId: uuid(), expectedUpdatedAtUtc: delivery.updatedAtUtc, items: delivery.items.map((item) => ({ deliveryItemExternalId: item.externalId, receivedQuantity: quantities[item.externalId] || 0 })) })).data,
  attachmentOptions: async () => (await apiClient.get<DeliveryAttachmentOptions>("/api/deliveries/attachment-options")).data,
  attachments: async (deliveryId: string) => (await apiClient.get<DeliveryAttachmentsResponse>(`/api/deliveries/${deliveryId}/attachments`)).data,
  uploadAttachments: async (deliveryId: string, receiptId: string, files: File[], attachmentType: string, caption: string) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("attachmentType", attachmentType);
    if (caption.trim()) form.append("caption", caption.trim());
    return (await apiClient.post<DeliveryAttachmentsResponse>(`/api/deliveries/${deliveryId}/receipts/${receiptId}/attachments`, form)).data;
  },
  downloadAttachment: async (deliveryId: string, attachmentId: string, fallback: string) => blobResult(await apiClient.get<Blob>(`/api/deliveries/${deliveryId}/attachments/${attachmentId}/download`, { responseType: "blob" }), fallback),
  deleteAttachment: async (deliveryId: string, attachmentId: string) => (await apiClient.delete(`/api/deliveries/${deliveryId}/attachments/${attachmentId}`)).data,
  downloadArchive: async (deliveryId: string) => blobResult(await apiClient.get<Blob>(`/api/deliveries/${deliveryId}/attachments/archive`, { responseType: "blob" }), `entrega-${deliveryId}.zip`),
  downloadGroupedArchive: async (filter: { customerExternalId?: string; projectExternalId?: string }) => blobResult(await apiClient.get<Blob>("/api/deliveries/attachments/archive", { params: filter, responseType: "blob" }), "comprobantes-entregas.zip"),
  remove: async (id: string) => (await apiClient.delete(`/api/deliveries/${id}`)).data,
};
