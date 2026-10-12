import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormField } from "@/components/forms/FormField";
import { errorMessage } from "@/lib/api/errorMessage";
import { Brand } from "@/presentation/components/Brand";
import { trialSignupApi } from "../api/trialSignupApi";
import { validateNewPassword, validatePasswordConfirmation } from "../services/trialSignupValidation";

export interface TrialActivatedState {
  trialActivated: { email: string; message: string };
}

export function VerifyTrialPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const pending = useQuery({
    queryKey: ["trial-signup", token],
    queryFn: () => trialSignupApi.pending(token),
    enabled: !!token,
    retry: false,
  });
  const verify = useMutation({
    mutationFn: () => trialSignupApi.verify({ token, password, confirmPassword }),
    onSuccess: (result) =>
      navigate("/login", {
        replace: true,
        state: { trialActivated: { email: result.email, message: result.message } } satisfies TrialActivatedState,
      }),
  });
  const passwordError = touched.password ? validateNewPassword(password) : null;
  const confirmationError = touched.confirmPassword ? validatePasswordConfirmation(password, confirmPassword) : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    if (validateNewPassword(password) || validatePasswordConfirmation(password, confirmPassword)) return;
    verify.mutate();
  };

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <Brand />
        <p className="overline">Prueba gratuita</p>
        <h1>{pending.data ? `Activa ${pending.data.companyName}` : "Activa tu prueba"}</h1>
        {!token || pending.isError ? (
          <p className="form-error" role="alert">
            {pending.error ? errorMessage(pending.error) : "El enlace no contiene un token válido."}{" "}
            <Link to="/trial-signup">Solicita un nuevo registro</Link>.
          </p>
        ) : pending.isLoading ? (
          <p>Validando tu enlace…</p>
        ) : (
          <>
            <p>
              Hola {pending.data?.fullName}, crea la contraseña de tu cuenta de administrador para comenzar
              los 10 días de prueba.
            </p>
            <form className="simple-form" onSubmit={submit} noValidate>
              <FormField label="Correo">
                <input disabled value={pending.data?.email ?? ""} />
              </FormField>
              <FormField label="Contraseña" required error={passwordError ?? undefined}>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  maxLength={128}
                  aria-invalid={!!passwordError}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                />
              </FormField>
              {!passwordError && (
                <p className="form-hint">Al menos 8 caracteres, con mayúsculas, minúsculas y un número.</p>
              )}
              <FormField label="Confirmar contraseña" required error={confirmationError ?? undefined}>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  maxLength={128}
                  aria-invalid={!!confirmationError}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                />
              </FormField>
              {verify.error && (
                <p className="form-error" role="alert">
                  {errorMessage(verify.error)}
                </p>
              )}
              <button className="primary-button" disabled={verify.isPending}>
                {verify.isPending ? "Activando…" : "Activar prueba gratuita"}
              </button>
            </form>
          </>
        )}
        <Link className="back-link" to="/login">
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}
