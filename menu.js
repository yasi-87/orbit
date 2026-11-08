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
.mm-glow{position:absolute;z-index:1;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,200,60,.22),rgba(212,165,255,.12) 40%,transparent 70%);opacity:0;transition:opacity .4s;will-change:left,top;left:50%;top:30%}
.mm-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:1100px;margin:0 auto}
.mm-bee{width:250px;height:230px;cursor:pointer;touch-action:manipulation}
.mm-title{font-size:clamp(2rem,6vw,3.6rem);font-weight:800;margin:0;letter-spacing:1px;direction:ltr;background:linear-gradient(100deg,#ffd45a 0%,#ff9ed2 28%,#c9a2ff 52%,#7fd9ff 74%,#ffd45a 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:mmShine 7s linear infinite;text-shadow:0 0 40px rgba(255,200,80,.25)}
@keyframes mmShine{to{background-position:-250% 0}}
.mm-sub{color:#cdbfe6;font-size:.95rem;margin:0 0 14px;text-align:center;min-height:1.6em;opacity:.9}
.mm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;width:100%;perspective:900px;padding:6px}
.mm-tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:130px;border:0;border-radius:22px;color:#fff;font:inherit;cursor:pointer;overflow:hidden;text-align:center;
  background:linear-gradient(145deg,rgba(60,40,90,.72),rgba(30,18,50,.72));
  box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.12);
  transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(0);transition:transform .18s ease-out,box-shadow .3s;transform-style:preserve-3d;
  opacity:0;animation:mmIn .7s cubic-bezier(.2,.9,.3,1.2) forwards;animation-delay:calc(var(--i)*55ms + 150ms)}
@keyframes mmIn{from{opacity:0;transform:translateY(40px) scale(.7) rotateX(40deg)}to{opacity:1}}
.mm-tile::before{content:'';position:absolute;inset:-2px;border-radius:24px;padding:2px;background:conic-gradient(from var(--a,0deg),#ffd45a,#ff9ed2,#c9a2ff,#7fd9ff,#ffd45a);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s}
.mm-tile:hover::before{animation:mmSpin 4s linear infinite}
@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes mmSpin{to{--a:360deg}}
.mm-tile::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.32),transparent 55%);opacity:0;transition:opacity .25s;pointer-events:none}
.mm-tile:hover .mm-ico{animation:mmFloat 2.4s ease-in-out infinite}
.mm-tile:hover{box-shadow:0 22px 44px rgba(0,0,0,.5),0 0 34px rgba(255,200,90,.25),inset 0 0 0 1px rgba(255,255,255,.25)}
.mm-tile:hover::before,.mm-tile:hover::after{opacity:1}
.mm-ico{font-size:2.5rem;line-height:1;display:inline-block;transform:translateZ(30px);filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
@keyframes mmFloat{0%,100%{transform:translateZ(30px) translateY(0) rotate(-4deg)}50%{transform:translateZ(30px) translateY(-7px) rotate(4deg)}}
.mm-lbl{font-weight:700;font-size:.95rem;transform:translateZ(18px)}
.mm-rip{position:absolute;border-radius:50%;background:rgba(255,255,255,.45);transform:translate(-50%,-50%) scale(0);animation:mmRip .6s ease-out forwards;pointer-events:none}
@keyframes mmRip{to{transform:translate(-50%,-50%) scale(1);opacity:0}}
.mm-tile:active{transform:scale(.96)}
/* هاله و ستاره‌های چرخان دور زنبور */
.mm-beew{position:relative;display:flex;align-items:center;justify-content:center}
.mm-ring{position:absolute;left:50%;top:50%;width:270px;height:270px;margin:-135px 0 0 -135px;border-radius:50%;pointer-events:none;border:1px dashed rgba(255,212,90,.28);animation:mmRot 22s linear infinite}
.mm-ring.r2{width:330px;height:330px;margin:-165px 0 0 -165px;border-color:rgba(201,162,255,.22);animation-duration:34s;animation-direction:reverse}
.mm-ring i{position:absolute;top:-7px;left:50%;margin-left:-7px;font-style:normal;font-size:14px;filter:drop-shadow(0 0 6px rgba(255,212,90,.9))}
.mm-ring.r2 i{filter:drop-shadow(0 0 6px rgba(201,162,255,.9))}
.mm-ring i:nth-child(2){top:auto;bottom:-7px}
@keyframes mmRot{to{transform:rotate(360deg)}}
/* کارت خوش‌آمد و ساعت */
.mm-card{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;padding:10px 20px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,.25);margin:2px 0 6px}
.mm-hi{font-weight:700;font-size:1rem}.mm-clk{font-variant-numeric:tabular-nums;font-size:.95rem;color:#ffd45a;letter-spacing:1px;direction:ltr}.mm-dt{font-size:.82rem;color:#cdbfe6}
.mm-note{display:block;max-width:560px;width:100%;margin:0 0 16px;padding:12px 18px;border-radius:18px;border:1px solid rgba(255,158,210,.3);background:linear-gradient(135deg,rgba(255,158,210,.14),rgba(201,162,255,.1));color:#fff;font:inherit;font-size:.92rem;line-height:1.9;text-align:center;cursor:pointer;position:relative;overflow:hidden;transition:transform .2s}
.mm-note:hover{transform:translateY(-2px)}.mm-note::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.18),transparent);animation:mmSweep 6s ease-in-out infinite}
.mm-note small{display:block;opacity:.6;font-size:.7rem}
@keyframes mmSweep{0%,60%{left:-60%}100%{left:130%}}
.mm-tile .mm-lbl::after{content:'';display:block;width:0;height:2px;margin:4px auto 0;border-radius:2px;background:linear-gradient(90deg,#ffd45a,#ff9ed2);transition:width .3s}.mm-tile:hover .mm-lbl::after{width:60%}
.mm-conf{position:absolute;top:-20px;z-index:5;pointer-events:none;animation:mmFall linear forwards;font-size:20px}
@keyframes mmFall{to{transform:translateY(calc(100vh + 40px)) rotate(540deg);opacity:.2}}
/* موج‌های متحرک پایین صحنه */
.mm-waves{position:absolute;left:0;right:0;bottom:0;height:90px;z-index:1;pointer-events:none;overflow:hidden;opacity:.9}
.mm-waves svg{position:absolute;bottom:0;left:0;width:200%;height:100%;animation:mmWave 14s linear infinite}
.mm-waves svg.w2{animation-duration:22s;animation-direction:reverse;opacity:.6;bottom:6px}
.mm-waves svg.w3{animation-duration:32s;opacity:.4;bottom:14px}
@keyframes mmWave{to{transform:translateX(-50%)}}
/* حلقه‌های ضربانی از زنبور */
.mm-pulse{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,212,90,.5);pointer-events:none;opacity:0;animation:mmPulse 4.5s ease-out infinite}
.mm-pulse.p2{animation-delay:1.5s;border-color:rgba(255,158,210,.5)}.mm-pulse.p3{animation-delay:3s;border-color:rgba(127,217,255,.5)}
@keyframes mmPulse{0%{transform:scale(.4);opacity:.8}100%{transform:scale(3.2);opacity:0}}
.mm-beew{transition:transform .25s ease-out;will-change:transform}
/* زنبور همراه که دنبال موس می‌پره */
.mm-pet{position:absolute;z-index:4;left:0;top:0;font-size:22px;pointer-events:none;will-change:transform;filter:drop-shadow(0 4px 8px rgba(255,200,60,.6))}
.mm-pet::after{content:'';position:absolute;left:50%;top:100%;width:34px;height:3px;margin-left:-17px;border-radius:50%;background:rgba(0,0,0,.25);filter:blur(2px)}
/* زنبورهای کوچیک که از عرض صحنه رد می‌شن */
.mm-fly{position:absolute;z-index:3;font-size:20px;pointer-events:none;left:-40px;animation:mmFly linear infinite;filter:drop-shadow(0 3px 6px rgba(255,200,60,.5))}
@keyframes mmFly{0%{transform:translate(0,0) scaleX(1)}25%{transform:translate(28vw,-30px)}50%{transform:translate(56vw,20px)}75%{transform:translate(84vw,-24px)}100%{transform:translate(112vw,0)}}
/* ایکون‌های کاشی‌ها: نفس‌کشیدن آروم و موج نور پشت‌سرهم */
.mm-ico{animation:mmBreath 3.6s ease-in-out infinite;animation-delay:calc(var(--i)*-.4s)}
@keyframes mmBreath{0%,100%{transform:translateZ(30px) translateY(0) scale(1)}50%{transform:translateZ(30px) translateY(-4px) scale(1.07)}}
.mm-tile .mm-shine{position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.22),transparent);transform:skewX(-18deg);animation:mmTShine 7s ease-in-out infinite;animation-delay:calc(var(--i)*.35s);pointer-events:none}
@keyframes mmTShine{0%,70%{left:-70%}100%{left:140%}}
.mm-caret{display:inline-block;width:2px;height:1em;background:#ffd45a;margin-right:3px;vertical-align:-2px;animation:mmBlink 1s steps(2) infinite}
@keyframes mmBlink{50%{opacity:0}}
@media (max-width:520px){.mm-ring{width:220px;height:220px;margin:-110px 0 0 -110px}.mm-ring.r2{width:270px;height:270px;margin:-135px 0 0 -135px}.mm-grid{grid-template-columns:repeat(2,1fr);gap:12px}.mm-tile{height:112px}.mm-bee{width:210px;height:195px}}
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
      const eyeH = 0.46 * S.blink, eyeTop = 0.74, eyeBot = eyeTop - eyeH, g = S.grin || 0;
      const eye = (u0, u1) => [rect(u0, eyeBot, u1, eyeTop, '#1a1224'), rect(u0, eyeBot, u1, eyeBot + Math.min(eyeH, 0.15), '#2db4ff'), rect(u0 + 0.03, eyeTop - 0.1, u0 + 0.1, eyeTop - 0.03, '#fff'), rect(u1 - 0.09, eyeTop - 0.2, u1 - 0.04, eyeTop - 0.15, 'rgba(255,255,255,.85)')];
      /* ابروهای مهربون: بیرون پایین‌تر، داخل بالاتر */
      const brow = (u0, u1, side) => { const y = 0.87 + S.brow * 0.035; const yo = y - 0.03, yi = y + 0.025; return { pts: side > 0 ? [[u0, yo], [u1, yi], [u1, yi + 0.06], [u0, yo + 0.06]] : [[u0, yi], [u1, yo], [u1, yo + 0.06], [u0, yi + 0.06]], col: '#14101a' }; };
      const blush = (u0, u1) => rect(u0, 0.17, u1, 0.27, 'rgba(255,120,150,.55)');
      /* لبخند: وقتی دست بزنی دهنش باز می‌شه */
      const mouth = g > 0.05
        ? [rect(0.36, 0.06, 0.64, 0.12 + 0.12 * g, '#3a1424'), rect(0.42, 0.06, 0.58, 0.09 + 0.04 * g, '#ff7a98'), rect(0.32, 0.17 + 0.07 * g, 0.37, 0.23 + 0.07 * g, '#14101a'), rect(0.63, 0.17 + 0.07 * g, 0.68, 0.23 + 0.07 * g, '#14101a')]
        : [rect(0.38, 0.08, 0.62, 0.14, '#14101a'), rect(0.32, 0.13, 0.39, 0.2, '#14101a'), rect(0.61, 0.13, 0.68, 0.2, '#14101a')];
      const head = boxFaces([0, -0.1, 1.45], [1.15, 1.1, 1.05], YEL, {
        f: [...eye(0.1, 0.38), ...eye(0.62, 0.9), brow(0.08, 0.4, 1), brow(0.6, 0.92, -1), blush(0.05, 0.2), blush(0.8, 0.95), ...mouth]
      });
      const sw = Math.sin(S.t * 3) * 0.12;
      const ant = x => [].concat(boxFaces([x + sw * 0.5, 1.35, 1.35], [0.06, 0.3, 0.06], '#3a2a24', {}), boxFaces([x + sw, 1.78, 1.35], [0.14, 0.14, 0.14], '#ffd84a', {}));
      const body = boxFaces([0, -0.2, -1.05], [1.15, 1.05, 1.3], BRN, {
        t: [rect(0, 0.14, 1, 0.26, STR), rect(0, 0.44, 1, 0.56, STR), rect(0, 0.74, 1, 0.86, STR)],
        r: [rect(0.18, 0, 0.3, 1, STR), rect(0.46, 0, 0.58, 1, STR), rect(0.74, 0, 0.86, 1, STR)],
        l: [rect(0.18, 0, 0.3, 1, STR), rect(0.46, 0, 0.58, 1, STR), rect(0.74, 0, 0.86, 1, STR)]
      });
      const sting = boxFaces([0, -0.5, -2.5], [0.3, 0.3, 0.2], '#2d2420', {});
      const leg = (x) => boxFaces([x, -1.4, 0.0], [0.14, 0.22, 0.14], '#2d2420', {});
      return [].concat(head, ant(-0.5), ant(0.5), body, sting, leg(-0.6), leg(0.6), leg(-0.6).map(f => Object.assign({}, f, { O: V.add(f.O, [0, 0, -1.2]) })), leg(0.6).map(f => Object.assign({}, f, { O: V.add(f.O, [0, 0, -1.2]) })));
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
      let t0 = performance.now(), phase = 'idle', pt = 0, idleLen = 3.5 + Math.random() * 2, ptrX = 0, ptrY = 0, hop = 0, lastT = t0, blinkT = 0, nextBlink = 2.5, love = [], grinT = 0, lastPoke = 0;
      function size() { const r = canvas.getBoundingClientRect(); W = Math.max(120, r.width); H = Math.max(110, r.height); dpr = Math.min(1.5, window.devicePixelRatio || 1); canvas.width = W * dpr; canvas.height = H * dpr; }
      size();
      function poke() { grinT = 1.6; const nw = performance.now(); if (phase === 'idle' && nw - lastPoke < 1500) { phase = 'away'; pt = 0; } else hop = 1; lastPoke = nw; for (let i = 0; i < 7; i++) love.push({ x: W / 2 + (Math.random() - .5) * 90, y: H * .38, vy: -(30 + Math.random() * 40), vx: (Math.random() - .5) * 40, a: 1, e: ['💛', '✨', '💖'][i % 3] }); }
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
        hop = Math.max(0, hop - dt * 2.2); grinT = Math.max(0, grinT - dt * 1.1);
        blinkT += dt; if (blinkT > nextBlink) { blinkT = -0.14; nextBlink = 2 + Math.random() * 3; }
        const blink = blinkT < 0 ? 0.12 : 1;
        const S = { t, blink, brow: Math.sin(t * 5.2) * 0.5 + 0.5, grin: Math.max(0, Math.min(1, grinT)) };
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
    const ctx = canvas.getContext('2d'); let W = 0, H = 0; const SC = 0.5;
    const flies = [], stars = [], bursts = [], hearts = []; const HE = ['💛', '💜', '🌸', '💖', '✨'], hsp = HE.map(e => { const c = mk2(28, 28), g = c.getContext('2d'); g.font = '20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 14, 15); return c; }); let px = -999, py = -999, shoot = null, nextShoot = 3, fr = 0;
    function mk2(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    let aur = null, hexc = null, HS = 0, HH = 0;
    const spr = mk(48, 48); { const g = spr.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,224,110,1)'); gr.addColorStop(.3, 'rgba(255,224,110,.45)'); gr.addColorStop(1, 'rgba(255,224,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); }
    const hexPath = (g, cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 3 * k, x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    function size() {
      const r = stage.getBoundingClientRect(); W = Math.max(200, r.width * SC | 0); H = Math.max(200, r.height * SC | 0); canvas.width = W; canvas.height = H;
      flies.length = 0; for (let i = 0; i < 26; i++) flies.push({ x: Math.random() * W, y: Math.random() * H, r: 5 + Math.random() * 9, ph: Math.random() * 6.3, sp: .15 + Math.random() * .4 });
      stars.length = 0; for (let i = 0; i < 40; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * .8, r: Math.random() * 1.2 + .5, ph: Math.random() * 6.3 });
      hearts.length = 0; for (let i = 0; i < 12; i++) hearts.push({ x: Math.random() * W, y: Math.random() * H, s: 7 + Math.random() * 9, sp: .12 + Math.random() * .25, ph: Math.random() * 6.3, k: i % hsp.length });
      aur = mk(Math.ceil(W / 4), Math.ceil(H / 4));
      HS = 30 * SC * 1.4; HH = Math.sqrt(3) * HS; hexc = mk(W, H); const g = hexc.getContext('2d'); g.strokeStyle = 'rgba(255,200,90,.06)'; g.lineWidth = 1;
      for (let row = -1; row * HH * .5 < H + HH; row++) for (let col = -1; col * HS * 1.5 < W + HS * 2; col++) hexPath(g, col * HS * 1.5, row * HH + (col & 1 ? HH / 2 : 0), HS * .95), g.stroke();
    }
    size();
    function frame(now) {
      const t = now / 1000; fr++;
      /* شفق: کوچیک و هر چند فریم یک‌بار */
      if (fr % 4 === 1) {
        const g = aur.getContext('2d'), w = aur.width, h = aur.height; g.clearRect(0, 0, w, h); g.globalCompositeOperation = 'lighter';
        [[.2, .25, '255,155,61', .26, .9], [.8, .3, '164,107,255', .3, .7], [.5, .75, '47,196,255', .22, .6], [.1, .8, '255,95,168', .2, .5]].forEach(([bx, by, c, a, sp], i) => {
          const x = (bx + Math.sin(t * .12 * sp + i * 2) * .14) * w, y = (by + Math.cos(t * .1 * sp + i) * .12) * h, r = Math.max(w, h) * (.4 + .05 * Math.sin(t * .3 + i));
          const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        });
      }
      ctx.clearRect(0, 0, W, H); ctx.drawImage(aur, 0, 0, W, H);
      ctx.drawImage(hexc, 0, 0);
      /* لانهٔ نورانی دور موس: فقط خانه‌های نزدیک */
      if (px > -500) {
        const R = 170 * SC, c0 = Math.floor((px * SC - R) / (HS * 1.5)) - 1, c1 = Math.ceil((px * SC + R) / (HS * 1.5)) + 1;
        for (let col = c0; col <= c1; col++) for (let row = Math.floor((py * SC - R) / HH) - 1; row <= Math.ceil((py * SC + R) / HH) + 1; row++) {
          const cx = col * HS * 1.5, cy = row * HH + (col & 1 ? HH / 2 : 0), near = 1 - Math.hypot(cx - px * SC, cy - py * SC) / R; if (near <= 0) continue;
          hexPath(ctx, cx, cy, HS * .95); ctx.strokeStyle = `rgba(255,${190 + near * 40 | 0},${90 + near * 100 | 0},${.1 + near * .5})`; ctx.stroke();
          if (near > .55) { ctx.fillStyle = 'rgba(255,200,80,' + (near - .55) * .3 + ')'; ctx.fill(); }
        }
      }
      stars.forEach(s => { ctx.globalAlpha = .3 + .5 * Math.abs(Math.sin(t * .8 + s.ph)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }); ctx.globalAlpha = 1;
      flies.forEach(f => { f.x += Math.sin(t * f.sp + f.ph) * .35; f.y -= f.sp * .35; if (f.y < -12) { f.y = H + 12; f.x = Math.random() * W; } ctx.globalAlpha = .3 + .6 * Math.abs(Math.sin(t * 1.4 + f.ph)); ctx.drawImage(spr, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }); ctx.globalAlpha = 1;
      /* ماه یا خورشید گوشهٔ صحنه */
      { const hh = new Date().getHours(), day = hh >= 6 && hh < 18, cx = W * .88, cy = H * .1, r = 22 * SC * 2, gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
        gr.addColorStop(0, day ? 'rgba(255,220,120,.55)' : 'rgba(200,215,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
        ctx.fillStyle = day ? '#ffe08a' : '#eef2ff'; ctx.beginPath(); ctx.arc(cx, cy, r * .75, 0, 6.3); ctx.fill();
        if (!day) { ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(cx + r * .3, cy - r * .12, r * .7, 0, 6.3); ctx.fill(); } }
      hearts.forEach(h => { h.y -= h.sp; h.x += Math.sin(t * .6 + h.ph) * .3; if (h.y < -20) { h.y = H + 20; h.x = Math.random() * W; } ctx.globalAlpha = .35 + .25 * Math.sin(t + h.ph); ctx.drawImage(hsp[h.k], h.x, h.y, h.s * 2, h.s * 2); }); ctx.globalAlpha = 1;
      nextShoot -= 1 / 40; if (!shoot && nextShoot < 0) { shoot = { x: Math.random() * W * .8, y: Math.random() * H * .3, l: 0 }; nextShoot = 4 + Math.random() * 5; }
      if (shoot) { shoot.l += 1; const k = shoot.l / 30; const x = shoot.x + k * W * .35, y = shoot.y + k * H * .3; const g = ctx.createLinearGradient(x, y, x - 60, y - 40); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60, y - 40); ctx.stroke(); if (shoot.l > 30) shoot = null; }
      for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.x += b.vx; b.y += b.vy; b.vy += .1; b.a -= .03; if (b.a <= 0) { bursts.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, b.a); if (b.h) { ctx.drawImage(b.h, b.x, b.y, b.s * 2.4, b.s * 2.4); } else { ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.s, b.s); } } ctx.globalAlpha = 1;
    }
    return {
      frame, size,
      move(x, y) { px = x; py = y; },
      burst(x, y, heart) { if (heart) { for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 1.6, v = 1.5 + Math.random() * 2.5; bursts.push({ x: x * SC, y: y * SC, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: 1.4, s: 5 + Math.random() * 4, c: ['#ff9ed2', '#ffd45a', '#c9a2ff'][i % 3], h: hsp[i % hsp.length] }); } return; }
        const cols = ['#ffd45a', '#ff9ed2', '#c9a2ff', '#7fd9ff']; for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 3; bursts.push({ x: x * SC, y: y * SC, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, a: 1, s: 2 + Math.random() * 3, c: cols[i % 4] }); } }
    };
  }

  /* ================= ساخت صفحه ================= */
  let lastClk = 0, lastF = 0, built = false, raf = 0, running = false, bee, bg, stage;
  const SUBS = ['هر جا بری، خاطره‌هامون همراهته 💛', 'زنبور ما هم اینجاست؛ بهش دست بزن 🐝', 'یه جا برای همهٔ دنیامون ✨', 'کجا بریم امروز؟ 💜', 'امروز چه خاطره‌ای بسازیم؟ 📖', 'کنار هم، قشنگ‌ترین جای دنیاست 🌍'];
  const NOTES = ['هر روزی که کنار همیم، یه خاطرهٔ قشنگ تازه‌ست 💜', 'خاطره‌ها رو بنویس؛ یه روزی با هم می‌خونیمشون و می‌خندیم 📖', 'یه آهنگ بذار و بذار امشب فقط مال خودمون باشه 🎵', 'کوچیک‌ترین لحظه‌ها، قشنگ‌ترین خاطره‌ها رو می‌سازن ✨', 'امروز یه عکس بذار توی گالری، فردا بهش لبخند می‌زنیم 🖼️', 'کنار تو، حتی یه روز معمولی هم جشنه 🎉', 'یه نقاشی بکش و به همدیگه هدیه بده 🎨', 'گربه‌هامون منتظرن ببینن امروز نوازششون می‌کنی 🐱', 'دنیای ما کوچیکه، ولی از همهٔ دنیا قشنگ‌تره 🌍💛', 'یه فیلم انتخاب کنید و با هم تماشا کنید، حتی از دور 🍿'];
  const pad = n => (n < 10 ? '0' : '') + n;
  function greet() {
    const h = new Date().getHours(), nm = (typeof myName === 'function' ? myName() : '') || '';
    const g = h < 5 ? '🌙 شب بخیر' : h < 11 ? '☀️ صبح بخیر' : h < 15 ? '🌤️ ظهر بخیر' : h < 18 ? '🌸 عصر بخیر' : h < 22 ? '🌆 شب بخیر' : '🌙 شب بخیر';
    return g + (nm ? ' ' + nm : '') + ' 💜';
  }
  function tickInfo() {
    const d = new Date(), hi = $('mmHi'), c = $('mmClk'), dt = $('mmDt'); if (!hi) return;
    hi.textContent = greet(); c.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    try { dt.textContent = Recur.fmtJalaliShort(Recur.todayIso()); } catch (e) { dt.textContent = ''; }
  }
  function nextNote(first) {
    const n = $('mmNote'); if (!n) return; let i = Math.floor(Math.random() * NOTES.length);
    n.innerHTML = NOTES[i] + '<small>برای جملهٔ بعدی بزن</small>';
  }
  function confetti() {
    if (reduce() || !stage) return; const em = ['💛', '💜', '🌸', '✨', '🐝', '⭐', '🎉', '💖'];
    for (let i = 0; i < 26; i++) { const e = document.createElement('span'); e.className = 'mm-conf'; e.textContent = em[i % em.length]; e.style.left = (Math.random() * 100) + '%'; e.style.animationDuration = (2.6 + Math.random() * 2.4) + 's'; e.style.animationDelay = (Math.random() * .8) + 's'; e.style.fontSize = (16 + Math.random() * 16) + 'px'; stage.appendChild(e); setTimeout(() => e.remove(), 6500); }
  }
  /* تایپ‌شدن زیرعنوان + زنبور همراه */
  const ty = { i: 0, k: 0, t: 0, hold: 0, del: false }, pet = { x: 200, y: 120, mx: -1, my: -1, on: false };
  function typer(now) {
    const el = $('mmSub'); if (!el || now - ty.t < 70) return; ty.t = now; const full = SUBS[ty.i % SUBS.length];
    if (ty.hold > 0) { ty.hold--; return; }
    if (!ty.del) { ty.k++; if (ty.k >= full.length) { ty.del = true; ty.hold = 30; } } else { ty.k -= 2; if (ty.k <= 0) { ty.k = 0; ty.del = false; ty.i++; ty.hold = 4; } }
    el.innerHTML = full.slice(0, ty.k) + '<span class="mm-caret"></span>';
  }
  function petMove(now) {
    const p = $('mmPet'); if (!p || !stage) return; const r = stage.getBoundingClientRect(), t = now / 1000;
    let tx, ty2; if (pet.on) { tx = pet.mx + Math.cos(t * 2.2) * 26; ty2 = pet.my - 30 + Math.sin(t * 3) * 14; } else { tx = r.width / 2 + Math.cos(t * .9) * Math.min(300, r.width * .35); ty2 = 130 + Math.sin(t * 1.3) * 60; }
    pet.x += (tx - pet.x) * .08; pet.y += (ty2 - pet.y) * .08; const dx = tx - pet.x;
    p.style.transform = `translate(${pet.x.toFixed(1)}px,${pet.y.toFixed(1)}px) scaleX(${dx < -1 ? -1 : 1}) rotate(${Math.max(-18, Math.min(18, dx * .2)).toFixed(0)}deg)`;
  }
  function build() {
    const host = $('screen-menu'); if (!host) return false;
    if (!$('mmCss')) { const s = document.createElement('style'); s.id = 'mmCss'; s.textContent = CSS; document.head.appendChild(s); }
    host.innerHTML = '<div class="mm-stage" id="mmStage"><canvas class="mm-bg" id="mmBg"></canvas><div class="mm-glow" id="mmGlow"></div><div class="mm-waves"><svg class="w3" viewBox="0 0 1200 90" preserveAspectRatio="none"><path d="M0 50 Q150 10 300 50 T600 50 T900 50 T1200 50 V90 H0z" fill="#7fd9ff" opacity=".25"/></svg><svg class="w2" viewBox="0 0 1200 90" preserveAspectRatio="none"><path d="M0 55 Q150 20 300 55 T600 55 T900 55 T1200 55 V90 H0z" fill="#c9a2ff" opacity=".3"/></svg><svg viewBox="0 0 1200 90" preserveAspectRatio="none"><path d="M0 60 Q150 30 300 60 T600 60 T900 60 T1200 60 V90 H0z" fill="#ff9ed2" opacity=".28"/></svg></div><span class="mm-pet" id="mmPet">🐝</span><span class="mm-fly" style="top:18%;animation-duration:19s">🦋</span><span class="mm-fly" style="top:46%;animation-duration:27s;animation-delay:-9s">🐝</span><span class="mm-fly" style="top:70%;animation-duration:23s;animation-delay:-15s">✨</span><div class="mm-in"><div class="mm-beew"><div class="mm-pulse"></div><div class="mm-pulse p2"></div><div class="mm-pulse p3"></div><div class="mm-ring"><i>✨</i><i>💛</i></div><div class="mm-ring r2"><i>🌸</i><i>⭐</i></div><canvas class="mm-bee" id="mmBee" title="بهش دست بزن"></canvas></div><h1 class="mm-title" id="mmTitle">Our Memories</h1><p class="mm-sub" id="mmSub"></p><div class="mm-card"><span class="mm-hi" id="mmHi"></span><span class="mm-clk" id="mmClk"></span><span class="mm-dt" id="mmDt"></span></div><button type="button" class="mm-note" id="mmNote"></button><div class="mm-grid" id="mmGrid"></div></div></div>';
    stage = $('mmStage');
    const grid = $('mmGrid'); let i = 0;
    document.querySelectorAll('.nav-bar .nav-btn[data-screen]').forEach(b => {
      const sc = b.dataset.screen; if (sc === 'menu') return;
      const txt = b.textContent.trim(), m = txt.match(/^(\S+)\s+(.*)$/), ico = m ? m[1] : '✨', lbl = m ? m[2] : txt;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'mm-tile'; el.style.setProperty('--i', i++);
      el.innerHTML = `<i class="mm-shine"></i><span class="mm-ico">${ico}</span><span class="mm-lbl">${lbl}</span>`;
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
    ty.i = Math.floor(Math.random() * SUBS.length);
    tickInfo(); nextNote(); $('mmNote').addEventListener('click', e => { nextNote(); const sr = stage.getBoundingClientRect(); bg.burst(e.clientX - sr.left, e.clientY - sr.top); });
    let tt = 0, tc = 0; $('mmTitle').addEventListener('click', () => { const n = Date.now(); tc = n - tt < 700 ? tc + 1 : 1; tt = n; if (tc >= 5) { tc = 0; confetti(); bee.poke(); } });
    stage.addEventListener('click', e => { if (e.target.closest('.mm-tile,.mm-note,.mm-title,.mm-bee')) return; const sr = stage.getBoundingClientRect(); bg.burst(e.clientX - sr.left, e.clientY - sr.top, true); });
    const glow = $('mmGlow');
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      pet.on = true; pet.mx = x; pet.my = y; const bw = document.querySelector('.mm-beew'); if (bw) bw.style.transform = `translate(${((x / r.width - .5) * -16).toFixed(1)}px,${((y / r.height - .5) * -10).toFixed(1)}px)`;
      bg.move(x, y); glow.style.opacity = 1; glow.style.left = x + 'px'; glow.style.top = y + 'px';
      const br = $('mmBee').getBoundingClientRect(); bee.look(Math.max(-1, Math.min(1, (e.clientX - (br.left + br.width / 2)) / 400)), Math.max(-1, Math.min(1, (e.clientY - (br.top + br.height / 2)) / 400)));
    });
    stage.addEventListener('pointerleave', () => { glow.style.opacity = 0; pet.on = false; bg.move(-999, -999); bee.look(0, 0); const bw = document.querySelector('.mm-beew'); if (bw) bw.style.transform = ''; });
    window.addEventListener('resize', () => { if (!running) return; bg.size(); bee.size(); });
    return true;
  }
  function loop(now) {
    if (!running) return;
    const host = $('screen-menu');
    if (document.hidden || !host || !host.classList.contains('active')) { raf = requestAnimationFrame(loop); return; }
    if (now - lastF < 24) { raf = requestAnimationFrame(loop); return; } lastF = now;
    if (now - lastClk > 1000) { lastClk = now; tickInfo(); } try { typer(now); petMove(now); bg.frame(now); bee.frame(now); } catch (e) { console.warn('menu', e); }
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
