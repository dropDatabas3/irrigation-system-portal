# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Performance and memory improvements
- Throttle MongoDB writes for `status` events: persist only on change or every 60s; always persist `result`, `config-ack`, and `lwt`.
- Add paginated `GET /api/history` with filters (type, valve, from, to, q) and cap `pageSize` to 100; maintain `limit` compatibility.
- Update `HistoryTable` to consume paginated API with `AbortController` to cancel in-flight requests when filters change.
- Batch SSE UI updates in `useEvents` (flush every ~150ms) and ignore keepalive `ping` events to reduce re-renders.
- Render charts on client via dynamic imports to avoid server-side Recharts overhead; added client-only wrapper `MetricsChartsClient`.
- Gate `valve-grid` UI tick: only while a valve is running, slower 2000ms interval.

### Developer notes
- README updated with performance notes and MQTT scaling guidance.
