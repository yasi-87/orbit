/* 🎨 Our Canvas: دو نفر، یک شاهکار.
   بوم نقاشی مشترک و زنده (Supabase Realtime) با ابزار، رنگ، استیکر، متن، حالت‌های بازی (نوبتی، نیمه‌نیمه، حدس بزن، زمان‌دار، مخفی)،
   ذخیرهٔ خودکار، گالری، پخش دوبارهٔ نقاشی، دانلود PNG، کامنت و علاقه‌مندی.
   جدول‌ها: canvas_live (بوم فعلی) و canvas_art (گالری) ← SQL شمارهٔ ۲۴. بخش‌های «هوش مصنوعی» اینجا نسخهٔ محلی/سرگرمی هستن (بدون سرویس هوش مصنوعی). */
(function () {
  'use strict';
  const W = 1200, H = 840, ID = Math.random().toString(36).slice(2, 9);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const same = (a, b) => { try { return Recur.sameName(a, b); } catch (e) { return a === b; } };
  const toast2 = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const COLORS = ['#1a1a1a', '#ffffff', '#ff4d6d', '#ff8fb8', '#ff9f43', '#ffd93d', '#6bcB77', '#2ec4b6', '#4d96ff', '#9b5de5', '#d4a5ff', '#8b5a2b'];
  const STICKERS = ['❤️', '💜', '⭐', '✨', '🌸', '🌷', '🌻', '🐰', '🐱', '🐻', '🦋', '🌙', '☀️', '☁️', '🎀', '🍓', '🎈', '😍', '🥰', '😂', '😎', '🔥'];
  const BGS = { white: 'سفید', cream: 'کرم', night: 'شب', grid: 'شطرنجی', dots: 'نقطه‌ای', lines: 'خط‌دار', sky: 'آسمان', pink: 'صورتی' };
  const TOPICS = ['خونهٔ رویایی ما', 'سفر بعدی ما', 'یه گربهٔ بامزه', 'غروب کنار دریا', 'شهر بالای ابرها', 'پیک‌نیک توی باغ', 'ربات مهربون', 'جنگل جادویی', 'کافهٔ دنج', 'شب پر ستاره', 'حیوون خونگی رویایی', 'قلعهٔ شیرینی', 'باغ گل‌ها', 'فضانورد عاشق', 'بارون و چتر', 'ماشین قدیمی', 'کوه و برف', 'جزیرهٔ دنج', 'پرنده‌ای که حرف می‌زنه', 'اتاق مطالعهٔ ما', 'سوپرمن بامزه', 'کیک تولد', 'دوچرخه‌سواری', 'کوچه‌ای توی پاییز', 'اژدهای مهربون', 'غذای مورد علاقه‌مون', 'خواب‌های ما', 'عروسک بزرگ', 'ماهی‌های رنگی', 'دفتر خاطرات'];
  const WORDS = ['گربه', 'خرگوش', 'خونه', 'ماه', 'ستاره', 'قلب', 'گل', 'درخت', 'ماشین', 'کیک', 'چتر', 'پروانه', 'دوچرخه', 'بستنی', 'قایق', 'کوه', 'موز', 'هواپیما', 'ساعت', 'کتاب', 'گیتار', 'کفش', 'ابر', 'خورشید', 'ماهی', 'مداد', 'عینک', 'تاج', 'پیتزا', 'بادکنک'];
  const ADJ = ['رویایی', 'بامزه', 'عاشقانه', 'آسمونی', 'شیرین', 'جادویی', 'کوچولو', 'بی‌نظیر', 'خنده‌دار', 'دنج'];
  const NOUN = ['شاهکارِ ما', 'خاطرهٔ رنگی', 'قصهٔ یه روز', 'لبخندِ دو نفره', 'نقاشیِ دونفره', 'رنگینِ کمونِ ما', 'دنیای کوچولوی ما', 'باغِ خیال'];

  /* ---------- وضعیت ---------- */
  let ch = null, subscribed = false, inited = false, built = false, tab = 'draw';
  let strokes = [], secretStrokes = [], redo = [], secret = false;
  let meta = { mode: 'free', topic: '', bg: 'cream', turn: '', half: null, timerEnd: 0, drawer: '' };
  let tool = 'pen', color = '#ff4d6d', size = 6, alpha = 1, stickerPick = '❤️', sigMode = false;
  let peers = {}, cursors = {}, remote = {}, mine = null, guessWord = '', guessFeed = [];
  let base, bctx, work, wctx, bgc, bgctx, stage;
  let dirty = true, saveT = null, saveState = '', liveMissing = false, artMissing = false, gallery = [], galleryLoaded = false;
  let pend = [], sendT = null, curT = 0, timerI = null, timerDone = 0, theme = jget('diary_cv_theme', 'dream'), light = jget('diary_cv_light', false);
  const myThumbKey = 'diary_cv_partner';

  const send = p => { if (secret) return; try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'cv', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  const cur = () => secret ? secretStrokes : strokes;

  /* ---------- رسم ---------- */
  function paintBg(ctx, id) {
    ctx.save();
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
    if (id === 'white') fill('#ffffff');
    else if (id === 'night') fill('#14122a');
    else if (id === 'sky') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9bd1ff'); g.addColorStop(1, '#fff3d6'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (id === 'pink') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffd6e8'); g.addColorStop(1, '#e6d4ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else {
      fill('#fff8ec');
      if (id === 'grid') { ctx.strokeStyle = 'rgba(120,100,160,.22)'; ctx.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
      if (id === 'dots') { ctx.fillStyle = 'rgba(120,100,160,.35)'; for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } }
      if (id === 'lines') { ctx.strokeStyle = 'rgba(80,120,200,.3)'; ctx.lineWidth = 1.5; for (let y = 60; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
    }
    ctx.restore();
  }
  function drawStroke(ctx, s) {
    ctx.save();
    if (s.t === 'st') { ctx.font = s.size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.e, s.x, s.y); ctx.restore(); return; }
    if (s.t === 'tx') {
      ctx.font = (s.sig ? 'italic ' : 'bold ') + s.size + 'px ' + (s.sig ? '"Brush Script MT","Segoe Script",cursive' : '"Vazirmatn",Tahoma,sans-serif');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = s.color; ctx.direction = 'rtl'; ctx.fillText(s.text, s.x, s.y); ctx.restore(); return;
    }
    const pts = s.pts || []; if (!pts.length) { ctx.restore(); return; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    let lw = s.size, al = s.alpha == null ? 1 : s.alpha;
    if (s.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; al = 1; lw = s.size * 2.2; }
    else if (s.tool === 'hl') { al = Math.min(al, 0.4); lw = s.size * 3; ctx.lineCap = 'square'; }
    else if (s.tool === 'brush') { ctx.shadowBlur = s.size * 0.7; ctx.shadowColor = s.color; lw = s.size * 1.4; }
    ctx.globalAlpha = al; ctx.lineWidth = lw;
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], lw / 2, 0, 7); ctx.fill(); ctx.restore(); return; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke(); ctx.restore();
  }
  function rebuild() { bctx.clearRect(0, 0, W, H); cur().forEach(s => drawStroke(bctx, s)); dirty = true; }
  function frame() {
    if (dirty && wctx) {
      wctx.clearRect(0, 0, W, H); wctx.drawImage(base, 0, 0);
      Object.keys(remote).forEach(k => drawStroke(wctx, remote[k]));
      if (mine) drawStroke(wctx, mine);
      if (meta.mode === 'half' && meta.half && !secret) { wctx.save(); wctx.setLineDash([14, 12]); wctx.strokeStyle = 'rgba(160,120,220,.7)'; wctx.lineWidth = 3; wctx.beginPath(); wctx.moveTo(W / 2, 0); wctx.lineTo(W / 2, H); wctx.stroke(); wctx.restore(); }
      dirty = false;
    }
    if (built) requestAnimationFrame(frame); else frameOn = false;
  }
  let frameOn = false;
  const startFrame = () => { if (!frameOn) { frameOn = true; requestAnimationFrame(frame); } };

  /* ---------- قوانین حالت‌ها ---------- */
  const partnerName = () => { const k = Object.keys(peers).find(k => !same(peers[k].name, nm())); return k ? peers[k].name : ''; };
  function deny(x) {
    if (secret) return '';
    if (meta.timerEnd && Date.now() > meta.timerEnd) return '⏰ وقت تموم شده';
    if (meta.mode === 'turn' && meta.turn && !same(meta.turn, nm())) return '⏳ نوبت ' + meta.turn + ' ـه';
    if (meta.mode === 'guess' && meta.drawer && !same(meta.drawer, nm())) return '🤔 تو باید حدس بزنی، نقاش ' + meta.drawer + ' ـه';
    if (meta.mode === 'half' && meta.half) {
      const L = same(meta.half.L, nm()), R = same(meta.half.R, nm());
      if (x != null && L && x > W / 2) return '↔️ این نیمهٔ اون یکیه';
      if (x != null && R && x < W / 2) return '↔️ این نیمهٔ اون یکیه';
      if (!L && !R) return '↔️ هر نیمه مال یک نفره';
    }
    return '';
  }

  /* ---------- پوینتر ---------- */
  const pos = e => { const r = work.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]; };
  function pDown(e) {
    if (e.button != null && e.button > 0) return; e.preventDefault();
    const p = pos(e), d = deny(p[0]); if (d) { toast2(d); return; }
    if (sigMode) { sigMode = false; place({ t: 'tx', text: jget('diary_cv_sig', '') || nm(), x: p[0], y: p[1], size: Math.max(40, size * 5), color, sig: true }); renderTools(); return; }
    if (tool === 'sticker') { place({ t: 'st', e: stickerPick, x: p[0], y: p[1], size: Math.max(40, size * 6) }); return; }
    if (tool === 'text') { const t = prompt('چی بنویسم روی نقاشی؟'); if (t && t.trim()) place({ t: 'tx', text: t.trim().slice(0, 60), x: p[0], y: p[1], size: Math.max(28, size * 4), color }); return; }
    try { work.setPointerCapture(e.pointerId); } catch (_) {}
    mine = { id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by: nm(), t: 'p', tool, color, size, alpha, pts: [p], ts: Date.now() };
    pend = [p]; dirty = true; sendSeg(true);
  }
  function pMove(e) {
    const p = pos(e);
    const now = Date.now(); if (now - curT > 70 && !secret) { curT = now; send({ t: 'cur', x: p[0] / W, y: p[1] / H }); }
    if (!mine) return; e.preventDefault();
    const l = mine.pts[mine.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 2) return;
    if (deny(p[0])) return;
    mine.pts.push(p); pend.push(p); dirty = true;
    if (!sendT) sendT = setTimeout(() => { sendT = null; sendSeg(false); }, 50);
  }
  function pUp() {
    if (!mine) return; clearTimeout(sendT); sendT = null; sendSeg(false);
    const s = mine; mine = null; commit(s); send({ t: 'end', id: s.id });
  }
  function sendSeg(first) {
    if (!mine || (!pend.length && !first)) return;
    const m = { t: 'seg', id: mine.id, pts: pend };
    if (first) Object.assign(m, { tool: mine.tool, color: mine.color, size: mine.size, alpha: mine.alpha, by: mine.by, first: 1 });
    send(m); pend = [];
  }
  function commit(s) {
    if (!s || cur().some(x => x.id === s.id)) return;
    if (s.pts && s.pts.length > 1500) s.pts = s.pts.filter((_, i) => i % 2 === 0);
    cur().push(s); drawStroke(bctx, s); dirty = true; if (s.by && same(s.by, nm())) redo = []; changed();
  }
  function place(s) {
    s.id = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); s.by = nm(); s.ts = Date.now();
    commit(s); send({ t: 'add', s }); try { OMSound.play('send'); } catch (e) {}
  }

  /* ---------- پیام‌های زنده ---------- */
  function join() {
    if (ch || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ch = dbClient.channel('our-canvas', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'cv' }, m => recv(m && m.payload))
        .on('presence', { event: 'sync' }, presence)
        .subscribe(st => { if (st === 'SUBSCRIBED') { subscribed = true; track(); render(); } });
    } catch (e) { console.warn('canvas off', e); ch = null; }
  }
  let thumb = '', thumbSrc = '';
  function track() {
    const go = () => { try { ch.track({ name: nm(), av: thumb }); } catch (e) {} };
    const src = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    if (!src || src === thumbSrc) return go();
    const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 72; const x = c.getContext('2d'); const s = Math.min(im.width, im.height); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 72, 72); const u = c.toDataURL('image/jpeg', 0.6); if (u.length < 9000) thumb = u; thumbSrc = src; } catch (e) {} go(); };
    im.onerror = go; im.src = src;
  }
  function presence() {
    if (!ch) return;
    let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    const old = Object.keys(peers).length; peers = {};
    Object.keys(st).forEach(k => { if (k !== ID && st[k] && st[k][0]) peers[k] = { name: st[k][0].name || 'یکی از ما', av: st[k][0].av || '' }; });
    const pn = partnerName(); if (pn) { const k = Object.keys(peers).find(k => same(peers[k].name, pn)); jset(myThumbKey, { name: pn, av: peers[k].av }); }
    if (Object.keys(peers).length > old && built) { toast2('🎨 ' + (pn || 'اون یکی') + ' اومد توی بوم'); try { OMSound.play('up'); } catch (e) {} }
    if (meta.mode === 'half' && meta.half && !meta.half.R && meta.half.L && !same(meta.half.L, nm())) setMeta({ half: Object.assign({}, meta.half, { R: nm() }) });
    renderHeader();
  }
  function recv(p) {
    if (!p || p.from === ID) return;
    if (p.t === 'seg') {
      let s = remote[p.id];
      if (!s) { if (!p.first && !p.tool) return; s = remote[p.id] = { id: p.id, by: p.by || p.name, t: 'p', tool: p.tool || 'pen', color: p.color || '#000', size: p.size || 6, alpha: p.alpha == null ? 1 : p.alpha, pts: [], ts: Date.now(), at: Date.now() }; }
      (p.pts || []).forEach(q => s.pts.push(q)); s.at = Date.now(); dirty = true;
    } else if (p.t === 'end') { const s = remote[p.id]; if (s) { delete remote[p.id]; commit(s); } }
    else if (p.t === 'add') { if (p.s) { commit(p.s); } }
    else if (p.t === 'undo') { const n = strokes.length; strokes = strokes.filter(s => s.id !== p.id); if (strokes.length !== n && !secret) { rebuild(); changed(true); } else if (strokes.length !== n) { changed(true); } }
    else if (p.t === 'clear') { strokes = []; if (!secret) rebuild(); changed(true); toast2('🧹 ' + p.name + ' بوم رو پاک کرد'); }
    else if (p.t === 'meta') { applyMeta(p.meta, true); }
    else if (p.t === 'cur') { showCursor(p); }
    else if (p.t === 'guess') { onGuess(p); }
    else if (p.t === 'gres') { guessFeed.push({ name: p.name, text: p.text, ok: p.ok }); guessFeed = guessFeed.slice(-6); if (p.ok) { win(p.word); } renderMode(); }
    else if (p.t === 'saved') { if (galleryLoaded) loadGallery(); toast2('💾 ' + p.name + ' نقاشی رو توی گالری ذخیره کرد'); fx(24); }
    else if (p.t === 'reload') { loadLive(true); }
  }
  setInterval(() => { const n = Date.now(); Object.keys(remote).forEach(k => { if (n - remote[k].at > 8000) { delete remote[k]; dirty = true; } }); Object.keys(cursors).forEach(k => { if (n - cursors[k].at > 3500) { cursors[k].el.style.display = 'none'; } }); }, 2000);
  function showCursor(p) {
    if (!stage) return; let c = cursors[p.from];
    if (!c) { const el = document.createElement('div'); el.className = 'cv-cur'; el.innerHTML = '<i></i><b></b>'; stage.appendChild(el); c = cursors[p.from] = { el }; }
    c.el.style.display = ''; c.el.style.left = (p.x * 100) + '%'; c.el.style.top = (p.y * 100) + '%'; c.el.querySelector('b').textContent = p.name || ''; c.at = Date.now();
  }

  /* ---------- مِتا (حالت‌ها) ---------- */
  function setMeta(patch) { applyMeta(Object.assign({}, meta, patch), false); send({ t: 'meta', meta }); changed(true); }
  function applyMeta(m, fromRemote) {
    if (!m) return; const prevBg = meta.bg;
    meta = Object.assign({ mode: 'free', topic: '', bg: 'cream', turn: '', half: null, timerEnd: 0, drawer: '' }, m);
    if (bgctx && meta.bg !== prevBg) { bgctx.clearRect(0, 0, W, H); paintBg(bgctx, meta.bg); }
    if (meta.mode !== 'guess') { guessWord = ''; }
    if (meta.mode === 'guess' && same(meta.drawer, nm()) && !guessWord) guessWord = rnd(WORDS);
    if (meta.mode === 'half' && meta.half && !meta.half.R && meta.half.L && !same(meta.half.L, nm()) && fromRemote) { meta.half = Object.assign({}, meta.half, { R: nm() }); send({ t: 'meta', meta }); }
    dirty = true; renderMode(); renderHeader(); renderBgs();
  }
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  function modeSet(mode) {
    if (secret) { toast2('اول از حالت مخفی بیا بیرون'); return; }
    const pn = partnerName();
    if (mode === 'free') setMeta({ mode, turn: '', half: null, drawer: '', timerEnd: 0 });
    else if (mode === 'turn') { setMeta({ mode, turn: nm(), half: null, drawer: '', timerEnd: 0 }); toast2('🖌️ نوبتی شد؛ اول تو بکش و بعد «نوبتم تموم شد» رو بزن'); }
    else if (mode === 'half') { setMeta({ mode, half: { L: nm(), R: pn || '' }, turn: '', drawer: '', timerEnd: 0 }); toast2('↔️ تو نیمهٔ چپ، اون یکی نیمهٔ راست'); }
    else if (mode === 'guess') { if (strokes.length && !confirm('برای بازی حدس بزن، بوم پاک بشه؟')) return; strokes = []; rebuild(); send({ t: 'clear' }); guessWord = rnd(WORDS); guessFeed = []; setMeta({ mode, drawer: nm(), turn: '', half: null, timerEnd: 0 }); }
    else if (mode === 'timed') { const m = timedMin || 2; timerDone = 0; setMeta({ mode: 'timed', timerEnd: Date.now() + m * 60000, turn: '', half: null, drawer: '' }); toast2('⏱️ ' + fa(m) + ' دقیقه وقت داریم؛ بکشیم!'); }
  }
  function passTurn() { const pn = partnerName(); if (!pn) { toast2('اون یکی توی بوم نیست'); return; } setMeta({ turn: pn }); toast2('✅ نوبت به ' + pn + ' رسید'); }
  function onGuess(p) {
    if (meta.mode !== 'guess' || !same(meta.drawer, nm()) || !guessWord) return;
    const n = s => String(s || '').replace(/[\s‌ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
    const ok = n(p.text) === n(guessWord);
    guessFeed.push({ name: p.name, text: p.text, ok }); guessFeed = guessFeed.slice(-6);
    send({ t: 'gres', text: p.text, ok, word: ok ? guessWord : '' }); if (ok) win(guessWord); renderMode();
  }
  function win(word) { toast2('🎉 درست حدس زده شد: «' + word + '»'); fx(36); try { OMSound.play('up'); } catch (e) {} if (same(meta.drawer, nm())) { guessWord = rnd(WORDS); } }
  function myGuess() {
    const i = $('cvGuessIn'); const t = i && i.value.trim(); if (!t) return;
    guessFeed.push({ name: nm(), text: t, ok: false }); guessFeed = guessFeed.slice(-6); send({ t: 'guess', text: t }); i.value = ''; renderMode();
  }

  /* ---------- ذخیره و بارگذاری ---------- */
  function changed(silent) { redoUi(); if (secret) return; scheduleSave(); }
  function scheduleSave() { clearTimeout(saveT); setSave('⏳'); saveT = setTimeout(saveLive, 1500); }
  const setSave = s => { saveState = s; const e = $('cvSaveDot'); if (e) { e.classList.toggle('ok', s === '✓'); e.title = s === '✓' ? 'ذخیره شد' : s === '!' ? 'فقط روی همین دستگاه ذخیره شد' : s ? 'در حال ذخیره…' : 'ذخیرهٔ خودکار'; } };
  async function saveLive() {
    const row = { id: 'current', strokes: JSON.stringify(strokes), meta: JSON.stringify(meta), updated_at: Date.now() };
    jset('diary_cv_live', { strokes, meta });
    try { const { error } = await dbClient.from('canvas_live').upsert(row); if (error) { liveMissing = /canvas_live|relation|schema cache/i.test(error.message || ''); setSave('!'); render(); return; } liveMissing = false; setSave('✓'); } catch (e) { setSave('!'); }
  }
  async function loadLive(quiet) {
    let data = null;
    try { const r = await dbClient.from('canvas_live').select('*').eq('id', 'current').maybeSingle(); if (r.error) { liveMissing = /canvas_live|relation|schema cache/i.test(r.error.message || ''); } else { liveMissing = false; data = r.data; } } catch (e) {}
    if (data) { try { strokes = JSON.parse(data.strokes || '[]'); applyMeta(JSON.parse(data.meta || '{}'), true); } catch (e) {} }
    else { const l = jget('diary_cv_live', null); if (l && !strokes.length) { strokes = l.strokes || []; applyMeta(l.meta || meta, true); } else applyMeta(meta, true); }
    if (!secret) rebuild(); redoUi(); render();
  }

  async function exportCanvas(filter) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    paintBg(x, meta.bg); x.drawImage(base, 0, 0);
    if (filter) applyFilter(c, filter);
    return c;
  }
  function applyFilter(c, f) {
    const x = c.getContext('2d');
    try {
      if (f === 'cartoon') {
        const d = x.getImageData(0, 0, W, H), a = d.data, lv = 5, st = 255 / (lv - 1);
        for (let i = 0; i < a.length; i += 4) { a[i] = Math.round(a[i] / st) * st; a[i + 1] = Math.round(a[i + 1] / st) * st; a[i + 2] = Math.round(a[i + 2] / st) * st; }
        x.putImageData(d, 0, 0); x.save(); x.globalCompositeOperation = 'multiply'; x.filter = 'saturate(1.5) contrast(1.1)'; x.drawImage(c, 0, 0); x.restore();
      } else if (f === 'sketch') {
        const g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d');
        gx.filter = 'grayscale(1)'; gx.drawImage(c, 0, 0); gx.filter = 'none';
        const iv = document.createElement('canvas'); iv.width = W; iv.height = H; const ix = iv.getContext('2d'); ix.filter = 'grayscale(1) invert(1) blur(5px)'; ix.drawImage(c, 0, 0);
        x.clearRect(0, 0, W, H); x.drawImage(g, 0, 0); x.globalCompositeOperation = 'color-dodge'; x.drawImage(iv, 0, 0); x.globalCompositeOperation = 'source-over';
      } else if (f === 'soft') { const t = document.createElement('canvas'); t.width = W; t.height = H; t.getContext('2d').drawImage(c, 0, 0); x.clearRect(0, 0, W, H); x.filter = 'blur(1.5px) saturate(1.25) brightness(1.06)'; x.drawImage(t, 0, 0); x.filter = 'none'; }
    } catch (e) { console.warn('filter', e); }
  }
  const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));
  const titleIdea = () => (Math.random() < .5 ? rnd(NOUN) + ' ' + rnd(ADJ) : rnd(ADJ) + ' ' + rnd(NOUN).replace('ِ ما', '')) + (meta.topic && Math.random() < .5 ? ' · ' + meta.topic : '');

  async function saveToGallery(opts) {
    opts = opts || {};
    if (!cur().length) { toast2('بوم خالیه؛ اول یه چیزی بکش 🎨'); return; }
    const filter = filterSel || '';
    let title = opts.title; if (title == null) { title = prompt('اسم این نقاشی چی باشه؟', titleIdea()); if (title === null) return; }
    title = (title.trim() || titleIdea()).slice(0, 80);
    let reveal = 0;
    if (secret) { const h = prompt('چند ساعت دیگه برای نفر مقابل نمایش داده بشه؟', '24'); if (h === null) return; reveal = Date.now() + Math.max(0.05, Number(h) || 24) * 3600000; }
    toast2('⏳ در حال ذخیره…');
    try {
      const blob = await blobOf(await exportCanvas(filter));
      const up = await uploadMediaFile(blob, 'png', 'canvas.png');
      const row = { id: opts.id || ('cv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)), title, url: up.url, path: up.path, strokes: JSON.stringify(cur()), bg: meta.bg, author: secret ? nm() : (partnerName() ? nm() + ' و ' + partnerName() : nm()), created_at: Date.now(), fav: false, comments: '[]', reveal_at: reveal || null, topic: meta.topic || '', mode: secret ? 'secret' : meta.mode };
      const { error } = await dbClient.from('canvas_art').upsert(row);
      if (error) { artMissing = /canvas_art|relation|schema cache/i.test(error.message || ''); try { await dbClient.storage.from('songs').remove([up.path]); } catch (e) {} throw error; }
      artMissing = false; gallery = gallery.filter(g => g.id !== row.id); gallery.unshift(Object.assign({}, row, { strokes: undefined }));
      fx(opts.finish ? 40 : 18); toast2(secret ? '🔒 نقاشی مخفی ذخیره شد و سر وقتش نمایش داده می‌شه' : (opts.finish ? '🏁 نقاشی تموم شد و توی گالری ذخیره شد 💞' : '💾 توی گالری ذخیره شد ✨'));
      if (!secret) send({ t: 'saved' });
      if (secret) { secret = false; secretStrokes = []; rebuild(); renderMode(); renderTools(); renderAct(); }
      try { window.CatPal && CatPal.act('link'); } catch (e) {}
      renderGallery();
    } catch (e) { console.error(e); toast2('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'canvas_art') : 'ذخیره نشد') + (artMissing ? ' (SQL شمارهٔ ۲۴ اجرا نشده)' : '')); }
  }
  async function download() {
    const c = await exportCanvas(filterSel || ''); const b = await blobOf(c);
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'our-canvas-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- گالری ---------- */
  async function loadGallery() {
    try {
      const r = await dbClient.from('canvas_art').select('id,title,url,path,bg,author,created_at,fav,comments,reveal_at,topic,mode').order('created_at', { ascending: false }).limit(200);
      if (r.error) { artMissing = /canvas_art|relation|schema cache/i.test(r.error.message || ''); } else { artMissing = false; gallery = r.data || []; galleryLoaded = true; }
    } catch (e) {}
    renderGallery();
  }
  const dateOf = ts => { try { const w = Recur.epochToWall(ts); return Recur.fmtJalaliShort(w.iso); } catch (e) { return ''; } };
  const locked = g => g.reveal_at && Number(g.reveal_at) > Date.now() && !same(g.author, nm());
  function renderGallery() {
    const el = $('cvGal'); if (!el) return;
    if (artMissing) { el.innerHTML = '<div class="cv-empty">🛠️ برای گالری باید SQL شمارهٔ ۲۴ رو یک بار توی Supabase اجرا کنی.</div>'; return; }
    if (!gallery.length) { el.innerHTML = '<div class="cv-empty">هنوز نقاشی‌ای ذخیره نکردیم… اولین شاهکارمون رو بکشیم 🎨</div>'; return; }
    const favs = gallery.filter(g => g.fav).length;
    el.innerHTML = `<div class="cv-gal-top">${fa(gallery.length)} نقاشی · ❤️ ${fa(favs)} مورد علاقه <label><input type="checkbox" id="cvFavOnly" ${galFav ? 'checked' : ''}/> فقط علاقه‌مندی‌ها</label></div><div class="cv-grid">` + gallery.filter(g => !galFav || g.fav).map(g => {
      const lk = locked(g); const left = lk ? Math.ceil((Number(g.reveal_at) - Date.now()) / 3600000) : 0;
      let cm = 0; try { cm = JSON.parse(g.comments || '[]').length; } catch (e) {}
      return `<div class="cv-card" data-id="${esc(g.id)}">${lk ? `<div class="cv-lock">🔒<small>غافلگیری! حدود ${fa(left)} ساعت دیگه</small></div>` : `<img src="${esc(g.url)}" alt="${esc(g.title)}" loading="lazy" data-open="${esc(g.id)}">`}
        <div class="cv-ct"><b>${esc(lk ? 'نقاشی مخفی' : g.title)}</b><small>${esc(g.author || '')} · ${esc(dateOf(g.created_at))}</small></div>
        <div class="cv-ca"><button type="button" data-fav="${esc(g.id)}" title="علاقه‌مندی">${g.fav ? '❤️' : '🤍'}</button>${lk ? '' : `<button type="button" data-open="${esc(g.id)}" title="دیدن و کامنت">💬${cm ? ' ' + fa(cm) : ''}</button><button type="button" data-dl="${esc(g.id)}" title="دانلود">⬇️</button>`}<button type="button" data-del="${esc(g.id)}" title="حذف">🗑️</button></div></div>`;
    }).join('') + '</div>';
    const fo = $('cvFavOnly'); if (fo) fo.onchange = () => { galFav = fo.checked; renderGallery(); };
  }
  let galFav = false;
  async function toggleFav(id) { const g = gallery.find(x => x.id === id); if (!g) return; g.fav = !g.fav; renderGallery(); try { await dbClient.from('canvas_art').update({ fav: g.fav }).eq('id', id); } catch (e) {} }
  async function delArt(id) {
    if (!confirm('این نقاشی برای هر دو حذف بشه؟')) return; const g = gallery.find(x => x.id === id); if (!g) return;
    try { const { error } = await dbClient.from('canvas_art').delete().eq('id', id); if (error) throw error; if (g.path) dbClient.storage.from('songs').remove([g.path]); gallery = gallery.filter(x => x.id !== id); renderGallery(); toast2('🗑️ حذف شد'); } catch (e) { toast2('⚠️ حذف نشد'); }
  }
  async function dlArt(id) { const g = gallery.find(x => x.id === id); if (!g) return; try { const r = await fetch(g.url); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (g.title || 'canvas') + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) { window.open(g.url, '_blank'); } }

  /* نمایش یک نقاشی + پخش دوبارهٔ مراحل + کامنت */
  let rpTimer = null;
  async function openArt(id) {
    const g = gallery.find(x => x.id === id); if (!g || locked(g)) return;
    const d = document.createElement('div'); d.className = 'cv-modal'; d.innerHTML = `<div class="cv-mbox"><button type="button" class="cv-x" aria-label="بستن">✕</button><h3>${esc(g.title)}</h3><small>${esc(g.author || '')} · ${esc(dateOf(g.created_at))}${g.topic ? ' · موضوع: ' + esc(g.topic) : ''}</small>
      <div class="cv-mstage"><img src="${esc(g.url)}" alt=""><canvas width="${W}" height="${H}" class="cv-rp" style="display:none"></canvas></div>
      <div class="cv-row"><button type="button" class="btn" data-m="replay">▶️ پخش دوبارهٔ نقاشی</button><button type="button" class="btn ghost" data-m="dl">⬇️ دانلود</button></div>
      <div class="cv-cm" id="cvCm"></div><form class="cv-cmf"><input type="text" maxlength="200" placeholder="یه نظر قشنگ بنویس…"><button class="btn" type="submit">ارسال</button></form></div>`;
    document.body.appendChild(d);
    const close = () => { clearTimeout(rpTimer); d.remove(); };
    d.querySelector('.cv-x').onclick = close; d.addEventListener('click', e => { if (e.target === d) close(); });
    const renderCm = () => { let l = []; try { l = JSON.parse(g.comments || '[]'); } catch (e) {} d.querySelector('#cvCm').innerHTML = l.length ? l.map(c => `<div class="cv-c"><b>${esc(c.by)}</b> ${esc(c.text)} <small>${esc(dateOf(c.ts))}</small></div>`).join('') : '<div class="cv-empty" style="padding:6px">هنوز نظری نیست 💬</div>'; };
    renderCm();
    d.querySelector('.cv-cmf').onsubmit = async e => { e.preventDefault(); const i = e.target.querySelector('input'), t = i.value.trim(); if (!t) return; let l = []; try { l = JSON.parse(g.comments || '[]'); } catch (_) {} l.push({ by: nm(), text: t.slice(0, 200), ts: Date.now() }); g.comments = JSON.stringify(l); i.value = ''; renderCm(); try { await dbClient.from('canvas_art').update({ comments: g.comments }).eq('id', id); } catch (_) {} renderGallery(); };
    d.querySelector('[data-m=dl]').onclick = () => dlArt(id);
    d.querySelector('[data-m=replay]').onclick = async () => {
      let sts = null; try { const r = await dbClient.from('canvas_art').select('strokes').eq('id', id).maybeSingle(); sts = r.data && JSON.parse(r.data.strokes || '[]'); } catch (e) {}
      if (!sts || !sts.length) { toast2('مراحل این نقاشی ذخیره نشده'); return; }
      const cv = d.querySelector('.cv-rp'), img = d.querySelector('.cv-mstage img'); img.style.display = 'none'; cv.style.display = 'block'; replay(cv, sts, g.bg || 'cream', () => { img.style.display = ''; cv.style.display = 'none'; });
    };
  }
  function replay(cv, sts, bg, done) {
    clearTimeout(rpTimer);
    const x = cv.getContext('2d'), bc = document.createElement('canvas'); bc.width = W; bc.height = H; const bx = bc.getContext('2d');
    const total = sts.reduce((a, s) => a + (s.pts ? s.pts.length : 8), 0), per = Math.max(2, Math.ceil(total / (14 * 60)));
    let i = 0, n = 0;
    const draw = tmp => { x.clearRect(0, 0, W, H); paintBg(x, bg); const w = document.createElement('canvas'); w.width = W; w.height = H; const wx = w.getContext('2d'); wx.drawImage(bc, 0, 0); if (tmp) drawStroke(wx, tmp); x.drawImage(w, 0, 0); };
    (function step() {
      if (i >= sts.length) { draw(null); rpTimer = setTimeout(done, 1500); return; }
      const s = sts[i];
      if (s.t !== 'p') { drawStroke(bx, s); i++; draw(null); rpTimer = setTimeout(step, 260); return; }
      n += per; if (n >= s.pts.length) { drawStroke(bx, s); i++; n = 0; draw(null); rpTimer = setTimeout(step, 16); return; }
      draw(Object.assign({}, s, { pts: s.pts.slice(0, n) })); rpTimer = setTimeout(step, 16);
    })();
  }

  /* ---------- افکت‌ها ---------- */
  function fx(n) {
    const host = document.body, em = ['❤️', '⭐', '💜', '✨', '🌸', '💖'];
    for (let i = 0; i < n; i++) { const e = document.createElement('div'); e.className = 'cv-fx'; e.textContent = rnd(em); e.style.left = (5 + Math.random() * 90) + 'vw'; e.style.animationDelay = (Math.random() * .6) + 's'; e.style.fontSize = (16 + Math.random() * 22) + 'px'; host.appendChild(e); setTimeout(() => e.remove(), 3200); }
  }

  /* ---------- صفحه ---------- */
  const CSS = `
#screen-canvas{--cvA:#d4a5ff;--cvB:#ff8fb8;--cvP:rgba(255,255,255,.05);--cvT:var(--text,#eee)}
#screen-canvas[data-cvt=sunset]{--cvA:#ffb07a;--cvB:#ff6f91}#screen-canvas[data-cvt=mint]{--cvA:#7fe0c4;--cvB:#6fb7ff}
#screen-canvas.cv-light{--cvP:rgba(255,255,255,.85);--cvT:#2a2038}
.cv-title{text-align:center;margin:0 0 10px}.cv-title h2{margin:0}.cv-title small{color:var(--muted,#aaa)}
.cv-tabs{display:flex;gap:8px;justify-content:center;margin:8px 0 12px}
.cv-tab{padding:8px 18px;border-radius:999px;border:1px solid rgba(212,165,255,.3);background:var(--cvP);color:var(--cvT);cursor:pointer;font:inherit}
.cv-tab.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent;font-weight:700}
.cv-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:8px}
.cv-av{position:relative;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--cvA),var(--cvB));display:grid;place-items:center;font-weight:700;color:#1a1030;overflow:visible}
.cv-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.cv-av i{position:absolute;bottom:0;left:0;width:12px;height:12px;border-radius:50%;background:#7a7a8a;border:2px solid var(--bg,#0a0a0f)}.cv-av.on i{background:#4cd964}
.cv-av small{position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:.62rem;white-space:nowrap;color:var(--muted,#aaa)}
.cv-amp{font-size:1.3rem}
.cv-topic{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0;font-size:.85rem}
.cv-topic .pill{padding:5px 12px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25)}
.cv-modes{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0}
.cv-modes button,.cv-bar button,.cv-row button,.cv-topic button,.cv-ctl button{padding:7px 11px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:var(--cvP);color:var(--cvT);cursor:pointer;font:inherit;font-size:.85rem}
.cv-modes button.on,.cv-bar button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent;font-weight:700}
.cv-banner{text-align:center;padding:8px 12px;border-radius:12px;background:rgba(212,165,255,.14);border:1px dashed rgba(212,165,255,.4);margin:6px 0;font-size:.86rem;line-height:1.8}
.cv-timer{font-weight:700;font-size:1.1rem;direction:ltr;display:inline-block}
.cv-bar{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center;margin:8px 0}
.cv-sw{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0}
.cv-sw button{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.35);cursor:pointer;padding:0}
.cv-sw button.on{outline:3px solid var(--cvA);outline-offset:1px}
.cv-sw input[type=color]{width:34px;height:30px;border:0;background:none;padding:0;cursor:pointer}
.cv-ctl{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0;font-size:.82rem}
.cv-ctl label{display:flex;align-items:center;gap:6px}.cv-ctl input[type=range]{width:110px}
.cv-stks{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin:6px 0}
.cv-stks button{font-size:1.25rem;padding:3px 7px}.cv-stks button.on{background:rgba(212,165,255,.35)}
.cv-stage{position:relative;width:100%;max-width:960px;margin:8px auto;aspect-ratio:${W}/${H};border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.45);border:2px solid rgba(212,165,255,.35);touch-action:none;background:#fff}
.cv-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cv-stage canvas.draw{touch-action:none;cursor:crosshair}
.cv-stage.intro{animation:cvIntro 1s ease-out}@keyframes cvIntro{from{clip-path:circle(0% at 50% 50%);transform:scale(.9) rotate(-2deg)}to{clip-path:circle(80% at 50% 50%);transform:none}}
.cv-cur{position:absolute;pointer-events:none;transform:translate(-4px,-4px);z-index:5;transition:left .07s linear,top .07s linear}
.cv-cur i{display:block;width:14px;height:14px;border-radius:50%;background:var(--cvB);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.cv-cur b{position:absolute;top:16px;left:6px;font-size:.7rem;background:rgba(0,0,0,.65);color:#fff;border-radius:8px;padding:1px 6px;white-space:nowrap}
.cv-sel{padding:7px 10px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:#241a3a;color:#f3ecff;font:inherit;font-size:.85rem}
#screen-canvas.cv-light .cv-sel{background:#fff;color:#2a2038}
.cv-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:8px 0}
.cv-save{text-align:center;font-size:.78rem;color:var(--muted,#aaa);min-height:1.2em}
.cv-gg{display:flex;gap:6px;justify-content:center;align-items:center;margin:6px 0;flex-wrap:wrap}.cv-gg input{padding:8px 12px;border-radius:12px;border:1px solid rgba(212,165,255,.35);background:rgba(10,10,15,.5);color:inherit;font:inherit}
.cv-feed{font-size:.8rem;color:var(--muted,#aaa);text-align:center;line-height:1.8}.cv-feed .ok{color:#7fe0a0;font-weight:700}
.cv-empty{text-align:center;color:var(--muted,#aaa);padding:30px 12px;line-height:1.9}
.cv-gal-top{text-align:center;color:var(--muted,#aaa);font-size:.85rem;margin-bottom:10px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.cv-card{border-radius:16px;overflow:hidden;background:var(--cvP);border:1px solid rgba(212,165,255,.22);display:flex;flex-direction:column}
.cv-card img{width:100%;aspect-ratio:${W}/${H};object-fit:cover;cursor:pointer;display:block;background:#fff}
.cv-lock{aspect-ratio:${W}/${H};display:grid;place-items:center;text-align:center;font-size:2.4rem;background:linear-gradient(135deg,rgba(212,165,255,.2),rgba(255,143,184,.15))}.cv-lock small{display:block;font-size:.72rem;color:var(--muted,#aaa)}
.cv-ct{padding:8px 10px 2px;display:flex;flex-direction:column;gap:2px}.cv-ct small{color:var(--muted,#aaa);font-size:.72rem}
.cv-ca{display:flex;gap:4px;padding:4px 8px 8px}.cv-ca button{background:none;border:0;cursor:pointer;font-size:1.05rem;color:inherit}
.cv-modal{position:fixed;inset:0;z-index:2600;background:rgba(0,0,0,.82);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow-y:auto}
.cv-mbox{position:relative;width:min(760px,100%);background:#17122a;border:1px solid rgba(212,165,255,.35);border-radius:18px;padding:16px;color:#f3ecff}
.cv-mbox h3{margin:0 0 2px}.cv-mbox small{color:#b9a8d8}
.cv-x{position:absolute;top:10px;left:12px;background:none;border:0;color:inherit;font-size:1.2rem;cursor:pointer}
.cv-mstage{margin:10px 0;border-radius:12px;overflow:hidden;background:#fff}.cv-mstage img,.cv-mstage canvas{width:100%;display:block}
.cv-cm{max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin:8px 0}.cv-c{background:rgba(255,255,255,.07);border-radius:10px;padding:6px 10px;font-size:.86rem}.cv-c small{margin-right:6px}
.cv-cmf{display:flex;gap:8px}.cv-cmf input{flex:1;min-width:0;padding:9px 12px;border-radius:12px;border:1px solid rgba(212,165,255,.35);background:rgba(10,10,15,.5);color:inherit;font:inherit}
.cv-fx{position:fixed;bottom:-30px;z-index:3000;pointer-events:none;animation:cvFly 2.6s ease-out forwards}
@keyframes cvFly{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(-95vh) rotate(40deg);opacity:0}}
@media (max-width:600px){.cv-ctl input[type=range]{width:90px}.cv-grid{grid-template-columns:repeat(2,1fr)}}`;

  function buildCanvases() {
    if (built) return;
    const st = document.createElement('style'); st.id = 'cvCss'; st.textContent = CSS; document.head.appendChild(st);
    base = document.createElement('canvas'); base.width = W; base.height = H; bctx = base.getContext('2d');
    built = true;
  }

  /* ---------- 🎛️ رابط: نوار ابزار آیکونی + پنجره‌های کوچیک ---------- */
  const IC = {
    pen: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    brush: '<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>',
    hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    sticker: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    sig: '<path d="m21 17-2.156-1.868A.5.5 0 0 0 18 15.5v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.545-3.991-3.97-8.5-4a1 1 0 0 0 0 5c4.153 0 4.745-11.295 5.708-13.5a2.5 2.5 0 1 1 3.31 3.284"/><path d="M3 21h18"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
    clear: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    mode: '<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/>',
    bg: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    set: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    wand: '<path d="m15 4 5 5L9 20l-5-5z"/><path d="M5 3v4M3 5h4M19 15v4M17 17h4"/>',
    brushes: '<circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>',
    gal: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    canvas: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>'
  };
  const ico = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  const BG_CSS = { white: '#fff', cream: '#fff8ec', night: '#14122a', grid: 'repeating-linear-gradient(0deg,#fff8ec 0 7px,#d9cfe6 7px 8px),#fff8ec', dots: 'radial-gradient(#9b8bb8 1.2px,#fff8ec 1.4px) 0 0/8px 8px', lines: 'repeating-linear-gradient(0deg,#fff8ec 0 9px,#a9c3ee 9px 10px)', sky: 'linear-gradient(#9bd1ff,#fff3d6)', pink: 'linear-gradient(135deg,#ffd6e8,#e6d4ff)' };
  const MODES = [['free', 'pen', 'آزاد'], ['turn', 'redo', 'کاملش کن (نوبتی)'], ['half', 'gal', 'نیمه‌نیمه'], ['guess', 'bulb', 'حدس بزن'], ['timed', 'cal', 'زمان‌دار'], ['secret', 'sig', 'نقاشی مخفی']];
  let pop = null, timedMin = 2, filterSel = '';

  function CSS2() {
    return `
#screen-canvas .cv-app{max-width:1060px;margin:0 auto}
.cv-seg{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25)}
.cv-seg button{width:38px;height:32px;border-radius:999px;border:0;background:none;color:var(--cvT);cursor:pointer;display:grid;place-items:center;opacity:.65}
.cv-seg button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;opacity:1}
.cv-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.cv-top .sp{flex:1}
.cv-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25);font-size:.82rem;max-width:100%}
.cv-chip b{max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cv-ib{width:36px;height:36px;border-radius:12px;border:1px solid rgba(212,165,255,.28);background:var(--cvP);color:var(--cvT);cursor:pointer;display:inline-grid;place-items:center;padding:0;font-size:1rem;transition:.15s}
.cv-ib:hover{border-color:var(--cvA);transform:translateY(-1px)}.cv-ib.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent}
.cv-ib.sm{width:30px;height:30px;border-radius:10px}
.cv-ib.pri{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent}
.cv-dot{position:relative;width:10px;height:10px;border-radius:50%;background:#7a7a8a;display:inline-block}.cv-dot.ok{background:#4cd964}
.cv-avs{display:flex;align-items:center}
.cv-av{width:34px;height:34px;font-size:.9rem;margin-left:-8px;border:2px solid var(--bg,#0a0a0f)}.cv-av small{display:none}.cv-av i{width:10px;height:10px;bottom:-1px;left:-1px}
.cv-main{position:relative;display:flex;gap:10px;align-items:flex-start}
.cv-rail{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:18px;background:var(--cvP);border:1px solid rgba(212,165,255,.22);position:sticky;top:76px;z-index:6;backdrop-filter:none}
.cv-rail .div{height:1px;background:rgba(212,165,255,.22);margin:2px 4px}
.cv-rail .cv-ib{border-color:transparent;background:none}.cv-rail .cv-ib:hover{background:rgba(212,165,255,.14)}.cv-rail .cv-ib.on{background:linear-gradient(135deg,var(--cvA),var(--cvB))}
.cv-sw1{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
.cv-wrap{flex:1;min-width:0;position:relative}
.cv-pop{position:absolute;z-index:20;top:0;right:0;width:min(300px,100%);padding:12px;border-radius:16px;background:#1b1530;color:#f3ecff;border:1px solid rgba(212,165,255,.35);box-shadow:0 14px 40px rgba(0,0,0,.55);display:none}
#screen-canvas.cv-light .cv-pop{background:#fff;color:#2a2038}
.cv-pop h6{margin:0 0 8px;font-size:.74rem;opacity:.7;font-weight:600}
.cv-grid2{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
.cv-grid2 button{aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.4);cursor:pointer;padding:0}
.cv-grid2 button.on{outline:3px solid var(--cvA);outline-offset:1px}
.cv-grid2.sq{grid-template-columns:repeat(4,1fr)}.cv-grid2.sq button{border-radius:12px;aspect-ratio:1.4}
.cv-grid2.em{grid-template-columns:repeat(6,1fr)}.cv-grid2.em button{border:0;background:rgba(255,255,255,.07);border-radius:10px;font-size:1.3rem;aspect-ratio:1}.cv-grid2.em button.on{background:rgba(212,165,255,.4)}
.cv-prow{display:flex;gap:8px;align-items:center;margin:8px 0}.cv-prow input[type=range]{flex:1}
.cv-prow input[type=color]{width:100%;height:34px;border:0;background:none;padding:0;cursor:pointer}
.cv-pv{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.07);display:grid;place-items:center}.cv-pv i{display:block;border-radius:50%}
.cv-mg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cv-mg button{height:46px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;display:grid;place-items:center}.cv-mg button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030}
.cv-chips{display:flex;gap:6px;margin-top:8px}.cv-chips button{flex:1;padding:6px 0;border-radius:10px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font:inherit;font-size:.78rem}.cv-chips button.on{background:var(--cvA);color:#1a1030}
.cv-banner{font-size:.82rem;padding:7px 12px;margin:0 0 8px;border-radius:12px}
.cv-banner .cv-ib{vertical-align:middle;margin:0 6px}
.cv-gg input{min-width:0;flex:1}
.cv-stage{margin:0}
.cv-save{display:none}
@media (max-width:760px){
  .cv-main{flex-direction:column-reverse}
  .cv-rail{flex-direction:row;overflow-x:auto;width:100%;position:static;padding:6px;gap:4px;border-radius:16px;scrollbar-width:none}
  .cv-rail::-webkit-scrollbar{display:none}.cv-rail .div{width:1px;height:26px;margin:4px 2px;flex:none}.cv-rail .cv-ib{flex:none}
  .cv-pop{position:fixed;left:8px;right:8px;bottom:70px;top:auto;width:auto;z-index:2300}
}`;
  }
  function buildCanvases2() { if (!$('cvCss2')) { const st = document.createElement('style'); st.id = 'cvCss2'; st.textContent = CSS2(); document.head.appendChild(st); } }
  const ib = (attr, name, title, cls) => `<button type="button" class="cv-ib${cls ? ' ' + cls : ''}" ${attr} title="${esc(title)}" aria-label="${esc(title)}">${ico(name)}</button>`;

  function render() {
    const root = $('canvasBox'); if (!root) return;
    buildCanvases(); buildCanvases2();
    const scr = $('screen-canvas'); if (scr) { scr.dataset.cvt = theme; scr.classList.toggle('cv-light', !!light); }
    const seg = `<div class="cv-seg"><button type="button" class="${tab === 'draw' ? 'on' : ''}" data-tab="draw" title="بوم" aria-label="بوم">${ico('canvas', 18)}</button><button type="button" class="${tab === 'gal' ? 'on' : ''}" data-tab="gal" title="گالری" aria-label="گالری">${ico('gal', 18)}</button></div>`;
    if (tab === 'gal') { root.innerHTML = `<div class="cv-app"><div class="cv-top">${seg}</div><div id="cvGal"></div></div>`; bindTabs(); renderGallery(); return; }
    root.innerHTML = `<div class="cv-app">
      <div class="cv-top">${seg}<div class="cv-avs" id="cvHead"></div><span id="cvTopic" class="cv-top" style="margin:0;gap:6px"></span><span class="sp"></span><span class="cv-dot" id="cvSaveDot" title="ذخیرهٔ خودکار"></span><span id="cvAct" style="display:flex;gap:6px"></span></div>
      <div id="cvModeInfo"></div>
      <div class="cv-main">
        <div class="cv-rail" id="cvRail"></div>
        <div class="cv-wrap"><div class="cv-pop" id="cvPop"></div>
          <div class="cv-stage intro" id="cvStage"><canvas id="cvBg" width="${W}" height="${H}"></canvas><canvas id="cvWork" class="draw" width="${W}" height="${H}"></canvas></div>
        </div>
      </div>
      ${liveMissing ? '<div class="cv-empty">برای ذخیرهٔ خودکار روی هر دو دستگاه، SQL شمارهٔ ۲۴ رو یک بار اجرا کن؛ فعلاً روی همین دستگاه ذخیره می‌شه.</div>' : ''}</div>`;
    bindTabs();
    stage = $('cvStage'); bgc = $('cvBg'); bgctx = bgc.getContext('2d'); work = $('cvWork'); wctx = work.getContext('2d');
    cursors = {}; paintBg(bgctx, meta.bg);
    work.addEventListener('pointerdown', e => { if (pop) { pop = null; renderPop(); renderRail(); } pDown(e); }); work.addEventListener('pointermove', pMove);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => work.addEventListener(ev, pUp));
    setTimeout(() => stage && stage.classList.remove('intro'), 1100);
    renderHeader(); renderTopic(); renderMode(); renderRail(); renderAct(); renderPop(); dirty = true; startFrame();
  }
  function bindTabs() { document.querySelectorAll('#canvasBox [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; pop = null; render(); if (tab === 'gal') loadGallery(); }); }
  function avHtml(name, av, on) { const ini = esc((name || '؟').trim().charAt(0)); return `<div class="cv-av${on ? ' on' : ''}" title="${esc(name || '')}">${av ? `<img src="${esc(av)}" alt="">` : ini}<i></i></div>`; }
  function renderHeader() {
    const el = $('cvHead'); if (!el) return;
    const me = (typeof userProfile !== 'undefined' && userProfile.avatar) || thumb || '';
    const pn = partnerName(), pk = Object.keys(peers).find(k => same(peers[k].name, pn)), last = jget(myThumbKey, null);
    el.innerHTML = (pn ? avHtml(pn, peers[pk].av, true) : avHtml(last ? last.name : 'اون یکی', last ? last.av : '', false)) + avHtml(nm(), me, true);
  }
  function renderTopic() {
    const el = $('cvTopic'); if (!el) return;
    const day = Math.floor((Date.now() + 12600000) / 86400000), daily = TOPICS[day % TOPICS.length];
    el.innerHTML = (meta.topic ? `<span class="cv-chip">${ico('bulb', 14)}<b>${esc(meta.topic)}</b></span>` : '') + `<button type="button" class="cv-ib sm" data-tp="rnd" title="موضوع تصادفی">${ico('dice', 16)}</button><button type="button" class="cv-ib sm" data-tp="daily" title="موضوع امروز: ${esc(daily)}">${ico('cal', 16)}</button><button type="button" class="cv-ib sm" data-tp="title" title="اسم بامزه">${ico('wand', 16)}</button>${meta.topic ? `<button type="button" class="cv-ib sm" data-tp="off" title="حذف موضوع">${ico('x', 14)}</button>` : ''}`;
    el.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => {
      const a = b.dataset.tp;
      if (a === 'rnd') setMeta({ topic: rnd(TOPICS) }); else if (a === 'daily') setMeta({ topic: daily }); else if (a === 'off') setMeta({ topic: '' });
      else if (a === 'title') toast2('💡 ' + titleIdea());
      renderTopic();
    });
  }
  const renderModes = () => refreshPop();
  function renderRail() {
    const el = $('cvRail'); if (!el) return;
    const T = [['pen', 'قلم'], ['brush', 'قلم‌مو'], ['hl', 'هایلایتر'], ['eraser', 'پاک‌کن'], ['sticker', 'استیکر'], ['text', 'متن']];
    const dotSize = Math.max(4, Math.min(18, size / 3 + 4));
    el.innerHTML = T.map(t => ib(`data-t="${t[0]}"`, t[0], t[1], tool === t[0] && !sigMode ? 'on' : '')).join('') + ib('data-t="sig"', 'sig', 'امضا', sigMode ? 'on' : '')
      + '<div class="div"></div>' + ib('data-t="undo"', 'undo', 'برگرد') + ib('data-t="redo" id="cvRedo"', 'redo', 'جلو') + ib('data-t="clear"', 'clear', 'پاک کردن بوم')
      + '<div class="div"></div>'
      + `<button type="button" class="cv-ib${pop === 'color' ? ' on' : ''}" data-pop="color" title="رنگ"><span class="cv-sw1" style="background:${esc(color)}"></span></button>`
      + `<button type="button" class="cv-ib${pop === 'size' ? ' on' : ''}" data-pop="size" title="ضخامت و شفافیت"><span style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:currentColor;opacity:${.35 + alpha * .65};display:block"></span></button>`
      + '<div class="div"></div>' + ib('data-pop="mode"', 'mode', 'حالت‌های بازی', pop === 'mode' || secret ? 'on' : '') + ib('data-pop="bg"', 'bg', 'پس‌زمینه', pop === 'bg' ? 'on' : '') + ib('data-pop="set"', 'set', 'تنظیمات', pop === 'set' ? 'on' : '');
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const t = b.dataset.t;
      if (t === 'undo') undo(); else if (t === 'redo') redoOp(); else if (t === 'clear') clearAll();
      else if (t === 'sig') { const c0 = jget('diary_cv_sig', '') || nm(); const v = prompt('امضات چی باشه؟ (بعد روی بوم بزن تا جاش مشخص بشه)', c0); if (v !== null && v.trim()) { jset('diary_cv_sig', v.trim().slice(0, 30)); sigMode = true; pop = null; renderRail(); renderPop(); toast2('✍️ روی بوم بزن تا امضا بشینه'); } }
      else { tool = t; sigMode = false; pop = t === 'sticker' ? 'stk' : (pop === 'stk' ? null : pop); renderRail(); renderPop(); }
    });
    el.querySelectorAll('[data-pop]').forEach(b => b.onclick = e => { e.stopPropagation(); pop = pop === b.dataset.pop ? null : b.dataset.pop; renderRail(); renderPop(); });
    redoUi();
  }
  const renderTools = renderRail;
  function popHtml(n) {
    if (n === 'color') return `<h6>رنگ</h6><div class="cv-grid2">${COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${color.toLowerCase() === c ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div>
      <div class="cv-prow"><input type="color" id="cvPick" value="${/^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d'}" title="رنگ دلخواه"><button type="button" class="cv-ib" data-pal="1" title="پالت هماهنگ با این رنگ">${ico('wand')}</button></div><div class="cv-grid2" id="cvSug"></div>`;
    if (n === 'size') return `<h6>ضخامت</h6><div class="cv-prow"><div class="cv-pv"><i id="cvPvDot" style="width:${Math.min(40, size)}px;height:${Math.min(40, size)}px;background:${esc(color)};opacity:${alpha}"></i></div><input type="range" id="cvSize" min="1" max="60" value="${size}"></div>
      <h6>شفافیت</h6><div class="cv-prow"><input type="range" id="cvAlpha" min="5" max="100" value="${Math.round(alpha * 100)}"></div>`;
    if (n === 'stk') return `<h6>استیکر</h6><div class="cv-grid2 em">${STICKERS.map(s => `<button type="button" data-s="${s}" class="${s === stickerPick ? 'on' : ''}">${s}</button>`).join('')}</div>`;
    if (n === 'bg') return `<h6>پس‌زمینه</h6><div class="cv-grid2 sq">${Object.keys(BGS).map(k => `<button type="button" data-bg="${k}" title="${BGS[k]}" style="background:${BG_CSS[k]}" class="${meta.bg === k ? 'on' : ''}"></button>`).join('')}</div>`;
    if (n === 'mode') return `<h6>حالت بازی</h6><div class="cv-mg">${MODES.map(m => `<button type="button" data-md="${m[0]}" title="${m[2]}" aria-label="${m[2]}" class="${(m[0] === 'secret' ? secret : (!secret && meta.mode === m[0])) ? 'on' : ''}">${ico(m[1], 22)}</button>`).join('')}</div>
      <div class="cv-chips">${[1, 2, 3, 5].map(m => `<button type="button" data-tm="${m}" title="${m} دقیقه" class="${timedMin === m ? 'on' : ''}">${fa(m)}</button>`).join('')}</div>`;
    if (n === 'set') return `<h6>ظاهر</h6><div class="cv-prow" style="justify-content:space-between">${['dream', 'sunset', 'mint'].map(t => `<button type="button" class="cv-ib${theme === t ? ' on' : ''}" data-th="${t}" title="تم" style="background:${t === 'dream' ? 'linear-gradient(135deg,#d4a5ff,#ff8fb8)' : t === 'sunset' ? 'linear-gradient(135deg,#ffb07a,#ff6f91)' : 'linear-gradient(135deg,#7fe0c4,#6fb7ff)'}"></button>`).join('')}
      <button type="button" class="cv-ib" data-set="light" title="روشن / تاریک">${ico(light ? 'moon' : 'sun')}</button><button type="button" class="cv-ib" data-set="music" title="موسیقی">${ico('music')}</button></div>
      <h6>فیلتر خروجی</h6><div class="cv-chips">${[['', '○'], ['cartoon', '◐'], ['sketch', '✎'], ['soft', '✿']].map(f => `<button type="button" data-f="${f[0]}" title="${{ '': 'بدون فیلتر', cartoon: 'کارتونی', sketch: 'مدادی', soft: 'نرم و رویایی' }[f[0]]}" class="${filterSel === f[0] ? 'on' : ''}">${f[1]}</button>`).join('')}</div>`;
    return '';
  }
  function renderPop() {
    const el = $('cvPop'); if (!el) return;
    if (!pop) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = popHtml(pop);
    el.onclick = e => e.stopPropagation();
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; renderRail(); renderPop(); });
    const pk = $('cvPick'); if (pk) pk.oninput = e => { color = e.target.value; const d = $('cvPvDot'); if (d) d.style.background = color; renderRail(); };
    el.querySelectorAll('[data-pal]').forEach(b => b.onclick = suggestPalette);
    const sz = $('cvSize'); if (sz) sz.oninput = e => { size = +e.target.value; const d = $('cvPvDot'); if (d) { d.style.width = d.style.height = Math.min(40, size) + 'px'; } renderRailDot(); };
    const al = $('cvAlpha'); if (al) al.oninput = e => { alpha = +e.target.value / 100; const d = $('cvPvDot'); if (d) d.style.opacity = alpha; renderRailDot(); };
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { stickerPick = b.dataset.s; renderPop(); });
    el.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setMeta({ bg: b.dataset.bg }));
    el.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { const m = b.dataset.md; if (m === 'secret') toggleSecret(); else modeSet(m); pop = null; renderRail(); renderPop(); });
    el.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { timedMin = +b.dataset.tm; modeSet('timed'); pop = null; renderRail(); renderPop(); });
    el.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { theme = b.dataset.th; jset('diary_cv_theme', theme); $('screen-canvas').dataset.cvt = theme; renderPop(); });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { if (b.dataset.set === 'light') { light = !light; jset('diary_cv_light', light); $('screen-canvas').classList.toggle('cv-light', light); renderPop(); } else { const m = $('mpPlay'); if (m) m.click(); } });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filterSel = b.dataset.f; renderPop(); });
  }
  const refreshPop = () => { if (pop === 'mode' || pop === 'bg') renderPop(); };
  function renderRailDot() { const b = document.querySelector('#cvRail [data-pop=size] span'); if (b) { const d = Math.max(4, Math.min(18, size / 3 + 4)); b.style.width = b.style.height = d + 'px'; b.style.opacity = .35 + alpha * .65; } }
  document.addEventListener('click', e => { if (pop && !e.target.closest('#cvRail') && !e.target.closest('#cvPop')) { pop = null; renderPop(); renderRail(); } });
  function renderAct() {
    const el = $('cvAct'); if (!el) return;
    el.innerHTML = secret ? ib('data-x="save"', 'save', 'ذخیره و ارسال مخفی', 'pri') + ib('data-x="exit"', 'x', 'خروج از حالت مخفی')
      : ib('data-x="save"', 'save', 'ذخیره در گالری') + ib('data-x="finish"', 'flag', 'تموم شد!', 'pri') + ib('data-x="dl"', 'dl', 'دانلود PNG') + ib('data-x="new"', 'plus', 'بوم تازه');
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const a = b.dataset.x; if (a === 'save') saveToGallery(); else if (a === 'finish') saveToGallery({ finish: true }); else if (a === 'dl') download(); else if (a === 'exit') toggleSecret(); else if (a === 'new') { if (confirm('بوم تازه شروع بشه؟ (نقاشی فعلی پاک می‌شه؛ اگه می‌خوای نگهش داری اول ذخیره کن)')) { strokes = []; redo = []; rebuild(); send({ t: 'clear' }); setMeta({ mode: 'free', turn: '', half: null, drawer: '', timerEnd: 0, topic: '' }); } } });
  }
  const renderBgs = refreshPop, renderSw = () => { renderRail(); };
  function suggestPalette() {
    const base0 = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d', [h, s] = hexToHsl(base0), S = Math.max(45, s), P = [hsl(h, S, 35), hsl(h, S, 55), hsl(h, S, 78), hsl((h + 30) % 360, S, 60), hsl((h + 180) % 360, S, 58), hsl((h + 210) % 360, S, 70)];
    const d = $('cvSug'); if (!d) return; d.innerHTML = P.map(c => `<button type="button" data-s2="${c}" style="background:${c}"></button>`).join('');
    d.querySelectorAll('[data-s2]').forEach(b => b.onclick = () => { color = b.dataset.s2; renderRail(); renderPop(); });
  }
  const redoUi = () => { const b = $('cvRedo'); if (b) b.style.opacity = redo.length ? 1 : .35; };

  function toggleSecret() {
    secret = !secret; redo = []; rebuild(); renderMode(); renderRail(); renderAct();
    toast2(secret ? '🔒 حالت مخفی: هیچ‌چیز برای اون یکی فرستاده نمی‌شه' : 'برگشتیم به بوم مشترک');
  }
  function renderMode() {
    refreshPop(); const el = $('cvModeInfo'); if (!el) return; let h = '';
    if (secret) h = '<div class="cv-banner">🔒 <b>نقاشی مخفی</b> — فقط تو می‌بینی. وقتی تموم شد «ذخیره و ارسال مخفی» رو بزن و بگو چند ساعت دیگه برای اون یکی نمایش داده بشه.</div>';
    else if (meta.mode === 'turn') h = `<div class="cv-banner">🔄 <b>کاملش کن</b> — نوبت: <b>${esc(meta.turn || '—')}</b>${same(meta.turn, nm()) ? ' <button type="button" class="cv-ib" data-a="pass" title="نوبتم تموم شد">✅</button>' : ''}</div>`;
    else if (meta.mode === 'half') h = `<div class="cv-banner">↔️ <b>نیمه‌نیمه</b> — چپ: <b>${esc(meta.half && meta.half.L || '—')}</b> · راست: <b>${esc(meta.half && meta.half.R || 'منتظر نفر دوم')}</b></div>`;
    else if (meta.mode === 'guess') {
      const dr = same(meta.drawer, nm());
      h = `<div class="cv-banner">🤔 <b>حدس بزن</b> — نقاش: <b>${esc(meta.drawer)}</b>${dr ? `<br>🤫 چیزی که باید بکشی: <b>${esc(guessWord)}</b> <button type="button" class="cv-ib" data-a="newword" title="کلمهٔ دیگه">🎲</button>` : '<div class="cv-gg"><input id="cvGuessIn" placeholder="چی کشیده؟ حدس بزن…"><button type="button" class="cv-ib" data-a="guess" title="ارسال حدس">➤</button></div>'}</div><div class="cv-feed">${guessFeed.map(g => `<div class="${g.ok ? 'ok' : ''}">${esc(g.name)}: ${esc(g.text)} ${g.ok ? '✅' : ''}</div>`).join('')}</div>`;
    }
    else if (meta.mode === 'timed' && meta.timerEnd) h = '<div class="cv-banner">⏱️ <b>زمان‌دار</b> — <span class="cv-timer" id="cvTimer">…</span></div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'pass') passTurn(); else if (a === 'guess') myGuess(); else if (a === 'newword') { guessWord = rnd(WORDS); renderMode(); } });
    const gi = $('cvGuessIn'); if (gi) gi.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); myGuess(); } };
    tickTimer();
  }
  function tickTimer() {
    clearInterval(timerI); timerI = null; if (!(meta.mode === 'timed' && meta.timerEnd)) return;
    const upd = () => {
      const left = meta.timerEnd - Date.now(), e = $('cvTimer');
      if (left <= 0) { clearInterval(timerI); timerI = null; if (e) e.textContent = '⏰ تموم شد!'; if (timerDone !== meta.timerEnd) { timerDone = meta.timerEnd; toast2('⏰ وقت تموم شد!'); saveToGallery({ id: 'cv_t' + meta.timerEnd, title: titleIdea(), finish: true }); } return; }
      if (e) { const s = Math.ceil(left / 1000); e.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    };
    upd(); timerI = setInterval(upd, 500);
  }
    function undo() {
    const arr = cur(); for (let i = arr.length - 1; i >= 0; i--) { if (same(arr[i].by, nm())) { const [s] = arr.splice(i, 1); redo.push(s); rebuild(); send({ t: 'undo', id: s.id }); changed(); return; } }
    toast2('چیزی برای برگردوندن نیست');
  }
  function redoOp() { const s = redo.pop(); if (!s) return; s.ts = Date.now(); cur().push(s); drawStroke(bctx, s); dirty = true; send({ t: 'add', s }); scheduleSaveIfShared(); redoUi(); }
  const scheduleSaveIfShared = () => { if (!secret) scheduleSave(); };
  function clearAll() { if (!confirm('کل بوم پاک بشه؟' + (secret ? '' : ' (برای هر دو)'))) return; if (secret) secretStrokes = []; else { strokes = []; send({ t: 'clear' }); } redo = []; rebuild(); changed(); }
  function hexToHsl(h) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s * 100, l * 100]; }
  const hsl = (h, s, l) => '#' + [0, 8, 4].map(n => { const a = s / 100 * Math.min(l / 100, 1 - l / 100), k = (n + h / 30) % 12, c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); }).join('');
  /* ---------- راه‌اندازی ---------- */
  function load() {
    join();
    if (!$('canvasBox')) return;
    if (!$('cvCss')) buildCanvases();
    render(); if (tab === 'gal') loadGallery();
    loadLive(); if (!galleryLoaded) loadGallery();
    if (subscribed) track();
  }
  function init() {
    if (inited) return; inited = true;
    const g = $('canvasBox'); if (g) g.addEventListener('click', e => {
      const f = e.target.closest('[data-fav]'); if (f) return toggleFav(f.dataset.fav);
      const o = e.target.closest('[data-open]'); if (o) return openArt(o.dataset.open);
      const d = e.target.closest('[data-dl]'); if (d) return dlArt(d.dataset.dl);
      const x = e.target.closest('[data-del]'); if (x) return delArt(x.dataset.del);
    });
  }
  window.Canvas2 = { load, init, saveToGallery, _state: () => ({ strokes, secretStrokes, meta, tool, peers, secret, gallery, remote: Object.keys(remote), liveMissing }), _id: ID, W, H };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
