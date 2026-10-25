/* 🎧 گوش دادن با هم: وقتی هر دو نفر توی سایت (بخش پلی‌لیست) «گوش دادن با هم» رو روشن کنیم،
   پخش، توقف، جلو/عقب کردن و عوض کردن آهنگ روی هر دو دستگاه همزمان می‌شه.
   از Supabase Realtime (broadcast + presence) استفاده می‌کنه؛ جدول یا SQL جدید لازم نیست. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  let ch = null, on = false, peers = 0, peerNames = [], applying = false, applyT = null, leader = false, hbT = null, sendT = null, subscribed = false;
  const $ = id => document.getElementById(id);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const audio = () => (typeof customAudio !== 'undefined' ? customAudio : null);

  function status() {
    const b = $('togetherBtn'), s = $('togetherSt'); if (!b) return;
    b.classList.toggle('on', on);
    b.textContent = on ? '🎧 گوش دادن با هم: روشن' : '🎧 گوش دادن با هم';
    if (!s) return;
    if (!on) { s.textContent = ''; s.style.display = 'none'; return; }
    s.style.display = '';
    s.textContent = peers > 0 ? '💞 ' + (peerNames[0] || 'هر دومون') + ' هم اینجاست؛ آهنگ‌ها همزمان پخش می‌شن' : (subscribed ? '⏳ منتظریم اون یکی هم «گوش دادن با هم» رو بزنه…' : '⏳ در حال اتصال…');
  }

  function snapshot(hb) {
    const a = audio(), cs = typeof currentSong !== 'undefined' ? currentSong : null;
    if (!a || !cs) return null;
    return { t: 'state', from: ID, songId: cs.id, playing: !a.paused, pos: a.currentTime || 0, hb: !!hb };
  }
  function send(p) { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'lt', payload: p }); } catch (e) {} }
  function sendState(hb) { const p = snapshot(hb); if (p) send(p); }

  function heartbeat() {
    clearInterval(hbT); hbT = null;
    if (on && leader && peers > 0) hbT = setInterval(() => { const a = audio(); if (a && !a.paused) sendState(true); }, 4000);
  }

  /* کاربر خودش کاری کرد (پخش/توقف/جلو-عقب/آهنگ جدید) → برای اون یکی بفرست */
  function local() {
    if (!on || applying) return;
    clearTimeout(sendT);
    sendT = setTimeout(() => { if (!on || applying || peers < 1) return; leader = true; sendState(false); heartbeat(); }, 120);
  }

  function hold(ms) { applying = true; clearTimeout(applyT); applyT = setTimeout(() => { applying = false; }, ms || 500); }

  function apply(p) {
    const a = audio(); if (!a || !p) return;
    const song = (typeof playlist !== 'undefined' ? playlist : []).find(s => s.id === p.songId);
    if (!song) { if (!p.hb && typeof toast === 'function') toast('⚠️ آهنگ هنوز توی پلی‌لیست تو نیومده؛ یه بار صفحه رو تازه کن'); return; }
    leader = false; heartbeat();
    hold(500);
    const same = typeof currentSong !== 'undefined' && currentSong && currentSong.id === p.songId && a.src;
    const settle = () => {
      const want = p.pos + (p.playing ? 0.15 : 0);
      if (isFinite(a.duration) || a.readyState >= 1) { if (Math.abs((a.currentTime || 0) - want) > (p.hb ? 1.5 : 0.7)) { try { a.currentTime = want; } catch (e) {} } }
      if (p.playing && a.paused) a.play().catch(() => { if (typeof toast === 'function') toast('👆 یه بار روی صفحه بزن تا آهنگ همزمان شروع بشه'); });
      if (!p.playing && !a.paused) a.pause();
    };
    if (same) { settle(); return; }
    playSong(p.songId, true);
    const go = () => { a.removeEventListener('loadedmetadata', go); hold(500); settle(); };
    if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go);
    if (!p.playing) a.addEventListener('playing', function once() { a.removeEventListener('playing', once); if (applying) a.pause(); });
  }

  function recv(p) {
    if (!on || !p || p.from === ID) return;
    if (p.t === 'hello') { const a = audio(); if (a && !a.paused) { leader = true; sendState(false); heartbeat(); } return; }
    if (p.t === 'state') apply(p);
  }

  function presence() {
    if (!ch) return;
    let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    const others = []; Object.keys(st).forEach(k => { if (k !== ID) (st[k] || []).forEach(m => others.push((m && m.name) || '')); });
    const was = peers; peers = Object.keys(st).filter(k => k !== ID).length; peerNames = others;
    if (peers > was && on && typeof toast === 'function') toast('💞 ' + (others[0] || 'اون یکی') + ' هم به گوش دادن با هم وصل شد');
    if (peers > 0 && was === 0) { const a = audio(); if (a && !a.paused) { leader = true; sendState(false); } else send({ t: 'hello', from: ID }); heartbeat(); }
    if (peers === 0) heartbeat();
    status();
  }

  function join() {
    try {
      ch = dbClient.channel('listen-together', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'lt' }, m => recv(m && m.payload))
        .on('presence', { event: 'sync' }, presence)
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; try { ch.track({ name: nm() }); } catch (e) {} status(); setTimeout(presence, 300); } });
    } catch (e) { console.warn('together off', e); if (typeof toast === 'function') toast('⚠️ اتصال همزمان برقرار نشد'); on = false; }
    status();
  }
  function leave() {
    clearInterval(hbT); hbT = null; clearTimeout(sendT);
    try { if (ch) { try { ch.untrack(); } catch (e) {} dbClient.removeChannel ? dbClient.removeChannel(ch) : ch.unsubscribe(); } } catch (e) {}
    ch = null; subscribed = false; peers = 0; peerNames = []; leader = false;
  }
  function toggle() {
    on = !on;
    if (on) { join(); if (typeof toast === 'function') toast('🎧 گوش دادن با هم روشن شد؛ وقتی اون یکی هم روشنش کنه همزمان می‌شیم'); }
    else { leave(); if (typeof toast === 'function') toast('گوش دادن با هم خاموش شد'); }
    status();
  }

  function init() {
    const a = audio(); if (!a) return;
    ['play', 'pause', 'seeked'].forEach(ev => a.addEventListener(ev, local));
    const b = $('togetherBtn'); if (b) b.addEventListener('click', toggle);
    status();
  }
  /* آهنگ که تموم شد، فقط یکی از دو نفر (ID کوچک‌تر) آهنگ بعدی رو انتخاب می‌کنه؛ اون یکی از طریق پیام همگام می‌شه */
  const shouldWait = () => on && peers > 0 && ID > peerIds()[0];
  function peerIds() { let st = {}; try { st = ch.presenceState() || {}; } catch (e) {} return Object.keys(st).filter(k => k !== ID).sort(); }
  window.Together = { shouldWait, toggle, init, _on: () => on, _peers: () => peers, _id: ID };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
