import { useCallback, useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

/**
 * Warns before losing unsaved form changes: on route changes (via the router blocker),
 * on reload or tab close (beforeunload) and on in-page exits wrapped with `confirmLeave`.
 */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmLeave = useCallback(
    (leave: () => void) => {
      if (dirty) setPending(() => leave);
      else leave();
    },
    [dirty],
  );

  const open = blocker.state === "blocked" || pending !== null;
  const dialog = (
    <ConfirmDialog
      open={open}
      title="Tienes cambios sin guardar"
      description="Si sales ahora, se perderán los cambios que hiciste en este formulario."
      confirmLabel="Salir sin guardar"
      cancelLabel="Seguir editando"
      onConfirm={() => {
        if (blocker.state === "blocked") blocker.proceed();
        pending?.();
        setPending(null);
      }}
      onCancel={() => {
        if (blocker.state === "blocked") blocker.reset();
        setPending(null);
      }}
    />
  );

  return { confirmLeave, dialog };
}
