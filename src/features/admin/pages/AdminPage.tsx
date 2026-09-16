import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, MailPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { FormField } from "@/components/forms/FormField";
import { usePermission } from "@/hooks/usePermission";
import { adminApi, type CompanyResult, type Invitation } from "../api/adminApi";

export function AdminPage() {
  const canInvite = usePermission("invitations.create");
  const canCompanies = usePermission("companies.create");
  const [invitation, setInvitation] = useState({ email: "", fullName: "", roleCode: "seller" });
  const [company, setCompany] = useState({ companyName: "", adminFullName: "", adminEmail: "" });
  const [recent, setRecent] = useState<Invitation[]>([]);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const invite = useMutation({
    mutationFn: () => adminApi.invite(invitation),
    onSuccess: (result) => {
      setRecent((current) => [result, ...current]);
      setInvitation({ email: "", fullName: "", roleCode: "seller" });
    },
  });
  const register = useMutation({
    mutationFn: () => adminApi.registerCompany(company),
    onSuccess: (result) => {
      setCompanies((current) => [result, ...current]);
      setCompany({ companyName: "", adminFullName: "", adminEmail: "" });
    },
  });

  return (
    <main className="customers-content admin-page">
      <PageHeader
        eyebrow="Configuración"
        title="Administración"
        description="Gestiona accesos y altas de empresas desde un solo lugar."
      />
      <div className="admin-grid">
        {canInvite && (
          <section className="admin-card">
            <header className="admin-card-header">
              <span><MailPlus /></span>
              <div>
                <h2>Invitar usuario</h2>
                <p>Envía un acceso y asigna el rol inicial del usuario.</p>
              </div>
            </header>
            <form className="customer-form admin-form" onSubmit={(event: FormEvent) => { event.preventDefault(); invite.mutate(); }}>
              <FormField label="Nombre completo" required>
                <input required value={invitation.fullName} onChange={(event) => setInvitation({ ...invitation, fullName: event.target.value })} />
              </FormField>
              <FormField label="Correo" required>
                <input required type="email" value={invitation.email} onChange={(event) => setInvitation({ ...invitation, email: event.target.value })} />
              </FormField>
              <FormField label="Rol" required>
                <select value={invitation.roleCode} onChange={(event) => setInvitation({ ...invitation, roleCode: event.target.value })}>
                  <option value="seller">Vendedor</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </FormField>
              {invite.error && <p className="form-error">{invite.error.message}</p>}
              <button className="action-primary" disabled={invite.isPending}>
                {invite.isPending ? "Enviando…" : "Crear invitación"}
              </button>
            </form>
            {recent.length > 0 && (
              <div className="admin-results">
                <h3>Invitaciones recientes</h3>
                {recent.map((value) => (
                  <InvitationCard
                    key={value.externalId}
                    value={value}
                    onResend={async () => {
                      const updated = await adminApi.resend(value.externalId);
                      setRecent((current) => current.map((item) => item.externalId === value.externalId ? updated : item));
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {canCompanies && (
          <section className="admin-card">
            <header className="admin-card-header">
              <span><Building2 /></span>
              <div>
                <h2>Registrar empresa</h2>
                <p>Crea la empresa y envía acceso a su administrador.</p>
              </div>
            </header>
            <form className="customer-form admin-form" onSubmit={(event) => { event.preventDefault(); register.mutate(); }}>
              <FormField label="Empresa" required>
                <input required value={company.companyName} onChange={(event) => setCompany({ ...company, companyName: event.target.value })} />
              </FormField>
              <FormField label="Administrador" required>
                <input required value={company.adminFullName} onChange={(event) => setCompany({ ...company, adminFullName: event.target.value })} />
              </FormField>
              <FormField label="Correo del administrador" required>
                <input required type="email" value={company.adminEmail} onChange={(event) => setCompany({ ...company, adminEmail: event.target.value })} />
              </FormField>
              {register.error && <p className="form-error">{register.error.message}</p>}
              <button className="action-primary" disabled={register.isPending}>
                {register.isPending ? "Registrando…" : "Registrar empresa"}
              </button>
            </form>
            {companies.length > 0 && (
              <div className="admin-results">
                <h3>Empresas registradas</h3>
                {companies.map((value) => (
                  <article className="invitation-card" key={value.companyExternalId}>
                    <strong>{value.adminEmail}</strong>
                    <small>{value.message}</small>
                    <button onClick={async () => {
                      const updated = await adminApi.resendAdmin(value.companyExternalId);
                      setCompanies((current) => current.map((item) => item.companyExternalId === value.companyExternalId ? updated : item));
                    }}>Reenviar invitación</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {!canInvite && !canCompanies && <p className="data-state">No tienes permisos administrativos.</p>}
    </main>
  );
}

function InvitationCard({ value, onResend }: { value: Invitation; onResend: () => Promise<void> }) {
  const status = value.emailStatus === "sent" ? "Enviado" : value.emailStatus === "failed" ? "Fallido" : value.emailStatus === "pending" ? "Pendiente" : value.emailStatus;
  return (
    <article className="invitation-card">
      <strong>{value.email}</strong>
      <span>{status}</span>
      <small>Vence {new Date(value.expiresAtUtc).toLocaleString("es-BO")}</small>
      <button onClick={() => void onResend()}>Reenviar</button>
    </article>
  );
}
