/**
 * The slice of the app that runs inside the static showcase site.
 *
 * Bundled by scripts/build-site.ts (esbuild, IIFE, global `GSB`) and inlined
 * into docs/index.html. This is why the site's "make her book" flow is honest:
 * the browser runs the *same* `checkDraft` and draws with the *same* scene
 * renderer as the server — nothing is re-implemented, so nothing can drift.
 */

export { sceneSvg } from '../src/lib/art/svg';
export { checkDraft, repairInstructions } from '../src/lib/validate';
export { LEVELS, LEVEL_ORDER, getLevel } from '../src/lib/levels';
// The real generation pipeline, for the site's bring-your-own-key mode: the
// browser talks straight to the Anthropic API with the parent's key and runs
// the same prompt, the same draft schema, the same check-and-repair loop and
// the same assembly as the server generator.
export { SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/text/prompt';
export { assembleBook } from '../src/lib/text/assemble';
export { DraftSchema } from '../src/lib/schema';
// In-browser illustration with the visitor's OpenAI key (their API allows
// browser CORS): same prompt and call the server provider uses.
export { buildImagePrompt, generateImage, BROWSER_ART } from '../src/lib/art/openai';
export { DEFAULT_STYLE_TOKEN } from '../src/lib/art/provider';
