/**
 * Illustration layer — interface only, deliberately.
 *
 * Real illustration (an image model, a commissioned style kit, or a human
 * illustrator's library) is a later phase. What matters now is that the rest
 * of the product never assumes how pictures are made: a book is stored,
 * validated, read and shared with `imageUrl: null`, and the reader draws a
 * placeholder. When a provider is plugged in, nothing else changes.
 *
 * The one design decision worth locking in early is that character appearance
 * is frozen text on the Character record (see schema.ts). Whatever renders the
 * pictures later — a model with reference images, or a person — works from
 * that same frozen block, so a character cannot drift between pages.
 */

import type { Book, Character, Page } from '../schema';

export interface RenderRequest {
  book: Book;
  page: Page;
  /** Only the characters that appear in this shot. */
  characters: Character[];
  /** Frozen art direction, identical for every page of a book. */
  styleToken: string;
}

export interface RenderResult {
  imageUrl: string;
  promptUsed: string;
  seed: number | null;
}

export interface ArtProvider {
  readonly id: string;
  /**
   * Optional one-off pass that produces a reference sheet per character.
   * Providers that do not need one can leave this undefined.
   */
  createCharacterSheet?(character: Character, styleToken: string): Promise<{
    sheetUrl: string;
    sheetRef: string | null;
  }>;
  renderPage(request: RenderRequest): Promise<RenderResult>;
  /** Rough cost in USD so the UI can warn before spending. */
  estimateCost(pages: number): number;
}

/**
 * Frozen art direction. Whatever renders the pictures, these are the rules —
 * they come from the same place as the text rules: one clear subject, plenty
 * of empty space, high contrast, nothing to compete with the words.
 */
export const DEFAULT_STYLE_TOKEN = [
  'warm modern picture-book illustration',
  'soft gouache texture with clean confident outlines',
  'one clear subject, generous empty space around it, uncluttered background',
  'flat depth, high contrast between subject and background',
  'warm friendly palette, no harsh shadows',
  'expressive faces, natural body language, hands visible and doing something',
  'no text, no lettering, no speech bubbles, no borders, no collage of panels',
].join(', ');

/**
 * The no-op provider used until a real one is configured. It records the
 * prompt it *would* have sent, which is useful for reviewing illustration
 * descriptions with a human illustrator before paying for anything.
 */
export const placeholderProvider: ArtProvider = {
  id: 'placeholder',
  async renderPage({ page, characters, styleToken }: RenderRequest): Promise<RenderResult> {
    const who = characters.map((c) => `${c.name}: ${c.appearance}`).join('; ');
    return {
      imageUrl: '',
      promptUsed: [
        styleToken,
        `Scene: ${page.illustration.action}`,
        `Place: ${page.illustration.place}`,
        `Mood: ${page.illustration.mood}`,
        who ? `Characters (must match exactly): ${who}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      seed: null,
    };
  },
  estimateCost: () => 0,
};

export function getProvider(): ArtProvider {
  // Opt in to real AI illustration with ART_PROVIDER=openai + OPENAI_API_KEY
  // (see ./openai.ts). Default stays the free deterministic SVG scenes.
  if (process.env.ART_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    // Lazy require keeps the provider out of client bundles.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { openaiProvider } = require('./openai') as typeof import('./openai');
    return openaiProvider;
  }
  return placeholderProvider;
}
