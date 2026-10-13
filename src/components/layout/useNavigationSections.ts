import { useMemo } from "react";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import {
  buildNavigationSections,
  filterNavigation,
} from "@/components/layout/navigation";

/** The menu the current user can reach, in the company's terminology. */
export function useNavigationSections() {
  const { canAny, canAll, hasRole } = useAuthorization();
  const terms = useOperationTerms();
  return useMemo(
    () =>
      filterNavigation(
        buildNavigationSections(terms),
        { canAny, canAll, hasRole },
        terms.modules,
      ),
    [terms, canAny, canAll, hasRole],
  );
}
