/** Groups an ordered splits/intervals array into phase-group bands, preserving order. */
export function groupIntervalsByPhase(intervals) {
  const groups = []
  for (const interval of intervals) {
    let group = groups.find((g) => g.label === interval.phase_group_label)
    if (!group) {
      group = { label: interval.phase_group_label, intervals: [] }
      groups.push(group)
    }
    group.intervals.push(interval)
  }
  return groups
}
