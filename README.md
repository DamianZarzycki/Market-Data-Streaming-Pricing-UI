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
