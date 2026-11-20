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

  // Names every object inherits are not colors; an imported file carrying
  // `"color": "toString"` would otherwise draw the key with an undefined fill.
  it('does not take names from the object prototype as colors', () => {
    for (const name of [
      'toString',
      'constructor',
      'hasOwnProperty',
      '__proto__',
    ]) {
      expect(isKeyColor(name)).withContext(name).toBeFalse();
    }
  });

  it('fades a dimmed key to 35%', () => {
    expect(DIMMED_OPACITY).toBe(0.35);
  });
});
