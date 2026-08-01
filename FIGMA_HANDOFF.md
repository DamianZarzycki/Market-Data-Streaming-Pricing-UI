# Handoff — Trading UI Figma wireframes

Use this as an entry prompt when starting a new chat.

## Context

We are designing the **Trading UI** frontend (`trading-infra/frontend`) in Figma before implementing React views. The app is a dark, data-dense operational dashboard for market data, pricing, books, blotter, etc. Stack: React 18 + TypeScript + Vite + Tailwind CSS v4. Design tokens live in `frontend/src/styles/tailwind.css` (`@theme`) and are documented in `frontend/README.md`.

**Figma file (source of truth for wireframes):**  
https://www.figma.com/design/Z5OTz13wzsrUqQ7h2UQ0Xn  
*(Trading UI — Blotter Wireframes)*

Plan: Pro Full seat. Figma MCP server: `plugin-figma-figma`. Always load `figma-use` (+ `figma-generate-design` / `figma-generate-library` when relevant) before `use_figma`.

## What we’re doing

1. **Wireframes / hi-fi dark mockups in Figma first** — same layout motif across views
2. Then implement React views from those designs (SSE streams where applicable, avoid uncontrolled re-renders on high-frequency ticks)
3. Keep Figma variables in sync with `@theme` in `tailwind.css`

## What’s done in Figma

### Design system (variables)

Collections already created and bound on screens:

- **Color** (Dark): bg `#0e1116`, surface `#161b22`, surface-alt `#1c2330`, border `#2a313c`, text `#e6edf3`, text-muted `#8b949e`, accent `#3b82f6`, accent-strong `#2563eb`, live `#22c55e`, stale `#f59e0b`, error `#ef4444`, positive `#22c55e`, negative `#ef4444`
- **Spacing** space/1–6 (4–32px), **Radius** 8px, **Typography** Inter + JetBrains Mono sizes, **Layout** topbar 56 / sidebar 220 / drawer 340

WEB code syntax maps to token names (e.g. `$color-bg` / `--color-bg`).

### Views wireframed

| View | Frames | Key UI |
| --- | --- | --- |
| **System Overview** | No Selection, Service Selected | Landing health view · status toolbar (HEALTHY/DEGRADED) · KPI strip (realized/unrealized PnL, active trades, books, errors 5m, last market tick, last valuation) · **microservice status cards** (latency, last event, errors, Open →) · right panel = **Environment Insights** (no selection) **or** selected service detail (What this means, technical vitals, recent alerts, quick links) · reusable `ServiceStatusCard` component |
| **Blotter** | Full, Filters collapsed, Drawer collapsed, Audit tab, Empty, Components strip | Filters · Live Trades table · right Trade drawer (details + pricing history / audit) |
| **Market Data** | Full, Empty selection, Drawer collapsed | SSE ticks table · filters (symbol, data class) · LIVE/STALE · ticks received · **line chart** last **100 ticks ≤ 5 min** in right panel |
| **Books** | Full, Empty selection, Modal Create, Modal Edit, Modal Delete | CRUD books · expected asset class dropdown · soft-delete with integrity block if active trades · right panel = **book-level PnL** (changes with selection) · shared Create/Edit modal |
| **Pricing** | Full, Insights Only (no selection) | SSE valuations table (fair value, unrealized, α/β, LIVE/STALE) · right panel = selected valuation + **Stream Insights**: most frequent updates, stale valuations, biggest PnL impact · “No row selected” is a **visible accent card** |
| **Trade Generation** | Running, Stopped, Confirm Config Update (overlay), Modal: Confirm Config Update | **Control panel** (center): POST `/start` `/stop`, GET `/generate-once` `/generate-batch`, poll GET `/status` · **Runtime config form** (interval, batch, OPEN/CLOSE %, qty min/max, price min/max) — each row = input + **Update** → **confirmation modal** (Cancel / Confirm update) · proposed `PUT /config` (not on backend yet) · last API response · **Info drawer**: what it does, status, dependencies, API map |
| **Trade Action** | Healthy, Queue Pressure | Observability view for async pipeline **accept → queue → worker → DB** · KPIs: processed, errors, avg latency, rejected 400, overload 503, duplicates · **queue/buffer bar** (depth, capacity, backpressure) · **recent actions table** (OPEN/CLOSE, PROCESSED/REJECTED/DUPLICATE/ERROR/QUEUED) · last DB write · Info drawer: resilience (202/400/503, idempotency, FOR UPDATE), recent rejects, API map (`POST /trade-actions`, `/batch`, `GET /health`) · metrics need instrumentation (no `/status` yet) |

Blotter React view is already implemented; System Overview / Market Data / Books / Pricing / Trade Generation / Trade Action frontend views are still placeholders.

## Wireframe principles (must follow)

1. **Same page chrome everywhere:** TopBar (56) + Sidebar (220, active nav highlighted) + content
2. **Same main motif:** optional top filters/toolbar → center workspace (header + optional summary metrics + **data table or status cards**) → **right contextual panel (~340–360px)** that updates with row/card selection
3. **Dark theme only** — bind fills/strokes/text to Figma Color variables; no greyscale “temp” mocks for new screens
4. **Status pills:** LIVE = green, STALE = amber, errors/destructive = red; PnL green/red
5. **Typography:** Inter for UI; tabular/mono feel for numbers
6. **No decorative emoji** in production-looking UI
7. **Empty / collapsed / modal states** as separate frames when behavior differs
8. **Data shape should match backend** (SSE payloads from market-data `/stream`, pricing `/valuation-stream`, books API soft-delete, blotter book PnL; trade-generation control via `/start` `/stop` `/status` `/generate-once` `/generate-batch` — **no** `/config` or `/events` SSE today)
9. **High-frequency streams:** designs assume throttled/batched UI updates (don’t imply full-app re-render per tick)
10. **Dual audience:** System Overview (and similar ops screens) should pair plain-language summaries with technical vitals so both non-technical and technical users can scan and act
11. **Control vs info split:** for operable services (Trade Generation), center = actions the API supports (or proposed API); right panel = explainers / deps / API map. Config edits that need a backend `/config` endpoint should still be designed with confirmation modals — flag “proposed” clearly when the API does not exist yet

## Useful code pointers

- Tokens: `frontend/src/styles/tailwind.css`
- Routes/nav: `frontend/src/routes/`
- SSE: `frontend/src/hooks/useSseStream.ts`, `frontend/src/services/endpoints.ts`
- Blotter reference UI: `frontend/src/views/BlotterView/`
- Placeholders: `SystemOverview`, `MarketDataView`, `BooksView`, `PricingView`, etc.

## Suggested next steps

- Continue remaining service view in Figma (**Monitoring**) with the same motif, **or**
- Start implementing wireframed views in React from the Figma frames (design-to-code)
- Optional backend follow-ups:
  - Trade Generation: `GET/PUT /config` (interval, batch size, open/close weights); align compose `TRADE_GENERATION_INTERVAL_MS` with worker `TICK_INTERVAL_MS`
  - Trade Action: expose queue depth / processed / reject / latency metrics (and set `queue.Queue(maxsize=…)` so 503 backpressure can actually fire); frontend stubs `/status` · `/events` do not exist yet

When continuing: open the Figma file above, match existing frame naming (`{Service} — {State}`), reuse Color variables, and keep table/cards + right-panel layout consistent.
