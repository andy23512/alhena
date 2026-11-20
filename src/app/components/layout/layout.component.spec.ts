import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { POSITION_CODE_LAYOUT } from 'tangent-cc-lib';
import { KeyLabel, KeyLabelType } from '../../models/key-label.models';
import { SwitchComponent } from '../switch/switch.component';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
  });
  const set = (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };
  const switches = () =>
    fixture.debugElement
      .queryAll(By.directive(SwitchComponent))
      .map((d) => d.componentInstance as SwitchComponent);
  const svg = () => fixture.nativeElement.querySelector('svg') as SVGSVGElement;

  describe('with the 3rd thumb switch', () => {
    it('is on by default, with 9 switches on each hand', () => {
      expect(switches().length).toBe(18);
      expect(fixture.componentInstance.showThumb3Switch()).toBeTrue();
      expect(fixture.componentInstance.switches()).toEqual([
        'thumbEnd',
        'thumbMid',
        'thumbTip',
        'index',
        'middle',
        'middleMid',
        'ring',
        'ringMid',
        'little',
      ]);
    });

    it('is 3815 wide and 1890 tall: 10 columns and 5 rows of 350 with gaps of 35', () => {
      expect(svg().getAttribute('viewBox')).toBe('0 0 3815 1890');
      expect(fixture.componentInstance.gridRows()).toBe(5);
    });
  });

  describe('without the 3rd thumb switch', () => {
    beforeEach(() => set('showThumb3Switch', false));

    it('has 8 switches on each hand, without the one at the end of the thumb', () => {
      expect(switches().length).toBe(16);
      expect(fixture.componentInstance.switches()).not.toContain('thumbEnd');
      expect(fixture.componentInstance.switches().length).toBe(8);
    });

    it('is one row shorter', () => {
      expect(svg().getAttribute('viewBox')).toBe('0 0 3815 1505');
      expect(fixture.componentInstance.gridRows()).toBe(4);
    });
  });

  it('fits the space it is given, keeping its proportions', () => {
    expect(svg().getAttribute('width')).toBe('100%');
    expect(svg().getAttribute('height')).toBe('100%');
    expect(svg().getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('gives back its svg element, for saving as an image', () => {
    expect(fixture.componentInstance.getSvgElement()).toBe(svg());
  });

  describe('switches', () => {
    it('lists the left hand first, then the right, each in the same order', () => {
      const order = fixture.componentInstance.switches();
      const expected = [
        ...order.map((sw) => POSITION_CODE_LAYOUT.left[sw]),
        ...order.map((sw) => POSITION_CODE_LAYOUT.right[sw]),
      ];
      expect(switches().map((s) => s.positionCodeMap())).toEqual(expected);
    });

    it('turns the left hand clockwise and the right hand counter-clockwise', () => {
      expect(switches().map((s) => s.rotationDirection())).toEqual([
        ...Array(9).fill('cw'),
        ...Array(9).fill('ccw'),
      ]);
    });

    it('does not rotate any of them', () => {
      expect(
        switches().every(
          (s) => s.rotation() === 0 || Object.is(s.rotation(), -0),
        ),
      ).toBeTrue();
    });

    it('puts every switch at its own place', () => {
      const centers = switches().map((s) => `${s.center().x},${s.center().y}`);
      expect(new Set(centers).size).toBe(18);
    });

    it('covers all 90 position codes exactly once', () => {
      const codes = switches().flatMap((s) =>
        Object.values(s.positionCodeMap()),
      );
      expect(codes.length).toBe(90);
      expect([...codes].sort((a, b) => a - b)).toEqual([...Array(90).keys()]);
    });
  });

  describe('switchCenter', () => {
    const c = (
      sw: Parameters<LayoutComponent['switchCenter']>[0],
      side: 'left' | 'right',
    ) => fixture.componentInstance.switchCenter(sw, side);

    it('puts the left hand from the left edge in', () => {
      expect(c('little', 'left')).toEqual({ x: 175, y: 367.5 });
      expect(c('ring', 'left')).toEqual({ x: 560, y: 175 });
      expect(c('ringMid', 'left')).toEqual({ x: 560, y: 560 });
      expect(c('middle', 'left')).toEqual({ x: 945, y: 175 });
      expect(c('middleMid', 'left')).toEqual({ x: 945, y: 560 });
      expect(c('index', 'left')).toEqual({ x: 1330, y: 367.5 });
    });

    it('steps the thumb switches down and to the left', () => {
      expect(c('thumbTip', 'left')).toEqual({ x: 1715 - 87.5, y: 945 });
      expect(c('thumbMid', 'left')).toEqual({ x: 1715 - 175, y: 1330 });
      expect(c('thumbEnd', 'left')).toEqual({ x: 1715 - 262.5, y: 1715 });
    });

    it('mirrors the right hand across the middle', () => {
      for (const sw of [
        'little',
        'ring',
        'middle',
        'index',
        'thumbTip',
        'thumbMid',
        'thumbEnd',
      ] as const) {
        const l = c(sw, 'left');
        const r = c(sw, 'right');
        expect(r.x).toBe(3815 - l.x);
        expect(r.y).toBe(l.y);
      }
    });

    it('refuses a switch it does not know', () => {
      expect(() => c('pinky' as never, 'left')).toThrowError(
        'Unhandled switch case: pinky',
      );
    });

    it('gives a new object each time, so mirroring one does not move the other', () => {
      const a = c('little', 'left');
      c('little', 'right');
      expect(c('little', 'left')).toEqual(a);
    });
  });

  describe('keys', () => {
    it('passes the labels to every switch', () => {
      const labels: Record<number, KeyLabel> = {
        3: { type: KeyLabelType.Text, value: 'x' },
      };
      set('keyLabelMap', labels);
      expect(switches().every((s) => s.keyLabelMap() === labels)).toBeTrue();
    });

    it('passes the selected keys to every switch', () => {
      const keys = new Set([1, 2]);
      set('selectedKeys', keys);
      expect(switches().every((s) => s.selectedKeys() === keys)).toBeTrue();
    });

    it('gives the position code of a key that is clicked', () => {
      const clicks: number[] = [];
      fixture.componentInstance.keyClick.subscribe((c) => clicks.push(c));
      const paths = svg().querySelectorAll('path.cursor-pointer');
      (paths[0] as SVGPathElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      const first = switches()[0].positionCodeMap().n;
      expect(clicks).toEqual([first]);
    });

    it('shows each label on the key it belongs to', () => {
      const first = switches()[0].positionCodeMap();
      set('keyLabelMap', {
        [first.e]: { type: KeyLabelType.Text, value: 'E' },
      });
      const found = Array.from(svg().querySelectorAll('text')).map(
        (t) => t.textContent,
      );
      expect(found).toEqual(['E']);
    });
  });
});
