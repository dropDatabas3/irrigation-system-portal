"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIrrigationEvents } from '@/lib/useEvents';
import { sendCmd, Cmd } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi, Rss, Server, HardDrive, Cpu, Activity, Settings, Network, Info, Copy, Check, ArrowLeft, Clock } from 'lucide-react';

function KeyValue({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-1 py-0.5 text-sm">
      <span className="text-muted-foreground whitespace-nowrap pr-1">{label}</span>
      <span className="font-mono text-foreground break-all whitespace-pre-wrap leading-tight">{value ?? '—'}</span>
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

function CopyButton({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [ok, setOk] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setOk(true)
      setTimeout(() => setOk(false), 1200)
    } catch {}
  }
  return (
    <Button type="button" variant="outline" size="icon" className="h-7 w-7 bg-transparent" onClick={onCopy} aria-label={ariaLabel} title="Copiar">
      {ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  )
}

export default function ChipInfoPanel() {
  const router = useRouter();
  const { online, lastInfo, lastStatus } = useIrrigationEvents();
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

  const deviceTime = (() => {
    const t = (lastStatus as any)?.time
    if (!t) return null
    // Firmware sends epoch seconds; format to local date/time
    const ms = t > 1e12 ? t : t * 1000
    try {
      return new Date(ms).toLocaleString()
    } catch {
      return String(t)
    }
  })()

  const timeSkewInfo = (() => {
    const t = (lastStatus as any)?.time
    if (!t) return null
    const devMs = (t > 1e12 ? t : t * 1000) as number
    const deltaSec = Math.round((devMs - Date.now()) / 1000)
    const abs = Math.abs(deltaSec)
    const sign = deltaSec >= 0 ? '+' : '-'
    const mm = Math.floor(abs / 60)
    const ss = abs % 60
    return { text: `${sign}${mm}:${ss.toString().padStart(2,'0')} (desfase)`, warn: abs > 120 }
  })()

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
          <button type="button" onClick={() => router.back()} className="rounded-full p-1.5 hover:bg-secondary/50" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Info className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Información del Dispositivo</h1>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <Card className="gradient-border">
        <CardContent className="p-2 py-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'chipInfo' })}>
              Actualizar info
            </Button>
            <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'startAp' })}>
              Iniciar portal AP
            </Button>
            <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'restart' })}>
              Reiniciar placa
            </Button>
            <Button size="sm" variant="outline" className="bg-transparent" disabled={busy} onClick={() => doCmd({ action: 'syncTime' })}>
              Sincronizar hora
            </Button>
          </div>
        </CardContent>
      </Card>

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
          {/* Card 1: Estado y Conexión (Identidad, Wi‑Fi, MQTT) */}
          <Card className="gradient-border">
            <CardHeader className="pb-1 flex items-center gap-3">
              <CardTitle className="text-base">
                Estado y Conexión
              </CardTitle>
              <Badge className={online ? 'bg-emerald-500/15 text-emerald-300' : online === false ? 'bg-red-500/15 text-red-300' : 'bg-muted text-foreground'}>
                {online === null ? 'Desconocido' : online ? 'Online' : 'Offline'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 py-1 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 divide-y lg:divide-y-0 lg:divide-x lg:divide-border/50">
                {/* Identidad + WiFi */}
                <div className="space-y-2 lg:pr-4">
                  <SectionTitle icon={Activity}>Identificación</SectionTitle>
                  <div className="mt-1 space-y-0.5">
                    <KeyValue label="deviceId" value={lastInfo?.deviceId} />
                    <KeyValue label="hostname" value={lastInfo?.hostname} />
                    <div className="grid grid-cols-[84px_1fr] items-center gap-1 py-0.5 text-sm">
                      <span className="text-muted-foreground">portalMode</span>
                      <Badge variant="outline">{String(lastInfo?.portalMode ?? false)}</Badge>
                    </div>
                  </div>
                  <div className="border-t border-border/50 my-2" />
                  <div className="pt-2 space-y-0.5">
                    <SectionTitle icon={Wifi}>Wi‑Fi</SectionTitle>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <KeyValue label="Conectado" value={String(lastInfo?.wifi?.connected ?? false)} />
                      <KeyValue label="SSID" value={lastInfo?.wifi?.ssid} />
                      <KeyValue label="IP" value={lastInfo?.wifi?.ip} />
                      <div className="grid grid-cols-[84px_1fr] items-center gap-1 py-0.5 text-sm">
                        <span className="text-muted-foreground">RSSI</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-foreground">{rssiLabel}</span>
                          <span className="text-muted-foreground">· {signal}</span>
                          <Rss className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MQTT */}
                <div className="space-y-2 lg:pl-4">
                  <SectionTitle icon={Server}>MQTT</SectionTitle>
                  <div className="mt-1 space-y-0.5">
                    <div className="grid grid-cols-[84px_1fr_auto] items-center gap-1 py-0.5 text-sm">
                      <span className="text-muted-foreground">Host</span>
                      <div className="font-mono text-foreground whitespace-nowrap overflow-x-auto px-2 py-0.5 rounded bg-secondary/30 border border-border/50">
                        {lastInfo?.mqtt?.host ?? '—'}
                      </div>
                      {lastInfo?.mqtt?.host && <CopyButton value={String(lastInfo.mqtt.host)} ariaLabel="Copiar host" />}
                    </div>
                    <KeyValue label="Puerto" value={lastInfo?.mqtt?.port} />
                    <div className="grid grid-cols-[84px_1fr_auto] items-center gap-1 py-0.5 text-sm">
                      <span className="text-muted-foreground">Base</span>
                      <div className="font-mono text-foreground whitespace-nowrap overflow-x-auto px-2 py-0.5 rounded bg-secondary/30 border border-border/50">
                        {lastInfo?.mqtt?.base ?? '—'}
                      </div>
                      {lastInfo?.mqtt?.base && <CopyButton value={String(lastInfo.mqtt.base)} ariaLabel="Copiar base" />}
                    </div>
                  </div>
                  <div className="border-t border-border/50 my-2" />
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Topics</div>
                    <div className="rounded border border-border bg-background/50 p-2 max-h-40 overflow-auto space-y-1">
                      {lastInfo?.mqtt?.topics && Object.entries(lastInfo.mqtt.topics).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[120px_1fr_auto] items-center gap-2 text-xs">
                          <span className="text-muted-foreground whitespace-nowrap">{k}</span>
                          <div className="font-mono text-foreground whitespace-nowrap overflow-x-auto px-2 py-0.5 rounded bg-secondary/20 border border-border/30">
                            {String(v)}
                          </div>
                          <CopyButton value={String(v)} ariaLabel={`Copiar ${k}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Sistema (FS, Memoria, Flash, Hardware, Calibración, Build) */}
          <Card className="gradient-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Sistema</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 divide-y lg:divide-y-0 lg:divide-x lg:divide-border/50">
                {/* FS + Memoria */}
                <div className="space-y-2 lg:pr-4">
                  <SectionTitle icon={HardDrive}>Sistema de archivos</SectionTitle>
                  <div className="mt-1 space-y-0.5">
                    <KeyValue label="Total" value={fs.total} />
                    <KeyValue label="Usado" value={fs.used} />
                    <div className="mt-2 h-2 bg-secondary rounded overflow-hidden">
                      <div className="h-2 bg-primary rounded" style={{ width: `${fsPct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{fsPct}% usado</div>
                  </div>
                  <div className="border-t border-border/50 my-2" />
                  <div className="pt-3">
                    <SectionTitle icon={Cpu}>Memoria</SectionTitle>
                    <div className="mt-2"><KeyValue label="heap" value={lastInfo?.mem?.heap} /></div>
                  </div>
                </div>

                {/* Flash + Build */}
                <div className="space-y-2 lg:pl-4">
                  <SectionTitle icon={HardDrive}>Flash</SectionTitle>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <KeyValue label="size" value={lastInfo?.flash?.size} />
                    <KeyValue label="sketch" value={lastInfo?.flash?.sketch} />
                    <KeyValue label="freeSketch" value={lastInfo?.flash?.freeSketch} />
                  </div>
                  <div className="border-t border-border/50 my-2" />
                  <div className="pt-3">
                    <SectionTitle icon={Activity}>Build</SectionTitle>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <KeyValue label="date" value={lastInfo?.build?.date} />
                      <KeyValue label="time" value={lastInfo?.build?.time} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware + Calibración */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 divide-y lg:divide-y-0 lg:divide-x lg:divide-border/50">
                <div className="space-y-2 lg:pr-4">
                  <SectionTitle icon={Network}>Hardware</SectionTitle>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-[84px_1fr] items-center gap-1 py-0.5 text-sm">
                      <span className="text-muted-foreground">activeLow</span>
                      <Badge variant="outline">{String(lastInfo?.hw?.activeLow ?? false)}</Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground">valves</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(lastInfo?.hw?.pins?.valves ?? []).map((p: number, i: number) => (
                            <span key={i} className="rounded border border-border/50 bg-secondary/30 px-1.5 py-0.5 font-mono text-foreground">{`Pin ${p}`}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">pump</span><span className="font-mono text-foreground">{lastInfo?.hw?.pins?.pump != null ? `Pin ${lastInfo?.hw?.pins?.pump}` : '—'}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">flow</span><span className="font-mono text-foreground">{lastInfo?.hw?.pins?.flow != null ? `Pin ${lastInfo?.hw?.pins?.flow}` : '—'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 lg:pl-4">
                  <SectionTitle icon={Settings}>Calibración</SectionTitle>
                  <div className="mt-2"><KeyValue label="pulsesPerLiter" value={lastInfo?.cal?.pulsesPerLiter} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Cambiar Wi‑Fi */}
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

          {/* Hora del dispositivo */}
          <Card className="gradient-border">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Hora del dispositivo</p>
                  <p className="text-sm sm:text-lg font-bold text-foreground mt-1 sm:mt-2 truncate" title={deviceTime ?? '-' }>
                    {deviceTime ?? '-'} {online === false && <span className="text-muted-foreground">(offline)</span>}
                  </p>
                  {timeSkewInfo && (
                    <p className={`text-[10px] sm:text-xs mt-1 ${timeSkewInfo.warn ? 'text-red-500' : 'text-muted-foreground'}`}>
                      Desfase: {timeSkewInfo.text}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-chart-4/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
