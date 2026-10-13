import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { customerService } from "@/features/customers/services/customerService";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import {
  gendered,
  inSentence,
  type OperationTerms,
} from "@/features/operation-settings/services/operationTerms";
import { formatMoney } from "@/lib/i18n/money";
import {
  reportApi,
  type SellerProductivity,
  type SellerProductivityMetrics,
} from "../api/reportApi";
import {
  percentChange,
  pointChange,
  teamProductivity,
} from "../services/productivity";

const DAY = 86_400_000;

const inputDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const parseDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const shortDate = (date: Date) =>
  new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short" }).format(
    date,
  );

/** The API compares against the period of the same length right before `from`. */
const previousPeriod = (from: string, to: string) => {
  const start = parseDay(from);
  const days = Math.round((parseDay(to).getTime() - start.getTime()) / DAY) + 1;
  return {
    days,
    from: new Date(start.getTime() - days * DAY),
    to: new Date(start.getTime() - DAY),
  };
};

const number = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 });
const percent = (value: number) => `${number.format(value)}%`;

type Trend = "good" | "bad" | "neutral";

function Change({
  value,
  unit = "%",
  lowerIsBetter = false,
  compact = false,
}: {
  value: number | undefined;
  unit?: "%" | " pp";
  lowerIsBetter?: boolean;
  /** Hides the "no previous data" note, for dense tables. */
  compact?: boolean;
}) {
  if (value === undefined)
    return compact ? null : (
      <span className="productivity-change neutral">Sin datos previos</span>
    );
  const rounded = Math.round(value * 10) / 10;
  const trend: Trend =
    rounded === 0
      ? "neutral"
      : rounded > 0 !== lowerIsBetter
        ? "good"
        : "bad";
  const Icon = rounded === 0 ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`productivity-change ${trend}`}>
      <Icon aria-hidden="true" />
      {rounded > 0 ? "+" : ""}
      {number.format(rounded)}
      {unit}
    </span>
  );
}

type ChartMetric = "visits" | "contactedCustomers" | "closedProjects" | "closedAmount";

/** Metric names in the company's terminology ("Obras cerradas", "Clientes atendidos"…). */
const metricLabels = ({ customer, project, visit }: OperationTerms["labels"]) => ({
  visits: visit.plural,
  visitsDone: `${visit.plural} ${gendered(visit.singular, "realizados", "realizadas")}`,
  visitsPerDay: `${visit.plural} por jornada`,
  contacted: `${customer.plural} ${gendered(customer.singular, "atendidos", "atendidas")}`,
  newCustomers: `${customer.plural} ${gendered(customer.singular, "nuevos", "nuevas")}`,
  closedProjects: `${project.plural} ${gendered(project.singular, "cerrados", "cerradas")}`,
  conversionHint: `${project.plural} ${gendered(project.singular, "cerrados", "cerradas")} por cada ${inSentence(customer.singular)} ${gendered(customer.singular, "atendido", "atendida")}`,
  projectsOf: `Ver sus ${inSentence(project.plural)}`,
});

type MetricLabels = ReturnType<typeof metricLabels>;

const chartMetricsFor = (
  labels: MetricLabels,
): Record<ChartMetric, { label: string; format: (value: number) => string }> => ({
  visits: { label: labels.visits, format: (value) => number.format(value) },
  contactedCustomers: {
    label: labels.contacted,
    format: (value) => number.format(value),
  },
  closedProjects: {
    label: labels.closedProjects,
    format: (value) => number.format(value),
  },
  closedAmount: { label: "Monto cerrado", format: formatMoney },
});

export function SellerProductivityPage() {
  const { hasRole, can } = useAuthorization();
  const canChooseSeller = !hasRole("seller") && can("sellers.read");
  const { labels: terms } = useOperationTerms();
  const labels = metricLabels(terms);
  const [from, setFrom] = useState(() => {
    const today = new Date();
    return inputDate(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [to, setTo] = useState(() => inputDate(new Date()));
  const [sellerId, setSellerId] = useState("");
  const [metric, setMetric] = useState<ChartMetric>("visits");
  const validRange = Boolean(from && to && from <= to);
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: canChooseSeller,
  });
  const report = useQuery({
    queryKey: ["seller-productivity", from, to, sellerId],
    queryFn: () => reportApi.sellerProductivity({ from, to, sellerId }),
    enabled: validRange,
  });
  const rows = useMemo(() => report.data ?? [], [report.data]);
  const team = useMemo(() => teamProductivity(rows), [rows]);
  const previous = validRange ? previousPeriod(from, to) : undefined;

  return (
    <main className="customers-content reports-page productivity-page">
      <PageHeader
        eyebrow="Análisis"
        title="Productividad comercial"
        description="Resultados del equipo en el período elegido, comparados con el período anterior de la misma duración."
      />
      <section className="report-filters" aria-label="Filtros del reporte">
        <label>
          Desde
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        {canChooseSeller && (
          <label>
            Responsable
            <select
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
            >
              <option value="">Todo el equipo</option>
              {sellers.data?.map((seller) => (
                <option key={seller.externalId} value={seller.externalId}>
                  {seller.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {!validRange ? (
        <p className="form-error">
          Elige un rango válido: la fecha final no puede ser anterior a la inicial.
        </p>
      ) : (
        <DataState
          loading={report.isLoading}
          error={report.error}
          onRetry={report.refetch}
          skeleton="table"
          isEmpty={!rows.length}
          empty="No hay responsables con actividad para los filtros seleccionados."
        >
          {previous && (
            <p className="productivity-period">
              Comparado con {shortDate(previous.from)} – {shortDate(previous.to)} (
              {previous.days} {previous.days === 1 ? "día" : "días"} anteriores).
            </p>
          )}
          <section
            className="report-summary productivity-kpis"
            aria-label="Indicadores del equipo"
          >
            <Kpi
              label={labels.visitsDone}
              value={number.format(team.current.visits)}
              change={<Change value={percentChange(team.current.visits, team.previous.visits)} />}
            />
            <Kpi
              label={labels.contacted}
              value={number.format(team.current.contactedCustomers)}
              change={
                <Change
                  value={percentChange(
                    team.current.contactedCustomers,
                    team.previous.contactedCustomers,
                  )}
                />
              }
            />
            <Kpi
              label="Conversión"
              hint={labels.conversionHint}
              value={percent(team.current.conversionRate)}
              change={
                <Change
                  unit=" pp"
                  value={pointChange(
                    team.current.conversionRate,
                    team.previous.conversionRate,
                  )}
                />
              }
            />
            <Kpi
              label="Monto cerrado"
              value={formatMoney(team.current.closedAmount)}
              change={
                <Change
                  value={percentChange(
                    team.current.closedAmount,
                    team.previous.closedAmount,
                  )}
                />
              }
            />
            <Kpi
              label="Recordatorios cumplidos"
              value={number.format(team.current.completedReminders)}
              change={
                <Change
                  value={percentChange(
                    team.current.completedReminders,
                    team.previous.completedReminders,
                  )}
                />
              }
            />
            <Kpi
              label="Recordatorios vencidos"
              value={number.format(team.current.overdueReminders)}
              change={
                <Change
                  lowerIsBetter
                  value={percentChange(
                    team.current.overdueReminders,
                    team.previous.overdueReminders,
                  )}
                />
              }
            />
          </section>
          {rows.length > 1 && (
            <SellerComparison
              rows={rows}
              metrics={chartMetricsFor(labels)}
              metric={metric}
              onMetricChange={setMetric}
            />
          )}
          <section className="customer-table-card report-results">
            <SellerTable rows={rows} labels={labels} />
          </section>
        </DataState>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  change,
  hint,
}: {
  label: string;
  value: string;
  change: ReactNode;
  hint?: string;
}) {
  return (
    <article title={hint}>
      <span>{label}</span>
      <strong>{value}</strong>
      {change}
    </article>
  );
}

function SellerComparison({
  rows,
  metrics,
  metric,
  onMetricChange,
}: {
  rows: SellerProductivity[];
  metrics: ReturnType<typeof chartMetricsFor>;
  metric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
}) {
  const { label, format } = metrics[metric];
  const sorted = [...rows].sort((a, b) => b.current[metric] - a.current[metric]);
  const max = Math.max(...sorted.map((row) => row.current[metric]), 0);
  return (
    <section className="productivity-chart" aria-labelledby="productivity-chart-title">
      <header>
        <h2 id="productivity-chart-title">{label} por responsable</h2>
        <label>
          Comparar por
          <select
            value={metric}
            onChange={(event) => onMetricChange(event.target.value as ChartMetric)}
          >
            {Object.entries(metrics).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <ul>
        {sorted.map((row) => {
          const value = row.current[metric];
          return (
            <li
              key={row.sellerExternalId}
              title={`${row.sellerName}: ${format(value)} (período anterior: ${format(row.previous[metric])})`}
            >
              <span className="productivity-chart-name">{row.sellerName}</span>
              <span className="productivity-chart-track">
                <span
                  className="productivity-chart-bar"
                  style={{ width: max ? `${(value / max) * 100}%` : 0 }}
                />
              </span>
              <span className="productivity-chart-value">{format(value)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const columnsFor = (labels: MetricLabels): Array<{
  label: string;
  key: keyof SellerProductivityMetrics;
  format: (value: number) => string;
  rate?: boolean;
  lowerIsBetter?: boolean;
}> => [
  { label: "Jornadas", key: "workedDays", format: number.format },
  { label: "Horas activas", key: "activeHours", format: number.format },
  { label: labels.visits, key: "visits", format: number.format },
  {
    label: labels.visitsPerDay,
    key: "averageVisitsPerWorkedDay",
    format: number.format,
  },
  { label: labels.contacted, key: "contactedCustomers", format: number.format },
  { label: labels.newCustomers, key: "newCustomers", format: number.format },
  {
    label: "Recordatorios a tiempo",
    key: "reminderComplianceRate",
    format: percent,
    rate: true,
  },
  {
    label: "Recordatorios vencidos",
    key: "overdueReminders",
    format: number.format,
    lowerIsBetter: true,
  },
  { label: "Conversión", key: "conversionRate", format: percent, rate: true },
  { label: labels.closedProjects, key: "closedProjects", format: number.format },
  { label: "Monto cerrado", key: "closedAmount", format: formatMoney },
];

function SellerTable({
  rows,
  labels,
}: {
  rows: SellerProductivity[];
  labels: MetricLabels;
}) {
  const columns = columnsFor(labels);
  return (
    <div className="table-scroll">
      <table className="productivity-table">
        <thead>
          <tr>
            <th>Responsable</th>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sellerExternalId}>
              <td>
                <strong>{row.sellerName}</strong>
                <small>
                  <Link
                    to={`/reports/pipeline?seller=${encodeURIComponent(row.sellerExternalId)}`}
                  >
                    {labels.projectsOf}
                  </Link>
                </small>
              </td>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.format(row.current[column.key])}
                  <small>
                    <Change
                      compact
                      unit={column.rate ? " pp" : "%"}
                      lowerIsBetter={column.lowerIsBetter}
                      value={
                        column.rate
                          ? pointChange(
                              row.current[column.key],
                              row.previous[column.key],
                            )
                          : row.variationPercentage[column.key]
                      }
                    />
                  </small>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
