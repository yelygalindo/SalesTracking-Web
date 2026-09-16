import type { AuthUser } from "@/features/auth/types/authTypes";

export interface AuthorizationPolicy {
  can(permission: string): boolean;
  canAny(permissions: readonly string[]): boolean;
  canAll(permissions: readonly string[]): boolean;
  hasRole(role: string): boolean;
}

const normalize = (value: string) => value.trim().toLowerCase();

export function createAuthorization(
  user: AuthUser | null,
): AuthorizationPolicy {
  const permissions = new Set((user?.permissions ?? []).map(normalize));
  const roles = new Set((user?.roles ?? []).map(normalize));

  return {
    can: (permission) => permissions.has(normalize(permission)),
    canAny: (required) =>
      required.some((permission) => permissions.has(normalize(permission))),
    canAll: (required) =>
      required.length > 0 &&
      required.every((permission) => permissions.has(normalize(permission))),
    hasRole: (role) => roles.has(normalize(role)),
  };
}
