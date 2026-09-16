import { useMemo, useState } from "react";
import {
  BellPlus,
  CheckCircle2,
  FileText,
  MapPin,
  Pencil,
  RefreshCw,
} from "lucide-react";
import type { CustomerTimelineDto } from "../api/customerDtos";

type Filter = "all" | "customer" | "notes" | "reminders";
type Kind = Exclude<Filter, "all">;
interface ViewEvent extends CustomerTimelineDto {
  kind: Kind;
  label: string;
  tone: string;
  count: number;
}

const eventInfo = (type: string) => {
  const value = type.toLowerCase().replaceAll("_", "");
  if (
    value.includes("reminder") &&
    (value.includes("complete") || value.includes("completed"))
  )
    return {
      kind: "reminders" as const,
      label: "Recordatorio completado",
      tone: "success",
      Icon: CheckCircle2,
    };
  if (value.includes("reminder"))
    return {
      kind: "reminders" as const,
      label: "Recordatorio creado",
      tone: "warning",
      Icon: BellPlus,
    };
  if (value.includes("note"))
    return {
      kind: "notes" as const,
      label: "Nota agregada",
      tone: "note",
      Icon: FileText,
    };
  if (value.includes("location") || value.includes("address"))
    return {
      kind: "customer" as const,
      label: "Ubicación actualizada",
      tone: "location",
      Icon: MapPin,
    };
  if (value.includes("status"))
    return {
      kind: "customer" as const,
      label: "Estado actualizado",
      tone: "update",
      Icon: RefreshCw,
    };
  return {
    kind: "customer" as const,
    label: "Cliente actualizado",
    tone: "update",
    Icon: Pencil,
  };
};

const dayKey = (value: string) => new Date(value).toLocaleDateString("en-CA");
const dayLabel = (value: string) => {
  const date = new Date(value),
    today = new Date(),
    yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return "Hoy";
  if (dayKey(value) === dayKey(yesterday.toISOString())) return "Ayer";
  return new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short" })
    .format(date)
    .replace(".", "");
};
const exactDate = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
const time = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function CustomerTimeline({
  items,
  loading,
  error,
}: {
  items: CustomerTimelineDto[];
  loading: boolean;
  error: unknown;
}) {
  const [filter, setFilter] = useState<Filter>("all"),
    [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const normalized: ViewEvent[] = items.map((item) => ({
      ...item,
      ...eventInfo(item.eventType),
      count: 1,
    }));
    const compacted = normalized.reduce<ViewEvent[]>((result, item) => {
      const last = result.at(-1);
      if (
        last &&
        last.eventType === item.eventType &&
        last.createdBy?.name === item.createdBy?.name &&
        dayKey(last.createdAtUtc) === dayKey(item.createdAtUtc)
      ) {
        last.count += 1;
        return result;
      }
      result.push({ ...item });
      return result;
    }, []);
    const visible =
      filter === "all"
        ? compacted
        : compacted.filter((item) => item.kind === filter);
    return visible.reduce<Record<string, ViewEvent[]>>((result, item) => {
      const key = dayKey(item.createdAtUtc);
      (result[key] ??= []).push(item);
      return result;
    }, {});
  }, [items, filter]);
  if (loading) return <p className="activity-empty">Cargando actividad…</p>;
  if (error)
    return <p className="form-error">No fue posible cargar la actividad.</p>;
  return (
    <div className="crm-timeline">
      <header>
        <div>
          <p className="overline">Actividad reciente</p>
          <span>{items.length} eventos registrados</span>
        </div>
        <nav aria-label="Filtrar actividad">
          {(
            [
              ["all", "Todos"],
              ["customer", "Cliente"],
              ["notes", "Notas"],
              ["reminders", "Recordatorios"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
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
      {!Object.keys(groups).length ? (
        <p className="activity-empty">No hay actividad para este filtro.</p>
      ) : (
        Object.entries(groups).map(([day, events]) => (
          <section className="timeline-day" key={day}>
            <h3>{dayLabel(events![0].createdAtUtc)}</h3>
            <div className="timeline-events">
              {events!.map((event) => {
                const { Icon } = eventInfo(event.eventType);
                const open = expanded[event.externalId];
                return (
                  <article
                    className={`timeline-event ${event.tone}`}
                    key={event.externalId}
                  >
                    <span className="timeline-icon">
                      <Icon />
                    </span>
                    <div>
                      <strong>
                        {event.count > 1
                          ? `${event.count} ${event.label.toLowerCase().replace("recordatorio", "recordatorios")}`
                          : event.label}
                      </strong>
                      {event.description &&
                        event.description !== event.eventType && (
                          <p>“{event.description}”</p>
                        )}
                      <small>
                        {event.createdBy?.name || "Sistema"} ·{" "}
                        <time title={exactDate(event.createdAtUtc)}>
                          {time(event.createdAtUtc)}
                        </time>
                      </small>
                      {event.count > 1 && (
                        <button
                          className="timeline-detail"
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [event.externalId]: !open,
                            }))
                          }
                        >
                          {open ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                      )}
                      {open && (
                        <p className="timeline-expanded">
                          Este grupo reúne {event.count} eventos consecutivos
                          del mismo tipo.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
