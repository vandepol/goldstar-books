import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, child: { ownerId: user.id } },
  });
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    book: JSON.parse(book.content),
    report: book.report ? JSON.parse(book.report) : null,
    shareToken: book.shareToken,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const { count } = await db.book.deleteMany({
    where: { id, child: { ownerId: user.id } },
  });
  return NextResponse.json({ deleted: count }, { status: count ? 200 : 404 });
}
