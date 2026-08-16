import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { LEVELS, nextLevel, type LevelId } from '@/lib/levels';

// Shapes of the two queries below. Written out rather than inferred so this
// file typechecks before `prisma generate` has ever run — a fresh clone should
// not fail to compile just because nobody has touched the database yet.
type BookRow = { id: string; title: string; degraded: boolean };
type ChildRow = {
  id: string;
  name: string;
  levelId: string;
  books: BookRow[];
  _count: { books: number };
};

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const children = await db.child.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      books: { orderBy: { createdAt: 'desc' }, take: 6 },
      _count: { select: { books: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-page">Library</h1>
        <Link href="/create" className="rounded-xl bg-gold px-5 py-3 font-bold text-[#3A2A05]">
          New book
        </Link>
      </div>

      {children.length === 0 && (
        <p className="rounded-2xl bg-page p-6 text-lg">
          No reader set up yet. Add one and every book will be written to her level.
        </p>
      )}

      {(children as ChildRow[]).map((child) => {
        const level = LEVELS[child.levelId as LevelId];
        const up = nextLevel(child.levelId as LevelId);
        return (
          <section key={child.id} className="rounded-2xl bg-page p-6">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-bold">{child.name}</h2>
              <span className="text-sm font-bold text-ink/60">
                {level?.label} · {child._count.books} book
                {child._count.books === 1 ? '' : 's'}
              </span>
            </header>

            {child._count.books >= 5 && up && (
              <p className="mt-2 rounded-xl bg-[#FFF6E0] p-3 text-sm">
                {child.name} has read {child._count.books} books at this level. If
                they are going smoothly, try <b>{up.label}</b> next — {up.description}
              </p>
            )}

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {child.books.map((book: BookRow) => (
                <li key={book.id}>
                  <Link
                    href={`/books/${book.id}`}
                    className="block rounded-xl border-4 border-[#E0CFA6] bg-white p-4 hover:border-gold"
                  >
                    <span className="block text-lg font-bold">{book.title}</span>
                    {book.degraded && (
                      <span className="text-xs font-bold text-[#B3350F]">
                        Did not fully pass the level check
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
