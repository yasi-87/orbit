// Service worker کوچیک: دریافت اعلان پس‌زمینه (Web Push) و باز کردن سایت با کلیک روی اعلان.
// هیچ چیزی کش نمی‌کنه، پس روی آپدیت سایت اثری نداره.
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
