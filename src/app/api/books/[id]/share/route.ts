import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/** Mint (or revoke) a read-only link for a teacher, therapist or grandparent. */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const { enabled } = (await request.json()) as { enabled: boolean };

  const owned = await db.book.findFirst({ where: { id, child: { ownerId: user.id } } });
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const shareToken = enabled ? randomBytes(12).toString('base64url') : null;
  await db.book.update({ where: { id }, data: { shareToken } });
  return NextResponse.json({ shareToken });
}
