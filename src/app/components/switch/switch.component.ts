import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DirectionMap } from 'tangent-cc-lib';
import { KeyLabel } from '../../models/key-label.models';
import { KeyLabelComponent } from '../key-label/key-label.component';
import { SwitchSectorComponent } from '../switch-sector/switch-sector.component';

// The center/tap target is a circle of this radius; its label box is the
// largest square that fits inside it, with a small safety margin.
export const CENTER_RADIUS = 53.68;
const CENTER_LABEL_SIZE = CENTER_RADIUS * Math.SQRT2 * 0.85;

@Component({
  selector: '[appSwitch]',
  standalone: true,
  imports: [SwitchSectorComponent, KeyLabelComponent],
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchComponent {
  readonly fontSize = input<number>(90);
  readonly center = input.required<{ x: number; y: number }>();
  readonly rotationDirection = input.required<'cw' | 'ccw'>();
  readonly rotation = input<number>(0);
  readonly strokeWidth = input<number>(1);
  sectors: { direction: 'n' | 'e' | 's' | 'w'; degree: number }[] = [
    { direction: 'n', degree: 270 },
    { direction: 'e', degree: 0 },
    { direction: 's', degree: 90 },
    { direction: 'w', degree: 180 },
  ];
  readonly positionCodeMap = input.required<DirectionMap<number>>();
  readonly keyLabelMap = input<Record<number, KeyLabel>>({});
  readonly keyClick = output<number>();
  readonly r = computed(() => {
    return (this.rotationDirection() === 'cw' ? 1 : -1) * this.rotation();
  });

  readonly centerRadius = computed(() => CENTER_RADIUS);
  readonly centerLabelSize = computed(() => CENTER_LABEL_SIZE);
}
