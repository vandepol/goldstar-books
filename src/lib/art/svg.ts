/**
 * Deterministic SVG scenes — the first real art provider.
 *
 * Not AI art and not pretending to be: a flat, calm, picture-book scene
 * composed from what the book already knows — the page's mood sets the sky,
 * the setting picks the backdrop motifs, and every character is drawn from
 * their frozen palette, so Tess is the same Tess on page one and page twenty.
 *
 * Pure string-in string-out so the React reader and the static-site builder
 * render the identical picture. Deterministic by (book id, page index): the
 * same page always draws the same scene, which is what "regenerate a page
 * identically" means for this provider.
 */

import type { Book, Character, Page } from '../schema';

type Mood = Page['illustration']['mood'];

const SKY: Record<Mood, [string, string]> = {
  happy: ['#AEDCF2', '#EAF6FC'],
  excited: ['#FFD9A0', '#FFF3DE'],
  curious: ['#C6DFF8', '#EEF5FE'],
  worried: ['#AFC3D1', '#E2EAF0'],
  determined: ['#BFD3EE', '#E9F0FA'],
  proud: ['#FFE0A0', '#FFF6E2'],
  calm: ['#CFE7DA', '#EFF7F2'],
};

/** Small deterministic PRNG so clouds and hills differ per page, not per render. */
function rng(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One rounded "peg doll" figure drawn from a character's frozen palette. */
function figure(c: Character, x: number, y: number, h: number, flip = false): string {
  const head = h * 0.3;
  const body = h * 0.55;
  const w = h * 0.42;
  const dir = flip ? -1 : 1;
  const animal = /terrier|sheep|cat|duck|dog|tabby/i.test(c.appearance);
  if (animal) {
    // A compact round creature: body blob, head, ear nubs, legs.
    const bw = h * 0.8;
    const bh = h * 0.5;
    return `
      <g transform="translate(${x},${y})">
        <ellipse cx="0" cy="${-bh / 2}" rx="${bw / 2}" ry="${bh / 2}" fill="${c.palette.primary}" stroke="#16283D" stroke-width="3"/>
        <circle cx="${(bw / 2) * dir}" cy="${-bh * 0.85}" r="${bh * 0.42}" fill="${c.palette.primary}" stroke="#16283D" stroke-width="3"/>
        <circle cx="${(bw / 2 + bh * 0.14) * dir}" cy="${-bh * 0.92}" r="3.5" fill="#16283D"/>
        <path d="M ${(bw / 2 - bh * 0.28) * dir} ${-bh * 1.2} q ${6 * dir} -14 ${14 * dir} -4" fill="none" stroke="#16283D" stroke-width="3" stroke-linecap="round"/>
        <line x1="${-bw * 0.25}" y1="0" x2="${-bw * 0.25}" y2="${bh * 0.28}" stroke="#16283D" stroke-width="4" stroke-linecap="round"/>
        <line x1="${bw * 0.25}" y1="0" x2="${bw * 0.25}" y2="${bh * 0.28}" stroke="#16283D" stroke-width="4" stroke-linecap="round"/>
      </g>`;
  }
  return `
    <g transform="translate(${x},${y})">
      <line x1="${-w * 0.22}" y1="0" x2="${-w * 0.22}" y2="${-h * 0.12}" stroke="#16283D" stroke-width="5" stroke-linecap="round"/>
      <line x1="${w * 0.22}" y1="0" x2="${w * 0.22}" y2="${-h * 0.12}" stroke="#16283D" stroke-width="5" stroke-linecap="round"/>
      <rect x="${-w / 2}" y="${-h * 0.12 - body}" width="${w}" height="${body}" rx="${w * 0.45}" fill="${c.palette.primary}" stroke="#16283D" stroke-width="3"/>
      <line x1="${-w * 0.62}" y1="${-h * 0.12 - body * 0.75}" x2="${-w * 0.85}" y2="${-h * 0.12 - body * 0.45}" stroke="${c.palette.primary}" stroke-width="7" stroke-linecap="round"/>
      <line x1="${w * 0.62}" y1="${-h * 0.12 - body * 0.75}" x2="${w * 0.95 * dir < 0 ? w * 0.85 : w * 0.85}" y2="${-h * 0.12 - body * 0.5 - (flip ? 0 : h * 0.1)}" stroke="${c.palette.primary}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="0" cy="${-h * 0.12 - body - head / 2 + 2}" r="${head / 2}" fill="${c.palette.skin}" stroke="#16283D" stroke-width="3"/>
      <path d="M ${-head / 2} ${-h * 0.12 - body - head / 2} a ${head / 2} ${head / 2} 0 0 1 ${head} 0 l 0 ${-head * 0.12} a ${head / 2} ${head * 0.62} 0 0 0 ${-head} 0 z" fill="${c.palette.hair}"/>
      <circle cx="${-head * 0.16}" cy="${-h * 0.12 - body - head / 2 + head * 0.06}" r="2.6" fill="#16283D"/>
      <circle cx="${head * 0.16}" cy="${-h * 0.12 - body - head / 2 + head * 0.06}" r="2.6" fill="#16283D"/>
      <path d="M ${-head * 0.12} ${-h * 0.12 - body - head * 0.28} q ${head * 0.12} ${head * 0.1} ${head * 0.24} 0" fill="none" stroke="#16283D" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
}

/** Backdrop motifs keyed off the free-text setting. */
function backdrop(setting: string, r: () => number, ground: string): string {
  const s = setting.toLowerCase();
  const parts: string[] = [];
  if (/farm|hill/.test(s)) {
    parts.push(`<ellipse cx="${160 + r() * 80}" cy="392" rx="300" ry="90" fill="#9CC7A5"/>`);
    parts.push(`<ellipse cx="${640 + r() * 60}" cy="400" rx="320" ry="100" fill="#8ABC96"/>`);
    parts.push(`<g transform="translate(600,300)"><rect x="0" y="0" width="120" height="80" fill="#C0574F" stroke="#16283D" stroke-width="3"/><path d="M -8 0 L 60 -44 L 128 0 z" fill="#8E2B25" stroke="#16283D" stroke-width="3"/><rect x="48" y="30" width="26" height="50" fill="#5C3A21"/></g>`);
  }
  if (/garden|street|school/.test(s)) {
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 170 + r() * 40;
      parts.push(`<g transform="translate(${x},${420 + r() * 30})"><line x1="0" y1="0" x2="0" y2="-26" stroke="#1E7A4B" stroke-width="4"/><circle cx="0" cy="-34" r="12" fill="${['#D66BA0', '#F2B33D', '#C0392B', '#6B4FA0'][i % 4]}" stroke="#16283D" stroke-width="2.5"/></g>`);
    }
  }
  if (/tree|garden|park/.test(s)) {
    parts.push(`<g transform="translate(${80 + r() * 60},420)"><rect x="-10" y="-120" width="20" height="120" fill="#5C3A21"/><circle cx="0" cy="-150" r="70" fill="#2F8F5B"/><circle cx="-46" cy="-120" r="44" fill="#38A268"/><circle cx="46" cy="-122" r="46" fill="#2A8352"/></g>`);
  }
  if (/kitchen|living room|house/.test(s)) {
    parts.push(`<rect x="0" y="0" width="800" height="500" fill="#F6EBD8"/>`);
    parts.push(`<rect x="80" y="80" width="180" height="150" rx="10" fill="#BFE0F0" stroke="#16283D" stroke-width="4"/><line x1="170" y1="80" x2="170" y2="230" stroke="#16283D" stroke-width="4"/><line x1="80" y1="155" x2="260" y2="155" stroke="#16283D" stroke-width="4"/>`);
    parts.push(`<rect x="0" y="380" width="800" height="120" fill="#D8B078"/>`);
    if (/kitchen/.test(s)) parts.push(`<rect x="480" y="250" width="260" height="130" rx="8" fill="#B98A4F" stroke="#16283D" stroke-width="3"/><rect x="500" y="380" width="18" height="60" fill="#96703F"/><rect x="702" y="380" width="18" height="60" fill="#96703F"/>`);
    if (/living/.test(s)) parts.push(`<rect x="470" y="270" width="280" height="110" rx="26" fill="#7A9CC4" stroke="#16283D" stroke-width="3"/><rect x="470" y="240" width="280" height="52" rx="24" fill="#8FB0D6" stroke="#16283D" stroke-width="3"/>`);
  }
  if (/night|storm/.test(s)) {
    parts.push(`<rect x="0" y="0" width="800" height="500" fill="#1D3350" opacity="0.55"/>`);
    parts.push(`<circle cx="680" cy="90" r="38" fill="#F5EFD8"/><circle cx="664" cy="82" r="34" fill="#31486B" opacity="0.9"/>`);
    for (let i = 0; i < 10; i++) parts.push(`<circle cx="${40 + r() * 720}" cy="${30 + r() * 160}" r="2" fill="#F5EFD8"/>`);
  }
  if (/snow|winter/.test(s)) {
    parts.push(`<rect x="0" y="360" width="800" height="140" fill="#F4F7FB"/>`);
    parts.push(`<ellipse cx="200" cy="380" rx="260" ry="60" fill="#FFFFFF"/><ellipse cx="620" cy="392" rx="280" ry="70" fill="#EDF2F9"/>`);
    for (let i = 0; i < 14; i++) parts.push(`<circle cx="${r() * 800}" cy="${r() * 330}" r="${2 + r() * 3}" fill="#FFFFFF" opacity="0.9"/>`);
  }
  if (/stream|water|park/.test(s)) {
    parts.push(`<path d="M 0 430 Q 200 410 400 434 T 800 430 L 800 500 L 0 500 z" fill="#7FB6D9"/>`);
    parts.push(`<path d="M 60 452 q 30 -8 60 0 M 300 466 q 30 -8 60 0 M 560 452 q 30 -8 60 0" fill="none" stroke="#EAF6FC" stroke-width="4" stroke-linecap="round"/>`);
  }
  if (/rain|storm/.test(s)) {
    for (let i = 0; i < 26; i++) {
      const x = r() * 800; const y = r() * 340;
      parts.push(`<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 20}" stroke="#5F87A8" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`);
    }
  }
  if (!parts.length) {
    parts.push(`<ellipse cx="240" cy="400" rx="320" ry="90" fill="${ground}"/>`);
  }
  return parts.join('\n');
}

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'quiz' }
  | { kind: 'wall' }
  | { kind: 'star' }
  | { kind: 'credit' };

/** Render the scene for one screen of a book as a standalone SVG string. */
export function sceneSvg(book: Book, screen: Screen): string {
  const page = screen.kind === 'page' ? book.pages[screen.index] : null;
  const mood: Mood = page?.illustration.mood ?? (screen.kind === 'cover' ? 'happy' : 'proud');
  const [top, bottom] = SKY[mood];
  const r = rng(`${book.id}:${screen.kind}:${page?.index ?? 0}`);
  const setting = page ? page.illustration.place : book.setting;

  // Who is in the shot: the page's cast, or everyone for cover/celebration.
  const cast: Character[] = page
    ? book.characters.filter((c) => page.illustration.characterIds.includes(c.id))
    : book.characters;

  const sunOrNight = /night|storm/.test(setting.toLowerCase())
    ? ''
    : `<circle cx="${90 + r() * 60}" cy="${80 + r() * 30}" r="42" fill="#F7CE68" opacity="0.95"/>`;

  const clouds = Array.from({ length: 3 }, (_, i) => {
    const x = 120 + i * 240 + r() * 120;
    const y = 50 + r() * 80;
    return `<g opacity="0.9" transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="52" ry="20" fill="#FFFFFF"/><ellipse cx="34" cy="-8" rx="34" ry="16" fill="#FFFFFF"/></g>`;
  }).join('');

  const ground = /snow/.test(setting.toLowerCase()) ? '#EDF2F9' : '#A8CBA0';

  const figures = cast
    .slice(0, 4)
    .map((c, i) => {
      const n = Math.min(cast.length, 4);
      const x = 400 + (i - (n - 1) / 2) * 150 + (r() - 0.5) * 30;
      const h = /terrier|sheep|cat|duck|dog|tabby/i.test(c.appearance) ? 110 : 190 - i * 8;
      return figure(c, x, 452, h, i % 2 === 1);
    })
    .join('');

  const celebration =
    screen.kind === 'star' || screen.kind === 'wall' || screen.kind === 'cover'
      ? Array.from({ length: 7 }, () => {
          const x = 60 + r() * 680;
          const y = 40 + r() * 180;
          const s = 10 + r() * 12;
          return `<path transform="translate(${x},${y}) scale(${s / 20})" d="M0,-20 L5.9,-6.2 L19,-6.2 L8.9,2.4 L12.4,16.2 L0,8.2 L-12.4,16.2 L-8.9,2.4 L-19,-6.2 L-5.9,-6.2 Z" fill="#F2B33D" stroke="#C98A16" stroke-width="1.5"/>`;
        }).join('')
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${esc(page ? page.illustration.action : book.title)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sky)"/>
  <rect x="0" y="400" width="800" height="100" fill="${ground}"/>
  ${sunOrNight}
  ${clouds}
  ${backdrop(setting, r, ground)}
  ${figures}
  ${celebration}
</svg>`;
}
