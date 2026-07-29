import './IndicationChip.css'

const STYLE_BY_BASE_CODE = {
  G: 'chip--green',
  Y: 'chip--amber',
  R: 'chip--red',
  A: 'chip--amber',
  WK: 'chip--walk',
  DW: 'chip--neutral',
  FLDW: 'chip--neutral chip--flashing',
}

/**
 * Renders a single signal-indication code (G, Y, R, WK, DW, FLDW, or a
 * compound like 'G/<-G') the way a phasing diagram would: color carries the
 * vehicle aspect, flashing pedestrian codes get a hatched fill rather than a
 * plain color swap, matching how flashing intervals are drawn on a plan sheet.
 */
export default function IndicationChip({ code }) {
  const baseCode = code.split('/')[0].trim()
  const styleClass = STYLE_BY_BASE_CODE[baseCode] || 'chip--neutral'
  return <span className={`chip ${styleClass}`}>{code}</span>
}
