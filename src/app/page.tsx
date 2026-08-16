import Link from 'next/link';
import { LEVELS, LEVEL_ORDER } from '@/lib/levels';
import { CREDIT } from '@/lib/credit';

const PILLARS = [
  {
    n: '1',
    title: 'Written at her sentence length',
    body: 'Not a grade band. Two to fourteen words a page, set by the level you pick, held on every single page.',
  },
  {
    n: '2',
    title: 'Measured before you see it',
    body: 'Sight-word ratio, new-word count, refrain repeats — all checked, and anything that fails goes back for repair.',
  },
  {
    n: '3',
    title: 'She is the one who solves it',
    body: 'Her name, her friends, the things she loves. She is the hero, never the child who gets rescued.',
  },
];

const RANGE: Record<string, string> = {
  starting: '2–4 words',
  building: '3–6 words',
  growing: '5–10 words',
  flying: '6–14 words',
};

export default function Landing() {
  return (
    <main>
      <section className="bg-page px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex rounded-full bg-parchment px-4 py-1.5 text-sm font-semibold text-gold-deep">
              Free · {CREDIT.org}
            </span>
            <h1 className="mt-6 text-pretty font-display text-5xl font-medium leading-[1.04] tracking-tight sm:text-6xl">
              A book she can actually read, with her name on the cover.
            </h1>
            <p className="mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-slate sm:text-xl">
              Personalised reading practice for children with Down syndrome — written at the
              sentence length she reads at today, and measured against that level before you
              ever see it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/create"
                className="rounded-xl bg-sea px-7 py-4 text-base font-semibold text-page"
              >
                Make her first book
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border-[1.5px] border-[#C9BDA3] px-6 py-4 text-base font-semibold"
              >
                See a sample book
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted">
              Takes about two minutes. No card, no trial — the digital book is free forever.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[20px] bg-parchment p-7 shadow-[0_24px_50px_-28px_rgba(22,40,61,.45)]">
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[#C9BDA3] bg-page p-5 text-center text-sm text-[#94836A]">
                Cover illustration
              </div>
              <p className="mt-5 font-reading text-2xl font-bold tracking-wide">
                Maya and the Loud Dog
              </p>
              {/* Extra bottom room so the overlapping level-check chip sits
                  against the card rather than on top of this caption. */}
              <p className="mb-10 mt-2 text-sm text-muted">Level: Building confidence · 24 pages</p>
            </div>
            <div className="absolute -bottom-5 -left-6 flex items-center gap-3 rounded-2xl bg-page px-5 py-4 shadow-[0_14px_30px_-18px_rgba(22,40,61,.5)]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-lg font-bold text-white">
                ✓
              </span>
              <span>
                <span className="block text-sm font-semibold">Level check passed</span>
                <span className="block text-xs text-muted">78% sight words · 8 new words</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-20 sm:px-10">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Why a shelf book doesn&rsquo;t fit
        </h2>
        <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-slate">
          Books at the right word level are written for a three-year-old. Books at the right
          interest level have sentences she can&rsquo;t hold to the end. So the book has to be
          written for her.
        </p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.n} className="rounded-2xl bg-page p-7">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-parchment font-bold text-gold-deep">
                {p.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-slate">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="rounded-[22px] bg-ink p-10 text-page">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-medium">Pick the level she reads at now</h2>
              <p className="mt-2 text-page/70">
                Described so you can self-assess. No grade labels — they mislead badly for this group.
              </p>
            </div>
            <Link href="/create" className="rounded-[10px] bg-gold px-5 py-3 font-semibold text-ink">
              Start here
            </Link>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVEL_ORDER.map((id) => (
              <div key={id} className="rounded-[14px] border border-page/15 bg-page/[.07] p-5">
                <dt className="text-lg font-semibold">{LEVELS[id].label}</dt>
                <p className="mt-1.5 font-reading text-xs tracking-wide text-gold">{RANGE[id]}</p>
                <dd className="mt-3 leading-relaxed text-page/70">{LEVELS[id].description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-10">
        <div className="flex flex-wrap items-start gap-10 rounded-[20px] bg-page p-10">
          <div className="min-w-[340px] flex-1">
            <h2 className="font-display text-2xl font-medium">The model never has the last word</h2>
            <p className="mt-3 max-w-[52ch] leading-relaxed text-slate">
              Every draft is measured page by page. Anything that fails goes back for repair before
              the book is saved — and you see the numbers.
            </p>
          </div>
          <details className="min-w-[320px] flex-1 rounded-[14px] bg-[#F7F1E2] p-5">
            <summary className="flex justify-between gap-3 font-semibold">
              <span>What the research says</span>
              <span className="text-gold-deep">＋</span>
            </summary>
            <p className="pt-3 leading-relaxed text-slate">
              Children with Down syndrome are typically strong visual learners who read by
              whole-word recognition, often well above their measured language age, while working
              memory for spoken language is comparatively weak — a long sentence collapses before
              the end even when every word is known.{' '}
              <a className="underline" href="https://dsrf.org/resources/information/education/reading/">DSRF</a>,{' '}
              <a className="underline" href="https://www.down-syndrome.org/en-gb/resources/reading-language-intervention/">DSEI</a>,{' '}
              <a className="underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3470928/">Burgoyne et al.</a>
            </p>
          </details>
        </div>
      </section>

      <footer className="bg-ink px-6 py-10 text-page/75 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
          <p className="max-w-[52ch] leading-relaxed">
            Published by {CREDIT.org}, a registered Canadian charity ({CREDIT.charityNumber}).
            Books stay free. Donations pay for the illustrations.
          </p>
          <a
            href={CREDIT.donateUrl}
            className="rounded-[10px] border-[1.5px] border-gold/50 px-5 py-3 font-semibold text-gold"
          >
            Donate
          </a>
        </div>
      </footer>
    </main>
  );
}
