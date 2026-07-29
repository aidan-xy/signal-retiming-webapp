/**
 * Client for the read-only signal-timing API (see ../../../signal_api).
 * Same interface as mockDataSource, so App.jsx doesn't need to know which
 * one it's talking to.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}`)
  }
  return res.json()
}

// The API has no lat/lon columns yet -- schema.sql would need those added to
// place markers precisely. Until then the map falls back to interpolating
// along the known corridor path, in the same order the API returns
// (natural_order). See utils/corridorPath.js.

function pivotPlans(rows) {
  const byPlan = new Map()
  for (const row of rows) {
    if (!byPlan.has(row.plan_number)) {
      byPlan.set(row.plan_number, {
        plan_number: row.plan_number,
        cycle_length_s: row.cycle_length_s,
        offset_s: row.offset_s,
        tod_description: row.tod_description,
        durations: {},
      })
    }
    byPlan.get(row.plan_number).durations[row.split_number] = row.duration_s
  }
  return [...byPlan.values()].sort((a, b) => a.plan_number - b.plan_number)
}

export function createApiDataSource(corridorName) {
  let corridorCache = null

  return {
    label: 'live data',

    async getCorridor() {
      if (corridorCache) return corridorCache
      const corridors = await getJSON('/corridors')
      corridorCache = corridorName
        ? corridors.find((c) => c.name === corridorName) || corridors[0]
        : corridors[0]
      if (!corridorCache) throw new Error('no corridors returned by the API')
      return corridorCache
    },

    async getIntersections() {
      const corridor = await this.getCorridor()
      const list = await getJSON(`/corridors/${corridor.id}/intersections`)
      return list.map((i) => ({ ...i, lat: null, lon: null }))
    },

    async getIntersectionDetail(id) {
      const corridor = await this.getCorridor()
      const [intersection, channels, splits] = await Promise.all([
        getJSON(`/intersections/${id}`),
        getJSON(`/intersections/${id}/channels`),
        getJSON(`/intersections/${id}/splits`),
      ])
      const rows = await getJSON(
        `/timing?corridor=${encodeURIComponent(corridor.name)}&tab_name=${encodeURIComponent(
          intersection.tab_name
        )}`
      )
      return { intersection, channels, splits, plans: pivotPlans(rows) }
    },
  }
}
