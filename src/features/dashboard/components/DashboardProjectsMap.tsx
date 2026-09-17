import { useEffect, useMemo } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type {
  DashboardProjectItem,
  DashboardSeller,
} from "../api/dashboardApi";
import { translateValue } from "@/lib/i18n/labels";
import { formatDateTime } from "@/lib/i18n/dateTime";

const isCoordinate = (value: number | null | undefined, limit: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit;

const normalizedName = (value?: string | null) =>
  value?.trim().toLocaleLowerCase("es") ?? "";

const initials = (name?: string | null) =>
  (name || "Sin asignar")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "") || "SA";

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

function ResponsiveMap() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize(false));
    observer.observe(container);
    map.invalidateSize(false);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function DashboardProjectsMap({
  items,
  sellers: sellerOptions = [],
}: {
  items: DashboardProjectItem[];
  sellers?: DashboardSeller[];
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
  const sellerIdByName = useMemo(
    () =>
      new Map(
        sellerOptions.map((seller) => [
          normalizedName(seller.displayName),
          seller.externalId,
        ]),
      ),
    [sellerOptions],
  );
  const sellerKey = (project: DashboardProjectItem) =>
    project.sellerExternalId ||
    sellerIdByName.get(normalizedName(project.sellerName)) ||
    (project.sellerName ? `name:${normalizedName(project.sellerName)}` : "unassigned");
  const colorBySeller = useMemo(() => {
    const orderedKeys = sellerOptions
      .map((seller) => seller.externalId)
      .filter(Boolean);
    projects.forEach((project) => {
      const key =
        project.sellerExternalId ||
        sellerIdByName.get(normalizedName(project.sellerName)) ||
        (project.sellerName
          ? `name:${normalizedName(project.sellerName)}`
          : "unassigned");
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    });
    return new Map(
      orderedKeys.map((key, index) => [key, key === "unassigned" ? 0 : (index % 12) + 1]),
    );
  }, [projects, sellerIdByName, sellerOptions]);
  const sellers = useMemo(() => {
    const grouped = new Map<
      string,
      { externalId: string | null; name: string; count: number }
    >();
    projects.forEach((project) => {
      const key =
        project.sellerExternalId ||
        sellerIdByName.get(normalizedName(project.sellerName)) ||
        (project.sellerName
          ? `name:${normalizedName(project.sellerName)}`
          : "unassigned");
      const current = grouped.get(key);
      if (current) current.count += 1;
      else
        grouped.set(key, {
          externalId: key === "unassigned" ? null : key,
          name: project.sellerName || "Sin asignar",
          count: 1,
        });
    });
    return [...grouped.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [projects, sellerIdByName]);
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
        <ResponsiveMap />
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
                html: `<span class="dashboard-marker seller-color-${colorBySeller.get(sellerKey(item)) ?? 0}"><b>${initials(item.sellerName)}</b></span>`,
                iconSize: [30, 36],
                iconAnchor: [15, 36],
              })}
            >
              <Popup className="dashboard-project-popup">
                <div className="dashboard-popup-title">
                  <strong>{item.name}</strong>
                  {item.statusName && <span>{translateValue(item.statusName)}</span>}
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
                    {formatDateTime(next.reminderAtUtc)}
                    {next.text && <em>{next.text}</em>}
                  </p>
                )}
                <Link to={detailUrl}>Ver detalle</Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <aside className="dashboard-map-legend" aria-label="Vendedores visibles">
        <strong>Vendedores</strong>
        <div>
          {sellers.map((seller) => (
            <span key={seller.externalId || "unassigned"}>
              <i className={`seller-color-${colorBySeller.get(seller.externalId || "unassigned") ?? 0}`} />
              <b>{seller.name}</b>
              <small>{seller.count}</small>
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
