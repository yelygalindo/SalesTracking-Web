import { apiClient } from "@/lib/api/apiClient";

export interface SellerReminder {
  externalId: string;
  text: string;
  reminderAtUtc: string;
  completed: boolean;
  customerExternalId: string;
  customerName: string;
}

export interface ReminderFilters {
  from: string;
  to: string;
  completed?: boolean;
}

export const reminderApi = {
  list: async (filters: ReminderFilters) =>
    (
      await apiClient.get<SellerReminder[]>("/api/reminders", {
        params: filters,
      })
    ).data,
  complete: async (reminder: SellerReminder) =>
    (
      await apiClient.patch(
        `/api/customers/${reminder.customerExternalId}/reminders/${reminder.externalId}/complete`,
        { clientRequestId: crypto.randomUUID() },
      )
    ).data,
  reschedule: async (reminder: SellerReminder, reminderAtUtc: string) =>
    (
      await apiClient.patch(
        `/api/customers/${reminder.customerExternalId}/reminders/${reminder.externalId}/reschedule`,
        { reminderAtUtc },
      )
    ).data,
};
