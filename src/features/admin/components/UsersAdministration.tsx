import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { Pagination } from "@/components/data/Pagination";
import { notify } from "@/components/feedback/toast";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { userAdminApi, type ManagedUser } from "../api/userAdminApi";

export function UsersAdministration() {
  const cache = useQueryClient(),
    { user, can } = useAuthorization();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<ManagedUser | null>(null);
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
  const status = useMutation({
    mutationFn: (value: ManagedUser) =>
      userAdminApi.status(value.externalId, !value.isActive),
    onSuccess: async () => {
      notify("Estado actualizado.");
      await cache.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const saveRoles = useMutation({
    mutationFn: (codes: string[]) =>
      userAdminApi.updateRoles(editing!.externalId, codes),
    onSuccess: async () => {
      notify("Roles actualizados.");
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  return (
    <section className="admin-card invitation-management">
      <header className="admin-card-header">
        <span>
          <Users />
        </span>
        <div>
          <h2>Usuarios</h2>
          <p>Administra estados y roles dentro de tu empresa.</p>
        </div>
      </header>
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
        isEmpty={!query.data?.items.length}
        empty="No se encontraron usuarios."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((item) => {
                const self = item.externalId === user?.externalId;
                return (
                  <tr key={item.externalId}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <small>{item.email}</small>
                    </td>
                    <td>{item.roles.join(", ") || "Sin rol"}</td>
                    <td>
                      <span
                        className={`status-pill ${item.isActive ? "active" : "inactive"}`}
                      >
                        {item.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>{formatDateTime(item.createdAtUtc)}</td>
                    <td>
                      <div className="invitation-actions">
                        {can("roles.update") && (
                          <button
                            disabled={self}
                            onClick={() => setEditing(item)}
                          >
                            Roles
                          </button>
                        )}
                        {can("users.update") && (
                          <button
                            disabled={self || status.isPending}
                            onClick={() => status.mutate(item)}
                          >
                            {item.isActive ? "Desactivar" : "Activar"}
                          </button>
                        )}
                      </div>
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
  roles: { code: string; name: string }[];
  onClose: () => void;
  onSave: (codes: string[]) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(user.roles);
  return (
    <div className="upload-drawer-backdrop">
      <section className="confirm-dialog" role="dialog">
        <h2>Roles de {user.fullName}</h2>
        <div className="admin-role-list">
          {roles
            .filter((r) => r.code.toLowerCase() !== "platform_admin")
            .map((role) => (
              <label key={role.code}>
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
                {role.name}
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
