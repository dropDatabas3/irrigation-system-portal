export type DeviceEvent =
  | { type: 'status'; deviceId: string; payload: any; ts: number }
  | { type: 'result'; deviceId: string; payload: any; ts: number }
  | { type: 'lwt'; deviceId: string; payload: string; ts: number }
  | { type: 'config-ack'; deviceId: string; payload: any; ts: number }
  | { type: 'info'; deviceId: string; payload: any; ts: number };

export type CmdPayload =
  | { action: 'water'; valve: number; liters: number }
  | { action: 'alloff' }
  | { action: 'openMs'; valve: number; ms: number }
  | { action: 'chipInfo' }
  | { action: 'startAp' }
  | { action: 'restart' }
  | { action: 'syncTime' }
  | { action: 'get-jobs' }
  | { action: 'wifiSet'; ssid: string; pass: string };
