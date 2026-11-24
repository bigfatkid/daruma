'use strict';

/* =====================================================================
   Daruma – Push-Mitteilungen (Stufe 2b)
   - Geht auf dem iPhone nur in der App vom Home-Bildschirm (ab iOS 16.4).
   - Die App fragt um Erlaubnis, bekommt vom iPhone eine „Adresse“ und
     speichert sie in Supabase (Tabelle push_subs, nur eigene Zeilen).
   - Verschickt wird von der Supabase Edge Function „push“.
   ===================================================================== */

const PUSH_KEY_CACHE = 'daruma.pushKey';
const PUSH_ENDPOINT = 'daruma.pushEndpoint'; // Adresse dieses Geräts (zum Abmelden)

const Push = {
  supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
  standalone() { return !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); },
  permission() { return 'Notification' in window ? Notification.permission : 'unsupported'; },

  async fn(action, extra = {}) { return Sync.call('/functions/v1/push', { method: 'POST', body: { action, ...extra } }); },

  cachedKey() { try { return localStorage.getItem(PUSH_KEY_CACHE) || ''; } catch (e) { return ''; } },
  // Vorab holen, damit der Tipp auf den Knopf direkt die iPhone-Frage zeigen kann
  async prefetchKey() {
    if (this.cachedKey() || !Sync.loggedIn()) return;
    try { const r = await this.fn('key'); if (r && r.key) localStorage.setItem(PUSH_KEY_CACHE, r.key); } catch (e) { /* später erneut */ }
  },

  // Muss direkt aus einem Tipp heraus aufgerufen werden (iPhone-Regel)
  async enable() {
    if (!this.supported()) throw Object.assign(new Error('Nur in der App vom Home-Bildschirm'), { code: 'unsupported' });
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw Object.assign(new Error('Mitteilungen nicht erlaubt'), { code: 'denied' });
    const reg = await navigator.serviceWorker.ready;
    let key = this.cachedKey();
    if (!key) { const r = await this.fn('key'); key = r.key; try { localStorage.setItem(PUSH_KEY_CACHE, key); } catch (e) { /* egal */ } }
    const appKey = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey) {
      const old = new Uint8Array(sub.options.applicationServerKey);
      if (old.length !== appKey.length || old.some((b, i) => b !== appKey[i])) { await sub.unsubscribe(); sub = null; }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
    const j = sub.toJSON();
    try { localStorage.setItem(PUSH_ENDPOINT, j.endpoint); } catch (e) { /* egal */ }
    // Über den Server eintragen: so zieht ein Gerät auch zu einem neuen Konto um
    // (z. B. neues Gast-Konto), was die Tabellenregeln direkt nicht erlauben würden.
    try { await this.fn('register', { endpoint: j.endpoint, keys: j.keys }); }
    catch (e) {
      if (e.status !== 400) throw e; // ältere Server-Version ohne „register“: direkt eintragen
      await Sync.call('/rest/v1/push_subs?on_conflict=endpoint', { method: 'POST', body: { endpoint: j.endpoint, keys: j.keys, user_id: Sync.meta.userId }, prefer: 'resolution=merge-duplicates,return=minimal' });
    }
    this.lastPlan = null;
    try { localStorage.setItem('daruma.pushUser', Sync.meta.userId); } catch (e) { /* egal */ }
    return sub;
  },

  async test() { return this.fn('test'); },

  // Abend-Erinnerung: Einstellung + was an den nächsten Tagen offen ist, an alle Geräte des Kontos.
  // Der Server schaut alle paar Minuten, ob es Zeit ist, und nimmt dann den Eintrag für heute.
  async plan() {
    if (typeof state === 'undefined' || !Sync.loggedIn()) return;
    const r = state.reminder || {};
    const perHabit = state.habits.some((h) => h.remind);
    const settings = r.on || perHabit
      ? { on: true, evening: !!r.on, time: r.time, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin', days: reminderPlan() }
      : { on: false };
    // Konto gewechselt (z. B. neues Gast-Konto): dieses Gerät erst beim neuen Konto eintragen
    let regUser = '';
    try { regUser = localStorage.getItem('daruma.pushUser') || ''; } catch (e) { /* egal */ }
    if (settings.on && regUser !== Sync.meta.userId && this.supported() && this.permission() === 'granted') {
      try { await this.enable(); } catch (e) { /* nächstes Mal */ }
    }
    const sig = JSON.stringify(settings);
    if (sig === this.lastPlan) return;
    try {
      await Sync.call(`/rest/v1/push_subs?user_id=eq.${Sync.meta.userId}`, { method: 'PATCH', body: { settings, updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
      this.lastPlan = sig;
    } catch (e) { /* nächstes Mal */ }
  },
  planSoon() { clearTimeout(this.planTimer); this.planTimer = setTimeout(() => this.plan(), 3000); },

  // Beim Start: ist die Erinnerung an und erlaubt, Adresse auffrischen (falls das iPhone eine neue vergeben hat)
  async refresh() {
    if (typeof state === 'undefined' || !((state.reminder && state.reminder.on) || state.habits.some((h) => h.remind)) || !this.supported() || this.permission() !== 'granted' || !Sync.loggedIn()) { this.planSoon(); return; }
    try { await this.enable(); } catch (e) { /* später */ }
    this.lastPlan = null;
    this.plan();
  },

  // Abmelden: dieses Gerät bekommt keine Erinnerungen mehr für das alte Konto
  async forget() {
    let ep = '';
    try { ep = localStorage.getItem(PUSH_ENDPOINT) || ''; } catch (e) { /* egal */ }
    if (!ep || !Sync.loggedIn()) return;
    try { await Sync.call(`/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(ep)}`, { method: 'DELETE', prefer: 'return=minimal' }); } catch (e) { /* egal */ }
  },
};
