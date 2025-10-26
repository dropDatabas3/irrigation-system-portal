"use client";

import { useState, useMemo } from 'react';
import { useIrrigationEvents } from '@/lib/useEvents';
import { sendCmd, Cmd } from '@/lib/api';

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-200 ml-4">{value ?? '—'}</span>
    </div>
  );
}

export default function ChipInfoPanel() {
  const { online, lastInfo } = useIrrigationEvents();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ssid, setSsid] = useState('');
  const [pass, setPass] = useState('');

  const fsPct = useMemo(() => {
    const total = lastInfo?.fs?.littlefs?.total ?? 0;
    const used = lastInfo?.fs?.littlefs?.used ?? 0;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  }, [lastInfo]);

  async function doCmd(cmd: Cmd) {
    setBusy(true); setErr(null);
    try {
      await sendCmd(cmd);
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function onWifiSet(e: React.FormEvent) {
    e.preventDefault();
    if (!ssid.trim()) { setErr('Ingresá un SSID'); return; }
    await doCmd({ action: 'wifiSet', ssid: ssid.trim(), pass });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chip info</h1>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${online ? 'bg-emerald-900/40 text-emerald-300' : online === false ? 'bg-red-900/40 text-red-300' : 'bg-neutral-800 text-neutral-300'}`}>{online === null ? '...' : online ? 'Online' : 'Offline'}</span>
          <button disabled={busy} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" onClick={() => doCmd({ action: 'chipInfo' })}>Actualizar info</button>
          <button disabled={busy} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" onClick={() => doCmd({ action: 'startAp' })}>Iniciar portal AP</button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-300 bg-red-900/30 border border-red-900/50 rounded p-2">{err}</div>
      )}

      {/* Identity */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Identificación</h2>
          <Stat label="deviceId" value={lastInfo?.deviceId} />
          <Stat label="hostname" value={lastInfo?.hostname} />
          <Stat label="portalMode" value={String(lastInfo?.portalMode ?? false)} />
        </div>
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Wi‑Fi</h2>
          <Stat label="connected" value={String(lastInfo?.wifi?.connected ?? false)} />
          <Stat label="ssid" value={lastInfo?.wifi?.ssid} />
          <Stat label="ip" value={lastInfo?.wifi?.ip} />
          <Stat label="rssi" value={lastInfo?.wifi?.rssi} />
        </div>
      </section>

      {/* MQTT */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">MQTT</h2>
          <Stat label="host" value={lastInfo?.mqtt?.host} />
          <Stat label="port" value={lastInfo?.mqtt?.port} />
          <Stat label="base" value={lastInfo?.mqtt?.base} />
          <div className="mt-2">
            <div className="text-sm text-neutral-400 mb-1">topics</div>
            <div className="grid grid-cols-1 gap-1">
              {lastInfo?.mqtt?.topics && Object.entries(lastInfo.mqtt.topics).map(([k, v]) => (
                <div key={k} className="text-xs text-neutral-300 flex justify-between">
                  <span className="text-neutral-500">{k}</span>
                  <span className="font-mono ml-3">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Sistema de archivos</h2>
          <Stat label="littlefs.total" value={lastInfo?.fs?.littlefs?.total} />
          <Stat label="littlefs.used" value={lastInfo?.fs?.littlefs?.used} />
          <div className="mt-2 h-2 bg-neutral-800 rounded">
            <div className="h-2 bg-sky-600 rounded" style={{ width: `${fsPct}%` }} />
          </div>
          <div className="text-xs text-neutral-400 mt-1">{fsPct}% usado</div>
        </div>
      </section>

      {/* Memory / Flash */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Memoria</h2>
          <Stat label="heap" value={lastInfo?.mem?.heap} />
        </div>
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Flash</h2>
          <Stat label="size" value={lastInfo?.flash?.size} />
          <Stat label="sketch" value={lastInfo?.flash?.sketch} />
          <Stat label="freeSketch" value={lastInfo?.flash?.freeSketch} />
        </div>
      </section>

      {/* Hardware & Calibration */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Hardware</h2>
          <Stat label="activeLow" value={String(lastInfo?.hw?.activeLow ?? false)} />
          <div className="mt-2">
            <div className="text-sm text-neutral-400 mb-1">pins</div>
            <div className="text-xs text-neutral-300 space-y-1">
              <div className="flex justify-between"><span className="text-neutral-500">valves</span><span className="font-mono">{(lastInfo?.hw?.pins?.valves ?? []).join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">pump</span><span className="font-mono">{lastInfo?.hw?.pins?.pump}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">flow</span><span className="font-mono">{lastInfo?.hw?.pins?.flow}</span></div>
            </div>
          </div>
        </div>
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Calibración</h2>
          <Stat label="pulsesPerLiter" value={lastInfo?.cal?.pulsesPerLiter} />
        </div>
      </section>

      {/* Build */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Build</h2>
          <Stat label="date" value={lastInfo?.build?.date} />
          <Stat label="time" value={lastInfo?.build?.time} />
        </div>

        {/* Wi‑Fi update */}
        <form onSubmit={onWifiSet} className="rounded border border-neutral-800 p-4 bg-neutral-900/40">
          <h2 className="text-lg font-medium mb-2">Cambiar Wi‑Fi</h2>
          <div className="text-xs text-neutral-400 mb-3">Guarda SSID y contraseña en el dispositivo y reinicia.</div>
          <div className="grid grid-cols-1 gap-2">
            <input className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm outline-none focus:border-neutral-600" placeholder="SSID" value={ssid} onChange={e => setSsid(e.target.value)} />
            <input className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm outline-none focus:border-neutral-600" placeholder="Contraseña (opcional)" value={pass} onChange={e => setPass(e.target.value)} type="password" />
            <div className="flex gap-2">
              <button disabled={busy} className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" type="submit">Guardar y reiniciar</button>
              <button disabled={busy} className="px-3 py-1.5 rounded bg-neutral-900 text-sm" type="button" onClick={() => { setSsid(''); setPass(''); setErr(null); }}>Limpiar</button>
            </div>
        </div>
          <div className="text-xs text-neutral-500 mt-2">Nota: puede tardar unos segundos en reconectar.</div>
        </form>
      </section>
    </div>
  );
}
