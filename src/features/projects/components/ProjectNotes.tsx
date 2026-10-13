import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { notify } from "@/components/feedback/toast";
import { formatDateTime } from "@/lib/i18n/dateTime";
import type { ProjectNote } from "../api/projectDtos";
import { projectService } from "../services/projectService";

/** Project notes with in-place editing and deletion. */
export function ProjectNotes({
  projectId,
  canUpdate,
}: {
  projectId: string;
  canUpdate: boolean;
}) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<ProjectNote | null>(null);
  const notes = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: () => projectService.notes(projectId),
  });
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ["project-notes", projectId] }),
      cache.invalidateQueries({ queryKey: ["project-timeline", projectId] }),
    ]);
  const update = useMutation({
    mutationFn: (note: { id: string; text: string }) =>
      projectService.updateNote(projectId, note.id, note.text.trim()),
    onSuccess: async () => {
      setEditing(null);
      notify("Nota actualizada.", "success");
      await refresh();
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (note: ProjectNote) =>
      projectService.deleteNote(projectId, note.externalId),
    onSuccess: async () => {
      setDeleting(null);
      notify("Nota eliminada.", "success");
      await refresh();
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  if (notes.isLoading) return <p className="activity-empty">Cargando notas…</p>;
  if (notes.isError)
    return <p className="form-error">No fue posible cargar las notas.</p>;
  const items = [...(notes.data ?? [])].sort(
    (a, b) =>
      new Date(b.occurredAtUtc).getTime() - new Date(a.occurredAtUtc).getTime(),
  );
  if (!items.length)
    return <p className="activity-empty">Todavía no hay notas.</p>;

  return (
    <>
      {items.map((note) => (
        <article key={note.externalId} className="project-note">
          <span className="event-icon blue">
            <Pencil />
          </span>
          <div>
            {editing?.id === note.externalId ? (
              <form
                className="project-note-edit"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (editing.text.trim()) update.mutate(editing);
                }}
              >
                <textarea
                  autoFocus
                  aria-label="Contenido de la nota"
                  rows={3}
                  value={editing.text}
                  onChange={(event) =>
                    setEditing({ id: note.externalId, text: event.target.value })
                  }
                />
                <div>
                  <button
                    className="action-primary"
                    disabled={
                      update.isPending ||
                      !editing.text.trim() ||
                      editing.text.trim() === note.content
                    }
                  >
                    {update.isPending ? "Guardando…" : "Guardar"}
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <p>{note.content}</p>
            )}
            <small>
              {note.createdBy?.name || "Sistema"} ·{" "}
              <time>{formatDateTime(note.occurredAtUtc)}</time>
              {note.updatedAtUtc && (
                <>
                  {" "}
                  · editada{note.updatedBy?.name ? ` por ${note.updatedBy.name}` : ""}
                </>
              )}
            </small>
          </div>
          {canUpdate && editing?.id !== note.externalId && (
            <div className="project-note-actions">
              <button
                type="button"
                aria-label="Editar nota"
                title="Editar nota"
                onClick={() =>
                  setEditing({ id: note.externalId, text: note.content })
                }
              >
                <Pencil />
              </button>
              <button
                type="button"
                aria-label="Eliminar nota"
                title="Eliminar nota"
                onClick={() => setDeleting(note)}
              >
                <Trash2 />
              </button>
            </div>
          )}
        </article>
      ))}
      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar nota"
        description="La nota dejará de verse en el proyecto. ¿Quieres eliminarla?"
        confirmLabel="Eliminar"
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
