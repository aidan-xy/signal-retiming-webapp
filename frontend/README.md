# Signal Timing Frontend

React (JavaScript) + Vite frontend for the signal_api backend. A map of
corridor intersections; clicking a marker opens a tabbed panel with that
intersection's existing signal timing, laid out the way the source workbook
is: a phasing grid (splits × channels → G/Y/R/WK/DW/FLDW) and a timing-plan
matrix (splits × plans → durations).

## Setup

```bash
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your running signal_api
npm run dev
```

Open `http://localhost:5173`.

If the API in `VITE_API_BASE_URL` isn't reachable (e.g. no backend running
yet), the app automatically falls back to a small built-in sample dataset —
6 intersections along Linden Blvd with realistic channels, phase groups,
splits, and two timing plans each — so the UI is always explorable. A badge
in the header shows whether you're looking at "live data" or "sample data".

```bash
npm run build      # production build -> dist/
npm run preview    # serve the production build locally
```

## How markers get their position

`schema.sql`'s `intersections` table has no lat/lon columns, so there's
nowhere for the API to report exact coordinates yet. `utils/corridorPath.js`
places markers by interpolating along an approximate path of Linden Blvd
through Brooklyn, in `natural_order`. It's good enough to browse a corridor
visually, but isn't survey-accurate. To get real pin placement:

1. Add `latitude`/`longitude` columns to `intersections` in `schema.sql`.
2. Return them from `GET /intersections` / the intersection detail
   endpoint in the backend.
3. `client.js`'s `getIntersections()` already passes through whatever
   `lat`/`lon` it's given — `corridorPath.js` only fills in gaps.

## Structure

```
src/
  api/
    client.js       real fetch client for signal_api
    mockData.js      built-in sample corridor (same shape as the API)
    index.js         picks client vs mockData based on a /health check
  components/
    Header.jsx        top bar: corridor name, borough, live/sample badge
    MapView.jsx        Leaflet map, numbered markers, corridor route line
    IndicationChip.jsx signal-code chip (color = aspect, hatch = flashing)
    IntersectionDrawer.jsx  side panel: tab nav + loading/error states
    tabs/
      OverviewTab.jsx      crosswalk widths, provenance, counts
      ChannelsTab.jsx      load-switch channel table
      PhasingTab.jsx       phase-group bands × channels indication grid
      TimingPlansTab.jsx   splits × plans duration matrix
  utils/
    corridorPath.js  fallback marker placement (see above)
  App.jsx / App.css   layout: map + drawer, responsive to a full-screen
                       sheet under 860px
  index.css           design tokens (color, type) and global resets
```

## Design direction

Civil-engineering plan-sheet aesthetic rather than a generic app look: ink
navy header, condensed display type for labels, monospace for every number
that comes off the controller (split numbers, channel numbers, durations,
cycle/offset). The one place color carries real information is the signal
indication chips — green/amber/red for vehicle aspects, a hatched fill for
flashing pedestrian intervals — the same way a phasing diagram would draw it
on an actual plan sheet.

## Verified

- `npm run build` completes cleanly.
- Exercised end-to-end against a live signal_api instance (Postgres 16,
  real `schema.sql`, seeded data): corridor/intersection fetch, the
  channels/splits/phasing grid, and the `/timing` pivot into a duration
  matrix all render correct data, including CORS from the Vite dev origin.
- Sample-data fallback verified independently (6 intersections, indication
  grids, and per-plan durations that sum to each plan's cycle length).
