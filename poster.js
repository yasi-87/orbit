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

  /* ---------- متن غنی: همون چیزی که توی فصل نوشته شده (بولد، رنگ، هایلایت، فونت، اندازه، چینش، خط خالی) ---------- */
  const BLOCK_TAG = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|UL|OL)$/;
  const HEAD_SCALE = { H1: 1.5, H2: 1.3, H3: 1.15 };
  function parseBlocks(html) {
    const root = document.createElement('div'); root.innerHTML = html || '';
    root.querySelectorAll('img,video,audio,script,style,iframe,object,embed,svg,canvas').forEach(n => n.remove());
    const blocks = []; let cur = null;
    const start = al => { cur = { runs: [], align: al || '' }; blocks.push(cur); return cur; };
    const alignOf = (el, inherit) => { const a = (el.style && el.style.textAlign) || el.getAttribute('align') || ''; return /^(left|right|center)$/.test(a) ? a : inherit; };
    function walk(n, st, al, listCtx) {
      if (n.nodeType === 3) {
        const t = n.nodeValue.replace(/[\r\n\t\u00a0]+/g, ' ');
        if (!t || (!cur && !t.trim())) return;
        (cur || start(al)).runs.push(Object.assign({ text: t }, st)); return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === 'BR') { if (!cur || !cur.runs.length) { cur = null; start(al); cur = null; } else cur = null; return; }
      const s2 = Object.assign({}, st), sty = n.style || {};
      if (tag === 'B' || tag === 'STRONG' || /^(bold|[6-9]00)$/.test(sty.fontWeight || '')) s2.bold = true;
      if (tag === 'I' || tag === 'EM' || sty.fontStyle === 'italic') s2.italic = true;
      if (tag === 'U' || /underline/.test(sty.textDecoration || sty.textDecorationLine || '')) s2.ul = true;
      if (tag === 'S' || tag === 'STRIKE' || /line-through/.test(sty.textDecoration || sty.textDecorationLine || '')) s2.st = true;
      const col = sty.color || (tag === 'FONT' && n.getAttribute('color')); if (col) s2.color = col;
      const bg = sty.backgroundColor; if (bg && bg !== 'transparent' && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(bg)) s2.bg = bg; else if (bg === 'transparent') s2.bg = '';
      const fam = sty.fontFamily || (tag === 'FONT' && n.getAttribute('face')); if (fam) s2.family = String(fam).split(',')[0].replace(/["']/g, '').trim();
      if (sty.fontSize && /px$/.test(sty.fontSize)) s2.size = parseFloat(sty.fontSize);
      if (HEAD_SCALE[tag]) { s2.bold = true; s2.size = (s2.size || 17) * HEAD_SCALE[tag]; }
      if (BLOCK_TAG.test(tag)) {
        cur = null; const al2 = alignOf(n, al);
        if (tag === 'UL' || tag === 'OL') { let i = 0; n.childNodes.forEach(ch => { if (ch.tagName === 'LI') { i++; walk(ch, s2, al2, { ord: tag === 'OL', i }); } else walk(ch, s2, al2, null); }); cur = null; return; }
        if (tag === 'LI') { const b = start(al2); b.runs.push({ text: (listCtx && listCtx.ord ? faN(listCtx.i) + '. ' : '• '), bold: false }); }
        n.childNodes.forEach(ch => walk(ch, s2, al2, null)); cur = null; return;
      }
      n.childNodes.forEach(ch => walk(ch, s2, al, listCtx));
    }
    root.childNodes.forEach(ch => walk(ch, {}, '', null));
    const isBlank = b => !b.runs.some(r => r.text.trim());
    while (blocks.length && isBlank(blocks[0])) blocks.shift();
    while (blocks.length && isBlank(blocks[blocks.length - 1])) blocks.pop();
    let blanks = 0; return blocks.filter(b => { if (isBlank(b)) { b.runs = []; return ++blanks <= 3; } blanks = 0; return true; });
  }
  const plainBlocks = text => String(text || '').split(/\n/).map(l => ({ runs: l.trim() ? [{ text: l }] : [], align: '' }));
  const fontsIn = blocks => [...new Set([].concat(...blocks.map(b => b.runs.map(r => r.family).filter(Boolean))))];
  const lum = col => { const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(col) || (/^#([0-9a-f]{6})$/i.test(col) ? [0, ...[1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16))] : null); return m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255 : null; };
  const isLtr = w => /[A-Za-z0-9]/.test(w) && !/[\u0600-\u06FF]/.test(w);

  /* می‌چینه و می‌کشه؛ اگه جا نشد، اندازه رو کم می‌کنه (متن هیچ‌وقت عوض نمی‌شه) */
  function layoutRich(c, blocks, o, x0, y0, maxW, maxH, theme) {
    const DEF = 'Vazirmatn, Estedad, Sahel, Tahoma, sans-serif';
    const fnt = (r, base) => `${r.italic ? 'italic ' : ''}${r.bold ? 700 : 400} ${Math.round(base * Math.min(3, Math.max(.6, (r.size || 17) / 17)))}px ${r.family ? '"' + r.family + '", ' : ''}${DEF}`;
    const sz = (r, base) => Math.round(base * Math.min(3, Math.max(.6, (r.size || 17) / 17)));
    function build(base) {
      const out = []; let total = 0;
      blocks.forEach(b => {
        if (!b.runs.length) { const h = base * 1.7; out.push({ h, blank: true, items: [] }); total += h; return; }
        const toks = [];
        b.runs.forEach(r => String(r.text).split(/( +)/).forEach(part => { if (part === '') return; if (/^ +$/.test(part)) { toks.push({ sp: true, r }); return; } toks.push({ w: part, r, ltr: isLtr(part) }); }));
        c.direction = 'rtl'; let line = [], lw = 0; const lines = [];
        const flush = () => { while (line.length && line[line.length - 1].sp) line.pop(); if (line.length) lines.push(line); line = []; lw = 0; };
        toks.forEach(t => {
          c.font = fnt(t.r, base); t.m = c.measureText(t.sp ? ' ' : t.w).width;
          if (t.sp) { if (line.length) { line.push(t); lw += t.m; } return; }
          if (lw + t.m > maxW && line.length) flush();
          line.push(t); lw += t.m;
        });
        flush();
        lines.forEach(L => {
          const w = L.reduce((a, t) => a + t.m, 0), size = Math.max(...L.map(t => sz(t.r, base))), h = size * 1.75;
          out.push({ items: L, w, size, h, align: b.align }); total += h;
        });
      });
      return { out, total };
    }
    let base = 50, res = build(base);
    while (res.total > maxH && base > 22) { base -= 2; res = build(base); }
    let lines = res.out;
    if (res.total > maxH) {                     // حتی با کوچک‌ترین اندازه جا نشد: آخرش «…»
      let acc = 0, keep = []; for (const l of lines) { if (acc + l.h > maxH) break; keep.push(l); acc += l.h; }
      if (keep.length) { const last = keep[keep.length - 1]; if (!last.blank) last.items.push({ w: ' …', m: c.measureText(' …').width, r: last.items[last.items.length - 1].r }); }
      lines = keep;
    }
    const anyAlign = blocks.some(b => b.align), few = lines.length <= 3 && !anyAlign;
    let y = y0;
    lines.forEach(l => {
      if (l.blank) { y += l.h; return; }
      const al = few ? 'center' : (l.align || 'right');
      const tw = l.items.reduce((a, t) => a + (t.m || 0), 0);
      let cursor = al === 'center' ? x0 + (maxW + tw) / 2 : al === 'left' ? x0 + tw : x0 + maxW;   // لبهٔ راست هر خط (RTL)
      const base0 = y + l.size * 1.25;
      for (let i = 0; i < l.items.length;) {
        const t = l.items[i];
        if (t.ltr) {                            // چند کلمهٔ لاتین پشت‌هم: داخل خودشون چپ‌به‌راست
          let j = i, G = 0; const grp = [];
          while (j < l.items.length && (l.items[j].ltr || (l.items[j].sp && j + 1 < l.items.length && l.items[j + 1].ltr))) { grp.push(l.items[j]); G += l.items[j].m; j++; }
          let gx = cursor - G; grp.forEach(g => { drawTok(g, gx, base0, 'ltr'); gx += g.m; }); cursor -= G; i = j; continue;
        }
        cursor -= t.m; drawTok(t, cursor, base0, 'rtl'); i++;
      }
      y += l.h;
    });
    function drawTok(t, x, by, dir) {
      if (t.sp) { if (t.r.bg) { const sz2 = sz(t.r, base); c.fillStyle = t.r.bg; c.fillRect(x - 1, by - sz2 * 1.0, t.m + 2, sz2 * 1.45); } return; }
      const r = t.r, size = sz(r, base); c.font = fnt(r, base); c.direction = dir; c.textAlign = 'left';
      if (r.bg) { c.fillStyle = r.bg; c.fillRect(x - 2, by - size * 1.0, t.m + 4, size * 1.45); }
      let col = r.color || o.soft; const L = r.color ? lum(r.color) : null;
      if (L != null) { if (theme === 'light' && L > .72) col = o.ink; else if (theme !== 'light' && L < .22) col = o.ink; }
      c.fillStyle = col; c.fillText(t.w, x, by);
      if (r.ul || r.st) { c.fillRect(x, r.st ? by - size * .3 : by + size * .12, t.m, Math.max(2, size * .06)); }
    }
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
    const inText = (x, y) => x > 150 && x < W - 150 && y > 560 && y < 1520;
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
    c.fillStyle = dark ? 'rgba(14,8,26,.42)' : 'rgba(255,255,255,.5)'; rr(120, 560, W - 240, 960, 40); c.fill();

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
    // متن خاطره: دقیقاً همون‌طور که نوشته شده (بدون «»، بدون بریدن، با فاصلهٔ خطوط)
    const blocks = o._blocks || plainBlocks(o.text);
    if (blocks.length) {
      const qy = ty + tl.length * lh + 20;
      layoutRich(c, blocks, { ink, soft }, 190, qy, W - 380, Math.max(160, 1490 - qy), dark ? 'dark' : 'light');
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
    if (!opts._blocks) opts._blocks = opts.html != null ? parseBlocks(opts.html) : plainBlocks(opts.text);
    try { await Promise.all(fontsIn(opts._blocks).map(f => document.fonts.load('400 30px "' + f + '"')).concat(document.fonts.load('700 30px Vazirmatn'), document.fonts.load('400 30px Vazirmatn'))); } catch (e) {}
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
  window.Poster = { open: openPoster, draw, parseBlocks, _close: close };
})();
