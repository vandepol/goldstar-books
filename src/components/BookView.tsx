'use client';

/**
 * The owner's view of one book: the reader, its level check, and the re-level
 * control.
 *
 * This exists because the page itself is a server component — it does the auth
 * check and the database read — but the redesigned `LevelCheck` and `Reader`
 * both take callbacks (`onRelevel`, `onShare`), and a function cannot cross the
 * server/client boundary as a prop. So the interactive shell lives here and the
 * page stays a thin data loader.
 */

import { useRef, useState } from 'react';
import { Reader } from '@/components/Reader';
import { LevelCheck } from '@/components/LevelCheck';
import { Relevel } from '@/components/Relevel';
import type { Book } from '@/lib/schema';
import type { BookReport } from '@/lib/validate';
import type { LevelId } from '@/lib/levels';

export function BookView({
  book,
  bookId,
  levelId,
  report,
  attempts,
  shareToken,
}: {
  book: Book;
  bookId: string;
  levelId: LevelId;
  report: BookReport | null;
  attempts: number;
  shareToken: string | null;
}) {
  const relevelRef = useRef<HTMLDivElement | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    shareToken ? `/share/${shareToken}` : null,
  );
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  /**
   * The re-level nudge in the level check and the full control below it are the
   * same action at two levels of commitment, so the nudge scrolls to the
   * control rather than firing a rewrite the adult has not chosen a target for.
   */
  const scrollToRelevel = () => {
    relevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const share = async () => {
    if (shareUrl) {
      await copy(new URL(shareUrl, window.location.origin).toString());
      return;
    }
    setSharing(true);
    setShareError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (!response.ok) throw new Error(await response.text());
      const { shareToken: token } = (await response.json()) as { shareToken: string | null };
      if (!token) throw new Error('No link was created.');
      const link = `/share/${token}`;
      setShareUrl(link);
      await copy(new URL(link, window.location.origin).toString());
    } catch (err) {
      setShareError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <Reader book={book} variant="spread" onShare={share} />

      {sharing && (
        <p className="rounded-[18px] bg-page px-7 py-5 text-sm text-muted">Making a link…</p>
      )}
      {shareUrl && !sharing && (
        <p className="rounded-[18px] bg-page px-7 py-5 text-sm text-muted">
          Read-only link copied:{' '}
          <a className="font-semibold text-sea underline" href={shareUrl}>
            {shareUrl}
          </a>
        </p>
      )}
      {shareError && (
        <p className="rounded-[18px] border-[1.5px] border-[#E7A9A5] bg-[#FBE3E1] px-7 py-5 text-sm">
          {shareError}
        </p>
      )}

      {report && (
        <LevelCheck
          report={report}
          levelId={levelId}
          attempts={attempts}
          onRelevel={scrollToRelevel}
        />
      )}

      <div ref={relevelRef}>
        <Relevel bookId={bookId} current={levelId} />
      </div>
    </>
  );
}

async function copy(text: string) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // Clipboard permission is not guaranteed; the link is shown either way.
  }
}
