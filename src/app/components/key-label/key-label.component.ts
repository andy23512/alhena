import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { KeyLabel, KeyLabelType } from '../../models/key-label.models';

@Component({
  selector: '[appKeyLabel]',
  standalone: true,
  templateUrl: './key-label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyLabelComponent {
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly fontSize = input<number>(80);
  readonly label = input<KeyLabel | null>(null);
  KeyLabelType = KeyLabelType;

  // TODO: this only scales by character count for now. The planned behavior
  // (auto-wrap, then shrink to a minimum readable size, then truncate with
  // "…") still needs to be implemented once the key editing UI exists.
  readonly computedFontSize = computed(() => {
    const label = this.label();
    const fontSize = this.fontSize();
    if (!label || label.type === KeyLabelType.Icon) {
      return fontSize * 0.8;
    }
    const { value } = label;
    if (value.length > 2) {
      return fontSize * 0.6;
    }
    if (value.length > 1) {
      return fontSize * 0.8;
    }
    return fontSize;
  });
}
