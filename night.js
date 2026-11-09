/* 🌙 حالت شب بخیر: آسمون پرستاره، تنفس آروم، صداهای آرامش‌بخش (باران، دریا، آتیش، باد، جیرجیرک، نویز) با تایمر خواب و محو شدن آروم صدا */
(function () {
  'use strict';
  const fa = n => Recur.toFa(n);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SOUNDS = [['rain', '🌧️', 'باران'], ['sea', '🌊', 'دریا'], ['fire', '🔥', 'آتیش'], ['wind', '🌬️', 'باد'], ['cricket', '🦗', 'جیرجیرک'], ['brown', '🤎', 'نویز آروم']];
  const TIMERS = [15, 30, 60, 90, 0];
  let ac = null, master = null, active = {}, vol = .6, timer = 0, endAt = 0, tId = 0, fadeId = 0, on = false, raf = 0, stars = [], cv, ctx, W = 0, H = 0, focus = false, bTick = 0;

  const CSS = `
.nt-wrap{position:relative;min-height:calc(100vh - 220px);border-radius:26px;overflow:hidden;background:linear-gradient(180deg,#05060f,#0d1030 55%,#1b1040);border:1px solid rgba(160,170,255,.25);padding:24px 16px 28px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;color:#e9ecff}
.nt-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.nt-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}
.nt-moon{font-size:3.4rem;filter:drop-shadow(0 0 26px rgba(200,215,255,.8));animation:ntFloat 7s ease-in-out infinite}@keyframes ntFloat{50%{transform:translateY(-8px)}}
.nt-clock{font-size:2.4rem;font-weight:300;letter-spacing:3px;direction:ltr;font-variant-numeric:tabular-nums}.nt-sub{opacity:.75;font-size:.95rem;margin-top:-8px}
.nt-breath{position:relative;width:150px;height:150px;display:flex;align-items:center;justify-content:center}
.nt-breath i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(170,180,255,.5),rgba(120,100,230,.12) 65%,transparent 72%);animation:ntBr 10s ease-in-out infinite}
.nt-breath span{position:relative;font-size:.95rem}
@keyframes ntBr{0%,100%{transform:scale(.55);opacity:.5}40%{transform:scale(1);opacity:1}60%{transform:scale(1);opacity:1}}
.nt-sec{font-size:.8rem;opacity:.7;margin-bottom:6px}.nt-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.nt-chip{border:1px solid rgba(170,180,255,.35);background:rgba(255,255,255,.06);color:inherit;border-radius:999px;padding:8px 15px;font:inherit;font-size:.88rem;cursor:pointer;transition:.15s}.nt-chip:hover{background:rgba(170,180,255,.22)}
.nt-chip.on{background:linear-gradient(135deg,#8f9bff,#c99bff);color:#10102a;font-weight:700;border-color:transparent;box-shadow:0 0 18px rgba(150,150,255,.55)}
.nt-vol{width:min(280px,80%);accent-color:#aab4ff}
.nt-go{border:0;border-radius:999px;padding:14px 34px;font:inherit;font-size:1.1rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,#aab4ff,#ff9ed2);color:#1b1040;box-shadow:0 10px 30px rgba(140,130,255,.5);transition:transform .15s}.nt-go:hover{transform:scale(1.05)}
.nt-left{font-size:1.1rem;color:#ffd45a;direction:ltr;min-height:1.4em}
body.night-focus .nav-bar,body.night-focus .topbar,body.night-focus #chatLauncher,body.night-focus .music-player,body.night-focus .mg-top,body.night-focus .mg-bee,body.night-focus .mg-cv,body.night-focus .chapters-header{display:none!important}
body.night-focus #screen-night{padding-top:0}body.night-focus .nt-wrap{min-height:100vh;border-radius:0;border:0;position:fixed;inset:0;z-index:9000;overflow:auto}
`;
  function injectCss() { if (!document.getElementById('ntCss')) { const s = document.createElement('style'); s.id = 'ntCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------- صدا (ساخته‌شده با WebAudio، بدون فایل) ---------- */
  function ctxA() { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; }
  function noiseBuf(kind) {
    const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function src(kind) { const s = ac.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true; return s; }
  const makers = {
    rain() { const n = src('white'), hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 900; lp.type = 'lowpass'; lp.frequency.value = 7500; g.gain.value = .32; n.connect(hp); hp.connect(lp); lp.connect(g); n.start(); return { out: g, stop() { try { n.stop(); } catch (e) {} } }; },
    sea() { const n = src('brown'), lp = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 650; g.gain.value = .5; lfo.frequency.value = .11; lg.gain.value = .35; lfo.connect(lg); lg.connect(g.gain); n.connect(lp); lp.connect(g); n.start(); lfo.start(); return { out: g, stop() { try { n.stop(); lfo.stop(); } catch (e) {} } }; },
    fire() { const n = src('brown'), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.value = 420; g.gain.value = .55; n.connect(lp); lp.connect(g); n.start(); const out = ac.createGain(); g.connect(out); let alive = true;
      const crackle = () => { if (!alive) return; try { const b = ac.createBufferSource(), bb = ac.createBuffer(1, 800, ac.sampleRate), d = bb.getChannelData(0); for (let i = 0; i < 800; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / 800, 3); b.buffer = bb; const f = ac.createBiquadFilter(), cg = ac.createGain(); f.type = 'highpass'; f.frequency.value = 1500 + Math.random() * 2000; cg.gain.value = .2 + Math.random() * .5; b.connect(f); f.connect(cg); cg.connect(out); b.start(); } catch (e) {} setTimeout(crackle, 40 + Math.random() * 320); };
      crackle(); return { out, stop() { alive = false; try { n.stop(); } catch (e) {} } }; },
    wind() { const n = src('white'), bp = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = 500; g.gain.value = .5; lfo.frequency.value = .07; lg.gain.value = 300; lfo.connect(lg); lg.connect(bp.frequency); n.connect(bp); bp.connect(g); n.start(); lfo.start(); return { out: g, stop() { try { n.stop(); lfo.stop(); } catch (e) {} } }; },
    cricket() { const out = ac.createGain(); out.gain.value = .5; const oscs = []; [4200, 4650].forEach((f, k) => { const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(); o.frequency.value = f; g.gain.value = 0; lfo.type = 'square'; lfo.frequency.value = 6 + k * 1.7; lg.gain.value = .05; lfo.connect(lg); lg.connect(g.gain); const gate = ac.createGain(); gate.gain.value = 1; o.connect(g); g.connect(out); o.start(); lfo.start(); oscs.push(o, lfo); }); const slow = ac.createOscillator(), sg = ac.createGain(); slow.frequency.value = .3; sg.gain.value = .25; slow.connect(sg); sg.connect(out.gain); slow.start(); oscs.push(slow); return { out, stop() { oscs.forEach(o => { try { o.stop(); } catch (e) {} }); } }; },
    brown() { const n = src('brown'), g = ac.createGain(); g.gain.value = .6; n.connect(g); n.start(); return { out: g, stop() { try { n.stop(); } catch (e) {} } }; }
  };
  function toggleSound(k) {
    ctxA();
    if (active[k]) { const a = active[k]; a.gain.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => a.node.stop(), 900); delete active[k]; }
    else { const node = makers[k](), gain = ac.createGain(); gain.gain.value = 0; node.out.connect(gain); gain.connect(master); gain.gain.setTargetAtTime(1, ac.currentTime, .6); active[k] = { node, gain }; }
    paintChips();
  }
  function stopAll(fast) { Object.keys(active).forEach(k => { const a = active[k]; try { a.gain.gain.setTargetAtTime(0, ac.currentTime, fast ? .05 : .3); } catch (e) {} setTimeout(() => { try { a.node.stop(); } catch (e) {} }, fast ? 300 : 900); delete active[k]; }); paintChips(); }
  function setVol(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ac.currentTime, .1); }

  /* ---------- تایمر ---------- */
  function setTimer(min) {
    timer = min; clearInterval(tId); clearInterval(fadeId); if (master) master.gain.setTargetAtTime(vol, ac.currentTime, .1);
    if (min) { endAt = Date.now() + min * 60000; tId = setInterval(tickT, 1000); } else endAt = 0;
    paintChips(); tickT();
  }
  function tickT() {
    const l = document.getElementById('ntLeft'); if (!l) return;
    if (!endAt) { l.textContent = timer === 0 && Object.keys(active).length ? 'بدون تایمر' : ''; return; }
    const left = Math.max(0, endAt - Date.now()), m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000); l.textContent = '⏳ ' + fa(String(m).padStart(2, '0')) + ':' + fa(String(s).padStart(2, '0')) + ' تا خاموشی';
    if (left <= 20000 && master && !fadeId) { const t0 = Date.now(); fadeId = setInterval(() => { const k = Math.max(0, 1 - (Date.now() - t0) / Math.max(1000, left)); master.gain.value = vol * k; if (k <= 0) { clearInterval(fadeId); fadeId = 0; finish(); } }, 200); }
  }
  function finish() { clearInterval(tId); endAt = 0; stopAll(true); if (master) master.gain.value = vol; const l = document.getElementById('ntLeft'); if (l) l.textContent = '🌙 شب بخیر... خوب بخوابی'; timer = 0; paintChips(); }

  /* ---------- ظاهر ---------- */
  function paintChips() {
    document.querySelectorAll('#ntSounds .nt-chip').forEach(b => b.classList.toggle('on', !!active[b.dataset.k]));
    document.querySelectorAll('#ntTimers .nt-chip').forEach(b => b.classList.toggle('on', +b.dataset.m === timer));
    const f = document.getElementById('ntFocus'); if (f) f.textContent = focus ? '🔆 خروج از حالت شب' : '🌑 حالت تاریک و آروم';
  }
  function resize() { if (!cv) return; const r = cv.parentNode.getBoundingClientRect(); W = cv.width = Math.max(1, r.width); H = cv.height = Math.max(1, r.height); stars = Array.from({ length: Math.min(160, Math.round(W * H / 5000)) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, ph: Math.random() * 6.3, sp: .5 + Math.random() * 1.5 })); }
  function frame(now) {
    raf = requestAnimationFrame(frame); const el = document.getElementById('screen-night'); if (!el || !el.classList.contains('active') || document.hidden) return;
    if (!ctx || !cv || !cv.isConnected) return; ctx.clearRect(0, 0, W, H); const t = now / 1000;
    stars.forEach(s => { ctx.globalAlpha = reduced() ? .7 : .35 + .65 * (.5 + .5 * Math.sin(t * s.sp + s.ph)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill(); });
    if (!reduced() && Math.floor(t * .35) !== bTick) { bTick = Math.floor(t * .35); if (Math.random() < .5) shoot(); }
    ctx.globalAlpha = 1; drawShoot(now);
    const c = document.getElementById('ntClock'); if (c) { const d = new Date(); c.textContent = fa(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')); }
  }
  let sh = null;
  function shoot() { sh = { x: Math.random() * W * .7 + W * .2, y: Math.random() * H * .35, t0: performance.now() }; }
  function drawShoot(now) { if (!sh) return; const k = (now - sh.t0) / 900; if (k > 1) { sh = null; return; } const x = sh.x - k * 160, y = sh.y + k * 90; const g = ctx.createLinearGradient(x, y, x + 70, y - 40); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y - 40); ctx.stroke(); ctx.globalAlpha = 1; }
  function load() {
    const box = document.getElementById('nightBox'); if (!box) return; injectCss();
    if (!box.firstChild) {
      box.innerHTML = `<div class="nt-wrap"><canvas class="nt-cv" id="ntCv"></canvas><div class="nt-in"><div class="nt-moon">🌙</div><div class="nt-clock" id="ntClock"></div><div class="nt-sub" id="ntSub">وقت استراحته... نفس‌های آروم بکش 💜</div>
      <div class="nt-breath"><i></i><span>نفس بکش... و بده...</span></div>
      <div><div class="nt-sec">صداهای آرامش‌بخش (چندتاشو با هم قاطی کن)</div><div class="nt-row" id="ntSounds">${SOUNDS.map(s => `<button class="nt-chip" data-k="${s[0]}">${s[1]} ${s[2]}</button>`).join('')}</div></div>
      <div><div class="nt-sec">بلندی صدا</div><input class="nt-vol" id="ntVol" type="range" min="5" max="100" value="${Math.round(vol * 100)}"></div>
      <div><div class="nt-sec">تایمر خواب (آروم‌آروم صدا کم می‌شه)</div><div class="nt-row" id="ntTimers">${TIMERS.map(m => `<button class="nt-chip" data-m="${m}">${m ? fa(m) + ' دقیقه' : '♾️ بدون تایمر'}</button>`).join('')}</div></div>
      <div class="nt-left" id="ntLeft"></div>
      <div class="nt-row"><button class="nt-go" id="ntFocus"></button><button class="nt-chip" id="ntSay">💌 شب بخیر بگو</button><button class="nt-chip" id="ntStop">⏹️ خاموش کن</button></div></div></div>`;
      box.querySelector('#ntSounds').onclick = e => { const b = e.target.closest('[data-k]'); if (b) toggleSound(b.dataset.k); };
      box.querySelector('#ntTimers').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { ctxA(); setTimer(+b.dataset.m); } };
      box.querySelector('#ntVol').oninput = e => setVol(e.target.value / 100);
      box.querySelector('#ntFocus').onclick = () => { focus = !focus; document.body.classList.toggle('night-focus', focus); paintChips(); window.scrollTo(0, 0); setTimeout(resize, 50); };
      box.querySelector('#ntStop').onclick = () => { stopAll(); clearInterval(tId); clearInterval(fadeId); fadeId = 0; endAt = 0; timer = 0; if (master) master.gain.value = vol; paintChips(); tickT(); };
      box.querySelector('#ntSay').onclick = () => { const n = (window.myName && myName()) || ''; try { notify('night', 'شب بخیر 🌙', null); } catch (e) {} const s = document.getElementById('ntSub'); s.textContent = '💌 شب بخیرت رسید! خوابای قشنگ ببینی ' + (n ? n + ' ' : '') + '💜'; toast('💌 پیام شب بخیر فرستاده شد'); };
      cv = box.querySelector('#ntCv'); ctx = cv.getContext('2d'); addEventListener('resize', resize);
    }
    setTimeout(resize, 30); paintChips(); if (!raf) raf = requestAnimationFrame(frame);
  }
  function leave() { if (focus) { focus = false; document.body.classList.remove('night-focus'); } }
  window.Night = { load, leave, _active: () => Object.keys(active), _state: () => ({ timer, endAt, focus }) };
})();
