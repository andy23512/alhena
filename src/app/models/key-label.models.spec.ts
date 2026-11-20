import {
  DIMMED_OPACITY,
  KEY_COLORS,
  KEY_COLOR_NAMES,
  isKeyColor,
} from './key-label.models';

describe('key label models', () => {
  it('has seven preset colors, each a hex code', () => {
    expect(KEY_COLOR_NAMES).toEqual([
      'periwinkle',
      'mint',
      'green',
      'red',
      'blue',
      'yellow',
      'gray',
    ]);
    for (const name of KEY_COLOR_NAMES) {
      expect(KEY_COLORS[name]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('knows a preset color name', () => {
    expect(isKeyColor('red')).toBeTrue();
    expect(isKeyColor('periwinkle')).toBeTrue();
  });

  it('does not accept anything else', () => {
    expect(isKeyColor('purple')).toBeFalse();
    expect(isKeyColor('#f44336')).toBeFalse();
    expect(isKeyColor('')).toBeFalse();
    expect(isKeyColor(undefined)).toBeFalse();
    expect(isKeyColor(null)).toBeFalse();
    expect(isKeyColor(1)).toBeFalse();
    expect(isKeyColor({})).toBeFalse();
  });

  // Current behavior, not wanted: `isKeyColor` uses `in`, so names that
  // every object inherits count as colors. An imported file could carry
  // `"color": "toString"`, and the key would be drawn with an undefined fill.
  it('takes names from the object prototype as colors (known gap)', () => {
    expect(isKeyColor('toString')).toBeTrue();
    expect(isKeyColor('constructor')).toBeTrue();
  });

  it('fades a dimmed key to 35%', () => {
    expect(DIMMED_OPACITY).toBe(0.35);
  });
});
