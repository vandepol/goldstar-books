/**
 * Tests for the readability gate.
 *
 * Run: npm test  (node --test --experimental-strip-types tests/*.test.ts)
 *
 * These are the tests that matter most in the codebase. Everything else can be
 * wrong and get fixed in a follow-up; if this file passes while the validator
 * is broken, a child gets handed a book she cannot read and quietly concludes
 * she is bad at reading.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDraft, countWords, splitSentences } from '../src/lib/validate.ts';
import type { Draft } from '../src/lib/schema.ts';

function draft(pages: { text: string; refrain?: boolean }[], refrains: string[] = []): Draft {
  return {
    title: 'Test Book',
    subtitle: '',
    refrains,
    pages: pages.map((p) => ({
      text: p.text,
      refrain: p.refrain ?? false,
      illustration: { action: 'x', place: 'y', mood: 'happy', characters: [] },
    })),
    quiz: [],
    wordWall: [],
  } as Draft;
}

test('counts words ignoring punctuation-only tokens', () => {
  assert.equal(countWords('"Dig here!" said Constance.'), 4);
  assert.equal(countWords('Yo ho, Constance!'), 3);
});

test('splits on sentence enders', () => {
  assert.deepEqual(splitSentences('She ran. She won!'), ['She ran.', 'She won!']);
});

test('accepts a book that is within level', () => {
  const pages = [
    { text: 'This is Constance.' },
    { text: 'Constance is a pirate.' },
    { text: 'Constance is brave.', refrain: true },
    { text: 'A pirate can find it.' },
    { text: 'Constance is brave.', refrain: true },
    { text: 'The map is here.' },
    { text: 'Constance is brave.', refrain: true },
    { text: 'A pirate has the map.' },
    { text: 'We can go now.' },
    { text: 'She can see it.' },
    { text: 'They are all here.' },
    { text: 'We can help her.' },
  ];
  const report = checkDraft(draft(pages, ['Constance is brave.']), 'building', ['Constance']);
  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.stats.refrainCounts['Constance is brave.'], 3);
});

test('rejects a sentence over the word limit', () => {
  const report = checkDraft(
    draft([{ text: 'Constance and her friends all ran down to the little boat.' }]),
    'building',
    ['Constance'],
  );
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.kind === 'too-long'));
});

test('rejects more than one sentence per page at early levels', () => {
  const report = checkDraft(
    draft([{ text: 'She ran fast. She won it.' }]),
    'building',
    [],
  );
  assert.ok(report.issues.some((i) => i.kind === 'too-many-sentences'));
});

test('flags a new word that never repeats', () => {
  const pages = [
    { text: 'The kraken is here.' },
    { text: 'We can see it.' },
    { text: 'We can run away.' },
    { text: 'We are all here.' },
  ];
  const report = checkDraft(draft(pages), 'building', []);
  assert.ok(
    report.stats.underRepeatedNewWords.includes('kraken'),
    `expected kraken to be under-repeated, got ${JSON.stringify(report.stats.underRepeatedNewWords)}`,
  );
});

test('treats the child name as always known', () => {
  const withName = checkDraft(
    draft([{ text: 'Constance can run.' }, { text: 'Constance can go.' }]),
    'building',
    ['Constance'],
  );
  assert.equal(withName.stats.newWords.length, 0);
  assert.equal(withName.stats.sightWordRatio, 1);
});

test('folds simple inflections so sail/sails is one word', () => {
  const pages = [
    { text: 'We can sail away.' },
    { text: 'The boat sails away.' },
    { text: 'We sail to it.' },
  ];
  const report = checkDraft(draft(pages), 'building', []);
  const sail = report.stats.newWords.find((w) => w.word === 'sail');
  assert.ok(sail, 'expected sail to be tracked as one word');
  assert.equal(sail!.count, 3);
});

test('a refrain that changes wording is caught', () => {
  const pages = [
    { text: 'Yo ho, Constance!', refrain: true },
    { text: 'We can go now.' },
    { text: 'Yo ho, Constance.', refrain: true }, // full stop instead of "!"
    { text: 'We can go now.' },
    { text: 'Yo ho, Constance!', refrain: true },
  ];
  const report = checkDraft(draft(pages, ['Yo ho, Constance!']), 'building', ['Constance']);
  assert.equal(report.stats.refrainCounts['Yo ho, Constance!'], 2);
  assert.ok(report.issues.some((i) => i.kind === 'name-drift'));
});

test('higher levels allow longer sentences', () => {
  const long = draft([{ text: 'Constance ran down the hill to find her little dog.' }]);
  assert.equal(checkDraft(long, 'building', ['Constance']).ok, false);
  const flying = checkDraft(long, 'flying', ['Constance']);
  assert.ok(!flying.issues.some((i) => i.kind === 'too-long'));
});
