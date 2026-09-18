import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermission } from "@/hooks/usePermission";
import { AppError } from "@/lib/api/apiError";
import { CustomerTimeline } from "./CustomerTimeline";
import { customerService } from "../services/customerService";
import type { CustomerReminderDto } from "../api/customerDtos";

const message = (error: unknown) => error instanceof AppError ? error.message : error instanceof Error ? error.message : "No fue posible completar la operación.";

export function CustomerActivity({
  externalId,
  initialTab = "timeline",
}: {
  externalId: string;
  initialTab?: "timeline" | "notes" | "reminders";
}) {
  const cache = useQueryClient(),
    canUpdate = usePermission("customers.update");
  const [tab, setTab] = useState<"notes" | "reminders" | "timeline">(
      initialTab,
    ),
    [text, setText] = useState(""),
    [date, setDate] = useState("");
  const notes = useQuery({
      queryKey: ["customer-notes", externalId],
      queryFn: () => customerService.notes(externalId),
      enabled: tab === "notes",
    }),
    reminders = useQuery({
      queryKey: ["customer-reminders", externalId],
      queryFn: () => customerService.reminders(externalId),
      enabled: tab === "reminders",
    }),
    timeline = useQuery({
      queryKey: ["customer-timeline", externalId],
      queryFn: () => customerService.timeline(externalId),
      enabled: tab === "timeline",
    });
  const invalidate = async () => {
    await cache.invalidateQueries({
      queryKey: ["customer-timeline", externalId],
    });
  };
  const addNote = useMutation({
      mutationFn: () => customerService.addNote(externalId, text),
      onSuccess: async () => {
        setText("");
        await cache.invalidateQueries({
          queryKey: ["customer-notes", externalId],
        });
        await invalidate();
      },
    }),
    addReminder = useMutation({
      mutationFn: () =>
        customerService.addReminder(
          externalId,
          text,
          new Date(date).toISOString(),
          null,
        ),
      onSuccess: async () => {
        setText("");
        setDate("");
        await cache.invalidateQueries({
          queryKey: ["customer-reminders", externalId],
        });
        await invalidate();
      },
    }),
    complete = useMutation({
      mutationFn: (id: string) =>
        customerService.completeReminder(externalId, id),
      onSuccess: async () => {
        await cache.invalidateQueries({
          queryKey: ["customer-reminders", externalId],
        });
        await invalidate();
      },
    });
  return (
    <section className="customer-activity">
      <nav className="activity-tabs">
        <button
          className={tab === "timeline" ? "active" : ""}
          onClick={() => setTab("timeline")}
        >
          Actividad
        </button>
        <button
          className={tab === "notes" ? "active" : ""}
          onClick={() => setTab("notes")}
        >
          Notas
        </button>
        <button
          className={tab === "reminders" ? "active" : ""}
          onClick={() => setTab("reminders")}
        >
          Recordatorios
        </button>
      </nav>
      {tab === "notes" && (
        <>
          {canUpdate && (
            <form
              className="activity-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) addNote.mutate();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe una nota"
              />
              <button disabled={addNote.isPending}>Agregar</button>
            </form>
          )}
          <ActivityList
            loading={notes.isLoading}
            error={notes.error}
            empty="Aún no hay notas para este cliente."
          >
            {notes.data?.map((n) => (
              <article key={n.externalId}>
                <strong>{n.author?.name || "Usuario"}</strong>
                <time>{formatDate(n.occurredAtUtc)}</time>
                <p>{n.text}</p>
              </article>
            ))}
          </ActivityList>
        </>
      )}
      {tab === "reminders" && (
        <>
          {canUpdate && (
            <form
              className="activity-form reminder-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim() && date) addReminder.mutate();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nuevo recordatorio"
              />
              <input
                aria-label="Fecha del recordatorio"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button disabled={addReminder.isPending}>Crear</button>
            </form>
          )}
          <ActivityList
            loading={reminders.isLoading}
            error={reminders.error}
            empty="No hay recordatorios pendientes."
          >
            {reminders.data?.length ? (
              <>
                {reminders.data.some((item) => !item.completed) && (
                  <section className="reminder-group">
                    <h3>Pendientes</h3>
                    {reminders.data
                      .filter((item) => !item.completed)
                      .map((r) => (
                        <ReminderItem
                          key={r.externalId}
                          reminder={r}
                          busy={complete.isPending}
                          complete={() => complete.mutate(r.externalId)}
                        />
                      ))}
                  </section>
                )}
                {reminders.data.some((item) => item.completed) && (
                  <section className="reminder-group completed">
                    <h3>Completados</h3>
                    {reminders.data
                      .filter((item) => item.completed)
                      .map((r) => (
                        <ReminderItem
                          key={r.externalId}
                          reminder={r}
                          busy={complete.isPending}
                        />
                      ))}
                  </section>
                )}
              </>
            ) : null}
          </ActivityList>
        </>
      )}
      {tab === "timeline" && (
        <CustomerTimeline
          items={timeline.data?.items || []}
          loading={timeline.isLoading}
          error={timeline.error}
        />
      )}
    </section>
  );
}
function ActivityList({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  children: ReactNode;
}) {
  if (loading) return <p className="activity-empty">Cargando…</p>;
  if (error) return <p className="form-error">{message(error)}</p>;
  return (
    <div className="activity-list">
      {children || <p className="activity-empty">{empty}</p>}
    </div>
  );
}
function ReminderItem({
  reminder,
  busy,
  complete,
}: {
  reminder: CustomerReminderDto;
  busy: boolean;
  complete?: () => void;
}) {
  return (
    <article className={reminder.completed ? "completed" : ""}>
      <div className="activity-title">
        <strong>{reminder.text}</strong>
        <span
          className={`reminder-status ${reminder.completed ? "done" : reminderClass(reminder.reminderAt)}`}
        >
          {reminder.completed
            ? "Completado"
            : reminderStatus(reminder.reminderAt)}
        </span>
      </div>
      <time>{formatDate(reminder.reminderAt)}</time>
      <p>{reminder.assignedTo?.name || "Sin asignar"}</p>
      {complete && (
        <button className="complete-button" disabled={busy} onClick={complete}>
          Completar
        </button>
      )}
    </article>
  );
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const reminderStatus = (value: string) =>
  new Date(value).getTime() < Date.now() ? "Vencido" : "Pendiente";
const reminderClass = (value: string) =>
  new Date(value).getTime() < Date.now() ? "overdue" : "pending";
