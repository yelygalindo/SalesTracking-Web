import {
  customerApi,
  type CustomerFilters,
} from "@/features/customers/api/customerApi";
import type {
  CustomerDetailDto,
  CustomerInputDto,
} from "@/features/customers/api/customerDtos";
import { validateOptionalEmail } from "@/lib/validation/email";
import { AppError } from "@/lib/api/apiError";

function clean(input: CustomerInputDto): CustomerInputDto {
  const emailError = validateOptionalEmail(input.email);
  if (emailError) throw new AppError("validation", emailError, 400);
  return {
    name: input.name.trim(),
    companyName: input.companyName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    sellerExternalId: input.sellerExternalId?.trim() || null,
    address: input.address?.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export const customerService = {
  importCsv: (file: File) => customerApi.importCsv(file),
  exportCsv: () => customerApi.exportCsv(),
  list: (filters: CustomerFilters) => customerApi.list(filters),
  statuses: () => customerApi.statuses(),
  detail: (externalId: string) => customerApi.detail(externalId),
  create: (input: CustomerInputDto) =>
    customerApi.create({
      ...clean(input),
      clientRequestId: crypto.randomUUID(),
    }),
  update: (customer: CustomerDetailDto, input: CustomerInputDto) =>
    customerApi.update(customer.externalId, {
      ...clean(input),
      expectedUpdatedAtUtc: customer.updatedAtUtc,
    }),
  changeStatus: (externalId: string, statusId: number) =>
    customerApi.changeStatus(externalId, {
      statusId,
      clientRequestId: crypto.randomUUID(),
    }),
  remove: (externalId: string) => customerApi.remove(externalId),
  sellers: () => customerApi.sellers(),
  notes: (externalId: string) => customerApi.notes(externalId),
  addNote: (externalId: string, text: string) =>
    customerApi.addNote(externalId, text.trim()),
  reminders: (externalId: string) => customerApi.reminders(externalId),
  addReminder: (
    externalId: string,
    text: string,
    reminderAtUtc: string,
    assignedToId: string | null,
  ) =>
    customerApi.addReminder(
      externalId,
      text.trim(),
      reminderAtUtc,
      assignedToId,
    ),
  completeReminder: (externalId: string, reminderId: string) =>
    customerApi.completeReminder(externalId, reminderId),
  timeline: (externalId: string) => customerApi.timeline(externalId),
};
