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
    else if (mode === 'timed') { const m = Number($('cvTimerSel') && $('cvTimerSel').value) || 2; timerDone = 0; setMeta({ mode: 'timed', timerEnd: Date.now() + m * 60000, turn: '', half: null, drawer: '' }); toast2('⏱️ ' + fa(m) + ' دقیقه وقت داریم؛ بکشیم!'); }
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
  const setSave = s => { saveState = s; const e = $('cvSave'); if (e) e.textContent = s === '✓' ? '💾 ذخیره شد' : s === '!' ? '⚠️ فقط روی همین دستگاه' : s ? '… در حال ذخیره' : ''; };
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
    const filter = ($('cvFilter') && $('cvFilter').value) || '';
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
    const c = await exportCanvas(($('cvFilter') && $('cvFilter').value) || ''); const b = await blobOf(c);
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
  function render() {
    const root = $('canvasBox'); if (!root) return;
    buildCanvases();
    const scr = $('screen-canvas'); if (scr) { scr.dataset.cvt = theme; scr.classList.toggle('cv-light', !!light); }
    if (tab === 'gal') { root.innerHTML = tabsHtml() + '<div id="cvGal"></div>'; bindTabs(); renderGallery(); return; }
    root.innerHTML = tabsHtml() + `
      <div class="cv-head" id="cvHead"></div>
      <div class="cv-topic" id="cvTopic"></div>
      <div class="cv-modes" id="cvModes"></div>
      <div id="cvModeInfo"></div>
      <div class="cv-bar" id="cvTools"></div>
      <div class="cv-sw" id="cvSw"></div>
      <div class="cv-ctl" id="cvCtl"></div>
      <div class="cv-stks" id="cvStks"></div>
      <div class="cv-stage intro" id="cvStage"><canvas id="cvBg" width="${W}" height="${H}"></canvas><canvas id="cvWork" class="draw" width="${W}" height="${H}"></canvas></div>
      <div class="cv-save" id="cvSave"></div>
      <div class="cv-row" id="cvAct"></div>
      <div class="cv-ctl" id="cvBgs"></div>
      ${liveMissing ? '<div class="cv-empty">🛠️ برای ذخیرهٔ خودکار روی هر دو دستگاه، SQL شمارهٔ ۲۴ رو یک بار اجرا کن؛ فعلاً روی همین دستگاه ذخیره می‌شه.</div>' : ''}`;
    bindTabs();
    stage = $('cvStage'); bgc = $('cvBg'); bgctx = bgc.getContext('2d'); work = $('cvWork'); wctx = work.getContext('2d');
    cursors = {}; paintBg(bgctx, meta.bg);
    work.addEventListener('pointerdown', pDown); work.addEventListener('pointermove', pMove);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => work.addEventListener(ev, pUp));
    setTimeout(() => stage && stage.classList.remove('intro'), 1100);
    renderHeader(); renderTopic(); renderModes(); renderMode(); renderTools(); renderSw(); renderCtl(); renderStks(); renderAct(); renderBgs(); dirty = true; startFrame();
  }
  const tabsHtml = () => `<div class="cv-tabs"><button type="button" class="cv-tab${tab === 'draw' ? ' on' : ''}" data-tab="draw">🖌️ بوم</button><button type="button" class="cv-tab${tab === 'gal' ? ' on' : ''}" data-tab="gal">🖼️ گالری</button></div>`;
  function bindTabs() { document.querySelectorAll('#canvasBox [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); if (tab === 'gal') loadGallery(); }); }

  function avHtml(name, av, on) { const ini = esc((name || '؟').trim().charAt(0)); return `<div class="cv-av${on ? ' on' : ''}">${av ? `<img src="${esc(av)}" alt="">` : ini}<i></i><small>${esc(name || '')}</small></div>`; }
  function renderHeader() {
    const el = $('cvHead'); if (!el) return;
    const me = (typeof userProfile !== 'undefined' && userProfile.avatar) || thumb || '';
    const pn = partnerName(), pk = Object.keys(peers).find(k => same(peers[k].name, pn)), last = jget(myThumbKey, null);
    el.innerHTML = avHtml(nm(), me, true) + '<span class="cv-amp">🎨</span>' + (pn ? avHtml(pn, peers[pk].av, true) : avHtml(last ? last.name : 'اون یکی', last ? last.av : '', false));
  }
  function renderTopic() {
    const el = $('cvTopic'); if (!el) return;
    const day = Math.floor((Date.now() + 12600000) / 86400000), daily = TOPICS[day % TOPICS.length];
    el.innerHTML = `<span class="pill">🎯 ${meta.topic ? 'موضوع: <b>' + esc(meta.topic) + '</b>' : 'موضوعی انتخاب نشده'}</span><button type="button" data-tp="rnd">🎲 موضوع تصادفی</button><button type="button" data-tp="daily" title="موضوع امروز">📅 امروز: ${esc(daily)}</button><button type="button" data-tp="title">💡 اسم بامزه</button>${meta.topic ? '<button type="button" data-tp="off">✕</button>' : ''}`;
    el.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => {
      const a = b.dataset.tp;
      if (a === 'rnd') setMeta({ topic: rnd(TOPICS) }); else if (a === 'daily') setMeta({ topic: daily }); else if (a === 'off') setMeta({ topic: '' });
      else if (a === 'title') toast2('💡 ' + titleIdea());
      renderTopic();
    });
  }
  function renderModes() {
    const el = $('cvModes'); if (!el) return;
    const M = [['free', '🖌️ آزاد'], ['turn', '🔄 کاملش کن'], ['half', '↔️ نیمه‌نیمه'], ['guess', '🤔 حدس بزن'], ['timed', '⏱️ زمان‌دار']];
    el.innerHTML = M.map(m => `<button type="button" data-md="${m[0]}" class="${!secret && meta.mode === m[0] ? 'on' : ''}">${m[1]}</button>`).join('') + `<select id="cvTimerSel" class="cv-sel"><option value="1">۱ دقیقه</option><option value="2" selected>۲ دقیقه</option><option value="3">۳ دقیقه</option><option value="5">۵ دقیقه</option></select><button type="button" data-md="secret" class="${secret ? 'on' : ''}">🔒 نقاشی مخفی</button>`;
    el.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { const m = b.dataset.md; if (m === 'secret') { toggleSecret(); } else modeSet(m); });
  }
  function toggleSecret() {
    secret = !secret; redo = []; rebuild(); renderModes(); renderMode(); renderAct();
    toast2(secret ? '🔒 حالت مخفی: هیچ‌چیز برای اون یکی فرستاده نمی‌شه' : 'برگشتیم به بوم مشترک');
  }
  function renderMode() {
    renderModes(); const el = $('cvModeInfo'); if (!el) return; let h = '';
    if (secret) h = '<div class="cv-banner">🔒 <b>نقاشی مخفی</b> — فقط تو می‌بینی. وقتی تموم شد «ذخیره و ارسال مخفی» رو بزن و بگو چند ساعت دیگه برای اون یکی نمایش داده بشه.</div>';
    else if (meta.mode === 'turn') h = `<div class="cv-banner">🔄 <b>کاملش کن</b> — نوبت: <b>${esc(meta.turn || '—')}</b>${same(meta.turn, nm()) ? ' <button type="button" data-a="pass">✅ نوبتم تموم شد</button>' : ''}</div>`;
    else if (meta.mode === 'half') h = `<div class="cv-banner">↔️ <b>نیمه‌نیمه</b> — چپ: <b>${esc(meta.half && meta.half.L || '—')}</b> · راست: <b>${esc(meta.half && meta.half.R || 'منتظر نفر دوم')}</b></div>`;
    else if (meta.mode === 'guess') {
      const dr = same(meta.drawer, nm());
      h = `<div class="cv-banner">🤔 <b>حدس بزن</b> — نقاش: <b>${esc(meta.drawer)}</b>${dr ? `<br>🤫 چیزی که باید بکشی: <b>${esc(guessWord)}</b> <button type="button" data-a="newword">🎲 کلمهٔ دیگه</button>` : '<div class="cv-gg"><input id="cvGuessIn" placeholder="چی کشیده؟ حدس بزن…"><button type="button" class="btn" data-a="guess">حدس</button></div>'}</div><div class="cv-feed">${guessFeed.map(g => `<div class="${g.ok ? 'ok' : ''}">${esc(g.name)}: ${esc(g.text)} ${g.ok ? '✅' : ''}</div>`).join('')}</div>`;
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
  function renderTools() {
    const el = $('cvTools'); if (!el) return;
    const T = [['pen', '✏️ قلم'], ['brush', '🖌️ قلم‌مو'], ['hl', '🖍️ هایلایتر'], ['eraser', '🧽 پاک‌کن'], ['sticker', '🧸 استیکر'], ['text', '🔤 متن']];
    el.innerHTML = T.map(t => `<button type="button" data-t="${t[0]}" class="${tool === t[0] && !sigMode ? 'on' : ''}">${t[1]}</button>`).join('') + `<button type="button" data-t="sig" class="${sigMode ? 'on' : ''}" title="امضای شخصی">✍️ امضا</button><button type="button" data-t="undo">↩️</button><button type="button" data-t="redo" id="cvRedo">↪️</button><button type="button" data-t="clear">🧹</button>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const t = b.dataset.t;
      if (t === 'undo') undo(); else if (t === 'redo') redoOp(); else if (t === 'clear') clearAll();
      else if (t === 'sig') { const cur = jget('diary_cv_sig', '') || nm(); const v = prompt('امضات چی باشه؟ (بعد روی بوم بزن تا جاش مشخص بشه)', cur); if (v !== null && v.trim()) { jset('diary_cv_sig', v.trim().slice(0, 30)); sigMode = true; renderTools(); toast2('✍️ روی بوم بزن تا امضا بشینه'); } }
      else { tool = t; sigMode = false; renderTools(); renderStks(); }
    });
    redoUi();
  }
  const redoUi = () => { const b = $('cvRedo'); if (b) b.style.opacity = redo.length ? 1 : .4; };
  function undo() {
    const arr = cur(); for (let i = arr.length - 1; i >= 0; i--) { if (same(arr[i].by, nm())) { const [s] = arr.splice(i, 1); redo.push(s); rebuild(); send({ t: 'undo', id: s.id }); changed(); return; } }
    toast2('چیزی برای برگردوندن نیست');
  }
  function redoOp() { const s = redo.pop(); if (!s) return; s.ts = Date.now(); cur().push(s); drawStroke(bctx, s); dirty = true; send({ t: 'add', s }); scheduleSaveIfShared(); redoUi(); }
  const scheduleSaveIfShared = () => { if (!secret) scheduleSave(); };
  function clearAll() { if (!confirm('کل بوم پاک بشه؟' + (secret ? '' : ' (برای هر دو)'))) return; if (secret) secretStrokes = []; else { strokes = []; send({ t: 'clear' }); } redo = []; rebuild(); changed(); }
  function renderSw() {
    const el = $('cvSw'); if (!el) return;
    el.innerHTML = COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${color.toLowerCase() === c ? 'on' : ''}" aria-label="رنگ ${c}"></button>`).join('') + `<input type="color" id="cvPick" value="${/^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d'}" title="رنگ دلخواه"><button type="button" class="cv-pal" id="cvPal" style="width:auto;height:auto;border-radius:12px;padding:5px 10px;background:var(--cvP);color:var(--cvT);border:1px solid rgba(212,165,255,.3);font-size:.8rem">🪄 پالت پیشنهادی</button>`;
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; renderSw(); });
    $('cvPick').oninput = e => { color = e.target.value; el.querySelectorAll('[data-c]').forEach(b => b.classList.remove('on')); };
    $('cvPal').onclick = suggestPalette;
  }
  function hexToHsl(h) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s * 100, l * 100]; }
  const hsl = (h, s, l) => '#' + [0, 8, 4].map(n => { const a = s / 100 * Math.min(l / 100, 1 - l / 100), k = (n + h / 30) % 12, c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); }).join('');
  function suggestPalette() {
    const base0 = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d', [h, s] = hexToHsl(base0), S = Math.max(45, s), P = [hsl(h, S, 35), hsl(h, S, 55), hsl(h, S, 78), hsl((h + 30) % 360, S, 60), hsl((h + 180) % 360, S, 58), hsl((h + 210) % 360, S, 70)];
    const el = $('cvSw'); const old = el.querySelector('.cv-sug'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'cv-sug cv-sw'; d.style.width = '100%'; d.innerHTML = '<small style="color:var(--muted,#aaa)">پالت هماهنگ با رنگ فعلی:</small>' + P.map(c => `<button type="button" data-s="${c}" style="background:${c}"></button>`).join('');
    d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { color = b.dataset.s; renderSw(); }); el.appendChild(d);
  }
  function renderCtl() {
    const el = $('cvCtl'); if (!el) return;
    el.innerHTML = `<label>ضخامت <input type="range" id="cvSize" min="1" max="60" value="${size}"><b id="cvSizeV">${fa(size)}</b></label><label>شفافیت <input type="range" id="cvAlpha" min="5" max="100" value="${Math.round(alpha * 100)}"><b id="cvAlphaV">${fa(Math.round(alpha * 100))}٪</b></label>
      <button type="button" id="cvTheme" title="تم">🎭 تم</button><button type="button" id="cvLight" title="روشن/تاریک">${light ? '🌙' : '☀️'}</button><button type="button" id="cvMusic" title="موسیقی">🎵</button>`;
    $('cvSize').oninput = e => { size = +e.target.value; $('cvSizeV').textContent = fa(size); };
    $('cvAlpha').oninput = e => { alpha = +e.target.value / 100; $('cvAlphaV').textContent = fa(+e.target.value) + '٪'; };
    $('cvTheme').onclick = () => { const L = ['dream', 'sunset', 'mint']; theme = L[(L.indexOf(theme) + 1) % L.length]; jset('diary_cv_theme', theme); $('screen-canvas').dataset.cvt = theme; };
    $('cvLight').onclick = () => { light = !light; jset('diary_cv_light', light); $('screen-canvas').classList.toggle('cv-light', light); $('cvLight').textContent = light ? '🌙' : '☀️'; };
    $('cvMusic').onclick = () => { const b = $('mpPlay'); if (b) b.click(); };
  }
  function renderStks() {
    const el = $('cvStks'); if (!el) return; el.style.display = tool === 'sticker' ? '' : 'none';
    el.innerHTML = STICKERS.map(s => `<button type="button" data-s="${s}" class="${s === stickerPick ? 'on' : ''}">${s}</button>`).join('');
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { stickerPick = b.dataset.s; renderStks(); });
  }
  function renderAct() {
    const el = $('cvAct'); if (!el) return;
    el.innerHTML = secret ? '<button type="button" class="btn" data-x="save">🔒 ذخیره و ارسال مخفی</button><button type="button" class="btn ghost" data-x="exit">خروج از حالت مخفی</button>'
      : `<button type="button" class="btn" data-x="save">💾 ذخیره در گالری</button><button type="button" class="btn" data-x="finish">🏁 تموم شد!</button><button type="button" class="btn ghost" data-x="dl">⬇️ دانلود PNG</button><select id="cvFilter" class="cv-sel" title="فیلتر روی خروجی"><option value="">بدون فیلتر</option><option value="cartoon">🎞️ کارتونی</option><option value="sketch">✏️ مدادی</option><option value="soft">🌸 نرم و رویایی</option></select><button type="button" class="btn ghost" data-x="new">🆕 بوم تازه</button>`;
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const a = b.dataset.x; if (a === 'save') saveToGallery(); else if (a === 'finish') saveToGallery({ finish: true }); else if (a === 'dl') download(); else if (a === 'exit') toggleSecret(); else if (a === 'new') { if (confirm('بوم تازه شروع بشه؟ (نقاشی فعلی پاک می‌شه؛ اگه می‌خوای نگهش داری اول ذخیره کن)')) { strokes = []; redo = []; rebuild(); send({ t: 'clear' }); setMeta({ mode: 'free', turn: '', half: null, drawer: '', timerEnd: 0, topic: '' }); } } });
  }
  function renderBgs() {
    const el = $('cvBgs'); if (!el) return;
    el.innerHTML = '<span>پس‌زمینه:</span>' + Object.keys(BGS).map(k => `<button type="button" data-bg="${k}" class="${meta.bg === k ? 'on' : ''}">${BGS[k]}</button>`).join('');
    el.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setMeta({ bg: b.dataset.bg }));
  }

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
