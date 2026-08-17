/**
 * The teaching strategies this product is built on, written down once.
 *
 * Both marketing surfaces (the app's home page and the static showcase site)
 * render from this file, so the claims shown to parents cannot drift from
 * each other or from what the product actually does. Every strategy names the
 * organisation or study it comes from; `how` states — checkably — where the
 * product implements it. If a strategy ever stops being true of the product,
 * fix the product or delete the claim, never soften the wording.
 *
 * Grounding, in the sources' own terms (see SOURCES below):
 * - Children with Down syndrome typically show a relative strength in visual
 *   processing and a relative weakness in phonological processing, which is
 *   why instruction starts from whole-word (sight word) recognition (DSRF,
 *   citing Buckley 2001; Lemons & Fuchs 2010).
 * - Sight-word foundations work best "using personal connections with words
 *   that are most meaningful to them" (DSRF).
 * - Learners "need more repetition and more time" with new material (DSRF,
 *   citing Al Otaiba & Hosp; Allor et al.).
 * - A child can start as soon as she is "table ready" — able to engage for
 *   about five minutes (DSRF, citing Broun 2007).
 * - Reading activities develop speech, language and working memory, not just
 *   reading (DSRF, citing Buckley 2009).
 * - Structured daily sight-word + language teaching measurably beats ordinary
 *   teaching in a randomised controlled trial (Burgoyne et al. 2012 — the RLI
 *   programme from Down Syndrome Education International).
 * - Match–select–name is the standard flashcard routine for new sight words,
 *   taught in small sets (DSE's See and Learn; Down Syndrome Ireland).
 */

export interface Strategy {
  id: string;
  title: string;
  /** Parent-facing: what the strategy is and why it works. */
  what: string;
  /** Where this product implements it — concrete and checkable. */
  how: string;
  source: { label: string; url: string };
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'whole-words-first',
    title: 'Start with whole words, not sounding out',
    what:
      'Children with Down syndrome are typically strong visual learners with a relative weakness in phonological processing, so they learn to read fastest by recognising whole words on sight — and research shows phonological skills can then grow as a result of reading, not only the other way round.',
    how:
      'Every level is built on the Dolch sight-word lists. The level check measures the exact sight-word ratio of every book and rejects books below the level’s floor.',
    source: { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  },
  {
    id: 'personal-words',
    title: 'Her own name and her own world come first',
    what:
      'Sight-word teaching works best through personal connections — words that are most meaningful to the child. A child’s own name is usually the first word she learns to recognise, and motivation is most of the battle.',
    how:
      'Her name goes on the cover and into every page, the validator treats names as always-known words, and story ideas are built from the things she loves.',
    source: { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  },
  {
    id: 'repetition',
    title: 'Repetition that actually teaches',
    what:
      'Learners with Down syndrome need more repetition and more time with new material than typical readers. A word met once is a word met, not a word learned.',
    how:
      'Every new word in a book must repeat a minimum number of times for its level, and refrains must recur word-for-word. Both are enforced by the level check, and the new-word repeat counts are shown to you.',
    source: { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  },
  {
    id: 'short-sentences',
    title: 'Sentences short enough to hold',
    what:
      'Verbal working memory is comparatively weak, so a long sentence collapses before its end even when every word in it is known. The fix is structural: short sentences, one idea per page.',
    how:
      'Each level sets a hard per-sentence word band and a sentences-per-page cap. The limit is not an average — the level check measures the longest sentence in the book.',
    source: { label: 'Burgoyne et al. 2012 — randomised controlled trial', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3470928/' },
  },
  {
    id: 'structured-sessions',
    title: 'Short, structured, frequent sessions',
    what:
      'The teaching programme proven in a randomised controlled trial (RLI) uses brief, fast-paced, daily one-to-one sessions. A child can start as soon as she is “table ready” — able to sit and engage for about five minutes. Stop while it is still fun.',
    how:
      'Books are short by design, a session is one book or one flashcard set, and nothing in the reader punishes stopping — the star screen celebrates wherever she got to.',
    source: { label: 'Down Syndrome Education International — RLI', url: 'https://www.down-syndrome.org/en-gb/resources/reading-language-intervention/' },
  },
  {
    id: 'match-select-name',
    title: 'Flashcards, the match–select–name way',
    what:
      'The standard routine for new sight words, taught in small sets: first she matches a word card to the same word, then she selects the word you name, then she names the word herself. Three passes, easiest first, so she is right far more often than wrong.',
    how:
      'Every book has a flashcard deck — her name plus the book’s key words — in large, clear type, with the three steps printed on the cards page so the routine travels with them.',
    source: { label: 'See and Learn (Down Syndrome Education International)', url: 'https://www.seeandlearn.org/' },
  },
  {
    id: 'errorless',
    title: 'Errorless learning protects motivation',
    what:
      'Success-based teaching sets the child up to be right, because repeated failure teaches avoidance faster than it teaches reading. Correction is a calm model of the right answer, never a buzzer.',
    how:
      'The quiz options are deliberately easy, a wrong tap just wobbles gently while the right answer is always available, and books that miss a check are labelled for the adult — never for the child.',
    source: { label: 'See and Learn (Down Syndrome Education International)', url: 'https://www.seeandlearn.org/' },
  },
  {
    id: 'pictures-match',
    title: 'Pictures that say exactly what the words say',
    what:
      'For a visual learner the picture is load-bearing: it should show precisely what the sentence says, with one clear subject and an uncluttered background, so the image supports meaning instead of competing with it.',
    how:
      'Every page stores an illustration brief tied to its sentence, and the scene renderer draws one clear subject keyed to the page’s mood — never a busy spread.',
    source: { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  },
  {
    id: 'clear-type',
    title: 'Big, plain, consistent type',
    what:
      'Reading materials for this group use large, clear, plain sans-serif type — lower-case for sight words, generous spacing, no decorative fonts. The reading surface is not a place to express a brand.',
    how:
      'Every word a child reads is set in Verdana at large sizes, flashcards are lower-case, and hit targets in the reader are at least 64px.',
    source: { label: 'Down Syndrome Ireland — Learning to Read: Getting Started', url: 'https://downsyndrome.ie/wp-content/uploads/2025/08/Learning-to-Read-Getting-Started.pdf' },
  },
  {
    id: 'reading-feeds-language',
    title: 'Reading builds speech, not just reading',
    what:
      'Reading activities develop speech, language and working memory — for many children with Down syndrome, print is a route into spoken language, which is why starting early matters and why grade labels mislead.',
    how:
      'Levels are described by what she does now, never by age or grade, and the reader’s tap-a-word and read-to-me tools let her hear any word on demand — nothing ever autoplays.',
    source: { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  },
];

export const SOURCES = [
  { label: 'Down Syndrome Resource Foundation — Reading', url: 'https://dsrf.org/resources/information/education/reading/' },
  { label: 'Down Syndrome Education International — Reading and Language Intervention (RLI)', url: 'https://www.down-syndrome.org/en-gb/resources/reading-language-intervention/' },
  { label: 'Burgoyne et al. — Efficacy of a reading and language intervention for children with Down syndrome: an RCT', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3470928/' },
  { label: 'See and Learn — Down Syndrome Education International', url: 'https://www.seeandlearn.org/' },
  { label: 'Down Syndrome Ireland — Learning to Read: Getting Started (PDF)', url: 'https://downsyndrome.ie/wp-content/uploads/2025/08/Learning-to-Read-Getting-Started.pdf' },
  { label: 'National Down Syndrome Society — Education resources', url: 'https://ndss.org/resources' },
] as const;
