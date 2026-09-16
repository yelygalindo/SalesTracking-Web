import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createAuthorization } from "@/features/auth/services/authorization";

export function useAuthorization() {
  const auth = useAuth();
  const policy = useMemo(() => createAuthorization(auth.user), [auth.user]);

  return {
    ...auth,
    company: auth.user?.company ?? null,
    roles: auth.user?.roles ?? [],
    permissions: auth.user?.permissions ?? [],
    ...policy,
  };
}
