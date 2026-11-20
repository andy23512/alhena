import { DeviceType } from './device.models';
import { createLayer } from './layer.models';

describe('createLayer', () => {
  it('makes an empty layer for a standard device by default', () => {
    const layer = createLayer('My layer');
    expect(layer.name).toBe('My layer');
    expect(layer.deviceType).toBe(DeviceType.Standard);
    expect(layer.labels).toEqual({});
  });

  it('takes the device type', () => {
    expect(createLayer('x', DeviceType.MasterForge).deviceType).toBe(
      DeviceType.MasterForge,
    );
  });

  it('gives each layer its own id and its own labels', () => {
    const a = createLayer('a');
    const b = createLayer('b');
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect(a.labels).not.toBe(b.labels);
  });
});
