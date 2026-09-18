import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Mail, MapPin, Pencil, Phone, RefreshCw, Trash2, UserRound } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { notify } from "@/components/feedback/toast";
import { LocationViewer } from "@/components/maps/LocationViewer";
import { downloadBlob } from "@/lib/export/downloadBlob";
import { translateValue } from "@/lib/i18n/labels";
import { formatDate } from "@/lib/i18n/dateTime";
import { deliveryApi } from "@/features/deliveries/api/deliveryApi";
import { CustomerActivity } from "./CustomerActivity";
import type { CustomerDetailDto, CustomerStatusDto } from "../api/customerDtos";

export function CustomerDetail({
  customer,
  initialTab,
  statuses,
  canUpdate,
  canDelete,
  startChangingStatus,
  changing,
  change,
  edit,
  remove,
}: {
  customer: CustomerDetailDto;
  initialTab: "timeline" | "notes" | "reminders";
  statuses: CustomerStatusDto[];
  canUpdate: boolean;
  canDelete: boolean;
  startChangingStatus: boolean;
  changing: boolean;
  change: (id: number) => void;
  edit: () => void;
  remove: () => void;
}) {
  const [changingStatus, setChangingStatus] = useState(startChangingStatus);
  const canReadDeliveries = usePermission("deliveries.read");
  const deliveryArchive = useMutation({
    mutationFn: () =>
      deliveryApi.downloadGroupedArchive({
        customerExternalId: customer.externalId,
      }),
    onSuccess: ({ blob, fileName }) => downloadBlob(blob, fileName),
    onError: (error) =>
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible descargar los comprobantes.",
        "error",
      ),
  });
  const applyStatus = (id: number) => {
    change(id);
    setChangingStatus(false);
  };
  return (
    <>
      <header className="customer-detail-header">
        <div>
          <p className="overline">Ficha CRM</p>
          <div className="customer-title-line">
            <h2>{customer.name}</h2>
            <span className={`status-pill ${customer.status.toLowerCase()}`}>
              {translateValue(customer.status)}
            </span>
          </div>
          <p>{customer.companyName || "Sin empresa"}</p>
          <div className="customer-contact-line">
            {customer.phone && (
              <a href={`tel:${customer.phone}`}>
                <Phone />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`}>
                <Mail />
                {customer.email}
              </a>
            )}
            <span>
              <UserRound />
              {customer.seller?.name || "Sin responsable"}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          {canReadDeliveries && (
            <button
              className="secondary-button"
              disabled={deliveryArchive.isPending}
              onClick={() => deliveryArchive.mutate()}
            >
              <Download />{" "}
              {deliveryArchive.isPending ? "Preparando…" : "Comprobantes ZIP"}
            </button>
          )}
          {canUpdate && (
            <button
              className="secondary-button"
              onClick={() => setChangingStatus((value) => !value)}
            >
              <RefreshCw />
              Cambiar estado
            </button>
          )}
          {canUpdate && (
            <button className="action-primary" onClick={edit}>
              <Pencil />
              Editar
            </button>
          )}
          {canDelete && (
            <button className="danger-button" onClick={remove}>
              <Trash2 />
              Eliminar
            </button>
          )}
        </div>
      </header>
      {changingStatus && (
        <div className="customer-status-action">
          <label>
            Nuevo estado
            <select
              defaultValue={customer.statusId}
              disabled={changing}
              onChange={(e) => applyStatus(Number(e.target.value))}
            >
              {statuses.map((x) => (
                <option key={x.value} value={x.value}>
                  {translateValue(x.label)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setChangingStatus(false)}>Cancelar</button>
        </div>
      )}
      <div className="customer-detail-grid">
        <section className="customer-summary-card">
          <h3>Datos comerciales</h3>
          <dl className="customer-detail">
            <div>
              <dt>Empresa</dt>
              <dd>{customer.companyName || "Sin empresa"}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{customer.seller?.name || "Sin asignar"}</dd>
            </div>
            <div>
              <dt>Último contacto</dt>
              <dd>
                {customer.lastContactAtUtc
                  ? formatDate(customer.lastContactAtUtc)
                  : "Sin registro"}
              </dd>
            </div>
            <div>
              <dt>Próximo contacto</dt>
              <dd>
                {customer.nextContactAtUtc
                  ? formatDate(customer.nextContactAtUtc)
                  : "Sin programar"}
              </dd>
            </div>
            <div className="customer-address">
              <dt>Dirección</dt>
              <dd>
                <MapPin />
                {customer.address || "Sin dirección registrada"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="customer-map-card">
          <h3>Ubicación</h3>
          <LocationViewer
            latitude={customer.latitude}
            longitude={customer.longitude}
            label={customer.address}
          />
        </section>
      </div>
      <CustomerActivity
        key={`${customer.externalId}-${initialTab}`}
        externalId={customer.externalId}
        initialTab={initialTab}
      />
    </>
  );
}
