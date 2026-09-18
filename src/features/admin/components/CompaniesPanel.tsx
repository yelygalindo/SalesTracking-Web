import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Search, Users } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { Pagination } from "@/components/data/Pagination";
import { FormField } from "@/components/forms/FormField";
import { notify } from "@/components/feedback/toast";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import { adminApi, type CompanyResult } from "../api/adminApi";
import { companyApi, type ManagedCompany } from "../api/companyApi";

export function CompaniesPanel() {
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
