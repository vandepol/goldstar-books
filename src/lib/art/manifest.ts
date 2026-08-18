/**
 * Baked AI art lookup, usable from server and client components alike.
 *
 * scripts/render-art.ts writes real illustrations to public/art/ and records
 * them in src/data/art.json; this module answers "does this book have a real
 * cover / page picture?" so every surface prefers baked art and falls back to
 * the SVG scenes. The JSON import is bundled, so the client needs no fetch.
 */

import art from '@/data/art.json';

type Manifest = Record<string, { cover?: string; pages?: Record<string, string> }>;

const MANIFEST = art as Manifest;

/** App-absolute URL of a book's baked cover, or null. */
export function coverArtUrl(bookId: string): string | null {
  const file = MANIFEST[bookId]?.cover;
  return file ? `/${file}` : null;
}

/** App-absolute URL of a page's baked picture, or null. */
export function pageArtUrl(bookId: string, pageIndex: number): string | null {
  const file = MANIFEST[bookId]?.pages?.[String(pageIndex)];
  return file ? `/${file}` : null;
}
