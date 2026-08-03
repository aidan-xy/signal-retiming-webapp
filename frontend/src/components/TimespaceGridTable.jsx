import { forwardRef, useMemo } from 'react'
import { valueToHeatBucket } from '../utils/heatScale'
import './TimespaceGridTable.css'

/**
 * Renders one scenario's timespace grid as a scrollable table: intersection
 * rows x 15-minute-slot columns. Pulled out of TimespaceMapView so the
 * Comparison view (two grids side by side) can render the exact same table
 * -- same cell logic, same "IP"/"same as existing" treatment -- without the
 * two views drifting apart.
 *
 * The scroll container ref is forwarded so callers can drive scroll-into-
 * view (single view) or synchronized scrolling (comparison view).
 */
const TimespaceGridTable = forwardRef(function TimespaceGridTable(
  { grid, measurement, valueRange, slotIndex, timespaceOn, onSelectSlot, onScroll, className },
  scrollRef
) {
  const sortedIntersections = useMemo(() => {
    if (!grid) return []
    return [...grid.intersections].sort((a, b) => a.natural_order - b.natural_order)
  }, [grid])

  const timeColumns = sortedIntersections[0]?.slots ?? []

  function handleSlotKeyDown(e, slotIdx) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectSlot(slotIdx)
    }
  }

  if (!grid) return null

  return (
    <div
      className={`timespace-grid-scroll ${className || ''}`}
      ref={scrollRef}
      onScroll={onScroll}
    >
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
                onClick={() => onSelectSlot(slot.slot_index)}
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
                const isPlaceholder = Boolean(grid.placeholder)
                const isSameAsExisting = !isPlaceholder && Boolean(slot.matchesExisting)
                const heatBucket = isPlaceholder ? 'ip' : valueToHeatBucket(value, valueRange)
                return (
                  <td
                    key={slot.slot_index}
                    data-slot-index={slot.slot_index}
                    role="button"
                    tabIndex={0}
                    aria-pressed={timespaceOn && slot.slot_index === slotIndex}
                    onClick={() => onSelectSlot(slot.slot_index)}
                    onKeyDown={(e) => handleSlotKeyDown(e, slot.slot_index)}
                    className={`timespace-grid__cell heat-${heatBucket} ${
                      slot.slot_index % 4 === 0 ? 'is-hour' : ''
                    } ${timespaceOn && slot.slot_index === slotIndex ? 'is-selected-slot' : ''} ${
                      isSameAsExisting ? 'is-same-as-existing' : ''
                    }`}
                    title={
                      isPlaceholder
                        ? `Plan ${slot.plan_number} · ${slot.slot_time} · no proposed data imported (IP) · click to select`
                        : isSameAsExisting
                        ? `Plan ${slot.plan_number} · ${slot.slot_time} · matches existing, not yet retimed · click to select`
                        : `Plan ${slot.plan_number} · ${slot.slot_time} · click to select`
                    }
                  >
                    <span className="timespace-grid__cell-plan">P{slot.plan_number}</span>
                    <span className="timespace-grid__cell-value">
                      {isPlaceholder ? 'IP' : value ?? '—'}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default TimespaceGridTable
