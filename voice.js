/* 🎙️ اتاق صحبت (مثل دیسکورد): تماس صوتی بین ما دو نفر.
   صدا مستقیم بین دو دستگاه (WebRTC) می‌ره؛ سیگنال‌دهی با Supabase Realtime (broadcast + presence)
   و هیچ جدول یا SQL جدیدی لازم نیست. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  let ch = null, subscribed = false, joined = false, pc = null, local = null, remoteStream = null, peerId = '', peerName = '';
  let lastHtml = '', micOn = true, deaf = false, t0 = 0, tickT = null, actx = null, speakT = null, lastNotify = 0, state = 'idle', pending = [], remoteSet = false;
  const $ = id => document.getElementById(id);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'من';
  const say = m => { if (typeof toast === 'function') toast(m); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- رابط ---------- */
  function others() {
    let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    const r = []; Object.keys(st).forEach(k => { if (k !== ID) (st[k] || []).forEach(m => r.push({ id: k, name: (m && m.name) || 'اون یکی' })); });
    return r;
  }
  function render() {
    const box = $('voiceBox'); if (!box) return;
    const o = ch && subscribed ? others() : [];
    const mm = Math.floor((Date.now() - t0) / 60000), ss = Math.floor((Date.now() - t0) / 1000) % 60;
    const dur = joined && t0 ? String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') : '';
    const stTxt = !joined ? (o.length ? '💞 ' + esc(o[0].name) + ' توی اتاقه؛ بیا تو!' : 'اتاق خالیه') :
      state === 'connected' ? '🟢 وصلید ' + dur : state === 'failed' ? '🔴 اتصال برقرار نشد (شبکه جلوی ارتباط مستقیم رو گرفته)' :
      o.length ? '⏳ در حال وصل شدن…' : '⏳ منتظر اون یکی هستی…';
    const tile = (n, me, speaking, muted) => `<div class="vc-tile${speaking ? ' speak' : ''}${muted ? ' muted' : ''}" data-who="${me ? 'me' : 'peer'}"><div class="vc-av">${esc((n || '?').trim().slice(0, 1))}</div><div class="vc-nm">${esc(n)}${muted ? ' 🔇' : ''}</div></div>`;
    const html = `<div class="vc-room"><div class="vc-st" id="vcSt">${stTxt}</div>
      <div class="vc-tiles">${joined ? tile(nm(), true, false, !micOn) : ''}${(joined ? o : o).map(x => tile(x.name, false, false, false)).join('')}${!joined && !o.length ? '<div class="vc-empty">هنوز کسی توی اتاق نیست 🌙</div>' : ''}</div>
      <div class="vc-ctl">${joined
        ? `<button class="btn ${micOn ? '' : 'ghost'}" data-vc="mic" type="button">${micOn ? '🎙️ میکروفون روشنه' : '🔇 میکروفون خاموشه'}</button>
           <button class="btn ghost" data-vc="deaf" type="button">${deaf ? '🔈 صدا رو باز کن' : '🔊 قطع صدای طرف مقابل'}</button>
           <button class="btn danger" data-vc="leave" type="button">📴 خروج از اتاق</button>`
        : `<button class="btn" data-vc="join" type="button">🎙️ ورود به اتاق صحبت</button>`}</div>
      <p class="vc-note">برای صحبت، مرورگر اجازهٔ میکروفون می‌خواد. بهتره هر دو هدفون بزنید تا صدا برگشت نخوره.</p></div>`;
    if (html !== lastHtml) { lastHtml = html; box.innerHTML = html; }
    const a = $('vcAudio'); if (a && remoteStream) { a.srcObject = remoteStream; a.muted = deaf; const p = a.play(); if (p && p.catch) p.catch(() => {}); }
    const nb = document.querySelector('.nav-btn[data-screen="voice"]'); if (nb) nb.textContent = joined ? '🎙️ در تماس' : '🎙️ اتاق صحبت';
  }

  /* ---------- سیگنال‌دهی ---------- */
  function connectChannel() {
    if (ch) return;
    try {
      ch = dbClient.channel('voice-room', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'vc' }, m => onSignal(m && m.payload))
        .on('presence', { event: 'sync' }, onPresence)
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; if (joined) try { ch.track({ name: nm() }); } catch (e) {} setTimeout(onPresence, 200); render(); } });
    } catch (e) { console.warn('voice off', e); ch = null; }
  }
  const sd = d => ({ type: d.type, sdp: d.sdp });
  function send(p) { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'vc', payload: Object.assign({ from: ID }, p) }); } catch (e) {} }

  function onPresence() {
    if (!ch) return;
    const o = others();
    if (joined) {
      if (o.length && !pc) { peerId = o.map(x => x.id).sort()[0]; peerName = o[0].name; if (ID < peerId) startCall(true); else startCall(false); }
      if (!o.length && pc) { closePc(); state = 'idle'; say('📴 اون یکی از اتاق رفت'); }
    }
    render();
  }

  async function startCall(offerer) {
    if (pc || !local) return;
    state = 'connecting'; remoteSet = false; pending = [];
    pc = new RTCPeerConnection(ICE);
    local.getTracks().forEach(t => pc.addTrack(t, local));
    pc.onicecandidate = e => { if (e.candidate) send({ t: 'ice', c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.ontrack = e => { remoteStream = e.streams[0] || new MediaStream([e.track]); watch(remoteStream); render(); };
    pc.onconnectionstatechange = () => {
      const s = pc && pc.connectionState;
      if (s === 'connected') { state = 'connected'; say('💞 وصل شدین! حرف بزنین'); }
      else if (s === 'failed') state = 'failed';
      else if (s === 'disconnected') state = 'connecting';
      render();
    };
    if (offerer) {
      try { const o = await pc.createOffer(); await pc.setLocalDescription(o); send({ t: 'offer', sdp: sd(pc.localDescription) }); } catch (e) { console.warn(e); }
    } else send({ t: 'ready' });
    render();
  }
  async function onSignal(p) {
    if (!p || p.from === ID || !joined) return;
    try {
      if (p.t === 'ready') { if (!pc) await startCall(ID < p.from); else if (ID < p.from && pc.signalingState === 'stable' && !pc.remoteDescription) { const o = await pc.createOffer(); await pc.setLocalDescription(o); send({ t: 'offer', sdp: sd(pc.localDescription) }); } return; }
      if (p.t === 'offer') {
        if (!pc) await startCall(false);
        await pc.setRemoteDescription(p.sdp); remoteSet = true;
        const a = await pc.createAnswer(); await pc.setLocalDescription(a); send({ t: 'answer', sdp: sd(pc.localDescription) }); flushIce();
      } else if (p.t === 'answer' && pc) { await pc.setRemoteDescription(p.sdp); remoteSet = true; flushIce(); }
      else if (p.t === 'ice' && pc) { if (remoteSet) await pc.addIceCandidate(p.c).catch(() => {}); else pending.push(p.c); }
      else if (p.t === 'bye') { closePc(); state = 'idle'; render(); }
    } catch (e) { console.warn('voice signal', e); }
  }
  function flushIce() { const q = pending; pending = []; q.forEach(c => pc && pc.addIceCandidate(c).catch(() => {})); }
  function closePc() { try { if (pc) { pc.onconnectionstatechange = null; pc.close(); } } catch (e) {} pc = null; remoteStream = null; remoteSet = false; pending = []; peerId = ''; }

  /* نشانگر «دارن حرف می‌زنن» */
  function watch(stream) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize); clearInterval(speakT);
      speakT = setInterval(() => {
        an.getByteTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] - 128));
        const t = document.querySelector('.vc-tile[data-who="peer"]'); if (t) t.classList.toggle('speak', m > 12 && !deaf);
      }, 150);
    } catch (e) {}
  }

  /* ---------- ورود / خروج ---------- */
  async function join() {
    if (joined) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('⚠️ این مرورگر از میکروفون پشتیبانی نمی‌کنه (یا سایت امن نیست)'); return; }
    try { local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch (e) { say('⚠️ اجازهٔ میکروفون داده نشد؛ از تنظیمات مرورگر بازش کن'); return; }
    joined = true; micOn = true; deaf = false; t0 = Date.now(); state = 'idle';
    if (!ch) connectChannel();
    if (ch && subscribed) { try { ch.track({ name: nm() }); } catch (e) {} setTimeout(onPresence, 150); }
    clearInterval(tickT); tickT = setInterval(() => { const s = $('vcSt'); if (s && joined && state === 'connected') render(); }, 1000);
    if (!others().length && Date.now() - lastNotify > 10 * 60000) { lastNotify = Date.now(); try { notify('voice', 'اتاق صحبت', ''); } catch (e) {} }
    render();
  }
  function leave(quiet) {
    if (!joined) return;
    send({ t: 'bye' }); closePc();
    try { if (local) local.getTracks().forEach(t => t.stop()); } catch (e) {} local = null;
    try { if (ch) ch.untrack(); } catch (e) {}
    joined = false; state = 'idle'; clearInterval(tickT); clearInterval(speakT);
    if (!quiet) say('📴 از اتاق صحبت خارج شدی');
    render();
  }
  function toggleMic() { micOn = !micOn; if (local) local.getAudioTracks().forEach(t => { t.enabled = micOn; }); render(); }
  function toggleDeaf() { deaf = !deaf; const a = $('vcAudio'); if (a) a.muted = deaf; render(); }

  function load() { connectChannel(); render(); }
  function init() {
    const box = $('voiceBox'); if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-vc]'); if (!b) return;
      const a = b.dataset.vc;
      if (a === 'join') join(); else if (a === 'leave') leave(); else if (a === 'mic') toggleMic(); else if (a === 'deaf') toggleDeaf();
    });
    window.addEventListener('pagehide', () => leave(true));
    render();
  }
  window.Voice = { _pc: () => pc, load, join, leave, init, _state: () => ({ joined, state, micOn, deaf, peer: peerId, id: ID }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
