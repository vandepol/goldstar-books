# Gold Star Books

Personalised reading-practice books for children with Down syndrome, written to
the level the child actually reads at — and checked, before anyone sees them,
that they really are at that level.

Free to families. Published by the **Down Syndrome Association of Hamilton**, a
registered Canadian charity (119230225 RR 0001). Every book ends with a page
saying so and a link to donate; that page is part of the book format, not a
footer, because it is the whole funding model.

---

## Why this exists

Children with Down syndrome are typically strong visual learners who learn to
read by recognising whole words, and who often read well above their measured
language age. Their working memory for spoken language is comparatively weak,
so a long sentence collapses before the end even when every word in it is
known.

The practical consequence is a gap nothing on the shelf fills. Books at the
right *word* level are written for a three-year-old and are boring and quietly
humiliating for a nine-year-old. Books at the right *interest* level have
sentences she cannot hold. So the book has to be written for her specifically:
her name, her friends, the things she loves, at her sentence length, with the
repetition she needs — and with her as the hero who solves it, not the one who
gets rescued.

That is a per-child, per-week problem. It is exactly the kind of thing that was
impractical before and is cheap now.

## What makes it more than a prompt

Anyone can ask a model for "a simple story". What that gives you is a book
that is *mostly* at level: page 3 is four words, page 19 is eleven, and
"suddenly" has crept in. For a child learning by sight-word recognition, that
drift is the difference between a book she reads and a book that teaches her
she is bad at reading.

So the model never has the last word. Every draft is measured, and anything
that fails goes back with a specific, per-page list of what to fix:

```
src/lib/levels.ts       four levels, each with hard constraints
src/lib/sight-words.ts  the Dolch lists (public domain)
src/lib/validate.ts     the gate — this is the part that has to be right
src/lib/text/prompt.ts  the pedagogy, written down
src/lib/text/generate.ts  generate → check → repair, up to 3 passes
src/lib/text/relevel.ts   move a story between levels, arc intact
```

The checks, per book:

| Check | Why |
| --- | --- |
| Every sentence within the level's word range | The limit is not an average |
| Sentences per page | One idea per page |
| % of running words that are known sight words | Sight-word strand is the load-bearing one |
| Cap on new (off-list) words | A book is not a vocabulary dump |
| Each new word repeats ≥ N times | Met once is not learned |
| Refrains appear exactly N times, word for word | A changed refrain is a broken refrain |

The resulting report is shown to the adult in a **Level check** panel next to
the book — numbers, new words with their counts, and any failures in plain
language. A teacher or SLP will not hand a generated book to a child on the
promise that it is easy; they will want to see the measurements. Books that
never fully passed are saved but labelled, never hidden.

## Reading levels

Described so a parent can self-assess, not in grade equivalents — grade labels
mislead badly for this group.

| Level | Sentence | Pages | Refrains | Sight-word floor |
| --- | --- | --- | --- | --- |
| Just starting | 2–4 words | 16 | 2 × 3 | 80% |
| Building confidence | 3–6 words | 24 | 2 × 3 | 75% |
| Growing | 5–10 words | 24 | 1 × 3 | 70% |
| Flying | 6–14 words | 28 | 1 × 2 | 65% |

### Moving a story between levels

`src/lib/text/relevel.ts` rewrites an existing book at a different level while
holding the arc, the cast, the setting, the page count and what happens on each
page fixed. Only the sentences change. Moving up is explicitly told not to pad —
a longer sentence should carry more story, not the same story slower.

This matters because when a book lands, the child's attachment is to *that*
story. "Generate a new one" throws away the thing she liked. The original is
kept by default.

## The reading surface

`src/components/Reader.tsx`. Every decision is a reading decision:

- One page at a time. Nothing else on screen.
- Large left-aligned Verdana, wide word and line spacing, no italics, no all-caps.
- **Nothing is read aloud automatically.** Audio fires only when she asks —
  the "Read to me" button, or tapping a single word. A voice that starts on its
  own trains her to wait for it instead of reading.
- Refrain pages carry a "You know this one!" tag so she can spot a page she
  already owns.
- Comprehension questions at the end; a wrong answer says "Try again" and never
  buzzes. Errorless practice.
- A sight-word wall for short review, then the charity page.

## Running it

```bash
cp .env.example .env      # add ANTHROPIC_API_KEY, AUTH_SECRET, EMAIL_SERVER
npm install
npx prisma db push
npm run db:seed           # load the ten-story starter library
npm run dev
```

```bash
npm test        # the validator's tests — the ones that matter
npm run typecheck
```

Auth is magic-link email only. No passwords, on purpose: the account holder is
a parent or a teacher, often on a school device, and a forgotten password is
the most common reason an adult abandons a tool like this.

A **Child** is not a user. One adult account holds several child profiles, each
with its own level, interests and words-to-avoid, because the level belongs to
the reader and everything the generator does keys off it. Teachers have a
classroom of them.

## The starter library

`src/data/stories.ts` holds ten finished stories — three per early level, two
per later one — written by hand under the same rules the generator lives
under, and `tests/stories.test.ts` re-runs every one through `checkDraft` so
they can never silently fall out of level. `npm run db:seed` loads them.

They are also published as a static showcase: `npx tsx scripts/build-site.ts`
pre-renders the whole library (scenes, level checks, credit page) into
`docs/index.html`, which GitHub Pages serves. The reader there is the same
design as the app's — tap-a-word, read-to-me, errorless quiz, word wall, star
screen, charity page — in plain HTML/JS, because Pages cannot run the server.

## Illustrations

`src/lib/art/provider.ts` defines the provider interface and the frozen
art-direction token. The current provider is `src/lib/art/svg.ts`: flat,
deterministic SVG scenes composed from the page's mood, the book's setting and
each character's frozen palette — real pictures, not a grey slot, while still
being honest that they are generated locally rather than by an image model. A
book with real `imageUrl`s uses them untouched.

The one thing locked in early: each character carries a **frozen appearance
block** (`Character.appearance`) that is written once and pasted verbatim into
every image prompt. Whatever renders the pictures later — an image model with
reference sheets, or a human illustrator — works from that same block, so a
character cannot drift between pages.

Worth remembering when that work starts: for this reader group *simple is a
feature*. One clear subject, uncluttered background, high contrast, picture
matching the sentence exactly. Rich, busy illustration splits attention. The
goal is better-crafted simple, not more detailed.

---

## Roadmap

### Next

- **Illustrations.** Character-sheet method: generate one reference sheet per
  character, attach it to every page render so the character stays consistent
  across 25 pages. Costs roughly $0.50–2.00 and a few minutes per book at
  current API prices, so it needs a cost meter and a per-page regenerate before
  it can be switched on for everyone.
- **Reading records.** The `Reading` table is in the schema and unused. Track
  only the two things that tell an adult what to practise: which pages she asked
  to have read aloud, and which words she tapped. Not a dashboard — a short list
  of words to work on.
- **Print at home.** A clean print stylesheet and a PDF export, one page per
  sheet, before anything involving money.

### Print-on-demand (the one place there is revenue)

When a book really lands, families want a physical copy — and a real printed
book with her name on the cover is a different object to a PDF. The plan:

- Generate a print-ready interior PDF (bleed, margins, spine allowance) plus a
  cover from the same book JSON. This is the only genuinely new engineering; the
  content is already structured.
- Integrate a book print-on-demand API — the Printful equivalent for books.
  Candidates to evaluate: **Lulu Direct** (has a proper print API, handles
  hardcover children's formats and ships worldwide), **Blurb**, **RPI/Peecho**.
  Lulu is the closest analogue to Printful for this and is where I would start.
- Price at cost plus a small margin that funds the hosting and the illustration
  budget. State plainly on the page that the margin goes to the association —
  for this audience that is a reason to buy, not a disclosure.
- Keep the digital book free and unrestricted forever. The print option must
  never become the reason the free version is worse.

Sequence matters: illustrations have to be good before print is worth selling.
Nobody wants a hardcover of placeholder boxes.

### Later

- **Classroom mode.** A teacher with eight readers needs to generate a set at
  eight different levels from one story, which is `relevel` applied in a batch.
- **Series.** Same hero, same world, new adventure — with vocabulary carried
  forward so words compound across books instead of resetting.
- **Sharing a book back to the library.** With consent, a de-personalised
  version (names swapped out) other families can adopt for their own child.
  Cheaper than generating, and the good stories are worth spreading.
- **Languages.** French first, given Ontario. The validator design carries over;
  the sight-word lists do not, and would need a proper equivalent per language.

---

## Pedagogy sources

- Down Syndrome Resource Foundation — *Reading*:
  https://dsrf.org/resources/information/education/reading/
- Down Syndrome Education International — *Reading and Language Intervention (RLI)*:
  https://www.down-syndrome.org/en-gb/resources/reading-language-intervention/
- Burgoyne et al., *Efficacy of a reading and language intervention for children
  with Down syndrome: a randomized controlled trial*:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3470928/
- Dolch word lists (public domain, Edward Dolch 1936–48).
