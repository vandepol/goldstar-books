/**
 * Dolch sight-word lists.
 *
 * The Dolch lists are public domain (Edward Dolch, 1936–48) and remain the
 * most widely used high-frequency word lists in early-reading instruction.
 * They matter here because sight-word recognition is the strand that plays to
 * the visual learning strengths typical of readers with Down syndrome, so the
 * validator measures every generated book against them.
 *
 * Anything NOT on these lists is treated as a "new word": allowed, but capped
 * per book and required to repeat enough times to actually be learned.
 */

import type { DolchListId } from './levels';

export const DOLCH: Record<DolchListId, string[]> = {
  prePrimer: [
    'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
    'funny', 'go', 'help', 'here', 'i', 'in', 'is', 'it', 'jump', 'little',
    'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
    'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
  ],
  primer: [
    'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
    'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
    'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
    'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
    'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who',
    'will', 'with', 'yes',
  ],
  first: [
    'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
    'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
    'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
    'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
    'were', 'when',
  ],
  second: [
    'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy',
    'call', 'cold', 'does', 'dont', 'fast', 'first', 'five', 'found', 'gave',
    'goes', 'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read',
    'right', 'sing', 'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon',
    'us', 'use', 'very', 'wash', 'which', 'why', 'wish', 'work', 'would',
    'write', 'your',
  ],
  third: [
    'about', 'better', 'bring', 'carry', 'clean', 'cut', 'done', 'draw',
    'drink', 'eight', 'fall', 'far', 'full', 'got', 'grow', 'hold', 'hot',
    'hurt', 'if', 'keep', 'kind', 'laugh', 'light', 'long', 'much', 'myself',
    'never', 'only', 'own', 'pick', 'seven', 'shall', 'show', 'six', 'small',
    'start', 'ten', 'today', 'together', 'try', 'warm',
  ],
  nouns: [
    'apple', 'baby', 'back', 'ball', 'bear', 'bed', 'bell', 'bird', 'birthday',
    'boat', 'box', 'boy', 'bread', 'brother', 'cake', 'car', 'cat', 'chair',
    'chicken', 'children', 'coat', 'corn', 'cow', 'day', 'dog', 'doll', 'door',
    'duck', 'egg', 'eye', 'farm', 'farmer', 'father', 'feet', 'fire', 'fish',
    'floor', 'flower', 'game', 'garden', 'girl', 'goodbye', 'grass', 'ground',
    'hand', 'head', 'hill', 'home', 'horse', 'house', 'kitty', 'leg', 'letter',
    'man', 'men', 'milk', 'money', 'morning', 'mother', 'name', 'nest',
    'night', 'paper', 'party', 'picture', 'pig', 'rabbit', 'rain', 'ring',
    'robin', 'school', 'seed', 'sheep', 'shoe', 'sister', 'snow',
    'song', 'squirrel', 'stick', 'street', 'sun', 'table', 'thing', 'time',
    'top', 'toy', 'tree', 'watch', 'water', 'way', 'wind', 'window', 'wood',
  ],
};

/**
 * Words that are always acceptable regardless of level: the child's own name,
 * character names, and a small set of story connectives that appear in every
 * picture book. Names are injected per-book by the validator, not hard-coded.
 */
export const ALWAYS_ALLOWED = new Set([
  'oh', 'ho', 'yo', 'hooray', 'wow', 'ok', 'okay', 'hi', 'hello', 'bye',
]);

/** Build the set of known words for a given set of Dolch lists. */
export function sightWordSet(lists: DolchListId[]): Set<string> {
  const set = new Set<string>();
  for (const list of lists) for (const w of DOLCH[list]) set.add(w);
  for (const w of ALWAYS_ALLOWED) set.add(w);
  return set;
}

/**
 * Normalise a token for list comparison: lowercase, strip punctuation and
 * possessives, keep internal apostrophes out (Dolch stores "dont", not "don't").
 */
export function normalise(token: string): string {
  return token
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z']/g, '')
    .replace(/'/g, '');
}

/**
 * Fold an inflected form back to a base word — but only when the base is a
 * word we have actually seen. A blind suffix-stripper turns "this" into "thi"
 * and "sees" into "se", which then show up in the parent-facing report as
 * nonsense "new words". So the fold is vocabulary-aware: it tries the
 * candidates and keeps the first one that exists in `vocabulary`, otherwise it
 * leaves the word exactly as written.
 */
export function foldWord(word: string, vocabulary: Set<string>): string {
  if (vocabulary.has(word)) return word;
  if (word.length <= 3) return word;

  const candidates: string[] = [];
  for (const suffix of ['ing', 'ed', 'es', 's'] as const) {
    if (!word.endsWith(suffix)) continue;
    const base = word.slice(0, -suffix.length);
    if (base.length < 2) continue;
    candidates.push(base);
    // "digging" -> "digg" -> "dig"
    if (/(.)\1$/.test(base)) candidates.push(base.slice(0, -1));
    // "sailed" -> "sail", but also "raced" -> "race"
    if (suffix === 'ed' || suffix === 'es') candidates.push(base + 'e');
  }
  for (const candidate of candidates) {
    if (vocabulary.has(candidate)) return candidate;
  }
  return word;
}
