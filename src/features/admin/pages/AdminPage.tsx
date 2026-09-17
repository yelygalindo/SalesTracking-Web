import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  Building2,
  Clock3,
  History,
  MailPlus,
  Search,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { Pagination } from "@/components/data/Pagination";
import { FormField } from "@/components/forms/FormField";
import { notify } from "@/components/feedback/toast";
import { usePermission } from "@/hooks/usePermission";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import {
  formatDateTime,
  getDisplayTimeZone,
  setCompanyTimeZone,
} from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import {
  adminApi,
  type CompanyResult,
  type InvitationHistoryItem,
  type ManagedInvitation,
} from "../api/adminApi";
import { companyApi, type ManagedCompany } from "../api/companyApi";

type AdminSection = "invite" | "invitations" | "settings" | "companies";

const roleLabel = (value: string) => translateValue(value);
const eventLabels: Record<InvitationHistoryItem["type"], string> = {
  created: "Invitación creada",
  email_attempt: "Intento de envío",
  accepted: "Invitación aceptada",
  expired: "Invitación vencida",
  cancelled: "Invitación cancelada",
};

export function AdminPage() {
  const { roles } = useAuthorization();
  const canInvite = usePermission("invitations.create");
  const canCompanies = usePermission("companies.create");
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
      ...(canCompanies
        ? [{ id: "companies" as const, label: "Empresas", icon: Building2 }]
        : []),
    ],
    [canCompanies, canConfigureTimeZone, canInvite],
  );
  const [section, setSection] = useState<AdminSection>(
    sections[0]?.id ?? "invite",
  );
  const [historyId, setHistoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!sections.some((item) => item.id === section) && sections[0])
      setSection(sections[0].id);
  }, [section, sections]);

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
                  onClick={() => setSection(item.id)}
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

function InviteUserPanel() {
  const cache = useQueryClient();
  const [invitation, setInvitation] = useState({
    email: "",
    fullName: "",
    roleCode: "seller",
  });
  const capacity = useQuery({
    queryKey: ["company-user-capacity"],
    queryFn: companyApi.userCapacity,
  });
  const invite = useMutation({
    mutationFn: () => adminApi.invite(invitation),
    onSuccess: async () => {
      setInvitation({ email: "", fullName: "", roleCode: "seller" });
      notify("Invitación creada correctamente.");
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["managed-invitations"] }),
        cache.invalidateQueries({ queryKey: ["company-user-capacity"] }),
      ]);
    },
  });
  const noCapacity = capacity.data?.availableSlots === 0;

  return (
    <section className="admin-card admin-section-card">
      <header className="admin-card-header">
        <span>
          <MailPlus />
        </span>
        <div>
          <h2>Invitar usuario</h2>
          <p>Envía un acceso y asigna el rol inicial.</p>
        </div>
      </header>
      {capacity.data && (
        <div
          className={`capacity-summary ${noCapacity ? "capacity-full" : ""}`}
        >
          <Users />
          <div>
            <strong>
              {capacity.data.usedSlots} de {capacity.data.userLimit} cupos
              utilizados
            </strong>
            <span>
              {capacity.data.activeUserCount} usuarios activos ·{" "}
              {capacity.data.pendingInvitationCount} invitaciones pendientes
            </span>
          </div>
          <b>{capacity.data.availableSlots} disponibles</b>
        </div>
      )}
      <form
        className="customer-form admin-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <p className="assignment-note">
          Al crearla se envía un correo con un enlace temporal. Puedes revisar
          su estado, reenviarla o cancelarla.
        </p>
        <FormField label="Nombre completo" required>
          <input
            required
            value={invitation.fullName}
            onChange={(event) =>
              setInvitation({ ...invitation, fullName: event.target.value })
            }
          />
        </FormField>
        <FormField label="Correo" required>
          <input
            required
            type="email"
            value={invitation.email}
            onChange={(event) =>
              setInvitation({ ...invitation, email: event.target.value })
            }
          />
        </FormField>
        <FormField label="Rol" required>
          <select
            value={invitation.roleCode}
            onChange={(event) =>
              setInvitation({ ...invitation, roleCode: event.target.value })
            }
          >
            <option value="seller">Vendedor</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
        </FormField>
        {capacity.isError && (
          <p className="form-error">
            No fue posible consultar los cupos disponibles.
          </p>
        )}
        {noCapacity && (
          <p className="form-error">
            La empresa alcanzó el límite de usuarios. Solicita al administrador
            de plataforma ampliar los cupos.
          </p>
        )}
        {invite.error && <p className="form-error">{invite.error.message}</p>}
        <button
          className="action-primary"
          disabled={invite.isPending || capacity.isLoading || noCapacity}
        >
          {invite.isPending ? "Enviando…" : "Crear invitación"}
        </button>
      </form>
    </section>
  );
}

function InvitationsPanel({ onHistory }: { onHistory: (id: string) => void }) {
  const cache = useQueryClient();
  const invitations = useQuery({
    queryKey: ["managed-invitations"],
    queryFn: adminApi.invitations,
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["managed-invitations"] }),
      cache.invalidateQueries({ queryKey: ["company-user-capacity"] }),
    ]);
  };
  return (
    <ManagedInvitations
      query={invitations}
      onHistory={onHistory}
      onRefresh={refresh}
    />
  );
}

function TimeZonePanel() {
  const cache = useQueryClient();
  const [timeZoneId, setTimeZoneId] = useState("");
  const companyTimeZone = useQuery({
    queryKey: ["company-time-zone"],
    queryFn: companyApi.timeZone,
  });
  useEffect(() => {
    if (companyTimeZone.data?.timeZoneId)
      setTimeZoneId(companyTimeZone.data.timeZoneId);
  }, [companyTimeZone.data]);
  const updateTimeZone = useMutation({
    mutationFn: () => companyApi.updateTimeZone(timeZoneId.trim()),
    onSuccess: (result) => {
      setCompanyTimeZone(result.timeZoneId);
      setTimeZoneId(result.timeZoneId);
      notify("Zona horaria actualizada correctamente.");
      void cache.invalidateQueries({ queryKey: ["company-time-zone"] });
    },
  });
  return (
    <section className="admin-card admin-section-card">
      <header className="admin-card-header">
        <span>
          <Clock3 />
        </span>
        <div>
          <h2>Zona horaria</h2>
          <p>
            Define cómo se muestran las fechas y horas para toda la empresa.
          </p>
        </div>
      </header>
      <form
        className="customer-form admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          updateTimeZone.mutate();
        }}
      >
        <FormField label="Identificador IANA" required>
          <input
            required
            list="time-zone-suggestions"
            value={timeZoneId}
            placeholder="America/La_Paz"
            onChange={(event) => setTimeZoneId(event.target.value)}
          />
        </FormField>
        <datalist id="time-zone-suggestions">
          <option value={getDisplayTimeZone()} />
          <option value="America/La_Paz" />
          <option value="America/Lima" />
          <option value="America/Argentina/Buenos_Aires" />
          <option value="UTC" />
        </datalist>
        <p className="form-hint">
          Zona detectada en este dispositivo:{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
        </p>
        {companyTimeZone.isError && (
          <p className="form-error">
            No fue posible consultar la zona horaria actual.
          </p>
        )}
        {updateTimeZone.error && (
          <p className="form-error">{updateTimeZone.error.message}</p>
        )}
        <button
          className="action-primary"
          disabled={updateTimeZone.isPending || !timeZoneId.trim()}
        >
          {updateTimeZone.isPending ? "Guardando…" : "Guardar zona horaria"}
        </button>
      </form>
    </section>
  );
}

function CompaniesPanel() {
  const cache = useQueryClient();
  const [company, setCompany] = useState({
    companyName: "",
    adminFullName: "",
    adminEmail: "",
  });
  const [registered, setRegistered] = useState<CompanyResult[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);
  const companies = useQuery({
    queryKey: ["admin-companies", search, status, page],
    queryFn: () =>
      companyApi.list({
        search,
        status: status || undefined,
        page,
        pageSize: 20,
      }),
  });
  const register = useMutation({
    mutationFn: () => adminApi.registerCompany(company),
    onSuccess: async (result) => {
      setRegistered((current) => [result, ...current]);
      setCompany({ companyName: "", adminFullName: "", adminEmail: "" });
      notify("Empresa registrada correctamente.");
      await cache.invalidateQueries({ queryKey: ["admin-companies"] });
    },
  });
  return (
    <div className="admin-company-layout">
      <section className="admin-card">
        <header className="admin-card-header">
          <span>
            <Building2 />
          </span>
          <div>
            <h2>Registrar empresa</h2>
            <p>Crea la empresa y envía acceso a su administrador.</p>
          </div>
        </header>
        <form
          className="customer-form admin-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          <FormField label="Empresa" required>
            <input
              required
              value={company.companyName}
              onChange={(event) =>
                setCompany({ ...company, companyName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Administrador" required>
            <input
              required
              value={company.adminFullName}
              onChange={(event) =>
                setCompany({ ...company, adminFullName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Correo del administrador" required>
            <input
              required
              type="email"
              value={company.adminEmail}
              onChange={(event) =>
                setCompany({ ...company, adminEmail: event.target.value })
              }
            />
          </FormField>
          <p className="form-hint">
            Después de crearla podrás ajustar su límite de usuarios en el
            listado.
          </p>
          {register.error && (
            <p className="form-error">{register.error.message}</p>
          )}
          <button className="action-primary" disabled={register.isPending}>
            {register.isPending ? "Registrando…" : "Registrar empresa"}
          </button>
        </form>
        {registered.length > 0 && (
          <div className="admin-results">
            <h3>Registros recientes</h3>
            {registered.map((value) => (
              <article
                className="invitation-card"
                key={value.companyExternalId}
              >
                <strong>{value.adminEmail}</strong>
                <small>{value.message}</small>
                <button
                  onClick={async () => {
                    const updated = await adminApi.resendAdmin(
                      value.companyExternalId,
                    );
                    setRegistered((current) =>
                      current.map((item) =>
                        item.companyExternalId === value.companyExternalId
                          ? updated
                          : item,
                      ),
                    );
                  }}
                >
                  Reenviar invitación
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="admin-card company-management">
        <header className="admin-card-header">
          <span>
            <Users />
          </span>
          <div>
            <h2>Empresas de la plataforma</h2>
            <p>Consulta el uso y administra los límites de usuarios.</p>
          </div>
        </header>
        <form
          className="company-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <label>
            <span>Buscar</span>
            <div className="search-field">
              <Search />
              <input
                value={searchInput}
                placeholder="Nombre de empresa"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </label>
          <label>
            <span>Estado</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | "active" | "inactive");
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </label>
          <button className="action-secondary">Buscar</button>
        </form>
        <DataState
          loading={companies.isLoading}
          error={companies.error}
          isEmpty={!companies.data?.items.length}
          empty="No se encontraron empresas."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Uso</th>
                  <th>Disponibles</th>
                  <th>Límite</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {companies.data?.items.map((item) => (
                  <CompanyRow company={item} key={item.externalId} />
                ))}
              </tbody>
            </table>
          </div>
          {companies.data && (
            <Pagination
              page={companies.data.pagination.page}
              pageSize={companies.data.pagination.pageSize}
              totalPages={companies.data.pagination.totalPages}
              totalItems={companies.data.pagination.totalItems}
              itemLabel="empresas"
              onChange={setPage}
            />
          )}
        </DataState>
      </section>
    </div>
  );
}

function CompanyRow({ company }: { company: ManagedCompany }) {
  const cache = useQueryClient();
  const usedSlots = company.activeUserCount + company.pendingInvitationCount;
  const [userLimit, setUserLimit] = useState(company.userLimit);
  useEffect(() => setUserLimit(company.userLimit), [company.userLimit]);
  const update = useMutation({
    mutationFn: () => companyApi.updateUserLimit(company.externalId, userLimit),
    onSuccess: async () => {
      notify("Límite actualizado correctamente.");
      await cache.invalidateQueries({ queryKey: ["admin-companies"] });
    },
  });
  return (
    <tr>
      <td>
        <strong>{company.name}</strong>
        <small>{company.timeZoneId}</small>
      </td>
      <td>
        <span className={`status-pill ${company.status}`}>
          {translateValue(company.status)}
        </span>
      </td>
      <td>
        <strong>
          {usedSlots} / {company.userLimit}
        </strong>
        <small>
          {company.activeUserCount} activos · {company.pendingInvitationCount}{" "}
          pendientes
        </small>
      </td>
      <td>{company.availableSlots}</td>
      <td>
        <div className="limit-editor">
          <input
            type="number"
            min={usedSlots}
            value={userLimit}
            aria-label={`Límite de usuarios de ${company.name}`}
            onChange={(event) => setUserLimit(Number(event.target.value))}
          />
          <button
            disabled={
              update.isPending ||
              userLimit === company.userLimit ||
              userLimit < usedSlots ||
              userLimit < 1
            }
            onClick={() => update.mutate()}
          >
            {update.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {update.error && (
          <small className="form-error">{update.error.message}</small>
        )}
      </td>
      <td>{formatDateTime(company.createdAtUtc)}</td>
    </tr>
  );
}

function ManagedInvitations({
  query,
  onHistory,
  onRefresh,
}: {
  query: UseQueryResult<ManagedInvitation[], Error>;
  onHistory: (id: string) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const resend = async (id: string) => {
    setBusyId(id);
    try {
      await adminApi.resend(id);
      notify("Invitación reenviada.");
      await onRefresh();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "No fue posible reenviar.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };
  const cancel = async (id: string) => {
    if (!confirm("¿Cancelar esta invitación? El enlace dejará de funcionar."))
      return;
    setBusyId(id);
    try {
      await adminApi.cancel(id);
      notify("Invitación cancelada.");
      await onRefresh();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "No fue posible cancelar.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section className="admin-card invitation-management">
      <header className="admin-card-header">
        <span>
          <History />
        </span>
        <div>
          <h2>Invitaciones</h2>
          <p>Estado e historial de invitaciones de tu empresa.</p>
        </div>
      </header>
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.data?.length}
        empty="No hay invitaciones registradas."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((item) => (
                <tr key={item.externalId}>
                  <td>
                    <strong>{item.fullName}</strong>
                    <small>{item.email}</small>
                  </td>
                  <td>{roleLabel(item.roleCode)}</td>
                  <td>
                    <span className={`status-pill ${item.status}`}>
                      {translateValue(item.status)}
                    </span>
                  </td>
                  <td>{formatDateTime(item.createdAtUtc)}</td>
                  <td>{formatDateTime(item.expiresAtUtc)}</td>
                  <td>
                    <div className="invitation-actions">
                      <button onClick={() => onHistory(item.externalId)}>
                        Historial
                      </button>
                      {item.status === "pending" && (
                        <>
                          <button
                            disabled={busyId === item.externalId}
                            onClick={() => void resend(item.externalId)}
                          >
                            Reenviar
                          </button>
                          <button
                            className="danger-text"
                            disabled={busyId === item.externalId}
                            onClick={() => void cancel(item.externalId)}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </section>
  );
}

function InvitationHistory({
  externalId,
  onClose,
}: {
  externalId: string;
  onClose: () => void;
}) {
  const history = useQuery({
    queryKey: ["invitation-history", externalId],
    queryFn: () => adminApi.invitationHistory(externalId),
  });
  return (
    <div
      className="upload-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside
        className="upload-drawer invitation-history-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitation-history-title"
      >
        <button className="panel-close" onClick={onClose} aria-label="Cerrar">
          <X />
        </button>
        <p className="overline">Invitación</p>
        <h2 id="invitation-history-title">Historial</h2>
        <DataState
          loading={history.isLoading}
          error={history.error}
          isEmpty={!history.data?.events.length}
          empty="No hay eventos registrados."
        >
          {history.data && (
            <>
              <div className="invitation-history-person">
                <strong>{history.data.invitation.fullName}</strong>
                <span>{history.data.invitation.email}</span>
                <small>
                  {roleLabel(history.data.invitation.roleCode)} ·{" "}
                  {translateValue(history.data.invitation.status)}
                </small>
              </div>
              <ol className="invitation-history-list">
                {history.data.events.map((event, index) => (
                  <li key={`${event.type}-${event.occurredAtUtc}-${index}`}>
                    <span />
                    <div>
                      <strong>{eventLabels[event.type]}</strong>
                      <time>{formatDateTime(event.occurredAtUtc)}</time>
                      {event.detail && (
                        <small>{translateValue(event.detail)}</small>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </DataState>
      </aside>
    </div>
  );
}
