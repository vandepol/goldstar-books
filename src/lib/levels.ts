/**
 * Reading levels.
 *
 * These are the product's spine. Everything else — the Claude prompt, the
 * validator, the page count, the quiz — is derived from the level the adult
 * picks for the child. Levels are deliberately described in terms a parent
 * recognises ("she can read a short sentence on her own") rather than in
 * grade equivalents, because children with Down syndrome commonly read well
 * above their measured language age and grade labels mislead.
 *
 * The constraints come from mainstream evidence-based practice for readers
 * with Down syndrome: sight-word-first instruction that plays to visual
 * strengths, one idea per page, and repetition as the primary lever.
 * See README "Pedagogy" for sources.
 */

export type LevelId = 'starting' | 'building' | 'growing' | 'flying';

export interface ReadingLevel {
  id: LevelId;
  /** Shown to the adult when choosing. */
  label: string;
  /** One sentence a parent can self-assess against. */
  description: string;
  /** Hard bounds on words per sentence. The validator rejects outside these. */
  minWords: number;
  maxWords: number;
  /** Sentences allowed on a single page. One is the default for a reason. */
  sentencesPerPage: number;
  /** How many story pages (excludes cover, quiz, word wall). */
  pages: number;
  /**
   * How many times each refrain repeats. Repetition is the single biggest
   * lever for this reader group, so it is a level parameter, not a nicety.
   */
  refrainRepeats: number;
  /** How many distinct refrains the story carries. */
  refrainCount: number;
  /**
   * New (non-sight-word) story words allowed in the whole book. Each one must
   * also hit `minRepeatsPerNewWord` so it gets learned rather than met once.
   */
  maxNewWords: number;
  minRepeatsPerNewWord: number;
  /** Fraction of running words that must come from the sight-word lists. */
  minSightWordRatio: number;
  /** Which Dolch lists are considered "known" at this level. */
  dolchLists: DolchListId[];
  /** Comprehension questions at the end. */
  quizQuestions: number;
}

export type DolchListId =
  | 'prePrimer'
  | 'primer'
  | 'first'
  | 'second'
  | 'third'
  | 'nouns';

export const LEVELS: Record<LevelId, ReadingLevel> = {
  starting: {
    id: 'starting',
    label: 'Just starting',
    description:
      'She recognises some whole words on sight and is building confidence. Two to four words a page.',
    minWords: 2,
    maxWords: 4,
    sentencesPerPage: 1,
    pages: 16,
    refrainRepeats: 4,
    refrainCount: 2,
    maxNewWords: 6,
    minRepeatsPerNewWord: 3,
    minSightWordRatio: 0.8,
    dolchLists: ['prePrimer', 'nouns'],
    quizQuestions: 3,
  },
  building: {
    id: 'building',
    label: 'Building confidence',
    description:
      'She can read a short sentence on her own with a familiar picture to help. Three to six words a page.',
    minWords: 3,
    maxWords: 6,
    sentencesPerPage: 1,
    pages: 24,
    refrainRepeats: 3,
    refrainCount: 2,
    maxNewWords: 10,
    minRepeatsPerNewWord: 2,
    minSightWordRatio: 0.75,
    dolchLists: ['prePrimer', 'primer', 'first', 'nouns'],
    quizQuestions: 4,
  },
  growing: {
    id: 'growing',
    label: 'Growing',
    description:
      'She reads a whole sentence smoothly and is ready for a little more on the page. Six to ten words.',
    minWords: 5,
    maxWords: 10,
    sentencesPerPage: 2,
    pages: 24,
    refrainRepeats: 3,
    refrainCount: 1,
    maxNewWords: 14,
    minRepeatsPerNewWord: 2,
    minSightWordRatio: 0.7,
    dolchLists: ['prePrimer', 'primer', 'first', 'second', 'nouns'],
    quizQuestions: 4,
  },
  flying: {
    id: 'flying',
    label: 'Flying',
    description:
      'She reads several sentences at a time and wants a real story. Eight to fourteen words.',
    minWords: 6,
    maxWords: 14,
    sentencesPerPage: 3,
    pages: 28,
    refrainRepeats: 2,
    refrainCount: 1,
    maxNewWords: 20,
    minRepeatsPerNewWord: 2,
    minSightWordRatio: 0.65,
    dolchLists: ['prePrimer', 'primer', 'first', 'second', 'third', 'nouns'],
    quizQuestions: 5,
  },
};

export const LEVEL_ORDER: LevelId[] = ['starting', 'building', 'growing', 'flying'];

export function getLevel(id: LevelId): ReadingLevel {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown reading level: ${id}`);
  return level;
}

/** The next level up, for the "ready to move on?" nudge in the library. */
export function nextLevel(id: LevelId): ReadingLevel | null {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVELS[LEVEL_ORDER[i + 1]] : null;
}
