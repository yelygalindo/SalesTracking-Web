import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Search, ShieldCheck } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { Pagination } from "@/components/data/Pagination";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import { userAdminApi, type ManagedUser } from "../api/userAdminApi";

export function UsersAdministration() {
  const cache = useQueryClient(),
    { user, can } = useAuthorization();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<ManagedUser | null>(null),
    [deactivating, setDeactivating] = useState<ManagedUser | null>(null);
  const query = useQuery({
    queryKey: ["admin-users", search, active, page],
    queryFn: () =>
      userAdminApi.list({
        search: search || undefined,
        isActive: active === "" ? undefined : active === "true",
        page,
        pageSize: 20,
      }),
  });
  const roles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: userAdminApi.roles,
    enabled: can("roles.read"),
  });
  const roleName = (code: string) =>
    roles.data?.find((role) => role.code === code)?.name ?? translateValue(code);
  const status = useMutation({
    mutationFn: (value: ManagedUser) =>
      userAdminApi.status(value.externalId, !value.isActive),
    onSuccess: async (_, value) => {
      setDeactivating(null);
      notify(value.isActive ? "Usuario desactivado." : "Usuario activado.");
      await cache.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const saveRoles = useMutation({
    mutationFn: (codes: string[]) =>
      userAdminApi.updateRoles(editing!.externalId, codes),
    onSuccess: async () => {
      notify("Roles actualizados.");
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const canEditRoles = can("roles.update"),
    canChangeStatus = can("users.update");
  const closeMenu = (element: HTMLElement) =>
    element.closest("details")?.removeAttribute("open");
  return (
    <section className="admin-card invitation-management">
      <form
        className="company-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(input.trim());
          setPage(1);
        }}
      >
        <label>
          <span>Buscar</span>
          <div className="search-field">
            <Search />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nombre o correo"
            />
          </div>
        </label>
        <label>
          <span>Estado</span>
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <button className="action-secondary">Buscar</button>
      </form>
      <DataState
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        skeleton="table"
        isEmpty={!query.data?.items.length}
        empty="No se encontraron usuarios."
      >
        <div className="table-scroll search-results-scroll">
          <table className="search-results-table users-results-table">
            <thead>
              <tr>
                <th className="result-col-primary">Usuario</th>
                <th className="result-col-secondary">Roles</th>
                <th className="result-col-status">Estado</th>
                <th className="result-col-tertiary">Creado</th>
                <th className="result-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((item) => {
                const self = item.externalId === user?.externalId;
                return (
                  <tr key={item.externalId}>
                    <td className="result-col-primary">
                      <div className="result-cell-stack">
                        <strong
                          className="result-cell-ellipsis"
                          title={item.fullName}
                        >
                          {item.fullName}
                          {self && <span className="user-self-badge">Tú</span>}
                        </strong>
                        <small
                          className="result-cell-ellipsis"
                          title={item.email}
                        >
                          {item.email}
                        </small>
                      </div>
                    </td>
                    <td className="result-col-secondary" data-label="Roles">
                      <div
                        className="role-badges"
                        title={item.roles.map(roleName).join(", ") || "Sin rol"}
                      >
                        {item.roles.length ? (
                          <>
                            {item.roles.slice(0, 2).map((role) => (
                              <span key={role}>{roleName(role)}</span>
                            ))}
                            {item.roles.length > 2 && (
                              <span className="role-badge-more">
                                +{item.roles.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="role-badge-empty">Sin rol</span>
                        )}
                      </div>
                    </td>
                    <td className="result-col-status" data-label="Estado">
                      <span
                        className={`status-pill ${item.isActive ? "active" : "inactive"}`}
                      >
                        {item.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="result-col-tertiary result-cell-nowrap" data-label="Creado">
                      {formatDateTime(item.createdAtUtc)}
                    </td>
                    <td className="result-col-actions">
                      {self ? (
                        <small className="user-self-note">Tu cuenta</small>
                      ) : (
                        <div className="customer-row-actions">
                          {canEditRoles && (
                            <button
                              className="row-action"
                              onClick={() => setEditing(item)}
                            >
                              <ShieldCheck /> Roles
                            </button>
                          )}
                          {canChangeStatus && (
                            <details
                              className="row-actions-menu"
                              name="user-actions"
                            >
                              <summary
                                aria-label={`Más acciones para ${item.fullName}`}
                              >
                                <MoreVertical />
                              </summary>
                              <div role="menu">
                                {item.isActive ? (
                                  <button
                                    className="danger"
                                    onClick={(event) => {
                                      closeMenu(event.currentTarget);
                                      setDeactivating(item);
                                    }}
                                  >
                                    Desactivar usuario
                                  </button>
                                ) : (
                                  <button
                                    disabled={status.isPending}
                                    onClick={(event) => {
                                      closeMenu(event.currentTarget);
                                      status.mutate(item);
                                    }}
                                  >
                                    Activar usuario
                                  </button>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {query.data && (
          <Pagination
            {...query.data.pagination}
            itemLabel="usuarios"
            onChange={setPage}
          />
        )}
      </DataState>
      <ConfirmDialog
        open={deactivating !== null}
        title="Desactivar usuario"
        description={`${deactivating?.fullName ?? "Este usuario"} ya no podrá iniciar sesión en la web ni en el celular. Puedes volver a activarlo cuando quieras.`}
        confirmLabel="Desactivar"
        busy={status.isPending}
        onConfirm={() => deactivating && status.mutate(deactivating)}
        onCancel={() => setDeactivating(null)}
      />
      {editing && (
        <RoleDialog
          user={editing}
          roles={roles.data ?? []}
          onClose={() => setEditing(null)}
          onSave={(codes) => saveRoles.mutate(codes)}
          busy={saveRoles.isPending}
        />
      )}
    </section>
  );
}
function RoleDialog({
  user,
  roles,
  onClose,
  onSave,
  busy,
}: {
  user: ManagedUser;
  roles: { code: string; name: string; permissions?: string[] }[];
  onClose: () => void;
  onSave: (codes: string[]) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(user.roles);
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="confirm-dialog role-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
      >
        <h2 id="role-dialog-title">Roles de {user.fullName}</h2>
        <p>Elige qué puede hacer este usuario. Debe tener al menos un rol.</p>
        <div className="admin-role-list">
          {roles
            .filter((r) => r.code.toLowerCase() !== "platform_admin")
            .map((role) => (
              <label
                key={role.code}
                className={selected.includes(role.code) ? "selected" : undefined}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(role.code)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, role.code]
                        : selected.filter((x) => x !== role.code),
                    )
                  }
                />
                <span>
                  <strong>{role.name}</strong>
                  {!!role.permissions?.length && (
                    <small>
                      {role.permissions.length}{" "}
                      {role.permissions.length === 1 ? "permiso" : "permisos"}
                    </small>
                  )}
                </span>
              </label>
            ))}
        </div>
        <footer>
          <button onClick={onClose}>Cancelar</button>
          <button
            className="action-primary"
            disabled={busy || !selected.length}
            onClick={() => onSave(selected)}
          >
            Guardar roles
          </button>
        </footer>
      </section>
    </div>
  );
}
