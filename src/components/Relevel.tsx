'use client';

/**
 * "Same story, different level."
 *
 * Worth its own control rather than hiding in a menu: the situation it solves
 * — a book she loves that has become too easy, or one pitched too low from the
 * start — is one of the most common reasons a book stops getting read, and
 * "make a new one" throws away the thing she is attached to.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, LEVEL_ORDER, type LevelId } from '@/lib/levels';

export function Relevel({ bookId, current }: { bookId: string; current: LevelId }) {
  const router = useRouter();
  const [to, setTo] = useState<LevelId>(current);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl bg-page p-5 text-ink">
      <h2 className="text-xl font-bold">Same story, different level</h2>
      <p className="mt-1 text-sm text-ink/70">
        The characters, the places and the shape of the story stay exactly as they
        are — page seven is still page seven. Only the sentences are rewritten, and
        the new version goes through the same level check as any other book.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={to}
          onChange={(e) => setTo(e.target.value as LevelId)}
          className="min-w-[220px] flex-1 rounded-xl border-4 border-[#D8C395] px-3 py-3 text-lg"
        >
          {LEVEL_ORDER.map((id) => (
            <option key={id} value={id}>
              {LEVELS[id].label}
              {id === current ? ' (current)' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy || to === current}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const response = await fetch(`/api/books/${bookId}/relevel`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ to, keepOriginal }),
              });
              if (!response.ok) throw new Error(await response.text());
              const { id } = await response.json();
              router.push(`/books/${id}`);
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="min-h-[56px] rounded-xl bg-gold px-6 font-bold text-[#3A2A05] disabled:opacity-40"
        >
          {busy ? 'Rewriting…' : 'Rewrite at this level'}
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={keepOriginal}
          onChange={(e) => setKeepOriginal(e.target.checked)}
          className="h-5 w-5"
        />
        Keep the original too — she may still want the version she already knows
      </label>

      {error && (
        <p className="mt-3 rounded-xl border-4 border-[#E7A9A5] bg-[#FBE3E1] p-3 text-sm">{error}</p>
      )}
    </section>
  );
}
