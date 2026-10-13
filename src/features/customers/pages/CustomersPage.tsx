import { useEffect, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronLeft,
  Eye,
  Mail,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import {
  gendered,
  inSentence,
  newLabel,
} from "@/features/operation-settings/services/operationTerms";
import { customerService } from "@/features/customers/services/customerService";
import type {
  CustomerCreateExtrasDto,
  CustomerDetailDto,
  CustomerInputDto,
  CustomerSummaryDto,
} from "@/features/customers/api/customerDtos";
import { errorMessage } from "@/lib/api/errorMessage";
import { EmptyState, ErrorState } from "@/components/data/DataState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { notify } from "@/components/feedback/toast";
import { updateCustomerStatus } from "@/lib/api/optimisticUpdates";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { CustomerDetail } from "@/features/customers/components/CustomerDetail";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { translateValue } from "@/lib/i18n/labels";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { Pagination } from "@/components/data/Pagination";
import { CustomerCsvActions } from "@/features/customers/components/CustomerCsvActions";
import { ImportLink } from "@/components/imports/ImportLink";
import { formatDate } from "@/lib/i18n/dateTime";

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
const whatsappHref = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  const international = digits.length === 8 ? `591${digits}` : digits;
  return `https://wa.me/${international}`;
};
const emptyExtras: CustomerCreateExtrasDto = {
  statusId: null,
  initialNote: "",
  reminderText: "",
  reminderAtUtc: "",
};
const message = errorMessage;
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
    "inactive",
    "inactivo",
  ].includes(label.trim().toLowerCase());

export function CustomersPage() {
  const cache = useQueryClient(),
    [params] = useSearchParams(),
    linked = params.get("selected");
  const { hasRole, can } = useAuthorization();
  const {
    labels: { customer },
  } = useOperationTerms();
  const canExport = can("customers.export");
  const canImport = can("customers.import");
  const canViewTeam =
    hasRole("supervisor") ||
    hasRole("admin") ||
    hasRole("administrator") ||
    hasRole("super-admin");
  const canCreate = usePermission("customers.create"),
    canUpdate = usePermission("customers.update"),
    canDelete = usePermission("customers.delete");
  const filters = useUrlFilters(["q", "status", "seller"] as const),
    { q: query, status, seller } = filters.values,
    { page, setPage, update: updateFilters } = filters;
  const [search, setSearch] = useState(query);
  // Follow external URL changes (e.g. opening "Contactos" from the menu clears the search).
  useEffect(() => setSearch(query), [query]);
  const [selected, setSelected] = useState<string | null>(linked),
    [mode, setMode] = useState<"view" | "create" | "edit" | null>(
      linked ? "view" : null,
    ),
    [quickTab, setQuickTab] = useState<"timeline" | "notes" | "reminders">(
      "timeline",
    ),
    [form, setForm] = useState(emptyForm),
    [notice, setNotice] = useState("");
  // Opening a contact from the global search changes ?selected while the page stays mounted.
  useEffect(() => {
    if (!linked) return;
    setSelected(linked);
    setMode("view");
  }, [linked]);
  const [extras, setExtras] = useState(emptyExtras);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [openStatusEditor, setOpenStatusEditor] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== query) updateFilters({ q: search.trim() });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, query, updateFilters]);
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
    mutationFn: ({ id, customerId }: { id: number; customerId: string; undo?: boolean }) =>
      customerService.changeStatus(customerId, id),
    onMutate: ({ id, customerId }) => {
      const label = statuses.data?.find((x) => x.value === id)?.label || "";
      cache.setQueriesData(
        { queryKey: ["customers"] },
        (data) =>
          updateCustomerStatus(data as never, customerId, label) as never,
      );
      return {
        previousStatusId: detail.data?.statusId,
        name: detail.data?.name || "cliente",
      };
    },
    onSuccess: async (_result, { undo, customerId }, context) => {
      const name = context?.name || "cliente";
      const previous = context?.previousStatusId;
      if (undo) notify(`Se restauró el estado de “${name}”.`);
      else
        notify(
          `Se actualizó el estado de “${name}”.`,
          "success",
          previous === undefined
            ? undefined
            : {
                label: "Deshacer",
                onAction: () =>
                  state.mutate({ id: previous, customerId, undo: true }),
              },
        );
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
  // Snapshot taken when the form opens; any difference marks it as dirty.
  const editing = mode === "create" || mode === "edit";
  const [baseline, setBaseline] = useState("");
  const snapshot = JSON.stringify({ form, extras });
  useEffect(() => {
    if (editing) setBaseline(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the form opens
  }, [editing, selected]);
  const { confirmLeave, dialog: unsavedDialog } = useUnsavedChanges(
    editing && baseline !== "" && snapshot !== baseline,
  );
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
        {unsavedDialog}
        <header className="entity-form-header">
          <button
            className="back-button"
            type="button"
            onClick={() =>
              confirmLeave(() => {
                setMode(mode === "edit" && selected ? "view" : null);
                if (mode === "create") setSelected(null);
              })
            }
          >
            <ChevronLeft /> Volver a {inSentence(customer.plural)}
          </button>
          <div>
            <p className="overline">{customer.plural}</p>
            <h1>
              {mode === "create"
                ? newLabel(customer.singular)
                : `Editar ${inSentence(customer.singular)}`}
            </h1>
            <p>
              Organiza los datos, la asignación y la ubicación en un solo lugar.
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
          <p className="overline">Comercial</p>
          <h1>{customer.plural}</h1>
          <p>Administra las personas y organizaciones de tu cartera.</p>
        </div>
        <div className="heading-actions">
          {canImport && <ImportLink to="/customers/import" />}
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
              {newLabel(customer.singular)}
            </button>
          )}
        </div>
      </header>
      {notice && <p className="customer-feedback">{notice}</p>}
      <section className="customer-metrics" aria-label={`Resumen de ${inSentence(customer.plural)}`}>
        {[
          { label: `Total ${inSentence(customer.plural)}`, index: 0, filter: "" },
          { label: "Prospectos", index: 1, filter: "Prospect" },
          {
            label: `${customer.plural} ${gendered(customer.singular, "activos", "activas")}`,
            index: 2,
            filter: "Active",
          },
        ].map(({ label, index, filter }) => (
          <button
            type="button"
            key={label}
            className={`metric-filter${index === 1 ? " accent" : ""}`}
            aria-pressed={status === filter}
            title={filter ? `Ver solo ${label.toLowerCase()}` : "Ver todos"}
            onClick={() => updateFilters({ status: filter })}
          >
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
          </button>
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
            updateFilters({ status: e.target.value });
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
              updateFilters({ seller: e.target.value });
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
          <Skeleton variant="table" rows={6} label={`Cargando ${inSentence(customer.plural)}…`} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : !list.data?.customers.length ? (
          query || status || seller ? (
            <EmptyState
              icon={<Search />}
              title={`No hay ${inSentence(customer.plural)} que coincidan`}
              description="Prueba con otra búsqueda o quita los filtros."
              action={
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSearch("");
                    updateFilters({ q: "", status: "", seller: "" });
                  }}
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              title={`Aún no hay ${inSentence(customer.plural)}`}
              description={`Registra tu primer ${inSentence(customer.singular)} para empezar a darle seguimiento.`}
              action={
                canCreate && (
                  <button
                    className="action-primary"
                    onClick={() => {
                      setMode("create");
                      setSelected(null);
                      setForm(emptyForm);
                    }}
                  >
                    <Plus />
                    {newLabel(customer.singular)}
                  </button>
                )
              }
            />
          )
        ) : (
          <div className="table-scroll search-results-scroll">
            <table className="search-results-table customers-results-table">
              <thead>
                <tr>
                  <th className="result-col-primary">Cliente</th>
                  <th className="result-col-secondary">Contacto</th>
                  <th className="result-col-status">Estado</th>
                  <th className="result-col-tertiary">Seguimiento</th>
                  {canViewTeam && (
                    <th className="result-col-tertiary">Responsable</th>
                  )}
                  <th className="result-col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.data.customers.map((c) => (
                  <tr key={c.externalId}>
                    <td className="result-col-primary">
                      <strong>{c.name}</strong>
                      <small>{c.companyName || "Sin empresa"}</small>
                    </td>
                    <td className="result-col-secondary" data-label="Contacto">
                      {c.phone || "—"}
                      <small>{c.email || "Sin correo"}</small>
                    </td>
                    <td className="result-col-status" data-label="Estado">
                      <span className={`status-pill ${c.status.toLowerCase()}`}>
                        {translateValue(c.status)}
                      </span>
                    </td>
                    <td
                      className="result-col-tertiary customer-follow-up"
                      data-label="Seguimiento"
                    >
                      <small>
                        Último:{" "}
                        {c.lastContactAtUtc
                          ? formatDate(c.lastContactAtUtc)
                          : "sin registro"}
                      </small>
                      <small
                        className={
                          c.nextContactAtUtc &&
                          new Date(c.nextContactAtUtc) < new Date()
                            ? "overdue"
                            : ""
                        }
                      >
                        Próximo:{" "}
                        {c.nextContactAtUtc
                          ? formatDate(c.nextContactAtUtc)
                          : "sin programar"}
                      </small>
                    </td>
                    {canViewTeam && (
                      <td className="result-col-tertiary" data-label="Responsable">
                        {c.seller?.name || "Sin asignar"}
                      </td>
                    )}
                    <td className="result-col-actions">
                      <div className="customer-row-actions">
                        {c.phone && (
                          <a
                            className="customer-contact-action whatsapp"
                            href={whatsappHref(c.phone)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Contactar a ${c.name} por WhatsApp`}
                            title="Contactar por WhatsApp"
                          >
                            <MessageCircle />
                          </a>
                        )}
                        {c.email && (
                          <a
                            className="customer-contact-action email"
                            href={`mailto:${c.email}`}
                            aria-label={`Enviar correo a ${c.name}`}
                            title="Enviar correo"
                          >
                            <Mail />
                          </a>
                        )}
                        <button
                          className="row-action"
                          onClick={() => openCustomer(c)}
                        >
                          <Eye /> Ver detalle
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
                  change={(id) => state.mutate({ id, customerId: selected! })}
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
