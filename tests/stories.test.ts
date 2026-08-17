/**
 * Every starter-library story must pass the same level check as a generated
 * book. If an edit to a story — or to the levels, the word lists or the
 * validator itself — knocks one out of level, this fails with the full report.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORIES } from '../src/data/stories';
import { BookSchema } from '../src/lib/schema';
import { checkDraft } from '../src/lib/validate';
import type { LevelId } from '../src/lib/levels';

test('there are ten starter stories', () => {
  assert.equal(STORIES.length, 10);
});

test('every level has at least two starter stories', () => {
  const byLevel = new Map<string, number>();
  for (const s of STORIES) byLevel.set(s.levelId, (byLevel.get(s.levelId) ?? 0) + 1);
  for (const level of ['starting', 'building', 'growing', 'flying']) {
    assert.ok((byLevel.get(level) ?? 0) >= 2, `level ${level} has too few stories`);
  }
});

for (const story of STORIES) {
  test(`"${story.title}" is valid against the book schema`, () => {
    BookSchema.parse(story);
  });

  test(`"${story.title}" passes the ${story.levelId} level check`, () => {
    const names = story.characters.map((c) => c.name);
    const report = checkDraft(story, story.levelId as LevelId, names);
    assert.ok(
      report.ok,
      `level check failed:\n${report.issues.map((i) => `  - ${i.message}`).join('\n')}`,
    );
  });
}

/**
 * Word-wall rule from the original series playbook: every word on the wall
 * must appear at least twice in the story, because the wall is review, and
 * you cannot review a word you met once.
 */
import { normalise, foldWord } from '../src/lib/sight-words';

for (const story of STORIES) {
  test(`"${story.title}" word wall only reviews words the story used twice`, () => {
    const counts = new Map<string, number>();
    for (const page of story.pages) {
      for (const raw of page.text.split(/\s+/)) {
        const w = normalise(raw);
        if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    const vocab = new Set(counts.keys());
    for (const word of story.wordWall) {
      const key = foldWord(normalise(word), vocab);
      assert.ok(
        (counts.get(key) ?? 0) >= 2,
        `wall word "${word}" appears ${counts.get(key) ?? 0} time(s) in the story`,
      );
    }
  });
}
