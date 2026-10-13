import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardCopy,
  LifeBuoy,
  Mail,
  Paperclip,
  Send,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import type { ShellOutletContext } from "@/components/layout/navigation";
import { notify } from "@/components/feedback/toast";
import { env } from "@/config/env";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { translateValue } from "@/lib/i18n/labels";
import { AppError } from "@/lib/api/apiError";
import { supportApi } from "../api/supportApi";
import {
  buildSupportMail,
  describeBrowser,
  maxMessageLength,
  supportCategories,
  supportMailHref,
  type SupportCategory,
} from "../services/supportMail";

const minMessageLength = 10;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SupportPage() {
  const { user } = useAuthorization();
  const { previousPage } = useOutletContext<ShellOutletContext>() ?? {};
  const supportEmail = env.supportEmail;
  const [category, setCategory] = useState<SupportCategory>("technical"),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [includeContext, setIncludeContext] = useState(true),
    [touched, setTouched] = useState({ subject: false, message: false }),
    [opened, setOpened] = useState(false),
    [sent, setSent] = useState<string | null>(null),
    // Same id while the message is retried, a new one once it was registered.
    [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  const browser = describeBrowser(navigator.userAgent);

  const errors = {
    subject: subject.trim() ? null : "Escribe un asunto breve.",
    message:
      message.trim().length >= minMessageLength
        ? null
        : "Cuéntanos un poco más (al menos 10 caracteres).",
  };
  const mail = buildSupportMail({
    category,
    subject,
    message,
    context:
      includeContext && user
        ? {
            userName: user.fullName,
            userEmail: user.email,
            company: user.company.name,
            roles: user.roles.map((role) => translateValue(role)),
            page: previousPage,
            browser,
            sentAt: new Date().toLocaleString("es-BO"),
          }
        : undefined,
  });

  const validate = () => {
    setTouched({ subject: true, message: true });
    return !errors.subject && !errors.message;
  };

  const openMail = () => {
    if (!supportEmail || !validate()) return;
    window.location.href = supportMailHref(supportEmail, mail);
    setSent(null);
    setOpened(true);
  };

  const send = useMutation({
    mutationFn: () =>
      supportApi.create({
        category,
        subject,
        message,
        includeTechnicalData: includeContext,
        context: { page: previousPage, browser },
        clientRequestId,
      }),
    onSuccess: ({ reference }) => {
      setSent(reference);
      setOpened(false);
      setSubject("");
      setMessage("");
      setTouched({ subject: false, message: false });
      setClientRequestId(crypto.randomUUID());
    },
    onError: (error: Error) => {
      // Servers without the support endpoint yet: fall back to the mail client.
      if (error instanceof AppError && error.code === "notFound" && supportEmail)
        return openMail();
      notify(error.message, "error");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validate()) send.mutate();
  };

  const copyAddress = async () => {
    if (!supportEmail) return;
    const copied = await copyText(supportEmail);
    notify(
      copied ? "Correo de soporte copiado." : "No pudimos copiar el correo.",
      copied ? "success" : "error",
    );
  };

  const fieldError = (key: "subject" | "message") =>
    touched[key] ? errors[key] : null;

  return (
    <main className="customers-content support-page">
      <PageHeader
        eyebrow="Ayuda"
        title="Ayuda y soporte"
        description="Cuéntanos qué necesitas y el equipo de soporte te responderá a tu correo."
      />
      <div className="support-layout">
        <form className="support-card support-form" onSubmit={submit} noValidate>
          <fieldset className="support-categories">
            <legend>Tipo de consulta</legend>
            {supportCategories.map((item) => (
              <label
                key={item.value}
                className={category === item.value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="category"
                  value={item.value}
                  checked={category === item.value}
                  onChange={() => setCategory(item.value)}
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          <label className={fieldError("subject") ? "field-error" : ""}>
            Asunto *
            <input
              value={subject}
              maxLength={150}
              placeholder="Ej.: No puedo registrar una visita"
              onChange={(event) => setSubject(event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, subject: true }))}
              aria-invalid={Boolean(fieldError("subject"))}
            />
            {fieldError("subject") && (
              <small role="alert">{fieldError("subject")}</small>
            )}
          </label>

          <label className={fieldError("message") ? "field-error" : ""}>
            Mensaje *
            <textarea
              value={message}
              rows={7}
              maxLength={maxMessageLength}
              placeholder="Describe qué intentabas hacer, qué esperabas que pasara y qué ocurrió."
              onChange={(event) => setMessage(event.target.value)}
              onBlur={() => setTouched((value) => ({ ...value, message: true }))}
              aria-invalid={Boolean(fieldError("message"))}
              aria-describedby="support-message-count"
            />
            <span className="support-field-footer">
              {fieldError("message") ? (
                <small role="alert">{fieldError("message")}</small>
              ) : (
                <span />
              )}
              <small id="support-message-count" className="support-count">
                {message.length}/{maxMessageLength}
              </small>
            </span>
          </label>

          <label className="support-check">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(event) => setIncludeContext(event.target.checked)}
            />
            <span>
              <strong>Incluir datos técnicos</strong>
              <small>
                Tu usuario, empresa, rol, la página donde estabas y el navegador.
              </small>
            </span>
          </label>
          {includeContext && (
            <details className="support-preview">
              <summary>Ver lo que recibirá soporte</summary>
              <pre>{mail.body || "Escribe tu mensaje para ver la vista previa."}</pre>
            </details>
          )}

          {sent && (
            <div className="support-notice success" role="status">
              <CheckCircle2 aria-hidden="true" />
              <p>
                Recibimos tu consulta. Tu número de referencia es{" "}
                <strong>{sent}</strong>; te responderemos a{" "}
                <strong>{user?.email}</strong>.
              </p>
            </div>
          )}
          {opened && (
            <div className="support-notice success" role="status">
              <CheckCircle2 aria-hidden="true" />
              <p>
                Abrimos tu programa de correo con el mensaje listo: revísalo y
                presiona <strong>Enviar</strong>. ¿No se abrió? Escríbenos a{" "}
                <strong>{supportEmail}</strong>.
              </p>
            </div>
          )}

          <footer className="support-actions">
            {supportEmail && (
              <button
                type="button"
                className="secondary-button"
                onClick={openMail}
              >
                <Mail aria-hidden="true" /> Usar mi correo
              </button>
            )}
            <button
              type="submit"
              className="action-primary"
              disabled={send.isPending}
            >
              <Send aria-hidden="true" />
              {send.isPending ? "Enviando…" : "Enviar consulta"}
            </button>
          </footer>
        </form>

        <aside className="support-side">
          <section className="support-card support-contact">
            <span className="support-icon" aria-hidden="true">
              <LifeBuoy />
            </span>
            <h2>Escríbenos directamente</h2>
            {supportEmail ? (
              <>
                <p>También puedes enviarnos un correo desde cualquier aplicación.</p>
                <div className="support-address">
                  <a href={`mailto:${supportEmail}`}>
                    <Mail aria-hidden="true" />
                    {supportEmail}
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    aria-label="Copiar correo de soporte"
                    title="Copiar correo"
                  >
                    <ClipboardCopy aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <p>Consulta con el administrador de tu empresa cuál es el canal de soporte.</p>
            )}
          </section>
          <section className="support-card support-tips">
            <h2>Para ayudarte más rápido</h2>
            <ul>
              <li>Indica los pasos que seguiste antes del problema.</li>
              <li>Menciona el contacto, seguimiento o entrega involucrado.</li>
              <li>
                <Paperclip aria-hidden="true" /> ¿Quieres adjuntar una captura?
                Usa <strong>Usar mi correo</strong> y agrégala antes de enviarlo.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
