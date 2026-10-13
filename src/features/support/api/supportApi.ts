import { apiClient } from "@/lib/api/apiClient";
import type { SupportCategory } from "../services/supportMail";

export interface SupportRequestInput {
  category: SupportCategory;
  subject: string;
  message: string;
  includeTechnicalData: boolean;
  /** Only sent with the technical data; the API takes the user and company from the session. */
  context?: { page?: string; browser?: string };
  /** Kept between retries of the same message so it is not registered twice. */
  clientRequestId: string;
}

export interface SupportRequestCreated {
  reference: string;
  message: string;
}

export const supportApi = {
  create: async ({ context, ...input }: SupportRequestInput) =>
    (
      await apiClient.post<SupportRequestCreated>("/api/support/requests", {
        ...input,
        subject: input.subject.trim(),
        message: input.message.trim(),
        context: input.includeTechnicalData ? context : undefined,
      })
    ).data,
  /** Sent after the request exists, so a failed upload never loses the message. */
  uploadAttachments: async (reference: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    await apiClient.post(
      `/api/support/requests/${encodeURIComponent(reference)}/attachments`,
      form,
    );
  },
};
