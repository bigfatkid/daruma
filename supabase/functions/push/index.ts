// Daruma – Edge Function „push“ (Stufe 2b)
// Verschickt Push-Mitteilungen an die Daruma-App auf dem Home-Bildschirm.
// Ganz ohne Zusatz-Bibliotheken: Verschlüsselung (RFC 8291) und Unterschrift (VAPID, RFC 8292)
// laufen über die eingebaute WebCrypto.
//
// Aufrufe (POST, JSON):
//   { action: "key" }   -> öffentlicher Schlüssel für die App (wird beim ersten Mal erzeugt)
//   { action: "register", endpoint, keys } -> Gerät für die angemeldete Person eintragen
//   { action: "test" }  -> schickt eine Testnachricht an alle Geräte der angemeldeten Person
//   { action: "tick" }  -> (alle 5 Minuten per pg_cron) schickt fällige Abend-Erinnerungen.
//                          Abend: nur wenn noch etwas offen ist, höchstens einmal pro Tag und Gerät.
//                          Pro Habit: zur eingestellten Uhrzeit, wenn das Habit noch nicht abgehakt ist.

const SB_URL = Deno.env.get('SUPABASE_URL');
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CONTACT = 'https://daruma-app.github.io';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/* ---------- Hilfsfunktionen ---------- */
const enc = new TextEncoder();
function b64u(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

/* ---------- Datenbank (mit dem Server-Schlüssel, nur hier im Server) ---------- */
async function db(path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function userFrom(req) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_SERVICE, Authorization: auth } });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}

/* ---------- VAPID-Schlüssel ---------- */
let keyCache = null;
async function vapidKeys() {
  if (keyCache) return keyCache;
  let rows = await db('push_keys?id=eq.1&select=public_key,private_jwk');
  if (!rows.length) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const pub = b64u(await crypto.subtle.exportKey('raw', pair.publicKey));
    // Gleichzeitige Aufrufe: nur der erste Schlüssel gewinnt
    await db('push_keys?on_conflict=id', { method: 'POST', body: { id: 1, public_key: pub, private_jwk: jwk }, prefer: 'resolution=ignore-duplicates' });
    rows = await db('push_keys?id=eq.1&select=public_key,private_jwk');
  }
  const { public_key, private_jwk } = rows[0];
  const privateKey = await crypto.subtle.importKey('jwk', private_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  keyCache = { publicKey: public_key, privateKey };
  return keyCache;
}

async function vapidAuth(endpoint, keys) {
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })));
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, enc.encode(unsigned));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${keys.publicKey}`;
}

/* ---------- Verschlüsselung (aes128gcm, RFC 8291) ---------- */
async function encryptPayload(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const authSecret = unb64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(enc.encode(payload), new Uint8Array([2]))));
  const head = new Uint8Array(21);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPublic.length;
  return concat(head, asPublic, cipher);
}

// Eine Mitteilung an ein Gerät. Antwort: HTTP-Status vom Apple/Google/Mozilla-Dienst.
async function sendPush(sub, message, ttl = 6 * 3600) {
  const keys = await vapidKeys();
  const body = await encryptPayload(sub, JSON.stringify(message));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, keys),
      TTL: String(ttl),
      Urgency: 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
    },
    body,
  });
  const text = await res.text().catch(() => '');
  // 404/410: Gerät hat die Erlaubnis zurückgezogen oder die App gelöscht
  if (res.status === 404 || res.status === 410) {
    await db(`push_subs?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
  }
  return { status: res.status, info: text.slice(0, 200) };
}

/* ---------- Abend-Erinnerung ---------- */
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Texte „ermutigend“ (Matti, 24.11.), gestaffelt nach Anzahl
function reminderText(day) {
  const h = day.h || [], t = day.t || [];
  const hn = day.hn ?? h.length, tn = day.tn ?? t.length, n = hn + tn;
  if (n === 1) return { title: 'Ein Schritt fehlt noch', body: `${h[0] || t[0]}, dann ist der Tag komplett.` };
  if (n <= 3) {
    const parts = hn ? [...h.slice(0, hn), ...(tn ? [plural(tn, 'To-Do', 'To-Dos')] : [])] : t.slice(0, tn);
    return { title: 'Fast geschafft', body: `Nur noch ${list(parts)}. Kleine Schritte, jeden Tag.` };
  }
  const counts = list([hn ? plural(hn, 'Habit', 'Habits') : '', tn ? plural(tn, 'To-Do', 'To-Dos') : ''].filter(Boolean));
  const names = [...h, ...t].slice(0, 3);
  return { title: 'Noch ist Zeit', body: `${counts} offen: ${names.join(', ')} und ${n - names.length} weitere. Fang einfach mit einem an.` };
}

function localNow(tz) {
  let parts;
  try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); }
  catch (e) { return localNow('Europe/Berlin'); }
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

async function tick() {
  const subs = await db('push_subs?select=endpoint,keys,settings,last_sent&settings->>on=eq.true');
  let sent = 0;
  for (const s of subs) {
    const st = s.settings || {};
    const now = localNow(st.tz || 'Europe/Berlin');
    const day = st.days && st.days[now.date];
    const send = async (msg, ttl) => { const r = await sendPush(s, msg, ttl); if (r.status >= 200 && r.status < 300) sent++; return r.status; };
    const minOf = (t) => { const [hh, mm] = String(t).split(':').map(Number); return hh * 60 + mm; };

    // Erinnerung pro Habit: genau im 5-Minuten-Fenster ab der Uhrzeit (der Zeitplan läuft alle 5 Minuten)
    let gone = false;
    for (const r of (day && day.r) || []) {
      const late = now.minutes - minOf(r.at);
      if (late < 0 || late >= 5) continue;
      const status = await send({ title: r.n, body: 'Jetzt ist ein guter Moment dafür.', tag: `habit-${r.n}` }, 3600);
      if (status === 404 || status === 410) { gone = true; break; }
    }
    if (gone) continue;

    // Abend-Erinnerung: höchstens einmal pro Tag
    if (st.evening === false || s.last_sent === now.date) continue;
    const late = now.minutes - minOf(st.time || '19:00');
    if (late < 0 || late > 180) continue; // noch nicht Zeit, oder schon zu spät (z. B. Server war aus)
    const open = day ? (day.hn ?? (day.h || []).length) + (day.tn ?? (day.t || []).length) : 0;
    if (open > 0) {
      const status = await send({ ...reminderText(day), tag: 'abend' }, 3 * 3600);
      if (status === 404 || status === 410) continue;
    }
    await db(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'PATCH', body: { last_sent: now.date }, prefer: 'return=minimal' });
  }
  return { checked: subs.length, sent };
}

/* ---------- Aufrufe ---------- */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    // Der Zeitplan (pg_cron) braucht kein Konto: er verschickt nur, was ohnehin fällig ist
    if (action === 'tick') return json(await tick());
    const user = await userFrom(req);
    if (!user) return json({ error: 'Nicht angemeldet' }, 401);

    if (action === 'key') return json({ key: (await vapidKeys()).publicKey });

    // Gerät eintragen (oder auf das aktuelle Konto umziehen, z. B. nach neuem Gast-Konto)
    if (action === 'register') {
      const { endpoint, keys } = body;
      if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || !keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return json({ error: 'Ungültig' }, 400);
      await db('push_subs?on_conflict=endpoint', { method: 'POST', body: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, user_id: user.id, updated_at: new Date().toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
      return json({ ok: true });
    }

    if (action === 'test') {
      const subs = await db(`push_subs?user_id=eq.${user.id}&select=endpoint,keys`);
      if (!subs.length) return json({ error: 'Kein Gerät eingetragen' }, 404);
      const results = [];
      for (const s of subs) {
        results.push({ host: new URL(s.endpoint).host, ...(await sendPush(s, { title: 'Daruma', body: 'Testnachricht: Mitteilungen funktionieren. 🎉', tag: 'test' })) });
      }
      return json({ results });
    }

    return json({ error: 'Unbekannte Aktion' }, 400);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
});
