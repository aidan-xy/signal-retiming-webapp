import { useEffect, useState } from 'react'
import { MapPinned } from 'lucide-react'
import Header from './components/Header'
import MapView from './components/MapView'
import IntersectionDrawer from './components/IntersectionDrawer'
import TimespaceMapView from './components/TimespaceMapView'
import { resolveDataSource } from './api'
import { placeIntersections } from './utils/corridorPath'
import './App.css'

const DEFAULT_TS_SLOT_INDEX = 32 // 08:00

export default function App() {
  const [dataSource, setDataSource] = useState(null)
  const [corridor, setCorridor] = useState(null)
  const [intersections, setIntersections] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [page, setPage] = useState('map') // 'map' | 'timespace'

  // ---- timespace state, shared by the map overlay and the table page so
  // switching between them shows the same day/time/measurement instead of
  // each view keeping (and losing) its own -------------------------------
  const [tsDayType, setTsDayType] = useState('weekday')
  const [tsSlotIndex, setTsSlotIndex] = useState(DEFAULT_TS_SLOT_INDEX)
  const [tsMeasurementKey, setTsMeasurementKey] = useState('offset_s')
  const [tsOn, setTsOn] = useState(false) // whether the overlay/highlight is active, shared so toggling it on the map also (de)highlights the table's column, and vice versa
  const [tsGrid, setTsGrid] = useState(null)
  const [tsGridStatus, setTsGridStatus] = useState('idle') // idle | loading | ready | error

  // 'existing' (as-built) or 'proposed'. Shared by the header toggle, the
  // map view's timespace overlay, and the timespace table -- all three
  // should show the same scenario at once rather than drifting.
  const [scenario, setScenario] = useState('existing')

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

  // Single fetch for both consumers -- re-runs when the day type or scenario
  // changes, not on every page switch or slider drag.
  useEffect(() => {
    if (!dataSource) return
    let cancelled = false
    setTsGridStatus('loading')
    dataSource
      .getTimespace(tsDayType, scenario)
      .then((data) => {
        if (cancelled) return
        setTsGrid(data)
        setTsGridStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setTsGridStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [dataSource, tsDayType, scenario])

  const timespaceShared = {
    dayType: tsDayType,
    onDayTypeChange: setTsDayType,
    slotIndex: tsSlotIndex,
    onSlotIndexChange: setTsSlotIndex,
    measurementKey: tsMeasurementKey,
    onMeasurementKeyChange: setTsMeasurementKey,
    timespaceOn: tsOn,
    onTimespaceOnChange: setTsOn,
    grid: tsGrid,
    gridStatus: tsGridStatus,
    scenario,
  }

  return (
    <div className="app">
      <Header
        corridor={corridor}
        dataSourceLabel={dataSource?.label}
        intersectionCount={intersections.length}
        page={page}
        onPageChange={status === 'ready' ? setPage : undefined}
        scenario={scenario}
        onScenarioChange={setScenario}
      />

      {page === 'timespace' && status === 'ready' && dataSource && (
        <main className="app__body app__body--timespace">
          <TimespaceMapView {...timespaceShared} />
        </main>
      )}

      {page === 'map' && (
        <main className="app__body">
          <div className="app__map">
            {status === 'ready' && (
              <MapView
                intersections={intersections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                {...timespaceShared}
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
                scenario={scenario}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div className="app__panel-hint">
                <MapPinned size={28} strokeWidth={1.5} />
                <p>
                  Select an intersection marker to view its{' '}
                  {scenario === 'proposed' ? 'proposed' : 'existing'} signal timing.
                </p>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
