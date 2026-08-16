import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';

const CreateChild = z.object({
  name: z.string().min(1).max(40),
  levelId: z.enum(['starting', 'building', 'growing', 'flying']),
  interests: z.array(z.string().max(40)).max(8).default([]),
  avoid: z.array(z.string().max(40)).max(20).default([]),
  appearance: z.string().max(600).optional(),
});

export async function GET() {
  const user = await requireUser();
  const children = await db.child.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json({ children });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const input = CreateChild.parse(await request.json());
  const child = await db.child.create({
    data: {
      ownerId: user.id,
      name: input.name,
      levelId: input.levelId,
      interests: JSON.stringify(input.interests),
      avoid: JSON.stringify(input.avoid),
      appearance: input.appearance ?? null,
    },
  });
  return NextResponse.json({ child }, { status: 201 });
}
