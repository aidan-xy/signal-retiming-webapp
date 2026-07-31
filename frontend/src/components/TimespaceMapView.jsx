import { useEffect, useMemo, useRef } from 'react'
import { computeValueRange, valueToHeatBucket } from '../utils/heatScale'
import { MEASUREMENTS, getMeasurement } from '../utils/timespaceMeasurements'
import HeatLegend from './HeatLegend'
import './TimespaceMapView.css'

const DAY_TYPES = [
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
]

// day/time/measurement/on are shared with the map view's timespace overlay
// (lifted to App.jsx) so switching pages doesn't reset or diverge them.
export default function TimespaceMapView({
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
}) {
  const scrollRef = useRef(null)

  const sortedIntersections = useMemo(() => {
    if (!grid) return []
    return [...grid.intersections].sort((a, b) => a.natural_order - b.natural_order)
  }, [grid])

  const measurement = getMeasurement(measurementKey)

  // One value->color scale for the whole grid (every intersection, every
  // slot) for the selected measurement -- shared with the map overlay via
  // the same utility, so a given value reads as the same color everywhere.
  const valueRange = useMemo(() => computeValueRange(grid, measurement), [grid, measurement])

  const timeColumns = sortedIntersections[0]?.slots ?? []

  // Bring the column matching the shared slotIndex into view -- relevant
  // when arriving from the map view's slider rather than clicking here.
  useEffect(() => {
    if (!timespaceOn) return
    const el = scrollRef.current?.querySelector(`[data-slot-index="${slotIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [slotIndex, grid, timespaceOn])

  // Selecting a time from the table implies wanting it highlighted/active,
  // same as the map's slider -- so this also turns the shared overlay on,
  // rather than silently moving the (invisible, while off) selection.
  function selectSlot(slotIdx) {
    onSlotIndexChange(slotIdx)
    onTimespaceOnChange(true)
  }

  function handleSlotKeyDown(e, slotIdx) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectSlot(slotIdx)
    }
  }

  return (
    <div className="timespace-page">
      <div className="timespace-page__controls">
        <div className="timespace-page__toggle" role="tablist" aria-label="Day type">
          {DAY_TYPES.map((dt) => (
            <button
              key={dt.key}
              type="button"
              role="tab"
              aria-selected={dayType === dt.key}
              className={`timespace-page__toggle-btn ${dayType === dt.key ? 'is-active' : ''}`}
              onClick={() => onDayTypeChange(dt.key)}
            >
              {dt.label}
            </button>
          ))}
        </div>

        <label className="timespace-page__measurement">
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

        {grid && <HeatLegend range={valueRange} />}

        <p className="timespace-page__hint">
          Each cell shows the active plan number and{' '}
          {measurement.label.toLowerCase()} (in seconds). Shading is a
          heatmap of that value across the whole corridor and day — darker
          means higher, per the scale above. Click a time (column header or
          cell) to select it — the same selection used by the Map view's
          Time-Space Data overlay.
        </p>
      </div>

      {gridStatus === 'loading' && !grid && (
        <div className="timespace-page__status">Loading timespace data…</div>
      )}
      {gridStatus === 'error' && (
        <div className="timespace-page__status timespace-page__status--error">
          Couldn't load timespace data.
        </div>
      )}

      {grid && (
        <div className="timespace-grid-scroll" ref={scrollRef}>
          <table className="timespace-grid">
            <thead>
              <tr>
                <th className="timespace-grid__corner">
                  <span>Intersection</span>
                </th>
                {timeColumns.map((slot) => (
                  <th
                    key={slot.slot_index}
                    data-slot-index={slot.slot_index}
                    role="button"
                    tabIndex={0}
                    aria-pressed={timespaceOn && slot.slot_index === slotIndex}
                    onClick={() => selectSlot(slot.slot_index)}
                    onKeyDown={(e) => handleSlotKeyDown(e, slot.slot_index)}
                    className={`timespace-grid__time-head ${
                      slot.slot_index % 4 === 0 ? 'is-hour' : ''
                    } ${timespaceOn && slot.slot_index === slotIndex ? 'is-selected-slot' : ''}`}
                  >
                    <span>{slot.slot_time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedIntersections.map((inter) => (
                <tr key={inter.intersection_id}>
                  <th className="timespace-grid__row-head" scope="row">
                    <span className="timespace-grid__row-order">{inter.natural_order}</span>
                    <span className="timespace-grid__row-name">{inter.name}</span>
                  </th>
                  {inter.slots.map((slot) => {
                    const value = measurement.getValue(slot)
                    const heatBucket = valueToHeatBucket(value, valueRange)
                    return (
                      <td
                        key={slot.slot_index}
                        data-slot-index={slot.slot_index}
                        role="button"
                        tabIndex={0}
                        aria-pressed={timespaceOn && slot.slot_index === slotIndex}
                        onClick={() => selectSlot(slot.slot_index)}
                        onKeyDown={(e) => handleSlotKeyDown(e, slot.slot_index)}
                        className={`timespace-grid__cell heat-${heatBucket} ${
                          slot.slot_index % 4 === 0 ? 'is-hour' : ''
                        } ${timespaceOn && slot.slot_index === slotIndex ? 'is-selected-slot' : ''}`}
                        title={`Plan ${slot.plan_number} · ${slot.slot_time} · click to select`}
                      >
                        <span className="timespace-grid__cell-plan">P{slot.plan_number}</span>
                        <span className="timespace-grid__cell-value">{value ?? '—'}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
