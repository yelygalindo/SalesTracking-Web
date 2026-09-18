import { apiClient } from "@/lib/api/apiClient";

export interface ManagedUser {
  externalId: string;
  fullName: string;
  email: string;
  username: string;
  isActive: boolean;
  createdAtUtc: string;
  roles: string[];
}
export interface ManagedRole {
  code: string;
  name: string;
  permissions: string[];
}
export interface ManagedPermission {
  code: string;
  description: string;
}
export interface ManagedUserPage {
  items: ManagedUser[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const userAdminApi = {
  list: async (params: {
    search?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) => (await apiClient.get<ManagedUserPage>("/api/users", { params })).data,
  detail: async (id: string) =>
    (await apiClient.get<ManagedUser>(`/api/users/${id}`)).data,
  roles: async () => (await apiClient.get<ManagedRole[]>("/api/roles")).data,
  permissions: async () =>
    (await apiClient.get<ManagedPermission[]>("/api/permissions")).data,
  status: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/api/users/${id}/status`, { isActive })).data,
  updateRoles: async (id: string, roleCodes: string[]) =>
    (await apiClient.put(`/api/users/${id}/roles`, { roleCodes })).data,
};
