/**
 * OpenAI image generation — shared helpers plus the server-side provider.
 *
 * Three consumers, one prompt and one API shape, so the art direction cannot
 * fork: the server ArtProvider (below), scripts/render-art.ts (bakes starter
 * art into the repo with the owner's key, run locally), and the static site's
 * in-browser "paint her book" flow (the visitor's key; the OpenAI API sends
 * `access-control-allow-origin: *`, verified Aug 2026, so browser calls work).
 *
 * NOTE: written to the current Images API contract but not yet exercised
 * against a live key in this repo. `scripts/render-art.ts --test` renders a
 * single image precisely so you can eyeball one before paying for a batch.
 */

import type { Character, Page } from '../schema';
import type { ArtProvider, RenderRequest, RenderResult } from './provider';

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';

export interface ImageOptions {
  /** png is lossless and huge; jpeg/webp are what you want to store. */
  format: 'png' | 'jpeg' | 'webp';
  /** 0–100, only for jpeg/webp. */
  compression: number;
  quality: 'low' | 'medium' | 'high';
  size: '1024x1024' | '1536x1024' | '1024x1536';
}

/** Repo default: good-looking, storable, matches the reader's wide slot.
 *  ART_QUALITY=low drops the cost ~4x (≈$0.016/image) — for this flat
 *  picture-book style, low is usually indistinguishable at book size; use
 *  --test to eyeball one before a batch. */
const envQuality = process.env.ART_QUALITY;
export const BAKED_ART: ImageOptions = {
  format: 'jpeg',
  compression: 82,
  quality: envQuality === 'low' || envQuality === 'high' ? envQuality : 'medium',
  size: '1536x1024',
};
/** Browser default: small enough that a whole book fits in localStorage. */
export const BROWSER_ART: ImageOptions = { format: 'webp', compression: 70, quality: 'low', size: '1536x1024' };

/** The one prompt for a page's picture, everywhere. */
export function buildImagePrompt(
  page: Pick<Page, 'text'> & { illustration: Pick<Page['illustration'], 'action' | 'place' | 'mood'> },
  characters: Pick<Character, 'name' | 'appearance'>[],
  styleToken: string,
): string {
  const who = characters
    .map((c) => `${c.name} (appearance is frozen — must match exactly on every page): ${c.appearance}`)
    .join('; ');
  return [
    styleToken,
    `Scene: ${page.illustration.action}`,
    `Place: ${page.illustration.place}`,
    `Mood: ${page.illustration.mood}`,
    `The picture must show exactly this and nothing else — the page's sentence is: "${page.text}"`,
    who ? `Characters: ${who}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** One images-API call. Works in Node and the browser (fetch + CORS). */
export async function generateImage(
  apiKey: string,
  prompt: string,
  opts: ImageOptions,
): Promise<{ b64: string; mime: string }> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: opts.size,
      quality: opts.quality,
      output_format: opts.format,
      ...(opts.format === 'png' ? {} : { output_compression: opts.compression }),
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI images API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { data: { b64_json: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI images API returned no image');
  return { b64, mime: `image/${opts.format}` };
}

/** Rough list pricing per image by quality at 1536×1024. Revisit over time. */
export function estimateImageCost(images: number, quality: ImageOptions['quality'] = 'medium'): number {
  const per = quality === 'low' ? 0.016 : quality === 'medium' ? 0.063 : 0.25;
  return images * per;
}

/**
 * The server-side ArtProvider. Opt in with ART_PROVIDER=openai and
 * OPENAI_API_KEY; see provider.ts. Returns a data URL — swap in blob storage
 * before generating whole books through the app, or the database will bloat.
 */
export const openaiProvider: ArtProvider = {
  id: 'openai',
  async renderPage({ page, characters, styleToken }: RenderRequest): Promise<RenderResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const prompt = buildImagePrompt(page, characters, styleToken);
    const { b64, mime } = await generateImage(key, prompt, BAKED_ART);
    return { imageUrl: `data:${mime};base64,${b64}`, promptUsed: prompt, seed: null };
  },
  estimateCost: (pages: number) => estimateImageCost(pages, BAKED_ART.quality),
};
