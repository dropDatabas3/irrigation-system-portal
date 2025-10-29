"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type StatusPayload = {
  rssi?: number;
  heap?: number;
  time?: number | string;
  [k: string]: any;
};

type ResultPayload = {
  valve?: number;
  liters?: number;
  deliveredLiters?: number;
  pulses?: number;
  reason?: string;
  durationMs?: number;
  [k: string]: any;
};

type EventMsg =
  | { type: 'lwt'; deviceId: string; payload: string; ts: number }
  | { type: 'status'; deviceId: string; payload: StatusPayload; ts: number }
  | { type: 'result'; deviceId: string; payload: ResultPayload; ts: number }
  | { type: 'config-ack'; deviceId: string; payload: any; ts: number }
  | { type: 'info'; deviceId: string; payload: any; ts: number }
  | { type: 'ping'; ts: number };

export function useIrrigationEvents() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [lastStatus, setLastStatus] = useState<StatusPayload | null>(null);
  const [lastStatusTs, setLastStatusTs] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ResultPayload | null>(null);
  const [lastConfigAck, setLastConfigAck] = useState<any | null>(null);
  const [events, setEvents] = useState<EventMsg[]>([]);
  const [lastInfo, setLastInfo] = useState<any | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const bufferRef = useRef<{ pending: EventMsg[]; timer: number | null; latest: Partial<Record<EventMsg['type'], EventMsg>> }>({ pending: [], timer: null, latest: {} });

  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;
  es.onmessage = (e) => {
      try {
        const data: EventMsg = JSON.parse(e.data);
        if (data.type === 'ping') return; // ignore keepalive
        const buf = bufferRef.current;
        buf.pending.push(data);
        // track only the most recent per type for state pieces
        if (data.type === 'lwt' || data.type === 'status' || data.type === 'result' || data.type === 'config-ack' || data.type === 'info') {
          buf.latest[data.type] = data as any;
        }
        if (!buf.timer) {
          buf.timer = window.setTimeout(() => {
            const toApply = buf.pending.splice(0, buf.pending.length);
            buf.timer = null;
            const latest = buf.latest; // snapshot
            buf.latest = {};
            if (toApply.length) {
              setEvents((prev: EventMsg[]) => {
                const next = [...prev, ...toApply];
                return next.slice(-100);
              });
            }
            // Apply most recent state updates per type in a single batch
            if (latest['lwt']) {
              const l = latest['lwt'] as Extract<EventMsg, { type: 'lwt' }>;
              setOnline(l.payload?.toLowerCase?.() === 'online');
            }
            if (latest['status']) {
              const s = latest['status'] as Extract<EventMsg, { type: 'status' }>;
              setLastStatus(s.payload);
              setLastStatusTs((s as any).ts || Date.now());
            }
            if (latest['result']) {
              const r = latest['result'] as Extract<EventMsg, { type: 'result' }>;
              setLastResult(r.payload);
            }
            if (latest['config-ack']) {
              const c = latest['config-ack'] as Extract<EventMsg, { type: 'config-ack' }>;
              setLastConfigAck(c.payload);
            }
            if (latest['info']) {
              const i = latest['info'] as Extract<EventMsg, { type: 'info' }>;
              setLastInfo(i.payload);
            }
          }, 150);
        }
      } catch {}
    };
    es.onerror = () => {
      // Let browser reconnect on navigation; set online unknown
      setOnline((prev: boolean | null) => (prev === false ? false : null));
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const activeValvesCount = useMemo(() => {
    // Prefer live status fields if firmware provides them; otherwise default to 0
    // Supported shapes (if available):
    //  - lastStatus.activeValves: number
    //  - lastStatus.runningValves: number[]
    //  - lastStatus.runningValve: number (single)
    if (online === false) return 0;
    const s: any = lastStatus ?? {};
    if (Array.isArray(s.runningValves)) return Math.min(4, Math.max(0, s.runningValves.length));
    if (typeof s.activeValves === 'number') return Math.min(4, Math.max(0, s.activeValves));
    if (typeof s.runningValve === 'number' && s.runningValve > 0) return 1;
    return 0;
  }, [online, lastStatus]);

  return { online, lastStatus, lastStatusTs, lastResult, lastConfigAck, lastInfo, events, activeValvesCount };
}
