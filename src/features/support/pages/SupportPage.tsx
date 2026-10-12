import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ClipboardCopy,
  Info,
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
import {
  buildSupportMail,
  describeBrowser,
  maxMessageLength,
  supportCategories,
  supportMailHref,
  supportMailText,
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
    [opened, setOpened] = useState(false);

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
            browser: describeBrowser(navigator.userAgent),
            sentAt: new Date().toLocaleString("es-BO"),
          }
        : undefined,
  });

  const validate = () => {
    setTouched({ subject: true, message: true });
    return !errors.subject && !errors.message;
  };

  const openMail = (event: FormEvent) => {
    event.preventDefault();
    if (!supportEmail || !validate()) return;
    window.location.href = supportMailHref(supportEmail, mail);
    setOpened(true);
  };

  const copyMail = async () => {
    if (!validate()) return;
    const copied = await copyText(
      supportMailText(supportEmail ?? "(correo de soporte)", mail),
    );
    notify(
      copied
        ? "Mensaje copiado. Pégalo en un correo nuevo y envíalo."
        : "No pudimos copiar el mensaje. Selecciónalo y cópialo manualmente.",
      copied ? "success" : "error",
    );
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
        description="Cuéntanos qué necesitas y prepararemos el correo para el equipo de soporte con los datos que nos ayudan a responderte más rápido."
      />
      <div className="support-layout">
        <form className="support-card support-form" onSubmit={openMail} noValidate>
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
              maxLength={120}
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
              <summary>Ver el correo que se enviará</summary>
              <pre>{mail.body || "Escribe tu mensaje para ver la vista previa."}</pre>
            </details>
          )}

          {opened && (
            <div className="support-notice success" role="status">
              <CheckCircle2 aria-hidden="true" />
              <p>
                Abrimos tu programa de correo con el mensaje listo: revísalo y
                presiona <strong>Enviar</strong>. ¿No se abrió? Usa{" "}
                <strong>Copiar mensaje</strong> y envíalo desde tu correo web a{" "}
                <strong>{supportEmail}</strong>.
              </p>
            </div>
          )}
          {!supportEmail && (
            <div className="support-notice" role="note">
              <Info aria-hidden="true" />
              <p>
                El correo de soporte aún no está configurado en esta instalación.
                Puedes copiar el mensaje y enviarlo al responsable de UrbanTrack
                en tu empresa.
              </p>
            </div>
          )}

          <footer className="support-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void copyMail()}
            >
              <ClipboardCopy aria-hidden="true" /> Copiar mensaje
            </button>
            <button
              type="submit"
              className="action-primary"
              disabled={!supportEmail}
            >
              <Send aria-hidden="true" /> Abrir mi correo
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
                <Paperclip aria-hidden="true" /> Adjunta una captura de pantalla
                en tu correo antes de enviarlo.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
