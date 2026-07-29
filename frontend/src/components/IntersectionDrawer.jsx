import { useEffect, useState } from 'react'
import { X, MapPin } from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import ChannelsTab from './tabs/ChannelsTab'
import PhasingTab from './tabs/PhasingTab'
import TimingPlansTab from './tabs/TimingPlansTab'
import './IntersectionDrawer.css'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'channels', label: 'Channels' },
  { key: 'phasing', label: 'Phasing' },
  { key: 'timing', label: 'Timing Plans' },
]

export default function IntersectionDrawer({ intersectionId, dataSource, onClose }) {
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setActiveTab('overview')

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

  return (
    <aside className="drawer" role="dialog" aria-label="Intersection detail">
      <div className="drawer__header">
        <div className="drawer__title">
          <MapPin size={16} className="drawer__pin" />
          <div>
            <h2>{detail ? detail.intersection.name : 'Loading…'}</h2>
            {detail && <span className="drawer__subtitle">{detail.intersection.tab_name}</span>}
          </div>
        </div>
        <button className="drawer__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {status === 'loading' && <div className="drawer__state">Reading timing data…</div>}

      {status === 'error' && (
        <div className="drawer__state drawer__state--error">
          Couldn't load this intersection's timing data. Try selecting it again.
        </div>
      )}

      {status === 'ready' && detail && (
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

          <div className="drawer__body">
            {activeTab === 'overview' && (
              <OverviewTab
                intersection={detail.intersection}
                channels={detail.channels}
                splits={detail.splits}
                plans={detail.plans}
              />
            )}
            {activeTab === 'channels' && <ChannelsTab channels={detail.channels} />}
            {activeTab === 'phasing' && (
              <PhasingTab channels={detail.channels} splits={detail.splits} />
            )}
            {activeTab === 'timing' && (
              <TimingPlansTab splits={detail.splits} plans={detail.plans} />
            )}
          </div>
        </>
      )}
    </aside>
  )
}
