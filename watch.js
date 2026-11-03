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
  const VIDEO_RE = /\.(mp4|webm|ogv|m4v|mov)(\?|#|$)/i;

  let ch = null, subscribed = false, room = null, P = { playing: false, pos: 0, at: 0 };
  let peers = {}, seen = [], seenMissing = false, seenLoaded = false;
  let applying = false, applyT = null, tickT = null, statT = null, hbT = null, cdT = null, cd = 0, leader = false;
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
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'fun' && typeof showScreen === 'function') showScreen('fun');
  }
  function closeRoom(broadcast, done) {
    if (!room) return;
    if (broadcast) send({ t: 'close', rid: room.id, done: !!done });
    clearInterval(tickT); clearInterval(statT); clearInterval(hbT); clearInterval(cdT); tickT = statT = hbT = cdT = null;
    room = null; peers = {}; P = { playing: false, pos: 0, at: 0 }; cd = 0;
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
    if (!room || applying) return;
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
      if (Math.abs((v.currentTime || 0) - want) > (p.hb ? 1.5 : 0.7)) { try { v.currentTime = want; } catch (e) {} }
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
    el.innerHTML = list.map(x => `<div class="wt-p${x.me ? ' me' : ''}"><b>${esc(x.name || 'یکی از ما')}</b><span>${ST[x.st] || ST.idle}</span><i>${fa(clock(x.pos))}</i></div>`).join('')
      + (list.length < 2 ? '<div class="wt-p wait">⏳ منتظر اون یکی هستیم…</div>' : '');
  }

  /* ---------- واکنش‌ها ---------- */
  function floatReact(e, who) {
    const host = $('wtStage'); if (!host) return;
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
      cues.forEach(c => { try { const q = new VTTCue(Math.max(0, c.s + subShift), Math.max(0.01, c.e + subShift), c.t); q.line = 'auto'; t.addCue(q); } catch (e) {} });
      t.mode = sub.id === activeSub ? 'showing' : 'disabled';
    });
  }
  function renderSubUi() {
    const el = $('wtSub'); if (!el || !room) return; const subs = room.subs || [];
    el.innerHTML = `<b>💬 زیرنویس</b><select id="wtSubSel" aria-label="انتخاب زیرنویس"><option value="">${subs.length ? 'بدون زیرنویس' : 'هنوز زیرنویسی نیست'}</option>${subs.map(x => `<option value="${esc(x.id)}"${x.id === activeSub ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select>
      <button type="button" class="btn ghost" data-ws="file" title="آپلود فایل زیرنویس از سیستم">📄 آپلود</button><button type="button" class="btn ghost" data-ws="url" title="لینک فایل زیرنویس">🔗 لینک</button>
      <span class="sh" title="اگه زیرنویس جلو یا عقبه، همین‌جا تنظیمش کن (فقط برای خودت)"><button type="button" data-ws="m" aria-label="زودتر">−</button><small>${fa(subShift.toFixed(1))}s</small><button type="button" data-ws="p" aria-label="دیرتر">+</button></span>
      <input type="file" id="wtSubFile" accept=".srt,.vtt,.txt,text/vtt,application/x-subrip" hidden />`;
    const sel = $('wtSubSel'); if (sel) sel.onchange = () => { activeSub = sel.value; mountSubs(); };
    const f = $('wtSubFile'); if (f) f.onchange = () => { const fl = f.files && f.files[0]; f.value = ''; if (fl) subFromFile(fl); };
    el.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => {
      const a = b.dataset.ws;
      if (a === 'file') $('wtSubFile').click();
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
  const NOPLAY = /\.(mkv|avi|wmv|flv|ts)(\?|#|$)/i;
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
    if (NOPLAY.test(url)) { toast2('⚠️ فرمت mkv/avi توی مرورگر پخش نمی‌شه؛ فایل mp4 یا webm بده'); return; }
    const cat = ($('wtCat') && $('wtCat').value) || 'movie', direct = !!($('wtDirect') && $('wtDirect').checked) || VIDEO_RE.test(url);
    title = title || decodeURIComponent((url.split('?')[0].split('/').pop() || 'فیلم').replace(/\.[^.]+$/, '')).slice(0, 80) || 'فیلم';
    if ($('wtSave') && $('wtSave').checked) saveToArchive(title, url, cat);
    create({ id: '', title, url, category: cat, direct });
  }
  async function startFromFile(file) {
    if (!file) return; if (!/^video\//.test(file.type) && !VIDEO_RE.test(file.name || '')) { toast2('⚠️ این فایل ویدیو نیست'); return; }
    if (file.size > 200 * 1024 * 1024) { toast2('⚠️ فایل بزرگه! حداکثر ۲۰۰ مگابایت'); return; }
    if (!/\.(mp4|webm|m4v|mov|ogv)$/i.test(file.name || '')) toast2('ℹ️ فقط mp4 / webm / mov توی همهٔ مرورگرها پخش می‌شه');
    const cat = ($('wtCat') && $('wtCat').value) || 'movie', title = (file.name || 'فیلم').replace(/\.[^.]+$/, '').slice(0, 80); toast2('⏳ در حال آپلود فیلم… (پیشرفتش پایین صفحه‌ست)');
    try {
      const ext = ((file.name || '').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
      const up = await uploadMediaFile(file, ext, file.name); if ($('wtSave') && $('wtSave').checked) saveToArchive(title, up.url, cat);
      create({ id: '', title, url: up.url, category: cat, direct: true });
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
.wt-stage{position:relative;border-radius:14px;overflow:hidden;background:#000;min-height:120px}
.wt-stage video{display:block;width:100%;max-height:340px;background:#000}
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
.wt-stage video::cue{font-size:1.1em;background:rgba(0,0,0,.7);color:#fff}
@media (min-width:900px){.vc-area-watch{grid-column:1 / -1}}`;

  function ensureCss() { if ($('wtCss')) return; const st = document.createElement('style'); st.id = 'wtCss'; st.textContent = CSS; document.head.appendChild(st); }

  function render() {
    const box = $('watchBox'); if (!box) return;
    ensureCss();
    if (box.dataset.rid === (room ? room.id : '') && room && isVideo() && vid()) { renderPeople(); return; }  // ویدیو رو دوباره نساز
    box.dataset.rid = room ? room.id : '';
    if (!room) { box.innerHTML = renderIdle(); bind(); return; }
    const r = room;
    const stage = isVideo()
      ? `<div class="wt-stage" id="wtStage"><video id="wtVideo" src="${esc(r.item.url)}" controls playsinline preload="metadata"></video></div>`
      : `<div class="wt-stage" id="wtStage"><div class="wt-clock" id="wtClock"></div></div>`;
    box.innerHTML = `<div class="wt-h">🍿 اتاق تماشا: «${esc(r.item.title)}» <span class="sp"></span><small style="color:var(--muted,#aaa)">ساخته‌شده توسط ${esc(r.by || '')}</small></div>
      <div class="wt-body">${stage}
        ${isVideo() ? '<div class="wt-sub" id="wtSub"></div>' : '<div class="wt-sec">💬 زیرنویس فقط برای فیلم‌های لینک مستقیم/آپلودی فعاله.</div>'}
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
          <div class="wt-row"><input type="text" id="wtLink" dir="ltr" inputmode="url" placeholder="لینک مستقیم فیلم (…mp4 یا webm)" /><input type="text" id="wtLinkT" maxlength="80" placeholder="اسم فیلم (اختیاری)" /></div>
          <div class="wt-row"><select id="wtCat"><option value="movie">🎬 فیلم</option><option value="series">📺 سریال</option></select><label><input type="checkbox" id="wtDirect" /> لینک مستقیم ویدیوئه (بدون پسوند mp4)</label><label><input type="checkbox" id="wtSave" checked /> توی آرشیو هم بمونه</label></div>
          <div class="wt-row"><button type="button" class="btn" data-wt="link">▶️ شروع تماشا با لینک</button><button type="button" class="btn ghost" data-wt="up">📤 آپلود فیلم از سیستم</button><input type="file" id="wtUp" accept="video/*,.mp4,.webm,.mov,.m4v" hidden /></div>
          <div class="wt-sec">لینک سایت‌هایی مثل یوتیوب یا آپارات مستقیم نیستن؛ برای اونا از آرشیو استفاده کن تا «ساعت مشترک» همگامشون کنه. mkv و avi توی مرورگر پخش نمی‌شن.</div></div>
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
      else if (a === 'close') { if (confirm('اتاق تماشا برای هر دو بسته بشه؟')) closeRoom(true, false); }
    });
    const wu = $('wtUp'); if (wu) wu.onchange = () => { const f = wu.files && wu.files[0]; wu.value = ''; startFromFile(f); };
    box.querySelectorAll('[data-wid]').forEach(b => b.onclick = () => { const it = moviesFromArchive().find(x => x.id === b.dataset.wid); if (it) create(it); });
    box.querySelectorAll('[data-re]').forEach(b => b.onclick = () => react(b.dataset.re));
  }
  function bindVideo() {
    const v = vid(); if (!v) return;
    ['play', 'pause', 'seeked'].forEach(ev => v.addEventListener(ev, () => { local(); }));
    ['waiting', 'playing', 'stalled', 'canplay'].forEach(ev => v.addEventListener(ev, sendStat));
    v.addEventListener('ended', () => { sendStat(); if (!closing) finish(); });
    v.addEventListener('error', () => toast2('⚠️ این ویدیو توی سایت پخش نشد؛ لینکش مستقیم نیست یا قفله'));
    keepHb();
    subCache = subCache; activeSub = (room.subs && room.subs[0] && room.subs[0].id) || ''; subShift = 0;
    Promise.all((room.subs || []).map(prepSub)).then(() => { mountSubs(); renderSubUi(); });
  }

  function load() {
    join();
    if (!seenLoaded) loadSeen(); else render();
    if (typeof funLoaded !== 'undefined' && !funLoaded && typeof loadFun === 'function') loadFun().then(() => { if (!room) render(); });
  }
  function init() { if (inited) return; inited = true; ensureCss(); setTimeout(join, 2500); }
  window.Watch = { load, create, isSeen, init, _room: () => room, _state: () => ({ room, peers, P, cd, watchedSec, seen }), _id: ID, finish, close: () => closeRoom(true, false) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
