/**
 * Auth: magic-link email sign-in only.
 *
 * No passwords on purpose. The account holder is a parent or a teacher, often
 * signing in from a school device, and a forgotten password is the most common
 * reason an adult abandons a tool like this. Email link, done.
 */
import NextAuth from 'next-auth';
import Email from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Email({
      server: process.env.EMAIL_SERVER || { host: 'localhost', port: 25 },
      from: process.env.EMAIL_FROM || 'Gold Star Books <dev@localhost>',
      // With no real EMAIL_SERVER configured (local dev, usually), the
      // magic link prints to the server console instead of being emailed —
      // sign-in works without SMTP. Configure EMAIL_SERVER in production.
      ...(process.env.EMAIL_SERVER
        ? {}
        : {
            async sendVerificationRequest({ identifier, url }) {
              console.log(
                `\n✉  EMAIL_SERVER is not set — magic link for ${identifier}:\n   ${url}\n`,
              );
            },
          }),
    }),
  ],
  pages: { signIn: '/signin' },
  session: { strategy: 'database' },
});

/** Throw-if-signed-out helper for route handlers. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('UNAUTHORISED');
  return session.user as { id: string; email: string; name?: string | null };
}
