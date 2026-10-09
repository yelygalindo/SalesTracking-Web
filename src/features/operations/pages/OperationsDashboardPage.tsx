import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { divIcon, latLngBounds } from "leaflet";
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  MapPinOff,
  Radio,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import {
  formatDateTime,
  formatTime,
  localDayEndUtc,
  localDayKey,
  localDayStartUtc,
} from "@/lib/i18n/dateTime";
import { operationsApi } from "../api/operationsApi";
import {
  buildOperationsDashboard,
  type OperationsWorker,
  type WorkerOperationStatus,
} from "../services/operationsDashboard";

type WorkerFilter = "all" | WorkerOperationStatus | "incidents";

const statusLabels: Record<WorkerOperationStatus, string> = {
  working: "Trabajando",
  finished: "Jornada finalizada",
  "not-started": "Sin jornada hoy",
};
const workerInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toUpperCase() || "?";

function LiveMapViewport({ workers }: { workers: OperationsWorker[] }) {
  const map = useMap();
  useEffect(() => {
    const positions = workers.flatMap((worker) =>
      Number.isFinite(worker.latitude) && Number.isFinite(worker.longitude)
        ? [[worker.latitude!, worker.longitude!] as [number, number]]
        : [],
    );
    if (positions.length === 1) map.setView(positions[0], 15);
    else if (positions.length > 1)
      map.fitBounds(latLngBounds(positions), { padding: [32, 32], maxZoom: 15 });
  }, [map, workers]);
  return null;
}

function OperationsLiveMap({ workers }: { workers: OperationsWorker[] }) {
  const locatedWorkers = workers.filter(
    (worker) =>
      worker.status === "working" &&
      Number.isFinite(worker.latitude) &&
      Number.isFinite(worker.longitude),
  );

  if (!locatedWorkers.length)
    return (
      <div className="operations-live-map-empty">
        <MapPinOff />
        <strong>No hay ubicaciones activas</strong>
        <span>Las últimas posiciones aparecerán aquí.</span>
      </div>
    );

  return (
    <div className="operations-live-map">
      <MapContainer
        center={[locatedWorkers[0].latitude!, locatedWorkers[0].longitude!]}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LiveMapViewport workers={locatedWorkers} />
        {locatedWorkers.map((worker) => (
          <Marker
            key={worker.sellerExternalId}
            position={[worker.latitude!, worker.longitude!]}
            icon={divIcon({
              className: "operations-worker-marker-wrap",
              html: `<span class="operations-worker-marker${worker.incident ? " incident" : ""}">${workerInitials(worker.sellerName)}</span>`,
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            })}
          >
            <Popup>
              <strong>{worker.sellerName}</strong>
              <br />
              {worker.incident || "Ubicación actualizada"}
              {worker.lastLocationAtUtc && (
                <>
                  <br />{formatDateTime(worker.lastLocationAtUtc)}
                </>
              )}
              {worker.workday && (
                <Link
                  className="operations-map-detail-link"
                  to="/operations/history"
                  state={{ workday: worker.workday }}
                >
                  Ver trabajador
                </Link>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export function OperationsDashboardPage() {
  const { can } = useAuthorization();
  const [filter, setFilter] = useState<WorkerFilter>("all");
  const date = localDayKey(new Date());
  const from = localDayStartUtc(date);
  const to = localDayEndUtc(date);
  const query = useQuery({
    queryKey: ["operations-dashboard", date, can("sellers.read")],
    queryFn: async () => {
      const [activeSellers, workdays, visits, sellers] = await Promise.all([
        operationsApi.activeSellers(),
        operationsApi.workdays({ from, to }),
        operationsApi.visits({ from, to }),
        can("sellers.read") ? operationsApi.sellers() : Promise.resolve([]),
      ]);
      return buildOperationsDashboard(
        sellers,
        activeSellers,
        workdays,
        visits,
      );
    },
    refetchInterval: 30_000,
  });
  const visibleWorkers = useMemo(() => {
    const workers = query.data?.workers ?? [];
    if (filter === "all") return workers;
    if (filter === "incidents")
      return workers.filter((worker) => Boolean(worker.incident));
    return workers.filter((worker) => worker.status === filter);
  }, [filter, query.data?.workers]);
  const incidents = query.data?.workers.filter((worker) => worker.incident) ?? [];

  return (
    <main className="customers-content operations-dashboard-page">
      <PageHeader
        eyebrow="Operación en tiempo real"
        title="Estado del equipo"
        description="Jornadas, visitas e incidencias de hoy, actualizadas automáticamente."
        action={
          <span className="operations-live-indicator">
            <Radio /> Actualización cada 30 s
          </span>
        }
      />
      <DataState
        loading={query.isLoading}
        error={query.error}
        isEmpty={!query.data}
        empty="No hay información operativa disponible."
      >
        {query.data && (
          <>
            <section className="operations-live-metrics" aria-label="Resumen operativo">
              <OperationMetric
                icon={Activity}
                label="Trabajando ahora"
                value={query.data.metrics.working}
                tone="active"
              />
              <OperationMetric
                icon={CheckCircle2}
                label="Finalizaron jornada"
                value={query.data.metrics.finished}
                tone="finished"
              />
              <OperationMetric
                icon={ClipboardCheck}
                label="Visitas completadas"
                value={query.data.metrics.completedVisits}
                tone="visits"
              />
              <OperationMetric
                icon={TriangleAlert}
                label="Incidencias"
                value={query.data.metrics.incidents}
                tone="incident"
              />
            </section>

            <section className="operations-live-layout">
              <article className="operations-team-panel">
                <header>
                  <div>
                    <h2>Equipo de hoy</h2>
                    <p>{query.data.workers.length} trabajadores visibles</p>
                  </div>
                  <nav aria-label="Filtrar trabajadores">
                    {([
                      ["all", "Todos"],
                      ["working", "Trabajando"],
                      ["finished", "Finalizaron"],
                      ["incidents", "Incidencias"],
                    ] as const).map(([value, label]) => (
                      <button
                        className={filter === value ? "active" : ""}
                        key={value}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                </header>
                {visibleWorkers.length ? (
                  <div className="operations-worker-list">
                    {visibleWorkers.map((worker) => (
                      <WorkerRow worker={worker} key={worker.sellerExternalId} />
                    ))}
                  </div>
                ) : (
                  <div className="operations-workers-empty">No hay trabajadores en este filtro.</div>
                )}
              </article>

              <aside className="operations-live-side">
                <article className="operations-live-map-card">
                  <header>
                    <div>
                      <h2>Ubicación del equipo</h2>
                      <p>Última posición reportada por jornadas activas.</p>
                    </div>
                    <span>{formatTime(new Date(query.dataUpdatedAt))}</span>
                  </header>
                  <OperationsLiveMap workers={query.data.workers} />
                </article>
                <article className="operations-incidents-card">
                  <header>
                    <div>
                      <h2>Incidencias</h2>
                      <p>Jornadas sin ubicación o con señal atrasada.</p>
                    </div>
                    <TriangleAlert />
                  </header>
                  {incidents.length ? (
                    <div>
                      {incidents.map((worker) => (
                        <div className="operations-incident-row" key={worker.sellerExternalId}>
                          <span>{worker.sellerName.slice(0, 1).toUpperCase()}</span>
                          <div>
                            <strong>{worker.sellerName}</strong>
                            <small>{worker.incident}</small>
                          </div>
                          {worker.workday && (
                            <Link
                              to="/operations/history"
                              state={{ workday: worker.workday }}
                            >
                              Revisar
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="operations-no-incidents">
                      <CheckCircle2 /> Sin incidencias activas
                    </div>
                  )}
                </article>
              </aside>
            </section>
          </>
        )}
      </DataState>
    </main>
  );
}

function OperationMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <article className={`operations-live-metric ${tone}`}>
      <span><Icon /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  );
}

function WorkerRow({ worker }: { worker: OperationsWorker }) {
  const initials = workerInitials(worker.sellerName);
  return (
    <div className={`operations-worker-row ${worker.incident ? "incident" : ""}`}>
      <span className="operations-worker-avatar">{initials}</span>
      <div className="operations-worker-name">
        <strong>{worker.sellerName}</strong>
        <small>{worker.incident || statusLabels[worker.status]}</small>
      </div>
      <span className={`operations-worker-status ${worker.status}`}>
        {statusLabels[worker.status]}
      </span>
      <div className="operations-worker-fact">
        <small>Inicio</small>
        <strong>{worker.startedAtUtc ? formatTime(worker.startedAtUtc) : "—"}</strong>
      </div>
      <div className="operations-worker-fact">
        <small>Última señal</small>
        <strong>{worker.lastLocationAtUtc ? formatTime(worker.lastLocationAtUtc) : "—"}</strong>
      </div>
      <div className="operations-worker-fact">
        <small>Visitas</small>
        <strong>{worker.completedVisits}</strong>
      </div>
      {worker.workday ? (
        <Link
          className="operations-worker-detail"
          to="/operations/history"
          state={{ workday: worker.workday }}
        >
          Ver detalle
        </Link>
      ) : (
        <span className="operations-worker-detail disabled">Sin jornada</span>
      )}
    </div>
  );
}
