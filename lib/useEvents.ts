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

  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;
  es.onmessage = (e) => {
      try {
        const data: EventMsg = JSON.parse(e.data);
        // Ignore keepalive pings to avoid unnecessary re-renders
        if (data.type !== 'ping') {
          setEvents((prev: EventMsg[]) => {
            const next = [...prev, data];
            return next.slice(-100);
          });
        }
        if (data.type === 'lwt') {
          setOnline(data.payload?.toLowerCase?.() === 'online');
        } else if (data.type === 'status') {
          setLastStatus(data.payload);
          setLastStatusTs((data as any).ts || Date.now());
        } else if (data.type === 'result') {
          setLastResult(data.payload);
        } else if (data.type === 'config-ack') {
          setLastConfigAck(data.payload);
        } else if (data.type === 'info') {
          setLastInfo(data.payload);
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
