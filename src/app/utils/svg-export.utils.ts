// Renders a live <svg> element (the device layout) to a PNG Blob, for
// "save as image". The SVG uses Tailwind utility classes and CSS custom
// properties (currentColor from the Material theme) for its fill/stroke,
// but once serialized and loaded through an <img>/canvas it's treated as
// an isolated document with no access to the page's external stylesheets
// or web fonts — so styling is baked into inline `style` attributes here,
// and the Material Symbols icon font is inlined as a base64 @font-face
// (see font-embed.utils.ts) so icon labels still render as glyphs rather
// than their raw ligature text.

import { getMaterialSymbolsFontDataUrl } from './font-embed.utils';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Curated to the handful of CSS properties this app's SVG actually uses;
// deliberately excludes non-visual ones (cursor, transition, etc.).
const STYLE_PROPERTIES = [
  'fill',
  'stroke',
  'stroke-width',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-feature-settings',
  'text-anchor',
  'dominant-baseline',
  'letter-spacing',
];

function inlineComputedStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source);
  const declarations = STYLE_PROPERTIES.map((prop) => {
    const value = computed.getPropertyValue(prop);
    return value ? `${prop}: ${value};` : '';
  })
    .filter(Boolean)
    .join(' ');
  if (declarations) {
    target.setAttribute('style', declarations);
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, i) => {
    const targetChild = targetChildren[i];
    if (targetChild) {
      inlineComputedStyles(child, targetChild);
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('Failed to load the rendered layout as an image.'));
    image.src = src;
  });
}

export interface ExportSvgAsPngOptions {
  /** Pixel-per-unit multiplier for a sharper raster output. */
  scale?: number;
  backgroundColor?: string;
}

export async function exportSvgAsPngBlob(
  svg: SVGSVGElement,
  options: ExportSvgAsPngOptions = {},
): Promise<Blob> {
  const { scale = 2, backgroundColor = '#ffffff' } = options;

  const viewBox = svg.viewBox.baseVal;
  const width = viewBox?.width || svg.clientWidth;
  const height = viewBox?.height || svg.clientHeight;
  if (!width || !height) {
    throw new Error('The layout has no visible size to export.');
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  inlineComputedStyles(svg, clone);

  const fontDataUrl = await getMaterialSymbolsFontDataUrl();
  if (fontDataUrl) {
    const style = document.createElementNS(SVG_NS, 'style');
    style.textContent = `@font-face { font-family: 'Material Symbols Rounded'; src: url(${fontDataUrl}) format('woff2'); }`;
    clone.insertBefore(style, clone.firstChild);
  }

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context is not available for image export.');
    }
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode the layout as a PNG image.'));
        }
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
