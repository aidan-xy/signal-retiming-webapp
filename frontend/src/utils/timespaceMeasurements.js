// Shared with TimespaceMapView.jsx and MapView.jsx's timespace overlay --
// keeps the two views' measurement options and value-extraction logic from
// drifting apart.

export function movementValue(slot, movementClass, field) {
  const movement = slot.movements.find((m) => m.movement_class === movementClass)
  return movement ? movement[field] : null
}

// Every measurement the backend's /corridors/{id}/timespace endpoint can
// surface per slot: the plan's own cycle length/offset, plus its Major and
// Minor approach breakdown (vehicle green "Split", pedestrian WALK, flashing
// DON'T WALK, and combined yellow+all-red clearance). Mirrors the workbook
// Time_SpaceMap tab's own Measurement dropdown, minus Proposed (out of scope
// for this schema -- see schema.sql).
export const MEASUREMENTS = [
  { key: 'cycle_length_s', label: 'Cycle Length', getValue: (slot) => slot.cycle_length_s },
  { key: 'offset_s', label: 'Offset', getValue: (slot) => slot.offset_s },
  { key: 'major_split_s', label: 'Major — Split', getValue: (slot) => movementValue(slot, 'Major', 'split_s') },
  { key: 'major_wk_s', label: 'Major — Walk', getValue: (slot) => movementValue(slot, 'Major', 'wk_s') },
  { key: 'major_fldw_s', label: 'Major — Flashing DW', getValue: (slot) => movementValue(slot, 'Major', 'fldw_s') },
  { key: 'major_yar_s', label: 'Major — Yellow+AR', getValue: (slot) => movementValue(slot, 'Major', 'yellow_allred_s') },
  { key: 'minor_split_s', label: 'Minor — Split', getValue: (slot) => movementValue(slot, 'Minor', 'split_s') },
  { key: 'minor_wk_s', label: 'Minor — Walk', getValue: (slot) => movementValue(slot, 'Minor', 'wk_s') },
  { key: 'minor_fldw_s', label: 'Minor — Flashing DW', getValue: (slot) => movementValue(slot, 'Minor', 'fldw_s') },
  { key: 'minor_yar_s', label: 'Minor — Yellow+AR', getValue: (slot) => movementValue(slot, 'Minor', 'yellow_allred_s') },
]

export function getMeasurement(key) {
  return MEASUREMENTS.find((m) => m.key === key) ?? MEASUREMENTS[1] // fall back to Offset
}
