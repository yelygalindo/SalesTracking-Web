import { apiClient, publicApiClient } from "@/lib/api/apiClient";

export interface Invitation {
  externalId: string;
  emailStatus: string;
  email: string;
  message: string;
  expiresAtUtc: string;
}
export interface ManagedInvitation {
  externalId: string;
  email: string;
  fullName: string;
  roleCode: string;
  invitedBy: string;
  emailStatus: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  createdAtUtc: string;
  expiresAtUtc: string;
  emailLastAttemptAtUtc: string | null;
  acceptedAtUtc: string | null;
  cancelledAtUtc: string | null;
}
export interface InvitationHistoryItem {
  type: "created" | "email_attempt" | "accepted" | "expired" | "cancelled";
  occurredAtUtc: string;
  detail: string | null;
}
export interface InvitationHistory {
  invitation: ManagedInvitation;
  events: InvitationHistoryItem[];
}
export interface InvitationInfo {
  email: string;
  fullName: string;
  roleCode: string;
  invitedBy: string;
  companyId: string;
  companyName: string;
  expiresAtUtc: string;
}
export interface CompanyResult {
  companyExternalId: string;
  adminInvitationExternalId: string;
  adminEmail: string;
  invitationExpiresAtUtc: string;
  emailStatus: string;
  message: string;
}

export const adminApi = {
  invite: async (input: { email: string; fullName: string; roleCode: string }) =>
    (await apiClient.post<Invitation>("/api/invitations", input)).data,
  invitations: async () =>
    (await apiClient.get<ManagedInvitation[]>("/api/invitations")).data,
  invitationHistory: async (externalId: string) =>
    (await apiClient.get<InvitationHistory>(`/api/invitations/manage/${externalId}/history`)).data,
  resend: async (id: string) =>
    (await apiClient.post<Invitation>(`/api/invitations/${id}/resend`)).data,
  cancel: async (id: string) =>
    (await apiClient.post<{ message: string }>(`/api/invitations/${id}/cancel`)).data,
  registerCompany: async (input: { companyName: string; adminFullName: string; adminEmail: string }) =>
    (await apiClient.post<CompanyResult>("/api/companies/register", input)).data,
  resendAdmin: async (id: string) =>
    (await apiClient.post<CompanyResult>(`/api/companies/${id}/admin-invitation/resend`)).data,
  invitation: async (token: string) =>
    (await publicApiClient.get<InvitationInfo>(`/api/invitations/${token}`)).data,
  accept: async (input: { token: string; password: string; fullNameUser: string }) =>
    (await publicApiClient.post<{ message: string; externalUserId: string }>("/api/invitations/accept", input)).data,
};
