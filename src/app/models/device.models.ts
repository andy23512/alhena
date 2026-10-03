// The device type only ever affects one thing — whether the 3rd thumb
// switch is drawn — and CharaChorder One/Two/CCU all share the same
// answer, so the picker only needs to distinguish those from Master Forge.
export enum DeviceType {
  Standard = 'standard',
  MasterForge = 'master-forge',
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.Standard]: 'CharaChorder One / CharaChorder Two / CCU',
  [DeviceType.MasterForge]: 'Master Forge',
};

export const DEVICE_TYPES: readonly DeviceType[] = Object.values(DeviceType);

/** Only the Master Forge lacks the 3rd thumb switch. */
export function hasThumb3Switch(deviceType: DeviceType): boolean {
  return deviceType !== DeviceType.MasterForge;
}
