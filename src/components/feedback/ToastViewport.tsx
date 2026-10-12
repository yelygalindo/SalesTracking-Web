import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import type { ToastDetail } from "./toast";

type Toast = ToastDetail & { id: number };

export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));

  useEffect(() => {
    let sequence = 0;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail,
        id = Date.now() + sequence++;
      setToasts((current) => [...current, { ...detail, id }]);
      // Toasts with an action stay longer so there is time to use it.
      window.setTimeout(() => dismiss(id), detail.action ? 7000 : 4000);
    };
    window.addEventListener("urbantrack:toast", handler);
    return () => window.removeEventListener("urbantrack:toast", handler);
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((toast) => (
        <div
          className={`toast ${toast.tone}`}
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.tone === "error" ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.onAction();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            aria-label="Cerrar aviso"
            onClick={() => dismiss(toast.id)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
