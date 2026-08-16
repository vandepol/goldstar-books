import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BookSchema } from '@/lib/schema';
import { BookView } from '@/components/BookView';
import type { BookReport } from '@/lib/validate';
import type { LevelId } from '@/lib/levels';

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const { id } = await params;
  const row = await db.book.findFirst({
    where: { id, child: { ownerId: session.user.id } },
  });
  if (!row) notFound();

  const book = BookSchema.parse(JSON.parse(row.content));
  const report: BookReport | null = row.report ? JSON.parse(row.report) : null;

  // The level check is a two-column section now, so this gets the full content
  // width rather than the narrow reading measure the reader alone wanted.
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <BookView
        book={book}
        bookId={row.id}
        levelId={row.levelId as LevelId}
        report={report}
        attempts={row.attempts}
        shareToken={row.shareToken}
      />
    </main>
  );
}
