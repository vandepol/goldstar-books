'use client';

/**
 * Set up a reader profile — the step that was missing between "sign in" and
 * "make her first book". A brand-new account has no children, and without
 * this form the create page was a dead end.
 *
 * The level question is the honest self-assessment from the levels
 * themselves: described by what she reads today, never by age or grade.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, LEVEL_ORDER, type LevelId } from '@/lib/levels';

/** The look-picker. What she picks here becomes the frozen appearance block
 *  pasted into every illustration prompt, so the hero looks the same on every
 *  page of every book — the single biggest lever on picture continuity. */
const SKINS = [
  ['#F5D6B8', 'fair'], ['#F0C8A0', 'light'], ['#E0B08A', 'tan'],
  ['#C68863', 'light brown'], ['#8D5B3F', 'brown'], ['#5C3A21', 'deep brown'],
] as const;
const HAIRS = [
  ['#1E1611', 'dark brown'], ['#4A3520', 'brown'], ['#B5471D', 'red'],
  ['#D9A441', 'blond'], ['#707A85', 'grey'], ['#141210', 'black'],
] as const;
const SHIRTS = [
  ['#F2B33D', 'gold'], ['#155E86', 'blue'], ['#1E7A4B', 'green'], ['#D66BA0', 'pink'],
  ['#C0392B', 'red'], ['#6B4FA0', 'purple'], ['#2A9D8F', 'teal'], ['#D97B29', 'orange'],
] as const;

function Swatches({
  options, value, onPick, label,
}: {
  options: readonly (readonly [string, string])[];
  value: string;
  onPick: (hex: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-28 text-sm text-muted">{label}</span>
      {options.map(([hex, word]) => (
        <button
          key={hex}
          type="button"
          title={word}
          onClick={() => onPick(hex)}
          className="h-9 w-9 rounded-full border-[2.5px]"
          style={{ background: hex, borderColor: value === hex ? '#16283D' : 'transparent' }}
        />
      ))}
    </div>
  );
}

export function NewReader({ first, onDone }: { first?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [levelId, setLevelId] = useState<LevelId | null>(null);
  const [interests, setInterests] = useState('');
  const [avoid, setAvoid] = useState('');
  const [skin, setSkin] = useState<string>(SKINS[2][0]);
  const [hair, setHair] = useState<string>(HAIRS[0][0]);
  const [shirt, setShirt] = useState<string>(SHIRTS[0][0]);
  const [look, setLook] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelId) {
      setError('Pick the description that sounds most like her right now.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          levelId,
          interests: interests.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8),
          avoid: avoid.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
          appearance: [
            `${name.trim()}, a young child with ${SKINS.find(([h]) => h === skin)?.[1]} skin and ${HAIRS.find(([h]) => h === hair)?.[1]} hair`,
            look.trim(),
            `wearing a ${SHIRTS.find(([h]) => h === shirt)?.[1]} top`,
            'this exact look on every page',
          ].filter(Boolean).join(', '),
          palette: { primary: shirt, secondary: '#155E86', skin, hair },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-[18px] bg-page px-7 py-6">
      <h2 className="text-lg font-semibold">
        {first ? 'First, set up her reader profile' : 'New reader'}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Every book she gets is written to this level, and moving up later is one tap.
      </p>

      <label className="mt-5 block text-sm font-semibold">
        Her first name
        <input
          type="text"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maya"
          className="mt-2 block w-full max-w-sm rounded-xl border-[1.5px] border-[#C9BDA3] bg-white px-4 py-3 text-lg font-normal outline-none focus:border-sea"
        />
      </label>

      <p className="mb-2 mt-6 text-sm font-semibold">Which sounds most like her right now?</p>
      <p className="mb-3 text-xs text-muted">
        Her age never sets the level — what she reads today does.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {LEVEL_ORDER.map((id) => {
          const l = LEVELS[id];
          const on = id === levelId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setLevelId(id)}
              className={`rounded-[14px] border-[1.5px] p-4 text-left ${on ? 'border-sea bg-white shadow-[0_0_0_1.5px_#155E86]' : 'border-line bg-white'}`}
            >
              <span className="block font-semibold">{l.label}</span>
              <span className="block font-reading text-[11.5px] text-gold-deep">
                {l.minWords}–{l.maxWords} words a page
              </span>
              <span className="mt-1 block text-sm text-muted">{l.description}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-6 text-sm font-semibold">How she looks</p>
      <p className="mb-3 text-xs text-muted">
        This becomes her frozen look — the pictures draw this exact child on every page of every
        book, so get it right once and it sticks.
      </p>
      <div className="space-y-2.5">
        <Swatches options={SKINS} value={skin} onPick={setSkin} label="Skin" />
        <Swatches options={HAIRS} value={hair} onPick={setHair} label="Hair" />
        <Swatches options={SHIRTS} value={shirt} onPick={setShirt} label="Favourite colour" />
      </div>
      <label className="mt-4 block text-sm font-semibold">
        Anything else about her look <span className="font-normal text-muted">(optional — pigtails, glasses, a red bandana…)</span>
        <input
          type="text"
          maxLength={200}
          value={look}
          onChange={(e) => setLook(e.target.value)}
          placeholder="brown pigtails and a red bandana"
          className="mt-2 block w-full max-w-md rounded-xl border-[1.5px] border-[#C9BDA3] bg-white px-4 py-3 font-normal outline-none focus:border-sea"
        />
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Things she loves <span className="font-normal text-muted">(commas)</span>
          <input
            type="text"
            maxLength={200}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="dogs, swimming, her sister"
            className="mt-2 block w-full rounded-xl border-[1.5px] border-[#C9BDA3] bg-white px-4 py-3 font-normal outline-none focus:border-sea"
          />
        </label>
        <label className="block text-sm font-semibold">
          Keep out of her books <span className="font-normal text-muted">(commas, optional)</span>
          <input
            type="text"
            maxLength={200}
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="thunder, needles"
            className="mt-2 block w-full rounded-xl border-[1.5px] border-[#C9BDA3] bg-white px-4 py-3 font-normal outline-none focus:border-sea"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 rounded-xl bg-sea px-7 py-3.5 font-semibold text-page disabled:opacity-60"
      >
        {busy ? 'Saving…' : name.trim() ? `Add ${name.trim()}` : 'Add her'}
      </button>
      {error && (
        <p className="mt-3 rounded-xl border-[1.5px] border-[#E7A9A5] bg-[#FBE3E1] p-3 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
