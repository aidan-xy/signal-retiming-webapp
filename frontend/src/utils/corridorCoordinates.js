/**
 * Real signal locations along Linden Blvd, Brooklyn, extracted from the
 * NYCDOT TO14 signal KMZ (Linden_Blvd_Brooklyn_NYCDOT_TO14_Signals.kmz).
 * `order` matches the corridor's natural_order (west -> east, Flatbush Ave
 * to Kings Hwy) and `crossStreet` is the intersecting street name as NYCDOT
 * wrote it, used to match against an intersection's `name`/`tab_name`.
 *
 * This replaces the interpolated placement that was used before real
 * coordinates were available -- see corridorPath.js, which still keeps the
 * interpolation as a fallback for anything that doesn't match (e.g. a demo
 * intersection that isn't part of the real corridor).
 */

export const REAL_CORRIDOR_INTERSECTIONS = [
  { order: 1, crossStreet: 'Flatbush Ave', lat: 40.652147, lon: -73.959153 },
  { order: 2, crossStreet: 'Bedford Ave & Caton Ave', lat: 40.65233, lon: -73.956006 },
  { order: 3, crossStreet: 'Rogers Ave', lat: 40.652495, lon: -73.95267 },
  { order: 4, crossStreet: 'Nostrand Ave', lat: 40.652646, lon: -73.949786 },
  { order: 5, crossStreet: 'New York Ave', lat: 40.652793, lon: -73.946889 },
  { order: 6, crossStreet: 'E. 34 St', lat: 40.652851, lon: -73.945914 },
  { order: 7, crossStreet: 'E. 35 St', lat: 40.652911, lon: -73.944976 },
  { order: 8, crossStreet: 'Brooklyn Ave', lat: 40.652968, lon: -73.944019 },
  { order: 9, crossStreet: 'E. 37 St', lat: 40.653031, lon: -73.943045 },
  { order: 10, crossStreet: 'E. 38 St', lat: 40.653094, lon: -73.942105 },
  { order: 11, crossStreet: 'E. 39 St', lat: 40.653154, lon: -73.941175 },
  { order: 12, crossStreet: 'E. 40 St', lat: 40.653203, lon: -73.940236 },
  { order: 13, crossStreet: 'Albany Ave', lat: 40.653276, lon: -73.939268 },
  { order: 14, crossStreet: 'E. 43 St', lat: 40.653396, lon: -73.937367 },
  { order: 15, crossStreet: 'Troy Ave', lat: 40.653445, lon: -73.936402 },
  { order: 16, crossStreet: 'E. 45 St', lat: 40.653505, lon: -73.935424 },
  { order: 17, crossStreet: 'E. 46 St', lat: 40.653559, lon: -73.934493 },
  { order: 18, crossStreet: 'Schenectady Ave', lat: 40.653634, lon: -73.933524 },
  { order: 19, crossStreet: 'E. 48 St', lat: 40.653684, lon: -73.932558 },
  { order: 20, crossStreet: 'E. 49 St', lat: 40.653747, lon: -73.931616 },
  { order: 21, crossStreet: 'Utica Ave', lat: 40.653815, lon: -73.930625 },
  { order: 22, crossStreet: 'E. 51 St', lat: 40.65387, lon: -73.929612 },
  { order: 23, crossStreet: 'E. 52 St', lat: 40.653934, lon: -73.92868 },
  { order: 24, crossStreet: 'E. 53 St', lat: 40.653984, lon: -73.927713 },
  { order: 25, crossStreet: 'E. 54 St', lat: 40.654043, lon: -73.926727 },
  { order: 26, crossStreet: 'E. 55 St', lat: 40.654092, lon: -73.925801 },
  { order: 27, crossStreet: 'E. 56 St', lat: 40.654156, lon: -73.924838 },
  { order: 28, crossStreet: 'E. 57 St', lat: 40.654214, lon: -73.923858 },
  { order: 29, crossStreet: 'E. 58 St', lat: 40.654274, lon: -73.922926 },
  { order: 30, crossStreet: 'Kings Hwy', lat: 40.654315, lon: -73.922168 },
]

/** "E_34_St" / "E. 34 St" / "e 34 st" all normalize to the same key. */
function normalizeKey(value) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const COORDINATES_BY_NAME = new Map(
  REAL_CORRIDOR_INTERSECTIONS.map((i) => [normalizeKey(i.crossStreet), [i.lat, i.lon]])
)

/** Tries each candidate name in order (e.g. display name, then tab_name). */
export function lookupRealCoordinates(...candidateNames) {
  for (const name of candidateNames) {
    if (!name) continue
    const hit = COORDINATES_BY_NAME.get(normalizeKey(name))
    if (hit) return hit
  }
  return null
}

/** The 30 real points in corridor order, usable as a polyline/anchor path. */
export const REAL_CORRIDOR_PATH = REAL_CORRIDOR_INTERSECTIONS.slice()
  .sort((a, b) => a.order - b.order)
  .map((i) => [i.lat, i.lon])
