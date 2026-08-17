/**
 * Turn the model's draft into a stored book: ids, defaults, illustration
 * slots. Pure and environment-neutral (uses the global WebCrypto UUID), so
 * the server generator and the static site's in-browser generator share it —
 * one assembly, no drift.
 */

import type { Book, BookRequest, Draft } from '../schema';

export function assembleBook(draft: Draft, request: BookRequest): Book {
  const characters = request.characters.map((c) => ({
    ...c,
    id: c.id ?? globalThis.crypto.randomUUID(),
    sheetUrl: null,
    sheetRef: null,
  }));
  const byName = new Map(characters.map((c) => [c.name.toLowerCase(), c.id]));

  return {
    id: globalThis.crypto.randomUUID(),
    title: draft.title,
    subtitle: draft.subtitle,
    levelId: request.levelId,
    setting: request.setting,
    characters,
    refrains: draft.refrains,
    wordWall: draft.wordWall,
    quiz: draft.quiz,
    createdAt: new Date().toISOString(),
    pages: draft.pages.map((p, index) => ({
      index,
      text: p.text,
      refrain: p.refrain,
      illustration: {
        action: p.illustration.action,
        place: p.illustration.place,
        mood: p.illustration.mood,
        characterIds: p.illustration.characters
          .map((n) => byName.get(n.toLowerCase()))
          .filter((id): id is string => Boolean(id)),
        // Illustration rendering is a separate, later pass. Until it runs the
        // reader shows a generated placeholder, so a book is readable the
        // moment the words are ready.
        imageUrl: null,
        promptUsed: null,
        seed: null,
        status: 'placeholder',
      },
    })),
  };
}
