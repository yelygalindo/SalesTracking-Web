import type { PropsWithChildren, ReactNode } from "react";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";

export function PermissionGuard({
  permission,
  fallback = null,
  children,
}: PropsWithChildren<{ permission: string; fallback?: ReactNode }>) {
  return useAuthorization().can(permission) ? children : fallback;
}
