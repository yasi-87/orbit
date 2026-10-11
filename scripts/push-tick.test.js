'use strict';
const assert = require('assert');
const { run } = require('./push-tick.js');
const T = { events: [], notifications: [], push_subscriptions: [] };

function parse(path) {
  const [table, qs = ''] = path.split('?');
  const f = [];
  for (const part of qs.split('&').filter(Boolean)) {
    const [k, v] = part.split('=');
    if (['select', 'order', 'limit'].includes(k)) continue;
    const [op, ...rest] = v.split('.'); const val = decodeURIComponent(rest.join('.'));
    f.push(r => op === 'is' ? r[k] == null : op === 'eq' ? String(r[k]) === val : true);
  }
  return { table, f };
}
const db = {
  async get(p) { const { table, f } = parse(p); return T[table].filter(r => f.every(x => x(r))).map(r => ({ ...r })); },
  async post(p, b) { T[p].push({ ...b }); },
  async patch(p, b) { const { table, f } = parse(p); const m = T[table].filter(r => f.every(x => x(r))); m.forEach(r => Object.assign(r, b)); return m.map(r => ({ ...r })); },
  async del(p) { const { table, f } = parse(p); T[table] = T[table].filter(r => !f.every(x => x(r))); }
};
const sent = [];
const webpush = { async sendNotification(sub, payload) { if (sub.endpoint === 'dead') { const e = new Error('gone'); e.statusCode = 410; throw e; } sent.push({ ep: sub.endpoint, p: JSON.parse(payload) }); } };
const log = () => {};

(async () => {
  const now = Date.UTC(2026, 9, 11, 12, 0, 0);
  T.push_subscriptions.push(
    { endpoint: 'a', p256dh: 'x', auth: 'y', name: 'یاسنا' },
    { endpoint: 'b', p256dh: 'x', auth: 'y', name: 'ارشیا' },
    { endpoint: 'dead', p256dh: 'x', auth: 'y', name: 'ارشیا' });
  // یادآوری هر ۶ ساعت که ۱۳ ساعت پیش شروع شده
  T.events.push({ id: 'e1', title: 'کرم', remind: true, repeat: 'hours', repeat_every: 6, audience: 'both', author: 'یاسنا',
    start_at: now - 13 * 3600e3, created_at: now - 13 * 3600e3, last_fired: now - 13 * 3600e3, event_date: '2026-10-10' });
  // یادآوری فقط برای خودم (ارشیا)
  T.events.push({ id: 'e2', title: 'قرص', remind: true, repeat: 'hours', repeat_every: 6, audience: 'me', author: 'ارشیا',
    start_at: now - 7 * 3600e3, created_at: now - 7 * 3600e3, last_fired: now - 7 * 3600e3, event_date: '2026-10-10' });
  // اعلان عادی از یاسنا
  T.notifications.push({ id: 'n1', type: 'comment', title: 'سلام', author: 'یاسنا', pushed: false, created_at: now - 1000 });
  // اعلان خیلی قدیمی
  T.notifications.push({ id: 'old', type: 'song', title: 'x', author: 'یاسنا', pushed: false, created_at: now - 5 * 24 * 3600e3 });

  let r = await run({ db, webpush, now, log });
  assert.strictEqual(r.fired, 2, 'دو یادآوری باید ساخته بشه');
  const rem = T.notifications.filter(n => n.type === 'reminder');
  assert.strictEqual(rem.length, 2);
  assert.ok(T.notifications.every(n => n.pushed === true), 'همه علامت pushed خوردن');
  const toB = sent.filter(s => s.ep === 'b').map(s => s.p.tag);
  const toA = sent.filter(s => s.ep === 'a').map(s => s.p.tag);
  assert.ok(toB.includes('n1'), 'کامنت یاسنا به ارشیا می‌رسه');
  assert.ok(!toA.includes('n1'), 'کامنت به نویسنده‌اش نمی‌رسه');
  assert.ok(!sent.some(s => s.p.tag === 'old'), 'اعلان قدیمی push نمی‌شه');
  const meRem = rem.find(n => n.title === 'قرص');
  assert.strictEqual(meRem.target, 'ارشیا');
  assert.ok(sent.some(s => s.ep === 'b' && s.p.tag === meRem.id), 'یادآوری «فقط من» به ارشیا می‌رسه');
  assert.ok(!sent.some(s => s.ep === 'a' && s.p.tag === meRem.id), '…و به یاسنا نمی‌رسه');
  assert.ok(sent.some(s => s.ep === 'a' && s.p.body.includes('کرم')), 'یادآوری مشترک به یاسنا هم می‌رسه');
  assert.ok(!T.push_subscriptions.some(s => s.endpoint === 'dead'), 'اشتراک مرده پاک شد');
  // تیک دوم بدون تغییر: تکراری نه
  const before = T.notifications.length, sentBefore = sent.length;
  r = await run({ db, webpush, now: now + 60e3, log });
  assert.strictEqual(r.fired, 0); assert.strictEqual(T.notifications.length, before); assert.strictEqual(sent.length, sentBefore);
  // ۶ ساعت بعد: دوباره
  r = await run({ db, webpush, now: now + 6 * 3600e3 + 60e3, log });
  assert.strictEqual(r.fired >= 1, true, 'بعد از ۶ ساعت دوباره یادآوری می‌شه');
  // رویداد سالانه: تولد ۱۷ اردیبهشت
  console.log('push-tick tests: ALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
