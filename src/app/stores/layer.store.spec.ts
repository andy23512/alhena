import { TestBed } from '@angular/core/testing';
import { DeviceType } from '../models/device.models';
import { KeyLabel, KeyLabelType } from '../models/key-label.models';
import { createLayer } from '../models/layer.models';
import {
  ACTIVE_LAYER_ID_KEY,
  LAYERS_KEY,
  saveActiveLayerId,
  saveLayers,
} from '../utils/layer-storage.utils';
import { LayerStore } from './layer.store';

const text = (value: string, extra: Partial<KeyLabel> = {}): KeyLabel => ({
  type: KeyLabelType.Text,
  value,
  ...extra,
});

describe('LayerStore', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  function create() {
    TestBed.resetTestingModule();
    const store = TestBed.inject(LayerStore);
    TestBed.tick();
    return store;
  }
  const saved = () => JSON.parse(localStorage.getItem(LAYERS_KEY)!).layers;
  const fire = (key: string) =>
    window.dispatchEvent(new StorageEvent('storage', { key }));

  describe('first start', () => {
    it('has one empty layer for a standard device, and it is the active one', () => {
      const s = create();
      expect(s.layers().length).toBe(1);
      expect(s.activeLayer()).toBe(s.layers()[0]);
      expect(s.activeLayerId()).toBe(s.layers()[0].id);
      expect(s.labels()).toEqual({});
      expect(s.deviceType()).toBe(DeviceType.Standard);
      expect(s.showThumb3Switch()).toBeTrue();
    });

    it('saves what it starts with', () => {
      const s = create();
      expect(saved()).toEqual(s.layers());
      expect(localStorage.getItem(ACTIVE_LAYER_ID_KEY)).toBe(s.activeLayerId());
    });
  });

  describe('restoring', () => {
    const a = { ...createLayer('A'), id: 'a' };
    const b = {
      ...createLayer('B', DeviceType.MasterForge),
      id: 'b',
      labels: { 1: text('x') },
    };

    it('reads the saved layers and active layer', () => {
      saveLayers([a, b]);
      saveActiveLayerId('b');
      const s = create();
      expect(s.layers()).toEqual([a, b]);
      expect(s.activeLayerId()).toBe('b');
      expect(s.deviceType()).toBe(DeviceType.MasterForge);
      expect(s.showThumb3Switch()).toBeFalse();
      expect(s.labels()).toEqual({ 1: text('x') });
    });

    it('uses the first layer when the saved active layer is gone', () => {
      saveLayers([a, b]);
      saveActiveLayerId('zzz');
      expect(create().activeLayerId()).toBe('a');
    });

    it('uses the first layer when no active layer was saved', () => {
      saveLayers([a, b]);
      expect(create().activeLayerId()).toBe('a');
    });
  });

  describe('switchLayer', () => {
    it('makes another layer the active one, and saves the choice', () => {
      const s = create();
      const first = s.activeLayerId();
      const second = s.addLayer('Second');
      s.switchLayer(first);
      TestBed.tick();
      expect(s.activeLayerId()).toBe(first);
      expect(localStorage.getItem(ACTIVE_LAYER_ID_KEY)).toBe(first);
      s.switchLayer(second.id);
      expect(s.activeLayer()).toBe(second);
    });

    it('ignores an id that does not exist', () => {
      const s = create();
      const id = s.activeLayerId();
      s.switchLayer('nope');
      expect(s.activeLayerId()).toBe(id);
    });
  });

  describe('addLayer', () => {
    it('adds an empty layer at the end, switches to it and returns it', () => {
      const s = create();
      const first = s.layers()[0];
      const layer = s.addLayer('Second');
      expect(layer.name).toBe('Second');
      expect(layer.labels).toEqual({});
      expect(layer.deviceType).toBe(DeviceType.Standard);
      expect(s.layers()).toEqual([first, layer]);
      expect(s.activeLayerId()).toBe(layer.id);
      TestBed.tick();
      expect(saved().map((l: { name: string }) => l.name)).toEqual([
        'Layer 1',
        'Second',
      ]);
    });
  });

  describe('deleteLayer', () => {
    it('refuses to delete the last layer', () => {
      const s = create();
      expect(s.deleteLayer(s.activeLayerId())).toBeFalse();
      expect(s.layers().length).toBe(1);
    });

    it('deletes another layer and stays on the active one', () => {
      const s = create();
      const first = s.layers()[0];
      const second = s.addLayer('Second');
      s.switchLayer(first.id);
      expect(s.deleteLayer(second.id)).toBeTrue();
      expect(s.layers()).toEqual([first]);
      expect(s.activeLayerId()).toBe(first.id);
    });

    it('moves to the first layer when the active one is deleted', () => {
      const s = create();
      const first = s.layers()[0];
      s.addLayer('Second');
      const third = s.addLayer('Third');
      expect(s.deleteLayer(third.id)).toBeTrue();
      expect(s.activeLayerId()).toBe(first.id);
    });

    it('leaves the others alone when the id is unknown', () => {
      const s = create();
      s.addLayer('Second');
      expect(s.deleteLayer('nope')).toBeTrue();
      expect(s.layers().length).toBe(2);
    });
  });

  describe('editing', () => {
    it('renames only the layer asked for', () => {
      const s = create();
      const first = s.layers()[0];
      const second = s.addLayer('Second');
      s.renameLayer(first.id, 'Renamed');
      expect(s.layers().map((l) => l.name)).toEqual(['Renamed', 'Second']);
      expect(s.layers()[1]).toBe(second);
    });

    it('changes the device type of the active layer only', () => {
      const s = create();
      const first = s.layers()[0];
      s.addLayer('Second');
      s.setDeviceType(DeviceType.MasterForge);
      expect(s.deviceType()).toBe(DeviceType.MasterForge);
      expect(s.showThumb3Switch()).toBeFalse();
      expect(s.layers()[0]).toBe(first);
      s.switchLayer(first.id);
      expect(s.deviceType()).toBe(DeviceType.Standard);
    });

    it('sets and replaces a label', () => {
      const s = create();
      s.setLabel(4, text('a'));
      s.setLabel(9, text('b'));
      s.setLabel(4, text('c'));
      expect(s.labels()).toEqual({ 4: text('c'), 9: text('b') });
    });

    it('keeps labels apart between layers', () => {
      const s = create();
      s.setLabel(1, text('a'));
      const first = s.layers()[0].id;
      s.addLayer('Second');
      expect(s.labels()).toEqual({});
      s.setLabel(1, text('b'));
      s.switchLayer(first);
      expect(s.labels()).toEqual({ 1: text('a') });
    });

    it('replaces every label of the active layer when loading a file', () => {
      const s = create();
      s.setLabel(1, text('old'));
      s.loadLabels({ 2: text('new') });
      expect(s.labels()).toEqual({ 2: text('new') });
    });

    it('clears one label, leaving the rest', () => {
      const s = create();
      s.setLabel(1, text('a'));
      s.setLabel(2, text('b'));
      s.clearLabel(1);
      expect(s.labels()).toEqual({ 2: text('b') });
      s.clearLabel(50);
      expect(s.labels()).toEqual({ 2: text('b') });
    });

    it('saves each change', () => {
      const s = create();
      s.setLabel(3, text('z'));
      TestBed.tick();
      expect(saved()[0].labels).toEqual({ 3: text('z') });
    });
  });

  describe('color for many keys', () => {
    it('gives the same color to every key, keeping their text', () => {
      const s = create();
      s.setLabel(1, text('a'));
      s.setColorForKeys([1, 2], 'red');
      expect(s.labels()).toEqual({
        1: text('a', { color: 'red' }),
        2: text('', { color: 'red' }),
      });
    });

    it('takes any iterable, such as a Set', () => {
      const s = create();
      s.setColorForKeys(new Set([5, 6]), 'blue');
      expect(Object.keys(s.labels())).toEqual(['5', '6']);
    });

    it('takes the color off, and drops a label that is left empty', () => {
      const s = create();
      s.setLabel(1, text('a', { color: 'red' }));
      s.setColorForKeys([2], 'red');
      s.setColorForKeys([1, 2], undefined);
      expect(s.labels()).toEqual({ 1: text('a') });
    });

    it('keeps a label that is only dimmed when the color is taken off', () => {
      const s = create();
      s.setLabel(1, text('', { color: 'red', dimmed: true }));
      s.setColorForKeys([1], undefined);
      expect(s.labels()).toEqual({ 1: text('', { dimmed: true }) });
    });

    it('leaves keys that are not listed alone', () => {
      const s = create();
      s.setLabel(8, text('x'));
      s.setColorForKeys([1], 'mint');
      expect(s.labels()[8]).toEqual(text('x'));
    });

    it('does nothing for no keys', () => {
      const s = create();
      s.setLabel(8, text('x'));
      s.setColorForKeys([], 'mint');
      expect(s.labels()).toEqual({ 8: text('x') });
    });
  });

  describe('dimming many keys', () => {
    it('dims every key, keeping their text and color', () => {
      const s = create();
      s.setLabel(1, text('a', { color: 'blue' }));
      s.setDimmedForKeys([1, 2], true);
      expect(s.labels()).toEqual({
        1: text('a', { color: 'blue', dimmed: true }),
        2: text('', { dimmed: true }),
      });
    });

    it('un-dims them, and drops a label that is left empty', () => {
      const s = create();
      s.setLabel(1, text('a', { dimmed: true }));
      s.setDimmedForKeys([2], true);
      s.setDimmedForKeys([1, 2], false);
      expect(s.labels()).toEqual({ 1: text('a') });
    });

    it('does not make labels for keys when un-dimming', () => {
      const s = create();
      s.setDimmedForKeys([3], false);
      expect(s.labels()).toEqual({});
    });

    it('keeps an icon label as an icon', () => {
      const s = create();
      s.setLabel(1, { type: KeyLabelType.Icon, value: 'home' });
      s.setDimmedForKeys([1], true);
      expect(s.labels()[1]).toEqual({
        type: KeyLabelType.Icon,
        value: 'home',
        dimmed: true,
      });
    });
  });

  describe('changes from another tab', () => {
    it('follows the layers saved there', () => {
      const s = create();
      const other = { ...createLayer('From elsewhere'), id: 'x' };
      saveLayers([other]);
      fire(LAYERS_KEY);
      expect(s.layers()).toEqual([other]);
      // the layer that was active is gone, so it falls back to the first
      expect(s.activeLayerId()).toBe('x');
    });

    it('keeps the active layer when it still exists', () => {
      const s = create();
      const keep = s.addLayer('Keep');
      saveLayers([...s.layers(), { ...createLayer('New'), id: 'n' }]);
      fire(LAYERS_KEY);
      expect(s.activeLayerId()).toBe(keep.id);
      expect(s.layers().length).toBe(3);
    });

    it('follows the active layer chosen there', () => {
      const s = create();
      const first = s.layers()[0].id;
      s.addLayer('Second');
      saveActiveLayerId(first);
      fire(ACTIVE_LAYER_ID_KEY);
      expect(s.activeLayerId()).toBe(first);
    });

    it('ignores an active layer that does not exist here', () => {
      const s = create();
      const first = s.layers()[0].id;
      saveActiveLayerId('ghost');
      fire(ACTIVE_LAYER_ID_KEY);
      expect(s.activeLayerId()).toBe(first);
    });

    it('ignores other keys', () => {
      const s = create();
      s.addLayer('Second');
      const before = s.layers();
      saveLayers([createLayer('Elsewhere')]);
      fire('something-else');
      expect(s.layers()).toBe(before);
    });
  });
});
