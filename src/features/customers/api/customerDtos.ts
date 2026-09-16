export interface CustomerSellerDto {
  id: number | null;
  externalId: string | null;
  name: string | null;
}

export interface CustomerSummaryDto {
  id: number;
  externalId: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
  seller: CustomerSellerDto;
  lastContactAtUtc?: string | null;
  nextContactAtUtc?: string | null;
}

export interface CustomersResponseDto {
  customers: CustomerSummaryDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CustomerStatusDto {
  value: number;
  label: string;
}

export interface CustomerDetailDto extends CustomerSummaryDto {
  statusId: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  updatedAtUtc: string;
  notes: unknown[];
  reminders: unknown[];
}

export interface CustomerInputDto {
  name: string;
  companyName: string;
  phone: string;
  email: string | null;
  sellerExternalId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CustomerCreateExtrasDto {
  statusId: number | null;
  initialNote: string;
  reminderText: string;
  reminderAtUtc: string;
}

export interface CreateCustomerDto extends CustomerInputDto {
  clientRequestId: string;
}
export interface UpdateCustomerDto extends CustomerInputDto {
  expectedUpdatedAtUtc: string;
}
export interface ChangeCustomerStatusDto {
  statusId: number;
  clientRequestId: string;
}
export interface IdMessageDto {
  id: string;
  message: string;
}
export interface SellerDto {
  externalId: string;
  displayName: string;
  email: string;
}
export interface CustomerNoteDto {
  id: number;
  externalId: string;
  text: string;
  author: CustomerSellerDto;
  createdAt: string;
  occurredAtUtc: string;
  receivedAtUtc: string;
}
export interface CustomerReminderDto {
  id: number;
  externalId: string;
  text: string;
  reminderAt: string;
  assignedTo: CustomerSellerDto;
  completed: boolean;
}
export interface CustomerTimelineDto {
  externalId: string;
  eventType: string;
  description: string | null;
  createdAtUtc: string;
  createdBy: { externalId: string; name: string | null } | null;
}
export interface TimelineResponseDto {
  items: CustomerTimelineDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
