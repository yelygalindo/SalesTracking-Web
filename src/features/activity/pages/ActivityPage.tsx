import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarRange, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState } from "@/components/data/DataState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuthorization } from "@/features/auth/hooks/useAuthorization";
import { operationsApi } from "@/features/operations/api/operationsApi";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import {
  formatTime,
  localDayEndUtc,
  localDayStartUtc,
} from "@/lib/i18n/dateTime";
import { activityApi } from "../api/activityApi";
import {
  activityTypeFilters,
  dayLabel,
  describeActivity,
  groupByDay,
  isActivityType,
  relatedLink,
} from "../services/activityFeed";

const pageSize = 30;

export function ActivityPage() {
  const { hasRole, can } = useAuthorization();
  // Sellers only see their own activity; the API enforces it as well.
  const canChooseSeller = !hasRole("seller") && can("sellers.read");
  const filters = useUrlFilters(["seller", "from", "to", "type"] as const);
  const { seller, from, to, type } = filters.values;
  const activityType = isActivityType(type) ? type : undefined;

  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: operationsApi.sellers,
    enabled: canChooseSeller,
  });

  const feed = useInfiniteQuery({
    queryKey: ["activity", seller, from, to, activityType],
    queryFn: ({ pageParam }) =>
      activityApi.list({
        sellerExternalId: canChooseSeller ? seller : undefined,
        fromUtc: from ? localDayStartUtc(from) : undefined,
        toUtc: to ? localDayEndUtc(to) : undefined,
        type: activityType,
        page: pageParam,
        pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    refetchInterval: 60_000,
  });

  const items = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );
  const days = useMemo(() => groupByDay(items), [items]);
  const total = feed.data?.pages[0]?.pagination.totalItems ?? 0;
  const hasFilters = Boolean(seller || from || to || type);

  return (
    <main className="customers-content activity-page">
      <PageHeader
        eyebrow="Operación"
        title="Actividades"
        description="Jornadas, visitas, entregas, cambios de estado, recordatorios y notas del equipo en orden cronológico."
      />

      <section className="activity-filters" aria-label="Filtros de actividades">
        <div className="activity-filter-fields">
          {canChooseSeller && (
            <label>
              <span>
                <UserRound aria-hidden="true" /> Responsable
              </span>
              <select
                value={seller}
                onChange={(event) => filters.update({ seller: event.target.value })}
              >
                <option value="">Todo el equipo</option>
                {sellers.data?.map((item) => (
                  <option key={item.externalId} value={item.externalId}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>
              <CalendarRange aria-hidden="true" /> Desde
            </span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => filters.update({ from: event.target.value })}
            />
          </label>
          <label>
            <span>
              <CalendarRange aria-hidden="true" /> Hasta
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => filters.update({ to: event.target.value })}
            />
          </label>
        </div>
        <div className="activity-type-filters" role="group" aria-label="Tipo de actividad">
          {activityTypeFilters.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              aria-pressed={(activityType ?? "") === filter.value}
              onClick={() => filters.update({ type: filter.value })}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="activity-feed-card">
        {feed.isLoading ? (
          <Skeleton variant="list" rows={6} label="Cargando actividades…" />
        ) : feed.isError ? (
          <ErrorState error={feed.error} onRetry={feed.refetch} />
        ) : !items.length ? (
          <EmptyState
            title={hasFilters ? "No hay actividades con estos filtros" : "Todavía no hay actividades"}
            description={
              hasFilters
                ? "Prueba con otro rango de fechas, responsable o tipo."
                : "Cuando el equipo inicie jornadas, registre visitas o actualice seguimientos, lo verás aquí."
            }
            action={
              hasFilters && (
                <button
                  className="secondary-button"
                  onClick={() => filters.update({ seller: "", from: "", to: "", type: "" })}
                >
                  Limpiar filtros
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="activity-count">
              {total.toLocaleString("es-BO")}{" "}
              {total === 1 ? "actividad" : "actividades"}
            </p>
            {days.map((day) => (
              <section className="activity-day" key={day.key}>
                <h2>{dayLabel(day.key)}</h2>
                <ol>
                  {day.items.map((item) => {
                    const visual = describeActivity(item);
                    const link = relatedLink(item);
                    return (
                      <li key={`${item.eventType}-${item.externalId}`}>
                        <span className={`activity-icon ${visual.tone}`} aria-hidden="true">
                          <visual.Icon />
                        </span>
                        <div className="activity-body">
                          <p className="activity-title">
                            <strong>{item.title || visual.label}</strong>
                            {item.relatedEntityName &&
                              (link ? (
                                <Link to={link}>{item.relatedEntityName}</Link>
                              ) : (
                                <span>{item.relatedEntityName}</span>
                              ))}
                          </p>
                          {item.description && (
                            <p className="activity-description">{item.description}</p>
                          )}
                          <p className="activity-meta">
                            {visual.label !== item.title && (
                              <span className="activity-kind">{visual.label}</span>
                            )}
                            {item.sellerName && <span>{item.sellerName}</span>}
                          </p>
                        </div>
                        <time dateTime={item.occurredAtUtc}>
                          {formatTime(item.occurredAtUtc)}
                        </time>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
            {feed.hasNextPage && (
              <div className="activity-more">
                <button
                  className="secondary-button"
                  disabled={feed.isFetchingNextPage}
                  onClick={() => void feed.fetchNextPage()}
                >
                  {feed.isFetchingNextPage ? "Cargando…" : "Cargar más actividades"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
