import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { BookSchema } from '@/lib/schema';
import { relevelBook } from '@/lib/text/relevel';

const Body = z.object({
  to: z.enum(['starting', 'building', 'growing', 'flying']),
  /** Keep the original as well, rather than replacing it. Default yes — she
   *  may still want the version she already knows. */
  keepOriginal: z.boolean().default(true),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const body = Body.parse(await request.json());

  const row = await db.book.findFirst({
    where: { id, child: { ownerId: user.id } },
    include: { child: true },
  });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const original = BookSchema.parse(JSON.parse(row.content));
  const { book, report, attempts, degraded } = await relevelBook(original, body.to, row.child.name);

  if (!body.keepOriginal) {
    await db.book.update({
      where: { id },
      data: {
        levelId: body.to,
        content: JSON.stringify(book),
        report: JSON.stringify(report),
        attempts,
        degraded,
      },
    });
    return NextResponse.json({ id, book, report, replaced: true });
  }

  const saved = await db.book.create({
    data: {
      childId: row.childId,
      title: book.title,
      subtitle: book.subtitle,
      levelId: body.to,
      setting: book.setting,
      content: JSON.stringify(book),
      report: JSON.stringify(report),
      attempts,
      degraded,
    },
  });
  return NextResponse.json({ id: saved.id, book, report, replaced: false }, { status: 201 });
}
