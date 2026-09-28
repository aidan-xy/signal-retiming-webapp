import { useEffect, useMemo, useRef } from 'react'
import { computeValueRange } from '../utils/heatScale'
import { MEASUREMENTS, getMeasurement } from '../utils/timespaceMeasurements'
import HeatLegend from './HeatLegend'
import TimespaceGridTable from './TimespaceGridTable'
import './TimespacePageControls.css'
import './TimespaceComparisonView.css'

const DAY_TYPES = [
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
]

function centerColumn(container, slotIdx) {
  if (!container) return
  const el = container.querySelector(`[data-slot-index="${slotIdx}"]`)
  if (!el) return
  const target = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
  container.scrollLeft = Math.max(0, target)
}

/**
 * Existing and Proposed shown side by side, one row/column set each,
 * scrolled and selected together -- so the same intersection at the same
 * time of day sits in the same place in both panels.
 *
 * Deliberately not the same component as the single-scenario page
 * (TimespaceMapView): that one's day-type/measurement controls apply to
 * whichever single scenario the header toggle has selected, while this
 * page always shows both regardless of the header's Existing/Proposed
 * toggle, and needs its own synced-scroll wiring the single view has no
 * use for.
 */
export default function TimespaceComparisonView({
  dayType,
  onDayTypeChange,
  slotIndex,
  onSlotIndexChange,
  measurementKey,
  onMeasurementKeyChange,
  timespaceOn,
  onTimespaceOnChange,
  existingGrid,
  existingGridStatus,
  proposedGrid,
  proposedGridStatus,
}) {
  const existingScrollRef = useRef(null)
  const proposedScrollRef = useRef(null)
  const isSyncingScroll = useRef(false)

  const measurement = getMeasurement(measurementKey)

  // One shared value->color scale across BOTH grids -- the whole point of a
  // side-by-side comparison breaks if the same number reads as a different
  // color on each side, so this deliberately isn't per-panel like the
  // single-scenario page.
  const valueRange = useMemo(() => {
    const existingRange = computeValueRange(existingGrid, measurement)
    const proposedRange = computeValueRange(proposedGrid, measurement)
    const min = Math.min(existingRange.min, proposedRange.min)
    const max = Math.max(existingRange.max, proposedRange.max)
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : { min: 0, max: 0 }
  }, [existingGrid, proposedGrid, measurement])

  // Bring both panels to the same column whenever the shared slotIndex
  // changes -- from either panel's own click, or arriving from the Map
  // view's slider / the single Time-Space table.
  useEffect(() => {
    if (!timespaceOn) return
    centerColumn(existingScrollRef.current, slotIndex)
    centerColumn(proposedScrollRef.current, slotIndex)
  }, [slotIndex, existingGrid, proposedGrid, timespaceOn])

  function selectSlot(slotIdx) {
    onSlotIndexChange(slotIdx)
    onTimespaceOnChange(true)
  }

  // Mirrors one panel's scroll position onto the other, in both directions,
  // so dragging either panel keeps the same rows/columns lined up in both.
  // The isSyncingScroll guard exists because setting scrollLeft/scrollTop
  // programmatically fires its own scroll event -- without it, the two
  // handlers would call each other back and forth.
  function syncFrom(sourceRef, targetRef) {
    return () => {
      if (isSyncingScroll.current) return
      isSyncingScroll.current = true
      if (sourceRef.current && targetRef.current) {
        targetRef.current.scrollLeft = sourceRef.current.scrollLeft
        targetRef.current.scrollTop = sourceRef.current.scrollTop
      }
      isSyncingScroll.current = false
    }
  }

  const handleExistingScroll = syncFrom(existingScrollRef, proposedScrollRef)
  const handleProposedScroll = syncFrom(proposedScrollRef, existingScrollRef)

  const bothReady = existingGridStatus === 'ready' && proposedGridStatus === 'ready'
  const eitherError = existingGridStatus === 'error' || proposedGridStatus === 'error'
  const eitherLoading =
    (existingGridStatus === 'loading' && !existingGrid) ||
    (proposedGridStatus === 'loading' && !proposedGrid)

  return (
    <div className="timespace-compare">
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
          <select value={measurementKey} onChange={(e) => onMeasurementKeyChange(e.target.value)}>
            {MEASUREMENTS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {bothReady && <HeatLegend range={valueRange} />}

        <p className="timespace-page__hint">
          Existing and Proposed, same rows and columns, scrolled and
          selected together. Dashed cells on either side show real data that
          matches the other scenario exactly.
        </p>
      </div>

      {eitherLoading && (
        <div className="timespace-page__status">Loading timespace data…</div>
      )}
      {eitherError && (
        <div className="timespace-page__status timespace-page__status--error">
          Couldn't load timespace data for one or both scenarios.
        </div>
      )}

      {bothReady && existingGrid && proposedGrid && (
        <div className="timespace-compare__grids">
          <div className="timespace-compare__panel">
            <div className="timespace-compare__panel-header">
              <span className="timespace-compare__panel-label">Existing — As-Built</span>
            </div>
            <TimespaceGridTable
              ref={existingScrollRef}
              grid={existingGrid}
              measurement={measurement}
              valueRange={valueRange}
              slotIndex={slotIndex}
              timespaceOn={timespaceOn}
              onSelectSlot={selectSlot}
              onScroll={handleExistingScroll}
            />
          </div>

          <div className="timespace-compare__panel">
            <div
              className={`timespace-compare__panel-header ${
                proposedGrid.unavailable ? 'is-unavailable' : ''
              }`}
            >
              <span className="timespace-compare__panel-label">Proposed — Retiming</span>
              {proposedGrid.unavailable && (
                <span className="timespace-compare__panel-badge">not available</span>
              )}
            </div>
            {proposedGrid.unavailable ? (
              <div className="timespace-compare__panel-status">
                Proposed time-space data isn't available for this corridor.
              </div>
            ) : (
              <TimespaceGridTable
                ref={proposedScrollRef}
                grid={proposedGrid}
                measurement={measurement}
                valueRange={valueRange}
                slotIndex={slotIndex}
                timespaceOn={timespaceOn}
                onSelectSlot={selectSlot}
                onScroll={handleProposedScroll}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
