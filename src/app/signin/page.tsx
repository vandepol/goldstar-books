'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

/**
 * Email-link sign-in when an email server is configured; direct sign-in when
 * it is not (local mode — see /api/dev-login). The page asks which mode it is
 * in, so a machine without SMTP never gate-blocks its own owner.
 */
export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/dev-login')
      .then((r) => r.json())
      .then((d) => setLocalMode(!!d.enabled))
      .catch(() => setLocalMode(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (localMode) {
        const res = await fetch('/api/dev-login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Sign-in failed');
        router.push('/dashboard');
        router.refresh();
        return;
      }
      await signIn('nodemailer', { email, redirect: false });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
              {localMode === null
                ? '…'
                : localMode
                  ? 'This machine has no email server set up, so sign-in is direct — just your email, no link to wait for.'
                  : 'One email, one link. Nothing to remember.'}
            </p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
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
                disabled={busy || localMode === null}
                className="w-full rounded-xl bg-sea px-6 py-4 text-lg font-semibold text-page disabled:opacity-60"
              >
                {busy ? 'Signing in…' : localMode ? 'Sign in' : 'Email me a link'}
              </button>
              {error && (
                <p className="rounded-xl border-[1.5px] border-[#E7A9A5] bg-[#FBE3E1] p-3 text-sm">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
