// Fits a label into an available width/height box: wrap into multiple
// lines first, shrink the font size step by step if it still overflows,
// and finally truncate the last visible line with "…" if even the
// smallest allowed font size doesn't fit. Deliberately avoids anything
// screen-only (hover tooltips, etc.) since the result also needs to work
// for exported images and print.

const DEFAULT_FONT_FAMILY = 'Roboto, "Helvetica Neue", Arial, sans-serif';
const LINE_HEIGHT_RATIO = 1.15;
const FONT_SIZE_STEP = 2;

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureContext) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context is not available for text measurement.');
    }
    measureContext = ctx;
  }
  return measureContext;
}

export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string = DEFAULT_FONT_FAMILY,
): number {
  const ctx = getMeasureContext();
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

/**
 * Greedy word-wrap. A single word that's wider than `maxWidth` by itself
 * gets broken mid-word (labels like "Backspace" have no spaces to wrap on).
 */
function wrapLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  fontFamily: string,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(candidate, fontSize, fontFamily) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }

    // `current` is a single word here if it didn't fit above; break it by
    // character so an overlong word doesn't just overflow silently.
    while (
      current.length > 1 &&
      measureTextWidth(current, fontSize, fontFamily) > maxWidth
    ) {
      let splitAt = current.length - 1;
      while (
        splitAt > 1 &&
        measureTextWidth(current.slice(0, splitAt), fontSize, fontFamily) > maxWidth
      ) {
        splitAt--;
      }
      lines.push(current.slice(0, splitAt));
      current = current.slice(splitAt);
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export interface FitTextOptions {
  maxWidth: number;
  maxHeight: number;
  maxFontSize: number;
  minFontSize: number;
  fontFamily?: string;
}

export interface FitTextResult {
  lines: string[];
  fontSize: number;
  truncated: boolean;
}

export function fitText(text: string, options: FitTextOptions): FitTextResult {
  const { maxWidth, maxHeight, maxFontSize, minFontSize } = options;
  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
  const trimmed = text.trim();
  if (!trimmed) {
    return { lines: [''], fontSize: maxFontSize, truncated: false };
  }

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= FONT_SIZE_STEP) {
    const lines = wrapLines(trimmed, fontSize, maxWidth, fontFamily);
    const totalHeight = lines.length * fontSize * LINE_HEIGHT_RATIO;
    const widestLine = Math.max(
      ...lines.map((line) => measureTextWidth(line, fontSize, fontFamily)),
    );
    if (totalHeight <= maxHeight && widestLine <= maxWidth) {
      return { lines, fontSize, truncated: false };
    }
  }

  // Still doesn't fit even at the minimum readable size: keep only as many
  // lines as fit vertically, and truncate the last visible line with "…".
  const fontSize = minFontSize;
  const lines = wrapLines(trimmed, fontSize, maxWidth, fontFamily);
  const maxLines = Math.max(1, Math.floor(maxHeight / (fontSize * LINE_HEIGHT_RATIO)));
  const visible = lines.slice(0, maxLines);
  const truncated = lines.length > maxLines;
  if (truncated) {
    let last = visible[visible.length - 1];
    while (
      last.length > 1 &&
      measureTextWidth(`${last}…`, fontSize, fontFamily) > maxWidth
    ) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = `${last}…`;
  }
  return { lines: visible, fontSize, truncated };
}

export { LINE_HEIGHT_RATIO };
