import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronLeft,
  Download,
  FileSpreadsheet,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { customerService } from "@/features/customers/services/customerService";
import type {
  CustomerCreateExtrasDto,
  CustomerDetailDto,
  CustomerInputDto,
  CustomerReminderDto,
  CustomerStatusDto,
  CustomerSummaryDto,
} from "@/features/customers/api/customerDtos";
import { AppError } from "@/lib/api/apiError";
import { LocationPicker } from "@/components/maps/LocationPickerModern";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LocationViewer } from "@/components/maps/LocationViewer";
import { notify } from "@/components/feedback/toast";
import { updateCustomerStatus } from "@/lib/api/optimisticUpdates";
import { CustomerTimeline } from "@/features/customers/components/CustomerTimeline";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { translateValue } from "@/lib/i18n/labels";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { exportExcel } from "@/lib/export/exportExcel";
import { Pagination } from "@/components/data/Pagination";
import { deliveryApi } from "@/features/deliveries/api/deliveryApi";
import { downloadBlob } from "@/lib/export/downloadBlob";

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
  const { hasRole } = useAuthorization();
  const canExport =
    hasRole("admin") ||
    hasRole("administrator") ||
    hasRole("super-admin");
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
  const exporter = useMutation({
    mutationFn: async () => {
      const rows: CustomerSummaryDto[] = [];
      let exportPage = 1;
      let totalPages = 1;
      do {
        const result = await customerService.list({
          search: query || undefined,
          status: status || undefined,
          externalUserId: canViewTeam && seller ? seller : undefined,
          page: exportPage,
          pageSize: 100,
        });
        rows.push(...result.customers);
        totalPages = result.totalPages;
        exportPage += 1;
      } while (exportPage <= totalPages);
      exportExcel(
        `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          { label: "Cliente", value: (row) => row.name },
          { label: "Empresa", value: (row) => row.companyName },
          { label: "Teléfono", value: (row) => row.phone },
          { label: "Correo", value: (row) => row.email },
          { label: "Estado", value: (row) => row.status },
          { label: "Vendedor", value: (row) => row.seller?.name || "" },
        ],
        rows,
      );
    },
    onError: (error) => notify(message(error), "error"),
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
              Organiza los datos comerciales, la asignación y la ubicación en
              un solo lugar.
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
        {canExport && (
          <button
            className="excel-export-button"
            disabled={exporter.isPending}
            onClick={() => exporter.mutate()}
          >
            <span className="excel-export-icon" aria-hidden="true">
              <FileSpreadsheet />
            </span>
            {exporter.isPending ? "Exportando…" : "Exportar CSV"}
          </button>
        )}
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
                                  <button onClick={() => openCustomer(c, "notes")}>
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

function CustomerDetail({
  customer,
  initialTab,
  statuses,
  canUpdate,
  canDelete,
  startChangingStatus,
  changing,
  change,
  edit,
  remove,
}: {
  customer: CustomerDetailDto;
  initialTab: "timeline" | "notes" | "reminders";
  statuses: CustomerStatusDto[];
  canUpdate: boolean;
  canDelete: boolean;
  startChangingStatus: boolean;
  changing: boolean;
  change: (id: number) => void;
  edit: () => void;
  remove: () => void;
}) {
  const [changingStatus, setChangingStatus] = useState(startChangingStatus);
  const canReadDeliveries = usePermission("deliveries.read");
  const deliveryArchive = useMutation({
    mutationFn: () =>
      deliveryApi.downloadGroupedArchive({
        customerExternalId: customer.externalId,
      }),
    onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
    onError: (error) => notify(
      error instanceof Error ? error.message : "No fue posible descargar los comprobantes.",
      "error",
    ),
  });
  const applyStatus = (id: number) => {
    change(id);
    setChangingStatus(false);
  };
  return (
    <>
      <header className="customer-detail-header">
        <div>
          <p className="overline">Ficha CRM</p>
          <div className="customer-title-line">
            <h2>{customer.name}</h2>
            <span className={`status-pill ${customer.status.toLowerCase()}`}>
              {translateValue(customer.status)}
            </span>
          </div>
          <p>{customer.companyName || "Sin empresa"}</p>
          <div className="customer-contact-line">
            {customer.phone && (
              <a href={`tel:${customer.phone}`}>
                <Phone />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`}>
                <Mail />
                {customer.email}
              </a>
            )}
            <span>
              <UserRound />
              {customer.seller?.name || "Sin responsable"}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          {canReadDeliveries && (
            <button className="secondary-button" disabled={deliveryArchive.isPending} onClick={() => deliveryArchive.mutate()}>
              <Download /> {deliveryArchive.isPending ? "Preparando…" : "Comprobantes ZIP"}
            </button>
          )}
          {canUpdate && (
            <button
              className="secondary-button"
              onClick={() => setChangingStatus((value) => !value)}
            >
              <RefreshCw />
              Cambiar estado
            </button>
          )}
          {canUpdate && (
            <button className="action-primary" onClick={edit}>
              <Pencil />
              Editar
            </button>
          )}
          {canDelete && (
            <button className="danger-button" onClick={remove}>
              <Trash2 />
              Eliminar
            </button>
          )}
        </div>
      </header>
      {changingStatus && (
        <div className="customer-status-action">
          <label>
            Nuevo estado
            <select
              defaultValue={customer.statusId}
              disabled={changing}
              onChange={(e) => applyStatus(Number(e.target.value))}
            >
              {statuses.map((x) => (
                <option key={x.value} value={x.value}>
                  {translateValue(x.label)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setChangingStatus(false)}>Cancelar</button>
        </div>
      )}
      <div className="customer-detail-grid">
        <section className="customer-summary-card">
          <h3>Datos comerciales</h3>
          <dl className="customer-detail">
            <div>
              <dt>Empresa</dt>
              <dd>{customer.companyName || "Sin empresa"}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{customer.seller?.name || "Sin asignar"}</dd>
            </div>
            <div>
              <dt>Último contacto</dt>
              <dd>
                {customer.lastContactAtUtc
                  ? formatDate(customer.lastContactAtUtc)
                  : "Sin registro"}
              </dd>
            </div>
            <div>
              <dt>Próximo contacto</dt>
              <dd>
                {customer.nextContactAtUtc
                  ? formatDate(customer.nextContactAtUtc)
                  : "Sin programar"}
              </dd>
            </div>
            <div className="customer-address">
              <dt>Dirección</dt>
              <dd>
                <MapPin />
                {customer.address || "Sin dirección registrada"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="customer-map-card">
          <h3>Ubicación</h3>
          <LocationViewer
            latitude={customer.latitude}
            longitude={customer.longitude}
            label={customer.address}
          />
        </section>
      </div>
      <CustomerActivity
        key={`${customer.externalId}-${initialTab}`}
        externalId={customer.externalId}
        initialTab={initialTab}
      />
    </>
  );
}

function CustomerForm({
  form,
  field,
  submit,
  busy,
  error,
  creating,
  statuses,
  extras,
  setExtras,
}: {
  form: CustomerInputDto;
  field: <K extends keyof CustomerInputDto>(
    key: K,
    value: CustomerInputDto[K],
  ) => void;
  submit: (e: FormEvent) => void;
  busy: boolean;
  error: unknown;
  creating: boolean;
  statuses: CustomerStatusDto[];
  extras: CustomerCreateExtrasDto;
  setExtras: Dispatch<SetStateAction<CustomerCreateExtrasDto>>;
}) {
  const { user } = useAuth(),
    isSeller =
      user?.roles.some((role) => role.toLowerCase() === "seller") ?? false;
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: !isSeller,
  });
  return (
    <>
      <p className="overline">Clientes</p>
      <h2>Datos del cliente</h2>
      <form className="customer-form" onSubmit={submit}>
        <label>
          Nombre *
          <input
            required
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          Empresa
          <input
            value={form.companyName}
            onChange={(e) => field("companyName", e.target.value)}
          />
        </label>
        <label>
          Teléfono
          <input
            value={form.phone}
            onChange={(e) => field("phone", e.target.value)}
          />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => field("email", e.target.value)}
          />
        </label>
        <label>
          Dirección
          <input
            value={form.address ?? ""}
            onChange={(e) => field("address", e.target.value)}
          />
        </label>
        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => {
            field("latitude", lat);
            field("longitude", lng);
          }}
        />
        {isSeller ? (
          <p className="assignment-note">
            El cliente se asignará automáticamente a tu usuario.
          </p>
        ) : (
          <>
            <label>
              Vendedor
              <select
                value={form.sellerExternalId ?? ""}
                onChange={(e) => field("sellerExternalId", e.target.value)}
              >
                <option value="">
                  El vendedor será asignado automáticamente
                </option>
                {sellers.data?.map((s) => (
                  <option key={s.externalId} value={s.externalId}>
                    {s.displayName} · {s.email}
                  </option>
                ))}
              </select>
            </label>
            {sellers.isError && (
              <p className="form-error">
                No se pudo cargar la lista de vendedores.
              </p>
            )}
          </>
        )}
        {creating && (
          <fieldset className="customer-form-extras">
            <legend>Seguimiento inicial</legend>
            <label>
              Estado
              <select
                value={extras.statusId ?? ""}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    statusId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">Estado inicial predeterminado</option>
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {translateValue(item.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nota inicial
              <textarea
                rows={3}
                value={extras.initialNote}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    initialNote: e.target.value,
                  }))
                }
                placeholder="Contexto comercial del cliente"
              />
            </label>
            <label>
              Recordatorio opcional
              <input
                value={extras.reminderText}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    reminderText: e.target.value,
                  }))
                }
                placeholder="Próximo paso"
              />
            </label>
            <label>
              Próximo contacto
              <input
                type="datetime-local"
                value={extras.reminderAtUtc}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    reminderAtUtc: e.target.value,
                  }))
                }
              />
            </label>
          </fieldset>
        )}
        {Boolean(error) && <p className="form-error">{message(error)}</p>}
        <button className="action-primary submit-customer" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cliente"}
        </button>
      </form>
    </>
  );
}

function CustomerActivity({
  externalId,
  initialTab = "timeline",
}: {
  externalId: string;
  initialTab?: "timeline" | "notes" | "reminders";
}) {
  const cache = useQueryClient(),
    canUpdate = usePermission("customers.update");
  const [tab, setTab] = useState<"notes" | "reminders" | "timeline">(
      initialTab,
    ),
    [text, setText] = useState(""),
    [date, setDate] = useState("");
  const notes = useQuery({
      queryKey: ["customer-notes", externalId],
      queryFn: () => customerService.notes(externalId),
      enabled: tab === "notes",
    }),
    reminders = useQuery({
      queryKey: ["customer-reminders", externalId],
      queryFn: () => customerService.reminders(externalId),
      enabled: tab === "reminders",
    }),
    timeline = useQuery({
      queryKey: ["customer-timeline", externalId],
      queryFn: () => customerService.timeline(externalId),
      enabled: tab === "timeline",
    });
  const invalidate = async () => {
    await cache.invalidateQueries({
      queryKey: ["customer-timeline", externalId],
    });
  };
  const addNote = useMutation({
      mutationFn: () => customerService.addNote(externalId, text),
      onSuccess: async () => {
        setText("");
        await cache.invalidateQueries({
          queryKey: ["customer-notes", externalId],
        });
        await invalidate();
      },
    }),
    addReminder = useMutation({
      mutationFn: () =>
        customerService.addReminder(
          externalId,
          text,
          new Date(date).toISOString(),
          null,
        ),
      onSuccess: async () => {
        setText("");
        setDate("");
        await cache.invalidateQueries({
          queryKey: ["customer-reminders", externalId],
        });
        await invalidate();
      },
    }),
    complete = useMutation({
      mutationFn: (id: string) =>
        customerService.completeReminder(externalId, id),
      onSuccess: async () => {
        await cache.invalidateQueries({
          queryKey: ["customer-reminders", externalId],
        });
        await invalidate();
      },
    });
  return (
    <section className="customer-activity">
      <nav className="activity-tabs">
        <button
          className={tab === "timeline" ? "active" : ""}
          onClick={() => setTab("timeline")}
        >
          Actividad
        </button>
        <button
          className={tab === "notes" ? "active" : ""}
          onClick={() => setTab("notes")}
        >
          Notas
        </button>
        <button
          className={tab === "reminders" ? "active" : ""}
          onClick={() => setTab("reminders")}
        >
          Recordatorios
        </button>
      </nav>
      {tab === "notes" && (
        <>
          {canUpdate && (
            <form
              className="activity-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) addNote.mutate();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe una nota"
              />
              <button disabled={addNote.isPending}>Agregar</button>
            </form>
          )}
          <ActivityList
            loading={notes.isLoading}
            error={notes.error}
            empty="Aún no hay notas para este cliente."
          >
            {notes.data?.map((n) => (
              <article key={n.externalId}>
                <strong>{n.author?.name || "Usuario"}</strong>
                <time>{formatDate(n.occurredAtUtc)}</time>
                <p>{n.text}</p>
              </article>
            ))}
          </ActivityList>
        </>
      )}
      {tab === "reminders" && (
        <>
          {canUpdate && (
            <form
              className="activity-form reminder-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim() && date) addReminder.mutate();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nuevo recordatorio"
              />
              <input
                aria-label="Fecha del recordatorio"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button disabled={addReminder.isPending}>Crear</button>
            </form>
          )}
          <ActivityList
            loading={reminders.isLoading}
            error={reminders.error}
            empty="No hay recordatorios pendientes."
          >
            {reminders.data?.length ? (
              <>
                {reminders.data.some((item) => !item.completed) && (
                  <section className="reminder-group">
                    <h3>Pendientes</h3>
                    {reminders.data
                      .filter((item) => !item.completed)
                      .map((r) => (
                        <ReminderItem
                          key={r.externalId}
                          reminder={r}
                          busy={complete.isPending}
                          complete={() => complete.mutate(r.externalId)}
                        />
                      ))}
                  </section>
                )}
                {reminders.data.some((item) => item.completed) && (
                  <section className="reminder-group completed">
                    <h3>Completados</h3>
                    {reminders.data
                      .filter((item) => item.completed)
                      .map((r) => (
                        <ReminderItem
                          key={r.externalId}
                          reminder={r}
                          busy={complete.isPending}
                        />
                      ))}
                  </section>
                )}
              </>
            ) : null}
          </ActivityList>
        </>
      )}
      {tab === "timeline" && (
        <CustomerTimeline
          items={timeline.data?.items || []}
          loading={timeline.isLoading}
          error={timeline.error}
        />
      )}
    </section>
  );
}
function ActivityList({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  children: ReactNode;
}) {
  if (loading) return <p className="activity-empty">Cargando…</p>;
  if (error) return <p className="form-error">{message(error)}</p>;
  return (
    <div className="activity-list">
      {children || <p className="activity-empty">{empty}</p>}
    </div>
  );
}
function ReminderItem({
  reminder,
  busy,
  complete,
}: {
  reminder: CustomerReminderDto;
  busy: boolean;
  complete?: () => void;
}) {
  return (
    <article className={reminder.completed ? "completed" : ""}>
      <div className="activity-title">
        <strong>{reminder.text}</strong>
        <span
          className={`reminder-status ${reminder.completed ? "done" : reminderClass(reminder.reminderAt)}`}
        >
          {reminder.completed
            ? "Completado"
            : reminderStatus(reminder.reminderAt)}
        </span>
      </div>
      <time>{formatDate(reminder.reminderAt)}</time>
      <p>{reminder.assignedTo?.name || "Sin asignar"}</p>
      {complete && (
        <button className="complete-button" disabled={busy} onClick={complete}>
          Completar
        </button>
      )}
    </article>
  );
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const reminderStatus = (value: string) =>
  new Date(value).getTime() < Date.now() ? "Vencido" : "Pendiente";
const reminderClass = (value: string) =>
  new Date(value).getTime() < Date.now() ? "overdue" : "pending";
