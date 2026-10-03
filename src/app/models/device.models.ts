export enum DeviceType {
  CharaChorderOne = 'charachorder-one',
  CharaChorderTwo = 'charachorder-two',
  Ccu = 'ccu',
  MasterForge = 'master-forge',
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  [DeviceType.CharaChorderOne]: 'CharaChorder One',
  [DeviceType.CharaChorderTwo]: 'CharaChorder Two',
  [DeviceType.Ccu]: 'CCU',
  [DeviceType.MasterForge]: 'Master Forge',
};

export const DEVICE_TYPES: readonly DeviceType[] = Object.values(DeviceType);

/** Only the Master Forge lacks the 3rd thumb switch. */
export function hasThumb3Switch(deviceType: DeviceType): boolean {
  return deviceType !== DeviceType.MasterForge;
}
