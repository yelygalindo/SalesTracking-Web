import { Navigate, Outlet } from "react-router-dom";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";

type PermissionRouteProps =
  | { permission: string; anyOf?: never; allOf?: never }
  | { permission?: never; anyOf: readonly string[]; allOf?: never }
  | { permission?: never; anyOf?: never; allOf: readonly string[] };

export function PermissionRoute({
  permission,
  anyOf,
  allOf,
}: PermissionRouteProps) {
  const authorization = useAuthorization();
  const allowed = permission
    ? authorization.can(permission)
    : anyOf
      ? authorization.canAny(anyOf)
      : authorization.canAll(allOf ?? []);
  return allowed ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
