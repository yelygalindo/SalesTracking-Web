import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
  customers: "Clientes para contactar",
  deliveries: "Entregas pendientes",
  productivity: "Productividad",
  "commercial-activity": "Actividad comercial",
};

const filtersByType: Record<
  ReportType,
  { dates: boolean; status: boolean; zone: boolean }
> = {
  customers: { dates: false, status: true, zone: true },
  deliveries: { dates: true, status: true, zone: true },
  productivity: { dates: true, status: false, zone: true },
  "commercial-activity": { dates: true, status: false, zone: true },
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
      totalCustomers: "Clientes",
      activeCustomers: "Clientes activos",
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, can } = useAuthorization();
  const isSeller = hasRole("seller");
  const canChooseSeller = !isSeller && can("sellers.read");
  const requestedType = searchParams.get("type") as ReportType | null;
  const [type, setType] = useState<ReportType>(requestedType && requestedType in labels ? requestedType : "customers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  useEffect(() => {
    const nextType = searchParams.get("type") as ReportType | null;
    if (nextType && nextType in labels) setType(nextType);
  }, [searchParams]);
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
      zoneId: availableFilters.zone && zoneId ? zoneId : undefined,
    }),
    [availableFilters, canChooseSeller, from, sellerId, status, to, zoneId],
  );
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

  return (
    <main className="customers-content reports-page">
      <PageHeader
        eyebrow="Gestión comercial"
        title="Reportes"
        description={
          isSeller
            ? "Consulta exclusivamente la información autorizada de tus clientes."
            : "Consulta información comercial y operativa."
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
      <nav className="report-tabs" aria-label="Tipos de reporte">
        {(Object.keys(labels) as ReportType[]).map((item) => (
          <button
            className={type === item ? "active" : ""}
            key={item}
            onClick={() => {
              setType(item);
              setSearchParams({ type: item });
            }}
          >
            {labels[item]}
          </button>
        ))}
      </nav>
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
            Vendedor
            <select
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
            >
              <option value="">Todos los vendedores</option>
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
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Todos los estados"
            />
          </label>
        )}
        {availableFilters.zone && (
          <label>
            Zona
            <input
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              placeholder="Todas las zonas"
            />
          </label>
        )}
      </section>
      {query.data?.summary && <ReportSummary values={query.data.summary} />}
      <section className="customer-table-card report-results">
        <DataState
          loading={query.isLoading}
          error={query.error}
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
      { label: "Vendedor", render: (row) => String(row.sellerName || "—") },
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
      { label: "Vendedor", render: (row) => String(row.sellerName || "—") },
    ],
    productivity: [
      {
        label: "Registro",
        render: (row) =>
          String(row.name || row.projectName || row.sellerName || "—"),
      },
      {
        label: "Cliente / Zona",
        render: (row) => String(row.customerName || row.zoneName || "—"),
      },
      {
        label: "Completadas",
        render: (row) =>
          row.completedCount != null
            ? String(row.completedCount)
            : row.progressPercentage != null
              ? `${row.progressPercentage}%`
              : "—",
      },
      { label: "Pendientes", render: (row) => String(row.pendingCount ?? "—") },
      {
        label: "Total / Fecha estimada",
        render: (row) =>
          row.totalCount != null
            ? String(row.totalCount)
            : formatDate(row.expectedCloseDateUtc),
      },
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
      { label: "Vendedor", render: (row) => String(row.sellerName || "—") },
      {
        label: "Fecha",
        render: (row) => formatDate(row.occurredAtUtc || row.createdAtUtc),
      },
    ],
  };
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
