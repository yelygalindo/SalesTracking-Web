const values: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  prospect: "Prospecto",
  contacted: "Contactado",
  draft: "Borrador",
  "on-hold": "En pausa",
  onhold: "En pausa",
  completed: "Completado",
  lost: "Perdido",
  pending: "Pendiente",
  accepted: "Aceptada",
  expired: "Vencida",
  partial: "Parcial",
  delivered: "Entregado",
  "partially-delivered": "Entregado parcialmente",
  inprogress: "En curso",
  "in-progress": "En curso",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  sent: "Enviado",
  failed: "Fallido",
  seller: "Vendedor",
  supervisor: "Supervisor",
  admin: "Administrador",
  open: "Abierto",
  closed: "Cerrado",
  disabled: "Deshabilitado",
  enabled: "Habilitado",
};

export function translateValue(value: string | null | undefined) {
  if (!value) return "—";
  const key = value.trim().toLowerCase().replaceAll("_", "-");
  return values[key] ?? value;
}
