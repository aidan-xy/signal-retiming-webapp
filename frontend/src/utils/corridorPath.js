/**
 * Fallback geometry for placing markers when the API doesn't supply
 * lat/lon (schema.sql has no coordinate columns yet). Anchors trace the
 * approximate real path of Linden Blvd through Brooklyn, west (Flatbush
 * Ave) to east (Brownsville); intersections are then placed along that
 * path by arc-length fraction, in natural_order.
 *
 * Adding real lat/lon columns to `intersections` would let the API report
 * exact coordinates and make this file unnecessary -- see client.js.
 */

export const CORRIDOR_ANCHORS = [
  [40.6525, -73.9544],
  [40.6531, -73.9498],
  [40.6536, -73.9459],
  [40.654, -73.9427],
  [40.6548, -73.933],
  [40.658, -73.913],
  [40.6595, -73.902],
  [40.662, -73.888],
  [40.664, -73.872],
  [40.665, -73.862],
]

function planarDistance([lat1, lon1], [lat2, lon2]) {
  const dLat = lat2 - lat1
  const dLon = (lon2 - lon1) * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLon * dLon)
}

function cumulativeLengths(anchors) {
  const lens = [0]
  for (let i = 1; i < anchors.length; i++) {
    lens.push(lens[i - 1] + planarDistance(anchors[i - 1], anchors[i]))
  }
  return lens
}

export function pointAtFraction(fraction, anchors = CORRIDOR_ANCHORS) {
  const lens = cumulativeLengths(anchors)
  const total = lens[lens.length - 1]
  const target = Math.min(Math.max(fraction, 0), 1) * total

  for (let i = 1; i < anchors.length; i++) {
    if (target <= lens[i] || i === anchors.length - 1) {
      const span = lens[i] - lens[i - 1] || 1
      const segFrac = (target - lens[i - 1]) / span
      const [lat1, lon1] = anchors[i - 1]
      const [lat2, lon2] = anchors[i]
      return [lat1 + (lat2 - lat1) * segFrac, lon1 + (lon2 - lon1) * segFrac]
    }
  }
  return anchors[anchors.length - 1]
}

/** Returns intersections with lat/lon filled in, sorted by natural_order. */
export function placeIntersections(intersections) {
  const sorted = [...intersections].sort((a, b) => a.natural_order - b.natural_order)
  const n = sorted.length
  return sorted.map((item, i) => {
    if (item.lat != null && item.lon != null) return item
    const fraction = n <= 1 ? 0 : i / (n - 1)
    const [lat, lon] = pointAtFraction(fraction)
    return { ...item, lat, lon }
  })
}
