/**
 * Paint a freshly generated book's pages with real AI art — with continuity.
 *
 * The continuity mechanism is the character sheet the schema always
 * anticipated (Character.sheetUrl): the hero is rendered ONCE from her frozen
 * appearance block, saved per child, and then every page is generated through
 * the images *edits* endpoint with that sheet attached as a reference image —
 * "draw this exact character doing X" — instead of re-describing her in text
 * and hoping. The sheet is keyed to the child, so she is also the same girl
 * across every book she ever stars in.
 *
 * Four pages in flight at a time; a page whose render fails keeps its drawn
 * SVG scene — a book is never blocked on its pictures.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Book } from '../schema';
import { DEFAULT_STYLE_TOKEN } from './provider';
import {
  BAKED_ART,
  buildImagePrompt,
  generateImage,
  generateImageWithReference,
} from './openai';

export function canIllustrate(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Render (or reuse) the hero's character sheet. Stored per child so every
 * book she stars in draws the same girl.
 */
async function ensureSheet(
  key: string,
  childKey: string,
  hero: Book['characters'][number],
): Promise<{ bytes: Uint8Array; mime: string; url: string } | null> {
  const dir = join(process.cwd(), 'public', 'art', 'sheets');
  const file = join(dir, `${childKey}.jpg`);
  const url = `/art/sheets/${childKey}.jpg`;
  if (existsSync(file)) return { bytes: readFileSync(file), mime: 'image/jpeg', url };
  try {
    const prompt = [
      DEFAULT_STYLE_TOKEN,
      'character reference sheet: one child standing, full body, front view, arms relaxed,',
      'plain warm cream background, no scenery, no props, no text',
      `The character: ${hero.appearance}`,
    ].join('\n');
    const { b64 } = await generateImage(key, prompt, { ...BAKED_ART, size: '1024x1024' });
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, Buffer.from(b64, 'base64'));
    return { bytes: Buffer.from(b64, 'base64'), mime: 'image/jpeg', url };
  } catch {
    return null; // pages fall back to text-anchored generation
  }
}

/** Mutates the book's imageUrls in place; returns how many pages got art. */
export async function illustrateBook(
  book: Book,
  bookId: string,
  childKey?: string,
): Promise<number> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return 0;

  const dir = join(process.cwd(), 'public', 'art', 'books', bookId);
  mkdirSync(dir, { recursive: true });

  const hero = book.characters[0];
  const sheet = await ensureSheet(key, childKey ?? bookId, hero);
  if (sheet) {
    hero.sheetUrl = sheet.url;
  }

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
          DEFAULT_STYLE_TOKEN +
            (sheet
              ? '. The reference image is the hero, ' +
                hero.name +
                ' — draw this exact character, same face, same hair, same clothes, in the scene described'
              : ''),
        );
        const { b64 } = sheet
          ? await generateImageWithReference(key!, prompt, sheet, BAKED_ART)
          : await generateImage(key!, prompt, BAKED_ART);
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
