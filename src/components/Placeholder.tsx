/**
 * Illustration slot.
 *
 * The picture is load-bearing for comprehension, and a book that is all text
 * on white reads as a worksheet. Until a paid art provider (or a human
 * illustrator) is wired in, every page gets a real generated scene from
 * `src/lib/art/svg.ts`: flat, calm, deterministic, drawn from the page's mood,
 * the book's setting and each character's frozen palette — so the hero looks
 * the same on every page. A book with real `imageUrl`s uses them untouched.
 */
import type { Book } from '@/lib/schema';
import { sceneSvg } from '@/lib/art/svg';

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'quiz' }
  | { kind: 'wall' }
  | { kind: 'star' }
  | { kind: 'credit' };

export function Placeholder({ book, screen }: { book: Book; screen: Screen }) {
  const page = screen.kind === 'page' ? book.pages[screen.index] : null;
  const url = page?.illustration.imageUrl;

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={page.illustration.action} className="aspect-[16/10] w-full object-cover" />;
  }

  return (
    <div
      className="aspect-[16/10] w-full [&>svg]:h-full [&>svg]:w-full"
      // The SVG is generated locally from the book's own data — no user HTML.
      dangerouslySetInnerHTML={{ __html: sceneSvg(book, screen) }}
    />
  );
}
