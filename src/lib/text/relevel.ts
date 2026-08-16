/**
 * Move a story between reading levels.
 *
 * The common case this exists for: a book lands, the child loves it, and six
 * months later it is too easy — or it was pitched too low to begin with. The
 * wrong answer is "generate a new book", because what she is attached to is
 * *this* story, these characters, this joke on page nine. So the arc, the cast,
 * the setting, the page order and the beat of each page are held fixed and only
 * the sentences are rewritten to the new level.
 *
 * It runs through the same validator as a fresh book, because a rewrite is
 * exactly as capable of drifting as a first draft.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getLevel, type LevelId } from '../levels';
import { DOLCH } from '../sight-words';
import { DraftSchema, type Book, type Draft } from '../schema';
import { checkDraft, repairInstructions, type BookReport } from '../validate';
import { SYSTEM_PROMPT } from './prompt';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const MAX_ATTEMPTS = Number(process.env.GENERATION_MAX_ATTEMPTS ?? 3);

export interface RelevelResult {
  book: Book;
  report: BookReport;
  attempts: number;
  degraded: boolean;
  from: LevelId;
  to: LevelId;
}

function buildPrompt(book: Book, to: LevelId): string {
  const level = getLevel(to);
  const words = level.dolchLists.flatMap((l) => DOLCH[l]);
  const names = book.characters.map((c) => c.name);

  return `Rewrite this book at a different reading level.

WHAT MUST NOT CHANGE:
- The story: same events, same order, same ending.
- The characters and their names.
- The setting.
- Which pages are refrain pages (marked below). A refrain may be reworded to fit the new level, but it must still be one repeated line, identical every time it appears.
- The number of pages, and what happens on each page. Page 7 must still be the moment page 7 is now.

WHAT CHANGES: the sentences, to fit the new level.

NEW READING LEVEL: ${level.label} — ${level.description}
- Every sentence between ${level.minWords} and ${level.maxWords} words.
- At most ${level.sentencesPerPage} sentence(s) per page.
- Each refrain appears exactly ${level.refrainRepeats} times, word for word identical.
- At most ${level.maxNewWords} words off the sight-word list, each repeating at least ${level.minRepeatsPerNewWord} times.
- At least ${Math.round(level.minSightWordRatio * 100)}% of words from the list below or a character name.

${
  level.maxWords > 6
    ? 'You are moving UP. Do not simply glue the old sentences together — a longer sentence should carry more of the story, not the same story with padding. Add the small details a stronger reader can now enjoy: what someone said, what it looked like, why it mattered.'
    : 'You are moving DOWN. Keep every story beat, but say it in fewer words. Do not drop pages to save effort — a shorter book is not the goal, a readable one is.'
}

SIGHT-WORD LIST:
${words.join(' ')}

NAMES ALWAYS ALLOWED: ${names.join(', ')}

THE BOOK AS IT STANDS:
Title: ${book.title}
Setting: ${book.setting}
Characters: ${book.characters.map((c) => `${c.name} (${c.role})`).join(', ')}
Pages:
${book.pages
  .map((p, i) => `${i + 1}. ${p.refrain ? '[REFRAIN] ' : ''}${p.text}   (picture: ${p.illustration.action})`)
  .join('\n')}

Comprehension questions to keep asking, reworded to the new level if needed:
${book.quiz.map((q) => `- ${q.question}`).join('\n')}

Return the whole rewritten book as one JSON object, same shape as before:
{ "title", "subtitle", "refrains": [], "pages": [{ "text", "refrain", "illustration": { "action", "place", "mood", "characters": [] } }], "quiz": [{ "question", "options", "answerIndex" }], "wordWall": [] }

Keep each page's illustration description as it is — the pictures are not changing.`;
}

export async function relevelBook(book: Book, to: LevelId, childName: string): Promise<RelevelResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const anthropic = new Anthropic({ apiKey });

  const knownNames = [childName, ...book.characters.map((c) => c.name)];
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildPrompt(book, to) }];

  let draft: Draft | null = null;
  let report: BookReport | null = null;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    const reply = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages,
    });
    const text = reply.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      draft = DraftSchema.parse(JSON.parse(text.slice(start, end + 1)));
    } catch (err) {
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: `That was not valid JSON in the required shape (${(err as Error).message}). Return the whole book again as one JSON object and nothing else.`,
      });
      continue;
    }

    // A rewrite that quietly loses pages has lost story, which is the one thing
    // it was told to keep. Treat it as a failure, not a stylistic choice.
    if (draft.pages.length !== book.pages.length) {
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: `The rewrite has ${draft.pages.length} pages but the original has ${book.pages.length}. Return it again with exactly ${book.pages.length} pages, one for each page of the original, in the same order.`,
      });
      continue;
    }

    report = checkDraft(draft, to, knownNames);
    if (report.ok) break;
    messages.push({ role: 'assistant', content: text });
    messages.push({ role: 'user', content: repairInstructions(report) });
  }

  if (!draft || !report) throw new Error(`Re-level failed after ${attempts} attempts`);

  const rewritten: Book = {
    ...book,
    title: draft.title || book.title,
    subtitle: draft.subtitle || book.subtitle,
    levelId: to,
    refrains: draft.refrains,
    wordWall: draft.wordWall,
    quiz: draft.quiz,
    // Illustrations are carried over untouched: same pictures, new words.
    pages: draft.pages.map((p, index) => ({
      ...book.pages[index],
      index,
      text: p.text,
      refrain: p.refrain,
    })),
  };

  return { book: rewritten, report, attempts, degraded: !report.ok, from: book.levelId, to };
}
