import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { formatDate, formatDateTime } from "@/lib/i18n/dateTime";
import { deliveryApi } from "@/features/deliveries/api/deliveryApi";
import type { Attachment } from "../api/projectDtos";
import { projectService } from "../services/projectService";
import { formatBytes, validateAttachment } from "../services/attachmentValidation";

type FileFilter = "all" | "photos" | "documents";

export function ProjectAttachments({
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
    }),
    archive = useMutation({
      mutationFn: () => projectService.downloadAttachmentsArchive(id),
      onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
      onError: (error: Error) => notify(error.message, "error"),
    }),
    deliveryArchive = useMutation({
      mutationFn: () =>
        deliveryApi.downloadGroupedArchive({ projectExternalId: id }),
      onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
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
        <div className="project-attachment-actions">
          {!!query.data?.length && (
            <button className="secondary-action" disabled={archive.isPending} onClick={() => archive.mutate()}>
              <Download /> {archive.isPending ? "Preparando…" : "Descargar ZIP"}
            </button>
          )}
          <button className="secondary-action" disabled={deliveryArchive.isPending} onClick={() => deliveryArchive.mutate()}>
            <Download /> {deliveryArchive.isPending ? "Preparando…" : "Comprobantes de entregas"}
          </button>
          {editable && (
            <button className="action-primary" onClick={() => setUploadOpen(true)}>
              <Upload /> Subir archivo
            </button>
          )}
        </div>
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
