import { HEAT_BUCKET_COUNT } from '../utils/heatScale'
import './HeatLegend.css'

export default function HeatLegend({ range }) {
  return (
    <div className="heat-legend" aria-hidden="true">
      <span className="heat-legend__label">{range.min}s</span>
      <div className="heat-legend__scale">
        {Array.from({ length: HEAT_BUCKET_COUNT }).map((_, i) => (
          <span key={i} className={`heat-legend__swatch heat-${i}`} />
        ))}
      </div>
      <span className="heat-legend__label">{range.max}s</span>
    </div>
  )
}
