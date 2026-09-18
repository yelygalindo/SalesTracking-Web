/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellPlus,
  CheckCircle2,
  FileText,
  MapPin,
  Pencil,
  X,
} from "lucide-react";
import { LocationViewer } from "@/components/maps/LocationViewer";
import { translateValue } from "@/lib/i18n/labels";
import { formatDate, formatDateTime } from "@/lib/i18n/dateTime";
import type {
  ProjectDetail,
  ProjectStatus,
  TimelineItem,
} from "../api/projectDtos";
import { projectService } from "../services/projectService";
import { ProjectProducts } from "./ProjectProducts";
import { ProjectAttachments } from "./ProjectAttachments";

type MainTab = "summary" | "activity" | "attachments" | "products";
type ActivityFilter = "all" | "visits" | "notes" | "reminders" | "files";

export function ProjectDetailView({
  project,
  statuses,
  canUpdate,
  canDelete,
  canStatus,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  project: ProjectDetail;
  statuses: ProjectStatus[];
  canUpdate: boolean;
  canDelete: boolean;
  canStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: number) => void;
}) {
  const [tab, setTab] = useState<MainTab>("summary"),
    [changingStatus, setChangingStatus] = useState(false);
  const timeline = useQuery({
    queryKey: ["project-timeline", project.externalId],
    queryFn: () => projectService.timeline(project.externalId),
  });
  const attachments = useQuery({
    queryKey: ["project-attachments", project.externalId],
    queryFn: () => projectService.attachments(project.externalId),
  });
  const products = useQuery({
    queryKey: ["project-materials", project.externalId],
    queryFn: () => projectService.materials(project.externalId),
  });
  const tabs: Array<[MainTab, string, number | undefined]> = [
    ["summary", "Resumen", undefined],
    ["activity", "Actividad", timeline.data?.items.length],
    ["attachments", "Archivos", attachments.data?.length],
    ["products", "Productos", products.data?.length],
  ];
  return (
    <div className="project-detail-page">
      <header className="project-detail-hero">
        <div>
          <p className="overline">Proyecto</p>
          <div className="project-title-row">
            <h2>{project.name}</h2>
            <span className="status-pill">
              {translateValue(project.status)}
            </span>
          </div>
          <p>
            {project.customerName || "Sin cliente"} ·{" "}
            {project.sellerName || "Sin responsable"}
          </p>
        </div>
        <div className="project-header-actions">
          {canStatus && !changingStatus && (
            <button
              className="secondary-action"
              onClick={() => setChangingStatus(true)}
            >
              Cambiar estado
            </button>
          )}
          {changingStatus && (
            <label className="inline-status">
              Estado
              <select
                autoFocus
                value={
                  statuses.find(
                    (item) =>
                      item.label.toLowerCase() === project.status.toLowerCase(),
                  )?.value || ""
                }
                onChange={(event) => {
                  onStatusChange(Number(event.target.value));
                  setChangingStatus(false);
                }}
              >
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setChangingStatus(false)}
                aria-label="Cancelar cambio de estado"
              >
                <X />
              </button>
            </label>
          )}
          {canUpdate && (
            <button className="action-primary" onClick={onEdit}>
              <Pencil />
              Editar
            </button>
          )}
          {canDelete && (
            <button className="danger-button" onClick={onDelete}>
              Eliminar
            </button>
          )}
        </div>
      </header>
      <nav className="project-detail-tabs">
        {tabs.map(([value, label, count]) => (
          <button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
            {count !== undefined && (
              <span className="project-tab-count">{count}</span>
            )}
          </button>
        ))}
      </nav>
      {tab === "summary" && (
        <ProjectSummary
          project={project}
          onShowActivity={() => setTab("activity")}
        />
      )}{" "}
      {tab === "activity" && (
        <ProjectActivity id={project.externalId} canUpdate={canUpdate} />
      )}{" "}
      {tab === "attachments" && (
        <ProjectAttachments
          id={project.externalId}
          editable={canUpdate}
          canDelete={canUpdate}
        />
      )}{" "}
      {tab === "products" && <ProjectProducts id={project.externalId} />}
    </div>
  );
}

function ProjectSummary({
  project,
  onShowActivity,
}: {
  project: ProjectDetail;
  onShowActivity: () => void;
}) {
  const timeline = useQuery({
    queryKey: ["project-timeline", project.externalId],
    queryFn: () => projectService.timeline(project.externalId),
  });
  const money =
    project.estimatedAmount == null
      ? "—"
      : new Intl.NumberFormat("es-BO", {
          style: "currency",
          currency: "BOB",
        }).format(project.estimatedAmount);
  return (
    <div className="project-summary project-summary-compact">
      <div className="project-overview-grid">
        <section className="project-facts project-overview-card">
          <header>
            <div>
              <p className="overline">Resumen</p>
              <h3>Datos principales</h3>
            </div>
          </header>
          <dl>
          <div>
            <dt>Cliente</dt>
            <dd>{project.customerName || "Sin cliente"}</dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>{project.sellerName || "Sin responsable"}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className="status-pill">
                {translateValue(project.status)}
              </span>
            </dd>
          </div>
          {project.estimatedAmount != null && (
            <div>
              <dt>Monto estimado</dt>
              <dd>{money}</dd>
            </div>
          )}
          {project.startDateUtc && (
            <div>
              <dt>Fecha de inicio</dt>
              <dd>{formatDate(project.startDateUtc)}</dd>
            </div>
          )}
          {project.expectedCloseDateUtc && (
            <div>
              <dt>Cierre estimado</dt>
              <dd>{formatDate(project.expectedCloseDateUtc)}</dd>
            </div>
          )}
          {project.actualCloseDateUtc && (
            <div>
              <dt>Cierre real</dt>
              <dd>{formatDate(project.actualCloseDateUtc)}</dd>
            </div>
          )}
            {project.address && (
              <div className="project-address-fact">
                <dt>Dirección</dt>
                <dd>{project.address}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className="project-location project-location-card">
          <header>
            <div>
              <p className="overline">Ubicación</p>
              <h3>Localización del proyecto</h3>
            </div>
            <MapPin />
          </header>
          <LocationViewer
            latitude={project.latitude}
            longitude={project.longitude}
            label={project.address}
            emptyText="Este proyecto todavía no tiene una ubicación registrada."
          />
        </section>
      </div>
      <div className="project-summary-secondary">
        <section className="project-progress-card project-progress-compact">
          <header>
            <div>
              <p className="overline">Ejecución</p>
              <h3>Avance del proyecto</h3>
            </div>
            <strong>{project.progressPercentage}%</strong>
          </header>
          <progress max="100" value={project.progressPercentage} />
          {project.description ? (
            <p>{project.description}</p>
          ) : (
            <p className="muted">Sin descripción adicional.</p>
          )}
        </section>
        <section className="project-recent-activity">
          <header>
            <div>
              <p className="overline">Seguimiento</p>
              <h3>Actividad reciente</h3>
            </div>
            <button onClick={onShowActivity}>Ver toda</button>
          </header>
          {timeline.isLoading ? (
            <p className="activity-empty">Cargando actividad…</p>
          ) : timeline.isError ? (
            <p className="form-error">No fue posible cargar la actividad.</p>
          ) : !timeline.data?.items.length ? (
            <p className="activity-empty">Aún no hay actividad registrada.</p>
          ) : (
            <div className="project-recent-list">
              {timeline.data.items.slice(0, 5).map((item) => {
                const info = activityInfo(item);
                return (
                  <article key={item.externalId}>
                    <span className={"recent-event-icon " + info.tone}>
                      <info.Icon />
                    </span>
                    <div>
                      <strong>{info.label}</strong>
                      {item.description &&
                        item.description.trim().toLowerCase() !==
                          "sin descripción" && <p>{item.description}</p>}
                      <small>
                        {item.createdBy?.name || "Sistema"} ·{" "}
                        <time>{formatDateTime(item.occurredAtUtc)}</time>
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const activityInfo = (item: TimelineItem) => {
  const value = `${item.eventTypeName} ${item.title}`.toLowerCase();
  if (value.includes("check-in") || value.includes("checkin"))
    return {
      label: "Visita iniciada",
      kind: "visits" as const,
      Icon: MapPin,
      tone: "orange",
    };
  if (value.includes("check-out") || value.includes("checkout"))
    return {
      label: "Visita finalizada",
      kind: "visits" as const,
      Icon: CheckCircle2,
      tone: "green",
    };
  if (value.includes("note"))
    return {
      label: "Nota agregada",
      kind: "notes" as const,
      Icon: Pencil,
      tone: "blue",
    };
  if (value.includes("attachment") || value.includes("archivo"))
    return {
      label: "Archivo agregado",
      kind: "files" as const,
      Icon: FileText,
      tone: "blue",
    };
  if (value.includes("reminder") && value.includes("complet"))
    return {
      label: "Recordatorio completado",
      kind: "reminders" as const,
      Icon: CheckCircle2,
      tone: "green",
    };
  if (value.includes("reminder"))
    return {
      label: "Recordatorio creado",
      kind: "reminders" as const,
      Icon: BellPlus,
      tone: "orange",
    };
  return {
    label: "Proyecto actualizado",
    kind: "all" as const,
    Icon: Pencil,
    tone: "blue",
  };
};
function ProjectActivity({
  id,
  canUpdate,
}: {
  id: string;
  canUpdate: boolean;
}) {
  const cache = useQueryClient(),
    [filter, setFilter] = useState<ActivityFilter>("all"),
    [action, setAction] = useState<"note" | "reminder" | null>(null),
    [text, setText] = useState(""),
    [date, setDate] = useState("");
  const timeline = useQuery({
    queryKey: ["project-timeline", id],
    queryFn: () => projectService.timeline(id),
  });
  const addNote = useMutation({
      mutationFn: () => projectService.addNote(id, text),
      onSuccess: async () => {
        setText("");
        setAction(null);
        await cache.invalidateQueries({ queryKey: ["project-timeline", id] });
      },
    }),
    addReminder = useMutation({
      mutationFn: () =>
        projectService.addReminder(id, text, new Date(date).toISOString()),
      onSuccess: async () => {
        setText("");
        setDate("");
        setAction(null);
        await cache.invalidateQueries({ queryKey: ["project-timeline", id] });
      },
    });
  const items = (timeline.data?.items || []).filter(
    (item) => filter === "all" || activityInfo(item).kind === filter,
  );
  return (
    <section className="project-activity">
      <header>
        <nav>
          {(
            [
              ["all", "Todos"],
              ["visits", "Visitas"],
              ["notes", "Notas"],
              ["reminders", "Recordatorios"],
              ["files", "Archivos"],
            ] as [ActivityFilter, string][]
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
        {canUpdate && (
          <div>
            <button onClick={() => setAction("note")}>+ Nueva nota</button>
            <button onClick={() => setAction("reminder")}>
              + Recordatorio
            </button>
          </div>
        )}
      </header>
      {action && (
        <form
          className="project-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            action === "note" ? addNote.mutate() : date && addReminder.mutate();
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              action === "note"
                ? "Escribe una nota"
                : "Descripción del recordatorio"
            }
          />
          {action === "reminder" && (
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          )}
          <button className="action-primary">Guardar</button>
          <button type="button" onClick={() => setAction(null)}>
            Cancelar
          </button>
        </form>
      )}
      <div className="project-timeline">
        {items.map((item) => {
          const info = activityInfo(item);
          return (
            <article key={item.externalId}>
              <span className={`event-icon ${info.tone}`}>
                <info.Icon />
              </span>
              <div>
                <strong>{info.label}</strong>
                {item.description &&
                  item.description.trim().toLowerCase() !==
                    "sin descripción" && <p>{item.description}</p>}
                <small>
                  {item.createdBy?.name || "Sistema"} ·{" "}
                  <time>{formatDateTime(item.occurredAtUtc)}</time>
                </small>
              </div>
            </article>
          );
        })}
        {!timeline.isLoading && !items.length && (
          <p className="activity-empty">No hay actividad para este filtro.</p>
        )}
        {timeline.isLoading && (
          <p className="activity-empty">Cargando actividad…</p>
        )}
        {timeline.isError && (
          <p className="form-error">No fue posible cargar la actividad.</p>
        )}
      </div>
    </section>
  );
}
