/**
 * The slice of the app that runs inside the static showcase site.
 *
 * Bundled by scripts/build-site.ts (esbuild, IIFE, global `GSB`) and inlined
 * into docs/index.html. This is why the site's "make her book" flow is honest:
 * the browser runs the *same* `checkDraft` and draws with the *same* scene
 * renderer as the server — nothing is re-implemented, so nothing can drift.
 */

export { sceneSvg } from '../src/lib/art/svg';
export { checkDraft } from '../src/lib/validate';
export { LEVELS, LEVEL_ORDER, getLevel } from '../src/lib/levels';
