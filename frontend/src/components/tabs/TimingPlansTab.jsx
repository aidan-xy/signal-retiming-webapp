export default function TimingPlansTab({ splits, plans }) {
  return (
    <div className="tab-panel tab-panel--wide">
      <div className="phasing-scroll">
        <table className="sheet-table timing-table">
          <thead>
            <tr>
              <th>Interval</th>
              <th>Role</th>
              <th>Phase</th>
              {plans.map((plan) => (
                <th key={plan.plan_number} className="timing-table__plan-head">
                  <span className="timing-table__plan-num">Plan {plan.plan_number}</span>
                  <span className="timing-table__plan-meta">
                    C={plan.cycle_length_s}s · O={plan.offset_s}s
                  </span>
                  {plan.tod_description && (
                    <span className="timing-table__plan-tod">{plan.tod_description}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.map((split) => (
              <tr key={split.id}>
                <td className="sheet-table__num">{split.split_number}</td>
                <td className="phasing-table__role">{split.role || '—'}</td>
                <td>{split.phase_group_label}</td>
                {plans.map((plan) => (
                  <td key={plan.plan_number} className="timing-table__duration">
                    {plan.durations[split.split_number] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Cycle length</td>
              {plans.map((plan) => (
                <td key={plan.plan_number} className="timing-table__duration timing-table__cycle">
                  {plan.cycle_length_s}s
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
