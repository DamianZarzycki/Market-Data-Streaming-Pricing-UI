# Backend gaps — System Overview

Frontend System Overview is wired to be **future-proof**: missing fields render as `—`, missing services show `UNKNOWN`, and monitoring downtime does not crash the page. When you extend the BE, the FE already reads the shapes below (see `frontend/src/services/monitoringTypes.ts` + `normalizeMonitoringStatus`).

## Current BE reality (as of FE implementation)

| Piece | Status |
| --- | --- |
| `monitoring-service` in `docker-compose.yml` | Enabled · mounts `./shared` · probes current ports |
| `GET /monitoring/status` | Flat map only: `{ "<service>": { status, last_checked, response_time_ms?, error? } }` |
| `GET /monitoring/status-stream` | Listed in FE `endpoints.ts` but **not implemented** in BE |
| Postgres probe | Worker calls postgres but **does not include it** in `health_cache` |
| Monitoring self-entry | **Not** in `health_cache` (FE synthesizes a Monitoring card from `/status` reachability) |

### Services present in today’s probe map

- `market-data-service`
- `pricing-service`
- `trade-generation-service`
- `trade-action-service`
- `book-service`
- `blotter-service`

---

## What FE expects next (optional envelope)

Prefer evolving `GET /status` toward:

```json
{
  "services": {
    "market-data-service": {
      "status": "UP",
      "last_checked": "2026-08-05T12:32:08.123Z",
      "response_time_ms": 18,
      "errors_5m": 1,
      "last_event": "tick",
      "last_event_at": "2026-08-05T12:32:06.000Z",
      "message": "Streaming normally",
      "summary": "Streaming normally",
      "latency_p50_ms": 18,
      "latency_p99_ms": 64,
      "ticks_per_min": 1240,
      "alerts": [
        {
          "severity": "WARN",
          "message": "Reconnect after brief gap",
          "time": "2026-08-05T12:30:12.000Z"
        }
      ]
    }
  },
  "environment": {
    "status": "DEGRADED",
    "message": "Attention needed · monitoring heartbeat delayed",
    "services_up": 6,
    "services_total": 7,
    "data_window": "last 5 min",
    "errors_5m": 3,
    "errors_by_service": {
      "pricing-service": 2,
      "market-data-service": 1
    },
    "last_market_tick": "2026-08-05T12:32:06.000Z",
    "last_market_tick_symbol": "AAPL",
    "last_market_tick_detail": "AAPL OPTION · 2s ago",
    "last_valuation": "2026-08-05T12:32:05.000Z",
    "last_valuation_detail": "Portfolio mark · 3s ago"
  },
  "kpis": {
    "realized_pnl": 128450.2,
    "unrealized_pnl": -12310.4,
    "active_trades": 142,
    "books": 8,
    "errors_5m": 3,
    "errors_detail": "2 pricing · 1 market data",
    "last_market_tick": "2026-08-05T12:32:06.000Z",
    "last_market_tick_detail": "AAPL OPTION · 2s ago",
    "last_valuation": "2026-08-05T12:32:05.000Z",
    "last_valuation_detail": "Portfolio mark · 3s ago"
  },
  "alerts": []
}
```

**Backward compatible:** FE still accepts today’s flat service map (no `services` / `environment` / `kpis` wrapper).

---

## Gaps to implement on BE (checklist)

### Monitoring service

1. **Enable in docker-compose** and expose behind the gateway as `/api/monitoring/*`.
2. **Include `monitoring-service` (self)** in the status payload (or document that FE synthesizes it).
3. **Decide on postgres** — include as a dependency card/entry or drop the unused probe.
4. **Per-service enrichment** (any subset is fine; FE shows `—` until present):
   - `errors_5m`
   - `last_event` / `last_event_at`
   - `message` / `summary` (plain-language footer)
   - `latency_p50_ms` / `latency_p99_ms`
   - `ticks_per_min` / `throughput_per_min`
   - `alerts[]` (`severity`/`level`, `message`, `time`/`created_at`)
5. **Environment rollup** (`environment.*`) for the status toolbar + Insights drawer “Last 5 minutes”.
6. **KPI rollup** (`kpis.*`) so Overview does not have to scrape blotter for PnL / counts.
7. **`GET /status-stream` (SSE)** — FE currently polls every 2s; stream would replace that (endpoint already reserved in FE).
8. **Stale / DEGRADED semantics** — today FE marks STALE if `last_checked` is older than ~90s or status is `DEGRADED`/`STALE`. Align BE tokens with that (`UP` | `DOWN` | `DEGRADED` | `STALE` | `LIVE`).

### Related services (nice-to-have for KPIs)

9. **Canonical active-trade count** — today FE uses `GET /blotter/trades?status=ACTIVE&limit=500` (capped; not exact if >500).
10. **Portfolio PnL summary endpoint** — today FE sums `realized_pnl` / `unrealized_pnl` from `GET /blotter/books/summary`.
11. **Last market tick / last valuation timestamps** — nowhere to read today; KPIs stay `—` until `environment`/`kpis` (or dedicated endpoints) provide them.
12. **Error aggregation window (5m)** — not available; Errors KPI / drawer stats stay `—`.

---

## What FE already covers without BE changes

- Status toolbar derived from probe UP/DOWN (+ STALE heuristic)
- Service cards for the 7 catalog services (6 from map + Monitoring from reachability)
- Card select → right drawer with static “What this means” + available vitals
- `Open →` navigates to the service route
- PnL / books / active-trade KPIs from blotter when monitoring KPIs are absent
- Soft error banner if monitoring is down; page remains usable

## Code pointers

- FE types: `frontend/src/services/monitoringTypes.ts`
- FE client: `frontend/src/services/monitoringService.ts`
- View: `frontend/src/views/SystemOverview/`
- BE today: `backend/services/monitoring-service/{app,worker}.py`
