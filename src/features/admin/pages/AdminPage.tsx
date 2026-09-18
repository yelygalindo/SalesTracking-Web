import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { usePermission } from "@/hooks/usePermission";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { UsersAdministration } from "../components/UsersAdministration";
import { InviteUserPanel } from "../components/InviteUserPanel";
import { TimeZonePanel } from "../components/TimeZonePanel";
import { CompaniesPanel } from "../components/CompaniesPanel";
import { InvitationHistory, InvitationsPanel } from "../components/InvitationsPanel";

type AdminSection = "invite" | "invitations" | "users" | "time-zone" | "companies";

const sectionContent: Record<AdminSection, { title: string; description: string }> = {
  invite: { title: "Invitar usuario", description: "Envía un acceso y asigna el rol inicial del nuevo usuario." },
  invitations: { title: "Invitaciones", description: "Consulta el estado y el historial de invitaciones de tu empresa." },
  users: { title: "Usuarios", description: "Administra estados y roles dentro de tu empresa." },
  "time-zone": { title: "Zona horaria", description: "Define cómo se muestran las fechas y horas para toda la empresa." },
  companies: { title: "Empresas", description: "Registra empresas y administra su capacidad de usuarios." },
};

export function AdminPage() {
  const { section } = useParams<{ section?: string }>();
  const { roles } = useAuthorization();
  const canInvite = usePermission("invitations.create");
  const canCompanies = usePermission("companies.create");
  const canManageUsers = usePermission("users.read");
  const canConfigureTimeZone = roles.some((role) =>
    ["admin", "super-admin", "superadmin"].includes(role.toLowerCase()),
  );
  const allowed: Record<AdminSection, boolean> = {
    invite: canInvite,
    invitations: canInvite,
    users: canManageUsers,
    "time-zone": canConfigureTimeZone,
    companies: canCompanies,
  };
  const firstAllowed = (Object.keys(allowed) as AdminSection[]).find((key) => allowed[key]);
  const current = section as AdminSection | undefined;
  const [historyId, setHistoryId] = useState<string | null>(null);

  if (!current)
    return firstAllowed ? <Navigate to={`/admin/${firstAllowed}`} replace /> : <Navigate to="/unauthorized" replace />;
  if (!(current in sectionContent) || !allowed[current])
    return <Navigate to="/unauthorized" replace />;

  const content = sectionContent[current];
  return (
    <main className="customers-content admin-page">
      <PageHeader eyebrow="Configuración" title={content.title} description={content.description} />
      {current === "invite" && <InviteUserPanel />}
      {current === "invitations" && <InvitationsPanel onHistory={setHistoryId} />}
      {current === "users" && <UsersAdministration />}
      {current === "time-zone" && <TimeZonePanel />}
      {current === "companies" && <CompaniesPanel />}
      {historyId && <InvitationHistory externalId={historyId} onClose={() => setHistoryId(null)} />}
    </main>
  );
}
