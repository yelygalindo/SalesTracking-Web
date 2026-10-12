import { useEffect, useRef, useState } from "react";

interface TurnstileOptions {
  sitekey: string;
  language?: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: TurnstileOptions): string;
      remove(widgetId: string): void;
    };
  }
}

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoader: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  scriptLoader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoader = null;
      script.remove();
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptLoader;
}

/**
 * Cloudflare Turnstile challenge. Tokens are single use: remount it (change its key)
 * after each submission to get a fresh one.
 */
export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const tokenHandler = useRef(onToken);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    tokenHandler.current = onToken;
  });
  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    loadTurnstile()
      .then(() => {
        if (!active || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          language: "es",
          callback: (token) => tokenHandler.current(token),
          "expired-callback": () => tokenHandler.current(""),
          "error-callback": () => tokenHandler.current(""),
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);
  return (
    <div className="turnstile-field">
      <div ref={container} />
      {failed && (
        <p className="form-error" role="alert">
          No pudimos cargar la verificación de seguridad. Revisa tu conexión y recarga la página.
        </p>
      )}
    </div>
  );
}
