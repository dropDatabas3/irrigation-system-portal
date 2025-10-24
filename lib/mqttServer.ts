// Minimal Node global to appease TS when Node types aren't installed
declare const process: any;

import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { eventBus } from './eventBus';
import { topicsForDevice } from './mqttTopics';
import type { CmdPayload, DeviceEvent } from './types';
import { saveEvent, saveConfigAck } from './persist';

const DEFAULTS = {
  host: process?.env?.MQTT_HOST ?? '',
  port: Number(process?.env?.MQTT_PORT ?? 8883),
  username: process?.env?.MQTT_USERNAME ?? '',
  password: process?.env?.MQTT_PASSWORD ?? '',
  deviceId: process?.env?.MQTT_DEVICE_ID ?? 'esp8266-6aa9f8',
  clientIdPrefix: process?.env?.MQTT_CLIENT_ID_PREFIX ?? 'portal-',
  useTLS: ((process?.env?.MQTT_USE_TLS ?? 'true') as string).toLowerCase() !== 'false',
};

let client: MqttClient | null = null;
const lastByType: Record<string, { status?: any; result?: any; lwt?: string; cfgAck?: any }> = {};

function getClientId() {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${DEFAULTS.clientIdPrefix}${rand}`;
}

function parseMaybe(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

export function getDeviceId() {
  return DEFAULTS.deviceId;
}

export function getLast(deviceId: string) {
  return lastByType[deviceId] ?? {};
}

let warnedNoHost = false;

export function ensureConnected() {
  if (client && client.connected) return client;
  if (client && !client.connected) {
    // reuse existing instance; it'll reconnect automatically
    return client;
  }

  if (!DEFAULTS.host) {
    if (!warnedNoHost) {
      console.warn('MQTT host not configured. Set MQTT_HOST (and related) in .env.local to enable broker connection.');
      warnedNoHost = true;
    }
    return client;
  }

  const url = `${DEFAULTS.useTLS ? 'mqtts' : 'mqtt'}://${DEFAULTS.host}:${DEFAULTS.port}`;
  const options: IClientOptions = {
    clientId: getClientId(),
    username: DEFAULTS.username,
    password: DEFAULTS.password,
    clean: true,
    keepalive: 30,
    reconnectPeriod: 3000,
  };

  client = mqtt.connect(url, options);

  client.on('connect', () => {
    const dev = DEFAULTS.deviceId;
    const t = topicsForDevice(dev);
    client!.subscribe([t.status, t.result, t.lwt, t.cfgAck], (err: Error | null) => {
      if (err) console.error('MQTT subscribe error:', err);
    });
  });

  client.on('message', (topic: string, payload: any) => {
    try {
      const dev = DEFAULTS.deviceId;
      const t = topicsForDevice(dev);
      const msgStr = (payload as any).toString();
      const ts = Date.now();
      let evt: DeviceEvent | null = null;

      if (topic === t.status) {
        const data = parseMaybe(msgStr);
        lastByType[dev] = { ...(lastByType[dev] ?? {}), status: data };
        evt = { type: 'status', deviceId: dev, payload: data, ts };
      } else if (topic === t.result) {
        const data = parseMaybe(msgStr);
        lastByType[dev] = { ...(lastByType[dev] ?? {}), result: data };
        evt = { type: 'result', deviceId: dev, payload: data, ts };
      } else if (topic === t.lwt) {
        lastByType[dev] = { ...(lastByType[dev] ?? {}), lwt: msgStr };
        evt = { type: 'lwt', deviceId: dev, payload: msgStr, ts };
      } else if (topic === t.cfgAck) {
        const data = parseMaybe(msgStr);
        lastByType[dev] = { ...(lastByType[dev] ?? {}), cfgAck: data };
        evt = { type: 'config-ack', deviceId: dev, payload: data, ts } as any;
      }

      if (evt) {
        eventBus.emitEvent(evt);
        // persist asynchronously when DB configured (no-op otherwise)
        saveEvent(evt as any).catch(() => {});
        if (evt.type === 'config-ack') {
          saveConfigAck(dev, (evt as any).payload).catch(() => {});
        }
      }
    } catch (e) {
      console.error('MQTT message handling error:', e);
    }
  });

  client.on('error', (err: Error) => {
    console.error('MQTT error:', err?.message || err);
  });

  return client;
}

async function waitForConnected(timeoutMs = 6000): Promise<MqttClient | null> {
  const c = ensureConnected();
  if (c && c.connected) return c;
  return new Promise((resolve) => {
    const start = Date.now();
    let done = false;
    const finish = (val: MqttClient | null) => {
      if (done) return; done = true; resolve(val);
    };
    const onConnect = () => finish(client && client.connected ? client : null);
    const onError = () => {
      // keep waiting until timeout; connection may retry
    };
    if (client) {
      client.once('connect', onConnect);
      client.on('error', onError);
    }
    const check = () => {
      if (client && client.connected) return finish(client);
      if (Date.now() - start >= timeoutMs) return finish(client && client.connected ? client : null);
      setTimeout(check, 150);
    };
    check();
    setTimeout(() => {
      // safety timeout in case no events
      if (!done) finish(client && client.connected ? client : null);
    }, timeoutMs + 100);
  });
}

export async function publishCmd(cmd: CmdPayload, deviceId?: string) {
  const dev = deviceId || DEFAULTS.deviceId;
  const t = topicsForDevice(dev);
  const c = await waitForConnected();
  if (!c || !c.connected) {
    throw new Error('MQTT client not connected. Check MQTT_HOST and credentials in .env.local');
  }
  await new Promise<void>((resolve, reject) => {
    c.publish(t.cmd, JSON.stringify(cmd), { qos: 1 }, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function publishConfig(obj: any, deviceId?: string) {
  const dev = deviceId || DEFAULTS.deviceId;
  const t = topicsForDevice(dev);
  const c = await waitForConnected();
  if (!c || !c.connected) {
    throw new Error('MQTT client not connected. Check MQTT_HOST and credentials in .env.local');
  }
  const payload = typeof obj === 'string' ? obj : JSON.stringify(obj);
  await new Promise<void>((resolve, reject) => {
    c.publish(t.cfgSet, payload, { qos: 1 }, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
