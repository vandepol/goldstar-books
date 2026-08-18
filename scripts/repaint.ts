/**
 * Repaint an existing book's pictures through the current art pipeline.
 *
 *   npx tsx scripts/repaint.ts <bookId>
 *
 * Refreshes the hero's appearance and palette from the child's profile first,
 * so a look fixed on the profile propagates, then re-renders every page from
 * the character sheet. Existing page files are overwritten; cost is the same
 * as illustrating the book fresh.
 */

import './env';
import { rmSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { illustrateBook } from '../src/lib/art/illustrate';
import type { Book } from '../src/lib/schema';

const db = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('usage: npx tsx scripts/repaint.ts <bookId>');
  const row = await db.book.findUniqueOrThrow({ where: { id }, include: { child: true } });
  const book = JSON.parse(row.content) as Book;

  if (row.child.appearance) book.characters[0].appearance = row.child.appearance;
  if (row.child.palette) {
    try { book.characters[0].palette = JSON.parse(row.child.palette); } catch {}
  }

  // Force a fresh sheet so a changed look actually takes.
  rmSync(join(process.cwd(), 'public', 'art', 'sheets', `${row.childId}.jpg`), { force: true });

  console.log(`Repainting "${book.title}" (${book.pages.length} pages) as ${book.characters[0].appearance}`);
  const painted = await illustrateBook(book, row.id, row.childId);
  await db.book.update({ where: { id }, data: { content: JSON.stringify(book) } });
  console.log(`Painted ${painted}/${book.pages.length} pages.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
