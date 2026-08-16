import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BookForm, type ChildOption } from '@/components/BookForm';
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

  if (!children.length) redirect('/dashboard');

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
