'use client';

/**
 * Create, in two taps.
 *
 * The adult is often doing this at 8pm with the child already asking for a
 * story. So the default path is: pick the child, pick a story idea, go.
 * Everything else — level override, extra cast, a custom outline — is real,
 * but folded away behind "Fine-tune this book" so it never taxes the fast path.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, LEVEL_ORDER, type LevelId } from '@/lib/levels';

export interface ChildOption {
  id: string;
  name: string;
  levelId: LevelId;
  interests?: string[];
  avoid?: string[];
}

interface Idea {
  tag: string;
  title: string;
  body: string;
  setting: string;
  outline: (name: string) => string;
}

/** She always solves it. None of these ideas has her rescued. */
const IDEAS: Idea[] = [
  {
    tag: '★',
    title: 'The loud dog at the park',
    body: 'Something is noisy and she is the one who works out why.',
    setting: 'the park',
    outline: (n) => `${n} meets a very loud dog at the park. She is not scared, and she works out that the dog just wants someone to play ball with her.`,
  },
  {
    tag: '☾',
    title: 'The night the lights went out',
    body: 'The house goes dark. She finds the torch and leads the way.',
    setting: 'home at night',
    outline: (n) => `The lights go out at home. ${n} finds the torch, checks each room and leads everyone to the kitchen for candles.`,
  },
  {
    tag: '✦',
    title: 'The lost red bag',
    body: 'Her favourite thing goes missing. She retraces every step.',
    setting: 'school and the walk home',
    outline: (n) => `${n}'s red bag goes missing. She retraces her day step by step and finds it herself.`,
  },
  {
    tag: '♪',
    title: 'The band with no drummer',
    body: 'The class band is stuck until she keeps the beat.',
    setting: 'the school hall',
    outline: (n) => `The class band cannot start because nobody can keep time. ${n} takes the drum and holds the beat for everyone.`,
  },
  {
    tag: '⛅',
    title: 'Rain on sports day',
    body: 'The race is off. She invents an indoor one instead.',
    setting: 'the school gym on a rainy day',
    outline: (n) => `Sports day is rained off. ${n} invents an indoor race and gets the whole class playing.`,
  },
];

const STAGES = [
  'Writing the story…',
  'Measuring every sentence…',
  'Checking the sight words…',
  'Repairing the pages that missed…',
  'Checking the refrains…',
];

export function BookForm({ children }: { children: ChildOption[] }) {
  const router = useRouter();
  const [childId, setChildId] = useState(children[0]?.id ?? '');
  const child = children.find((c) => c.id === childId);
  const [levelId, setLevelId] = useState<LevelId>(child?.levelId ?? 'building');
  const [pick, setPick] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [setting, setSetting] = useState('');
  const [extraCast, setExtraCast] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const name = child?.name ?? '';
  const idea = pick === null ? null : IDEAS[pick];
  const outline = custom.trim() || (idea ? idea.outline(name) : '');
  const place = setting.trim() || idea?.setting || 'home';
  const ready = Boolean(childId && outline);

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setStage(0);
    timer.current = setInterval(
      () => setStage((s) => Math.min(STAGES.length - 1, s + 1)),
      2500,
    );
    try {
      const characters = [
        { name, role: 'hero' as const, appearance: '' },
        ...extraCast
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((n) => ({ name: n, role: 'friend' as const, appearance: '' })),
      ];
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          childId,
          levelId,
          outline,
          setting: place,
          characters: characters.map((c) => ({
            ...c,
            appearance: c.appearance || `${c.name}, a friendly ${c.role}`,
            palette: { primary: '#155E86', secondary: '#1E7A4B', skin: '#F6C9A4', hair: '#4E3220' },
          })),
          interests: child?.interests ?? [],
          avoid: child?.avoid ?? [],
          illustrate: false,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const { id } = await response.json();
      router.push(`/books/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  }

  return (
    <div className="pb-40">
      <p className="text-sm font-semibold uppercase tracking-[.06em] text-gold-deep">New book</p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
        Two taps and she&rsquo;s the hero.
      </h1>

      <Step n={1} title="Who is it for?" />
      <div className="mb-10 flex flex-wrap gap-3">
        {children.map((c) => {
          const on = c.id === childId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { setChildId(c.id); setLevelId(c.levelId); }}
              className={`flex min-w-[250px] items-center gap-4 rounded-2xl border-2 p-4 text-left ${on ? 'border-sea bg-page' : 'border-line bg-transparent'}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-parchment text-lg font-bold text-gold-deep">
                {c.name.slice(0, 1)}
              </span>
              <span>
                <span className="block text-[17px] font-semibold">{c.name}</span>
                <span className="block text-sm text-muted">{LEVELS[c.levelId].label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Step n={2} title="What happens in it?" />
      <p className="mb-4 ml-[38px] text-[15px] text-muted">
        {name ? `Built from what ${name} loves. She solves it — she is never the one who gets rescued.` : 'She solves it — never the one who gets rescued.'}
      </p>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {IDEAS.map((it, i) => {
          const on = pick === i;
          return (
            <button
              key={it.title}
              type="button"
              onClick={() => setPick(i)}
              className={`flex min-h-[150px] flex-col gap-2.5 rounded-2xl border-2 p-5 text-left ${on ? 'border-sea bg-page' : 'border-line bg-page/60'}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-parchment font-bold text-gold-deep">
                {it.tag}
              </span>
              <span className="text-[16.5px] font-semibold leading-snug">{it.title}</span>
              <span className="text-sm leading-relaxed text-slate">{it.body}</span>
            </button>
          );
        })}
      </div>

      <details className="mt-5 rounded-2xl bg-page p-6">
        <summary className="flex items-center justify-between gap-4 font-semibold">
          <span>Fine-tune this book</span>
          <span className="text-sm font-normal text-muted">
            Level, your own idea, who else is in it — optional
          </span>
        </summary>

        <div className="grid gap-6 pt-6 md:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Reading level for this book</legend>
            <div className="grid gap-2">
              {LEVEL_ORDER.map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] px-4 py-3 ${levelId === id ? 'border-gold bg-[#FDF6E6]' : 'border-line'}`}
                >
                  <input
                    type="radio"
                    name="level"
                    checked={levelId === id}
                    onChange={() => setLevelId(id)}
                    className="h-4 w-4 accent-gold-deep"
                  />
                  <span className="text-sm font-semibold">{LEVELS[id].label}</span>
                  <span className="ml-auto font-reading text-xs text-muted">
                    {LEVELS[id].minWords}–{LEVELS[id].maxWords} words
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid content-start gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Or write your own idea</span>
              <textarea
                rows={3}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`A pirate story where ${name || 'she'} finds the treasure first.`}
                className="w-full rounded-xl border-[1.5px] border-line bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Where it happens</span>
              <input
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder={idea?.setting ?? 'a pirate island'}
                className="w-full rounded-xl border-[1.5px] border-line bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Who else is in it</span>
              <input
                value={extraCast}
                onChange={(e) => setExtraCast(e.target.value)}
                placeholder="Ava, Grandad"
                className="w-full rounded-xl border-[1.5px] border-line bg-white px-4 py-3"
              />
              <span className="mt-1.5 block text-xs text-muted">
                Names, separated by commas. Their looks are set once on the child&rsquo;s profile.
              </span>
            </label>
          </div>
        </div>
      </details>

      {error && (
        <p className="mt-5 rounded-xl border-[1.5px] border-[#E7A9A5] bg-[#FBE3E1] p-4 text-sm">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-5">
          <p className="text-sm text-slate">
            {ready
              ? `${LEVELS[levelId].label} · ${LEVELS[levelId].pages} pages${idea ? ` · ${idea.title}` : ''}`
              : 'Pick a story idea to continue'}
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!ready || busy}
            className="ml-auto rounded-xl bg-sea px-7 py-3.5 text-base font-semibold text-page disabled:bg-[#9DAAB8]"
          >
            {/* "Make Maya's book" with a child picked, "Make the book" without. */}
            {busy ? 'Writing…' : name ? `Make ${name}’s book` : 'Make the book'}
          </button>
        </div>
        {busy && (
          <div className="mx-auto mt-3.5 max-w-4xl">
            <div className="h-1.5 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full bg-gold transition-all duration-500"
                style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">{STAGES[stage]}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3.5 mt-9 flex items-baseline gap-3">
      <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-ink text-sm font-bold text-page">
        {n}
      </span>
      <h2 className="text-[19px] font-semibold">{title}</h2>
    </div>
  );
}
