import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3, MapPin, Route, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { DataState } from "@/components/data/DataState";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { operationsApi } from "../api/operationsApi";
import { TrackingMap } from "../components/TrackingMap";

const inputDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
const today = () => inputDate(new Date());
const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return inputDate(date);
};
const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("es-BO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const duration = (start?: string | null, end?: string | null) => {
  if (!start) return "—";
  const minutes = Math.max(
    0,
    Math.round(
      ((end ? new Date(end) : new Date()).getTime() -
        new Date(start).getTime()) /
        60000,
    ),
  );
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};
const statusLabel = (status?: string) =>
  ({
    open: "Activa",
    active: "Activo",
    closed: "Finalizada",
    completed: "Finalizada",
  })[status?.toLowerCase() ?? ""] ??
  status ??
  "—";
const dayStart = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const dayEnd = (value: string) =>
  new Date(`${value}T23:59:59.999`).toISOString();

export function OperationsPage() {
  const { can, user } = useAuthorization();
  const canChooseSeller = can("sellers.read");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [from, setFrom] = useState(yesterday());
  const [to, setTo] = useState(today());
  const [sellerId, setSellerId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sellers = useQuery({
    queryKey: ["operation-sellers"],
    queryFn: operationsApi.sellers,
    enabled: canChooseSeller,
  });
  const active = useQuery({
    queryKey: ["active-sellers"],
    queryFn: operationsApi.activeSellers,
    enabled: tab === "active",
  });
  const history = useQuery({
    queryKey: ["workdays", from, to, sellerId],
    queryFn: () =>
      operationsApi.workdays({
        from: dayStart(from),
        to: dayEnd(to),
        sellerExternalId: canChooseSeller ? sellerId || undefined : undefined,
      }),
    enabled:
      tab === "history" &&
      Boolean(from && to) &&
      (!canChooseSeller || Boolean(sellerId)),
  });
  const activePoints = useMemo(
    () =>
      active.data?.flatMap((item) =>
        item.lastLocation
          ? [{ ...item.lastLocation, label: item.sellerName }]
          : [],
      ) ?? [],
    [active.data],
  );
  if (selectedId)
    return (
      <WorkdayDetail
        workdayId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  return (
    <main className="customers-content operations-page">
      <PageHeader
        eyebrow="Operación"
        title="Supervisión de vendedores"
        description="Consulta jornadas, visitas y ubicaciones registradas por el equipo autorizado."
      />
      {!canChooseSeller && (
        <p className="assignment-note">
          Mostrando únicamente la actividad autorizada para {user?.fullName}.
        </p>
      )}
      <nav className="activity-tabs" aria-label="Secciones de operación">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Vendedores activos
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Historial de jornadas
        </button>
      </nav>
      {tab === "active" ? (
        <>
          <section className="operations-map-card">
            <header>
              <div>
                <h2>Actividad en curso</h2>
                <p>Últimas coordenadas recibidas, sin posiciones simuladas.</p>
              </div>
              <MapPin />
            </header>
            <DataState
              loading={active.isLoading}
              error={active.error}
              isEmpty={!active.data?.length}
              empty="No hay vendedores con jornada activa."
            >
              <TrackingMap points={activePoints} />
            </DataState>
          </section>
          <section className="customer-table-card">
            <DataState
              loading={active.isLoading}
              error={active.error}
              isEmpty={!active.data?.length}
              empty="No hay vendedores con jornada activa."
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Estado</th>
                      <th>Hora de inicio</th>
                      <th>Última ubicación</th>
                      <th>Última actualización</th>
                      <th>Visita actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.data?.map((item) => (
                      <tr key={item.sellerExternalId}>
                        <td>
                          <strong>{item.sellerName}</strong>
                        </td>
                        <td>
                          <span className="status-pill">
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td>{dateTime(item.startedAtUtc)}</td>
                        <td>
                          {item.lastLocation
                            ? `${item.lastLocation.latitude.toFixed(5)}, ${item.lastLocation.longitude.toFixed(5)}`
                            : "—"}
                        </td>
                        <td>
                          {dateTime(
                            item.lastUpdatedAtUtc ??
                              item.lastLocation?.capturedAtUtc,
                          )}
                        </td>
                        <td>
                          {item.currentVisit?.name || "Sin visita activa"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataState>
          </section>
        </>
      ) : (
        <>
          <div className="customer-toolbar operations-filters">
            <label>
              Desde
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            {canChooseSeller && (
              <label>
                Vendedor
                <select
                  value={sellerId}
                  onChange={(event) => setSellerId(event.target.value)}
                >
                  <option value="">Selecciona un vendedor</option>
                  {sellers.data?.map((seller) => (
                    <option key={seller.externalId} value={seller.externalId}>
                      {seller.displayName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <section className="customer-table-card">
            <DataState
              loading={history.isLoading}
              error={history.error}
              isEmpty={!history.data?.length}
              empty={
                canChooseSeller && !sellerId
                  ? "Selecciona un vendedor para consultar sus jornadas."
                  : "No hay jornadas registradas para estos filtros."
              }
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Duración</th>
                      <th>Visitas</th>
                      <th>Puntos registrados</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.sellerName || "Vendedor"}</strong>
                        </td>
                        <td>{dateTime(item.startedAtUtc)}</td>
                        <td>{dateTime(item.endedAtUtc)}</td>
                        <td>{duration(item.startedAtUtc, item.endedAtUtc)}</td>
                        <td>{item.visitCount ?? item.visits?.length ?? 0}</td>
                        <td>{item.locationCount ?? 0}</td>
                        <td>
                          <span className="status-pill">
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="table-link"
                            onClick={() => setSelectedId(item.id)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataState>
          </section>
        </>
      )}
    </main>
  );
}

function WorkdayDetail({
  workdayId,
  onBack,
}: {
  workdayId: string;
  onBack: () => void;
}) {
  const workday = useQuery({
    queryKey: ["workday", workdayId],
    queryFn: () => operationsApi.workday(workdayId),
  });
  const locations = useQuery({
    queryKey: ["workday-locations", workdayId],
    queryFn: () => operationsApi.locations(workdayId),
  });
  const points = useMemo(
    () =>
      [...(locations.data ?? [])].sort((a, b) =>
        a.capturedAtUtc.localeCompare(b.capturedAtUtc),
      ),
    [locations.data],
  );
  return (
    <main className="customers-content operations-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft /> Volver al historial
      </button>
      <PageHeader
        eyebrow="Detalle de jornada"
        title={workday.data?.sellerName || "Jornada"}
        description={`${dateTime(workday.data?.startedAtUtc)} · ${statusLabel(workday.data?.status)}`}
      />
      <DataState
        loading={workday.isLoading}
        error={workday.error}
        isEmpty={!workday.data}
        empty="No se encontró la jornada."
      >
        {workday.data && (
          <>
            <section className="operations-summary">
              <Summary
                icon={<Clock3 />}
                label="Duración"
                value={duration(
                  workday.data.startedAtUtc,
                  workday.data.endedAtUtc,
                )}
              />
              <Summary
                icon={<UserRoundCheck />}
                label="Visitas"
                value={String(
                  workday.data.visitCount ?? workday.data.visits?.length ?? 0,
                )}
              />
              <Summary
                icon={<Route />}
                label="Puntos registrados"
                value={String(points.length)}
              />
            </section>
            {workday.data.note && (
              <section className="operations-note">
                <h2>Notas</h2>
                <p>{workday.data.note}</p>
              </section>
            )}
            <section className="operations-map-card">
              <header>
                <div>
                  <h2>Ruta recorrida</h2>
                  <p>Recorrido cronológico de las ubicaciones registradas.</p>
                </div>
              </header>
              <DataState
                loading={locations.isLoading}
                error={locations.error}
                isEmpty={!points.length}
                empty="No hay puntos de ruta registrados."
              >
                <TrackingMap points={points} route />
              </DataState>
            </section>
            <section className="customer-table-card">
              <h2>Visitas</h2>
              {!workday.data.visits?.length ? (
                <p className="empty-inline">
                  No hay visitas registradas en esta jornada.
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Destino</th>
                        <th>Inicio de visita</th>
                        <th>Fin de visita</th>
                        <th>Permanencia</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workday.data.visits.map((visit) => (
                        <tr key={visit.externalId}>
                          <td>
                            <strong>
                              {visit.projectName ||
                                visit.customerName ||
                                "Visita"}
                            </strong>
                          </td>
                          <td>{dateTime(visit.startedAtUtc)}</td>
                          <td>{dateTime(visit.endedAtUtc)}</td>
                          <td>
                            {visit.durationMinutes != null
                              ? `${visit.durationMinutes} min`
                              : duration(visit.startedAtUtc, visit.endedAtUtc)}
                          </td>
                          <td>{visit.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </DataState>
    </main>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
