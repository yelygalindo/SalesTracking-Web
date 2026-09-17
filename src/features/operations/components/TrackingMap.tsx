import { useEffect } from "react";
import { divIcon, latLngBounds } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { formatDateTime } from "@/lib/i18n/dateTime";
import type { WorkdayLocation } from "../api/operationsApi";

interface MarkerItem extends WorkdayLocation {
  label?: string;
}
export interface VisitedProjectMarker {
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  visitedAtUtc: string;
}

function RouteViewport({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) map.setView(positions[0], 15);
    else if (positions.length > 1)
      map.fitBounds(latLngBounds(positions), {
        padding: [28, 28],
        maxZoom: 16,
      });
  }, [map, positions]);
  return null;
}

export function TrackingMap({
  points,
  route = false,
  visitedProjects = [],
}: {
  points: MarkerItem[];
  route?: boolean;
  visitedProjects?: VisitedProjectMarker[];
}) {
  const valid = points.filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const validProjects = visitedProjects.filter(
    (project) =>
      Number.isFinite(project.latitude) && Number.isFinite(project.longitude),
  );
  if (!valid.length)
    return <div className="operations-map-empty">No hay ubicaciones registradas.</div>;

  const positions = valid.map(
    (point) => [point.latitude, point.longitude] as [number, number],
  );
  const projectPositions = validProjects.map(
    (project) => [project.latitude, project.longitude] as [number, number],
  );
  const boundsPositions = [...positions, ...projectPositions];
  const routeMarkers = route
    ? valid.length === 1
      ? [{ point: valid[0], index: 0, label: "Inicio y fin" }]
      : [
          { point: valid[0], index: 0, label: "Inicio" },
          { point: valid.at(-1)!, index: valid.length - 1, label: "Fin" },
        ]
    : valid.map((point, index) => ({
        point,
        index,
        label: point.label || "Última ubicación",
      }));

  return (
    <div className="operations-map">
      <MapContainer center={positions.at(-1)!} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && <RouteViewport positions={boundsPositions} />}
        {route && positions.length > 1 && <Polyline positions={positions} />}
        {routeMarkers.map(({ point, index, label }) => (
          <Marker
            position={positions[index]}
            key={point.externalId ?? `${point.capturedAtUtc}-${index}`}
          >
            <Popup><strong>{label}</strong><br />{formatDateTime(point.capturedAtUtc)}</Popup>
          </Marker>
        ))}
        {validProjects.map((project, index) => (
          <Marker
            key={`${project.externalId}-${index}`}
            position={projectPositions[index]}
            icon={divIcon({
              className: "workday-project-marker-wrap",
              html: '<span class="workday-project-marker">O</span>',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Popup><strong>Obra visitada</strong><br />{project.name}<br />{formatDateTime(project.visitedAtUtc)}</Popup>
          </Marker>
        ))}
      </MapContainer>
      {route && (
        <div className="workday-map-legend">
          <span><i className="route-point" /> Inicio/fin</span>
          <span><i className="project-point" /> Obra visitada</span>
        </div>
      )}
    </div>
  );
}
