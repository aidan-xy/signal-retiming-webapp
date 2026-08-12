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

// The API carries lat/lon on corridors and intersections (see schema.sql).
// When an intersection has them, the map places its marker there directly;
// rows still missing coordinates fall back to name-match/interpolation along
// the corridor path (see utils/corridorPath.js).

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

// A proposed plan "matches existing" -- real data was imported, it just
// hasn't been retimed yet -- when its cycle length, offset, and every split
// duration are byte-identical to the existing plan sharing its plan_number.
// Compared client-side rather than trusting a flag from the API, since the
// backend deliberately doesn't judge this -- it imports the workbook's
// Proposed block as-is and leaves "has this actually changed" to the caller.
// This is distinct from a plan having no proposed data at all (see
// `placeholder` below): plenty of intersections simply haven't been
// retimed yet, and that's a normal, expected state worth showing plainly
// -- not something to hide behind a missing-data marker.
function matchesExistingPlan(proposedPlan, existingPlan) {
  if (!existingPlan) return false
  if (proposedPlan.cycle_length_s !== existingPlan.cycle_length_s) return false
  if (proposedPlan.offset_s !== existingPlan.offset_s) return false
  const splitNumbers = new Set([
    ...Object.keys(proposedPlan.durations),
    ...Object.keys(existingPlan.durations),
  ])
  for (const n of splitNumbers) {
    if ((proposedPlan.durations[n] ?? null) !== (existingPlan.durations[n] ?? null)) {
      return false
    }
  }
  return true
}

// A proposed slot "matches existing" -- real data was imported, it just
// hasn't been retimed yet -- when its plan number, cycle length, offset,
// and every Major/Minor movement value are identical to the corresponding
// existing slot (same intersection, same slot_index). Same reasoning as
// matchesExistingPlan above: some intersections just haven't been retimed
// yet, and that's a normal state worth showing plainly rather than masking
// behind "IP".
function matchesExistingSlot(proposedSlot, existingSlot) {
  if (!existingSlot) return false
  if (proposedSlot.plan_number !== existingSlot.plan_number) return false
  if (proposedSlot.cycle_length_s !== existingSlot.cycle_length_s) return false
  if (proposedSlot.offset_s !== existingSlot.offset_s) return false
  const proposedByClass = new Map(proposedSlot.movements.map((m) => [m.movement_class, m]))
  const existingByClass = new Map(existingSlot.movements.map((m) => [m.movement_class, m]))
  const classes = new Set([...proposedByClass.keys(), ...existingByClass.keys()])
  for (const cls of classes) {
    const a = proposedByClass.get(cls)
    const b = existingByClass.get(cls)
    if (!a || !b) return false
    if (
      a.split_s !== b.split_s ||
      a.wk_s !== b.wk_s ||
      a.fldw_s !== b.fldw_s ||
      a.yellow_allred_s !== b.yellow_allred_s
    ) {
      return false
    }
  }
  return true
}

// Tags each slot of a successfully-fetched proposed grid with
// `matchesExisting`, by pairing it against the same intersection/slot_index
// in the existing grid.
function annotateGridMatches(proposedGrid, existingGrid) {
  const existingByIntersection = new Map(
    existingGrid.intersections.map((inter) => [inter.intersection_id, inter])
  )
  const intersections = proposedGrid.intersections.map((inter) => {
    const existingInter = existingByIntersection.get(inter.intersection_id)
    const existingSlotsByIndex = new Map(
      (existingInter?.slots ?? []).map((s) => [s.slot_index, s])
    )
    return {
      ...inter,
      slots: inter.slots.map((slot) => ({
        ...slot,
        matchesExisting: matchesExistingSlot(slot, existingSlotsByIndex.get(slot.slot_index)),
      })),
    }
  })
  return { ...proposedGrid, intersections }
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
      // lat/lon come straight from the API; placeIntersections fills in any
      // that are still null (name-match, then interpolation).
      return list.map((i) => ({ ...i, lat: i.lat ?? null, lon: i.lon ?? null }))
    },

    async getIntersectionDetail(id, scenario = 'existing') {
      const corridor = await this.getCorridor()
      const [intersection, channels, splits] = await Promise.all([
        getJSON(`/intersections/${id}`),
        getJSON(`/intersections/${id}/channels`),
        getJSON(`/intersections/${id}/splits`),
      ])
      const timingURL = (s) =>
        `/timing?corridor=${encodeURIComponent(corridor.name)}&tab_name=${encodeURIComponent(
          intersection.tab_name
        )}&scenario=${encodeURIComponent(s)}`

      if (scenario === 'existing') {
        const rows = await getJSON(timingURL('existing'))
        return { intersection, channels, splits, plans: pivotPlans(rows), scenario }
      }

      // Proposed: fetch both scenarios so each proposed plan can be
      // compared against its existing counterpart. Two different states
      // fall out of that comparison, and they're shown differently:
      //   - no proposed plan data at all for this intersection -> genuinely
      //     missing (nothing was importable), shown as "IP".
      //   - a proposed plan exists but is identical to existing -> real
      //     data, simply not retimed yet -- shown as the real value, with
      //     a "same as existing" marker rather than hidden behind "IP".
      const [proposedRows, existingRows] = await Promise.all([
        getJSON(timingURL('proposed')),
        getJSON(timingURL('existing')),
      ])
      const existingPlans = pivotPlans(existingRows)
      const proposedPlans = pivotPlans(proposedRows)

      if (proposedPlans.length === 0) {
        // Nothing importable for this scenario at all yet -- show the
        // existing plan set as a full placeholder shell, same fallback used
        // for the timespace grid.
        return {
          intersection,
          channels,
          splits,
          plans: existingPlans.map((p) => ({ ...p, placeholder: true })),
          scenario,
          placeholder: true,
        }
      }

      const existingByNumber = new Map(existingPlans.map((p) => [p.plan_number, p]))
      const plans = proposedPlans.map((p) => ({
        ...p,
        matchesExisting: matchesExistingPlan(p, existingByNumber.get(p.plan_number)),
      }))
      return { intersection, channels, splits, plans, scenario }
    },

    // day_type: 'weekday' | 'weekend'. scenario: 'existing' | 'proposed'.
    // Returns { corridor, scenario, day_type, intersections: [{
    // intersection_id, tab_name, name, natural_order, slots: [{ slot_index,
    // slot_time, plan_number, cycle_length_s, offset_s, movements: [{
    // movement_class, split_s, wk_s, fldw_s, yellow_allred_s }] }] }] } --
    // one call gets the whole day, 96 slots x every intersection, so the
    // table and its day-type toggle don't refetch per cell or per
    // interaction.
    //
    // scenario='proposed' currently has nothing to resolve on the backend
    // for any intersection (see schema.sql / extract.py: the workbook's
    // Proposed block has no populated TOD/movement data yet, only Existing
    // does), so the API 404s for it -- caught below and shown as a full
    // `placeholder: true` grid (real "IP" everywhere) rather than a hard
    // error. Once that data exists, per-slot comparison against Existing
    // (mirroring getIntersectionDetail's per-plan comparison) will show
    // real values with `matchesExisting: true` for slots that haven't
    // diverged yet, rather than treating the whole grid as missing.
    async getTimespace(dayType, scenario = 'existing') {
      const corridor = await this.getCorridor()
      const url = (s) =>
        `/corridors/${corridor.id}/timespace?day_type=${encodeURIComponent(
          dayType
        )}&scenario=${encodeURIComponent(s)}`

      if (scenario === 'existing') {
        return getJSON(url('existing'))
      }

      const existingPromise = getJSON(url('existing'))
      let proposedGrid
      try {
        proposedGrid = await getJSON(url(scenario))
      } catch {
        const existing = await existingPromise
        return { ...existing, scenario, placeholder: true }
      }
      const existingGrid = await existingPromise
      return annotateGridMatches({ ...proposedGrid, scenario }, existingGrid)
    },
  }
}
