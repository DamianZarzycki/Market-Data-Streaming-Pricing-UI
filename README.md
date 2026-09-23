# Trading UI — Frontend

Operational trading dashboard (Blotter, Market Data, Pricing, Books, Monitoring, and more) for the `trading-infra` platform. Dark, data-dense UI tuned for live market data, valuations, and PnL.

## Tech stack

- **React 18** + **TypeScript**
- **Vite 5** (dev server & build)
- **React Router 6** (routing)
- **Tailwind CSS v4** (Vite plugin) for styling and design tokens

## Getting started

```bash
npm install
npm run dev        # start Vite dev server (http://localhost:5173)
```

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and produce a production build |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting |

## Project structure

```
src/
├── App.tsx              # Route table (react-router)
├── main.tsx            # App entry
├── components/ui/      # Shared UI primitives (Button, StatusPill, Field…)
├── layout/             # AppShell, TopBar, Sidebar, DensityContext
├── lib/cn.ts           # className merge helper (clsx + tailwind-merge)
├── routes/             # route + sidebar navigation definitions
├── views/              # feature views (e.g. BlotterView/)
├── domain/             # shared TypeScript types
└── styles/
    └── tailwind.css    # Tailwind entry + @theme design tokens
```

## Live data and caches

The UI does **not** own the backend in-memory stores (`active_trades_cache`,
blotter `valuation_cache`, `health_cache`, market-data snapshot). Those live in
the Python services; see `backend/README.md` §8.

What the frontend does keep locally:

| View / module | What is cached | Notes |
| --- | --- | --- |
| **Blotter** (`useBlotterLiveValuations`) | Latest SSE valuation per `trade_id` in React state | Subscribes to pricing `/valuation-stream` (same stream blotter-service also consumes). Initial rows still come from blotter REST, which already attaches `latest_valuation` from the server cache. |
| **Pricing** (`usePricingValuationStream`) | Live valuation map keyed by trade | Same `/valuation-stream`; coalesced so the table is not redrawn per raw frame. |
| **Market Data** (`useMarketDataStream`) | Coalesced tick batches | Subscribes to market-data `/stream`. |
| **Books** (`pnlByBookId`) | Last fetched PnL / alpha / beta per book | Filled when a book is selected (blotter books + pricing `/book-metrics`). On fetch error the previous map is kept. |
| **SSE hub** (`workers/sharedSseHub.ts`) | Shared `EventSource` per URL | Not a data cache — tabs share one connection so Market Data, Blotter, and Pricing do not open duplicate streams. |

Trade Generation config is **not** polled. The control panel loads `GET /config`
on mount / manual refresh and applies `PUT /config` from the response. Worker
status (`is_running`, `total_generated`) is polled every 2s from `GET /status`.

### TODO — snapshot / SSE catch-up (gap-fill)

Views load REST **first**, then subscribe to SSE (`streamEnabled` after
`loading` clears). The SharedWorker fans out **future** frames only — it is
not an event buffer and does not replay. Snapshot responses have no
monotonic `version` / watermark used to filter the stream (Market Data
`event_id` exists on ticks but is not used as a cutoff). Merge is
last-write-wins by key (`instrumentKey` / `trade_id`).

Ticks that happen in the HTTP round-trip between snapshot serialization and
`subscribe` can be missed (sparkline history, per-tab KPI, blotter patch of
the loaded page). Last-value table cells usually self-heal on the next tick.

Intended fix (backend + frontend):

1. Subscribe to SSE first; queue incoming frames.
2. Fetch snapshot with a monotonic `version` (or `event_id` watermark).
3. Drop queued events with `version <= snapshot.version`; apply the rest in
   order.
4. Switch to live: every later frame goes straight into view state.

Needs the same version field on **both** the snapshot payload and each SSE
frame. Wall-clock timestamps are not a substitute.

## Design tokens

All design tokens live in [`src/styles/tailwind.css`](src/styles/tailwind.css) inside the `@theme` block. They generate Tailwind utilities such as `bg-surface`, `text-text-muted`, `border-border`, `text-positive`.

These same tokens are mirrored as **Figma variables** in the design file used for wireframing/mockups: [Trading UI — Blotter Wireframes](https://www.figma.com/design/Z5OTz13wzsrUqQ7h2UQ0Xn). Keep the two in sync — `@theme` is authoritative; update the Figma variables to match when tokens change.

### Colors

The UI ships a single **dark** theme.

| Token | Value | Role |
| --- | --- | --- |
| `--color-bg` | `#0e1116` | App background |
| `--color-surface` | `#161b22` | Panels / cards |
| `--color-surface-alt` | `#1c2330` | Headers, summary bar, nested cards, hover |
| `--color-border` | `#2a313c` | 1px borders & dividers |
| `--color-text` | `#e6edf3` | Primary text |
| `--color-text-muted` | `#8b949e` | Labels, subtitles, secondary text |
| `--color-accent` | `#3b82f6` | Links, active tab/nav, selection, focus |
| `--color-accent-strong` | `#2563eb` | Accent hover / pressed |
| `--color-live` | `#22c55e` | Live data-state pill |
| `--color-stale` | `#f59e0b` | Stale data-state pill |
| `--color-error` | `#ef4444` | Error data-state |
| `--color-positive` | `#22c55e` | Positive PnL |
| `--color-negative` | `#ef4444` | Negative PnL |

### Typography

| Token | Value |
| --- | --- |
| `--font-sans` | `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `"JetBrains Mono", "SFMono-Regular", Menlo, monospace` |
| `--text-sm` | `12px` |
| `--text-base` | `14px` |
| `--text-lg` | `18px` |
| `--text-xl` | `22px` |

Numeric/tabular data (prices, quantities, PnL) uses `font-mono tabular-nums`.

### Radius & layout

| Token | Value | Role |
| --- | --- | --- |
| `--radius` | `8px` | Default border radius (`rounded`) |
| `--spacing-topbar` | `56px` | Global top bar height |
| `--spacing-sidebar` | `220px` | Left navigation width |
| `--spacing-blotter-drawer` | `340px` | Blotter contextual drawer |
| `--spacing-blotter-drawer-sm` | `280px` | Drawer width below 1200px |

### Density

Table density (`compact` | `comfortable`) is managed by [`DensityContext`](src/layout/DensityContext.tsx) on the app shell and consumed by `TradesTable` via `useDensity()`.

### Conventions

- Prefer Tailwind utilities and shared primitives in `components/ui/` over one-off CSS.
- Never hardcode a hex, spacing, or radius value when a token exists.
- Semantic data-state colors (`live` / `stale` / `error`) drive status pills; PnL uses `positive` / `negative` via `pnlClass()`.
- When adding a token, update `@theme` in `tailwind.css` first, then mirror it into the Figma variable collection.
- Use `cn()` from `lib/cn.ts` for conditional class names.
