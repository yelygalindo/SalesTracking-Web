import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { Pagination } from "@/components/data/Pagination";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { usePermission } from "@/hooks/usePermission";
import { projectService } from "@/features/projects/services/projectService";
import { productsApi } from "@/features/catalog/api/catalogApi";
import { AppError } from "@/lib/api/apiError";
import { translateValue } from "@/lib/i18n/labels";
import { formatDateTime } from "@/lib/i18n/dateTime";
import {
  deliveryApi,
  type Delivery,
  type Input,
  type Status,
} from "../api/deliveryApi";

const empty: Input = {
  projectExternalId: "",
  committedDateUtc: "",
  notes: null,
  items: [],
};

const message = (error: unknown) =>
  error instanceof AppError
    ? error.message
    : error instanceof Error
      ? error.message
      : "No fue posible completar la operación.";

const statusClass = (value: string) =>
  value.toLowerCase().replaceAll(" ", "-");

export function DeliveriesPage() {
  const cache = useQueryClient();
  const canCreate = usePermission("deliveries.create");
  const canUpdate = usePermission("deliveries.update");
  const canDelete = usePermission("deliveries.delete");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<number>();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<Input>(empty);

  const list = useQuery({
    queryKey: ["deliveries", status, page],
    queryFn: () => deliveryApi.list(status, page),
  });
  const statuses = useQuery({
    queryKey: ["delivery-statuses"],
    queryFn: deliveryApi.statuses,
  });
  const detail = useQuery({
    queryKey: ["delivery", selected],
    queryFn: () => deliveryApi.detail(selected!),
    enabled: Boolean(selected),
  });
  const projects = useQuery({
    queryKey: ["project-options"],
    queryFn: () => projectService.list("", 1),
  });
  const products = useQuery({
    queryKey: ["product-options"],
    queryFn: () => productsApi.list(),
  });

  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: ["deliveries"] });
    if (selected)
      await cache.invalidateQueries({ queryKey: ["delivery", selected] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (
        !form.projectExternalId ||
        !form.committedDateUtc ||
        !form.items.length ||
        form.items.some(
          (item) => !item.productExternalId || item.quantity <= 0,
        )
      )
        throw new Error(
          "Completa proyecto, fecha y al menos un producto con cantidad válida.",
        );

      const input = {
        ...form,
        committedDateUtc: new Date(form.committedDateUtc).toISOString(),
      };
      if (creating) return deliveryApi.create(input);
      return deliveryApi.update(detail.data!, input);
    },
    onSuccess: async () => {
      notify(creating ? "Entrega creada correctamente." : "Entrega actualizada.");
      const returnToList = creating;
      setCreating(false);
      setEditing(false);
      if (returnToList) setSelected(null);
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });

  const change = useMutation({
    mutationFn: (statusId: number) => deliveryApi.status(detail.data!, statusId),
    onSuccess: async () => {
      notify("Estado de entrega actualizado.");
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });

  const remove = useMutation({
    mutationFn: () => deliveryApi.remove(selected!),
    onSuccess: async () => {
      notify("Entrega eliminada correctamente.");
      setConfirmDelete(false);
      setSelected(null);
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });

  const openEdit = (delivery: Delivery) => {
    setForm({
      projectExternalId: delivery.projectExternalId,
      committedDateUtc: delivery.committedDateUtc.slice(0, 16),
      notes: delivery.notes,
      items: delivery.items.map((item) => ({
        productExternalId: item.productExternalId,
        quantity: item.quantity,
      })),
    });
    setEditing(true);
  };

  const closeForm = () => {
    setEditing(false);
    if (creating) {
      setCreating(false);
      setSelected(null);
    }
  };

  if (editing)
    return (
      <main className="customers-content entity-form-page delivery-page">
        <header className="entity-form-header">
          <button className="back-button" type="button" onClick={closeForm}>
            <ArrowLeft /> {creating ? "Volver a entregas" : "Volver al detalle"}
          </button>
          <div>
            <p className="overline">Logística</p>
            <h1>{creating ? "Nueva entrega" : "Editar entrega"}</h1>
            <p>
              Define el proyecto, la fecha comprometida y los materiales que
              forman parte de la entrega.
            </p>
          </div>
        </header>
        <section className="entity-form-card delivery-form-card">
          <DeliveryForm
            form={form}
            setForm={setForm}
            projects={projects.data?.items || []}
            products={products.data?.items || []}
            submit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            error={save.error}
            busy={save.isPending}
          />
        </section>
      </main>
    );

  if (selected)
    return (
      <main className="customers-content entity-form-page delivery-page">
        <button
          className="back-button delivery-back"
          onClick={() => setSelected(null)}
        >
          <ArrowLeft /> Volver a entregas
        </button>
        <DataState
          loading={detail.isLoading}
          error={detail.error}
          isEmpty={!detail.data}
          empty="No se encontró la entrega."
        >
          {detail.data && (
            <DeliveryDetail
              delivery={detail.data}
              statuses={statuses.data || []}
              canUpdate={canUpdate}
              canDelete={canDelete}
              edit={() => openEdit(detail.data!)}
              change={(statusId) => change.mutate(statusId)}
              changingStatus={change.isPending}
              remove={() => setConfirmDelete(true)}
              refresh={refresh}
            />
          )}
        </DataState>
        <ConfirmDialog
          open={confirmDelete}
          title="Eliminar entrega"
          description={`Se eliminará la entrega del proyecto ${detail.data?.projectName || "seleccionado"}.`}
          confirmLabel="Eliminar"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      </main>
    );

  return (
    <main className="customers-content delivery-page">
      <PageHeader
        eyebrow="Logística"
        title="Entregas"
        description="Compromisos, recepción y cumplimiento de materiales."
        action={
          canCreate && (
            <button
              className="action-primary"
              onClick={() => {
                setCreating(true);
                setEditing(true);
                setSelected(null);
                setForm(empty);
              }}
            >
              <Plus /> Nueva entrega
            </button>
          )
        }
      />
      <div className="customer-toolbar delivery-toolbar">
        <label>
          Estado
          <select
            value={status || ""}
            onChange={(event) => {
              setStatus(event.target.value ? Number(event.target.value) : undefined);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {statuses.data?.map((item) => (
              <option
                key={item.deliveryStatusId}
                value={item.deliveryStatusId}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="customer-table-card delivery-list-card">
        <DataState
          loading={list.isLoading}
          error={list.error}
          isEmpty={!list.data?.items.length}
          empty="No hay entregas para estos filtros."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Fecha comprometida</th>
                  <th>Vendedor</th>
                  <th>Estado</th>
                  <th>Avance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((delivery) => {
                  const total = delivery.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  );
                  const delivered = delivery.items.reduce(
                    (sum, item) => sum + item.deliveredQuantity,
                    0,
                  );
                  const progress = total ? Math.min(100, delivered / total * 100) : 0;
                  return (
                    <tr key={delivery.externalId}>
                      <td>
                        <strong>{delivery.projectName}</strong>
                        <small>
                          {delivery.items.length} producto
                          {delivery.items.length === 1 ? "" : "s"}
                        </small>
                      </td>
                      <td>{formatDateTime(delivery.committedDateUtc)}</td>
                      <td>{delivery.sellerName || "Sin asignar"}</td>
                      <td>
                        <span
                          className={`status-pill ${statusClass(delivery.statusName)}`}
                        >
                          {translateValue(delivery.statusName)}
                        </span>
                      </td>
                      <td>
                        <div className="delivery-list-progress">
                          <progress max="100" value={progress} />
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="row-action"
                          onClick={() => setSelected(delivery.externalId)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataState>
        {list.data && (
          <Pagination
            page={page}
            pageSize={list.data.pagination.pageSize}
            totalPages={list.data.pagination.totalPages}
            totalItems={list.data.pagination.totalItems}
            itemLabel="entregas"
            onChange={setPage}
          />
        )}
      </section>
    </main>
  );
}

function DeliveryForm({
  form,
  setForm,
  projects,
  products,
  submit,
  error,
  busy,
}: {
  form: Input;
  setForm: (input: Input) => void;
  projects: { externalId: string; name: string }[];
  products: { externalId: string; name: string }[];
  submit: (event: FormEvent) => void;
  error: unknown;
  busy: boolean;
}) {
  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { productExternalId: "", quantity: 1 }],
    });

  return (
    <form className="delivery-form" onSubmit={submit}>
      <section className="delivery-form-section">
        <header>
          <ClipboardList />
          <div>
            <h2>Información de la entrega</h2>
            <p>Datos del compromiso y observaciones para el equipo.</p>
          </div>
        </header>
        <div className="delivery-form-grid">
          <label>
            Proyecto *
            <select
              required
              value={form.projectExternalId}
              onChange={(event) =>
                setForm({ ...form, projectExternalId: event.target.value })
              }
            >
              <option value="">Seleccionar proyecto</option>
              {projects.map((project) => (
                <option key={project.externalId} value={project.externalId}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha comprometida *
            <input
              required
              type="datetime-local"
              value={form.committedDateUtc}
              onChange={(event) =>
                setForm({ ...form, committedDateUtc: event.target.value })
              }
            />
          </label>
          <label className="full-width">
            Notas
            <textarea
              rows={3}
              value={form.notes || ""}
              placeholder="Indicaciones, condiciones o referencias de la entrega"
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
        </div>
      </section>
      <section className="delivery-form-section delivery-products-editor">
        <header>
          <PackageCheck />
          <div>
            <h2>Productos comprometidos</h2>
            <p>Agrega al menos un producto y su cantidad.</p>
          </div>
          <button type="button" className="secondary-action" onClick={addItem}>
            <Plus /> Agregar producto
          </button>
        </header>
        {!form.items.length ? (
          <div className="delivery-items-empty">
            Aún no agregaste productos a esta entrega.
          </div>
        ) : (
          <div className="delivery-items-editor">
            {form.items.map((item, index) => (
              <div className="delivery-item" key={index}>
                <label>
                  Producto
                  <select
                    required
                    value={item.productExternalId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((current, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...current,
                                productExternalId: event.target.value,
                              }
                            : current,
                        ),
                      })
                    }
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((product) => (
                      <option key={product.externalId} value={product.externalId}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        items: form.items.map((current, itemIndex) =>
                          itemIndex === index
                            ? { ...current, quantity: Number(event.target.value) }
                            : current,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Quitar producto ${index + 1}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {Boolean(error) && <p className="form-error">{message(error)}</p>}
      <footer className="delivery-form-actions">
        <button className="action-primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar entrega"}
        </button>
      </footer>
    </form>
  );
}

function DeliveryDetail({
  delivery,
  statuses,
  canUpdate,
  canDelete,
  edit,
  change,
  changingStatus,
  remove,
  refresh,
}: {
  delivery: Delivery;
  statuses: Status[];
  canUpdate: boolean;
  canDelete: boolean;
  edit: () => void;
  change: (statusId: number) => void;
  changingStatus: boolean;
  remove: () => void;
  refresh: () => Promise<void>;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [statusId, setStatusId] = useState(delivery.statusId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => setStatusId(delivery.statusId), [delivery.statusId]);

  const pendingItems = delivery.items.filter(
    (item) => item.deliveredQuantity < item.quantity,
  );
  const total = delivery.items.reduce((sum, item) => sum + item.quantity, 0);
  const delivered = delivery.items.reduce(
    (sum, item) => sum + item.deliveredQuantity,
    0,
  );
  const progress = total ? Math.min(100, delivered / total * 100) : 0;
  const receiptTotal = Object.values(quantities).reduce(
    (sum, quantity) => sum + (quantity || 0),
    0,
  );

  const confirmReceipt = useMutation({
    mutationFn: () => deliveryApi.receipt(delivery, quantities),
    onSuccess: async () => {
      notify("Recepción registrada correctamente.");
      setReceiptOpen(false);
      setQuantities({});
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });

  return (
    <div className="delivery-detail-page">
      <header className="delivery-detail-hero">
        <div>
          <p className="overline">Detalle de entrega</p>
          <div className="delivery-title-row">
            <h1>{delivery.projectName}</h1>
            <span className={`status-pill ${statusClass(delivery.statusName)}`}>
              {translateValue(delivery.statusName)}
            </span>
          </div>
          <p>{delivery.notes || "Sin notas adicionales."}</p>
        </div>
        <div className="delivery-detail-actions">
          {canUpdate && (
            <button className="secondary-action" onClick={edit}>
              <Pencil /> Editar
            </button>
          )}
          {canUpdate && pendingItems.length > 0 && (
            <button
              className="action-primary"
              onClick={() => setReceiptOpen((current) => !current)}
            >
              <PackageCheck />
              {receiptOpen ? "Cerrar recepción" : "Registrar recepción"}
            </button>
          )}
          {canDelete && (
            <button className="danger-button" onClick={remove}>
              <Trash2 /> Eliminar
            </button>
          )}
        </div>
      </header>

      <section className="delivery-summary-grid">
        <article>
          <CalendarDays />
          <div>
            <span>Fecha comprometida</span>
            <strong>{formatDateTime(delivery.committedDateUtc)}</strong>
          </div>
        </article>
        <article>
          <ClipboardList />
          <div>
            <span>Vendedor responsable</span>
            <strong>{delivery.sellerName || "Sin asignar"}</strong>
          </div>
        </article>
        <article>
          <PackageCheck />
          <div>
            <span>Avance de recepción</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
        </article>
      </section>

      <section className="delivery-detail-card delivery-status-card">
        <div>
          <h2>Estado de la entrega</h2>
          <p>Actualiza el estado sólo cuando corresponda al avance operativo.</p>
        </div>
        <div className="delivery-status-control">
          <select
            disabled={!canUpdate || changingStatus}
            value={statusId}
            onChange={(event) => setStatusId(Number(event.target.value))}
          >
            {statuses.map((status) => (
              <option
                key={status.deliveryStatusId}
                value={status.deliveryStatusId}
              >
                {status.name}
              </option>
            ))}
          </select>
          {canUpdate && (
            <button
              className="secondary-action"
              disabled={statusId === delivery.statusId || changingStatus}
              onClick={() => change(statusId)}
            >
              {changingStatus ? "Actualizando…" : "Aplicar estado"}
            </button>
          )}
        </div>
      </section>

      {receiptOpen && (
        <form
          className="delivery-detail-card delivery-receipt-card"
          onSubmit={(event) => {
            event.preventDefault();
            confirmReceipt.mutate();
          }}
        >
          <header>
            <div>
              <p className="overline">Nueva recepción</p>
              <h2>¿Qué cantidades llegaron?</h2>
              <p>Registra únicamente lo recibido en este momento.</p>
            </div>
            <strong>{receiptTotal.toLocaleString("es-BO")} unidades</strong>
          </header>
          <div className="delivery-receipt-items">
            {pendingItems.map((item) => {
              const pending = item.quantity - item.deliveredQuantity;
              return (
                <label key={item.externalId}>
                  <span>
                    <strong>{item.productName}</strong>
                    <small>
                      Pendiente: {pending} {item.unitName}
                    </small>
                  </span>
                  <input
                    min="0"
                    max={pending}
                    step="0.01"
                    type="number"
                    value={quantities[item.externalId] || ""}
                    placeholder="0"
                    onChange={(event) =>
                      setQuantities({
                        ...quantities,
                        [item.externalId]: Number(event.target.value),
                      })
                    }
                  />
                </label>
              );
            })}
          </div>
          <footer>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setReceiptOpen(false);
                setQuantities({});
              }}
            >
              Cancelar
            </button>
            <button
              className="action-primary"
              disabled={!receiptTotal || confirmReceipt.isPending}
            >
              {confirmReceipt.isPending
                ? "Registrando…"
                : "Confirmar recepción"}
            </button>
          </footer>
        </form>
      )}

      <section className="delivery-detail-card delivery-products-card">
        <header>
          <div>
            <h2>Productos de la entrega</h2>
            <p>Comparación entre cantidades comprometidas y recibidas.</p>
          </div>
          <strong>
            {delivered.toLocaleString("es-BO")} de {total.toLocaleString("es-BO")}
          </strong>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Comprometido</th>
                <th>Recibido</th>
                <th>Pendiente</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {delivery.items.map((item) => {
                const itemProgress = item.quantity
                  ? Math.min(100, item.deliveredQuantity / item.quantity * 100)
                  : 0;
                return (
                  <tr key={item.externalId}>
                    <td>
                      <strong>{item.productName}</strong>
                      <small>{item.unitName}</small>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.deliveredQuantity}</td>
                    <td>{Math.max(0, item.quantity - item.deliveredQuantity)}</td>
                    <td>
                      <div className="delivery-list-progress">
                        <progress max="100" value={itemProgress} />
                        <span>{Math.round(itemProgress)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
