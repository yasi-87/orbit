'use strict';
/* یک «تیک» از موتور یادآوری:
   ۱) رویدادهای یادآوری‌دار که سررسید شدن رو (با claim اتمیک) به اعلان تبدیل می‌کنه
   ۲) اعلان‌های pushed=false رو با Web Push برای دستگاه‌های ثبت‌شده می‌فرسته */
const Recur = require('../recur.js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://meihvgtulczgxusrdvlr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_q4-KdXKxPB2dK99vzR-D8w_KsPh2u8d';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BLLAxqJFbG3kIwZwUYdM7qJrvaKGMWQ9TwEY17o_wE_USXG5wiPNvf3KUTmPrrcS4VSlF0INcV4mTcqnuq1qULA';
const MAX_AGE = 3 * 24 * 3600 * 1000;   // اعلان‌های قدیمی‌تر از ۳ روز دیگه push نمی‌شن

const same = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

function makeDb(fetchFn) {
  const H = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  const call = async (method, path, body, extra) => {
    const r = await fetchFn(SUPABASE_URL + '/rest/v1/' + path, { method, headers: Object.assign({}, H, extra || {}), body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (!r.ok) { const e = new Error(method + ' ' + path + ' → ' + r.status + ' ' + text.slice(0, 200)); e.status = r.status; throw e; }
    return text ? JSON.parse(text) : null;
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b, { Prefer: 'return=minimal' }),
    patch: (p, b) => call('PATCH', p, b, { Prefer: 'return=representation' }),
    del: (p) => call('DELETE', p, null, { Prefer: 'return=minimal' })
  };
}

async function claimReminders(db, now, log) {
  let events;
  try { events = await db.get('events?select=*&remind=eq.true'); }
  catch (e) { log('events: ' + e.message); return 0; }
  let fired = 0;
  for (const ev of events || []) {
    const since = Math.max(Number(ev.last_fired) || 0, Number(ev.created_at) || 0);
    const due = Recur.latestDue(ev, now, since);
    if (!due) continue;
    const cond = ev.last_fired == null ? 'last_fired=is.null' : 'last_fired=eq.' + ev.last_fired;
    let rows;
    try { rows = await db.patch('events?id=eq.' + encodeURIComponent(ev.id) + '&' + cond, { last_fired: due.ts }); }
    catch (e) { log('claim: ' + e.message); continue; }
    if (!rows || !rows.length) continue;     // یه دستگاه دیگه زودتر اعلامش کرد
    await db.post('notifications', {
      id: 'nf_' + now + '_' + Math.random().toString(36).slice(2, 7),
      type: 'reminder', title: String(ev.title || '').slice(0, 80), author: '⏰',
      ref_id: Recur.epochToWall(due.ts).iso, target: ev.audience === 'me' ? ev.author : null,
      pushed: false, created_at: now
    });
    fired++;
  }
  return fired;
}

function payloadFor(n) {
  const l = Recur.notifLine(n);
  const body = n.type === 'reminder' ? '⏰ ' + (n.title || '') : l.icon + ' ' + l.line + (n.title ? ': ' + n.title : '');
  return JSON.stringify({ title: 'Our Memories 💜', body, tag: n.id, url: './?n=' + encodeURIComponent(n.id) });
}

async function pushPending(db, webpush, now, log) {
  let notifs, subs;
  try {
    notifs = await db.get('notifications?select=*&pushed=eq.false&order=created_at.asc&limit=100');
    subs = await db.get('push_subscriptions?select=*');
  } catch (e) { log('push fetch: ' + e.message); return { sent: 0, dropped: 0 }; }
  let sent = 0, dropped = 0;
  for (const n of notifs || []) {
    if (now - Number(n.created_at) <= MAX_AGE) {
      const targets = (subs || []).filter(s => !same(s.name, n.author) && (!n.target || same(s.name, n.target)));
      for (const s of targets) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payloadFor(n), { TTL: 6 * 3600 });
          sent++;
        } catch (e) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) {
            dropped++;
            try { await db.del('push_subscriptions?endpoint=eq.' + encodeURIComponent(s.endpoint)); } catch (_) {}
          } else log('send: ' + (e && (e.statusCode || e.message)));
        }
      }
    }
    try { await db.patch('notifications?id=eq.' + encodeURIComponent(n.id) + '&pushed=eq.false', { pushed: true }); }
    catch (e) { log('mark: ' + e.message); }
  }
  return { sent, dropped };
}

async function run(opts) {
  opts = opts || {};
  const log = opts.log || (m => console.log(m));
  const now = opts.now || Date.now();
  const db = opts.db || makeDb(opts.fetch || fetch);
  const fired = await claimReminders(db, now, log);
  let res = { sent: 0, dropped: 0 };
  let webpush = opts.webpush;
  if (!webpush) {
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!priv) { log('VAPID_PRIVATE_KEY تنظیم نشده؛ فقط یادآوری‌ها ساخته شدن، push ارسال نمی‌شه.'); return { fired, sent: 0, dropped: 0, skipped: true }; }
    webpush = require('web-push');
    webpush.setVapidDetails('mailto:noreply@example.com', VAPID_PUBLIC, priv);
  }
  res = await pushPending(db, webpush, now, log);
  log(`reminders fired: ${fired}, push sent: ${res.sent}, dead subscriptions removed: ${res.dropped}`);
  return Object.assign({ fired }, res);
}

module.exports = { run, makeDb, claimReminders, pushPending, payloadFor };
if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
