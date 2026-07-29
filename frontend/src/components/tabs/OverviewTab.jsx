export default function OverviewTab({ intersection, channels, splits, plans }) {
  const groupCount = new Set(splits.map((s) => s.phase_group_label)).size

  const fields = [
    ['Tab name', intersection.tab_name],
    ['Corridor order', `#${intersection.natural_order}`],
    ['Major crosswalk', intersection.major_crosswalk_ft ? `${intersection.major_crosswalk_ft} ft` : '—'],
    ['Minor crosswalk', intersection.minor_crosswalk_ft ? `${intersection.minor_crosswalk_ft} ft` : '—'],
    ['Source file', intersection.source_file || '—'],
  ]

  const stats = [
    ['Channels', channels.length],
    ['Phase groups', groupCount],
    ['Intervals', splits.length],
    ['Timing plans', plans.length],
  ]

  return (
    <div className="tab-panel">
      <dl className="field-list">
        {fields.map(([label, value]) => (
          <div className="field-list__row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div className="stat-grid__cell" key={label}>
            <span className="stat-grid__value">{value}</span>
            <span className="stat-grid__label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
