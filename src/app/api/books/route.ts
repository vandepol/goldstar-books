import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { BookRequestSchema } from '@/lib/schema';
import { generateBook } from '@/lib/text/generate';
import { canIllustrate, illustrateBook } from '@/lib/art/illustrate';

export async function GET(request: Request) {
  const user = await requireUser();
  const childId = new URL(request.url).searchParams.get('childId');
  const books = await db.book.findMany({
    where: { child: { ownerId: user.id, ...(childId ? { id: childId } : {}) } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, subtitle: true, levelId: true,
      degraded: true, createdAt: true, childId: true,
    },
  });
  return NextResponse.json({ books });
}

/**
 * Generate and save. Note this returns the validator's report alongside the
 * book — the adult is shown exactly how the book measured up rather than being
 * asked to trust it, which is the difference between a tool a teacher will use
 * and a novelty.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  const input = BookRequestSchema.parse(await request.json());

  const child = await db.child.findFirst({
    where: { id: input.childId, ownerId: user.id },
  });
  if (!child) return NextResponse.json({ error: 'No such child' }, { status: 404 });

  // The child's saved interests and avoid-list always apply, on top of anything
  // typed into this particular request.
  const merged = {
    ...input,
    interests: [...new Set([...JSON.parse(child.interests), ...input.interests])] as string[],
    avoid: [...new Set([...JSON.parse(child.avoid), ...input.avoid])] as string[],
  };

  const { book, report, attempts, degraded } = await generateBook(merged, child.name);

  // Real pictures for this book, painted now so the first read has them.
  // Failures degrade to the drawn scenes; the words are never held hostage.
  if (merged.illustrate && canIllustrate()) {
    await illustrateBook(book, book.id);
  }

  const saved = await db.book.create({
    data: {
      childId: child.id,
      title: book.title,
      subtitle: book.subtitle,
      levelId: book.levelId,
      setting: book.setting,
      content: JSON.stringify(book),
      report: JSON.stringify(report),
      attempts,
      degraded,
    },
  });

  return NextResponse.json({ id: saved.id, book, report, attempts, degraded }, { status: 201 });
}
