import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import type { WorkdayLocation } from "../api/operationsApi";

interface MarkerItem extends WorkdayLocation {
  label?: string;
}

export function TrackingMap({
  points,
  route = false,
}: {
  points: MarkerItem[];
  route?: boolean;
}) {
  const valid = points.filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  if (!valid.length)
    return (
      <div className="operations-map-empty">
        No hay ubicaciones registradas.
      </div>
    );
  const positions = valid.map(
    (point) => [point.latitude, point.longitude] as [number, number],
  );
  return (
    <div className="operations-map">
      <MapContainer
        center={positions.at(-1)!}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && positions.length > 1 && <Polyline positions={positions} />}
        {valid.map((point, index) => (
          <Marker
            position={positions[index]}
            key={point.externalId ?? `${point.capturedAtUtc}-${index}`}
          >
            <Popup>
              <strong>
                {point.label ||
                  (index === valid.length - 1
                    ? "Última ubicación"
                    : "Punto de ruta")}
              </strong>
              <br />
              {new Date(point.capturedAtUtc).toLocaleString("es-BO")}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
