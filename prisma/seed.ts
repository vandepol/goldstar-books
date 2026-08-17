/**
 * Seed the starter library: one demo family, one child per hero, and the ten
 * level-checked stories from src/data/stories.ts — each stored with the report
 * the validator produces today, exactly as a generated book would be.
 *
 * Safe to re-run: everything is an upsert keyed on stable ids.
 *
 *   npm run db:seed
 */

import '../scripts/env';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { STORIES } from '../src/data/stories';
import { checkDraft } from '../src/lib/validate';
import type { LevelId } from '../src/lib/levels';
import type { Book } from '../src/lib/schema';

const db = new PrismaClient();

/** Baked AI art, if scripts/render-art.ts has run. Missing file = no art. */
function withArt(story: Book): Book {
  let manifest: Record<string, { cover?: string; pages: Record<string, string> }>;
  try {
    manifest = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'art.json'), 'utf-8'));
  } catch {
    return story;
  }
  const art = manifest[story.id];
  if (!art) return story;
  return {
    ...story,
    pages: story.pages.map((p) => {
      const file = art.pages[String(p.index)];
      return file ? { ...p, illustration: { ...p.illustration, imageUrl: `/${file}`, status: 'ready' as const } } : p;
    }),
  };
}

async function main() {
  const owner = await db.user.upsert({
    where: { email: 'library@goldstarbooks.local' },
    update: {},
    create: {
      email: 'library@goldstarbooks.local',
      name: 'Starter Library',
    },
  });

  for (const story of STORIES) {
    const hero = story.characters[0];
    const child = await db.child.upsert({
      where: { id: `seed-child-${hero.id}` },
      update: { name: hero.name, levelId: story.levelId },
      create: {
        id: `seed-child-${hero.id}`,
        ownerId: owner.id,
        name: hero.name,
        levelId: story.levelId,
        appearance: hero.appearance,
      },
    });

    const names = story.characters.map((c) => c.name);
    const report = checkDraft(story, story.levelId as LevelId, names);
    if (!report.ok) {
      throw new Error(
        `"${story.title}" no longer passes its level check; fix the story before seeding:\n` +
          report.issues.map((i) => `  - ${i.message}`).join('\n'),
      );
    }

    const data = {
      childId: child.id,
      title: story.title,
      subtitle: story.subtitle,
      levelId: story.levelId,
      setting: story.setting,
      content: JSON.stringify(withArt(story)),
      report: JSON.stringify(report),
      attempts: 1,
      degraded: false,
    };
    await db.book.upsert({
      where: { id: story.id },
      update: data,
      create: { id: story.id, ...data },
    });
    console.log(`✓ ${story.title} [${story.levelId}]`);
  }

  console.log(`\nSeeded ${STORIES.length} starter books for ${owner.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
