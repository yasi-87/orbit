/* ✨ منوی اصلی: صحنهٔ گرافیکی با زنبور سه‌بعدی (ایزومتریک)، شفق، شب‌تاب، لانهٔ زنبور، ستارهٔ دنباله‌دار و کاشی‌های سه‌بعدی
   فقط وقتی این صفحه بازه می‌چرخه؛ بقیهٔ سایت رو سنگین نمی‌کنه. */
(function () {
  const $ = id => document.getElementById(id);
  const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  const CSS = `
#screen-menu{padding:0 !important;max-width:none !important}
.mm-stage{position:relative;overflow:hidden;border-radius:24px;min-height:calc(100vh - 150px);padding:18px 14px 40px;background:radial-gradient(ellipse at 50% 0%,#2a1840 0%,#120a1e 55%,#0a0610 100%);isolation:isolate}
.mm-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.mm-glow{position:absolute;z-index:1;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,200,60,.22),rgba(212,165,255,.12) 40%,transparent 70%);mix-blend-mode:screen;opacity:0;transition:opacity .4s;left:50%;top:30%}
.mm-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:1100px;margin:0 auto}
.mm-bee{width:250px;height:230px;cursor:pointer;touch-action:manipulation;filter:drop-shadow(0 18px 28px rgba(255,190,40,.25))}
.mm-title{font-size:clamp(2rem,6vw,3.6rem);font-weight:800;margin:0;letter-spacing:1px;direction:ltr;background:linear-gradient(100deg,#ffd45a 0%,#ff9ed2 28%,#c9a2ff 52%,#7fd9ff 74%,#ffd45a 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:mmShine 7s linear infinite;text-shadow:0 0 40px rgba(255,200,80,.25)}
@keyframes mmShine{to{background-position:-250% 0}}
.mm-sub{color:#cdbfe6;font-size:.95rem;margin:0 0 14px;text-align:center;min-height:1.6em;opacity:.9}
.mm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;width:100%;perspective:900px;padding:6px}
.mm-tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:130px;border:0;border-radius:22px;color:#fff;font:inherit;cursor:pointer;overflow:hidden;text-align:center;
  background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.03));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.12);
  transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(0);transition:transform .18s ease-out,box-shadow .3s;transform-style:preserve-3d;
  opacity:0;animation:mmIn .7s cubic-bezier(.2,.9,.3,1.2) forwards;animation-delay:calc(var(--i)*55ms + 150ms)}
@keyframes mmIn{from{opacity:0;transform:translateY(40px) scale(.7) rotateX(40deg)}to{opacity:1}}
.mm-tile::before{content:'';position:absolute;inset:-2px;border-radius:24px;padding:2px;background:conic-gradient(from var(--a,0deg),#ffd45a,#ff9ed2,#c9a2ff,#7fd9ff,#ffd45a);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;animation:mmSpin 4s linear infinite}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes mmSpin{to{--a:360deg}}
.mm-tile::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.32),transparent 55%);opacity:0;transition:opacity .25s;pointer-events:none}
.mm-tile:hover{box-shadow:0 22px 44px rgba(0,0,0,.5),0 0 34px rgba(255,200,90,.25),inset 0 0 0 1px rgba(255,255,255,.25)}
.mm-tile:hover::before,.mm-tile:hover::after{opacity:1}
.mm-ico{font-size:2.5rem;line-height:1;display:inline-block;animation:mmFloat 3.4s ease-in-out infinite;animation-delay:calc(var(--i)*-.37s);transform:translateZ(30px);filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
@keyframes mmFloat{0%,100%{transform:translateZ(30px) translateY(0) rotate(-4deg)}50%{transform:translateZ(30px) translateY(-7px) rotate(4deg)}}
.mm-lbl{font-weight:700;font-size:.95rem;transform:translateZ(18px)}
.mm-rip{position:absolute;border-radius:50%;background:rgba(255,255,255,.45);transform:translate(-50%,-50%) scale(0);animation:mmRip .6s ease-out forwards;pointer-events:none}
@keyframes mmRip{to{transform:translate(-50%,-50%) scale(1);opacity:0}}
.mm-tile:active{transform:scale(.96)}
@media (max-width:520px){.mm-grid{grid-template-columns:repeat(2,1fr);gap:12px}.mm-tile{height:112px}.mm-bee{width:210px;height:195px}}
@media (prefers-reduced-motion:reduce){.mm-tile,.mm-ico,.mm-title,.mm-tile::before{animation:none!important;opacity:1}}
`;

  /* ================= زنبور سه‌بعدی (مثل ویدیو: سر زرد مکعبی، چشم‌های درشت، بدن قهوه‌ای راه‌راه، بال‌های شش‌ضلعی) ================= */
  const Bee = (function () {
    const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k] };
    const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
    const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
    const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, (n >> 16) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k); return `rgb(${r | 0},${g | 0},${b | 0})`; };
    const YEL = '#ffc42c', BRN = '#4a3a36', STR = '#ffcf33';

    function boxFaces(c, h, base, decals) {
      const [hx, hy, hz] = h, [cx, cy, cz] = c, d = decals || {};
      const mk = (O, U, Vv, N, key) => ({ O: V.add(O, c), U, V: Vv, N, base, dec: d[key] || [] });
      return [
        mk([-hx, -hy, hz], [2 * hx, 0, 0], [0, 2 * hy, 0], [0, 0, 1], 'f'),
        mk([hx, -hy, -hz], [-2 * hx, 0, 0], [0, 2 * hy, 0], [0, 0, -1], 'b'),
        mk([hx, -hy, hz], [0, 0, -2 * hz], [0, 2 * hy, 0], [1, 0, 0], 'r'),
        mk([-hx, -hy, -hz], [0, 0, 2 * hz], [0, 2 * hy, 0], [-1, 0, 0], 'l'),
        mk([-hx, hy, hz], [2 * hx, 0, 0], [0, 0, -2 * hz], [0, 1, 0], 't')
      ];
    }
    const rect = (u0, v0, u1, v1, col) => ({ pts: [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], col });

    function buildFaces(S) {
      /* S: حالت چشم/ابرو */
      const eyeH = 0.5 * S.blink, eyeTop = 0.62, eyeBot = eyeTop - eyeH;
      const eye = (u0, u1) => [rect(u0, eyeBot, u1, eyeTop, '#1a1224'), rect(u0, eyeBot, u1, eyeBot + Math.min(eyeH, 0.18), '#2db4ff'), rect(u0 + 0.025, eyeTop - 0.07, u0 + 0.075, eyeTop - 0.02, 'rgba(255,255,255,.55)')];
      const brow = (u0, u1, a, side) => { const y = 0.76 + S.brow * 0.04; const y0 = y + a * side, y1 = y - a * side; return { pts: [[u0, y0], [u1, y1], [u1, y1 + 0.075], [u0, y0 + 0.075]], col: '#14101a' }; };
      const head = boxFaces([0, -0.1, 1.45], [1.15, 1.1, 1.05], YEL, {
        f: [...eye(0.1, 0.4), ...eye(0.6, 0.9), brow(0.1, 0.42, 0.06 + S.brow * 0.05, 1), brow(0.58, 0.9, 0.06 + S.brow * 0.05, -1), rect(0.4, 0.28, 0.6, 0.34, 'rgba(255,150,130,.0)')]
      });
      const body = boxFaces([0, -0.2, -1.05], [1.15, 1.05, 1.3], BRN, {
        t: [rect(0, 0.14, 1, 0.26, STR), rect(0, 0.44, 1, 0.56, STR), rect(0, 0.74, 1, 0.86, STR)],
        r: [rect(0.18, 0, 0.3, 1, STR), rect(0.46, 0, 0.58, 1, STR), rect(0.74, 0, 0.86, 1, STR)],
        l: [rect(0.18, 0, 0.3, 1, STR), rect(0.46, 0, 0.58, 1, STR), rect(0.74, 0, 0.86, 1, STR)]
      });
      const sting = boxFaces([0, -0.5, -2.5], [0.3, 0.3, 0.2], '#2d2420', {});
      const leg = (x) => boxFaces([x, -1.4, 0.0], [0.14, 0.22, 0.14], '#2d2420', {});
      return [].concat(head, body, sting, leg(-0.6), leg(0.6), leg(-0.6).map(f => Object.assign({}, f, { O: V.add(f.O, [0, 0, -1.2]) })), leg(0.6).map(f => Object.assign({}, f, { O: V.add(f.O, [0, 0, -1.2]) })));
    }
    function wingPolys(flap) {
      const out = [];
      [-1, 1].forEach(side => {
        const root = [side * 0.45, 0.85, -0.55];
        const ang = side * (0.55 + flap);
        const place = (u, z) => V.add(V.add(root, rotZ([0, u, 0], -ang)), [0, 0, z]);
        const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts.push(place(1.35 + Math.cos(a) * 1.0, -0.1 + Math.sin(a) * 1.0)); }
        const pts2 = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts2.push(place(1.35 + Math.cos(a) * 0.5, -0.1 + Math.sin(a) * 0.5)); }
        out.push({ pts, pts2 });
      });
      return out;
    }

    function make(canvas) {
      const ctx = canvas.getContext('2d');
      let W = 250, H = 230, dpr = 1;
      const spark = [];
      let t0 = performance.now(), phase = 'idle', pt = 0, idleLen = 3.5 + Math.random() * 2, ptrX = 0, ptrY = 0, hop = 0, lastT = t0, blinkT = 0, nextBlink = 2.5, love = [];
      function size() { const r = canvas.getBoundingClientRect(); W = Math.max(120, r.width); H = Math.max(110, r.height); dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = W * dpr; canvas.height = H * dpr; }
      size();
      function poke() { if (phase === 'idle') { phase = 'away'; pt = 0; } else hop = 1; for (let i = 0; i < 7; i++) love.push({ x: W / 2 + (Math.random() - .5) * 90, y: H * .38, vy: -(30 + Math.random() * 40), vx: (Math.random() - .5) * 40, a: 1, e: ['💛', '✨', '💖'][i % 3] }); }
      function look(nx, ny) { ptrX = nx; ptrY = ny; }
      function frame(now) {
        const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const t = (now - t0) / 1000;
        pt += dt; let sc = 1, ox = 0, oy = 0, turn = 0, away = 0;
        if (phase === 'idle' && pt > idleLen && !reduce()) { phase = 'away'; pt = 0; }
        if (phase === 'away') { const k = Math.min(1, pt / 1.5); away = k * k * (3 - 2 * k); if (pt > 1.5) { phase = 'gone'; pt = 0; } }
        else if (phase === 'gone') { away = 1; if (pt > 0.5) { phase = 'back'; pt = 0; } }
        else if (phase === 'back') { const k = Math.min(1, pt / 1.3); away = 1 - k * k * (3 - 2 * k); if (pt > 1.3) { phase = 'idle'; pt = 0; idleLen = 3.5 + Math.random() * 3; } }
        sc = 1 - away * 0.72; turn = away * Math.PI * 0.95; oy = -away * 40; ox = away * 40;
        if (away > 0.02 && away < 1 && Math.random() < 0.7) spark.push({ x: W / 2 + ox + (Math.random() - .5) * 90 * sc, y: H / 2 + oy + (Math.random() - .5) * 70 * sc, a: 1, s: 2 + Math.random() * 3, vy: -10 - Math.random() * 20 });
        hop = Math.max(0, hop - dt * 2.2);
        blinkT += dt; if (blinkT > nextBlink) { blinkT = -0.14; nextBlink = 2 + Math.random() * 3; }
        const blink = blinkT < 0 ? 0.12 : 1;
        const S = { blink, brow: Math.sin(t * 5.2) * 0.5 + 0.5 };
        const yaw = -0.62 + Math.sin(t * 0.9) * 0.22 + ptrX * 0.35 + turn, pitch = 0.46 + Math.sin(t * 1.4) * 0.05 - ptrY * 0.12;
        const bob = Math.sin(t * 2.3) * 0.22 + Math.sin(hop * Math.PI) * 0.9;
        const flap = Math.sin(t * (reduce() ? 0 : 34)) * 0.38;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        const K = Math.min(W / 8.6, H / 7.6) * sc, cx = W / 2 + ox, cy = H / 2 + 6 + oy;
        const tr = p => { let q = [p[0], p[1] + bob, p[2]]; q = rotY(q, yaw); q = rotX(q, pitch); return q; };
        const proj = q => [cx + q[0] * K, cy - (q[1] + 0.2) * K];
        /* سایه */
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(W / 2 + ox * .6, H - 18 - oy * .2, 60 * sc * (1 - Math.sin(t * 2.3) * .06), 11 * sc, 0, 0, 7); ctx.fill();
        /* وجه‌ها */
        const L = [-0.35, 0.8, 0.5], ln = Math.hypot(...L); const polys = [];
        buildFaces(S).forEach(f => {
          const N = rotX(rotY(f.N, yaw), pitch); if (N[2] <= 0.001) return;
          const P = [f.O, V.add(f.O, f.U), V.add(V.add(f.O, f.U), f.V), V.add(f.O, f.V)].map(tr);
          const z = (P[0][2] + P[1][2] + P[2][2] + P[3][2]) / 4;
          const lit = 0.55 + 0.5 * Math.max(0, (N[0] * L[0] + N[1] * L[1] + N[2] * L[2]) / ln);
          polys.push({ z, pts: P.map(proj), col: shade(f.base, lit), dec: f.dec.map(d => ({ pts: d.pts.map(([u, v]) => proj(tr(V.add(V.add(f.O, V.mul(f.U, u)), V.mul(f.V, v))))), col: d.col })), edge: shade(f.base, lit * .78) });
        });
        polys.sort((a, b) => a.z - b.z);
        const wings = wingPolys(flap).map(w => ({ z: Math.max(...w.pts.map(p => tr(p)[2])) - 0.4, wing: true, a: w.pts.map(p => proj(tr(p))), b: w.pts2.map(p => proj(tr(p))) }));
        const all = polys.concat(wings).sort((a, b) => a.z - b.z);
        ctx.lineJoin = 'round';
        all.forEach(p => {
          if (p.wing) {
            ctx.beginPath(); p.a.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
            ctx.fillStyle = 'rgba(215,232,255,.28)'; ctx.fill(); ctx.strokeStyle = '#e8f1ff'; ctx.lineWidth = Math.max(2, K * 0.16); ctx.stroke();
            ctx.beginPath(); p.b.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.strokeStyle = 'rgba(190,215,250,.85)'; ctx.lineWidth = Math.max(1.5, K * 0.09); ctx.stroke();
            return;
          }
          ctx.beginPath(); p.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = p.col; ctx.fill(); ctx.strokeStyle = p.edge; ctx.lineWidth = 1; ctx.stroke();
          p.dec.forEach(d => { ctx.beginPath(); d.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = d.col; ctx.fill(); });
        });
        /* جرقه‌ها و قلب‌ها */
        for (let i = spark.length - 1; i >= 0; i--) { const s = spark[i]; s.a -= dt * 1.1; s.y += s.vy * dt; if (s.a <= 0) { spark.splice(i, 1); continue; } ctx.globalAlpha = s.a; ctx.fillStyle = '#ffd84a'; ctx.fillRect(s.x, s.y, s.s, s.s); }
        ctx.globalAlpha = 1; ctx.font = '20px serif'; ctx.textAlign = 'center';
        for (let i = love.length - 1; i >= 0; i--) { const s = love[i]; s.a -= dt * 0.9; s.x += s.vx * dt; s.y += s.vy * dt; if (s.a <= 0) { love.splice(i, 1); continue; } ctx.globalAlpha = s.a; ctx.fillText(s.e, s.x, s.y); }
        ctx.globalAlpha = 1;
      }
      return { frame, poke, look, size };
    }
    return { make };
  })();

  /* ================= پس‌زمینه: شفق + لانهٔ زنبور + شب‌تاب + ستارهٔ دنباله‌دار ================= */
  function makeBg(canvas, stage) {
    const ctx = canvas.getContext('2d'); let W = 0, H = 0, SC = 0.6;
    const flies = [], stars = [], bursts = []; let px = -999, py = -999, shoot = null, nextShoot = 3;
    function size() { const r = stage.getBoundingClientRect(); W = Math.max(200, r.width * SC | 0); H = Math.max(200, r.height * SC | 0); canvas.width = W; canvas.height = H; flies.length = 0; for (let i = 0; i < 46; i++) flies.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.2, ph: Math.random() * 6.3, sp: .15 + Math.random() * .4 }); stars.length = 0; for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * .8, r: Math.random() * 1.2 + .3, ph: Math.random() * 6.3 }); }
    size();
    function frame(now) {
      const t = now / 1000; ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const blobs = [[.2, .25, '#ff9b3d', .16, .9], [.8, .3, '#a46bff', .2, .7], [.5, .75, '#2fc4ff', .14, .6], [.1, .8, '#ff5fa8', .12, .5]];
      blobs.forEach(([bx, by, c, a, sp], i) => { const x = (bx + Math.sin(t * .12 * sp + i * 2) * .14) * W, y = (by + Math.cos(t * .1 * sp + i) * .12) * H, r = Math.max(W, H) * (.38 + .06 * Math.sin(t * .3 + i)); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
      ctx.globalCompositeOperation = 'source-over';
      /* لانهٔ زنبور */
      const hs = 30 * SC * 1.4, hh = Math.sqrt(3) * hs; ctx.lineWidth = 1;
      for (let row = -1; row * hh * .5 < H + hh; row++) for (let col = -1; col * hs * 1.5 < W + hs * 2; col++) {
        const cx = col * hs * 1.5, cy = row * hh + (col & 1 ? hh / 2 : 0); const d = Math.hypot(cx - px * SC, cy - py * SC), near = Math.max(0, 1 - d / (170 * SC)), wave = (Math.sin(t * .8 + cx * .01 + cy * .012) + 1) * .5;
        const a = .035 + near * .5 + wave * .03; if (a < .04) { ctx.strokeStyle = 'rgba(255,200,90,' + a + ')'; } else ctx.strokeStyle = `rgba(255,${190 + near * 40 | 0},${90 + near * 100 | 0},${a})`;
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 3 * k; const x = cx + Math.cos(an) * hs * .95, y = cy + Math.sin(an) * hs * .95; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke();
        if (near > .55) { ctx.fillStyle = 'rgba(255,200,80,' + (near - .55) * .35 + ')'; ctx.fill(); }
      }
      /* ستاره‌ها */
      stars.forEach(s => { ctx.globalAlpha = .3 + .5 * Math.abs(Math.sin(t * .8 + s.ph)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }); ctx.globalAlpha = 1;
      /* شب‌تاب‌ها */
      flies.forEach(f => { f.x += Math.sin(t * f.sp + f.ph) * .35; f.y -= f.sp * .35; if (f.y < -8) { f.y = H + 8; f.x = Math.random() * W; } const a = .35 + .55 * Math.abs(Math.sin(t * 1.4 + f.ph)); const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 4); g.addColorStop(0, `rgba(255,224,110,${a})`); g.addColorStop(1, 'rgba(255,224,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 4, 0, 7); ctx.fill(); });
      /* ستارهٔ دنباله‌دار */
      nextShoot -= 1 / 60; if (!shoot && nextShoot < 0) { shoot = { x: Math.random() * W * .8, y: Math.random() * H * .3, l: 0 }; nextShoot = 4 + Math.random() * 5; }
      if (shoot) { shoot.l += 1; const k = shoot.l / 40; const x = shoot.x + k * W * .35, y = shoot.y + k * H * .3; const g = ctx.createLinearGradient(x, y, x - 60 * SC * 2, y - 40 * SC * 2); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120 * SC, y - 80 * SC); ctx.stroke(); if (shoot.l > 40) shoot = null; }
      /* انفجار ذرات کلیک */
      for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.x += b.vx; b.y += b.vy; b.vy += .08; b.a -= .02; if (b.a <= 0) { bursts.splice(i, 1); continue; } ctx.globalAlpha = b.a; ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.s, b.s); } ctx.globalAlpha = 1;
    }
    return {
      frame, size,
      move(x, y) { px = x; py = y; },
      burst(x, y) { const cols = ['#ffd45a', '#ff9ed2', '#c9a2ff', '#7fd9ff']; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3.2; bursts.push({ x: x * SC, y: y * SC, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, a: 1, s: 2 + Math.random() * 3, c: cols[i % 4] }); } }
    };
  }

  /* ================= ساخت صفحه ================= */
  let built = false, raf = 0, running = false, bee, bg, stage;
  const SUBS = ['هر جا بری، خاطره‌هامون همراهته 💛', 'زنبور ما هم اینجاست؛ بهش دست بزن 🐝', 'یه جا برای همهٔ دنیامون ✨', 'کجا بریم امروز؟ 💜'];
  function build() {
    const host = $('screen-menu'); if (!host) return false;
    if (!$('mmCss')) { const s = document.createElement('style'); s.id = 'mmCss'; s.textContent = CSS; document.head.appendChild(s); }
    host.innerHTML = '<div class="mm-stage" id="mmStage"><canvas class="mm-bg" id="mmBg"></canvas><div class="mm-glow" id="mmGlow"></div><div class="mm-in"><canvas class="mm-bee" id="mmBee" title="بهش دست بزن"></canvas><h1 class="mm-title">Our Memories</h1><p class="mm-sub" id="mmSub"></p><div class="mm-grid" id="mmGrid"></div></div></div>';
    stage = $('mmStage');
    const grid = $('mmGrid'); let i = 0;
    document.querySelectorAll('.nav-bar .nav-btn[data-screen]').forEach(b => {
      const sc = b.dataset.screen; if (sc === 'menu') return;
      const txt = b.textContent.trim(), m = txt.match(/^(\S+)\s+(.*)$/), ico = m ? m[1] : '✨', lbl = m ? m[2] : txt;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'mm-tile'; el.style.setProperty('--i', i++);
      el.innerHTML = `<span class="mm-ico">${ico}</span><span class="mm-lbl">${lbl}</span>`;
      el.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--ry', ((x - .5) * 18).toFixed(1) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 18).toFixed(1) + 'deg'); el.style.setProperty('--mx', (x * 100) + '%'); el.style.setProperty('--my', (y * 100) + '%'); });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      el.addEventListener('click', e => {
        const r = el.getBoundingClientRect(), rip = document.createElement('span'); rip.className = 'mm-rip'; const d = Math.max(r.width, r.height) * 2.2; rip.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${d}px;height:${d}px`; el.appendChild(rip);
        const sr = stage.getBoundingClientRect(); bg.burst(e.clientX - sr.left, e.clientY - sr.top);
        setTimeout(() => { try { showScreen(sc); window.scrollTo({ top: 0 }); } catch (x) {} }, 260);
      });
      grid.appendChild(el);
    });
    bee = Bee.make($('mmBee')); bg = makeBg($('mmBg'), stage);
    $('mmBee').addEventListener('click', () => bee.poke());
    $('mmSub').textContent = SUBS[Math.floor(Math.random() * SUBS.length)];
    const glow = $('mmGlow');
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      bg.move(x, y); glow.style.opacity = 1; glow.style.left = x + 'px'; glow.style.top = y + 'px';
      const br = $('mmBee').getBoundingClientRect(); bee.look(Math.max(-1, Math.min(1, (e.clientX - (br.left + br.width / 2)) / 400)), Math.max(-1, Math.min(1, (e.clientY - (br.top + br.height / 2)) / 400)));
    });
    stage.addEventListener('pointerleave', () => { glow.style.opacity = 0; bg.move(-999, -999); bee.look(0, 0); });
    window.addEventListener('resize', () => { if (!running) return; bg.size(); bee.size(); });
    return true;
  }
  function loop(now) {
    if (!running) return;
    const host = $('screen-menu');
    if (document.hidden || !host || !host.classList.contains('active')) { raf = requestAnimationFrame(loop); return; }
    try { bg.frame(now); bee.frame(now); } catch (e) { console.warn('menu', e); }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (!built) built = build(); if (!built) return;
    if (running) return; running = true; setTimeout(() => { try { bg.size(); bee.size(); } catch (e) {} }, 60);
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  window.Menu = { start, stop, _bee: () => bee };
})();
