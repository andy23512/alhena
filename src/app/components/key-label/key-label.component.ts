import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { KeyLabel, KeyLabelType } from '../../models/key-label.models';
import { fitText, LINE_HEIGHT_RATIO } from '../../utils/text-fit.utils';

const MIN_FONT_SIZE_RATIO = 0.35;
const ABSOLUTE_MIN_FONT_SIZE = 20;
const ICON_FONT_SIZE_RATIO = 0.8;

interface LabelLayout {
  lines: string[];
  fontSize: number;
  isIcon: boolean;
}

@Component({
  selector: '[appKeyLabel]',
  standalone: true,
  templateUrl: './key-label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyLabelComponent {
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  /** Preferred/maximum font size — shrinks down from here if needed. */
  readonly fontSize = input<number>(80);
  /** Available label area, in SVG user units, used to fit/wrap/truncate. */
  readonly maxWidth = input<number>(80);
  readonly maxHeight = input<number>(80);
  readonly label = input<KeyLabel | null>(null);
  KeyLabelType = KeyLabelType;

  // Auto-wrap text to fit the key shape; if it still overflows, shrink the
  // font size step by step down to a minimum readable size; if it still
  // doesn't fit at that size, truncate with "…". No hover tooltips, since
  // the result also needs to work for exported images/print.
  readonly layout = computed<LabelLayout | null>(() => {
    const label = this.label();
    if (!label) {
      return null;
    }
    const maxFontSize = this.fontSize();
    const minFontSize = Math.max(
      ABSOLUTE_MIN_FONT_SIZE,
      maxFontSize * MIN_FONT_SIZE_RATIO,
    );
    const maxWidth = this.maxWidth();
    const maxHeight = this.maxHeight();

    if (label.type === KeyLabelType.Icon) {
      // Icons are a single ligature glyph, not wrappable text — just clamp
      // its size to fit the available box.
      const fontSize = Math.max(
        minFontSize,
        Math.min(maxFontSize * ICON_FONT_SIZE_RATIO, maxWidth, maxHeight),
      );
      return { lines: [label.value], fontSize, isIcon: true };
    }

    const { lines, fontSize } = fitText(label.value, {
      maxWidth,
      maxHeight,
      maxFontSize,
      minFontSize,
    });
    return { lines, fontSize, isIcon: false };
  });

  lineY(index: number, lineCount: number, fontSize: number): number {
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    return this.y() + (index - (lineCount - 1) / 2) * lineHeight;
  }
}
