import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { operationSettingsApi } from "../api/operationSettingsApi";
import { toOperationTerms } from "../services/operationTerms";

export const operationSettingsQueryKey = ["operation-settings"];

/**
 * The company's operation settings, loaded once per session (the cache is cleared on logout).
 * Mutations update the cache, so the menu and pages follow without a reload.
 */
export function useOperationSettings() {
  const { user, can } = useAuthorization();
  return useQuery({
    queryKey: operationSettingsQueryKey,
    queryFn: operationSettingsApi.current,
    enabled: Boolean(user) && can("companies.read"),
    staleTime: Infinity,
  });
}

/** Labels and modules for the company's industry; "general" defaults while loading or on failure. */
export function useOperationTerms() {
  const { data } = useOperationSettings();
  return useMemo(() => toOperationTerms(data), [data]);
}
