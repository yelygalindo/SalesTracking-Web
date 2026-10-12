import { publicApiClient } from "@/lib/api/apiClient";

export interface TrialSignupInput {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  companyName: string;
  industry: string;
  captchaToken: string;
}

export interface TrialSignupCreated {
  email: string;
  verificationExpiresAtUtc: string;
  emailStatus: string;
  message: string;
}

export interface PendingTrialSignup {
  fullName: string;
  email: string;
  companyName: string;
  expiresAtUtc: string;
}

export interface TrialVerification {
  companyExternalId: string;
  companyName: string;
  email: string;
  trialEndsAtUtc: string;
  message: string;
}

export const trialSignupApi = {
  create: async (input: TrialSignupInput) =>
    (await publicApiClient.post<TrialSignupCreated>("/api/trial-signups", input)).data,
  pending: async (token: string) =>
    (await publicApiClient.get<PendingTrialSignup>(`/api/trial-signups/${encodeURIComponent(token)}`)).data,
  verify: async (input: { token: string; password: string; confirmPassword: string }) =>
    (await publicApiClient.post<TrialVerification>("/api/trial-signups/verify", input)).data,
};
