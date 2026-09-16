import { MapContainer, Marker, TileLayer } from 'react-leaflet'

export function LocationViewer({ latitude, longitude, label, emptyText = 'Este cliente todavía no tiene una ubicación registrada.' }: { latitude: number | null; longitude: number | null; label?: string | null; emptyText?: string }) {
  if (latitude == null || longitude == null) return <div className="location-empty">{emptyText}</div>
  const position: [number, number] = [latitude, longitude]
  return <div className="location-viewer"><MapContainer center={position} zoom={16} scrollWheelZoom={false}><TileLayer maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={position}/></MapContainer><footer><span>{label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}</span><a href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noreferrer">Abrir en Google Maps</a></footer></div>
}
