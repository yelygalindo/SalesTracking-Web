import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocationPicker } from "@/components/maps/LocationPickerModern";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppError } from "@/lib/api/apiError";
import { translateValue } from "@/lib/i18n/labels";
import { customerService } from "../services/customerService";
import type { CustomerCreateExtrasDto, CustomerInputDto, CustomerStatusDto } from "../api/customerDtos";

const message = (error: unknown) => error instanceof AppError ? error.message : error instanceof Error ? error.message : "No fue posible completar la operación.";

export function CustomerForm({
  form,
  field,
  submit,
  busy,
  error,
  creating,
  statuses,
  extras,
  setExtras,
}: {
  form: CustomerInputDto;
  field: <K extends keyof CustomerInputDto>(
    key: K,
    value: CustomerInputDto[K],
  ) => void;
  submit: (e: FormEvent) => void;
  busy: boolean;
  error: unknown;
  creating: boolean;
  statuses: CustomerStatusDto[];
  extras: CustomerCreateExtrasDto;
  setExtras: Dispatch<SetStateAction<CustomerCreateExtrasDto>>;
}) {
  const { user } = useAuth(),
    isSeller =
      user?.roles.some((role) => role.toLowerCase() === "seller") ?? false;
  const sellers = useQuery({
    queryKey: ["sellers"],
    queryFn: customerService.sellers,
    enabled: !isSeller,
  });
  return (
    <>
      <p className="overline">Clientes</p>
      <h2>Datos del cliente</h2>
      <form className="customer-form" onSubmit={submit}>
        <label>
          Nombre *
          <input
            required
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          Empresa
          <input
            value={form.companyName}
            onChange={(e) => field("companyName", e.target.value)}
          />
        </label>
        <label>
          Teléfono
          <input
            value={form.phone}
            onChange={(e) => field("phone", e.target.value)}
          />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => field("email", e.target.value)}
          />
        </label>
        <label>
          Dirección
          <input
            value={form.address ?? ""}
            onChange={(e) => field("address", e.target.value)}
          />
        </label>
        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => {
            field("latitude", lat);
            field("longitude", lng);
          }}
        />
        {isSeller ? (
          <p className="assignment-note">
            El cliente se asignará automáticamente a tu usuario.
          </p>
        ) : (
          <>
            <label>
              Vendedor
              <select
                value={form.sellerExternalId ?? ""}
                onChange={(e) => field("sellerExternalId", e.target.value)}
              >
                <option value="">
                  El vendedor será asignado automáticamente
                </option>
                {sellers.data?.map((s) => (
                  <option key={s.externalId} value={s.externalId}>
                    {s.displayName} · {s.email}
                  </option>
                ))}
              </select>
            </label>
            {sellers.isError && (
              <p className="form-error">
                No se pudo cargar la lista de vendedores.
              </p>
            )}
          </>
        )}
        {creating && (
          <fieldset className="customer-form-extras">
            <legend>Seguimiento inicial</legend>
            <label>
              Estado
              <select
                value={extras.statusId ?? ""}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    statusId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">Estado inicial predeterminado</option>
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {translateValue(item.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nota inicial
              <textarea
                rows={3}
                value={extras.initialNote}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    initialNote: e.target.value,
                  }))
                }
                placeholder="Contexto comercial del cliente"
              />
            </label>
            <label>
              Recordatorio opcional
              <input
                value={extras.reminderText}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    reminderText: e.target.value,
                  }))
                }
                placeholder="Próximo paso"
              />
            </label>
            <label>
              Próximo contacto
              <input
                type="datetime-local"
                value={extras.reminderAtUtc}
                onChange={(e) =>
                  setExtras((current) => ({
                    ...current,
                    reminderAtUtc: e.target.value,
                  }))
                }
              />
            </label>
          </fieldset>
        )}
        {Boolean(error) && <p className="form-error">{message(error)}</p>}
        <button className="action-primary submit-customer" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cliente"}
        </button>
      </form>
    </>
  );
}
