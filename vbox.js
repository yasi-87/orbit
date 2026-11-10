/* 🎙️ جعبهٔ صدا: پیام صوتی کوتاه برای هم بذاریم (مثل نامهٔ صوتی). ضبط، پیش‌شنیدن، موج صدا، سرعت پخش، «شنیده نشده» و ❤️ */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const me = () => (window.myName && myName()) || 'ناشناس';
  const same = (a, b) => Recur.sameName(a, b);
  const MOODS = [['💜', 'دلتنگی'], ['😂', 'خنده'], ['🌙', 'شب بخیر'], ['☀️', 'صبح بخیر'], ['🎵', 'آواز'], ['🤫', 'راز']];
  const MAX = 180, BARS = 42;
  let msgs = [], loaded = false, missing = false, R = null, cur = null, curId = null, busy = false;
  const fmt = s => { s = Math.max(0, Math.round(s)); return fa(String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')); };

  const CSS = `
.vb-rec{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px;border-radius:24px;background:radial-gradient(circle at 20% 0%,rgba(255,158,210,.2),transparent 55%),linear-gradient(160deg,#2b1d44,#1a1230);border:1px solid rgba(255,158,210,.35);margin-bottom:18px}
.vb-mic{width:92px;height:92px;border-radius:50%;border:4px solid #fff;background:radial-gradient(circle at 35% 30%,#ffb3d4,#ff5f9e 70%);font-size:2.2rem;cursor:pointer;box-shadow:0 8px 24px rgba(255,95,158,.5);transition:transform .15s;position:relative}
.vb-mic:hover{transform:scale(1.07)}.vb-mic.rec{animation:vbPulse 1.2s ease-in-out infinite;background:radial-gradient(circle at 35% 30%,#ff9e9e,#e63946 70%)}
@keyframes vbPulse{0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,.6)}50%{box-shadow:0 0 0 22px rgba(230,57,70,0)}}
.vb-time{font-size:1.5rem;font-variant-numeric:tabular-nums;direction:ltr}.vb-hint{font-size:.85rem;opacity:.75;text-align:center}
.vb-lv{display:flex;align-items:center;gap:3px;height:46px;direction:ltr}.vb-lv i{display:block;width:4px;border-radius:3px;background:linear-gradient(#ffd45a,#ff9ed2);height:4px;transition:height .08s}
.vb-pre{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%;max-width:460px}.vb-pre audio{width:100%}
.vb-pre input{width:100%;box-sizing:border-box;background:rgba(10,10,15,.55);color:inherit;border:1px solid rgba(212,165,255,.3);border-radius:12px;padding:9px 12px;font:inherit}
.vb-moods{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}.vb-moods button,.vb-b{border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.07);color:inherit;border-radius:999px;padding:7px 13px;font:inherit;font-size:.84rem;cursor:pointer}.vb-moods button.on,.vb-b.on{background:linear-gradient(135deg,#d4a5ff,#ff8fb8);color:#1b1026;font-weight:700;border-color:transparent}
.vb-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.vb-list{display:flex;flex-direction:column;gap:10px}
.vb-card{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(212,165,255,.22);position:relative}
.vb-card.new{border-color:#ffd45a;box-shadow:0 0 18px rgba(255,212,90,.25)}.vb-card.mine{background:rgba(212,165,255,.1)}
.vb-play{width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#d4a5ff,#ff8fb8);color:#1b1026;font-size:1.2rem;cursor:pointer;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.vb-mid{flex:1;min-width:0}.vb-top{display:flex;gap:8px;align-items:center;font-size:.85rem;margin-bottom:6px;flex-wrap:wrap}.vb-top b{font-size:.92rem}.vb-top small{opacity:.65}
.vb-wave{display:flex;align-items:center;gap:2px;height:34px;direction:ltr;cursor:pointer}.vb-wave i{flex:1;min-width:2px;border-radius:2px;background:rgba(255,255,255,.25)}.vb-wave i.p{background:linear-gradient(#ffd45a,#ff9ed2)}
.vb-meta{display:flex;gap:10px;align-items:center;font-size:.78rem;opacity:.8;margin-top:4px;direction:ltr}
.vb-act{display:flex;flex-direction:column;gap:6px}.vb-act button{border:0;background:rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:5px 9px;cursor:pointer;font-size:.85rem}.vb-act button.on{background:rgba(255,95,158,.35)}
.vb-badge{position:absolute;top:-8px;right:14px;background:#ffd45a;color:#3a2800;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:999px}
.vb-empty{text-align:center;padding:30px;opacity:.75}
`;
  function injectCss() { if (!document.getElementById('vbCss')) { const s = document.createElement('style'); s.id = 'vbCss'; s.textContent = CSS; document.head.appendChild(s); } }
  const mimeOpt = () => { const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']; return window.MediaRecorder ? c.find(m => MediaRecorder.isTypeSupported(m)) || '' : ''; };
  const extOf = m => /mp4/.test(m) ? 'm4a' : /ogg/.test(m) ? 'ogg' : 'webm';

  /* ---------- ضبط ---------- */
  async function start() {
    if (R) return stop(); if (busy) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('مرورگرت ضبط صدا رو پشتیبانی نمی‌کنه');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); } catch (e) { return toast('اجازهٔ میکروفون داده نشد 🎙️'); }
    const mime = mimeOpt(), rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [], peaks = [];
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 256; ac.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.frequencyBinCount);
    R = { rec, stream, ac, an, buf, chunks, peaks, t0: Date.now(), mime: rec.mimeType || mime || 'audio/webm', raf: 0, tm: 0 };
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { const r = R; cancelAnimationFrame(r.raf); clearInterval(r.tm); r.stream.getTracks().forEach(t => t.stop()); try { r.ac.close(); } catch (e) {} const dur = (Date.now() - r.t0) / 1000, blob = new Blob(r.chunks, { type: r.mime }); R = null; if (dur < 1) { toast('خیلی کوتاه بود، دوباره امتحان کن'); return render(); } cur = { blob, dur, wave: norm(r.peaks), mime: r.mime, url: URL.createObjectURL(blob), mood: '💜', title: '' }; render(); };
    rec.start(250); render();
    const lv = () => { if (!R) return; R.an.getByteTimeDomainData(R.buf); let m = 0; for (const v of R.buf) m = Math.max(m, Math.abs(v - 128)); const l = Math.min(1, m / 90); R.lvl = l; document.querySelectorAll('.vb-lv i').forEach((b, i) => { b.style.height = Math.max(4, l * 44 * (.5 + .5 * Math.sin(i * 1.3 + Date.now() / 120))) + 'px'; }); R.raf = requestAnimationFrame(lv); };
    R.raf = requestAnimationFrame(lv);
    R.tm = setInterval(() => { if (!R) return; R.peaks.push(R.lvl || 0); const s = (Date.now() - R.t0) / 1000, t = document.getElementById('vbTime'); if (t) t.textContent = fmt(s) + ' / ' + fmt(MAX); if (s >= MAX) stop(); }, 250);
  }
  function stop() { if (R && R.rec.state !== 'inactive') R.rec.stop(); }
  function norm(p) { if (!p.length) return Array(BARS).fill(.3); const out = [], step = p.length / BARS; for (let i = 0; i < BARS; i++) { let m = 0; for (let j = Math.floor(i * step); j < Math.max(Math.floor(i * step) + 1, Math.floor((i + 1) * step)); j++) m = Math.max(m, p[j] || 0); out.push(m); } const mx = Math.max(.05, ...out); return out.map(v => +(Math.max(.12, v / mx)).toFixed(2)); }

  async function send() {
    if (!cur || busy) return; busy = true; const b = document.getElementById('vbSend'); if (b) { b.disabled = true; b.textContent = '⏳ در حال ارسال...'; }
    try {
      const up = await uploadMediaFile(cur.blob, extOf(cur.mime), 'پیام صوتی'), id = KV.newId();
      const rec = { url: up.url, path: up.path, dur: Math.round(cur.dur), wave: cur.wave, mood: cur.mood, title: (document.getElementById('vbTitle') || {}).value || '', author: me(), ts: Date.now(), heard: {}, hearts: [] };
      const err = await KV.put('x_vbox', id, rec); if (err) throw err; rec.id = id; msgs.unshift(rec);
      try { notify('vbox', rec.title || 'پیام صوتی', id); } catch (e) {}
      URL.revokeObjectURL(cur.url); cur = null; toast('💌 پیام صوتی فرستاده شد');
    } catch (e) { toast('⚠️ ارسال نشد' + (e && e.message ? ': ' + String(e.message).slice(0, 70) : '')); }
    busy = false; render();
  }

  /* ---------- پخش ---------- */
  let audio = null, speed = 1;
  function play(id) {
    const m = msgs.find(x => x.id === id); if (!m) return;
    if (audio && curId === id) { audio.paused ? audio.play() : audio.pause(); return; }
    if (audio) { audio.pause(); } curId = id; audio = new Audio(m.url); audio.playbackRate = speed; audio.preload = 'auto';
    audio.ontimeupdate = () => paintProg(id); audio.onplay = audio.onpause = audio.onended = () => paintProg(id);
    audio.play().catch(() => toast('پخش نشد'));
    if (!same(m.author, me()) && !(m.heard && Object.keys(m.heard).some(k => Recur.sameName(k, me())))) { m.heard = m.heard || {}; m.heard[me()] = Date.now(); KV.put('x_vbox', id, m); setTimeout(render, 400); }
  }
  function paintProg(id) {
    const c = document.querySelector(`.vb-card[data-id="${id}"]`); if (!c || !audio || curId !== id) return; const k = audio.duration ? audio.currentTime / audio.duration : 0;
    c.querySelectorAll('.vb-wave i').forEach((b, i, a) => b.classList.toggle('p', i / a.length < k)); c.querySelector('.vb-play').textContent = audio.paused || audio.ended ? '▶' : '⏸'; const t = c.querySelector('.vb-cur'); if (t) t.textContent = fmt(audio.currentTime);
  }
  const ago = ts => { try { const w = Recur.epochToWall(ts); return Recur.fmtJalaliShort(w.iso || w.date || Recur.todayIso()) + ' · ' + fa(String(w.hh != null ? w.hh : new Date(ts).getHours()).padStart(2, '0') + ':' + String(w.mm != null ? w.mm : new Date(ts).getMinutes()).padStart(2, '0')); } catch (e) { return ''; } };

  /* ---------- رابط ---------- */
  function render() {
    const box = document.getElementById('vboxBox'); if (!box) return; injectCss();
    let top;
    if (R) top = `<div class="vb-rec"><div class="vb-lv">${Array.from({ length: 21 }, () => '<i></i>').join('')}</div><div class="vb-time" id="vbTime">${fmt(0)} / ${fmt(MAX)}</div><button class="vb-mic rec" onclick="VBox.toggle()" title="تموم">⏹️</button><div class="vb-hint">دارم ضبط می‌کنم... برای تموم‌کردن دوباره بزن</div></div>`;
    else if (cur) top = `<div class="vb-rec"><div class="vb-pre"><div class="vb-hint">🎧 پیش‌شنیدن (${fmt(cur.dur)})</div><audio controls src="${cur.url}"></audio><input id="vbTitle" placeholder="یه عنوان کوتاه (اختیاری)" maxlength="40" value="${esc(cur.title)}"><div class="vb-moods">${MOODS.map(m => `<button class="${m[0] === cur.mood ? 'on' : ''}" onclick="VBox.mood('${m[0]}')">${m[0]} ${m[1]}</button>`).join('')}</div><div class="vb-row"><button class="vb-b on" id="vbSend" onclick="VBox.send()">💌 بفرست</button><button class="vb-b" onclick="VBox.redo()">🔄 دوباره ضبط</button><button class="vb-b" onclick="VBox.discard()">🗑️ بیخیال</button></div></div></div>`;
    else top = `<div class="vb-rec"><button class="vb-mic" onclick="VBox.toggle()" title="ضبط">🎙️</button><div class="vb-hint">برای ضبط یه پیام صوتی بزن 💜<br>تا ${fa(MAX / 60)} دقیقه؛ اون یکی وقتی بیاد اینجا می‌شنوه</div></div>`;
    const list = msgs.length ? msgs.map(m => {
      const mine = same(m.author, me()), heard = m.heard && Object.keys(m.heard).some(k => Recur.sameName(k, me())), isNew = !mine && !heard, hearted = (m.hearts || []).some(n => Recur.sameName(n, me()));
      return `<div class="vb-card${isNew ? ' new' : ''}${mine ? ' mine' : ''}" data-id="${m.id}">${isNew ? '<span class="vb-badge">🎧 جدید</span>' : ''}<button class="vb-play" onclick="VBox.play('${m.id}')">▶</button><div class="vb-mid"><div class="vb-top"><span>${esc(m.mood || '💜')}</span><b>${esc(m.title || (mine ? 'پیام من' : 'پیام ' + (m.author || '')))}</b><small>${esc(m.author || '')} · ${ago(m.ts)}</small></div><div class="vb-wave" onclick="VBox.seek(event,'${m.id}')">${(m.wave || Array(BARS).fill(.4)).map(v => `<i style="height:${Math.round(8 + v * 26)}px"></i>`).join('')}</div><div class="vb-meta"><span class="vb-cur">${fmt(0)}</span><span>/ ${fmt(m.dur || 0)}</span>${(m.hearts || []).length ? `<span>❤️ ${fa(m.hearts.length)}</span>` : ''}${mine && m.heard && Object.keys(m.heard).length ? '<span>✓ شنیده شد</span>' : ''}</div></div><div class="vb-act"><button class="${hearted ? 'on' : ''}" onclick="VBox.heart('${m.id}')">❤️</button><button onclick="VBox.speed()" title="سرعت پخش">${speed}x</button>${mine ? `<button onclick="VBox.del('${m.id}')">🗑️</button>` : ''}</div></div>`;
    }).join('') : '<div class="vb-empty">هنوز پیامی نیست... اولین نامهٔ صوتی رو تو بفرست 🎙️💜</div>';
    box.innerHTML = (missing ? '<div class="vb-empty">⚠️ جعبهٔ صدا به جدول folder_items نیاز داره (SQL 27). بعد از اجراش دوباره بیا.</div>' : top + `<div class="vb-list">${list}</div>`);
    if (curId) paintProg(curId);
  }
  async function load() {
    injectCss(); render(); const r = await KV.list('x_vbox'); missing = !!r.error; msgs = r.rows.sort((a, b) => (b.ts || 0) - (a.ts || 0)); loaded = true; if (!R && !cur) render();
  }
  window.VBox = {
    load, toggle: start, send, play,
    mood(m) { if (cur) { cur.title = (document.getElementById('vbTitle') || {}).value || ''; cur.mood = m; render(); } },
    redo() { if (cur) { URL.revokeObjectURL(cur.url); cur = null; } start(); },
    discard() { if (cur) { URL.revokeObjectURL(cur.url); cur = null; } render(); },
    seek(e, id) { if (audio && curId === id && audio.duration) { const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration; } else play(id); },
    speed() { speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; if (audio) audio.playbackRate = speed; render(); },
    async heart(id) { const m = msgs.find(x => x.id === id); if (!m) return; m.hearts = m.hearts || []; const i = m.hearts.findIndex(n => Recur.sameName(n, me())); if (i >= 0) m.hearts.splice(i, 1); else m.hearts.push(me()); render(); await KV.put('x_vbox', id, m); },
    async del(id) { const m = msgs.find(x => x.id === id); if (!m || !confirm('این پیام صوتی حذف بشه؟')) return; if (audio && curId === id) { audio.pause(); audio = null; curId = null; } await KV.del('x_vbox', id); if (m.path) { try { dbClient.storage.from('songs').remove([m.path]); } catch (e) {} } msgs = msgs.filter(x => x.id !== id); render(); toast('🗑️ حذف شد'); },
    _state: () => ({ msgs, cur, R: !!R })
  };
})();
