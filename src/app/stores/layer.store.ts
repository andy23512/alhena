import { Injectable, computed, effect, signal } from '@angular/core';
import { DeviceType, hasThumb3Switch } from '../models/device.models';
import { KeyColor, KeyLabel, KeyLabelType } from '../models/key-label.models';
import { Layer, createLayer } from '../models/layer.models';
import {
  ACTIVE_LAYER_ID_KEY,
  LAYERS_KEY,
  loadActiveLayerId,
  loadLayers,
  saveActiveLayerId,
  saveLayers,
} from '../utils/layer-storage.utils';

/**
 * Holds every locally-saved layer (a device type + its labels) and which
 * one is currently being edited. Replaces the old single-layout
 * LayoutStore/DeviceStore — a device type and its labels are always saved
 * and switched together, so they live in one layer instead of two
 * independent stores. Named "layer" rather than "profile"/"layout" since
 * both already mean something else for CharaChorder devices.
 *
 * Persisted to localStorage (`alhena-layers` for the list, same
 * `{version, labels}`-shaped label validation as the JSON export file;
 * `alhena-active-layer-id` for which one is selected) and kept in sync
 * across tabs via `storage` events.
 */
@Injectable({ providedIn: 'root' })
export class LayerStore {
  readonly layers = signal<Layer[]>(loadLayers());
  readonly activeLayerId = signal<string>(
    resolveActiveId(loadActiveLayerId(), this.layers()),
  );

  readonly activeLayer = computed<Layer>(() => {
    const layers = this.layers();
    return layers.find((l) => l.id === this.activeLayerId()) ?? layers[0];
  });

  readonly labels = computed(() => this.activeLayer().labels);
  readonly deviceType = computed(() => this.activeLayer().deviceType);
  readonly showThumb3Switch = computed(() =>
    hasThumb3Switch(this.deviceType()),
  );

  constructor() {
    effect(() => saveLayers(this.layers()));
    effect(() => saveActiveLayerId(this.activeLayerId()));

    window.addEventListener('storage', (event) => {
      if (event.key === LAYERS_KEY) {
        const layers = loadLayers();
        this.layers.set(layers);
        // The active id might not exist in this tab anymore (e.g. it was
        // deleted elsewhere); fall back the same way initial load does.
        this.activeLayerId.set(resolveActiveId(this.activeLayerId(), layers));
      } else if (event.key === ACTIVE_LAYER_ID_KEY) {
        this.activeLayerId.set(
          resolveActiveId(loadActiveLayerId(), this.layers()),
        );
      }
    });
  }

  switchLayer(id: string) {
    if (this.layers().some((l) => l.id === id)) {
      this.activeLayerId.set(id);
    }
  }

  /** Creates a new empty layer, switches to it, and returns it. */
  addLayer(name: string): Layer {
    const layer = createLayer(name);
    this.layers.update((layers) => [...layers, layer]);
    this.activeLayerId.set(layer.id);
    return layer;
  }

  /**
   * Deletes a layer. Refuses to delete the last remaining one (there's
   * always at least one active layer to edit). Switches to the first
   * remaining layer if the active one was deleted.
   */
  deleteLayer(id: string): boolean {
    if (this.layers().length <= 1) {
      return false;
    }
    this.layers.update((layers) => layers.filter((l) => l.id !== id));
    if (this.activeLayerId() === id) {
      this.activeLayerId.set(this.layers()[0].id);
    }
    return true;
  }

  renameLayer(id: string, name: string) {
    this.updateLayer(id, (layer) => ({ ...layer, name }));
  }

  setDeviceType(deviceType: DeviceType) {
    this.updateLayer(this.activeLayerId(), (layer) => ({
      ...layer,
      deviceType,
    }));
  }

  /** Replaces the active layer's entire label map, e.g. after importing a JSON file. */
  loadLabels(labels: Record<number, KeyLabel>) {
    this.updateLayer(this.activeLayerId(), (layer) => ({ ...layer, labels }));
  }

  setLabel(positionCode: number, label: KeyLabel) {
    this.updateLayer(this.activeLayerId(), (layer) => ({
      ...layer,
      labels: { ...layer.labels, [positionCode]: label },
    }));
  }

  /**
   * Sets (or, with `undefined`, removes) the fill color on every given key.
   * Keys without a label get an empty text label carrying just the color.
   */
  setColorForKeys(positionCodes: Iterable<number>, color: KeyColor | undefined) {
    this.patchKeys(positionCodes, (label) => {
      const next = { ...label };
      if (color) {
        next.color = color;
      } else {
        delete next.color;
      }
      return next;
    });
  }

  /** Dims (or un-dims) every given key. */
  setDimmedForKeys(positionCodes: Iterable<number>, dimmed: boolean) {
    this.patchKeys(positionCodes, (label) => {
      const next = { ...label };
      if (dimmed) {
        next.dimmed = true;
      } else {
        delete next.dimmed;
      }
      return next;
    });
  }

  private patchKeys(
    positionCodes: Iterable<number>,
    patch: (label: KeyLabel) => KeyLabel,
  ) {
    const codes = [...positionCodes];
    this.updateLayer(this.activeLayerId(), (layer) => {
      const labels = { ...layer.labels };
      for (const code of codes) {
        const next = patch(
          labels[code] ?? { type: KeyLabelType.Text, value: '' },
        );
        // A label with no text, color or dimming carries no information.
        if (!next.value && !next.color && !next.dimmed) {
          delete labels[code];
        } else {
          labels[code] = next;
        }
      }
      return { ...layer, labels };
    });
  }

  clearLabel(positionCode: number) {
    this.updateLayer(this.activeLayerId(), (layer) => {
      const labels = { ...layer.labels };
      delete labels[positionCode];
      return { ...layer, labels };
    });
  }

  private updateLayer(id: string, updater: (layer: Layer) => Layer) {
    this.layers.update((layers) =>
      layers.map((layer) => (layer.id === id ? updater(layer) : layer)),
    );
  }
}

function resolveActiveId(id: string | null, layers: Layer[]): string {
  if (id && layers.some((l) => l.id === id)) {
    return id;
  }
  return layers[0].id;
}
