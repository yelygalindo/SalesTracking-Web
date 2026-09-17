import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Building2, Clock3, History, MailPlus, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { FormField } from "@/components/forms/FormField";
import { notify } from "@/components/feedback/toast";
import { usePermission } from "@/hooks/usePermission";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { formatDateTime, getDisplayTimeZone, setCompanyTimeZone } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import {
  adminApi,
  type CompanyResult,
  type InvitationHistoryItem,
  type ManagedInvitation,
} from "../api/adminApi";
import { companyApi } from "../api/companyApi";

const roleLabel = (value: string) => translateValue(value);
const eventLabels: Record<InvitationHistoryItem["type"], string> = {
  created: "Invitación creada",
  email_attempt: "Intento de envío",
  accepted: "Invitación aceptada",
  expired: "Invitación vencida",
  cancelled: "Invitación cancelada",
};

export function AdminPage() {
  const cache = useQueryClient();
  const { roles } = useAuthorization();
  const canInvite = usePermission("invitations.create");
  const canCompanies = usePermission("companies.create");
  const [invitation, setInvitation] = useState({ email: "", fullName: "", roleCode: "seller" });
  const [company, setCompany] = useState({ companyName: "", adminFullName: "", adminEmail: "" });
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [timeZoneId, setTimeZoneId] = useState("");
  const canConfigureTimeZone = roles.some((role) =>
    ["admin", "super-admin", "superadmin"].includes(role.toLowerCase()),
  );
  const companyTimeZone = useQuery({
    queryKey: ["company-time-zone"],
    queryFn: companyApi.timeZone,
    enabled: canConfigureTimeZone,
  });
  useEffect(() => {
    if (companyTimeZone.data?.timeZoneId)
      setTimeZoneId(companyTimeZone.data.timeZoneId);
  }, [companyTimeZone.data]);
  const invitations = useQuery({
    queryKey: ["managed-invitations"],
    queryFn: adminApi.invitations,
    enabled: canInvite,
  });
  const invite = useMutation({
    mutationFn: () => adminApi.invite(invitation),
    onSuccess: async () => {
      setInvitation({ email: "", fullName: "", roleCode: "seller" });
      notify("Invitación creada correctamente.");
      await cache.invalidateQueries({ queryKey: ["managed-invitations"] });
    },
  });
  const register = useMutation({
    mutationFn: () => adminApi.registerCompany(company),
    onSuccess: (result) => {
      setCompanies((current) => [result, ...current]);
      setCompany({ companyName: "", adminFullName: "", adminEmail: "" });
    },
  });
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
    <main className="customers-content admin-page">
      <PageHeader eyebrow="Configuración" title="Administración" description="Gestiona accesos y altas de empresas desde un solo lugar." />
      <div className="admin-grid">
        {canInvite && (
          <section className="admin-card">
            <header className="admin-card-header"><span><MailPlus /></span><div><h2>Invitar usuario</h2><p>Envía un acceso y asigna el rol inicial del usuario.</p></div></header>
            <form className="customer-form admin-form" onSubmit={(event: FormEvent) => { event.preventDefault(); invite.mutate(); }}>
              <p className="assignment-note">Al crearla se envía un correo con un enlace temporal. Puedes consultar su estado, reenviarla mientras esté pendiente o cancelarla.</p>
              <FormField label="Nombre completo" required><input required value={invitation.fullName} onChange={(event) => setInvitation({ ...invitation, fullName: event.target.value })} /></FormField>
              <FormField label="Correo" required><input required type="email" value={invitation.email} onChange={(event) => setInvitation({ ...invitation, email: event.target.value })} /></FormField>
              <FormField label="Rol" required><select value={invitation.roleCode} onChange={(event) => setInvitation({ ...invitation, roleCode: event.target.value })}><option value="seller">Vendedor</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></FormField>
              {invite.error && <p className="form-error">{invite.error.message}</p>}
              <button className="action-primary" disabled={invite.isPending}>{invite.isPending ? "Enviando…" : "Crear invitación"}</button>
            </form>
          </section>
        )}
        {canCompanies && (
          <section className="admin-card">
            <header className="admin-card-header"><span><Building2 /></span><div><h2>Registrar empresa</h2><p>Crea la empresa y envía acceso a su administrador.</p></div></header>
            <form className="customer-form admin-form" onSubmit={(event: FormEvent) => { event.preventDefault(); register.mutate(); }}>
              <FormField label="Empresa" required><input required value={company.companyName} onChange={(event) => setCompany({ ...company, companyName: event.target.value })} /></FormField>
              <FormField label="Administrador" required><input required value={company.adminFullName} onChange={(event) => setCompany({ ...company, adminFullName: event.target.value })} /></FormField>
              <FormField label="Correo del administrador" required><input required type="email" value={company.adminEmail} onChange={(event) => setCompany({ ...company, adminEmail: event.target.value })} /></FormField>
              {register.error && <p className="form-error">{register.error.message}</p>}
              <button className="action-primary" disabled={register.isPending}>{register.isPending ? "Registrando…" : "Registrar empresa"}</button>
            </form>
            {companies.length > 0 && <div className="admin-results"><h3>Empresas registradas</h3>{companies.map((value) => <article className="invitation-card" key={value.companyExternalId}><strong>{value.adminEmail}</strong><small>{value.message}</small><button onClick={async () => { const updated = await adminApi.resendAdmin(value.companyExternalId); setCompanies((current) => current.map((item) => item.companyExternalId === value.companyExternalId ? updated : item)); }}>Reenviar invitación</button></article>)}</div>}
          </section>
        )}
        {canConfigureTimeZone && (
          <section className="admin-card">
            <header className="admin-card-header"><span><Clock3 /></span><div><h2>Zona horaria</h2><p>Define cómo se muestran las fechas y horas para toda la empresa.</p></div></header>
            <form className="customer-form admin-form" onSubmit={(event) => { event.preventDefault(); updateTimeZone.mutate(); }}>
              <FormField label="Identificador IANA" required>
                <input required list="time-zone-suggestions" value={timeZoneId} placeholder="America/La_Paz" onChange={(event) => setTimeZoneId(event.target.value)} />
              </FormField>
              <datalist id="time-zone-suggestions"><option value={getDisplayTimeZone()} /><option value="America/La_Paz" /><option value="America/Lima" /><option value="America/Argentina/Buenos_Aires" /><option value="UTC" /></datalist>
              <p className="form-hint">Zona detectada en este dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}</p>
              {companyTimeZone.isError && <p className="form-error">No fue posible consultar la zona horaria actual.</p>}
              {updateTimeZone.error && <p className="form-error">{updateTimeZone.error.message}</p>}
              <button className="action-primary" disabled={updateTimeZone.isPending || !timeZoneId.trim()}>{updateTimeZone.isPending ? "Guardando…" : "Guardar zona horaria"}</button>
            </form>
          </section>
        )}
      </div>
      {canInvite && (
        <ManagedInvitations
          query={invitations}
          onHistory={setHistoryId}
          onRefresh={() => cache.invalidateQueries({ queryKey: ["managed-invitations"] })}
        />
      )}
      {!canInvite && !canCompanies && <p className="data-state">No tienes permisos administrativos.</p>}
      {historyId && <InvitationHistory externalId={historyId} onClose={() => setHistoryId(null)} />}
    </main>
  );
}

function ManagedInvitations({ query, onHistory, onRefresh }: { query: UseQueryResult<ManagedInvitation[], Error>; onHistory: (id: string) => void; onRefresh: () => Promise<unknown> }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const resend = async (id: string) => { setBusyId(id); try { await adminApi.resend(id); notify("Invitación reenviada."); await onRefresh(); } catch (error) { notify(error instanceof Error ? error.message : "No fue posible reenviar.", "error"); } finally { setBusyId(null); } };
  const cancel = async (id: string) => { if (!confirm("¿Cancelar esta invitación? El enlace dejará de funcionar.")) return; setBusyId(id); try { await adminApi.cancel(id); notify("Invitación cancelada."); await onRefresh(); } catch (error) { notify(error instanceof Error ? error.message : "No fue posible cancelar.", "error"); } finally { setBusyId(null); } };
  return (
    <section className="admin-card invitation-management">
      <header className="admin-card-header"><span><History /></span><div><h2>Invitaciones</h2><p>Estado e historial de invitaciones de tu empresa.</p></div></header>
      <DataState loading={query.isLoading} error={query.error} isEmpty={!query.data?.length} empty="No hay invitaciones registradas.">
        <div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creada</th><th>Vencimiento</th><th>Acciones</th></tr></thead><tbody>{query.data?.map((item) => <tr key={item.externalId}><td><strong>{item.fullName}</strong><small>{item.email}</small></td><td>{roleLabel(item.roleCode)}</td><td><span className={`status-pill ${item.status}`}>{translateValue(item.status)}</span></td><td>{formatDateTime(item.createdAtUtc)}</td><td>{formatDateTime(item.expiresAtUtc)}</td><td><div className="invitation-actions"><button onClick={() => onHistory(item.externalId)}>Historial</button>{item.status === "pending" && <><button disabled={busyId === item.externalId} onClick={() => void resend(item.externalId)}>Reenviar</button><button className="danger-text" disabled={busyId === item.externalId} onClick={() => void cancel(item.externalId)}>Cancelar</button></>}</div></td></tr>)}</tbody></table></div>
      </DataState>
    </section>
  );
}

function InvitationHistory({ externalId, onClose }: { externalId: string; onClose: () => void }) {
  const history = useQuery({ queryKey: ["invitation-history", externalId], queryFn: () => adminApi.invitationHistory(externalId) });
  return <div className="upload-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="upload-drawer invitation-history-drawer" role="dialog" aria-modal="true" aria-labelledby="invitation-history-title"><button className="panel-close" onClick={onClose} aria-label="Cerrar"><X /></button><p className="overline">Invitación</p><h2 id="invitation-history-title">Historial</h2><DataState loading={history.isLoading} error={history.error} isEmpty={!history.data?.events.length} empty="No hay eventos registrados.">{history.data && <><div className="invitation-history-person"><strong>{history.data.invitation.fullName}</strong><span>{history.data.invitation.email}</span><small>{roleLabel(history.data.invitation.roleCode)} · {translateValue(history.data.invitation.status)}</small></div><ol className="invitation-history-list">{history.data.events.map((event, index) => <li key={`${event.type}-${event.occurredAtUtc}-${index}`}><span /><div><strong>{eventLabels[event.type]}</strong><time>{formatDateTime(event.occurredAtUtc)}</time>{event.detail && <small>{translateValue(event.detail)}</small>}</div></li>)}</ol></>}</DataState></aside></div>;
}
