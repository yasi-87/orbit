/* 🟢 آنلاین بودن: چه کسی الان توی سایته + «آخرین بازدید»
   - حضور لحظه‌ای: کانال realtime «om-presence» (فقط وقتی صفحه جلوی چشمه)
   - آخرین بازدید: هر ۲ دقیقه (و موقع رفتن) یک ردیف «__ls_<نام>» توی جدول voice_chat به‌روز می‌شه */
(function () {
  'use strict';
  const ID = 'p' + Math.random().toString(36).slice(2, 9);
  let ch = null, subscribed = false, hb = null, others = {}, seen = {}, thumb = '', thumbSrc = '', started = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => (typeof myName === 'function' ? myName() : '') || '';
  const guest = () => typeof guestMode !== 'undefined' && guestMode;
  const visible = () => document.visibilityState !== 'hidden';
  const keyOf = n => { try { return Recur.nameKey(n); } catch (e) { return String(n || '').trim(); } };
  const same = (a, b) => { try { return Recur.sameName(a, b); } catch (e) { return a === b; } };

  function makeThumb(cb) {
    const src = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    if (!src) { thumb = ''; thumbSrc = ''; return cb(); } if (src === thumbSrc) return cb();
    const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); const s = Math.min(im.width, im.height); x.imageSmoothingQuality = 'high'; x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 96, 96); const u = c.toDataURL('image/jpeg', 0.75); thumb = u.length < 40000 ? u : ''; thumbSrc = src; } catch (e) { thumb = ''; } cb(); };
    im.onerror = () => { thumb = ''; cb(); }; im.src = src;
  }
  function track() { if (!ch || !subscribed) return; makeThumb(() => { try { if (visible()) ch.track({ name: me(), av: thumb, at: Date.now() }); else ch.untrack(); } catch (e) {} }); }
  function sync() {
    if (!ch) return; let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    others = {}; Object.keys(st).forEach(k => { if (k === ID) return; const m = st[k] && st[k][0]; if (m && m.name) others[k] = { name: String(m.name).slice(0, 30), av: /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.av || '') ? m.av : '' }; });
    render(); chatLine();
  }
  async function beat(force) {
    const n = me(); if (!n || !visible() && !force) return;
    try { await dbClient.from('voice_chat').upsert({ id: '__ls_' + keyOf(n), name: n, text: String(Date.now()), ts: Date.now() }); } catch (e) {}
  }
  async function loadSeen() {
    try {
      const r = await dbClient.from('voice_chat').select('id,name,text').like('id', '__ls_%'); if (r && r.data) { seen = {}; r.data.forEach(x => { seen[String(x.id).slice(5)] = { name: x.name || '', t: Number(x.text) || 0 }; }); }
    } catch (e) {}
    render(); chatLine();
  }
  const ago = t => {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000)), f = n => { try { return Recur.toFa(n); } catch (e) { return String(n); } };
    if (s < 90) return 'همین الان'; const m = Math.round(s / 60); if (m < 60) return f(m) + ' دقیقه پیش'; const h = Math.round(m / 60); if (h < 24) return f(h) + ' ساعت پیش'; const d = Math.round(h / 24); return f(d) + ' روز پیش';
  };
  function people() {
    const list = []; const mine = me();
    const online = Object.values(others);
    const names = {}; Object.keys(seen).forEach(k => { names[k] = seen[k].name; });
    online.forEach(o => { names[keyOf(o.name)] = o.name; });
    delete names[keyOf(mine)];
    Object.keys(names).forEach(k => {
      const on = online.find(o => keyOf(o.name) === k);
      list.push({ name: names[k], on: !!on, av: on ? on.av : '', t: (seen[k] || {}).t || 0 });
    });
    list.sort((a, b) => (b.on - a.on) || (b.t - a.t));
    return list;
  }
  const dot = on => '<i class="pr-dot' + (on ? ' on' : '') + '"></i>';
  function avatarHtml(p) {
    const a = p.av || (typeof avatarCache !== 'undefined' && avatarCache[p.name]) || '';
    return a ? '<img src="' + esc(a) + '" alt="">' : '<span>' + esc((p.name || '?').trim().slice(0, 1)) + '</span>';
  }
  function render() {
    const el = $('presCard'); if (!el || guest()) return;
    const mineAv = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    const row = (name, av, on, sub, isMe) => '<div class="pr-row"><div class="pr-av">' + (av ? '<img src="' + esc(av) + '" alt="">' : '<span>' + esc((name || '?').trim().slice(0, 1)) + '</span>') + dot(on) + '</div><div class="pr-tx"><b>' + esc(name || '؟') + (isMe ? ' (من)' : '') + '</b><small class="' + (on ? 'on' : '') + '">' + sub + '</small></div></div>';
    const ps = people();
    el.innerHTML = '<h3>🟢 چه کسی آنلاینه؟</h3>' + row(me() || 'من', mineAv, visible(), visible() ? 'آنلاین' : 'پنجره در پس‌زمینه‌ست', true) +
      (ps.length ? ps.map(p => row(p.name, p.av || (typeof avatarCache !== 'undefined' ? avatarCache[p.name] : ''), p.on, p.on ? 'آنلاین 🟢' : (p.t ? 'آخرین بازدید: ' + ago(p.t) : 'هنوز دیده نشده'), false)).join('') : '<div class="pr-empty">هنوز کسی دیگه‌ای وارد سایت نشده 🌙</div>');
  }
  function chatLine() {
    const el = $('vcPres'); if (!el || guest()) return;
    const ps = people().filter(p => !same(p.name, me()) );
    el.innerHTML = ps.length ? ps.map(p => '<span class="' + (p.on ? 'on' : '') + '">' + dot(p.on) + esc(p.name) + (p.on ? ' آنلاینه' : (p.t ? ' · ' + ago(p.t) : '')) + '</span>').join('') : '';
    el.style.display = ps.length ? '' : 'none';
  }
  function start() {
    if (started) { track(); return; } const n = me(); if (!n || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return; started = true;
    try {
      ch = dbClient.channel('om-presence', { config: { presence: { key: ID } } });
      ch.on('presence', { event: 'sync' }, sync).subscribe(st => { if (st === 'SUBSCRIBED') { subscribed = true; track(); } });
    } catch (e) { ch = null; }
    beat(); loadSeen(); clearInterval(hb); hb = setInterval(() => { beat(); loadSeen(); render(); chatLine(); }, 120000);
    document.addEventListener('visibilitychange', () => { track(); if (!visible()) beat(true); else { beat(); loadSeen(); } render(); });
    window.addEventListener('pagehide', () => beat(true));
    setInterval(() => { render(); chatLine(); }, 30000);
  }
  window.Presence = { start, render, refresh: () => { loadSeen(); render(); }, _others: () => others };
})();
