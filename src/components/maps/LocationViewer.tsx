import { MapContainer, Marker, TileLayer } from 'react-leaflet'

export function LocationViewer({ latitude, longitude, label }: { latitude: number | null; longitude: number | null; label?: string | null }) {
  if (latitude == null || longitude == null) return <div className="location-empty">Este cliente todavía no tiene una ubicación registrada.</div>
  const position: [number, number] = [latitude, longitude]
  return <div className="location-viewer"><MapContainer center={position} zoom={16} scrollWheelZoom={false}><TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"/><Marker position={position}/></MapContainer><footer><span>{label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}</span><a href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noreferrer">Abrir en Google Maps</a></footer></div>
}
