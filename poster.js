/* 🎨 خاطره به شکل اثر هنری
   از روی تاریخ (فصل سال و ماه → رنگ‌ها و نقش‌ها)، شناسهٔ فصل (چیدمان یکتا) و متن، یه پوستر A4 می‌کشه
   که می‌شه به‌صورت عکس ذخیره یا چاپ کرد. همه‌چیز روی کَنوا کشیده می‌شه؛ هیچ چیزی جایی آپلود نمی‌شه. */
(function () {
  'use strict';
  const W = 1240, H = 1754;
  const faN = n => (window.Recur && Recur.toFa) ? Recur.toFa(n) : String(n);

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hsl = (h, s, l, a) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a == null ? 1 : a})`;

  /* ---------- نقش‌ها ---------- */
  function heart(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s / 100, s / 100); c.beginPath();
    c.moveTo(0, 35); c.bezierCurveTo(-60, -5, -45, -50, -18, -50); c.bezierCurveTo(-6, -50, 0, -38, 0, -30);
    c.bezierCurveTo(0, -38, 6, -50, 18, -50); c.bezierCurveTo(45, -50, 60, -5, 0, 35); c.closePath(); c.restore();
  }
  function sparkle(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath();
  }
  function flower(c, x, y, r, rot, col, mid) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col;
    for (let i = 0; i < 5; i++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, -r * .62, r * .34, r * .62, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = mid; c.beginPath(); c.arc(0, 0, r * .28, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function sun(c, x, y, r, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineWidth = Math.max(3, r * .1);
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, -r * 1.3); c.lineTo(0, -r * (i % 2 ? 1.6 : 1.85)); c.stroke(); }
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function leaf(c, x, y, r, rot, col, vein) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath(); c.moveTo(0, -r);
    c.bezierCurveTo(r * .9, -r * .5, r * .8, r * .55, 0, r); c.bezierCurveTo(-r * .8, r * .55, -r * .9, -r * .5, 0, -r); c.fill();
    c.strokeStyle = vein; c.lineWidth = Math.max(2, r * .05); c.beginPath(); c.moveTo(0, -r * .9); c.lineTo(0, r * 1.15);
    for (let i = -2; i <= 2; i++) { if (!i) continue; c.moveTo(0, i * r * .22); c.lineTo(r * .4, i * r * .22 - r * .16); c.moveTo(0, i * r * .22); c.lineTo(-r * .4, i * r * .22 - r * .16); }
    c.stroke(); c.restore();
  }
  function snow(c, x, y, r, rot, col) {
    c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = Math.max(2.5, r * .07);
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r);
      c.moveTo(0, -r * .55); c.lineTo(r * .22, -r * .75); c.moveTo(0, -r * .55); c.lineTo(-r * .22, -r * .75); c.stroke();
    }
    c.restore();
  }
  function moon(c, x, y, r, col) {
    const t = document.createElement('canvas'); t.width = t.height = Math.ceil(r * 2 + 4); const k = t.getContext('2d'), m = t.width / 2;
    k.fillStyle = col; k.beginPath(); k.arc(m, m, r, 0, Math.PI * 2); k.fill();
    k.globalCompositeOperation = 'destination-out'; k.beginPath(); k.arc(m + r * .42, m - r * .12, r * .86, 0, Math.PI * 2); k.fill();
    c.drawImage(t, x - m, y - m);
  }

  /* ---------- متن ---------- */
  function wrap(c, text, maxW, maxLines) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' '), lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; if (lines.length === maxLines) break; } else cur = t;
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    else if (lines.length === maxLines && cur) { /* باقی‌مونده بریده می‌شه */ }
    const used = lines.join(' ').split(' ').length;
    if (words.length > used && lines.length) { let l = lines[lines.length - 1]; while (l.length > 3 && c.measureText(l + ' …').width > maxW) l = l.slice(0, -1); lines[lines.length - 1] = l + ' …'; }
    return lines;
  }

  /* ---------- رسم اصلی ---------- */
  function draw(canvas, o) {
    const c = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
    const dark = o.theme !== 'light', seedStr = (o.id || 'x') + ':' + (o.variant || 0), rnd = mulberry(hash(seedStr));
    const R = (a, b) => a + rnd() * (b - a), pick = arr => arr[Math.floor(rnd() * arr.length)];
    const iso = o.iso || (Recur.todayIso && Recur.todayIso()), j = Recur.jalaliFromIso(iso);
    const season = j.jm <= 3 ? 'spring' : j.jm <= 6 ? 'summer' : j.jm <= 9 ? 'autumn' : 'winter';
    const h1 = (j.jm - 1) * 30 + 200 + R(-14, 14), h2 = h1 + 40 + ((j.jd * 7) % 90);
    const ink = dark ? '#fbf6ff' : '#2a1a3d', soft = dark ? 'rgba(251,246,255,.72)' : 'rgba(42,26,61,.7)';
    const gold = dark ? hsl(h2, 90, 76) : hsl(h1, 60, 38);

    // پس‌زمینه
    const bg = c.createLinearGradient(0, 0, W * .7, H);
    if (dark) { bg.addColorStop(0, hsl(h1, 48, 11)); bg.addColorStop(.55, hsl(h1 + 18, 46, 19)); bg.addColorStop(1, hsl(h2, 52, 26)); }
    else { bg.addColorStop(0, hsl(h1, 70, 96)); bg.addColorStop(.55, hsl(h1 + 18, 72, 91)); bg.addColorStop(1, hsl(h2, 74, 84)); }
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    // لکه‌های نرم رنگی
    for (let i = 0; i < 7; i++) {
      const x = R(-100, W + 100), y = R(-100, H + 100), r = R(260, 560), hh = i % 2 ? h1 : h2 + R(-20, 20);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hsl(hh + R(-20, 20), 80, dark ? 55 : 72, dark ? .34 : .5)); g.addColorStop(1, hsl(hh, 80, 55, 0));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // دانهٔ کاغذ
    for (let i = 0; i < 1400; i++) { c.fillStyle = dark ? `rgba(255,255,255,${R(.02, .07)})` : `rgba(80,40,120,${R(.02, .06)})`; c.fillRect(R(0, W), R(0, H), R(1, 2.6), R(1, 2.6)); }

    // ماه / خورشید بزرگ گوشه
    const cx = pick([W * .8, W * .2]), cy = R(250, 330);
    if (dark) { c.shadowColor = hsl(h2, 90, 80, .8); c.shadowBlur = 60; moon(c, cx, cy, R(95, 125), hsl(h2, 85, 86), 1); c.shadowBlur = 0; }
    else { c.globalAlpha = .9; sun(c, cx, cy, R(55, 72), hsl(h2 + 20, 90, 62)); c.globalAlpha = 1; }

    // صورت فلکی: چند ستاره که با خط بهم وصلن
    const pts = []; const n = 6 + Math.floor(rnd() * 3), baseX = cx < W / 2 ? W * .55 : W * .1;
    for (let i = 0; i < n; i++) pts.push([baseX + i * R(55, 80) + R(-20, 20), R(110, 520) * (1 - (i % 2) * .25)]);
    c.strokeStyle = dark ? 'rgba(255,255,255,.28)' : 'rgba(60,30,100,.28)'; c.lineWidth = 2; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    c.fillStyle = dark ? '#fff' : hsl(h1, 60, 40); pts.forEach(p => { sparkle(c, p[0], p[1], R(10, 20)); c.fill(); });

    // ستاره‌های ریز
    for (let i = 0; i < 70; i++) { c.fillStyle = dark ? `rgba(255,255,255,${R(.2, .8)})` : hsl(h1, 60, 45, R(.15, .45)); sparkle(c, R(40, W - 40), R(40, H - 40), R(3, 9)); c.fill(); }

    // نقش فصل: بهار گل، تابستان آفتاب، پاییز برگ، زمستان دانهٔ برف
    const inText = (x, y) => x > 150 && x < W - 150 && y > 560 && y < 1330;
    const motifN = 16 + Math.floor(rnd() * 8);
    for (let i = 0; i < motifN; i++) {
      let x = R(30, W - 30), y = R(30, H - 30), tries = 0; while (inText(x, y) && tries++ < 8) { x = R(30, W - 30); y = R(30, H - 30); }
      const faint = inText(x, y), r = R(26, 78) * (faint ? .6 : 1), rot = R(0, 6.28); c.globalAlpha = faint ? .22 : R(.55, .95);
      if (season === 'spring') flower(c, x, y, r, rot, hsl(pick([330, 350, 20, 290, 50]), 85, dark ? 72 : 70), hsl(48, 95, 62));
      else if (season === 'summer') { if (i % 5 === 0) sun(c, x, y, r * .55, hsl(40 + R(-8, 8), 95, 62)); else flower(c, x, y, r * .8, rot, hsl(pick([40, 25, 190, 340]), 90, 66), hsl(30, 90, 45)); }
      else if (season === 'autumn') leaf(c, x, y, r, rot, hsl(pick([8, 22, 35, 45, 15]), 82, dark ? 56 : 54), dark ? 'rgba(60,20,10,.55)' : 'rgba(110,40,10,.5)');
      else snow(c, x, y, r, rot, dark ? 'rgba(235,245,255,.9)' : hsl(205, 60, 55));
    }
    c.globalAlpha = 1;
    if (season === 'summer') { // موج پایین
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20) c.lineTo(x, H - 90 - k * 34 + Math.sin(x / 90 + k * 1.7 + rnd()) * 22); c.lineTo(W, H); c.closePath(); c.fillStyle = hsl(h1 + 150 + k * 10, 70, dark ? 40 - k * 4 : 76 - k * 4, .22); c.fill(); }
    }

    // قلب‌ها
    const hn = 6 + Math.floor(rnd() * 5);
    for (let i = 0; i < hn; i++) {
      let x = R(60, W - 60), y = R(60, H - 60), t = 0; while (inText(x, y) && t++ < 8) { x = R(60, W - 60); y = R(60, H - 60); }
      c.globalAlpha = inText(x, y) ? .16 : R(.4, .85); c.fillStyle = hsl(pick([340, 350, 320, 0]), 88, dark ? 66 : 62); heart(c, x, y, R(26, 74), R(-.5, .5)); c.fill();
    }
    c.globalAlpha = 1;

    // قاب
    c.lineWidth = 3; c.strokeStyle = gold; c.globalAlpha = .75;
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    rr(48, 48, W - 96, H - 96, 46); c.stroke(); c.lineWidth = 1.5; rr(70, 70, W - 140, H - 140, 32); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = gold; [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]].forEach(p => { c.save(); c.translate(p[0], p[1]); c.rotate(Math.PI / 4); c.fillRect(-9, -9, 18, 18); c.restore(); });

    // کارت نیمه‌شفاف پشت متن
    c.fillStyle = dark ? 'rgba(14,8,26,.42)' : 'rgba(255,255,255,.5)'; rr(120, 560, W - 240, 780, 40); c.fill();

    // متن‌ها
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const F = (wt, px, fam) => `${wt} ${px}px ${fam || "Estedad"}, Sahel, Tahoma, sans-serif`;
    c.fillStyle = soft; c.font = F(400, 34, 'Sahel'); c.direction = 'ltr'; c.letterSpacing = '10px';
    c.fillText('OUR MEMORIES', W / 2 + 5, 170); c.letterSpacing = '0px'; c.direction = 'rtl';
    // تاریخ بزرگ
    const dg = c.createLinearGradient(W / 2 - 200, 330, W / 2 + 200, 520);
    dg.addColorStop(0, dark ? hsl(h2, 95, 82) : hsl(h1, 70, 38)); dg.addColorStop(1, dark ? hsl(h1 + 300, 90, 78) : hsl(h2, 75, 40));
    c.fillStyle = dg; c.font = F(700, 250); c.fillText(faN(j.jd), W / 2, 470);
    c.fillStyle = ink; c.font = F(700, 66); c.fillText(Recur.JAL_MONTHS[j.jm - 1] + ' ' + faN(j.jy), W / 2, 545);
    // خط + قلب
    c.strokeStyle = gold; c.lineWidth = 2.5; c.globalAlpha = .8; c.beginPath(); c.moveTo(250, 640); c.lineTo(W / 2 - 50, 640); c.moveTo(W / 2 + 50, 640); c.lineTo(W - 250, 640); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = hsl(345, 90, 66); heart(c, W / 2, 640, 44); c.fill();
    // عنوان
    const title = (o.title || '').trim() || 'یه خاطرهٔ قشنگ';
    let fs = 104; c.font = F(700, fs); let tl = wrap(c, title, W - 340, 3);
    while (tl.length > 2 && fs > 64) { fs -= 8; c.font = F(700, fs); tl = wrap(c, title, W - 340, 3); }
    c.fillStyle = ink; const lh = fs * 1.55, ty = 790; tl.forEach((l, i) => c.fillText(l, W / 2, ty + i * lh));
    // نقل‌قول از متن
    const text = (o.text || '').replace(/\s+/g, ' ').trim();
    if (text) {
      const qy = ty + tl.length * lh + 30; c.fillStyle = soft; c.font = F(400, 46, 'Gandom');
      const maxQ = Math.max(2, Math.min(6, Math.floor((1300 - qy) / 78))), ql = wrap(c, '«' + text.slice(0, 260) + '»', W - 380, maxQ);
      ql.forEach((l, i) => c.fillText(l, W / 2, qy + i * 76));
    }
    // پایین
    c.fillStyle = soft; c.font = F(400, 34, 'Sahel');
    const wd = Recur.JAL_WEEKDAYS[Recur.weekdayIndex(iso)], greg = iso.replace(/-/g, '/');
    c.fillText(wd + '  ·  ' + faN(greg), W / 2, H - 200);
    c.fillStyle = gold; c.font = F(700, 42); c.fillText('خاطره‌های ما', W / 2 + 36, H - 138);
    c.fillStyle = hsl(345, 90, 66); heart(c, W / 2 - 92, H - 150, 40); c.fill();
    return canvas;
  }

  /* ---------- پنجرهٔ پیش‌نمایش ---------- */
  let opts = null, modal = null;
  async function render() {
    const cv = modal.querySelector('canvas');
    try { await Promise.all([document.fonts.load('700 80px Estedad'), document.fonts.load('400 40px Gandom'), document.fonts.load('400 30px Sahel')]); } catch (e) {}
    draw(cv, opts);
  }
  function css() {
    if (document.getElementById('posterStyle')) return;
    const s = document.createElement('style'); s.id = 'posterStyle';
    s.textContent = `.poster-modal{position:fixed;inset:0;z-index:330;background:rgba(6,3,12,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px;overflow:auto}
.poster-modal canvas{max-width:min(94vw,520px);max-height:72vh;width:auto;height:auto;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.7);background:#000}
.poster-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.poster-x{position:absolute;top:12px;left:12px}
body.poster-open{overflow:hidden}
#printArea.pa-poster{display:none}
@media print{#printArea.pa-poster{display:block !important;text-align:center;background:#fff}#printArea.pa-poster img{width:auto !important;max-width:100% !important;max-height:262mm !important;border-radius:0 !important}html:has(#printArea.pa-poster),html:has(#printArea.pa-poster) body{background:#fff !important}}`;
    document.head.appendChild(s);
  }
  function close() { if (modal) { modal.remove(); modal = null; } document.body.classList.remove('poster-open'); }
  function openPoster(o) {
    css(); close(); opts = Object.assign({ variant: 0, theme: 'dark' }, o);
    modal = document.createElement('div'); modal.className = 'poster-modal'; modal.id = 'posterModal';
    modal.innerHTML = `<button class="btn ghost poster-x" type="button" data-a="x">✕</button><canvas width="${W}" height="${H}"></canvas>
      <div class="poster-bar"><button class="btn" type="button" data-a="dl">⬇️ ذخیره عکس</button><button class="btn ghost" type="button" data-a="print">🖨️ چاپ</button><button class="btn ghost" type="button" data-a="new">🎲 طرح دیگه</button><button class="btn ghost" type="button" data-a="theme">🌗 روشن/تیره</button></div>`;
    modal.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) { if (e.target === modal) close(); return; }
      const k = a.dataset.a;
      if (k === 'x') close();
      else if (k === 'new') { opts.variant++; render(); }
      else if (k === 'theme') { opts.theme = opts.theme === 'dark' ? 'light' : 'dark'; render(); }
      else if (k === 'dl') download();
      else if (k === 'print') printIt();
    });
    document.body.appendChild(modal); document.body.classList.add('poster-open'); render();
  }
  const fname = () => ((opts.title || 'خاطره').replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 50) || 'خاطره') + ' - poster.png';
  function download() {
    const cv = modal.querySelector('canvas');
    cv.toBlob(b => {
      if (!b) { if (window.toast) toast('⚠️ ساخت عکس نشد'); return; }
      const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = fname(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000); if (window.toast) toast('⬇️ پوستر ذخیره شد');
    }, 'image/png');
  }
  function printIt() {
    const pa = document.getElementById('printArea'); if (!pa) return;
    const url = modal.querySelector('canvas').toDataURL('image/png');
    pa.className = 'pa-poster'; pa.innerHTML = '<img alt="" src="' + url + '">';
    const prevTitle = document.title; document.title = fname().replace(/\.png$/, '');
    const done = () => { document.title = prevTitle; pa.innerHTML = ''; pa.className = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    const img = pa.firstChild; const go = () => setTimeout(() => window.print(), 150);
    img.complete ? go() : (img.onload = go);
  }
  window.Poster = { open: openPoster, draw, _close: close };
})();
