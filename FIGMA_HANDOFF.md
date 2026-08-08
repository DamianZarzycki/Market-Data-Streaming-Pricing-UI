# Handoff — Trading UI Figma wireframes

Use this as an entry prompt when starting a new chat.

## Context

We are building the **Trading UI** frontend (`trading-infra/frontend`) as a dark, data-dense operational dashboard for market data, pricing, books, blotter, etc. Stack: React 18 + TypeScript + Vite + Tailwind CSS v4. Design tokens live in `frontend/src/styles/tailwind.css` (`@theme`) and are documented in `frontend/README.md`.

**Repo note:** `frontend/` is a **git submodule** of `trading-infra` → remote `Market-Data-Streaming-Pricing-UI`. Commit UI work inside `frontend/`, push, then bump the submodule pointer in the parent.

**Figma file (source of truth for wireframes):**  
https://www.figma.com/design/Z5OTz13wzsrUqQ7h2UQ0Xn  
*(Trading UI — Blotter Wireframes)*

Plan: Pro Full seat. Figma MCP server: `plugin-figma-figma`. Always load `figma-use` (+ `figma-generate-design` / `figma-generate-library` when relevant) before `use_figma`.

## What we’re doing

1. **Wireframes / hi-fi dark mockups in Figma** — same layout motif across views
2. **Implement React views** from those designs (SSE streams where applicable, avoid uncontrolled re-renders on high-frequency ticks)
3. Keep Figma variables in sync with `@theme` in `tailwind.css`
4. Compose new screens from **reusable workspace shells** (do not copy-paste grid/drawer chrome)

## What’s done in Figma

### Design system (variables)

Collections already created and bound on screens:

- **Color** (Dark): bg `#0e1116`, surface `#161b22`, surface-alt `#1c2330`, border `#2a313c`, text `#e6edf3`, text-muted `#8b949e`, accent `#3b82f6`, accent-strong `#2563eb`, live `#22c55e`, stale `#f59e0b`, error `#ef4444`, positive `#22c55e`, negative `#ef4444`
- **Spacing** space/1–6 (4–32px), **Radius** 8px, **Typography** Inter + JetBrains Mono sizes, **Layout** topbar 56 / sidebar 220 / side drawer 340 (`--spacing-side-drawer`, `-sm` 280)

WEB code syntax maps to token names (e.g. `$color-bg` / `--color-bg`).

### Views wireframed

| View | Frames | Key UI |
| --- | --- | --- |
| **System Overview** | No Selection, Service Selected | Landing health view · status toolbar (HEALTHY/DEGRADED) · KPI strip (realized/unrealized PnL, active trades, books, errors 5m, last market tick, last valuation) · **microservice status cards** (latency, last event, errors, Open →) · right panel = **Environment Insights** (no selection) **or** selected service detail (What this means, technical vitals, recent alerts, quick links) · reusable `ServiceStatusCard` component |
| **Blotter** | Full, Filters collapsed, Drawer collapsed, Audit tab, Empty, Components strip | Filters · Live Trades table · right Trade drawer (details + pricing history / audit) |
| **Market Data** | Full, Empty selection, Drawer collapsed | SSE ticks table · filters (symbol, data class) · LIVE/STALE · ticks received · **line chart** last **100 ticks ≤ 5 min** in right panel |
| **Books** | Full, Empty selection, Modal Create, Modal Edit, Modal Delete | CRUD books · expected asset class dropdown · soft-delete with integrity block if active trades · right panel = **book-level PnL** (changes with selection) · shared Create/Edit modal |
| **Pricing** | Full, Insights Only (no selection) | SSE valuations table (fair value, unrealized, α/β, LIVE/STALE) · right panel = selected valuation + **Stream Insights**: most frequent updates, stale valuations, biggest PnL impact · “No row selected” is a **visible accent card** |
| **Trade Generation** | Running, Stopped | **Control panel** (center): POST `/start` `/stop`, GET `/generate-once` `/generate-batch`, poll GET `/status` · last API response · **Info drawer**: what it does, status, dependencies, API map · (Figma also has Confirm Config Update frames for a future `PUT /config`) |
| **Trade Action** | Healthy, Queue Pressure | Observability view for async pipeline **accept → queue → worker → DB** · KPIs: processed, errors, avg latency, rejected 400, overload 503, duplicates · **queue/buffer bar** (depth, capacity, backpressure) · **recent actions table** (OPEN/CLOSE, PROCESSED/REJECTED/DUPLICATE/ERROR/QUEUED) · last DB write · Info drawer: resilience (202/400/503, idempotency, FOR UPDATE), recent rejects, API map (`GET /health`, `GET /status`, `POST /trade-actions`, `/batch`) |
| **Monitoring** | Service Down, All Healthy | Same motif as Trade Action · status toolbar (DEGRADED/HEALTHY, UP count, DOWN count, avg latency) · KPIs from `health_cache` · **SSE connection status** strip · **probe results table** (exact BE keys: market-data / pricing / trade-generation / trade-action / book-service / blotter) with status, `response_time_ms`, `last_checked`, `error` · right drawer: what this means, technical vitals, SSE, status history, API map (`GET /health`, `GET /status`) |

## What’s implemented in React

| View | Status | Notes |
| --- | --- | --- |
| **Blotter** | Done | Live trades + pricing SSE (`useBlotterLiveValuations`, 100ms coalesce) · filters as **selects** (Book / Asset Class / Status, each with All) · summary MetricStrip · `TradeDrawer` (details + audit) |
| **Market Data** | Done | Market SSE (`useMarketDataStream`, 100ms coalesce) · **latest-per-symbol** table · filters: symbol search, data-class select, rows **5/25/50** · LIVE/STALE (~20s) · currency on price · right drawer + **lightweight-charts** history (100 pts / 5 min) · drawer scrollbar visually hidden (`scrollbar-none`) |
| **Trade Generation** | Done | Status toolbar (poll `GET /status` 2s) · control panel: `POST /start` `/stop`, `GET /generate-once` `/generate-batch` · last API response · info drawer (deps + API map) · no local/mock config (no `/config` API) |
| **Trade Action** | Done | Status toolbar (HEALTHY/PRESSURE, queue, throughput, worker) · KPI strip · queue fill bar · recent actions table · info drawer (resilience, rejects, API map) · polls `GET /status` + `/health` |
| **System Overview** | Done | Status toolbar · KPI strip (blotter fallbacks) · service cards + select · Environment Insights / selected-service drawer · polls `GET /monitoring/status` 2s · graceful if monitoring down · BE gaps: `BACKEND_GAPS_SYSTEM_OVERVIEW.md` |
| **Books** | Done | Toolbar (+ New book, class select, search) · books table · Create/Edit/Delete modals · soft-delete blocked when active trades · right drawer book details + PnL from blotter summary · alpha/beta `—` until BE provides |
| **Pricing** | Done | Live valuations via pricing SSE (`usePricingValuationStream`, 100ms coalesce) · filters as selects (Book / Asset Class / Status LIVE|STALE) · summary MetricStrip (updates, live, stale, Σ unrealized) · right drawer: selected valuation + Stream Insights (frequent / stale / biggest PnL) · accent “No row selected” card · book α/β from `GET /book-metrics` (polled 5s) |
| **Monitoring** | Done | Status toolbar (HEALTHY/DEGRADED) · KPI strip from `health_cache` · SSE strip inferred from market-data + pricing probes (not EventSource / no `/status-stream`) · probe results table · drawer (what this means, vitals, SSE, client-derived UP↔DOWN history, API map) · polls `GET /status` + `/health` every 2s |

### Reusable workspace shells (use these for new views)

Do **not** re-copy grid / collapse chrome. Compose from `frontend/src/components/layout/`:

| Component | Role |
| --- | --- |
| `WorkspaceLayout` | Page grid: top filters + main panel + right drawer (`--spacing-side-drawer`) |
| `FilterBar` | Collapsible filter strip (▸/▾ + optional Clear actions slot) |
| `PanelHeader` | Title, description, actions (Refresh, stream StatusPill) |
| `MetricStrip` | Compact KPI/summary row (shared Blotter + Market Data) |
| `InlineAlert` | Error banner + Retry |
| `SideDrawer` | Collapsible right panel chrome (title / subtitle / trailing / body) |

Also:


- `frontend/src/lib/streamStatus.ts` — shared `streamTone` / `streamLabel` for SSE pills
- `frontend/src/components/ui/` — `Button`, `Field`/`Select`, `StatusPill`, `pnlClass`
- Domain filters/drawers stay **view-specific** (`BlotterFilters`, `MarketDataFilters`, `TradeDrawer`, `MarketDataDrawer`) but wrap the shared chrome

Typical composition:

```tsx
<WorkspaceLayout
  filters={<…Filters wrapped in FilterBar… />}
  main={
    <>
      <PanelHeader … />
      <InlineAlert … />      {/* optional */}
      <…SummaryBar using MetricStrip… />
      <Table … />
    </>
  }
  drawer={<…Drawer wrapping SideDrawer… />}
  drawerCollapsed={…}
/>
```

## Wireframe principles (must follow)

1. **Same page chrome everywhere:** TopBar (56) + Sidebar (220, active nav highlighted) + content
2. **Same main motif:** optional top filters/toolbar → center workspace (header + optional summary metrics + **data table or status cards**) → **right contextual panel (~340–360px)** that updates with row/card selection — implement via `WorkspaceLayout` + shells above
3. **Dark theme only** — bind fills/strokes/text to Figma Color variables; no greyscale “temp” mocks for new screens
4. **Status pills:** LIVE = green, STALE = amber, errors/destructive = red; PnL green/red
5. **Typography:** Inter for UI; tabular/mono feel for numbers; MetricStrip stays compact (`text-base` values) for 1080p
6. **No decorative emoji** in production-looking UI
7. **Empty / collapsed / modal states** as separate frames when behavior differs
8. **Data shape should match backend** (SSE payloads from market-data `/stream`, pricing `/valuation-stream`, books API soft-delete, blotter book PnL; trade-generation control via `/start` `/stop` `/status` `/generate-once` `/generate-batch` — **no** `/config` today; trade-action observability via `GET /status` + `/health`)
9. **High-frequency streams:** throttle/batch UI updates (see blotter/market-data hooks — ~100ms coalesce; do not re-render the whole app per tick)
10. **Dual audience:** System Overview (and similar ops screens) should pair plain-language summaries with technical vitals so both non-technical and technical users can scan and act
11. **Control vs info split:** for operable services (Trade Generation), center = actions the API supports; right panel = explainers / deps / API map. Do not ship editable UI backed by mock/local-only values when the API does not exist yet
12. **Filters default to selects** (All + options), not checkbox lists — match Blotter / Market Data

## Useful code pointers

- Tokens: `frontend/src/styles/tailwind.css`
- Routes/nav: `frontend/src/routes/`
- Layout shells: `frontend/src/components/layout/`
- SSE helpers: `frontend/src/services/sseClient.ts`, `frontend/src/hooks/useBlotterLiveValuations.ts`, `frontend/src/hooks/useMarketDataStream.ts`, `frontend/src/hooks/useSseStream.ts` (generic buffer — prefer coalesce hooks for live tables)
- Endpoints: `frontend/src/services/endpoints.ts`
- Reference implementations: `frontend/src/views/BlotterView/`, `frontend/src/views/MarketDataView/`
- System Overview: `frontend/src/views/SystemOverview/`, `frontend/src/services/monitoringService.ts` · BE gaps doc `frontend/BACKEND_GAPS_SYSTEM_OVERVIEW.md`
- Books: `frontend/src/views/BooksView/`, `frontend/src/services/booksService.ts`
- Pricing: `frontend/src/views/PricingView/`, `frontend/src/services/pricingService.ts` · BE `/valuation-stream`, `/valuations`, `/book-metrics`, `/health`
- Monitoring: `frontend/src/views/MonitoringView/`, reuses `monitoringService.ts` · BE `GET /status` + `/health` only
- Trade Generation: `frontend/src/views/TradeGenerationView/`, `frontend/src/services/tradeGenerationService.ts`
- Trade Action: `frontend/src/views/TradeActionView/`, `frontend/src/services/tradeActionService.ts` · BE `GET /status` + bounded queue (`TRADE_ACTION_QUEUE_MAXSIZE`)

## Suggested next steps

- Optional polish / backend follow-ups:
  - System Overview enrichment: see `BACKEND_GAPS_SYSTEM_OVERVIEW.md` (enable monitoring in compose, environment/kpis envelope, alerts, status-stream)
  - Trade Generation: add `GET/PUT /config` if runtime tuning should be editable in the UI; align compose `TRADE_GENERATION_INTERVAL_MS` with worker `TICK_INTERVAL_MS`

When continuing: open the Figma file above, match existing frame naming (`{Service} — {State}`), reuse Color variables, and keep table/cards + right-panel layout consistent with the shared shells.
