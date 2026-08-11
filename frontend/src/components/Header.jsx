import { ChevronDown } from 'lucide-react'
import './Header.css'

const PAGES = [
  { key: 'map', label: 'Map & Timings' },
  { key: 'timespace', label: 'Time-Space Map' },
  { key: 'compare', label: 'Compare' },
]

const SCENARIOS = [
  { key: 'existing', label: 'Existing — As-Built' },
  { key: 'proposed', label: 'Proposed — Retiming' },
]

export default function Header({
  corridor,
  dataSourceLabel,
  intersectionCount,
  page,
  onPageChange,
  scenario,
  onScenarioChange,
}) {
  return (
    <header className="app-header">
      <div className="app-header__title">
        <span className="app-header__eyebrow">Signal Timing</span>
        <h1>
          {corridor ? corridor.name : 'Loading corridor…'}
          {corridor?.borough && <span className="app-header__borough"> · {corridor.borough}</span>}
        </h1>
      </div>

      {onPageChange && (
        <nav className="app-header__nav" role="tablist" aria-label="Page">
          {PAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={page === p.key}
              className={`app-header__nav-btn ${page === p.key ? 'is-active' : ''}`}
              onClick={() => onPageChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      )}

      <div className="app-header__meta">
        {onScenarioChange && page !== 'compare' && (
          <label
            className={`app-header__scenario app-header__scenario--${scenario}`}
            title="Switch between existing (as-built) and proposed signal timing, shown in the Map view and Time-Space Map"
          >
            <span className="app-header__scenario-label">Viewing</span>
            <span className="app-header__scenario-control">
              <select
                className="app-header__scenario-select"
                value={scenario}
                onChange={(e) => onScenarioChange(e.target.value)}
                aria-label="Existing or proposed timing"
              >
                {SCENARIOS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} strokeWidth={2.5} className="app-header__scenario-chevron" />
            </span>
          </label>
        )}
        {page === 'compare' && (
          <span className="app-header__pill app-header__pill--compare">
            Existing vs. Proposed
          </span>
        )}
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
