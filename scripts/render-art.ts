/**
 * Bake real AI illustrations for the starter library into the repo.
 *
 *   OPENAI_API_KEY=sk-... npx tsx scripts/render-art.ts --test        # one image, eyeball it
 *   OPENAI_API_KEY=sk-... npx tsx scripts/render-art.ts --covers      # 10 covers
 *   OPENAI_API_KEY=sk-... npx tsx scripts/render-art.ts --book story-tess-ball
 *   OPENAI_API_KEY=sk-... npx tsx scripts/render-art.ts --all --yes   # every page of every book
 *
 * Run locally with your key, or via the "Render starter art" GitHub Actions
 * workflow, which reads the key from repo secrets — either way the key stays
 * out of the public site; only the finished images ship.
 *
 * Idempotent: existing files are skipped, so an interrupted run resumes and a
 * re-run costs nothing. Output goes to public/art/<bookId>/ (served by the
 * app) and the manifest src/data/art.json records what exists; the seed
 * script and the site build both stamp imageUrls from it.
 *
 * Anything over a dollar of estimated spend requires --yes.
 */

import './env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { STORIES } from '../src/data/stories';
import { DEFAULT_STYLE_TOKEN } from '../src/lib/art/provider';
import { BAKED_ART, buildImagePrompt, estimateImageCost, generateImage } from '../src/lib/art/openai';
import type { Book } from '../src/lib/schema';

const ROOT = join(__dirname, '..');
const ART_DIR = join(ROOT, 'public', 'art');
const MANIFEST = join(ROOT, 'src', 'data', 'art.json');

type Manifest = Record<string, { cover?: string; pages: Record<string, string> }>;

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const bookArg = args.includes('--book') ? args[args.indexOf('--book') + 1] : null;

function loadManifest(): Manifest {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  } catch {
    return {};
  }
}

interface Job {
  book: Book;
  /** 'cover' or a page index. */
  which: 'cover' | number;
  file: string; // repo-relative under public/
}

function jobs(): Job[] {
  const list: Job[] = [];
  const books = bookArg ? STORIES.filter((b) => b.id === bookArg) : STORIES;
  if (bookArg && !books.length) throw new Error(`No story with id "${bookArg}"`);
  for (const book of books) {
    list.push({ book, which: 'cover', file: `art/${book.id}/cover.jpg` });
    if (flag('--covers')) continue;
    for (const page of book.pages) {
      list.push({ book, which: page.index, file: `art/${book.id}/page-${page.index}.jpg` });
    }
  }
  if (flag('--test')) return list.slice(0, 1);
  return list;
}

function promptFor(job: Job): string {
  const { book } = job;
  if (job.which === 'cover') {
    // A cover is its own shot: the hero front and centre, no text — the
    // reader lays the title over its own chrome.
    return buildImagePrompt(
      {
        text: book.title,
        illustration: {
          action: `book cover portrait: ${book.characters[0].name} stands front and centre looking at the reader, ${book.characters
            .slice(1)
            .map((c) => c.name)
            .join(' and ')} beside her`,
          place: book.setting,
          mood: 'happy',
        },
      },
      book.characters,
      DEFAULT_STYLE_TOKEN + ', absolutely no text or lettering anywhere',
    );
  }
  const page = book.pages[job.which];
  return buildImagePrompt(page, book.characters.filter((c) => page.illustration.characterIds.includes(c.id)), DEFAULT_STYLE_TOKEN);
}

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('OPENAI_API_KEY is not set. Locally: OPENAI_API_KEY=sk-... npx tsx scripts/render-art.ts --test');
    console.error('On GitHub: Settings → Secrets and variables → Actions → add OPENAI_API_KEY, then run the "Render starter art" workflow.');
    process.exit(1);
  }
  if (!flag('--test') && !flag('--covers') && !flag('--all') && !bookArg) {
    console.error('Pick a mode: --test | --covers | --book <id> | --all');
    process.exit(1);
  }

  const manifest = loadManifest();
  const all = jobs();
  const pending = all.filter((j) => !existsSync(join(ROOT, 'public', j.file)));
  const cost = estimateImageCost(pending.length, BAKED_ART.quality);

  console.log(`${all.length} image(s) in scope, ${all.length - pending.length} already rendered, ${pending.length} to go.`);
  console.log(`Estimated cost: ~$${cost.toFixed(2)} (${BAKED_ART.quality} quality, ${BAKED_ART.size})`);
  if (!pending.length) return;
  if (cost > 1 && !flag('--yes')) {
    console.error('That is over a dollar — re-run with --yes to confirm.');
    process.exit(1);
  }

  let done = 0;
  for (const job of pending) {
    const dest = join(ROOT, 'public', job.file);
    mkdirSync(join(dest, '..'), { recursive: true });
    const label = `${job.book.id} ${job.which === 'cover' ? 'cover' : `page ${(job.which as number) + 1}`}`;
    process.stdout.write(`[${++done}/${pending.length}] ${label} … `);
    const { b64 } = await generateImage(key, promptFor(job), BAKED_ART);
    writeFileSync(dest, Buffer.from(b64, 'base64'));
    const entry = (manifest[job.book.id] ??= { pages: {} });
    if (job.which === 'cover') entry.cover = job.file;
    else entry.pages[String(job.which)] = job.file;
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`${(Buffer.from(b64, 'base64').length / 1024).toFixed(0)} KB`);
  }
  console.log(`\nDone. Manifest: src/data/art.json — now run: npx tsx scripts/build-site.ts && npm run db:seed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
