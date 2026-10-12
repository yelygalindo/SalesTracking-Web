import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type FilterPatch = Record<string, string | number | null | undefined>;

/**
 * Keeps list filters in the query string so they survive reloads, back navigation and
 * shared links. Changing any filter other than `page` sends the list back to page 1.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(
    () =>
      Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ""])) as Record<K, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys is a static list
    [params],
  );
  const page = Math.max(1, Number(params.get("page")) || 1);
  const update = useCallback(
    (patch: FilterPatch) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined || value === "") next.delete(key);
            else next.set(key, String(value));
          }
          if (!("page" in patch)) next.delete("page");
          if (next.get("page") === "1") next.delete("page");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setPage = useCallback((value: number) => update({ page: value }), [update]);
  return { values, page, update, setPage };
}
