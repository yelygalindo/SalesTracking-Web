/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellPlus,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  MapPin,
  Package,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { LocationViewer } from "@/components/maps/LocationViewer";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { translateValue } from "@/lib/i18n/labels";
import type {
  Attachment,
  ProjectDetail,
  ProjectStatus,
  TimelineItem,
} from "../api/projectDtos";
import { projectService } from "../services/projectService";
import {
  formatBytes,
  validateAttachment,
} from "../services/attachmentValidation";

type MainTab = "summary" | "activity" | "attachments" | "products";
type ActivityFilter = "all" | "visits" | "notes" | "reminders" | "files";
type FileFilter = "all" | "photos" | "documents";

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
        {(
          [
            ["summary", "Resumen"],
            ["activity", "Actividad"],
            ["attachments", "Adjuntos"],
            ["products", "Productos"],
          ] as [MainTab, string][]
        ).map(([value, label]) => (
          <button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
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
              <h3>Localización de la obra</h3>
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

function ProjectProducts({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["project-materials", id],
    queryFn: () => projectService.materials(id),
  });
  return (
    <section className="project-products">
      <header>
        <p className="overline">Productos asociados</p>
        <h3>Materiales de la obra</h3>
      </header>
      {query.data?.map((item) => (
        <article key={item.productExternalId}>
          <Package />
          <div>
            <strong>{item.productName}</strong>
            <dl>
              <div>
                <dt>Cantidad</dt>
                <dd>{item.committedQuantity}</dd>
              </div>
              <div>
                <dt>Unidad</dt>
                <dd>{item.unit}</dd>
              </div>
              <div>
                <dt>Entregado</dt>
                <dd>{item.deliveredQuantity}</dd>
              </div>
              <div>
                <dt>Pendiente</dt>
                <dd>{item.pendingQuantity}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}
      {!query.isLoading && !query.data?.length && (
        <p className="activity-empty">Sin productos asociados a entregas.</p>
      )}
      {query.isLoading && <p className="activity-empty">Cargando productos…</p>}
      {query.isError && (
        <p className="form-error">No fue posible cargar los productos.</p>
      )}
    </section>
  );
}

function ProjectAttachments({
  id,
  editable,
  canDelete,
}: {
  id: string;
  editable: boolean;
  canDelete: boolean;
}) {
  const cache = useQueryClient(),
    query = useQuery({
      queryKey: ["project-attachments", id],
      queryFn: () => projectService.attachments(id),
    }),
    options = useQuery({
      queryKey: ["project-attachment-options"],
      queryFn: projectService.attachmentOptions,
    }),
    visits = useQuery({
      queryKey: ["project-visits", id],
      queryFn: () => projectService.visits(id),
    });
  const [filter, setFilter] = useState<FileFilter>("all"),
    [preview, setPreview] = useState<Attachment | null>(null),
    [uploadOpen, setUploadOpen] = useState(false),
    [visit, setVisit] = useState(""),
    [type, setType] = useState(""),
    [caption, setCaption] = useState(""),
    [isCover, setIsCover] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [validation, setValidation] = useState<string | null>(null),
    [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
      null,
    );
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ["project-attachments", id] });
  const upload = useMutation({
      mutationFn: () =>
        projectService.upload(id, {
          file: file!,
          visitExternalId: visit,
          attachmentType: type || options.data!.attachmentTypes[0].value,
          caption: caption.trim(),
          isCover,
          occurredAtUtc: new Date().toISOString(),
        }),
      onSuccess: async () => {
        setUploadOpen(false);
        setFile(null);
        setCaption("");
        notify("Adjunto cargado correctamente.");
        await refresh();
      },
    }),
    remove = useMutation({
      mutationFn: (attachmentId: string) =>
        projectService.deleteAttachment(id, attachmentId),
      onSuccess: async () => {
        setDeleting(null);
        notify("Adjunto eliminado correctamente.");
        await refresh();
      },
      onError: (error: Error) => notify(error.message, "error"),
    }),
    cover = useMutation({
      mutationFn: (attachmentId: string) =>
        projectService.setCover(id, attachmentId),
      onSuccess: async () => {
        notify("Portada actualizada correctamente.");
        await Promise.all([
          refresh(),
          cache.invalidateQueries({ queryKey: ["project", id] }),
          cache.invalidateQueries({ queryKey: ["dashboard"] }),
        ]);
      },
      onError: (error: Error) => notify(error.message, "error"),
    });
  const files = useMemo(
    () =>
      (query.data || []).filter(
        (item) =>
          filter === "all" ||
          (filter === "photos"
            ? item.contentType.startsWith("image/")
            : !item.contentType.startsWith("image/")),
      ),
    [query.data, filter],
  );
  const acceptedFileTypes = useMemo(
    () =>
      options.data?.acceptedFormats
        .flatMap((format) => [...format.extensions, ...format.contentTypes])
        .join(",") || undefined,
    [options.data],
  );
  const selectedFileIsImage = file?.type.startsWith("image/") ?? false;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = validateAttachment(file, options.data);
    if (error) return setValidation(error);
    if (!visit) return setValidation("Selecciona la visita asociada.");
    setValidation(null);
    upload.mutate();
  };
  return (
    <section className="project-attachments">
      <header>
        <div>
          <p className="overline">Archivos del proyecto</p>
          <h3>Adjuntos</h3>
        </div>
        {editable && (
          <button
            className="action-primary"
            onClick={() => setUploadOpen(true)}
          >
            <Upload />
            Subir archivo
          </button>
        )}
      </header>
      <nav className="attachment-filters">
        {(
          [
            ["all", "Todos"],
            ["photos", "Fotos"],
            ["documents", "Documentos"],
          ] as [FileFilter, string][]
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
      <div className="project-gallery">
        {files.map((item) => (
          <article
            className={item.isCover ? "cover" : ""}
            key={item.externalId}
          >
            {item.contentType.startsWith("image/") ? (
              <button
                className="image-preview-button"
                onClick={() => setPreview(item)}
                aria-label={`Ver ${item.caption || "fotografía"}`}
              >
                <img
                  src={item.downloadUrl}
                  alt={item.caption || "Fotografía del proyecto"}
                />
              </button>
            ) : (
              <a
                className="document-preview"
                href={item.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FileText />
              </a>
            )}
            <div>
              <strong>
                {item.caption || friendlyFileName(item.contentType)}
              </strong>
              {item.isCover && <span>★ Portada</span>}
              <p>
                {item.attachmentType} · {formatDate(item.createdAtUtc)}
              </p>
              <small>
                {formatBytes(item.sizeBytes)} · {item.uploadedByUserName}
              </small>
            </div>
            <footer>
              {item.contentType.startsWith("image/") && (
                <button onClick={() => setPreview(item)}>
                  <Eye />
                  Ver
                </button>
              )}
              <a
                className="attachment-action"
                href={item.downloadUrl}
                download={item.fileName}
              >
                <Download />
                Descargar
              </a>
              {editable &&
                item.contentType.startsWith("image/") &&
                !item.isCover && (
                  <button
                    disabled={cover.isPending}
                    onClick={() => cover.mutate(item.externalId)}
                  >
                    {cover.isPending ? "Actualizando…" : "Usar como portada"}
                  </button>
                )}
              {canDelete && (
                <button
                  className="danger-text"
                  onClick={() =>
                    setDeleting({
                      id: item.externalId,
                      name: item.caption || friendlyFileName(item.contentType),
                    })
                  }
                >
                  Eliminar
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>
      {!query.isLoading && !files.length && (
        <p className="activity-empty">No hay archivos para este filtro.</p>
      )}
      {query.isLoading && <p className="activity-empty">Cargando adjuntos…</p>}
      {query.isError && (
        <p className="form-error">No fue posible cargar los adjuntos.</p>
      )}
      {preview && (
        <div
          className="attachment-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa"
        >
          <button
            className="lightbox-close"
            onClick={() => setPreview(null)}
            aria-label="Cerrar vista previa"
          >
            <X />
          </button>
          <img
            src={preview.downloadUrl}
            alt={preview.caption || "Fotografía del proyecto"}
          />
          <footer>
            <strong>
              {preview.caption || friendlyFileName(preview.contentType)}
            </strong>
            <span>
              {formatDate(preview.createdAtUtc)} ·{" "}
              {formatBytes(preview.sizeBytes)}
            </span>
            <a href={preview.downloadUrl} download={preview.fileName}>
              <Download />
              Descargar
            </a>
          </footer>
        </div>
      )}
      {uploadOpen && (
        <div className="upload-drawer-backdrop">
          <aside className="upload-drawer">
            <button
              className="panel-close"
              onClick={() => setUploadOpen(false)}
            >
              <X />
            </button>
            <h3>Subir archivo</h3>
            <form onSubmit={submit}>
              <label>
                Visita asociada
                <select
                  required
                  value={visit}
                  onChange={(event) => setVisit(event.target.value)}
                >
                  <option value="">Seleccionar visita</option>
                  {visits.data?.map((item) => (
                    <option key={item.externalId} value={item.externalId}>
                      {formatDateTime(item.visitedAtUtc)} · {item.sellerName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {options.data?.attachmentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descripción
                <input
                  value={caption}
                  maxLength={250}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </label>
              <label>
                Archivo
                <input
                  required
                  type="file"
                  accept={acceptedFileTypes}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    setFile(selected);
                    if (!selected?.type.startsWith("image/")) setIsCover(false);
                    setValidation(validateAttachment(selected, options.data));
                  }}
                />
              </label>
              {selectedFileIsImage && (
                <label className="cover-check">
                  <input
                    type="checkbox"
                    checked={isCover}
                    onChange={(event) => setIsCover(event.target.checked)}
                  />{" "}
                  Usar como portada
                </label>
              )}
              {validation && <p className="form-error">{validation}</p>}
              <button className="action-primary" disabled={upload.isPending}>
                {upload.isPending ? "Subiendo…" : "Subir archivo"}
              </button>
            </form>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar adjunto"
        description={`Se eliminará ${deleting?.name || "este archivo"} de forma permanente.`}
        confirmLabel="Eliminar"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </section>
  );
}

const friendlyFileName = (contentType: string) =>
  contentType.startsWith("image/")
    ? "Fotografía"
    : contentType.includes("pdf")
      ? "Documento PDF"
      : "Documento";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(
    new Date(value),
  );
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
