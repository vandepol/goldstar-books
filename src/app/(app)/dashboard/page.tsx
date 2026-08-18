import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BookSchema } from '@/lib/schema';
import { sceneSvg } from '@/lib/art/svg';
import { coverArtUrl } from '@/lib/art/manifest';
import { LEVELS, nextLevel, type LevelId } from '@/lib/levels';

// Shapes of the two queries below. Written out rather than inferred so this
// file typechecks before `prisma generate` has ever run — a fresh clone should
// not fail to compile just because nobody has touched the database yet.
type BookRow = { id: string; title: string; degraded: boolean; content: string };
type ChildRow = {
  id: string;
  name: string;
  levelId: string;
  books: BookRow[];
  _count: { books: number };
};

/** A book card's cover: baked AI art when it exists, the drawn scene otherwise. */
function Cover({ content }: { content: string }) {
  try {
    const book = BookSchema.parse(JSON.parse(content));
    const art = coverArtUrl(book.id) ?? book.pages[0]?.illustration.imageUrl ?? null;
    if (art) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={art} alt="" className="aspect-[16/10] w-full rounded-t-[14px] object-cover" />;
    }
    return (
      <div
        className="aspect-[16/10] w-full overflow-hidden rounded-t-[14px] [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: sceneSvg(book, { kind: 'cover' }) }}
      />
    );
  } catch {
    return <div className="aspect-[16/10] w-full rounded-t-[14px] bg-parchment" />;
  }
}

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
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-medium">Library</h1>
        <Link
          href="/create"
          className="rounded-xl bg-sea px-6 py-3.5 font-semibold text-page"
        >
          New book
        </Link>
      </div>

      {children.length === 0 && (
        <div className="rounded-[18px] bg-page px-7 py-6">
          <p className="text-lg">
            No reader set up yet. Add one and every book will be written to her level.
          </p>
          <Link
            href="/create"
            className="mt-4 inline-block rounded-xl bg-gold px-5 py-3 font-semibold text-ink"
          >
            Make the first book
          </Link>
        </div>
      )}

      {(children as ChildRow[]).map((child) => {
        const level = LEVELS[child.levelId as LevelId];
        const up = nextLevel(child.levelId as LevelId);
        return (
          <section key={child.id} className="rounded-[18px] bg-page px-7 pb-7 pt-2">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#F0E8D6] py-5">
              <h2 className="text-2xl font-semibold">{child.name}</h2>
              <span className="text-sm text-muted">
                {level?.label} · {child._count.books} book
                {child._count.books === 1 ? '' : 's'}
              </span>
            </header>

            {child._count.books >= 5 && up && (
              <p className="mt-5 rounded-[14px] border-[1.5px] border-[#E8D9AE] bg-[#FFF6E0] p-4 text-sm leading-relaxed">
                {child.name} has read {child._count.books} books at this level. If
                they are going smoothly, try <b>{up.label}</b> next — {up.description}
              </p>
            )}

            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {child.books.map((book: BookRow) => (
                <li key={book.id}>
                  <Link
                    href={`/books/${book.id}`}
                    className="block overflow-hidden rounded-[14px] border border-line bg-white transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(22,40,61,.4)]"
                  >
                    <Cover content={book.content} />
                    <span className="block px-4 py-3">
                      <span className="block font-semibold">{book.title}</span>
                      {book.degraded && (
                        <span className="mt-0.5 block text-xs font-semibold text-[#8E2B25]">
                          Did not fully pass the level check
                        </span>
                      )}
                    </span>
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
