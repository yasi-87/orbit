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
      toast2('🍿 ' + (p.name || 'اون یکی') + ' اتاق تماشای «' + (p.room.item.title || '') + '» رو ساخت');
      try { window.OMSound && OMSound.play('up'); } catch (e) {}
      return;
    }
    if (!room || p.rid !== room.id) { return; }
    if (p.t === 'state') applyState(p);
    else if (p.t === 'stat') { peers[p.from] = { name: p.name, st: p.st, pos: p.pos, ts: Date.now() }; renderPeople(); }
    else if (p.t === 'react') floatReact(p.e, p.name);
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
    const r = { id: 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), item: { id: item.id, title: item.title, url: item.url, category: item.category }, mode: VIDEO_RE.test(item.url) ? 'video' : 'clock', by: nm(), at: Date.now() };
    picker = false;
    const go = () => { openRoom(r, true); toast2('🍿 اتاق تماشا ساخته شد؛ اون یکی هم توی سایت باشه، اتاق براش باز می‌شه'); };
    go();
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'voice' && typeof showScreen === 'function') showScreen('voice');
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
        <div class="wt-react" id="wtReact">${REACTS.map(e => `<button type="button" data-re="${e}" aria-label="واکنش ${e}">${e}</button>`).join('')}</div>
        <div class="wt-people" id="wtPeople"></div>
        <div class="wt-sec">💬 برای چت کردن موقع تماشا، از چت کنار اتاق صحبت استفاده کنید.</div>
        <div class="wt-act"><button type="button" class="btn" data-wt="finish">🏁 تموم شد؛ ثبت توی دیده‌شده‌ها</button><button type="button" class="btn ghost" data-wt="close">✕ بستن اتاق</button></div>
      </div>${renderSeen()}`;
    bind(); bindVideo(); renderClock(); renderPeople();
  }
  function renderIdle() {
    const list = moviesFromArchive();
    return `<div class="wt-h">🍿 اتاق تماشا <span class="sp"></span><button type="button" class="btn" data-wt="pick">🎬 انتخاب فیلم از آرشیو سرگرمی</button></div>
      <div class="wt-body">
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
      else if (a === 'close') { if (confirm('اتاق تماشا برای هر دو بسته بشه؟')) closeRoom(true, false); }
    });
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
