/* 🖥️ اشتراک صفحه: یکی صفحهٔ (یا یک پنجره/تب) خودش رو شیر می‌کنه و اون یکی توی اتاق صحبت می‌بینه.
   WebRTC مستقیم بین دو دستگاه؛ سیگنال‌دهی از Supabase Realtime (بدون جدول و SQL).
   شیر کردن فقط از مرورگر لپ‌تاپ ممکنه (گوشی‌ها این قابلیت رو ندارن)؛ دیدنش روی همه‌چیز جواب می‌ده. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  const ICE = { iceCandidatePoolSize: 2, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }] };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const canShare = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  let ch = null, subscribed = false;
  let sharing = false, stream = null, viewers = {};            // سمت شیرکننده: id → { pc, name }
  let watching = null, wpc = null, wstream = null, wname = '', wstate = '', pendingIce = [], remoteSet = false;   // سمت بیننده
  let remoteLive = null;                                          // { id, name } کسی که الان شیر می‌کنه
  let tries = 0, retryT = null, connT = null, watchStart = 0, lastPair = '';
  const diag = { sent: {}, recv: {}, errs: [], log: [], lc: {}, rc: 0 };
  const lg = m => { const d = new Date(); diag.log.push(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0') + ' ' + m); if (diag.log.length > 14) diag.log.shift(); };
  const MAX_TRIES = 8;

  const send = p => { diag.sent[p.t] = (diag.sent[p.t] || 0) + 1; try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'ss', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  const toast2 = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const sd = d => ({ type: d.type, sdp: d.sdp });

  function join() {
    if (ch || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ch = dbClient.channel('screen-share', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'ss' }, m => recv(m && m.payload))
        .subscribe(s => { lg('کانال: ' + s); if (s === 'SUBSCRIBED') { subscribed = true; send({ t: 'hello' }); render(); } });
    } catch (e) { console.warn('screen off', e); ch = null; }
  }

  /* ---------- شیرکننده ---------- */
  async function start() {
    if (sharing) return;
    if (!canShare()) { toast2('⚠️ این دستگاه نمی‌تونه صفحه شیر کنه؛ از لپ‌تاپ امتحان کن (دیدنش روی گوشی هم جواب می‌ده)'); return; }
    join();
    try {
      const audio = !!($('ssAudio') && $('ssAudio').checked);
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 24, max: 30 } }, audio });
    } catch (e) { if (e && e.name !== 'NotAllowedError') toast2('⚠️ شروع نشد: ' + (e.message || e.name)); return; }
    sharing = true;
    try { stream.getVideoTracks()[0].contentHint = 'detail'; stream.getVideoTracks()[0].addEventListener('ended', stop); } catch (e) {}
    send({ t: 'live' }); toast2('🖥️ اشتراک صفحه شروع شد'); render();
  }
  function stop() {
    if (!sharing) return;
    sharing = false;
    try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    stream = null;
    Object.keys(viewers).forEach(k => { try { viewers[k].pc.close(); } catch (e) {} }); viewers = {};
    send({ t: 'stop' }); toast2('اشتراک صفحه تموم شد'); render();
  }
  async function serveViewer(vid, vname) {
    if (!sharing || !stream) return;
    if (viewers[vid]) { try { viewers[vid].pc.close(); } catch (e) {} }
    const pc = new RTCPeerConnection(ICE); viewers[vid] = { pc, name: vname };
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.onicecandidate = e => { if (e.candidate) { const t = e.candidate.type || (/ typ (\w+)/.exec(e.candidate.candidate || '') || [])[1] || '?'; diag.lc[t] = (diag.lc[t] || 0) + 1; } if (e.candidate) send({ t: 'ice', to: vid, c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    lg('بیننده‌ی جدید: ' + (vname || vid));
    pc.onicecandidateerror = e => { diag.errs.push((e.url || '') + ' ' + e.errorCode + ' ' + (e.errorText || '')); if (diag.errs.length > 6) diag.errs.shift(); };
    pc.onconnectionstatechange = () => { lg('بیننده ' + (vname || vid) + ': ' + pc.connectionState); if (['failed', 'closed'].includes(pc.connectionState)) { if (pc.connectionState === 'failed') toast2('⚠️ اتصال با ' + (vname || 'بیننده') + ' برقرار نشد (شبکه مانع شد)'); delete viewers[vid]; render(); } else render(); };
    try {
      // سقف کیفیت تا شبکه کم نیاره
      pc.getSenders().forEach(s => { if (s.track && s.track.kind === 'video') { const p = s.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}]; p.encodings[0].maxBitrate = 2500000; s.setParameters(p).catch(() => {}); } });
      const off = await pc.createOffer(); await pc.setLocalDescription(off);
      send({ t: 'offer', to: vid, sdp: sd(pc.localDescription) });
    } catch (e) { console.warn('offer', e); }
    render();
  }

  /* ---------- بیننده ---------- */
  function watch(sharerId, name, isRetry) {
    if (watching === sharerId && wpc && !isRetry) return;
    leaveWatch(true);
    if (!isRetry) { tries = 0; diag.lc = {}; diag.rc = 0; diag.errs = []; }
    clearTimeout(retryT); clearTimeout(connT); watchStart = Date.now();
    watching = sharerId; wname = name || ''; wstate = 'connecting'; remoteSet = false; pendingIce = [];
    lg((tries >= 3 && diag.lc.relay ? '[فقط از طریق رله] ' : '') + (isRetry ? 'تلاش دوباره ' + tries + ' ← ' : 'شروع دیدن ← ') + (name || sharerId));
    wpc = new RTCPeerConnection(tries >= 3 && diag.lc.relay ? Object.assign({}, ICE, { iceTransportPolicy: 'relay' }) : ICE); wstream = null; const me = wpc;
    wpc.ontrack = e => { wstream = e.streams[0] || new MediaStream([e.track]); lg('تصویر رسید'); attach(); };
    wpc.onicecandidate = e => { if (e.candidate) { const t = e.candidate.type || (/ typ (\w+)/.exec(e.candidate.candidate || '') || [])[1] || '?'; diag.lc[t] = (diag.lc[t] || 0) + 1; send({ t: 'ice', to: sharerId, c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); } };
    wpc.onicecandidateerror = e => { diag.errs.push((e.url || '') + ' ' + e.errorCode + ' ' + (e.errorText || '')); if (diag.errs.length > 6) diag.errs.shift(); };
    wpc.oniceconnectionstatechange = () => { if (me === wpc) lg('ice=' + me.iceConnectionState); };
    wpc.onconnectionstatechange = () => {
      if (me !== wpc) return; wstate = wpc.connectionState; lg('اتصال=' + wstate);
      if (wstate === 'connected') { tries = 0; clearTimeout(retryT); clearTimeout(connT); }
      else if (wstate === 'failed') scheduleRetry('failed');
      else if (wstate === 'disconnected') { clearTimeout(retryT); retryT = setTimeout(() => { if (wpc === me && wpc.connectionState !== 'connected') scheduleRetry('disconnected'); }, 5000); }
      render();
    };
    send({ t: 'join', to: sharerId });
    // اگه ۱۵ ثانیه وصل نشد، خودش دوباره تلاش می‌کنه
    connT = setTimeout(() => { if (wpc === me && wpc.connectionState !== 'connected') scheduleRetry('timeout'); }, 20000);
    render();
  }
  function scheduleRetry(why) {
    clearTimeout(retryT); clearTimeout(connT);
    const id = watching, name = wname; if (!id || !remoteLive || remoteLive.id !== id) return;
    if (tries >= MAX_TRIES) { wstate = 'failed'; lg('بعد از ' + tries + ' بار تلاش وصل نشد'); toast2('⚠️ اتصال اشتراک صفحه برقرار نشد؛ شاید شبکه اجازه نده. با دکمهٔ «تلاش دوباره» امتحان کن'); render(); return; }
    tries++; wstate = 'retrying'; lg('وصل نشد (' + why + ')؛ تلاش ' + tries + ' از ' + MAX_TRIES + ' تا ' + Math.min(2 + tries, 8) + ' ثانیه دیگه'); render();
    retryT = setTimeout(() => { if (watching === id && remoteLive && remoteLive.id === id) watch(id, name, true); }, Math.min(2 + tries, 8) * 1000);
  }
  function leaveWatch(silent) {
    if (wpc) { try { wpc.close(); } catch (e) {} }
    wpc = null; wstream = null; watching = null; wstate = ''; remoteSet = false; pendingIce = [];
    if (!silent) { document.body.classList.remove('ss-theater-on'); clearTimeout(retryT); clearTimeout(connT); tries = 0; send({ t: 'leave' }); render(); }
  }
  function attach() {
    const v = $('ssVideo'); if (!v || !wstream) return;
    if (v.srcObject !== wstream) { v.srcObject = wstream; }
    v.play().catch(() => {});
  }

  /* ---------- پیام‌ها ---------- */
  async function recv(p) {
    if (!p || p.from === ID) return;
    if (p.to && p.to !== ID) return;
    diag.recv[p.t] = (diag.recv[p.t] || 0) + 1; if (p.t === 'ice') diag.rc++;
    if (p.t === 'hello') { if (sharing) send({ t: 'live' }); return; }
    if (p.t === 'live') { remoteLive = { id: p.from, name: p.name }; toast2('🖥️ ' + (p.name || 'اون یکی') + ' داره صفحه‌اش رو شیر می‌کنه'); try { window.OMSound && OMSound.play('up'); } catch (e) {} watch(p.from, p.name); render(); return; }
    if (p.t === 'stop') { if (remoteLive && remoteLive.id === p.from) { remoteLive = null; if (watching === p.from) { leaveWatch(true); toast2('اشتراک صفحه تموم شد'); } render(); } return; }
    if (p.t === 'join') { serveViewer(p.from, p.name); return; }
    if (p.t === 'leave') { const v = viewers[p.from]; if (v) { try { v.pc.close(); } catch (e) {} delete viewers[p.from]; render(); } return; }
    if (p.t === 'offer' && wpc && watching === p.from) {
      try {
        await wpc.setRemoteDescription(p.sdp); remoteSet = true;
        for (const c of pendingIce) { try { await wpc.addIceCandidate(c); } catch (e) {} } pendingIce = [];
        const ans = await wpc.createAnswer(); await wpc.setLocalDescription(ans);
        send({ t: 'answer', to: p.from, sdp: sd(wpc.localDescription) });
      } catch (e) { console.warn('answer', e); diag.errs.push('answer: ' + (e && e.message || e)); }
      return;
    }
    if (p.t === 'answer') { const v = viewers[p.from]; if (v) { try { await v.pc.setRemoteDescription(p.sdp); v.ready = true; (v.pend || []).forEach(c => v.pc.addIceCandidate(c).catch(() => {})); v.pend = []; } catch (e) {} } return; }
    if (p.t === 'ice') {
      if (sharing && viewers[p.from]) { const v = viewers[p.from]; if (v.ready) v.pc.addIceCandidate(p.c).catch(() => {}); else (v.pend = v.pend || []).push(p.c); }
      else if (wpc && watching === p.from) { if (remoteSet) wpc.addIceCandidate(p.c).catch(() => {}); else pendingIce.push(p.c); }
    }
  }

  /* ---------- نمایش ---------- */
  const CSS = `
.vc-area-share{margin:0 !important;max-width:none !important}
@media (min-width:900px){.vc-area-share{grid-area:share}}
.ss-h{padding:10px 14px;border-bottom:1px solid rgba(212,165,255,.2);font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ss-h .sp{flex:1}
.ss-b{padding:12px;display:flex;flex-direction:column;gap:10px;align-items:center}
.ss-note{color:var(--muted,#aaa);font-size:.84rem;line-height:1.8;text-align:center}
.ss-video{width:100%;max-height:440px;object-fit:contain;background:#000;border-radius:12px;display:block}
.ss-video.ss-theater{position:fixed;z-index:110;top:0;left:0;right:0;bottom:0;width:100%;height:100%;max-height:none;border-radius:0}
body.ss-theater-on{overflow:hidden}body.ss-theater-on .ss-row{position:fixed;z-index:111;top:8px;left:8px;background:rgba(10,8,20,.72);padding:6px;border-radius:12px;backdrop-filter:blur(4px)}
body.ss-theater-on .ss-row [data-ss=retry],body.ss-theater-on .ss-row [data-ss=leave]{display:none}
.ss-tchat{display:none}body.ss-theater-on .ss-tchat{display:inline-block}
@media (min-width:900px){body.chat-open .ss-video.ss-theater{left:330px;width:calc(100vw - 330px)}body.ss-theater-on.chat-open .ss-row{left:338px}}
@media (max-width:899px){body.chat-open .ss-video.ss-theater{height:calc(100vh - min(72vh,540px) - 16px)}}
.ss-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center}
.ss-live{color:#ff8fa8;font-weight:700}
.ss-chk{display:flex;gap:6px;align-items:center;font-size:.84rem;color:var(--muted,#aaa)}`;
  function render() {
    const box = $('shareBox'); if (!box) return;
    if (!$('ssCss')) { const st = document.createElement('style'); st.id = 'ssCss'; st.textContent = CSS; document.head.appendChild(st); }
    const keepVideo = watching && $('ssVideo') && box.dataset.k === 'w' + watching;
    const nViewers = Object.keys(viewers).filter(k => viewers[k].pc.connectionState === 'connected').length;
    let html;
    if (sharing) {
      html = `<div class="ss-h">🖥️ اشتراک صفحه <span class="sp"></span><span class="ss-live">● در حال شیر</span></div>
        <div class="ss-b"><div class="ss-note">صفحه‌ات داره شیر می‌شه${Object.keys(viewers).length ? ' · بیننده‌ها: ' + Object.keys(viewers).map(k => esc(viewers[k].name || 'یکی')).join('، ') + (nViewers ? ' (وصل: ' + nViewers + ')' : ' (در حال وصل شدن…)') : ' · هنوز کسی وصل نشده'}.<br>اگه اسکرین شیر رو توی همین تب انتخاب کنی، یه آینهٔ بی‌نهایت می‌بینی 😄 بهتره پنجره یا تب دیگه‌ای رو انتخاب کنی.</div>
        <button type="button" class="btn" data-ss="stop">⏹ توقف اشتراک</button></div>`;
    } else if (watching) {
      if (keepVideo) { const st = $('ssState'); if (st) st.textContent = stateText(); return; }
      html = `<div class="ss-h">🖥️ صفحهٔ ${esc(wname || 'اون یکی')} <span class="sp"></span><span class="ss-note" id="ssState">${stateText()}</span></div>
        <div class="ss-b"><video class="ss-video" id="ssVideo" autoplay playsinline muted></video>
        <div class="ss-row"><button type="button" class="btn ghost" data-ss="unmute">🔊 صدا</button><button type="button" class="btn ghost" data-ss="full">⛶ تمام‌صفحه با چت</button><button type="button" class="btn ghost ss-tchat" data-ss="tchat">💬 چت</button><button type="button" class="btn ghost" data-ss="retry">🔄 تلاش دوباره</button><button type="button" class="btn ghost" data-ss="leave">✕ بستن</button></div></div>`;
      box.dataset.k = 'w' + watching; box.innerHTML = html; bind(); attach(); return;
    } else {
      html = `<div class="ss-h">🖥️ اشتراک صفحه</div>
        <div class="ss-b"><div class="ss-note">${remoteLive ? '🖥️ ' + esc(remoteLive.name || 'اون یکی') + ' داره صفحه‌اش رو شیر می‌کنه.' : 'صفحه، پنجره یا یک تب مرورگرت رو برای اون یکی شیر کن تا همزمان ببینید.'}${canShare() ? '' : '<br>⚠️ این دستگاه نمی‌تونه صفحه شیر کنه (گوشی‌ها این قابلیت رو ندارن)، ولی می‌تونی صفحهٔ اون یکی رو ببینی.'}</div>
        ${remoteLive ? '<button type="button" class="btn" data-ss="view">👀 دیدن صفحه‌اش</button>' : ''}
        ${canShare() ? '<label class="ss-chk"><input type="checkbox" id="ssAudio" /> صدای صفحه/تب هم شیر بشه</label><button type="button" class="btn" data-ss="start">🖥️ شروع اشتراک صفحه</button>' : ''}</div>`;
    }
    box.dataset.k = sharing ? 's' : ''; box.innerHTML = html; bind();
  }
  /* ⛶ تمام‌صفحه با چت: تصویر کل پنجره رو می‌گیره ولی چت کنارش می‌مونه (تمام‌صفحهٔ مرورگر چت رو قایم می‌کرد) */
  function theater(force) {
    const v = $('ssVideo'); if (!v) return; const on = force == null ? !v.classList.contains('ss-theater') : !!force;
    v.classList.toggle('ss-theater', on); document.body.classList.toggle('ss-theater-on', on);
    const b = document.querySelector('[data-ss=full]'); if (b) b.textContent = on ? '✕ خروج از تمام‌صفحه' : '⛶ تمام‌صفحه با چت';
    if (on) { try { if (!document.body.classList.contains('chat-open')) ChatDock.open(); } catch (e) {} }
  }
  document.addEventListener('keydown', e => { const v = $('ssVideo'); if (e.key === 'Escape' && v && v.classList.contains('ss-theater')) theater(false); });
  const stateText = () => wstate === 'connected' ? '🟢 وصل' : wstate === 'failed' ? '🔴 وصل نشد' : wstate === 'retrying' ? '🔄 تلاش دوباره (' + tries + ' از ' + MAX_TRIES + ')…' : '⏳ در حال وصل شدن…';
  function bind() {
    const box = $('shareBox'); if (!box) return;
    box.querySelectorAll('[data-ss]').forEach(b => b.onclick = () => {
      const a = b.dataset.ss, v = $('ssVideo');
      if (a === 'start') start(); else if (a === 'stop') stop();
      else if (a === 'view') { if (remoteLive) { const r = remoteLive; watching = null; watch(r.id, r.name); } }
      else if (a === 'leave') leaveWatch(false);
      else if (a === 'retry') { if (watching) { const id = watching, n = wname; tries = 0; watch(id, n, true); } else if (remoteLive) { watch(remoteLive.id, remoteLive.name); } }
      else if (a === 'unmute' && v) { v.muted = !v.muted; b.textContent = v.muted ? '🔊 صدا' : '🔇 بی‌صدا'; }
      else if (a === 'full' && v) theater();
      else if (a === 'tchat') { try { document.body.classList.contains('chat-open') ? ChatDock.close() : ChatDock.open(); } catch (e) {} }
    });
  }

  /* ---------- اطلاعات فنی (مثل بخش تماس) ---------- */
  async function pairInfo(pc) {
    try { const st = await pc.getStats(); let sel = null; const cands = {}; st.forEach(r => { if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) sel = r; if (r.type === 'local-candidate' || r.type === 'remote-candidate') cands[r.id] = r; });
      if (!sel) return 'مسیر انتخاب‌شده: هنوز نه'; const l = cands[sel.localCandidateId] || {}, r = cands[sel.remoteCandidateId] || {};
      return 'مسیر: ' + (l.candidateType || '?') + ' ← ' + (r.candidateType || '?') + ' (' + (l.protocol || '') + ')' + (sel.currentRoundTripTime != null ? ' | تأخیر ' + Math.round(sel.currentRoundTripTime * 1000) + 'ms' : '');
    } catch (e) { return ''; }
  }
  function diagText() {
    const L = [];
    L.push('کانال: ' + (subscribed ? 'وصل' : 'وصل نیست') + ' | شیر می‌کنم: ' + (sharing ? 'بله' : 'نه') + ' | کسی شیر می‌کنه: ' + (remoteLive ? remoteLive.name || 'بله' : 'نه') + ' | دارم می‌بینم: ' + (watching ? 'بله (' + (wstate || '-') + ')' : 'نه') + ' | تلاش دوباره: ' + tries + '/' + MAX_TRIES);
    L.push('پیام‌های سیگنال فرستاده: ' + JSON.stringify(diag.sent) + ' | گرفته: ' + JSON.stringify(diag.recv));
    if (wpc) L.push('— دیدن: اتصال=' + wpc.connectionState + ' ice=' + wpc.iceConnectionState + ' جمع‌آوری=' + wpc.iceGatheringState + ' signaling=' + wpc.signalingState + ' | کاندیدهای من ' + JSON.stringify(diag.lc) + ' | کاندیدهای دریافتی ' + diag.rc + ' | تصویر: ' + (wstream ? 'رسیده' : 'نرسیده') + ' | ' + (lastPair || '') + ' | ' + Math.round((Date.now() - watchStart) / 1000) + ' ثانیه از شروع');
    Object.keys(viewers).forEach(k => { const pc = viewers[k].pc; L.push('— بیننده ' + (viewers[k].name || k) + ': اتصال=' + pc.connectionState + ' ice=' + pc.iceConnectionState + ' signaling=' + pc.signalingState); });
    if (diag.errs.length) L.push('خطاهای ICE: ' + diag.errs.join(' ; '));
    if (diag.log.length) L.push('رویدادها:\n  ' + diag.log.join('\n  '));
    L.push('مرورگر: ' + (navigator.userAgent || '').slice(0, 90));
    return L.join('\n');
  }
  async function tickDiag() {
    const box = $('ssDiagBox'); if (!box || !box.open) return;
    if (wpc) lastPair = await pairInfo(wpc); const d = $('ssDiag'); if (d) d.textContent = diagText();
  }
  setInterval(tickDiag, 1000);
  function load() { join(); render(); }
  function init() { setTimeout(join, 3000); }
  window.Screen2 = { load, start, stop, init, _diag: diagText, _state: () => ({ sharing, watching, wstate, viewers: Object.keys(viewers).map(k => [k, viewers[k].pc.connectionState]), hasStream: !!wstream }), _id: ID };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
