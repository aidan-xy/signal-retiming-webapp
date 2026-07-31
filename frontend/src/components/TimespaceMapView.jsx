import { useEffect, useMemo, useState } from 'react'
import './TimespaceMapView.css'

// Every measurement the backend's /corridors/{id}/timespace endpoint can
// surface per slot: the plan's own cycle length/offset, plus its Major and
// Minor approach breakdown (vehicle green "Split", pedestrian WALK, flashing
// DON'T WALK, and combined yellow+all-red clearance). Mirrors the workbook
// Time_SpaceMap tab's own Measurement dropdown, minus Proposed (out of scope
// for this schema -- see schema.sql).
const MEASUREMENTS = [
  { key: 'cycle_length_s', label: 'Cycle Length', getValue: (slot) => slot.cycle_length_s },
  { key: 'offset_s', label: 'Offset', getValue: (slot) => slot.offset_s },
  { key: 'major_split_s', label: 'Major — Split', getValue: (slot) => movementValue(slot, 'Major', 'split_s') },
  { key: 'major_wk_s', label: 'Major — Walk', getValue: (slot) => movementValue(slot, 'Major', 'wk_s') },
  { key: 'major_fldw_s', label: 'Major — Flashing DW', getValue: (slot) => movementValue(slot, 'Major', 'fldw_s') },
  { key: 'major_yar_s', label: 'Major — Yellow+AR', getValue: (slot) => movementValue(slot, 'Major', 'yellow_allred_s') },
  { key: 'minor_split_s', label: 'Minor — Split', getValue: (slot) => movementValue(slot, 'Minor', 'split_s') },
  { key: 'minor_wk_s', label: 'Minor — Walk', getValue: (slot) => movementValue(slot, 'Minor', 'wk_s') },
  { key: 'minor_fldw_s', label: 'Minor — Flashing DW', getValue: (slot) => movementValue(slot, 'Minor', 'fldw_s') },
  { key: 'minor_yar_s', label: 'Minor — Yellow+AR', getValue: (slot) => movementValue(slot, 'Minor', 'yellow_allred_s') },
]

const DAY_TYPES = [
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
]

const PLAN_COLOR_COUNT = 8

function movementValue(slot, movementClass, field) {
  const movement = slot.movements.find((m) => m.movement_class === movementClass)
  return movement ? movement[field] : null
}

export default function TimespaceMapView({ dataSource }) {
  const [dayType, setDayType] = useState('weekday')
  const [measurementKey, setMeasurementKey] = useState('offset_s')
  const [grid, setGrid] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    dataSource
      .getTimespace(dayType)
      .then((data) => {
        if (cancelled) return
        setGrid(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [dataSource, dayType])

  const sortedIntersections = useMemo(() => {
    if (!grid) return []
    return [...grid.intersections].sort((a, b) => a.natural_order - b.natural_order)
  }, [grid])

  // Plan numbers aren't comparable across intersections (plan 4 at one
  // intersection has nothing to do with plan 4 at another), so each row gets
  // its own color assignment, in order of first appearance across the day.
  // A color change along a row is what marks a real time-of-day boundary.
  const planColorByIntersection = useMemo(() => {
    const result = new Map()
    for (const inter of sortedIntersections) {
      const seen = new Map()
      for (const slot of inter.slots) {
        if (!seen.has(slot.plan_number)) {
          seen.set(slot.plan_number, seen.size % PLAN_COLOR_COUNT)
        }
      }
      result.set(inter.intersection_id, seen)
    }
    return result
  }, [sortedIntersections])

  const measurement = MEASUREMENTS.find((m) => m.key === measurementKey)
  const timeColumns = sortedIntersections[0]?.slots ?? []

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
              onClick={() => setDayType(dt.key)}
            >
              {dt.label}
            </button>
          ))}
        </div>

        <label className="timespace-page__measurement">
          <span>Measurement</span>
          <select value={measurementKey} onChange={(e) => setMeasurementKey(e.target.value)}>
            {MEASUREMENTS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <p className="timespace-page__hint">
          Each cell shows the active plan number and{' '}
          {measurement.label.toLowerCase()} (in seconds). Shading marks the
          active plan per intersection — a color change along a row is a
          time-of-day plan boundary.
        </p>
      </div>

      {status === 'loading' && (
        <div className="timespace-page__status">Loading timespace data…</div>
      )}
      {status === 'error' && (
        <div className="timespace-page__status timespace-page__status--error">
          Couldn't load timespace data.
        </div>
      )}

      {status === 'ready' && grid && (
        <div className="timespace-grid-scroll">
          <table className="timespace-grid">
            <thead>
              <tr>
                <th className="timespace-grid__corner">
                  <span>Intersection</span>
                </th>
                {timeColumns.map((slot) => (
                  <th
                    key={slot.slot_index}
                    className={`timespace-grid__time-head ${
                      slot.slot_index % 4 === 0 ? 'is-hour' : ''
                    }`}
                  >
                    <span>{slot.slot_time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedIntersections.map((inter) => {
                const colorMap = planColorByIntersection.get(inter.intersection_id)
                return (
                  <tr key={inter.intersection_id}>
                    <th className="timespace-grid__row-head" scope="row">
                      <span className="timespace-grid__row-order">{inter.natural_order}</span>
                      <span className="timespace-grid__row-name">{inter.name}</span>
                    </th>
                    {inter.slots.map((slot) => {
                      const value = measurement.getValue(slot)
                      const colorIndex = colorMap?.get(slot.plan_number) ?? 0
                      return (
                        <td
                          key={slot.slot_index}
                          className={`timespace-grid__cell plan-color-${colorIndex} ${
                            slot.slot_index % 4 === 0 ? 'is-hour' : ''
                          }`}
                          title={`Plan ${slot.plan_number} · ${slot.slot_time}`}
                        >
                          <span className="timespace-grid__cell-plan">P{slot.plan_number}</span>
                          <span className="timespace-grid__cell-value">{value ?? '—'}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
