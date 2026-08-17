/**
 * No-email local mode.
 *
 * Magic-link sign-in needs an SMTP server, and a machine without one (local
 * dev, a laptop demo, a self-hosted trial) would otherwise be locked out of
 * its own app. When EMAIL_SERVER is not configured, this route signs an email
 * address straight in: it upserts the user and mints the same database
 * Session row NextAuth's adapter uses, so everything downstream — auth(),
 * requireUser, ownership checks — behaves identically to a link sign-in.
 *
 * The moment EMAIL_SERVER is configured this route disables itself and the
 * sign-in page goes back to the email link. Configure EMAIL_SERVER in
 * production; this exists so the login gate never blocks the machine's owner.
 */

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const enabled = () => !process.env.EMAIL_SERVER;

/** The sign-in page asks which mode to render. */
export async function GET() {
  return NextResponse.json({ enabled: enabled() });
}

export async function POST(request: Request) {
  if (!enabled()) {
    return NextResponse.json({ error: 'Disabled: EMAIL_SERVER is configured' }, { status: 404 });
  }
  const { email } = (await request.json()) as { email?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, emailVerified: new Date() },
  });

  const sessionToken = randomBytes(32).toString('hex');
  await db.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('authjs.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
