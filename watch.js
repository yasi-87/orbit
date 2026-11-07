/* 🍿 اتاق تماشا: اتاق صحبت + آرشیو سرگرمی (فیلم/سریال) = یک فضای سرگرمی مشترک.
   - فیلم رو از آرشیو سرگرمی انتخاب می‌کنیم و «اتاق تماشا» می‌سازیم؛ اتاق برای اون یکی هم باز می‌شه.
   - لینک مستقیم ویدیو (mp4/webm/…) توی خود سایت پخش می‌شه و پخش/توقف/جلو-عقب همزمانه.
   - لینک سایت‌های دیگه (که نمی‌شه کنترلشون کرد) با «ساعت مشترک» همگام می‌شن: شمارش ۳-۲-۱ و توقف/ادامهٔ همزمان.
   - وضعیت هر نفر، واکنش‌های شناور، و چت (همون چت اتاق صحبت کنارش هست).
   - بعد از پایان، فیلم توی «دیده‌شده‌ها» (جدول watched) ثبت می‌شه.
   ارتباط زنده با Supabase Realtime (broadcast)؛ فقط ثبت دیده‌شده‌ها جدول می‌خواد (SQL شمارهٔ ۲۲). */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const REACTS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];
  const VIDEO_RE = /\.(mp4|webm|ogv|m4v|mov|mkv)(\?|#|$)/i;

  let ch = null, subscribed = false, room = null, P = { playing: false, pos: 0, at: 0 };
  let peers = {}, seen = [], seenMissing = false, seenLoaded = false;
  let remoteSeek = false, remoteSeekT = null, applying = false, applyT = null, tickT = null, statT = null, hbT = null, cdT = null, cd = 0, leader = false;
  let watchedSec = 0, lastTick = 0, picker = false, inited = false, closing = false;

  const send = p => { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'wt', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  const isVideo = () => !!room && room.mode === 'video';
  const vid = () => $('wtVideo');
  const curPos = () => { if (isVideo() && vid()) return vid().currentTime || 0; return P.playing ? P.pos + (Date.now() - P.at) / 1000 : P.pos; };
  const isPlaying = () => (isVideo() && vid()) ? !vid().paused && !vid().ended : P.playing;
  const clock = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const moviesFromArchive = () => (typeof funList !== 'undefined' ? funList : []).filter(x => x.category === 'movie' || x.category === 'series');

  /* ---------- اتصال ---------- */
  function join() {
    if (ch || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ch = dbClient.channel('watch-room', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'wt' }, m => recv(m && m.payload))
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; send({ t: 'hello' }); render(); } });
    } catch (e) { console.warn('watch off', e); ch = null; }
  }

  function recv(p) {
    if (!p || p.from === ID) return;
    if (p.t === 'hello') { if (room) { send({ t: 'open', room }); send(stateMsg()); } return; }
    if (p.t === 'open') {
      if (!p.room || (room && room.id === p.room.id)) return;
      openRoom(p.room, false);
      toast2('🍿 ' + (p.name || 'اون یکی') + ' اتاق تماشای «' + (p.room.item.title || '') + '» رو ساخت (🎬 سرگرمی ← فیلم)');
      try { window.OMSound && OMSound.play('up'); } catch (e) {}
      return;
    }
    if (!room || p.rid !== room.id) { return; }
    if (p.t === 'state') applyState(p);
    else if (p.t === 'stat') { peers[p.from] = { name: p.name, st: p.st, pos: p.pos, ts: Date.now() }; renderPeople(); }
    else if (p.t === 'react') floatReact(p.e, p.name);
    else if (p.t === 'sub') { if (p.sub && room.subs && !room.subs.some(x => x.id === p.sub.id)) { room.subs.push(p.sub); if (!activeSub) activeSub = p.sub.id; toast2('💬 ' + (p.name || 'اون یکی') + ' یه زیرنویس اضافه کرد'); prepSub(p.sub).then(() => { mountSubs(); renderSubUi(); }); } }
    else if (p.t === 'close') {
      const done = p.done, r = room; closeRoom(false);
      toast2(done ? '🏁 تماشای «' + r.item.title + '» تموم شد و توی دیده‌شده‌ها ثبت شد' : '🍿 اتاق تماشا بسته شد');
      if (done) loadSeen();
    }
  }
  const toast2 = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };

  /* ---------- ساخت / بستن اتاق ---------- */
  function openRoom(r, mine) {
    room = r; peers = {}; watchedSec = 0; lastTick = Date.now(); leader = !!mine; closing = false;
    P = { playing: false, pos: 0, at: Date.now() }; cd = 0; clearInterval(cdT);
    render();
    clearInterval(tickT); tickT = setInterval(tick, 250);
    clearInterval(statT); statT = setInterval(sendStat, 3000);
    setTimeout(sendStat, 400);
    if (mine) { send({ t: 'open', room }); }
  }
  function create(item) {
    if (!item || !item.url) return;
    if (room && !confirm('اتاق تماشای فعلی بسته بشه و اتاق تازه ساخته بشه؟')) return;
    if (room) closeRoom(true);
    join();
    const r = { id: 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), item: { id: item.id, title: item.title, url: item.url, category: item.category }, mode: (item.direct || VIDEO_RE.test(item.url)) ? 'video' : 'clock', by: nm(), at: Date.now(), subs: savedSubs(item.url) };
    picker = false;
    const go = () => { openRoom(r, true); toast2('🍿 اتاق تماشا ساخته شد؛ اون یکی هم توی سایت باشه، اتاق براش باز می‌شه'); };
    go();
    try { if (typeof setFunCat === 'function') setFunCat(item.category === 'series' ? 'series' : 'movie'); } catch (e) {}
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'cinema' && typeof showScreen === 'function') showScreen('cinema');
  }
  /* ⛶ تمام‌صفحه با چت: ویدیو کل پنجره رو می‌گیره ولی چت کنارش می‌مونه (تمام‌صفحهٔ واقعی مرورگر چت رو قایم می‌کرد) */
  function theater(force) {
    const st = $('wtStage'); if (!st || !isVideo()) return; const on = force == null ? !st.classList.contains('wt-theater') : !!force;
    st.classList.toggle('wt-theater', on); document.body.classList.toggle('wt-theater-on', on);
    const b = st.querySelector('[data-wt=theater]'); if (b) b.textContent = on ? '✕ خروج از تمام‌صفحه' : '⛶ تمام‌صفحه با چت';
    if (on) { try { if (!document.body.classList.contains('chat-open')) ChatDock.open(); } catch (e) {} }
  }
  document.addEventListener('keydown', e => {
    const st = $('wtStage'); if (!st || !isVideo()) return; const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === 'Escape' && st.classList.contains('wt-theater')) { theater(false); }
    else if ((e.key === 'f' || e.key === 'F') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); theater(); }
  });
  function closeRoom(broadcast, done) {
    if (!room) return;
    if (broadcast) send({ t: 'close', rid: room.id, done: !!done });
    clearInterval(tickT); clearInterval(statT); clearInterval(hbT); clearInterval(cdT); tickT = statT = hbT = cdT = null; document.body.classList.remove('wt-video-on'); remoteSeek = false;
    room = null; peers = {}; P = { playing: false, pos: 0, at: 0 }; cd = 0; document.body.classList.remove('wt-theater-on');
    render();
  }
  async function finish() {
    if (!room || closing) return; closing = true;
    const r = room, names = [nm()].concat(Object.keys(peers).map(k => peers[k].name).filter(Boolean));
    const row = { id: r.id, item_id: r.item.id || '', title: r.item.title, url: r.item.url, category: r.item.category || 'movie', watched_at: Date.now(), names: Array.from(new Set(names)).join(' و '), duration_sec: Math.round(watchedSec) };
    let ok = true;
    try { const { error } = await dbClient.from('watched').upsert(row, { onConflict: 'id' }); if (error) { ok = false; seenMissing = /watched|relation|schema cache/i.test(error.message || ''); } } catch (e) { ok = false; }
    seen = seen.filter(x => x.id !== row.id); if (ok) seen.unshift(row);
    if (!ok) toast2('⚠️ توی دیده‌شده‌ها ثبت نشد' + (seenMissing ? ' (فایل SQL شمارهٔ ۲۲ اجرا نشده)' : ''));
    else { toast2('🏁 تموم شد؛ «' + r.item.title + '» توی دیده‌شده‌ها ثبت شد 💞'); try { window.CatPal && CatPal.act('link'); } catch (e) {} }
    closeRoom(true, ok);
    try { if (typeof renderFun === 'function') renderFun(); } catch (e) {}
    render();
  }

  /* ---------- پخش همزمان ---------- */
  const stateMsg = () => ({ t: 'state', rid: room && room.id, playing: isPlaying() || (cd > 0), pos: curPos() });
  function local(extra) {
    if (!room || applying || remoteSeek) return;
    leader = true;
    send(Object.assign({ t: 'state', rid: room.id, playing: isPlaying(), pos: curPos() }, extra || {}));
    sendStat(); keepHb();
  }
  function keepHb() {
    clearInterval(hbT); hbT = null;
    if (room && isVideo()) hbT = setInterval(() => { if (leader && isPlaying()) send({ t: 'state', rid: room.id, playing: true, pos: curPos(), hb: true }); }, 4000);
  }
  function hold(ms) { applying = true; clearTimeout(applyT); applyT = setTimeout(() => { applying = false; }, ms || 600); }
  function applyState(p) {
    if (!room) return;
    leader = false;
    if (isVideo()) {
      const v = vid(); if (!v) return;
      hold(700);
      const want = p.pos + (p.playing ? 0.2 : 0);
      // برای جلوگیری از «پینگ‌پونگ» پرش بین دو گوشی: تا وقتی جابه‌جایی که از اون طرف اومده تموم نشده، رویدادهای خودمون رو نفرست
      if (!v.seeking && Math.abs((v.currentTime || 0) - want) > (p.hb ? 2.5 : 0.8)) { remoteSeek = true; clearTimeout(remoteSeekT); remoteSeekT = setTimeout(() => { remoteSeek = false; }, 6000); try { v.currentTime = want; } catch (e) { remoteSeek = false; } }
      if (p.playing && v.paused) v.play().catch(() => toast2('👆 یه بار روی ویدیو بزن تا همزمان شروع بشه'));
      if (!p.playing && !v.paused) v.pause();
    } else {
      if (p.cd) { startCountdown(p.cd, p.pos); return; }
      clearInterval(cdT); cd = 0;
      P = { playing: !!p.playing, pos: p.pos, at: Date.now() };
      renderClock();
    }
    sendStat();
  }
  function startCountdown(n, pos) {
    clearInterval(cdT); cd = n; P = { playing: false, pos, at: Date.now() }; renderClock();
    try { window.OMSound && OMSound.play('recv'); } catch (e) {}
    cdT = setInterval(() => {
      cd--;
      if (cd <= 0) { clearInterval(cdT); cd = 0; P = { playing: true, pos, at: Date.now() }; try { window.OMSound && OMSound.play('up'); } catch (e) {} sendStat(); }
      else { try { window.OMSound && OMSound.play('recv'); } catch (e) {} }
      renderClock();
    }, 1000);
  }
  /* دکمه‌های ساعت مشترک */
  function clockAct(a) {
    if (!room || isVideo()) return;
    const pos = curPos();
    if (a === 'toggle') {
      if (P.playing || cd) { clearInterval(cdT); cd = 0; P = { playing: false, pos, at: Date.now() }; send({ t: 'state', rid: room.id, playing: false, pos }); }
      else { startCountdown(3, pos); send({ t: 'state', rid: room.id, playing: true, pos, cd: 3 }); }
    } else {
      const np = Math.max(0, pos + (a === 'back' ? -10 : 10));
      P = { playing: P.playing, pos: np, at: Date.now() }; send({ t: 'state', rid: room.id, playing: P.playing, pos: np });
    }
    sendStat(); renderClock();
  }

  /* ---------- وضعیت و تیک ---------- */
  function myStatus() {
    if (!room) return 'idle';
    if (isVideo()) { const v = vid(); if (!v) return 'idle'; if (v.ended) return 'ended'; if (v.readyState < 3 && !v.paused) return 'buffering'; return v.paused ? 'paused' : 'playing'; }
    return cd ? 'countdown' : P.playing ? 'playing' : 'paused';
  }
  function sendStat() { if (room) send({ t: 'stat', rid: room.id, st: myStatus(), pos: curPos() }); }
  function tick() {
    const now = Date.now(); if (lastTick && isPlaying()) watchedSec += Math.min(1, (now - lastTick) / 1000); lastTick = now;
    if (!isVideo()) renderClock(true);
    renderPeople();
  }
  const ST = { playing: '▶️ در حال پخش', paused: '⏸ متوقف', buffering: '⏳ در حال بارگذاری', countdown: '⏱ آماده می‌شه', ended: '🏁 تموم شد', idle: '…' };
  function renderPeople() {
    const el = $('wtPeople'); if (!el || !room) return;
    const now = Date.now(), me = { name: nm() + ' (تو)', st: myStatus(), pos: curPos(), me: true };
    const list = [me].concat(Object.keys(peers).filter(k => now - peers[k].ts < 12000).map(k => peers[k]));
    const html = list.map(x => `<div class="wt-p${x.me ? ' me' : ''}"><b>${esc(x.name || 'یکی از ما')}</b><span>${ST[x.st] || ST.idle}</span><i>${fa(clock(x.pos))}</i></div>`).join('')
      + (list.length < 2 ? '<div class="wt-p wait">⏳ منتظر اون یکی هستیم…</div>' : '');
    if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
  }

  /* ---------- واکنش‌ها ---------- */
  function floatReact(e, who) {
    const host = $('wtFl') || $('wtStage'); if (!host) return;
    const s = document.createElement('div'); s.className = 'wt-fl'; s.textContent = e; s.style.left = (10 + Math.random() * 80) + '%'; s.title = who || '';
    host.appendChild(s); setTimeout(() => s.remove(), 2400);
  }
  function react(e) { if (!room) return; floatReact(e, nm()); send({ t: 'react', rid: room.id, e }); }

  /* ---------- 💬 زیرنویس (srt / vtt؛ آپلود یا لینک) ---------- */
  const SUBKEY = 'wt_subs';
  const savedSubs = url => { try { return (JSON.parse(localStorage.getItem(SUBKEY) || '{}')[url] || []).slice(0, 6); } catch (e) { return []; } };
  const saveSubs = () => { if (!room) return; try { const all = JSON.parse(localStorage.getItem(SUBKEY) || '{}'); all[room.item.url] = (room.subs || []).filter(x => /^https?:/.test(x.url)).slice(0, 6); localStorage.setItem(SUBKEY, JSON.stringify(all)); } catch (e) {} };
  let subCache = {}, activeSub = '', subShift = 0;
  function decodeText(buf) {
    let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { try { t = new TextDecoder('windows-1256').decode(buf); } catch (e2) { t = new TextDecoder().decode(buf); } }
    return t.replace(/^﻿/, '');
  }
  const tsec = x => { const m = String(x).trim().match(/^(?:(\d+):)?(\d+):(\d+)[.,](\d+)/); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + Number('0.' + m[4]) : NaN; };
  function parseSub(text) {
    const cues = [];
    String(text).replace(/\r/g, '').split(/\n{2,}/).forEach(b => {
      const ls = b.split('\n').filter(l => l.length), i = ls.findIndex(l => l.includes('-->')); if (i < 0) return;
      const [a, c] = ls[i].split('-->'), s = tsec(a), e = tsec(String(c).trim().split(/\s+/)[0]); if (isNaN(s) || isNaN(e)) return;
      const t = ls.slice(i + 1).join('\n').replace(/\{\\an?\d+\}/g, '').replace(/<\/?font[^>]*>/gi, '').trim(); if (t) cues.push({ s, e, t });
    });
    return cues;
  }
  const toVtt = cues => 'WEBVTT\n\n' + cues.map(c => { const f = x => { const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), sec = x % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + sec.toFixed(3).padStart(6, '0'); }; return f(c.s) + ' --> ' + f(c.e) + '\n' + c.t; }).join('\n\n');
  async function prepSub(sub) {
    if (subCache[sub.id]) return subCache[sub.id];
    try { const r = await fetch(sub.url); if (!r.ok) throw 0; const cues = parseSub(decodeText(await r.arrayBuffer())); if (!cues.length) throw 0; return subCache[sub.id] = cues; }
    catch (e) { toast2('⚠️ زیرنویس «' + (sub.label || '') + '» باز نشد (لینک مستقیم و بدون قفل نیست؟)'); return null; }
  }
  function mountSubs() {
    const v = vid(); if (!v || !room) return;
    v._wtTracks = v._wtTracks || {};
    (room.subs || []).forEach(sub => {
      const cues = subCache[sub.id]; if (!cues) return;
      let t = v._wtTracks[sub.id]; if (!t) t = v._wtTracks[sub.id] = v.addTextTrack('subtitles', sub.label || 'زیرنویس', 'fa');
      t.mode = 'hidden'; while (t.cues && t.cues.length) t.removeCue(t.cues[0]);
      cues.forEach(c => { try { const q = new VTTCue(Math.max(0, c.s + subShift), Math.max(0.01, c.e + subShift), c.t); q.line = subSt.pos === 'top' ? 1 : 'auto'; t.addCue(q); } catch (e) {} });
      t.mode = sub.id === activeSub ? 'showing' : 'disabled';
    });
  }

  /* ---------- 🎞️ زیرنویس داخل خود فایل mkv (مثل VLC) ---------- */
  // یه خوندنِ جریانی از فایل Matroska: فهرست ترک‌های زیرنویس رو از اول فایل می‌خونه و بعد (با موافقت کاربر) کل فایل رو یک‌بار پیمایش می‌کنه.
  const EBML_MASTER = new Set([0x18538067, 0x1654AE6B, 0x1549A966, 0x1F43B675, 0xA0, 0xAE]);
  async function mkvScan(url, o) {
    o = o || {}; const ctl = new AbortController(); if (o.ctl) o.ctl.abort = () => ctl.abort();
    let size, rd;
    if (typeof Blob !== 'undefined' && url instanceof Blob) {   // فایل محلی (قبل از آپلود): بدون دانلود مجدد و خیلی سریع
      const part = o.probe ? url.slice(0, 4194304) : url; size = part.size; rd = part.stream().getReader();
    } else {
      const res = await fetch(url, { signal: ctl.signal, headers: o.probe ? { Range: 'bytes=0-4194303' } : {} });
      if (!res.ok && res.status !== 206) throw new Error('http ' + res.status);
      size = o.probe ? 0 : (Number(res.headers.get('content-length')) || 0); rd = res.body.getReader();
    }
    let buf = new Uint8Array(0), off = 0, done = false, got = 0;
    const fill = async n => {
      while (buf.length - off < n && !done) {
        const r = await rd.read(); if (r.done) { done = true; break; } got += r.value.length;
        if (off >= buf.length) { buf = r.value; off = 0; } else { const nb = new Uint8Array(buf.length - off + r.value.length); nb.set(buf.subarray(off)); nb.set(r.value, buf.length - off); buf = nb; off = 0; }
        if (o.onProgress && size) o.onProgress(got, size);
      }
      return buf.length - off >= n;
    };
    const skip = async n => { while (n > 0) { if (off >= buf.length) { if (done) return; await fill(1); if (!(buf.length - off)) return; } const t = Math.min(n, buf.length - off); off += t; n -= t; } };
    const vint = (isId) => {   // برمی‌گردونه [مقدار، طول، ناشناخته؟]
      const b = buf[off]; if (b === 0) return null; let len = 1, m = 0x80; while (!(b & m)) { len++; m >>= 1; }
      if (len > 8 || buf.length - off < len) return null;
      let v = isId ? b : (b & (m - 1)), allOnes = (b & (m - 1)) === (m - 1);
      for (let i = 1; i < len; i++) { const x = buf[off + i]; v = v * 256 + x; if (x !== 255) allOnes = false; }
      return [v, len, !isId && allOnes];
    };
    const tracks = [], cues = []; let cur = null, tcScale = 1e6, clTc = 0, lastCue = null, wanted = o.wanted || null;
    try {
      for (;;) {
        if (!(await fill(1))) break; await fill(12);
        const idv = vint(true); if (!idv) break; off += idv[1]; const id = idv[0];
        if (!(buf.length - off)) await fill(8); const sv = vint(false); if (!sv) break; off += sv[1]; const sz = sv[2] ? Infinity : sv[0];
        if (id === 0x1F43B675 && o.probe) break;
        if (EBML_MASTER.has(id)) { if (id === 0xAE) { cur = { num: 0, type: 0, codec: '', lang: '', name: '', priv: null }; tracks.push(cur); } continue; }
        if (id === 0xA3 || id === 0xA1) {
          if (!wanted) { await skip(sz); continue; }  // (probe)
          await fill(Math.min(sz, 16)); const tv = vint(false); if (!tv) { await skip(sz); continue; }
          const num = tv[0], hdr = tv[1] + 3;
          if (!wanted.has(num)) { lastCue = null; await skip(sz); continue; }
          if (!(await fill(sz))) break;
          const rel = (buf[off + tv[1]] << 8 | buf[off + tv[1] + 1]) << 16 >> 16, data = buf.slice(off + hdr, off + sz); off += sz;
          lastCue = { num, s: (clTc + rel) * tcScale / 1e9, data, dur: null }; cues.push(lastCue); continue;
        }
        const leaf = [0xD7, 0x83, 0x86, 0x22B59C, 0x536E, 0x63A2, 0x2AD7B1, 0xE7, 0x9B];
        if (leaf.includes(id) && sz < 1e6) {
          if (!(await fill(sz))) break; const p = buf.slice(off, off + sz); off += sz;
          const uint = () => p.reduce((a, x) => a * 256 + x, 0), str = () => new TextDecoder().decode(p).replace(/\0+$/, '');
          if (id === 0xD7 && cur) cur.num = uint(); else if (id === 0x83 && cur) cur.type = uint(); else if (id === 0x86 && cur) cur.codec = str();
          else if (id === 0x22B59C && cur) cur.lang = str(); else if (id === 0x536E && cur) cur.name = str(); else if (id === 0x63A2 && cur) cur.priv = p;
          else if (id === 0x2AD7B1) tcScale = uint() || 1e6; else if (id === 0xE7) clTc = uint();
          else if (id === 0x9B && lastCue && lastCue.dur == null) lastCue.dur = uint() * tcScale / 1e9;
          continue;
        }
        await skip(sz);
      }
    } finally { try { ctl.abort(); } catch (e) {} }
    return { tracks: tracks.filter(t => t.type === 17), cues, tcScale };
  }
  function mkvCues(raw, track) {
    const ass = /ASS|SSA/i.test(track.codec), td = new TextDecoder(), out = [];
    raw.filter(c => c.num === track.num).forEach(c => {
      let t = td.decode(c.data);
      if (ass) { t = t.split(',').slice(8).join(','); t = t.replace(/\{[^}]*\}/g, '').replace(/\\N/gi, '\n').replace(/\\h/g, ' '); }
      t = t.replace(/\r/g, '').trim(); if (!t) return;
      out.push({ s: c.s, e: c.s + (c.dur || 3), t });
    });
    out.sort((a, b) => a.s - b.s);
    for (let i = 0; i < out.length - 1; i++) if (out[i].e > out[i + 1].s + 5) out[i].e = Math.min(out[i].e, out[i + 1].s);   // هم‌پوشانی زیاد رو کم کن
    return out;
  }
  const LANGS = { fas: 'فارسی', per: 'فارسی', fa: 'فارسی', eng: 'English', en: 'English', ara: 'عربی', tur: 'ترکی', fre: 'فرانسه', fra: 'فرانسه', ger: 'آلمانی', deu: 'آلمانی', spa: 'اسپانیایی', und: '' };
  const trLabel = t => ((LANGS[(t.lang || '').toLowerCase()] ?? t.lang) || '') + (t.name ? ' ' + t.name : '') || 'زیرنویس';
  let embBusy = false;
  const preferTrack = txt => txt.find(t => /^(fas|per|fa)$/i.test(t.lang || '')) || txt.find(t => /فارس|persian|farsi/i.test(t.name || '')) || txt.find(t => /^(eng|en)$/i.test(t.lang || '')) || txt[0];
  // زیرنویس متنی داخل فایل mkv رو درمیاره؛ src می‌تونه لینک یا خود File باشه. auto=true یعنی بدون پرسیدن بهترین ترک (فارسی، بعد انگلیسی) انتخاب بشه.
  async function extractSubs(src, o) {
    o = o || {}; const say2 = o.say || (() => {});
    say2('⏳ دارم ترک‌های زیرنویس فایل رو می‌خونم…');
    let info; try { info = await mkvScan(src, { probe: true }); } catch (e) { return { err: 'cors' }; }
    const txt = info.tracks.filter(t => /^S_TEXT/i.test(t.codec));
    if (!info.tracks.length) return { err: 'none' };
    if (!txt.length) return { err: 'image' };
    let pick = txt[0];
    if (txt.length > 1) {
      if (o.auto) pick = preferTrack(txt);
      else {
        const menu = txt.map((t, i) => (i + 1) + ') ' + trLabel(t) + ' [' + t.codec.replace('S_TEXT/', '') + ']').join('\n');
        const a = parseInt(prompt('این فایل چند زیرنویس داخلی داره؛ شمارهٔ مورد نظر رو بنویس:\n' + menu, '1') || '', 10); if (!a || a < 1 || a > txt.length) return { err: 'cancel' }; pick = txt[a - 1];
      }
    }
    let lastPc = -1; say2('⏳ دارم زیرنویس «' + trLabel(pick) + '» رو از فایل درمیارم…');
    const res = await mkvScan(src, { wanted: new Set([pick.num]), onProgress: (g, t) => { const pc = Math.floor(g / t * 100); if (pc !== lastPc) { lastPc = pc; say2('⏳ استخراج زیرنویس «' + trLabel(pick) + '»: ' + fa(pc) + '٪'); } } });
    const cues = mkvCues(res.cues, pick); if (!cues.length) return { err: 'empty' };
    return { cues, label: ('داخل فایل · ' + trLabel(pick)).slice(0, 34), count: txt.length };
  }
  async function shareExtracted(r) {
    const id = 's_' + Date.now().toString(36);
    try { const up = await uploadMediaFile(new Blob([toVtt(r.cues)], { type: 'text/vtt' }), 'vtt', 'sub.vtt'); addSub({ id, label: r.label, url: up.url, by: nm() }, r.cues); }
    catch (e) { addSub({ id, label: r.label + ' (فقط برای من)', url: '', by: nm() }, r.cues); }
  }
  const SUB_ERR = { cors: '⚠️ فایل خونده نشد؛ لینک باید اجازهٔ دسترسی بده (CORS) — فایل‌های آپلودشده توی خود سایت مشکلی ندارن', none: 'ℹ️ این فایل زیرنویس داخلی نداره', image: '⚠️ زیرنویس‌های این فایل تصویری هستن (PGS/VobSub) و قابل تبدیل به متن نیستن', empty: '⚠️ توی این ترک زیرنویسی پیدا نشد' };
  async function embeddedSubs() {
    if (!room || !isVideo() || embBusy) return; const url = room.item.url;
    const say2 = m => { const e = $('wtSubSt'); if (e) e.textContent = m; };
    if (!/\.mkv(\?|#|$)/i.test(url) && !/\.webm(\?|#|$)/i.test(url)) { toast2('ℹ️ استخراج زیرنویس داخلی فعلاً فقط برای فایل‌های mkv ممکنه (mp4 معمولاً زیرنویس داخلی قابل خوندن توی مرورگر نداره)'); return; }
    embBusy = true;
    try { const r = await extractSubs(url, { say: say2 }); say2(''); if (r.err) { if (SUB_ERR[r.err]) toast2(SUB_ERR[r.err]); return; } await shareExtracted(r); }
    catch (e) { say2(''); toast2('⚠️ استخراج زیرنویس نشد'); console.warn(e); }
    finally { embBusy = false; }
  }

  /* ---------- ظاهر زیرنویس (فقط برای خودت؛ توی همین مرورگر یادش می‌مونه) ---------- */
  const SUBFONT = { normal: 'inherit', bold: 'inherit', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Consolas,monospace' };
  const SUBCOL = { white: '#ffffff', yellow: '#ffe45c', green: '#7dffb0', cyan: '#7fe7ff', pink: '#ff9ecb' };
  const SUBBG = { none: ['transparent', 'text-shadow:0 0 3px #000,0 0 3px #000,1px 1px 2px #000,-1px -1px 2px #000'], soft: ['rgba(0,0,0,.45)', ''], box: ['rgba(0,0,0,.78)', ''], solid: ['#000', ''] };
  let subSt = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem('wt_substyle') || '{}') || {}; } catch (e) {} return Object.assign({ size: 110, col: 'white', bg: 'box', font: 'normal', pos: 'bottom' }, o); })();
  function applySubStyle() {
    let st = document.getElementById('wtSubStyle'); if (!st) { st = document.createElement('style'); st.id = 'wtSubStyle'; document.head.appendChild(st); }
    const bg = SUBBG[subSt.bg] || SUBBG.box;
    st.textContent = '.wt-stage video::cue{font-size:' + subSt.size + '%;color:' + (SUBCOL[subSt.col] || '#fff') + ';background:' + bg[0] + ';font-family:' + (SUBFONT[subSt.font] || 'inherit') + ';font-weight:' + (subSt.font === 'bold' ? '800' : '500') + ';' + bg[1] + ';line-height:1.55}';
    try { localStorage.setItem('wt_substyle', JSON.stringify(subSt)); } catch (e) {}
  }
  let subStOpen = false;
  function subStyleUi() {
    const sw = (k, map, labelFn) => Object.keys(map).map(x => `<button type="button" data-sk="${k}" data-sv="${x}" class="${subSt[k] === x ? 'on' : ''}" ${k === 'col' ? 'style="background:' + map[x] + ';color:#000;min-width:26px"' : ''}>${k === 'col' ? '' : labelFn(x)}</button>`).join('');
    return `<div class="wt-ss"><div><b>اندازه</b><button type="button" data-sz="-10">A−</button><small>${fa(subSt.size)}٪</small><button type="button" data-sz="10">A+</button></div>
      <div><b>رنگ</b>${sw('col', SUBCOL)}</div>
      <div><b>پس‌زمینه</b>${sw('bg', SUBBG, x => ({ none: 'بدون (سایه)', soft: 'کم‌رنگ', box: 'تیره', solid: 'مشکی' })[x])}</div>
      <div><b>قلم</b>${sw('font', SUBFONT, x => ({ normal: 'عادی', bold: 'ضخیم', serif: 'نوشتاری', mono: 'تایپ' })[x])}</div>
      <div><b>جای زیرنویس</b>${['bottom', 'top'].map(x => `<button type="button" data-sk="pos" data-sv="${x}" class="${subSt.pos === x ? 'on' : ''}">${x === 'top' ? 'بالا' : 'پایین'}</button>`).join('')}<button type="button" data-sk="reset">↺ پیش‌فرض</button></div></div>`;
  }

  function renderSubUi() {
    const el = $('wtSub'); if (!el || !room) return; const subs = room.subs || [];
    el.innerHTML = `<b>💬 زیرنویس</b><select id="wtSubSel" aria-label="انتخاب زیرنویس"><option value="">${subs.length ? 'بدون زیرنویس' : 'هنوز زیرنویسی نیست'}</option>${subs.map(x => `<option value="${esc(x.id)}"${x.id === activeSub ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
      <button type="button" class="btn ghost" data-ws="file" title="آپلود فایل زیرنویس از سیستم">📄 آپلود</button><button type="button" class="btn ghost" data-ws="url" title="لینک فایل زیرنویس">🔗 لینک</button><button type="button" class="btn ghost" data-ws="emb" title="خوندن زیرنویسِ چسبیده به خود فیلم (mkv)">🎞️ داخل فیلم</button>
      <button type="button" class="btn ghost" data-ws="st" title="اندازه، رنگ و شکل زیرنویس">🎨 ظاهر</button><span class="sh" title="اگه زیرنویس جلو یا عقبه، همین‌جا تنظیمش کن (فقط برای خودت)"><button type="button" data-ws="m" aria-label="زودتر">−</button><small>${fa(subShift.toFixed(1))}s</small><button type="button" data-ws="p" aria-label="دیرتر">+</button></span>
      <input type="file" id="wtSubFile" accept=".srt,.vtt,.txt,text/vtt,application/x-subrip" hidden /><div id="wtSubSt" style="flex-basis:100%;font-size:.78rem;color:var(--muted,#aaa)"></div>${subStOpen ? subStyleUi() : ''}`;
    const sel = $('wtSubSel'); if (sel) sel.onchange = () => { activeSub = sel.value; mountSubs(); };
    el.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { if (b.dataset.sk === 'reset') subSt = { size: 110, col: 'white', bg: 'box', font: 'normal', pos: 'bottom' }; else subSt[b.dataset.sk] = b.dataset.sv; applySubStyle(); mountSubs(); renderSubUi(); });
    el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { subSt.size = Math.max(60, Math.min(300, subSt.size + (+b.dataset.sz))); applySubStyle(); renderSubUi(); });
    const f = $('wtSubFile'); if (f) f.onchange = () => { const fl = f.files && f.files[0]; f.value = ''; if (fl) subFromFile(fl); };
    el.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => {
      const a = b.dataset.ws;
      if (a === 'file') $('wtSubFile').click();
      else if (a === 'st') { subStOpen = !subStOpen; renderSubUi(); }
      else if (a === 'emb') embeddedSubs();
      else if (a === 'url') { const u = (prompt('لینک مستقیم فایل زیرنویس (srt یا vtt):') || '').trim(); if (u) subFromUrl(u); }
      else { subShift = Math.round((subShift + (a === 'p' ? 0.5 : -0.5)) * 10) / 10; mountSubs(); renderSubUi(); }
    });
  }
  function addSub(sub, cues) {
    if (!room) return; room.subs = room.subs || []; subCache[sub.id] = cues; room.subs.push(sub); activeSub = sub.id; saveSubs();
    send({ t: 'sub', rid: room.id, sub }); mountSubs(); renderSubUi(); toast2('💬 زیرنویس «' + sub.label + '» اضافه شد');
  }
  async function subFromFile(file) {
    if (!room || !isVideo()) return; if (file.size > 3 * 1024 * 1024) { toast2('⚠️ این فایل برای زیرنویس خیلی بزرگه'); return; }
    const cues = parseSub(decodeText(await file.arrayBuffer())); if (!cues.length) { toast2('⚠️ این فایل زیرنویس معتبر (srt/vtt) نیست'); return; }
    const label = (file.name || 'زیرنویس').replace(/\.[^.]+$/, '').slice(0, 30), id = 's_' + Date.now().toString(36);
    toast2('⏳ در حال بارگذاری زیرنویس…');
    try { const up = await uploadMediaFile(new Blob([toVtt(cues)], { type: 'text/vtt' }), 'vtt', label + '.vtt'); addSub({ id, label, url: up.url, by: nm() }, cues); }
    catch (e) { addSub({ id, label: label + ' (فقط برای من)', url: '', by: nm() }, cues); toast2('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'songs') : 'آپلود نشد') + ' — زیرنویس فقط برای خودت فعاله'); }
  }
  async function subFromUrl(u) {
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u; const id = 's_' + Date.now().toString(36), sub = { id, label: (u.split('/').pop() || 'زیرنویس').split('?')[0].replace(/\.[^.]+$/, '').slice(0, 30) || 'زیرنویس', url: u, by: nm() };
    const cues = await prepSub(sub); if (cues) addSub(sub, cues);
  }

  /* ---------- 🎞️ آوردن فیلم با لینک مستقیم یا آپلود از سیستم ---------- */
  const NOPLAY = /\.(avi|wmv|flv|ts)(\?|#|$)/i;
  async function saveToArchive(title, url, category) {
    try {
      const row = { id: 'ln_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), category, title: title.slice(0, 80), url, author: nm(), created_at: Date.now() };
      const { error } = await dbClient.from('links').insert(row); if (error) return;
      if (typeof funList !== 'undefined') funList.push(row); if (typeof renderFun === 'function') renderFun();
    } catch (e) {}
  }
  function startFromLink() {
    let url = ($('wtLink') && $('wtLink').value || '').trim(), title = ($('wtLinkT') && $('wtLinkT').value || '').trim();
    if (!url) { toast2('⚠️ لینک فیلم رو بنویس'); return; } if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch (e) { toast2('⚠️ این لینک درست نیست'); return; }
    if (NOPLAY.test(url)) { toast2('⚠️ فرمت avi/wmv/flv توی مرورگر پخش نمی‌شه؛ فایل mp4، webm یا mkv بده'); return; }
    const cat = ($('wtCat') && $('wtCat').value) || 'movie', direct = !!($('wtDirect') && $('wtDirect').checked) || VIDEO_RE.test(url);
    title = title || decodeURIComponent((url.split('?')[0].split('/').pop() || 'فیلم').replace(/\.[^.]+$/, '')).slice(0, 80) || 'فیلم';
    if ($('wtSave') && $('wtSave').checked) saveToArchive(title, url, cat);
    create({ id: '', title, url, category: cat, direct });
  }
  async function startFromFile(file) {
    if (!file) return; if (!/^video\//.test(file.type) && !VIDEO_RE.test(file.name || '')) { toast2('⚠️ این فایل ویدیو نیست'); return; }
    if (file.size > 200 * 1024 * 1024) { toast2('⚠️ فایل بزرگه! حداکثر ۲۰۰ مگابایت'); return; }
    if (/\.mkv$/i.test(file.name || '')) toast2('ℹ️ mkv توی کروم و ادج پخش می‌شه (کدک H.264/AAC)؛ سافاری و فایرفاکس ممکنه پخشش نکنن'); else if (!/\.(mp4|webm|m4v|mov|ogv)$/i.test(file.name || '')) toast2('ℹ️ فقط mp4 / webm / mov / mkv پخش می‌شه');
    const cat = ($('wtCat') && $('wtCat').value) || 'movie', title = (file.name || 'فیلم').replace(/\.[^.]+$/, '').slice(0, 80); toast2('⏳ در حال آپلود فیلم… (پیشرفتش پایین صفحه‌ست)');
    try {
      const ext = ((file.name || '').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
      // زیرنویس چسبیده (soft-sub) از خود فایلِ انتخاب‌شده خونده می‌شه؛ هم‌زمان با آپلود، بدون دانلود دوباره
      const subP = /\.(mkv|webm)$/i.test(file.name || '') ? extractSubs(file, { auto: true }).catch(() => ({ err: 'x' })) : null;
      const up = await uploadMediaFile(!file.type && ext === 'mkv' ? new Blob([file], { type: 'video/x-matroska' }) : file, ext, file.name); if ($('wtSave') && $('wtSave').checked) saveToArchive(title, up.url, cat);
      create({ id: '', title, url: up.url, category: cat, direct: true });
      if (subP) { const r = await subP; if (r && r.cues) { await new Promise(res => setTimeout(res, 400)); await shareExtracted(r); toast2('✅ زیرنویس داخل فیلم پیدا و فعال شد' + (r.count > 1 ? ' (' + r.label.replace('داخل فایل · ', '') + '؛ بقیه رو با دکمهٔ «داخل فیلم» می‌شه انتخاب کرد)' : '')); } }
    } catch (e) { toast2('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'songs') : 'آپلود نشد')); }
  }

  /* ---------- دیده‌شده‌ها ---------- */
  async function loadSeen() {
    try {
      const { data, error } = await dbClient.from('watched').select('*').order('watched_at', { ascending: false });
      if (error) { seenMissing = /watched|relation|schema cache/i.test(error.message || ''); }
      else { seenMissing = false; seen = data || []; seenLoaded = true; }
    } catch (e) {}
    render(); try { if (typeof renderFun === 'function' && typeof funList !== 'undefined') renderFun(); } catch (e) {}
  }
  const isSeen = url => seen.some(x => x.url === url);

  /* ---------- نمایش ---------- */
  const CSS = `
.vc-area-watch{margin:0 !important;max-width:none !important}
.wt-h{padding:10px 14px;border-bottom:1px solid rgba(212,165,255,.2);font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wt-h .sp{flex:1}
.wt-body{padding:12px;display:flex;flex-direction:column;gap:10px}
.wt-empty{text-align:center;color:var(--muted,#aaa);font-size:.88rem;line-height:1.8}
.wt-pick{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto}
.wt-it{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);cursor:pointer;text-align:right;color:inherit;font:inherit}
.wt-it:hover{border-color:var(--accent,#d4a5ff);background:rgba(212,165,255,.12)}
.wt-it b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-it small{color:var(--muted,#aaa)}
.wt-stage{position:relative;background:#000;min-height:120px;border-radius:14px}
.wt-flbox{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2}
.wt-stage video{display:block;width:100%;max-height:340px;background:#000;border-radius:14px;transform:translateZ(0);backface-visibility:hidden}
.wt-clock{padding:18px 10px;text-align:center;background:linear-gradient(135deg,rgba(212,165,255,.14),rgba(255,160,200,.1))}
.wt-clock .big{font-size:2.4rem;font-weight:700;letter-spacing:2px;direction:ltr;font-variant-numeric:tabular-nums}
.wt-clock .cd{font-size:3rem;font-weight:800;color:var(--accent,#d4a5ff);min-height:1.2em}
.wt-clock .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.wt-clock .hint{color:var(--muted,#aaa);font-size:.78rem;margin-top:8px;line-height:1.7}
.wt-fl{position:absolute;bottom:6px;font-size:1.9rem;pointer-events:none;animation:wtUp 2.4s ease-out forwards;z-index:3;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5))}
@keyframes wtUp{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translateY(-190px) scale(1.25);opacity:0}}
.wt-people{display:flex;flex-direction:column;gap:6px}
.wt-p{display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.86rem}
.wt-p.me{background:rgba(212,165,255,.1)}
.wt-p b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-p i{font-style:normal;direction:ltr;color:var(--muted,#aaa);font-variant-numeric:tabular-nums}
.wt-p.wait{color:var(--muted,#aaa);justify-content:center}
.wt-react{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.wt-react button{width:42px;height:42px;border-radius:14px;border:1px solid rgba(212,165,255,.25);background:rgba(255,255,255,.05);font-size:1.3rem;cursor:pointer}
.wt-react button:active{transform:scale(.9)}
.wt-act{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.wt-seen{display:flex;flex-direction:column;gap:6px;max-height:190px;overflow-y:auto}
.wt-sv{display:flex;gap:8px;align-items:center;padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.84rem}
.wt-sv b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-sv small{color:var(--muted,#aaa);white-space:nowrap}
.wt-sec{font-size:.82rem;color:var(--muted,#aaa);margin-top:4px}
.fc-seen{position:absolute;bottom:8px;left:44px;font-size:.7rem;background:rgba(80,200,140,.18);color:#8fe6b8;border-radius:999px;padding:1px 8px}
.fc-watch{top:auto;bottom:6px;left:8px}
#watchWrap .vc-area-watch{margin:12px 0 !important}
.wt-new{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px dashed rgba(212,165,255,.3)}
.wt-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:.82rem}.wt-row input[type=text],.wt-row select{flex:1;min-width:140px;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,165,255,.3);background:rgba(10,10,15,.5);color:inherit;font:inherit}
.wt-row label{display:flex;gap:4px;align-items:center;color:var(--muted,#aaa)}
.wt-sub{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:.84rem}.wt-sub select{flex:1;min-width:130px;padding:7px 10px;border-radius:10px;border:1px solid rgba(212,165,255,.3);background:#241a3a;color:#f3ecff;font:inherit}
.wt-sub .btn{padding:6px 12px;font-size:.8rem}.wt-sub .sh{display:inline-flex;align-items:center;gap:4px;direction:ltr}.wt-sub .sh button{width:28px;height:28px;border-radius:8px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;cursor:pointer}.wt-sub .sh small{min-width:40px;text-align:center}
.wt-info{font-size:.78rem;color:var(--muted,#aaa);line-height:1.8}.wt-info .bad{color:#ffb3a6}.wt-info details{margin-top:4px}.wt-info pre{direction:ltr;text-align:left;white-space:pre-wrap;background:rgba(0,0,0,.3);border-radius:8px;padding:8px;font-size:.72rem;user-select:all}
.wt-ss{flex-basis:100%;display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);font-size:.8rem}.wt-ss>div{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.wt-ss b{min-width:78px;color:var(--muted,#aaa);font-weight:600}.wt-ss button{border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;border-radius:8px;padding:4px 9px;cursor:pointer;font-size:.78rem}.wt-ss button.on{background:rgba(212,165,255,.4);border-color:#d4a5ff}
.wt-tb{position:absolute;top:8px;left:8px;z-index:3;display:flex;gap:6px}.wt-tb button{border:0;border-radius:10px;padding:6px 10px;font-size:.78rem;cursor:pointer;background:rgba(10,8,20,.8);color:#fff;opacity:.85}.wt-tb button:hover{opacity:1;background:rgba(212,165,255,.6);color:#1a1030}
.wt-stage .wt-tb .wt-tchat{display:none}
@media (max-width:1279px){body.wt-video-on #chatLauncher{display:none!important}.wt-stage .wt-tb .wt-tchat{display:inline-block}.wt-tb{top:6px;left:6px}}
.wt-stage.wt-theater{border-radius:0;position:fixed;z-index:110;top:0;left:0;right:0;bottom:0;margin:0;border-radius:0;display:flex;align-items:center;justify-content:center;max-height:none}
.wt-stage.wt-theater video{width:100%;height:100%;max-height:none;object-fit:contain;border-radius:0}
.wt-stage.wt-theater .wt-tb .wt-tchat{display:inline-block}
body.wt-theater-on{overflow:hidden}
@media (min-width:900px){body.chat-open .wt-stage.wt-theater{left:330px}}
@media (max-width:899px){body.chat-open .wt-stage.wt-theater{bottom:calc(min(72vh,540px) + 16px)}}

@media (min-width:900px){.vc-area-watch{grid-column:1 / -1}}`;

  function ensureCss() { if ($('wtCss')) return; const st = document.createElement('style'); st.id = 'wtCss'; st.textContent = CSS; document.head.appendChild(st); }

  function render() {
    const box = $('watchBox'); if (!box) return;
    ensureCss();
    if (box.dataset.rid === (room ? room.id : '') && room && isVideo() && vid()) { renderPeople(); return; }  // ویدیو رو دوباره نساز
    box.dataset.rid = room ? room.id : '';
    document.body.classList.remove('wt-theater-on'); document.body.classList.toggle('wt-video-on', !!(room && isVideo()));
    if (!room) { box.innerHTML = renderIdle(); bind(); return; }
    const r = room;
    const stage = isVideo()
      ? `<div class="wt-stage" id="wtStage"><video id="wtVideo" src="${esc(r.item.url)}" controls controlslist="nofullscreen" playsinline preload="metadata"></video><div class="wt-flbox" id="wtFl"></div><div class="wt-tb"><button type="button" data-wt="theater" title="تمام‌صفحه؛ چت کنارش می‌مونه (کلید F)">⛶ تمام‌صفحه با چت</button><button type="button" class="wt-tchat" data-wt="tchat" title="باز/بسته کردن چت">💬 چت</button></div></div>`
      : `<div class="wt-stage" id="wtStage"><div class="wt-clock" id="wtClock"></div></div>`;
    box.innerHTML = `<div class="wt-h">🍿 اتاق تماشا: «${esc(r.item.title)}» <span class="sp"></span><small style="color:var(--muted,#aaa)">ساخته‌شده توسط ${esc(r.by || '')}</small></div>
      <div class="wt-body">${stage}
        ${isVideo() ? '<div class="wt-sub" id="wtSub"></div>' : '<div class="wt-sec">💬 زیرنویس فقط برای فیلم‌های لینک مستقیم/آپلودی فعاله.</div>'}
        ${isVideo() ? '<div class="wt-info" id="wtInfo"></div>' : ''}
        <div class="wt-react" id="wtReact">${REACTS.map(e => `<button type="button" data-re="${e}" aria-label="واکنش ${e}">${e}</button>`).join('')}</div>
        <div class="wt-people" id="wtPeople"></div>
        <div class="wt-sec">💬 برای چت کردن موقع تماشا، از چت کنار اتاق صحبت استفاده کنید.</div>
        <div class="wt-act"><button type="button" class="btn" data-wt="finish">🏁 تموم شد؛ ثبت توی دیده‌شده‌ها</button><button type="button" class="btn ghost" data-wt="close">✕ بستن اتاق</button></div>
      </div>${renderSeen()}`;
    bind(); bindVideo(); renderClock(); renderPeople(); renderSubUi();
  }
  function renderIdle() {
    const list = moviesFromArchive();
    return `<div class="wt-h">🍿 اتاق تماشا <span class="sp"></span><button type="button" class="btn" data-wt="pick">🎬 انتخاب فیلم از آرشیو سرگرمی</button></div>
      <div class="wt-body">
        <div class="wt-new"><div class="wt-sec">🔗 فیلم با لینک مستقیم یا 📤 آپلود از سیستم (بدون نیاز به آرشیو)</div>
          <div class="wt-row"><input type="text" id="wtLink" dir="ltr" inputmode="url" placeholder="لینک مستقیم فیلم (…mp4 / webm / mkv)" /><input type="text" id="wtLinkT" maxlength="80" placeholder="اسم فیلم (اختیاری)" /></div>
          <div class="wt-row"><select id="wtCat"><option value="movie">🎬 فیلم</option><option value="series">📺 سریال</option></select><label><input type="checkbox" id="wtDirect" /> لینک مستقیم ویدیوئه (بدون پسوند mp4)</label><label><input type="checkbox" id="wtSave" checked /> توی آرشیو هم بمونه</label></div>
          <div class="wt-row"><button type="button" class="btn" data-wt="link">▶️ شروع تماشا با لینک</button><button type="button" class="btn ghost" data-wt="up">📤 آپلود فیلم از سیستم</button><input type="file" id="wtUp" accept="video/*,.mp4,.webm,.mov,.m4v,.mkv" hidden /></div>
          <div class="wt-sec">لینک سایت‌هایی مثل یوتیوب یا آپارات مستقیم نیستن؛ برای اونا از آرشیو استفاده کن تا «ساعت مشترک» همگامشون کنه. avi و wmv توی مرورگر پخش نمی‌شن؛ mkv فقط با کدک H.264/AAC.</div></div>
        ${picker ? (list.length ? `<div class="wt-pick">${list.map(x => `<button type="button" class="wt-it" data-wid="${esc(x.id)}"><span>${x.category === 'series' ? '📺' : '🎬'}</span><b>${esc(x.title)}</b>${isSeen(x.url) ? '<small>✅ دیده‌شده</small>' : ''}<small dir="ltr">${esc(hostOf(x.url))}</small></button>`).join('')}</div>`
          : '<div class="wt-empty">هنوز فیلم یا سریالی توی آرشیو سرگرمی نذاشتیم؛ از بخش 🎬 سرگرمی اضافه کنید 💜</div>')
          : '<div class="wt-empty">یه فیلم یا سریال از آرشیو سرگرمی انتخاب کنید تا اتاق تماشا برای هر دومون باز بشه؛ پخش و توقف همزمانه و می‌تونیم واکنش بدیم 💞</div>'}
      </div>${renderSeen()}`;
  }
  function renderSeen() {
    if (seenMissing) return '<div class="wt-body"><div class="wt-empty">🛠️ برای ثبت دیده‌شده‌ها باید SQL شمارهٔ ۲۲ رو یک بار توی Supabase اجرا کنی.</div></div>';
    if (!seen.length) return '';
    const tot = seen.reduce((a, x) => a + (x.duration_sec || 0), 0);
    return `<div class="wt-body" style="border-top:1px solid rgba(212,165,255,.15)"><div class="wt-sec">✅ دیده‌شده‌ها (${fa(seen.length)}) · مجموع تماشا: ${fa(Math.floor(tot / 3600))} ساعت و ${fa(Math.floor(tot % 3600 / 60))} دقیقه</div><div class="wt-seen">${seen.map(x => {
      let when = ''; try { const w = Recur.epochToWall(x.watched_at); when = Recur.fmtJalaliShort(w.iso); } catch (e) {}
      return `<div class="wt-sv"><span>${x.category === 'series' ? '📺' : '🎬'}</span><b>${esc(x.title)}</b><small>${esc(when)}</small></div>`;
    }).join('')}</div></div>`;
  }
  function renderClock(light) {
    const el = $('wtClock'); if (!el || !room) return;
    const t = fa(clock(curPos()));
    if (light && el.dataset.k === String(cd) + (P.playing ? 'p' : 's')) { const b = el.querySelector('.big'); if (b) b.textContent = t; return; }
    el.dataset.k = String(cd) + (P.playing ? 'p' : 's');
    el.innerHTML = `<div class="cd">${cd ? fa(cd) : (P.playing ? '▶️' : '⏸')}</div><div class="big">${t}</div>
      <div class="row"><button type="button" class="btn ghost" data-ck="back" title="۱۰ ثانیه عقب">⏪</button><button type="button" class="btn" data-ck="toggle">${P.playing || cd ? '⏸ توقف' : '▶️ شروع همزمان'}</button><button type="button" class="btn ghost" data-ck="fwd" title="۱۰ ثانیه جلو">⏩</button><a class="btn ghost" href="${esc(room.item.url)}" target="_blank" rel="noopener noreferrer" data-ck="open">🔗 باز کردن فیلم</a></div>
      <div class="hint">این لینک توی تب جدا باز می‌شه. هر دو فیلم رو روی ثانیهٔ ۰ نگه دارید و وقتی یکی «شروع همزمان» رو زد، بعد از شمارش ۳-۲-۱ هر دو پلی کنید؛ توقف هم همین‌طوره.</div>`;
    el.querySelectorAll('[data-ck]').forEach(b => { if (b.dataset.ck !== 'open') b.onclick = () => clockAct(b.dataset.ck); });
  }
  function bind() {
    const box = $('watchBox'); if (!box) return;
    box.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => {
      const a = b.dataset.wt;
      if (a === 'pick') { picker = !picker; if (typeof funLoaded !== 'undefined' && !funLoaded && typeof loadFun === 'function') loadFun().then(render); render(); }
      else if (a === 'finish') finish();
      else if (a === 'link') startFromLink();
      else if (a === 'up') { const u = $('wtUp'); if (u) u.click(); }
      else if (a === 'theater') theater();
      else if (a === 'tchat') { try { document.body.classList.contains('chat-open') ? ChatDock.close() : ChatDock.open(); } catch (e) {} }
      else if (a === 'close') { if (confirm('اتاق تماشا برای هر دو بسته بشه؟')) closeRoom(true, false); }
    });
    const wu = $('wtUp'); if (wu) wu.onchange = () => { const f = wu.files && wu.files[0]; wu.value = ''; startFromFile(f); };
    box.querySelectorAll('[data-wid]').forEach(b => b.onclick = () => { const it = moviesFromArchive().find(x => x.id === b.dataset.wid); if (it) create(it); });
    box.querySelectorAll('[data-re]').forEach(b => b.onclick = () => react(b.dataset.re));
  }
  /* وضعیت پخش: رزولوشن + افت فریم. اگه فیلم برای دستگاه سنگین باشه (همون چیزی که لرزش می‌ده) راه سبک‌کردنش رو نشون می‌ده */
  let infoPrev = { t: 0, d: 0, n: 0 }, infoHtml = '';
  function infoTick() {
    const el = $('wtInfo'), v = vid(); if (!el || !v || !v.videoWidth) return;
    const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    let bad = false, loss = '';
    if (q && q.totalVideoFrames > 60) { const d = q.droppedVideoFrames - infoPrev.d, n = q.totalVideoFrames - infoPrev.n; if (n > 30) { const pc = Math.round(d / n * 100); infoPrev = { t: Date.now(), d: q.droppedVideoFrames, n: q.totalVideoFrames }; bad = pc >= 8; loss = ' · افت فریم الان: ' + fa(pc) + '٪'; infoPrev.last = loss; infoPrev.bad = bad; } else { loss = infoPrev.last || ''; bad = !!infoPrev.bad; } }
    const big = v.videoWidth > 1300, mkv = /\.mkv(\?|#|$)/i.test((room && room.item && room.item.url) || '');
    const html = '📐 ' + v.videoWidth + '×' + v.videoHeight + loss + (bad || big ? ' <span class="bad">· ' + (bad ? 'فیلم برای این دستگاه سنگینه (لرزش از همینه)' : 'رزولوشن بالاست و ممکنه موبایل رو اذیت کنه') + '</span>' : '') +
      (bad || big ? `<details><summary>🪶 چطور سبکش کنم؟</summary>فیلم رو با HandBrake یا ffmpeg به <b>H.264 · 720p · ۸ بیت · صدای AAC</b> تبدیل کن و دوباره آپلود کن؛ روی هر موبایلی روون پخش می‌شه. با ffmpeg (زیرنویس‌های داخلی هم می‌مونه):<pre>ffmpeg -i in.mkv -map 0:v:0 -map 0:a:0 -map 0:s? -vf scale=-2:720 -c:v libx264 -preset medium -crf 24 -profile:v main -pix_fmt yuv420p -c:a aac -b:a 128k -c:s copy out.mkv</pre>برای mp4 (کوچک‌تر ولی بدون زیرنویس داخلی) آخرش <code>-sn out.mp4</code> بذار. توی HandBrake هم: Video Encoder = H.264، Framerate = Same as source، Resolution Limit = 720p، Audio = AAC.</details>` : '');
    if (html !== infoHtml) { infoHtml = html; const open = el.querySelector('details') && el.querySelector('details').open; el.innerHTML = html; if (open && el.querySelector('details')) el.querySelector('details').open = true; }
  }
  setInterval(infoTick, 3000);
  function bindVideo() {
    const v = vid(); if (!v) return;
    v.addEventListener('seeked', () => { if (remoteSeek) { remoteSeek = false; clearTimeout(remoteSeekT); hold(900); return; } local(); });
    ['play', 'pause'].forEach(ev => v.addEventListener(ev, () => { local(); }));
    ['waiting', 'playing', 'stalled', 'canplay'].forEach(ev => v.addEventListener(ev, sendStat));
    v.addEventListener('ended', () => { sendStat(); if (!closing) finish(); });
    v.addEventListener('error', () => toast2(/\.mkv(\?|#|$)/i.test((room && room.item && room.item.url) || '') ? '⚠️ این mkv توی مرورگرت پخش نشد (کدک یا مرورگر پشتیبانی نمی‌کنه؛ کروم/ادج و H.264+AAC لازمه)' : '⚠️ این ویدیو توی سایت پخش نشد؛ لینکش مستقیم نیست یا قفله'));
    keepHb();
    subCache = subCache; activeSub = (room.subs && room.subs[0] && room.subs[0].id) || ''; subShift = 0;
    Promise.all((room.subs || []).map(prepSub)).then(() => { mountSubs(); renderSubUi(); });
  }

  function load() {
    join();
    if (!seenLoaded) loadSeen(); else render();
    if (typeof funLoaded !== 'undefined' && !funLoaded && typeof loadFun === 'function') loadFun().then(() => { if (!room) render(); });
  }
  function init() { if (inited) return; inited = true; ensureCss(); applySubStyle(); setTimeout(join, 2500); }
  window.Watch = { _mkvScan: mkvScan, _mkvCues: mkvCues, load, create, isSeen, init, _room: () => room, _state: () => ({ room, peers, P, cd, watchedSec, seen }), _id: ID, finish, close: () => closeRoom(true, false) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
