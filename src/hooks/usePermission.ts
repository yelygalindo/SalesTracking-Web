import { useAuthorization } from "@/features/auth/hooks/useAuthorization";

export function usePermission(permission: string) {
  return useAuthorization().can(permission);
}
