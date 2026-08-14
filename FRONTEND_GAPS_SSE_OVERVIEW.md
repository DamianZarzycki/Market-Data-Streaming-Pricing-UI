Where it will struggle at scale
No virtualization — tables still mount every visible row in the DOM
Pricing rows are unbounded — mergeValuationRows keeps growing with every trade; no max like market data
Main-thread EventSource — every frame is parsed/JSON’d on the UI thread; no worker / backpressure
Extra render churn — each market batch often triggers several setStates (rows + history + counters), plus a 1s nowMs tick that re-filters/sorts for LIVE/STALE
Blotter only patches the loaded page — fine for UX, but “large amount of data” isn’t held or virtualized client-side

Verdict
Fine for dozens–low hundreds of instruments/trades updating often. Not ready for thousands of live rows or huge payloads without virtualization, stricter caps (especially pricing), and less per-tick React work.