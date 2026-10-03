import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { cos, sin } from '../../utils/math.utils';
import { KeyLabel } from '../../models/key-label.models';
import { KeyLabelComponent } from '../key-label/key-label.component';

// Radii/gap tuned to match the device layout drawing ported from alnitak.
const o = 8;
const R1 = 65;
const R2 = 175;

// Available label box for a sector: width is conservatively based on the
// chord at the inner radius (the narrowest point of the donut slice, so
// text never overflows past the inner arc), height is the radial band
// between R1/R2. Both get a small safety margin.
const LABEL_MAX_WIDTH = R1 * Math.SQRT2 * 0.85;
const LABEL_MAX_HEIGHT = (R2 - R1) * 0.85;

@Component({
  selector: '[appSwitchSector]',
  standalone: true,
  imports: [KeyLabelComponent],
  templateUrl: './switch-sector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchSectorComponent {
  readonly center = input.required<{ x: number; y: number }>();
  readonly strokeWidth = input<number>(1);
  readonly direction = input.required<'cw' | 'ccw'>();
  readonly degree = input.required<number>();
  readonly fontSize = input<number>(80);
  readonly label = input<KeyLabel | null>(null);
  readonly positionCode = input.required<number>();
  readonly keyClick = output<number>();

  readonly r1 = computed(() => {
    return R1;
  });

  readonly r2 = computed(() => {
    return R2 - this.strokeWidth();
  });

  readonly alpha1 = computed(() => {
    return (Math.asin(((o / 2) * Math.SQRT2) / this.r1()) / Math.PI) * 180;
  });

  readonly alpha2 = computed(() => {
    return (Math.asin(((o / 2) * Math.SQRT2) / this.r2()) / Math.PI) * 180;
  });

  readonly sectorPath = computed(() => {
    const center = this.center();
    const direction = this.direction();
    const d = this.degree();
    const cx = center.x;
    const cy = center.y;
    const dStart = d - 45;
    const dEnd = d + 45;
    const alpha1 = this.alpha1();
    const alpha2 = this.alpha2();
    const beta1Start = dStart + alpha1;
    const beta1End = dEnd - alpha1;
    const beta2Start = dStart + alpha2;
    const beta2End = dEnd - alpha2;
    const r1 = this.r1();
    const r2 = this.r2();
    if (direction === 'cw') {
      return `
        M ${cx + r1 * cos(beta1Start)} ${cy + r1 * sin(beta1Start)}
        A ${r1} ${r1} 0 0 1 ${cx + r1 * cos(beta1End)} ${cy + r1 * sin(beta1End)}
        L ${cx + r2 * cos(beta2End)} ${cy + r2 * sin(beta2End)}
        A ${r2} ${r2} 0 0 0 ${cx + r2 * cos(beta2Start)} ${cy + r2 * sin(beta2Start)}
      `;
    } else {
      return `
        M ${cx + r1 * cos(beta1End)} ${cy + r1 * sin(beta1End)}
        A ${r1} ${r1} 0 0 0 ${cx + r1 * cos(beta1Start)} ${cy + r1 * sin(beta1Start)}
        L ${cx + r2 * cos(beta2Start)} ${cy + r2 * sin(beta2Start)}
        A ${r2} ${r2} 0 0 1 ${cx + r2 * cos(beta2End)} ${cy + r2 * sin(beta2End)}
      `;
    }
  });

  readonly textRadius = (this.r1() + this.r2()) / 2;

  readonly textX = computed(() => {
    const d = this.degree();
    const center = this.center();
    return center.x + this.textRadius * cos(d);
  });
  readonly textY = computed(() => {
    const d = this.degree();
    const center = this.center();
    return center.y + this.textRadius * sin(d);
  });

  readonly labelMaxWidth = computed(() => LABEL_MAX_WIDTH);
  readonly labelMaxHeight = computed(() => LABEL_MAX_HEIGHT);
}
