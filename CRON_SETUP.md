# Sistema de Auto-Renovación de Jobs (Resiliencia Offline)

## 🎯 Objetivo

Permitir que el ESP8266 funcione hasta **7 días sin conexión a Internet** manteniendo su programación de riego activa.

## 🔄 Cómo Funciona

### 1. **Materialización de Jobs**

Cuando guardas una configuración de válvula en el portal:
- El portal calcula todos los riegos de los próximos 7 días usando `buildJobs()`
- Envía los jobs materializados al ESP8266 vía MQTT `config/set`
- El ESP8266 guarda hasta **50 jobs** en LittleFS

### 2. **Renovación Automática (Cron Job)**

Cada 24 horas, un cron job:
- Re-calcula los próximos 7 días de riegos
- Filtra solo jobs futuros
- Envía al ESP8266 para refrescar su cola

Esto significa:
- ✅ El ESP8266 siempre tiene 7 días de jobs
- ✅ Si pierde Internet, sigue regando hasta 1 semana
- ✅ Cuando recupera conexión, se actualiza automáticamente

## 🚀 Configuración del Cron Job

### Opción 1: Vercel Cron (Recomendado si usas Vercel)

El archivo `vercel.json` ya está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-jobs",
      "schedule": "0 */24 * * *"
    }
  ]
}
```

**Deployment:**
1. Sube tu código a Vercel
2. El cron se activa automáticamente
3. Vercel lo ejecuta cada 24 horas (medianoche UTC)

**Opcional: Proteger el endpoint**

Agrega a tu `.env.local`:
```bash
CRON_SECRET=tu_secreto_super_seguro_aqui
```

El endpoint verificará este secreto antes de ejecutar.

---

### Opción 2: Cron-Job.org (Si NO usas Vercel)

1. Ve a https://console.cron-job.org/
2. Crea una cuenta gratuita
3. Crea un nuevo Cron Job:
   - **URL**: `https://tu-dominio.com/api/cron/refresh-jobs`
   - **Schedule**: `0 0 * * *` (medianoche diaria)
   - **HTTP Method**: GET
   - **Headers** (si usas CRON_SECRET):
     ```
     Authorization: Bearer tu_secreto_super_seguro_aqui
     ```

---

### Opción 3: GitHub Actions (Gratis y sin servidor)

Crea `.github/workflows/refresh-jobs.yml`:

```yaml
name: Refresh Irrigation Jobs
on:
  schedule:
    - cron: '0 0 * * *'  # Medianoche UTC diariamente
  workflow_dispatch:  # Permite ejecución manual

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call refresh endpoint
        run: |
          curl -X GET "https://tu-dominio.com/api/cron/refresh-jobs" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Agrega `CRON_SECRET` a tus GitHub Secrets del repo.

---

### Opción 4: Self-Hosted Cron (Linux/macOS)

Edita tu crontab:
```bash
crontab -e
```

Agrega:
```bash
0 0 * * * curl -X GET "https://tu-dominio.com/api/cron/refresh-jobs" -H "Authorization: Bearer TU_SECRET"
```

---

## 🧪 Prueba Manual

Ejecuta el cron job manualmente para verificar:

```bash
curl -X GET "http://localhost:3000/api/cron/refresh-jobs" \
  -H "Authorization: Bearer tu_secreto"
```

Respuesta esperada:
```json
{
  "ok": true,
  "jobsCount": 21,
  "nextRun": "2025-11-03T08:00:00.000Z",
  "message": "21 jobs enviados al ESP8266"
}
```

## 📊 Monitoreo

Revisa los logs del ESP8266 en el monitor serie:
```
[CFG] config/set recibido bytes=XXX
[CFG] Aplicados jobs=21
[CFG] Guardado OK, jobs=21
```

Verifica en `/dashboard` que aparezcan los próximos riegos.

## 🔧 Troubleshooting

### El cron no se ejecuta

1. Verifica que el servicio de cron esté activo
2. Revisa los logs del servicio (Vercel Dashboard, cron-job.org, GitHub Actions)
3. Prueba manualmente el endpoint

### El ESP8266 no recibe los jobs

1. Verifica que MQTT esté conectado (LED en el ESP8266)
2. Revisa los logs del broker MQTT
3. Confirma que `publishConfig()` no esté fallando en el portal

### Los jobs no se ejecutan

1. Verifica que el ESP8266 tenga la hora correcta (NTP)
2. Revisa que `currentEpoch()` devuelva timestamps válidos
3. Confirma que los jobs tengan `atEpoch` > tiempo actual

## 📈 Mejoras Futuras

- [ ] Webhook para notificar cuando el ESP8266 recibe los jobs
- [ ] Dashboard con historial de renovaciones
- [ ] Alertas si el cron falla 2+ veces seguidas
- [ ] Compresión de jobs para enviar más de 50

## 🎓 Arquitectura

```
┌─────────────────┐
│   Portal Web    │
│   (Next.js)     │
└────────┬────────┘
         │
         │ Cada 24h (Cron)
         │
         ▼
┌─────────────────┐      MQTT       ┌─────────────────┐
│  buildJobs()    │───────────────▶ │   ESP8266       │
│  7 días         │   config/set    │   (50 jobs)     │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   MongoDB       │                 │   LittleFS      │
│   (schedules)   │                 │   (jobs.json)   │
└─────────────────┘                 └─────────────────┘
```

## ✅ Resultado Final

Con este sistema:
- ✅ Configuras una vez en el portal web
- ✅ El ESP8266 recibe 7 días de jobs inmediatamente
- ✅ Cada 24h se renuevan automáticamente
- ✅ Funciona offline hasta 1 semana
- ✅ Al reconectar, se sincroniza automáticamente
