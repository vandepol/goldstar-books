/**
 * The readability gate.
 *
 * A language model asked for "short simple sentences" will drift: page 3 is
 * four words, page 19 is eleven, and a word like "suddenly" slips in. For a
 * child who is learning to read by recognising whole words, that drift is the
 * difference between a book she can read and a book that defeats her.
 *
 * So nothing reaches the child on the model's word alone. Every draft is
 * measured here, and anything that fails goes back with a specific, per-page
 * list of what to fix. This is the part of the product that has to be right.
 */

import { getLevel, type LevelId } from './levels';
import { foldWord, normalise, sightWordSet } from './sight-words';
import type { Draft } from './schema';

export interface PageIssue {
  pageIndex: number;
  kind: 'too-long' | 'too-short' | 'too-many-sentences' | 'off-list-word' | 'name-drift';
  message: string;
}

export interface BookReport {
  ok: boolean;
  issues: PageIssue[];
  /** Human-facing stats, shown to the adult in the "level check" panel. */
  stats: {
    pages: number;
    totalWords: number;
    averageWordsPerSentence: number;
    longestSentence: number;
    sightWordRatio: number;
    newWords: { word: string; count: number }[];
    underRepeatedNewWords: string[];
    refrainCounts: Record<string, number>;
  };
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
}

/**
 * Run the full check. `knownNames` are the child's and characters' names,
 * which are always legal regardless of level — a personally meaningful name is
 * usually the first word a child learns to recognise, so it is never a fault.
 */
export function checkDraft(
  draft: Draft,
  levelId: LevelId,
  knownNames: string[] = [],
): BookReport {
  const level = getLevel(levelId);
  const known = sightWordSet(level.dolchLists);
  const nameSet = new Set(knownNames.map((n) => normalise(n)).filter(Boolean));

  const issues: PageIssue[] = [];
  const newWordCounts = new Map<string, number>();
  const refrainCounts: Record<string, number> = {};
  for (const r of draft.refrains) refrainCounts[r.trim()] = 0;

  let totalWords = 0;
  let sentenceCount = 0;
  let sightWords = 0;
  let longest = 0;

  draft.pages.forEach((page, pageIndex) => {
    const sentences = splitSentences(page.text);

    if (sentences.length > level.sentencesPerPage) {
      issues.push({
        pageIndex,
        kind: 'too-many-sentences',
        message: `Page ${pageIndex + 1} has ${sentences.length} sentences; this level allows ${level.sentencesPerPage}. Split it across pages or cut it down.`,
      });
    }

    for (const sentence of sentences) {
      const n = countWords(sentence);
      sentenceCount++;
      totalWords += n;
      longest = Math.max(longest, n);

      if (n > level.maxWords) {
        issues.push({
          pageIndex,
          kind: 'too-long',
          message: `Page ${pageIndex + 1} "${sentence}" is ${n} words; the limit is ${level.maxWords}. Rewrite it shorter without losing the meaning.`,
        });
      } else if (n < level.minWords) {
        issues.push({
          pageIndex,
          kind: 'too-short',
          message: `Page ${pageIndex + 1} "${sentence}" is only ${n} words; this level wants at least ${level.minWords}.`,
        });
      }

      for (const raw of sentence.split(/\s+/)) {
        const w = normalise(raw);
        if (!w) continue;
        if (nameSet.has(w)) {
          sightWords++;
          continue;
        }
        // Fold against the sight-word list first, so "sails" counts as the
        // known word "sail" rather than as something new to learn.
        if (known.has(foldWord(w, known))) {
          sightWords++;
          continue;
        }
        // Otherwise fold against the new words already seen in this book, so
        // "dig" and "digging" are one word she meets twice, not two words she
        // meets once each.
        const key = foldWord(w, new Set(newWordCounts.keys()));
        newWordCounts.set(key, (newWordCounts.get(key) ?? 0) + 1);
      }
    }

    const trimmed = page.text.trim();
    if (trimmed in refrainCounts) refrainCounts[trimmed]++;
  });

  // New words: capped in number, and each must repeat enough to be learned.
  const newWords = [...newWordCounts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const underRepeated = newWords
    .filter((w) => w.count < level.minRepeatsPerNewWord)
    .map((w) => w.word);

  if (newWords.length > level.maxNewWords) {
    const excess = newWords.slice(level.maxNewWords).map((w) => w.word);
    issues.push({
      pageIndex: -1,
      kind: 'off-list-word',
      message: `The book introduces ${newWords.length} words that are not sight words; the limit is ${level.maxNewWords}. Replace these with simpler words: ${excess.join(', ')}.`,
    });
  }

  if (underRepeated.length) {
    issues.push({
      pageIndex: -1,
      kind: 'off-list-word',
      message: `These new words appear fewer than ${level.minRepeatsPerNewWord} times, so they will not be learned: ${underRepeated.join(', ')}. Either repeat each one across more pages or replace it with a sight word.`,
    });
  }

  const sightWordRatio = totalWords ? sightWords / totalWords : 0;
  if (sightWordRatio < level.minSightWordRatio) {
    issues.push({
      pageIndex: -1,
      kind: 'off-list-word',
      message: `Only ${Math.round(sightWordRatio * 100)}% of the words are known sight words; this level needs ${Math.round(level.minSightWordRatio * 100)}%. Swap unusual words for common ones.`,
    });
  }

  // Refrains have to actually recur, and they have to be identical each time.
  for (const [refrain, count] of Object.entries(refrainCounts)) {
    if (count < level.refrainRepeats) {
      issues.push({
        pageIndex: -1,
        kind: 'name-drift',
        message: `The refrain "${refrain}" appears ${count} time(s); it must appear exactly ${level.refrainRepeats} times, word for word, with no changes.`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      pages: draft.pages.length,
      totalWords,
      averageWordsPerSentence: sentenceCount ? +(totalWords / sentenceCount).toFixed(1) : 0,
      longestSentence: longest,
      sightWordRatio: +sightWordRatio.toFixed(2),
      newWords,
      underRepeatedNewWords: underRepeated,
      refrainCounts,
    },
  };
}

/** Turn a report into the correction note sent back to the model. */
export function repairInstructions(report: BookReport): string {
  return [
    'The draft did not pass the reading-level check. Fix every point below and return the whole book again in the same JSON format.',
    'Do not change anything that was already correct — keep the story, the characters and the page order identical.',
    '',
    ...report.issues.map((i) => `- ${i.message}`),
  ].join('\n');
}
