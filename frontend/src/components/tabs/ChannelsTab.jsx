export default function ChannelsTab({ channels }) {
  return (
    <div className="tab-panel">
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Ch.</th>
            <th>Kind</th>
            <th>Street</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => (
            <tr key={ch.id}>
              <td className="sheet-table__num">{ch.channel_number}</td>
              <td>
                <span className={`kind-tag kind-tag--${ch.kind}`}>{ch.kind}</span>
              </td>
              <td>{ch.movement_class || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
