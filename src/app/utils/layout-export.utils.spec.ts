import { KeyLabelType } from '../models/key-label.models';
import { LAYOUT_EXPORT_VERSION } from '../models/layout-export.models';
import {
  isKeyLabel,
  parseLabels,
  parseLayoutExportFile,
  serializeLayout,
} from './layout-export.utils';

const TEXT = { type: KeyLabelType.Text, value: 'a' };

describe('serializeLayout', () => {
  it('wraps the labels with the version', () => {
    const labels = { 3: TEXT };
    expect(serializeLayout(labels)).toEqual({
      version: LAYOUT_EXPORT_VERSION,
      labels,
    });
    expect(LAYOUT_EXPORT_VERSION).toBe(1);
  });

  it('survives going through JSON', () => {
    const labels = {
      0: {
        type: KeyLabelType.Icon,
        value: 'home',
        color: 'red' as const,
        dimmed: true,
      },
      89: TEXT,
    };
    const back = parseLayoutExportFile(
      JSON.parse(JSON.stringify(serializeLayout(labels))),
    );
    expect(back).toEqual(labels);
  });
});

describe('parseLayoutExportFile', () => {
  it('reads a valid file into a number-keyed map', () => {
    const r = parseLayoutExportFile({ version: 1, labels: { '5': TEXT } });
    expect(r).toEqual({ 5: TEXT });
    expect(Object.keys(r)).toEqual(['5']);
  });

  it('accepts a file without any labels', () => {
    expect(parseLayoutExportFile({ version: 1, labels: {} })).toEqual({});
  });

  for (const bad of [null, undefined, 'text', 5, true]) {
    it(`refuses ${JSON.stringify(bad)}`, () => {
      expect(() => parseLayoutExportFile(bad)).toThrowError(
        'File is not a valid Alhena layout JSON object.',
      );
    });
  }

  it('refuses another version, and says which', () => {
    expect(() =>
      parseLayoutExportFile({ version: 2, labels: {} }),
    ).toThrowError('Unsupported layout file version: 2.');
    expect(() => parseLayoutExportFile({ labels: {} })).toThrowError(
      'Unsupported layout file version: undefined.',
    );
    expect(() =>
      parseLayoutExportFile({ version: '1', labels: {} }),
    ).toThrowError('Unsupported layout file version: "1".');
  });

  it('refuses a file without a labels object', () => {
    expect(() => parseLayoutExportFile({ version: 1 })).toThrowError(
      'File is missing a "labels" object.',
    );
    expect(() =>
      parseLayoutExportFile({ version: 1, labels: null }),
    ).toThrowError('File is missing a "labels" object.');
    expect(() =>
      parseLayoutExportFile({ version: 1, labels: 'x' }),
    ).toThrowError('File is missing a "labels" object.');
  });

  it('refuses a bad label inside', () => {
    expect(() =>
      parseLayoutExportFile({
        version: 1,
        labels: { '1': { type: 'x', value: '' } },
      }),
    ).toThrowError('Invalid label for position code 1.');
  });
});

describe('parseLabels', () => {
  it('refuses anything that is not an object', () => {
    for (const bad of [null, undefined, 3, 'a']) {
      expect(() => parseLabels(bad)).toThrowError(
        'Expected a "labels" object.',
      );
    }
  });

  it('accepts position codes 0 to 89', () => {
    expect(Object.keys(parseLabels({ '0': TEXT, '89': TEXT }))).toEqual([
      '0',
      '89',
    ]);
  });

  it('refuses codes outside 0 to 89, fractions, negatives and words', () => {
    for (const key of ['90', '-1', '1.5', 'a', '1e1x']) {
      expect(() => parseLabels({ [key]: TEXT }))
        .withContext(key)
        .toThrowError(`Invalid position code: "${key}".`);
    }
  });

  it('refuses an empty or blank key instead of reading it as position 0', () => {
    for (const key of ['', ' ', '  ']) {
      expect(() => parseLabels({ [key]: TEXT }))
        .withContext(JSON.stringify(key))
        .toThrowError(`Invalid position code: "${key}".`);
    }
  });

  it('refuses keys that only look like numbers once converted', () => {
    for (const key of ['1e1', '0x5', ' 5', '5 ', '+5']) {
      expect(() => parseLabels({ [key]: TEXT }))
        .withContext(key)
        .toThrowError();
    }
  });

  it('refuses a bad label, naming its code', () => {
    expect(() => parseLabels({ '7': 'a' })).toThrowError(
      'Invalid label for position code 7.',
    );
    expect(() => parseLabels({ '7': null })).toThrowError(
      'Invalid label for position code 7.',
    );
  });

  it('gives back an empty map for an empty object', () => {
    expect(parseLabels({})).toEqual({});
  });
});

describe('isKeyLabel', () => {
  it('accepts text and icon labels', () => {
    expect(isKeyLabel({ type: 'text', value: 'a' })).toBeTrue();
    expect(isKeyLabel({ type: 'icon', value: 'home' })).toBeTrue();
  });

  it('accepts an empty value, for a key that only has a color', () => {
    expect(isKeyLabel({ type: 'text', value: '', color: 'mint' })).toBeTrue();
  });

  it('accepts a color from the presets and a dimmed flag', () => {
    expect(
      isKeyLabel({ type: 'text', value: 'a', color: 'blue', dimmed: false }),
    ).toBeTrue();
    expect(isKeyLabel({ type: 'text', value: 'a', dimmed: true })).toBeTrue();
  });

  it('refuses a color that is not a preset', () => {
    expect(
      isKeyLabel({ type: 'text', value: 'a', color: 'purple' }),
    ).toBeFalse();
    expect(isKeyLabel({ type: 'text', value: 'a', color: null })).toBeFalse();
  });

  it('refuses a dimmed that is not a boolean', () => {
    expect(isKeyLabel({ type: 'text', value: 'a', dimmed: 1 })).toBeFalse();
    expect(
      isKeyLabel({ type: 'text', value: 'a', dimmed: 'true' }),
    ).toBeFalse();
  });

  it('refuses a wrong type or value', () => {
    expect(isKeyLabel({ type: 'image', value: 'a' })).toBeFalse();
    expect(isKeyLabel({ value: 'a' })).toBeFalse();
    expect(isKeyLabel({ type: 'text' })).toBeFalse();
    expect(isKeyLabel({ type: 'text', value: 1 })).toBeFalse();
  });

  it('refuses things that are not objects', () => {
    for (const bad of [null, undefined, 'text', 0, true]) {
      expect(isKeyLabel(bad)).toBeFalse();
    }
  });
});
