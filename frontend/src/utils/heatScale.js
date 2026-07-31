// Shared by TimespaceMapView.jsx and MapView.jsx's timespace overlay, so
// both color the same measurement value the same way.

export const HEAT_BUCKET_COUNT = 8

/**
 * Min/max of a measurement's values across every slot of every intersection
 * in the grid -- one shared scale for the whole corridor/day, rather than
 * each view (or each row) computing its own scope and disagreeing about
 * what "high" means.
 *
 * @param {{ intersections: { slots: object[] }[] } | null} grid
 * @param {{ getValue: (slot: object) => number | null }} measurement
 */
export function computeValueRange(grid, measurement) {
  let min = Infinity
  let max = -Infinity
  if (grid) {
    for (const inter of grid.intersections) {
      for (const slot of inter.slots) {
        const v = measurement.getValue(slot)
        if (v == null) continue
        if (v < min) min = v
        if (v > max) max = v
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 }
  return { min, max }
}

/** Maps a value into 0..HEAT_BUCKET_COUNT-1 given the grid's value range. */
export function valueToHeatBucket(value, range) {
  if (value == null || range.max === range.min) return 0
  const t = (value - range.min) / (range.max - range.min)
  const clamped = Math.min(1, Math.max(0, t))
  return Math.min(HEAT_BUCKET_COUNT - 1, Math.floor(clamped * HEAT_BUCKET_COUNT))
}
