import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
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
import { deliveryApi, type Delivery, type Input } from "../api/deliveryApi";
import { DeliveryForm } from "../components/DeliveryForm";
import { DeliveryDetail } from "../components/DeliveryDetail";

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
