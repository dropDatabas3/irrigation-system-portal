export type Cmd =
  | { action: 'water'; valve: number; liters: number }
  | { action: 'openMs'; valve: number; ms: number }
  | { action: 'alloff' }
  | { action: 'chipInfo' }
  | { action: 'startAp' }
  | { action: 'restart' }
  | { action: 'syncTime' }
  | { action: 'wifiSet'; ssid: string; pass: string };

export async function sendCmd(cmd: Cmd, opts: { signal?: AbortSignal } = {}) {
  const res = await fetch('/api/cmd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    signal: opts.signal,
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}
