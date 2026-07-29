import { useEffect, useState } from 'react'
import { MapPinned } from 'lucide-react'
import Header from './components/Header'
import MapView from './components/MapView'
import IntersectionDrawer from './components/IntersectionDrawer'
import { resolveDataSource } from './api'
import { placeIntersections } from './utils/corridorPath'
import './App.css'

export default function App() {
  const [dataSource, setDataSource] = useState(null)
  const [corridor, setCorridor] = useState(null)
  const [intersections, setIntersections] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false

    resolveDataSource()
      .then(async (source) => {
        const [corridorData, intersectionList] = await Promise.all([
          source.getCorridor(),
          source.getIntersections(),
        ])
        if (cancelled) return
        setDataSource(source)
        setCorridor(corridorData)
        setIntersections(placeIntersections(intersectionList))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app">
      <Header
        corridor={corridor}
        dataSourceLabel={dataSource?.label}
        intersectionCount={intersections.length}
      />

      <main className="app__body">
        <div className="app__map">
          {status === 'ready' && (
            <MapView
              intersections={intersections}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {status === 'loading' && <div className="app__status">Loading corridor…</div>}
          {status === 'error' && (
            <div className="app__status app__status--error">
              Couldn't load corridor data.
            </div>
          )}
        </div>

        <div className={`app__panel ${selectedId ? 'is-open' : ''}`}>
          {selectedId ? (
            <IntersectionDrawer
              intersectionId={selectedId}
              dataSource={dataSource}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="app__panel-hint">
              <MapPinned size={28} strokeWidth={1.5} />
              <p>Select an intersection marker to view its existing signal timing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
