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

Click a marker to open the sidebar drawer with its four tabs (Overview,
Channels, Phasing, Timing Plans). The expand icon in the drawer header
switches to a wider, near-full-screen view with three sections stacked on
one scrollable page: Overview, Channels, and a merged **Phasing & Timing
Plans** table — phasing indications and per-plan durations share the same
interval rows instead of repeating Interval/Role/Phase in two separate
tables. A row of jump-links at the top scrolls to each section; the same
icon (now showing "collapse") returns to the sidebar. Esc collapses first,
then closes.

Channels with no assigned street class (an unused/unlabeled slot in the
source workbook) are filtered out everywhere — the Channels tab, the
phasing grid's columns, and the Overview channel count.

```bash
npm run build      # production build -> dist/
npm run preview    # serve the production build locally
```

## How markers get their position

`schema.sql`'s `intersections` table has no lat/lon columns, so the API
doesn't report coordinates directly. `utils/corridorCoordinates.js` carries
the real, surveyed lat/lon for all 30 Linden Blvd intersections, extracted
from NYCDOT's TO14 signal KMZ, keyed by cross-street name. `corridorPath.js`
places each marker in this order:

1. lat/lon already on the record, if the API ever adds real coordinate
   columns — see client.js.
2. A name match (`intersection.name`, then `tab_name`) against the real
   corridor data in `corridorCoordinates.js`.
3. Interpolation along that same real corridor path, only as a last resort
   for something that doesn't match — e.g. the mock dataset's "Rockaway
   Pkwy", which isn't part of the real 30-intersection corridor.

In practice, every real corridor intersection resolves via (2); (3) only
ever fires for the one made-up demo entry.

## Structure

```
src/
  api/
    client.js       real fetch client for signal_api
    mockData.js      built-in sample corridor (same shape as the API)
    index.js         picks client vs mockData based on a /health check
  components/
    Header.jsx         top bar: corridor name, borough, live/sample badge
    MapView.jsx         Leaflet map, numbered markers, corridor route line
    IndicationChip.jsx  signal-code chip (color = aspect, hatch = flashing)
    IntersectionDrawer.jsx  side panel: tab nav + loading/error states,
                             plus the expanded (near full-screen) layout
    tabs/
      OverviewTab.jsx        crosswalk widths, provenance, counts
      ChannelsTab.jsx        load-switch channel table
      PhasingTab.jsx         phase-group bands x channels indication grid
      TimingPlansTab.jsx     intervals x plans duration matrix
      PhasingTimingTable.jsx merged phasing+timing table for expanded mode
                              (shares interval rows instead of repeating them)
  utils/
    corridorCoordinates.js  real lat/lon for all 30 corridor intersections
                            (from the NYCDOT TO14 KMZ), keyed by name
    corridorPath.js   marker placement: real coords, then interpolation
                       fallback (see below)
    groupIntervals.js groups an intervals array into phase-group bands
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
- Real-coordinate lookup checked directly against the KMZ data (name and
  tab_name normalization both resolve correctly; a non-corridor demo name
  correctly falls through to interpolation instead of a false match).
- The Overview field-list overflow bug was reproduced with the original CSS
  (a long, underscore-joined value rendered ~800px past a 390px viewport,
  genuinely off-canvas) and confirmed fixed (same value now wraps within
  the row instead).
