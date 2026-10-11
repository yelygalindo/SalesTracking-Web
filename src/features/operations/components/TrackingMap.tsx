import { useEffect } from "react";
import { divIcon, latLngBounds } from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { formatDateTime } from "@/lib/i18n/dateTime";
import { MapResizeHandler } from "@/components/maps/MapResizeHandler";
import type {
  WorkdayLocation,
  WorkdayRouteSegment,
} from "../api/operationsApi";

const routeColors = ["#1d4ed8", "#0284c7", "#4338ca", "#0369a1"];

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
  segments = [],
  mapMatched = true,
  visitedProjects = [],
}: {
  points: MarkerItem[];
  route?: boolean;
  segments?: WorkdayRouteSegment[];
  mapMatched?: boolean;
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
  const validSegments = segments.filter(
    (segment) =>
      segment.type === "LineString" &&
      Array.isArray(segment.coordinates) &&
      segment.coordinates.length > 1 &&
      segment.coordinates.every(
        ([longitude, latitude]) =>
          Number.isFinite(longitude) && Number.isFinite(latitude),
      ),
  );
  const segmentPositions = validSegments.flatMap((segment) =>
    segment.coordinates.map(
      ([longitude, latitude]) => [latitude, longitude] as [number, number],
    ),
  );
  if (!valid.length && !validSegments.length && !validProjects.length)
    return (
      <div className="operations-map-empty">
        No hay ubicaciones registradas.
      </div>
    );

  const positions = valid.map(
    (point) => [point.latitude, point.longitude] as [number, number],
  );
  const projectPositions = validProjects.map(
    (project) => [project.latitude, project.longitude] as [number, number],
  );
  const boundsPositions = [
    ...segmentPositions,
    ...positions,
    ...projectPositions,
  ];
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

  const center = boundsPositions.at(-1)!;

  return (
    <div className="operations-map">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeHandler />
        {route && <RouteViewport positions={boundsPositions} />}
        {route &&
          validSegments.map((segment, index) => (
            <GeoJSON
              key={`route-segment-${index}`}
              data={segment}
              style={{
                color: routeColors[index % routeColors.length],
                weight: 6,
                opacity: 0.95,
                dashArray: mapMatched ? undefined : "10 7",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          ))}
        {routeMarkers.map(({ point, index, label }) => (
          <Marker
            position={positions[index]}
            key={point.externalId ?? `${point.capturedAtUtc}-${index}`}
          >
            <Popup>
              <strong>{label}</strong>
              <br />
              {formatDateTime(point.capturedAtUtc)}
            </Popup>
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
            <Popup>
              <strong>Obra visitada</strong>
              <br />
              {project.name}
              <br />
              {formatDateTime(project.visitedAtUtc)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {route && (
        <div className="workday-map-legend">
          <span>
            <i className="route-point" /> Inicio/fin
          </span>
          <span>
            <i className="project-point" /> Obra visitada
          </span>
        </div>
      )}
    </div>
  );
}
