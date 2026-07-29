import './Header.css'

export default function Header({ corridor, dataSourceLabel, intersectionCount }) {
  return (
    <header className="app-header">
      <div className="app-header__title">
        <span className="app-header__eyebrow">NYCDOT · Signal Timing</span>
        <h1>
          {corridor ? corridor.name : 'Loading corridor…'}
          {corridor?.borough && <span className="app-header__borough"> · {corridor.borough}</span>}
        </h1>
      </div>

      <div className="app-header__meta">
        <span className="app-header__pill">Existing — As-Built</span>
        {intersectionCount != null && (
          <span className="app-header__count">{intersectionCount} intersections</span>
        )}
        {dataSourceLabel && (
          <span
            className={`app-header__source ${
              dataSourceLabel === 'live data' ? 'is-live' : 'is-sample'
            }`}
          >
            <span className="app-header__dot" />
            {dataSourceLabel}
          </span>
        )}
      </div>
    </header>
  )
}
