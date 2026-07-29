import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

function markerIcon(number, isSelected) {
  return L.divIcon({
    className: '',
    html: `<div class="corridor-marker ${isSelected ? 'is-selected' : ''}">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function FitToRoute({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length])
  return null
}

export default function MapView({ intersections, selectedId, onSelect }) {
  const mapRef = useRef(null)

  const positions = useMemo(
    () => intersections.map((i) => [i.lat, i.lon]),
    [intersections]
  )

  return (
    <div className="map-view">
      <MapContainer
        ref={mapRef}
        center={positions[0] || [40.65, -73.95]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        className="map-view__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitToRoute positions={positions} />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: 'var(--route)', weight: 3, opacity: 0.55 }}
          />
        )}
        {intersections.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lon]}
            icon={markerIcon(item.natural_order, item.id === selectedId)}
            eventHandlers={{ click: () => onSelect(item.id) }}
          />
        ))}
      </MapContainer>

      <div className="map-view__legend">
        <span className="map-view__legend-swatch" />
        Linden Blvd corridor — {intersections.length} intersections
      </div>
    </div>
  )
}
