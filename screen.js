/* 🖥️ اشتراک صفحه: یکی صفحهٔ (یا یک پنجره/تب) خودش رو شیر می‌کنه و اون یکی توی اتاق صحبت می‌بینه.
   WebRTC مستقیم بین دو دستگاه؛ سیگنال‌دهی از Supabase Realtime (بدون جدول و SQL).
   شیر کردن فقط از مرورگر لپ‌تاپ ممکنه (گوشی‌ها این قابلیت رو ندارن)؛ دیدنش روی همه‌چیز جواب می‌ده. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  const ICE = { iceCandidatePoolSize: 2, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const canShare = () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  let ch = null, subscribed = false;
  let sharing = false, stream = null, viewers = {};            // سمت شیرکننده: id → { pc, name }
  let watching = null, wpc = null, wstream = null, wname = '', wstate = '', pendingIce = [], remoteSet = false;   // سمت بیننده
  let remoteLive = null;                                          // { id, name } کسی که الان شیر می‌کنه

  const send = p => { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'ss', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  const toast2 = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const sd = d => ({ type: d.type, sdp: d.sdp });

  function join() {
    if (ch || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ch = dbClient.channel('screen-share', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'ss' }, m => recv(m && m.payload))
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; send({ t: 'hello' }); render(); } });
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
    pc.onicecandidate = e => { if (e.candidate) send({ t: 'ice', to: vid, c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) { if (pc.connectionState === 'failed') toast2('⚠️ اتصال با ' + (vname || 'بیننده') + ' برقرار نشد (شبکه مانع شد)'); delete viewers[vid]; render(); } else render(); };
    try {
      // سقف کیفیت تا شبکه کم نیاره
      pc.getSenders().forEach(s => { if (s.track && s.track.kind === 'video') { const p = s.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}]; p.encodings[0].maxBitrate = 2500000; s.setParameters(p).catch(() => {}); } });
      const off = await pc.createOffer(); await pc.setLocalDescription(off);
      send({ t: 'offer', to: vid, sdp: sd(pc.localDescription) });
    } catch (e) { console.warn('offer', e); }
    render();
  }

  /* ---------- بیننده ---------- */
  function watch(sharerId, name) {
    if (watching === sharerId && wpc) return;
    leaveWatch(true);
    watching = sharerId; wname = name || ''; wstate = 'connecting'; remoteSet = false; pendingIce = [];
    wpc = new RTCPeerConnection(ICE); wstream = null;
    wpc.ontrack = e => { wstream = e.streams[0] || new MediaStream([e.track]); attach(); };
    wpc.onicecandidate = e => { if (e.candidate) send({ t: 'ice', to: sharerId, c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    wpc.onconnectionstatechange = () => { wstate = wpc ? wpc.connectionState : ''; if (wstate === 'failed') toast2('⚠️ اتصال برقرار نشد؛ شاید شبکه اجازه نده. دوباره امتحان کن'); render(); };
    send({ t: 'join', to: sharerId });
    render();
  }
  function leaveWatch(silent) {
    if (wpc) { try { wpc.close(); } catch (e) {} }
    wpc = null; wstream = null; watching = null; wstate = ''; remoteSet = false; pendingIce = [];
    if (!silent) { send({ t: 'leave' }); render(); }
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
      } catch (e) { console.warn('answer', e); }
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
.ss-video{width:100%;max-height:520px;background:#000;border-radius:12px;display:block}
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
        <div class="ss-row"><button type="button" class="btn ghost" data-ss="unmute">🔊 صدا</button><button type="button" class="btn ghost" data-ss="full">⛶ تمام‌صفحه</button><button type="button" class="btn ghost" data-ss="leave">✕ بستن</button></div></div>`;
      box.dataset.k = 'w' + watching; box.innerHTML = html; bind(); attach(); return;
    } else {
      html = `<div class="ss-h">🖥️ اشتراک صفحه</div>
        <div class="ss-b"><div class="ss-note">${remoteLive ? '🖥️ ' + esc(remoteLive.name || 'اون یکی') + ' داره صفحه‌اش رو شیر می‌کنه.' : 'صفحه، پنجره یا یک تب مرورگرت رو برای اون یکی شیر کن تا همزمان ببینید.'}${canShare() ? '' : '<br>⚠️ این دستگاه نمی‌تونه صفحه شیر کنه (گوشی‌ها این قابلیت رو ندارن)، ولی می‌تونی صفحهٔ اون یکی رو ببینی.'}</div>
        ${remoteLive ? '<button type="button" class="btn" data-ss="view">👀 دیدن صفحه‌اش</button>' : ''}
        ${canShare() ? '<label class="ss-chk"><input type="checkbox" id="ssAudio" /> صدای صفحه/تب هم شیر بشه</label><button type="button" class="btn" data-ss="start">🖥️ شروع اشتراک صفحه</button>' : ''}</div>`;
    }
    box.dataset.k = sharing ? 's' : ''; box.innerHTML = html; bind();
  }
  const stateText = () => wstate === 'connected' ? '🟢 وصل' : wstate === 'failed' ? '🔴 وصل نشد' : '⏳ در حال وصل شدن…';
  function bind() {
    const box = $('shareBox'); if (!box) return;
    box.querySelectorAll('[data-ss]').forEach(b => b.onclick = () => {
      const a = b.dataset.ss, v = $('ssVideo');
      if (a === 'start') start(); else if (a === 'stop') stop();
      else if (a === 'view') { if (remoteLive) { const r = remoteLive; watching = null; watch(r.id, r.name); } }
      else if (a === 'leave') leaveWatch(false);
      else if (a === 'unmute' && v) { v.muted = !v.muted; b.textContent = v.muted ? '🔊 صدا' : '🔇 بی‌صدا'; }
      else if (a === 'full' && v) { try { (v.requestFullscreen || v.webkitRequestFullscreen).call(v); } catch (e) {} }
    });
  }
  function load() { join(); render(); }
  function init() { setTimeout(join, 3000); }
  window.Screen2 = { load, start, stop, init, _state: () => ({ sharing, watching, wstate, viewers: Object.keys(viewers).map(k => [k, viewers[k].pc.connectionState]), hasStream: !!wstream }), _id: ID };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
