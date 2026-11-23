'use strict';

/* =====================================================================
   Daruma – Habits, To-Dos und Projekte für Langzeit-Aufgaben.
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
const parseNum = (s) => {
  let t = String(s).trim().replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, ''); // 10.000 = zehntausend
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

/* ---------- Piktogramme (Lucide, ISC-Lizenz) ---------- */
const PICTO = {"bed":"<path d=\"M2 4v16\"/><path d=\"M2 8h18a2 2 0 0 1 2 2v10\"/><path d=\"M2 17h20\"/><path d=\"M6 8v9\"/>","bed-double":"<path d=\"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8\"/><path d=\"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4\"/><path d=\"M12 4v6\"/><path d=\"M2 18h20\"/>","biceps-flexed":"<path d=\"M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1\"/><path d=\"M15 14a5 5 0 0 0-7.584 2\"/><path d=\"M9.964 6.825C8.019 7.977 9.5 13 8 15\"/>","book":"<path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\"/>","book-open":"<path d=\"M12 7v14\"/><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"/>","brain":"<path d=\"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z\"/><path d=\"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z\"/><path d=\"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4\"/><path d=\"M17.599 6.5a3 3 0 0 0 .399-1.375\"/><path d=\"M6.003 5.125A3 3 0 0 0 6.401 6.5\"/><path d=\"M3.477 10.896a4 4 0 0 1 .585-.396\"/><path d=\"M19.938 10.5a4 4 0 0 1 .585.396\"/><path d=\"M6 18a4 4 0 0 1-1.967-.516\"/><path d=\"M19.967 17.484A4 4 0 0 1 18 18\"/>","briefcase":"<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>","camera":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/>","car":"<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><path d=\"M9 17h6\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>","carrot":"<path d=\"M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46\"/><path d=\"M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z\"/><path d=\"M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z\"/>","cat":"<path d=\"M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z\"/><path d=\"M8 14v.5\"/><path d=\"M16 14v.5\"/><path d=\"M11.25 16.25h1.5L12 17l-.75-.75Z\"/>","check":"<path d=\"M20 6 9 17l-5-5\"/>","chef-hat":"<path d=\"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z\"/><path d=\"M6 17h12\"/>","circle-help":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>","clapperboard":"<path d=\"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z\"/><path d=\"m6.2 5.3 3.1 3.9\"/><path d=\"m12.4 3.4 3.1 4\"/><path d=\"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z\"/>","clipboard-list":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>","clipboard-pen":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5\"/><path d=\"M4 13.5V6a2 2 0 0 1 2-2h2\"/><path d=\"M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/>","cloud-sun":"<path d=\"M12 2v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"M20 12h2\"/><path d=\"m19.07 4.93-1.41 1.41\"/><path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\"/><path d=\"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z\"/>","coffee":"<path d=\"M10 2v2\"/><path d=\"M14 2v2\"/><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"/><path d=\"M6 2v2\"/>","compass":"<path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>","dices":"<rect width=\"12\" height=\"12\" x=\"2\" y=\"10\" rx=\"2\" ry=\"2\"/><path d=\"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6\"/><path d=\"M6 18h.01\"/><path d=\"M10 14h.01\"/><path d=\"M15 6h.01\"/><path d=\"M18 9h.01\"/>","dog":"<path d=\"M11.25 16.25h1.5L12 17z\"/><path d=\"M16 14v.5\"/><path d=\"M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309\"/><path d=\"M8 14v.5\"/><path d=\"M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5\"/>","droplet":"<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"/>","dumbbell":"<path d=\"M14.4 14.4 9.6 9.6\"/><path d=\"M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z\"/><path d=\"m21.5 21.5-1.4-1.4\"/><path d=\"M3.9 3.9 2.5 2.5\"/><path d=\"M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z\"/>","flower-2":"<path d=\"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1\"/><circle cx=\"12\" cy=\"8\" r=\"2\"/><path d=\"M12 10v12\"/><path d=\"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z\"/><path d=\"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z\"/>","folder":"<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>","folder-open":"<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>","footprints":"<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\"/><path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\"/><path d=\"M16 17h4\"/><path d=\"M4 13h4\"/>","gamepad-2":"<line x1=\"6\" x2=\"10\" y1=\"11\" y2=\"11\"/><line x1=\"8\" x2=\"8\" y1=\"9\" y2=\"13\"/><line x1=\"15\" x2=\"15.01\" y1=\"12\" y2=\"12\"/><line x1=\"18\" x2=\"18.01\" y1=\"10\" y2=\"10\"/><path d=\"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z\"/>","gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\"/>","graduation-cap":"<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"/><path d=\"M22 10v6\"/><path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/>","hammer":"<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\"/><path d=\"m18 15 4-4\"/><path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\"/>","hand-heart":"<path d=\"M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16\"/><path d=\"m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\"/><path d=\"m2 15 6 6\"/><path d=\"M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z\"/>","heart":"<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/>","hourglass":"<path d=\"M5 22h14\"/><path d=\"M5 2h14\"/><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"/><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"/>","house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>","leaf":"<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"/><path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\"/>","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>","luggage":"<path d=\"M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2\"/><path d=\"M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14\"/><path d=\"M10 20h4\"/><circle cx=\"16\" cy=\"20\" r=\"2\"/><circle cx=\"8\" cy=\"20\" r=\"2\"/>","message-circle":"<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>","moon":"<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>","music":"<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>","notebook-pen":"<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"/><path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/>","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\"/><path d=\"m7.5 4.27 9 5.15\"/>","palette":"<circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"/><path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\"/>","person-standing":"<circle cx=\"12\" cy=\"5\" r=\"1\"/><path d=\"m9 20 3-6 3 6\"/><path d=\"m6 8 6 2 6-2\"/><path d=\"M12 10v4\"/>","piggy-bank":"<path d=\"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z\"/><path d=\"M2 9v1c0 1.1.9 2 2 2h1\"/><path d=\"M16 11h.01\"/>","pill":"<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\"/><path d=\"m8.5 8.5 7 7\"/>","pin":"<path d=\"M12 17v5\"/><path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z\"/>","plane":"<path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\"/>","plus":"<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>","repeat":"<path d=\"m17 2 4 4-4 4\"/><path d=\"M3 11v-1a4 4 0 0 1 4-4h14\"/><path d=\"m7 22-4-4 4-4\"/><path d=\"M21 13v1a4 4 0 0 1-4 4H3\"/>","save":"<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"/><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"/><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"/>","shopping-cart":"<circle cx=\"8\" cy=\"21\" r=\"1\"/><circle cx=\"19\" cy=\"21\" r=\"1\"/><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"/>","smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M12 18h.01\"/>","smile":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M8 14s1.5 2 4 2 4-2 4-2\"/><line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\"/><line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\"/>","sparkles":"<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"/><path d=\"M20 3v4\"/><path d=\"M22 5h-4\"/><path d=\"M4 17v2\"/><path d=\"M5 18H3\"/>","sprout":"<path d=\"M7 20h10\"/><path d=\"M10 20c5.5-2.5.8-6.4 3-10\"/><path d=\"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z\"/><path d=\"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z\"/>","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>","target":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>","tent":"<path d=\"M3.5 21 14 3\"/><path d=\"M20.5 21 10 3\"/><path d=\"M15.5 21 12 15l-3.5 6\"/><path d=\"M2 21h20\"/>","thermometer":"<path d=\"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z\"/>","utensils":"<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\"/><path d=\"M7 2v20\"/><path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\"/>","wind":"<path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\"/><path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\"/><path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\"/>","wine":"<path d=\"M8 22h8\"/><path d=\"M7 10h10\"/><path d=\"M12 15v7\"/><path d=\"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z\"/>","trash-2":"<path d=\"M3 6h18\"/><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"/><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"/><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\"/><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\"/>","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>"};
const EMOJI_PICTO = {"💧": "droplet", "🚶": "footprints", "🏃": "dumbbell", "🤸": "person-standing", "🦵": "footprints", "🥕": "carrot", "🛏️": "bed", "📖": "book-open", "🧠": "brain", "⏳": "hourglass", "📵": "smartphone", "✨": "sparkles", "🧘": "flower-2", "✍️": "notebook-pen", "🙏": "hand-heart", "🍃": "leaf", "💬": "message-circle", "✅": "check", "☕": "coffee", "🗒️": "clipboard-list", "💊": "pill", "🎵": "music", "💪": "biceps-flexed", "🌙": "moon", "☀️": "sun", "🐶": "dog", "🙂": "smile", "⚡": "zap", "😴": "bed-double", "🌪️": "wind", "🎯": "target", "🌤️": "cloud-sun", "💆": "heart", "🤕": "thermometer", "🍷": "wine", "❤️": "heart", "🍽️": "utensils", "❓": "circle-help", "📦": "package", "🏠": "house", "📚": "book", "🔨": "hammer", "✈️": "plane", "🛒": "shopping-cart", "🎁": "gift", "🎬": "clapperboard", "🍳": "chef-hat", "💡": "lightbulb", "🌱": "sprout", "🎨": "palette", "⭐": "star", "📷": "camera", "🎮": "gamepad-2", "🐱": "cat", "🚗": "car", "💼": "briefcase", "🎓": "graduation-cap", "🏡": "tent", "💰": "piggy-bank", "🧳": "luggage", "📌": "pin", "➕": "plus", "💾": "save", "📂": "folder-open", "🧭": "compass", "🔁": "repeat", "📁": "folder", "🎲": "dices", "📝": "clipboard-pen", "🗑️": "trash-2"};
// Gespeichert bleiben die bisherigen Zeichen, angezeigt wird ein einfarbiges Piktogramm.
function pic(icon) {
  const name = PICTO[icon] ? icon : EMOJI_PICTO[icon];
  if (!name) return esc(icon || '');
  return `<svg class="picto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICTO[name]}</svg>`;
}

/* ---------- Katalog ---------- */
// Namen ohne Mengen. Mengen stehen immer im Ziel (bearbeitbar), Ja/Nein-Habits haben keins.
const CATALOG = [
  { name: 'Körper', items: [
    { name: 'Wasser trinken', icon: '💧', kind: 'count', target: 3, step: 1, unit: 'L', fixedGoal: true },
    { name: 'Schritte', icon: '🚶', kind: 'count', target: 10000, step: 1000, unit: 'Schritte', fixedGoal: true },
    { name: 'Sport', icon: '🏃', kind: 'count', target: 30, step: 10, unit: 'min' },
    { name: 'Dehnen', icon: '🤸', kind: 'count', target: 10, step: 5, unit: 'min' },
    { name: 'Obst oder Gemüse', icon: '🥕', kind: 'count', target: 400, step: 100, unit: 'g' },
    { name: 'Schlafdauer', icon: '🛏️', kind: 'count', target: 8, step: 1, unit: 'h', fixedGoal: true },
  ] },
  { name: 'Geist', items: [
    { name: 'Lesen', icon: '📖', kind: 'count', target: 10, step: 5, unit: 'Seiten' },
    { name: 'Etwas Neues lernen', icon: '🧠', kind: 'count', target: 15, step: 5, unit: 'min' },
    { name: 'Bildschirmzeit', icon: '⏳', kind: 'limit', target: 90, step: 1, unit: 'min' },
    { name: 'Kein Handy im Bett', icon: '📵', kind: 'check' },
    { name: 'Aufräumen', icon: '✨', kind: 'count', target: 5, step: 5, unit: 'min' },
  ] },
  { name: 'Seele', items: [
    { name: 'Meditieren', icon: '🧘', kind: 'count', target: 10, step: 5, unit: 'min' },
    { name: 'Journaling', icon: '✍️', kind: 'check' },
    { name: 'Dankbarkeit', icon: '🙏', kind: 'count', target: 3, step: 1, unit: 'Dinge' },
    { name: 'Spaziergang ohne Handy', icon: '🍃', kind: 'count', target: 20, step: 10, unit: 'min' },
    { name: 'Bei Freunden oder Familie melden', icon: '💬', kind: 'check' },
  ] },
];
const findTemplate = (name) => CATALOG.flatMap((c) => c.items).find((t) => t.name === name);
const STARTER = ['Meditieren', 'Wasser trinken', 'Bildschirmzeit'].map(findTemplate);

const HABIT_ICONS = ['✅', '💧', '🧘', '📖', '🚶', '🏃', '🤸', '🦵', '🙏', '🍃', '🛏️', '📵',
  '☕', '⏳', '✨', '🗒️', '💊', '🥕', '🎵', '💪', '🌙', '☀️', '✍️', '🧠', '💬', '🐶'];
const LIST_ICONS = ['📦', '🏠', '📚', '🔨', '✈️', '🛒', '🎁', '🎬', '🍳', '💪', '💡', '🎵',
  '🌱', '🎨', '⭐', '❤️', '📷', '🎮', '🐶', '🐱', '🚗', '💼', '🎓', '🏡', '💰', '🧳'];
const KIND_TEXT = {
  check: 'Ja oder nein: einmal antippen, dann ist es für heute erledigt.',
  count: 'Mit Ziel und Einheit, z.B. 10 Seiten oder 3 L. Mit + und − zählst du hoch, ein Tipp auf den Namen hakt es ganz ab.',
  limit: 'Du trägst abends einen Wert ein. Erledigt, wenn er im Limit bleibt, z.B. Bildschirmzeit.',
  choice: 'Beim Abhaken wählst du aus, was du gemacht hast, z.B. welche Sportart. Was am längsten her ist, steht oben.',
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
// To-Dos rutschen immer auf den nächsten Tag. Habits werden nicht nachgeholt.
const catchesUp = () => false; // Nachholen gibt es nicht mehr (Matti, 23.11.): Vergessenes über die Wochenleiste abhaken
const rollsOver = () => true;
// Neue Nutzer starten leer und werden durch die Einrichtung geführt.
function freshState() {
  return { version: 1, name: '', setupDone: false, catchUpV2: true, habits: [], logs: {}, todos: [], lists: [], ...moduleDefaults() };
}
const moduleDefaults = () => ({ stepV2: true, checkinV2: true, checkinQuestions: [], checkins: {}, picks: {} });
function normalize(s) {
  // Einmalig: Standard für "Habits nachholen" ist jetzt aus. Kurz zuvor gesetzte Werte zurücksetzen.
  if (!s.catchUpV2 && Array.isArray(s.habits)) s.habits.forEach((h) => { delete h.catchUp; });
  // Einmalig: Wasser und Schlaf zählen pro Tipp um 1 (Mattis Wunsch).
  if (!s.stepV2 && Array.isArray(s.habits)) s.habits.forEach((h) => { if ((h.name === 'Wasser trinken' || h.name === 'Schlafdauer') && h.step === 0.5) h.step = 1; });
  return {
    version: 1,
    name: typeof s.name === 'string' ? s.name : '',
    setupDone: s.setupDone !== false, // bestehende Daten (ohne Feld) gelten als eingerichtet
    tourDone: !!s.tourDone,
    catchUpV2: true,
    habits: Array.isArray(s.habits) ? s.habits : [],
    logs: s.logs && typeof s.logs === 'object' ? s.logs : {},
    todos: Array.isArray(s.todos) ? s.todos : [],
    lists: Array.isArray(s.lists) ? s.lists : [],
    checkinV2: true,
    stepV2: true,
    // Check-in erscheint, sobald Fragen gewählt sind. Aus der kurzen Modul-Version nur übernehmen, wenn der Check-in an war.
    checkinQuestions: Array.isArray(s.checkinQuestions) && (s.checkinV2 || (Array.isArray(s.modules) && s.modules.some((m) => m.id === 'checkin' && m.on))) ? s.checkinQuestions.filter((q) => q.type === 'scale') : [],
    checkins: s.checkins && typeof s.checkins === 'object' ? s.checkins : {},
    collapsed: s.collapsed && typeof s.collapsed === 'object' ? s.collapsed : {},
    habitMode: s.habitMode === 'steps' ? 'steps' : 'whole',
    picks: s.picks && typeof s.picks === 'object' ? s.picks : {}, // Auswahl-Habits: was an dem Tag gewählt wurde
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
// Wöchentliche Habits (perWeek = x-mal pro Woche) zählen nicht in den Tag, sondern in die Woche.
const isWeekly = (h) => h.perWeek > 0;
const isActive = (h, d) => !isWeekly(h) && h.weekdays.includes(weekday(d)) && h.createdAt <= d;
function weekCount(h, d) {
  const start = weekStart(d);
  let n = 0;
  for (let i = 0; i < 7; i++) { const k = addDays(start, i); if (k >= h.createdAt && isDone(h, k)) n++; }
  return n;
}
function isDone(h, d) {
  const v = getValue(h, d);
  if (h.kind === 'check') return (v ?? 0) >= 1;
  if (h.kind === 'choice') return (v ?? 0) >= 1; // abgehakt wird wie bei Ja/Nein, die Auswahl ist nur die Notiz dazu
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
  for (const k of Object.keys(state.picks || {})) if (k.startsWith(id + '|')) delete state.picks[k];
}

/* ---------- Auswahl-Habits (z.B. Sport: Yoga, Laufen, ...) ---------- */
const minPick = (h) => (h.multi ? Math.max(1, h.minPick || 1) : 1);
const picksOf = (h, d) => (state.picks || {})[logKey(h, d)] || [];
function setPicks(h, d, names) {
  const k = logKey(h, d);
  state.picks = state.picks || {};
  if (names.length) state.picks[k] = names; else delete state.picks[k];
}
// Wann wurde welche Option zuletzt gewählt (vor dem Tag d)? Name -> Tage her
function lastPicked(h, d) {
  const last = {};
  for (const [k, names] of Object.entries(state.picks || {})) {
    const [id, day] = k.split('|');
    if (id !== h.id || day >= d) continue;
    names.forEach((n) => { if (!last[n] || day > last[n]) last[n] = day; });
  }
  const ago = {};
  for (const [n, day] of Object.entries(last)) ago[n] = Math.round((parseDay(d) - parseDay(day)) / 864e5);
  return ago;
}
const agoText = (n) => (n === undefined ? 'noch nie' : n === 1 ? 'zuletzt gestern' : n === 2 ? 'zuletzt vorgestern' : `zuletzt vor ${n} Tagen`);
function pickStats(h, days) {
  const from = addDays(todayKey(), -(days - 1)), count = {};
  for (const [k, names] of Object.entries(state.picks || {})) {
    const [id, day] = k.split('|');
    if (id === h.id && day >= from) names.forEach((n) => { count[n] = (count[n] || 0) + 1; });
  }
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}
// x-mal pro Woche: steht jeden Tag bei den Habits, bis das Wochenziel erreicht ist
function weeklyShows(h, d) {
  if (!isWeekly(h) || h.createdAt > d) return false;
  if (isDone(h, d)) return true;
  let n = 0;
  for (let k = weekStart(d); k < d; k = addDays(k, 1)) if (k >= h.createdAt && isDone(h, k)) n++;
  return n < h.perWeek;
}
function weekStreak(h) {
  const today = todayKey();
  let w = weekStart(today);
  if (weekCount(h, w) < h.perWeek) w = addDays(w, -7); // laufende Woche zählt erst, wenn geschafft
  let n = 0;
  for (let i = 0; i < 60 && addDays(w, 6) >= h.createdAt; i++, w = addDays(w, -7)) {
    if (weekCount(h, w) >= h.perWeek) n++; else break;
  }
  return n;
}
function streak(h) {
  if (isWeekly(h)) return weekStreak(h);
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
  if (isWeekly(h)) {
    // abgeschlossene Wochen (plus laufende, falls schon geschafft)
    let need = 0, got = 0;
    for (let w = weekStart(today), i = 0; i < Math.max(1, Math.round(days / 7)); i++, w = addDays(w, -7)) {
      if (addDays(w, 6) < h.createdAt) break;
      const c = Math.min(weekCount(h, w), h.perWeek);
      if (i === 0 && c < h.perWeek) continue;
      need += h.perWeek; got += c;
    }
    return need ? Math.round((got / need) * 100) : null;
  }
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
  if (!t.listId && !rollsOver(t)) return t.plannedDay === d; // verfällt an seinem Tag
  if (!t.plannedDay || d < today) return false;
  if (!t.listId && d === today) return t.plannedDay <= d;
  return t.plannedDay === d;
}
const inPool = (t, today) => !!t.listId && !t.completedAt && (!t.plannedDay || t.plannedDay < today);
const subsText = (t) => (t.subs && t.subs.length ? `${t.subs.filter((x) => x.done).length}/${t.subs.length} Schritte` : '');
const carriedOver = (t, today) => rollsOver(t) && !t.listId && !t.completedAt && t.plannedDay && t.plannedDay < today;
const listById = (id) => state.lists.find((l) => l.id === id);
const todoById = (id) => state.todos.find((t) => t.id === id);
const habitById = (id) => state.habits.find((h) => h.id === id);
const nextOrder = (arr) => arr.reduce((m, x) => Math.max(m, x.order ?? 0), -1) + 1;

/* ---------- Check-in: tägliche Fragen, ausgewählt wie Habits ---------- */
// Vorerst nur Skala-Fragen (Mattis Wunsch). Ja/Nein und Notiz sind im Code noch vorbereitet.
const Q_TYPES = [['scale', 'Skala 0–10']];
const qTypeLabel = (t) => (Q_TYPES.find(([k]) => k === t) || Q_TYPES[0])[1];
const Q_CATALOG = [
  { icon: '🙂', text: 'Wie ist deine Stimmung?', type: 'scale', lo: 'schlecht', hi: 'super' },
  { icon: '⚡', text: 'Wie viel Energie hast du?', type: 'scale', lo: 'leer', hi: 'voll da' },
  { icon: '😴', text: 'Wie gut hast du geschlafen?', type: 'scale', lo: 'schlecht', hi: 'erholt' },
  { icon: '🌪️', text: 'Wie gestresst bist du?', type: 'scale', lo: 'entspannt', hi: 'gestresst' },
  { icon: '🎯', text: 'Wie konzentriert warst du?', type: 'scale', lo: 'zerstreut', hi: 'fokussiert' },
  { icon: '🌤️', text: 'Wie zufrieden bist du mit deinem Tag?', type: 'scale', lo: 'unzufrieden', hi: 'sehr zufrieden' },
];
const Q_ICONS = ['❓', '🙂', '⚡', '😴', '🌪️', '🎯', '🌤️', '💆', '🤕', '🍷', '🙏', '✨', '❤️', '🍽️', '☕', '💧'];

const checkinFor = (d) => state.checkins[d] || {};
const answered = (v) => v !== undefined && v !== null && v !== '';
function checkinStatus(d) {
  const qs = state.checkinQuestions, a = checkinFor(d);
  const need = qs.filter((q) => q.type !== 'note');
  return { done: qs.filter((q) => answered(a[q.id])).length, total: qs.length, complete: need.length > 0 && need.every((q) => answered(a[q.id])) };
}

// Karte auf Heute (nur wenn Fragen ausgewählt sind): alle Fragen untereinander, speichern per Button
function checkinDraft(d) {
  if (!ui.checkin || ui.checkin.day !== d) ui.checkin = { day: d, values: { ...checkinFor(d) }, dirty: false };
  return ui.checkin;
}
function renderCheckinCard(d, today) {
  if (d > today || !state.checkinQuestions.length) return '';
  const dr = checkinDraft(d), a = dr.values;
  const saved = !dr.dirty && Object.keys(checkinFor(d)).length > 0;
  const qs = state.checkinQuestions.map((q) => {
    const v = a[q.id];
    let input;
    if (q.type === 'scale') {
      input = `<input type="range" class="slider ${answered(v) ? '' : 'unset'}" min="0" max="10" step="1" value="${answered(v) ? v : 5}" data-checkin-range="${q.id}" aria-label="${esc(q.text)}">
        <div class="scale-legend"><span>${esc(q.lo || 'wenig')}</span><span>${esc(q.hi || 'viel')}</span></div>`;
    } else if (q.type === 'yesno') {
      input = `<div class="segmented">${[[true, 'Ja'], [false, 'Nein']].map(([b, l]) => `<button class="${v === b ? 'on' : ''}" data-action="checkin-set" data-q="${q.id}" data-v="${b}">${l}</button>`).join('')}</div>`;
    } else {
      input = `<textarea class="field note-field" data-checkin-note="${q.id}" rows="2" placeholder="Ein paar Worte …">${esc(v || '')}</textarea>`;
    }
    return `<div class="ci-q"><div class="ci-label"><span>${esc(q.text)}</span>${q.type === 'scale' ? `<span class="ci-val" data-val-for="${q.id}">${answered(v) ? v : '–'}/10</span>` : ''}</div>${input}</div>`;
  }).join('');
  if (ciFolded(d)) {
    const n = Object.keys(checkinFor(d)).length;
    return sectionHead('checkin', 'Check-in', true, n ? `${n} von ${state.checkinQuestions.length} beantwortet` : 'offen');
  }
  return `${sectionHead('checkin', 'Check-in', false)}<div class="card checkin-card">${qs}
    <button class="btn-primary ci-save ${saved ? 'saved' : ''}" data-action="checkin-save">${saved ? 'Gespeichert ✓' : 'Check-in speichern'}</button></div>`;
}

// Einklappbare Überschrift für Bereiche auf Heute
function sectionHead(key, title, closed, summary = '') {
  return `<button class="section-title fold ${closed ? 'closed' : ''}" data-action="fold" data-key="${key}" aria-expanded="${!closed}">
    <span>${title}</span>${closed && summary ? `<span class="fold-sum">${esc(summary)}</span>` : ''}<svg class="fold-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>`;
}
function habitsFolded(d, habits) {
  // Sind alle Habits des Tages abgehakt, klappt der Bereich von selbst zu.
  const o = (ui.habFold || {})[d];
  if (o !== undefined) return o;
  return isFolded('habits') || (habits.length > 0 && habits.every((h) => isDone(h, d)));
}
function isFolded(key) { return !!(state.collapsed || {})[key]; }
function ciFolded(d) {
  // Check-in klappt nach dem Speichern zu; danach entscheidet der Tipp auf die Überschrift.
  const o = (ui.ciFold || {})[d];
  if (o !== undefined) return o;
  return Object.keys(checkinFor(d)).length > 0 && !checkinDraft(d).dirty;
}

// Griff zum Sortieren per Ziehen
const dragHandle = (kind) => `<span class="drag-handle" data-drag="${kind}" aria-label="Zum Sortieren ziehen" role="button"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>`;

// Zeile, die sich nach links wischen lässt und dann einen Mülleimer zeigt
function swipeRow(kind, id, inner) {
  return `<div class="swipe" data-swipe="${kind}" data-id="${id}"><button class="swipe-del" data-action="swipe-del" data-kind="${kind}" data-id="${id}" aria-label="Löschen" tabindex="-1">${pic('🗑️')}</button><div class="row swipe-row">${inner}</div></div>`;
}

// Abschnitt Check-in im Reiter Routinen
function renderQuestionList() {
  const qs = state.checkinQuestions;
  return `${qs.length ? `<div class="card">${qs.map((q, i) => swipeRow('question', q.id, `
      <button class="row-main" data-action="edit-question" data-id="${q.id}"><span class="emoji">${pic(q.icon || '❓')}</span>
        <span class="name-wrap"><span class="name">${esc(q.text)}</span><span class="tag">${qTypeLabel(q.type)}</span></span></button>
      ${qs.length > 1 ? dragHandle('question') : ''}`)).join('')}</div>` : ''}
    <p class="section-footer">${qs.length ? 'Die Fragen beantwortest du täglich auf Heute.' : 'Kurze Fragen zu deinem Tag, z.B. Stimmung oder Schlaf. Sobald du eine auswählst, erscheint der Check-in auf Heute.'}</p>
    <div class="card" style="margin-top:20px"><div class="row"><button class="row-main" data-action="open-q-catalog"><span class="emoji">${pic('➕')}</span><span class="name" style="color:var(--accent)">Frage hinzufügen</span></button></div></div>`;
}

function renderQuestionCatalog() {
  const have = new Set(state.checkinQuestions.map((q) => q.text));
  const groups = Q_TYPES.map(([k, l]) => [l, Q_CATALOG.filter((q) => q.type === k)]);
  const body = `<div class="card" style="margin-top:6px"><div class="row"><button class="row-main" data-action="question-new"><span class="emoji">${pic('➕')}</span><span class="name" style="color:var(--accent)">Eigene Frage erstellen</span></button></div></div>
    ${groups.map(([label, items]) => `${Q_TYPES.length > 1 ? `<h3 class="section-title">${label}</h3>` : `<h3 class="section-title">Vorschläge</h3>`}<div class="card">${items.map((q) => `<div class="row"><button class="row-main" data-action="question-pick" data-text="${esc(q.text)}">
      <span class="emoji">${pic(q.icon)}</span><span class="name" style="flex:1">${esc(q.text)}</span>${have.has(q.text) ? `<span class="value chosen">Schon dabei</span>${statusCircle('done')}` : `<span class="plus-mini">+</span>`}</button></div>`).join('')}</div>`).join('')}`;
  return sheetShell('Frage hinzufügen', cancelBtn, '', body);
}

function renderQuestionEditor() {
  const dr = ui.draft, isNew = !dr.id;
  const body = `
    <h3 class="section-title">Frage</h3>
    <input class="field" id="q-text" data-field="text" value="${esc(dr.text)}" placeholder="z.B. Hast du genug getrunken?" autocomplete="off">
    ${Q_TYPES.length > 1 ? `<h3 class="section-title">Antwort</h3>
    <div class="card" style="padding:10px"><div class="segmented">${Q_TYPES.map(([k, l]) => `<button class="${dr.type === k ? 'on' : ''}" data-action="q-type" data-type="${k}">${l}</button>`).join('')}</div></div>` : ''}
    ${dr.type === 'scale' ? `<div class="card" style="margin-top:12px">
      <label class="form-row"><span>Links (0)</span><input data-field="lo" value="${esc(dr.lo)}" placeholder="wenig"></label>
      <label class="form-row"><span>Rechts (10)</span><input data-field="hi" value="${esc(dr.hi)}" placeholder="viel"></label></div>` : ''}
    <p class="section-footer">${dr.type === 'scale' ? 'Du schiebst einen Regler von 0 bis 10. Die Wörter stehen links und rechts darunter.' : dr.type === 'yesno' ? 'Du antwortest mit Ja oder Nein.' : 'Du schreibst ein paar freie Worte.'}</p>
    <h3 class="section-title">Symbol</h3>
    <div class="card"><div class="icon-grid">${(Q_ICONS.includes(dr.icon) ? Q_ICONS : [dr.icon, ...Q_ICONS]).map((i) => `<button class="${dr.icon === i ? 'on' : ''}" data-action="set-icon" data-icon="${i}">${pic(i)}</button>`).join('')}</div></div>
    ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
    ${isNew ? '' : `<div class="card" style="margin-top:28px"><button class="btn-danger" data-action="q-del">${dr.confirmDelete ? 'Wirklich entfernen? Nochmal tippen' : 'Frage entfernen'}</button></div>`}`;
  return sheetShell(isNew ? 'Eigene Frage' : 'Frage bearbeiten', isNew ? '<button class="link" data-action="open-q-catalog">Zurück</button>' : cancelBtn,
    `<button class="link" style="font-weight:600" data-action="save-question">${isNew ? 'Hinzufügen' : 'Sichern'}</button>`, body);
}
function saveQuestion() {
  const dr = ui.draft, text = (dr.text || '').trim();
  if (!text) return fail('Bitte schreib die Frage auf.');
  const values = { text, type: dr.type, icon: dr.icon, lo: (dr.lo || '').trim() || 'wenig', hi: (dr.hi || '').trim() || 'viel' };
  if (dr.id) Object.assign(state.checkinQuestions.find((q) => q.id === dr.id), values);
  else state.checkinQuestions.push({ id: uid(), ...values });
  ui.sheet = null; ui.draft = null;
  persist();
  toast(dr.id ? 'Gesichert' : 'Frage hinzugefügt');
}

// Auswertung für Fortschritt
function renderCheckinStats(today) {
  const rows = state.checkinQuestions.filter((q) => q.type !== 'note').map((q) => {
    const vals = (n) => Array.from({ length: n }, (_, i) => checkinFor(addDays(today, -i))[q.id]).filter(answered);
    const head = `<div class="stat-head"><span class="emoji">${pic(q.icon || '❓')}</span><span class="name">${esc(q.text)}</span></div>`;
    if (q.type === 'scale') {
      const avg = (a) => (a.length ? num(a.reduce((s, x) => s + x, 0) / a.length) : '–');
      const bars = Array.from({ length: 14 }, (_, i) => checkinFor(addDays(today, i - 13))[q.id]).map((v) => `<i style="height:${answered(v) ? Math.max(v * 10, 4) : 4}%" class="${answered(v) ? 'on' : ''}"></i>`).join('');
      return `<div class="stat">${head}<div class="stat-sub">Ø 7 Tage ${avg(vals(7))} · Ø 30 Tage ${avg(vals(30))}</div><div class="bars">${bars}</div></div>`;
    }
    const w = vals(7);
    return `<div class="stat">${head}<div class="stat-sub">Ja an ${w.filter((v) => v === true).length} von ${w.length} Tagen (letzte 7 Tage)</div></div>`;
  }).join('');
  return rows ? `<h3 class="section-title">Check-in</h3><div class="card">${rows}</div><p class="section-footer">Die Balken zeigen die letzten 14 Tage.</p>` : '';
}

function renderMonthSheet() {
  const today = todayKey();
  const m = ui.month || ui.day.slice(0, 7);
  const [y, mo] = m.split('-').map(Number);
  const first = `${m}-01`;
  const days = new Date(y, mo, 0).getDate();
  const pad = (parseDay(first).getDay() + 6) % 7; // Montag zuerst
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push('<span></span>');
  for (let n = 1; n <= days; n++) {
    const k = `${m}-${String(n).padStart(2, '0')}`;
    const fut = k > today, p = fut ? 0 : dayProgress(k, today);
    cells.push(`<button class="m-day ${k === ui.day ? 'selected' : ''} ${k === today ? 'today' : ''} ${fut ? 'future' : ''} ${p >= 1 ? 'full' : ''}" data-action="month-pick" data-day="${k}"><span>${n}</span>${fut ? '<i></i>' : weekRing(p, k === ui.day, false)}</button>`);
  }
  const title = new Date(y, mo - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const body = `<div class="m-nav"><button class="link" data-action="month-shift" data-n="-1" aria-label="Voriger Monat">${ICON.left}</button><strong>${esc(title)}</strong><button class="link" data-action="month-shift" data-n="1" aria-label="Nächster Monat">${ICON.right}</button></div>
    <div class="card m-grid">${['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((x) => `<em>${x}</em>`).join('')}${cells.join('')}</div>
    <p class="section-footer">Rot hinterlegt: alles geschafft. Der Ring zeigt, wie viel erledigt war. Tippe auf einen Tag, um ihn zu öffnen.</p>`;
  return sheetShell('Kalender', '<button class="link" data-action="month-today">Heute</button>', '<button class="link" style="font-weight:600" data-action="close-sheet">Fertig</button>', body);
}

function renderSettingsSheet() {
  const body = `
    <h3 class="section-title">Dein Name</h3>
    <input class="field" id="settings-name" data-setting="name" value="${esc(state.name)}" placeholder="Dein Vorname (optional)" autocomplete="given-name">
    <h3 class="section-title">Habits mit Ziel abhaken</h3>
    <div class="segmented">${[['whole', 'Ganz oder gar nicht'], ['steps', 'Schritt für Schritt']].map(([k, l]) => `<button class="${(state.habitMode || 'whole') === k ? 'on' : ''}" data-action="habit-mode" data-mode="${k}">${l}</button>`).join('')}</div>
    <p class="section-footer">${(state.habitMode || 'whole') === 'steps' ? 'Mit − und + zählst du nach und nach hoch, z.B. jedes Glas Wasser.' : 'Ein Tipp auf den Kreis hakt das ganze Ziel ab. Ruhiger und schneller.'}</p>
    <h3 class="section-title">Deine Daten</h3>
    <div class="card">
      <div class="row"><button class="row-main" data-action="export"><span class="emoji">${pic('💾')}</span><span class="name">Sicherung herunterladen</span></button></div>
      <div class="row"><label class="row-main" style="cursor:pointer"><span class="emoji">${pic('📂')}</span><span class="name">Sicherung laden</span><input type="file" accept="application/json,.json" data-action="import" hidden></label></div>
    </div>
    <p class="section-footer">Alles bleibt nur auf diesem Gerät gespeichert. Eine Sicherung ab und zu schadet nicht.</p>
    <div class="card" style="margin-top:20px"><div class="row"><button class="row-main" data-action="tour-start"><span class="emoji">${pic('🧭')}</span><span class="name">App-Tour noch mal ansehen</span></button></div></div>`;
  return sheetShell('Einstellungen', '', '<button class="link" style="font-weight:600" data-action="close-sheet">Fertig</button>', body);
}

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
  ob: { step: 0, name: '', habits: [], cfg: {}, questions: [] }, // Einrichtung
  tour: null, // App-Tour: Index der Station
  routines: 'habits', // Umschalter im Reiter Routinen
  checkin: null, // ungespeicherte Check-in-Antworten { day, values, dirty }
};

/* ---------- Kleine Bausteine ---------- */
const ICON = {
  plus: '<svg viewBox="0 0 22 22"><path d="M11 3v16M3 11h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 8 14"><path d="M7 1 1 7l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="13" cy="13" r="4.6"/><path d="M13 2.5v2.6M13 20.9v2.6M2.5 13h2.6M20.9 13h2.6M5.6 5.6l1.8 1.8M18.6 18.6l1.8 1.8M5.6 20.4l1.8-1.8M18.6 7.4l1.8-1.8"/></svg>',
  tray: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 7.5a2 2 0 0 1 2-2h4.6l2.2 2.5h8.2a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z"/><path d="M3.5 11h19"/></svg>',
  loop: '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5V11a5 5 0 0 1 5-5h12"/><path d="m17.5 2.5 3.5 3.5-3.5 3.5"/><path d="M22 13.5V15a5 5 0 0 1-5 5H5"/><path d="m8.5 23.5-3.5-3.5 3.5-3.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
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
      <path d="M29 26Q37 21 45 25" fill="none" stroke="#1a1717" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M71 26Q63 21 55 25" fill="none" stroke="#1a1717" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="37" cy="39" r="9.3" fill="#fff" stroke="#000" stroke-width="2"/>
      <circle cx="63" cy="39" r="9.3" fill="#fff" stroke="#000" stroke-width="2"/>
      <g><circle cx="37" cy="39" r="5.4" fill="#000"/><circle cx="39" cy="37" r="1.7" fill="#fff"/></g>
      ${bothEyes ? `<g class="pupil2${popEye ? ' pop' : ''}"><circle cx="63" cy="39" r="5.4" fill="#000"/><circle cx="65" cy="37" r="1.7" fill="#fff"/></g>` : ''}
      <path d="M41 53Q50 59 59 53" fill="none" stroke="#1a1717" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="25" cy="51" r="4" fill="#ff8aa0" opacity=".5"/>
      <circle cx="75" cy="51" r="4" fill="#ff8aa0" opacity=".5"/>
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
  // Scroll-Position im offenen Fenster behalten (sonst springt es bei jeder Änderung nach oben)
  const oldBody = app.querySelector('.sheet-body');
  const keepScroll = oldBody && ui.sheet && ui.sheet === render.lastSheet ? oldBody.scrollTop : 0;
  render.lastSheet = ui.sheet;
  const screen = ui.tab === 'today' ? renderToday() : ui.tab === 'habits' ? renderHabits() : ui.tab === 'pool' ? renderPool() : renderProgress();
  app.innerHTML = `<main class="screen">${screen}</main>${renderTabbar()}${renderSheet()}${renderTour()}${ui.toast ? `<div class="toast${ui.undo ? ' with-undo' : ''}">${esc(ui.toast)}${ui.undo ? '<button class="toast-undo" data-action="undo">Rückgängig</button>' : ''}</div>` : ''}`;
  ui.wobble = false;
  if (keepScroll) { const b = app.querySelector('.sheet-body'); if (b) b.scrollTop = keepScroll; }
  if (ui.focus) {
    const el = app.querySelector(ui.focus);
    ui.focus = null;
    if (el) { el.focus(); if (el.select && el.value) el.select(); }
  }
}

/* ---------- Einrichtung beim ersten Start ---------- */
function renderOnboarding() {
  const ob = ui.ob;
  const steps = 5;
  const dots = `<div class="ob-dots">${Array.from({ length: steps }, (_, i) => `<i class="${i === ob.step ? 'on' : ''}"></i>`).join('')}</div>`;
  const back = ob.step > 0 ? '<button class="link" data-action="ob-back">Zurück</button>' : '';
  const pick = (on) => statusCircle(on ? 'done' : 'open');
  let body, button;

  if (ob.step === 0) {
    body = `<div class="ob-hero"><div class="daruma big-daruma wobble" data-action="poke">${darumaSVG(false)}</div>
      <h1>Kleine Schritte, jeden Tag.</h1>
      <p>Daruma hilft dir, Habits, To-Dos und Projekte im Blick zu behalten. Schaffst du alle Habits und To-Dos eines Tages, bekommt Daruma sein zweites Auge.</p></div>
      <h3 class="section-title">Wie heißt du?</h3>
      <input class="field" id="ob-name" value="${esc(ob.name)}" placeholder="Dein Vorname (optional)" autocomplete="given-name" enterkeyhint="next">
      <p class="ob-restore"><label>Daten wiederherstellen<input type="file" accept="application/json,.json" data-action="import" hidden></label></p>`;
    button = 'Los geht’s';
  } else if (ob.step === 1) {
    body = `<h1 class="large-title">Deine Habits</h1>
      <p class="ob-lead">Hier ist eine Vorauswahl beliebter Habits für den Start. Wähle aus, was zu dir passt, lieber erst mal wenige. Im nächsten Schritt legst du Ziel und Häufigkeit fest.</p>
      ${CATALOG.map((c) => `<h3 class="section-title">${esc(c.name)}</h3><div class="ob-chips">${c.items.map((t) => { const on = ob.habits.includes(t.name); return `<button class="ob-chip ${on ? 'on' : ''}" data-action="ob-habit" data-name="${esc(t.name)}" aria-pressed="${on}">${on ? '<svg class="picto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : pic(t.icon)}<span>${esc(t.name)}</span></button>`; }).join('')}</div>`).join('')}
      <p class="section-footer">Nicht dabei, was du suchst? Eigene Habits legst du nach der Einrichtung im Reiter Routinen an.</p>`;
    button = ob.habits.length ? `Weiter mit ${ob.habits.length} Habit${ob.habits.length === 1 ? '' : 's'}` : 'Ohne Habits weiter';
  } else if (ob.step === 2) {
    const chosen = CATALOG.flatMap((c) => c.items).filter((t) => ob.habits.includes(t.name));
    body = `<h1 class="large-title">Feinschliff</h1>
      <p class="ob-lead">Die Vorschläge kannst du so lassen oder an dich anpassen.</p>
      ${chosen.map((t) => {
        const f = ob.cfg[t.name], attr = `data-name="${esc(t.name)}"`;
        return `<div class="card ob-cfg">
          <div class="ob-cfg-head"><span class="emoji">${pic(t.icon)}</span><strong>${esc(t.name)}</strong><span class="value">${t.kind === 'check' || f.noGoal ? 'Ja/Nein' : ''}</span></div>
          ${t.kind === 'count' && !t.fixedGoal ? toggleRow('Mit Ziel', !f.noGoal, `data-action="ob-toggle" data-name="${esc(t.name)}" data-key="noGoal"`) : ''}
          ${t.kind !== 'check' && !f.noGoal ? `<label class="form-row ob-goal"><span>${t.kind === 'limit' ? 'Höchstens pro Tag' : f.freq === 'week' ? 'Ziel pro Mal' : 'Ziel pro Tag'}</span>
            <span class="tune-input"><input data-ob-target="${esc(t.name)}" inputmode="decimal" value="${esc(f.target)}"> ${esc(t.unit)}</span></label>` : ''}
          <div class="ob-freq">${freqPicker(f, attr)}</div>
        </div>`;
      }).join('')}`;
    button = 'Weiter';
  } else if (ob.step === 3) {
    body = `<h1 class="large-title">Check-in</h1>
      <p class="ob-lead">Ein paar kurze Fragen, die du einmal am Tag beantwortest. So siehst du mit der Zeit, wie es dir geht. Wähle aus, was dich interessiert, ändern kannst du es später unter Routinen.</p>
      ${Q_TYPES.map(([k, l]) => `${Q_TYPES.length > 1 ? `<h3 class="section-title">${l}</h3>` : ""}<div class="card">${Q_CATALOG.filter((q) => q.type === k).map((q) => `<div class="row"><button class="row-main" data-action="ob-question" data-text="${esc(q.text)}">
          <span class="emoji">${pic(q.icon)}</span><span class="name" style="flex:1">${esc(q.text)}</span>${pick(ob.questions.includes(q.text))}</button></div>`).join('')}</div>`).join('')}`;
    button = ob.questions.length ? `Weiter mit ${ob.questions.length} ${ob.questions.length === 1 ? 'Frage' : 'Fragen'}` : 'Ohne Check-in weiter';
  } else {
    body = `<div class="ob-hero ob-done"><div class="daruma done-daruma wobble" data-action="poke">${darumaSVG(true, true)}</div>
      <h1>Alles bereit${ob.name ? `, ${esc(ob.name)}` : ''}!</h1>
      <p>Schaffst du an einem Tag alle Habits und To-Dos, bekommt Daruma sein zweites Auge. Gleich zeige ich dir kurz die App.</p></div>`;
    button = 'Los geht’s';
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
  all.forEach((t) => {
    const f = ob.cfg[t.name];
    const v = parseNum(f.target);
    const target = t.kind !== 'check' && v > 0 ? v : t.target;
    // Schrittweite passend zum eigenen Ziel, falls das Ziel kleiner als der Vorschlag-Schritt ist
    const step = t.kind === 'count' && t.step >= target ? Math.max(target / 4, 0.1) : t.step;
    const tpl = f.noGoal ? { ...t, kind: 'check', target: 1, step: 1, unit: '' } : { ...t, target, step };
    state.habits.push({ ...makeHabit(tpl, nextOrder(state.habits)), ...freqValues(f), catchUp: !!f.catchUp });
  });
  state.checkinQuestions = Q_CATALOG.filter((q) => ob.questions.includes(q.text)).map((q) => ({ id: uid(), ...q }));
  state.name = ob.name.trim();
  state.setupDone = true;
  ui.tab = 'today'; ui.day = todayKey(); ui.tour = 0;
  window.scrollTo(0, 0);
  commit();
}

function toggleRow(label, on, attrs) {
  return `<button class="form-row toggle-row" ${attrs} role="switch" aria-checked="${on}"><span>${label}</span><span class="switch ${on ? 'on' : ''}"><i></i></span></button>`;
}

/* ---------- App-Tour (einmal nach dem ersten Start) ---------- */
const TOUR = [
  ['today', 'Heute', 'Hier hakst du deine Habits ab und erledigst To-Dos. Neue To-Dos tippst du direkt in die Liste, oben wechselst du zwischen den Tagen.'],
  ['habits', 'Routinen', 'Hier verwaltest du deine Habits und die Fragen für den täglichen Check-in. Oben schaltest du zwischen beiden um.'],
  ['pool', 'Projekte', 'Für größere Vorhaben: Lege Projekte an, sammle Aufgaben mit Unteraufgaben und hol dir bei Lust etwas auf Heute.'],
  ['progress', 'Fortschritt', 'Serien und Quoten für jedes Habit. Oben rechts beim Zahnrad findest du Einstellungen und deine Sicherung.'],
];
function renderTour() {
  if (ui.tour === null || ui.sheet) return '';
  const i = ui.tour, [, title, text] = TOUR[i], last = i === TOUR.length - 1;
  return `<div class="tour-dim"></div>
    <div class="tour-card" style="--arrow:${((i + 0.5) / TOUR.length) * 100}%">
      <div class="tour-head"><strong>${title}</strong><span>${i + 1} / ${TOUR.length}</span></div>
      <p>${text}</p>
      <div class="tour-actions">${last ? '<span></span>' : '<button class="link" data-action="tour-end">Überspringen</button>'}
        <button class="btn-primary small" data-action="tour-next">${last ? 'Fertig' : 'Weiter'}</button></div>
    </div>`;
}
function startTour() { ui.tour = 0; ui.tab = TOUR[0][0]; ui.poolListId = null; window.scrollTo(0, 0); render(); }

function renderTabbar() {
  const tab = (id, label, icon) => `<button class="tab ${ui.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar ${ui.tour !== null ? 'touring' : ''}">${tab('today', 'Heute', '<span class="hanko" aria-hidden="true">今日</span>')}${tab('habits', 'Routinen', ICON.loop)}${tab('pool', 'Projekte', ICON.tray)}${tab('progress', 'Fortschritt', ICON.chart)}</nav>`;
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
  const habits = state.habits.filter((h) => isActive(h, d) || weeklyShows(h, d)).sort(byOrder);
  const todos = state.todos
    .filter((t) => todoAppears(t, d, today))
    .sort((a, b) => (!!a.completedAt - !!b.completedAt) || byOrder(a, b));
  // Für das zweite Auge zählen Habits und To-Dos des Tages (Mattis Wunsch).
  // Wochen-Habits blockieren das Auge nicht: sie zählen nur an Tagen, an denen sie erledigt wurden.
  const counted = habits.filter((h) => !isWeekly(h) || isDone(h, d));
  const done = counted.filter((h) => isDone(h, d)).length + todos.filter((t) => t.completedAt).length;
  const total = counted.length + todos.length;
  const allDone = total > 0 && done === total;

  // Wackeln, wenn gerade alles erledigt wurde
  const popEye = allDone && ui.lastAllDone[d] === false;
  if (popEye) ui.wobble = true;
  ui.lastAllDone[d] = allDone;
  // Daruma wackelt bei jedem Abhaken (Mattis Wunsch)
  ui.lastDone = ui.lastDone || {};
  if (ui.lastDone[d] !== undefined && done > ui.lastDone[d]) ui.wobble = true;
  ui.lastDone[d] = done;

  const yesterday = addDays(today, -1);
  const catchUp = d === today
    ? state.habits.filter((h) => catchesUp(h) && h.kind !== 'limit' && isActive(h, yesterday) && !isDone(h, yesterday)).sort(byOrder) : [];

  const msg = future ? 'Dieser Tag kommt noch. Abhaken kannst du, wenn er da ist.'
    : allDone ? `Daruma hat beide Augen. Stark${state.name ? `, ${esc(state.name)}` : ''}!`
    : 'Schaffst du alle, malt Daruma das zweite Auge aus.';

  return `
    <div class="title-row"><h1 class="large-title">${esc(dayTitle(d, today))}</h1>${d !== today ? '<button class="link today-link" data-action="go-today">Zu heute</button>' : ''}<button class="cal-btn" data-action="open-month" aria-label="Monatsansicht"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></button></div>

    ${renderWeek(today)}

    <div class="card hero-card">
      <div class="hero">
        <div class="daruma ${ui.wobble ? 'wobble' : ''}" data-action="poke" role="img" aria-label="${allDone ? 'Daruma mit beiden Augen' : 'Daruma mit einem Auge'}">${darumaSVG(allDone, popEye)}</div>
        <div class="hero-text">
          <span class="hero-count">${done} von ${total} erledigt</span>
          <div class="bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
          <span class="hero-msg">${msg}</span>
        </div>
      </div>
    </div>

    ${renderCheckinCard(d, today)}

    ${sectionHead('habits', 'Habits', habitsFolded(d, habits), habits.length ? `${habits.filter((h) => isDone(h, d)).length} von ${habits.length} erledigt` : '')}
    ${habitsFolded(d, habits) ? '' : `<div class="card">
      ${habits.length ? habits.map((h) => habitRow(h, d, future)).join('') : (state.habits.length ? '<p class="empty">An diesem Tag stehen keine Habits an.</p>' : '<p class="empty">Noch keine Habits. <button class="link" data-action="tab" data-tab="habits">Im Reiter Routinen anlegen</button></p>')}
    </div>`}


    ${catchUp.length ? `<h3 class="section-title">Von gestern offen</h3>
    <div class="card">${catchUp.map((h) => `<div class="row"><div class="row-main"><span class="emoji">${pic(h.icon)}</span><span class="name">${esc(h.name)}</span></div>
      <div class="controls"><button class="pill" data-action="catch-up" data-id="${h.id}">Nachholen</button></div></div>`).join('')}</div>
    <p class="section-footer">Zählt für gestern. Was du heute nicht nachholst, verfällt. Pro Habit einstellbar.</p>` : ''}


    ${sectionHead('todos', 'To-Dos', isFolded('todos'), todos.length ? `${todos.filter((t) => t.completedAt).length} von ${todos.length} erledigt` : 'keine')}
    ${isFolded('todos') ? '' : `<div class="card">
      ${todos.map((t) => todoRow(t, today, future)).join('')}
      ${d >= today ? `<form class="row add-row" data-form="add-todo">
        <span class="plus">+</span>
        <input id="todo-new" placeholder="${d === today ? 'Neues To-Do für heute' : 'Neues To-Do'}" autocomplete="off" enterkeyhint="done">
        <button class="pill add-btn" type="submit">Hinzufügen</button>
      </form>` : todos.length ? '' : '<p class="empty">Keine To-Dos an diesem Tag.</p>'}
    </div>`}
  `;
}

function dayProgress(k, today) {
  const active = state.habits.filter((h) => isActive(h, k) || (isWeekly(h) && h.createdAt <= k && isDone(h, k)));
  const dayTodos = state.todos.filter((t) => todoAppears(t, k, today));
  const n = active.length + dayTodos.length;
  const done = active.filter((h) => isDone(h, k)).length + dayTodos.filter((t) => t.completedAt).length;
  return n ? done / n : 0;
}

function renderWeek(today) {
  const start = weekStart(ui.day);
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i);
    const progress = dayProgress(k, today);
    const sel = k === ui.day;
    cells.push(`<button class="day ${sel ? 'selected' : ''} ${k === today ? 'today' : ''}" data-action="select-day" data-day="${k}" aria-label="${esc(fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }))}">
      <span class="wd">${fmt(k, { weekday: 'narrow' })}</span>
      <span class="dn">${parseDay(k).getDate()}</span>
      ${weekRing(progress, sel, k > today)}
    </button>`);
  }
  return `<div class="week week-slim" data-swipe-week>${cells.join('')}</div>`;
}

function habitRow(h, d, future) {
  const done = isDone(h, d);
  const v = valueOf(h, d);
  const dis = future ? 'disabled' : '';
  const steps = state.habitMode === 'steps';
  let controls;
  if (h.kind === 'choice') {
    controls = `<button class="status-btn" data-action="toggle-habit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Abhaken'}">${statusCircle(done ? 'done' : 'open')}</button>`;
  } else if (h.kind === 'check') {
    controls = `<button class="status-btn" data-action="toggle-habit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Abhaken'}">${statusCircle(done ? 'done' : 'open')}</button>`;
  } else if (h.kind === 'count') {
    // Einstellung: "whole" = ganz oder gar nicht (Standard), "steps" = Schritt für Schritt mit − / +
    controls = steps ? `<button class="step" data-action="step" data-id="${h.id}" data-dir="-1" ${v <= 0 || future ? 'disabled' : ''} aria-label="Weniger">−</button>
      <button class="step" data-action="step" data-id="${h.id}" data-dir="1" ${dis} aria-label="Mehr">+</button>
      <button class="status-btn" data-action="fill-habit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Ganz erledigt'}">${statusCircle(done ? 'done' : 'open', v / h.target)}</button>`
      : `<button class="status-btn" data-action="fill-habit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Erledigt'}">${statusCircle(done ? 'done' : 'open')}</button>`;
  } else if (!steps) {
    // Limit im Modus "ganz oder gar nicht": nur abhaken, dass das Limit eingehalten wurde
    controls = `<button class="status-btn" data-action="toggle-limit" data-id="${h.id}" ${dis} aria-label="${done ? 'Zurücksetzen' : 'Limit eingehalten'}">${statusCircle(done ? 'done' : 'open')}</button>`;
  } else {
    const has = getValue(h, d) !== undefined;
    controls = `<button class="limit-btn" data-action="limit-entry" data-id="${h.id}" ${dis}>
      ${has ? `<span class="value">${num(v)} ${esc(h.unit)}</span>${statusCircle(done ? 'done' : 'missed')}`
        : `<span class="accent-text">Eintragen</span>${statusCircle('open')}`}
    </button>`;
  }
  const picked = h.kind === 'choice' ? picksOf(h, d) : [];
  const sub = [
    h.kind === 'choice' ? (picked.length ? picked.join(', ') : h.multi && minPick(h) > 1 ? `mind. ${minPick(h)}` : '') : '',
    h.kind === 'count' ? (steps ? `${num(v)}/${num(h.target)} ${esc(h.unit)}` : `${num(h.target)} ${esc(h.unit)}`) : h.kind === 'limit' && (!steps || getValue(h, d) === undefined) ? `max. ${num(h.target)} ${esc(h.unit)}` : '',
    isWeekly(h) ? `${weekCount(h, d)}/${h.perWeek} diese Woche` : '',
  ].filter(Boolean).join(' · ');
  const label = sub
    ? `<span class="name-wrap"><span class="name">${esc(h.name)}</span><span class="tag">${sub}</span></span>`
    : `<span class="name">${esc(h.name)}</span>`;
  const stamp = done ? '<svg class="picto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : pic(h.icon);
  return `<div class="row hab-row ${steps ? '' : 'one-line'} ${done ? 'is-done' : ''}">
    ${(h.kind !== 'limit' || !steps) && !future
      ? `<button class="row-main" data-action="${h.kind === 'check' ? 'toggle-habit' : h.kind === 'choice' ? 'open-pick' : h.kind === 'limit' ? 'toggle-limit' : 'fill-habit'}" data-id="${h.id}"><span class="emoji">${stamp}</span>${label}</button>`
      : `<div class="row-main"><span class="emoji">${stamp}</span>${label}</div>`}
    <div class="controls">${controls}</div>
  </div>`;
}

function scheduleText(h) {
  if (isWeekly(h)) return `${h.perWeek}× pro Woche`;
  const w = h.weekdays;
  if (w.length === 7) return 'Täglich';
  if (w.length === 5 && [1, 2, 3, 4, 5].every((n) => w.includes(n))) return 'Mo–Fr';
  if (w.length === 2 && w.includes(0) && w.includes(6)) return 'Wochenende';
  return WEEKDAYS.filter(([n]) => w.includes(n)).map(([, l]) => l).join(', ');
}

function goalText(h) {
  if (h.kind === 'count') return `${num(h.target)} ${h.unit}`.trim();
  if (h.kind === 'limit') return `max. ${num(h.target)} ${h.unit}`.trim();
  if (h.kind === 'choice') return `Auswahl aus ${(h.options || []).length}${h.multi && minPick(h) > 1 ? `, mind. ${minPick(h)}` : ''}`;
  return 'Ja/Nein';
}

function renderHabits() {
  const habits = [...state.habits].sort(byOrder);
  const seg = ui.routines || 'habits';
  const head = `<header class="nav"><div class="nav-side"></div><div class="nav-side right"></div></header>
    <h1 class="large-title">Routinen</h1>
    <div class="segmented routine-switch">${[['habits', 'Habits'], ['checkin', 'Check-in']].map(([k, l]) => `<button class="${seg === k ? 'on' : ''}" data-action="routines" data-seg="${k}">${l}</button>`).join('')}</div>`;
  if (seg === 'checkin') return `${head}${renderQuestionList()}`;
  if (!habits.length) {
    return `${head}<div class="card empty-state">
      <div class="big">${pic('🔁')}</div>
      <h2>Noch keine Habits</h2>
      <p>Such dir etwas aus dem Katalog aus oder leg ein eigenes Habit an. Abgehakt wird dann im Reiter Heute.</p>
      <button class="btn-primary" data-action="open-catalog">Habit hinzufügen</button>
    </div>`;
  }
  return `${head}
    <div class="card">${habits.map((h, i) => swipeRow('habit', h.id, `
      <button class="row-main" data-action="edit-habit" data-id="${h.id}">
        <span class="emoji">${pic(h.icon)}</span>
        <span class="name-wrap"><span class="name">${esc(h.name)}</span><span class="tag">${esc([goalText(h), scheduleText(h)].filter(Boolean).join(' · '))}</span></span>
      </button>
      ${habits.length > 1 ? dragHandle('habit') : ''}`)).join('')}</div>
    <p class="section-footer">Tippe auf ein Habit, um es zu bearbeiten. Nach links wischen zum Löschen. Am Griff rechts festhalten und ziehen, um die Reihenfolge auf Heute zu ändern.</p>
    <div class="card" style="margin-top:20px"><div class="row"><button class="row-main" data-action="open-catalog"><span class="emoji">${pic('➕')}</span><span class="name" style="color:var(--accent)">Habit hinzufügen</span></button></div></div>`;
}

function todoRow(t, today, future) {
  const list = t.listId ? listById(t.listId) : null;
  const done = !!t.completedAt;
  let tag = '';
  if (list) tag = `aus ${list.name}`;
  if (subsText(t)) tag = tag ? `${tag} · ${subsText(t)}` : subsText(t);
  else if (carriedOver(t, today)) tag = `seit ${fmt(t.plannedDay, { weekday: 'long' })}`;
  return swipeRow('todo', t.id, `
    <button class="row-main" data-action="edit-todo" data-id="${t.id}">
      <span class="emoji">${pic(list ? list.icon : '📌')}</span>
      <span class="name-wrap"><span class="name ${done ? 'struck' : ''}">${esc(t.title)}</span>${tag && !done ? `<span class="tag">${esc(tag)}</span>` : ''}</span>
    </button>
    <div class="controls"><button class="status-btn" data-action="toggle-todo" data-id="${t.id}" ${future ? 'disabled' : ''} aria-label="${done ? 'Zurücksetzen' : 'Erledigt'}"><span class="todo-box ${done ? 'on' : ''}">${done ? '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' : ''}</span></button></div>
  `);
}

function renderPool() {
  const today = todayKey();
  const list = ui.poolListId ? listById(ui.poolListId) : null;
  if (list) return renderPoolList(list, today);

  const lists = [...state.lists].sort(byOrder);
  const open = state.todos.filter((t) => inPool(t, today));
  const head = `<header class="nav"><div class="nav-side"></div><div class="nav-side right"></div></header>
    <h1 class="large-title">Projekte</h1>`;

  if (!lists.length) {
    return `${head}<div class="card empty-state">
      <div class="big">${pic('📁')}</div>
      <h2>Noch keine Projekte</h2>
      <p>Hier sammelst du größere Vorhaben und ihre Aufgaben, z.B. „Urlaub planen“ oder „Wohnung renovieren“. Wenn du Zeit und Lust hast, holst du dir eine Aufgabe auf Heute.</p>
      <button class="btn-primary" data-action="new-list">Erstes Projekt anlegen</button>
    </div>`;
  }

  return `${head}
    <div class="card"><button class="surprise" data-action="surprise" ${open.length ? '' : 'disabled'}>
      <span class="big">${pic('🎲')}</span><span><strong>Überrasch mich</strong><span class="sub">${open.length ? `Eine zufällige Aufgabe aus ${open.length} offenen` : 'Gerade ist nichts offen'}</span></span>
    </button></div>
    <h3 class="section-title">Deine Projekte</h3>
    <div class="card">${lists.map((l) => {
      const n = state.todos.filter((t) => t.listId === l.id && inPool(t, today)).length;
      return `<div class="row"><button class="row-main" data-action="open-list" data-id="${l.id}">
        <span class="emoji">${pic(l.icon)}</span><span class="name" style="flex:1">${esc(l.name)}</span>
        <span class="count">${n}</span><svg class="chevron" viewBox="0 0 8 14">${ICON.right.replace(/<\/?svg[^>]*>/g, '')}</svg>
      </button></div>`;
    }).join('')}</div>
    <div class="card" style="margin-top:20px"><div class="row"><button class="row-main" data-action="new-list"><span class="emoji">${pic('➕')}</span><span class="name" style="color:var(--accent)">Projekt hinzufügen</span></button></div></div>`;
}

function renderPoolList(list, today) {
  const items = state.todos.filter((t) => t.listId === list.id);
  const open = items.filter((t) => !t.completedAt).sort(byOrder);
  const done = items.filter((t) => t.completedAt).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  return `
    <header class="nav">
      <div class="nav-side"><button class="back" data-action="close-list">${ICON.back}<span>Projekte</span></button></div>
      <div class="nav-side right"><button class="link" data-action="edit-list" data-id="${list.id}">Bearbeiten</button></div>
    </header>
    <h1 class="large-title list-title">${pic(list.icon)} ${esc(list.name)}</h1>
    <div class="card">
      ${open.map((t) => {
        const planned = t.plannedDay && t.plannedDay >= today;
        return `<div class="row">
          <button class="row-main" data-action="edit-todo" data-id="${t.id}"><span class="name-wrap"><span class="name">${esc(t.title)}</span>${subsText(t) ? `<span class="tag">${subsText(t)}</span>` : ''}</span></button>
          <div class="controls">${planned
            ? `<button class="pill filled" data-action="unplan" data-id="${t.id}">${t.plannedDay === today ? 'Heute' : esc(fmt(t.plannedDay, { weekday: 'short' }))} ✓</button>`
            : `<button class="pill" data-action="plan-today" data-id="${t.id}">Auf Heute</button>`}</div>
        </div>`;
      }).join('')}
      <form class="row add-row" data-form="add-pool-item">
        <span class="plus">+</span>
        <input id="pool-new" name="title" placeholder="Neue Aufgabe" autocomplete="off" enterkeyhint="done">
        <button class="pill add-btn" type="submit">Hinzufügen</button>
      </form>
    </div>
    <p class="section-footer">Tippe auf „Auf Heute“, um dir etwas in deinen Tag zu holen. Was du nicht schaffst, landet morgen wieder hier im Projekt.</p>
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
      const cls = isDone(h, d) ? 'on' : isWeekly(h) || !isActive(h, d) ? 'off' : '';
      dots.push(`<i class="${cls}" title="${esc(fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }))}"></i>`);
    }
    return `<div class="stat">
      <div class="stat-head"><span class="emoji">${pic(h.icon)}</span><span class="name">${esc(h.name)}</span><span class="streak">${s > 0 ? `🔥 ${s} ${isWeekly(h) ? (s === 1 ? 'Woche' : 'Wochen') : (s === 1 ? 'Tag' : 'Tage')}` : ''}</span></div>
      <div class="stat-sub">Woche ${w === null ? '–' : w + ' %'} · 30 Tage ${m === null ? '–' : m + ' %'}</div>
      ${h.kind === 'choice' && pickStats(h, 30).length ? `<div class="stat-sub pick-stats">${pickStats(h, 30).map(([n, c]) => `<span>${esc(n)} <b>${c}×</b></span>`).join('')}</div>` : ''}
      <div class="dots">${dots.join('')}</div>
    </div>`;
  }).join('');

  const doneTodos = state.todos.filter((t) => t.completedAt && t.completedAt > addDays(today, -7)).length;

  return `
    <header class="nav"><div class="nav-side"></div><div class="nav-side right"><button class="icon-btn" data-action="open-settings" aria-label="Einstellungen">${ICON.gear}</button></div></header>
    <h1 class="large-title">Fortschritt</h1>
    <div class="card">${rows || '<p class="empty">Noch keine Habits angelegt.</p>'}</div>
    <p class="section-footer">Serie = Tage am Stück. Die Kästchen zeigen die letzten 14 Tage. In den letzten 7 Tagen hast du ${doneTodos} ${doneTodos === 1 ? 'To-Do' : 'To-Dos'} erledigt.</p>

    ${renderCheckinStats(today)}
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

  if (s.type === 'settings') return renderSettingsSheet();
  if (s.type === 'month') return renderMonthSheet();
  if (s.type === 'q-catalog') return renderQuestionCatalog();
  if (s.type === 'q-editor') return renderQuestionEditor();
  if (s.type === 'add-menu') {
    return `<div class="overlay" data-action="overlay"><div class="sheet"><div class="sheet-head"><div class="left">${cancelBtn}</div><h2>Hinzufügen</h2><div></div></div>
      <div class="sheet-body"><div class="card">
        <button class="menu-option" data-action="open-catalog"><span class="big">${pic('🔁')}</span><span><strong>Habit</strong><span class="sub">Jeden Tag oder an bestimmten Wochentagen</span></span></button>
        <button class="menu-option" data-action="new-todo"><span class="big">${pic('📌')}</span><span><strong>To-Do</strong><span class="sub">Einmalig, für heute oder einen anderen Tag</span></span></button>
        <button class="menu-option" data-action="go-pool-new"><span class="big">${pic('📁')}</span><span><strong>Projekt</strong><span class="sub">Für größere Vorhaben mit mehreren Aufgaben</span></span></button>
      </div></div></div></div>`;
  }

  if (s.type === 'catalog') {
    const names = new Set(state.habits.map((h) => h.name));
    const body = `<div class="card" style="margin-top:6px"><div class="row"><button class="row-main" data-action="habit-from" data-name=""><span class="emoji">${pic('➕')}</span><span class="name" style="color:var(--accent)">Eigenes Habit erstellen</span></button></div></div>
      ${CATALOG.map((c) => `<h3 class="section-title">${esc(c.name)}</h3><div class="card">${c.items.map((t) => `<div class="row"><button class="row-main" data-action="habit-from" data-name="${esc(t.name)}">
        <span class="emoji">${pic(t.icon)}</span><span class="name" style="flex:1">${esc(t.name)}</span>${names.has(t.name)
          ? `<span class="value chosen">Schon dabei</span>${statusCircle('done')}`
          : `<span class="value">${esc(goalText(t))}</span><svg class="chevron" viewBox="0 0 8 14">${ICON.right.replace(/<\/?svg[^>]*>/g, '')}</svg>`}</button></div>`).join('')}</div>`).join('')}`;
    return sheetShell('Habit hinzufügen', cancelBtn, '', body);
  }

  if (s.type === 'habit-editor') {
    const isNew = !dr.id;
    const body = `
      <h3 class="section-title">Name</h3>
      <input class="field" id="habit-name" data-field="name" value="${esc(dr.name)}" placeholder="z.B. Meditieren" autocomplete="off">
      <h3 class="section-title">Art</h3>
      <div class="card">
        <div class="segmented">${[['check', 'Ja/Nein'], ['count', 'Mit Ziel'], ['limit', 'Limit'], ['choice', 'Auswahl']].map(([k, l]) => `<button class="${dr.kind === k ? 'on' : ''}" data-action="set-kind" data-kind="${k}">${l}</button>`).join('')}</div>
        <div class="hint">${KIND_TEXT[dr.kind]}</div>
      </div>
      ${dr.kind === 'choice' ? `<h3 class="section-title">Optionen</h3>
      <div class="card">
        ${dr.options.map((o, i) => `<div class="row"><span class="row-main"><input class="opt-input" data-opt="${i}" value="${esc(o)}" autocomplete="off" aria-label="Option umbenennen"></span>
          <div class="controls"><button class="small-link" data-action="opt-del" data-i="${i}" aria-label="Entfernen">✕</button></div></div>`).join('')}
        <form class="row add-row" data-form="add-opt"><span class="plus">+</span><input id="opt-new" placeholder="z.B. Yoga, Laufen, Schwimmen" autocomplete="off" enterkeyhint="done">
          <button class="pill add-btn" type="submit">Hinzufügen</button></form>
      </div>
      <div class="card" style="margin-top:12px">
        ${toggleRow('Mehrere auswählbar', dr.multi, 'data-action="draft-toggle" data-key="multi"')}
        ${dr.multi ? `<div class="form-row"><span>Mindestens</span><span class="controls">
          <button class="step" data-action="min-pick" data-dir="-1" ${dr.minPick <= 1 ? 'disabled' : ''} aria-label="Weniger">−</button>
          <span class="value" style="min-width:34px;text-align:center">${dr.minPick}</span>
          <button class="step" data-action="min-pick" data-dir="1" ${dr.minPick >= Math.max(1, dr.options.length) ? 'disabled' : ''} aria-label="Mehr">+</button></span></div>` : ''}
      </div>
      <p class="section-footer">Beim Abhaken kannst du auch einmalig etwas anderes eintragen. Das kommt nicht dauerhaft in die Liste.</p>` : ''}
      ${dr.kind !== 'check' && dr.kind !== 'choice' ? `<h3 class="section-title">${dr.kind === 'count' ? 'Ziel' : 'Limit'}</h3>
      <div class="card">
        <label class="form-row"><span>${dr.kind === 'count' ? 'Ziel pro Tag' : 'Höchstens'}</span><input data-field="target" inputmode="decimal" value="${esc(dr.target)}"></label>
        ${dr.kind === 'count' ? `<label class="form-row"><span>Pro Tipp</span><input data-field="step" inputmode="decimal" value="${esc(dr.step)}"></label>` : ''}
        <label class="form-row"><span>Einheit</span><input data-field="unit" value="${esc(dr.unit)}" placeholder="z.B. L oder min"></label>
      </div>` : ''}
      <h3 class="section-title">Wie oft?</h3>
      <div class="card">${freqPicker(dr, '')}</div>
      <h3 class="section-title">Symbol</h3>
      <div class="card"><div class="icon-grid">${(HABIT_ICONS.includes(dr.icon) ? HABIT_ICONS : [dr.icon, ...HABIT_ICONS]).map((i) => `<button class="${dr.icon === i ? 'on' : ''}" data-action="set-icon" data-icon="${i}">${pic(i)}</button>`).join('')}</div></div>
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
      ${!dr.isPool ? '' : `<h3 class="section-title">Unteraufgaben</h3>
      <div class="card">
        ${dr.subs.map((x, i) => `<div class="row">
          <button class="status-btn" data-action="sub-toggle" data-i="${i}" aria-label="${x.done ? 'Zurücksetzen' : 'Erledigt'}">${statusCircle(x.done ? 'done' : 'open')}</button>
          <span class="row-main"><span class="name ${x.done ? 'struck' : ''}">${esc(x.title)}</span></span>
          <div class="controls"><button class="small-link" data-action="sub-del" data-i="${i}" aria-label="Entfernen">✕</button></div>
        </div>`).join('')}
        <form class="row add-row" data-form="add-sub"><span class="plus">+</span><input id="sub-new" placeholder="Unteraufgabe eintippen" autocomplete="off" enterkeyhint="done">
          <button class="pill add-btn" type="submit">Hinzufügen</button></form>
      </div>
      <p class="section-footer">Große Aufgaben in kleine Schritte teilen, z.B. „Flüge vergleichen“, „Hotel buchen“.</p>`}
      ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
      ${isNew ? '' : `<div class="card" style="margin-top:28px">
        ${t && t.listId && !t.completedAt && t.plannedDay && t.plannedDay >= today ? '<button class="btn-plain" style="color:var(--accent)" data-action="back-to-pool">Zurück ins Projekt</button>' : ''}
        <button class="btn-danger" data-action="delete-todo">${dr.confirmDelete ? 'Wirklich löschen? Nochmal tippen' : 'Löschen'}</button>
      </div>`}`;
    return sheetShell(isNew ? 'Neues To-Do' : (dr.isPool ? 'Aufgabe bearbeiten' : 'To-Do bearbeiten'), cancelBtn,
      `<button class="link" style="font-weight:600" data-action="save-todo">${isNew ? 'Hinzufügen' : 'Sichern'}</button>`, body);
  }

  if (s.type === 'list-editor') {
    const isNew = !dr.id;
    const body = `
      <h3 class="section-title">Name</h3>
      <input class="field" id="list-name" data-field="name" value="${esc(dr.name)}" placeholder="z.B. Urlaub planen, Wohnung, Steuer" autocomplete="off" enterkeyhint="done">
      <h3 class="section-title">Symbol</h3>
      <div class="card"><div class="icon-grid">${LIST_ICONS.map((i) => `<button class="${dr.icon === i ? 'on' : ''}" data-action="set-icon" data-icon="${i}">${pic(i)}</button>`).join('')}</div></div>
      ${dr.error ? `<p class="error">${esc(dr.error)}</p>` : ''}
      ${isNew ? '' : `<div class="card" style="margin-top:28px"><button class="btn-danger" data-action="delete-list">${dr.confirmDelete ? 'Projekt mit allen Aufgaben löschen?' : 'Projekt löschen'}</button></div>`}`;
    return sheetShell(isNew ? 'Neues Projekt' : 'Projekt bearbeiten', cancelBtn,
      `<button class="link" style="font-weight:600" data-action="save-list">${isNew ? 'Anlegen' : 'Sichern'}</button>`, body);
  }

  if (s.type === 'pick') return renderPickSheet();
  if (s.type === 'limit-entry') {
    const h = habitById(s.id);
    if (!h) return '';
    const has = getValue(h, ui.day) !== undefined;
    return `<div class="overlay center" data-action="overlay"><form class="dialog" data-form="limit-entry">
      <div class="big">${pic(h.icon)}</div>
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
      <div class="big">${pic(list ? list.icon : '🎲')}</div>
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
function toast(text, undo = null) {
  ui.toast = text;
  ui.undo = undo;
  render();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { ui.toast = null; ui.undo = null; render(); }, undo ? 4500 : 1800);
}
function commit() { persist(); render(); }

function habitDraft(h, template) {
  const src = h || template || { name: '', icon: '✅', kind: 'check', target: 1, step: 1, unit: '' };
  return {
    id: h ? h.id : null, name: src.name, icon: src.icon, kind: src.kind,
    target: src.kind === 'check' ? '' : num(src.target ?? 1), step: num(src.step ?? 1), unit: src.unit ?? '',
    weekdays: h ? [...h.weekdays] : [0, 1, 2, 3, 4, 5, 6],
    freq: h && isWeekly(h) ? 'week' : h && h.weekdays.length < 7 ? 'days' : 'daily',
    perWeek: h && isWeekly(h) ? h.perWeek : 3,
    catchUp: h ? catchesUp(h) : false,
    options: [...(src.options || [])], optOrig: [...(src.options || [])], multi: !!src.multi, minPick: src.minPick || 1,
  };
}

function saveHabit() {
  const dr = ui.draft;
  const name = (dr.name || '').trim();
  if (dr.kind === 'choice') addOption();
  const target = dr.kind === 'check' || dr.kind === 'choice' ? 1 : parseNum(dr.target);
  const step = dr.kind === 'count' ? parseNum(dr.step) : 1;
  if (!name) return fail('Bitte gib dem Habit einen Namen.');
  if (dr.kind === 'choice' && !dr.options.some((o) => o.trim())) return fail('Bitte lege mindestens eine Option an, z.B. Yoga.');
  if (dr.kind !== 'check' && !(target > 0)) return fail('Bitte gib einen Zielwert größer als 0 ein.');
  if (dr.kind === 'count' && !(step > 0)) return fail('Bitte gib eine Schrittweite größer als 0 ein.');
  if (dr.freq === 'days' && !dr.weekdays.length) return fail('Wähle mindestens einen Wochentag.');
  const values = { name, icon: dr.icon, kind: dr.kind, target, step, unit: (dr.unit || '').trim(), ...freqValues(dr), catchUp: dr.catchUp };
  if (dr.kind === 'choice') {
    // Umbenannte Optionen: auch im Verlauf umbenennen, damit „zuletzt“ und die Statistik stimmen
    const ren = {};
    dr.options.forEach((o, i) => { const old = dr.optOrig[i]; if (old && o.trim() && old !== o.trim()) ren[old] = o.trim(); });
    if (dr.id && Object.keys(ren).length) for (const k of Object.keys(state.picks || {})) if (k.startsWith(dr.id + '|')) state.picks[k] = state.picks[k].map((n) => ren[n] || n);
    dr.options = dr.options.map((o) => o.trim()).filter(Boolean);
  }
  if (dr.kind === 'choice') Object.assign(values, { options: dr.options, multi: dr.multi, minPick: dr.multi ? Math.min(dr.minPick, dr.options.length) : 1, unit: '' });
  if (dr.id) Object.assign(habitById(dr.id), values);
  else state.habits.push({ ...makeHabit(values, nextOrder(state.habits)), ...values });
  ui.sheet = null; ui.draft = null;
  persist();
  toast(dr.id ? 'Gesichert' : `„${name}“ hinzugefügt`);
}

// Häufigkeit: täglich, an bestimmten Tagen oder x-mal pro Woche
function freqValues(f) {
  if (f.freq === 'week') return { weekdays: [0, 1, 2, 3, 4, 5, 6], perWeek: Math.min(6, Math.max(1, Number(f.perWeek) || 3)) };
  if (f.freq === 'days' && f.weekdays.length) return { weekdays: [...f.weekdays].sort(), perWeek: 0 };
  return { weekdays: [0, 1, 2, 3, 4, 5, 6], perWeek: 0 };
}
const FREQS = [['daily', 'Täglich'], ['days', 'An Tagen'], ['week', 'Pro Woche']];
function freqPicker(f, attrs) {
  return `<div class="segmented">${FREQS.map(([k, l]) => `<button class="${f.freq === k ? 'on' : ''}" data-action="set-freq" data-freq="${k}" ${attrs}>${l}</button>`).join('')}</div>
    ${f.freq === 'days' ? `<div class="weekdays" style="margin-top:10px">${WEEKDAYS.map(([n, l]) => `<button class="${f.weekdays.includes(n) ? 'on' : ''}" data-action="toggle-weekday" data-n="${n}" ${attrs}>${l}</button>`).join('')}</div>` : ''}
    ${f.freq === 'week' ? `<div class="form-row" style="padding:10px 2px 0"><span>Wie oft pro Woche?</span><span class="controls">
      <button class="step" data-action="per-week" data-dir="-1" ${attrs} ${f.perWeek <= 1 ? 'disabled' : ''} aria-label="Seltener">−</button>
      <span class="value" style="min-width:34px;text-align:center">${f.perWeek}×</span>
      <button class="step" data-action="per-week" data-dir="1" ${attrs} ${f.perWeek >= 6 ? 'disabled' : ''} aria-label="Öfter">+</button></span></div>` : ''}`;
}

function fail(message) { ui.draft.error = message; render(); }

function addOption() {
  const input = document.getElementById('opt-new');
  const v = input ? input.value.trim() : '';
  if (!v) return false;
  if (!ui.draft.options.some((o) => o.toLowerCase() === v.toLowerCase())) { ui.draft.options.push(v); ui.draft.optOrig.push(null); }
  ui.draft.error = null;
  return true;
}

/* Auswahlblatt: was hast du heute gemacht? Am längsten her steht oben. */
function renderPickSheet() {
  const h = habitById(ui.sheet.id), dr = ui.draft;
  if (!h) return '';
  const d = ui.day, ago = lastPicked(h, d), multi = h.multi;
  const opts = [...(h.options || [])].map((n, i) => ({ n, i, a: ago[n] ?? Infinity }))
    .sort((x, y) => (y.a - x.a) || (x.i - y.i));
  const extras = dr.sel.filter((n) => !(h.options || []).includes(n));
  const box = (on) => `<span class="todo-box ${on ? 'on' : ''}">${on ? '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' : ''}</span>`;
  const row = (n, tag) => {
    const on = dr.sel.includes(n);
    return `<div class="row pick-row ${on ? 'on' : ''}"><button class="row-main" data-action="pick" data-name="${esc(n)}">
      <span class="name-wrap"><span class="name">${esc(n)}</span><span class="tag">${esc(tag)}</span></span>
      <span class="controls">${multi ? box(on) : statusCircle(on ? 'done' : 'open')}</span></button></div>`;
  };
  const dayWord = d === todayKey() ? 'heute' : 'an diesem Tag';
  const lead = `Was hast du ${dayWord} gemacht?${multi && minPick(h) > 1 ? ` Mindestens ${minPick(h)}.` : ' Am längsten her steht oben.'}`;
  const other = dr.otherOpen
    ? `<form class="card pick-other" data-form="pick-other">
        <div class="pick-other-title">${multi ? 'Noch etwas anderes' : `Etwas anderes`}</div>
        <input class="field" id="pick-other" data-field="other" value="${esc(dr.other || '')}" placeholder="z.B. Klettern" autocomplete="off" enterkeyhint="done">
        <p class="pick-other-hint">Zählt ${dayWord} für ${esc(h.name)}. Taucht im Verlauf auf, kommt aber nicht dauerhaft in die Auswahl.</p>
        <button class="pill add-btn" type="submit">${multi ? 'Hinzufügen' : 'Übernehmen'}</button>
      </form>`
    : `<div class="card"><div class="row"><button class="row-main" data-action="pick-other-open"><span class="name-wrap"><span class="name" style="color:var(--accent)">+ Andere …</span><span class="tag">einmalig eintragen</span></span></button></div></div>`;
  const wk = isWeekly(h) ? `<p class="section-footer">${esc(h.name)}: ${h.perWeek}× pro Woche · diese Woche ${weekCount(h, d)} von ${h.perWeek}</p>` : '';
  const had = picksOf(h, d).length > 0;
  const n = dr.sel.length;
  const body = `<p class="pick-lead">${lead}</p>
    <div class="card">${extras.map((x) => row(x, 'einmalig')).join('')}${opts.map((o) => row(o.n, agoText(ago[o.n]))).join('')}</div>
    <div style="margin-top:10px">${other}</div>
    ${wk}
    <button class="btn-primary" style="width:100%;margin-top:16px" data-action="pick-save" ${n || had || (dr.other || '').trim() ? '' : 'disabled'}>${multi && n ? `Speichern · ${n} gewählt` : 'Speichern'}</button>
    ${had ? '<button class="btn-plain" style="width:100%;margin-top:8px;color:#ff3b30" data-action="pick-clear">Zurücksetzen</button>' : ''}`;
  return sheetShell(h.name, cancelBtn, '', body);
}
function savePicks(names) {
  const h = habitById(ui.sheet.id);
  setPicks(h, ui.day, [...new Set(names.map((x) => x.trim()).filter(Boolean))]);
  ui.sheet = null; ui.draft = null; commit();
}

function todoDraft(t) {
  const today = todayKey();
  if (!t) return { id: null, title: '', when: 'today', date: addDays(today, 2), isPool: false, subs: [], rollover: true };
  let when = 'today';
  if (t.plannedDay === addDays(today, 1)) when = 'tomorrow';
  else if (t.plannedDay && t.plannedDay > addDays(today, 1)) when = 'date';
  return { id: t.id, title: t.title, when, date: t.plannedDay && t.plannedDay > today ? t.plannedDay : addDays(today, 2), isPool: !!t.listId, subs: (t.subs || []).map((x) => ({ ...x })), rollover: rollsOver(t) };
}

const cleanSubs = (subs) => (subs || []).filter((x) => x.title.trim()).map((x) => ({ id: x.id, title: x.title.trim(), done: !!x.done }));
// Änderungen an Unteraufgaben gelten sofort (auch ohne Sichern), wenn das To-Do schon existiert
function syncSubs() {
  const dr = ui.draft;
  if (dr.id) { todoById(dr.id).subs = cleanSubs(dr.subs); persist(); }
  render();
}
function addSub() {
  const el = document.getElementById('sub-new');
  const title = el ? el.value.trim() : '';
  if (!title) return;
  ui.draft.subs.push({ id: uid(), title, done: false });
  ui.focus = '#sub-new';
  syncSubs();
}
function saveTodo() {
  const dr = ui.draft;
  const pending = document.getElementById('sub-new');
  if (pending && pending.value.trim()) dr.subs.push({ id: uid(), title: pending.value.trim(), done: false });
  const title = (dr.title || '').trim();
  if (!title) return fail('Bitte schreib kurz, was zu tun ist.');
  const today = todayKey();
  const plannedDay = dr.when === 'tomorrow' ? addDays(today, 1) : dr.when === 'date' ? (dr.date || today) : today;
  if (dr.id) {
    const t = todoById(dr.id);
    t.title = title;
    t.subs = cleanSubs(dr.subs);
    if (!t.listId && !t.completedAt) t.plannedDay = plannedDay;
  } else {
    state.todos.push({ id: uid(), title, plannedDay, completedAt: null, createdAt: today, listId: null, order: nextOrder(state.todos), subs: cleanSubs(dr.subs) });
  }
  ui.sheet = null; ui.draft = null;
  persist();
  toast(dr.id ? 'Gesichert' : plannedDay === today ? 'Steht auf Heute' : `Geplant für ${fmt(plannedDay, { weekday: 'long' })}`);
}

function saveList() {
  const dr = ui.draft;
  const name = (dr.name || '').trim();
  if (!name) return fail('Bitte gib dem Projekt einen Namen.');
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

const freqTarget = (el) => (el.dataset.name ? ui.ob.cfg[el.dataset.name] : ui.draft);

const actions = {
  'tour-next'() {
    if (ui.tour >= TOUR.length - 1) return actions['tour-end']();
    ui.tour++; ui.tab = TOUR[ui.tour][0]; ui.poolListId = null; window.scrollTo(0, 0); render();
  },
  'tour-end'() { ui.tour = null; ui.tab = 'today'; state.tourDone = true; window.scrollTo(0, 0); commit(); },
  'tour-start'() { startTour(); },
  tab(el) { ui.tab = el.dataset.tab; if (ui.tab === 'pool') ui.poolListId = null; window.scrollTo(0, 0); render(); },
  'go-today'() { ui.day = todayKey(); render(); },
  'open-month'() { ui.month = ui.day.slice(0, 7); openSheet({ type: 'month' }); },
  'month-shift'(el) {
    const [y, m] = ui.month.split('-').map(Number);
    const dt = new Date(y, m - 1 + Number(el.dataset.n), 1);
    ui.month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; render();
  },
  'month-pick'(el) { ui.day = el.dataset.day; closeSheet(); },
  'month-today'() { ui.day = todayKey(); closeSheet(); },
  'select-day'(el) { ui.day = el.dataset.day; render(); },
  'shift-week'(el) { ui.day = addDays(ui.day, 7 * Number(el.dataset.n)); render(); },
  poke(el) { el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); },

  'toggle-habit'(el) { const h = habitById(el.dataset.id); setValue(h, ui.day, isDone(h, ui.day) ? 0 : 1); commit(); },
  'catch-up'(el) { const h = habitById(el.dataset.id); setValue(h, addDays(todayKey(), -1), h.kind === 'check' ? 1 : h.target); persist(); toast(`„${h.name}“ für gestern nachgeholt`); },
  'fill-habit'(el) { const h = habitById(el.dataset.id); setValue(h, ui.day, isDone(h, ui.day) ? 0 : h.target); commit(); },
  step(el) { const h = habitById(el.dataset.id); setValue(h, ui.day, Math.max(0, valueOf(h, ui.day) + Number(el.dataset.dir) * h.step)); commit(); },
  'toggle-limit'(el) {
    const h = habitById(el.dataset.id), k = logKey(h, ui.day);
    if (isDone(h, ui.day)) delete state.logs[k]; else state.logs[k] = h.target;
    commit();
  },
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
  'focus-new-todo'() { if (ui.day < todayKey()) ui.day = todayKey(); ui.focus = '#todo-new'; render(); const el = document.getElementById('todo-new'); if (el) el.scrollIntoView({ block: 'center' }); },
  'new-todo'() { openSheet({ type: 'todo-editor' }, todoDraft(null), '#todo-title'); },
  'sub-toggle'(el) { const x = ui.draft.subs[Number(el.dataset.i)]; x.done = !x.done; syncSubs(); },
  'sub-del'(el) { ui.draft.subs.splice(Number(el.dataset.i), 1); syncSubs(); },
  'set-when'(el) { ui.draft.when = el.dataset.when; render(); },
  'save-todo'() { saveTodo(); },
  'delete-todo'() {
    if (!ui.draft.confirmDelete) { ui.draft.confirmDelete = true; return render(); }
    state.todos = state.todos.filter((t) => t.id !== ui.draft.id);
    ui.sheet = null; ui.draft = null; commit();
  },
  'back-to-pool'() { const t = todoById(ui.draft.id); t.plannedDay = null; ui.sheet = null; ui.draft = null; persist(); toast('Zurück im Projekt'); },

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
    const f = freqTarget(el), n = Number(el.dataset.n), w = f.weekdays;
    f.weekdays = w.includes(n) ? w.filter((x) => x !== n) : [...w, n];
    render();
  },
  'set-freq'(el) { const f = freqTarget(el); f.freq = el.dataset.freq; if (f.freq === 'days' && f.weekdays.length === 7) f.weekdays = [1, 2, 3, 4, 5]; render(); },
  'per-week'(el) { const f = freqTarget(el); f.perWeek = Math.min(6, Math.max(1, f.perWeek + Number(el.dataset.dir))); render(); },
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
    if (ob.step >= 4) return finishOnboarding();
    ob.step += ob.step === 1 && !ob.habits.length ? 2 : 1; // ohne Habits kein Feinschliff
    window.scrollTo(0, 0); render();
  },
  'ob-back'() { const ob = ui.ob; ob.step = Math.max(0, ob.step - (ob.step === 3 && !ob.habits.length ? 2 : 1)); window.scrollTo(0, 0); render(); },
  'ob-question'(el) { const ob = ui.ob, t = el.dataset.text; ob.questions = ob.questions.includes(t) ? ob.questions.filter((x) => x !== t) : [...ob.questions, t]; render(); },
  'ob-toggle'(el) { const f = ui.ob.cfg[el.dataset.name]; f[el.dataset.key] = !f[el.dataset.key]; render(); },
  'ob-habit'(el) {
    const ob = ui.ob, n = el.dataset.name;
    ob.habits = ob.habits.includes(n) ? ob.habits.filter((x) => x !== n) : [...ob.habits, n];
    if (!ob.cfg[n]) { const t = findTemplate(n); ob.cfg[n] = { target: t.kind === 'check' ? '' : num(t.target), freq: 'daily', weekdays: [1, 2, 3, 4, 5], perWeek: 3 }; }
    render();
  },
  'open-pick'(el) {
    const h = habitById(el.dataset.id);
    openSheet({ type: 'pick', id: h.id }, { sel: [...picksOf(h, ui.day)], other: '', otherOpen: false });
  },
  pick(el) {
    const h = habitById(ui.sheet.id), n = el.dataset.name, dr = ui.draft;
    if (!h.multi) dr.sel = dr.sel.includes(n) ? [] : [n]; // erst auswählen, abgehakt wird mit dem Knopf
    else dr.sel = dr.sel.includes(n) ? dr.sel.filter((x) => x !== n) : [...dr.sel, n];
    render();
  },
  'pick-other-open'() { ui.draft.otherOpen = true; ui.focus = '#pick-other'; render(); },
  'pick-save'() {
    const h = habitById(ui.sheet.id), dr = ui.draft, other = (dr.other || '').trim();
    if (!h.multi) return savePicks(other ? [other] : dr.sel);
    savePicks(other ? [...dr.sel, other] : dr.sel);
  },
  'pick-clear'() { savePicks([]); },
  'opt-del'(el) { ui.draft.options.splice(Number(el.dataset.i), 1); ui.draft.optOrig.splice(Number(el.dataset.i), 1); ui.draft.minPick = Math.max(1, Math.min(ui.draft.minPick, ui.draft.options.length)); render(); },
  'min-pick'(el) { const dr = ui.draft; dr.minPick = Math.max(1, Math.min(Math.max(1, dr.options.length), dr.minPick + Number(el.dataset.dir))); render(); },
  'draft-toggle'(el) { ui.draft[el.dataset.key] = !ui.draft[el.dataset.key]; render(); },
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

  'swipe-del'(el) {
    const { kind, id } = el.dataset;
    openSwipe = null;
    const before = JSON.stringify(state);
    let label = 'Gelöscht';
    if (kind === 'todo') { state.todos = state.todos.filter((t) => t.id !== id); label = 'To-Do gelöscht'; }
    else if (kind === 'habit') { deleteHabit(id); label = 'Habit gelöscht'; }
    else if (kind === 'question') { state.checkinQuestions = state.checkinQuestions.filter((q) => q.id !== id); label = 'Frage gelöscht'; }
    persist(); toast(label, before);
  },
  undo() {
    if (!ui.undo) return;
    state = normalize(JSON.parse(ui.undo)); ui.undo = null; ui.toast = null;
    clearTimeout(toast.timer); commit();
  },
  fold(el) {
    const k = el.dataset.key;
    if (k === 'habits') {
      const hs = state.habits.filter((h) => isActive(h, ui.day) || weeklyShows(h, ui.day));
      const now = !habitsFolded(ui.day, hs);
      ui.habFold = ui.habFold || {}; ui.habFold[ui.day] = now;
      state.collapsed = state.collapsed || {};
      if (now) state.collapsed.habits = true; else delete state.collapsed.habits;
      return commit();
    }
    if (k === 'checkin') { ui.ciFold = ui.ciFold || {}; ui.ciFold[ui.day] = !ciFolded(ui.day); return render(); }
    state.collapsed = state.collapsed || {};
    if (state.collapsed[k]) delete state.collapsed[k]; else state.collapsed[k] = true;
    commit();
  },
  'open-settings'() { openSheet({ type: 'settings' }); },
  'habit-mode'(el) { state.habitMode = el.dataset.mode; commit(); },
  routines(el) { ui.routines = el.dataset.seg; render(); },
  'open-q-catalog'() { openSheet({ type: 'q-catalog' }); },
  'question-pick'(el) {
    const text = el.dataset.text;
    if (state.checkinQuestions.some((q) => q.text === text)) return;
    const t = Q_CATALOG.find((q) => q.text === text);
    state.checkinQuestions.push({ id: uid(), text: t.text, type: t.type, icon: t.icon });
    persist(); toast('Frage hinzugefügt');
  },
  'question-new'() { openSheet({ type: 'q-editor' }, { id: null, text: '', type: 'scale', icon: '❓', lo: 'wenig', hi: 'viel' }, '#q-text'); },
  'edit-question'(el) { const q = state.checkinQuestions.find((x) => x.id === el.dataset.id); openSheet({ type: 'q-editor' }, { id: q.id, text: q.text, type: q.type, icon: q.icon || '❓', lo: q.lo || 'wenig', hi: q.hi || 'viel' }); },
  'save-question'() { saveQuestion(); },
  'q-type'(el) { ui.draft.type = el.dataset.type; render(); },
  'q-del'() {
    if (!ui.draft.confirmDelete) { ui.draft.confirmDelete = true; return render(); }
    state.checkinQuestions = state.checkinQuestions.filter((q) => q.id !== ui.draft.id);
    ui.sheet = null; ui.draft = null; commit();
  },
  'q-move'(el) {
    const list = state.checkinQuestions, i = list.findIndex((q) => q.id === el.dataset.id), j = i + Number(el.dataset.dir);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; commit();
  },
  'checkin-set'(el) {
    const dr = checkinDraft(ui.day), q = el.dataset.q, v = el.dataset.v === 'true';
    if (dr.values[q] === v) delete dr.values[q]; else dr.values[q] = v;
    dr.dirty = true; render();
  },
  'checkin-save'() {
    const dr = checkinDraft(ui.day), clean = {};
    Object.entries(dr.values).forEach(([k, v]) => { if (answered(v)) clean[k] = v; });
    if (Object.keys(clean).length) state.checkins[ui.day] = clean; else delete state.checkins[ui.day];
    dr.dirty = false; if (ui.ciFold) delete ui.ciFold[ui.day]; persist(); toast('Check-in gespeichert');
  },

  export() { exportData(); },
  'close-sheet'() { closeSheet(); },
  overlay(el, ev) { if (ev.target === el) closeSheet(); },
};

// Wisch-Geste: Zeile nach links schieben, Mülleimer erscheint
const SWIPE_W = 80;
let swipe = null, openSwipe = null, swallowClick = false;
function setSwipeX(row, x, animate) {
  row.style.transition = animate ? 'transform .22s ease' : 'none';
  row.style.transform = x ? `translateX(${x}px)` : '';
  row.parentElement.classList.toggle('open', x < 0);
}
function closeOpenSwipe() {
  if (openSwipe && openSwipe.isConnected) setSwipeX(openSwipe, 0, true);
  openSwipe = null;
}
// Sortieren per Ziehen am Griff (Routinen)
let drag = null;
function dragStart(handle, y) {
  const item = handle.closest('.swipe');
  const items = [...item.parentElement.querySelectorAll(':scope > .swipe')];
  drag = { kind: handle.dataset.drag, item, items, from: items.indexOf(item), to: items.indexOf(item), y0: y, h: item.offsetHeight };
  item.classList.add('dragging');
}
function dragMove(y) {
  const dy = y - drag.y0;
  const to = Math.max(0, Math.min(drag.items.length - 1, drag.from + Math.round(dy / drag.h)));
  drag.to = to;
  drag.item.style.transform = `translateY(${dy}px)`;
  drag.items.forEach((el, i) => {
    if (el === drag.item) return;
    let shift = 0;
    if (drag.from < to && i > drag.from && i <= to) shift = -drag.h;
    if (drag.from > to && i < drag.from && i >= to) shift = drag.h;
    el.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}
function dragEnd() {
  const { kind, items, from, to } = drag;
  drag = null;
  swallowClick = true;
  const ids = items.map((el) => el.dataset.id);
  const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved);
  if (kind === 'habit') ids.forEach((id, n) => { const h = habitById(id); if (h) h.order = n; });
  else state.checkinQuestions.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  commit();
}
document.addEventListener('touchstart', (ev) => {
  const hd = ev.target.closest('.drag-handle');
  if (!hd || ev.touches.length !== 1) return;
  ev.preventDefault();
  dragStart(hd, ev.touches[0].clientY);
}, { passive: false });
document.addEventListener('touchmove', (ev) => { if (drag) { ev.preventDefault(); dragMove(ev.touches[0].clientY); } }, { passive: false });
document.addEventListener('touchend', () => { if (drag) dragEnd(); });
document.addEventListener('touchcancel', () => { if (drag) { drag = null; render(); } });

let weekSwipe = null;
document.addEventListener('touchstart', (ev) => {
  const w = ev.target.closest('[data-swipe-week]');
  weekSwipe = w && ev.touches.length === 1 ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (ev) => {
  if (!weekSwipe) return;
  const t = ev.changedTouches[0], dx = t.clientX - weekSwipe.x, dy = t.clientY - weekSwipe.y;
  weekSwipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { ui.day = addDays(ui.day, dx < 0 ? 7 : -7); swallowClick = true; render(); }
});
document.addEventListener('touchstart', (ev) => {
  const row = ev.target.closest('.swipe-row');
  if (ev.target.closest('.drag-handle')) { swipe = null; return; }
  if (openSwipe && !openSwipe.isConnected) openSwipe = null;
  if (openSwipe && row !== openSwipe && !ev.target.closest('.swipe-del')) { closeOpenSwipe(); swallowClick = true; swipe = null; return; }
  if (!row || ev.touches.length !== 1) { swipe = null; return; }
  const t = ev.touches[0];
  swipe = { row, x0: t.clientX, y0: t.clientY, base: row === openSwipe ? -SWIPE_W : 0, dx: 0, mode: null };
}, { passive: true });
document.addEventListener('touchmove', (ev) => {
  if (!swipe) return;
  const t = ev.touches[0];
  const dx = t.clientX - swipe.x0, dy = t.clientY - swipe.y0;
  if (!swipe.mode) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    swipe.mode = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  }
  if (swipe.mode !== 'h') return;
  ev.preventDefault();
  swipe.dx = dx;
  let x = Math.min(0, swipe.base + dx);
  if (x < -SWIPE_W) x = -SWIPE_W + (x + SWIPE_W) * 0.3;
  setSwipeX(swipe.row, x, false);
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const { row, mode, base, dx } = swipe;
  swipe = null;
  if (mode !== 'h') {
    if (row === openSwipe) { closeOpenSwipe(); swallowClick = true; }
    return;
  }
  swallowClick = true;
  const open = base + dx < -SWIPE_W / 2;
  setSwipeX(row, open ? -SWIPE_W : 0, true);
  openSwipe = open ? row : null;
});
document.addEventListener('click', (ev) => {
  if (swallowClick) { swallowClick = false; ev.stopPropagation(); ev.preventDefault(); }
}, true);
document.addEventListener('touchstart', () => { swallowClick = false; }, { capture: true, passive: true });

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
  if (el.dataset && el.dataset.opt !== undefined && ui.draft && ui.draft.options) ui.draft.options[Number(el.dataset.opt)] = el.value;
  if (el.dataset && el.dataset.obTarget) ui.ob.cfg[el.dataset.obTarget].target = el.value;
  if (el.dataset && el.dataset.setting === 'name') { state.name = el.value.trim(); persist(); }
  if (el.dataset && (el.dataset.checkinNote || el.dataset.checkinRange)) {
    const dr = checkinDraft(ui.day);
    if (el.dataset.checkinNote) dr.values[el.dataset.checkinNote] = el.value.trim() ? el.value : undefined;
    else {
      dr.values[el.dataset.checkinRange] = Number(el.value);
      el.classList.remove('unset');
      const lab = document.querySelector(`[data-val-for="${el.dataset.checkinRange}"]`);
      if (lab) lab.textContent = `${el.value}/10`;
    }
    if (!dr.dirty) { dr.dirty = true; const b = document.querySelector('.ci-save'); if (b) { b.classList.remove('saved'); b.textContent = 'Check-in speichern'; } }
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.action === 'import' && el.files && el.files[0]) importData(el.files[0]);
});

document.addEventListener('submit', (ev) => {
  const form = ev.target;
  ev.preventDefault();
  if (form.dataset.form === 'add-sub') { addSub(); return; }
  if (form.dataset.form === 'add-opt') { if (addOption()) { ui.focus = '#opt-new'; render(); } return; }
  if (form.dataset.form === 'pick-other') {
    const dr = ui.draft, v = (dr.other || '').trim();
    if (!v) return;
    if (!habitById(ui.sheet.id).multi) dr.sel = [v];
    else if (!dr.sel.includes(v)) dr.sel.push(v);
    dr.other = ''; dr.otherOpen = false; render();
    return;
  }
  if (form.dataset.form === 'add-todo') {
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) return;
    const d = ui.day < todayKey() ? todayKey() : ui.day;
    state.todos.push({ id: uid(), title, plannedDay: d, completedAt: null, createdAt: todayKey(), listId: null, order: nextOrder(state.todos), subs: [], rollover: true });
    ui.focus = '#todo-new';
    commit();
    return;
  }
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
  else if (ui.sheet.type === 'q-editor') saveQuestion();
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
  const s = { version: 1, name: 'Matti', setupDone: true, tourDone: true, habits: [], logs: {}, todos: [], lists: [], ...moduleDefaults() };
  const tpls = [...STARTER, findTemplate('Dehnen'), findTemplate('Lesen')];
  tpls.forEach((t, i) => {
    const h = makeHabit(t, i);
    h.createdAt = addDays(today, -30);
    s.habits.push(h);
    for (let o = 1; o <= 30; o++) {
      if ((o + i) % 3 === 0 && o % 4 !== 0) continue;
      s.logs[`${h.id}|${addDays(today, -o)}`] = h.kind === 'check' ? 1 : h.kind === 'count' ? h.target : (o % 2 === 0 ? 70 : 110);
    }
  });
  const vals = scene === 'alldone' ? [10, 3, 75, 10, 10] : [10, 1.5, undefined, 5, undefined];
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
  if (/checkin|progress|habits|routines/.test(scene)) {
    state.checkinQuestions = Q_CATALOG.slice(0, 4).map((q) => ({ id: uid(), ...q }));
    for (let o = 0; o < 20; o++) { const a = {}; state.checkinQuestions.forEach((q, i) => { if (o || i < 2) a[q.id] = 4 + ((o * 3 + i * 5) % 6); }); state.checkins[addDays(today, -o)] = a; }
  }
  if (scene === 'yesterday') ui.day = addDays(today, -1);
  if (scene === 'pool') ui.tab = 'pool';
  if (scene === 'poollist') { ui.tab = 'pool'; ui.poolListId = state.lists[0].id; }
  if (scene === 'surprise') { ui.tab = 'pool'; ui.sheet = { type: 'surprise', id: state.todos[6].id }; }
  if (scene === 'progress') ui.tab = 'progress';
  if (scene === 'habits') ui.tab = 'habits';
  if (scene.startsWith('tour')) { ui.tour = Number(scene.slice(4)) || 0; ui.tab = TOUR[ui.tour][0]; }
  if (scene.startsWith('onboarding')) {
    state.setupDone = false; ui.ob.step = Number(scene.slice(10)) || 0;
    ['Wasser trinken', 'Lesen', 'Journaling'].forEach((n) => actions['ob-habit']({ dataset: { name: n } }));
    ui.ob.cfg.Lesen.freq = 'week';
  }
  if (scene === 'catalog' || scene === 'editor') ui.tab = 'habits';
  if (scene === 'catalog') ui.sheet = { type: 'catalog' };
  if (scene === 'editor') { ui.sheet = { type: 'habit-editor' }; ui.draft = habitDraft(state.habits[1]); }
  if (scene === 'todo') { ui.sheet = { type: 'todo-editor' }; ui.draft = { ...todoDraft(null), title: 'Zahnarzttermin machen', when: 'tomorrow' }; }
  if (scene === 'alldone') ui.lastAllDone[today] = false;
  if (scene === 'settings') { ui.tab = 'progress'; ui.sheet = { type: 'settings' }; }
  if (scene === 'qcatalog') { ui.tab = 'habits'; ui.sheet = { type: 'q-catalog' }; }
  if (scene === 'routinescheckin') { ui.tab = 'habits'; ui.routines = 'checkin'; }
  if (scene === 'checkinhome') ui.tab = 'today';
  if (scene === 'checkin') ui.sheet = { type: 'checkin' };
  if (/^(choice|pick|multipick|choiceedit|choicestats)$/.test(scene)) {
    const sport = { ...makeHabit({ name: 'Sport', icon: '🏃', kind: 'choice' }, 1.5), options: ['Laufen', 'Krafttraining', 'Radfahren', 'Yoga', 'Schwimmen'], perWeek: 3, createdAt: addDays(today, -30) };
    const hip = { ...makeHabit({ name: 'Hüftübungen', icon: '🤸', kind: 'choice' }, 1.6), options: ['Taubenpose', 'Seitheben', 'Hip Flexor Stretch', '90/90 Stretch', 'Brücke', 'Clamshells'], multi: true, minPick: 2, target: 2, createdAt: addDays(today, -30) };
    state.habits.push(sport, hip);
    const put = (h, o, names) => { setPicks(h, addDays(today, -o), names); setValue(h, addDays(today, -o), 1); };
    [[1, ['Laufen']], [2, ['Krafttraining']], [6, ['Radfahren']], [9, ['Yoga']], [12, ['Laufen']], [14, ['Klettern']], [16, ['Krafttraining']]].forEach(([o, n]) => put(sport, o, n));
    [[1, ['Brücke', 'Clamshells']], [3, ['90/90 Stretch', 'Brücke']], [4, ['Hip Flexor Stretch', 'Clamshells']], [5, ['Seitheben', 'Brücke']], [8, ['Taubenpose', 'Clamshells']]].forEach(([o, n]) => put(hip, o, n));
    if (scene === 'pick') { ui.sheet = { type: 'pick', id: sport.id }; ui.draft = { sel: [], other: '', otherOpen: false }; }
    if (scene === 'multipick') { ui.sheet = { type: 'pick', id: hip.id }; ui.draft = { sel: ['Taubenpose'], other: '', otherOpen: false }; }
    if (scene === 'choiceedit') { ui.tab = 'habits'; ui.sheet = { type: 'habit-editor' }; ui.draft = habitDraft(hip); }
    if (scene === 'choicestats') ui.tab = 'progress';
  }
}

/* ---------- Start ---------- */
if (DEMO) applyDemoScene(DEMO);
else if (state.setupDone && !state.tourDone) ui.tour = 0;
render();

// Updates zuverlässig ausliefern: beim Zurückkehren in die App nach einer neuen Version fragen
// und, sobald sie aktiv ist, die Seite einmal neu laden (nicht mitten in einem offenen Fenster).
if (!DEMO && 'serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reg = null;
  let pendingReload = false;
  const tryReload = () => { if (pendingReload && !ui.sheet) { pendingReload = false; location.reload(); } };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) { pendingReload = true; tryReload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => { reg = r; }).catch(() => {}));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (reg) reg.update().catch(() => {});
    tryReload();
  });
  document.addEventListener('click', () => setTimeout(tryReload, 0));
}
if (!DEMO && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
