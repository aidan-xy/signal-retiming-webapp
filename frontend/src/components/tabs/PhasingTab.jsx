import IndicationChip from '../IndicationChip'

export default function PhasingTab({ channels, splits }) {
  const groups = []
  for (const split of splits) {
    let group = groups.find((g) => g.label === split.phase_group_label)
    if (!group) {
      group = { label: split.phase_group_label, splits: [] }
      groups.push(group)
    }
    group.splits.push(split)
  }

  return (
    <div className="tab-panel tab-panel--wide">
      <div className="phasing-scroll">
        <table className="sheet-table phasing-table">
          <thead>
            <tr>
              <th className="phasing-table__band-col">Phase</th>
              <th>Split</th>
              <th>Role</th>
              {channels.map((ch) => (
                <th key={ch.id} className="phasing-table__channel-head">
                  <span className="phasing-table__ch-num">Ch {ch.channel_number}</span>
                  <span className="phasing-table__ch-class">{ch.movement_class || ch.kind}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.splits.map((split, idx) => (
                <tr key={split.id}>
                  {idx === 0 && (
                    <td
                      className="phasing-table__band-col phasing-table__band"
                      rowSpan={group.splits.length}
                    >
                      {group.label}
                    </td>
                  )}
                  <td className="sheet-table__num">{split.split_number}</td>
                  <td className="phasing-table__role">{split.role || '—'}</td>
                  {channels.map((ch) => {
                    const ind = split.indications.find((i) => i.channel_number === ch.channel_number)
                    return (
                      <td key={ch.id} className="phasing-table__cell">
                        {ind ? <IndicationChip code={ind.code} /> : <span className="phasing-table__dash">·</span>}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="phasing-legend">
        <IndicationChip code="G" /> <span>go</span>
        <IndicationChip code="Y" /> <span>yield</span>
        <IndicationChip code="R" /> <span>stop</span>
        <IndicationChip code="WK" /> <span>walk</span>
        <IndicationChip code="DW" /> <span>don't walk</span>
        <IndicationChip code="FLDW" /> <span>flashing don't walk</span>
      </div>
    </div>
  )
}
