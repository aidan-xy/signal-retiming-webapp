/**
 * Marker placement for the corridor map.
 *
 * Placement priority, per intersection:
 *   1. lat/lon already on the record (once the API/schema carries real
 *      coordinates, this wins outright -- see client.js).
 *   2. A name match against REAL_CORRIDOR_INTERSECTIONS, the real surveyed
 *      points extracted from NYCDOT's TO14 signal KMZ (corridorCoordinates.js).
 *   3. Interpolation along the real corridor path by arc-length fraction,
 *      for anything that doesn't match -- e.g. a demo/sample intersection
 *      that isn't part of the actual corridor.
 */

import { lookupRealCoordinates, REAL_CORRIDOR_PATH } from './corridorCoordinates'

export const CORRIDOR_ANCHORS = REAL_CORRIDOR_PATH

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

    const real = lookupRealCoordinates(item.name, item.tab_name)
    if (real) return { ...item, lat: real[0], lon: real[1] }

    const fraction = n <= 1 ? 0 : i / (n - 1)
    const [lat, lon] = pointAtFraction(fraction)
    return { ...item, lat, lon }
  })
}
