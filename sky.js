/* 🌌 آسمان شب شخصی
   هر روزی که توش چیزی ثبت شده (فصل، عکس، آهنگ، یادداشت، رویداد، فایل، جواب سؤال روز) یه ستاره توی آسمونه.
   - روز دارای فصل/خاطره: ستارهٔ درخشان؛ روز دارای عکس: صورتی؛ دارای آهنگ: آبی؛ هر دو: بنفش
   - روی ستاره بزنی، اتفاق‌های اون روز نشون داده می‌شه
   - می‌شه چند ستاره رو به‌ترتیب وصل کرد و یه صورت فلکی (با اسم) از خاطره‌های مهم ساخت
   موقعیت هر ستاره فقط به تاریخش بستگی داره، پس ستاره‌ها جابه‌جا نمی‌شن و آسمون با بزرگ‌تر شدن آرشیو پُرستاره‌تر می‌شه. */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = { chapter: '#ffe08a', photo: '#ff8fc0', song: '#6fe3ff', both: '#c9a0ff', plain: '#cdd8ff' };
  const E0 = Date.UTC(2020, 0, 1);
  const frac = v => ((v % 1) + 1) % 1;
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const dayOf = ms => Recur.epochToWall(Number(ms)).iso;

  /* ---------- جمع‌کردن داده‌ها ---------- */
  let D = null;            // { days: {iso: {...}}, cons: [], consMissing }
  let stars = [];          // { day, nx, ny, kind, bright, total, phase }
  let cv, ctx, W = 0, H = 0, DPR = 1, raf = 0, selDay = null, hoverDay = null;
  let build = null;        // null یا { days: [] }
  let loading = false;
  const empty = () => ({ chapters: [], photos: [], songs: [], notes: [], events: [], files: [], answers: [] });

  async function gather() {
    const q = async (p) => { try { const r = await p; return r.error ? { err: r.error, data: [] } : { data: r.data || [] }; } catch (e) { return { err: e, data: [] }; } };
    const [ch, gl, sg, nt, ev, fl, da, cn] = await Promise.all([
      q(dbClient.from('chapters').select('id,title,created_at')), q(dbClient.from('gallery').select('*')), q(dbClient.from('songs').select('*')),
      q(dbClient.from('notes').select('*')), q(dbClient.from('events').select('*')), q(dbClient.from('files').select('*')),
      q(dbClient.from('daily_answers').select('*')), q(dbClient.from('constellations').select('*'))
    ]);
    const days = {}, at = iso => days[iso] || (days[iso] = empty());
    ch.data.forEach(r => { if (r.created_at && ((r.title || '').trim() || true)) at(dayOf(r.created_at)).chapters.push(r); });
    gl.data.forEach(r => { if (r.created_at) at(dayOf(r.created_at)).photos.push(r); });
    sg.data.forEach(r => { if (r.created_at) at(dayOf(r.created_at)).songs.push(r); });
    nt.data.forEach(r => { if (r.created_at) at(dayOf(r.created_at)).notes.push(r); });
    ev.data.forEach(r => { if (r.event_date) at(r.event_date).events.push(r); });
    fl.data.forEach(r => { if (r.created_at) at(dayOf(r.created_at)).files.push(r); });
    da.data.forEach(r => { if (r.day) at(r.day).answers.push(r); });
    const cons = (cn.data || []).map(c => ({ id: c.id, name: c.name || 'بی‌نام', days: String(c.days || '').split(',').filter(Boolean), author: c.author, created_at: c.created_at })).sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    const consMissing = !!cn.err && /constellations|relation|schema cache/i.test(cn.err.message || '');
    return { days, cons, consMissing, gallery: gl.data };
  }

  function makeStars() {
    stars = Object.keys(D.days).map(iso => {
      const d = D.days[iso], [y, m, dd] = Recur.parseIso(iso), n = Math.round((Date.UTC(y, m - 1, dd) - E0) / 864e5);
      const hasC = d.chapters.length > 0, ph = d.photos.length > 0, sg = d.songs.length > 0;
      const total = d.chapters.length * 3 + d.photos.length + d.songs.length + d.notes.length + d.events.length + d.files.length + d.answers.length;
      const kind = ph && sg ? 'both' : ph ? 'photo' : sg ? 'song' : hasC ? 'chapter' : 'plain';
      const hj = hash(iso);
      return { day: iso, nx: .05 + .9 * frac(.5 + n * 0.7548776662466927) + ((hj % 100) - 50) / 5000, ny: .08 + .84 * frac(.5 + n * 0.5698402909980532) + (((hj >> 8) % 100) - 50) / 5000, kind, bright: hasC, total, phase: (hj % 628) / 100, sp: .8 + (hj % 7) / 5 };
    });
  }
  const starByDay = iso => stars.find(s => s.day === iso);
  const px = s => ({ x: s.nx * W, y: s.ny * H });

  /* ---------- نقاشی ---------- */
  let bgLayer = null;
  function paintBg() {
    bgLayer = document.createElement('canvas'); bgLayer.width = W * DPR; bgLayer.height = H * DPR; const c = bgLayer.getContext('2d'); c.scale(DPR, DPR);
    const g = c.createLinearGradient(0, 0, W * .3, H); g.addColorStop(0, '#05030f'); g.addColorStop(.55, '#120a2a'); g.addColorStop(1, '#2a1240'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = mulberry(7);
    for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H, rad = 140 + r() * 260, h = [270, 300, 330, 220][i % 4]; const rg = c.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, `hsla(${h},70%,45%,.16)`); rg.addColorStop(1, `hsla(${h},70%,45%,0)`); c.fillStyle = rg; c.fillRect(0, 0, W, H); }
    c.save(); c.translate(W / 2, H / 2); c.rotate(-.5); const mg = c.createLinearGradient(0, -H * .18, 0, H * .18); mg.addColorStop(0, 'rgba(200,170,255,0)'); mg.addColorStop(.5, 'rgba(200,170,255,.07)'); mg.addColorStop(1, 'rgba(200,170,255,0)'); c.fillStyle = mg; c.fillRect(-W, -H * .18, W * 2, H * .36); c.restore();
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${.05 + r() * .25})`; const s = r() < .08 ? 1.6 : 1; c.fillRect(r() * W, r() * H, s, s); }
  }
  function sparkle(c, x, y, rad) { c.beginPath(); c.moveTo(x, y - rad); c.quadraticCurveTo(x, y, x + rad, y); c.quadraticCurveTo(x, y, x, y + rad); c.quadraticCurveTo(x, y, x - rad, y); c.quadraticCurveTo(x, y, x, y - rad); c.closePath(); }
  function consPoints(days) { return days.map(starByDay).filter(Boolean).map(px); }
  const FONT = '600 13px Estedad, Sahel, Tahoma, sans-serif';

  function frame(t) {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgLayer, 0, 0); ctx.scale(DPR, DPR);
    // صورت‌های فلکی ذخیره‌شده
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.font = FONT;
    D.cons.forEach(cn => {
      const pts = consPoints(cn.days); if (pts.length < 2) return;
      const hot = cn.id === (D.focus || '');
      ctx.strokeStyle = hot ? 'rgba(255,224,138,.95)' : 'rgba(255,224,138,.38)'; ctx.lineWidth = hot ? 2.2 : 1.2; ctx.setLineDash(hot ? [] : [5, 5]);
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = Math.min(...pts.map(p => p.y)) - 14;
      ctx.fillStyle = hot ? '#fff3c4' : 'rgba(255,236,170,.8)'; ctx.fillText(cn.name, Math.max(40, Math.min(W - 40, cx)), Math.max(16, cy));
    });
    // پیش‌نویس صورت فلکی در حال ساخت
    if (build && build.days.length) {
      const pts = consPoints(build.days);
      ctx.strokeStyle = 'rgba(160,230,255,.9)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
    }
    // ستاره‌ها (اول کم‌نورها)
    const order = stars.slice().sort((a, b) => (a.bright - b.bright) || (a.total - b.total));
    const anim = !reduced();
    order.forEach(s => {
      const { x, y } = px(s), col = COL[s.kind], tw = anim ? .78 + .22 * Math.sin(t / 1000 * s.sp + s.phase) : 1;
      const rad = (s.bright ? 5 + Math.min(5, Math.log2(s.total + 1)) : 2 + Math.min(2.5, Math.log2(s.total + 1) * .7));
      const glow = rad * (s.bright ? 6 : 3.2) * (.9 + .1 * tw);
      const g = ctx.createRadialGradient(x, y, 0, x, y, glow); g.addColorStop(0, col + (s.bright ? 'cc' : '77')); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.fillRect(x - glow, y - glow, glow * 2, glow * 2);
      ctx.fillStyle = col; ctx.globalAlpha = tw;
      if (s.bright) { sparkle(ctx, x, y, rad * 2.1); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, rad * .45, 0, 6.3); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3); ctx.fill(); }
      ctx.globalAlpha = 1;
      const bi = build ? build.days.indexOf(s.day) : -1;
      if (s.day === selDay || s.day === hoverDay || bi >= 0) {
        ctx.strokeStyle = bi >= 0 ? '#a0e6ff' : '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, rad * 2.8 + 3, 0, 6.3); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = FONT; ctx.textAlign = 'center';
        ctx.fillText(bi >= 0 ? fa(bi + 1) : Recur.fmtJalaliShort(s.day), x, y - rad * 2.8 - 9);
      }
    });
    // ستارهٔ امروز اگه هنوز چیزی ثبت نشده: حلقهٔ کم‌رنگ
    const today = Recur.todayIso();
    if (!D.days[today]) {
      const [y, m, dd] = Recur.parseIso(today), n = Math.round((Date.UTC(y, m - 1, dd) - E0) / 864e5), x = (.05 + .9 * frac(.5 + n * 0.7548776662466927)) * W, yy = (.08 + .84 * frac(.5 + n * 0.5698402909980532)) * H;
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, yy, 9 + 2 * Math.sin(t / 600), 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    }
    // شهاب گاه‌به‌گاه
    if (anim) {
      const k = (t / 1000) % 14;
      if (k < 1.1) { const p = k / 1.1, sx = W * .15 + W * .55 * p, sy = H * .06 + H * .3 * p; const g = ctx.createLinearGradient(sx, sy, sx - 70, sy - 40); g.addColorStop(0, `rgba(255,255,255,${1 - p})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 70, sy - 40); ctx.stroke(); }
    }
  }
  function loop(t) {
    raf = 0;
    const scr = document.getElementById('screen-sky');
    if (!scr || !scr.classList.contains('active') || document.hidden) return;
    frame(t);
    if (!reduced()) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  /* ---------- رابط ---------- */
  const box = () => document.getElementById('skyBox');
  function layout() {
    const wrap = document.getElementById('skyWrap'); if (!wrap || !cv) return;
    W = Math.max(280, wrap.clientWidth); H = Math.round(Math.min(640, Math.max(380, W * .86))); DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR; cv.height = H * DPR; cv.style.height = H + 'px'; ctx = cv.getContext('2d'); paintBg(); kick();
  }
  function pointer(e) { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) * (W / r.width), y: (p.clientY - r.top) * (H / r.height) }; }
  function hit(p) { let best = null, bd = 28; stars.forEach(s => { const q = px(s), d = Math.hypot(q.x - p.x, q.y - p.y) - (s.bright ? 4 : 0); if (d < bd) { bd = d; best = s; } }); return best; }
  function onClick(e) {
    const s = hit(pointer(e));
    if (build) { if (s) { const i = build.days.indexOf(s.day); i >= 0 ? build.days.splice(i, 1) : build.days.push(s.day); panel(); kick(); } return; }
    selDay = s ? s.day : null; D.focus = ''; panel(); kick();
  }
  function onMove(e) { if (e.pointerType === 'touch') return; const s = hit(pointer(e)), d = s ? s.day : null; if (d !== hoverDay) { hoverDay = d; cv.style.cursor = d ? 'pointer' : 'default'; kick(); } }

  const list = (arr, fn) => arr.length ? arr.map(fn).join('') : '';
  function dayCard(iso) {
    const d = D.days[iso]; if (!d) return '';
    const sec = (t, html) => html ? `<div class="sky-sec"><b>${t}</b>${html}</div>` : '';
    const thumbs = d.photos.length ? `<div class="sky-thumbs">${d.photos.map(p => p.kind === 'video' ? `<button type="button" class="sky-th vid" data-act="photo" data-id="${esc(p.id)}">🎬</button>` : `<button type="button" class="sky-th" data-act="photo" data-id="${esc(p.id)}"><img loading="lazy" src="${esc(p.url)}" alt=""></button>`).join('')}</div>` : '';
    return `<div class="sky-day"><div class="sky-dayh"><span class="sky-dot" style="background:${COL[starByDay(iso).kind]}"></span>${Recur.fmtJalaliLong(iso)}</div>
      ${sec('📖 فصل‌ها', list(d.chapters, c => `<button type="button" class="sky-link" data-act="chapter" data-id="${esc(c.id)}">${esc((c.title || '').trim() || 'بی‌عنوان')}</button>`))}
      ${sec('🖼️ عکس و فیلم', thumbs)}
      ${sec('🎵 آهنگ‌ها', list(d.songs, s => `<button type="button" class="sky-link" data-act="song" data-id="${esc(s.id)}">${esc(s.title || 'آهنگ')}</button>`))}
      ${sec('📝 یادداشت‌ها', list(d.notes, n => `<p>${esc(n.text)}</p>`))}
      ${sec('📅 رویدادها', list(d.events, e => `<p>${esc(e.emoji || '📅')} ${esc(e.title)}</p>`))}
      ${sec('📁 فایل‌ها', list(d.files, f => `<p>${esc(f.name)}</p>`))}
      ${sec('❓ سؤال روز', list(d.answers, a => `<p><small>${esc(a.question || '')}</small><br><b>${esc(a.author || '')}:</b> ${esc(a.text)}</p>`))}
      <div class="sky-row"><button type="button" class="btn ghost" data-act="startbuild" data-day="${iso}">✨ شروع صورت فلکی از این ستاره</button></div></div>`;
  }
  function panel() {
    const p = document.getElementById('skyPanel'); if (!p) return;
    const nStars = stars.length, nBright = stars.filter(s => s.bright).length;
    let h = '';
    if (build) {
      h += `<div class="sky-build"><b>✨ ساخت صورت فلکی</b><p>ستاره‌ها رو به ترتیب انتخاب کن تا بهم وصل بشن (${fa(build.days.length)} ستاره انتخاب شده). دوباره زدن روی یه ستاره برش می‌داره.</p>
        <input id="skyName" type="text" maxlength="40" placeholder="اسم صورت فلکی؛ مثلاً «اولین تابستان ما»" />
        <div class="sky-row"><button class="btn" type="button" data-act="savebuild">⭐ ذخیره</button><button class="btn ghost" type="button" data-act="cancelbuild">انصراف</button></div></div>`;
      p.innerHTML = h; const nm = document.getElementById('skyName'); if (nm && build.name) nm.value = build.name; if (nm) nm.oninput = () => { build.name = nm.value; }; return;
    }
    h += `<div class="sky-sum">⭐ ${fa(nStars)} روز ستاره‌دار · ✨ ${fa(nBright)} ستارهٔ درخشان</div>
      <div class="sky-legend"><span><i style="background:${COL.chapter}"></i>خاطره</span><span><i style="background:${COL.photo}"></i>عکس</span><span><i style="background:${COL.song}"></i>آهنگ</span><span><i style="background:${COL.both}"></i>عکس + آهنگ</span><span><i style="background:${COL.plain}"></i>چیزای دیگه</span></div>`;
    if (selDay && D.days[selDay]) h += dayCard(selDay); else h += '<div class="sky-hint">روی یه ستاره بزن تا اتفاق‌های اون روز رو ببینی 🌠</div>';
    h += `<div class="sky-sub">🌌 صورت‌های فلکی ما</div>`;
    if (D.consMissing) h += '<div class="sky-hint">برای صورت فلکی باید بخش جدید فایل supabase-setup.sql رو یک بار توی Supabase اجرا کنی.</div>';
    else {
      h += D.cons.length ? `<div class="sky-cons">${D.cons.map(c => `<span class="sky-con${D.focus === c.id ? ' on' : ''}"><button type="button" data-act="focus" data-id="${esc(c.id)}">🌟 ${esc(c.name)} <small>(${fa(c.days.length)})</small></button><button type="button" class="x" data-act="delcon" data-id="${esc(c.id)}" title="حذف">✕</button></span>`).join('')}</div>` : '<div class="sky-hint">هنوز صورت فلکی نساختیم. چند تا خاطرهٔ مهم رو به هم وصل کن!</div>';
      h += '<div class="sky-row"><button type="button" class="btn" data-act="startbuild">✨ ساخت صورت فلکی</button></div>';
    }
    p.innerHTML = h;
  }
  function jump(fn) { return () => fn(); }
  async function onPanel(e) {
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, id = b.dataset.id;
    if (a === 'chapter') { showScreen('chapters'); setTimeout(() => openChapter(id), 150); }
    else if (a === 'photo') {
      const g = (D.gallery || []).find(x => x.id === id); if (!g) return; showScreen('gallery');
      setTimeout(() => { try { if (!galleryList.some(x => x.id === id)) galleryList = (D.gallery || []).slice().sort((a, b) => b.created_at - a.created_at); openLightbox(galleryList.find(x => x.id === id) || g); } catch (er) { console.warn(er); } }, 600);
    }
    else if (a === 'song') { showScreen('playlist'); }
    else if (a === 'startbuild') { build = { days: b.dataset.day ? [b.dataset.day] : [], name: '' }; panel(); kick(); }
    else if (a === 'cancelbuild') { build = null; panel(); kick(); }
    else if (a === 'savebuild') await saveBuild();
    else if (a === 'focus') { D.focus = D.focus === id ? '' : id; panel(); kick(); }
    else if (a === 'delcon') { if (!confirm('این صورت فلکی حذف بشه؟ (ستاره‌ها می‌مونن)')) return; const { error } = await dbClient.from('constellations').delete().eq('id', id); if (error) { toast('⚠️ حذف نشد'); return; } D.cons = D.cons.filter(c => c.id !== id); panel(); kick(); }
  }
  async function saveBuild() {
    const name = (build.name || '').trim();
    if (build.days.length < 2) { toast('حداقل دو تا ستاره انتخاب کن ✨'); return; }
    if (!name) { toast('یه اسم برای صورت فلکی بذار 💜'); return; }
    const row = { id: 'cn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: name.slice(0, 40), days: build.days.join(','), author: (typeof myName === 'function' && myName()) || 'ناشناس', created_at: Date.now() };
    const { error } = await dbClient.from('constellations').insert(row);
    if (error) { D.consMissing = /constellations|relation|schema cache/i.test(error.message || ''); toast('⚠️ ذخیره نشد' + (D.consMissing ? ' (فایل SQL اجرا نشده)' : '')); build = D.consMissing ? null : build; panel(); return; }
    D.cons.push({ id: row.id, name: row.name, days: build.days.slice(), author: row.author, created_at: row.created_at }); D.focus = row.id; build = null;
    toast('🌌 صورت فلکی «' + row.name + '» ساخته شد'); try { notify('constellation', row.name, row.id); } catch (e) {}
    panel(); kick();
  }

  function mount() {
    const b = box(); if (!b) return;
    b.innerHTML = '<div id="skyWrap"><canvas id="skyCv" role="img" aria-label="آسمان شبِ خاطره‌ها؛ هر ستاره یک روز ثبت‌شده است"></canvas></div><div id="skyPanel"></div>';
    cv = document.getElementById('skyCv'); ctx = cv.getContext('2d');
    cv.addEventListener('click', onClick); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', () => { hoverDay = null; kick(); });
    document.getElementById('skyPanel').addEventListener('click', onPanel);
    layout();
  }
  let rsT; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (cv && document.getElementById('screen-sky') && document.getElementById('screen-sky').classList.contains('active')) layout(); }, 150); });

  async function load() {
    if (D && cv && cv.isConnected) { layout(); panel(); kick(); }
    if (loading) return; loading = true;
    try {
      try { await Promise.all([document.fonts.load('600 13px Estedad'), document.fonts.load('400 13px Sahel')]); } catch (e) {}
      const d = await gather(); const keepFocus = D && D.focus;
      D = d; D.focus = keepFocus || ''; makeStars();
      if (!document.getElementById('skyCv') || !cv || !cv.isConnected) mount(); else layout();
      if (selDay && !D.days[selDay]) selDay = null;
      panel(); kick();
    } finally { loading = false; }
  }
  window.Sky = { load, invalidate: () => {}, kick, _stars: () => stars, _state: () => ({ D, build, selDay }), _click: (day) => { const s = starByDay(day); if (!s) return; const r = cv.getBoundingClientRect(), q = px(s); onClick({ clientX: r.left + q.x * (r.width / W), clientY: r.top + q.y * (r.height / H) }); } };
})();
