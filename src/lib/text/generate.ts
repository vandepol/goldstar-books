/**
 * Generate a book: ask Claude, check it, send it back if it failed, repeat.
 *
 * The loop is the point. A single call gives you a book that is *mostly* at
 * level; the loop gives you one that is at level on every page. Failures are
 * returned to the model as a specific list of pages and reasons rather than
 * "try again", because a vague retry usually produces a differently-wrong book.
 */

import Anthropic from '@anthropic-ai/sdk';
import { assembleBook } from './assemble';
import { DraftSchema, type Book, type BookRequest, type Draft } from '../schema';
import { checkDraft, repairInstructions, type BookReport } from '../validate';
import { buildUserPrompt, SYSTEM_PROMPT, type PromptContext } from './prompt';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const MAX_ATTEMPTS = Number(process.env.GENERATION_MAX_ATTEMPTS ?? 3);

export interface GenerationResult {
  book: Book;
  report: BookReport;
  attempts: number;
  /** True when the book still had issues after the last attempt. */
  degraded: boolean;
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

/** Pull the JSON object out of a reply, tolerating a stray fence or preamble. */
function parseDraft(raw: string): Draft {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model reply');
  return DraftSchema.parse(JSON.parse(body.slice(start, end + 1)));
}

export async function generateBook(
  request: BookRequest,
  childName: string,
): Promise<GenerationResult> {
  const anthropic = client();
  const ctx: PromptContext = { ...request, childName };
  const knownNames = [childName, ...request.characters.map((c) => c.name)];

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildUserPrompt(ctx) },
  ];

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
      draft = parseDraft(text);
    } catch (err) {
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: `That was not valid JSON in the required shape (${(err as Error).message}). Return the whole book again as one JSON object and nothing else.`,
      });
      continue;
    }

    report = checkDraft(draft, request.levelId, knownNames);
    if (report.ok) break;

    messages.push({ role: 'assistant', content: text });
    messages.push({ role: 'user', content: repairInstructions(report) });
  }

  if (!draft || !report) {
    throw new Error(`Generation failed after ${attempts} attempts`);
  }

  return {
    book: assembleBook(draft, request),
    report,
    attempts,
    degraded: !report.ok,
  };
}
