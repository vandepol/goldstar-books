'use client';

/**
 * What a grandparent, teacher or therapist lands on. No account, no install.
 * The one commercial surface in the product: a hardcover of a book that
 * already landed, with the cost split stated plainly — for this audience the
 * margin going to the association is a reason to buy, not a disclosure.
 */

import { useState } from 'react';
import type { Book } from '@/lib/schema';
import { CREDIT } from '@/lib/credit';
import { Reader } from './Reader';

const PRINT = { price: 29, cost: 18 };

export function ShareView({
  book,
  sharedBy,
  printEnabled = true,
}: {
  book: Book;
  sharedBy?: string;
  printEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <main className="px-4 py-6">
        <Reader book={book} variant="spread" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="text-center">
        <p className="text-sm text-muted">
          {sharedBy ? `${sharedBy} shared a book with you` : 'A book has been shared with you'}
        </p>
        <h1 className="mt-2.5 font-display text-4xl font-medium">{book.title}</h1>
      </div>

      <div className="mt-8 grid items-center gap-8 rounded-[22px] bg-page p-8 md:grid-cols-2">
        <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-[#C9BDA3] bg-parchment p-5 text-center text-sm text-[#94836A]">
          Cover illustration
        </div>
        <div>
          <p className="leading-relaxed text-slate">
            Read-only. Nothing to install, nothing to sign up for — open it and turn the pages with
            her. She reads it herself; the voice only speaks when she asks.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 rounded-xl bg-sea px-7 py-4 font-semibold text-page"
          >
            Open the book
          </button>
          <p className="mt-3.5 text-sm text-[#94836A]">{book.pages.length} pages</p>
        </div>
      </div>

      {printEnabled && (
        <div className="mt-5 flex flex-wrap items-center gap-7 rounded-[22px] bg-ink p-8 text-page">
          <div className="min-w-[340px] flex-1">
            <h2 className="font-display text-2xl font-medium">Send her the real thing</h2>
            <p className="mt-2.5 leading-relaxed text-page/70">
              A hardcover with her name on the front is a different object to a screen. Printed and
              shipped in Canada; every dollar above cost goes to {CREDIT.org}.
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-3xl font-bold">${PRINT.price}</p>
              <p className="text-xs text-page/55">
                ${PRINT.cost} cost · ${PRINT.price - PRINT.cost} to the charity
              </p>
            </div>
            <button type="button" className="rounded-xl bg-gold px-6 py-4 font-semibold text-ink">
              Order a hardcover
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-[18px] bg-page p-7">
        <p className="min-w-[340px] flex-1 leading-relaxed text-slate">
          Books like this one are free for every family, forever. Making one for your own reader
          takes two minutes.
        </p>
        <div className="flex gap-2.5">
          <a href="/create" className="rounded-[10px] bg-sea px-5 py-3.5 font-semibold text-page">
            Make one for my reader
          </a>
          <a
            href={CREDIT.donateUrl}
            className="rounded-[10px] border-[1.5px] border-[#C9BDA3] px-5 py-3.5 font-semibold"
          >
            Donate
          </a>
        </div>
      </div>
    </main>
  );
}
