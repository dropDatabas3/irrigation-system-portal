import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/eventBus';
import { ensureConnected, getDeviceId, getLast } from '@/lib/mqttServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  ensureConnected();
  const dev = getDeviceId();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const safeSend = (data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller likely closed; cleanup and stop
          if (!closed) doCleanup();
        }
      };

      const doCleanup = () => {
        if (closed) return;
        closed = true;
        try {
          if (cleanup) cleanup();
        } catch {}
      };

    // send initial snapshot
      const last = getLast(dev);
  if (last.lwt) safeSend({ type: 'lwt', deviceId: dev, payload: last.lwt, ts: Date.now() });
  if (last.status) safeSend({ type: 'status', deviceId: dev, payload: last.status, ts: Date.now() });
  if (last.result) safeSend({ type: 'result', deviceId: dev, payload: last.result, ts: Date.now() });
  if ((last as any).cfgAck) safeSend({ type: 'config-ack', deviceId: dev, payload: (last as any).cfgAck, ts: Date.now() });
  if ((last as any).info) safeSend({ type: 'info', deviceId: dev, payload: (last as any).info, ts: Date.now() });

      const unsub = eventBus.onEvent((evt) => safeSend(evt));

      // keepalive pings
      const ping = setInterval(() => safeSend({ type: 'ping', ts: Date.now() }), 25000);

      cleanup = () => {
        clearInterval(ping);
        unsub();
      };

      // Abort signals (client disconnect)
      const abortHandler = () => doCleanup();
      // @ts-ignore - Next passes a web Request with AbortSignal
      request?.signal?.addEventListener?.('abort', abortHandler);
    },
    cancel() {
      // Called when consumer cancels the stream
      if (cleanup) cleanup();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
