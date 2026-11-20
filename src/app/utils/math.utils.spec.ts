import { cos, sin } from './math.utils';

describe('math utils', () => {
  it('takes degrees for sin', () => {
    expect(sin(0)).toBeCloseTo(0, 10);
    expect(sin(30)).toBeCloseTo(0.5, 10);
    expect(sin(90)).toBeCloseTo(1, 10);
    expect(sin(180)).toBeCloseTo(0, 10);
    expect(sin(270)).toBeCloseTo(-1, 10);
  });

  it('takes degrees for cos', () => {
    expect(cos(0)).toBeCloseTo(1, 10);
    expect(cos(60)).toBeCloseTo(0.5, 10);
    expect(cos(90)).toBeCloseTo(0, 10);
    expect(cos(180)).toBeCloseTo(-1, 10);
  });
});
