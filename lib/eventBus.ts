import type { DeviceEvent } from './types';

// Minimal event bus without Node's EventEmitter to avoid Node typings

type Listener = (evt: DeviceEvent) => void;

class DeviceEventBus {
  private listeners: Set<Listener> = new Set();

  emitEvent(evt: DeviceEvent) {
    for (const l of Array.from(this.listeners)) {
      try { l(evt); } catch { /* ignore listener errors */ }
    }
  }

  onEvent(cb: Listener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const eventBus = new DeviceEventBus();
