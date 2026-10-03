import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  FingerMap,
  HandMap,
  POSITION_CODE_LAYOUT,
} from 'tangent-cc-lib';
import { KeyLabel } from '../../models/key-label.models';
import { SwitchComponent } from '../switch/switch.component';

const cellSize = 350;
const gap = 35;
const gridColumns = 10;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [SwitchComponent],
  templateUrl: './layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  // Whether the device has the 3rd thumb switch (CharaChorder One / Two /
  // CCU do; Master Forge does not). Resolved from the chosen device type by
  // the page component (see DeviceStore), passed down as a plain input so
  // this component stays decoupled from device selection.
  public showThumb3Switch = input<boolean>(true);

  // Labels assigned by the user, keyed by position code (0-89).
  public keyLabelMap = input<Record<number, KeyLabel>>({});
  public keyClick = output<number>();

  private readonly svgRoot =
    viewChild.required<ElementRef<SVGSVGElement>>('svgRoot');

  /** The rendered `<svg>` element, e.g. for image export. */
  getSvgElement(): SVGSVGElement {
    return this.svgRoot().nativeElement;
  }

  public gridRows = computed(() => {
    const showThumb3Switch = this.showThumb3Switch();
    return showThumb3Switch ? 5 : 4;
  });
  public viewBoxWidth = cellSize * gridColumns + gap * (gridColumns - 1);
  public viewBoxHeight = computed(() => {
    const gridRows = this.gridRows();
    return cellSize * gridRows + gap * (gridRows - 1);
  });

  readonly positionCodeLayout = POSITION_CODE_LAYOUT;
  readonly switches = computed(() => {
    const showThumb3Switch = this.showThumb3Switch();
    if (showThumb3Switch) {
      return [
        'thumbEnd',
        'thumbMid',
        'thumbTip',
        'index',
        'middle',
        'middleMid',
        'ring',
        'ringMid',
        'little',
      ] as const;
    }
    return [
      'thumbMid',
      'thumbTip',
      'index',
      'middle',
      'middleMid',
      'ring',
      'ringMid',
      'little',
    ] as const;
  });
  sides = ['left', 'right'] as const;

  // Port note: alnitak makes these configurable via a settings store;
  // alhena keeps them fixed at 0 for now (no rotation).
  thumbRotationAngle = computed(() => 0);
  nonThumbRotationAngle = computed(() => 0);

  gridY(rowIndex: number) {
    return rowIndex * (cellSize + gap) + cellSize / 2;
  }

  gridX(columnIndex: number) {
    return columnIndex * (cellSize + gap) + cellSize / 2;
  }

  switchCenter(sw: keyof FingerMap<unknown>, side: keyof HandMap<unknown>) {
    let position: { x: number; y: number };
    switch (sw) {
      case 'little':
        position = { x: this.gridX(0), y: this.gridY(0.5) };
        break;
      case 'ring':
        position = { x: this.gridX(1), y: this.gridY(0) };
        break;
      case 'ringMid':
        position = { x: this.gridX(1), y: this.gridY(1) };
        break;
      case 'middle':
        position = { x: this.gridX(2), y: this.gridY(0) };
        break;
      case 'middleMid':
        position = { x: this.gridX(2), y: this.gridY(1) };
        break;
      case 'index':
        position = { x: this.gridX(3), y: this.gridY(0.5) };
        break;
      case 'thumbTip':
        position = { x: this.gridX(4) - cellSize / 4, y: this.gridY(2) };
        break;
      case 'thumbMid':
        position = { x: this.gridX(4) - cellSize / 2, y: this.gridY(3) };
        break;
      case 'thumbEnd':
        position = { x: this.gridX(4) - (cellSize * 3) / 4, y: this.gridY(4) };
        break;
      default:
        throw new Error(`Unhandled switch case: ${sw}`);
    }
    if (side === 'right') {
      position.x = this.viewBoxWidth - position.x;
    }
    return position;
  }
}
