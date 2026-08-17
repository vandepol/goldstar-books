import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BookForm, type ChildOption } from '@/components/BookForm';
import { NewReader } from '@/components/NewReader';
import type { LevelId } from '@/lib/levels';

export default async function CreatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const rows = await db.child.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, levelId: true, interests: true, avoid: true },
  });

  const children: ChildOption[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    levelId: c.levelId as LevelId,
    interests: safeList(c.interests),
    avoid: safeList(c.avoid),
  }));

  // A brand-new account has no readers yet — show the setup step right here
  // instead of bouncing back to the dashboard (which read as a dead click).
  if (!children.length) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[.06em] text-gold-deep">New book</p>
        <h1 className="mb-8 mt-2 font-display text-4xl font-medium tracking-tight">
          Two taps and she&rsquo;s the hero.
        </h1>
        <NewReader first />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <BookForm children={children} />
    </main>
  );
}

function safeList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
