/**
 * Illustration slot.
 *
 * Until the illustration phase lands, every page still needs *something*
 * above the words — the picture is load-bearing for comprehension, and a book
 * that is all text on white reads as a worksheet. This draws a calm, generated
 * scene keyed to the page's mood so the layout is honest about its final
 * proportions, and shows the illustration brief underneath in adult mode.
 */
import type { Book, Page } from '@/lib/schema';

const MOOD_SKY: Record<Page['illustration']['mood'], [string, string]> = {
  happy: ['#BFE6F7', '#EAF4FB'],
  excited: ['#FFD9A8', '#FFF1DC'],
  curious: ['#CFE3FA', '#EEF5FE'],
  worried: ['#B9CBD6', '#E6EDF1'],
  determined: ['#C9D9F0', '#EDF2FA'],
  proud: ['#FFE1A8', '#FFF6E4'],
  calm: ['#D8EAE0', '#F0F7F3'],
};

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'quiz' }
  | { kind: 'wall' }
  | { kind: 'credit' };

export function Placeholder({ book, screen }: { book: Book; screen: Screen }) {
  const page = screen.kind === 'page' ? book.pages[screen.index] : null;
  const mood = page?.illustration.mood ?? 'happy';
  const [top, bottom] = MOOD_SKY[mood];
  const url = page?.illustration.imageUrl;

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={page.illustration.action} className="aspect-[16/10] w-full object-cover" />;
  }

  return (
    <div
      className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 px-8 text-center"
      style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}
    >
      <span className="text-5xl" aria-hidden>
        {screen.kind === 'cover'
          ? '⭐'
          : screen.kind === 'wall'
            ? '🎉'
            : screen.kind === 'credit'
              ? '💛'
              : '🖼️'}
      </span>
      <p className="text-sm font-semibold text-ink/60">
        {page ? page.illustration.action : book.title}
      </p>
    </div>
  );
}
