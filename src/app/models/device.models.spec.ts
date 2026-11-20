import {
  DEVICE_TYPES,
  DEVICE_TYPE_LABELS,
  DeviceType,
  hasThumb3Switch,
} from './device.models';

describe('device models', () => {
  it('lists both device types', () => {
    expect([...DEVICE_TYPES]).toEqual([
      DeviceType.Standard,
      DeviceType.MasterForge,
    ]);
  });

  it('names every device type', () => {
    expect(DEVICE_TYPE_LABELS[DeviceType.Standard]).toBe(
      'CharaChorder One / CharaChorder Two / CCU',
    );
    expect(DEVICE_TYPE_LABELS[DeviceType.MasterForge]).toBe('Master Forge');
  });

  it('only leaves out the 3rd thumb switch on the Master Forge', () => {
    expect(hasThumb3Switch(DeviceType.Standard)).toBeTrue();
    expect(hasThumb3Switch(DeviceType.MasterForge)).toBeFalse();
  });
});
