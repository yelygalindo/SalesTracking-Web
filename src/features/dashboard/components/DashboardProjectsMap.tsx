import { useEffect, useMemo } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { DashboardProjectItem } from "../api/dashboardApi";

const isCoordinate = (value: number | null | undefined, limit: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit;

const tone = (status?: string | null) => {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("activo")) return "active";
  if (normalized.includes("pausa")) return "hold";
  if (normalized.includes("complet")) return "completed";
  if (normalized.includes("perdid")) return "lost";
  return "draft";
};

function Viewport({ items }: { items: DashboardProjectItem[] }) {
  const map = useMap();
  useEffect(() => {
    const points = items.map(
      (item) => [item.latitude!, item.longitude!] as [number, number],
    );
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1)
      map.fitBounds(latLngBounds(points), { padding: [30, 30], maxZoom: 15 });
  }, [items, map]);
  return null;
}

export function DashboardProjectsMap({
  items,
}: {
  items: DashboardProjectItem[];
}) {
  const projects = useMemo(
    () =>
      items.filter(
        (item) =>
          (!item.type || item.type.toLowerCase() === "project") &&
          isCoordinate(item.latitude, 90) &&
          isCoordinate(item.longitude, 180),
      ),
    [items],
  );
  if (!projects.length)
    return (
      <div className="dashboard-map-empty">
        No hay proyectos con ubicación registrada.
      </div>
    );
  return (
    <div className="dashboard-project-map">
      <MapContainer
        center={[projects[0].latitude!, projects[0].longitude!]}
        zoom={13}
        scrollWheelZoom
      >
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Viewport items={projects} />
        {projects.map((item) => {
          const detailUrl =
            item.detailUrl ||
            `/projects?selected=${encodeURIComponent(item.projectExternalId)}`;
          const next = item.nextFollowUp;
          return (
            <Marker
              key={item.projectExternalId}
              position={[item.latitude!, item.longitude!]}
              icon={divIcon({
                className: "dashboard-marker-wrap",
                html: `<span class="dashboard-marker ${tone(item.statusName)}"></span>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              })}
            >
              <Popup className="dashboard-project-popup">
                <div className="dashboard-popup-title">
                  <strong>{item.name}</strong>
                  {item.statusName && <span>{item.statusName}</span>}
                </div>
                {item.customerName && (
                  <p>
                    <small>Cliente</small>
                    {item.customerName}
                  </p>
                )}
                {item.sellerName && (
                  <p>
                    <small>Responsable</small>
                    {item.sellerName}
                  </p>
                )}
                {next && (
                  <p>
                    <small>Próximo seguimiento</small>
                    {new Date(next.reminderAtUtc).toLocaleString("es-BO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {next.text && <em>{next.text}</em>}
                  </p>
                )}
                <Link to={detailUrl}>Ver detalle</Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
