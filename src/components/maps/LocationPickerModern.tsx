import "@/components/maps/leafletSetup";
import { useEffect, useState } from "react";
import { divIcon, type LatLng } from "leaflet";
import { Check, Move } from "lucide-react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapResizeHandler } from "./MapResizeHandler";

const locationMarker = divIcon({
  className: "location-marker-wrap",
  html: '<span class="location-marker" aria-hidden="true"></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

function ClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

/**
 * Keeps the map from capturing the page scroll: wheel zoom and panning stay off until
 * the user chooses to adjust the map. Clicking to place the marker always works.
 */
function MapInteraction({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    for (const handler of [map.scrollWheelZoom, map.dragging, map.touchZoom]) {
      if (active) handler.enable();
      else handler.disable();
    }
  }, [active, map]);
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const center: [number, number] = [
    latitude ?? -17.7833,
    longitude ?? -63.1821,
  ];
  const [locating, setLocating] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  function current() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true },
    );
  }

  return (
    <div className="location-picker">
      <div className="location-actions">
        <span>
          {adjusting
            ? "Mueve y acerca el mapa; haz clic para marcar la ubicación."
            : "Haz clic en el mapa o arrastra el marcador. Para moverlo o acercarlo, usa «Ajustar mapa»."}
        </span>
        <button type="button" onClick={current}>
          {locating ? "Localizando…" : "Usar mi ubicación"}
        </button>
      </div>
      <div className={`location-map${adjusting ? " adjusting" : ""}`}>
        <button
          type="button"
          className="location-map-toggle"
          aria-pressed={adjusting}
          onClick={() => setAdjusting((value) => !value)}
        >
          {adjusting ? <Check aria-hidden="true" /> : <Move aria-hidden="true" />}
          {adjusting ? "Listo" : "Ajustar mapa"}
        </button>
        <MapContainer
          key={`${center[0]}-${center[1]}`}
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          dragging={adjusting}
          touchZoom={adjusting}
        >
          <TileLayer
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapResizeHandler />
          <MapInteraction active={adjusting} />
          <ClickHandler onPick={onChange} />
          {latitude != null && longitude != null && (
            <Marker
              icon={locationMarker}
              draggable
              position={[latitude, longitude]}
              eventHandlers={{
                dragend: (event) => {
                  const point = event.target.getLatLng() as LatLng;
                  onChange(point.lat, point.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="coordinate-row">
        <span>Latitud: {latitude?.toFixed(6) ?? "—"}</span>
        <span>Longitud: {longitude?.toFixed(6) ?? "—"}</span>
      </div>
    </div>
  );
}
