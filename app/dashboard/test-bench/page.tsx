"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { sendCmd } from "@/lib/api";
import { SUPPORTED_VALVES, toDeviceValve } from "@/lib/valves";
import { useIrrigationEvents } from "@/lib/useEvents";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TestBenchPage() {
  const router = useRouter();
  const [valve, setValve] = useState<string>('v1');
  const [liters, setLiters] = useState<string>('1.0');
  const [ms, setMs] = useState<string>('3000');
  const [configText, setConfigText] = useState<string>('');
  const [schedTime, setSchedTime] = useState<string>('07:52');
  const [schedLiters, setSchedLiters] = useState<string>('1.0');
  const { events, lastStatus } = useIrrigationEvents();
  const deviceEpochSec = useMemo(() => {
    const t: any = (lastStatus as any)?.time;
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n);
  }, [lastStatus]);

  const doWater = async () => {
    await sendCmd({ action: 'water', valve: toDeviceValve(valve as any), liters: Number(liters) });
  };
  const doOpen = async () => {
    await sendCmd({ action: 'openMs', valve: toDeviceValve(valve as any), ms: Number(ms) });
  };
  const doAllOff = async () => {
    await sendCmd({ action: 'alloff' });
  };

  const sendConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: configText.trim() ? configText : '{}',
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error('send config failed', e);
    }
  };

  const scheduleToday = async () => {
    try {
      const [hStr, mStr] = (schedTime || '').split(':');
      const h = Number(hStr), m = Number(mStr);
      if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error('Hora inválida');
      // Interpretar HH:mm en el DÍA LOCAL del usuario
      const nowLocal = new Date();
      let atMs = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate(),
        h,
        m,
        0,
        0
      ).getTime();
      // Decidir si va hoy o mañana comparando contra el epoch del dispositivo (si está), o ahora
      const baseMs = (deviceEpochSec ?? Math.floor(Date.now() / 1000)) * 1000;
      if (atMs <= baseMs) atMs += 24 * 60 * 60 * 1000;
      const payload = {
        jobs: [
          {
            at: Math.floor(atMs / 1000),
            valve: toDeviceValve(valve as any),
            liters: Number(schedLiters),
          },
        ],
      };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error('schedule job failed', e);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} title="Volver al panel">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <h1 className="text-lg md:text-xl font-semibold">Banco de Pruebas</h1>
      </div>
      <Card className="gradient-border">
        <CardHeader>
          <CardTitle>Banco de Pruebas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Válvula</Label>
              <Select value={valve} onValueChange={setValve}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_VALVES.map(v => (
                    <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Litros</Label>
              <Input value={liters} onChange={(e: any) => setLiters(e.target.value)} type="number" step="0.1" min="0" />
              <Button onClick={doWater} className="w-full">Enviar water</Button>
            </div>
            <div className="space-y-2">
              <Label>Milisegundos</Label>
              <Input value={ms} onChange={(e: any) => setMs(e.target.value)} type="number" min="0" />
              <div className="flex gap-2">
                <Button onClick={doOpen} className="flex-1" variant="secondary">openMs</Button>
                <Button onClick={doAllOff} className="flex-1" variant="outline">alloff</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Programar (hoy)</Label>
              <Input value={schedTime} onChange={(e: any) => setSchedTime(e.target.value)} type="time" />
            </div>
            <div className="space-y-2">
              <Label>Litros</Label>
              <Input value={schedLiters} onChange={(e: any) => setSchedLiters(e.target.value)} type="number" step="0.1" min="0" />
            </div>
            <div className="flex items-end">
              <Button onClick={scheduleToday} className="w-full" variant="outline">Enviar job (config/set)</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Config (publica en MQTT config/set)</Label>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder='{"jobs":[{"at": 1730000000, "valve":1, "liters":1.0}]}'
              className="w-full min-h-[100px] rounded-md bg-secondary/40 p-2 outline-hidden"
            />
            <Button onClick={sendConfig} variant="outline">Enviar config/set</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-border">
        <CardHeader>
          <CardTitle>Eventos en Vivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[50vh] overflow-auto text-sm">
          {events.slice().reverse().map((e: any, idx: number) => (
            <pre key={idx} className="bg-secondary/40 rounded p-2 whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(e, null, 2)}
            </pre>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
