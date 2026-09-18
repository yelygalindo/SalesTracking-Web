import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormField } from "@/components/forms/FormField";
import { notify } from "@/components/feedback/toast";
import { getDisplayTimeZone, setCompanyTimeZone } from "@/lib/i18n/dateTime";
import { companyApi } from "../api/companyApi";

export function TimeZonePanel() {
  const cache = useQueryClient(),
    [timeZoneId, setTimeZoneId] = useState("");
  const current = useQuery({
    queryKey: ["company-time-zone"],
    queryFn: companyApi.timeZone,
  });
  useEffect(() => {
    if (current.data?.timeZoneId) setTimeZoneId(current.data.timeZoneId);
  }, [current.data]);
  const update = useMutation({
    mutationFn: () => companyApi.updateTimeZone(timeZoneId.trim()),
    onSuccess: (result) => {
      setCompanyTimeZone(result.timeZoneId);
      setTimeZoneId(result.timeZoneId);
      notify("Zona horaria actualizada correctamente.");
      void cache.invalidateQueries({ queryKey: ["company-time-zone"] });
    },
  });
  return (
    <section className="admin-card admin-section-card">
      <form
        className="customer-form admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <FormField label="Identificador IANA" required>
          <input
            required
            list="time-zone-suggestions"
            value={timeZoneId}
            placeholder="America/La_Paz"
            onChange={(event) => setTimeZoneId(event.target.value)}
          />
        </FormField>
        <datalist id="time-zone-suggestions">
          <option value={getDisplayTimeZone()} />
          <option value="America/La_Paz" />
          <option value="America/Lima" />
          <option value="America/Argentina/Buenos_Aires" />
          <option value="UTC" />
        </datalist>
        <p className="form-hint">
          Zona detectada en este dispositivo:{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
        </p>
        {current.isError && (
          <p className="form-error">
            No fue posible consultar la zona horaria actual.
          </p>
        )}
        {update.error && <p className="form-error">{update.error.message}</p>}
        <div className="admin-form-actions">
          <button
            className="action-primary"
            disabled={update.isPending || !timeZoneId.trim()}
          >
            {update.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}
