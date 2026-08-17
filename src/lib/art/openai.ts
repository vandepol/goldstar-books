/**
 * OpenAI image provider — the upgrade path beyond the built-in SVG scenes.
 *
 * Opt-in: set ART_PROVIDER=openai and OPENAI_API_KEY, then `getProvider()`
 * returns this instead of the SVG placeholder. Nothing else in the product
 * changes — that is the whole point of the provider interface.
 *
 * NOTE: written to the current Images API contract but not yet exercised
 * against a live key in this repo. Before first production use, run one page
 * through `renderPage` and eyeball the result. Costs are real money per page
 * (a ~30-page book at 1536×1024 is a few dollars), which is why estimateCost
 * exists and the UI must warn before spending.
 *
 * Storage: the API returns base64; this provider hands back a data: URL so it
 * works with zero infrastructure. For production, upload the bytes to S3 (or
 * any blob store) in place of the data URL — books with hundreds of KB of
 * base64 per page will bloat the database.
 */

import type { ArtProvider, RenderRequest, RenderResult } from './provider';

const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';

export const openaiProvider: ArtProvider = {
  id: 'openai',

  async renderPage({ page, characters, styleToken }: RenderRequest): Promise<RenderResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');

    const who = characters
      .map((c) => `${c.name} (must match exactly, every page): ${c.appearance}`)
      .join('; ');
    const prompt = [
      styleToken,
      `Scene: ${page.illustration.action}`,
      `Place: ${page.illustration.place}`,
      `Mood: ${page.illustration.mood}`,
      who ? `Characters: ${who}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: '1536x1024', // matches the reader's 16:10-ish picture slot
        quality: 'medium',
        n: 1,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI images API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as { data: { b64_json: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI images API returned no image');

    return {
      imageUrl: `data:image/png;base64,${b64}`,
      promptUsed: prompt,
      seed: null,
    };
  },

  // Rough current list pricing for medium-quality 1536×1024. Revisit when the
  // provider is first wired up for real.
  estimateCost: (pages: number) => pages * 0.06,
};
