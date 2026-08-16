'use client';

/**
 * The reading surface.
 *
 * Every decision here is a reading decision, not a styling one:
 * - One page at a time, one idea per page, nothing else on screen.
 * - Large left-aligned Verdana, wide word spacing, no italics, no all-caps.
 * - Nothing is ever read aloud automatically. Audio fires only when she asks —
 *   "Read to me", or tapping a single word.
 * - Refrain pages are tagged so she can recognise a page she already owns.
 * - Wrong quiz answers say "Try again", never buzz. Errorless practice.
 *
 * Two layouts, same behaviour:
 *   variant="single" — picture over sentence, controls in a bottom bar. Phones,
 *                      tablets held upright, and anything narrow.
 *   variant="spread" — picture left, sentence right, controls under the words.
 *                      Laptops and landscape tablets; the sentence gets bigger.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from '@/lib/schema';
import { CREDIT } from '@/lib/credit';
import { Placeholder } from './Placeholder';

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'quiz' }
  | { kind: 'wall' }
  | { kind: 'star' }
  | { kind: 'credit' };

export function Reader({
  book,
  variant = 'single',
  onShare,
}: {
  book: Book;
  variant?: 'single' | 'spread';
  onShare?: () => void;
}) {
  const screens = useMemo<Screen[]>(
    () => [
      { kind: 'cover' },
      ...book.pages.map((_, index) => ({ kind: 'page', index }) as Screen),
      ...(book.quiz.length ? [{ kind: 'quiz' } as Screen] : []),
      ...(book.wordWall.length ? [{ kind: 'wall' } as Screen] : []),
      { kind: 'star' },
      // Always last, on every book. See lib/credit.ts.
      { kind: 'credit' },
    ],
    [book],
  );

  const [at, setAt] = useState(0);
  const [lit, setLit] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = ['Samantha', 'Karen', 'Moira', 'Google UK English Female'];
      voiceRef.current =
        preferred.map((n) => voices.find((v) => v.name === n)).find(Boolean) ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  const say = useCallback((text: string, rate = 0.82) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/["“”]/g, ''));
    u.rate = rate;
    u.pitch = 1.05;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const screen = screens[at];
  const go = useCallback(
    (delta: number) => {
      stop();
      setLit(null);
      setAt((prev) => Math.min(screens.length - 1, Math.max(0, prev + delta)));
    },
    [screens.length, stop],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  useEffect(() => () => { if (litTimer.current) clearTimeout(litTimer.current); }, []);

  const onWord = (word: string) => {
    setLit(word);
    say(word, 0.7);
    if (litTimer.current) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(null), 1400);
  };

  const spoken =
    screen.kind === 'cover'
      ? `${book.title}. ${book.subtitle}`
      : screen.kind === 'page'
        ? book.pages[screen.index].text
        : '';

  const storyPage = screen.kind === 'page' ? book.pages[screen.index] : null;
  const spread = variant === 'spread';

  const counter =
    screen.kind === 'page'
      ? `Page ${screen.index + 1} of ${book.pages.length}`
      : screen.kind === 'cover'
        ? 'Cover'
        : screen.kind === 'quiz'
          ? 'Questions'
          : screen.kind === 'wall'
            ? 'Word wall'
            : 'The end';

  const words = (
    <div className="flex flex-1 flex-col justify-center">
      {screen.kind === 'cover' && (
        <>
          <h1 className="font-reading text-[clamp(32px,5vw,56px)] font-bold leading-tight">
            {book.title}
          </h1>
          {book.subtitle && <p className="mt-4 text-xl text-muted">{book.subtitle}</p>}
        </>
      )}

      {storyPage && (
        <PageText text={storyPage.text} lit={lit} onWord={onWord} big={spread} />
      )}

      {screen.kind === 'quiz' && <Quiz book={book} />}

      {screen.kind === 'wall' && (
        <div>
          <p className="mb-4 text-sm font-semibold text-muted">
            Words from this book. Tap one to hear it.
          </p>
          <div className="flex flex-wrap gap-3">
            {book.wordWall.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => onWord(word)}
                className={`min-h-[64px] rounded-[14px] border-2 border-line px-5 font-reading text-[26px] ${lit === word ? 'bg-[#FDE8B8]' : 'bg-page'}`}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen.kind === 'star' && (
        <div>
          <div
            className="gs-pop mb-6 h-[104px] w-[104px] bg-gold"
            style={{
              clipPath:
                'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
            }}
          />
          <p className="font-reading text-[clamp(28px,4vw,34px)]">
            You read it{book.characters[0] ? `, ${book.characters[0].name}` : ''}!
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { stop(); setAt(0); }}
              className="rounded-xl bg-sea px-6 py-3.5 font-semibold text-page"
            >
              Read it again
            </button>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="rounded-xl border-[1.5px] border-[#C9BDA3] px-6 py-3.5 font-semibold"
              >
                Share this book
              </button>
            )}
          </div>
        </div>
      )}

      {screen.kind === 'credit' && (
        <div>
          <h2 className="font-display text-3xl font-medium">Made for you, free</h2>
          <p className="mt-3 max-w-[52ch] leading-relaxed text-slate">{CREDIT.blurb}</p>
          <p className="mt-2 max-w-[52ch] leading-relaxed text-slate">{CREDIT.ask}</p>
          <a
            href={CREDIT.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-xl bg-gold px-6 py-4 font-semibold text-ink"
          >
            Donate to {CREDIT.org}
          </a>
        </div>
      )}
    </div>
  );

  const picture = (
    <div className="relative h-full">
      {(screen.kind === 'cover' || screen.kind === 'page') && (
        <Placeholder book={book} screen={screen} />
      )}
      {storyPage?.refrain && (
        <span className="absolute left-4 top-4 rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink">
          You know this one!
        </span>
      )}
    </div>
  );

  const controls = (
    <div className="flex items-center gap-3.5">
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={at === 0}
        className="h-16 w-[84px] rounded-[14px] border-2 border-[#C9BDA3] text-xl disabled:opacity-30"
        aria-label="Previous page"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => (speaking ? stop() : spoken && say(spoken))}
        disabled={!spoken}
        className={`flex h-16 items-center gap-3 rounded-[14px] px-6 font-semibold disabled:opacity-30 ${speaking ? 'bg-ink text-page' : 'bg-gold text-ink'}`}
      >
        <Bars on={speaking} />
        {speaking ? 'Stop' : 'Read to me'}
      </button>
      {!spread && (
        <div className="flex flex-1 justify-center gap-1.5">
          {book.pages.map((_, i) => {
            const here = screen.kind === 'page' && screen.index === i;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                onClick={() => { stop(); setAt(i + 1); }}
                className={`h-2.5 rounded-full transition-all ${here ? 'w-8 bg-sea' : 'w-2.5 bg-line'}`}
              />
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => go(1)}
        disabled={at === screens.length - 1}
        className="h-16 w-[110px] rounded-[14px] bg-sea text-xl text-page disabled:opacity-30"
        aria-label="Next page"
      >
        →
      </button>
      {spread && <span className="ml-auto text-sm text-[#94836A]">{counter}</span>}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] bg-page shadow-[0_30px_60px_-40px_rgba(22,40,61,.6)]">
      <header className="flex items-center gap-3 border-b border-sand px-5 py-3">
        <p className="text-sm font-semibold text-slate">{book.title}</p>
        <p className="text-sm text-[#94836A]">{counter}</p>
        <div className="ml-auto h-1.5 w-40 overflow-hidden rounded-full bg-sand">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${(at / (screens.length - 1)) * 100}%` }}
          />
        </div>
      </header>

      {spread ? (
        <div className="grid flex-1 md:grid-cols-2">
          <div className="border-r border-sand bg-parchment/40 p-8">{picture}</div>
          <div className="flex flex-col gap-7 p-10">
            {words}
            <div className="mt-auto">{controls}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-sand bg-parchment/40 p-6">{picture}</div>
          <main className="flex flex-1 flex-col px-7 py-7">{words}</main>
          <footer className="border-t border-sand p-4">{controls}</footer>
        </>
      )}
    </div>
  );
}

function Bars({ on }: { on: boolean }) {
  return (
    <span className="flex h-5 items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-current opacity-40"
          style={{
            height: 20,
            animation: on ? `gs-pulse .8s ease-in-out ${i * 0.13}s infinite` : undefined,
          }}
        />
      ))}
    </span>
  );
}

function PageText({
  text,
  lit,
  onWord,
  big,
}: {
  text: string;
  lit: string | null;
  onWord: (word: string) => void;
  big: boolean;
}) {
  return (
    <p
      className={`font-reading leading-[1.5] tracking-wide ${big ? 'text-[clamp(32px,3.6vw,52px)]' : 'text-[clamp(28px,5vw,44px)]'}`}
      style={{ wordSpacing: '0.12em' }}
    >
      {text.split(' ').map((token, i) => {
        const bare = token.replace(/[^A-Za-z']/g, '');
        return (
          <span
            key={`${token}-${i}`}
            onClick={() => bare && onWord(bare)}
            className={`mx-0.5 inline-block cursor-pointer rounded-[10px] px-2 transition ${lit === bare ? 'bg-[#FDE8B8]' : 'hover:bg-[#FFF3C4]'}`}
          >
            {token}
          </span>
        );
      })}
    </p>
  );
}

function Quiz({ book }: { book: Book }) {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'asking' | 'right' | 'wrong'>('asking');
  const item = book.quiz[index];
  if (!item) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-muted">Let&rsquo;s think about the story</p>
      <p className="mb-6 mt-3 font-reading text-[clamp(24px,3.4vw,34px)] leading-snug">
        {item.question}
      </p>
      <div className="grid gap-3">
        {item.options.map((option, n) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              if (n === item.answerIndex) {
                setState('right');
                window.setTimeout(() => {
                  if (index < book.quiz.length - 1) {
                    setIndex(index + 1);
                    setState('asking');
                  }
                }, 1600);
              } else {
                setState('wrong');
              }
            }}
            className="min-h-[72px] rounded-2xl border-2 border-line bg-page px-5 text-left font-reading text-[26px]"
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-4 min-h-[32px] text-xl font-semibold">
        {state === 'right' && <span className="text-leaf">Yes! Well done.</span>}
        {state === 'wrong' && <span className="text-sea">Try again.</span>}
      </p>
    </div>
  );
}
