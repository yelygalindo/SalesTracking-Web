import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Download, FileText, PackageCheck, Paperclip, Pencil, Trash2 } from "lucide-react";
import { notify } from "@/components/feedback/toast";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { deliveryApi, type Delivery, type Status } from "../api/deliveryApi";

const message = (error: unknown) => error instanceof Error ? error.message : "No fue posible completar la operación.";
const statusClass = (value: string) => value.toLowerCase().replaceAll(" ", "-");
const formatBytes = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

export function DeliveryDetail({
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
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [attachmentType, setAttachmentType] = useState("Receipt");
  const [attachmentCaption, setAttachmentCaption] = useState("");
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name: string } | null>(null);
  const attachments = useQuery({
    queryKey: ["delivery-attachments", delivery.externalId],
    queryFn: () => deliveryApi.attachments(delivery.externalId),
  });
  const attachmentOptions = useQuery({
    queryKey: ["delivery-attachment-options"],
    queryFn: deliveryApi.attachmentOptions,
  });

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
    onSuccess: async (result) => {
      if (receiptFiles.length && result.receiptExternalId) {
        try {
          const uploaded = await deliveryApi.uploadAttachments(
            delivery.externalId,
            result.receiptExternalId,
            receiptFiles,
            attachmentType,
            attachmentCaption,
          );
          notify(
            uploaded.message || "Comprobantes cargados correctamente.",
            uploaded.failedFiles.length ? "error" : "success",
          );
        } catch (error) {
          notify(
            `La recepción fue registrada, pero no se pudieron cargar los comprobantes: ${message(error)}`,
            "error",
          );
        }
      } else notify("Recepción registrada correctamente.");
      setReceiptOpen(false);
      setQuantities({});
      setReceiptFiles([]);
      setAttachmentCaption("");
      await attachments.refetch();
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });
  const downloadAttachment = useMutation({
    mutationFn: (item: { id: string; name: string }) =>
      deliveryApi.downloadAttachment(delivery.externalId, item.id, item.name),
    onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
    onError: (error) => notify(message(error), "error"),
  });
  const removeAttachment = useMutation({
    mutationFn: (id: string) =>
      deliveryApi.deleteAttachment(delivery.externalId, id),
    onSuccess: async () => {
      notify("Comprobante eliminado correctamente.");
      setAttachmentToDelete(null);
      await attachments.refetch();
      await refresh();
    },
    onError: (error) => notify(message(error), "error"),
  });
  const downloadArchive = useMutation({
    mutationFn: () => deliveryApi.downloadArchive(delivery.externalId),
    onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
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
          <section className="delivery-receipt-evidence">
            <header>
              <Paperclip />
              <div>
                <strong>Comprobantes de recepción</strong>
                <small>Opcional: agrega hasta 10 fotos o documentos PDF.</small>
              </div>
            </header>
            <div className="delivery-evidence-fields">
              <label>
                Tipo
                <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
                  {(attachmentOptions.data?.attachmentTypes ?? [
                    { value: "Receipt", label: "Comprobante", description: "" },
                  ]).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label>
                Descripción
                <input value={attachmentCaption} placeholder="Ej. Material recibido en obra" onChange={(event) => setAttachmentCaption(event.target.value)} />
              </label>
              <label className="delivery-file-field">
                Archivos
                <input
                  multiple
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    const maxFiles = attachmentOptions.data?.maxFilesPerReceipt ?? 10;
                    const maxSize = attachmentOptions.data?.maxFileSizeBytes ?? 10 * 1024 * 1024;
                    if (files.length > maxFiles) {
                      notify(`Puedes adjuntar como máximo ${maxFiles} archivos.`, "error");
                      event.target.value = "";
                      return;
                    }
                    const oversized = files.find((file) => file.size > maxSize);
                    if (oversized) {
                      notify(`${oversized.name} supera el máximo de ${formatBytes(maxSize)}.`, "error");
                      event.target.value = "";
                      return;
                    }
                    setReceiptFiles(files);
                  }}
                />
              </label>
            </div>
            {!!receiptFiles.length && (
              <ul className="delivery-selected-files">
                {receiptFiles.map((file) => <li key={`${file.name}-${file.size}`}><FileText /><span>{file.name}</span><small>{formatBytes(file.size)}</small></li>)}
              </ul>
            )}
          </section>
          <footer>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setReceiptOpen(false);
                setQuantities({});
                setReceiptFiles([]);
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

      <section className="delivery-detail-card delivery-attachments-card">
        <header>
          <div>
            <h2>Comprobantes de entrega</h2>
            <p>Fotos y documentos asociados a las recepciones.</p>
          </div>
          {!!attachments.data?.items.length && (
            <button className="secondary-action" disabled={downloadArchive.isPending} onClick={() => downloadArchive.mutate()}>
              <Download /> {downloadArchive.isPending ? "Preparando…" : "Descargar ZIP"}
            </button>
          )}
        </header>
        {attachments.isLoading ? (
          <p className="delivery-attachment-empty">Cargando comprobantes…</p>
        ) : attachments.isError ? (
          <p className="form-error">No fue posible cargar los comprobantes.</p>
        ) : !attachments.data?.items.length ? (
          <p className="delivery-attachment-empty">Aún no hay comprobantes asociados a esta entrega.</p>
        ) : (
          <div className="delivery-attachment-grid">
            {attachments.data.items.map((item) => (
              <article key={item.externalId}>
                <span className={item.contentType.startsWith("image/") ? "photo" : "document"}><FileText /></span>
                <div>
                  <strong>{item.caption || item.fileName}</strong>
                  <small>{item.fileName} · {formatBytes(item.sizeBytes)}</small>
                  <small>{item.uploadedByUserName} · {formatDateTime(item.createdAtUtc)}</small>
                </div>
                <footer>
                  <button disabled={downloadAttachment.isPending} onClick={() => downloadAttachment.mutate({ id: item.externalId, name: item.fileName })}><Download /> Descargar</button>
                  {canUpdate && <button className="danger-text" disabled={removeAttachment.isPending} onClick={() => setAttachmentToDelete({ id: item.externalId, name: item.fileName })}>Eliminar</button>}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

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
      <ConfirmDialog
        open={Boolean(attachmentToDelete)}
        title="Eliminar comprobante"
        description={`¿Eliminar ${attachmentToDelete?.name ?? "este archivo"}?`}
        confirmLabel="Eliminar"
        busy={removeAttachment.isPending}
        onCancel={() => setAttachmentToDelete(null)}
        onConfirm={() => attachmentToDelete && removeAttachment.mutate(attachmentToDelete.id)}
      />
    </div>
  );
}
