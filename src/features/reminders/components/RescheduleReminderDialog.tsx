import { useState, type FormEvent } from "react";
import type { SellerReminder } from "../api/reminderApi";

const toLocalInput = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

export function RescheduleReminderDialog({
  reminder,
  busy,
  onClose,
  onSave,
}: {
  reminder: SellerReminder;
  busy: boolean;
  onClose: () => void;
  onSave: (utc: string) => void;
}) {
  const [value, setValue] = useState(() =>
    toLocalInput(reminder.reminderAtUtc),
  );
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime()) || date <= new Date()) {
      setError("Selecciona una fecha y hora futura.");
      return;
    }
    onSave(date.toISOString());
  };
  return (
    <div
      className="upload-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <h2 id="reschedule-title">Reprogramar recordatorio</h2>
        <p>
          {reminder.customerName}: {reminder.text}
        </p>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>Nueva fecha y hora</span>
            <input
              type="datetime-local"
              required
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="action-primary" disabled={busy}>
              Guardar
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
