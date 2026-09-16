import { useState } from "react";
import { divIcon, type LatLng } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const locationMarker = divIcon({
  className: "location-marker-wrap",
  html: '<span class="location-marker" aria-hidden="true"></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

function ClickHandler({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

export function LocationPicker({ latitude, longitude, onChange }: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const center: [number, number] = [latitude ?? -17.7833, longitude ?? -63.1821];
  const [locating, setLocating] = useState(false);

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
        <span>Haz clic en el mapa o arrastra el marcador para ajustar la ubicación.</span>
        <button type="button" onClick={current}>
          {locating ? "Localizando…" : "Usar mi ubicación"}
        </button>
      </div>
      <MapContainer key={`${center[0]}-${center[1]}`} center={center} zoom={15} scrollWheelZoom>
        <TileLayer
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
      <div className="coordinate-row">
        <span>Latitud: {latitude?.toFixed(6) ?? "—"}</span>
        <span>Longitud: {longitude?.toFixed(6) ?? "—"}</span>
      </div>
    </div>
  );
}
