'use client';

/**
 * The level check panel.
 *
 * This is the feature that makes the product trustworthy rather than magical.
 * A teacher or SLP will not put a generated book in front of a child on the
 * promise that it is "easy"; they want the numbers. So every book ships with
 * its measurements, in plain language, including when it failed — a book that
 * scraped through is labelled, not hidden.
 */

import type { BookReport } from '@/lib/validate';
import { getLevel, nextLevel, type LevelId } from '@/lib/levels';

export function LevelCheck({
  report,
  levelId,
  attempts,
  onRelevel,
}: {
  report: BookReport;
  levelId: LevelId;
  attempts?: number;
  onRelevel?: () => void;
}) {
  const level = getLevel(levelId);
  const { stats } = report;
  const up = nextLevel(levelId);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const worstRepeat = stats.newWords.length
    ? Math.min(...stats.newWords.map((w) => w.count))
    : 0;
  const refrains = Object.entries(stats.refrainCounts);
  const maxCount = Math.max(1, ...stats.newWords.map((w) => w.count));

  const rows = [
    {
      name: 'Sentence length',
      why: `Every sentence inside ${level.minWords}–${level.maxWords} words. The limit is not an average.`,
      value: `longest ${stats.longestSentence}`,
      ok: stats.longestSentence <= level.maxWords,
    },
    {
      name: 'One idea per page',
      why: `Up to ${level.sentencesPerPage} sentence${level.sentencesPerPage > 1 ? 's' : ''} a page at this level.`,
      value: `${stats.pages} pages`,
      ok: !report.issues.some((i) => i.kind === 'too-many-sentences'),
    },
    {
      name: 'Known sight words',
      why: `Floor for this level is ${pct(level.minSightWordRatio)}.`,
      value: pct(stats.sightWordRatio),
      ok: stats.sightWordRatio >= level.minSightWordRatio,
    },
    {
      name: 'New words',
      why: `A book is not a vocabulary dump. Cap is ${level.maxNewWords}.`,
      value: `${stats.newWords.length} of ${level.maxNewWords}`,
      ok: stats.newWords.length <= level.maxNewWords,
    },
    {
      name: 'Each new word repeats',
      why: `Minimum ${level.minRepeatsPerNewWord} times, so it gets learned rather than met once.`,
      value: stats.newWords.length ? `lowest ×${worstRepeat}` : '—',
      ok: stats.underRepeatedNewWords.length === 0,
    },
    {
      name: 'Refrains word for word',
      why: `${level.refrainCount} refrain${level.refrainCount > 1 ? 's' : ''} × ${level.refrainRepeats}, unchanged.`,
      value: refrains.length ? refrains.map(([, c]) => `×${c}`).join(' · ') : '—',
      ok: refrains.every(([, c]) => c >= level.refrainRepeats),
    },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-[18px] bg-page px-7 pb-6 pt-2">
        <header className="flex items-center justify-between gap-4 border-b border-[#F0E8D6] py-5">
          <div>
            <h2 className="text-lg font-semibold">Level check</h2>
            <p className="text-sm text-muted">
              {level.label}
              {attempts
                ? report.ok
                  ? ` · passed on attempt ${attempts}`
                  : ` · ${attempts} attempt${attempts > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
          <span
            className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-4 py-2.5 ${report.ok ? 'border-[#A9CFB8] bg-[#E4F1E8]' : 'border-[#E7A9A5] bg-[#FBE3E1]'}`}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-full font-bold text-white ${report.ok ? 'bg-leaf' : 'bg-[#8E2B25]'}`}
            >
              {report.ok ? '✓' : '!'}
            </span>
            <span className="text-sm font-bold">
              {report.ok ? 'Every check passed' : 'Saved, but it missed'}
            </span>
          </span>
        </header>

        <ul>
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-4 border-b border-[#F0E8D6] py-4">
              <span
                className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-sm font-bold text-white ${r.ok ? 'bg-leaf' : 'bg-gold-deep'}`}
              >
                {r.ok ? '✓' : '!'}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{r.name}</span>
                <span className="mt-0.5 block text-sm text-muted">{r.why}</span>
              </span>
              <span className="min-w-[120px] text-right font-reading text-[15px] font-bold text-sea">
                {r.value}
              </span>
            </li>
          ))}
        </ul>

        {!report.ok && (
          <div className="mt-5 rounded-xl border-[1.5px] border-[#E7A9A5] bg-[#FBE3E1] p-4">
            <h3 className="font-semibold">What did not pass</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
              {report.issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="pt-4 text-sm leading-relaxed text-muted">
          Books that never fully pass are still saved — labelled, never hidden — so you can decide
          for yourself.
        </p>
      </div>

      <div className="grid content-start gap-5">
        {stats.newWords.length > 0 && (
          <div className="rounded-[18px] bg-page p-6">
            <h3 className="font-semibold">New words in this book</h3>
            <p className="mb-4 mt-1 text-sm text-muted">
              Each has to repeat at least {level.minRepeatsPerNewWord} times. Met once is not
              learned.
            </p>
            <ul className="grid gap-2.5">
              {stats.newWords.map(({ word, count }) => {
                const thin = count < level.minRepeatsPerNewWord;
                return (
                  <li key={word} className="flex items-center gap-3">
                    <span className="flex-1 font-reading text-[15px]">{word}</span>
                    <span
                      className={`h-2 rounded-full ${thin ? 'bg-[#D98B84]' : 'bg-gold'}`}
                      style={{ width: `${16 + (count / maxCount) * 90}px` }}
                    />
                    <span className="w-11 text-right text-xs text-muted">×{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {up && (
          <div className="rounded-[18px] bg-ink p-6 text-page">
            <h3 className="font-semibold">Ready to move up?</h3>
            <p className="mb-4 mt-2 text-sm leading-relaxed text-page/70">
              Move this same story to <strong className="text-gold">{up.label}</strong> — same hero,
              same ending, longer sentences.
            </p>
            <button
              type="button"
              onClick={onRelevel}
              className="rounded-[10px] bg-gold px-5 py-3 text-sm font-semibold text-ink"
            >
              Re-level this book
            </button>
            <p className="mt-3 text-xs text-page/50">The original is kept.</p>
          </div>
        )}
      </div>
    </section>
  );
}
