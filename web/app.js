'use strict';

/* =====================================================================
   Daruma – Habits, To-Dos und ein Pool für Langzeit-Aufgaben.
   Alle Daten liegen nur auf diesem Gerät (localStorage).
   ===================================================================== */

const STORAGE_KEY = 'daruma.v1';
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo'); // nur für Screenshots: Beispieldaten, nichts wird gespeichert

/* ---------- Datum ---------- */
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayKey = () => dayKey(new Date());
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
const weekday = (k) => parseDay(k).getDay(); // 0 = Sonntag
const weekStart = (k) => addDays(k, -((weekday(k) + 6) % 7)); // Montag
const fmt = (k, opts) => parseDay(k).toLocaleDateString('de-DE', opts);
const num = (v) => Number(v).toLocaleString('de-DE', { maximumFractionDigits: 1 });
const parseNum = (s) => { const v = parseFloat(String(s).replace(',', '.').trim()); return Number.isFinite(v) ? v : NaN; };
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

/* ---------- Katalog ---------- */
const CATALOG = [
  { name: 'Körper', items: [
    { name: '3 L Wasser trinken', icon: '💧', kind: 'count', target: 3, step: 0.5, unit: 'L' },
    { name: '10 Minuten Dehnen', icon: '🤸', kind: 'check' },
    { name: 'Hüftübungen', icon: '🦵', kind: 'check' },
    { name: '8.000 Schritte', icon: '🚶', kind: 'check' },
    { name: 'Sport', icon: '🏃', kind: 'check' },
    { name: 'Obst oder Gemüse', icon: '🥕', kind: 'count', target: 5, step: 1, unit: 'Portionen' },
  ] },
  { name: 'Kopf', items: [
    { name: 'Meditieren', icon: '🧘', kind: 'check' },
    { name: '10 Seiten lesen', icon: '📖', kind: 'check' },
    { name: 'Journaling', icon: '✍️', kind: 'check' },
    { name: '3 Dinge, für die ich dankbar bin', icon: '🙏', kind: 'check' },
    { name: 'Spaziergang ohne Handy', icon: '🍃', kind: 'check' },
  ] },
  { name: 'Schlaf', items: [
    { name: 'Vor 23 Uhr ins Bett', icon: '🛏️', kind: 'check' },
    { name: 'Kein Handy im Bett', icon: '📵', kind: 'check' },
    { name: 'Kein Kaffee nach 14 Uhr', icon: '☕', kind: 'check' },
  ] },
  { name: 'Struktur', items: [
    { name: 'Bildschirmzeit', icon: '⏳', kind: 'limit', target: 90, step: 1, unit: 'min' },
    { name: 'Morgens den Tag planen', icon: '🗒️', kind: 'check' },
    { name: '5 Minuten aufräumen', icon: '✨', kind: 'check' },
  ] },
];
const findTemplate = (name) => CATALOG.flatMap((c) => c.items).find((t) => t.name === name);
const STARTER = ['Meditieren', '3 L Wasser trinken', 'Bildschirmzeit'].map(findTemplate);
const LIST_SUGGESTIONS = [
  { name: 'Haushalt', icon: '🏠' }, { name: 'Projekte', icon: '🔨' }, { name: 'Ausflüge & Reisen', icon: '✈️' },
  { name: 'Bücher', icon: '📚' }, { name: 'Filme & Serien', icon: '🎬' }, { name: 'Rezepte zum Ausprobieren', icon: '🍳' },
  { name: 'Einkaufen & Besorgungen', icon: '🛒' }, { name: 'Geschenkideen', icon: '🎁' },
];

const HABIT_ICONS = ['✅', '💧', '🧘', '📖', '🚶', '🏃', '🤸', '🦵', '🙏', '🍃', '🛏️', '📵',
  '☕', '⏳', '✨', '🗒️', '💊', '🥕', '🎵', '💪', '🌙', '☀️', '✍️', '🧠'];
const LIST_ICONS = ['📦', '🏠', '📚', '🔨', '✈️', '🛒', '🎁', '🎬', '🍳', '💪', '💡', '🎵',
  '🌱', '🎨', '⭐', '❤️', '📷', '🎮'];
const KIND_TEXT = {
  check: 'Einmal antippen, dann ist es für heute erledigt.',
  count: 'Du zählst hoch, bis das Ziel erreicht ist, z.B. 3 L Wasser in 0,5-L-Schritten.',
  limit: 'Du trägst abends einen Wert ein. Erledigt, wenn er im Limit bleibt, z.B. Bildschirmzeit.',
};
const WEEKDAYS = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr'], [6, 'Sa'], [0, 'So']];

function makeHabit(t, order) {
  return {
    id: uid(), name: t.name, icon: t.icon, kind: t.kind,
    target: t.target ?? 1, step: t.step ?? 1, unit: t.unit ?? '',
    weekdays: [0, 1, 2, 3, 4, 5, 6], createdAt: todayKey(), order,
  };
}

/* ---------- Speicher ---------- */
// Neue Nutzer starten leer und werden durch die Einrichtung geführt.
function freshState() {
  return { version: 1, name: '', setupDone: false, habits: [], logs: {}, todos: [], lists: [] };
}
function normalize(s) {
  return {
    version: 1,
    name: typeof s.name === 'string' ? s.name : '',
    setupDone: s.setupDone !== false, // bestehende Daten (ohne Feld) gelten als eingerichtet
    habits: Array.isArray(s.habits) ? s.habits : [],
    logs: s.logs && typeof s.logs === 'object' ? s.logs : {},
    todos: Array.isArray(s.todos) ? s.todos : [],
    lists: Array.isArray(s.lists) ? s.lists : [],
  };
}
function load() {
  if (DEMO) return demoState(DEMO);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { console.warn('Laden fehlgeschlagen', e); }
  const s = freshState();
  persist(s);
  return s;
}
function persist(s = state) {
  if (DEMO) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.warn('Speichern fehlgeschlagen', e); }
}

let state = load();

/* ---------- Habit-Logik ---------- */
const logKey = (h, d) => `${h.id}|${d}`;
const getValue = (h, d) => state.logs[logKey(h, d)];
const valueOf = (h, d) => getValue(h, d) ?? 0;
const isActive = (h, d) => h.weekdays.includes(weekday(d)) && h.createdAt <= d;
function isDone(h, d) {
  const v = getValue(h, d);
  if (h.kind === 'check') return (v ?? 0) >= 1;
  if (h.kind === 'count') return (v ?? 0) >= h.target;
  return v !== undefined && v <= h.target;
}
function setValue(h, d, v) {
  const k = logKey(h, d);
  if (v <= 0 && h.kind !== 'limit') delete state.logs[k];
  else state.logs[k] = Math.round(v * 100) / 100;
}
function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  for (const k of Object.keys(state.logs)) if (k.startsWith(id + '|')) delete state.logs[k];
}
function streak(h) {
  const today = todayKey();
  let d = today;
  if (isActive(h, d) && !isDone(h, d)) d = addDays(d, -1);
  let n = 0;
  for (let i = 0; i < 400 && d >= h.createdAt; i++, d = addDays(d, -1)) {
    if (!isActive(h, d)) continue;
    if (isDone(h, d)) n++; else break;
  }
  return n;
}
function rate(h, days) {
  const today = todayKey();
  let active = 0, done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (!isActive(h, d)) continue;
    const ok = isDone(h, d);
    if (d === today && !ok) continue;
    active++; if (ok) done++;
  }
  return active ? Math.round((done / active) * 100) : null;
}

/* ---------- To-Do-Logik ----------
   Normale To-Dos haben einen Tag (plannedDay). Unerledigtes rutscht automatisch auf heute.
   Pool-Einträge (listId) erscheinen nur an dem Tag, für den sie geholt wurden, danach wieder im Pool. */
function todoAppears(t, d, today) {
  if (t.completedAt) return t.completedAt === d;
  if (!t.plannedDay || d < today) return false;
  if (!t.listId && d === today) return t.plannedDay <= d;
  return t.plannedDay === d;
}
const inPool = (t, today) => !!t.listId && !t.completedAt && (!t.plannedDay || t.plannedDay < today);
const carriedOver = (t, today) => !t.listId && !t.completedAt && t.plannedDay && t.plannedDay < today;
const listById = (id) => state.lists.find((l) => l.id === id);
const todoById = (id) => state.todos.find((t) => t.id === id);
const habitById = (id) => state.habits.find((h) => h.id === id);
const nextOrder = (arr) => arr.reduce((m, x) => Math.max(m, x.order ?? 0), -1) + 1;

/* ---------- UI-Zustand ---------- */
const ui = {
  tab: 'today',
  day: todayKey(),
  poolListId: null,
  sheet: null,     // { type, ... }
  draft: null,     // Formularwerte des offenen Sheets
  focus: null,     // CSS-Selektor, der nach dem Rendern Fokus bekommt
  toast: null,
  wobble: false,
  lastAllDone: {},
  ob: { step: 0, name: '', habits: [], lists: [] }, // Einrichtung
};

/* ---------- Kleine Bausteine ---------- */
const ICON = {
  plus: '<svg viewBox="0 0 22 22"><path d="M11 3v16M3 11h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 8 14"><path d="M7 1 1 7l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="13" cy="13" r="4.6"/><path d="M13 2.5v2.6M13 20.9v2.6M2.5 13h2.6M20.9 13h2.6M5.6 5.6l1.8 1.8M18.6 18.6l1.8 1.8M5.6 20.4l1.8-1.8M18.6 7.4l1.8-1.8"/></svg>',
  tray: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 14.5 6.5 5h13l3 9.5V21H3.5z"/><path d="M3.5 14.5h6a3.5 3.5 0 0 0 7 0h6"/></svg>',
  loop: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5V11a5 5 0 0 1 5-5h12"/><path d="m17.5 2.5 3.5 3.5-3.5 3.5"/><path d="M22 13.5V15a5 5 0 0 1-5 5H5"/><path d="m8.5 23.5-3.5-3.5 3.5-3.5"/></svg>',
  chart: '<svg viewBox="0 0 26 26" fill="currentColor"><rect x="3.5" y="13" width="5" height="9" rx="1.5"/><rect x="10.5" y="8" width="5" height="14" rx="1.5"/><rect x="17.5" y="4" width="5" height="18" rx="1.5"/></svg>',
};

function statusCircle(kind, progress = 0) {
  if (kind === 'done') {
    return `<span class="status done"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="var(--accent)"/><path d="m8.5 14.5 3.8 3.8 7.2-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  if (kind === 'missed') {
    return `<span class="status"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="var(--orange)"/><path d="m9.5 9.5 9 9m0-9-9 9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></span>`;
  }
  const r = 12.3, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, progress));
  return `<span class="status"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="${r}" fill="none" stroke="var(--secondary)" stroke-opacity=".45" stroke-width="2"/>${p > 0 ? `<circle cx="14" cy="14" r="${r}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 14 14)"/>` : ''}</svg></span>`;
}

function darumaSVG(bothEyes, popEye) {
  return `<svg class="daruma-svg" viewBox="0 0 100 120" aria-hidden="true">
    <defs><linearGradient id="dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee4538"/><stop offset="1" stop-color="#b31a1a"/></linearGradient></defs>
    <ellipse cx="50" cy="114" rx="34" ry="5" fill="#000" opacity=".13"/>
    <g class="figure">
      <path d="M50 2C84 2 100 30.6 100 65.8 100 103 80 112 50 112 20 112 0 103 0 65.8 0 30.6 16 2 50 2Z" fill="url(#dr)"/>
      <ellipse cx="17" cy="38" rx="7" ry="13" fill="#fff" opacity=".28" transform="rotate(-25 17 38)"/>
      <path d="M12 74a17 17 0 0 0 13 18" fill="none" stroke="#f2bd40" stroke-width="3" stroke-linecap="round"/>
      <path d="M88 74a17 17 0 0 1-13 18" fill="none" stroke="#f2bd40" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="50" cy="42" rx="32" ry="27" fill="#fffaf0" stroke="#f2bd40" stroke-width="3"/>
      <path d="M28 27.5Q36 19 45 30" fill="none" stroke="#1a1717" stroke-width="4" stroke-linecap="round"/>
      <path d="M72 27.5Q64 19 55 30" fill="none" stroke="#1a1717" stroke-width="4" stroke-linecap="round"/>
      <circle cx="37" cy="39" r="9.3" fill="#fff" stroke="#000" stroke-width="2"/>
      <circle cx="63" cy="39" r="9.3" fill="#fff" stroke="#000" stroke-width="2"/>
      <g><circle cx="37" cy="39" r="5.4" fill="#000"/><circle cx="39" cy="37" r="1.7" fill="#fff"/></g>
      ${bothEyes ? `<g class="pupil2${popEye ? ' pop' : ''}"><circle cx="63" cy="39" r="5.4" fill="#000"/><circle cx="65" cy="37" r="1.7" fill="#fff"/></g>` : ''}
      <path d="M35 51Q41.5 59 50 54.5 58.5 59 65 51" fill="none" stroke="#1a1717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="25" cy="51" r="4" fill="#ff8aa0" opacity=".45"/>
      <circle cx="75" cy="51" r="4" fill="#ff8aa0" opacity=".45"/>
      <rect x="35" y="83" width="30" height="12" rx="6" fill="#f2bd40" stroke="#bf851a" stroke-width="1.5"/>
    </g>
  </svg>`;
}

function weekRing(progress, selected, future) {
  const r = 6.6, c = 2 * Math.PI * r;
  const track = selected ? 'rgba(255,255,255,.35)' : 'var(--secondary)';
  const fg = selected ? '#fff' : 'var(--accent)';
  let inner = '';
  if (!future && progress > 0) {
    inner = `<circle cx="8.5" cy="8.5" r="${r}" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${(c * Math.min(1, progress)).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8.5 8.5)"/>`;
    if (progress >= 1) inner += `<path d="m5.6 8.7 2 2 3.8-4.2" fill="none" stroke="${fg}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<svg viewBox="0 0 17 17"><circle cx="8.5" cy="8.5" r="${r}" fill="none" stroke="${track}" stroke-opacity="${selected ? 1 : 0.4}" stroke-width="2.4"/>${inner}</svg>`;
}

/* ---------- Ansichten ---------- */
const app = document.getElementById('app');

function render() {
  if (!state.setupDone) { app.innerHTML = renderOnboarding(); return; }
  const screen = ui.tab === 'today' ? renderToday() : ui.tab === 'habits' ? renderHabits() : ui.tab === 'pool' ? renderPool() : renderProgress();
  app.innerHTML = `<main class="screen">${screen}</main>${renderTabbar()}${renderSheet()}${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ''}`;
  ui.wobble = false;
  if (ui.focus) {
    const el = app.querySelector(ui.focus);
    ui.focus = null;
    if (el) { el.focus(); if (el.select && el.value) el.select(); }
  }
}

/* ---------- Einrichtung beim ersten Start ---------- */
function renderOnboarding() {
  const ob = ui.ob;
  const steps = 4;
  const dots = `<div class="ob-dots">${Array.from({ length: steps }, (_, i) => `<i class="${i === ob.step ? 'on' : ''}"></i>`).join('')}</div>`;
  const back = ob.step > 0 ? '<button class="link" data-action="ob-back">Zurück</button>' : '';
  const pick = (on) => statusCircle(on ? 'done' : 'open');
  let body, button;

  if (ob.step === 0) {
    body = `<div class="ob-hero"><div class="daruma big-daruma wobble" data-action="poke">${darumaSVG(false)}</div>
      <h1>Willkommen bei Daruma</h1>
      <p>In Japan malt man der Daruma-Figur ein Auge aus, wenn man sich ein Ziel setzt, und das zweite, wenn man es erreicht hat. Hier bekommt sie ihr zweites Auge an jedem Tag, an dem du alle Habits schaffst.</p></div>
      <h3 class="section-title">Wie heißt du?</h3>
      <input class="field" id="ob-name" value="${esc(ob.name)}" placeholder="Dein Vorname (optional)" autocomplete="given-name" enterkeyhint="next">
      <p class="section-footer">Bleibt nur auf diesem Gerät.</p>
      <div class="card" style="margin-top:28px"><div class="row"><label class="row-main" style="cursor:pointer"><span class="emoji">📂</span><span class="name">Ich habe schon eine Sicherung</span><input type="file" accept="application/json,.json" data-action="import" hidden></label></div></div>`;
    button = 'Los geht’s';
  } else if (ob.step === 1) {
    body = `<h1 class="large-title">Deine Habits</h1>
      <p class="ob-lead">Was willst du dir jeden Tag angewöhnen? Wähle ein paar aus. Lieber klein anfangen, ergänzen und ändern kannst du alles später im Reiter Habits.</p>
      ${CATALOG.map((c) => `<h3 class="section-title">${esc(c.name)}</h3><div class="card">${c.items.map((t) => {
        const on = ob.habits.includes(t.name);
        const goal = t.kind === 'count' ? `${num(t.target)} ${t.unit}` : t.kind === 'limit' ? `max. ${num(t.target)} ${t.unit}` : '';
        return `<div class="row"><button class="row-main" data-action="ob-habit" data-name="${esc(t.name)}">
          <span class="emoji">${t.icon}</span><span class="name" style="flex:1">${esc(t.name)}</span>${goal ? `<span class="value">${esc(goal)}</span>` : ''}${pick(on)}</button></div>`;
      }).join('')}</div>`).join('')}`;
    button = ob.habits.length ? `Weiter mit ${ob.habits.length} Habit${ob.habits.length === 1 ? '' : 's'}` : 'Ohne Habits weiter';
  } else if (ob.step === 2) {
    body = `<h1 class="large-title">Dein Pool</h1>
      <p class="ob-lead">Im Pool sammelst du Dinge, die nicht jeden Tag dran sind. Wenn du Zeit und Lust hast, holst du dir etwas davon auf Heute. Welche Listen willst du haben?</p>
      <div class="card">${LIST_SUGGESTIONS.map((l) => `<div class="row"><button class="row-main" data-action="ob-list" data-name="${esc(l.name)}">
        <span class="emoji">${l.icon}</span><span class="name" style="flex:1">${esc(l.name)}</span>${pick(ob.lists.includes(l.name))}</button></div>`).join('')}</div>
      <p class="section-footer">Eigene Listen legst du später im Reiter Pool an.</p>`;
    button = ob.lists.length ? `Weiter mit ${ob.lists.length} Liste${ob.lists.length === 1 ? '' : 'n'}` : 'Ohne Listen weiter';
  } else {
    body = `<div class="ob-hero"><div class="daruma big-daruma wobble" data-action="poke">${darumaSVG(true, true)}</div>
      <h1>Alles bereit${ob.name ? `, ${esc(ob.name)}` : ''}!</h1></div>
      <div class="card ob-tips">
        <p><span class="emoji">☀️</span><span><strong>Heute</strong>: Habits abhaken und To-Dos erledigen. Mit + legst du ein To-Do an.</span></p>
        <p><span class="emoji">🔁</span><span><strong>Habits</strong>: anlegen, bearbeiten, Reihenfolge ändern.</span></p>
        <p><span class="emoji">🪣</span><span><strong>Pool</strong>: Ideen sammeln und bei Lust auf Heute holen.</span></p>
        <p><span class="emoji">📱</span><span><strong>Tipp</strong>: In Safari über Teilen → „Zum Home-Bildschirm“ wird Daruma zur App.</span></p>
        <p><span class="emoji">💾</span><span><strong>Wichtig</strong>: Deine Daten liegen nur auf diesem Gerät. Unter Fortschritt kannst du ab und zu eine Sicherung herunterladen.</span></p>
      </div>`;
    button = 'Daruma starten';
  }
  return `<main class="screen ob">
      <header class="nav"><div class="nav-side">${back}</div>${dots}<div class="nav-side right"></div></header>
      ${body}
    </main>
    <div class="ob-footer"><button class="btn-primary" data-action="ob-next">${button}</button></div>`;
}

function finishOnboarding() {
  const ob = ui.ob;
  const all = CATALOG.flatMap((c) => c.items).filter((t) => ob.habits.includes(t.name));
  all.forEach((t) => state.habits.push(makeHabit(t, nextOrder(state.habits))));
  LIST_SUGGESTIONS.filter((l) => ob.lists.includes(l.name))
    .forEach((l) => state.lists.push({ id: uid(), name: l.name, icon: l.icon, order: nextOrder(state.lists) }));
  state.name = ob.name.trim();
  state.setupDone = true;
  ui.tab = 'today'; ui.day = todayKey();
  window.scrollTo(0, 0);
  commit();
}

function renderTabbar() {
  const tab = (id, label, icon) => `<button class="tab ${ui.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">${tab('today', 'Heute', ICON.sun)}${tab('habits', 'Habits', ICON.loop)}${tab('pool', 'Pool', ICON.tray)}${tab('progress', 'Fortschritt', ICON.chart)}</nav>`;
}

function dayTitle(d, today) {
  if (d === today) return 'Heute';
  if (d === addDays(today, -1)) return 'Gestern';
  if (d === addDays(today, 1)) return 'Morgen';
  return fmt(d, { weekday: 'long' });
}

function renderToday() {
  const today = todayKey();
  const d = ui.day;
  const future = d > today;
  const habits = state.habits.filter((h) => isActive(h, d)).sort(byOrder);
  const done = habits.filter((h) => isDone(h, d)).length;
  const total = habits.length;
  const allDone = total > 0 && done === total;

  // Wackeln, wenn gerade alles erledigt wurde
  const popEye = allDone && ui.lastAllDone[d] === false;
  if (popEye) ui.wobble = true;
  ui.lastAllDone[d] = allDone;

  const todos = state.todos
    .filter((t) => todoAppears(t, d, today))
    .sort((a, b) => (!!a.completedAt - !!b.completedAt) || byOrder(a, b));

  const msg = future ? 'Dieser Tag kommt noch. Abhaken kannst du, wenn er da ist.'
    : allDone ? `Daruma hat beide Augen. Stark${state.name ? `, ${esc(state.name)}` : ''}!`
    : 'Schaffst du alle, malt Daruma das zweite Auge aus.';

  return `
    <header class="nav">
      <div class="nav-side">${d !== today ? '<button class="link" data-action="go-today">Zu heute</button>' : ''}</div>
      <div class="nav-side right"><button class="icon-btn" data-action="new-todo" aria-label="To-Do hinzufügen">${ICON.plus}</button></div>
    </header>
    <h1 class="large-title">${esc(dayTitle(d, today))}</h1>

    <div class="card">${renderWeek(today)}</div>

    <div class="card" style="margin-top:20px">
      <div class="hero">
        <div class="daruma ${ui.wobble ? 'wobble' : ''}" data-action="poke" role="img" aria-label="${allDone ? 'Daruma mit beiden Augen' : 'Daruma mit einem Auge'}">${darumaSVG(allDone, popEye)}</div>
        <div class="hero-text">
          <span class="hero-date">${esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
          <span class="hero-count">${done} von ${total} erledigt</span>
          <div class="bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
          <span class="hero-msg">${msg}</span>
        </div>
      </div>
    </div>

    <h3 class="section-title">Habits</h3>
    <div class="card">
      ${habits.length ? habits.map((h) => habitRow(h, d, future)).join('') : (state.habits.length ? '<p class="empty">An diesem Tag stehen keine Habits an.</p>' : '<p class="empty">Noch keine Habits. <button class="link" data-action="tab" data-tab="habits">Im Reiter Habits anlegen</button></p>')}
    </div>

    <h3 class="section-title">To-Dos</h3>
    <div class="card">
      ${todos.length ? todos.map((t) => todoRow(t, today, future)).join('')
        : d === today ? '<p class="empty">Nichts offen. <button class="link" data-action="tab" data-tab="pool">Lust auf mehr? Schau in den Pool.</button></p>'
        : '<p class="empty">Keine To-Dos an diesem Tag.</p>'}
    </div>
  `;
}

function renderWeek(today) {
  const start = weekStart(ui.day);
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i);
    const active = state.habits.filter((h) => isActive(h, k));
    const done = active.filter((h) => isDone(h, k)).length;
    const progress = active.length ? done / active.length : 0;
    const sel = k === ui.day;
    cells.push(`<button class="day ${sel ? 'selected' : ''} ${k === today ? 'today' : ''}" data-action="select-day" data-day="${k}" aria-label="${esc(fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }))}">
      <span class="wd">${fmt(k, { weekday: 'narrow' })}</span>
      <span class="dn">${parseDay(k).getDate()}</span>
      ${weekRing(progress, sel, k > today)}
    </button>`);
  }
  return `<div class="week">
    <button class="shift" data-action="shift-week" data-n="-1" aria-label="Vorherige Woche">${ICON.left}</button>
    ${cells.join('')}
    <button class="shift" data-action="shift-week" data-n="1" aria-label="Nächste Woche">${ICON.right}</button>
  </div>`;
}

function habitRow(h, d, future) {
  const done = isDone(h, d);
  const v = valueOf(h, d);
  const dis = future ? 'disabled' : '';
  let controls;
  if (h.kind === 'check') {
    controls = `<button class="status-btn" data-action="toggle-habit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Abhaken'}">${statusCircle(done ? 'done' : 'open')}</button>`;
  } else if (h.kind === 'count') {
    controls = `<span class="value">${num(v)}/${num(h.target)} ${esc(h.unit)}</span>
      <button class="step" data-action="step" data-id="${h.id}" data-dir="-1" ${v <= 0 || future ? 'disabled' : ''} aria-label="Weniger">−</button>
      <button class="step" data-action="step" data-id="${h.id}" data-dir="1" ${dis} aria-label="Mehr">+</button>
      ${statusCircle(done ? 'done' : 'open', v / h.target)}`;
  } else {
    const has = getValue(h, d) !== undefined;
    controls = `<button class="limit-btn" data-action="limit-entry" data-id="${h.id}" ${dis}>
      ${has ? `<span class="value">${num(v)} ${esc(h.unit)}</span>${statusCircle(done ? 'done' : 'missed')}`
        : `<span class="accent-text">Eintragen</span>${statusCircle('open')}`}
    </button>`;
  }
  return `<div class="row">
    ${h.kind === 'check' && !future
      ? `<button class="row-main" data-action="toggle-habit" data-id="${h.id}"><span class="emoji">${h.icon}</span><span class="name">${esc(h.name)}</span></button>`
      : `<div class="row-main"><span class="emoji">${h.icon}</span><span class="name">${esc(h.name)}</span></div>`}
    <div class="controls">${controls}</div>
  </div>`;
}

function scheduleText(h) {
  const w = h.weekdays;
  if (w.length === 7) return 'Täglich';
  if (w.length === 5 && [1, 2, 3, 4, 5].every((n) => w.includes(n))) return 'Mo–Fr';
  if (w.length === 2 && w.includes(0) && w.includes(6)) return 'Wochenende';
  return WEEKDAYS.filter(([n]) => w.includes(n)).map(([, l]) => l).join(', ');
}

function goalText(h) {
  if (h.kind === 'count') return `${num(h.target)} ${h.unit}`.trim();
  if (h.kind === 'limit') return `max. ${num(h.target)} ${h.unit}`.trim();
  return '';
}

function renderHabits() {
  const habits = [...state.habits].sort(byOrder);
  const head = `<header class="nav"><div class="nav-side"></div>
    <div class="nav-side right"><button class="icon-btn" data-action="open-catalog" aria-label="Habit hinzufügen">${ICON.plus}</button></div></header>
    <h1 class="large-title">Habits</h1>`;
  if (!habits.length) {
    return `${head}<div class="card empty-state">
      <div class="big">🔁</div>
      <h2>Noch keine Habits</h2>
      <p>Such dir etwas aus dem Katalog aus oder leg ein eigenes Habit an. Abgehakt wird dann im Reiter Heute.</p>
      <button class="btn-primary" data-action="open-catalog">Habit hinzufügen</button>
    </div>`;
  }
  return `${head}
    <div class="card">${habits.map((h, i) => `<div class="row">
      <button class="row-main" data-action="edit-habit" data-id="${h.id}">
        <span class="emoji">${h.icon}</span>
        <span class="name-wrap"><span class="name">${esc(h.name)}</span><span class="tag">${esc([goalText(h), scheduleText(h)].filter(Boolean).join(' · '))}</span></span>
      </button>
      <div class="controls order-btns">
        <button class="step" data-action="move-habit" data-id="${h.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button>
        <button class="step" data-action="move-habit" data-id="${h.id}" data-dir="1" ${i === habits.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button>
      </div>
    </div>`).join('')}</div>
    <p class="section-footer">Tippe auf ein Habit, um es zu bearbeiten. Mit den Pfeilen legst du die Reihenfolge auf Heute fest.</p>
    <div class="card" style="margin-top:20px"><div class="row"><button class="row-main" data-action="open-catalog"><span class="emoji">➕</span><span class="name" style="color:var(--accent)">Habit hinzufügen</span></button></div></div>`;
}

function todoRow(t, today, future) {
  const list = t.listId ? listById(t.listId) : null;
  const done = !!t.completedAt;
  let tag = '';
  if (list) tag = `aus ${list.name}`;
  else if (carriedOver(t, today)) tag = `seit ${fmt(t.plannedDay, { weekday: 'long' })}`;
  return `<div class="row">
    <button class="row-main" data-action="edit-todo" data-id="${t.id}">
      <span class="emoji">${list ? list.icon : '📌'}</span>
      <span class="name-wrap"><span class="name ${done ? 'struck' : ''}">${esc(t.title)}</span>${tag && !done ? `<span class="tag">${esc(tag)}</span>` : ''}</span>
    </button>
    <div class="controls"><button class="status-btn" data-action="toggle-todo" data-id="${t.id}" ${future ? 'disabled' : ''} aria-label="${done ? 'Zurücksetzen' : 'Erledigt'}">${statusCircle(done ? 'done' : 'open')}</button></div>
  </div>`;
}

function renderPool() {
  const today = todayKey();
  const list = ui.poolListId ? listById(ui.poolListId) : null;
  if (list) return renderPoolList(list, today);

  const lists = [...state.lists].sort(byOrder);
  const open = state.todos.filter((t) => inPool(t, today));
  const head = `<header class="nav"><div class="nav-side"></div>
    <div class="nav-side right"><button class="icon-btn" data-action="new-list" aria-label="Neue Liste">${ICON.plus}</button></div></header>
    <h1 class="large-title">Pool</h1>`;

  if (!lists.length) {
    return `${head}<div class="card empty-state">
      <div class="big">🪣</div>
      <h2>Noch keine Listen</h2>
      <p>Hier sammelst du Dinge, die nicht jeden Tag dran sind. Wenn du Zeit und Lust hast, holst du dir etwas davon auf Heute.</p>
      <button class="btn-primary" data-action="new-list">Erste Liste anlegen</button>
    </div>`;
  }

  return `${head}
    <div class="card"><button class="surprise" data-action="surprise" ${open.length ? '' : 'disabled'}>
      <span class="big">🎲</span><span><strong>Überrasch mich</strong><span class="sub">${open.length ? `Ein zufälliger Vorschlag aus ${open.length} offenen Einträgen` : 'Gerade ist nichts offen'}</span></span>
    </button></div>
    <h3 class="section-title">Listen</h3>
    <div class="card">${lists.map((l) => {
      const n = state.todos.filter((t) => t.listId === l.id && inPool(t, today)).length;
      return `<div class="row"><button class="row-main" data-action="open-list" data-id="${l.id}">
        <span class="emoji">${l.icon}</span><span class="name" style="flex:1">${esc(l.name)}</span>
        <span class="count">${n}</span><svg class="chevron" viewBox="0 0 8 14">${ICON.right.replace(/<\/?svg[^>]*>/g, '')}</svg>
      </button></div>`;
    }).join('')}</div>`;
}

function renderPoolList(list, today) {
  const items = state.todos.filter((t) => t.listId === list.id);
  const open = items.filter((t) => !t.completedAt).sort(byOrder);
  const done = items.filter((t) => t.completedAt).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  return `
    <header class="nav">
      <div class="nav-side"><button class="back" data-action="close-list">${ICON.back}<span>Pool</span></button></div>
      <div class="nav-side right"><button class="link" data-action="edit-list" data-id="${list.id}">Bearbeiten</button></div>
    </header>
    <h1 class="large-title">${list.icon} ${esc(list.name)}</h1>
    <div class="card">
      ${open.map((t) => {
        const planned = t.plannedDay && t.plannedDay >= today;
        return `<div class="row">
          <button class="row-main" data-action="edit-todo" data-id="${t.id}"><span class="name">${esc(t.title)}</span></button>
          <div class="controls">${planned
            ? `<button class="pill filled" data-action="unplan" data-id="${t.id}">${t.plannedDay === today ? 'Heute' : esc(fmt(t.plannedDay, { weekday: 'short' }))} ✓</button>`
            : `<button class="pill" data-action="plan-today" data-id="${t.id}">Auf Heute</button>`}</div>
        </div>`;
      }).join('')}
      <form class="row add-row" data-form="add-pool-item">
        <span class="plus">+</span>
        <input id="pool-new" name="title" placeholder="Neuer Eintrag" autocomplete="off" enterkeyhint="done">
      </form>
    </div>
    <p class="section-footer">Tippe auf „Auf Heute“, um dir etwas in deinen Tag zu holen. Was du nicht schaffst, landet morgen wieder hier.</p>
    ${done.length ? `<h3 class="section-title">Erledigt</h3><div class="card">${done.map((t) => `<div class="row">
      <span class="row-main"><span class="name struck">${esc(t.title)}</span></span>
      <div class="controls"><button class="small-link" data-action="restore" data-id="${t.id}">Zurückholen</button></div>
    </div>`).join('')}</div>` : ''}
  `;
}

function renderProgress() {
  const today = todayKey();
  const habits = [...state.habits].sort(byOrder);
  const rows = habits.map((h) => {
    const s = streak(h);
    const w = rate(h, 7), m = rate(h, 30);
    const dots = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const cls = !isActive(h, d) ? 'off' : isDone(h, d) ? 'on' : '';
      dots.push(`<i class="${cls}" title="${esc(fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }))}"></i>`);
    }
    return `<div class="stat">
      <div class="stat-head"><span class="emoji">${h.icon}</span><span class="name">${esc(h.name)}</span><span class="streak">${s > 0 ? `🔥 ${s} ${s === 1 ? 'Tag' : 'Tage'}` : ''}</span></div>
      <div class="stat-sub">Woche ${w === null ? '–' : w + ' %'} · 30 Tage ${m === null ? '–' : m + ' %'}</div>
      <div class="dots">${dots.join('')}</div>
    </div>`;
  }).join('');

  const doneTodos = state.todos.filter((t) => t.completedAt && t.completedAt > addDays(today, -7)).length;

  return `
    <header class="nav"><div class="nav-side"></div><div class="nav-side"></div></header>
    <h1 class="large-title">Fortschritt</h1>
    <div class="card">${rows || '<p class="empty">Noch keine Habits angelegt.</p>'}</div>
    <p class="section-footer">Serie = Tage am Stück. Die Kästchen zeigen die letzten 14 Tage. In den letzten 7 Tagen hast du ${doneTodos} ${doneTodos === 1 ? 'To-Do' : 'To-Dos'} erledigt.</p>

    <h3 class="section-title">Deine Daten</h3>
    <div class="card">
      <div class="row"><button class="row-main" data-action="export"><span class="emoji">💾</span><span class="name">Sicherung herunterladen</span></button></div>
      <div class="row"><label class="row-main" style="cursor:pointer"><span class="emoji">📂</span><span class="name">Sicherung laden</span><input type="file" accept="application/json,.json" data-action="import" hidden></label></div>
    </div>
    <p class="section-footer">Alles bleibt nur auf diesem iPhone gespeichert. Eine Sicherung ab und zu schadet nicht.</p>
  `;
}

/* ---------- Sheets ---------- */
function sheetShell(title, left, right, body) {
  return `<div class="overlay" data-action="overlay"><div class="sheet" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><div class="left">${left}</div><h2>${esc(title)}</h2><div class="right">${right}</div></div>
    <div class="sheet-body">${body}</div>
  </div></div>`;
}
const cancelBtn = '<button class="link" data-action="close-sheet">Abbrechen</button>';

function renderSheet() {
  const s = ui.sheet;
  if (!s) return '';
  const dr = ui.draft || {};

  if (s.type === 'add-menu') {
    return `<div class="overlay" data-action="overlay"><div class="sheet"><div class="sheet-head"><div class="left">${cancelBtn}</div><h2>Hinzufügen</h2><div></div></div>
      <div class="sheet-body"><div class="card">
        <button class="menu-option" data-action="open-catalog"><span class="big">🔁</span><span><strong>Habit</strong><span class="sub">Jeden Tag oder an bestimmten Wochentagen</span></span></button>
        <button class="menu-option" data-action="new-todo"><span class="big">📌</span><span><strong>To-Do</strong><span class="sub">Einmalig, für heute oder einen anderen Tag</span></span></button>
        <button class="menu-option" data-action="go-pool-new"><span class="big">🪣</span><span><strong>Pool-Liste</strong><span class="sub">Für Dinge, die du irgendwann machen willst</span></span></button>
      </div></div></div></div>`;
  }

  if (s.type === 'catalog') {
    const names = new Set(state.habits.map((h) => h.name));
    const body = `<div class="card" style="margin-top:6px"><div class="row"><button class="row-main" data-action="habit-from" data-name=""><span class="emoji">➕</span><span class="name" style="color:var(--accent)">Eigenes Habit erstellen</span></button></div></div>
      ${CATALOG.map((c) => `<h3 class="section-title">${esc(c.name)}</h3><div class="card">${c.items.map((t) => `<div class="row"><button class="row-main" data-action="habit-from" data-name="${esc(t.name)}">
        <span class="emoji">${t.icon}</span><span class="name" style="flex:1">${esc(t.name)}</span>${names.has(t.name) ? '<span class="value">Schon dabei</span>' : ''}
        <svg class="chevron" viewBox="0 0 8 14">${ICON.right.replace(/<\/?svg[^>]*>/g, '')}</svg></button></div>`).join('')}</div>`).join('')}`;
    return sheetShell('Habit hinzufügen', cancelBtn, '', body);
  }

  if (s.type === 'habit-editor') {
    const isNew = !dr.id;
    const body = `
      <h3 class="section-title">Name</h3>
      <input class="field" id="habit-name" data-field="name" value="${esc(dr.name)}" placeholder="z.B. Meditieren" autocomplete="off">
      <h3 class="section-title">Art</h3>
      <div class="card">
        <div class="segmented">${[['check', 'Abhaken'], ['count', 'Zählen'], ['limit', 'Limit']].map(([k, l]) => `<button class="${dr.kind === k ? 'on' : ''}" data-action="set-kind" data-kind="${k}">${l}</button>`).join('')}</div>
        <div class="hint">${KIND_TEXT[dr.kind]}</div>
      </div>
      ${dr.kind !== 'check' ? `<h3 class="section-title">${dr.kind === 'count' ? 'Ziel' : 'Limit'}</h3>
      <div class="card">
        <label class="form-row"><span>${dr.kind === 'count' ? 'Ziel pro Tag' : 'Höchstens'}</span><input data-field="target" inputmode="decimal" value="${esc(dr.target)}"></label>
        ${dr.kind === 'count' ? `<label class="form-row"><span>Pro Tipp</span><input data-field="step" inputmode="decimal" value="${esc(dr.step)}"></label>` : ''}
        <label class="form-row"><span>Einheit</span><input data-field="unit" value="${esc(dr.unit)}" placeholder="z.B. L oder min"></label>
      </div>` : ''}
      <h3 class="section-title">An welchen Tagen?</h3>
      <div class="card"><div class="weekdays">${WEEKDAYS.map(([n, l]) => `<button class="${dr.weekdays.includes(n) ? 'on' : ''}" data-action="toggle-weekday" data-n="${n}">${l}</button>`).join('')}</div></div>
      <h3 class="section-title">Symbol</h3>
      <div class="card"><div class="icon-grid">${(HABIT_ICONS.includes(dr.icon) ? HABIT_ICONS : [dr.icon, ...HABIT_ICONS]).map((i) => `<button class="${dr.icon === i ? 'on' : ''}" data-action="set-icon" data-icon="${i}">${i}</button>`).join('')}</div></div>
      ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
      ${isNew ? '' : `<div class="card" style="margin-top:28px"><button class="btn-danger" data-action="delete-habit">${dr.confirmDelete ? 'Wirklich löschen? Nochmal tippen' : 'Habit löschen'}</button></div>`}`;
    return sheetShell(isNew ? 'Neues Habit' : 'Habit bearbeiten', isNew && s.fromCatalog ? '<button class="link" data-action="open-catalog">Zurück</button>' : cancelBtn,
      `<button class="link" style="font-weight:600" data-action="save-habit">${isNew ? 'Hinzufügen' : 'Sichern'}</button>`, body);
  }

  if (s.type === 'todo-editor') {
    const isNew = !dr.id;
    const t = dr.id ? todoById(dr.id) : null;
    const today = todayKey();
    const body = `
      <h3 class="section-title">Was ist zu tun?</h3>
      <input class="field" id="todo-title" data-field="title" value="${esc(dr.title)}" placeholder="z.B. Malle Flüge buchen" autocomplete="off" enterkeyhint="done">
      ${dr.isPool ? '' : `<h3 class="section-title">Wann?</h3>
      <div class="card">
        <div class="segmented" style="margin-bottom:10px">${[['today', 'Heute'], ['tomorrow', 'Morgen'], ['date', 'Datum']].map(([k, l]) => `<button class="${dr.when === k ? 'on' : ''}" data-action="set-when" data-when="${k}">${l}</button>`).join('')}</div>
        ${dr.when === 'date' ? `<label class="form-row"><span>Datum</span><input type="date" data-field="date" value="${esc(dr.date)}" min="${today}"></label>` : ''}
      </div>
      <p class="section-footer">Nicht geschafft? Dann rutscht es automatisch auf den nächsten Tag.</p>`}
      ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
      ${isNew ? '' : `<div class="card" style="margin-top:28px">
        ${t && t.listId && !t.completedAt && t.plannedDay && t.plannedDay >= today ? '<button class="btn-plain" style="color:var(--accent)" data-action="back-to-pool">Zurück in den Pool</button>' : ''}
        <button class="btn-danger" data-action="delete-todo">${dr.confirmDelete ? 'Wirklich löschen? Nochmal tippen' : 'Löschen'}</button>
      </div>`}`;
    return sheetShell(isNew ? 'Neues To-Do' : (dr.isPool ? 'Eintrag bearbeiten' : 'To-Do bearbeiten'), cancelBtn,
      `<button class="link" style="font-weight:600" data-action="save-todo">${isNew ? 'Hinzufügen' : 'Sichern'}</button>`, body);
  }

  if (s.type === 'list-editor') {
    const isNew = !dr.id;
    const body = `
      <h3 class="section-title">Name</h3>
      <input class="field" id="list-name" data-field="name" value="${esc(dr.name)}" placeholder="z.B. Haushalt, Lesen, Irgendwann" autocomplete="off" enterkeyhint="done">
      <h3 class="section-title">Symbol</h3>
      <div class="card"><div class="icon-grid">${LIST_ICONS.map((i) => `<button class="${dr.icon === i ? 'on' : ''}" data-action="set-icon" data-icon="${i}">${i}</button>`).join('')}</div></div>
      ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
      ${isNew ? '' : `<div class="card" style="margin-top:28px"><button class="btn-danger" data-action="delete-list">${dr.confirmDelete ? 'Liste mit allen Einträgen löschen?' : 'Liste löschen'}</button></div>`}`;
    return sheetShell(isNew ? 'Neue Liste' : 'Liste bearbeiten', cancelBtn,
      `<button class="link" style="font-weight:600" data-action="save-list">${isNew ? 'Anlegen' : 'Sichern'}</button>`, body);
  }

  if (s.type === 'limit-entry') {
    const h = habitById(s.id);
    if (!h) return '';
    const has = getValue(h, ui.day) !== undefined;
    return `<div class="overlay center" data-action="overlay"><form class="dialog" data-form="limit-entry">
      <div class="big">${h.icon}</div>
      <h3>${esc(h.name)}</h3>
      <p>Wie viel war es ${ui.day === todayKey() ? 'heute' : 'an diesem Tag'}? Limit: ${num(h.target)} ${esc(h.unit)}</p>
      <input class="field" id="limit-value" name="value" inputmode="decimal" autocomplete="off" placeholder="Wert in ${esc(h.unit)}" value="${has ? esc(num(getValue(h, ui.day))) : ''}">
      <div class="stack">
        <button class="btn-primary" type="submit">Speichern</button>
        ${has ? '<button class="btn-plain" type="button" data-action="clear-limit" style="color:#ff3b30">Eintrag löschen</button>' : ''}
        <button class="btn-plain" type="button" data-action="close-sheet">Abbrechen</button>
      </div>
    </form></div>`;
  }

  if (s.type === 'surprise') {
    const t = todoById(s.id);
    if (!t) return '';
    const list = listById(t.listId);
    const others = state.todos.filter((x) => inPool(x, todayKey())).length > 1;
    return `<div class="overlay center" data-action="overlay"><div class="dialog">
      <div class="big">${list ? list.icon : '🎲'}</div>
      <h3>Wie wäre es damit?</h3>
      <p style="font-size:17px;color:var(--text);margin-bottom:4px"><strong>${esc(t.title)}</strong></p>
      <p>aus „${esc(list ? list.name : '')}“</p>
      <div class="stack">
        <button class="btn-primary" data-action="surprise-take">Auf Heute holen</button>
        ${others ? '<button class="btn-secondary" data-action="surprise">Andere Idee</button>' : ''}
        <button class="btn-plain" data-action="close-sheet">Lieber nicht</button>
      </div>
    </div></div>`;
  }
  return '';
}

/* ---------- Aktionen ---------- */
function openSheet(sheet, draft = null, focus = null) {
  ui.sheet = sheet;
  ui.draft = draft;
  ui.focus = focus;
  render();
}
function closeSheet() { ui.sheet = null; ui.draft = null; render(); }
function toast(text) {
  ui.toast = text;
  render();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { ui.toast = null; render(); }, 1800);
}
function commit() { persist(); render(); }

function habitDraft(h, template) {
  const src = h || template || { name: '', icon: '✅', kind: 'check', target: 1, step: 1, unit: '' };
  return {
    id: h ? h.id : null, name: src.name, icon: src.icon, kind: src.kind,
    target: src.kind === 'check' ? '' : num(src.target ?? 1), step: num(src.step ?? 1), unit: src.unit ?? '',
    weekdays: h ? [...h.weekdays] : [0, 1, 2, 3, 4, 5, 6],
  };
}

function saveHabit() {
  const dr = ui.draft;
  const name = (dr.name || '').trim();
  const target = dr.kind === 'check' ? 1 : parseNum(dr.target);
  const step = dr.kind === 'count' ? parseNum(dr.step) : 1;
  if (!name) return fail('Bitte gib dem Habit einen Namen.');
  if (dr.kind !== 'check' && !(target > 0)) return fail('Bitte gib einen Zielwert größer als 0 ein.');
  if (dr.kind === 'count' && !(step > 0)) return fail('Bitte gib eine Schrittweite größer als 0 ein.');
  if (!dr.weekdays.length) return fail('Wähle mindestens einen Wochentag.');
  const values = { name, icon: dr.icon, kind: dr.kind, target, step, unit: (dr.unit || '').trim(), weekdays: [...dr.weekdays].sort() };
  if (dr.id) Object.assign(habitById(dr.id), values);
  else state.habits.push({ ...makeHabit(values, nextOrder(state.habits)), ...values });
  ui.sheet = null; ui.draft = null;
  persist();
  toast(dr.id ? 'Gesichert' : `„${name}“ hinzugefügt`);
}

function fail(message) { ui.draft.error = message; render(); }

function todoDraft(t) {
  const today = todayKey();
  if (!t) return { id: null, title: '', when: 'today', date: addDays(today, 2), isPool: false };
  let when = 'today';
  if (t.plannedDay === addDays(today, 1)) when = 'tomorrow';
  else if (t.plannedDay && t.plannedDay > addDays(today, 1)) when = 'date';
  return { id: t.id, title: t.title, when, date: t.plannedDay && t.plannedDay > today ? t.plannedDay : addDays(today, 2), isPool: !!t.listId };
}

function saveTodo() {
  const dr = ui.draft;
  const title = (dr.title || '').trim();
  if (!title) return fail('Bitte schreib kurz, was zu tun ist.');
  const today = todayKey();
  const plannedDay = dr.when === 'tomorrow' ? addDays(today, 1) : dr.when === 'date' ? (dr.date || today) : today;
  if (dr.id) {
    const t = todoById(dr.id);
    t.title = title;
    if (!t.listId && !t.completedAt) t.plannedDay = plannedDay;
  } else {
    state.todos.push({ id: uid(), title, plannedDay, completedAt: null, createdAt: today, listId: null, order: nextOrder(state.todos) });
  }
  ui.sheet = null; ui.draft = null;
  persist();
  toast(dr.id ? 'Gesichert' : plannedDay === today ? 'Steht auf Heute' : `Geplant für ${fmt(plannedDay, { weekday: 'long' })}`);
}

function saveList() {
  const dr = ui.draft;
  const name = (dr.name || '').trim();
  if (!name) return fail('Bitte gib der Liste einen Namen.');
  if (dr.id) Object.assign(listById(dr.id), { name, icon: dr.icon });
  else {
    const list = { id: uid(), name, icon: dr.icon, order: nextOrder(state.lists) };
    state.lists.push(list);
    ui.tab = 'pool';
    ui.poolListId = list.id;
    ui.focus = '#pool-new';
  }
  ui.sheet = null; ui.draft = null;
  commit();
}

function pickSurprise() {
  const today = todayKey();
  const open = state.todos.filter((t) => inPool(t, today));
  if (!open.length) return;
  const current = ui.sheet && ui.sheet.type === 'surprise' ? ui.sheet.id : null;
  const choices = open.length > 1 ? open.filter((t) => t.id !== current) : open;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  openSheet({ type: 'surprise', id: pick.id });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `daruma-sicherung-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = normalize(JSON.parse(reader.result));
      if (!data.habits.length && !data.todos.length) throw new Error('leer');
      data.setupDone = true;
      state = data;
      ui.tab = 'today'; ui.day = todayKey();
      persist();
      toast('Sicherung geladen');
    } catch (e) {
      toast('Die Datei konnte nicht gelesen werden');
    }
  };
  reader.readAsText(file);
}

const actions = {
  tab(el) { ui.tab = el.dataset.tab; if (ui.tab === 'pool') ui.poolListId = null; window.scrollTo(0, 0); render(); },
  'go-today'() { ui.day = todayKey(); render(); },
  'select-day'(el) { ui.day = el.dataset.day; render(); },
  'shift-week'(el) { ui.day = addDays(ui.day, 7 * Number(el.dataset.n)); render(); },
  poke(el) { el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); },

  'toggle-habit'(el) { const h = habitById(el.dataset.id); setValue(h, ui.day, isDone(h, ui.day) ? 0 : 1); commit(); },
  step(el) { const h = habitById(el.dataset.id); setValue(h, ui.day, Math.max(0, valueOf(h, ui.day) + Number(el.dataset.dir) * h.step)); commit(); },
  'limit-entry'(el) { openSheet({ type: 'limit-entry', id: el.dataset.id }, null, '#limit-value'); },
  'clear-limit'() { const h = habitById(ui.sheet.id); delete state.logs[logKey(h, ui.day)]; ui.sheet = null; commit(); },
  'edit-habit'(el) { openSheet({ type: 'habit-editor' }, habitDraft(habitById(el.dataset.id))); },

  'toggle-todo'(el) {
    const t = todoById(el.dataset.id);
    t.completedAt = t.completedAt ? null : ui.day;
    if (!t.completedAt && t.listId && (!t.plannedDay || t.plannedDay < todayKey())) t.plannedDay = todayKey();
    commit();
  },
  'edit-todo'(el) { openSheet({ type: 'todo-editor' }, todoDraft(todoById(el.dataset.id))); },
  'new-todo'() { openSheet({ type: 'todo-editor' }, todoDraft(null), '#todo-title'); },
  'set-when'(el) { ui.draft.when = el.dataset.when; render(); },
  'save-todo'() { saveTodo(); },
  'delete-todo'() {
    if (!ui.draft.confirmDelete) { ui.draft.confirmDelete = true; return render(); }
    state.todos = state.todos.filter((t) => t.id !== ui.draft.id);
    ui.sheet = null; ui.draft = null; commit();
  },
  'back-to-pool'() { const t = todoById(ui.draft.id); t.plannedDay = null; ui.sheet = null; ui.draft = null; persist(); toast('Zurück im Pool'); },

  'open-add'() { openSheet({ type: 'add-menu' }); },
  'open-catalog'() { openSheet({ type: 'catalog' }); },
  'habit-from'(el) {
    const tpl = el.dataset.name ? findTemplate(el.dataset.name) : null;
    openSheet({ type: 'habit-editor', fromCatalog: true }, habitDraft(null, tpl), tpl ? null : '#habit-name');
  },
  'set-kind'(el) {
    const k = el.dataset.kind;
    const dr = ui.draft;
    if (dr.kind === 'check' && k !== 'check' && !dr.target) dr.target = k === 'limit' ? '90' : '3';
    dr.kind = k; render();
  },
  'toggle-weekday'(el) {
    const n = Number(el.dataset.n), w = ui.draft.weekdays;
    ui.draft.weekdays = w.includes(n) ? w.filter((x) => x !== n) : [...w, n];
    render();
  },
  'move-habit'(el) {
    const list = [...state.habits].sort(byOrder);
    const i = list.findIndex((h) => h.id === el.dataset.id), j = i + Number(el.dataset.dir);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((h, n) => { h.order = n; });
    commit();
  },
  'ob-next'() {
    const ob = ui.ob;
    if (ob.step === 0) { const f = document.getElementById('ob-name'); ob.name = f ? f.value.trim() : ''; }
    if (ob.step >= 3) return finishOnboarding();
    ob.step++; window.scrollTo(0, 0); render();
  },
  'ob-back'() { ui.ob.step = Math.max(0, ui.ob.step - 1); window.scrollTo(0, 0); render(); },
  'ob-habit'(el) { const a = ui.ob.habits, n = el.dataset.name; ui.ob.habits = a.includes(n) ? a.filter((x) => x !== n) : [...a, n]; render(); },
  'ob-list'(el) { const a = ui.ob.lists, n = el.dataset.name; ui.ob.lists = a.includes(n) ? a.filter((x) => x !== n) : [...a, n]; render(); },
  'set-icon'(el) { ui.draft.icon = el.dataset.icon; render(); },
  'save-habit'() { saveHabit(); },
  'delete-habit'() {
    if (!ui.draft.confirmDelete) { ui.draft.confirmDelete = true; return render(); }
    deleteHabit(ui.draft.id); ui.sheet = null; ui.draft = null; commit();
  },

  'new-list'() { openSheet({ type: 'list-editor' }, { id: null, name: '', icon: LIST_ICONS[0] }, '#list-name'); },
  'go-pool-new'() { ui.tab = 'pool'; ui.poolListId = null; actions['new-list'](); },
  'edit-list'(el) { const l = listById(el.dataset.id); openSheet({ type: 'list-editor' }, { id: l.id, name: l.name, icon: l.icon }); },
  'save-list'() { saveList(); },
  'delete-list'() {
    if (!ui.draft.confirmDelete) { ui.draft.confirmDelete = true; return render(); }
    const id = ui.draft.id;
    state.lists = state.lists.filter((l) => l.id !== id);
    state.todos = state.todos.filter((t) => t.listId !== id);
    ui.poolListId = null; ui.sheet = null; ui.draft = null; commit();
  },
  'open-list'(el) { ui.poolListId = el.dataset.id; window.scrollTo(0, 0); render(); },
  'close-list'() { ui.poolListId = null; render(); },
  'plan-today'(el) { todoById(el.dataset.id).plannedDay = todayKey(); persist(); toast('Steht jetzt auf Heute'); },
  unplan(el) { todoById(el.dataset.id).plannedDay = null; commit(); },
  restore(el) { const t = todoById(el.dataset.id); t.completedAt = null; t.plannedDay = null; commit(); },
  surprise() { pickSurprise(); },
  'surprise-take'() { todoById(ui.sheet.id).plannedDay = todayKey(); ui.sheet = null; persist(); toast('Steht jetzt auf Heute'); },

  export() { exportData(); },
  'close-sheet'() { closeSheet(); },
  overlay(el, ev) { if (ev.target === el) closeSheet(); },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn || el.dataset.action === 'import') return;
  if (el.dataset.action !== 'overlay') ev.preventDefault();
  fn(el, ev);
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.field && ui.draft) ui.draft[el.dataset.field] = el.value;
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.action === 'import' && el.files && el.files[0]) importData(el.files[0]);
});

document.addEventListener('submit', (ev) => {
  const form = ev.target;
  ev.preventDefault();
  if (form.dataset.form === 'add-pool-item') {
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) return;
    state.todos.push({ id: uid(), title, plannedDay: null, completedAt: null, createdAt: todayKey(), listId: ui.poolListId, order: nextOrder(state.todos) });
    ui.focus = '#pool-new';
    commit();
  } else if (form.dataset.form === 'limit-entry') {
    const v = parseNum(form.querySelector('input').value);
    if (!(v >= 0)) return;
    setValue(habitById(ui.sheet.id), ui.day, v);
    ui.sheet = null;
    commit();
  }
});

// Enter in Text-Feldern der Sheets = Sichern
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.id === 'ob-name') { ev.preventDefault(); actions['ob-next'](); return; }
  if (ev.key !== 'Enter' || !ui.sheet || ev.target.tagName !== 'INPUT' || ev.target.closest('form')) return;
  ev.preventDefault();
  if (ui.sheet.type === 'todo-editor') saveTodo();
  else if (ui.sheet.type === 'list-editor') saveList();
  else if (ui.sheet.type === 'habit-editor') saveHabit();
});

// Neuer Tag, während die App offen ist
let lastToday = todayKey();
function checkNewDay() {
  const t = todayKey();
  if (t !== lastToday) { if (ui.day === lastToday) ui.day = t; lastToday = t; render(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkNewDay(); });
setInterval(checkNewDay, 60 * 1000);

/* ---------- Demo-Daten (nur mit ?demo=...) ---------- */
function demoState(scene) {
  const today = todayKey();
  const s = { version: 1, name: 'Matti', setupDone: true, habits: [], logs: {}, todos: [], lists: [] };
  const tpls = [...STARTER, findTemplate('10 Minuten Dehnen'), findTemplate('10 Seiten lesen')];
  tpls.forEach((t, i) => {
    const h = makeHabit(t, i);
    h.createdAt = addDays(today, -30);
    s.habits.push(h);
    for (let o = 1; o <= 30; o++) {
      if ((o + i) % 3 === 0 && o % 4 !== 0) continue;
      s.logs[`${h.id}|${addDays(today, -o)}`] = h.kind === 'check' ? 1 : h.kind === 'count' ? h.target : (o % 2 === 0 ? 70 : 110);
    }
  });
  const vals = scene === 'alldone' ? [1, 3, 75, 1, 1] : [1, 1.5, undefined, 1, undefined];
  vals.forEach((v, i) => { if (v !== undefined) s.logs[`${s.habits[i].id}|${today}`] = v; });

  const lists = [
    ['Haushalt', '🏠', ['Keller aufräumen', 'Fenster putzen', 'Lampe im Flur aufhängen', 'Fahrrad reparieren']],
    ['Lesen', '📚', ['„Atomic Habits“ lesen', '„Der Alchimist“ lesen']],
    ['Irgendwann', '⭐', ['Kochkurs buchen', 'Fotoalbum 2025 gestalten', 'Japanisch-Grundlagen lernen']],
  ];
  let order = 0;
  lists.forEach(([name, icon, items], li) => {
    const list = { id: uid(), name, icon, order: li };
    s.lists.push(list);
    items.forEach((title) => s.todos.push({ id: uid(), title, plannedDay: null, completedAt: null, createdAt: addDays(today, -10), listId: list.id, order: order++ }));
  });
  s.todos[0].plannedDay = today; // Keller aufräumen auf Heute geholt
  s.todos[1].completedAt = addDays(today, -3); // Fenster putzen erledigt
  s.todos.push({ id: uid(), title: 'Malle Flüge buchen', plannedDay: today, completedAt: null, createdAt: today, listId: null, order: order++ });
  s.todos.push({ id: uid(), title: 'Geschenk für Mama besorgen', plannedDay: addDays(today, -2), completedAt: null, createdAt: addDays(today, -2), listId: null, order: order++ });
  s.todos.push({ id: uid(), title: 'Steuerunterlagen sortieren', plannedDay: today, completedAt: today, createdAt: today, listId: null, order: order++ });
  return s;
}

function applyDemoScene(scene) {
  const today = todayKey();
  if (scene === 'yesterday') ui.day = addDays(today, -1);
  if (scene === 'pool') ui.tab = 'pool';
  if (scene === 'poollist') { ui.tab = 'pool'; ui.poolListId = state.lists[0].id; }
  if (scene === 'surprise') { ui.tab = 'pool'; ui.sheet = { type: 'surprise', id: state.todos[6].id }; }
  if (scene === 'progress') ui.tab = 'progress';
  if (scene === 'habits') ui.tab = 'habits';
  if (scene.startsWith('onboarding')) { state.setupDone = false; ui.ob.step = Number(scene.slice(10)) || 0; }
  if (scene === 'catalog' || scene === 'editor') ui.tab = 'habits';
  if (scene === 'catalog') ui.sheet = { type: 'catalog' };
  if (scene === 'editor') { ui.sheet = { type: 'habit-editor' }; ui.draft = habitDraft(state.habits[1]); }
  if (scene === 'todo') { ui.sheet = { type: 'todo-editor' }; ui.draft = { ...todoDraft(null), title: 'Zahnarzttermin machen', when: 'tomorrow' }; }
  if (scene === 'alldone') ui.lastAllDone[today] = false;
}

/* ---------- Start ---------- */
if (DEMO) applyDemoScene(DEMO);
render();

if (!DEMO && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
if (!DEMO && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
