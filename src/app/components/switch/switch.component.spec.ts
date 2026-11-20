import { measureTextWidth } from '../../utils/text-fit.utils';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DirectionMap } from 'tangent-cc-lib';
import {
  DIMMED_OPACITY,
  KEY_COLORS,
  KeyLabel,
  KeyLabelType,
} from '../../models/key-label.models';
import { SwitchSectorComponent } from '../switch-sector/switch-sector.component';
import { CENTER_RADIUS, SwitchComponent } from './switch.component';

@Component({
  imports: [SwitchComponent],
  template: `<svg>
    <g
      appSwitch
      [center]="state().center"
      [rotationDirection]="state().rotationDirection"
      [rotation]="state().rotation"
      [strokeWidth]="state().strokeWidth"
      [positionCodeMap]="state().positionCodeMap"
      [keyLabelMap]="state().keyLabelMap"
      [selectedKeys]="state().selectedKeys"
      [fontSize]="state().fontSize"
      (keyClick)="clicks.push($event)"
    ></g>
  </svg>`,
})
class HostComponent {
  readonly state = signal<HostState>({
    center: { x: 300, y: 300 },
    rotationDirection: 'cw',
    rotation: 0,
    strokeWidth: 2,
    positionCodeMap: { n: 1, e: 2, s: 3, w: 4, c: 5 },
    keyLabelMap: {},
    selectedKeys: new Set(),
    fontSize: 70,
  });
  clicks: number[] = [];
}

interface HostState {
  center: { x: number; y: number };
  rotationDirection: 'cw' | 'ccw';
  rotation: number;
  strokeWidth: number;
  positionCodeMap: DirectionMap<number>;
  keyLabelMap: Record<number, KeyLabel>;
  selectedKeys: ReadonlySet<number>;
  fontSize: number;
}

const label = (value: string, extra: Partial<KeyLabel> = {}): KeyLabel => ({
  type: KeyLabelType.Text,
  value,
  ...extra,
});

describe('SwitchComponent', () => {
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
  const sectors = () =>
    fixture.debugElement
      .queryAll(By.directive(SwitchSectorComponent))
      .map((d) => d.componentInstance as SwitchSectorComponent);
  const centerCircle = () =>
    el().querySelector('circle.cursor-pointer') as SVGCircleElement;
  const outline = () => el().querySelector('circle[data-export-ignore]');
  const centerGroup = () => centerCircle().parentNode as SVGGElement;

  describe('four directions', () => {
    it('has a sector for each direction, north first and clockwise', () => {
      render();
      expect(sectors().map((s) => s.degree())).toEqual([270, 0, 90, 180]);
      expect(sectors().map((s) => s.positionCode())).toEqual([1, 2, 3, 4]);
    });

    it('passes down the center, line width, font and direction', () => {
      render({ rotationDirection: 'ccw', strokeWidth: 4, fontSize: 55 });
      for (const s of sectors()) {
        expect(s.center()).toEqual({ x: 300, y: 300 });
        expect(s.strokeWidth()).toBe(4);
        expect(s.fontSize()).toBe(55);
        expect(s.direction()).toBe('ccw');
      }
    });

    it('gives each sector the label of its own key', () => {
      render({ keyLabelMap: { 1: label('N'), 3: label('S'), 4: label('W') } });
      expect(sectors().map((s) => s.label()?.value)).toEqual([
        'N',
        undefined,
        'S',
        'W',
      ]);
    });

    it('tells which sectors are selected', () => {
      render({ selectedKeys: new Set([2, 4]) });
      expect(sectors().map((s) => s.selected())).toEqual([
        false,
        true,
        false,
        true,
      ]);
    });

    it('gives the key of the sector that was clicked', () => {
      render();
      const paths = el().querySelectorAll('path.cursor-pointer');
      (paths[2] as SVGPathElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      (paths[0] as SVGPathElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      expect(host.clicks).toEqual([3, 1]);
    });
  });

  describe('rotation', () => {
    it('adds to every degree for a clockwise switch', () => {
      render({ rotation: 30 });
      expect(sectors().map((s) => s.degree())).toEqual([300, 30, 120, 210]);
    });

    it('takes away from every degree for a counter-clockwise switch', () => {
      render({ rotationDirection: 'ccw', rotation: 30 });
      expect(sectors().map((s) => s.degree())).toEqual([240, -30, 60, 150]);
    });

    it('does not turn by default', () => {
      render();
      expect(sectors().map((s) => s.degree())).toEqual([270, 0, 90, 180]);
    });
  });

  describe('center key', () => {
    it('is a circle on the center, with a stroke of the given width', () => {
      render({ strokeWidth: 3 });
      const c = centerCircle();
      expect(c.getAttribute('cx')).toBe('300');
      expect(c.getAttribute('cy')).toBe('300');
      expect(c.getAttribute('r')).toBe(String(CENTER_RADIUS));
      expect(c.getAttribute('stroke-width')).toBe('3');
      expect(CENTER_RADIUS).toBe(53.68);
    });

    it('gives the center key when clicked', () => {
      render();
      centerCircle().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(host.clicks).toEqual([5]);
    });

    it('shows its label, from the center key', () => {
      render({ keyLabelMap: { 5: label('C'), 1: label('N') } });
      expect(
        Array.from(centerGroup().querySelectorAll('text')).map(
          (t) => t.textContent,
        ),
      ).toEqual(['C']);
    });

    it('has no fill layer without a color', () => {
      render({ keyLabelMap: { 5: label('C') } });
      expect(el().querySelectorAll('circle').length).toBe(1);
    });

    it('has a fill layer in the key color that ignores the pointer, with a black label', () => {
      render({ keyLabelMap: { 5: label('C', { color: 'blue' }) } });
      const fill = el().querySelector('circle[fill]')!;
      expect(fill.getAttribute('fill')).toBe(KEY_COLORS.blue);
      expect(fill.getAttribute('pointer-events')).toBe('none');
      expect(fill.getAttribute('r')).toBe(String(CENTER_RADIUS));
      expect(
        (centerGroup().querySelector('g') as SVGGElement).style.color,
      ).toBe('rgb(0, 0, 0)');
    });

    it('is not colored by the color of a sector', () => {
      render({ keyLabelMap: { 1: label('N', { color: 'red' }) } });
      expect(el().querySelector('circle[fill]')).toBeNull();
    });

    it('fades when dimmed', () => {
      render({ keyLabelMap: { 5: label('C', { dimmed: true }) } });
      expect(centerGroup().style.opacity).toBe(String(DIMMED_OPACITY));
      render({ keyLabelMap: { 5: label('C') } });
      expect(centerGroup().style.opacity).toBe('');
    });

    it('gets a label box that fits inside the circle', () => {
      render();
      const sw = fixture.debugElement.query(By.directive(SwitchComponent))
        .componentInstance as SwitchComponent;
      expect(sw.centerLabelSize()).toBeCloseTo(
        CENTER_RADIUS * Math.SQRT2 * 0.85,
        10,
      );
      expect(sw.centerRadius()).toBe(CENTER_RADIUS);
    });

    it('shrinks a long label to fit that box', () => {
      render({ keyLabelMap: { 5: label('Wide label here', {}) } });
      const size = (
        fixture.debugElement.query(By.directive(SwitchComponent))
          .componentInstance as SwitchComponent
      ).centerLabelSize();
      const lines = Array.from(centerGroup().querySelectorAll('text'));
      expect(lines.length).toBeGreaterThan(0);
      for (const t of lines) {
        expect(
          measureTextWidth(
            t.textContent!.replace('…', ''),
            parseFloat(t.style.fontSize),
          ),
        ).toBeLessThanOrEqual(size);
      }
    });

    it('has a dashed orange outline when selected, left out of exports and print', () => {
      render({ selectedKeys: new Set([5]), strokeWidth: 2 });
      const o = outline()!;
      expect(o.getAttribute('r')).toBe(String(CENTER_RADIUS));
      expect(o.getAttribute('stroke-width')).toBe('6');
      expect(o.getAttribute('stroke-dasharray')).toBe('14 8');
      expect(o.classList).toContain('print:hidden');
    });

    it('has no outline when another key is selected', () => {
      render({ selectedKeys: new Set([1]) });
      expect(outline()).toBeNull();
    });
  });
});
