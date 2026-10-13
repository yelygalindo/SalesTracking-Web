import "@/components/maps/leafletSetup";
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
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DataState } from "@/components/data/DataState";
import { PageHeader } from "@/components/layout/AppShell";
import { useOperationTerms } from "@/features/operation-settings/hooks/useOperationTerms";
import {
  gendered,
  inSentence,
} from "@/features/operation-settings/services/operationTerms";
import { MapResizeHandler } from "@/components/maps/MapResizeHandler";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import {
  formatDateTime,
  formatRelativeTime,
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
  "not-started": "Sin actividad en vivo",
};
// Times from a previous day need their date, or an old workday looks like today's.
const formatTimeOrDate = (value: string) =>
  localDayKey(value) === localDayKey(new Date())
    ? formatTime(value)
    : formatDateTime(value);
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
      map.fitBounds(latLngBounds(positions), {
        padding: [32, 32],
        maxZoom: 15,
      });
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
        <MapResizeHandler />
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
              {worker.currentVisitName
                ? `En ${worker.currentVisitName}`
                : worker.incident || "Ubicación actualizada"}
              {worker.lastLocationAtUtc && (
                <>
                  <br />
                  {formatDateTime(worker.lastLocationAtUtc)}
                </>
              )}
              {worker.workday && (
                <Link
                  className="operations-map-detail-link"
                  to="/operations/history"
                  state={{ workday: worker.workday }}
                >
                  Ver responsable
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
  const { can, user } = useAuthorization();
  const {
    labels: { visit },
  } = useOperationTerms();
  const canChooseSeller = can("sellers.read");
  const [filter, setFilter] = useState<WorkerFilter>("all");
  const [sellerId, setSellerId] = useState("");
  const date = localDayKey(new Date());
  const from = localDayStartUtc(date);
  const to = localDayEndUtc(date);
  const sellers = useQuery({
    queryKey: ["operation-sellers"],
    queryFn: operationsApi.sellers,
    enabled: canChooseSeller,
  });
  const effectiveSellerId = canChooseSeller
    ? sellerId
    : (user?.externalId ?? "");
  const selectedSeller = sellers.data?.find(
    (seller) => seller.externalId === effectiveSellerId,
  );
  const query = useQuery({
    queryKey: ["operations-dashboard", date, effectiveSellerId],
    queryFn: async () => {
      const activeSellers = await operationsApi.activeSellers();
      const workdays = effectiveSellerId
        ? await operationsApi.workdays({
            from,
            to,
            sellerExternalId: effectiveSellerId,
          })
        : [];
      const visitGroups = effectiveSellerId
        ? [
            await operationsApi.visits({
              from,
              to,
              sellerExternalId: effectiveSellerId,
            }),
          ]
        : await Promise.all(
            activeSellers.map((seller) =>
              operationsApi
                .visits({
                  from,
                  to,
                  sellerExternalId: seller.sellerExternalId,
                })
                .catch(() => []),
            ),
          );
      const visits = visitGroups.flat();
      const activeWithVisits = activeSellers.map((seller) => {
        const currentVisit = visits
          .filter(
            (visit) =>
              visit.sellerExternalId === seller.sellerExternalId &&
              !visit.checkOutAtUtc,
          )
          .sort((left, right) =>
            right.visitedAtUtc.localeCompare(left.visitedAtUtc),
          )[0];
        return {
          ...seller,
          currentVisit: currentVisit
            ? {
                name:
                  currentVisit.projectName ||
                  currentVisit.customerName ||
                  "Visita en curso",
                startedAtUtc: currentVisit.visitedAtUtc,
              }
            : seller.currentVisit,
        };
      });
      const sellerDirectory = selectedSeller
        ? [selectedSeller]
        : canChooseSeller
          ? (sellers.data ?? [])
          : [
              {
                externalId: effectiveSellerId,
                displayName: user?.fullName || "Responsable",
              },
            ];
      return buildOperationsDashboard(
        sellerDirectory,
        effectiveSellerId
          ? activeWithVisits.filter(
              (seller) => seller.sellerExternalId === effectiveSellerId,
            )
          : activeWithVisits,
        workdays,
        visits,
      );
    },
    enabled: !canChooseSeller || sellers.isSuccess,
    refetchInterval: 30_000,
  });
  const visibleWorkers = useMemo(() => {
    const workers = query.data?.workers ?? [];
    if (filter === "all") return workers;
    if (filter === "incidents")
      return workers.filter((worker) => Boolean(worker.incident));
    return workers.filter((worker) => worker.status === filter);
  }, [filter, query.data?.workers]);
  const incidents =
    query.data?.workers.filter((worker) => worker.incident) ?? [];

  return (
    <main className="customers-content operations-dashboard-page">
      <PageHeader
        eyebrow="Operación"
        title="Estado del equipo"
        description={`Jornadas, ${inSentence(visit.plural)} e incidencias de hoy, actualizadas automáticamente.`}
        action={
          <span className="operations-live-indicator">
            <Radio /> Actualización cada 30 s
          </span>
        }
      />
      {canChooseSeller && (
        <section className="operations-seller-picker">
          <div>
            <UserRoundSearch />
            <span>
              <strong>Responsable</strong>
              <small>Selecciona a quién deseas monitorear hoy.</small>
            </span>
          </div>
          <label>
            <span>Buscar responsable</span>
            <select
              value={sellerId}
              onChange={(event) => {
                setSellerId(event.target.value);
                setFilter("all");
              }}
              disabled={sellers.isLoading}
            >
              <option value="">
                {sellers.isLoading
                  ? "Cargando responsables..."
                  : "Todos los responsables"}
              </option>
              {sellers.data?.map((seller) => (
                <option key={seller.externalId} value={seller.externalId}>
                  {seller.displayName}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {sellers.error && canChooseSeller ? (
        <DataState
          loading={false}
          error={sellers.error}
          onRetry={sellers.refetch}
          isEmpty={false}
          empty="No hay responsables disponibles."
        >
          {null}
        </DataState>
      ) : (
        <DataState
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={!query.data}
          empty="No hay información operativa disponible."
        >
          {query.data && (
            <>
              <section
                className="operations-live-metrics"
                aria-label="Resumen operativo"
              >
                <OperationMetric
                  icon={Activity}
                  label="Trabajando ahora"
                  value={query.data.metrics.working}
                  tone="active"
                />
                <OperationMetric
                  icon={CheckCircle2}
                  label={
                    effectiveSellerId ? "Finalizó jornada" : "Total equipo"
                  }
                  value={
                    effectiveSellerId
                      ? query.data.metrics.finished
                      : query.data.workers.length
                  }
                  tone="finished"
                />
                <OperationMetric
                  icon={ClipboardCheck}
                  label={
                    effectiveSellerId
                      ? `${visit.plural} ${gendered(visit.singular, "completados", "completadas")}`
                      : "Con ubicación"
                  }
                  value={
                    effectiveSellerId
                      ? query.data.metrics.completedVisits
                      : query.data.workers.filter(
                          (worker) =>
                            worker.status === "working" &&
                            Number.isFinite(worker.latitude) &&
                            Number.isFinite(worker.longitude),
                        ).length
                  }
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
                      <h2>Responsables de hoy</h2>
                      <p>{query.data.workers.length} responsables visibles</p>
                    </div>
                    <nav aria-label="Filtrar responsables">
                      {(
                        [
                          ["all", "Todos"],
                          ["working", "Trabajando"],
                          effectiveSellerId
                            ? ["finished", "Finalizó"]
                            : ["not-started", "Sin actividad"],
                          ["incidents", "Incidencias"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          className={filter === value ? "active" : ""}
                          key={value}
                          onClick={() => setFilter(value as WorkerFilter)}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                  </header>
                  {visibleWorkers.length ? (
                    <div className="operations-worker-list">
                      {visibleWorkers.map((worker) => (
                        <WorkerRow
                          worker={worker}
                          key={worker.sellerExternalId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="operations-workers-empty">
                      No hay responsables en este filtro.
                    </div>
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
                        <p>Jornadas sin cerrar, sin ubicación o con señal atrasada.</p>
                      </div>
                      <TriangleAlert />
                    </header>
                    {incidents.length ? (
                      <div>
                        {incidents.map((worker) => (
                          <div
                            className="operations-incident-row"
                            key={worker.sellerExternalId}
                          >
                            <span>
                              {worker.sellerName.slice(0, 1).toUpperCase()}
                            </span>
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
      )}
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
      <span>
        <Icon />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

/** Shows the last diagnostic the seller's phone sent about location tracking. */
function TrackingHealthBadge({ worker }: { worker: OperationsWorker }) {
  const health = worker.trackingHealth;
  if (!health)
    // Locations arriving on time already prove the phone works; only flag the gap when tracking fails.
    return worker.status === "working" && worker.incident ? (
      <span className="tracking-health unknown">Celular sin reportes</span>
    ) : null;
  const detail = [
    health.message || "Sin detalle",
    `Ocurrió: ${formatDateTime(health.occurredAtUtc)}`,
    `Recibido: ${formatDateTime(health.receivedAtUtc)}`,
    health.installationId ? `Dispositivo: ${health.installationId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      className={`tracking-health ${health.isError ? "error" : "ok"}`}
      title={detail}
      aria-label={`${health.isError ? "Error en el celular" : "Celular correcto"}. ${detail}`}
    >
      {health.isError ? "Error en el celular" : "Celular correcto"}
    </span>
  );
}

function WorkerRow({ worker }: { worker: OperationsWorker }) {
  const initials = workerInitials(worker.sellerName);
  return (
    <div
      className={`operations-worker-row ${worker.incident ? "incident" : ""}`}
    >
      <span className="operations-worker-avatar">{initials}</span>
      <div className="operations-worker-name">
        <strong>{worker.sellerName}</strong>
        <TrackingHealthBadge worker={worker} />
        <small>
          {worker.currentVisitName
            ? `En ${worker.currentVisitName}${worker.currentVisitStartedAtUtc ? ` · desde ${formatTime(worker.currentVisitStartedAtUtc)}` : ""}`
            : worker.incident || statusLabels[worker.status]}
        </small>
      </div>
      <span className={`operations-worker-status ${worker.status}`}>
        {statusLabels[worker.status]}
      </span>
      <div className="operations-worker-fact">
        <small>Inicio</small>
        <strong>
          {worker.startedAtUtc ? formatTimeOrDate(worker.startedAtUtc) : "—"}
        </strong>
      </div>
      <div className="operations-worker-fact">
        <small>Última señal</small>
        <strong>
          {worker.lastLocationAtUtc
            ? formatRelativeTime(worker.lastLocationAtUtc)
            : "—"}
        </strong>
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
