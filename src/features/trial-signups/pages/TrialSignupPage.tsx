import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { FormField } from "@/components/forms/FormField";
import { env } from "@/config/env";
import { errorMessage } from "@/lib/api/errorMessage";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { Brand } from "@/presentation/components/Brand";
import { trialSignupApi } from "../api/trialSignupApi";
import { TurnstileWidget } from "../components/TurnstileWidget";
import {
  emptyTrialSignup,
  industrySuggestions,
  invalidTrialSignupFields,
  trialSignupValidators,
  type TrialSignupField,
  type TrialSignupForm,
} from "../services/trialSignupValidation";

const fields: { key: TrialSignupField; label: string; type?: string; autoComplete?: string; placeholder?: string; maxLength: number }[] = [
  { key: "fullName", label: "Nombre completo", autoComplete: "name", maxLength: 200 },
  { key: "email", label: "Correo de trabajo", type: "email", autoComplete: "email", placeholder: "nombre@empresa.com", maxLength: 200 },
  { key: "phone", label: "Teléfono", type: "tel", autoComplete: "tel", placeholder: "+591 70000000", maxLength: 30 },
  { key: "companyName", label: "Empresa", autoComplete: "organization", maxLength: 200 },
  { key: "industry", label: "Rubro", placeholder: "Ej. Construcción", maxLength: 100 },
  { key: "city", label: "Ciudad", autoComplete: "address-level2", maxLength: 100 },
  { key: "country", label: "País", autoComplete: "country-name", maxLength: 100 },
];

export function TrialSignupPage() {
  const [form, setForm] = useState<TrialSignupForm>(emptyTrialSignup);
  // Fields are validated once the user leaves them, so errors never appear mid-typing.
  const [touched, setTouched] = useState<Partial<Record<TrialSignupField, boolean>>>({});
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const [captchaMissing, setCaptchaMissing] = useState(false);
  const signup = useMutation({
    mutationFn: () => trialSignupApi.create({ ...form, captchaToken }),
    onError: () => {
      // Turnstile tokens are single use, so every failed attempt needs a new challenge.
      setCaptchaToken("");
      setCaptchaAttempt((value) => value + 1);
    },
  });
  const errorFor = (key: TrialSignupField) => (touched[key] ? trialSignupValidators[key](form[key]) : null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = invalidTrialSignupFields(form);
    if (invalid.length) {
      setTouched(Object.fromEntries(invalid.map((key) => [key, true])));
      return;
    }
    if (env.turnstileSiteKey && !captchaToken) {
      setCaptchaMissing(true);
      return;
    }
    signup.mutate();
  };

  if (signup.data)
    return (
      <main className="simple-auth-page">
        <section className="simple-auth-card trial-sent">
          <Brand />
          <span className="trial-sent-icon">
            <MailCheck aria-hidden="true" />
          </span>
          <p className="overline">Prueba gratuita</p>
          <h1>Revisa tu correo</h1>
          <p className="success-message" role="status">
            {signup.data.message}
          </p>
          <p>
            Enviamos el enlace de activación a <strong>{signup.data.email}</strong>. Ábrelo antes del{" "}
            {formatDateTime(signup.data.verificationExpiresAtUtc)} para crear tu contraseña y empezar
            tus 10 días de prueba.
          </p>
          <p className="form-hint">¿No lo encuentras? Revisa la carpeta de spam o correo no deseado.</p>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              signup.reset();
              setCaptchaAttempt((value) => value + 1);
            }}
          >
            Usar otro correo
          </button>
          <Link className="back-link" to="/login">
            Ir a iniciar sesión
          </Link>
        </section>
      </main>
    );

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card trial-card">
        <Brand />
        <p className="overline">Prueba gratuita</p>
        <h1>Prueba UrbanTrack 10 días</h1>
        <p>Registra tu empresa sin costo. Te enviaremos un correo para activar tu cuenta de administrador.</p>
        <form className="simple-form trial-form" onSubmit={submit} noValidate>
          {fields.map((field) => (
            <FormField key={field.key} label={field.label} required error={errorFor(field.key) ?? undefined}>
              <input
                name={field.key}
                type={field.type ?? "text"}
                required
                maxLength={field.maxLength}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                list={field.key === "industry" ? "industry-suggestions" : undefined}
                aria-invalid={!!errorFor(field.key)}
                value={form[field.key]}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                onBlur={() => setTouched((current) => ({ ...current, [field.key]: true }))}
              />
            </FormField>
          ))}
          <datalist id="industry-suggestions">
            {industrySuggestions.map((industry) => (
              <option key={industry} value={industry} />
            ))}
          </datalist>
          {env.turnstileSiteKey && (
            <TurnstileWidget
              key={captchaAttempt}
              siteKey={env.turnstileSiteKey}
              onToken={(token) => {
                setCaptchaToken(token);
                if (token) setCaptchaMissing(false);
              }}
            />
          )}
          {captchaMissing && (
            <p className="form-error" role="alert">
              Completa la verificación de seguridad para continuar.
            </p>
          )}
          {signup.error && (
            <p className="form-error" role="alert">
              {errorMessage(signup.error)}
            </p>
          )}
          <button className="primary-button" disabled={signup.isPending}>
            {signup.isPending ? "Enviando…" : "Comenzar prueba gratuita"}
          </button>
        </form>
        <p className="trial-login">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
