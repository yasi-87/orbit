// Service worker کوچیک: دریافت اعلان پس‌زمینه (Web Push) و باز کردن سایت با کلیک روی اعلان.
// فقط فایل‌های صوتی (آهنگ‌های پلی‌لیست و صداهای گربه) رو برای بار بعد توی کش مرورگر نگه می‌داره؛ بقیهٔ سایت کش نمی‌شه و آپدیت‌ها همیشه فوری میان.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    // اگه سایت همین الان جلوی چشم کاربره، خودِ سایت اعلان رو نشون می‌ده؛ تکراری نشون نمی‌دیم
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await self.registration.showNotification(d.title || 'Our Memories 💜', {
      body: d.body || 'یه چیز جدید هست',
      tag: d.tag || 'om',
      icon: './icon-192.png',
      badge: './icons8-star-48.png',
      dir: 'rtl', lang: 'fa',
      data: { url: d.url || './' },
      requireInteraction: !!d.alarm, renotify: !!d.alarm,
      vibrate: d.alarm ? [400, 200, 400, 200, 800, 300, 800] : undefined
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.postMessage({ type: 'open-notifs' }); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});


/* ---------- 🎵 کش آهنگ‌ها: بار اول که پخش بشه کامل ذخیره می‌شه و دفعه‌های بعد بدون دانلود (حتی آفلاین) پخش می‌شه ---------- */
const AUDIO_CACHE = 'om-audio-v1', MAX_AUDIO_FILES = 80, MAX_AUDIO_BYTES = 150 * 1024 * 1024, filling = new Set();
const keyOf = u => String(u).split('#')[0];

async function sliceRange(res, range) {
  const blob = await res.blob(), size = blob.size, m = /bytes=(\d*)-(\d*)/.exec(range || '');
  let s = 0, e = size - 1;
  if (m) { if (m[1]) { s = +m[1]; if (m[2]) e = +m[2]; } else if (m[2]) s = Math.max(0, size - +m[2]); }
  e = Math.min(e, size - 1);
  if (s > e) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(blob.slice(s, e + 1), { status: 206, headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + s + '-' + e + '/' + size, 'Content-Length': String(e - s + 1), 'Accept-Ranges': 'bytes' } });
}
async function fillAudio(key) {
  if (filling.has(key)) return; filling.add(key);
  try {
    const res = await fetch(key, { mode: 'cors', credentials: 'omit' });
    const len = Number(res.headers.get('content-length')) || 0;
    if (res.status !== 200 || (len && len > MAX_AUDIO_BYTES)) return;
    const cache = await caches.open(AUDIO_CACHE);
    await cache.put(key, res);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_AUDIO_FILES; i++) await cache.delete(keys[i]);
  } catch (e) { /* سایتِ مبدأ اجازهٔ CORS نداده یا آفلاینیم؛ مهم نیست */ }
  finally { filling.delete(key); }
}
async function handleAudio(req) {
  const key = keyOf(req.url);
  try {
    const cache = await caches.open(AUDIO_CACHE), hit = await cache.match(key);
    if (hit) { const rg = req.headers.get('range'); return rg ? sliceRange(hit, rg) : hit; }
  } catch (e) {}
  fillAudio(key);
  return fetch(req);
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.destination !== 'audio') return;
  e.respondWith(handleAudio(r));
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'forget-audio' && d.url) e.waitUntil(caches.open(AUDIO_CACHE).then(c => c.delete(keyOf(d.url))));
});
