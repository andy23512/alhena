import { DeviceType } from './device.models';
import { KeyLabel } from './key-label.models';

/**
 * One saved "set" of labels — a device type plus the labels drawn for it.
 * Named "layer" (not "profile"/"layout") since both of those already mean
 * something else for CharaChorder devices; this is just the one layer of
 * labels the user is currently editing. Users can keep several locally
 * and switch which one is active; see `LayerStore`.
 */
export interface Layer {
  id: string;
  name: string;
  deviceType: DeviceType;
  labels: Record<number, KeyLabel>;
}

export function createLayer(
  name: string,
  deviceType: DeviceType = DeviceType.Standard,
): Layer {
  return { id: generateLayerId(), name, deviceType, labels: {} };
}

function generateLayerId(): string {
  return crypto.randomUUID();
}
