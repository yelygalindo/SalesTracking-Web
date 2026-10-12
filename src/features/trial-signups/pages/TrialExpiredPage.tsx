import { Link } from "react-router-dom";
import { env } from "@/config/env";
import { Brand } from "@/presentation/components/Brand";

export function TrialExpiredPage() {
  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <Brand />
        <p className="overline">Prueba gratuita</p>
        <h1>Tu prueba gratuita terminó</h1>
        <p>
          Los 10 días de prueba de tu empresa llegaron a su fin, por eso ya no puedes ingresar a UrbanTrack.
          Escríbenos y te ayudaremos a continuar con tu equipo.
        </p>
        {env.supportEmail ? (
          <a
            className="primary-link"
            href={`mailto:${env.supportEmail}?subject=${encodeURIComponent("Quiero continuar con UrbanTrack después de la prueba")}`}
          >
            Contactar a UrbanTrack
          </a>
        ) : (
          <p className="form-hint">Comunícate con el equipo de UrbanTrack para activar tu plan.</p>
        )}
        <Link className="back-link" to="/login">
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}
