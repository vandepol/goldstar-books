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
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? 'gpt-5';
const MAX_ATTEMPTS = Number(process.env.GENERATION_MAX_ATTEMPTS ?? 3);

/**
 * Which model writes the words. Explicit TEXT_PROVIDER wins; otherwise
 * whichever key is present, Anthropic first — the prompt was tuned against
 * Claude, and the repair loop is what holds either model to the level.
 */
const TEXT_PROVIDER =
  process.env.TEXT_PROVIDER ??
  (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'anthropic');

/** One text completion, provider-agnostic. Messages use the shared shape. */
async function completeText(
  anthropic: Anthropic | null,
  messages: Anthropic.MessageParam[],
): Promise<string> {
  if (TEXT_PROVIDER === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        // GPT-5-family models spend reasoning tokens out of this same budget,
        // so it must be far larger than the visible JSON; low effort because
        // this is constrained-format writing, not a puzzle.
        max_completion_tokens: 24000,
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI chat API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as {
      choices: { message: { content: string }; finish_reason: string }[];
    };
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error(
        `OpenAI returned no text (finish_reason: ${choice?.finish_reason ?? 'none'}) — usually the reasoning budget ate max_completion_tokens`,
      );
    }
    return choice.message.content;
  }
  const reply = await anthropic!.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages,
  });
  return reply.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

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
  const anthropic = TEXT_PROVIDER === 'anthropic' ? client() : null;
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
    const text = await completeText(anthropic, messages);

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
