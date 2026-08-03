/**
 * Sample corridor data, shaped exactly like the real API's responses (see
 * ../../signal_api). Used as a fallback so the UI is fully explorable even
 * without a running backend -- see index.js for the switch-over logic.
 *
 * No lat/lon here -- like the real API, this leaves placement to
 * utils/placeIntersections, which resolves real coordinates by name
 * (utils/corridorCoordinates.js) for the five sample intersections that are
 * genuinely on Linden Blvd, and falls back to interpolation for "Rockaway
 * Pkwy", which isn't part of the real 30-intersection corridor.
 */

const CORRIDOR = { id: 1, name: 'Linden Blvd', borough: 'Brooklyn' }

// Compact per-intersection specs -- deliberately not six full hand-written
// records, in the same spirit as extract.py: describe the shape once, build
// the rest.
const SPECS = [
  {
    tab_name: 'Flatbush_Ave',
    name: 'Flatbush Ave',
    order: 1,
    major_ft: 82,
    minor_ft: 38,
    channels: ['veh-major', 'veh-minor', 'ped-major', 'ped-minor'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [40, 45], durProposed: [44, 49] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [10, 10], durProposed: [11, 11] },
        ],
      },
      {
        label: 'Phase B',
        splits: [
          { role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [40, 45] },
        ],
      },
    ],
    // Fully retimed proposal: both plans' cycle, offset, and durations
    // diverge from Existing (a real decision, not a placeholder) --
    // exercises the "real, diverged value" state (plain heat color, no
    // ring/badge) throughout this intersection's row.
    plans: [
      { cycle: 90, offset: 10, tod: 'MON-FRI 06:00-09:00', proposedCycle: 95, proposedOffset: 18 },
      { cycle: 100, offset: 20, tod: 'MON-FRI 09:00-16:00', proposedCycle: 105, proposedOffset: 25 },
    ],
  },
  {
    tab_name: 'Bedford_Ave',
    name: 'Bedford Ave & Caton Ave',
    order: 2,
    major_ft: 78,
    minor_ft: 36,
    channels: ['veh-major', 'veh-minor', 'ped-major', 'ped-minor'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [42, 42] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [9, 9] },
        ],
      },
      {
        label: 'Phase B',
        splits: [
          { role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [24, 24] },
          { role: 'PED CL', ind: { 2: 'G', 4: 'DW' }, dur: [15, 15] },
        ],
      },
    ],
    plans: [
      { cycle: 90, offset: 5, tod: 'MON-FRI 06:00-09:00' },
      { cycle: 90, offset: 5, tod: 'MON-FRI 09:00-16:00' },
    ],
    // No proposed* overrides anywhere in this spec -- deliberately: this
    // intersection hasn't been retimed yet, exercising the "real data,
    // still matches Existing" state (dashed ring + SAME badge) throughout.
  },
  {
    tab_name: 'Nostrand_Ave',
    name: 'Nostrand Ave',
    order: 3,
    major_ft: 84,
    minor_ft: 40,
    channels: ['veh-major', 'veh-minor', 'ped-major', 'ped-minor'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [46, 50] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [11, 11] },
        ],
      },
      {
        label: 'Phase B',
        splits: [{ role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [33, 33] }],
      },
    ],
    plans: [
      { cycle: 90, offset: 30, tod: 'MON-FRI 06:00-09:00' },
      { cycle: 94, offset: 34, tod: 'MON-FRI 09:00-16:00' },
    ],
    // Nothing has been imported for Proposed at this intersection at all --
    // exercises the "IP" placeholder state in the drawer (Timing Plans /
    // Phasing & Timing tabs).
    proposedMissing: true,
  },
  {
    tab_name: 'New_York_Ave',
    name: 'New York Ave',
    order: 4,
    major_ft: 80,
    minor_ft: 36,
    channels: ['veh-major', 'veh-minor', 'ped-major', 'ped-minor'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [44, 48], durProposed: [50] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [10, 10], durProposed: [12] },
        ],
      },
      {
        label: 'Phase B',
        splits: [{ role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [36, 36], durProposed: [34] }],
      },
    ],
    // Mixed within one intersection: Plan 1 (AM) has been retimed, Plan 2
    // hasn't -- exercises both states side by side in the same table.
    // durProposed arrays above only cover index 0 (Plan 1); Plan 2's
    // duration falls back to Existing's since durProposed[1] is undefined.
    plans: [
      { cycle: 90, offset: 42, tod: 'MON-FRI 06:00-09:00', proposedCycle: 96, proposedOffset: 50 },
      { cycle: 94, offset: 46, tod: 'MON-FRI 09:00-16:00' },
    ],
  },
  {
    tab_name: 'Utica_Ave',
    name: 'Utica Ave',
    order: 5,
    major_ft: 96,
    minor_ft: 44,
    channels: ['veh-major', 'veh-major-lt', 'veh-minor', 'ped-major', 'ped-minor', 'veh-unassigned'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'LT PROT', ind: { 2: 'G' }, dur: [14, 16], durProposed: [18, 20] },
          { role: 'PHASE A', ind: { 1: 'G', 4: 'WK' }, dur: [40, 42] },
          { role: 'PED CL', ind: { 1: 'G', 4: 'FLDW' }, dur: [11, 11], durProposed: [12, 12] },
        ],
      },
      {
        label: 'Phase B',
        splits: [
          { role: 'PHASE A', ind: { 3: 'G', 5: 'WK' }, dur: [32, 32] },
          { role: 'PED CL', ind: { 3: 'G', 5: 'DW' }, dur: [10, 10] },
        ],
      },
    ],
    // Fully retimed proposal focused on protected left-turn time (a common
    // real-world retiming motivation) -- both plans diverge from Existing.
    plans: [
      { cycle: 107, offset: 60, tod: 'MON-FRI 06:00-09:00', proposedCycle: 112, proposedOffset: 65 },
      { cycle: 111, offset: 63, tod: 'MON-FRI 09:00-16:00', proposedCycle: 116, proposedOffset: 68 },
    ],
  },
  {
    tab_name: 'Rockaway_Pkwy',
    name: 'Rockaway Pkwy',
    order: 6,
    major_ft: 88,
    minor_ft: 42,
    channels: ['veh-major', 'veh-minor', 'ped-major', 'ped-minor'],
    groups: [
      {
        label: 'Phase A',
        splits: [
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [50, 54] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [12, 12] },
        ],
      },
      {
        label: 'Phase B',
        splits: [{ role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [28, 28] }],
      },
    ],
    plans: [
      { cycle: 90, offset: 8, tod: 'MON-FRI 06:00-09:00' },
      { cycle: 94, offset: 8, tod: 'MON-FRI 09:00-16:00' },
    ],
    // Also not retimed yet -- see Bedford Ave above.
  },
]

const CHANNEL_DEFS = {
  'veh-major': { kind: 'vehicle', movement_class: 'Major' },
  'veh-major-lt': { kind: 'vehicle', movement_class: 'Major' },
  'veh-minor': { kind: 'vehicle', movement_class: 'Minor' },
  'ped-major': { kind: 'pedestrian', movement_class: 'Major' },
  'ped-minor': { kind: 'pedestrian', movement_class: 'Minor' },
  'veh-unassigned': { kind: 'vehicle', movement_class: null },
}

function buildIntersection(spec, id) {
  const channels = spec.channels.map((key, i) => ({
    id: i + 1,
    channel_number: i + 1,
    ...CHANNEL_DEFS[key],
  }))

  const splits = []
  const planDurations = spec.plans.map(() => ({}))
  const planDurationsProposed = spec.plans.map(() => ({}))
  let splitNumber = 1

  spec.groups.forEach((group, gi) => {
    group.splits.forEach((s, pos) => {
      const indications = Object.entries(s.ind).map(([chNum, code]) => ({
        channel_number: Number(chNum),
        code,
      }))
      splits.push({
        id: splitNumber,
        split_number: splitNumber,
        position_in_group: pos + 1,
        role: s.role,
        phase_group_label: group.label,
        indications,
      })
      s.dur.forEach((d, planIdx) => {
        planDurations[planIdx][splitNumber] = d
        // durProposed[planIdx] undefined -> this split's proposed duration
        // just mirrors Existing (the common case: only some splits/plans
        // have actually been retimed).
        planDurationsProposed[planIdx][splitNumber] = s.durProposed?.[planIdx] ?? d
      })
      splitNumber += 1
    })
  })

  const plans = spec.plans.map((p, i) => ({
    plan_number: i + 1,
    cycle_length_s: p.cycle,
    offset_s: p.offset,
    tod_description: p.tod,
    durations: planDurations[i],
  }))

  // null (not an empty array) signals "nothing imported for Proposed at
  // this intersection at all" -- matches the real API's per-intersection
  // 404 case (see client.js's getIntersectionDetail), as distinct from
  // "imported but identical to Existing" (matchesExisting, computed later
  // by comparing plans/plansProposed).
  const plansProposed = spec.proposedMissing
    ? null
    : spec.plans.map((p, i) => ({
        plan_number: i + 1,
        cycle_length_s: p.proposedCycle ?? p.cycle,
        offset_s: p.proposedOffset ?? p.offset,
        tod_description: p.tod,
        durations: planDurationsProposed[i],
      }))

  return {
    intersection: {
      id,
      corridor_id: CORRIDOR.id,
      tab_name: spec.tab_name,
      name: spec.name,
      natural_order: spec.order,
      major_crosswalk_ft: spec.major_ft,
      minor_crosswalk_ft: spec.minor_ft,
      source_file: 'linden_blvd_corridor_comparison.xlsm',
    },
    channels,
    splits,
    plans,
    plansProposed,
  }
}

const DETAILS = new Map(SPECS.map((spec, i) => [i + 1, buildIntersection(spec, i + 1)]))

// ---- timespace map (sample-data fallback) ----------------------------------
//
// The real backend resolves which plan is active per 15-minute slot from the
// workbook's own precomputed lookup table (see import_workbook.py), and reads
// each plan's Major/Minor Split/WK/FLDW/Y+AR breakdown from the workbook's
// own summary block rather than deriving it. Neither of those source tables
// exists for this sample corridor, so both are approximated here, only to
// keep the timespace page explorable without a running backend:
//   - plan resolution: each sample intersection has exactly two plans (an AM
//     plan and an "everything else" plan, per their tod_description); the AM
//     plan is used for the 06:00-09:00 window on weekdays, the other plan
//     covers the rest of the day and all of the weekend.
//   - movement breakdown: summed directly from this intersection's own
//     splits/channels/indications, which is only safe here because every
//     sample intersection has at most one vehicle + one pedestrian channel
//     per Major/Minor (see the real corridor's extract.py for why that
//     assumption doesn't hold everywhere).

const SLOT_MINUTES = 15
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES // 96

function slotIndexToTime(slotIndex) {
  const totalMinutes = slotIndex * SLOT_MINUTES
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function resolveSamplePlan(plans, dayType, slotIndex) {
  if (dayType === 'weekend' || plans.length < 2) return plans[plans.length - 1]
  const hour = Math.floor(slotIndex / (60 / SLOT_MINUTES))
  const isAmPeak = hour >= 6 && hour < 9
  return isAmPeak ? plans[0] : plans[1]
}

function deriveSampleMovements(splits, channels, plan) {
  const totals = {
    Major: { split_s: 0, wk_s: 0, fldw_s: 0, yellow_allred_s: 0 },
    Minor: { split_s: 0, wk_s: 0, fldw_s: 0, yellow_allred_s: 0 },
  }
  const channelByNumber = new Map(channels.map((c) => [c.channel_number, c]))

  for (const split of splits) {
    const duration = plan.durations[split.split_number] || 0
    if (!duration) continue
    for (const ind of split.indications) {
      const ch = channelByNumber.get(ind.channel_number)
      if (!ch || !ch.movement_class) continue
      const bucket = totals[ch.movement_class]
      if (!bucket) continue
      const code = ind.code.split('/')[0].trim()
      if (ch.kind === 'vehicle' && code === 'G') bucket.split_s += duration
      else if (ch.kind === 'pedestrian' && code === 'WK') bucket.wk_s += duration
      else if (ch.kind === 'pedestrian' && code === 'FLDW') bucket.fldw_s += duration
      else if (code === 'Y' || code === 'A') bucket.yellow_allred_s += duration
    }
  }

  return [
    { movement_class: 'Major', ...totals.Major },
    { movement_class: 'Minor', ...totals.Minor },
  ]
}

// Mirrors client.js's matchesExistingPlan/matchesExistingSlot: a proposed
// plan or slot only counts as "matches existing" when every field that
// matters is byte-identical, not just close. Duplicated here (rather than
// imported) because client.js's version is specific to comparing two real
// API responses -- this operates on the sample data's own already-built
// objects instead.
function plansEqual(a, b) {
  if (!a || !b) return false
  if (a.cycle_length_s !== b.cycle_length_s) return false
  if (a.offset_s !== b.offset_s) return false
  const keys = new Set([...Object.keys(a.durations), ...Object.keys(b.durations)])
  for (const k of keys) {
    if ((a.durations[k] ?? null) !== (b.durations[k] ?? null)) return false
  }
  return true
}

function slotsEqual(a, b) {
  if (a.plan_number !== b.plan_number) return false
  if (a.cycle_length_s !== b.cycle_length_s) return false
  if (a.offset_s !== b.offset_s) return false
  const am = new Map(a.movements.map((m) => [m.movement_class, m]))
  const bm = new Map(b.movements.map((m) => [m.movement_class, m]))
  const classes = new Set([...am.keys(), ...bm.keys()])
  for (const cls of classes) {
    const x = am.get(cls)
    const y = bm.get(cls)
    if (!x || !y) return false
    if (
      x.split_s !== y.split_s ||
      x.wk_s !== y.wk_s ||
      x.fldw_s !== y.fldw_s ||
      x.yellow_allred_s !== y.yellow_allred_s
    ) {
      return false
    }
  }
  return true
}

export const mockDataSource = {
  label: 'sample data',

  async getCorridor() {
    return CORRIDOR
  },

  async getIntersections() {
    return SPECS.map((spec, i) => ({
      id: i + 1,
      tab_name: spec.tab_name,
      name: spec.name,
      natural_order: spec.order,
      lat: null,
      lon: null,
    }))
  },

  async getIntersectionDetail(id, scenario = 'existing') {
    const detail = DETAILS.get(Number(id))
    if (!detail) throw new Error(`no sample data for intersection ${id}`)
    if (scenario === 'existing') return { ...detail, scenario }

    if (!detail.plansProposed) {
      // Nothing imported for Proposed at this intersection at all (see
      // buildIntersection) -- same fallback shape as client.js's
      // getIntersectionDetail when the real API returns zero proposed rows.
      return {
        ...detail,
        scenario,
        placeholder: true,
        plans: detail.plans.map((p) => ({ ...p, placeholder: true })),
      }
    }

    const existingByNumber = new Map(detail.plans.map((p) => [p.plan_number, p]))
    const plans = detail.plansProposed.map((p) => ({
      ...p,
      matchesExisting: plansEqual(p, existingByNumber.get(p.plan_number)),
    }))
    return { ...detail, scenario, plans }
  },

  async getTimespace(dayType, scenario = 'existing') {
    const intersections = SPECS.map((spec, i) => {
      const detail = DETAILS.get(i + 1)
      const slots = []
      for (let slotIndex = 0; slotIndex < SLOTS_PER_DAY; slotIndex++) {
        const plan = resolveSamplePlan(detail.plans, dayType, slotIndex)
        slots.push({
          slot_index: slotIndex,
          slot_time: slotIndexToTime(slotIndex),
          plan_number: plan.plan_number,
          cycle_length_s: plan.cycle_length_s,
          offset_s: plan.offset_s,
          movements: deriveSampleMovements(detail.splits, detail.channels, plan),
        })
      }
      return {
        intersection_id: i + 1,
        tab_name: spec.tab_name,
        name: spec.name,
        natural_order: spec.order,
        slots,
      }
    })
    const existingGrid = { corridor: CORRIDOR.name, scenario: 'existing', day_type: dayType, intersections }
    if (scenario === 'existing') return existingGrid

    // Simulate a corridor where the proposed retiming has only been
    // entered for weekday plans so far -- picking weekend here exercises
    // the "nothing resolvable at all" placeholder state (real amber "IP"
    // cells, not just a same-as-existing ring), the same fallback the real
    // API hits when a scenario has no tod_slots/plan_movements whatsoever
    // (see client.js).
    if (dayType === 'weekend') {
      return { ...existingGrid, scenario, placeholder: true }
    }

    const proposedIntersections = SPECS.map((spec, i) => {
      const detail = DETAILS.get(i + 1)
      const existingInter = existingGrid.intersections[i]
      // No proposed plans imported for this intersection at all (see
      // buildIntersection) -- fall back to resolving from Existing's own
      // plans, which naturally comes out byte-identical to the existing
      // slot below and so reads as "matches existing", not as missing --
      // the grid has no per-intersection placeholder concept the way the
      // drawer does (see the module docstring in timespace.py).
      const sourcePlans = detail.plansProposed || detail.plans
      const slots = existingInter.slots.map((existingSlot, slotIndex) => {
        const plan = resolveSamplePlan(sourcePlans, dayType, slotIndex)
        const slot = {
          slot_index: slotIndex,
          slot_time: existingSlot.slot_time,
          plan_number: plan.plan_number,
          cycle_length_s: plan.cycle_length_s,
          offset_s: plan.offset_s,
          movements: deriveSampleMovements(detail.splits, detail.channels, plan),
        }
        slot.matchesExisting = slotsEqual(slot, existingSlot)
        return slot
      })
      return { ...existingInter, slots }
    })

    return { ...existingGrid, scenario, intersections: proposedIntersections }
  },
}
