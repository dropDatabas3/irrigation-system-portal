export function deviceBaseTopic(deviceId: string) {
  return `irrigation/${deviceId}`;
}

export function topicsForDevice(deviceId: string) {
  const base = deviceBaseTopic(deviceId);
  return {
    base,
    cmd: `${base}/cmd`,
    status: `${base}/status`,
    result: `${base}/result`,
    lwt: `${base}/lwt`,
    cfgSet: `${base}/config/set`,
    cfgAck: `${base}/config/ack`,
  } as const;
}
