import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  DIMMED_OPACITY,
  KEY_COLORS,
  KeyLabel,
  KeyLabelType,
} from '../../models/key-label.models';
import { SwitchSectorComponent } from './switch-sector.component';

@Component({
  imports: [SwitchSectorComponent],
  template: `<svg>
    <g
      appSwitchSector
      [center]="state().center"
      [degree]="state().degree"
      [direction]="state().direction"
      [label]="state().label"
      [positionCode]="state().positionCode"
      [selected]="state().selected"
      [strokeWidth]="state().strokeWidth"
      [fontSize]="state().fontSize"
      (keyClick)="clicks.push($event)"
    ></g>
  </svg>`,
})
class HostComponent {
  readonly state = signal<HostState>({
    center: { x: 500, y: 400 },
    degree: 270,
    direction: 'cw',
    label: null,
    positionCode: 17,
    selected: false,
    strokeWidth: 2,
    fontSize: 60,
  });
  clicks: number[] = [];
}

interface HostState {
  center: { x: number; y: number };
  degree: number;
  direction: 'cw' | 'ccw';
  label: KeyLabel | null;
  positionCode: number;
  selected: boolean;
  strokeWidth: number;
  fontSize: number;
}

describe('SwitchSectorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });
  const render = (over: Partial<HostState> = {}) => {
    host.state.update((s) => ({ ...s, ...over }));
    fixture.detectChanges();
  };
  const el = () => fixture.nativeElement as SVGElement;
  const paths = () =>
    Array.from(el().querySelectorAll('path')) as SVGPathElement[];
  const clickable = () =>
    paths().find((p) => p.classList.contains('cursor-pointer'))!;
  const sector = () =>
    fixture.debugElement.query(By.directive(SwitchSectorComponent))
      .componentInstance as SwitchSectorComponent;
  const numbers = (d: string) =>
    (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
  const polar = (x: number, y: number) => ({
    r: Math.hypot(x - 500, y - 400),
    deg: ((Math.atan2(y - 400, x - 500) * 180) / Math.PI + 360) % 360,
  });

  describe('shape', () => {
    it('is a ring slice: inner arc, a straight edge out, outer arc back, closed', () => {
      render();
      const d = clickable().getAttribute('d')!.replace(/\s+/g, ' ').trim();
      expect(d).toMatch(
        /^M [\d. -]+ A 65 65 0 0 1 [\d. -]+ L [\d. -]+ A 173 173 0 0 0 [\d. -]+ Z$/,
      );
    });

    it('starts on the inner circle and ends on the outer circle, shrunk by the stroke width', () => {
      render({ strokeWidth: 5 });
      const d = clickable().getAttribute('d')!;
      expect(d).toContain('A 65 65');
      expect(d).toContain('A 170 170');
      const n = numbers(d);
      const start = polar(n[0], n[1]);
      expect(start.r).toBeCloseTo(65, 6);
      const lineEnd = polar(n[9], n[10]);
      expect(lineEnd.r).toBeCloseTo(170, 6);
    });

    it('is centered on the direction, about 90° wide, with a small gap to the neighbors', () => {
      render({ degree: 270, strokeWidth: 0 });
      const n = numbers(clickable().getAttribute('d')!);
      const innerStart = polar(n[0], n[1]);
      const innerEnd = polar(n[7], n[8]);
      const outerEnd = polar(n[9], n[10]);
      const outerStart = polar(n[16], n[17]);
      // half-gap in degrees: asin(o/2*sqrt2 / r)
      const a1 = (Math.asin((4 * Math.SQRT2) / 65) * 180) / Math.PI;
      const a2 = (Math.asin((4 * Math.SQRT2) / 175) * 180) / Math.PI;
      expect(innerStart.deg).toBeCloseTo(225 + a1, 6);
      expect(innerEnd.deg).toBeCloseTo(315 - a1, 6);
      expect(outerEnd.deg).toBeCloseTo(315 - a2, 6);
      expect(outerStart.deg).toBeCloseTo(225 + a2, 6);
    });

    it('turns with the degree', () => {
      render({ degree: 0, strokeWidth: 0 });
      const n = numbers(clickable().getAttribute('d')!);
      const mid = (polar(n[0], n[1]).deg + 360 + polar(n[7], n[8]).deg) / 2;
      expect(((mid % 360) + 360) % 360).toBeCloseTo(0, 6);
    });

    it('is drawn the other way round for counter-clockwise', () => {
      render({ direction: 'ccw', strokeWidth: 0 });
      const d = clickable().getAttribute('d')!.replace(/\s+/g, ' ');
      expect(d).toMatch(/A 65 65 0 0 0 .* A 175 175 0 0 1 /);
      const n = numbers(d);
      // begins at the end side of the inner arc
      const a1 = (Math.asin((4 * Math.SQRT2) / 65) * 180) / Math.PI;
      expect(polar(n[0], n[1]).deg).toBeCloseTo(315 - a1, 6);
    });

    it('moves with the center', () => {
      render({ center: { x: 0, y: 0 }, strokeWidth: 0 });
      const n = numbers(clickable().getAttribute('d')!);
      expect(Math.hypot(n[0], n[1])).toBeCloseTo(65, 6);
    });
  });

  describe('clicking', () => {
    it('gives the position code of the key', () => {
      render({ positionCode: 42 });
      clickable().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(host.clicks).toEqual([42]);
    });

    it('has a stroke of the given width and nothing but a hover fill', () => {
      render({ strokeWidth: 3 });
      expect(clickable().getAttribute('stroke-width')).toBe('3');
      expect(clickable().classList).toContain('fill-transparent');
      expect(clickable().classList).toContain('stroke-current');
    });
  });

  describe('color and dimming', () => {
    const label = (extra: Partial<KeyLabel>): KeyLabel => ({
      type: KeyLabelType.Text,
      value: 'a',
      ...extra,
    });
    const wrapper = () => el().querySelector('g > g') as SVGGElement;

    it('has no fill layer without a color', () => {
      render({ label: label({}) });
      expect(paths().length).toBe(1);
      expect(sector().fillColor()).toBeNull();
    });

    it('has a fill layer in the key color that ignores the pointer, below the clickable shape', () => {
      render({ label: label({ color: 'mint' }) });
      expect(paths().length).toBe(2);
      const fill = paths()[0];
      expect(fill.getAttribute('fill')).toBe(KEY_COLORS.mint);
      expect(fill.getAttribute('pointer-events')).toBe('none');
      expect(fill.getAttribute('d')).toBe(clickable().getAttribute('d'));
    });

    it('turns the label black on a colored key only', () => {
      render({ label: label({ color: 'red' }) });
      expect(
        (el().querySelector('g[appKeyLabel], g g g') as SVGGElement).style
          .color,
      ).toBe('rgb(0, 0, 0)');
      render({ label: label({}) });
      expect(
        (el().querySelector('g[appKeyLabel], g g g') as SVGGElement).style
          .color,
      ).toBe('');
    });

    it('fades the whole key when dimmed', () => {
      render({ label: label({ dimmed: true }) });
      expect(wrapper().style.opacity).toBe(String(DIMMED_OPACITY));
      render({ label: label({ dimmed: false }) });
      expect(wrapper().style.opacity).toBe('');
      render({ label: null });
      expect(wrapper().style.opacity).toBe('');
    });
  });

  describe('label', () => {
    // Current behavior, probably not meant: the radius the label sits at is
    // worked out once, when the component is created, from the default line
    // width of 1 (so (65 + 174) / 2), and does not follow the strokeWidth input.
    it('is drawn halfway between the circles, along the direction', () => {
      render({ degree: 90 });
      expect(sector().textX()).toBeCloseTo(500, 6);
      expect(sector().textY()).toBeCloseTo(400 + 119.5, 6);
      render({ degree: 0 });
      expect(sector().textX()).toBeCloseTo(500 + 119.5, 6);
      expect(sector().textY()).toBeCloseTo(400, 6);
    });

    it('stays at that radius when the line width is different (known quirk)', () => {
      render({ degree: 90, strokeWidth: 20 });
      expect(sector().textY()).toBeCloseTo(400 + 119.5, 6);
    });

    it('gets a box that fits inside the slice', () => {
      render();
      expect(sector().labelMaxWidth()).toBeCloseTo(65 * Math.SQRT2 * 0.85, 10);
      expect(sector().labelMaxHeight()).toBeCloseTo((175 - 65) * 0.85, 10);
    });

    it('is shown as text in the sector', () => {
      render({ label: { type: KeyLabelType.Text, value: 'Z' } });
      expect(el().querySelector('text')!.textContent).toBe('Z');
    });
  });

  describe('selected', () => {
    it('has no outline normally', () => {
      render();
      expect(el().querySelector('[data-export-ignore]')).toBeNull();
    });

    it('has a dashed orange outline, three times as thick, left out of exports and print', () => {
      render({ selected: true, strokeWidth: 2 });
      const o = el().querySelector('[data-export-ignore]')!;
      expect(o.getAttribute('d')).toBe(clickable().getAttribute('d'));
      expect(o.getAttribute('stroke-width')).toBe('6');
      expect(o.getAttribute('stroke-dasharray')).toBe('14 8');
      expect(o.getAttribute('pointer-events')).toBe('none');
      expect(o.classList).toContain('stroke-[#ff9800]');
      expect(o.classList).toContain('print:hidden');
    });
  });
});
