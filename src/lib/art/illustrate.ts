/**
 * Paint a freshly generated book's pages with real AI art.
 *
 * Runs server-side right after generation when the request asked for
 * illustration and OPENAI_API_KEY is configured. Images are written to
 * public/art/books/<bookId>/ and the book's imageUrls point at them, so the
 * reader, the dashboard cover and the share page all pick them up with no
 * further wiring. Four in flight at a time; a page whose render fails keeps
 * its drawn SVG scene — a book is never blocked on its pictures.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Book } from '../schema';
import { DEFAULT_STYLE_TOKEN } from './provider';
import { BAKED_ART, buildImagePrompt, generateImage } from './openai';

export function canIllustrate(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Mutates the book's imageUrls in place; returns how many pages got art. */
export async function illustrateBook(book: Book, bookId: string): Promise<number> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return 0;

  const dir = join(process.cwd(), 'public', 'art', 'books', bookId);
  mkdirSync(dir, { recursive: true });

  let painted = 0;
  const queue = [...book.pages];
  async function worker() {
    for (;;) {
      const page = queue.shift();
      if (!page) return;
      try {
        const cast = book.characters.filter((c) =>
          page.illustration.characterIds.includes(c.id),
        );
        const prompt = buildImagePrompt(
          page,
          cast.length ? cast : book.characters,
          DEFAULT_STYLE_TOKEN,
        );
        const { b64 } = await generateImage(key!, prompt, BAKED_ART);
        const file = `page-${page.index}.jpg`;
        writeFileSync(join(dir, file), Buffer.from(b64, 'base64'));
        page.illustration.imageUrl = `/art/books/${bookId}/${file}`;
        page.illustration.promptUsed = prompt;
        page.illustration.status = 'ready';
        painted++;
      } catch {
        page.illustration.status = 'failed'; // reader falls back to the SVG scene
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return painted;
}
