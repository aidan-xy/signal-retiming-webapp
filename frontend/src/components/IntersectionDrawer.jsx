import { useEffect, useMemo, useState } from 'react'
import { X, MapPin, Maximize2, Minimize2 } from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import ChannelsTab from './tabs/ChannelsTab'
import PhasingTab from './tabs/PhasingTab'
import TimingPlansTab from './tabs/TimingPlansTab'
import PhasingTimingTable from './tabs/PhasingTimingTable'
import './IntersectionDrawer.css'

// Collapsed (sidebar) mode: one tab at a time.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'channels', label: 'Channels' },
  { key: 'phasing', label: 'Phasing' },
  { key: 'timing', label: 'Timing Plans' },
]

// Expanded mode: phasing and timing plans merge into one section so their
// interval rows sit side by side instead of repeating in two tables.
const EXPANDED_SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'channels', label: 'Channels' },
  { key: 'phasing-timing', label: 'Phasing & Timing Plans' },
]

export default function IntersectionDrawer({ intersectionId, dataSource, onClose }) {
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [activeTab, setActiveTab] = useState('overview')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setActiveTab('overview')
    setIsExpanded(false)

    dataSource
      .getIntersectionDetail(intersectionId)
      .then((data) => {
        if (cancelled) return
        setDetail(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [intersectionId, dataSource])

  // Escape collapses the expanded view first, then closes the drawer -- so
  // one key always does the least-destructive thing.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return
      if (isExpanded) setIsExpanded(false)
      else onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, onClose])

  // Channels with no assigned street class are unused/unlabeled slots in the
  // workbook -- not meaningful to show in the UI.
  const visibleChannels = useMemo(
    () => (detail ? detail.channels.filter((ch) => ch.movement_class != null) : []),
    [detail]
  )

  function renderTab(key) {
    if (!detail) return null
    switch (key) {
      case 'overview':
        return (
          <OverviewTab
            intersection={detail.intersection}
            channels={visibleChannels}
            splits={detail.splits}
            plans={detail.plans}
          />
        )
      case 'channels':
        return <ChannelsTab channels={visibleChannels} />
      case 'phasing':
        return <PhasingTab channels={visibleChannels} splits={detail.splits} />
      case 'timing':
        return <TimingPlansTab splits={detail.splits} plans={detail.plans} />
      default:
        return null
    }
  }

  function renderExpandedSection(key) {
    if (!detail) return null
    switch (key) {
      case 'overview':
        return (
          <OverviewTab
            intersection={detail.intersection}
            channels={visibleChannels}
            splits={detail.splits}
            plans={detail.plans}
          />
        )
      case 'channels':
        return <ChannelsTab channels={visibleChannels} />
      case 'phasing-timing':
        return (
          <PhasingTimingTable
            channels={visibleChannels}
            splits={detail.splits}
            plans={detail.plans}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {isExpanded && <div className="drawer-backdrop" onClick={() => setIsExpanded(false)} />}

      <aside
        className={`drawer ${isExpanded ? 'drawer--expanded' : ''}`}
        role="dialog"
        aria-label="Intersection detail"
        aria-modal={isExpanded || undefined}
      >
        <div className="drawer__header">
          <div className="drawer__title">
            <MapPin size={16} className="drawer__pin" />
            <div>
              <h2>{detail ? detail.intersection.name : 'Loading…'}</h2>
              {detail && <span className="drawer__subtitle">{detail.intersection.tab_name}</span>}
            </div>
          </div>
          <div className="drawer__header-actions">
            {status === 'ready' && (
              <button
                className="drawer__icon-btn"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? 'Collapse to sidebar' : 'Expand to full page'}
                title={isExpanded ? 'Collapse to sidebar' : 'Expand — view all tabs at once'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button className="drawer__icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {status === 'loading' && <div className="drawer__state">Reading timing data…</div>}

        {status === 'error' && (
          <div className="drawer__state drawer__state--error">
            Couldn't load this intersection's timing data. Try selecting it again.
          </div>
        )}

        {status === 'ready' && detail && !isExpanded && (
          <>
            <nav className="drawer__tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`drawer__tab ${activeTab === tab.key ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="drawer__body">{renderTab(activeTab)}</div>
          </>
        )}

        {status === 'ready' && detail && isExpanded && (
          <>
            <nav className="drawer__jumplinks">
              {EXPANDED_SECTIONS.map((section) => (
                <a key={section.key} href={`#section-${section.key}`} className="drawer__jumplink">
                  {section.label}
                </a>
              ))}
            </nav>

            <div className="drawer__body drawer__body--expanded">
              <div className="drawer__sections">
                {EXPANDED_SECTIONS.map((section) => (
                  <section
                    key={section.key}
                    id={`section-${section.key}`}
                    className={`drawer__section ${
                      section.key === 'phasing-timing' ? 'drawer__section--wide' : ''
                    }`}
                    aria-labelledby={`heading-${section.key}`}
                  >
                    <h3 id={`heading-${section.key}`} className="drawer__section-title">
                      {section.label}
                    </h3>
                    {renderExpandedSection(section.key)}
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
