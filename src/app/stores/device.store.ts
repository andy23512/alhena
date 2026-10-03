import { Injectable, computed, signal } from '@angular/core';
import { DeviceType, hasThumb3Switch } from '../models/device.models';

/**
 * Holds which CharaChorder device variant the layout is being drawn for.
 * Plain signal-based service for now — see CLAUDE.md for when to promote
 * this to `@ngrx/signals`.
 */
@Injectable({ providedIn: 'root' })
export class DeviceStore {
  readonly deviceType = signal<DeviceType>(DeviceType.Standard);

  // Whether the current device has the 3rd thumb switch (CharaChorder
  // One/Two/CCU do; Master Forge does not).
  readonly showThumb3Switch = computed(() => hasThumb3Switch(this.deviceType()));

  setDeviceType(deviceType: DeviceType) {
    this.deviceType.set(deviceType);
  }
}
