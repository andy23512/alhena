import { exportSvgAsPngBlob } from './svg-export.utils';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FONT_CSS =
  "@font-face { font-family: 'Material Symbols Rounded'; src: url(https://example.test/font.woff2) format('woff2'); }";

// The font is fetched once per page load and kept, so every test in this file
// answers that first fetch the same way, whichever test happens to run first.
function stubFontFetch() {
  spyOn(window, 'fetch').and.callFake(async (input) =>
    String(input).includes('googleapis')
      ? new Response(FONT_CSS)
      : new Response(new Blob([new Uint8Array([1, 2, 3])])),
  );
}

describe('exportSvgAsPngBlob', () => {
  let host: HTMLElement;
  let created: Blob[];
  let revoked: string[];

  beforeEach(() => {
    stubFontFetch();
    created = [];
    revoked = [];
    const create = URL.createObjectURL.bind(URL);
    spyOn(URL, 'createObjectURL').and.callFake((blob) => {
      created.push(blob as Blob);
      return create(blob);
    });
    const revoke = URL.revokeObjectURL.bind(URL);
    spyOn(URL, 'revokeObjectURL').and.callFake((url) => {
      revoked.push(url);
      revoke(url);
    });
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    host.remove();
    document.body.style.backgroundColor = '';
  });

  function makeSvg(attrs: Record<string, string> = { viewBox: '0 0 100 50' }) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    svg.innerHTML =
      '<rect x="0" y="0" width="10" height="10" style="fill: rgb(255, 0, 0); stroke-width: 3px"></rect>' +
      '<g data-export-ignore="true"><circle r="5"></circle></g>' +
      '<text class="label">hi</text>';
    host.appendChild(svg);
    return svg as SVGSVGElement;
  }
  const exportedText = () => created[0].text();
  const decode = async (blob: Blob) => createImageBitmap(blob);
  const pixel = async (blob: Blob, x: number, y: number) => {
    const bmp = await decode(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    return Array.from(ctx.getImageData(x, y, 1, 1).data);
  };

  it('gives a PNG', async () => {
    const blob = await exportSvgAsPngBlob(makeSvg());
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('makes the image twice the size of the view box by default', async () => {
    const bmp = await decode(await exportSvgAsPngBlob(makeSvg()));
    expect([bmp.width, bmp.height]).toEqual([200, 100]);
  });

  it('uses the scale it is given, rounding to whole pixels', async () => {
    const bmp = await decode(
      await exportSvgAsPngBlob(makeSvg({ viewBox: '0 0 101 51' }), {
        scale: 1.5,
      }),
    );
    expect([bmp.width, bmp.height]).toEqual([152, 77]);
  });

  it('uses the width and height of the element when there is no view box', async () => {
    const svg = makeSvg({ width: '120', height: '40' });
    const bmp = await decode(await exportSvgAsPngBlob(svg, { scale: 1 }));
    expect([bmp.width, bmp.height]).toEqual([120, 40]);
  });

  it('refuses an svg with no size', async () => {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    await expectAsync(exportSvgAsPngBlob(svg)).toBeRejectedWithError(
      'The layout has no visible size to export.',
    );
  });

  describe('background', () => {
    it('is the color it is given', async () => {
      const blob = await exportSvgAsPngBlob(makeSvg(), {
        backgroundColor: '#00ff00',
      });
      expect(await pixel(blob, 199, 99)).toEqual([0, 255, 0, 255]);
    });

    it('is the page background by default', async () => {
      document.body.style.backgroundColor = 'rgb(10, 20, 30)';
      const blob = await exportSvgAsPngBlob(makeSvg());
      expect(await pixel(blob, 199, 99)).toEqual([10, 20, 30, 255]);
    });

    it('is white when the page has none', async () => {
      document.body.style.backgroundColor = 'transparent';
      const blob = await exportSvgAsPngBlob(makeSvg());
      expect(await pixel(blob, 199, 99)).toEqual([255, 255, 255, 255]);
    });
  });

  describe('the svg that is drawn', () => {
    it('has a namespace and the size of the view box', async () => {
      await exportSvgAsPngBlob(makeSvg());
      const text = await exportedText();
      expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(text).toContain('width="100"');
      expect(text).toContain('height="50"');
    });

    it('is a copy, so the one on the page is not touched', async () => {
      const svg = makeSvg();
      await exportSvgAsPngBlob(svg);
      expect(svg.getAttribute('width')).toBeNull();
      expect(svg.querySelector('[data-export-ignore]')).not.toBeNull();
      expect(svg.querySelector('style')).toBeNull();
    });

    it('leaves out the editor-only parts', async () => {
      await exportSvgAsPngBlob(makeSvg());
      const text = await exportedText();
      expect(text).not.toContain('data-export-ignore');
      expect(text).not.toContain('<circle');
      expect(text).toContain('<rect');
      expect(text).toContain('hi');
    });

    it('carries the colors and sizes as they were drawn, on every level', async () => {
      await exportSvgAsPngBlob(makeSvg());
      const doc = new DOMParser().parseFromString(
        await exportedText(),
        'image/svg+xml',
      );
      const rect = doc.querySelector('rect')!;
      expect(rect.getAttribute('style')).toContain('fill: rgb(255, 0, 0);');
      expect(rect.getAttribute('style')).toContain('stroke-width: 3px;');
      expect(doc.querySelector('text')!.getAttribute('style')).toContain(
        'font-family:',
      );
      expect(doc.documentElement.getAttribute('style')).toContain('font-size:');
    });

    it('does not carry properties that are not about looks', async () => {
      await exportSvgAsPngBlob(makeSvg());
      const doc = new DOMParser().parseFromString(
        await exportedText(),
        'image/svg+xml',
      );
      expect(doc.querySelector('rect')!.getAttribute('style')).not.toContain(
        'cursor',
      );
    });

    it('has the icon font inside, ahead of the drawing', async () => {
      await exportSvgAsPngBlob(makeSvg());
      const doc = new DOMParser().parseFromString(
        await exportedText(),
        'image/svg+xml',
      );
      const first = doc.documentElement.firstElementChild!;
      expect(first.tagName).toBe('style');
      expect(first.textContent).toContain(
        "font-family: 'Material Symbols Rounded'",
      );
      expect(first.textContent).toContain('base64,AQID');
      expect(first.textContent).toContain("format('woff2')");
    });
  });

  describe('cleaning up and failing', () => {
    it('lets go of the temporary address afterwards', async () => {
      await exportSvgAsPngBlob(makeSvg());
      expect(revoked.length).toBe(1);
    });

    it('rejects, and still lets go, when the image does not load', async () => {
      (URL.createObjectURL as jasmine.Spy).and.returnValue(
        'blob:http://localhost/nothing',
      );
      await expectAsync(exportSvgAsPngBlob(makeSvg())).toBeRejectedWithError(
        'Failed to load the rendered layout as an image.',
      );
      expect(revoked).toEqual(['blob:http://localhost/nothing']);
    });

    it('rejects when there is no canvas to draw on', async () => {
      spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(null);
      await expectAsync(exportSvgAsPngBlob(makeSvg())).toBeRejectedWithError(
        '2D canvas context is not available for image export.',
      );
      expect(revoked.length).toBe(1);
    });

    it('rejects when the image cannot be encoded', async () => {
      spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((cb) =>
        cb(null),
      );
      await expectAsync(exportSvgAsPngBlob(makeSvg())).toBeRejectedWithError(
        'Failed to encode the layout as a PNG image.',
      );
      expect(revoked.length).toBe(1);
    });
  });
});
