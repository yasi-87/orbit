/* ✨ جادوی سایت: ذرات فصلی (برگ پاییز، برف، شکوفه، شب‌تاب)، رد ستاره‌ای موس، قلب با دابل‌کلیک، دکمهٔ رفتن به بالا و انیمیشن عوض‌شدن صفحه
   همه‌چیز سبکه، با دکمهٔ 🍂 بالا خاموش می‌شه و وقتی تب پنهانه نمی‌چرخه. */
(function () {
  'use strict';
  const LS = 'diary_magic_off';
  const get = () => { try { return localStorage.getItem(LS) === '1'; } catch (e) { return false; } };
  const set = v => { try { localStorage.setItem(LS, v ? '1' : '0'); } catch (e) {} };
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const m = new Date().getMonth();
  const SEASON = m === 11 || m < 2 ? { e: ['❄️', '❄️', '✨', '🤍'], ic: '❄️', sp: 1 } : m < 5 ? { e: ['🌸', '🌸', '💮', '🌷'], ic: '🌸', sp: .8 } : m < 8 ? { e: ['✨', '☀️', '🦋', '🌼'], ic: '🦋', sp: .6 } : { e: ['🍂', '🍁', '🍂', '🌰'], ic: '🍂', sp: 1 };
  let cv, ctx, W = 0, H = 0, parts = [], spr = [], trail = [], raf = 0, on = !get(), mx = -99, my = -99, lastMv = 0;

  const CSS = `
.mg-cv{position:fixed;inset:0;width:100%;height:100%;z-index:40;pointer-events:none}
.mg-top{position:fixed;left:16px;bottom:96px;z-index:60;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;color:#fff;font-size:1.2rem;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(16px) scale(.8);pointer-events:none;transition:.3s;
  background:conic-gradient(var(--accent,#c9a2ff) calc(var(--p,0)*1%),rgba(255,255,255,.14) 0);box-shadow:0 6px 18px rgba(0,0,0,.4)}
.mg-top::before{content:'';position:absolute;inset:4px;border-radius:50%;background:rgba(24,14,38,.92)}.mg-top span{position:relative}
.mg-top.show{opacity:1;transform:none;pointer-events:auto}.mg-top:hover{transform:translateY(-3px) scale(1.06)}
.mg-heart{position:fixed;z-index:9999;pointer-events:none;font-size:56px;transform:translate(-50%,-50%) scale(0);animation:mgPop .9s cubic-bezier(.2,1.4,.4,1) forwards;filter:drop-shadow(0 6px 14px rgba(255,80,140,.6))}
@keyframes mgPop{0%{transform:translate(-50%,-50%) scale(0) rotate(-15deg);opacity:1}35%{transform:translate(-50%,-60%) scale(1.25) rotate(8deg);opacity:1}100%{transform:translate(-50%,-190%) scale(.9) rotate(-6deg);opacity:0}}
.mg-mini{position:fixed;z-index:9998;pointer-events:none;font-size:18px;transform:translate(-50%,-50%);animation:mgMini .9s ease-out forwards}
@keyframes mgMini{to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}
.screen.active{animation:mgIn .45s cubic-bezier(.2,.8,.3,1)}
@keyframes mgIn{from{opacity:0;transform:translateY(14px) scale(.992)}to{opacity:1;transform:none}}
.mg-bee{position:fixed;left:0;top:0;z-index:130;font-size:24px;line-height:1;pointer-events:none;will-change:transform;filter:drop-shadow(0 4px 8px rgba(255,200,60,.55));transition:opacity .4s}
.mg-bee::after{content:'';position:absolute;left:50%;top:115%;width:30px;height:3px;margin-left:-15px;border-radius:50%;background:rgba(0,0,0,.28);filter:blur(2px)}
.mg-bee.hide{opacity:0}.mg-bee.buzz{animation:mgBuzz .5s}
@keyframes mgBuzz{0%,100%{rotate:0deg}25%{rotate:-25deg}75%{rotate:25deg}}
#mgBtn{font-size:1.05rem}#mgBtn.off{opacity:.45;filter:grayscale(1)}
@media (prefers-reduced-motion:reduce){.screen.active{animation:none}.mg-heart,.mg-mini{animation-duration:.01s}}
`;

  function sprites() {
    spr = SEASON.e.map(e => { const c = document.createElement('canvas'); c.width = c.height = 36; const g = c.getContext('2d'); g.font = '26px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 18, 20); return c; });
  }
  function size() { if (!cv) return; W = cv.width = innerWidth; H = cv.height = innerHeight; const n = Math.min(26, Math.max(12, W / 60 | 0)); parts = Array.from({ length: n }, () => mk(true)); }
  function mk(any) { return { x: Math.random() * W, y: any ? Math.random() * H : -30, s: 10 + Math.random() * 14, v: (.35 + Math.random() * .8) * SEASON.sp, ph: Math.random() * 6.3, w: .4 + Math.random() * .8, r: Math.random() * 6.3, rs: (Math.random() - .5) * .03, k: Math.random() * spr.length | 0, a: .35 + Math.random() * .4 }; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    beeFrame(now);
    if (document.hidden || !on) return;
    if (!ctx) return; ctx.clearRect(0, 0, W, H); const t = now / 1000;
    for (const p of parts) {
      p.y += p.v; p.x += Math.sin(t * p.w + p.ph) * .6; p.r += p.rs; if (p.y > H + 30) Object.assign(p, mk(false));
      ctx.globalAlpha = p.a; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.drawImage(spr[p.k], -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
    }
    for (let i = trail.length - 1; i >= 0; i--) { const q = trail[i]; q.l -= 1; if (q.l <= 0) { trail.splice(i, 1); continue; } ctx.globalAlpha = q.l / 26; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * q.l / 26, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  /* 🐝 زنبور کوچولو توی همهٔ صفحه‌ها (توی منوی اصلی زنبور خودش رو داره) */
  const bee = { el: null, x: 120, y: 160, tx: 120, ty: 160, last: 0, vx: 0 };
  function chatOpen() { return document.body.classList.contains('chat-open'); }
  function beeFrame(now) {
    const b = bee.el; if (!b) return; const menu = document.getElementById('screen-menu'), hide = !on || document.hidden || (menu && menu.classList.contains('active') && !chatOpen());
    b.classList.toggle('hide', !!hide); if (hide) return; const t = now / 1000;
    if (now - bee.last > 2500) { bee.tx = innerWidth * (.5 + Math.cos(t * .3) * .38); bee.ty = innerHeight * (.5 + Math.sin(t * .45) * .3); }
    const ox = Math.cos(t * 1.4) * 22, oy = Math.sin(t * 1.8) * 12 - 26;
    const px = bee.x, nx = bee.x + (bee.tx + (now - bee.last > 2500 ? 0 : ox) - bee.x) * .028, ny = bee.y + (bee.ty + (now - bee.last > 2500 ? 0 : oy) - bee.y) * .028;
    bee.vx = nx - px; bee.x = nx; bee.y = ny;
    b.style.transform = `translate(${nx.toFixed(1)}px,${ny.toFixed(1)}px) scaleX(${bee.vx < -.15 ? -1 : 1}) rotate(${Math.max(-16, Math.min(16, bee.vx * 4)).toFixed(0)}deg)`;
  }
  function onMove(e) {
    bee.tx = e.clientX; bee.ty = e.clientY; bee.last = performance.now();
    if (!on || e.pointerType === 'touch') return; const n = performance.now(); if (n - lastMv < 28) return; lastMv = n;
    const cols = ['#ffd45a', '#ff9ed2', '#c9a2ff', '#7fd9ff']; trail.push({ x: e.clientX + (Math.random() - .5) * 6, y: e.clientY + (Math.random() - .5) * 6, r: 2 + Math.random() * 2.5, l: 26, c: cols[Math.random() * 4 | 0] });
    if (trail.length > 60) trail.shift();
  }
  function heart(x, y) {
    const h = document.createElement('div'); h.className = 'mg-heart'; h.textContent = ['💖', '💜', '💛', '💗'][Math.random() * 4 | 0]; h.style.left = x + 'px'; h.style.top = y + 'px'; document.body.appendChild(h); setTimeout(() => h.remove(), 1000);
    for (let i = 0; i < 8; i++) { const s = document.createElement('div'); s.className = 'mg-mini'; s.textContent = ['✨', '💫', '⭐', '💕'][i % 4]; const a = i / 8 * 6.28; s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * 70}px;--dy:${Math.sin(a) * 70}px`; document.body.appendChild(s); setTimeout(() => s.remove(), 950); }
  }
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    {
      if (!reduce) { cv = document.createElement('canvas'); cv.className = 'mg-cv'; document.body.appendChild(cv); ctx = cv.getContext('2d'); sprites(); size(); addEventListener('resize', size); }
      addEventListener('pointermove', onMove, { passive: true }); if (false) addEventListener('resize', size); addEventListener('pointerdown', e => { bee.tx = e.clientX; bee.ty = e.clientY; bee.last = performance.now(); }, { passive: true });
      bee.el = document.createElement('div'); bee.el.className = 'mg-bee hide'; bee.el.textContent = '🐝'; document.body.appendChild(bee.el); raf = requestAnimationFrame(frame);
    }
    /* دکمهٔ روشن/خاموش بالای سایت */
    const bar = document.getElementById('updatesBtn');
    if (bar) { const b = document.createElement('button'); b.className = 'icon-btn' + (on ? '' : ' off'); b.id = 'mgBtn'; b.title = 'افکت‌های فصلی (روشن/خاموش)'; b.textContent = SEASON.ic; b.onclick = () => { on = !on; set(!on); b.classList.toggle('off', !on); if (!on) { if (ctx) ctx.clearRect(0, 0, W, H); trail.length = 0; } }; bar.parentNode.insertBefore(b, bar); }
    /* دابل‌کلیک = قلب */
    let lt = 0, lx = 0, ly = 0;
    addEventListener('dblclick', e => { if (e.target.closest('input,textarea,button,a,select,video,audio,[contenteditable]')) return; try { getSelection().removeAllRanges(); } catch (x) {} heart(e.clientX, e.clientY); });
    addEventListener('touchend', e => { const t = e.changedTouches[0], n = Date.now(); if (n - lt < 320 && Math.hypot(t.clientX - lx, t.clientY - ly) < 30 && !(e.target.closest && e.target.closest('input,textarea,button,a,select,video,audio,[contenteditable]'))) { heart(t.clientX, t.clientY); lt = 0; } else { lt = n; lx = t.clientX; ly = t.clientY; } }, { passive: true });
    /* رفتن به بالا با حلقهٔ پیشرفت */
    const up = document.createElement('button'); up.className = 'mg-top'; up.innerHTML = '<span>⬆️</span>'; up.title = 'رفتن به بالا'; document.body.appendChild(up);
    up.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
    let tk = 0; addEventListener('scroll', () => { if (tk) return; tk = requestAnimationFrame(() => { tk = 0; const d = document.documentElement, mx2 = d.scrollHeight - innerHeight; up.style.setProperty('--p', mx2 > 0 ? Math.round(scrollY / mx2 * 100) : 0); up.classList.toggle('show', scrollY > 420); }); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
