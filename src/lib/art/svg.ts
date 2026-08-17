/**
 * Deterministic SVG scenes — the built-in art provider.
 *
 * Modelled on the original series playbook: a shared library of flat vector
 * primitives — a figure builder that reads each character's frozen appearance
 * text (hair style, glasses, hat), expressive faces and arm poses keyed to the
 * page's mood, distinct animal shapes, and a prop set — composed per page from
 * the illustration brief. One clear subject, uncluttered background, high
 * contrast: simple is a feature for this reader group.
 *
 * Pure string-in string-out so the React reader, the dashboard covers and the
 * static-site builder all draw the identical picture, and deterministic by
 * (book id, screen) so a page always renders the same scene.
 */

import type { Book, Character, Page } from '../schema';

type Mood = Page['illustration']['mood'];

const INK = '#16283D';
const GROUND_Y = 452; // every figure's feet land here; frame is 500 tall

const SKY: Record<Mood, [string, string]> = {
  happy: ['#A8DAF2', '#EAF6FC'],
  excited: ['#FFD9A0', '#FFF3DE'],
  curious: ['#C6DFF8', '#EEF5FE'],
  worried: ['#A9BFCE', '#DFE8EF'],
  determined: ['#BFD3EE', '#E9F0FA'],
  proud: ['#FFE0A0', '#FFF6E2'],
  calm: ['#CFE7DA', '#EFF7F2'],
};

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

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/* Figures                                                            */
/* ------------------------------------------------------------------ */

type Pose = 'up' | 'point' | 'down' | 'hips' | 'wave' | 'chin';

const MOOD_POSE: Record<Mood, Pose> = {
  happy: 'wave',
  excited: 'up',
  curious: 'chin',
  worried: 'down',
  determined: 'point',
  proud: 'hips',
  calm: 'wave',
};

function face(mood: Mood, r: number): string {
  const eyeY = -r * 0.1;
  const eyes =
    mood === 'calm'
      ? `<path d="M ${-r * 0.38} ${eyeY} q ${r * 0.14} ${r * 0.14} ${r * 0.28} 0 M ${r * 0.1} ${eyeY} q ${r * 0.14} ${r * 0.14} ${r * 0.28} 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : `<circle cx="${-r * 0.26}" cy="${eyeY}" r="2.9" fill="${INK}"/><circle cx="${r * 0.26}" cy="${eyeY}" r="2.9" fill="${INK}"/>`;
  const mouthY = r * 0.34;
  const mouth =
    mood === 'worried'
      ? `<path d="M ${-r * 0.2} ${mouthY + 3} q ${r * 0.2} ${-r * 0.18} ${r * 0.4} 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : mood === 'curious'
        ? `<circle cx="0" cy="${mouthY}" r="${r * 0.13}" fill="none" stroke="${INK}" stroke-width="2.6"/>`
        : mood === 'excited'
          ? `<path d="M ${-r * 0.24} ${mouthY - 2} a ${r * 0.24} ${r * 0.22} 0 0 0 ${r * 0.48} 0 z" fill="${INK}"/>`
          : `<path d="M ${-r * 0.24} ${mouthY - 2} q ${r * 0.24} ${r * 0.26} ${r * 0.48} 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
  const brows =
    mood === 'determined'
      ? `<path d="M ${-r * 0.4} ${-r * 0.32} l ${r * 0.26} ${r * 0.08} M ${r * 0.4} ${-r * 0.32} l ${-r * 0.26} ${r * 0.08}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      : '';
  const cheeks =
    mood === 'happy' || mood === 'proud'
      ? `<circle cx="${-r * 0.5}" cy="${r * 0.16}" r="${r * 0.11}" fill="#E8A9A0" opacity=".6"/><circle cx="${r * 0.5}" cy="${r * 0.16}" r="${r * 0.11}" fill="#E8A9A0" opacity=".6"/>`
      : '';
  return eyes + mouth + brows + cheeks;
}

function hairAndHat(c: Character, r: number): string {
  const a = c.appearance.toLowerCase();
  const H = c.palette.hair;
  const parts: string[] = [];

  if (/puffs/.test(a)) {
    parts.push(`<circle cx="${-r * 0.85}" cy="${-r * 0.75}" r="${r * 0.42}" fill="${H}"/><circle cx="${r * 0.85}" cy="${-r * 0.75}" r="${r * 0.42}" fill="${H}"/>`);
    parts.push(cap(H, r));
  } else if (/pigtail/.test(a)) {
    parts.push(`<circle cx="${-r * 1.02}" cy="${r * 0.1}" r="${r * 0.3}" fill="${H}"/><circle cx="${r * 1.02}" cy="${r * 0.1}" r="${r * 0.3}" fill="${H}"/>`);
    parts.push(cap(H, r));
  } else if (/plait|braid/.test(a)) {
    parts.push(cap(H, r));
    parts.push(`<path d="M ${r * 0.7} ${-r * 0.3} q ${r * 0.5} ${r * 0.7} ${r * 0.3} ${r * 1.5}" fill="none" stroke="${H}" stroke-width="${r * 0.34}" stroke-linecap="round"/>`);
  } else if (/ponytail/.test(a)) {
    parts.push(cap(H, r));
    parts.push(`<path d="M 0 ${-r * 1.02} q ${r * 0.9} ${-r * 0.1} ${r * 1.0} ${r * 0.9}" fill="none" stroke="${H}" stroke-width="${r * 0.3}" stroke-linecap="round"/>`);
  } else if (/long/.test(a) || /braids/.test(a) || /wavy/.test(a)) {
    parts.push(`<path d="M ${-r} ${-r * 0.2} a ${r} ${r} 0 0 1 ${r * 2} 0 l 0 ${r * 1.15} q ${-r * 0.3} ${r * 0.2} ${-r * 0.55} 0 l 0 ${-r * 0.5} q ${-r * 0.45} ${r * 0.25} ${-r * 0.9} 0 l 0 ${r * 0.5} q ${-r * 0.25} ${r * 0.2} ${-r * 0.55} 0 z" fill="${H}"/>`);
  } else if (/high-top|fade/.test(a)) {
    parts.push(`<rect x="${-r * 0.72}" y="${-r * 1.35}" width="${r * 1.44}" height="${r * 0.75}" rx="${r * 0.18}" fill="${H}"/>`);
    parts.push(cap(H, r));
  } else if (/curl/.test(a)) {
    parts.push(cap(H, r));
    parts.push(`<circle cx="${-r * 0.62}" cy="${-r * 0.78}" r="${r * 0.26}" fill="${H}"/><circle cx="0" cy="${-r * 0.98}" r="${r * 0.28}" fill="${H}"/><circle cx="${r * 0.62}" cy="${-r * 0.78}" r="${r * 0.26}" fill="${H}"/>`);
  } else {
    // short / default
    parts.push(cap(H, r));
  }

  if (/bobble hat/.test(a)) {
    parts.push(`<path d="M ${-r * 0.9} ${-r * 0.42} a ${r * 0.92} ${r * 0.85} 0 0 1 ${r * 1.8} 0 l 0 ${r * 0.14} l ${-r * 1.8} 0 z" fill="#C0392B"/><rect x="${-r * 0.92}" y="${-r * 0.36}" width="${r * 1.84}" height="${r * 0.22}" rx="${r * 0.1}" fill="#A93226"/><circle cx="0" cy="${-r * 1.28}" r="${r * 0.2}" fill="#F5F0E6"/>`);
  } else if (/cap/.test(a)) {
    const backwards = /backward/.test(a);
    parts.push(`<path d="M ${-r * 0.88} ${-r * 0.4} a ${r * 0.9} ${r * 0.82} 0 0 1 ${r * 1.76} 0 z" fill="#F2B33D"/>${backwards ? `<path d="M ${-r * 0.86} ${-r * 0.42} q ${-r * 0.4} 0 ${-r * 0.5} ${r * 0.16} l ${r * 0.5} ${r * 0.06} z" fill="#DDA32F"/>` : `<path d="M ${r * 0.86} ${-r * 0.42} q ${r * 0.4} 0 ${r * 0.5} ${r * 0.16} l ${-r * 0.5} ${r * 0.06} z" fill="#DDA32F"/>`}`);
  } else if (/crown/.test(a)) {
    parts.push(`<path d="M ${-r * 0.6} ${-r * 0.95} l ${r * 0.3} ${r * 0.18} l ${r * 0.3} ${-r * 0.26} l ${r * 0.3} ${r * 0.26} l ${r * 0.3} ${-r * 0.18} l 0 ${r * 0.3} l ${-r * 1.2} 0 z" fill="#F2B33D" stroke="#C98A16" stroke-width="1.5"/>`);
  }

  if (/glasses/.test(a)) {
    parts.push(`<g fill="none" stroke="${INK}" stroke-width="2.2"><circle cx="${-r * 0.28}" cy="${-r * 0.08}" r="${r * 0.24}"/><circle cx="${r * 0.28}" cy="${-r * 0.08}" r="${r * 0.24}"/><line x1="${-r * 0.05}" y1="${-r * 0.08}" x2="${r * 0.05}" y2="${-r * 0.08}"/></g>`);
  }
  if (/hearing aid/.test(a)) {
    parts.push(`<path d="M ${-r * 0.92} ${-r * 0.05} q ${-r * 0.12} ${r * 0.2} 0 ${r * 0.34}" fill="none" stroke="#155E86" stroke-width="3" stroke-linecap="round"/>`);
  }
  return parts.join('');
}

/** Round cap of hair over the top of the head. */
function cap(color: string, r: number): string {
  return `<path d="M ${-r} ${-r * 0.12} a ${r} ${r} 0 0 1 ${r * 2} 0 l 0 ${-r * 0.16} a ${r} ${r * 0.72} 0 0 0 ${-r * 2} 0 z" fill="${color}" stroke="${color}" stroke-width="${r * 0.16}"/>`;
}

function arm(x1: number, y1: number, x2: number, y2: number, color: string, w: number, hand: string): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="${w * 0.62}" fill="${hand}"/>`;
}

/** A child figure standing with feet on `y`, facing `dir` (1 right, -1 left). */
function kid(c: Character, x: number, y: number, h: number, mood: Mood, dir = 1): string {
  const r = h * 0.155; // head radius
  const legH = h * 0.16;
  const bodyH = h * 0.52;
  const bodyW = h * 0.3;
  const shirt = c.palette.primary;
  const skin = c.palette.skin;
  const bodyTop = -legH - bodyH;
  const headCy = bodyTop - r + h * 0.02;
  const shoulderY = bodyTop + bodyH * 0.2;
  const armW = h * 0.055;
  const pose = MOOD_POSE[mood];

  let arms = '';
  if (pose === 'up') {
    arms =
      arm(-bodyW * 0.42, shoulderY, -bodyW * 0.95, shoulderY - h * 0.2, shirt, armW, skin) +
      arm(bodyW * 0.42, shoulderY, bodyW * 0.95, shoulderY - h * 0.2, shirt, armW, skin);
  } else if (pose === 'point') {
    arms =
      arm(-bodyW * 0.42, shoulderY, -bodyW * 0.7, shoulderY + h * 0.14, shirt, armW, skin) +
      arm(bodyW * 0.42, shoulderY, bodyW * 1.25 * dir < 0 ? -bodyW * 1.25 : bodyW * 1.25, shoulderY - h * 0.04, shirt, armW, skin);
  } else if (pose === 'down') {
    arms =
      arm(-bodyW * 0.42, shoulderY, -bodyW * 0.52, shoulderY + h * 0.2, shirt, armW, skin) +
      arm(bodyW * 0.42, shoulderY, bodyW * 0.52, shoulderY + h * 0.2, shirt, armW, skin);
  } else if (pose === 'hips') {
    arms =
      `<path d="M ${-bodyW * 0.42} ${shoulderY} q ${-bodyW * 0.55} ${h * 0.05} ${-bodyW * 0.2} ${h * 0.16}" fill="none" stroke="${shirt}" stroke-width="${armW}" stroke-linecap="round"/>` +
      `<path d="M ${bodyW * 0.42} ${shoulderY} q ${bodyW * 0.55} ${h * 0.05} ${bodyW * 0.2} ${h * 0.16}" fill="none" stroke="${shirt}" stroke-width="${armW}" stroke-linecap="round"/>`;
  } else if (pose === 'chin') {
    arms =
      arm(-bodyW * 0.42, shoulderY, -bodyW * 0.52, shoulderY + h * 0.18, shirt, armW, skin) +
      arm(bodyW * 0.42, shoulderY, bodyW * 0.3, headCy + r * 0.7, shirt, armW, skin);
  } else {
    // wave
    arms =
      arm(-bodyW * 0.42, shoulderY, -bodyW * 0.62, shoulderY + h * 0.16, shirt, armW, skin) +
      arm(bodyW * 0.42, shoulderY, bodyW * 0.98, shoulderY - h * 0.12, shirt, armW, skin);
  }

  const apron = /apron/.test(c.appearance.toLowerCase())
    ? `<path d="M ${-bodyW * 0.32} ${bodyTop + bodyH * 0.3} l ${bodyW * 0.64} 0 l ${bodyW * 0.1} ${bodyH * 0.62} l ${-bodyW * 0.84} 0 z" fill="#F5F0E6" opacity=".92"/>`
    : '';

  return `
  <g transform="translate(${x},${y})${dir < 0 ? ' scale(-1,1)' : ''}">
    <line x1="${-bodyW * 0.24}" y1="${-legH}" x2="${-bodyW * 0.24}" y2="-2" stroke="${INK}" stroke-width="${h * 0.05}" stroke-linecap="round"/>
    <line x1="${bodyW * 0.24}" y1="${-legH}" x2="${bodyW * 0.24}" y2="-2" stroke="${INK}" stroke-width="${h * 0.05}" stroke-linecap="round"/>
    <ellipse cx="${-bodyW * 0.26}" cy="0" rx="${h * 0.055}" ry="${h * 0.03}" fill="${INK}"/>
    <ellipse cx="${bodyW * 0.26}" cy="0" rx="${h * 0.055}" ry="${h * 0.03}" fill="${INK}"/>
    <rect x="${-bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyH}" rx="${bodyW * 0.42}" fill="${shirt}" stroke="${INK}" stroke-width="2.5"/>
    ${apron}
    ${arms}
    <circle cx="0" cy="${headCy}" r="${r}" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>
    <g transform="translate(0,${headCy})">${hairAndHat(c, r)}${face(mood, r)}</g>
  </g>`;
}

/* Animals — each with an actual silhouette, not a blob. */

function dog(c: Character, x: number, y: number, s: number, mood: Mood, dir = 1): string {
  const wag = mood === 'happy' || mood === 'excited';
  return `
  <g transform="translate(${x},${y})${dir < 0 ? ' scale(-1,1)' : ''}">
    <line x1="${-s * 0.5}" y1="-2" x2="${-s * 0.5}" y2="${-s * 0.28}" stroke="${INK}" stroke-width="${s * 0.1}" stroke-linecap="round"/>
    <line x1="${s * 0.34}" y1="-2" x2="${s * 0.34}" y2="${-s * 0.28}" stroke="${INK}" stroke-width="${s * 0.1}" stroke-linecap="round"/>
    <ellipse cx="0" cy="${-s * 0.52}" rx="${s * 0.66}" ry="${s * 0.36}" fill="${c.palette.primary}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${-s * 0.62} ${-s * 0.6} q ${-s * 0.34} ${wag ? -s * 0.3 : -s * 0.1} ${-s * 0.44} ${wag ? -s * 0.05 : s * 0.08}" fill="none" stroke="${INK}" stroke-width="${s * 0.09}" stroke-linecap="round"/>
    <circle cx="${s * 0.62}" cy="${-s * 0.88}" r="${s * 0.3}" fill="${c.palette.primary}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${s * 0.42} ${-s * 1.12} q ${-s * 0.1} ${s * 0.26} ${s * 0.04} ${s * 0.3}" fill="#8D5B3F" stroke="${INK}" stroke-width="2"/>
    <path d="M ${s * 0.82} ${-s * 1.12} q ${s * 0.1} ${s * 0.26} ${-s * 0.04} ${s * 0.3}" fill="${c.palette.primary}" stroke="${INK}" stroke-width="2"/>
    <circle cx="${s * 0.7}" cy="${-s * 0.92}" r="2.6" fill="${INK}"/>
    <circle cx="${s * 0.88}" cy="${-s * 0.82}" r="${s * 0.055}" fill="${INK}"/>
    ${mood !== 'worried' ? `<path d="M ${s * 0.8} ${-s * 0.72} q ${s * 0.08} ${s * 0.1} ${s * 0.16} 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` : ''}
    <rect x="${s * 0.3}" y="${-s * 0.72}" width="${s * 0.28}" height="${s * 0.09}" rx="${s * 0.04}" fill="${c.palette.secondary}"/>
  </g>`;
}

function sheep(c: Character, x: number, y: number, s: number, dir = 1): string {
  return `
  <g transform="translate(${x},${y})${dir < 0 ? ' scale(-1,1)' : ''}">
    <line x1="${-s * 0.4}" y1="-2" x2="${-s * 0.4}" y2="${-s * 0.3}" stroke="${INK}" stroke-width="${s * 0.08}" stroke-linecap="round"/>
    <line x1="${s * 0.3}" y1="-2" x2="${s * 0.3}" y2="${-s * 0.3}" stroke="${INK}" stroke-width="${s * 0.08}" stroke-linecap="round"/>
    <g fill="#F5F0E6" stroke="${INK}" stroke-width="2.5">
      <circle cx="${-s * 0.34}" cy="${-s * 0.56}" r="${s * 0.3}"/>
      <circle cx="${s * 0.1}" cy="${-s * 0.66}" r="${s * 0.34}"/>
      <circle cx="${s * 0.42}" cy="${-s * 0.5}" r="${s * 0.28}"/>
      <circle cx="0" cy="${-s * 0.44}" r="${s * 0.3}"/>
    </g>
    <circle cx="${s * 0.66}" cy="${-s * 0.84}" r="${s * 0.2}" fill="${INK}"/>
    <path d="M ${s * 0.5} ${-s * 0.98} q ${-s * 0.14} ${-s * 0.05} ${-s * 0.16} ${s * 0.08}" fill="none" stroke="${INK}" stroke-width="${s * 0.07}" stroke-linecap="round"/>
    <circle cx="${s * 0.62}" cy="${-s * 0.88}" r="1.9" fill="#fff"/>
    <circle cx="${s * 0.74}" cy="${-s * 0.86}" r="1.9" fill="#fff"/>
    <path d="M ${s * 0.52} ${-s * 0.95} l ${-s * 0.12} ${-s * 0.05}" stroke="${c.palette.secondary}" stroke-width="${s * 0.09}" stroke-linecap="round"/>
  </g>`;
}

function cat(c: Character, x: number, y: number, s: number, dir = 1): string {
  const fur = c.palette.primary;
  return `
  <g transform="translate(${x},${y})${dir < 0 ? ' scale(-1,1)' : ''}">
    <path d="M ${-s * 0.42} 0 q ${-s * 0.2} ${-s * 0.7} ${s * 0.12} ${-s * 0.92} q ${s * 0.4} ${-s * 0.26} ${s * 0.62} ${s * 0.1} q ${s * 0.16} ${s * 0.3} ${s * 0.1} ${s * 0.82} z" fill="${fur}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${s * 0.4} ${-s * 0.06} q ${s * 0.44} ${-s * 0.06} ${s * 0.4} ${-s * 0.42} q ${-s * 0.04} ${-s * 0.2} ${-s * 0.22} ${-s * 0.18}" fill="none" stroke="${fur}" stroke-width="${s * 0.14}" stroke-linecap="round"/>
    <path d="M ${-s * 0.3} 0 q ${s * 0.05} ${-s * 0.34} ${s * 0.3} ${-s * 0.3} q ${s * 0.25} ${-s * 0.04} ${s * 0.3} ${s * 0.3} z" fill="#F5F0E6"/>
    <circle cx="${-s * 0.05}" cy="${-s * 1.02}" r="${s * 0.3}" fill="${fur}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${-s * 0.3} ${-s * 1.18} l ${-s * 0.04} ${-s * 0.24} l ${s * 0.2} ${s * 0.12} z M ${s * 0.2} ${-s * 1.18} l ${s * 0.04} ${-s * 0.24} l ${-s * 0.2} ${s * 0.12} z" fill="${fur}" stroke="${INK}" stroke-width="2"/>
    <circle cx="${-s * 0.15}" cy="${-s * 1.04}" r="2.4" fill="#2E7D4F"/>
    <circle cx="${s * 0.07}" cy="${-s * 1.04}" r="2.4" fill="#2E7D4F"/>
    <path d="M ${-s * 0.08} ${-s * 0.92} l ${s * 0.05} ${s * 0.05} l ${s * 0.05} ${-s * 0.05}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <g stroke="${INK}" stroke-width="1.4" opacity=".8">
      <line x1="${-s * 0.32}" y1="${-s * 0.95}" x2="${-s * 0.52}" y2="${-s * 0.98}"/>
      <line x1="${s * 0.22}" y1="${-s * 0.95}" x2="${s * 0.42}" y2="${-s * 0.98}"/>
    </g>
    <g stroke="${INK}" stroke-width="1.6" opacity=".55">
      <path d="M ${-s * 0.34} ${-s * 0.66} q ${s * 0.1} ${s * 0.04} ${s * 0.2} 0 M ${-s * 0.3} ${-s * 0.5} q ${s * 0.1} ${s * 0.04} ${s * 0.2} 0" fill="none"/>
    </g>
  </g>`;
}

function duck(c: Character, x: number, y: number, s: number, dir = 1): string {
  return `
  <g transform="translate(${x},${y})${dir < 0 ? ' scale(-1,1)' : ''}">
    <path d="M ${-s * 0.3} 0 l ${s * 0.08} ${-s * 0.1} M ${s * 0.14} 0 l ${s * 0.08} ${-s * 0.1}" stroke="#D97B29" stroke-width="${s * 0.08}" stroke-linecap="round"/>
    <path d="M ${-s * 0.56} ${-s * 0.4} q 0 ${s * 0.34} ${s * 0.5} ${s * 0.32} q ${s * 0.5} 0 ${s * 0.5} ${-s * 0.4} q 0 ${-s * 0.3} ${-s * 0.34} ${-s * 0.34} q ${-s * 0.6} ${-s * 0.05} ${-s * 0.66} ${s * 0.42} z" fill="#F5F0E6" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${-s * 0.4} ${-s * 0.5} q ${s * 0.24} ${-s * 0.1} ${s * 0.36} ${s * 0.08} q ${-s * 0.2} ${s * 0.12} ${-s * 0.36} ${-s * 0.08} z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="${s * 0.38}" cy="${-s * 0.82}" r="${s * 0.22}" fill="#F5F0E6" stroke="${INK}" stroke-width="2.5"/>
    <path d="M ${s * 0.56} ${-s * 0.84} q ${s * 0.24} ${-s * 0.02} ${s * 0.26} ${s * 0.08} q ${-s * 0.12} ${s * 0.1} ${-s * 0.28} ${s * 0.02} z" fill="#D97B29" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${s * 0.42}" cy="${-s * 0.86}" r="2.2" fill="${INK}"/>
  </g>`;
}

function drawCharacter(c: Character, x: number, h: number, mood: Mood, dir = 1): string {
  const a = c.appearance.toLowerCase();
  if (/terrier|dog/.test(a)) return dog(c, x, GROUND_Y, h * 0.62, mood, dir);
  if (/sheep/.test(a)) return sheep(c, x, GROUND_Y, h * 0.62, dir);
  if (/cat|tabby/.test(a)) return cat(c, x, GROUND_Y, h * 0.6, dir);
  if (/duck/.test(a)) return duck(c, x, GROUND_Y, h * 0.6, dir);
  return kid(c, x, GROUND_Y, h, mood, dir);
}

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

const P = {
  ball: (x: number, y: number, s = 1) =>
    `<circle cx="${x}" cy="${y}" r="${16 * s}" fill="#C0392B" stroke="${INK}" stroke-width="2.5"/><path d="M ${x - 16 * s} ${y} a ${16 * s} ${16 * s} 0 0 1 ${32 * s} 0" fill="none" stroke="#F5F0E6" stroke-width="3"/>`,
  tree: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="-9" y="-105" width="18" height="105" rx="6" fill="#5C3A21"/><circle cx="0" cy="-128" r="52" fill="#2F8F5B"/><circle cx="-40" cy="-102" r="36" fill="#38A268"/><circle cx="40" cy="-104" r="38" fill="#2A8352"/><circle cx="-14" cy="-138" r="6" fill="#C0392B"/><circle cx="26" cy="-118" r="6" fill="#C0392B"/></g>`,
  hedge: (x: number, y: number, w: number) =>
    `<g fill="#2F8F5B" stroke="${INK}" stroke-width="2"><rect x="${x}" y="${y - 44}" width="${w}" height="44" rx="20"/></g><circle cx="${x + 24}" cy="${y - 44}" r="14" fill="#38A268"/><circle cx="${x + w / 2}" cy="${y - 50}" r="16" fill="#38A268"/><circle cx="${x + w - 24}" cy="${y - 44}" r="14" fill="#38A268"/>`,
  flowers: (x: number, y: number, r: () => number, n = 4) =>
    Array.from({ length: n }, (_, i) => {
      const fx = x + i * 46 + r() * 18;
      const col = ['#D66BA0', '#F2B33D', '#C0392B', '#6B4FA0'][i % 4];
      return `<g transform="translate(${fx},${y})"><line x1="0" y1="0" x2="0" y2="-20" stroke="#1E7A4B" stroke-width="3.5"/><circle cx="0" cy="-27" r="8" fill="${col}" stroke="${INK}" stroke-width="1.8"/><circle cx="0" cy="-27" r="3" fill="#FFF3DE"/></g>`;
    }).join(''),
  toybox: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><rect x="-38" y="-46" width="76" height="46" rx="6" fill="#B98A4F" stroke="${INK}" stroke-width="2.5"/><rect x="-42" y="-56" width="84" height="14" rx="5" fill="#96703F" stroke="${INK}" stroke-width="2.5"/><circle cx="0" cy="-30" r="5" fill="#F2B33D"/></g>`,
  barn: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="-60" y="-72" width="120" height="72" fill="#C0574F" stroke="${INK}" stroke-width="2.5"/><path d="M -68 -72 L 0 -112 L 68 -72 z" fill="#8E2B25" stroke="${INK}" stroke-width="2.5"/><rect x="-16" y="-46" width="32" height="46" fill="#5C3A21" stroke="${INK}" stroke-width="2"/><path d="M -16 -46 l 32 46 M 16 -46 l -32 46" stroke="#F5F0E6" stroke-width="2.5"/></g>`,
  fence: (x: number, y: number, w: number, open = false) => {
    const posts = Math.floor(w / 34);
    let out = '';
    for (let i = 0; i <= posts; i++) out += `<rect x="${x + i * 34}" y="${y - 34}" width="7" height="34" rx="2" fill="#B98A4F" stroke="${INK}" stroke-width="1.6"/>`;
    out += `<rect x="${x}" y="${y - 28}" width="${w}" height="6" fill="#B98A4F" stroke="${INK}" stroke-width="1.4"/>`;
    if (open) out += `<rect x="${x + w + 4}" y="${y - 34}" width="7" height="34" rx="2" transform="rotate(24 ${x + w + 4} ${y})" fill="#B98A4F" stroke="${INK}" stroke-width="1.6"/>`;
    return out;
  },
  hills: (r: () => number) =>
    `<ellipse cx="${170 + r() * 60}" cy="${GROUND_Y - 52}" rx="300" ry="92" fill="#9CC7A5"/><ellipse cx="${650 + r() * 40}" cy="${GROUND_Y - 44}" rx="320" ry="98" fill="#8ABC96"/>`,
  nest: (x: number, y: number, withEgg: boolean) =>
    `<g transform="translate(${x},${y})"><ellipse cx="0" cy="-8" rx="34" ry="14" fill="#B98A4F" stroke="${INK}" stroke-width="2.2"/><path d="M -30 -12 q 30 -12 60 0" fill="none" stroke="#96703F" stroke-width="3"/>${withEgg ? `<ellipse cx="0" cy="-20" rx="11" ry="14" fill="#FFFDF5" stroke="${INK}" stroke-width="2"/>` : ''}</g>`,
  pond: (x: number, y: number, w: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 6}" fill="#7FB6D9" stroke="#5F87A8" stroke-width="2"/><ellipse cx="${x - w / 5}" cy="${y - 3}" rx="${w / 9}" ry="${w / 26}" fill="#A5CDE6"/>`,
  window: (x: number, y: number, rain: boolean) =>
    `<g transform="translate(${x},${y})"><rect x="-52" y="-72" width="104" height="86" rx="7" fill="#BFE0F0" stroke="${INK}" stroke-width="3"/><line x1="0" y1="-72" x2="0" y2="14" stroke="${INK}" stroke-width="3"/><line x1="-52" y1="-29" x2="52" y2="-29" stroke="${INK}" stroke-width="3"/>${rain ? `<g stroke="#5F87A8" stroke-width="2" opacity=".8"><line x1="-34" y1="-62" x2="-40" y2="-46"/><line x1="-6" y1="-56" x2="-12" y2="-40"/><line x1="26" y1="-64" x2="20" y2="-48"/><line x1="36" y1="-20" x2="30" y2="-4"/></g>` : ''}</g>`,
  floorRoom: () =>
    `<rect x="0" y="0" width="800" height="500" fill="#F6EBD8"/><rect x="0" y="${GROUND_Y - 50}" width="800" height="98" fill="#D8B078"/>`,
  table: (x: number, y: number, w: number) =>
    `<g transform="translate(${x},${y})"><rect x="${-w / 2}" y="-64" width="${w}" height="14" rx="5" fill="#B98A4F" stroke="${INK}" stroke-width="2.5"/><rect x="${-w / 2 + 10}" y="-50" width="12" height="50" fill="#96703F"/><rect x="${w / 2 - 22}" y="-50" width="12" height="50" fill="#96703F"/></g>`,
  cake: (x: number, y: number, s = 1, candles = true) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="-30" y="-26" width="60" height="26" rx="6" fill="#E8A9A0" stroke="${INK}" stroke-width="2.2"/><path d="M -30 -26 q 7 8 15 0 q 8 8 15 0 q 8 8 15 0 q 8 8 15 0 l 0 6 l -60 0 z" fill="#FFFDF5"/>${candles ? `<line x1="-12" y1="-26" x2="-12" y2="-40" stroke="#155E86" stroke-width="3"/><line x1="12" y1="-26" x2="12" y2="-40" stroke="#C0392B" stroke-width="3"/><circle cx="-12" cy="-44" r="3.5" fill="#F2B33D"/><circle cx="12" cy="-44" r="3.5" fill="#F2B33D"/>` : ''}</g>`,
  bowl: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><path d="M -26 -18 a 26 20 0 0 0 52 0 z" fill="#155E86" stroke="${INK}" stroke-width="2.2"/><line x1="14" y1="-30" x2="30" y2="-46" stroke="#B98A4F" stroke-width="4" stroke-linecap="round"/></g>`,
  fort: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><rect x="-88" y="-52" width="26" height="52" rx="5" fill="#96703F" stroke="${INK}" stroke-width="2"/><rect x="62" y="-52" width="26" height="52" rx="5" fill="#96703F" stroke="${INK}" stroke-width="2"/><path d="M -92 -50 Q 0 -108 92 -50 L 92 -34 Q 0 -88 -92 -34 z" fill="#D66BA0" stroke="${INK}" stroke-width="2.5"/><circle cx="-40" cy="-64" r="3" fill="#F2B33D"/><circle cx="0" cy="-74" r="3" fill="#F2B33D"/><circle cx="40" cy="-64" r="3" fill="#F2B33D"/></g>`,
  paperBoat: (x: number, y: number, s: number, color: string) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M -30 0 L 30 0 L 16 14 L -16 14 z" fill="${color}" stroke="${INK}" stroke-width="2.2"/><path d="M 0 -26 L 14 0 L -14 0 z" fill="${color}" stroke="${INK}" stroke-width="2.2"/><path d="M 0 -26 L 0 0" stroke="${INK}" stroke-width="1.6"/></g>`,
  stream: () =>
    `<path d="M 0 ${GROUND_Y - 22} Q 200 ${GROUND_Y - 42} 400 ${GROUND_Y - 18} T 800 ${GROUND_Y - 22} L 800 500 L 0 500 z" fill="#7FB6D9"/><path d="M 70 ${GROUND_Y + 8} q 30 -8 60 0 M 320 ${GROUND_Y + 22} q 30 -8 60 0 M 580 ${GROUND_Y + 6} q 30 -8 60 0" fill="none" stroke="#EAF6FC" stroke-width="4" stroke-linecap="round"/>`,
  planter: (x: number, y: number, sprouts: number) => {
    let green = '';
    for (let i = 0; i < sprouts; i++) {
      const sx = x - 52 + i * (110 / Math.max(1, sprouts - 1) || 1);
      green += `<g transform="translate(${sx},${y - 34})"><line x1="0" y1="0" x2="0" y2="-16" stroke="#1E7A4B" stroke-width="3"/><path d="M 0 -12 q -10 -4 -12 -14 q 12 2 12 14 z M 0 -12 q 10 -4 12 -14 q -12 2 -12 14 z" fill="#2F8F5B"/></g>`;
    }
    return `<g><rect x="${x - 70}" y="${y - 34}" width="140" height="34" rx="5" fill="#96703F" stroke="${INK}" stroke-width="2.5"/><rect x="${x - 62}" y="${y - 30}" width="124" height="10" rx="4" fill="#4A3520"/>${green}</g>`;
  },
  wateringCan: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><rect x="-18" y="-26" width="36" height="26" rx="5" fill="#155E86" stroke="${INK}" stroke-width="2.2"/><path d="M -18 -20 l -16 -8 l 2 6 l 14 8 z" fill="#155E86" stroke="${INK}" stroke-width="1.8"/><path d="M 18 -22 q 14 -2 14 10" fill="none" stroke="${INK}" stroke-width="2.5"/></g>`,
  candles: (x: number, y: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const cx = x + i * 40;
      return `<g transform="translate(${cx},${y})"><rect x="-5" y="-26" width="10" height="26" rx="3" fill="#F5F0E6" stroke="${INK}" stroke-width="1.8"/><ellipse cx="0" cy="-32" rx="4.5" ry="7" fill="#F2B33D"/><circle cx="0" cy="-31" r="1.8" fill="#FFF3DE"/></g>`;
    }).join(''),
  torchGlow: (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="60" fill="#F2B33D" opacity=".18"/><circle cx="${x}" cy="${y}" r="34" fill="#F2B33D" opacity=".25"/><rect x="${x - 7}" y="${y - 8}" width="14" height="26" rx="4" fill="#707A85" stroke="${INK}" stroke-width="2"/><ellipse cx="${x}" cy="${y - 12}" rx="8" ry="6" fill="#F2B33D"/>`,
  snowman: (x: number, y: number, hat: boolean) =>
    `<g transform="translate(${x},${y})"><circle cx="0" cy="-26" r="26" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><circle cx="0" cy="-64" r="19" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><circle cx="-6" cy="-68" r="2.2" fill="${INK}"/><circle cx="6" cy="-68" r="2.2" fill="${INK}"/><path d="M 0 -63 l 10 3 l -10 3 z" fill="#D97B29"/>${hat ? `<path d="M -14 -80 l 28 0 l -4 -18 l -20 0 z" fill="#F2B33D" stroke="#C98A16" stroke-width="1.6"/>` : ''}</g>`,
  sled: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M -34 -8 L 34 -8 L 34 -2 Q 44 -2 44 -12" fill="none" stroke="#C0392B" stroke-width="5" stroke-linecap="round"/><line x1="-24" y1="-8" x2="-24" y2="-16" stroke="#C0392B" stroke-width="4"/><line x1="24" y1="-8" x2="24" y2="-16" stroke="#C0392B" stroke-width="4"/><rect x="-32" y="-22" width="64" height="8" rx="4" fill="#D97B29" stroke="${INK}" stroke-width="1.8"/></g>`,
  shovel: (x: number, y: number, angle = -18) =>
    `<g transform="translate(${x},${y}) rotate(${angle})"><line x1="0" y1="0" x2="0" y2="-52" stroke="#96703F" stroke-width="4.5" stroke-linecap="round"/><path d="M -9 0 q 9 14 18 0 l 0 -8 l -18 0 z" fill="#707A85" stroke="${INK}" stroke-width="2"/><path d="M -6 -52 l 12 0" stroke="#96703F" stroke-width="4.5" stroke-linecap="round"/></g>`,
  bunting: () =>
    `<path d="M 0 40 Q 400 90 800 40" fill="none" stroke="${INK}" stroke-width="2"/>` +
    Array.from({ length: 9 }, (_, i) => {
      const t = (i + 0.5) / 9;
      const bx = t * 800;
      const by = 40 + Math.sin(Math.PI * t) * 48;
      const col = ['#F2B33D', '#155E86', '#C0392B', '#1E7A4B', '#D66BA0'][i % 5];
      return `<path d="M ${bx - 11} ${by} l 22 0 l -11 20 z" fill="${col}" stroke="${INK}" stroke-width="1.4"/>`;
    }).join(''),
  stars: (r: () => number, n: number) =>
    Array.from({ length: n }, () => {
      const x = 50 + r() * 700;
      const y = 36 + r() * 190;
      const s = 9 + r() * 11;
      return `<path transform="translate(${x},${y}) scale(${s / 20})" d="M0,-20 L5.9,-6.2 L19,-6.2 L8.9,2.4 L12.4,16.2 L0,8.2 L-12.4,16.2 L-8.9,2.4 L-19,-6.2 L-5.9,-6.2 Z" fill="#F2B33D" stroke="#C98A16" stroke-width="1.5"/>`;
    }).join(''),
  sun: (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="38" fill="#F7CE68"/><g stroke="#F7CE68" stroke-width="5" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${x + Math.cos(a) * 48}" y1="${y + Math.sin(a) * 48}" x2="${x + Math.cos(a) * 60}" y2="${y + Math.sin(a) * 60}"/>`; }).join('')}</g>`,
  moon: (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="34" fill="#F5EFD8"/><circle cx="${x - 13}" cy="${y - 7}" r="30" fill="#31486B"/>`,
  cloud: (x: number, y: number, s = 1) =>
    `<g opacity=".92" transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="0" rx="50" ry="19" fill="#FFFFFF"/><ellipse cx="32" cy="-9" rx="32" ry="15" fill="#FFFFFF"/><ellipse cx="-30" cy="-6" rx="26" ry="13" fill="#FFFFFF"/></g>`,
  rain: (r: () => number, n = 26) =>
    Array.from({ length: n }, () => {
      const x = r() * 800;
      const y = r() * 320;
      return `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 20}" stroke="#5F87A8" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
    }).join(''),
  snowflakes: (r: () => number, n = 16) =>
    Array.from({ length: n }, () => `<circle cx="${r() * 800}" cy="${r() * 340}" r="${2 + r() * 3}" fill="#FFFFFF" opacity=".9"/>`).join(''),
  rocks: (x: number, y: number) =>
    `<g fill="#8B97A3" stroke="${INK}" stroke-width="2.2"><ellipse cx="${x}" cy="${y}" rx="30" ry="18"/><ellipse cx="${x + 40}" cy="${y + 6}" rx="22" ry="13"/><ellipse cx="${x - 36}" cy="${y + 8}" rx="18" ry="11"/></g>`,
  banner: (x: number, y: number, text: string) =>
    `<g transform="translate(${x},${y})"><rect x="-120" y="-22" width="240" height="34" rx="8" fill="#FFFDF5" stroke="${INK}" stroke-width="2.5"/><text x="0" y="1" text-anchor="middle" font-family="Verdana" font-size="15" font-weight="bold" fill="${INK}">${esc(text)}</text></g>`,
  heart: (x: number, y: number, s = 1) =>
    `<path transform="translate(${x},${y}) scale(${s})" d="M 0 8 C -22 -10 -12 -28 0 -16 C 12 -28 22 -10 0 8 z" fill="#D66BA0" stroke="${INK}" stroke-width="2"/>`,
  egg: (x: number, y: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="#FFFDF5" stroke="${INK}" stroke-width="2.2"/>`,
  door: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><rect x="-34" y="-96" width="68" height="96" rx="6" fill="#96703F" stroke="${INK}" stroke-width="2.5"/><circle cx="20" cy="-48" r="4" fill="#F2B33D"/></g>`,
  sofa: (x: number, y: number) =>
    `<g transform="translate(${x},${y})"><rect x="-84" y="-56" width="168" height="34" rx="14" fill="#8FB0D6" stroke="${INK}" stroke-width="2.5"/><rect x="-92" y="-40" width="184" height="40" rx="14" fill="#7A9CC4" stroke="${INK}" stroke-width="2.5"/></g>`,
};

/* ------------------------------------------------------------------ */
/* Scene composition                                                  */
/* ------------------------------------------------------------------ */

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'quiz' }
  | { kind: 'wall' }
  | { kind: 'star' }
  | { kind: 'credit' };

function has(text: string, re: RegExp): boolean {
  return re.test(text);
}

export function sceneSvg(book: Book, screen: Screen): string {
  const page = screen.kind === 'page' ? book.pages[screen.index] : null;
  const mood: Mood =
    page?.illustration.mood ??
    (screen.kind === 'cover' ? 'happy' : screen.kind === 'star' || screen.kind === 'wall' ? 'proud' : 'calm');
  const [top, bottom] = SKY[mood];
  const r = rng(`${book.id}:${screen.kind}:${page?.index ?? 0}`);
  const action = (page ? page.illustration.action : '').toLowerCase();
  const setting = (page ? page.illustration.place : book.setting).toLowerCase();
  const ctx = action + ' ' + setting;

  const cast: Character[] = page
    ? book.characters.filter((c) => page.illustration.characterIds.includes(c.id))
    : book.characters;

  const night = has(ctx, /night|dark|storm|dusk|moon/);
  const indoor = has(setting, /kitchen|living room|room|house(?!.*street)/) && !has(ctx, /out|garden|snow|street|hill|park/);
  const snowy = has(ctx, /snow|winter/);
  const rainy = has(ctx, /rain(?!bow)|pour|stream(s)? outside/);
  const watery = has(ctx, /stream|pond|water|sea|boat race|sail/);

  const layers: string[] = [];

  // --- sky & ground ---
  if (indoor) {
    layers.push(P.floorRoom());
  } else {
    layers.push(`<rect width="800" height="500" fill="url(#sky)"/>`);
    layers.push(`<rect x="0" y="${GROUND_Y - 52}" width="800" height="100" fill="${snowy ? '#F4F7FB' : '#A8CBA0'}"/>`);
    if (night) layers.push(`<rect width="800" height="500" fill="#1D3350" opacity=".5"/>`);
  }

  // --- backdrop ---
  if (!indoor) {
    if (night) {
      layers.push(P.moon(672, 86));
      for (let i = 0; i < 9; i++) layers.push(`<circle cx="${40 + r() * 720}" cy="${30 + r() * 150}" r="2" fill="#F5EFD8"/>`);
    } else if (!rainy) {
      layers.push(P.sun(96 + r() * 40, 84 + r() * 24));
    }
    layers.push(P.cloud(180 + r() * 80, 70 + r() * 40, 0.9 + r() * 0.3));
    layers.push(P.cloud(520 + r() * 120, 54 + r() * 50, 0.7 + r() * 0.3));

    if (has(setting, /farm|hill/)) layers.push(P.hills(r));
    if (snowy) layers.push(`<ellipse cx="200" cy="${GROUND_Y - 60}" rx="270" ry="60" fill="#FFFFFF"/><ellipse cx="620" cy="${GROUND_Y - 48}" rx="290" ry="70" fill="#EDF2F9"/>`);
    if (has(setting, /farm/)) layers.push(P.barn(636, GROUND_Y - 30, 0.92));
    if (has(setting, /garden|street/) && !snowy) layers.push(P.flowers(46, GROUND_Y + 12, r, 4));
    if (has(setting, /tree|garden|park|street/)) layers.push(P.tree(104 + r() * 40, GROUND_Y + 4, 1));
    if (has(setting, /school/)) layers.push(P.fence(556, GROUND_Y - 4, 210, false));
    if (watery && has(ctx, /stream|race|sail|boat/)) layers.push(P.stream());
  } else {
    layers.push(P.window(150, 160, rainy || has(ctx, /rain/)));
    if (has(setting, /kitchen/)) layers.push(P.table(600, GROUND_Y, 250));
    if (has(setting, /living/)) layers.push(P.sofa(628, GROUND_Y));
  }

  // --- action props ---
  if (has(ctx, /ball/)) layers.push(P.ball(has(ctx, /hedge|under/) ? 250 : 300 + r() * 60, GROUND_Y - 15, 1));
  if (has(ctx, /hedge/)) layers.push(P.hedge(170, GROUND_Y + 4, 190));
  if (has(ctx, /toy box|box/)) layers.push(P.toybox(266, GROUND_Y));
  if (has(ctx, /gate/) && has(setting, /farm/)) layers.push(P.fence(30, GROUND_Y - 2, 170, has(ctx, /open/)));
  if (has(ctx, /nest/)) layers.push(P.nest(280, GROUND_Y, !has(ctx, /empty|not there/)));
  if (has(ctx, /egg/) && !has(ctx, /nest/)) layers.push(P.egg(300, GROUND_Y - 10));
  if (has(ctx, /pond|trough/)) layers.push(P.pond(230, GROUND_Y - 6, 200));
  if (has(ctx, /cake|icing|batter/)) layers.push(has(ctx, /bowl|stir|mix|whip/) ? P.bowl(300, GROUND_Y - 60) : P.cake(300, GROUND_Y - 62, 1.1, has(ctx, /candle|lit|party/)));
  if (has(ctx, /fort|blanket/)) layers.push(P.fort(270, GROUND_Y));
  if (has(ctx, /paper boat|boats/)) {
    layers.push(P.paperBoat(300, GROUND_Y - 4, 1, '#F2B33D'));
    if (has(ctx, /red boat|two|both|trade|racing/)) layers.push(P.paperBoat(220, GROUND_Y + 8, 0.85, '#C0392B'));
  }
  if (has(ctx, /planter|raised bed|seedling|soil|garden bed|bed sits|bed basks/)) {
    layers.push(P.planter(280, GROUND_Y, has(ctx, /seedling|green things|sprout|overflow|flower/) ? 5 : 0));
  }
  if (has(ctx, /watering can|waters/)) layers.push(P.wateringCan(388, GROUND_Y));
  if (has(ctx, /candle/)) layers.push(P.candles(220, GROUND_Y - 8, 3));
  if (has(ctx, /torch|beam|little light|glow/)) layers.push(P.torchGlow(320, GROUND_Y - 90));
  if (has(ctx, /snowman|snow man/)) layers.push(P.snowman(258, GROUND_Y, has(ctx, /hat/)));
  if (has(ctx, /sled/)) layers.push(P.sled(268, GROUND_Y, 1.1));
  if (has(ctx, /shovel|dig/)) layers.push(P.shovel(350, GROUND_Y - 4));
  if (has(ctx, /rock/)) layers.push(P.rocks(250, GROUND_Y - 10));
  if (has(ctx, /banner/)) layers.push(P.banner(400, 78, 'THE GREAT BOAT RACE'));
  if (has(ctx, /party|birthday|bunting|balloon/) && screen.kind === 'page') layers.push(P.bunting());

  // --- weather on top of backdrop ---
  if (rainy && !indoor) layers.push(P.rain(r));
  if (snowy && has(ctx, /fall|snow/)) layers.push(P.snowflakes(r));

  // --- characters ---
  const n = Math.min(cast.length, 4);
  const figures = cast.slice(0, 4).map((c, i) => {
    const isAnimal = /terrier|dog|sheep|cat|tabby|duck/i.test(c.appearance);
    const baseX = 490 + (i - (n - 1) / 2) * 132 + (r() - 0.5) * 24;
    const h = isAnimal ? 120 : 186 - i * 6;
    const dir = i % 2 === 1 ? -1 : 1;
    return drawCharacter(c, baseX, h, mood, dir);
  });
  layers.push(...figures);

  // --- celebration screens ---
  if (screen.kind === 'star' || screen.kind === 'cover' || screen.kind === 'wall') {
    layers.push(P.stars(r, screen.kind === 'star' ? 8 : 5));
    if (screen.kind !== 'cover') layers.push(P.bunting());
  }
  if (screen.kind === 'credit') layers.push(P.heart(400, 120, 2.2));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="${esc(page ? page.illustration.action : book.title)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  ${layers.join('\n  ')}
</svg>`;
}
