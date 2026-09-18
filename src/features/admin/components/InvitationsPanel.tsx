import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import {
  adminApi,
  type InvitationHistoryItem,
  type ManagedInvitation,
} from "../api/adminApi";

const roleLabel = (value: string) => translateValue(value);
const eventLabels: Record<InvitationHistoryItem["type"], string> = {
  created: "Invitación creada",
  email_attempt: "Intento de envío",
  accepted: "Invitación aceptada",
  expired: "Invitación vencida",
  cancelled: "Invitación cancelada",
};

export function InvitationsPanel({
  onHistory,
}: {
  onHistory: (id: string) => void;
}) {
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
  const [cancelId, setCancelId] = useState<string | null>(null);
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
  const cancel = async () => {
    if (!cancelId) return;
    const id = cancelId;
    setBusyId(id);
    try {
      await adminApi.cancel(id);
      notify("Invitación cancelada.");
      setCancelId(null);
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
                            onClick={() => setCancelId(item.externalId)}
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
      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancelar invitación"
        description="El enlace de esta invitación dejará de funcionar."
        confirmLabel="Cancelar invitación"
        busy={Boolean(busyId)}
        onCancel={() => setCancelId(null)}
        onConfirm={() => void cancel()}
      />
    </section>
  );
}

export function InvitationHistory({
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
