/* 🌳 باغی که از خاطره‌ها رشد می‌کنه
   هر خاطره یه موجود زنده‌ست و به محتوای واقعی خودش وصله:
     فصل (نوشته) ← رز 🌹        عکس ← گل 🌸 (فیلم ← آفتابگردان 🌻)
     خاطرهٔ صوتی (فصلِ دارای صدا یا فایل صوتی) ← زنگوله 🔔
     آهنگ پلی‌لیست ← درخت نورانی 🌳        یادداشت ← جوانه 🌱 (انجام‌شده: غنچه می‌ده)
   تعداد و جای گیاه‌ها فقط از داده‌های واقعی میاد؛ با اضافه شدن خاطره، باغ خودش پُرتر می‌شه. */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frac = v => ((v % 1) + 1) % 1;
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const dayOf = ms => Recur.epochToWall(Number(ms)).iso;

  const TYPES = {
    chapter: { ico: '🌹', name: 'فصل', group: 'chapter' },
    photo:   { ico: '🌸', name: 'عکس', group: 'photo' },
    video:   { ico: '🌻', name: 'فیلم', group: 'photo' },
    bell:    { ico: '🔔', name: 'خاطرهٔ صوتی', group: 'bell' },
    song:    { ico: '🌳', name: 'آهنگ', group: 'song' },
    note:    { ico: '🌱', name: 'یادداشت', group: 'note' }
  };
  const GROUPS = [['chapter', '🌹', 'فصل'], ['photo', '🌸', 'عکس و فیلم'], ['bell', '🔔', 'صوتی'], ['song', '🌳', 'آهنگ'], ['note', '🌱', 'یادداشت']];

  let G = null;             // { items:[], gallery:[], files:[], favs:[], favMissing }
  let filt = { year: null, groups: new Set(), fav: false };
  let favMode = false, shown = new Set(), loading = false;

  /* ---------- داده ---------- */
  async function gather() {
    const q = async p => { try { const r = await p; return r.error ? { err: r.error, data: [] } : { data: r.data || [] }; } catch (e) { return { err: e, data: [] }; } };
    const [ch, au, gl, sg, nt, fl, fv] = await Promise.all([
      q(dbClient.from('chapters').select('id,title,created_at')),
      q(dbClient.from('chapters').select('id').ilike('content', '%<audio%')),
      q(dbClient.from('gallery').select('*')), q(dbClient.from('songs').select('*')),
      q(dbClient.from('notes').select('*')), q(dbClient.from('files').select('*')), q(dbClient.from('garden_favs').select('*'))
    ]);
    const audioIds = new Set(au.data.map(r => r.id)), items = [];
    const add = (type, id, title, ts, extra) => { if (!ts) return; const iso = dayOf(ts); items.push(Object.assign({ key: type + ':' + id, type, id, title: String(title || '').trim(), ts: Number(ts), iso, year: Recur.jalaliFromIso(iso).jy }, extra || {})); };
    ch.data.forEach(r => add(audioIds.has(r.id) ? 'bell' : 'chapter', r.id, r.title || 'بی‌عنوان', r.created_at, audioIds.has(r.id) ? { src: 'chapter' } : null));
    gl.data.forEach(r => add(r.kind === 'video' ? 'video' : 'photo', r.id, r.kind === 'video' ? 'یه فیلم' : 'یه عکس', r.created_at));
    fl.data.filter(r => /^audio\//i.test(r.mime || '') || /\.(mp3|m4a|wav|ogg|aac|opus)$/i.test(r.name || '')).forEach(r => add('bell', r.id, r.name, r.created_at, { src: 'file' }));
    sg.data.forEach(r => add('song', r.id, r.title || 'آهنگ', r.created_at));
    nt.data.forEach(r => add('note', r.id, (r.text || '').slice(0, 60) || 'یادداشت', r.created_at, { done: !!r.done, text: r.text || '' }));
    items.sort((a, b) => a.ts - b.ts);
    const favMissing = !!fv.err && /garden_favs|relation|schema cache/i.test(fv.err.message || '');
    return { items, gallery: gl.data, files: fl.data, favs: fv.data || [], favMissing };
  }
  const me = () => (typeof myName === 'function' && myName()) || 'ناشناس';
  const favsOf = key => G.favs.filter(f => f.key === key);
  const isFav = key => favsOf(key).length > 0;
  const myFav = key => G.favs.find(f => f.key === key && (f.author || '').trim().toLowerCase() === me().trim().toLowerCase());

  /* ---------- تصویر گیاه‌ها (SVG) ---------- */
  const SYMS = `
  <radialGradient id="gGlow"><stop offset="0" stop-color="#fff3a8" stop-opacity=".9"/><stop offset="1" stop-color="#fff3a8" stop-opacity="0"/></radialGradient>
  <radialGradient id="gGlowG"><stop offset="0" stop-color="#9dffd0" stop-opacity=".55"/><stop offset="1" stop-color="#9dffd0" stop-opacity="0"/></radialGradient>
  <symbol id="s-rose" viewBox="0 0 100 120"><path d="M50 116 C48 90 52 70 50 50" stroke="#3f9a62" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 92 C34 90 28 80 30 72 C42 72 50 80 50 92Z M50 80 C64 76 72 68 70 60 C58 60 50 68 50 80Z" fill="#4fb878"/>
    <circle cx="50" cy="40" r="22" fill="#c2325b"/><circle cx="50" cy="40" r="16" fill="#e0476f"/><path d="M50 40 m-9 0 a9 9 0 1 1 9 9 a5 5 0 1 1 -5 -5 a2.4 2.4 0 1 1 2.4 2.4" stroke="#ffb3c8" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M36 30 q6 -10 16 -8" stroke="#ff8aa9" stroke-width="2" fill="none" stroke-linecap="round"/></symbol>
  <symbol id="s-photo" viewBox="0 0 100 120"><path d="M50 116 C52 96 48 78 50 56" stroke="#3f9a62" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M50 98 C38 98 30 90 32 82 C44 82 50 88 50 98Z" fill="#4fb878"/>
    <g transform="translate(50 42)"><g fill="#ff9ec7"><ellipse cy="-15" rx="9" ry="14"/><ellipse cy="-15" rx="9" ry="14" transform="rotate(72)"/><ellipse cy="-15" rx="9" ry="14" transform="rotate(144)"/><ellipse cy="-15" rx="9" ry="14" transform="rotate(216)"/><ellipse cy="-15" rx="9" ry="14" transform="rotate(288)"/></g><circle r="8" fill="#ffd54f"/><circle r="3" fill="#f0a500" cx="-2" cy="-2"/></g></symbol>
  <symbol id="s-video" viewBox="0 0 100 120"><path d="M50 116 C48 90 52 70 50 56" stroke="#3f9a62" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="M50 96 C34 96 26 86 28 76 C42 76 50 84 50 96Z M50 84 C66 82 74 72 72 64 C58 64 50 72 50 84Z" fill="#4fb878"/>
    <g transform="translate(50 40)"><g fill="#ffc83d"><ellipse cy="-20" rx="6" ry="13"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(30)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(60)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(90)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(120)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(150)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(180)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(210)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(240)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(270)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(300)"/><ellipse cy="-20" rx="6" ry="13" transform="rotate(330)"/></g><circle r="12" fill="#7a4a1d"/><circle r="7" fill="#5a3412"/></g></symbol>
  <symbol id="s-bell" viewBox="0 0 100 120"><path d="M50 116 C50 90 46 60 56 34 C60 24 72 22 78 28" stroke="#3f9a62" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <g class="swing" style="transform-origin:78px 28px"><path d="M78 28 v8" stroke="#3f9a62" stroke-width="2.4"/><path d="M66 56 C66 42 72 36 78 36 C84 36 90 42 90 56 Q78 62 66 56Z" fill="#8b7bff"/><path d="M66 56 Q78 62 90 56" stroke="#c7bdff" stroke-width="2" fill="none"/><circle cx="78" cy="62" r="3" fill="#ffd54f"/></g>
    <g class="swing2" style="transform-origin:56px 34px"><path d="M56 34 v6" stroke="#3f9a62" stroke-width="2.2"/><path d="M46 60 C46 48 51 42 56 42 C61 42 66 48 66 60 Q56 65 46 60Z" fill="#6f9bff"/><circle cx="56" cy="66" r="2.6" fill="#ffd54f"/></g>
    <path d="M50 100 C38 98 30 90 32 82 C44 82 50 90 50 100Z" fill="#4fb878"/></symbol>
  <symbol id="s-song" viewBox="0 0 140 160"><circle cx="70" cy="70" r="66" fill="url(#gGlow)"/><path d="M64 156 L66 98 L74 98 L76 156Z" fill="#8a5a36"/><path d="M70 120 L54 100 M70 112 L88 94" stroke="#8a5a36" stroke-width="4" stroke-linecap="round"/>
    <circle cx="70" cy="52" r="34" fill="#1f9d83"/><circle cx="44" cy="66" r="26" fill="#27b496"/><circle cx="98" cy="66" r="26" fill="#27b496"/><circle cx="70" cy="40" r="22" fill="#4cd6b3"/>
    <g fill="#fff3a8"><circle cx="52" cy="48" r="3.2"/><circle cx="84" cy="36" r="3.2"/><circle cx="100" cy="62" r="3.2"/><circle cx="40" cy="70" r="3.2"/><circle cx="70" cy="62" r="3.2"/><circle cx="62" cy="28" r="2.6"/><circle cx="90" cy="76" r="2.6"/></g></symbol>
  <symbol id="s-note" viewBox="0 0 100 120"><path d="M50 116 C50 100 50 90 50 80" stroke="#3f9a62" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M50 84 C32 84 22 72 24 60 C40 60 50 70 50 84Z" fill="#59c97f"/><path d="M50 78 C66 76 76 64 74 52 C58 52 50 62 50 78Z" fill="#7ae09a"/></symbol>
  <symbol id="s-bud" viewBox="0 0 100 120"><g transform="translate(50 66)"><g fill="#ffc0dc"><circle cy="-9" r="6"/><circle cx="9" r="6"/><circle cy="9" r="6"/><circle cx="-9" r="6"/></g><circle r="5" fill="#ffd54f"/></g></symbol>`;
  const SIZE = { chapter: 70, photo: 64, video: 78, bell: 70, song: 120, note: 50 };
  const SYM = { chapter: 'rose', photo: 'photo', video: 'video', bell: 'bell', song: 'song', note: 'note' };

  /* ---------- صحنهٔ باغ ---------- */
  function scene(list) {
    const n = list.length, Wd = 1000, H = Math.max(560, Math.min(1150, 560 + Math.max(0, n - 30) * 5)), gt = Math.round(H * .34), now = Date.now();
    const anim = !reduced();
    let svg = `<svg id="gardenSvg" viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="باغ خاطره‌ها" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0720"/><stop offset=".7" stop-color="#2b1646"/><stop offset="1" stop-color="#5b2d63"/></linearGradient>
      <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c4a3a"/><stop offset=".5" stop-color="#143b31"/><stop offset="1" stop-color="#0b2620"/></linearGradient>${SYMS}</defs>
      <rect width="${Wd}" height="${H}" fill="url(#gSky)"/>`;
    const r = (i) => { const h = hash('g' + i); return (h % 10000) / 10000; };
    for (let i = 0; i < 70; i++) svg += `<circle cx="${(r(i) * Wd).toFixed(0)}" cy="${(r(i + 100) * gt * .9).toFixed(0)}" r="${(.6 + r(i + 200) * 1.3).toFixed(1)}" fill="#fff" opacity="${(.25 + r(i + 300) * .6).toFixed(2)}"/>`;
    svg += `<circle cx="850" cy="${Math.round(gt * .32)}" r="46" fill="#fff6d6" opacity=".92"/><circle cx="868" cy="${Math.round(gt * .32) - 8}" r="40" fill="#2b1646"/>`;
    svg += `<path d="M0 ${gt + 6} Q150 ${gt - 50} 330 ${gt - 6} T700 ${gt - 14} T1000 ${gt - 30} V${H} H0Z" fill="#1d3a4a"/><path d="M0 ${gt + 20} Q220 ${gt - 22} 460 ${gt + 12} T1000 ${gt + 4} V${H} H0Z" fill="#17463a"/><rect y="${gt + 18}" width="${Wd}" height="${H - gt - 18}" fill="url(#gGround)"/>`;
    // علف و چراغ‌پشه‌های تزئینی (ثابت)
    for (let i = 0; i < 46; i++) { const x = r(i + 400) * Wd, y = gt + 30 + r(i + 500) * (H - gt - 50); svg += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q-3 -10 -6 -14 M${x.toFixed(0)} ${y.toFixed(0)} q1 -12 3 -17 M${x.toFixed(0)} ${y.toFixed(0)} q4 -8 8 -10" stroke="#2c7a58" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>`; }
    if (anim) for (let i = 0; i < 12; i++) svg += `<circle class="gfly" cx="${(r(i + 600) * Wd).toFixed(0)}" cy="${(gt + r(i + 700) * (H - gt) * .8).toFixed(0)}" r="2.4" fill="#fff3a8" style="animation-delay:${(r(i + 800) * 6).toFixed(1)}s;animation-duration:${(5 + r(i + 900) * 5).toFixed(1)}s"/>`;
    // گیاه‌ها: موقعیت از روی ترتیب ثبت (پایدار؛ آیتم تازه فقط به آخر اضافه می‌شه)
    const pos = list.map((it, i) => {
      const nx = frac(.5 + (i + 1) * 0.7548776662466927), ny = frac(.5 + (i + 1) * 0.5698402909980532);
      const depth = .04 + .92 * ny, y = gt + 24 + depth * (H - gt - 60), x = 46 + nx * (Wd - 92);
      const age = Math.min(1, (now - it.ts) / (400 * 864e5)), sc = 1.25 * (SIZE[it.type] / 100) * (.55 + .8 * depth) * (.8 + .35 * age);
      return { it, x, y, sc, i };
    }).sort((a, b) => a.y - b.y);
    pos.forEach(p => {
      const it = p.it, ok = match(it), isNew = !shown.has(it.key), s = p.sc, h = it.type === 'song' ? 160 : 120, w = it.type === 'song' ? 140 : 100;
      const delay = anim && isNew ? (Math.min(p.i, 80) * 0.03).toFixed(2) : '0';
      const sway = anim && n <= 400 ? `animation:gsway ${(3.4 + (hash(it.key) % 20) / 10).toFixed(1)}s ease-in-out ${(hash(it.key) % 30) / 10}s infinite;` : '';
      svg += `<g class="pl${ok ? '' : ' dim'}" data-key="${esc(it.key)}" tabindex="${ok ? 0 : -1}" role="button" aria-label="${esc(TYPES[it.type].name + ': ' + it.title)}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${s.toFixed(3)})">
        <g class="gr${anim && isNew ? ' grow' : ''}" style="animation-delay:${delay}s"><g style="${sway}transform-box:fill-box;transform-origin:50% 100%">
        ${it.type === 'song' ? `<ellipse cx="0" cy="-60" rx="95" ry="80" fill="url(#gGlowG)" class="tglow"/>` : ''}
        <use href="#s-${SYM[it.type]}" x="${-w / 2}" y="${-h + 4}" width="${w}" height="${h}"/>
        ${it.type === 'note' && it.done ? `<use href="#s-bud" x="-50" y="-92" width="100" height="120"/>` : ''}
        ${isFav(it.key) ? `<text x="${w / 2 - 14}" y="${-h + 16}" font-size="26" class="gheart">❤</text>` : ''}
        </g></g></g>`;
    });
    return svg + '</svg>';
  }

  /* ---------- فیلترها ---------- */
  function match(it) {
    if (filt.year && it.year !== filt.year) return false;
    if (filt.groups.size && !filt.groups.has(TYPES[it.type].group)) return false;
    if (filt.fav && !isFav(it.key)) return false;
    return true;
  }
  function bar() {
    const years = [...new Set(G.items.map(i => i.year))].sort((a, b) => b - a), cnt = g => G.items.filter(i => TYPES[i.type].group === g).length;
    const chip = (on, attr, label) => `<button type="button" class="gd-chip${on ? ' on' : ''}" ${attr}>${label}</button>`;
    const nFav = G.items.filter(i => isFav(i.key)).length;
    return `<div class="gd-row"><span class="gd-lab">سال</span>${chip(!filt.year, 'data-year=""', 'همه')}${years.map(y => chip(filt.year === y, `data-year="${y}"`, fa(y))).join('')}</div>
      <div class="gd-row"><span class="gd-lab">نوع</span>${GROUPS.map(([g, ico, nm]) => chip(filt.groups.has(g), `data-group="${g}"`, `${ico} ${nm} <small>${fa(cnt(g))}</small>`)).join('')}</div>
      <div class="gd-row"><span class="gd-lab">علاقه‌مندی</span>${G.favMissing ? '<small class="gd-note">برای علاقه‌مندی‌ها فایل supabase-setup.sql رو یک بار توی Supabase اجرا کن.</small>' : chip(filt.fav, 'data-fav="1"', `❤️ علاقه‌مندی‌ها <small>${fa(nFav)}</small>`) + chip(favMode, 'data-favmode="1"', favMode ? '✅ حالت علامت‌گذاری (روشنه)' : '🤍 علامت‌گذاری')}</div>`;
  }
  function render() {
    const box = document.getElementById('gardenBox'); if (!box || !G) return;
    const list = G.items, vis = list.filter(match).length;
    box.innerHTML = `<div class="gd-sum">🌿 ${fa(list.length)} گیاه توی باغ${vis !== list.length ? ` · ${fa(vis)} تا با فیلتر می‌خونه` : ''}</div>${bar()}
      <div id="gardenWrap">${list.length ? '' : '<div class="gd-empty">هنوز چیزی نکاشتیم! یه فصل بنویس، عکس یا آهنگ اضافه کن تا اولین گیاه سبز بشه 🌱</div>'}${scene(list)}<div id="gardenTip" class="gd-tip" hidden></div></div>
      <div class="gd-help">${favMode ? '🤍 روی هر گیاه بزنی علاقه‌مندی‌ش می‌کنی یا برمی‌داری.' : 'روی هر گیاه بزن تا محتوای خودش باز بشه: 🌹 فصل · 🌸 عکس · 🔔 صوتی · 🌳 آهنگ · 🌱 یادداشت'}</div>`;
    list.forEach(i => shown.add(i.key));
  }

  /* ---------- باز کردن محتوای هر گیاه ---------- */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function open(it) {
    if (it.type === 'chapter' || (it.type === 'bell' && it.src === 'chapter')) { showScreen('chapters'); await wait(150); openChapter(it.id); }
    else if (it.type === 'bell') {
      showScreen('files'); await wait(700);
      if (!filesList.some(f => f.id === it.id)) { filesList = G.files.slice().sort((a, b) => b.created_at - a.created_at); filesLoaded = true; }
      openFile(it.id);
    }
    else if (it.type === 'photo' || it.type === 'video') {
      showScreen('gallery'); await wait(700);
      const g = G.gallery.find(x => x.id === it.id); if (!g) return;
      if (!galleryList.some(x => x.id === it.id)) galleryList = G.gallery.slice().sort((a, b) => b.created_at - a.created_at);
      openLightbox(galleryList.find(x => x.id === it.id));
    }
    else if (it.type === 'song') {
      showScreen('playlist'); await wait(800);
      if (playlist.some(s => s.id === it.id)) playSong(it.id, true); else toast('🎵 ' + it.title);
    }
    else if (it.type === 'note') {
      showScreen('notes'); await wait(500);
      const el = [...document.querySelectorAll('.note-item')].find(n => (n.textContent || '').includes((it.text || '').slice(0, 30)));
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('gd-flash'); setTimeout(() => el.classList.remove('gd-flash'), 2400); }
    }
  }
  async function toggleFav(it) {
    const cur = myFav(it.key);
    if (cur) {
      const { error } = await dbClient.from('garden_favs').delete().eq('id', cur.id); if (error) { toast('⚠️ انجام نشد'); return; }
      G.favs = G.favs.filter(f => f.id !== cur.id); toast('💔 از علاقه‌مندی‌ها برداشته شد');
    } else {
      const row = { id: 'gf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), key: it.key, author: me(), created_at: Date.now() };
      const { error } = await dbClient.from('garden_favs').insert(row);
      if (error) { G.favMissing = /garden_favs|relation|schema cache/i.test(error.message || ''); toast('⚠️ ذخیره نشد' + (G.favMissing ? ' (فایل SQL اجرا نشده)' : '')); render(); return; }
      G.favs.push(row); toast('❤️ شد علاقه‌مندی');
    }
    render();
  }

  function tip(e) {
    const t = document.getElementById('gardenTip'), pl = e.target.closest && e.target.closest('.pl');
    if (!t) return; if (!pl || pl.classList.contains('dim')) { t.hidden = true; return; }
    const it = G.items.find(i => i.key === pl.dataset.key); if (!it) return;
    const who = favsOf(it.key).map(f => f.author).filter(Boolean);
    t.innerHTML = `<b>${TYPES[it.type].ico} ${esc(TYPES[it.type].name)}</b> ${esc(it.title)}<small>${Recur.fmtJalaliShort(it.iso)}${who.length ? ' · ❤️ ' + esc([...new Set(who)].join('، ')) : ''}</small>`;
    const w = document.getElementById('gardenWrap').getBoundingClientRect();
    t.hidden = false; t.style.left = Math.max(4, Math.min(w.width - t.offsetWidth - 4, e.clientX - w.left - t.offsetWidth / 2)) + 'px'; t.style.top = Math.max(4, e.clientY - w.top - t.offsetHeight - 14) + 'px';
  }
  function onClick(e) {
    const chip = e.target.closest('.gd-chip');
    if (chip) {
      if ('year' in chip.dataset) filt.year = chip.dataset.year ? Number(chip.dataset.year) : null;
      else if (chip.dataset.group) { const g = chip.dataset.group; filt.groups.has(g) ? filt.groups.delete(g) : filt.groups.add(g); }
      else if (chip.dataset.fav) filt.fav = !filt.fav;
      else if (chip.dataset.favmode) favMode = !favMode;
      render(); return;
    }
    const pl = e.target.closest('.pl'); if (!pl || pl.classList.contains('dim')) return;
    const it = G.items.find(i => i.key === pl.dataset.key); if (!it) return;
    if (favMode) toggleFav(it); else open(it);
  }
  function mount() {
    const box = document.getElementById('gardenBox'); if (!box || box.dataset.bound) return; box.dataset.bound = '1';
    box.addEventListener('click', onClick);
    box.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') tip(e); });
    box.addEventListener('pointerleave', () => { const t = document.getElementById('gardenTip'); if (t) t.hidden = true; });
    box.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('pl')) { e.preventDefault(); onClick(e); } });
  }
  async function load() {
    mount(); if (G) render();
    if (loading) return; loading = true;
    try { G = await gather(); render(); } finally { loading = false; }
  }
  window.Garden = { load, _items: () => (G ? G.items : []), _filt: () => filt, _state: () => G, invalidate: () => {} };
})();
