export enum KeyLabelType {
  Text = 'text',
  Icon = 'icon',
}

/** Preset fill colors for a key, picked from the palette used in the author's layout diagrams. */
export const KEY_COLORS = {
  periwinkle: '#7f96e0',
  mint: '#0be57a',
  green: '#4caf50',
  red: '#f44336',
  blue: '#2196f3',
  yellow: '#ffeb3b',
  gray: '#9e9e9e',
} as const;

export type KeyColor = keyof typeof KEY_COLORS;

export const KEY_COLOR_NAMES = Object.keys(KEY_COLORS) as KeyColor[];

export function isKeyColor(value: unknown): value is KeyColor {
  return typeof value === 'string' && value in KEY_COLORS;
}

/** Opacity applied to the whole key (fill, stroke, label) when `dimmed`. */
export const DIMMED_OPACITY = 0.35;

export interface KeyLabel {
  type: KeyLabelType;
  /** May be empty when the key only carries a `color` and/or `dimmed`. */
  value: string;
  /** Optional fill color of the key. */
  color?: KeyColor;
  /** Optional: draw the key faded out. */
  dimmed?: boolean;
}
