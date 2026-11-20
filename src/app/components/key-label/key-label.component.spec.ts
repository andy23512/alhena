import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyLabel, KeyLabelType } from '../../models/key-label.models';
import {
  LINE_HEIGHT_RATIO,
  measureTextWidth,
} from '../../utils/text-fit.utils';
import { KeyLabelComponent } from './key-label.component';

@Component({
  imports: [KeyLabelComponent],
  template: `<svg>
    <g
      appKeyLabel
      [x]="state().x"
      [y]="state().y"
      [fontSize]="state().fontSize"
      [maxWidth]="state().maxWidth"
      [maxHeight]="state().maxHeight"
      [label]="state().label"
    ></g>
  </svg>`,
})
class HostComponent {
  readonly state = signal<HostState>({
    x: 100,
    y: 200,
    fontSize: 80,
    maxWidth: 300,
    maxHeight: 300,
    label: null,
  });
}

interface HostState {
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  maxHeight: number;
  label: KeyLabel | null;
}

describe('KeyLabelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const render = (label: KeyLabel | null, over: Partial<HostState> = {}) => {
    host.state.update((s) => ({ ...s, ...over, label }));
    fixture.detectChanges();
  };
  const texts = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('text'),
    ) as SVGTextElement[];
  const size = (t: SVGTextElement) => parseFloat(t.style.fontSize);
  const text = (value: string): KeyLabel => ({
    type: KeyLabelType.Text,
    value,
  });
  const icon = (value: string): KeyLabel => ({
    type: KeyLabelType.Icon,
    value,
  });

  it('draws nothing without a label', () => {
    render(null);
    expect(texts()).toEqual([]);
  });

  it('draws nothing for a label with no value, such as one that only has a color', () => {
    render({ type: KeyLabelType.Text, value: '', color: 'red' });
    expect(texts()).toEqual([]);
    render({ type: KeyLabelType.Icon, value: '' });
    expect(texts()).toEqual([]);
  });

  describe('text', () => {
    it('is drawn in the middle of the given point, not as an icon, and ignores the pointer', () => {
      render(text('a'));
      const [t] = texts();
      expect(t.textContent).toBe('a');
      expect(t.getAttribute('x')).toBe('100');
      expect(t.getAttribute('y')).toBe('200');
      expect(t.getAttribute('text-anchor')).toBe('middle');
      expect(t.getAttribute('dominant-baseline')).toBe('central');
      expect(t.getAttribute('pointer-events')).toBe('none');
      expect(t.classList).toContain('fill-current');
      expect(t.classList).not.toContain('material-symbols-rounded');
    });

    it('uses the preferred font size when it fits', () => {
      render(text('a'));
      expect(size(texts()[0])).toBe(80);
      render(text('a'), { fontSize: 50 });
      expect(size(texts()[0])).toBe(50);
    });

    it('shrinks to fit the box', () => {
      render(text('Backspace'), { maxWidth: 150, maxHeight: 100 });
      const ts = texts();
      expect(size(ts[0])).toBeLessThan(80);
      // too wide for one line even at the smallest size, so it is broken up
      expect(ts.map((t) => t.textContent).join('')).toBe('Backspace');
      for (const t of ts) {
        expect(measureTextWidth(t.textContent!, size(t))).toBeLessThanOrEqual(
          150,
        );
      }
      expect(ts.length * size(ts[0]) * LINE_HEIGHT_RATIO).toBeLessThanOrEqual(
        100,
      );
    });

    it('never shrinks below 20, or below 35% of the preferred size', () => {
      const long = 'a long label that cannot possibly fit in such a small box';
      render(text(long), { fontSize: 40, maxWidth: 30, maxHeight: 30 });
      expect(Math.min(...texts().map(size))).toBe(20);
      render(text(long), { fontSize: 100, maxWidth: 30, maxHeight: 30 });
      expect(Math.min(...texts().map(size))).toBe(35);
    });

    it('ends with an ellipsis when it still does not fit at the smallest size', () => {
      render(text('one two three four five six seven eight nine ten eleven'), {
        fontSize: 40,
        maxWidth: 80,
        maxHeight: 25,
      });
      const lines = texts();
      expect(lines.length).toBe(1);
      expect(lines[0].textContent!.endsWith('…')).toBeTrue();
    });

    it('is split over lines that are centered on the point, one line height apart', () => {
      render(text('aaa bbb ccc'), {
        fontSize: 40,
        maxWidth: 80,
        maxHeight: 300,
      });
      const ts = texts();
      expect(ts.length).toBeGreaterThan(1);
      expect(ts.map((t) => t.textContent!).join(' ')).toBe('aaa bbb ccc');
      const ys = ts.map((t) => parseFloat(t.getAttribute('y')!));
      const gap = size(ts[0]) * LINE_HEIGHT_RATIO;
      for (let i = 1; i < ys.length; i++) {
        expect(ys[i] - ys[i - 1]).toBeCloseTo(gap, 6);
      }
      expect(ys.reduce((a, b) => a + b, 0) / ys.length).toBeCloseTo(200, 6);
      expect(ts.every((t) => t.getAttribute('x') === '100')).toBeTrue();
    });
  });

  describe('icon', () => {
    it('is drawn with the icon font, as a single glyph', () => {
      render(icon('home'));
      expect(texts().length).toBe(1);
      expect(texts()[0].textContent).toBe('home');
      expect(texts()[0].classList).toContain('material-symbols-rounded');
    });

    it('is 80% of the preferred size when the box is large', () => {
      render(icon('home'));
      expect(size(texts()[0])).toBe(64);
    });

    it('is no bigger than the width or the height of the box', () => {
      render(icon('home'), { maxWidth: 40, maxHeight: 300 });
      expect(size(texts()[0])).toBe(40);
      render(icon('home'), { maxWidth: 300, maxHeight: 45 });
      expect(size(texts()[0])).toBe(45);
    });

    it('is no smaller than the smallest size, even when the box is smaller', () => {
      render(icon('home'), { maxWidth: 5, maxHeight: 5 });
      expect(size(texts()[0])).toBe(28);
      render(icon('home'), { fontSize: 40, maxWidth: 5, maxHeight: 5 });
      expect(size(texts()[0])).toBe(20);
    });
  });

  it('follows a change of label', () => {
    render(text('a'));
    render(text('b'));
    expect(texts()[0].textContent).toBe('b');
    render(null);
    expect(texts()).toEqual([]);
  });
});
