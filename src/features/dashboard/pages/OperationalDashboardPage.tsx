import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  PackageCheck,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { projectApi } from "@/features/projects/api/projectApi";
import {
  formatDate,
  formatTime,
  getDisplayTimeZone,
  localDayKey,
} from "@/lib/i18n/dateTime";
import {
  dashboardApi,
  type DashboardData,
  type DashboardMetrics,
} from "../api/dashboardApi";
import { DashboardProjectsMap } from "../components/DashboardProjectsMap";
import { presentActivityType } from "../presentation/activityPresentation";

const formatDateTime = (value: string) => {
  const date = new Date(value);
  const day =
    localDayKey(date) === localDayKey(new Date())
      ? "Hoy"
      : date.toLocaleDateString("es-BO", {
          day: "numeric",
          month: "short",
          timeZone: getDisplayTimeZone(),
        });
  return {
    day,
    time: formatTime(date),
  };
};
const metricDefinitions: Array<{
  key: keyof DashboardMetrics;
  label: string;
  Icon: LucideIcon;
}> = [
  { key: "activeCustomers", label: "Clientes activos", Icon: Users },
  { key: "activeProjects", label: "Proyectos activos", Icon: Building2 },
  {
    key: "pendingDeliveries",
    label: "Entregas pendientes",
    Icon: ClipboardCheck,
  },
  { key: "overdueDeliveries", label: "Entregas vencidas", Icon: CalendarClock },
  {
    key: "completedDeliveriesThisMonth",
    label: "Entregas del mes",
    Icon: PackageCheck,
  },
  { key: "todayFollowUps", label: "Seguimientos de hoy", Icon: CalendarClock },
];

export function DashboardPage() {
  const { user, can } = useAuthorization();
  const canChooseSeller = can("sellers.read");
  const [statusId, setStatusId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });
  const map = useQuery({
    queryKey: ["dashboard-map", statusId, sellerId],
    queryFn: () =>
      dashboardApi.mapItems({
        statusId: statusId ? Number(statusId) : undefined,
        sellerExternalId: canChooseSeller ? sellerId || undefined : undefined,
      }),
    refetchInterval: 60_000,
  });
  const statuses = useQuery({
    queryKey: ["project-statuses"],
    queryFn: projectApi.statuses,
  });
  const sellers = useQuery({
    queryKey: ["dashboard-sellers"],
    queryFn: dashboardApi.sellers,
    enabled: canChooseSeller,
  });
  const cards = metricDefinitions.filter(
    ({ key }) => typeof query.data?.metrics[key] === "number",
  );
  return (
    <main className="dashboard-content">
      <PageHeader
        eyebrow="Operación comercial"
        title={`Buenos días, ${user?.fullName.split(" ")[0] || "equipo"}`}
        description="Resumen actualizado de la operación."
      />
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.data}
        empty="No hay información disponible."
      >
        {query.data && (
          <>
            <section
              className="real-metrics"
              aria-label="Indicadores operacionales"
            >
              {cards.map(({ key, label, Icon }) => (
                <article className="metric-card" key={key}>
                  <span className="metric-icon orange">
                    <Icon />
                  </span>
                  <div>
                    <p>{label}</p>
                    <strong>{query.data.metrics[key]}</strong>
                  </div>
                </article>
              ))}
            </section>
            <DashboardSections
              data={query.data}
              map={{
                items: map.data ?? [],
                loading: map.isLoading,
                error: map.error,
                statusId,
                sellerId,
                setStatusId,
                setSellerId,
                statuses: statuses.data ?? [],
                sellers: sellers.data ?? [],
                canChooseSeller,
              }}
              permissions={{
                reports: can("reports.read"),
                deliveries: can("deliveries.read"),
                customers: can("customers.read"),
                projects: can("projects.read"),
              }}
            />
          </>
        )}
      </DataState>
    </main>
  );
}

function SectionHeader({
  title,
  to,
  label,
}: {
  title: string;
  to?: string;
  label: string;
}) {
  return (
    <header className="dashboard-section-header">
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </header>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
}) {
  return (
    <div className="dashboard-empty">
      <span>
        <Icon />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}
interface DashboardPermissions {
  reports: boolean;
  deliveries: boolean;
  customers: boolean;
  projects: boolean;
}
interface DashboardMapState {
  items: DashboardData["projectItems"];
  loading: boolean;
  error: Error | null;
  statusId: string;
  sellerId: string;
  setStatusId: (value: string) => void;
  setSellerId: (value: string) => void;
  statuses: Array<{ value: number; label: string }>;
  sellers: Array<{ externalId: string; displayName: string }>;
  canChooseSeller: boolean;
}

function DashboardSections({
  data,
  permissions,
  map,
}: {
  data: DashboardData;
  permissions: DashboardPermissions;
  map: DashboardMapState;
}) {
  return (
    <>
      <section className="dashboard-primary-layout">
        <article className="dashboard-map-panel">
          <header className="dashboard-map-header">
            <div>
              <h2>Mapa de proyectos</h2>
              <p>Proyectos con ubicación registrada.</p>
            </div>
            <div className="dashboard-map-filters">
              <label>
                Estado
                <select
                  value={map.statusId}
                  onChange={(event) => map.setStatusId(event.target.value)}
                >
                  <option value="">Todos</option>
                  {map.statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              {map.canChooseSeller && (
                <label>
                  Vendedor
                  <select
                    value={map.sellerId}
                    onChange={(event) => map.setSellerId(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {map.sellers.map((seller) => (
                      <option key={seller.externalId} value={seller.externalId}>
                        {seller.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </header>
          {map.loading ? (
            <div className="dashboard-map-state">
              <span className="spinner" />
              <p>Cargando mapa…</p>
            </div>
          ) : map.error ? (
            <div className="dashboard-map-state error">
              <strong>No pudimos cargar el mapa</strong>
              <p>{map.error.message}</p>
            </div>
          ) : map.items.length ? (
            <DashboardProjectsMap items={map.items} sellers={map.sellers} />
          ) : (
            <div className="dashboard-map-state">
              <Building2 />
              <strong>No hay proyectos con ubicación registrada.</strong>
            </div>
          )}
        </article>
        <div className="dashboard-side-stack">
          <ActivityPanel data={data} permissions={permissions} />
          <FollowUpsPanel data={data} permissions={permissions} />
        </div>
      </section>
      <section className="dashboard-real-grid operational-grid dashboard-secondary-layout">
        <ProgressPanel data={data} permissions={permissions} />
        <DeliveriesPanel data={data} permissions={permissions} />
      </section>
    </>
  );
}

function ActivityPanel({
  data,
  permissions,
}: {
  data: DashboardData;
  permissions: DashboardPermissions;
}) {
  return (
    <article className="activity-card dashboard-panel dashboard-activity-panel">
      <SectionHeader
        title="Actividad reciente"
        to={permissions.reports ? "/reports" : undefined}
        label="Ver toda"
      />
      {data.recentActivity.length ? (
        <div className="dashboard-timeline">
          {data.recentActivity.slice(0, 5).map((item, index) => {
            const { label, Icon, tone } = presentActivityType(
              item.eventTypeName,
            );
            const occurred = formatDateTime(item.occurredAtUtc);
            const description = item.title?.trim();
            return (
              <div
                className="dashboard-event"
                key={`${item.projectExternalId}-${item.occurredAtUtc}-${index}`}
              >
                <span className={`dashboard-event-icon ${tone}`}>
                  <Icon />
                </span>
                <div className="dashboard-event-content">
                  <strong>{label}</strong>
                  <small>
                    {permissions.projects ? (
                      <Link
                        to={`/projects?selected=${encodeURIComponent(item.projectExternalId)}`}
                      >
                        {item.projectName}
                      </Link>
                    ) : (
                      item.projectName
                    )}
                    {item.userName && <> · {item.userName}</>}
                  </small>
                  {description && description !== item.eventTypeName && (
                    <p>{description}</p>
                  )}
                  <time>
                    {occurred.day} · <span>{occurred.time}</span>
                  </time>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={Route}
          title="Todavía no hay actividad"
          text="Los movimientos comerciales aparecerán aquí."
        />
      )}
    </article>
  );
}

function FollowUpsPanel({
  data,
  permissions,
}: {
  data: DashboardData;
  permissions: DashboardPermissions;
}) {
  return (
    <article className="activity-card dashboard-panel">
      <SectionHeader
        title="Próximos seguimientos"
        to={permissions.customers ? "/reminders" : undefined}
        label="Ver todos"
      />
      {data.upcomingFollowUps.length ? (
        <div className="dashboard-list">
          {data.upcomingFollowUps.slice(0, 4).map((item) => {
            const reminder = formatDateTime(item.reminderAtUtc);
            const content = (
              <>
                <span className="list-icon warning">
                  <CalendarClock />
                </span>
                <div>
                  <strong>{item.projectName || item.customerName}</strong>
                  <p>{item.text}</p>
                  <small>{item.assignedToName}</small>
                  <time>
                    {reminder.day} · <span>{reminder.time}</span>
                  </time>
                </div>
              </>
            );
            return permissions.customers ? (
              <Link
                className="dashboard-list-row"
                to={`/customers?selected=${encodeURIComponent(item.customerExternalId)}`}
                key={item.reminderExternalId}
              >
                {content}
              </Link>
            ) : (
              <div className="dashboard-list-row" key={item.reminderExternalId}>
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={CalendarClock} title="No hay seguimientos próximos" />
      )}
    </article>
  );
}

function DeliveriesPanel({
  data,
  permissions,
}: {
  data: DashboardData;
  permissions: DashboardPermissions;
}) {
  return (
    <article className="activity-card dashboard-panel">
      <SectionHeader
        title="Entregas urgentes"
        to={permissions.deliveries ? "/deliveries" : undefined}
        label="Ver todas"
      />
      {data.urgentDeliveries.length ? (
        <div className="dashboard-list">
          {data.urgentDeliveries.map((item) => {
            const content = (
              <>
                <span
                  className={`list-icon ${item.isOverdue ? "danger" : "warning"}`}
                >
                  <PackageCheck />
                </span>
                <div>
                  <strong>{item.productName || item.projectName}</strong>
                  {item.productName && (
                    <small>
                      {item.projectName}
                      {item.customerName ? ` · ${item.customerName}` : ""}
                    </small>
                  )}
                  <time>
                    {formatDate(item.committedDateUtc)}
                  </time>
                </div>
                <em className={item.isOverdue ? "overdue" : ""}>
                  {item.statusName}
                </em>
              </>
            );
            return permissions.deliveries ? (
              <Link
                className="dashboard-list-row"
                to={`/deliveries?selected=${encodeURIComponent(item.deliveryExternalId)}`}
                key={item.deliveryExternalId}
              >
                {content}
              </Link>
            ) : (
              <div className="dashboard-list-row" key={item.deliveryExternalId}>
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={PackageCheck}
          title="No hay entregas urgentes. Todo está al día."
        />
      )}
    </article>
  );
}

function ProgressPanel({
  data,
  permissions,
}: {
  data: DashboardData;
  permissions: DashboardPermissions;
}) {
  return (
    <article className="activity-card dashboard-panel">
      <SectionHeader
        title="Avance de proyectos"
        to={permissions.projects ? "/projects" : undefined}
        label="Ver todos"
      />
      {data.projectItems.length ? (
        <div className="project-progress-list">
          {data.projectItems.slice(0, 5).map((item) => {
            const progress = Math.min(
              100,
              Math.max(0, item.progressPercentage),
            );
            const content = (
              <>
                <div>
                  <strong>{item.name}</strong>
                  <span>{progress}%</span>
                </div>
                {item.customerName && <small>{item.customerName}</small>}
                <progress max="100" value={progress} />
              </>
            );
            return permissions.projects ? (
              <Link
                to={`/projects?selected=${encodeURIComponent(item.projectExternalId)}`}
                key={item.projectExternalId}
              >
                {content}
              </Link>
            ) : (
              <div
                className="project-progress-row"
                key={item.projectExternalId}
              >
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={Building2} title="No hay proyectos activos" />
      )}
    </article>
  );
}
