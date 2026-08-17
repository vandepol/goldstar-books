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

export function NewReader({ first, onDone }: { first?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [levelId, setLevelId] = useState<LevelId | null>(null);
  const [interests, setInterests] = useState('');
  const [avoid, setAvoid] = useState('');
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
