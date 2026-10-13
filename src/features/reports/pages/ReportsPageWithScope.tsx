import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, Download } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { notify } from "@/components/feedback/toast";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { customerService } from "@/features/customers/services/customerService";
import { deliveryApi } from "@/features/deliveries/api/deliveryApi";
import { translateValue } from "@/lib/i18n/labels";
import {
  reportApi,
  type ReportFilters,
  type ReportRow,
  type ReportType,
} from "../api/reportApi";

const labels: Record<ReportType, string> = {
  customers: "Contactos para seguimiento",
  deliveries: "Reporte de entregas",
  "commercial-activity": "Actividades",
};

const filtersByType: Record<ReportType, { dates: boolean; status: boolean }> = {
  customers: { dates: false, status: true },
  deliveries: { dates: true, status: true },
  "commercial-activity": { dates: true, status: false },
};

const inputDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
const initialTo = () => inputDate(new Date());
const initialFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return inputDate(date);
};

const formatDate = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("es-BO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(value)))
    : "—";

const humanKey = (value: string) =>
  (
    ({
      total: "Total",
      totalCustomers: "Contactos",
      activeCustomers: "Contactos activos",
      totalDeliveries: "Entregas",
      pendingDeliveries: "Pendientes",
      completedDeliveries: "Completadas",
      overdueDeliveries: "Vencidas",
      totalActivities: "Actividades",
    }) as Record<string, string>
  )[value] ??
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

export function ReportsPage() {
  const { type: routeType } = useParams();
  const { hasRole, can } = useAuthorization();
  const isSeller = hasRole("seller");
  const canChooseSeller = !isSeller && can("sellers.read");
  const type: ReportType =
    routeType && routeType in labels ? (routeType as ReportType) : "customers";
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sellerId, setSellerId] = useState("");
  const [status, setStatus] = useState("");
  const availableFilters = filtersByType[type];
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: canChooseSeller,
  });
  const customerStatuses = useQuery({
    queryKey: ["customer-statuses"],
    queryFn: customerService.statuses,
    enabled: type === "customers",
  });
  const deliveryStatuses = useQuery({
    queryKey: ["delivery-statuses"],
    queryFn: deliveryApi.statuses,
    enabled: type === "deliveries",
  });
  useEffect(() => {
    setStatus("");
    if (type === "deliveries") {
      setFrom("");
      setTo("");
    } else if (type === "commercial-activity") {
      setFrom(initialFrom());
      setTo(initialTo());
    }
  }, [type]);
  const customerStatusLabels = Object.fromEntries(
    (customerStatuses.data || []).map((item) => [
      item.value,
      translateValue(item.label),
    ]),
  );
  const filters = useMemo<ReportFilters>(
    () => ({
      from: availableFilters.dates && from ? from : undefined,
      to: availableFilters.dates && to ? to : undefined,
      sellerId: canChooseSeller && sellerId ? sellerId : undefined,
      status: availableFilters.status && status ? status : undefined,
    }),
    [availableFilters, canChooseSeller, from, sellerId, status, to],
  );
  const statusOptions =
    type === "customers"
      ? (customerStatuses.data ?? []).map((item) => ({
          value: item.value,
          label: translateValue(item.label),
        }))
      : (deliveryStatuses.data ?? []).map((item) => ({
          value: item.deliveryStatusId,
          label: translateValue(item.name),
        }));
  const query = useQuery({
    queryKey: ["report", type, filters],
    queryFn: () => reportApi.get(type, filters),
  });
  const exporter = useMutation({
    mutationFn: () => reportApi.exportDeliveries(filters),
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  if (!routeType) return <Navigate replace to="/reports/customers" />;
  if (!(routeType in labels)) return <Navigate replace to="/unauthorized" />;

  return (
    <main className="customers-content reports-page">
      <PageHeader
        eyebrow="Análisis"
        title={labels[type]}
        description={
          type === "commercial-activity"
            ? "Acciones realizadas durante las visitas y seguimientos del equipo."
            : isSeller
              ? "Consulta exclusivamente la información autorizada de tus contactos."
              : "Consulta información de seguimiento y operación."
        }
        action={
          type === "deliveries" ? (
            <button
              className="action-primary"
              disabled={exporter.isPending}
              onClick={() => exporter.mutate()}
            >
              <Download />
              {exporter.isPending ? "Exportando…" : "Exportar entregas"}
            </button>
          ) : undefined
        }
      />
      <section className="report-filters" aria-label="Filtros del reporte">
        {availableFilters.dates && (
          <>
            <label>
              Desde
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </>
        )}
        {canChooseSeller && (
          <label>
            Responsable
            <select
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
            >
              <option value="">Todos los responsables</option>
              {sellers.data?.map((seller) => (
                <option key={seller.externalId} value={seller.externalId}>
                  {seller.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        {availableFilters.status && (
          <label>
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Todos los estados</option>
              {statusOptions.map((item) => (
                <option key={item.value} value={String(item.value)}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {query.data?.summary && <ReportSummary values={query.data.summary} />}
      <section className="customer-table-card report-results">
        <DataState
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          skeleton="table"
          isEmpty={!query.data?.items.length}
          empty="No hay resultados para los filtros seleccionados."
        >
          <ReportTable
            type={type}
            rows={query.data?.items ?? []}
            canOpenCustomers={can("customers.read")}
            canOpenProjects={can("projects.read")}
            customerStatusLabels={customerStatusLabels}
          />
        </DataState>
      </section>
    </main>
  );
}

function ReportSummary({
  values,
}: {
  values: Record<string, string | number | null>;
}) {
  const entries = Object.entries(values).filter(([, value]) => value !== null);
  if (!entries.length) return null;
  return (
    <section className="report-summary" aria-label="Resumen del reporte">
      {entries.map(([key, value]) => (
        <article key={key}>
          <span>{humanKey(key)}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

interface Column {
  label: string;
  render: (row: ReportRow) => ReactNode;
}

function ReportTable({
  type,
  rows,
  canOpenCustomers,
  canOpenProjects,
  customerStatusLabels,
}: {
  type: ReportType;
  rows: ReportRow[];
  canOpenCustomers: boolean;
  canOpenProjects: boolean;
  customerStatusLabels: Record<number, string>;
}) {
  const customer = (row: ReportRow) =>
    row.customerExternalId && canOpenCustomers ? (
      <Link
        to={`/customers?selected=${encodeURIComponent(row.customerExternalId)}`}
      >
        {String(row.customerName || "Ver cliente")}
      </Link>
    ) : (
      String(row.customerName || "—")
    );
  const project = (row: ReportRow) =>
    row.projectExternalId && canOpenProjects ? (
      <Link
        to={`/projects?selected=${encodeURIComponent(row.projectExternalId)}`}
      >
        {String(row.projectName || "Ver proyecto")}
      </Link>
    ) : (
      String(row.projectName || "—")
    );
  const columns: Record<ReportType, Column[]> = {
    customers: [
      { label: "Cliente", render: (row) => customer(row) },
      { label: "Empresa", render: (row) => String(row.companyName || "—") },
      {
        label: "Contacto",
        render: (row) => (
          <>
            {String(row.phone || "—")}
            <small>{String(row.email || "")}</small>
          </>
        ),
      },
      {
        label: "Estado",
        render: (row) =>
          row.statusName || row.status
            ? translateValue(String(row.statusName || row.status))
            : row.statusId != null
              ? customerStatusLabels[row.statusId] || `Estado ${row.statusId}`
              : "—",
      },
      {
        label: "Próximo contacto",
        render: (row) => formatDate(row.nextContactAtUtc || row.reminderAtUtc),
      },
      { label: "Responsable", render: (row) => String(row.sellerName || "—") },
    ],
    deliveries: [
      {
        label: "Entrega",
        render: (row) =>
          String(row.productName || row.title || row.deliveryExternalId || "—"),
      },
      { label: "Proyecto", render: (row) => project(row) },
      { label: "Cliente", render: (row) => customer(row) },
      {
        label: "Estado",
        render: (row) =>
          translateValue(String(row.statusName || row.status || "")),
      },
      {
        label: "Fecha comprometida",
        render: (row) => formatDate(row.committedDateUtc),
      },
      {
        label: "Cantidad",
        render: (row) => (
          <>
            <strong>
              {String(row.deliveredQuantity ?? 0)} /{" "}
              {String(row.totalQuantity ?? 0)}
            </strong>
            <small>entregada / total</small>
          </>
        ),
      },
      {
        label: "Ítems",
        render: (row) => (
          <DeliveryItemsCell deliveryId={row.deliveryExternalId} />
        ),
      },
      { label: "Responsable", render: (row) => String(row.sellerName || "—") },
    ],
    "commercial-activity": [
      {
        label: "Actividad",
        render: (row) =>
          String(
            row.title || humanKey(String(row.eventTypeName || "Actividad")),
          ),
      },
      { label: "Cliente", render: (row) => customer(row) },
      { label: "Proyecto", render: (row) => project(row) },
      { label: "Responsable", render: (row) => String(row.sellerName || "—") },
      {
        label: "Fecha",
        render: (row) => formatDate(row.occurredAtUtc || row.createdAtUtc),
      },
    ],
  };
  if (type === "commercial-activity")
    return (
      <div className="activity-history" aria-label="Histórico de actividades">
        {rows.map((row, index) => (
          <article key={String(row.externalId || row.occurredAtUtc || index)}>
            <span className="activity-history-icon">
              <Activity />
            </span>
            <div className="activity-history-content">
              <header>
                <div>
                  <strong>
                    {String(
                      row.title ||
                        humanKey(String(row.eventTypeName || "Actividad")),
                    )}
                  </strong>
                  <small>
                    {String(row.description || "Acción registrada")}
                  </small>
                </div>
                <time>{formatDate(row.occurredAtUtc || row.createdAtUtc)}</time>
              </header>
              <footer>
                {row.customerName && <span>Contacto: {customer(row)}</span>}
                {row.projectName && <span>Seguimiento: {project(row)}</span>}
                {row.sellerName && (
                  <span>Responsable: {String(row.sellerName)}</span>
                )}
              </footer>
            </div>
          </article>
        ))}
      </div>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns[type].map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(
                row.externalId ||
                  row.deliveryExternalId ||
                  row.customerExternalId ||
                  index,
              )}
            >
              {columns[type].map((column) => (
                <td key={column.label}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryItemsCell({ deliveryId }: { deliveryId?: string }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["report-delivery-items", deliveryId],
    queryFn: () => deliveryApi.detail(deliveryId!),
    enabled: open && Boolean(deliveryId),
  });
  if (!deliveryId) return <>—</>;
  return (
    <>
      <button
        className="report-items-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        Ver ítems
      </button>
      {open && (
        <div
          className="report-items-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setOpen(false)
          }
        >
          <section
            className="report-items-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delivery-items-${deliveryId}`}
          >
            <header>
              <div>
                <p className="overline">Detalle de entrega</p>
                <h2 id={`delivery-items-${deliveryId}`}>Ítems</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </header>
            {detail.isLoading ? (
              <p className="report-items-state">Cargando ítems…</p>
            ) : detail.isError ? (
              <p className="report-items-state error">
                No fue posible cargar los ítems de esta entrega.
              </p>
            ) : detail.data?.items.length ? (
              <div className="report-items-list">
                {detail.data.items.map((item) => (
                  <article key={item.externalId}>
                    <div>
                      <strong>{item.productName}</strong>
                      <small>{item.unitName}</small>
                    </div>
                    <dl>
                      <div>
                        <dt>Solicitado</dt>
                        <dd>{item.quantity}</dd>
                      </div>
                      <div>
                        <dt>Entregado</dt>
                        <dd>{item.deliveredQuantity}</dd>
                      </div>
                      <div>
                        <dt>Pendiente</dt>
                        <dd>
                          {Math.max(0, item.quantity - item.deliveredQuantity)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className="report-items-state">Esta entrega no tiene ítems.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
