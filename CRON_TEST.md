# Test Manual del Cron Job

## 🧪 Cómo Probar

### 1. Desde el navegador

Abre: http://localhost:3000/api/cron/test-refresh

Deberías ver:
```json
{
  "ok": true,
  "jobsCount": 21,
  "nextRun": "2025-11-03T08:00:00.000Z",
  "message": "21 jobs enviados al ESP8266",
  "test": true
}
```

### 2. Desde la terminal

```bash
curl http://localhost:3000/api/cron/test-refresh
```

### 3. Con autenticación (si tienes CRON_SECRET)

```bash
curl http://localhost:3000/api/cron/refresh-jobs \
  -H "Authorization: Bearer tu_secreto_aqui"
```

### 4. Verificar en el ESP8266

Abre el monitor serie (baudrate 115200):

```
[CFG] config/set recibido bytes=1234
[CFG] payload: {"jobs":[{"at":1730620800,"valve":1,"liters":0.35},...
[CFG] Aplicados jobs=21
[CFG] Guardado OK, jobs=21
```

### 5. Verificar en el Dashboard

1. Ve a http://localhost:3000/dashboard
2. Revisa la sección "Próximos Riegos"
3. Deberías ver los próximos 7 días de riegos

## 🔍 Debugging

Si algo falla, revisa:

1. **MongoDB**: ¿Hay schedules guardados?
2. **MQTT**: ¿Está conectado el broker?
3. **ESP8266**: ¿Está encendido y conectado a WiFi?
4. **Logs del servidor**: Revisa la consola donde corre `npm run dev`

## ✅ Checklist de Configuración

- [ ] ESP8266 con límites aumentados (MAX_JOBS=50, buffers 2048)
- [ ] MQTT broker funcionando (HiveMQ Cloud)
- [ ] MongoDB con schedules guardados
- [ ] Cron job configurado (Vercel/GitHub/Manual)
- [ ] CRON_SECRET en .env.local (opcional)
- [ ] ESP8266 conectado y monitoreando

## 📊 Métricas Esperadas

| Métrica | Valor Típico |
|---------|--------------|
| Jobs generados | 15-30 (depende de config) |
| Tamaño payload MQTT | 1-2 KB |
| Tiempo de ejecución | < 500ms |
| Jobs almacenados ESP8266 | Máx 50 |
| Horizonte temporal | 7 días |

## 🎯 Próximos Pasos

Una vez que confirmes que funciona:

1. Configura el cron job real (según CRON_SETUP.md)
2. Monitorea por 24-48 horas
3. Verifica que se ejecute automáticamente
4. Opcional: Agrega alertas si falla
