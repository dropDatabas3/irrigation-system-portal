"use client";

import { useMemo, useState } from 'react';
import { useIrrigationEvents } from '@/lib/useEvents';
import { sendCmd, Cmd } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi, Rss, Server, HardDrive, Cpu, Activity, Settings, Network, Info } from 'lucide-react';

function KeyValue({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-1 text-sm">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-mono text-foreground break-all whitespace-pre-wrap">{value ?? '—'}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-lg font-medium text-foreground">{children}</span>
    </div>
  );
}

export default function ChipInfoPanel() {
  const { online, lastInfo } = useIrrigationEvents();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');

  const fs = lastInfo?.fs?.littlefs || { total: 0, used: 0 };
  const fsPct = useMemo(() => (fs.total > 0 ? Math.round((fs.used / fs.total) * 100) : 0), [fs.total, fs.used]);

  const rssi = Number(lastInfo?.wifi?.rssi ?? NaN);
  const rssiLabel = Number.isFinite(rssi) ? `${rssi} dBm` : '—';
  const signal = Number.isFinite(rssi)
    ? rssi > -55 ? 'Excelente' : rssi > -67 ? 'Buena' : rssi > -80 ? 'Regular' : 'Débil'
    : '—';

  async function doCmd(cmd: Cmd) {
    setBusy(true); setErr(null);
    try { await sendCmd(cmd); } catch (e: any) { setErr(e?.message || 'Error'); } finally { setBusy(false); }
  }

  async function onWifiSet(e: React.FormEvent) {
    e.preventDefault();
    if (!ssid.trim()) { setErr('Ingresá un SSID'); return; }
    await doCmd({ action: 'wifiSet', ssid: ssid.trim(), pass });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Información del Dispositivo</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={online ? 'bg-emerald-500/15 text-emerald-300' : online === false ? 'bg-red-500/15 text-red-300' : 'bg-muted text-foreground'}>
            {online === null ? 'Desconocido' : online ? 'Online' : 'Offline'}
          </Badge>
          <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'chipInfo' })}>Actualizar info</Button>
          <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'startAp' })}>Iniciar portal AP</Button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-300 bg-red-900/30 border border-red-900/50 rounded p-2">{err}</div>
      )}

      {/* Empty state */}
      {!lastInfo && (
        <Card className="gradient-border">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <Activity className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aún no hay información del dispositivo.</p>
            <Button size="sm" onClick={() => doCmd({ action: 'chipInfo' })} disabled={busy}>Solicitar información</Button>
          </CardContent>
        </Card>
      )}

      {!!lastInfo && (
        <>
          {/* Core identity & Wi‑Fi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Activity}>Identificación</SectionTitle></CardHeader>
              <CardContent className="p-4">
                <KeyValue label="deviceId" value={lastInfo?.deviceId} />
                <KeyValue label="hostname" value={lastInfo?.hostname} />
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">portalMode</span>
                  <Badge variant="outline" className="ml-4">{String(lastInfo?.portalMode ?? false)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-border lg:col-span-2">
              <CardHeader className="pb-2"><SectionTitle icon={Wifi}>Wi‑Fi</SectionTitle></CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <KeyValue label="Conectado" value={String(lastInfo?.wifi?.connected ?? false)} />
                <KeyValue label="SSID" value={lastInfo?.wifi?.ssid} />
                <KeyValue label="IP" value={lastInfo?.wifi?.ip} />
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">RSSI</span>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="font-mono text-foreground">{rssiLabel}</span>
                    <span className="text-muted-foreground">· {signal}</span>
                    <Rss className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MQTT & FS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="gradient-border lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Server}>MQTT</SectionTitle>
                  <Button size="sm" variant="outline" className="bg-transparent" onClick={() => window.history.back()}>Volver</Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KeyValue label="Host" value={lastInfo?.mqtt?.host} />
                  <KeyValue label="Puerto" value={lastInfo?.mqtt?.port} />
                  <KeyValue label="Base" value={lastInfo?.mqtt?.base} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Topics</div>
                  <div className="rounded border border-border bg-background/50 p-3 max-h-40 overflow-auto">
                    {lastInfo?.mqtt?.topics && Object.entries(lastInfo.mqtt.topics).map(([k, v]) => (
                      <div key={k} className="text-xs grid grid-cols-[140px_1fr] items-start gap-3 py-0.5">
                        <span className="text-muted-foreground whitespace-nowrap">{k}</span>
                        <span className="font-mono text-foreground break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={HardDrive}>Sistema de archivos</SectionTitle></CardHeader>
              <CardContent className="p-4">
                <KeyValue label="Total" value={fs.total} />
                <KeyValue label="Usado" value={fs.used} />
                <div className="mt-2 h-2 bg-secondary rounded overflow-hidden">
                  <div className="h-2 bg-primary rounded" style={{ width: `${fsPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{fsPct}% usado</div>
              </CardContent>
            </Card>
          </div>

          {/* Memory & Flash */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Cpu}>Memoria</SectionTitle></CardHeader>
              <CardContent className="p-4">
                <KeyValue label="heap" value={lastInfo?.mem?.heap} />
              </CardContent>
            </Card>
            <Card className="gradient-border lg:col-span-2">
              <CardHeader className="pb-2"><SectionTitle icon={HardDrive}>Flash</SectionTitle></CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KeyValue label="size" value={lastInfo?.flash?.size} />
                <KeyValue label="sketch" value={lastInfo?.flash?.sketch} />
                <KeyValue label="freeSketch" value={lastInfo?.flash?.freeSketch} />
              </CardContent>
            </Card>
          </div>

          {/* Hardware & Calibration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Network}>Hardware</SectionTitle></CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">activeLow</span>
                  <Badge variant="outline">{String(lastInfo?.hw?.activeLow ?? false)}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Pines</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">valves</span><span className="font-mono text-foreground">{(lastInfo?.hw?.pins?.valves ?? []).join(', ')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">pump</span><span className="font-mono text-foreground">{lastInfo?.hw?.pins?.pump}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">flow</span><span className="font-mono text-foreground">{lastInfo?.hw?.pins?.flow}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Settings}>Calibración</SectionTitle></CardHeader>
              <CardContent className="p-4">
                <KeyValue label="pulsesPerLiter" value={lastInfo?.cal?.pulsesPerLiter} />
              </CardContent>
            </Card>
          </div>

          {/* Build & Wi‑Fi update */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Activity}>Build</SectionTitle></CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <KeyValue label="date" value={lastInfo?.build?.date} />
                <KeyValue label="time" value={lastInfo?.build?.time} />
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="pb-2"><SectionTitle icon={Wifi}>Cambiar Wi‑Fi</SectionTitle></CardHeader>
              <CardContent className="p-4">
                <form onSubmit={onWifiSet} className="space-y-3">
                  <div className="space-y-1">
                    <Label>SSID</Label>
                    <Input placeholder="SSID" value={ssid} onChange={(e) => setSsid(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Contraseña (opcional)</Label>
                    <Input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" type="submit" disabled={busy}>Guardar y reiniciar</Button>
                    <Button size="sm" type="button" variant="outline" className="bg-transparent" disabled={busy} onClick={() => { setSsid(''); setPass(''); setErr(null); }}>Limpiar</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">El dispositivo puede tardar unos segundos en reconectar.</div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
