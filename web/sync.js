'use strict';

/* =====================================================================
   Daruma – Sync mit Supabase (Stufe 2)
   - Beim ersten Start legt die App still ein Gast-Konto an (Supabase
     „anonymous sign-in“), damit von Anfang an alles online gesichert ist.
     Mit „Konto sichern“ kommen E-Mail und Passwort dazu, dann geht es
     auch auf dem Mac oder einem neuen Handy.
   - Anmeldung mit E-Mail und Passwort, ganz ohne Mails (ein Login-Link
     würde auf dem iPhone Safari öffnen statt der App vom Home-Bildschirm,
     und die Mail-Vorlagen sind im Gratis-Plan gesperrt).
   - Pro Person eine Zeile in public.daruma_state, geschützt durch
     Row Level Security: jede Person sieht nur ihre eigenen Daten.
   - Die Kopie auf dem Gerät bleibt immer die Grundlage. Ohne Netz läuft
     alles normal weiter, abgeglichen wird, sobald Supabase erreichbar ist.
   - Haben zwei Geräte gleichzeitig etwas geändert, werden die Änderungen
     zusammengeführt (Vergleich mit dem Stand beim letzten Abgleich).
   ===================================================================== */

const SB_URL = 'https://exzvyipaoeqymohagwuc.supabase.co';
const SB_KEY = 'sb_publishable_bs1sy66zB5bUXn4LN2w_8g_rllMcIIJ'; // öffentlicher Schlüssel, darf in der App stehen
const SYNC_META_KEY = 'daruma.sync';     // Anmeldung + Stand des letzten Abgleichs
const SYNC_BASE_KEY = 'daruma.syncBase'; // Daten beim letzten Abgleich (Grundlage fürs Zusammenführen)
const SB_TIMEOUT = 15000;

const Sync = {
  // Von app.js gesetzt: getState(), adopt(data) -> übernommener Stand, busy(), onStatus()
  hooks: {},
  meta: null,
  status: 'off', // off | ok | syncing | offline | paused | relogin
  lastError: null,
  running: false,
  again: false,
  timer: null,
  applying: false,

  /* ---------- Gespeicherter Zustand ---------- */
  loadMeta() {
    try { this.meta = JSON.parse(localStorage.getItem(SYNC_META_KEY) || 'null'); } catch (e) { this.meta = null; }
    if (this.meta && typeof this.meta !== 'object') this.meta = null;
    this.status = this.loggedIn() ? (this.meta.refresh ? 'ok' : 'relogin') : 'off';
  },
  saveMeta() {
    try { if (this.meta) localStorage.setItem(SYNC_META_KEY, JSON.stringify(this.meta)); else localStorage.removeItem(SYNC_META_KEY); } catch (e) { /* egal */ }
  },
  loadBase() {
    try { const raw = localStorage.getItem(SYNC_BASE_KEY); return raw ? JSON.parse(raw) : undefined; } catch (e) { return undefined; }
  },
  saveBase(data) {
    try { localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(data)); } catch (e) { /* egal */ }
  },
  loggedIn() { return !!(this.meta && this.meta.userId); },
  isGuest() { return this.loggedIn() && !!this.meta.anon; },
  linked() { return this.loggedIn() && !!this.meta.linked && !!this.meta.refresh; },

  setStatus(s, err = null) {
    const changed = s !== this.status;
    this.status = s; this.lastError = err;
    if (s === 'ok') { this.meta.lastSync = Date.now(); this.meta.failSince = null; this.saveMeta(); }
    if ((s === 'paused' || s === 'offline') && this.meta && !this.meta.failSince) { this.meta.failSince = Date.now(); this.saveMeta(); }
    if (this.hooks.onStatus) this.hooks.onStatus(changed);
  },

  /* ---------- Netzwerk ---------- */
  async call(path, { method = 'GET', body, auth = true, prefer } = {}) {
    const headers = { apikey: SB_KEY, 'Content-Type': 'application/json' };
    if (auth) {
      await this.ensureToken();
      headers.Authorization = `Bearer ${this.meta.access}`;
    }
    if (prefer) headers.Prefer = prefer;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), SB_TIMEOUT);
    let res;
    try {
      res = await fetch(SB_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal, cache: 'no-store' });
    } catch (e) {
      throw Object.assign(new Error('Netz'), { net: true });
    } finally { clearTimeout(t); }
    let data = null;
    const text = await res.text().catch(() => '');
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) throw Object.assign(new Error((data && (data.msg || data.message || data.error_description || data.error)) || `Fehler ${res.status}`), { status: res.status, data });
    return data;
  },
  async ensureToken(force = false) {
    const m = this.meta;
    if (!m || !m.refresh) throw Object.assign(new Error('Nicht angemeldet'), { relogin: true });
    if (!force && m.access && m.expiresAt && m.expiresAt - 90 > Date.now() / 1000) return;
    let s;
    try {
      s = await this.call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: m.refresh }, auth: false });
    } catch (e) {
      if (e.status && e.status >= 400 && e.status < 500) { m.access = null; m.refresh = null; this.saveMeta(); throw Object.assign(e, { relogin: true }); }
      throw e;
    }
    this.takeSession(s);
  },
  takeSession(s) {
    this.meta = {
      ...(this.meta || {}),
      access: s.access_token,
      refresh: s.refresh_token,
      expiresAt: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
      userId: (s.user && s.user.id) || (this.meta && this.meta.userId),
      email: (s.user && s.user.email) || (this.meta && this.meta.email),
      anon: s.user ? !!s.user.is_anonymous : !!(this.meta && this.meta.anon),
      since: (this.meta && this.meta.since) || Date.now(),
    };
    this.saveMeta();
  },

  /* ---------- Anmeldung ---------- */
  // isNew: neues Konto anlegen, sonst anmelden. true zurück = dieses Gerät war schon mit dem Konto verbunden
  async signIn(email, password, isNew) {
    const s = isNew
      ? await this.call('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false })
      : await this.call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
    if (!s || !s.access_token) throw Object.assign(new Error('confirm'), { confirm: true }); // Bestätigungsmail ist noch eingeschaltet
    const sameUser = this.meta && this.meta.userId && s.user && this.meta.userId === s.user.id;
    if (!sameUser) { this.meta = null; try { localStorage.removeItem(SYNC_BASE_KEY); } catch (e) { /* egal */ } }
    this.takeSession(s);
    this.setStatus('ok');
    return sameUser && this.meta.linked;
  },
  // Gast-Konto im Hintergrund (braucht „Allow anonymous sign-ins“ in Supabase)
  async guest() {
    const s = await this.call('/auth/v1/signup', { method: 'POST', body: {}, auth: false });
    if (!s || !s.access_token) throw new Error('Kein Gast-Konto');
    this.meta = null;
    try { localStorage.removeItem(SYNC_BASE_KEY); } catch (e) { /* egal */ }
    this.takeSession(s);
  },
  // Gast-Konto sichern: E-Mail und Passwort nachtragen. Daten und Konto bleiben dieselben.
  async secure(email, password) {
    const u = await this.call('/auth/v1/user', { method: 'PUT', body: { email, password } });
    if (u && u.new_email && u.email !== email) throw Object.assign(new Error('pending'), { pending: true }); // Bestätigungsmail ist noch an
    this.meta.email = email; this.meta.anon = false; this.saveMeta();
    await this.ensureToken(true).catch(() => {});
    this.meta.anon = false; this.saveMeta();
  },
  // Vor dem Abmelden: alles hochladen. true = Konto hat den Stand dieses Geräts
  async flush() {
    if (!this.linked()) return false;
    for (let i = 0; i < 50 && this.running; i++) await new Promise((r) => setTimeout(r, 200));
    clearTimeout(this.timer);
    await this.run();
    for (let i = 0; i < 50 && this.running; i++) await new Promise((r) => setTimeout(r, 200));
    return this.status === 'ok' && JSON.stringify(this.hooks.getState()) === JSON.stringify(this.loadBase());
  },
  async logout() {
    const m = this.meta;
    if (m && m.access) fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${m.access}` } }).catch(() => {});
    this.meta = null; this.saveMeta();
    try { localStorage.removeItem(SYNC_BASE_KEY); } catch (e) { /* egal */ }
    this.setStatus('off');
  },

  /* ---------- Daten ---------- */
  async fetchRemote() {
    const rows = await this.call('/rest/v1/daruma_state?select=data,rev,updated_at');
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  async insert(data) {
    const rows = await this.call('/rest/v1/daruma_state', { method: 'POST', body: { data, rev: 1, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    return rows && rows[0];
  },
  // Nur speichern, wenn in der Zwischenzeit kein anderes Gerät etwas geändert hat (rev passt)
  async update(data, rev) {
    const rows = await this.call(`/rest/v1/daruma_state?user_id=eq.${encodeURIComponent(this.meta.userId)}&rev=eq.${rev}`, { method: 'PATCH', body: { data, rev: rev + 1, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  // Erste Verbindung dieses Geräts: Daten hochladen (remote leer) oder entscheiden, was gilt
  async link(choice) {
    const local = this.hooks.getState();
    if (choice === 'upload') {
      const remote = await this.fetchRemote();
      const row = remote ? await this.update(local, remote.rev) : await this.insert(local);
      if (!row) throw new Error('Konflikt');
      this.meta.rev = row.rev; this.saveBase(local);
    } else if (choice === 'download') {
      const remote = await this.fetchRemote();
      if (!remote) throw new Error('Keine Daten im Konto');
      const adopted = this.adopt(remote.data);
      this.meta.rev = remote.rev; this.saveBase(adopted);
    } else { // 'later': noch nichts im Konto, nichts Lokales – hochladen, sobald eingerichtet
      this.meta.rev = 0;
    }
    this.meta.linked = true; this.saveMeta();
    this.setStatus('ok');
  },
  adopt(data) {
    this.applying = true;
    try { return this.hooks.adopt(data); } finally { this.applying = false; }
  },

  /* ---------- Abgleich ---------- */
  changed() {
    if (this.applying || !(this.linked() || !this.loggedIn())) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), 2000);
  },
  async run() {
    if ((!this.loggedIn() || (this.isGuest() && !this.meta.linked)) && this.hooks.autoGuest) return this.hooks.autoGuest();
    if (!this.linked()) return;
    if (this.running) { this.again = true; return; }
    if (!navigator.onLine) { this.setStatus('offline'); return; }
    this.running = true;
    if (this.status !== 'ok') this.setStatus('syncing');
    try {
      let r = false;
      for (let i = 0; i < 4 && !r; i++) r = await this.once();
      if (r === 'busy') setTimeout(() => this.run(), 5000); // gerade wird getippt: gleich noch mal
      this.setStatus('ok');
    } catch (e) {
      if (e.relogin) this.setStatus('relogin', e.message);
      else if (e.net || e.status >= 500) this.setStatus(navigator.onLine ? 'paused' : 'offline', e.message);
      else this.setStatus('paused', e.message);
      console.warn('Sync', e);
    } finally {
      this.running = false;
      if (this.again) { this.again = false; setTimeout(() => this.run(), 300); }
    }
  },
  // Ein Durchgang. true = fertig, false = jemand war schneller, noch mal versuchen
  async once() {
    const local = this.hooks.getState();
    if (!local.setupDone) return true; // Einrichtung läuft noch: erst danach hochladen
    const remote = await this.fetchRemote();
    const base = this.loadBase();
    const localChanged = base === undefined || JSON.stringify(local) !== JSON.stringify(base);
    if (!remote) { // noch nichts im Konto (oder dort gelöscht): unseren Stand hochladen
      const row = await this.insert(local).catch((e) => { if (e.status === 409) return null; throw e; });
      if (!row) return false;
      this.meta.rev = row.rev; this.saveMeta(); this.saveBase(local);
      return true;
    }
    if (remote.rev === this.meta.rev) {
      if (!localChanged) return true;
      const row = await this.update(local, remote.rev);
      if (!row) return false;
      this.meta.rev = row.rev; this.saveMeta(); this.saveBase(local);
      return true;
    }
    // Ein anderes Gerät hat etwas geändert
    if (this.hooks.busy && this.hooks.busy()) return 'busy'; // nicht mitten im Tippen umbauen
    const merged = localChanged ? merge3(base, local, remote.data) : remote.data;
    const adopted = this.adopt(merged);
    if (JSON.stringify(adopted) === JSON.stringify(remote.data)) {
      this.meta.rev = remote.rev; this.saveMeta(); this.saveBase(adopted);
      return true;
    }
    const row = await this.update(adopted, remote.rev);
    if (!row) return false;
    this.meta.rev = row.rev; this.saveMeta(); this.saveBase(adopted);
    return true;
  },
};

// Drei-Wege-Zusammenführen: was nur ein Gerät geändert hat, gewinnt.
// Haben beide dieselbe Sache geändert, gewinnt dieses Gerät.
// Listen mit ids (Habits, To-Dos, Projekte, Fragen) werden Eintrag für Eintrag zusammengeführt.
function merge3(base, local, remote) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const plain = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const idList = (a) => Array.isArray(a) && a.every((x) => plain(x) && x.id != null);
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  if (idList(local) && idList(remote) && (base === undefined || idList(base))) {
    const b = new Map((base || []).map((x) => [x.id, x]));
    const l = new Map(local.map((x) => [x.id, x]));
    const r = new Map(remote.map((x) => [x.id, x]));
    const out = [];
    for (const x of local) {
      if (r.has(x.id)) out.push(merge3(b.get(x.id), x, r.get(x.id)));
      else if (!b.has(x.id)) out.push(x); // hier neu angelegt
      // sonst: auf dem anderen Gerät gelöscht
    }
    for (const x of remote) if (!l.has(x.id) && !b.has(x.id)) out.push(x); // dort neu angelegt
    return out;
  }
  if (plain(local) && plain(remote) && (base === undefined || plain(base))) {
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(base ? base[k] : undefined, local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local;
}

Sync.loadMeta();
