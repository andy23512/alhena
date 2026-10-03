// Fetches the Material Symbols Rounded font and inlines it as a base64 data
// URI. Needed for image export: an <svg> rendered through <img>/canvas is
// treated as an isolated "image document" that can't see the host page's
// externally-loaded web fonts, so without this, exported icon labels would
// show their raw ligature text (e.g. "home") instead of the glyph.
// Best-effort — returns null on any failure so export can still proceed
// (icons just fall back to raw text in that case).

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded';

let fontDataUrlPromise: Promise<string | null> | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read font blob.'));
    reader.readAsDataURL(blob);
  });
}

async function fetchFontAsDataUrl(): Promise<string | null> {
  const cssResponse = await fetch(FONT_CSS_URL);
  const css = await cssResponse.text();
  const match = css.match(/src:\s*url\((['"]?)([^'")]+)\1\)\s*format\(['"]woff2['"]\)/);
  const fontUrl = match?.[2];
  if (!fontUrl) {
    return null;
  }
  const fontResponse = await fetch(fontUrl);
  const blob = await fontResponse.blob();
  return blobToDataUrl(blob);
}

export function getMaterialSymbolsFontDataUrl(): Promise<string | null> {
  if (!fontDataUrlPromise) {
    fontDataUrlPromise = fetchFontAsDataUrl().catch(() => null);
  }
  return fontDataUrlPromise;
}
