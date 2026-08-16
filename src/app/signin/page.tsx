'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <div className="rounded-2xl bg-page p-8">
        <h1 className="text-3xl font-extrabold">Sign in</h1>
        {sent ? (
          <p className="mt-4 text-lg">
            Check your email — there is a link waiting. No password to forget.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
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
              className="w-full rounded-xl border-4 border-[#D8C395] px-4 py-3 text-lg"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gold px-6 py-4 text-lg font-bold text-[#3A2A05]"
            >
              Email me a link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
