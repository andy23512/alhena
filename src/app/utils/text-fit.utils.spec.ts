import {
  LINE_HEIGHT_RATIO,
  FitTextOptions,
  fitText,
  measureTextWidth,
} from './text-fit.utils';

const OPTS: FitTextOptions = {
  maxWidth: 100,
  maxHeight: 60,
  maxFontSize: 20,
  minFontSize: 8,
};

describe('measureTextWidth', () => {
  it('is wider for more text and for a larger font', () => {
    expect(measureTextWidth('abcd', 16)).toBeGreaterThan(
      measureTextWidth('ab', 16),
    );
    expect(measureTextWidth('ab', 32)).toBeGreaterThan(
      measureTextWidth('ab', 16),
    );
  });

  it('grows in proportion to the font size', () => {
    expect(measureTextWidth('Hello', 40)).toBeCloseTo(
      measureTextWidth('Hello', 20) * 2,
      1,
    );
  });

  it('is 0 for no text', () => {
    expect(measureTextWidth('', 16)).toBe(0);
  });

  it('uses the font family it is given', () => {
    expect(measureTextWidth('mmmm', 16, 'monospace')).not.toBe(
      measureTextWidth('mmmm', 16, 'serif'),
    );
  });
});

describe('fitText', () => {
  it('keeps short text on one line at the largest size', () => {
    expect(fitText('a', OPTS)).toEqual({
      lines: ['a'],
      fontSize: 20,
      truncated: false,
    });
  });

  it('gives one empty line for blank text, at the largest size', () => {
    expect(fitText('', OPTS)).toEqual({
      lines: [''],
      fontSize: 20,
      truncated: false,
    });
    expect(fitText('   \n ', OPTS)).toEqual({
      lines: [''],
      fontSize: 20,
      truncated: false,
    });
  });

  it('trims the text and joins runs of spaces', () => {
    expect(fitText('  a   b  ', OPTS).lines).toEqual(['a b']);
  });

  it('wraps words onto more lines when they do not fit on one', () => {
    const r = fitText('aaaa bbbb cccc dddd', {
      ...OPTS,
      maxWidth: 70,
      maxHeight: 200,
      maxFontSize: 16,
      minFontSize: 16,
    });
    expect(r.lines.length).toBeGreaterThan(1);
    expect(r.lines.join(' ')).toBe('aaaa bbbb cccc dddd');
    for (const line of r.lines) {
      expect(measureTextWidth(line, 16)).toBeLessThanOrEqual(70);
    }
  });

  it('shrinks the font in steps of 2 until the text fits', () => {
    const r = fitText('Backspace', {
      maxWidth: 60,
      maxHeight: 40,
      maxFontSize: 30,
      minFontSize: 6,
    });
    expect(r.fontSize).toBeLessThan(30);
    expect((30 - r.fontSize) % 2).toBe(0);
    expect(r.truncated).toBeFalse();
    for (const line of r.lines) {
      expect(measureTextWidth(line, r.fontSize)).toBeLessThanOrEqual(60);
    }
    expect(r.lines.length * r.fontSize * LINE_HEIGHT_RATIO).toBeLessThanOrEqual(
      40,
    );
  });

  it('picks the largest size that fits, not a smaller one', () => {
    const r = fitText('Backspace', {
      maxWidth: 60,
      maxHeight: 40,
      maxFontSize: 30,
      minFontSize: 6,
    });
    const bigger = r.fontSize + 2;
    const w = measureTextWidth('Backspace', bigger);
    const fitsAtBigger = w <= 60 && bigger * LINE_HEIGHT_RATIO <= 40;
    // at the next size up, either it doesn't fit as one line or it needed more lines than allowed
    expect(fitsAtBigger).toBeFalse();
  });

  it('breaks a word that is too wide into pieces when it cannot shrink', () => {
    const r = fitText('Backspace', {
      maxWidth: 40,
      maxHeight: 200,
      maxFontSize: 20,
      minFontSize: 20,
    });
    expect(r.lines.length).toBeGreaterThan(1);
    expect(r.lines.join('')).toBe('Backspace');
    for (const line of r.lines) {
      expect(measureTextWidth(line, 20)).toBeLessThanOrEqual(40);
    }
  });

  it('truncates the last visible line with an ellipsis at the smallest size', () => {
    const r = fitText('one two three four five six seven eight nine ten', {
      maxWidth: 50,
      maxHeight: 20,
      maxFontSize: 12,
      minFontSize: 10,
    });
    expect(r.truncated).toBeTrue();
    expect(r.fontSize).toBe(10);
    expect(r.lines.length).toBe(
      Math.max(1, Math.floor(20 / (10 * LINE_HEIGHT_RATIO))),
    );
    expect(r.lines[r.lines.length - 1].endsWith('…')).toBeTrue();
    expect(
      measureTextWidth(r.lines[r.lines.length - 1], 10),
    ).toBeLessThanOrEqual(50);
  });

  it('keeps at least one line, however little height there is', () => {
    const r = fitText('one two three four five', {
      maxWidth: 40,
      maxHeight: 1,
      maxFontSize: 12,
      minFontSize: 10,
    });
    expect(r.lines.length).toBe(1);
    expect(r.truncated).toBeTrue();
  });

  it('does not truncate when a line fits exactly at the smallest size', () => {
    const w = measureTextWidth('abc', 10);
    const r = fitText('abc', {
      maxWidth: w,
      maxHeight: 12,
      maxFontSize: 10,
      minFontSize: 10,
    });
    expect(r).toEqual({ lines: ['abc'], fontSize: 10, truncated: false });
  });

  it('takes the font family into account', () => {
    const base = {
      maxWidth: 60,
      maxHeight: 40,
      maxFontSize: 30,
      minFontSize: 6,
    };
    const mono = fitText('mmmmmmmm', { ...base, fontFamily: 'monospace' });
    const narrow = fitText('iiiiiiii', { ...base, fontFamily: 'monospace' });
    expect(narrow.fontSize).toBeGreaterThanOrEqual(mono.fontSize);
  });

  describe('edges', () => {
    const tight = {
      maxWidth: 1,
      maxHeight: 1000,
      maxFontSize: 40,
      minFontSize: 10,
    };

    it('has a line height of 1.15', () => {
      expect(LINE_HEIGHT_RATIO).toBe(1.15);
    });

    it('shrinks two points at a time', () => {
      const r = fitText('shrinkme', {
        maxWidth: 1000,
        maxHeight: 38 * LINE_HEIGHT_RATIO,
        maxFontSize: 40,
        minFontSize: 10,
      });
      expect(r.fontSize).toBe(38);
      expect(r.lines).toEqual(['shrinkme']);
    });

    it('treats text of only spaces as empty, even in a box too small for any line', () => {
      expect(fitText('   ', { ...tight, maxHeight: 1 })).toEqual({
        lines: [''],
        fontSize: 40,
        truncated: false,
      });
    });

    it('does not count a character that is wider than the box as fitting', () => {
      const r = fitText('W', tight);
      expect(r.fontSize).toBe(10);
      expect(r.lines).toEqual(['W']);
      expect(r.truncated).toBeFalse();
    });

    it('breaks a word that is too wide down to single characters', () => {
      expect(fitText('WW', tight).lines).toEqual(['W', 'W']);
      expect(fitText('WWW', tight).lines).toEqual(['W', 'W', 'W']);
    });

    it('is not truncated when the lines exactly fill the height', () => {
      const r = fitText('W', { ...tight, maxHeight: 10 * LINE_HEIGHT_RATIO });
      expect(r.lines).toEqual(['W']);
      expect(r.truncated).toBeFalse();
    });

    it('keeps at least one character before the ellipsis', () => {
      const r = fitText('W W', { ...tight, maxHeight: 10 * LINE_HEIGHT_RATIO });
      expect(r.lines).toEqual(['W…']);
      expect(r.truncated).toBeTrue();
    });
  });
});
