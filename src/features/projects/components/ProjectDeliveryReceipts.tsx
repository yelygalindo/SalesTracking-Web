import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, FileText, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { notify } from "@/components/feedback/toast";
import {
  deliveryApi,
  type Delivery,
  type DeliveryAttachment,
} from "@/features/deliveries/api/deliveryApi";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { formatDate, formatDateTime } from "@/lib/i18n/dateTime";
import { translateValue } from "@/lib/i18n/labels";

const download = (
  run: () => Promise<{ blob: Blob; fileName: string }>,
) => run().then(({ blob, fileName }) => downloadBlob(blob, fileName));

/** Deliveries of a project with the receipts uploaded when they were received. */
export function ProjectDeliveryReceipts({ projectId }: { projectId: string }) {
  const deliveries = useQuery({
    queryKey: ["project-deliveries", projectId],
    queryFn: () => deliveryApi.byProject(projectId),
  });
  const archive = useMutation({
    mutationFn: () =>
      download(() =>
        deliveryApi.downloadGroupedArchive({ projectExternalId: projectId }),
      ),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const items = deliveries.data ?? [];
  const receipts = items.reduce((sum, item) => sum + item.attachmentCount, 0);

  return (
    <section className="project-delivery-receipts">
      <header>
        <div>
          <p className="overline">Recepción</p>
          <h3>Entregas y comprobantes</h3>
        </div>
        {receipts > 0 && (
          <button
            className="secondary-action"
            disabled={archive.isPending}
            onClick={() => archive.mutate()}
          >
            <Download />
            {archive.isPending ? "Preparando…" : "Descargar todos (ZIP)"}
          </button>
        )}
      </header>
      {deliveries.isLoading ? (
        <p className="activity-empty">Cargando entregas…</p>
      ) : deliveries.isError ? (
        <p className="form-error">No fue posible cargar las entregas.</p>
      ) : !items.length ? (
        <p className="activity-empty">Todavía no hay entregas registradas.</p>
      ) : (
        <ul>
          {items.map((delivery) => (
            <DeliveryRow key={delivery.externalId} delivery={delivery} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const [open, setOpen] = useState(false);
  const attachments = useQuery({
    queryKey: ["delivery-attachments", delivery.externalId],
    queryFn: () => deliveryApi.attachments(delivery.externalId),
    enabled: open,
  });
  const file = useMutation({
    mutationFn: (item: DeliveryAttachment) =>
      download(() =>
        deliveryApi.downloadAttachment(
          delivery.externalId,
          item.externalId,
          item.fileName,
        ),
      ),
    onError: (error: Error) => notify(error.message, "error"),
  });
  const products = delivery.items.map((item) => item.productName).join(", ");

  return (
    <li className={open ? "open" : undefined}>
      <div className="project-delivery-summary">
        <div>
          <Link to={`/deliveries?selected=${encodeURIComponent(delivery.externalId)}`}>
            Entrega del {formatDate(delivery.committedDateUtc)}
          </Link>
          <small title={products}>{products || "Sin productos"}</small>
        </div>
        <span className="status-pill">{translateValue(delivery.statusName)}</span>
        {delivery.attachmentCount > 0 ? (
          <button
            className="project-delivery-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Paperclip />
            {delivery.attachmentCount}{" "}
            {delivery.attachmentCount === 1 ? "comprobante" : "comprobantes"}
            <ChevronDown />
          </button>
        ) : (
          <small className="project-delivery-none">Sin comprobantes</small>
        )}
      </div>
      {open && (
        <div className="project-delivery-files">
          {attachments.isLoading ? (
            <p className="activity-empty">Cargando comprobantes…</p>
          ) : attachments.isError ? (
            <p className="form-error">No fue posible cargar los comprobantes.</p>
          ) : (
            attachments.data?.items.map((item) => (
              <button
                key={item.externalId}
                disabled={file.isPending}
                onClick={() => file.mutate(item)}
                title="Descargar"
              >
                <FileText />
                <span>
                  <strong>{item.caption || item.fileName}</strong>
                  <small>
                    {item.uploadedByUserName} · {formatDateTime(item.createdAtUtc)}
                  </small>
                </span>
                <Download />
              </button>
            ))
          )}
        </div>
      )}
    </li>
  );
}
