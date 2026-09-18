import { useEffect, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronLeft,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { customerService } from "@/features/customers/services/customerService";
import type {
  CustomerCreateExtrasDto,
  CustomerDetailDto,
  CustomerInputDto,
  CustomerSummaryDto,
} from "@/features/customers/api/customerDtos";
import { AppError } from "@/lib/api/apiError";
import { notify } from "@/components/feedback/toast";
import { updateCustomerStatus } from "@/lib/api/optimisticUpdates";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { CustomerDetail } from "@/features/customers/components/CustomerDetail";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { translateValue } from "@/lib/i18n/labels";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { Pagination } from "@/components/data/Pagination";
import { CustomerCsvActions } from "@/features/customers/components/CustomerCsvActions";

const emptyForm: CustomerInputDto = {
  name: "",
  companyName: "",
  phone: "",
  email: null,
  sellerExternalId: null,
  address: null,
  latitude: null,
  longitude: null,
};
const emptyExtras: CustomerCreateExtrasDto = {
  statusId: null,
  initialNote: "",
  reminderText: "",
  reminderAtUtc: "",
};
const message = (error: unknown) =>
  error instanceof AppError
    ? error.message
    : "No fue posible completar la operación.";
const formFrom = (c: CustomerDetailDto): CustomerInputDto => ({
  name: c.name,
  companyName: c.companyName,
  phone: c.phone,
  email: c.email,
  sellerExternalId: c.seller.externalId,
  address: c.address,
  latitude: c.latitude,
  longitude: c.longitude,
});
const isCrmStatus = (label: string) =>
  [
    "prospect",
    "prospecto",
    "contacted",
    "contactado",
    "active",
    "activo",
  ].includes(label.trim().toLowerCase());

export function CustomersPage() {
  const cache = useQueryClient(),
    [params] = useSearchParams(),
    linked = params.get("selected");
  const { hasRole, can } = useAuthorization();
  const canExport = can("customers.export");
  const canViewTeam =
    hasRole("supervisor") ||
    hasRole("admin") ||
    hasRole("administrator") ||
    hasRole("super-admin");
  const canCreate = usePermission("customers.create"),
    canUpdate = usePermission("customers.update"),
    canDelete = usePermission("customers.delete");
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [seller, setSeller] = useState(""),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(linked),
    [mode, setMode] = useState<"view" | "create" | "edit" | null>(
      linked ? "view" : null,
    ),
    [quickTab, setQuickTab] = useState<"timeline" | "notes" | "reminders">(
      "timeline",
    ),
    [form, setForm] = useState(emptyForm),
    [notice, setNotice] = useState("");
  const [extras, setExtras] = useState(emptyExtras);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [openStatusEditor, setOpenStatusEditor] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useQuery({
    queryKey: ["customers", query, status, seller, page],
    queryFn: () =>
      customerService.list({
        search: query || undefined,
        status: status || undefined,
        externalUserId: canViewTeam && seller ? seller : undefined,
        page,
        pageSize: 20,
      }),
  });
  const metricSeller = canViewTeam && seller ? seller : undefined;
  const metrics = useQueries({
    queries: [undefined, "Prospect", "Active"].map((metricStatus) => ({
      queryKey: ["customer-metric", metricStatus ?? "total", metricSeller],
      queryFn: () =>
        customerService.list({
          status: metricStatus,
          externalUserId: metricSeller,
          page: 1,
          pageSize: 1,
        }),
    })),
  });
  const statuses = useQuery({
    queryKey: ["customer-statuses"],
    queryFn: customerService.statuses,
  });
  const crmStatuses = (statuses.data || []).filter((item) =>
    isCrmStatus(item.label),
  );
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: canViewTeam,
  });
  const detail = useQuery({
    queryKey: ["customer", selected],
    queryFn: () => customerService.detail(selected!),
    enabled: Boolean(selected),
  });
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: ["customers"] });
    await cache.invalidateQueries({ queryKey: ["customer-metric"] });
    if (selected)
      await cache.invalidateQueries({ queryKey: ["customer", selected] });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (mode !== "create") return customerService.update(detail.data!, form);
      const created = await customerService.create(form);
      const followUps: Promise<unknown>[] = [];
      if (extras.statusId)
        followUps.push(
          customerService.changeStatus(created.id, extras.statusId),
        );
      if (extras.initialNote.trim())
        followUps.push(customerService.addNote(created.id, extras.initialNote));
      if (extras.reminderText.trim() && extras.reminderAtUtc)
        followUps.push(
          customerService.addReminder(
            created.id,
            extras.reminderText,
            new Date(extras.reminderAtUtc).toISOString(),
            null,
          ),
        );
      const results = await Promise.allSettled(followUps);
      if (results.some((result) => result.status === "rejected"))
        notify(
          "El cliente fue creado, pero alguna acción de seguimiento no pudo guardarse.",
        );
      return created;
    },
    onSuccess: async () => {
      setNotice(
        mode === "create"
          ? "Cliente creado correctamente."
          : "Cliente actualizado correctamente.",
      );
      setMode(null);
      setSelected(null);
      setExtras(emptyExtras);
      await refresh();
    },
  });
  const state = useMutation({
    mutationFn: (id: number) => customerService.changeStatus(selected!, id),
    onMutate: (id) => {
      const label = statuses.data?.find((x) => x.value === id)?.label || "";
      cache.setQueriesData(
        { queryKey: ["customers"] },
        (data) =>
          updateCustomerStatus(data as never, selected!, label) as never,
      );
    },
    onSuccess: async () => {
      notify(`Se actualizó el estado de “${detail.data?.name || "cliente"}”.`);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => customerService.remove(selected!),
    onSuccess: async () => {
      setConfirmDelete(false);
      setDeleteTargetName("");
      setMode(null);
      setSelected(null);
      setNotice("Cliente eliminado correctamente.");
      await refresh();
    },
    onError: (error) => notify(message(error)),
  });
  const field = <K extends keyof CustomerInputDto>(
    key: K,
    value: CustomerInputDto[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const openCustomer = (
    customer: CustomerSummaryDto,
    tab: "timeline" | "notes" | "reminders" = "timeline",
  ) => {
    setOpenStatusEditor(false);
    setQuickTab(tab);
    setSelected(customer.externalId);
    setMode("view");
  };
  const editCustomer = async (customer: CustomerSummaryDto) => {
    try {
      const customerDetail = await cache.fetchQuery({
        queryKey: ["customer", customer.externalId],
        queryFn: () => customerService.detail(customer.externalId),
      });
      setSelected(customer.externalId);
      setForm(formFrom(customerDetail));
      setMode("edit");
    } catch (error) {
      notify(message(error), "error");
    }
  };

  if (mode === "create" || mode === "edit")
    return (
      <main className="customers-content entity-form-page">
        <header className="entity-form-header">
          <button
            className="back-button"
            type="button"
            onClick={() => {
              setMode(mode === "edit" && selected ? "view" : null);
              if (mode === "create") setSelected(null);
            }}
          >
            <ChevronLeft /> Volver a clientes
          </button>
          <div>
            <p className="overline">Clientes</p>
            <h1>{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</h1>
            <p>
              Organiza los datos comerciales, la asignación y la ubicación en un
              solo lugar.
            </p>
          </div>
        </header>
        <section className="entity-form-card">
          <CustomerForm
            form={form}
            field={field}
            submit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            busy={save.isPending}
            error={save.error}
            creating={mode === "create"}
            statuses={crmStatuses}
            extras={extras}
            setExtras={setExtras}
          />
        </section>
      </main>
    );

  return (
    <main className="customers-content">
      <header className="customers-heading">
        <div>
          <p className="overline">Gestión comercial</p>
          <h1>Clientes</h1>
          <p>Administra tu cartera de clientes y prospectos.</p>
        </div>
        <div className="heading-actions">
          <CustomerCsvActions
            canImport={false}
            canExport={canExport}
            onImported={refresh}
          />
          {canCreate && (
            <button
              className="action-primary"
              onClick={() => {
                setMode("create");
                setSelected(null);
                setForm(emptyForm);
              }}
            >
              <Plus />
              Nuevo cliente
            </button>
          )}
        </div>
      </header>
      {notice && <p className="customer-feedback">{notice}</p>}
      <section className="customer-metrics" aria-label="Resumen de clientes">
        {[
          { label: "Total clientes", index: 0 },
          { label: "Prospectos", index: 1 },
          { label: "Clientes activos", index: 2 },
        ].map(({ label, index }) => (
          <article key={label} className={index === 1 ? "accent" : ""}>
            <span>{label}</span>
            <strong>
              {metrics[index].isLoading
                ? "…"
                : metrics[index].isError
                  ? "—"
                  : (metrics[index].data?.totalItems ?? 0).toLocaleString(
                      "es-BO",
                    )}
            </strong>
          </article>
        ))}
      </section>
      <div className="customer-toolbar">
        <label>
          <Search />
          <input
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre, empresa o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {crmStatuses.map((x) => (
            <option key={x.value} value={x.label}>
              {translateValue(x.label)}
            </option>
          ))}
        </select>
        {canViewTeam && sellers.data && sellers.data.length > 1 && (
          <select
            aria-label="Filtrar por vendedor"
            value={seller}
            onChange={(e) => {
              setSeller(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los vendedores</option>
            {sellers.data.map((item) => (
              <option key={item.externalId} value={item.externalId}>
                {item.displayName}
              </option>
            ))}
          </select>
        )}
      </div>
      <section className="customer-table-card">
        {list.isLoading ? (
          <p className="table-message">Cargando clientes…</p>
        ) : list.isError ? (
          <p className="table-message error">{message(list.error)}</p>
        ) : !list.data?.customers.length ? (
          <p className="table-message">Aún no hay clientes registrados.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  {canViewTeam && <th>Vendedor</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.data.customers.map((c) => (
                  <tr key={c.externalId}>
                    <td>
                      <strong>{c.name}</strong>
                      <small>{c.companyName || "Sin empresa"}</small>
                    </td>
                    <td>
                      {c.phone || "—"}
                      <small>{c.email || "Sin correo"}</small>
                    </td>
                    <td>
                      <span className={`status-pill ${c.status.toLowerCase()}`}>
                        {translateValue(c.status)}
                      </span>
                    </td>
                    {canViewTeam && <td>{c.seller?.name || "Sin asignar"}</td>}
                    <td>
                      <div className="customer-row-actions">
                        <button
                          className="row-action"
                          onClick={() => openCustomer(c)}
                        >
                          Ver detalle
                        </button>
                        {(canUpdate || canDelete) && (
                          <details
                            className="row-actions-menu"
                            name="customer-actions"
                          >
                            <summary aria-label={`Más acciones para ${c.name}`}>
                              <MoreVertical />
                            </summary>
                            <div role="menu">
                              {canUpdate && (
                                <>
                                  <button
                                    onClick={() => openCustomer(c, "notes")}
                                  >
                                    Agregar nota
                                  </button>
                                  <button
                                    onClick={() => openCustomer(c, "reminders")}
                                  >
                                    Agregar recordatorio
                                  </button>
                                  <button onClick={() => void editCustomer(c)}>
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenStatusEditor(true);
                                      setQuickTab("timeline");
                                      setSelected(c.externalId);
                                      setMode("view");
                                    }}
                                  >
                                    Cambiar estado
                                  </button>
                                </>
                              )}
                              {canDelete && (
                                <button
                                  className="danger"
                                  onClick={() => {
                                    setSelected(c.externalId);
                                    setDeleteTargetName(c.name);
                                    setConfirmDelete(true);
                                  }}
                                >
                                  Desactivar/eliminar
                                </button>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <Pagination
            page={page}
            pageSize={list.data.pageSize}
            totalPages={list.data.totalPages}
            totalItems={list.data.totalItems}
            itemLabel="clientes"
            onChange={setPage}
          />
        )}
      </section>
      {mode && (
        <div className="customer-overlay">
          <aside className="customer-panel customer-panel-wide">
            <button
              className="panel-close"
              onClick={() => {
                setMode(null);
                setSelected(null);
                setOpenStatusEditor(false);
              }}
              aria-label="Cerrar"
            >
              <X />
            </button>
            {detail.isLoading ? (
              <p>Cargando…</p>
            ) : detail.isError ? (
              <p className="form-error">{message(detail.error)}</p>
            ) : (
              detail.data && (
                <CustomerDetail
                  customer={detail.data}
                  initialTab={quickTab}
                  statuses={crmStatuses}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  startChangingStatus={openStatusEditor}
                  changing={state.isPending}
                  change={(id) => state.mutate(id)}
                  edit={() => {
                    setOpenStatusEditor(false);
                    setForm(formFrom(detail.data!));
                    setMode("edit");
                  }}
                  remove={() => {
                    setDeleteTargetName(detail.data!.name);
                    setConfirmDelete(true);
                  }}
                />
              )
            )}
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar cliente"
        description={`Se desactivará a ${deleteTargetName || detail.data?.name || "este cliente"}. Esta acción puede estar restringida por el backend.`}
        confirmLabel="Eliminar"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteTargetName("");
        }}
      />
    </main>
  );
}
