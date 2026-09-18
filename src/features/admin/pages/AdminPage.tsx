import { useEffect, useMemo, useState } from "react";
import { Building2, Clock3, History, MailPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { UsersAdministration } from "../components/UsersAdministration";
import { InviteUserPanel } from "../components/InviteUserPanel";
import { TimeZonePanel } from "../components/TimeZonePanel";
import { CompaniesPanel } from "../components/CompaniesPanel";
import {
  InvitationHistory,
  InvitationsPanel,
} from "../components/InvitationsPanel";

type AdminSection =
  "invite" | "invitations" | "users" | "settings" | "companies";

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { roles } = useAuthorization();
  const canInvite = usePermission("invitations.create");
  const canCompanies = usePermission("companies.create");
  const canManageUsers = usePermission("users.read");
  const canConfigureTimeZone = roles.some((role) =>
    ["admin", "super-admin", "superadmin"].includes(role.toLowerCase()),
  );
  const sections = useMemo(
    () => [
      ...(canInvite
        ? [
            { id: "invite" as const, label: "Invitar usuario", icon: MailPlus },
            {
              id: "invitations" as const,
              label: "Invitaciones",
              icon: History,
            },
          ]
        : []),
      ...(canConfigureTimeZone
        ? [{ id: "settings" as const, label: "Zona horaria", icon: Clock3 }]
        : []),
      ...(canManageUsers
        ? [{ id: "users" as const, label: "Usuarios", icon: Users }]
        : []),
      ...(canCompanies
        ? [{ id: "companies" as const, label: "Empresas", icon: Building2 }]
        : []),
    ],
    [canCompanies, canConfigureTimeZone, canInvite, canManageUsers],
  );
  const [section, setSection] = useState<AdminSection>(
    sections[0]?.id ?? "invite",
  );
  const [historyId, setHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const requested = searchParams.get("section") as AdminSection | null;
    if (requested && sections.some((item) => item.id === requested)) {
      if (requested !== section) setSection(requested);
    } else if (!sections.some((item) => item.id === section) && sections[0]) {
      setSection(sections[0].id);
    }
  }, [searchParams, section, sections]);

  return (
    <main className="customers-content admin-page">
      <PageHeader
        eyebrow="Configuración"
        title="Administración"
        description="Gestiona accesos, invitaciones y configuración de la empresa."
      />
      {sections.length > 0 ? (
        <>
          <nav className="admin-tabs" aria-label="Secciones de administración">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={section === item.id ? "active" : ""}
                  aria-current={section === item.id ? "page" : undefined}
                  key={item.id}
                  onClick={() => {
                    setSection(item.id);
                    setSearchParams({ section: item.id });
                  }}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </nav>
          {section === "invite" && canInvite && <InviteUserPanel />}
          {section === "invitations" && canInvite && (
            <InvitationsPanel onHistory={setHistoryId} />
          )}
          {section === "users" && canManageUsers && <UsersAdministration />}
          {section === "settings" && canConfigureTimeZone && <TimeZonePanel />}
          {section === "companies" && canCompanies && <CompaniesPanel />}
        </>
      ) : (
        <p className="data-state">No tienes permisos administrativos.</p>
      )}
      {historyId && (
        <InvitationHistory
          externalId={historyId}
          onClose={() => setHistoryId(null)}
        />
      )}
    </main>
  );
}
