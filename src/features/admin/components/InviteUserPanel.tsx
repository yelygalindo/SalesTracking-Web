import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { FormField } from "@/components/forms/FormField";
import { notify } from "@/components/feedback/toast";
import { adminApi } from "../api/adminApi";
import { companyApi } from "../api/companyApi";

export function InviteUserPanel() {
  const cache = useQueryClient();
  const [invitation, setInvitation] = useState({
    email: "",
    fullName: "",
    roleCode: "seller",
  });
  const capacity = useQuery({
    queryKey: ["company-user-capacity"],
    queryFn: companyApi.userCapacity,
  });
  const invite = useMutation({
    mutationFn: () => adminApi.invite(invitation),
    onSuccess: async () => {
      setInvitation({ email: "", fullName: "", roleCode: "seller" });
      notify("Invitación creada correctamente.");
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["managed-invitations"] }),
        cache.invalidateQueries({ queryKey: ["company-user-capacity"] }),
      ]);
    },
  });
  const noCapacity = capacity.data?.availableSlots === 0;
  return (
    <section className="admin-card admin-section-card">
      {capacity.data && (
        <div
          className={`capacity-summary ${noCapacity ? "capacity-full" : ""}`}
        >
          <Users />
          <div>
            <strong>
              {capacity.data.usedSlots} de {capacity.data.userLimit} cupos
              utilizados
            </strong>
            <span>
              {capacity.data.activeUserCount} usuarios activos ·{" "}
              {capacity.data.pendingInvitationCount} invitaciones pendientes
            </span>
          </div>
          <b>{capacity.data.availableSlots} disponibles</b>
        </div>
      )}
      <form
        className="customer-form admin-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <p className="assignment-note">
          Al crearla se envía un correo con un enlace temporal. Puedes revisar
          su estado, reenviarla o cancelarla.
        </p>
        <FormField label="Nombre completo" required>
          <input
            required
            value={invitation.fullName}
            onChange={(event) =>
              setInvitation({ ...invitation, fullName: event.target.value })
            }
          />
        </FormField>
        <FormField label="Correo" required>
          <input
            required
            type="email"
            value={invitation.email}
            onChange={(event) =>
              setInvitation({ ...invitation, email: event.target.value })
            }
          />
        </FormField>
        <FormField label="Rol" required>
          <select
            value={invitation.roleCode}
            onChange={(event) =>
              setInvitation({ ...invitation, roleCode: event.target.value })
            }
          >
            <option value="seller">Vendedor</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
        </FormField>
        {capacity.isError && (
          <p className="form-error">
            No fue posible consultar los cupos disponibles.
          </p>
        )}
        {noCapacity && (
          <p className="form-error">
            La empresa alcanzó el límite de usuarios. Solicita al administrador
            de plataforma ampliar los cupos.
          </p>
        )}
        {invite.error && <p className="form-error">{invite.error.message}</p>}
        <button
          className="action-primary"
          disabled={invite.isPending || capacity.isLoading || noCapacity}
        >
          {invite.isPending ? "Enviando…" : "Crear invitación"}
        </button>
      </form>
    </section>
  );
}
