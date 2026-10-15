/* 🧩 پازل عکس
   یه عکس از گالری انتخاب می‌کنی، سختی (۳×۳ / ۴×۴ / ۵×۵) رو می‌گی و سایت عکس رو تکه‌تکه و قاطی می‌کنه.
   قطعه‌ها رو با کشیدن و رها کردن (موس یا لمس) جابه‌جا کن؛ یا یکی رو بزن و بعد قطعهٔ دوم رو.
   وقتی همه سر جاشون بود عکس کامل نشون داده می‌شه و بهترین زمان هر پازل (عکس + سختی) برای هر نفر ثبت می‌شه. */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LEVELS = [[3, 'آسان', '۳×۳'], [4, 'متوسط', '۴×۴'], [5, 'سخت', '۵×۵']];
  const LKEY = 'puzzle_rec_v1';

  let photos = [], recs = [], recsMissing = false, loaded = false;
  let pick = null, level = 3, showOk = true;
  let P = null;   // بازی در حال انجام: { photo, n, ratio, order, t0, moves, done, sel, timer, peeks }
  const me = () => (typeof myName === 'function' && myName()) || 'ناشناس';
  const same = (a, b) => Recur.sameName(a, b);
  const fmt = ms => { const s = ms / 1000, m = Math.floor(s / 60); return fa(String(m).padStart(2, '0')) + ':' + fa((s - m * 60).toFixed(1).padStart(4, '0')); };

  /* ---------- داده ---------- */
  function localRecs() { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch (e) { return []; } }
  function saveLocal(r) { try { const all = localRecs().filter(x => x.id !== r.id); all.push(r); localStorage.setItem(LKEY, JSON.stringify(all.slice(-200))); } catch (e) {} }
  async function loadAll() {
    const g = await dbClient.from('gallery').select('*').order('created_at', { ascending: false });
    photos = (g.data || []).filter(x => x.kind !== 'video' && x.url);
    const r = await dbClient.from('puzzle_records').select('*');
    if (r.error) { recsMissing = /puzzle_records|relation|schema cache/i.test(r.error.message || ''); recs = localRecs(); }
    else { recsMissing = false; recs = r.data || []; }
    loaded = true;
  }
  const recId = (photoId, n, author) => 'pz_' + Recur.nameKey(author) + '_' + photoId + '_' + n;
  const myRec = (photoId, n) => recs.find(r => r.photo_id === photoId && r.size === n && same(r.author, me()));
  async function record(photo, n, ms, moves) {
    const old = myRec(photo.id, n);
    if (old && old.time_ms <= ms) return { best: false, prev: old.time_ms };
    const row = { id: recId(photo.id, n, me()), photo_id: photo.id, size: n, author: me(), time_ms: Math.round(ms), moves, url: photo.url && photo.url.length < 2000 ? photo.url : '', created_at: Date.now() };
    saveLocal(row);
    const { error } = await dbClient.from('puzzle_records').upsert(row);
    if (error) recsMissing = /puzzle_records|relation|schema cache/i.test(error.message || '');
    recs = recs.filter(r => r.id !== row.id); recs.push(row);
    return { best: true, prev: old ? old.time_ms : null };
  }

  /* ---------- صفحهٔ انتخاب ---------- */
  const box = () => document.getElementById('puzzleBox');
  function setup() {
    const el = box(); if (!el) return;
    const best = pick ? myRec(pick.id, level) : null;
    el.innerHTML = `<div class="pz-sec"><b>۱) عکس رو انتخاب کن</b></div>
      ${photos.length ? `<div class="pz-grid">${photos.map(p => `<button type="button" class="pz-th${pick && pick.id === p.id ? ' on' : ''}" data-photo="${esc(p.id)}"><img loading="lazy" src="${esc(p.url)}" alt=""></button>`).join('')}</div>` : '<div class="pz-note">هنوز عکسی توی گالری نیست. اول یه عکس به «🖼️ گالری» اضافه کن تا بشه ازش پازل ساخت.</div>'}
      <div class="pz-sec"><b>۲) سختی</b></div>
      <div class="pz-levels">${LEVELS.map(([n, nm, lb]) => `<button type="button" class="pz-lv${level === n ? ' on' : ''}" data-level="${n}">${nm} <small>${lb}</small></button>`).join('')}</div>
      <div class="pz-row"><button class="btn" type="button" data-act="start" ${pick ? '' : 'disabled'}>🧩 شروع پازل</button>${best ? `<span class="pz-best">🏆 بهترین زمان تو: ${fmt(best.time_ms)}</span>` : ''}</div>
      ${recsHtml()}`;
  }
  function recsHtml() {
    const groups = {};
    recs.forEach(r => { const k = r.photo_id + '|' + r.size; (groups[k] = groups[k] || []).push(r); });
    const keys = Object.keys(groups).sort((a, b) => Math.max(...groups[b].map(r => r.created_at || 0)) - Math.max(...groups[a].map(r => r.created_at || 0)));
    let h = '<div class="pz-sec"><b>🏆 رکوردها</b></div>';
    if (recsMissing) h += '<div class="pz-note">رکوردها فعلاً فقط توی همین دستگاه ذخیره می‌شن. برای اینکه هر دو نفر رکوردهای همدیگه رو ببینید فایل supabase-setup.sql رو یک بار توی Supabase اجرا کن.</div>';
    if (!keys.length) return h + '<div class="pz-note">هنوز رکوردی ثبت نشده. اولین پازل رو حل کن! ⏱️</div>';
    return h + '<div class="pz-recs">' + keys.map(k => {
      const rs = groups[k].slice().sort((a, b) => a.time_ms - b.time_ms), ph = photos.find(p => p.id === rs[0].photo_id), url = ph ? ph.url : rs[0].url, lv = LEVELS.find(l => l[0] === rs[0].size);
      return `<div class="pz-rec">${url ? `<img src="${esc(url)}" alt="">` : '<span class="pz-noimg">🧩</span>'}<div><div class="pz-rl">${lv ? lv[2] : rs[0].size + '×' + rs[0].size}</div>${rs.map((r, i) => `<div class="pz-rr${same(r.author, me()) ? ' me' : ''}">${i === 0 ? '🥇' : '⏱️'} ${esc(r.author || 'ناشناس')} · ${fmt(r.time_ms)} · ${fa(r.moves || 0)} حرکت</div>`).join('')}</div></div>`;
    }).join('') + '</div>';
  }

  /* ---------- بازی ---------- */
  function shuffle(n) {
    const t = n * n; let a;
    do { a = [...Array(t).keys()]; for (let i = t - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } } while (a.every((v, i) => v === i));
    return a;
  }
  async function start() {
    if (!pick) return;
    const img = new Image();
    const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = pick.url; });
    if (!ok || !img.naturalWidth) { toast('⚠️ عکس باز نشد'); return; }
    stop();
    P = { photo: pick, n: level, ratio: Math.max(.6, Math.min(1.6, img.naturalWidth / img.naturalHeight)), order: shuffle(level), t0: 0, moves: 0, done: false, sel: -1, timer: 0, peeks: 0, elapsed: 0 };
    game();
  }
  function stop() { if (P && P.timer) clearInterval(P.timer); }
  function game() {
    const el = box(); if (!el || !P) return;
    const lv = LEVELS.find(l => l[0] === P.n), best = myRec(P.photo.id, P.n);
    el.innerHTML = `<div class="pz-hud"><span>⏱️ <b id="pzTime">${fmt(0)}</b></span><span>🔀 <b id="pzMoves">${fa(0)}</b> حرکت</span><span>${lv[1]} ${lv[2]}</span>${best ? `<span>🏆 ${fmt(best.time_ms)}</span>` : ''}</div>
      <div id="pzStage"><div id="pzBoard" class="pz-board" style="--n:${P.n};--ar:${P.ratio};--img:url('${P.photo.url.replace(/'/g, '%27')}')"></div></div>
      <label class="pz-chk"><input type="checkbox" id="pzOk" ${showOk ? 'checked' : ''}> نشون دادن قطعه‌های درست</label>
      <div class="pz-row"><button class="btn ghost" type="button" data-act="peek">👁️ نگاه به عکس (نگه دار)</button><button class="btn ghost" type="button" data-act="reshuffle">🔀 دوباره قاطی کن</button><button class="btn ghost" type="button" data-act="back">↩ عکس دیگه</button></div>
      <div id="pzResult"></div>`;
    document.getElementById('pzOk').onchange = e => { showOk = e.target.checked; paint(); };
    const pk = el.querySelector('[data-act=peek]');
    const peek = on => { const b = document.getElementById('pzBoard'); if (!b || P.done) return; b.classList.toggle('peek', on); if (on) P.peeks++; };
    pk.addEventListener('pointerdown', e => { e.preventDefault(); peek(true); }); ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => pk.addEventListener(ev, () => peek(false)));
    pk.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); peek(true); } }); pk.addEventListener('keyup', () => peek(false));
    paint();
  }
  function paint() {
    const b = document.getElementById('pzBoard'); if (!b || !P) return; const n = P.n;
    b.className = 'pz-board' + (P.done ? ' done' : '') + (b.classList.contains('peek') ? ' peek' : '');
    b.innerHTML = P.order.map((p, slot) => {
      const x = p % n, y = Math.floor(p / n), ok = p === slot;
      return `<div class="pz-piece${showOk && ok && !P.done ? ' ok' : ''}${P.sel === slot ? ' sel' : ''}" data-slot="${slot}" data-p="${p}" style="background-image:url('${P.photo.url.replace(/'/g, '%27')}');background-size:${n * 100}% ${n * 100}%;background-position:${n > 1 ? x / (n - 1) * 100 : 0}% ${n > 1 ? y / (n - 1) * 100 : 0}%"></div>`;
    }).join('');
  }
  function tick() { if (!P || P.done || !P.t0) return; P.elapsed = performance.now() - P.t0; const t = document.getElementById('pzTime'); if (t) t.textContent = fmt(P.elapsed); }
  function begin() { if (!P.t0) { P.t0 = performance.now(); P.timer = setInterval(tick, 100); } }
  function swap(a, b) {
    if (a === b || P.done) return; begin();
    [P.order[a], P.order[b]] = [P.order[b], P.order[a]]; P.moves++; P.sel = -1;
    document.getElementById('pzMoves').textContent = fa(P.moves); paint();
    if (P.order.every((p, i) => p === i)) win();
  }
  async function win() {
    P.done = true; stop(); P.elapsed = performance.now() - P.t0; tick(); paint();
    const t = document.getElementById('pzTime'); if (t) t.textContent = fmt(P.elapsed);
    const r = await record(P.photo, P.n, P.elapsed, P.moves);
    const res = document.getElementById('pzResult'); if (!res) return;
    res.innerHTML = `<div class="pz-win"><div class="pz-big">🎉 پازل کامل شد!</div><div>⏱️ ${fmt(P.elapsed)} · 🔀 ${fa(P.moves)} حرکت</div>
      <div class="pz-rcd">${r.best ? (r.prev == null ? '🏆 اولین رکورد این پازل ثبت شد!' : '🏆 رکورد جدید! (قبلی: ' + fmt(r.prev) + ')') : 'رکورد تو برای این پازل: ' + fmt(r.prev) + ' (این بار بهتر نشد، دوباره امتحان کن 💪)'}</div>
      <div class="pz-row" style="justify-content:center"><button class="btn" type="button" data-act="again">🔁 دوباره</button><button class="btn ghost" type="button" data-act="back">🖼️ عکس دیگه</button></div></div>`;
    if (!reduced()) confetti();
    try { window.CatPal && CatPal.act('puzzle'); } catch (e) {}
  }
  function confetti() {
    const b = document.getElementById('pzBoard'); if (!b) return; const r = b.getBoundingClientRect();
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span'); s.textContent = ['🎉', '✨', '💜', '⭐', '🧩'][i % 5]; s.style.cssText = `position:fixed;z-index:200;pointer-events:none;font-size:20px;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px`; document.body.appendChild(s);
      const dx = (Math.random() - .5) * r.width * 1.2, dy = (Math.random() - .8) * r.height;
      s.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(1.3) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 1100 + Math.random() * 700, easing: 'ease-out' }).onfinish = () => s.remove();
    }
  }

  /* ---------- کشیدن و رها کردن (موس و لمس) ---------- */
  let drag = null;
  function onDown(e) {
    const pc = e.target.closest && e.target.closest('.pz-piece'); if (!pc || !P || P.done || e.button > 0) return;
    e.preventDefault(); const r = pc.getBoundingClientRect();
    drag = { el: pc, slot: +pc.dataset.slot, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
    try { pc.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function targetAt(x, y) { if (!drag) return null; drag.el.style.pointerEvents = 'none'; const t = document.elementFromPoint(x, y); drag.el.style.pointerEvents = ''; return t && t.closest ? t.closest('.pz-piece') : null; }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true; drag.el.classList.add('drag'); drag.el.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`;
    document.querySelectorAll('.pz-piece.over').forEach(x => x.classList.remove('over')); const t = targetAt(e.clientX, e.clientY); if (t && t !== drag.el) t.classList.add('over');
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
    document.querySelectorAll('.pz-piece.over').forEach(x => x.classList.remove('over'));
    if (d.moved) {
      d.el.classList.remove('drag'); d.el.style.transform = '';
      drag = d; const t = targetAt(e.clientX, e.clientY); drag = null;
      if (t && t !== d.el) swap(d.slot, +t.dataset.slot); else paint();
    } else {   // کلیک: انتخاب و بعد جابه‌جایی با قطعهٔ دوم
      if (P.sel < 0) { P.sel = d.slot; paint(); } else if (P.sel === d.slot) { P.sel = -1; paint(); } else swap(P.sel, d.slot);
    }
  }

  function onClick(e) {
    const t = e.target.closest('[data-photo],[data-level],[data-act]'); if (!t) return;
    if (t.dataset.photo) { pick = photos.find(p => p.id === t.dataset.photo) || null; setup(); }
    else if (t.dataset.level) { level = +t.dataset.level; setup(); }
    else if (t.dataset.act === 'start' || t.dataset.act === 'again') { if (t.dataset.act === 'again') P = null; start(); }
    else if (t.dataset.act === 'reshuffle') { stop(); const ph = P.photo, n = P.n, ratio = P.ratio; P = { photo: ph, n, ratio, order: shuffle(n), t0: 0, moves: 0, done: false, sel: -1, timer: 0, peeks: 0, elapsed: 0 }; game(); }
    else if (t.dataset.act === 'back') { stop(); P = null; setup(); }
  }
  function mount() {
    const el = box(); if (!el || el.dataset.bound) return; el.dataset.bound = '1';
    el.addEventListener('click', onClick); el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', e => { if (drag) { drag.el.classList.remove('drag'); drag.el.style.transform = ''; drag = null; paint(); } });
  }
  async function load() {
    mount();
    if (P && !P.done) return;           // وسط بازی صفحه رو عوض نکن
    if (!loaded) { box().innerHTML = '<div class="pz-note">⏳ چند لحظه...</div>'; }
    await loadAll();
    if (pick) pick = photos.find(p => p.id === pick.id) || null;
    if (!P) setup();
  }
  window.Puzzle = { load, _state: () => ({ P, pick, level, recs }), _record: (photo, n, ms, mv) => record(photo, n, ms, mv), _fmt: fmt };
})();
