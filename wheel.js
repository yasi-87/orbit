/* 🎡 چرخ تصمیم: وقتی نمی‌دونیم چی بخوریم، چی ببینیم یا کجا بریم؛ چرخ رو می‌چرخونیم! چرخ‌های آماده + چرخ‌های خودمون (مشترک) */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRE = [
    { id: 'p_food', ic: '🍽️', name: 'چی بخوریم؟', items: ['پیتزا', 'برگر', 'کباب', 'پاستا', 'سوشی', 'مرغ سوخاری', 'سالاد', 'املت', 'ساندویچ', 'قیمه و کته'] },
    { id: 'p_movie', ic: '🎬', name: 'چی ببینیم؟', items: ['کمدی', 'عاشقانه', 'ترسناک', 'انیمیشن', 'اکشن', 'مستند', 'یه سریال جدید', 'یه فیلم قدیمی'] },
    { id: 'p_go', ic: '📍', name: 'کجا بریم؟', items: ['کافه', 'پارک', 'سینما', 'پیاده‌روی کنار رودخونه', 'بستنی‌فروشی', 'کتاب‌فروشی', 'خونه بمونیم', 'یه جای جدید'] },
    { id: 'p_who', ic: '🧹', name: 'کی انجامش بده؟', items: ['عرشیا', 'یسنا'] },
    { id: 'p_yn', ic: '🎲', name: 'بله یا نه؟', items: ['بله ✅', 'نه ❌', 'شاید 🤔', 'بعداً بپرس 🕒'] },
    { id: 'p_gift', ic: '🎁', name: 'یه هدیهٔ کوچیک', items: ['یه نقاشی', 'یه آهنگ', 'یه نامه', 'یه بغل بزرگ', 'یه شکلات', 'یه عکس خاص', 'یه شعر', 'یه ماساژ'] }
  ];
  let custom = [], cur = PRE[0], loaded = false, missing = false, rot = 0, spinning = false, hist = [], elim = null;
  let cv, ctx, size = 340;
  const HK = 'wheel_hist_v1';
  const loadHist = () => { try { hist = JSON.parse(localStorage.getItem(HK) || '[]'); } catch (e) { hist = []; } };
  const saveHist = () => { try { localStorage.setItem(HK, JSON.stringify(hist.slice(0, 12))); } catch (e) {} };
  const all = () => PRE.concat(custom);
  const items = () => (elim || cur.items).filter(Boolean);
  const col = (i, n) => `hsl(${Math.round(i / n * 360 + 280) % 360},72%,${i % 2 ? 58 : 66}%)`;

  const CSS = `
.wl-wrap{display:flex;flex-direction:column;align-items:center;gap:14px}
.wl-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.wl-chip{border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;border-radius:999px;padding:7px 14px;font:inherit;font-size:.85rem;cursor:pointer}
.wl-chip:hover{background:rgba(212,165,255,.22)}.wl-chip.on{background:linear-gradient(135deg,#d4a5ff,#ff8fb8);color:#1b1026;font-weight:700;border-color:transparent}
.wl-stage{position:relative;width:min(92vw,400px);aspect-ratio:1;filter:drop-shadow(0 14px 30px rgba(0,0,0,.5))}
.wl-stage canvas{width:100%;height:100%;display:block}
.wl-ptr{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:30px solid #ffd45a;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6));z-index:3}
.wl-go{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;border:4px solid #fff;background:radial-gradient(circle at 35% 30%,#ffe9a8,#ff9ed2 70%);color:#3a1650;font:inherit;font-weight:800;font-size:1rem;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.55);z-index:4;transition:transform .15s}
.wl-go:hover:not(:disabled){transform:scale(1.08)}.wl-go:active:not(:disabled){transform:scale(.94)}.wl-go:disabled{opacity:.7;cursor:default}
.wl-res{min-height:64px;text-align:center;font-size:1.5rem;font-weight:800;padding:12px 22px;border-radius:20px;background:linear-gradient(135deg,rgba(255,212,90,.18),rgba(255,158,210,.18));border:1px solid rgba(255,212,90,.5);min-width:min(86vw,320px);animation:mgIn .35s ease}
.wl-res small{display:block;font-size:.78rem;font-weight:400;opacity:.7;margin-top:4px}
.wl-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.wl-ed{width:min(94vw,520px);padding:16px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(212,165,255,.25)}
.wl-ed input,.wl-ed textarea{width:100%;box-sizing:border-box;background:rgba(10,10,15,.55);color:inherit;border:1px solid rgba(212,165,255,.3);border-radius:12px;padding:9px 12px;font:inherit;margin-bottom:8px}.wl-ed textarea{min-height:130px;resize:vertical;line-height:1.8}
.wl-ed .row{display:flex;gap:8px;flex-wrap:wrap}.wl-hint{font-size:.76rem;opacity:.65;margin:-2px 0 8px}
.wl-hist{font-size:.82rem;opacity:.85;text-align:center;max-width:520px}.wl-hist span{display:inline-block;margin:3px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.08)}
`;
  function injectCss() { if (!document.getElementById('wlCss')) { const s = document.createElement('style'); s.id = 'wlCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------- صدا ---------- */
  let ac = null;
  function tick(f) { if (reduced()) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f || 900; g.gain.value = .0001; o.connect(g); g.connect(ac.destination); const t = ac.currentTime; g.gain.exponentialRampToValueAtTime(.12, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .05); o.start(t); o.stop(t + .06); } catch (e) {} }
  function fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tick(f), i * 110)); }

  /* ---------- رسم ---------- */
  function draw() {
    if (!cv) return; const n = items().length || 1, R = size / 2 - 6, s = Math.PI * 2 / n, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== size * dpr) { cv.width = size * dpr; cv.height = size * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size); ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(rot);
    const list = items(); if (!list.length) list.push('—');
    list.forEach((t, i) => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, i * s, (i + 1) * s); ctx.closePath(); ctx.fillStyle = col(i, list.length); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); const ang = i * s + s / 2; ctx.rotate(ang); const flip = Math.cos(ang + rot) < 0; if (flip) ctx.rotate(Math.PI); ctx.fillStyle = '#2a1245'; ctx.font = `700 ${Math.max(11, Math.min(18, 200 / Math.max(6, list.length) + 6))}px Vazirmatn,Tahoma,sans-serif`; ctx.textAlign = flip ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      const lab = t.length > 13 ? t.slice(0, 12) + '…' : t; ctx.fillText(lab, flip ? -(R - 16) : R - 16, 0); ctx.restore();
    });
    ctx.restore(); ctx.beginPath(); ctx.arc(size / 2, size / 2, R + 2, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; ctx.beginPath(); ctx.arc(size / 2 + Math.cos(a) * (R + 2), size / 2 + Math.sin(a) * (R + 2), 3.2, 0, 7); ctx.fillStyle = i % 2 ? '#ffd45a' : '#ff9ed2'; ctx.fill(); }
  }
  const idxAt = r => { const n = items().length, s = Math.PI * 2 / n; let a = (-Math.PI / 2 - r) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return Math.floor(a / s) % n; };

  function spin() {
    if (spinning || !items().length) return; if (items().length < 2) return toast('حداقل دو تا گزینه لازمه 🙂');
    spinning = true; const btn = document.getElementById('wlGo'); if (btn) btn.disabled = true; document.getElementById('wlRes').innerHTML = '🎡 ...';
    const start = rot, turns = 5 + Math.random() * 3, target = start + Math.PI * 2 * turns + Math.random() * Math.PI * 2, dur = reduced() ? 600 : 4800 + Math.random() * 1200, t0 = performance.now();
    let lastIdx = idxAt(start);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); rot = start + (target - start) * e; draw();
      const ix = idxAt(rot); if (ix !== lastIdx) { lastIdx = ix; tick(700 + 300 * (1 - k)); }
      if (k < 1) requestAnimationFrame(step); else done(idxAt(rot));
    };
    requestAnimationFrame(step);
  }
  function done(i) {
    spinning = false; const btn = document.getElementById('wlGo'); if (btn) btn.disabled = false; const t = items()[i]; fanfare();
    hist.unshift(cur.ic + ' ' + t); saveHist();
    document.getElementById('wlRes').innerHTML = `🎉 ${esc(t)}<small>نتیجهٔ چرخ «${esc(cur.name)}»</small>`;
    try { const st = document.getElementById('screen-wheel'); for (let k = 0; k < 24; k++) { const e = document.createElement('span'); e.className = 'mm-conf'; e.textContent = ['🎉', '✨', '💖', '⭐', '🎊'][k % 5]; e.style.left = Math.random() * 100 + '%'; e.style.position = 'fixed'; e.style.animationDuration = 2 + Math.random() * 2 + 's'; document.body.appendChild(e); setTimeout(() => e.remove(), 4200); } } catch (e) {}
    const out = document.getElementById('wlActs'); if (out) out.innerHTML = `<button class="wl-chip" onclick="Wheel.spin()">🔄 دوباره بچرخون</button><button class="wl-chip" onclick="Wheel.drop(${i})">🗑️ حذفش کن و دوباره</button>` + (elim ? '<button class="wl-chip" onclick="Wheel.reset()">♻️ برگردوندن همه</button>' : '');
    renderHist();
  }
  function renderHist() { const h = document.getElementById('wlHist'); if (h) h.innerHTML = hist.length ? 'نتیجه‌های قبلی: ' + hist.slice(0, 8).map(x => `<span>${esc(x)}</span>`).join('') : ''; }

  /* ---------- رابط ---------- */
  function render() {
    const box = document.getElementById('wheelBox'); if (!box) return; injectCss();
    const isCustom = cur.id.startsWith('c_');
    box.innerHTML = `<div class="wl-wrap"><div class="wl-chips">${all().map(w => `<button class="wl-chip${w.id === cur.id ? ' on' : ''}" onclick="Wheel.pick('${w.id}')">${esc(w.ic || '🎡')} ${esc(w.name)}</button>`).join('')}<button class="wl-chip" onclick="Wheel.newW()">➕ چرخ جدید</button></div>
      <div class="wl-stage"><div class="wl-ptr"></div><canvas id="wlCv"></canvas><button class="wl-go" id="wlGo" onclick="Wheel.spin()">بچرخ!</button></div>
      <div class="wl-res" id="wlRes">چرخ رو بچرخون و بذار سرنوشت تصمیم بگیره 💫</div><div class="wl-acts" id="wlActs"></div><div class="wl-hist" id="wlHist"></div>
      <div class="wl-ed"><input id="wlName" placeholder="اسم چرخ (مثلاً: شام امشب)" value="${esc(isCustom ? cur.name : '')}"><textarea id="wlItems" placeholder="هر گزینه توی یه خط...">${esc(cur.items.join('\n'))}</textarea><div class="wl-hint">${missing ? '⚠️ ذخیرهٔ مشترک در دسترس نیست؛ فقط روی همین دستگاه ذخیره می‌شه.' : 'چرخ‌هایی که ذخیره کنی برای هر دومون دیده می‌شه 💜'}</div>
      <div class="row"><button class="wl-chip on" onclick="Wheel.save()">💾 ${isCustom ? 'ذخیره تغییرات' : 'ذخیره به‌عنوان چرخ ما'}</button><button class="wl-chip" onclick="Wheel.apply()">👀 فقط امتحان کن</button>${isCustom ? '<button class="wl-chip" onclick="Wheel.remove()">🗑️ حذف این چرخ</button>' : ''}</div></div></div>`;
    cv = document.getElementById('wlCv'); ctx = cv.getContext('2d'); size = Math.min(400, Math.round(Math.min(window.innerWidth * .92, 400))); draw(); renderHist();
  }
  const readItems = () => document.getElementById('wlItems').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 40);
  async function load() {
    loadHist(); injectCss(); if (!loaded) { render(); }
    const r = await KV.list('x_wheel'); missing = !!r.error;
    let loc = []; try { loc = JSON.parse(localStorage.getItem('wheel_custom_v1') || '[]'); } catch (e) {}
    custom = (missing ? loc : r.rows).map(w => ({ id: 'c_' + w.id, rid: w.id, ic: '💜', name: w.name, items: w.items || [] }));
    loaded = true; if (!all().some(w => w.id === cur.id)) cur = PRE[0]; render();
  }
  function saveLocal() { try { localStorage.setItem('wheel_custom_v1', JSON.stringify(custom.map(w => ({ id: w.rid, name: w.name, items: w.items })))); } catch (e) {} }
  window.Wheel = {
    load, spin,
    pick(id) { if (spinning) return; cur = all().find(w => w.id === id) || PRE[0]; elim = null; rot = 0; render(); },
    newW() { if (spinning) return; cur = { id: 'n_new', ic: '✨', name: 'چرخ جدید', items: ['گزینهٔ ۱', 'گزینهٔ ۲', 'گزینهٔ ۳'] }; elim = null; rot = 0; render(); document.getElementById('wlName').focus(); },
    apply() { if (spinning) return; const it = readItems(); if (it.length < 2) return toast('حداقل دو تا گزینه بنویس'); elim = null; cur = Object.assign({}, cur, { items: it }); rot = 0; draw(); document.getElementById('wlRes').textContent = 'آماده‌ست! بچرخونش 🎡'; },
    async save() {
      const it = readItems(), name = document.getElementById('wlName').value.trim() || 'چرخ من'; if (it.length < 2) return toast('حداقل دو تا گزینه بنویس');
      const rid = cur.rid || KV.newId(); const w = { id: 'c_' + rid, rid, ic: '💜', name, items: it }; const i = custom.findIndex(x => x.rid === rid); if (i >= 0) custom[i] = w; else custom.push(w);
      saveLocal(); if (!missing) { const e = await KV.put('x_wheel', rid, { name, items: it, author: (window.myName && myName()) || '' }); if (e) { missing = true; toast('⚠️ ذخیرهٔ مشترک نشد؛ فقط روی همین دستگاه ذخیره شد'); } else toast('💾 چرخ ذخیره شد'); } else toast('💾 روی همین دستگاه ذخیره شد');
      cur = w; elim = null; rot = 0; render();
    },
    async remove() { if (!cur.rid || !confirm('این چرخ حذف بشه؟')) return; custom = custom.filter(x => x.rid !== cur.rid); saveLocal(); if (!missing) await KV.del('x_wheel', cur.rid); cur = PRE[0]; elim = null; render(); toast('🗑️ حذف شد'); },
    drop(i) { const l = items(); if (l.length <= 2) return toast('دیگه نمی‌شه حذف کرد'); elim = l.filter((_, k) => k !== i); rot = 0; draw(); document.getElementById('wlActs').innerHTML = '<button class="wl-chip" onclick="Wheel.spin()">🔄 بچرخون</button><button class="wl-chip" onclick="Wheel.reset()">♻️ برگردوندن همه</button>'; document.getElementById('wlRes').textContent = fa(elim.length) + ' گزینه باقی مونده'; },
    reset() { elim = null; rot = 0; draw(); document.getElementById('wlActs').innerHTML = ''; document.getElementById('wlRes').textContent = 'همه برگشتن ♻️'; },
    _state: () => ({ cur, custom, rot, items: items() })
  };
  window.addEventListener('resize', () => { if (cv && document.getElementById('screen-wheel') && document.getElementById('screen-wheel').classList.contains('active')) { size = Math.min(400, Math.round(Math.min(window.innerWidth * .92, 400))); draw(); } });
})();
