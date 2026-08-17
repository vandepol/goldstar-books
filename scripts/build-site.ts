/**
 * Build the static showcase site (GitHub Pages) into docs/.
 *
 *   npx tsx scripts/build-site.ts
 *
 * The Next.js app needs a server (Prisma, auth), so Pages hosts the product's
 * proof instead — geared to the people it is for: parents and teachers of
 * children with Down syndrome.
 *
 * - The marketing teaches the evidence base: every strategy rendered from
 *   src/lib/pedagogy.ts with its source, so parents learn the method, not
 *   just the pitch.
 * - A setup questionnaire (name, age, what she reads now, interests) maps to
 *   a level the honest way: by what she does today, never by age.
 * - Ten starter stories readable in the full reader; a make-her-book flow
 *   that personalises any template in the browser; per-book flashcards that
 *   follow the match–select–name routine, printable.
 * - Bring-your-own-key generation: with a parent's Anthropic API key (kept in
 *   their browser), the page runs the app's real prompt, draft schema,
 *   check-and-repair loop and assembly — a brand-new story about what she
 *   loves, measured before she sees it.
 *
 * Honesty mechanism: scripts/client-lib.ts is esbuild-bundled into the page,
 * so the browser draws with the app's own `sceneSvg` and measures every book
 * with the app's own `checkDraft`. Playbook rules are load-bearing: nothing
 * autoplays; the refrain chip reads "You know this one!"; wrong quiz answers
 * get "Try again 🙂", never a buzz; tapped words speak slowly.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildSync } from 'esbuild';
import { STORIES } from '../src/data/stories';
import { LEVELS, LEVEL_ORDER, type LevelId } from '../src/lib/levels';
import { CREDIT } from '../src/lib/credit';
import { STRATEGIES, SOURCES } from '../src/lib/pedagogy';

const OUT = join(__dirname, '..', 'docs');

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

/* ---------------- server-rendered fragments ---------------- */

const levelCards = LEVEL_ORDER.map((id) => {
  const l = LEVELS[id];
  return `<div class="lv"><h3>${esc(l.label)}</h3><p class="band">${l.minWords}–${l.maxWords} words</p><p>${esc(l.description)}</p></div>`;
}).join('');

const levelRadios = LEVEL_ORDER.map((id) => {
  const l = LEVELS[id];
  return `<label class="qlevel"><input type="radio" name="q-level" value="${id}"><span><b>${esc(l.label)}</b> <i>${l.minWords}–${l.maxWords} words a page</i><em>${esc(l.description)}</em></span></label>`;
}).join('');

const libraryCards = STORIES.map(
  (b) => `
    <a class="card" href="#/book/${b.id}" aria-label="Read ${esc(b.title)}" data-level="${b.levelId}">
      <div class="cover" data-cover="${b.id}"></div>
      <div class="meta">
        <span class="lvl">${esc(LEVELS[b.levelId as LevelId].label)}<span class="reclvl" hidden> · her level ★</span></span>
        <strong>${esc(b.title)}</strong>
        <span class="sub">${esc(b.subtitle)}</span>
        <span class="pass">✓ Level check passed</span>
      </div>
    </a>`,
).join('');

const storyPicks = STORIES.map(
  (b) => `
    <button type="button" class="pick" data-pick="${b.id}" data-level="${b.levelId}">
      <span class="lvl">${esc(LEVELS[b.levelId as LevelId].label)}<span class="reclvl" hidden> · her level ★</span></span>
      <strong>${esc(b.title)}</strong>
      <span class="sub">${esc(b.subtitle)}</span>
    </button>`,
).join('');

const strategyCards = STRATEGIES.map(
  (s, i) => `
    <div class="strat">
      <span class="n">${i + 1}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.what)}</p>
      <p class="how"><b>In every book here:</b> ${esc(s.how)}</p>
      <a class="src" href="${s.source.url}" target="_blank" rel="noopener">Source: ${esc(s.source.label)} ↗</a>
    </div>`,
).join('');

const sourceList = SOURCES.map(
  (s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`,
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

const genLevelOptions = LEVEL_ORDER.map(
  (id) => `<option value="${id}">${esc(LEVELS[id].label)} (${LEVELS[id].minWords}–${LEVELS[id].maxWords} words)</option>`,
).join('');

/* The page script. String.raw + no ${} inside — client code concatenates. */
const script = String.raw`
const BOOKS = __BOOKS__;
const CREDIT = __CREDIT__;
const LKEY = 'gsb-books', CKEY = 'gsb-child', KKEY = 'gsb-api-key';

const $ = (id) => document.getElementById(id);
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const mine = () => load(LKEY, []);
const findBook = (id) => BOOKS.find((b) => b.id === id) || mine().find((b) => b.id === id);
const levelLabel = (b) => GSB.LEVELS[b.levelId].label;
const heroName = (b) => b.characters[0].name;

let book = null, at = 0;

/* ------- speech. NOTHING autoplays — the tap is the consent, always. ------- */
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  voice = vs.find((v) => /child|kid|junior/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate, onend) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
const quiet = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };

/* ---------------- covers ---------------- */
function drawCovers() {
  document.querySelectorAll('[data-cover]').forEach((el) => {
    const b = findBook(el.dataset.cover);
    if (b) el.innerHTML = GSB.sceneSvg(b, { kind: 'cover' });
  });
}

/* ---------------- live level check ---------------- */
function checkOf(b) {
  return GSB.checkDraft(b, b.levelId, b.characters.map((c) => c.name));
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
  quiet();
  $('reader').classList.remove('open');
  $('cards').classList.remove('open');
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
    w.innerHTML = (p.refrain ? '<span class="refrain">You know this one!</span>' : '') +
      '<div class="sentence">' + words(p.text) + '</div>';
  } else if (s.kind === 'quiz') {
    renderQuiz(0);
    return;
  } else if (s.kind === 'wall') {
    w.innerHTML = '<div class="rtitle" style="font-size:clamp(24px,3vw,38px);margin-bottom:8px">Words you read</div>' +
      '<p style="color:#6B7C90;font-size:14px;margin-bottom:18px">Every word here appeared at least twice in the story. Tap one to hear it.</p>' +
      '<div class="wall">' + book.wordWall.map((x) => '<button data-w="' + x + '">' + x + '</button>').join('') + '</div>';
  } else if (s.kind === 'star') {
    w.innerHTML = '<div class="star-big">⭐</div><div class="sentence">You read it, ' + heroName(book) + '!</div>' +
      '<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">' +
      '<button class="again" id="r-again">Read it again</button>' +
      '<button class="again ghost" id="r-cards2">Flash cards</button></div>';
  } else {
    w.innerHTML = '<div class="credit">' +
      '<div class="star-big" style="font-size:56px">💛</div>' +
      '<p>' + CREDIT.blurb + '</p><p><b>' + CREDIT.ask + '</b></p>' +
      '<a class="don" href="' + CREDIT.donateUrl + '" target="_blank" rel="noopener">Donate</a>' +
      '<p class="small">' + CREDIT.charityNumber + '</p></div>';
  }
}

/* Errorless quiz: right answers celebrate visually; wrong answers get a calm
   "Try again 🙂". No speech fires on its own — she reads first. */
function renderQuiz(qi) {
  const w = $('r-words');
  const q = book.quiz[qi];
  if (!q) { at++; render(); return; }
  w.innerHTML = '<div class="quiz"><h2>' + q.question + '</h2>' +
    q.options.map((o, i) => '<button data-i="' + i + '">' + o + '</button>').join('') +
    '<p class="qmsg" id="qmsg"></p></div>';
  w.querySelectorAll('.quiz button').forEach((btn) => {
    btn.onclick = () => {
      if (Number(btn.dataset.i) === q.answerIndex) {
        btn.classList.add('yes');
        $('qmsg').textContent = 'Yes! Well done.';
        $('qmsg').className = 'qmsg good';
        setTimeout(() => renderQuiz(qi + 1), 1100);
      } else {
        btn.classList.add('shake');
        $('qmsg').textContent = 'Try again 🙂';
        $('qmsg').className = 'qmsg';
        setTimeout(() => btn.classList.remove('shake'), 350);
      }
    };
  });
}

$('r-words').addEventListener('click', (e) => {
  const t = e.target;
  if (t.id === 'r-again') { at = 0; render(); return; }
  if (t.id === 'r-cards2') { openCards(); return; }
  const wd = t.dataset && t.dataset.w;
  if (!wd) return;
  document.querySelectorAll('.w.lit, .wall .lit').forEach((el) => el.classList.remove('lit'));
  t.classList.add('lit');
  speak(wd, 0.7, () => t.classList.remove('lit')); // slow, per the playbook
});

$('r-say').onclick = () => {
  const s = screensOf(book)[at];
  const text = s.kind === 'cover' ? book.title : book.pages[s.index].text;
  $('r-say').classList.add('on');
  speak(text, 0.85, () => $('r-say').classList.remove('on'));
};
$('r-prev').onclick = () => { if (at > 0) { quiet(); at--; render(); } };
$('r-next').onclick = () => { if (book && at < screensOf(book).length - 1) { quiet(); at++; render(); } };
$('r-close').onclick = closeBook;
document.addEventListener('keydown', (e) => {
  if (!book) return;
  if (e.key === 'ArrowRight') $('r-next').click();
  if (e.key === 'ArrowLeft') $('r-prev').click();
  if (e.key === 'Escape') closeBook();
});

/* ---------------- for grown-ups panel ---------------- */
$('r-lc').onclick = () => {
  const report = checkOf(book);
  $('lc-level').textContent = levelLabel(book) + (book.id.indexOf('custom-') === 0 ? ' · made for ' + heroName(book) : '');
  $('lc-badge').className = 'badge' + (report.ok ? '' : ' bad');
  $('lc-badge').innerHTML = '<span class="t">' + (report.ok ? '✓' : '!') + '</span> ' + (report.ok ? 'Every check passed' : 'It missed — see below');
  $('lc-rows').innerHTML = rowsFor(book, report).map((r) =>
    '<li><span class="t" style="background:' + (r.ok ? 'var(--leaf)' : 'var(--gold-deep)') + '">' + (r.ok ? '✓' : '!') + '</span>' +
    '<div><b>' + r.name + '</b><span>' + r.why + '</span></div><span class="v">' + r.value + '</span></li>'
  ).join('');
  $('lcheck').classList.add('open');
};
$('lc-close').onclick = () => $('lcheck').classList.remove('open');
$('lcheck').onclick = (e) => { if (e.target.id === 'lcheck') $('lcheck').classList.remove('open'); };

/* ---------------- flashcards (match–select–name) ---------------- */
let deck = [], deckAt = 0;
function openCards() {
  if (!book) return;
  deck = [heroName(book).toLowerCase()].concat(book.wordWall);
  deckAt = 0;
  $('cards').classList.add('open');
  $('c-title').textContent = book.title;
  renderCard();
}
function renderCard() {
  $('c-word').textContent = deck[deckAt];
  $('c-where').textContent = (deckAt + 1) + ' of ' + deck.length;
  $('c-prev').disabled = deckAt === 0;
  $('c-next').disabled = deckAt === deck.length - 1;
}
$('r-cards').onclick = openCards;
$('c-close').onclick = () => { quiet(); $('cards').classList.remove('open'); };
$('c-prev').onclick = () => { if (deckAt > 0) { quiet(); deckAt--; renderCard(); } };
$('c-next').onclick = () => { if (deckAt < deck.length - 1) { quiet(); deckAt++; renderCard(); } };
$('c-shuffle').onclick = () => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  deckAt = 0; renderCard();
};
$('c-word').onclick = () => {
  $('c-word').classList.add('lit');
  speak(deck[deckAt], 0.7, () => $('c-word').classList.remove('lit'));
};
$('c-print').onclick = () => {
  $('printarea').innerHTML = deck.map((w) =>
    '<div class="pcard">' + w + '</div>'
  ).join('') + '<p class="pnote">Flash cards from “' + book.title + '” — goldstarbooks. ' +
    'Match–select–name: 1) she matches the card to the same word · 2) she points to the word you say · 3) she reads the word herself. Small sets, big praise, stop while it is fun.</p>';
  window.print();
};

/* ---------------- questionnaire ---------------- */
const child = load(CKEY, null);
function qFill() {
  const c = load(CKEY, null);
  if (!c) return;
  $('q-name').value = c.name || '';
  if (c.age) { const el = document.querySelector('input[name="q-age"][value="' + c.age + '"]'); if (el) el.checked = true; }
  if (c.levelId) { const el = document.querySelector('input[name="q-level"][value="' + c.levelId + '"]'); if (el) el.checked = true; }
  $('q-interests').value = (c.interests || []).join(', ');
  if (c.levelId) qResult(c, false);
}
function qResult(c, scroll) {
  const l = GSB.LEVELS[c.levelId];
  $('q-out').hidden = false;
  $('q-out-title').textContent = 'Start ' + c.name + ' at “' + l.label + '”';
  $('q-out-body').innerHTML =
    '<p><b>' + l.minWords + '–' + l.maxWords + ' words a sentence, ' + l.sentencesPerPage +
    ' sentence' + (l.sentencesPerPage > 1 ? 's' : '') + ' a page.</b> ' + l.description + '</p>' +
    '<p>Her age (' + (c.age || 'not given') + ') never sets the level — grade and age labels mislead badly for this group. What she reads <i>today</i> sets it, and moving up is one tap later.</p>' +
    '<ul>' +
    '<li><b>Keep sessions short.</b> She is ready as soon as she can engage for about five minutes. One book or one flashcard set is a session. Stop while it is still fun.</li>' +
    '<li><b>Use the flash cards.</b> Open any book → Flash cards. Match, then select, then name — three passes, easiest first.</li>' +
    '<li><b>Let her tap words.</b> Nothing speaks on its own; the voice only comes when she (or you) asks. She reads first.</li>' +
    '</ul>';
  markRecommended(c.levelId);
  if (scroll) $('q-out').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function markRecommended(levelId) {
  document.querySelectorAll('[data-level]').forEach((el) => {
    const yes = el.dataset.level === levelId;
    el.classList.toggle('rec', yes);
    const chip = el.querySelector('.reclvl');
    if (chip) chip.hidden = !yes;
  });
}
$('q-go').onclick = () => {
  const name = $('q-name').value.trim();
  const ageEl = document.querySelector('input[name="q-age"]:checked');
  const lvlEl = document.querySelector('input[name="q-level"]:checked');
  if (!/^[A-Za-z]{2,12}$/.test(name)) { $('q-hint').textContent = 'First name only, letters only — her name is always a sight word.'; return; }
  if (!lvlEl) { $('q-hint').textContent = 'Pick the description that sounds most like her right now.'; return; }
  $('q-hint').textContent = '';
  const c = {
    name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
    age: ageEl ? ageEl.value : null,
    levelId: lvlEl.value,
    interests: $('q-interests').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8),
  };
  store(CKEY, c);
  $('b-name').value = c.name;
  $('g-interests').value = c.interests.join(', ');
  $('g-level').value = c.levelId;
  refreshBuilder();
  qResult(c, true);
};
$('q-tobuilder').onclick = () => { location.hash = '#builder'; };

/* ---------------- the builder: personalise a template ---------------- */
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
  const gname = $('g-make');
  gname.textContent = name ? 'Write ' + name + '’s new story' : 'Write her new story';
}
function drawPreview() {
  const name = builderName() || 'Her';
  if (!pickedTemplate) { $('b-preview').innerHTML = ''; $('b-preview-t').textContent = ''; return; }
  const b = personalise(pickedTemplate, name);
  $('b-preview').innerHTML = GSB.sceneSvg(b, { kind: 'cover' });
  $('b-preview-t').textContent = b.title;
}
function heroFromForm(name) {
  const skin = chosen('skin') || '#E0B08A';
  const hair = chosen('hair') || '#1E1611';
  const shirt = chosen('shirt') || '#F2B33D';
  return {
    name: name,
    role: 'hero',
    appearance: name + ', a young reader with ' + hairWord(hair) + ' hair and a ' + colorWord(shirt) + ' top — drawn from this exact palette on every page',
    palette: { primary: shirt, secondary: '#155E86', skin: skin, hair: hair },
  };
}
function hairWord(h) {
  return { '#1E1611': 'dark', '#4A3520': 'brown', '#B5471D': 'red', '#D9A441': 'blond', '#707A85': 'grey', '#141210': 'black' }[h] || 'dark';
}
function colorWord(c) {
  return { '#F2B33D': 'gold', '#155E86': 'blue', '#1E7A4B': 'green', '#D66BA0': 'pink', '#C0392B': 'red', '#6B4FA0': 'purple', '#2A9D8F': 'teal', '#D97B29': 'orange' }[c] || 'bright';
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
  const hero = heroFromForm(name);
  b.characters[0].name = name;
  b.characters[0].appearance = hero.appearance;
  b.characters[0].palette = hero.palette;
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
    '<strong>' + b.title + '</strong><span class="sub">' + b.subtitle + '</span></div>' +
    '<button class="del" data-del="' + b.id + '" aria-label="Remove this book">×</button></a>'
  ).join('');
  drawCovers();
}
$('mine-grid').addEventListener('click', (e) => {
  const id = e.target.dataset && e.target.dataset.del;
  if (!id) return;
  e.preventDefault();
  store(LKEY, mine().filter((b) => b.id !== id));
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
    $('b-hint').textContent = 'Something about this name knocked the story out of level — try another.';
    return;
  }
  const list = mine();
  list.unshift(b);
  store(LKEY, list.slice(0, 20));
  renderMine();
  location.hash = '#/book/' + b.id;
};

/* ---------------- bring-your-own-key generation ---------------- */
$('g-key').value = load(KKEY, '');
$('g-key').addEventListener('change', () => store(KKEY, $('g-key').value.trim()));
$('g-forget').onclick = () => { $('g-key').value = ''; store(KKEY, ''); };

function stage(msg) { $('g-status').textContent = msg; }

async function callClaude(key, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      system: GSB.SYSTEM_PROMPT,
      messages: messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error('That key was not accepted — check it starts with sk-ant- and is active.');
    throw new Error('Anthropic API error ' + res.status + ': ' + body.slice(0, 200));
  }
  const data = await res.json();
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseDraft(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model reply');
  return GSB.DraftSchema.parse(JSON.parse(text.slice(start, end + 1)));
}

$('g-make').onclick = async () => {
  const name = builderName();
  if (!name) { stage('Give her name at step 1 first.'); return; }
  const key = $('g-key').value.trim();
  if (!key) { stage('Paste your Anthropic API key — it stays in this browser.'); return; }
  const outline = $('g-outline').value.trim();
  if (outline.length < 5) { stage('Say what happens in a sentence or two.'); return; }
  const setting = $('g-setting').value.trim() || 'somewhere she loves';
  const interests = $('g-interests').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const hero = heroFromForm(name);
  const request = {
    childId: 'site',
    levelId: $('g-level').value,
    outline: outline,
    setting: setting,
    characters: [hero],
    interests: interests,
    avoid: $('g-avoid').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
    illustrate: false,
  };
  const btn = $('g-make');
  btn.disabled = true;
  try {
    const messages = [{ role: 'user', content: GSB.buildUserPrompt(Object.assign({}, request, { childName: name })) }];
    let draft = null, report = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      stage(attempt === 1 ? 'Writing her story… (about a minute)' : 'Repairing the pages that missed… (attempt ' + attempt + ')');
      const text = await callClaude(key, messages);
      try {
        draft = parseDraft(text);
      } catch (err) {
        messages.push({ role: 'assistant', content: text });
        messages.push({ role: 'user', content: 'That was not valid JSON in the required shape (' + err.message + '). Return the whole book again as one JSON object and nothing else.' });
        continue;
      }
      stage('Checking every sentence against her level…');
      report = GSB.checkDraft(draft, request.levelId, [name]);
      if (report.ok) break;
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: GSB.repairInstructions(report) });
    }
    if (!draft || !report) throw new Error('The model never returned a valid book. Nothing was saved — try again.');
    const b = GSB.assembleBook(draft, request);
    b.id = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const list = mine();
    list.unshift(b);
    store(LKEY, list.slice(0, 20));
    renderMine();
    stage(report.ok ? 'Done — every check passed.' : 'Saved, but it missed some checks — the For grown-ups panel shows exactly which.');
    location.hash = '#/book/' + b.id;
  } catch (err) {
    stage(err.message);
  } finally {
    btn.disabled = false;
  }
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
qFill();
refreshBuilder();
route();
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gold Star Books</title>
<meta name="description" content="Help your child with Down syndrome learn to read: free personalised, level-checked books built on the evidence — sight words first, her name on the cover, flashcards included.">
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
  #printarea{display:none}

  .hero{background:var(--page);padding:64px 24px 72px}
  .hero-in{max-width:1100px;margin:0 auto;display:grid;gap:48px;grid-template-columns:1.1fr .9fr;align-items:center}
  @media(max-width:860px){.hero-in{grid-template-columns:1fr}}
  .chip{display:inline-block;background:var(--parchment);color:var(--gold-deep);font-weight:600;font-size:13px;border-radius:999px;padding:7px 14px}
  .hero h1{font-size:clamp(34px,5vw,54px);line-height:1.08;margin:18px 0}
  .hero p.lead{color:var(--slate);font-size:18px;max-width:36em}
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
  section.wrap>p.sub{color:var(--slate);max-width:46em;margin-bottom:28px}

  .strats{display:grid;gap:18px;grid-template-columns:repeat(2,1fr)}
  @media(max-width:760px){.strats{grid-template-columns:1fr}}
  .strat{background:var(--page);border-radius:18px;padding:24px;display:grid;gap:8px;align-content:start}
  .strat .n{width:34px;height:34px;border-radius:10px;background:var(--parchment);color:var(--gold-deep);display:grid;place-items:center;font-weight:700}
  .strat h3{font-size:17px}
  .strat p{font-size:14.5px;color:var(--slate);line-height:1.55}
  .strat .how{background:#F7F1E2;border-radius:10px;padding:10px 12px;font-size:13.5px}
  .strat .src{font-size:12.5px;font-weight:600;color:var(--sea);margin-top:2px}
  .srcs{background:var(--page);border-radius:18px;padding:24px;margin-top:18px}
  .srcs h3{font-size:16px;margin-bottom:10px}
  .srcs li{font-size:14px;margin:6px 0 6px 18px;color:var(--slate)}
  .srcs a{color:var(--sea);font-weight:600}

  .levels{background:var(--ink);border-radius:22px;padding:34px;color:var(--page)}
  .levels h2{color:var(--page)}
  .levels .grid{display:grid;gap:14px;grid-template-columns:repeat(4,1fr);margin-top:24px}
  @media(max-width:860px){.levels .grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){.levels .grid{grid-template-columns:1fr}}
  .lv{background:rgba(255,253,245,.06);border:1px solid rgba(255,253,245,.14);border-radius:14px;padding:18px}
  .lv h3{font-size:17px;margin-bottom:6px}
  .lv .band{font-family:Verdana,sans-serif;font-size:12.5px;color:var(--gold);letter-spacing:.02em;margin-bottom:10px}
  .lv p{font-size:14px;color:rgba(255,253,245,.72)}

  /* questionnaire */
  .quest{background:var(--page);border-radius:22px;padding:34px}
  .quest .step{margin-top:22px}
  .quest .step>b{display:flex;align-items:center;gap:10px;font-size:16px;margin-bottom:12px}
  .quest .step>b .n{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--page);display:grid;place-items:center;font-size:13px}
  .quest input[type=text]{width:100%;max-width:340px;border:1.5px solid #C9BDA3;background:#fff;border-radius:12px;padding:13px 16px;font-size:18px;outline:none}
  .quest input[type=text]:focus{border-color:var(--sea)}
  .agechips{display:flex;gap:10px;flex-wrap:wrap}
  .agechips label{position:relative}
  .agechips input{position:absolute;opacity:0}
  .agechips span{display:block;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:10px 18px;font-weight:600;cursor:pointer}
  .agechips input:checked + span{border-color:var(--sea);box-shadow:0 0 0 1.5px var(--sea)}
  .qlevels{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
  @media(max-width:700px){.qlevels{grid-template-columns:1fr}}
  .qlevel{position:relative}
  .qlevel input{position:absolute;opacity:0}
  .qlevel span{display:block;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:14px 16px;cursor:pointer}
  .qlevel input:checked + span{border-color:var(--sea);box-shadow:0 0 0 1.5px var(--sea)}
  .qlevel b{display:block;font-size:15px}
  .qlevel i{font-style:normal;font-family:Verdana,sans-serif;font-size:11.5px;color:var(--gold-deep)}
  .qlevel em{display:block;font-style:normal;font-size:13px;color:var(--muted);margin-top:4px}
  #q-go{background:var(--sea);color:var(--page);font-weight:600;font-size:16px;border-radius:12px;padding:15px 26px;margin-top:24px;min-height:56px}
  #q-hint{color:#8E2B25;font-size:13.5px;min-height:1.3em;margin-top:8px}
  #q-out{margin-top:26px;border-top:1px solid var(--line);padding-top:22px}
  #q-out h3{font-size:20px;margin-bottom:10px}
  #q-out p, #q-out li{font-size:14.5px;color:var(--slate);line-height:1.6}
  #q-out ul{margin:10px 0 16px 18px}
  #q-tobuilder{background:var(--gold);color:var(--ink);font-weight:700;border-radius:12px;padding:14px 24px;min-height:56px}

  .lib{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-top:8px;padding-bottom:24px}
  .card{background:var(--page);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:box-shadow .15s,transform .15s;position:relative}
  .card:hover{box-shadow:0 18px 36px -20px rgba(22,40,61,.45);transform:translateY(-2px)}
  .card.rec{border-color:var(--gold-deep);box-shadow:0 0 0 1.5px var(--gold-deep)}
  .card .meta{padding:14px 18px 16px;display:grid;gap:3px}
  .card .lvl{font-size:12px;font-weight:600;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em}
  .card strong{font-size:17px}
  .card .sub{font-size:13.5px;color:var(--muted)}
  .card .pass{font-size:12.5px;font-weight:600;color:var(--leaf);margin-top:6px}
  .card .del{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;background:var(--page);border:1px solid var(--line);font-size:18px;line-height:1}
  .card .del:hover{background:#FBE3E1;border-color:#E7A9A5}

  .builder{background:var(--page);border-radius:22px;padding:34px;display:grid;gap:28px;grid-template-columns:1.15fr .85fr}
  @media(max-width:860px){.builder{grid-template-columns:1fr}}
  .builder h2{font-size:clamp(24px,3vw,32px)}
  .builder .step{margin-top:22px}
  .builder .step>b{display:flex;align-items:center;gap:10px;font-size:16px;margin-bottom:12px}
  .builder .step>b .n{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--page);display:grid;place-items:center;font-size:13px}
  #b-name{width:100%;max-width:340px;border:1.5px solid #C9BDA3;background:#fff;border-radius:12px;padding:13px 16px;font-size:18px;outline:none}
  #b-name:focus{border-color:var(--sea)}
  .swrow{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
  .swrow .lab{width:110px;font-size:13.5px;color:var(--muted)}
  .sw input{position:absolute;opacity:0}
  .sw span{display:block;width:34px;height:34px;border-radius:50%;border:2.5px solid transparent;cursor:pointer}
  .sw input:checked + span{border-color:var(--ink);box-shadow:0 0 0 2px var(--page) inset}
  .picks{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
  @media(max-width:560px){.picks{grid-template-columns:1fr}}
  .pick{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:12px 16px;text-align:left;display:grid;gap:2px}
  .pick:hover{border-color:#C9BDA3}
  .pick.on{border-color:var(--sea);box-shadow:0 0 0 1.5px var(--sea)}
  .pick.rec{border-color:var(--gold-deep)}
  .pick.on.rec{border-color:var(--sea)}
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

  /* generator */
  .gen{background:var(--ink);border-radius:22px;padding:34px;color:var(--page);margin-top:26px}
  .gen h2{font-size:clamp(22px,2.8vw,30px)}
  .gen p.sub{color:rgba(255,253,245,.75);max-width:52em;font-size:14.5px;margin-top:8px}
  .gen .fields{display:grid;gap:14px;grid-template-columns:1fr 1fr;margin-top:22px}
  @media(max-width:760px){.gen .fields{grid-template-columns:1fr}}
  .gen label.f{display:grid;gap:6px;font-size:13px;font-weight:600;color:rgba(255,253,245,.85)}
  .gen input, .gen textarea, .gen select{border:1.5px solid rgba(255,253,245,.25);background:rgba(255,253,245,.07);color:var(--page);border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;outline:none}
  .gen input:focus, .gen textarea:focus, .gen select:focus{border-color:var(--gold)}
  .gen option{color:var(--ink)}
  .gen textarea{min-height:74px;resize:vertical}
  .gen .full{grid-column:1 / -1}
  .genrow{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:18px}
  #g-make{background:var(--gold);color:var(--ink);font-weight:700;font-size:16px;border-radius:12px;padding:16px 26px;min-height:56px}
  #g-make:disabled{opacity:.55;cursor:default}
  #g-forget{background:transparent;color:rgba(255,253,245,.6);border:1.5px solid rgba(255,253,245,.25);border-radius:10px;padding:10px 16px;font-size:13px}
  #g-status{font-size:14px;color:var(--gold);min-height:1.4em;margin-top:12px}
  .gen .keynote{font-size:12.5px;color:rgba(255,253,245,.55);margin-top:14px;max-width:60em}

  footer{background:var(--ink);color:var(--page);margin-top:72px;padding:40px 24px}
  footer .in{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
  footer p{max-width:44em;font-size:14.5px;color:rgba(255,253,245,.8)}
  footer a.donate{border:1.5px solid var(--gold);color:var(--gold);font-weight:600;border-radius:12px;padding:12px 22px}

  /* reader — hit targets ≥66px per the playbook */
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
  .rwords .refrain{align-self:flex-start;background:var(--gold);color:var(--ink);font-size:13px;font-weight:700;letter-spacing:.04em;border-radius:999px;padding:7px 14px;margin-bottom:14px}
  .sentence{font-family:Verdana,Tahoma,sans-serif;font-size:clamp(26px,3.4vw,52px);line-height:1.5;font-weight:700}
  .sentence .w{border-radius:8px;padding:0 4px;cursor:pointer}
  .sentence .w:hover{background:var(--parchment)}
  .sentence .w.lit{background:var(--gold);color:var(--ink)}
  .rtitle{font-family:Verdana,sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,56px);line-height:1.25}
  .rsub{color:var(--muted);font-size:18px;margin-top:12px}
  .rctl{display:flex;gap:12px;align-items:center;padding:20px 32px;border-top:1px solid var(--line);flex-wrap:wrap}
  .rctl .nav{min-width:74px;min-height:66px;border-radius:14px;font-size:22px;background:var(--sea);color:var(--page)}
  .rctl .nav.back{background:transparent;border:1.5px solid #C9BDA3;color:var(--ink)}
  .rctl .nav:disabled{opacity:.35;cursor:default}
  .rctl .say{min-height:66px;border-radius:14px;background:var(--gold);color:var(--ink);font-weight:700;font-size:16px;padding:0 26px;display:flex;gap:10px;align-items:center}
  .rctl .say.on{background:var(--gold-deep);color:#fff}
  .rctl .where2{margin-left:auto;color:var(--muted);font-size:13px}
  .rctl .lc{background:transparent;border:1.5px solid #C9BDA3;border-radius:14px;min-height:48px;padding:0 16px;font-size:13.5px;font-weight:600}

  .quiz{display:grid;gap:14px;max-width:560px}
  .quiz h2{font-family:Verdana,sans-serif;font-size:clamp(22px,2.6vw,34px);line-height:1.4;margin-bottom:8px}
  .quiz button{background:#fff;border:2px solid var(--line);border-radius:14px;padding:18px 22px;font-family:Verdana,sans-serif;font-size:20px;font-weight:700;text-align:left;min-height:66px}
  .quiz button:hover{border-color:var(--gold)}
  .quiz button.yes{background:#E4F1E8;border-color:var(--leaf)}
  .quiz button.shake{animation:sh .3s}
  .qmsg{min-height:1.5em;font-size:18px;font-weight:700;color:var(--sea)}
  .qmsg.good{color:var(--leaf)}
  @keyframes sh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  .wall{display:flex;flex-wrap:wrap;gap:14px;max-width:600px}
  .wall button{background:#fff;border:2px solid var(--line);border-radius:14px;padding:16px 24px;font-family:Verdana,sans-serif;font-size:24px;font-weight:700;min-height:66px}
  .wall button.lit{background:var(--gold);border-color:var(--gold-deep)}
  .star-big{font-size:96px;line-height:1;margin-bottom:18px}
  .credit{max-width:520px;display:grid;gap:14px}
  .credit p{font-size:17px;line-height:1.6}
  .credit .small{font-size:13px;color:var(--muted)}
  .credit a.don{background:var(--gold);color:var(--ink);font-weight:700;border-radius:12px;padding:14px 24px;justify-self:start}
  .again{background:var(--sea);color:var(--page);font-weight:600;border-radius:12px;padding:14px 24px;justify-self:start;min-height:56px}
  .again.ghost{background:transparent;border:1.5px solid #C9BDA3;color:var(--ink)}

  /* flashcards */
  #cards{position:fixed;inset:0;background:var(--sand);display:none;flex-direction:column;z-index:55}
  #cards.open{display:flex}
  .cbody{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:24px}
  #c-word{background:var(--page);border:2px solid var(--line);border-radius:26px;min-width:min(560px,86vw);min-height:240px;display:grid;place-items:center;font-family:Verdana,sans-serif;font-weight:700;font-size:clamp(44px,9vw,92px);cursor:pointer;box-shadow:0 24px 50px -30px rgba(22,40,61,.4)}
  #c-word.lit{background:#FDE8B8}
  .cctl{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}
  .cctl button{min-height:66px;border-radius:14px;font-weight:600}
  .cctl .nav{min-width:74px;background:var(--sea);color:var(--page);font-size:22px}
  .cctl .nav:disabled{opacity:.35}
  .cctl .alt{background:transparent;border:1.5px solid #C9BDA3;padding:0 20px}
  #c-where{color:var(--muted);font-size:14px}
  .msn{max-width:640px;text-align:center;color:var(--slate);font-size:14px;line-height:1.6;padding:0 12px 20px}
  .msn b{color:var(--ink)}

  #lcheck{position:fixed;inset:0;background:rgba(22,40,61,.5);display:none;align-items:center;justify-content:center;padding:20px;z-index:60}
  #lcheck.open{display:flex}
  .lc-panel{background:var(--page);border-radius:18px;max-width:640px;width:100%;max-height:86vh;overflow:auto;padding:8px 28px 24px}
  .lc-panel header{display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:1px solid #F0E8D6;padding:18px 0}
  .lc-panel h2{font-size:19px}
  .lc-panel .lvl{color:var(--muted);font-size:13.5px}
  .lc-intro{font-size:13.5px;color:var(--muted);padding:12px 0 0;line-height:1.55}
  .lc-intro a{color:var(--sea);font-weight:600}
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

  @media print {
    body > *{display:none !important}
    #printarea{display:grid !important;grid-template-columns:1fr 1fr;gap:14mm;padding:10mm}
    .pcard{border:1px dashed #999;border-radius:6mm;height:60mm;display:grid;place-items:center;font-family:Verdana,sans-serif;font-weight:700;font-size:52pt;color:#111}
    .pnote{grid-column:1 / -1;font-family:Verdana,sans-serif;font-size:9pt;color:#333}
  }
</style>
</head>
<body>

<div id="home">
  <div class="hero">
    <div class="hero-in">
      <div>
        <span class="chip">Free · built on Down syndrome reading research · ${esc(CREDIT.org)}</span>
        <h1 class="display">Help her learn to read — with a book she can actually read.</h1>
        <p class="lead">Children with Down syndrome are strong visual learners: they learn to read by
        recognising whole words, starting with the most meaningful word there is — their own name.
        Every book here is built on that evidence, written at the sentence length she reads at
        today, and measured against it before you ever see it.</p>
        <a class="cta" href="#setup">Set up for your reader</a>
        <a class="cta ghost" href="#how">How she learns to read</a>
        <p class="fine">Ten finished stories below, free to read right here — plus flashcards for
        every book and a one-minute setup that finds her level.</p>
      </div>
      <div class="hero-card">
        <div class="cover" data-cover="${STORIES[0].id}"></div>
        <div class="t">${esc(STORIES[0].title)}</div>
        <div class="s">Level: ${esc(LEVELS[STORIES[0].levelId as LevelId].label)} · ${STORIES[0].pages.length} pages</div>
        <div class="proof"><span class="tick">✓</span><span><b>Level check passed</b><span>every sentence measured</span></span></div>
      </div>
    </div>
  </div>

  <section class="wrap" id="how">
    <h2 class="display">How children with Down syndrome learn to read</h2>
    <p class="sub">These are the strategies the research supports — from the Down Syndrome Resource
    Foundation, Down Syndrome Education International and a randomised controlled trial — and,
    under each one, exactly how every book on this page follows it. Read them once and you know
    the method, not just the product.</p>
    <div class="strats">${strategyCards}</div>
    <div class="srcs">
      <h3>Read the sources</h3>
      <ul>${sourceList}</ul>
    </div>
  </section>

  <section class="wrap">
    <div class="levels">
      <h2 class="display">The four levels</h2>
      <div class="grid">${levelCards}</div>
    </div>
  </section>

  <section class="wrap" id="setup">
    <div class="quest">
      <h2 class="display">Set up for your reader</h2>
      <p class="sub" style="margin-bottom:0">A minute of questions. Nothing is uploaded — her
      profile stays on this device and just tunes what you see here.</p>
      <div class="step"><b><span class="n">1</span>Her first name</b>
        <input id="q-name" type="text" maxlength="12" placeholder="Maya" autocomplete="off">
      </div>
      <div class="step"><b><span class="n">2</span>Her age</b>
        <div class="agechips">
          ${['2–4', '5–7', '8–11', '12+'].map((a) => `<label><input type="radio" name="q-age" value="${a}"><span>${a}</span></label>`).join('')}
        </div>
      </div>
      <div class="step"><b><span class="n">3</span>Which sounds most like her right now?</b>
        <div class="qlevels">${levelRadios}</div>
      </div>
      <div class="step"><b><span class="n">4</span>Things she loves <span style="font-weight:400;color:var(--muted)">(optional — separate with commas)</span></b>
        <input id="q-interests" type="text" maxlength="120" placeholder="dogs, swimming, her sister Clara" autocomplete="off">
      </div>
      <button id="q-go">See her reading plan</button>
      <p id="q-hint"></p>
      <div id="q-out" hidden>
        <h3 id="q-out-title"></h3>
        <div id="q-out-body"></div>
        <button id="q-tobuilder">Go make her book</button>
      </div>
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
        <p class="bnote">These use the starter stories as templates, so they work with no account and
        no server. For a <b>brand-new</b> story about exactly what she loves, use the writer below.</p>
      </div>
    </div>

    <div class="gen" id="gen">
      <h2 class="display">Write her a brand-new story</h2>
      <p class="sub">This is the full product: a story invented for her — her interests, her cast,
      her level — written by Claude with the same rules as everything above, then measured page by
      page in this browser and repaired until it passes. It needs your own Anthropic API key
      (console.anthropic.com); the key stays in this browser and calls go straight from your device
      to Anthropic. A book costs a few cents.</p>
      <div class="fields">
        <label class="f full">What happens? <textarea id="g-outline" maxlength="1200" placeholder="Maya and her dog get lost at the fair and she follows the music to find the way back."></textarea></label>
        <label class="f">Where does it happen? <input id="g-setting" type="text" maxlength="120" placeholder="the summer fair"></label>
        <label class="f">Her level <select id="g-level">${genLevelOptions}</select></label>
        <label class="f">Things she loves (commas) <input id="g-interests" type="text" maxlength="200" placeholder="dogs, music, candy apples"></label>
        <label class="f">Keep out of the book (commas) <input id="g-avoid" type="text" maxlength="200" placeholder="thunder, needles"></label>
        <label class="f full">Your Anthropic API key <input id="g-key" type="password" placeholder="sk-ant-…" autocomplete="off"></label>
      </div>
      <div class="genrow">
        <button id="g-make">Write her new story</button>
        <button id="g-forget">Forget my key</button>
      </div>
      <p id="g-status"></p>
      <p class="keynote">Name and look come from steps 1 and 2 above. Generation takes about a
      minute: written, checked against her level, and repaired until it passes — the same loop the
      full app runs. If it still misses after three passes it is saved and labelled honestly, never
      hidden. Your key is stored only in this browser (Forget my key removes it) and is sent only
      to api.anthropic.com.</p>
    </div>
  </section>

  <section class="wrap" id="mine" style="display:none">
    <h2 class="display">Books made here</h2>
    <p class="sub">Saved on this device only. They open in the same reader, with the same
    flashcards, and their level checks are computed fresh — tap “For grown-ups” inside any book.</p>
    <div class="lib" id="mine-grid"></div>
  </section>

  <section class="wrap" id="library">
    <h2 class="display">The starter library</h2>
    <p class="sub">Ten stories, two to a level and more where it matters most. Tap any word to hear
    it — nothing ever speaks on its own. Every book ends with its level check, open for you to
    inspect, and every book has a flashcard deck.</p>
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
        <button class="lc" id="r-cards">Flash cards</button>
        <button class="lc" id="r-lc">👤 For grown-ups</button>
        <span class="where2" id="r-where2"></span>
      </div>
    </div>
  </div>
</div>

<div id="cards" role="dialog" aria-label="Flash cards">
  <div class="rtop">
    <button class="x" id="c-close" aria-label="Close the cards">←</button>
    <b id="c-title"></b><span class="where">Flash cards</span>
    <span class="where" id="c-where" style="margin-left:auto"></span>
  </div>
  <div class="cbody">
    <div id="c-word" role="button" aria-label="Tap to hear the word"></div>
    <div class="cctl">
      <button class="nav" id="c-prev" aria-label="Back a card">←</button>
      <button class="alt" id="c-shuffle">Shuffle</button>
      <button class="alt" id="c-print">Print cards</button>
      <button class="nav" id="c-next" aria-label="Next card">→</button>
    </div>
  </div>
  <p class="msn"><b>Match — select — name.</b> First she matches a printed card to the same word.
  Then she points to the word you say. Then she reads the word to you. Three passes, easiest
  first, so she is right far more often than wrong. Tap the big card to hear the word, slowly.</p>
</div>

<div id="lcheck">
  <div class="lc-panel">
    <header>
      <div><h2>For grown-ups: the level check</h2><div class="lvl" id="lc-level"></div></div>
      <span class="badge" id="lc-badge"><span class="t">✓</span> Every check passed</span>
    </header>
    <p class="lc-intro">Six measurements, computed fresh for this exact book — the same validator
    the full app runs. Each rule comes from the research on how children with Down syndrome learn
    to read; the <a href="#how" onclick="document.getElementById('lcheck').classList.remove('open');document.getElementById('reader').classList.remove('open');document.body.style.overflow=''">strategy guide</a> explains every one.</p>
    <ul id="lc-rows"></ul>
    <button class="lc-close" id="lc-close">Close</button>
  </div>
</div>

<div id="printarea"></div>

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
