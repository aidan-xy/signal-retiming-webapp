import IndicationChip from '../IndicationChip'
import { groupIntervalsByPhase } from '../../utils/groupIntervals'

export default function PhasingTab({ channels, splits }) {
  const groups = groupIntervalsByPhase(splits)

  return (
    <div className="tab-panel tab-panel--wide">
      <div className="phasing-scroll">
        <table className="sheet-table phasing-table">
          <thead>
            <tr>
              <th className="phasing-table__band-col">Phase</th>
              <th>Interval</th>
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
              group.intervals.map((interval, idx) => (
                <tr key={interval.id}>
                  {idx === 0 && (
                    <td
                      className="phasing-table__band-col phasing-table__band"
                      rowSpan={group.intervals.length}
                    >
                      {group.label}
                    </td>
                  )}
                  <td className="sheet-table__num">{interval.split_number}</td>
                  <td className="phasing-table__role">{interval.role || '—'}</td>
                  {channels.map((ch) => {
                    const ind = interval.indications.find((i) => i.channel_number === ch.channel_number)
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
