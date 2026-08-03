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
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [40, 45] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [10, 10] },
        ],
      },
      {
        label: 'Phase B',
        splits: [
          { role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [40, 45] },
        ],
      },
    ],
    plans: [
      { cycle: 90, offset: 10, tod: 'MON-FRI 06:00-09:00' },
      { cycle: 100, offset: 20, tod: 'MON-FRI 09:00-16:00' },
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
          { role: 'PHASE A', ind: { 1: 'G', 3: 'WK' }, dur: [44, 48] },
          { role: 'PED CL', ind: { 1: 'G', 3: 'FLDW' }, dur: [10, 10] },
        ],
      },
      {
        label: 'Phase B',
        splits: [{ role: 'PHASE A', ind: { 2: 'G', 4: 'WK' }, dur: [36, 36] }],
      },
    ],
    plans: [
      { cycle: 90, offset: 42, tod: 'MON-FRI 06:00-09:00' },
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
          { role: 'LT PROT', ind: { 2: 'G' }, dur: [14, 16] },
          { role: 'PHASE A', ind: { 1: 'G', 4: 'WK' }, dur: [40, 42] },
          { role: 'PED CL', ind: { 1: 'G', 4: 'FLDW' }, dur: [11, 11] },
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
    plans: [
      { cycle: 107, offset: 60, tod: 'MON-FRI 06:00-09:00' },
      { cycle: 111, offset: 63, tod: 'MON-FRI 09:00-16:00' },
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
    // Sample data has no distinct Proposed scenario -- every plan mirrors
    // Existing exactly, the same as a real intersection that hasn't been
    // retimed yet. Shown as real values marked "same as existing", not as
    // missing data -- see client.js's matchesExistingPlan.
    return {
      ...detail,
      scenario,
      plans: detail.plans.map((p) => ({ ...p, matchesExisting: true })),
    }
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
    const grid = { corridor: CORRIDOR.name, scenario: 'existing', day_type: dayType, intersections }
    if (scenario === 'existing') return grid
    // Sample data has no distinct Proposed scenario -- every slot mirrors
    // Existing exactly, the same as a real intersection/timespace that
    // hasn't been retimed yet. Shown as real values marked "same as
    // existing" per slot, not as missing data -- see client.js's
    // matchesExistingSlot.
    return {
      ...grid,
      scenario,
      intersections: grid.intersections.map((inter) => ({
        ...inter,
        slots: inter.slots.map((slot) => ({ ...slot, matchesExisting: true })),
      })),
    }
  },
}
