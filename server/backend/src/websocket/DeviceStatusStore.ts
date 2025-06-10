export interface DeviceStatus extends Record<string, unknown> {
  sshRunning?: boolean;
  lastSeen: Date;
}

class DeviceStatusStore {
  private map = new Map<string, DeviceStatus>();

  update(deviceId: string, status: Partial<DeviceStatus>) {
    const existing = this.map.get(deviceId) ?? { lastSeen: new Date() };
    this.map.set(deviceId, { ...existing, ...status, lastSeen: new Date() });
  }

  get(deviceId: string): DeviceStatus | undefined {
    return this.map.get(deviceId);
  }

  getAll(): Record<string, DeviceStatus> {
    return Object.fromEntries(this.map.entries());
  }
}

export const deviceStatusStore = new DeviceStatusStore();
