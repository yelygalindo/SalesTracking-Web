import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { notify } from "@/components/feedback/toast";
import {
  reminderApi,
  type ReminderFilters,
  type SellerReminder,
} from "../api/reminderApi";
import { RescheduleReminderDialog } from "../components/RescheduleReminderDialog";

type ReminderStatus = "pending" | "completed" | "all";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
const currentMonthKey = () => dateKey(new Date()).slice(0, 7);
const monthDate = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
};
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric",
  }).format(monthDate(month));
const moveMonth = (month: string, amount: number) => {
  const date = monthDate(month);
  date.setMonth(date.getMonth() + amount);
  return dateKey(date).slice(0, 7);
};
const monthDays = (month: string) => {
  const first = monthDate(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - mondayOffset);
  const count = Math.ceil((mondayOffset + last.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};
const reminderDateKey = (value: string) => dateKey(new Date(value));
const reminderTime = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const reminderDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));

export function RemindersPage() {
  const cache = useQueryClient();
  const [month, setMonth] = useState(currentMonthKey);
  const [status, setStatus] = useState<ReminderStatus>("pending");
  const [selected, setSelected] = useState<SellerReminder | null>(null);
  const [rescheduling, setRescheduling] = useState<SellerReminder | null>(null);
  const days = useMemo(() => monthDays(month), [month]);
  const filters = useMemo<ReminderFilters>(
    () => ({
      from: dateKey(days[0]),
      to: dateKey(days[days.length - 1]),
      completed: status === "all" ? undefined : status === "completed",
    }),
    [days, status],
  );
  const query = useQuery({
    queryKey: ["reminders", filters],
    queryFn: () => reminderApi.list(filters),
  });
  const remindersByDay = useMemo(() => {
    const result = new Map<string, SellerReminder[]>();
    for (const reminder of query.data ?? []) {
      const key = reminderDateKey(reminder.reminderAtUtc);
      const reminders = result.get(key) ?? [];
      reminders.push(reminder);
      result.set(key, reminders);
    }
    for (const reminders of result.values())
      reminders.sort((left, right) =>
        left.reminderAtUtc.localeCompare(right.reminderAtUtc),
      );
    return result;
  }, [query.data]);
  const complete = useMutation({
    mutationFn: (reminder: SellerReminder) => reminderApi.complete(reminder),
    onSuccess: async (_, reminder) => {
      setSelected(null);
      notify(`Recordatorio de ${reminder.customerName} completado.`);
      await cache.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const reschedule = useMutation({
    mutationFn: ({
      reminder,
      value,
    }: {
      reminder: SellerReminder;
      value: string;
    }) => reminderApi.reschedule(reminder, value),
    onSuccess: async () => {
      setRescheduling(null);
      notify("Recordatorio reprogramado.");
      await cache.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => notify(error.message, "error"),
  });
  const now = new Date();
  const monthReminders = (query.data ?? []).filter((reminder) =>
    reminderDateKey(reminder.reminderAtUtc).startsWith(month),
  );
  const pendingCount = monthReminders.filter((item) => !item.completed).length;
  const overdueCount = monthReminders.filter(
    (item) => !item.completed && new Date(item.reminderAtUtc) < now,
  ).length;

  return (
    <main className="customers-content reminders-page">
      <PageHeader
        eyebrow="Agenda"
        title="Agenda mensual"
        description="Organiza recordatorios y seguimientos programados, y abre cada pendiente para revisar su detalle."
      />

      <section
        className="reminder-calendar-toolbar"
        aria-label="Filtros del cronograma"
      >
        <div className="reminder-month-navigation">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setMonth((value) => moveMonth(value, -1))}
          >
            <ChevronLeft />
          </button>
          <div>
            <CalendarDays />
            <strong>{monthLabel(month)}</strong>
          </div>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setMonth((value) => moveMonth(value, 1))}
          >
            <ChevronRight />
          </button>
          <button
            className="reminder-today-button"
            type="button"
            onClick={() => setMonth(currentMonthKey())}
          >
            Hoy
          </button>
        </div>
        <div className="reminder-calendar-filters">
          <label>
            Estado
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ReminderStatus)
              }
            >
              <option value="pending">Pendientes</option>
              <option value="completed">Completados</option>
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
      </section>

      <section
        className="reminder-calendar-summary"
        aria-label="Resumen del mes"
      >
        <span>
          <CalendarClock />
          <strong>{pendingCount}</strong> pendientes
        </span>
        <span className={overdueCount ? "overdue" : ""}>
          <Clock3 />
          <strong>{overdueCount}</strong> vencidos
        </span>
        <small>
          {monthReminders.length} recordatorios en {monthLabel(month)}
        </small>
      </section>

      {query.isLoading ? (
        <div className="data-state">Cargando cronograma…</div>
      ) : query.isError ? (
        <div className="data-state error">
          <strong>No pudimos cargar los recordatorios</strong>
          <p>{query.error.message}</p>
        </div>
      ) : (
        <div className="reminder-calendar-scroll">
          <section
            className="reminder-calendar"
            aria-label={`Calendario de ${monthLabel(month)}`}
          >
            {weekdays.map((day) => (
              <div className="reminder-weekday" key={day}>
                {day}
              </div>
            ))}
            {days.map((day) => {
              const key = dateKey(day);
              const dayReminders = remindersByDay.get(key) ?? [];
              const outside = !key.startsWith(month);
              const today = key === dateKey(now);
              return (
                <article
                  className={`reminder-calendar-day${outside ? " outside" : ""}${today ? " today" : ""}`}
                  key={key}
                >
                  <header>
                    <time dateTime={key}>{day.getDate()}</time>
                    {dayReminders.length > 0 && (
                      <span>{dayReminders.length}</span>
                    )}
                  </header>
                  <div className="reminder-day-events">
                    {dayReminders.map((reminder) => {
                      const overdue =
                        !reminder.completed &&
                        new Date(reminder.reminderAtUtc) < now;
                      return (
                        <button
                          className={`${reminder.completed ? "completed" : "pending"}${overdue ? " overdue" : ""}`}
                          type="button"
                          key={reminder.externalId}
                          onClick={() => setSelected(reminder)}
                          title={`${reminderTime(reminder.reminderAtUtc)} · ${reminder.text}`}
                        >
                          <time>{reminderTime(reminder.reminderAtUtc)}</time>
                          <strong>{reminder.text}</strong>
                          <small>{reminder.customerName}</small>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}

      {selected && (
        <div
          className="reminder-detail-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelected(null)
          }
        >
          <section
            className="reminder-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-detail-title"
          >
            <header>
              <span className={selected.completed ? "completed" : "pending"}>
                {selected.completed ? <CheckCircle2 /> : <CalendarClock />}
              </span>
              <div>
                <small>{selected.completed ? "Completado" : "Pendiente"}</small>
                <h2 id="reminder-detail-title">{selected.text}</h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </header>
            <dl>
              <div>
                <dt>Cliente</dt>
                <dd>{selected.customerName}</dd>
              </div>
              <div>
                <dt>Fecha y hora</dt>
                <dd>{reminderDateTime(selected.reminderAtUtc)}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selected.completed ? "Completado" : "Pendiente"}</dd>
              </div>
            </dl>
            <footer>
              <Link
                to={`/customers?selected=${encodeURIComponent(selected.customerExternalId)}`}
              >
                Abrir cliente
              </Link>
              {!selected.completed && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduling(selected);
                      setSelected(null);
                    }}
                  >
                    Reprogramar
                  </button>
                  <button
                    className="action-primary"
                    type="button"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate(selected)}
                  >
                    Marcar completado
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}
      {rescheduling && (
        <RescheduleReminderDialog
          reminder={rescheduling}
          busy={reschedule.isPending}
          onClose={() => setRescheduling(null)}
          onSave={(value) =>
            reschedule.mutate({ reminder: rescheduling, value })
          }
        />
      )}
    </main>
  );
}
