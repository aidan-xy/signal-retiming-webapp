/**
 * Sample corridor data, shaped exactly like the real API's responses (see
 * ../../signal_api). Used as a fallback so the UI is fully explorable even
 * without a running backend -- see index.js for the switch-over logic.
 *
 * Coordinates trace the real path of Linden Blvd through Brooklyn (Flatbush
 * Ave westward end, running east through Brownsville) but are approximate
 * placements for demo purposes, not surveyed intersection points.
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
    lat: 40.6525,
    lon: -73.9544,
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
    lat: 40.6531,
    lon: -73.9498,
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
    lat: 40.6536,
    lon: -73.9459,
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
    lat: 40.654,
    lon: -73.9427,
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
    lat: 40.6548,
    lon: -73.933,
    major_ft: 96,
    minor_ft: 44,
    channels: ['veh-major', 'veh-major-lt', 'veh-minor', 'ped-major', 'ped-minor'],
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
    lat: 40.6595,
    lon: -73.902,
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
      lat: spec.lat,
      lon: spec.lon,
    }))
  },

  async getIntersectionDetail(id) {
    const detail = DETAILS.get(Number(id))
    if (!detail) throw new Error(`no sample data for intersection ${id}`)
    return detail
  },
}
