'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <div className="rounded-[18px] bg-page px-8 pb-8 pt-7">
        <h1 className="font-display text-3xl font-medium">Sign in</h1>
        {sent ? (
          <p className="mt-4 text-lg leading-relaxed">
            Check your email — there is a link waiting. No password to forget.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              One email, one link. Nothing to remember.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                await signIn('nodemailer', { email, redirect: false });
                setSent(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border-[1.5px] border-[#C9BDA3] bg-white px-4 py-3.5 text-lg outline-none focus:border-sea"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-sea px-6 py-4 text-lg font-semibold text-page disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Email me a link'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
