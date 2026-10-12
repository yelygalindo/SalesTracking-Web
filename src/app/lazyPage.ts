import { lazy, type ComponentType } from "react";

const reloadKey = "urbantrack:chunk-reload";

/**
 * Lazily loads a named page export. After a deploy, old chunk names disappear from the
 * server; when a download fails we reload once so the browser picks up the new build.
 */
export function lazyPage<K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
) {
  return lazy(() =>
    load().then(
      (module) => {
        sessionStorage.removeItem(reloadKey);
        return { default: module[name] };
      },
      (error: unknown) => {
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
        throw error;
      },
    ),
  );
}
