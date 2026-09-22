import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import { Clock3, ChevronLeft, ChevronRight } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MEASUREMENTS, getMeasurement } from '../utils/timespaceMeasurements'
import { computeValueRange, valueToHeatBucket } from '../utils/heatScale'
import HeatLegend from './HeatLegend'
import hdrLogo from '../assets/HDR_logo.svg'
import './MapView.css'

// Esri World Imagery's documented service maximum is zoom 19 -- CARTO's
// light basemap supports at least that too, so 19 is used as a shared
// ceiling rather than picking a per-layer max that would make the zoom
// range jump when switching layers.
const MAX_ZOOM = 19

const BASE_LAYERS = {
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
  street: {
    label: 'Street',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

const DAY_TYPES = [
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
]

const SLOTS_PER_DAY = (24 * 60) / 15 // 96

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

// day/time/measurement are shared with the timespace table page (lifted to
// App.jsx) so switching pages shows the same data instead of resetting it,
// and fetching happens once in App.jsx rather than per-page. baseLayer and
// the overlay on/off toggle stay local -- they're purely this page's own
// display choices, not something the table page has an analog for.
export default function MapView({
  corridor,
  intersections,
  selectedId,
  onSelect,
  dayType,
  onDayTypeChange,
  slotIndex,
  onSlotIndexChange,
  measurementKey,
  onMeasurementKeyChange,
  timespaceOn,
  onTimespaceOnChange,
  grid,
  gridStatus,
  scenario,
}) {
  const mapRef = useRef(null)
  const [baseLayer, setBaseLayer] = useState('satellite')

  const slotsByIntersectionId = useMemo(() => {
    if (!grid) return new Map()
    return new Map(grid.intersections.map((inter) => [inter.intersection_id, inter]))
  }, [grid])

  const measurement = getMeasurement(measurementKey)

  // One value->color scale for the whole grid (every intersection, every
  // slot) for the selected measurement -- shared with the table page via
  // the same utility, so a given value reads as the same color everywhere.
  const valueRange = useMemo(() => computeValueRange(grid, measurement), [grid, measurement])

  const currentSlotAnyMatchesExisting = useMemo(
    () =>
      Boolean(
        grid &&
          !grid.unavailable &&
          grid.intersections.some((inter) => inter.slots[slotIndex]?.matchesExisting)
      ),
    [grid, slotIndex]
  )

  const currentSlotTime = grid?.intersections[0]?.slots[slotIndex]?.slot_time ?? '--:--'

  function stepSlot(delta) {
    onSlotIndexChange(Math.min(SLOTS_PER_DAY - 1, Math.max(0, slotIndex + delta)))
  }

  const positions = useMemo(
    () => intersections.map((i) => [i.lat, i.lon]),
    [intersections]
  )

  // Initial center: first marker, else the corridor's own center from the
  // API, else a neutral NYC fallback. FitToRoute overrides this once markers
  // are known.
  const initialCenter =
    positions[0] ||
    (corridor?.lat != null && corridor?.lon != null
      ? [corridor.lat, corridor.lon]
      : [40.65, -73.95])

  return (
    <div className="map-view">
      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={13}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="map-view__container"
      >
        <TileLayer
          // key forces a clean remount on switch rather than relying on
          // react-leaflet to diff/update the url of a live tile layer
          key={baseLayer}
          attribution={BASE_LAYERS[baseLayer].attribution}
          url={BASE_LAYERS[baseLayer].url}
          maxZoom={MAX_ZOOM}
        />
        <FitToRoute positions={positions} />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: 'var(--route)', weight: 3, opacity: 0.55 }}
          />
        )}
        {intersections.map((item) => {
          const slot = slotsByIntersectionId.get(item.id)?.slots[slotIndex]
          const value = slot ? measurement.getValue(slot) : null
          const isSameAsExisting = Boolean(slot?.matchesExisting)
          const heatBucket = valueToHeatBucket(value, valueRange)
          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lon]}
              icon={markerIcon(item.natural_order, item.id === selectedId)}
              eventHandlers={{ click: () => onSelect(item.id) }}
            >
              {timespaceOn && gridStatus === 'ready' && slot && (
                <Tooltip
                  // react-leaflet's Tooltip only applies `className` at
                  // creation -- it does not update it on prop changes.
                  // Keying on the value itself (which determines the heat
                  // bucket/color) forces a clean remount whenever the color
                  // actually needs to change; without this every tooltip
                  // gets stuck showing whichever color it rendered first.
                  key={`${item.id}-${dayType}-${measurementKey}-${scenario}-${value}-${isSameAsExisting}`}
                  permanent
                  direction="top"
                  offset={[0, -18]}
                  className={`timespace-marker-tooltip heat-${heatBucket} ${
                    isSameAsExisting ? 'is-same-as-existing' : ''
                  }`}
                  title={isSameAsExisting ? 'Matches existing' : undefined}
                >
                  <span className="timespace-marker-tooltip__plan">P{slot.plan_number}</span>
                  <span className="timespace-marker-tooltip__value">{value ?? '—'}</span>
                </Tooltip>
              )}
            </Marker>
          )
        })}
      </MapContainer>

      <div className="map-view__layer-toggle" role="group" aria-label="Base map layer">
        {Object.entries(BASE_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            type="button"
            className={`map-view__layer-btn ${baseLayer === key ? 'is-active' : ''}`}
            onClick={() => setBaseLayer(key)}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <div className="map-view__timespace">
        <button
          type="button"
          className={`map-view__timespace-toggle ${timespaceOn ? 'is-active' : ''}`}
          onClick={() => onTimespaceOnChange(!timespaceOn)}
          aria-pressed={timespaceOn}
        >
          <Clock3 size={14} strokeWidth={2} />
          Time-Space Data
        </button>

        {timespaceOn && (
          <div className="map-view__timespace-panel">
            <div className="map-view__timespace-daytype" role="tablist" aria-label="Day type">
              {DAY_TYPES.map((dt) => (
                <button
                  key={dt.key}
                  type="button"
                  role="tab"
                  aria-selected={dayType === dt.key}
                  className={`map-view__timespace-daytype-btn ${
                    dayType === dt.key ? 'is-active' : ''
                  }`}
                  onClick={() => onDayTypeChange(dt.key)}
                >
                  {dt.label}
                </button>
              ))}
            </div>

            <label className="map-view__timespace-measurement">
              <span>Measurement</span>
              <select
                value={measurementKey}
                onChange={(e) => onMeasurementKeyChange(e.target.value)}
              >
                {MEASUREMENTS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {grid && !grid.unavailable && <HeatLegend range={valueRange} />}

            {grid?.unavailable && (
              <p className="map-view__timespace-status map-view__timespace-status--unavailable">
                Proposed time-space data isn't available for this corridor.
              </p>
            )}

            {!grid?.unavailable && currentSlotAnyMatchesExisting && (
              <p className="map-view__timespace-status map-view__timespace-status--same">
                Markers with a dashed ring show proposed data that matches
                Existing exactly.
              </p>
            )}

            {gridStatus === 'loading' && !grid && (
              <div className="map-view__timespace-status">Loading…</div>
            )}
            {gridStatus === 'error' && (
              <div className="map-view__timespace-status map-view__timespace-status--error">
                Couldn't load timespace data.
              </div>
            )}

            {grid && (
              <>
                <div className="map-view__timespace-slider-row">
                  <button
                    type="button"
                    className="map-view__timespace-step"
                    onClick={() => stepSlot(-1)}
                    disabled={slotIndex === 0}
                    aria-label="15 minutes earlier"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={SLOTS_PER_DAY - 1}
                    step={1}
                    value={slotIndex}
                    onChange={(e) => onSlotIndexChange(Number(e.target.value))}
                    className="map-view__timespace-slider"
                    aria-label="Time of day"
                  />

                  <button
                    type="button"
                    className="map-view__timespace-step"
                    onClick={() => stepSlot(1)}
                    disabled={slotIndex === SLOTS_PER_DAY - 1}
                    aria-label="15 minutes later"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="map-view__timespace-time-display">{currentSlotTime}</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="map-view__legend">
        <span className="map-view__legend-swatch" />
        {corridor?.name ?? 'Corridor'} — {intersections.length} intersections
      </div>

      <img src={hdrLogo} alt="HDR" className="map-view__hdr-logo" />
    </div>
  )
}
