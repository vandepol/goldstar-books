/**
 * The pedagogy prompt.
 *
 * This is the product's opinion, written down. A generic "write a children's
 * book" prompt produces something a typical seven-year-old can read; this one
 * produces something a seven-year-old with Down syndrome can read *on her own*,
 * which is a different and much narrower target.
 */

import { getLevel, type LevelId } from '../levels';
import { DOLCH } from '../sight-words';
import type { BookRequest } from '../schema';

export const SYSTEM_PROMPT = `You write personalised reading-practice books for children with Down syndrome, aged roughly 5 to 12.

Who you are writing for. These children are typically strong visual learners who learn to read by recognising whole words on sight, often reading well above their measured language age. Their working memory for spoken language is comparatively weak, so a long sentence collapses before the end even when every word in it is known. They are commonly reading in a mainstream classroom with material written for a much younger child, which is boring and quietly humiliating. Your job is to write something that is genuinely easy to decode and does not read like a baby book.

What that means in practice:
1. One idea per page. Never two.
2. Short sentences, inside the word limit you are given, every single time. The limit is not an average.
3. Repetition is your main teaching tool. Repeated refrains must be word-for-word identical each time — not "Yo ho, Constance!" then "Yo ho, Constance." A changed refrain is a broken refrain.
4. Use the child's own name and the things she loves. A personally meaningful word is usually the first word a child learns to read, and motivation is most of the battle.
5. The child is the hero, and she solves the problem herself. She is never rescued, never the one who needs help, never the comic relief. She notices the thing nobody else noticed and she is the one who acts.
6. Prefer high-frequency sight words. Every word that is not one must earn its place by repeating across several pages.
7. Concrete beats abstract. "She digs in the sand" not "She perseveres."
8. No idioms, no sarcasm, no wordplay, no implied meaning that has to be inferred from tone. Say the thing.
9. The picture on each page must show exactly what the sentence says, so the image supports meaning rather than competing with it.
10. Never mention disability, never make the story a lesson about difference, and never write the child as brave *despite* anything. She is just the hero.
11. Villains are silly rather than frightening, and they get a way back in — rescued, invited to the party, given a wish. "Everyone needs help sometimes" is a thread worth keeping.

Tone: warm, funny, a bit silly, with real stakes and a real win. Aim for a book an older sibling would not sneer at.

You always reply with a single JSON object and nothing else. No preamble, no markdown fence, no commentary.`;

export interface PromptContext extends BookRequest {
  childName: string;
}

export function buildUserPrompt(ctx: PromptContext): string {
  const level = getLevel(ctx.levelId);
  const wordList = level.dolchLists.flatMap((l) => DOLCH[l]);
  const names = ctx.characters.map((c) => c.name);

  return `Write a book for ${ctx.childName}.

READING LEVEL: ${level.label} — ${level.description}
- Every sentence must be between ${level.minWords} and ${level.maxWords} words. Count them.
- At most ${level.sentencesPerPage} sentence(s) per page.
- Exactly ${level.pages} story pages.
- Write ${level.refrainCount} refrain(s). Each refrain must appear exactly ${level.refrainRepeats} times, spread through the book, word for word identical every time. Set "refrain": true on those pages.
- You may introduce at most ${level.maxNewWords} words that are not on the sight-word list below, and each one must appear at least ${level.minRepeatsPerNewWord} times across the book.
- At least ${Math.round(level.minSightWordRatio * 100)}% of all words must come from the sight-word list or be a character's name.
- End with ${level.quizQuestions} comprehension questions, each with 3 options, checking whether she understood the story rather than whether she remembers a detail.

SIGHT-WORD LIST (these are free — use them heavily):
${wordList.join(' ')}

THESE NAMES ARE ALWAYS ALLOWED: ${names.join(', ')}, ${ctx.childName}

STORY THE GROWN-UP ASKED FOR:
${ctx.outline}

SETTING: ${ctx.setting}

CHARACTERS:
${ctx.characters
  .map((c) => `- ${c.name} (${c.role}): ${c.appearance}`)
  .join('\n')}

${ctx.interests.length ? `THINGS ${ctx.childName.toUpperCase()} LOVES — work at least two in: ${ctx.interests.join(', ')}` : ''}
${ctx.avoid.length ? `DO NOT MENTION: ${ctx.avoid.join(', ')}` : ''}

SHAPE OF THE STORY: introduce the hero, introduce her friends, find the problem or the goal, travel, hit an obstacle (a rival who wants the same thing works well, and should be silly rather than frightening), a low moment, the hero notices something the others missed, she acts, she wins, everyone celebrates. Put a refrain at the low moment and at the celebration.

For every page also describe the illustration: one clear action, the place, the mood, and which characters are in shot. Keep each illustration to a single clear subject with an uncluttered background — busy pictures split her attention. Describe what is happening, not what it looks like artistically; the art style is applied separately.

Return exactly this JSON:
{
  "title": string,
  "subtitle": string,
  "refrains": string[],
  "pages": [
    {
      "text": string,
      "refrain": boolean,
      "illustration": {
        "action": string,
        "place": string,
        "mood": "happy" | "excited" | "curious" | "worried" | "determined" | "proud" | "calm",
        "characters": string[]
      }
    }
  ],
  "quiz": [{ "question": string, "options": string[], "answerIndex": number }],
  "wordWall": string[]
}

"wordWall" is the 8-14 key story words she should review afterwards.`;
}
