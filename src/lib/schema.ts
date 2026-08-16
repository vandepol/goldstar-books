/**
 * The book format. One JSON shape flows through the whole product: Claude
 * returns it, the validator checks it, the database stores it, the reader
 * renders it, and the export writes it into a standalone HTML file.
 */

import { z } from 'zod';

/**
 * A character's *immutable* traits. This block is what keeps illustrations
 * consistent: it is written once, frozen, and pasted verbatim into every
 * image prompt for every page. Nothing here may be paraphrased later.
 */
export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  /** hero | friend | helper (animal/sidekick) | rival (the gentle antagonist) */
  role: z.enum(['hero', 'friend', 'helper', 'rival']),
  /**
   * Frozen visual description, e.g. "a seven-year-old girl with light skin,
   * shoulder-length dark brown hair in two low bobbles, round pink glasses,
   * a purple long-sleeved top and denim shorts".
   * Written by the adult (or drafted by Claude from their notes) and then locked.
   */
  appearance: z.string().min(10).max(600),
  /** Hex colours pinned so the image model and the SVG placeholder agree. */
  palette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    hair: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  /**
   * URL of the generated character sheet (front, side, three-quarter, back,
   * plus expressions). Used as the reference image on every page render.
   */
  sheetUrl: z.string().url().nullable().default(null),
  /** Provider-specific handle: a seed, a file id, or a fine-tune reference. */
  sheetRef: z.string().nullable().default(null),
});
export type Character = z.infer<typeof CharacterSchema>;

/**
 * What the illustration must show. The text half is written for a human and
 * for the image model; `characterIds` tells the pipeline which reference
 * sheets to attach so only the right people appear.
 */
export const IllustrationSchema = z.object({
  /** One clear action, in plain words. "Constance digs in the sand." */
  action: z.string().min(3).max(300),
  /** Where it happens; drawn from the book's setting. */
  place: z.string().min(3).max(200),
  /** Emotional register, so faces are not generically smiley on every page. */
  mood: z.enum(['happy', 'excited', 'curious', 'worried', 'determined', 'proud', 'calm']),
  characterIds: z.array(z.string()).default([]),
  /** Filled in after generation. */
  imageUrl: z.string().nullable().default(null),
  /** The exact prompt used, kept so a page can be regenerated identically. */
  promptUsed: z.string().nullable().default(null),
  seed: z.number().int().nullable().default(null),
  status: z.enum(['pending', 'ready', 'failed', 'placeholder']).default('pending'),
});
export type Illustration = z.infer<typeof IllustrationSchema>;

export const PageSchema = z.object({
  index: z.number().int().min(0),
  /** The words the child reads. Sentence count is capped by the level. */
  text: z.string().min(1).max(400),
  /** True when this page is one of the repeated refrains. */
  refrain: z.boolean().default(false),
  illustration: IllustrationSchema,
});
export type Page = z.infer<typeof PageSchema>;

export const QuizItemSchema = z.object({
  question: z.string().min(3).max(160),
  options: z.array(z.string().min(1).max(60)).min(2).max(4),
  answerIndex: z.number().int().min(0),
});
export type QuizItem = z.infer<typeof QuizItemSchema>;

export const BookSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(80),
  subtitle: z.string().max(120).default(''),
  levelId: z.enum(['starting', 'building', 'growing', 'flying']),
  /** Free-text setting, e.g. "a pirate island" or "a farm at night". */
  setting: z.string().min(2).max(120),
  characters: z.array(CharacterSchema).min(1).max(6),
  pages: z.array(PageSchema).min(4),
  quiz: z.array(QuizItemSchema).default([]),
  /** Key story words for the review wall at the end. */
  wordWall: z.array(z.string()).default([]),
  /** The two or three sentences that repeat. Stored so the reader can tag them. */
  refrains: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type Book = z.infer<typeof BookSchema>;

/** What the adult fills in on the create form. */
export const BookRequestSchema = z.object({
  childId: z.string(),
  levelId: z.enum(['starting', 'building', 'growing', 'flying']),
  /** "Jake and the Never Land pirates, but Constance finds the treasure." */
  outline: z.string().min(5).max(1200),
  setting: z.string().min(2).max(120),
  characters: z.array(
    CharacterSchema.omit({ id: true, sheetUrl: true, sheetRef: true }).extend({
      id: z.string().optional(),
    }),
  ).min(1).max(6),
  /** Things this child loves; woven in to raise motivation. */
  interests: z.array(z.string().max(40)).max(8).default([]),
  /** Words to avoid — fears, triggers, a sibling's name mid-argument. */
  avoid: z.array(z.string().max(40)).max(20).default([]),
  illustrate: z.boolean().default(true),
});
export type BookRequest = z.infer<typeof BookRequestSchema>;

/**
 * What Claude is asked to return. Deliberately narrower than `Book`: the model
 * writes words and describes pictures, the server owns ids, urls and metadata.
 */
export const DraftSchema = z.object({
  title: z.string(),
  subtitle: z.string().default(''),
  refrains: z.array(z.string()),
  pages: z.array(
    z.object({
      text: z.string(),
      refrain: z.boolean().default(false),
      illustration: z.object({
        action: z.string(),
        place: z.string(),
        mood: IllustrationSchema.shape.mood,
        characters: z.array(z.string()).default([]),
      }),
    }),
  ),
  quiz: z.array(QuizItemSchema),
  wordWall: z.array(z.string()),
});
export type Draft = z.infer<typeof DraftSchema>;
