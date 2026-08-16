import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BookSchema } from '@/lib/schema';
import { ShareView } from '@/components/ShareView';

/** Read-only view for a teacher, therapist or grandparent. No account needed. */
export default async function SharedBook({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await db.book.findUnique({
    where: { shareToken: token },
    include: { child: { include: { owner: true } } },
  });
  if (!row) notFound();

  const book = BookSchema.parse(JSON.parse(row.content));
  return <ShareView book={book} sharedBy={row.child.owner.name ?? undefined} />;
}
