import { DeviceType } from '../models/device.models';
import { KeyLabelType } from '../models/key-label.models';
import {
  ACTIVE_LAYER_ID_KEY,
  LAYERS_KEY,
  loadActiveLayerId,
  loadLayers,
  saveActiveLayerId,
  saveLayers,
} from './layer-storage.utils';

const TEXT = { type: KeyLabelType.Text, value: 'a' };
const LAYER = {
  id: 'L1',
  name: 'One',
  deviceType: DeviceType.Standard,
  labels: { 2: TEXT },
};

describe('layer storage', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  const stored = (layers: unknown, version: unknown = 1) =>
    localStorage.setItem(LAYERS_KEY, JSON.stringify({ version, layers }));

  it('uses the documented storage keys', () => {
    expect(LAYERS_KEY).toBe('alhena-layers');
    expect(ACTIVE_LAYER_ID_KEY).toBe('alhena-active-layer-id');
  });

  describe('loadLayers', () => {
    it('starts with one empty "Layer 1" when nothing is saved', () => {
      const layers = loadLayers();
      expect(layers.length).toBe(1);
      expect(layers[0].name).toBe('Layer 1');
      expect(layers[0].deviceType).toBe(DeviceType.Standard);
      expect(layers[0].labels).toEqual({});
    });

    it('gives back what was saved, in order', () => {
      const second = {
        ...LAYER,
        id: 'L2',
        name: 'Two',
        deviceType: DeviceType.MasterForge,
        labels: {},
      };
      saveLayers([LAYER, second]);
      expect(loadLayers()).toEqual([LAYER, second]);
    });

    it('starts afresh when the saved text is not JSON', () => {
      localStorage.setItem(LAYERS_KEY, '{oops');
      expect(loadLayers().map((l) => l.name)).toEqual(['Layer 1']);
    });

    it('starts afresh from another version, or a wrong shape', () => {
      stored([LAYER], 2);
      expect(loadLayers()[0].id).not.toBe('L1');
      stored('nope');
      expect(loadLayers()[0].id).not.toBe('L1');
      localStorage.setItem(LAYERS_KEY, 'null');
      expect(loadLayers()[0].id).not.toBe('L1');
      localStorage.setItem(LAYERS_KEY, '5');
      expect(loadLayers()[0].id).not.toBe('L1');
    });

    it('starts afresh when the saved list is empty', () => {
      stored([]);
      expect(loadLayers().length).toBe(1);
      expect(loadLayers()[0].name).toBe('Layer 1');
    });

    it('skips a broken layer and keeps the good ones', () => {
      stored([
        LAYER,
        null,
        'x',
        { ...LAYER, id: 5 },
        { ...LAYER, name: 5 },
        { ...LAYER, deviceType: 'phone' },
        { ...LAYER, deviceType: 5 },
        { ...LAYER, labels: { '99': TEXT } },
        { ...LAYER, labels: null },
        { ...LAYER, id: 'L9' },
      ]);
      expect(loadLayers().map((l) => l.id)).toEqual(['L1', 'L9']);
    });

    it('starts afresh when every saved layer is broken', () => {
      stored([null, { id: 1 }]);
      const layers = loadLayers();
      expect(layers.length).toBe(1);
      expect(layers[0].name).toBe('Layer 1');
    });

    it('does not use the old labels when layers are saved', () => {
      stored([]);
      localStorage.setItem(
        'alhena-labels',
        JSON.stringify({ version: 1, labels: { '1': TEXT } }),
      );
      expect(loadLayers()[0].labels).toEqual({});
    });
  });

  describe('moving old data over', () => {
    const legacy = (value: string) =>
      localStorage.setItem('alhena-labels', value);

    it('turns the old single label map into the first layer', () => {
      legacy(JSON.stringify({ version: 1, labels: { '4': TEXT } }));
      const layers = loadLayers();
      expect(layers.length).toBe(1);
      expect(layers[0].name).toBe('Layer 1');
      expect(layers[0].deviceType).toBe(DeviceType.Standard);
      expect(layers[0].labels).toEqual({ 4: TEXT });
    });

    it('ignores an old map with no labels', () => {
      legacy(JSON.stringify({ version: 1, labels: {} }));
      expect(loadLayers()[0].labels).toEqual({});
    });

    it('ignores old data that is broken', () => {
      legacy('{oops');
      expect(loadLayers()[0].labels).toEqual({});
      legacy(JSON.stringify({ version: 1, labels: { '1': 'a' } }));
      expect(loadLayers()[0].labels).toEqual({});
    });
  });

  describe('saveLayers', () => {
    it('writes a versioned list', () => {
      saveLayers([LAYER]);
      expect(JSON.parse(localStorage.getItem(LAYERS_KEY)!)).toEqual({
        version: 1,
        layers: [LAYER],
      });
    });

    it('does not throw when storage refuses', () => {
      spyOn(Storage.prototype, 'setItem').and.throwError('quota');
      expect(() => saveLayers([LAYER])).not.toThrow();
    });
  });

  describe('active layer id', () => {
    it('is null until one is saved', () => {
      expect(loadActiveLayerId()).toBeNull();
    });

    it('is given back once saved', () => {
      saveActiveLayerId('L2');
      expect(localStorage.getItem(ACTIVE_LAYER_ID_KEY)).toBe('L2');
      expect(loadActiveLayerId()).toBe('L2');
    });

    it('does not throw when storage refuses', () => {
      spyOn(Storage.prototype, 'setItem').and.throwError('quota');
      expect(() => saveActiveLayerId('x')).not.toThrow();
      (Storage.prototype.setItem as jasmine.Spy).and.callThrough();
      spyOn(Storage.prototype, 'getItem').and.throwError('denied');
      expect(loadActiveLayerId()).toBeNull();
      expect(loadLayers().length).toBe(1);
    });
  });
});
