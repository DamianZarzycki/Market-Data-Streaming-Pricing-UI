# Backend gaps — System Overview

Frontend System Overview is wired to be **future-proof**: missing fields render as `—`, missing services show `UNKNOWN`, and monitoring downtime does not crash the page. Shapes live in `frontend/src/services/monitoringTypes.ts` + `normalizeMonitoringStatus`.

## Current BE reality

| Piece | Status |
| --- | --- |
| `monitoring-service` in `docker-compose.yml` | Enabled · mounts `./shared` · probes current ports |
| `GET /monitoring/status` | **Envelope**: `{ services, environment, kpis, alerts }` |
| `environment` / `kpis` freshness | **Implemented** · `errors_5m`, `last_market_tick`, `last_valuation` (+ detail strings) |
| `GET /monitoring/status-stream` | Listed in FE `endpoints.ts` but **not implemented** in BE |
| Postgres probe | Not included in `services` map |
| Monitoring self-entry | **Not** in `services` (FE synthesizes a Monitoring card from `/status` reachability) |

### Services present in today’s probe map

- `market-data-service`
- `pricing-service`
- `trade-generation-service`
- `trade-action-service`
- `book-service`
- `blotter-service`

### How freshness KPIs are sourced

| KPI | Source |
| --- | --- |
| `last_market_tick` | `market-data-service` `/health` → `last_event_time` (+ `last_symbol` / `last_asset_type`) |
| `last_valuation` | `pricing-service` `/health` → `last_pricing_time` (+ symbol / asset class) |
| `errors_5m` | Sliding 5‑minute window of probe **DOWN transitions** (not every failed poll) |

---

## Status envelope shape

```json
{
  "services": {
    "market-data-service": {
      "status": "UP",
      "last_checked": "2026-08-05T12:32:08.123Z",
      "response_time_ms": 18,
      "errors_5m": 0,
      "last_event": "tick",
      "last_event_at": "2026-08-05T12:32:06.000Z",
      "summary": "Streaming normally"
    }
  },
  "environment": {
    "status": "HEALTHY",
    "message": "All probed services look healthy",
    "services_up": 6,
    "services_total": 6,
    "data_window": "last 5 min",
    "errors_5m": 0,
    "errors_by_service": {},
    "last_market_tick": "2026-08-05T12:32:06.000Z",
    "last_market_tick_symbol": "ACME",
    "last_market_tick_detail": "ACME EQUITY · 2s ago",
    "last_valuation": "2026-08-05T12:32:05.000Z",
    "last_valuation_detail": "ACME OPTION · 3s ago"
  },
  "kpis": {
    "errors_5m": 0,
    "errors_detail": null,
    "last_market_tick": "2026-08-05T12:32:06.000Z",
    "last_market_tick_detail": "ACME EQUITY · 2s ago",
    "last_valuation": "2026-08-05T12:32:05.000Z",
    "last_valuation_detail": "ACME OPTION · 3s ago"
  },
  "alerts": []
}
```

**Backward compatible:** FE still accepts a flat service map (no `services` / `environment` / `kpis` wrapper).

---

## Remaining gaps (optional)

### Monitoring service

1. **Include `monitoring-service` (self)** in the status payload (or keep FE synthesis).
2. **Decide on postgres** — include as a dependency card/entry or drop unused probe ideas.
3. **Per-service enrichment** still optional: `latency_p50_ms` / `latency_p99_ms`, `ticks_per_min`, richer `alerts[]`.
4. **`GET /status-stream` (SSE)** — FE currently polls every 2s; stream would replace that.
5. **KPI PnL / trade counts** — Overview still falls back to blotter for realized/unrealized PnL, active trades, and books (monitoring `kpis` does not yet include those).

### Related services

6. **Canonical active-trade count** — today FE uses `GET /blotter/trades?status=ACTIVE&limit=500` (capped).
7. **Portfolio PnL summary endpoint** — today FE sums blotter books summary.

---

## What FE already covers

- Status toolbar derived from probe UP/DOWN (+ STALE heuristic)
- Service cards for the 7 catalog services (6 from map + Monitoring from reachability)
- Card select → right drawer with static “What this means” + available vitals
- `Open →` navigates to the service route
- PnL / books / active-trade KPIs from blotter when monitoring KPIs omit them
- Soft error banner if monitoring is down; page remains usable

## Code pointers

- FE types: `frontend/src/services/monitoringTypes.ts`
- FE client: `frontend/src/services/monitoringService.ts`
- View: `frontend/src/views/SystemOverview/`
- BE: `backend/services/monitoring-service/{app,worker}.py`
