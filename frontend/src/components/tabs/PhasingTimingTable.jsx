import IndicationChip from '../IndicationChip'
import { groupIntervalsByPhase } from '../../utils/groupIntervals'

/**
 * Merges the phasing grid and the timing-plan duration matrix into one
 * table so the two sit side by side and share the same interval rows,
 * rather than each repeating Interval/Role/Phase in a separate table.
 * Used in the expanded (near full-screen) drawer view.
 */
export default function PhasingTimingTable({ channels, splits, plans }) {
  const groups = groupIntervalsByPhase(splits)

  return (
    <div className="tab-panel tab-panel--wide">
      <div className="phasing-scroll">
        <table className="sheet-table phasing-table combo-table">
          <thead>
            <tr>
              <th className="phasing-table__band-col" rowSpan={2}>Phase</th>
              <th rowSpan={2}>Interval</th>
              <th rowSpan={2}>Role</th>
              <th colSpan={channels.length} className="combo-table__group-head">
                Phasing
              </th>
              <th colSpan={plans.length} className="combo-table__group-head combo-table__group-head--divider">
                Timing Plans
              </th>
            </tr>
            <tr>
              {channels.map((ch) => (
                <th key={ch.id} className="phasing-table__channel-head">
                  <span className="phasing-table__ch-num">Ch {ch.channel_number}</span>
                  <span className="phasing-table__ch-class">{ch.movement_class || ch.kind}</span>
                </th>
              ))}
              {plans.map((plan, i) => (
                <th
                  key={plan.plan_number}
                  className={`timing-table__plan-head ${i === 0 ? 'combo-table__col-divider' : ''}`}
                >
                  <span className="timing-table__plan-num">
                    Plan {plan.plan_number}
                    {plan.placeholder && <span className="timing-table__ip-badge">IP</span>}
                    {!plan.placeholder && plan.matchesExisting && (
                      <span
                        className="timing-table__same-badge"
                        title="Matches Existing exactly — not yet retimed"
                      >
                        SAME
                      </span>
                    )}
                  </span>
                  <span className="timing-table__plan-meta">
                    {plan.placeholder
                      ? 'not yet decided'
                      : `C=${plan.cycle_length_s}s · O=${plan.offset_s}s`}
                  </span>
                  {plan.tod_description && (
                    <span className="timing-table__plan-tod">{plan.tod_description}</span>
                  )}
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
                  {plans.map((plan, i) => (
                    <td
                      key={plan.plan_number}
                      className={`timing-table__duration ${i === 0 ? 'combo-table__col-divider' : ''} ${
                        plan.placeholder ? 'timing-table__duration--placeholder' : ''
                      } ${!plan.placeholder && plan.matchesExisting ? 'timing-table__duration--same' : ''}`}
                      title={
                        !plan.placeholder && plan.matchesExisting ? 'Same as existing' : undefined
                      }
                    >
                      {plan.placeholder ? 'IP' : plan.durations[interval.split_number] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3 + channels.length}>Cycle length</td>
              {plans.map((plan, i) => (
                <td
                  key={plan.plan_number}
                  className={`timing-table__duration timing-table__cycle ${i === 0 ? 'combo-table__col-divider' : ''} ${
                    plan.placeholder ? 'timing-table__duration--placeholder' : ''
                  } ${!plan.placeholder && plan.matchesExisting ? 'timing-table__duration--same' : ''}`}
                  title={!plan.placeholder && plan.matchesExisting ? 'Same as existing' : undefined}
                >
                  {plan.placeholder ? 'IP' : `${plan.cycle_length_s}s`}
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={3 + channels.length}>Offset</td>
              {plans.map((plan, i) => (
                <td
                  key={plan.plan_number}
                  className={`timing-table__duration timing-table__cycle ${i === 0 ? 'combo-table__col-divider' : ''} ${
                    plan.placeholder ? 'timing-table__duration--placeholder' : ''
                  } ${!plan.placeholder && plan.matchesExisting ? 'timing-table__duration--same' : ''}`}
                  title={!plan.placeholder && plan.matchesExisting ? 'Same as existing' : undefined}
                >
                  {plan.placeholder ? 'IP' : `${plan.offset_s}s`}
                </td>
              ))}
            </tr>
          </tfoot>
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
