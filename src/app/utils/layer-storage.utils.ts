// Reads/writes the list of Layers to localStorage. Kept separate from
// LayerStore so the parsing/validation can be unit-tested (once a test
// runner exists) without pulling in Angular DI.

import { DEVICE_TYPES, DeviceType } from '../models/device.models';
import { Layer, createLayer } from '../models/layer.models';
import { parseLabels, parseLayoutExportFile } from './layout-export.utils';

export const LAYERS_KEY = 'alhena-layers';
export const ACTIVE_LAYER_ID_KEY = 'alhena-active-layer-id';
const LAYERS_VERSION = 1;

// Pre-multi-layer versions of the app stored a single label map here
// directly. Migrated into a first layer the first time layers load and
// nothing's in LAYERS_KEY yet, so existing users don't lose work.
const LEGACY_LABELS_KEY = 'alhena-labels';

export function loadLayers(): Layer[] {
  try {
    const raw = localStorage.getItem(LAYERS_KEY);
    if (raw) {
      const layers = parseStoredLayers(JSON.parse(raw));
      if (layers.length > 0) {
        return layers;
      }
    } else {
      const migrated = migrateLegacyLabels();
      if (migrated) {
        return [migrated];
      }
    }
    return [createLayer('Layer 1')];
  } catch {
    return [createLayer('Layer 1')];
  }
}

function migrateLegacyLabels(): Layer | null {
  try {
    const raw = localStorage.getItem(LEGACY_LABELS_KEY);
    if (!raw) {
      return null;
    }
    const labels = parseLayoutExportFile(JSON.parse(raw));
    if (Object.keys(labels).length === 0) {
      return null;
    }
    const layer = createLayer('Layer 1');
    return { ...layer, labels };
  } catch {
    return null;
  }
}

export function saveLayers(layers: Layer[]) {
  try {
    localStorage.setItem(
      LAYERS_KEY,
      JSON.stringify({ version: LAYERS_VERSION, layers }),
    );
  } catch {
    // Storage can be unavailable (quota, private browsing, etc.) — layers
    // still work for this tab, just without persistence.
  }
}

export function loadActiveLayerId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_LAYER_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveLayerId(id: string) {
  try {
    localStorage.setItem(ACTIVE_LAYER_ID_KEY, id);
  } catch {
    // See saveLayers above.
  }
}

function parseStoredLayers(data: unknown): Layer[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const { version, layers } = data as Record<string, unknown>;
  if (version !== LAYERS_VERSION || !Array.isArray(layers)) {
    return [];
  }
  const result: Layer[] = [];
  for (const entry of layers) {
    const layer = parseStoredLayer(entry);
    if (layer) {
      result.push(layer);
    }
  }
  return result;
}

function parseStoredLayer(value: unknown): Layer | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { id, name, deviceType, labels } = value as Record<string, unknown>;
  if (typeof id !== 'string' || typeof name !== 'string') {
    return null;
  }
  if (
    typeof deviceType !== 'string' ||
    !DEVICE_TYPES.includes(deviceType as DeviceType)
  ) {
    return null;
  }
  try {
    return { id, name, deviceType: deviceType as DeviceType, labels: parseLabels(labels) };
  } catch {
    return null;
  }
}
