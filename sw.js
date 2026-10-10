// Service worker کوچیک: فقط برای نمایش اعلان سیستم و باز کردن سایت با کلیک روی اعلان.
// هیچ چیزی کش نمی‌کنه، پس روی آپدیت سایت اثری نداره.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
