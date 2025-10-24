export type ValveId = 'v1' | 'v2' | 'v3';

export function toDeviceValve(valveId: ValveId): number {
  switch (valveId) {
    case 'v1': return 1;
    case 'v2': return 2;
    case 'v3': return 3;
    default: return 0;
  }
}

export const SUPPORTED_VALVES: ValveId[] = ['v1','v2','v3'];
