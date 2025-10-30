import { NextResponse } from 'next/server';
import { publishCmd, getDeviceId, ensureConnected } from '@/lib/mqttServer';
import type { CmdPayload } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const action: CmdPayload['action'] = body?.action;
    if (!action) {
      return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 });
    }

    let payload: CmdPayload | null = null;

    if (action === 'water') {
      const valve = Number(body?.valve);
      const liters = Number(body?.liters);
      if (!Number.isFinite(valve) || !Number.isFinite(liters)) {
        return NextResponse.json({ ok: false, error: 'Invalid valve/liters' }, { status: 400 });
      }
      payload = { action, valve, liters };
    } else if (action === 'openMs') {
      const valve = Number(body?.valve);
      const ms = Number(body?.ms);
      if (!Number.isFinite(valve) || !Number.isFinite(ms)) {
        return NextResponse.json({ ok: false, error: 'Invalid valve/ms' }, { status: 400 });
      }
      payload = { action, valve, ms } as CmdPayload;
    } else if (action === 'alloff') {
      payload = { action };
    } else if (action === 'chipInfo') {
      payload = { action } as CmdPayload;
    } else if (action === 'startAp') {
      payload = { action } as CmdPayload;
    } else if (action === 'restart') {
      payload = { action } as CmdPayload;
    } else if (action === 'syncTime') {
      payload = { action } as CmdPayload;
    } else if (action === 'wifiSet') {
      const ssid = String(body?.ssid ?? '').trim();
      const pass = String(body?.pass ?? '').trim();
      if (!ssid) {
        return NextResponse.json({ ok: false, error: 'Missing ssid' }, { status: 400 });
      }
      payload = { action, ssid, pass } as CmdPayload;
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }

    ensureConnected();
    await publishCmd(payload!, body?.deviceId ?? getDeviceId());
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
