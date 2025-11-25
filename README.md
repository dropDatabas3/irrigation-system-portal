# Irrigation system portal

## Overview

Sistema completo de control de riego con ESP8266 y portal web Next.js.

**Características principales:**
- ✅ Control remoto vía MQTT (HiveMQ Cloud)
- ✅ Programación de riegos: diario, semanal, intervalo, personalizado
- ✅ **Riegos consecutivos**: 6 riegos cada 3 minutos
- ✅ **Resiliencia offline**: Funciona hasta 7 días sin Internet
- ✅ Auto-renovación de jobs cada 24 horas vía Cron
- ✅ Medición precisa por caudalímetro YF-S401C
- ✅ Almacenamiento persistente en MongoDB
- ✅ Dashboard en tiempo real con métricas y gráficos

**Documentación adicional:**
- 📘 [CRON_SETUP.md](./CRON_SETUP.md) - Configuración del sistema de auto-renovación
- 🧪 [CRON_TEST.md](./CRON_TEST.md) - Guía de testing del cron job
- 📝 [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios

---


## Server-side MQTT integration

This portal includes a small server-side MQTT client that connects to HiveMQ Cloud and exposes:

- POST `/api/cmd` to send commands to the device
- GET `/api/events` to stream live device events (status/result/lwt) via SSE

Setup steps:

1. Copy `.env.example` to `.env.local` and set your broker credentials.
  - HiveMQ Cloud: port 8883 with TLS (MQTT_USE_TLS=true), username/password required.
  - Local broker: set MQTT_USE_TLS=false and update host/port accordingly.
2. (Optional) Set `MONGODB_URI` and `DB_NAME` to persist configurations and history in MongoDB Atlas.
3. Start the dev server and open the dashboard.

API examples:

- Send 1.0 L on valve 1:

```json
POST /api/cmd
{ "action": "water", "valve": 1, "liters": 1.0 }
```

- Open valve 2 for 5 seconds:

```json
POST /api/cmd
{ "action": "openMs", "valve": 2, "ms": 5000 }
```

- Turn everything off:

```json
POST /api/cmd
{ "action": "alloff" }
```

- Subscribe to events from the browser:

```ts
const es = new EventSource('/api/events');
es.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log('event', msg);
};
```

## Test Bench

- Navigate to `/dashboard/test-bench` for a manual test panel:
  - Select valve (v1, v2, v3) and send `water` (liters) or `openMs` (milliseconds), plus a quick `alloff`.
  - See live events streaming below to confirm device responses.

## Dashboard wiring

- System Status shows live online/offline, RSSI, heap, and device time via SSE.
- Quick Actions:
  - Activar Todo → openMs 3000 ms on v1, v2, v3 (secuencial)
  - Desactivar Todo → alloff
- Valve Grid: toggling a valve opens 5s; toggling off sends alloff. The detail sheet test performs openMs 3000.
- Valve Detail → Guardar Cambios: toma el modo de programación (diario/semanal/intervalo/personalizado), materializa horarios a los próximos días y publica `config/set` como `jobs[{at,valve,liters}]`.

## Data persistence (MongoDB)

- When configured, the portal will persist:
  - POSTed configs in `configs` collection.
  - Incoming device events (status/result/lwt/config-ack) in `events` and `configAcks`.
- Fetch recent history via:
  - `GET /api/history?type=result&limit=50` (back-compat, most recent N)
  - `GET /api/history?page=1&pageSize=50&type=result&valve=1&from=ISO&to=ISO&q=text` (paginated with filters)

## Performance notes

To reduce memory and CPU usage on Vercel:

- Mongo writes are throttled for chatty `status` events. Only changes (hash of relevant fields) or a periodic sample (60s) are persisted. Business events (`result`, `config-ack`, `lwt`) are always saved.
- SSE client updates are batched: UI state is updated at most every ~150ms during bursts. Keepalive `ping` frames do not trigger re-renders.
- Charts are rendered on the client via dynamic import to avoid server-side Recharts cost. The metrics page wraps charts in a client-only component.
- Valve grid's periodic tick runs only while a valve is actively running, and at a slower 2000ms cadence.

Scaling MQTT

- Each serverless instance maintains its own MQTT connection. This is expected on Vercel. If you scale to many regions/instances and hit broker limits, consider consolidating ingestion into a single long-lived worker (or a small VM/container) that forwards events to the app via HTTP/WebSocket, or use a managed event bus.
