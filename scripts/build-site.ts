/**
 * Build the static showcase site (GitHub Pages) into docs/.
 *
 *   npx tsx scripts/build-site.ts
 *
 * The Next.js app needs a server (Prisma, auth, Claude generation), so Pages
 * hosts the product's proof instead: the ten starter stories readable in the
 * real reader design, and a "make her book" flow that personalises any story
 * template — name, look, palette — entirely in the browser.
 *
 * Honesty mechanism: scripts/client-lib.ts is esbuild-bundled into the page,
 * so the browser draws scenes with the app's own `sceneSvg` and measures every
 * book — including ones a visitor just made — with the app's own `checkDraft`.
 * A personalised book's level check is computed, not asserted: swapping the
 * hero's name keeps a book in level because names always count as known
 * words, and the site proves that per book instead of claiming it.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildSync } from 'esbuild';
import { STORIES } from '../src/data/stories';
import { LEVELS, LEVEL_ORDER, type LevelId } from '../src/lib/levels';
import { CREDIT } from '../src/lib/credit';

const OUT = join(__dirname, '..', 'docs');

// The app slice that runs in the browser: sceneSvg, checkDraft, LEVELS.
const lib = buildSync({
  entryPoints: [join(__dirname, 'client-lib.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'GSB',
  write: false,
  target: 'es2020',
}).outputFiles[0].text;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const levelCards = LEVEL_ORDER.map((id) => {
  const l = LEVELS[id];
  return `<div class="lv"><h3>${esc(l.label)}</h3><p class="band">${l.minWords}–${l.maxWords} words</p><p>${esc(l.description)}</p></div>`;
}).join('');

const libraryCards = STORIES.map(
  (b) => `
    <a class="card" href="#/book/${b.id}" aria-label="Read ${esc(b.title)}">
      <div class="cover" data-cover="${b.id}"></div>
      <div class="meta">
        <span class="lvl">${esc(LEVELS[b.levelId as LevelId].label)}</span>
        <strong>${esc(b.title)}</strong>
        <span class="sub">${esc(b.subtitle)}</span>
        <span class="pass">✓ Level check passed</span>
      </div>
    </a>`,
).join('');

const storyPicks = STORIES.map(
  (b) => `
    <button type="button" class="pick" data-pick="${b.id}">
      <span class="lvl">${esc(LEVELS[b.levelId as LevelId].label)}</span>
      <strong>${esc(b.title)}</strong>
      <span class="sub">${esc(b.subtitle)}</span>
    </button>`,
).join('');

const SKINS = ['#F5D6B8', '#F0C8A0', '#E0B08A', '#C68863', '#8D5B3F', '#5C3A21'];
const HAIRS = ['#1E1611', '#4A3520', '#B5471D', '#D9A441', '#707A85', '#141210'];
const SHIRTS = ['#F2B33D', '#155E86', '#1E7A4B', '#D66BA0', '#C0392B', '#6B4FA0', '#2A9D8F', '#D97B29'];

const swatches = (name: string, colors: string[], checkedIndex: number) =>
  colors
    .map(
      (c, i) =>
        `<label class="sw"><input type="radio" name="${name}" value="${c}"${i === checkedIndex ? ' checked' : ''}><span style="background:${c}"></span></label>`,
    )
    .join('');

/* The reader/builder script. String.raw + no ${} inside: client code uses
   concatenation only, so this file's template literal stays inert. */
const script = String.raw`
const BOOKS = __BOOKS__;
const CREDIT = __CREDIT__;
const LKEY = 'gsb-books';

const $ = (id) => document.getElementById(id);
const mine = () => { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch { return []; } };
const saveMine = (list) => { try { localStorage.setItem(LKEY, JSON.stringify(list)); } catch {} };
const findBook = (id) => BOOKS.find((b) => b.id === id) || mine().find((b) => b.id === id);
const levelLabel = (b) => GSB.LEVELS[b.levelId].label;
const heroName = (b) => b.characters[0].name;

let book = null, at = 0;

/* ------- speech: nothing autoplays; the button and the word are the consent ------- */
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  voice = vs.find((v) => /child|kid|junior/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, onend) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 0.85;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}

/* ---------------- covers ---------------- */
function drawCovers() {
  document.querySelectorAll('[data-cover]').forEach((el) => {
    const b = findBook(el.dataset.cover);
    if (b) el.innerHTML = GSB.sceneSvg(b, { kind: 'cover' });
  });
}

/* ---------------- the level check, computed live ---------------- */
function checkOf(b) {
  const names = b.characters.map((c) => c.name);
  return GSB.checkDraft(b, b.levelId, names);
}
function rowsFor(b, report) {
  const level = GSB.getLevel(b.levelId);
  const stats = report.stats;
  const pct = (n) => Math.round(n * 100) + '%';
  const worst = stats.newWords.length ? Math.min.apply(null, stats.newWords.map((w) => w.count)) : 0;
  const refrains = Object.keys(stats.refrainCounts).map((k) => stats.refrainCounts[k]);
  return [
    { name: 'Sentence length', why: 'Every sentence inside ' + level.minWords + '–' + level.maxWords + ' words. The limit is not an average.', value: 'longest ' + stats.longestSentence, ok: stats.longestSentence <= level.maxWords },
    { name: 'One idea per page', why: 'Up to ' + level.sentencesPerPage + ' sentence' + (level.sentencesPerPage > 1 ? 's' : '') + ' a page at this level.', value: stats.pages + ' pages', ok: !report.issues.some((i) => i.kind === 'too-many-sentences') },
    { name: 'Known sight words', why: 'Floor for this level is ' + pct(level.minSightWordRatio) + '.', value: pct(stats.sightWordRatio), ok: stats.sightWordRatio >= level.minSightWordRatio },
    { name: 'New words', why: 'A book is not a vocabulary dump. Cap is ' + level.maxNewWords + '.', value: stats.newWords.length + ' of ' + level.maxNewWords, ok: stats.newWords.length <= level.maxNewWords },
    { name: 'Each new word repeats', why: 'Minimum ' + level.minRepeatsPerNewWord + ' times, so it gets learned rather than met once.', value: stats.newWords.length ? 'lowest ×' + worst : '—', ok: stats.underRepeatedNewWords.length === 0 },
    { name: 'Refrains word for word', why: level.refrainCount + ' refrain' + (level.refrainCount > 1 ? 's' : '') + ' × ' + level.refrainRepeats + ', unchanged.', value: refrains.length ? refrains.map((c) => '×' + c).join(' · ') : '—', ok: refrains.every((c) => c >= level.refrainRepeats) },
  ];
}

/* ---------------- reader ---------------- */
function screensOf(b) {
  const list = [{ kind: 'cover' }];
  b.pages.forEach((_, index) => list.push({ kind: 'page', index }));
  if (b.quiz.length) list.push({ kind: 'quiz' });
  if (b.wordWall.length) list.push({ kind: 'wall' });
  list.push({ kind: 'star' });
  list.push({ kind: 'credit' });
  return list;
}

function openBook(id) {
  book = findBook(id);
  if (!book) return route('');
  at = 0;
  $('reader').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('r-title').textContent = book.title;
  render();
}
function closeBook() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  $('reader').classList.remove('open');
  document.body.style.overflow = '';
  if (location.hash.startsWith('#/book/')) history.pushState('', '', '#library');
  book = null;
}

function pageLabel(s) {
  if (s.kind === 'cover') return 'Cover';
  if (s.kind === 'page') return 'Page ' + (s.index + 1) + ' of ' + book.pages.length;
  if (s.kind === 'quiz') return 'Quiz';
  if (s.kind === 'wall') return 'Word wall';
  if (s.kind === 'star') return 'The end';
  return 'About this book';
}

function words(text) {
  return text.split(/\s+/).map((w) =>
    '<span class="w" data-w="' + w.replace(/[^\w’']/g, '') + '">' + w + '</span>'
  ).join(' ');
}

function render() {
  const list = screensOf(book);
  const s = list[at];
  $('r-bar').style.width = Math.round((at / (list.length - 1)) * 100) + '%';
  $('r-where').textContent = pageLabel(s);
  $('r-where2').textContent = pageLabel(s);
  $('r-prev').disabled = at === 0;
  $('r-next').disabled = at === list.length - 1;
  $('r-scene').innerHTML = GSB.sceneSvg(book, s);
  $('r-say').style.display = (s.kind === 'cover' || s.kind === 'page') ? 'flex' : 'none';
  $('r-say').classList.remove('on');

  const w = $('r-words');
  if (s.kind === 'cover') {
    w.innerHTML = '<div class="rtitle">' + book.title + '</div><div class="rsub">' + book.subtitle + '</div>';
  } else if (s.kind === 'page') {
    const p = book.pages[s.index];
    w.innerHTML = (p.refrain ? '<span class="refrain">Say it again!</span>' : '') +
      '<div class="sentence">' + words(p.text) + '</div>';
  } else if (s.kind === 'quiz') {
    renderQuiz(0);
    return;
  } else if (s.kind === 'wall') {
    w.innerHTML = '<div class="rtitle" style="font-size:clamp(24px,3vw,38px);margin-bottom:22px">Words you read</div>' +
      '<div class="wall">' + book.wordWall.map((x) => '<button data-w="' + x + '">' + x + '</button>').join('') + '</div>';
  } else if (s.kind === 'star') {
    w.innerHTML = '<div class="star-big">⭐</div><div class="sentence">You read it, ' + heroName(book) + '!</div>' +
      '<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">' +
      '<button class="again" id="r-again">Read it again</button></div>';
  } else {
    w.innerHTML = '<div class="credit">' +
      '<div class="star-big" style="font-size:56px">💛</div>' +
      '<p>' + CREDIT.blurb + '</p><p><b>' + CREDIT.ask + '</b></p>' +
      '<a class="don" href="' + CREDIT.donateUrl + '" target="_blank" rel="noopener">Donate</a>' +
      '<p class="small">' + CREDIT.charityNumber + '</p></div>';
  }
}

function renderQuiz(qi) {
  const w = $('r-words');
  const q = book.quiz[qi];
  if (!q) { at++; render(); return; }
  w.innerHTML = '<div class="quiz"><h2>' + q.question + '</h2>' +
    q.options.map((o, i) => '<button data-i="' + i + '">' + o + '</button>').join('') + '</div>';
  w.querySelectorAll('.quiz button').forEach((btn) => {
    btn.onclick = () => {
      if (Number(btn.dataset.i) === q.answerIndex) {
        btn.classList.add('yes');
        speak(q.options[q.answerIndex] + '. Yes!');
        setTimeout(() => renderQuiz(qi + 1), 900);
      } else {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 350);
      }
    };
  });
}

$('r-words').addEventListener('click', (e) => {
  const t = e.target;
  if (t.id === 'r-again') { at = 0; render(); return; }
  const wd = t.dataset && t.dataset.w;
  if (!wd) return;
  document.querySelectorAll('.w.lit, .wall .lit').forEach((el) => el.classList.remove('lit'));
  t.classList.add('lit');
  speak(wd, () => t.classList.remove('lit'));
});

$('r-say').onclick = () => {
  const s = screensOf(book)[at];
  const text = s.kind === 'cover' ? book.title : book.pages[s.index].text;
  $('r-say').classList.add('on');
  speak(text, () => $('r-say').classList.remove('on'));
};
$('r-prev').onclick = () => { if (at > 0) { if ('speechSynthesis' in window) speechSynthesis.cancel(); at--; render(); } };
$('r-next').onclick = () => { if (book && at < screensOf(book).length - 1) { if ('speechSynthesis' in window) speechSynthesis.cancel(); at++; render(); } };
$('r-close').onclick = closeBook;
document.addEventListener('keydown', (e) => {
  if (!book) return;
  if (e.key === 'ArrowRight') $('r-next').click();
  if (e.key === 'ArrowLeft') $('r-prev').click();
  if (e.key === 'Escape') closeBook();
});

$('r-lc').onclick = () => {
  const report = checkOf(book);
  $('lc-level').textContent = levelLabel(book) + (book.id.indexOf('custom-') === 0 ? ' · made for ' + heroName(book) : '');
  $('lc-badge').className = 'badge' + (report.ok ? '' : ' bad');
  $('lc-badge').innerHTML = '<span class="t">' + (report.ok ? '✓' : '!') + '</span> ' + (report.ok ? 'Every check passed' : 'It missed');
  $('lc-rows').innerHTML = rowsFor(book, report).map((r) =>
    '<li><span class="t" style="background:' + (r.ok ? 'var(--leaf)' : 'var(--gold-deep)') + '">' + (r.ok ? '✓' : '!') + '</span>' +
    '<div><b>' + r.name + '</b><span>' + r.why + '</span></div><span class="v">' + r.value + '</span></li>'
  ).join('');
  $('lcheck').classList.add('open');
};
$('lc-close').onclick = () => $('lcheck').classList.remove('open');
$('lcheck').onclick = (e) => { if (e.target.id === 'lcheck') $('lcheck').classList.remove('open'); };

/* ---------------- the builder ---------------- */
let pickedTemplate = null;

function chosen(name) {
  const el = document.querySelector('input[name="' + name + '"]:checked');
  return el ? el.value : null;
}

function builderName() {
  const raw = $('b-name').value.trim();
  if (!/^[A-Za-z]{2,12}$/.test(raw)) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function refreshBuilder() {
  const name = builderName();
  const btn = $('b-make');
  btn.textContent = name ? 'Make ' + name + '’s book' : 'Make her book';
  const clash = name && pickedTemplate &&
    pickedTemplate.characters.slice(1).some((c) => c.name.toLowerCase() === name.toLowerCase());
  $('b-hint').textContent =
    clash ? 'That name belongs to another character in this story — pick a different story or spell it another way.'
    : !name && $('b-name').value ? 'First name only, letters only — her name is always a sight word, so one word keeps every page in level.'
    : pickedTemplate ? '' : 'Pick a story below.';
  btn.disabled = !(name && pickedTemplate && !clash);
  drawPreview();
}

function drawPreview() {
  const name = builderName() || 'Her';
  if (!pickedTemplate) { $('b-preview').innerHTML = ''; return; }
  const b = personalise(pickedTemplate, name);
  $('b-preview').innerHTML = GSB.sceneSvg(b, { kind: 'cover' });
  $('b-preview-t').textContent = b.title;
}

function personalise(tpl, name) {
  const b = JSON.parse(JSON.stringify(tpl));
  const old = b.characters[0].name;
  const re = new RegExp('\\b' + old + '\\b', 'g');
  const swap = (t) => t.replace(re, name);
  b.id = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  b.title = swap(b.title);
  b.subtitle = swap(b.subtitle);
  b.refrains = b.refrains.map(swap);
  b.pages.forEach((p) => { p.text = swap(p.text); p.illustration.action = swap(p.illustration.action); });
  b.quiz.forEach((q) => { q.question = swap(q.question); q.options = q.options.map(swap); });
  b.characters[0].name = name;
  const skin = chosen('skin'), hair = chosen('hair'), shirt = chosen('shirt');
  if (skin) b.characters[0].palette.skin = skin;
  if (hair) b.characters[0].palette.hair = hair;
  if (shirt) b.characters[0].palette.primary = shirt;
  b.characters[0].appearance = name + ', a young reader with their favourite ' + (shirt || '') + ' top — drawn from this exact palette on every page.';
  b.createdAt = new Date().toISOString();
  return b;
}

function renderMine() {
  const list = mine();
  $('mine').style.display = list.length ? '' : 'none';
  $('mine-grid').innerHTML = list.map((b) =>
    '<a class="card" href="#/book/' + b.id + '">' +
    '<div class="cover" data-cover="' + b.id + '"></div>' +
    '<div class="meta"><span class="lvl">' + levelLabel(b) + ' · made here</span>' +
    '<strong>' + b.title + '</strong><span class="sub">' + b.subtitle + '</span>' +
    '<span class="pass">✓ Level check passed</span></div>' +
    '<button class="del" data-del="' + b.id + '" aria-label="Remove this book">×</button></a>'
  ).join('');
  drawCovers();
}

$('mine-grid').addEventListener('click', (e) => {
  const id = e.target.dataset && e.target.dataset.del;
  if (!id) return;
  e.preventDefault();
  saveMine(mine().filter((b) => b.id !== id));
  renderMine();
});

document.querySelectorAll('.pick').forEach((el) => {
  el.onclick = () => {
    document.querySelectorAll('.pick.on').forEach((p) => p.classList.remove('on'));
    el.classList.add('on');
    pickedTemplate = BOOKS.find((b) => b.id === el.dataset.pick);
    refreshBuilder();
  };
});
$('b-name').addEventListener('input', refreshBuilder);
document.querySelectorAll('.sw input').forEach((el) => el.addEventListener('change', refreshBuilder));

$('b-make').onclick = () => {
  const name = builderName();
  if (!name || !pickedTemplate) return;
  const b = personalise(pickedTemplate, name);
  const report = checkOf(b);
  if (!report.ok) {
    // Should be impossible (names are always known words) — but if it ever
    // happens, refuse to pretend: say so instead of shipping a bad book.
    $('b-hint').textContent = 'Something about this name knocked the story out of level — try another.';
    return;
  }
  const list = mine();
  list.unshift(b);
  saveMine(list.slice(0, 20));
  renderMine();
  location.hash = '#/book/' + b.id;
};

/* ---------------- routing ---------------- */
function route(hash) {
  const m = (hash || location.hash).match(/#\/book\/(.+)/);
  if (m) openBook(m[1]);
  else closeBook();
}
window.addEventListener('hashchange', () => route());

drawCovers();
renderMine();
refreshBuilder();
route();
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gold Star Books</title>
<meta name="description" content="Personalised, level-checked reading books for children with Down syndrome. Ten starter stories, free to read — or make one with her name on the cover.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#16283D; --slate:#3C5068; --muted:#6B7C90; --page:#FFFDF5; --sand:#EFE7D6;
    --parchment:#F3E7CB; --line:#E2D7BF; --gold:#F2B33D; --gold-deep:#C98A16;
    --sea:#155E86; --sea-deep:#0C3B5C; --leaf:#1E7A4B;
  }
  *{box-sizing:border-box;margin:0}
  body{background:var(--sand);color:var(--ink);font-family:'Familjen Grotesk',system-ui,sans-serif;line-height:1.5}
  .display{font-family:Newsreader,Georgia,serif;font-weight:500}
  a{color:inherit;text-decoration:none}
  button{font:inherit;cursor:pointer;border:0}

  .hero{background:var(--page);padding:64px 24px 72px}
  .hero-in{max-width:1100px;margin:0 auto;display:grid;gap:48px;grid-template-columns:1.1fr .9fr;align-items:center}
  @media(max-width:860px){.hero-in{grid-template-columns:1fr}}
  .chip{display:inline-block;background:var(--parchment);color:var(--gold-deep);font-weight:600;font-size:13px;border-radius:999px;padding:7px 14px}
  .hero h1{font-size:clamp(34px,5vw,54px);line-height:1.08;margin:18px 0}
  .hero p.lead{color:var(--slate);font-size:18px;max-width:34em}
  .cta{display:inline-block;background:var(--sea);color:var(--page);font-weight:600;border-radius:12px;padding:15px 26px;margin-top:26px}
  .cta.ghost{background:transparent;color:var(--ink);border:1.5px solid #C9BDA3;margin-left:10px}
  .fine{color:var(--muted);font-size:14px;margin-top:18px}
  .hero-card{background:var(--parchment);border-radius:20px;padding:24px;box-shadow:0 24px 50px -28px rgba(22,40,61,.45);position:relative}
  .hero-card .cover{border-radius:12px;overflow:hidden}
  .cover svg{display:block;width:100%;height:auto}
  .hero-card .t{font-family:Verdana,sans-serif;font-weight:700;font-size:22px;letter-spacing:.02em;margin:18px 0 6px}
  .hero-card .s{color:var(--muted);font-size:14px;margin-bottom:34px}
  .proof{position:absolute;left:-20px;bottom:-18px;background:var(--page);border-radius:16px;padding:14px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 14px 30px -18px rgba(22,40,61,.5)}
  .proof .tick{width:34px;height:34px;border-radius:50%;background:var(--leaf);color:#fff;display:grid;place-items:center;font-weight:700;font-size:17px}
  .proof b{display:block;font-size:14px}
  .proof span{font-size:12px;color:var(--muted)}

  section.wrap{max-width:1100px;margin:0 auto;padding:64px 24px 8px}
  section.wrap>h2{font-size:clamp(26px,3.4vw,36px);margin-bottom:14px}
  section.wrap>p.sub{color:var(--slate);max-width:44em;margin-bottom:28px}

  .pillars{display:grid;gap:18px;grid-template-columns:repeat(3,1fr)}
  @media(max-width:760px){.pillars{grid-template-columns:1fr}}
  .pillar{background:var(--page);border-radius:18px;padding:26px}
  .pillar .n{width:38px;height:38px;border-radius:10px;background:var(--parchment);color:var(--gold-deep);display:grid;place-items:center;font-weight:700;margin-bottom:16px}
  .pillar h3{font-size:17.5px;margin-bottom:8px}
  .pillar p{font-size:15px;color:var(--slate)}

  .levels{background:var(--ink);border-radius:22px;padding:34px;color:var(--page)}
  .levels h2{color:var(--page)}
  .levels .grid{display:grid;gap:14px;grid-template-columns:repeat(4,1fr);margin-top:24px}
  @media(max-width:860px){.levels .grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){.levels .grid{grid-template-columns:1fr}}
  .lv{background:rgba(255,253,245,.06);border:1px solid rgba(255,253,245,.14);border-radius:14px;padding:18px}
  .lv h3{font-size:17px;margin-bottom:6px}
  .lv .band{font-family:Verdana,sans-serif;font-size:12.5px;color:var(--gold);letter-spacing:.02em;margin-bottom:10px}
  .lv p{font-size:14px;color:rgba(255,253,245,.72)}

  .lib{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px;padding-bottom:24px}
  .card{background:var(--page);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:box-shadow .15s,transform .15s;position:relative}
  .card:hover{box-shadow:0 18px 36px -20px rgba(22,40,61,.45);transform:translateY(-2px)}
  .card .meta{padding:14px 18px 16px;display:grid;gap:3px}
  .card .lvl{font-size:12px;font-weight:600;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em}
  .card strong{font-size:17px}
  .card .sub{font-size:13.5px;color:var(--muted)}
  .card .pass{font-size:12.5px;font-weight:600;color:var(--leaf);margin-top:6px}
  .card .del{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;background:var(--page);border:1px solid var(--line);font-size:18px;line-height:1}
  .card .del:hover{background:#FBE3E1;border-color:#E7A9A5}

  /* builder */
  .builder{background:var(--page);border-radius:22px;padding:34px;display:grid;gap:28px;grid-template-columns:1.15fr .85fr}
  @media(max-width:860px){.builder{grid-template-columns:1fr}}
  .builder h2{font-size:clamp(24px,3vw,32px)}
  .builder .step{margin-top:22px}
  .builder .step>b{display:flex;align-items:center;gap:10px;font-size:16px;margin-bottom:12px}
  .builder .step>b .n{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--page);display:grid;place-items:center;font-size:13px}
  #b-name{width:100%;max-width:340px;border:1.5px solid #C9BDA3;background:#fff;border-radius:12px;padding:13px 16px;font-size:18px;outline:none}
  #b-name:focus{border-color:var(--sea)}
  .swrow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .swrow .lab{width:110px;font-size:13.5px;color:var(--muted)}
  .sw input{position:absolute;opacity:0}
  .sw span{display:block;width:34px;height:34px;border-radius:50%;border:2.5px solid transparent;cursor:pointer}
  .sw input:checked + span{border-color:var(--ink);box-shadow:0 0 0 2px var(--page) inset}
  .picks{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
  @media(max-width:560px){.picks{grid-template-columns:1fr}}
  .pick{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:12px 16px;text-align:left;display:grid;gap:2px}
  .pick:hover{border-color:#C9BDA3}
  .pick.on{border-color:var(--sea);box-shadow:0 0 0 1.5px var(--sea)}
  .pick .lvl{font-size:11px;font-weight:700;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em}
  .pick strong{font-size:15px}
  .pick .sub{font-size:12.5px;color:var(--muted)}
  .bside{display:grid;gap:14px;align-content:start}
  #b-preview{border-radius:14px;overflow:hidden;background:var(--parchment);min-height:120px}
  #b-preview svg{display:block;width:100%;height:auto}
  #b-preview-t{font-family:Verdana,sans-serif;font-weight:700;font-size:18px;min-height:1.4em}
  #b-make{background:var(--sea);color:var(--page);font-weight:600;font-size:17px;border-radius:12px;padding:16px 26px;min-height:56px}
  #b-make:disabled{opacity:.45;cursor:default}
  #b-hint{font-size:13.5px;color:var(--muted);min-height:1.4em}
  .bnote{font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}

  footer{background:var(--ink);color:var(--page);margin-top:72px;padding:40px 24px}
  footer .in{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
  footer p{max-width:44em;font-size:14.5px;color:rgba(255,253,245,.8)}
  footer a.donate{border:1.5px solid var(--gold);color:var(--gold);font-weight:600;border-radius:12px;padding:12px 22px}

  /* reader */
  #reader{position:fixed;inset:0;background:var(--sand);display:none;flex-direction:column;z-index:50}
  #reader.open{display:flex}
  .rtop{background:var(--page);display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid var(--line)}
  .rtop b{font-size:15px}
  .rtop .where{color:var(--muted);font-size:13px}
  .rtop .bar{flex:1;height:6px;border-radius:999px;background:var(--line);overflow:hidden;max-width:280px;margin-left:auto}
  .rtop .bar i{display:block;height:100%;background:var(--gold);width:0%;transition:width .25s}
  .rtop .x{background:transparent;font-size:22px;padding:6px 10px;border-radius:10px}
  .rtop .x:hover{background:var(--sand)}
  .rbody{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0}
  @media(max-width:860px), (orientation:portrait){.rbody{grid-template-columns:1fr;grid-template-rows:auto 1fr}}
  .rscene{background:var(--parchment);display:flex;align-items:center;justify-content:center;padding:28px;min-height:0}
  .rscene svg{max-width:100%;max-height:100%;border-radius:14px;display:block}
  .rtext{background:var(--page);display:flex;flex-direction:column;min-height:0}
  .rwords{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 48px;overflow:auto}
  .rwords .refrain{align-self:flex-start;background:var(--parchment);color:var(--gold-deep);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:5px 12px;margin-bottom:14px}
  .sentence{font-family:Verdana,Tahoma,sans-serif;font-size:clamp(26px,3.4vw,52px);line-height:1.5;font-weight:700}
  .sentence .w{border-radius:8px;padding:0 4px;cursor:pointer}
  .sentence .w:hover{background:var(--parchment)}
  .sentence .w.lit{background:var(--gold);color:var(--ink)}
  .rtitle{font-family:Verdana,sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,56px);line-height:1.25}
  .rsub{color:var(--muted);font-size:18px;margin-top:12px}
  .rctl{display:flex;gap:12px;align-items:center;padding:20px 32px;border-top:1px solid var(--line)}
  .rctl .nav{min-width:72px;min-height:64px;border-radius:14px;font-size:22px;background:var(--sea);color:var(--page)}
  .rctl .nav.back{background:transparent;border:1.5px solid #C9BDA3;color:var(--ink)}
  .rctl .nav:disabled{opacity:.35;cursor:default}
  .rctl .say{min-height:64px;border-radius:14px;background:var(--gold);color:var(--ink);font-weight:700;font-size:16px;padding:0 26px;display:flex;gap:10px;align-items:center}
  .rctl .say.on{background:var(--gold-deep);color:#fff}
  .rctl .where2{margin-left:auto;color:var(--muted);font-size:13px}
  .rctl .lc{background:transparent;border:1.5px solid #C9BDA3;border-radius:14px;min-height:48px;padding:0 16px;font-size:13.5px;font-weight:600}

  .quiz{display:grid;gap:14px;max-width:560px}
  .quiz h2{font-family:Verdana,sans-serif;font-size:clamp(22px,2.6vw,34px);line-height:1.4;margin-bottom:8px}
  .quiz button{background:#fff;border:2px solid var(--line);border-radius:14px;padding:18px 22px;font-family:Verdana,sans-serif;font-size:20px;font-weight:700;text-align:left;min-height:64px}
  .quiz button:hover{border-color:var(--gold)}
  .quiz button.yes{background:#E4F1E8;border-color:var(--leaf)}
  .quiz button.shake{animation:sh .3s}
  @keyframes sh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  .wall{display:flex;flex-wrap:wrap;gap:14px;max-width:600px}
  .wall button{background:#fff;border:2px solid var(--line);border-radius:14px;padding:16px 24px;font-family:Verdana,sans-serif;font-size:24px;font-weight:700;min-height:64px}
  .wall button.lit{background:var(--gold);border-color:var(--gold-deep)}
  .star-big{font-size:96px;line-height:1;margin-bottom:18px}
  .credit{max-width:520px;display:grid;gap:14px}
  .credit p{font-size:17px;line-height:1.6}
  .credit .small{font-size:13px;color:var(--muted)}
  .credit a.don{background:var(--gold);color:var(--ink);font-weight:700;border-radius:12px;padding:14px 24px;justify-self:start}
  .again{background:var(--sea);color:var(--page);font-weight:600;border-radius:12px;padding:14px 24px;justify-self:start}

  #lcheck{position:fixed;inset:0;background:rgba(22,40,61,.5);display:none;align-items:center;justify-content:center;padding:20px;z-index:60}
  #lcheck.open{display:flex}
  .lc-panel{background:var(--page);border-radius:18px;max-width:640px;width:100%;max-height:86vh;overflow:auto;padding:8px 28px 24px}
  .lc-panel header{display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:1px solid #F0E8D6;padding:18px 0}
  .lc-panel h2{font-size:19px}
  .lc-panel .lvl{color:var(--muted);font-size:13.5px}
  .badge{display:flex;gap:10px;align-items:center;border-radius:14px;border:1.5px solid #A9CFB8;background:#E4F1E8;padding:8px 14px;font-size:13.5px;font-weight:700}
  .badge .t{width:26px;height:26px;border-radius:50%;background:var(--leaf);color:#fff;display:grid;place-items:center;font-weight:700}
  .badge.bad{border-color:#E7A9A5;background:#FBE3E1}
  .badge.bad .t{background:#8E2B25}
  .lc-panel ul{list-style:none}
  .lc-panel li{display:flex;gap:14px;align-items:center;border-bottom:1px solid #F0E8D6;padding:14px 0}
  .lc-panel li .t{flex:none;width:26px;height:26px;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:700}
  .lc-panel li div{flex:1}
  .lc-panel li b{display:block;font-size:15px}
  .lc-panel li span{font-size:13.5px;color:var(--muted)}
  .lc-panel li .v{font-family:Verdana,sans-serif;font-size:14px;font-weight:700;color:var(--sea);min-width:100px;text-align:right}
  .lc-close{margin-top:16px;background:var(--sea);color:var(--page);border-radius:10px;padding:10px 20px;font-weight:600}
</style>
</head>
<body>

<div id="home">
  <div class="hero">
    <div class="hero-in">
      <div>
        <span class="chip">Free · ${esc(CREDIT.org)}</span>
        <h1 class="display">A book she can actually read, with her name on the cover.</h1>
        <p class="lead">Personalised reading practice for children with Down syndrome — written at the
        sentence length she reads at today, and measured against that level before you ever see it.</p>
        <a class="cta" href="#builder">Make her book</a>
        <a class="cta ghost" href="#library">Read the starter library</a>
        <p class="fine">Ten finished stories, free to read right here — or put her name on one in about a minute. Every book passes the same level check.</p>
      </div>
      <div class="hero-card">
        <div class="cover" data-cover="${STORIES[0].id}"></div>
        <div class="t">${esc(STORIES[0].title)}</div>
        <div class="s">Level: ${esc(LEVELS[STORIES[0].levelId as LevelId].label)} · ${STORIES[0].pages.length} pages</div>
        <div class="proof"><span class="tick">✓</span><span><b>Level check passed</b><span>every sentence measured</span></span></div>
      </div>
    </div>
  </div>

  <section class="wrap">
    <h2 class="display">Why a shelf book doesn’t fit</h2>
    <p class="sub">Books at the right word level are written for a three-year-old. Books at the right
    interest level have sentences she can’t hold to the end. So the book has to be written for her.</p>
    <div class="pillars">
      <div class="pillar"><span class="n">1</span><h3>Written at her sentence length</h3><p>Not a grade band. Two to fourteen words a page, set by the level you pick, held on every single page.</p></div>
      <div class="pillar"><span class="n">2</span><h3>Measured before you see it</h3><p>Sight-word ratio, new-word count, refrain repeats — all checked, and anything that fails goes back for repair.</p></div>
      <div class="pillar"><span class="n">3</span><h3>She is the one who solves it</h3><p>Her name, her friends, the things she loves. She is the hero, never the child who gets rescued.</p></div>
    </div>
  </section>

  <section class="wrap">
    <div class="levels">
      <h2 class="display">Pick the level she reads at now</h2>
      <div class="grid">${levelCards}</div>
    </div>
  </section>

  <section class="wrap" id="builder">
    <div class="builder">
      <div>
        <h2 class="display">Make her book</h2>
        <p class="sub" style="margin-bottom:0">Her name goes on the cover and into every page, and the book is
        re-measured right here in your browser — a name is always a sight word, so her book passes the
        same checks the original did. Nothing is uploaded; it stays on this device.</p>
        <div class="step"><b><span class="n">1</span>Her first name</b>
          <input id="b-name" type="text" maxlength="12" placeholder="Maya" autocomplete="off">
        </div>
        <div class="step"><b><span class="n">2</span>How she looks</b>
          <div class="swrow"><span class="lab">Skin</span>${swatches('skin', SKINS, 2)}</div>
          <div class="swrow"><span class="lab">Hair</span>${swatches('hair', HAIRS, 0)}</div>
          <div class="swrow"><span class="lab">Favourite colour</span>${swatches('shirt', SHIRTS, 0)}</div>
        </div>
        <div class="step"><b><span class="n">3</span>The story</b>
          <div class="picks">${storyPicks}</div>
        </div>
      </div>
      <div class="bside">
        <div id="b-preview" aria-hidden="true"></div>
        <div id="b-preview-t"></div>
        <button id="b-make" disabled>Make her book</button>
        <p id="b-hint"></p>
        <p class="bnote">In the full app this step writes a brand-new story around her — her friends, her
        dog, the things she loves — with the same measured checks. This page personalises the starter
        stories instead, because it runs with no server at all.</p>
      </div>
    </div>
  </section>

  <section class="wrap" id="mine" style="display:none">
    <h2 class="display">Books made here</h2>
    <p class="sub">Saved on this device only. They open in the same reader, and their level checks are
    computed fresh — tap “Level check” inside any book.</p>
    <div class="lib" id="mine-grid"></div>
  </section>

  <section class="wrap" id="library">
    <h2 class="display">The starter library</h2>
    <p class="sub">Ten stories, two to a level and more where it matters most. Tap any word to hear it.
    Every book ends the same way real ones will: with its level check, open for you to inspect.</p>
    <div class="lib">${libraryCards}</div>
  </section>

  <footer>
    <div class="in">
      <p>${esc(CREDIT.blurb)} ${esc(CREDIT.ask)}<br><span style="opacity:.6;font-size:12.5px">${esc(CREDIT.charityNumber)}</span></p>
      <a class="donate" href="${CREDIT.donateUrl}" target="_blank" rel="noopener">Donate</a>
    </div>
  </footer>
</div>

<div id="reader" role="dialog" aria-label="Book reader">
  <div class="rtop">
    <button class="x" id="r-close" aria-label="Close the book">←</button>
    <b id="r-title"></b><span class="where" id="r-where"></span>
    <div class="bar"><i id="r-bar"></i></div>
  </div>
  <div class="rbody">
    <div class="rscene" id="r-scene"></div>
    <div class="rtext">
      <div class="rwords" id="r-words"></div>
      <div class="rctl">
        <button class="nav back" id="r-prev" aria-label="Back a page">←</button>
        <button class="say" id="r-say"><span>▍▍▍▍</span> Read to me</button>
        <button class="nav" id="r-next" aria-label="Next page">→</button>
        <button class="lc" id="r-lc">Level check</button>
        <span class="where2" id="r-where2"></span>
      </div>
    </div>
  </div>
</div>

<div id="lcheck">
  <div class="lc-panel">
    <header>
      <div><h2>Level check</h2><div class="lvl" id="lc-level"></div></div>
      <span class="badge" id="lc-badge"><span class="t">✓</span> Every check passed</span>
    </header>
    <ul id="lc-rows"></ul>
    <button class="lc-close" id="lc-close">Close</button>
  </div>
</div>

<script>${lib}</script>
<script>
${script
  .replace('__BOOKS__', JSON.stringify(STORIES))
  .replace('__CREDIT__', JSON.stringify(CREDIT))}
</script>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Wrote docs/index.html (${(html.length / 1024).toFixed(0)} KB, ${STORIES.length} templates, lib ${(lib.length / 1024).toFixed(0)} KB)`);
