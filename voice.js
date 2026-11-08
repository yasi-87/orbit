/* 🎙️ اتاق صحبت (مثل دیسکورد): تماس صوتی و چت کوچولو.
   صدا مستقیم بین دستگاه‌ها (WebRTC، هر جفت یک اتصال) می‌ره؛ سیگنال‌دهی و چت با Supabase Realtime
   (broadcast + presence). هیچ جدول یا SQL جدیدی لازم نیست. بیشتر از دو نفر (مثلاً گوشی و لپ‌تاپ هر دو) هم کار می‌کنه. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  /* STUN برای پیدا کردن آدرس؛ TURN (سرور واسطه) برای وقتی که شبکه‌ها (مثل اینترنت موبایل یا مودم‌های بسته) اجازهٔ اتصال مستقیم نمی‌دن.
   صدا رمزنگاری‌شده (DTLS-SRTP) رد می‌شه و سرور واسطه فقط داده‌ی رمز می‌بینه. */
  const ICE = { iceCandidatePoolSize: 2, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }] };
  const CHAT_KEY = 'vc_chat';
  let ch = null, subscribed = false, joined = false, local = null, micOn = true, deaf = false, t0 = 0, tickT = null, meterT = null, statT = null;
  const diag = { sent: {}, recv: {}, errs: [], subs: '' };
  let relayDelay = 12000, relayed = false, noMic = false, lastHtml = '', lastNotify = 0, actx = null, myAn = null, myLvl = 0, sending = false, sentPrev = 0;
  const peers = {};   // id -> { pc, stream, remoteSet, pending, state, an, lvl, name }
  const $ = id => document.getElementById(id);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'من';
  const say = m => { if (typeof toast === 'function') toast(m); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* لینک‌های توی پیام قابل‌کلیک می‌شن (توی تب تازه باز می‌شن) */
  const linkify = s => esc(s).replace(/((?:https?:\/\/|www\.)[^\s<]+)/gi, (m) => {
    let u = m, tail = ''; const t = u.match(/(?:[.,!?؟،:;)\]}»]|&quot;|&#39;)+$/); if (t) { tail = t[0]; u = u.slice(0, -tail.length); }
    if (!u || /^(?:https?:\/\/|www\.)$/i.test(u)) return m;
    const href = /^www\./i.test(u) ? 'https://' + u : u;
    return '<a class="vc-lnk" href="' + href + '" target="_blank" rel="noopener noreferrer nofollow" dir="ltr">' + u + '</a>' + tail;
  });
  const okAv = s => (typeof s === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 60000) ? s : '';
  let myThumb = '', thumbSrc = '';
  /* عکس پروفایل کوچیک‌شده (۹۶ پیکسل) تا توی حضور (presence) جا بشه */
  function makeThumb(cb) {
    const src = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    if (!src) { myThumb = ''; thumbSrc = ''; return cb(); }
    if (src === thumbSrc) return cb();
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        const s = Math.min(im.width, im.height), sx = (im.width - s) / 2, sy = (im.height - s) / 2;
        x.imageSmoothingQuality = 'high'; x.drawImage(im, sx, sy, s, s, 0, 0, 128, 128); myThumb = okAv(c.toDataURL('image/jpeg', 0.82)); thumbSrc = src;
      } catch (e) { myThumb = ''; }
      cb();
    };
    im.onerror = () => { myThumb = ''; cb(); };
    im.src = src;
  }
  const sd = d => ({ type: d.type, sdp: d.sdp });

  function others() {
    let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    const r = []; Object.keys(st).forEach(k => { if (k !== ID) (st[k] || []).forEach(m => r.push({ id: k, name: (m && m.name) || 'اون یکی', av: okAv(m && m.av), inCall: !!(m && m.call) })); });
    return r;
  }
  const inCallOthers = () => (ch && subscribed ? others().filter(o => o.inCall) : []);

  /* ---------- رابط ---------- */
  function render() {
    const box = $('voiceBox'); if (!box) return;
    const o = inCallOthers();
    const sec = Math.floor((Date.now() - (curCall ? curCall.start : Date.now())) / 1000), dur = joined && curCall ? String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0') : '';
    const states = o.map(x => { const P = peers[x.id] || {}; return P.relay ? 'relay' : (P.state || 'connecting'); });
    const allOk = o.length && states.every(s => s === 'connected' || s === 'relay'), anyBad = states.some(s => s === 'failed'), viaRelay = states.some(s => s === 'relay');
    const stTxt = !joined ? (o.length ? '💞 ' + esc(o.map(x => x.name).join(' و ')) + ' توی اتاقه؛ بیا تو!' : 'اتاق خالیه')
      : !o.length ? '⏳ منتظر اون یکی هستی…'
      : anyBad ? '🔴 اتصال برقرار نشد؛ یه بار «تلاش دوباره» بزن (اگه هر دو روی اینترنت موبایل هستین، با وای‌فای هم امتحان کن)'
      : allOk ? '🟢 وصلید ' + dur + (viaRelay ? ' <small>(مسیر پشتیبان؛ صدا کمی تأخیر داره)</small>' : '') : '⏳ در حال وصل شدن…';
    const tile = (id, n, me, muted, bad, av) => `<div class="vc-tile${muted ? ' muted' : ''}" data-who="${me ? 'me' : 'peer'}" data-peer="${id}"><div class="vc-av">${av ? '<img alt="" src="' + esc(av) + '">' : esc((n || '?').trim().slice(0, 1))}</div><div class="vc-nm">${esc(n)}${muted ? ' 🔇' : ''}${bad ? ' ⚠️' : ''}</div>${me ? '<div class="vc-meter"><i id="vcMeter"></i></div>' : ''}</div>`;
    const sendTxt = joined ? (noMic ? '🎧 بدون میکروفون؛ فقط صدای اون یکی رو می‌شنوی' : !micOn ? '🔇 میکروفونت خاموشه؛ صدایی نمی‌ره' : (o.length && allOk ? '<span id="vcOut">🎙️ صدات داره می‌ره…</span>' : '<span id="vcOut">🎙️ میکروفونت روشنه</span>')) : '';
    const html = `<div class="vc-room"><div class="vc-st" id="vcSt">${stTxt}</div>
      <div class="vc-tiles">${joined ? tile(ID, nm(), true, !micOn || noMic, false, (typeof userProfile !== 'undefined' && userProfile.avatar) || '') : ''}${o.map(x => tile(x.id, x.name, false, false, (peers[x.id] || {}).state === 'failed', x.av)).join('')}${!joined && !o.length ? '<div class="vc-empty">هنوز کسی توی اتاق نیست 🌙</div>' : ''}</div>
      ${joined ? '<div class="vc-out" id="vcOutBox">' + sendTxt + '</div>' : ''}
      <div class="vc-ctl">${joined
        ? (noMic ? '<button class="btn" data-vc="retrymic" type="button">🎙️ فعال‌کردن میکروفون</button>' : `<button class="btn ${micOn ? '' : 'ghost'}" data-vc="mic" type="button">${micOn ? '🎙️ میکروفون روشنه' : '🔇 میکروفون خاموشه'}</button>`) + `
           <button class="btn ghost" data-vc="deaf" type="button">${deaf ? '🔈 صدا رو باز کن' : '🔊 قطع صدای طرف مقابل'}</button>
           <button class="btn danger" data-vc="leave" type="button">📴 خروج از اتاق</button>`
        : `<button class="btn" data-vc="join" type="button">🎙️ ورود به اتاق صحبت</button>`}
        ${joined && anyBad ? '<button class="btn" data-vc="retry" type="button">🔄 تلاش دوباره</button>' : ''}</div>
      <p class="vc-note">برای صحبت، مرورگر اجازهٔ میکروفون می‌خواد؛ ولی اجباری نیست، بدونش هم می‌تونی گوش بدی و توی چت بنویسی. بهتره هدفون بزنید تا صدا برگشت نخوره.</p></div>`;
    if (html !== lastHtml) { lastHtml = html; box.innerHTML = html; }
    const nb = document.querySelector('.nav-btn[data-screen="voice"]'); if (nb) nb.textContent = joined ? '🎙️ در تماس' : '🎙️ اتاق صحبت';
  }

  /* ---------- سیگنال‌دهی ---------- */
  function connectChannel() {
    if (ch) return;
    try {
      ch = dbClient.channel('voice-room', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'vc' }, m => onSignal(m && m.payload))
        .on('broadcast', { event: 'chat' }, m => onChat(m && m.payload))
        .on('broadcast', { event: 'ct' }, m => onCt(m && m.payload))
        .on('broadcast', { event: 'au' }, m => onAudio(m && m.payload))
        .on('presence', { event: 'sync' }, onPresence)
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; if (joined) track(); setTimeout(onPresence, 200); render(); renderChat(); } });
    } catch (e) { console.warn('voice off', e); ch = null; }
  }
  const track = () => makeThumb(() => { try { ch.track({ name: nm(), call: joined, av: myThumb }); } catch (e) {} });
  function send(p, to) { diag.sent[p.t] = (diag.sent[p.t] || 0) + 1; try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'vc', payload: Object.assign({ from: ID, to: to || '' }, p) }); } catch (e) {} }

  function onPresence() {
    if (!ch) return;
    const o = inCallOthers();
    if (joined) {
      o.forEach(x => { if (!peers[x.id]) startPeer(x.id, x.name); else peers[x.id].name = x.name; });
      Object.keys(peers).forEach(id => { if (!o.some(x => x.id === id)) { const nmx = peers[id].name; closePeer(id); say('📴 ' + nmx + ' از اتاق رفت'); blip('down'); } });
    }
    render();
  }

  function startPeer(id, name) {
    if (peers[id] || !joined) return;
    const P = peers[id] = { pc: new RTCPeerConnection(ICE), state: 'connecting', remoteSet: false, pending: [], name, stream: null, an: null, lvl: 0 };
    const pc = P.pc;
    if (local) local.getTracks().forEach(t => pc.addTrack(t, local)); else pc.addTransceiver('audio', { direction: 'recvonly' });   // بدون میکروفون: فقط گوش می‌دیم
    P.lc = { host: 0, srflx: 0, relay: 0, other: 0 }; P.rc = 0;
    pc.onicecandidateerror = e => { diag.errs.push((e.url || '') + ' ' + e.errorCode + ' ' + (e.errorText || '')); if (diag.errs.length > 6) diag.errs.shift(); };
    pc.onicecandidate = e => { if (e.candidate) { const ty = (/ typ (\w+)/.exec(e.candidate.candidate) || [])[1]; P.lc[ty in P.lc ? ty : 'other']++; } if (e.candidate) send({ t: 'ice', c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }, id); };
    pc.ontrack = e => { P.stream = e.streams[0] || new MediaStream([e.track]); attachAudio(id, P.stream); watch(P); render(); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') { if (P.state !== 'connected') { say(P.relay ? '✅ اتصال مستقیم برقرار شد' : '💞 با ' + P.name + ' وصل شدی! حرف بزنین'); if (!P.relay) blip('up'); } P.state = 'connected'; P.warned = false; P.relay = false; clearTimeout(P.rt); stopTxIfIdle(); }
      else if (s === 'failed') {
        if (P.state !== 'failed' && P.tries >= 1 && !P.relay) blip('down');
        P.state = 'failed'; enableRelay(id);
        if (!(P.tries >= 1)) { P.tries = 1; setTimeout(() => { if (peers[id] === P && P.state === 'failed') retryPeer(id, true); }, 800); }   // یک بار خودکار دوباره امتحان می‌کنیم
      }
      else if (s === 'disconnected' || s === 'connecting') { if (P.state === 'connected' && !P.warned) { P.warned = true; say('📶 ارتباط ضعیف شد یا قطع شد…'); blip('down'); } P.state = 'connecting'; }
      trackCall(); render();
    };
    P.rt = setTimeout(() => { if (peers[id] === P && P.state !== 'connected') enableRelay(id); }, relayDelay);
    if (ID < id) makeOffer(id); else send({ t: 'ready' }, id);
    render();
  }
  /* دوباره‌امتحانی: اتصال این نفر رو از نو می‌سازیم و به طرف مقابل هم خبر می‌دیم */
  function retryPeer(id, silent) {
    const P = peers[id]; if (!P) return;
    const name = P.name, tries = P.tries || 0; send({ t: 'reset' }, id); closePeer(id);
    if (joined) { startPeer(id, name); if (peers[id]) peers[id].tries = tries + (silent ? 0 : 1); }
    if (!silent) say('🔄 دوباره تلاش می‌کنم وصل بشم…');
  }
  async function makeOffer(id) {
    const P = peers[id]; if (!P) return;
    try { const o = await P.pc.createOffer(); await P.pc.setLocalDescription(o); send({ t: 'offer', sdp: sd(P.pc.localDescription) }, id); } catch (e) { console.warn(e); }
  }
  async function onSignal(p) {
    if (!p || p.from === ID || (p.to && p.to !== ID)) return;
    diag.recv[p.t] = (diag.recv[p.t] || 0) + 1;
    if (!joined) return;
    const id = p.from;
    try {
      if (p.t === 'reset') { const nm0 = (peers[id] || {}).name || 'اون یکی', tr = (peers[id] || {}).tries || 0; closePeer(id); startPeer(id, nm0); if (peers[id]) peers[id].tries = tr; return; }
      if (p.t === 'bye') { const had = !!peers[id]; closePeer(id); render(); if (had) blip('down'); return; }
      if (p.t === 'cid') { if (curCall && !curCall.id && p.id) { curCall.id = p.id; curCall.start = Number(p.start) || curCall.start; saveCall(false); } return; }
      if (!peers[id]) { const o = others().find(x => x.id === id); startPeer(id, o ? o.name : 'اون یکی'); }
      const P = peers[id]; if (!P) return;
      if (p.t === 'ready') { if (ID < id && !P.pc.remoteDescription && P.pc.signalingState === 'stable') await makeOffer(id); }
      else if (p.t === 'offer') {
        await P.pc.setRemoteDescription(p.sdp); P.remoteSet = true;
        const a = await P.pc.createAnswer(); await P.pc.setLocalDescription(a); send({ t: 'answer', sdp: sd(P.pc.localDescription) }, id); flushIce(P);
      } else if (p.t === 'answer') { await P.pc.setRemoteDescription(p.sdp); P.remoteSet = true; flushIce(P); }
      else if (p.t === 'ice') { P.rc++; if (P.remoteSet) await P.pc.addIceCandidate(p.c).catch(() => {}); else P.pending.push(p.c); }
    } catch (e) { console.warn('voice signal', e); }
  }
  function flushIce(P) { const q = P.pending; P.pending = []; q.forEach(c => P.pc.addIceCandidate(c).catch(() => {})); }
  function closePeer(id) {
    const P = peers[id]; if (!P) return;
    clearTimeout(P.rt);
    try { P.pc.onconnectionstatechange = null; P.pc.close(); } catch (e) {}
    const a = $('vcA_' + id); if (a) a.remove();
    delete peers[id]; stopTxIfIdle(); trackCall();
  }
  function attachAudio(id, stream) {
    let a = $('vcA_' + id);
    if (!a) { a = document.createElement('audio'); a.id = 'vcA_' + id; a.autoplay = true; a.setAttribute('playsinline', ''); ($('vcAudios') || document.body).appendChild(a); }
    a.srcObject = stream; a.muted = deaf; const p = a.play(); if (p && p.catch) p.catch(() => {});
  }


  /* ---------- 🛟 مسیر پشتیبان: وقتی اتصال مستقیم برقرار نمی‌شه (مثلاً فیلتر یا NAT سخت)، صدا فشرده (Opus) و از همون کانال Supabase رد می‌شه ---------- */
  let tx = null, rxDec = {}, playCtx = null, playGain = null, playAt = 0;
  const WC = () => typeof AudioEncoder !== 'undefined' && typeof AudioDecoder !== 'undefined' && typeof MediaStreamTrackProcessor !== 'undefined';
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  function enableRelay(id) {
    const P = peers[id]; if (!P || P.relay || P.state === 'connected') return;
    if (!WC()) { diag.errs.push('این مرورگر WebCodecs نداره؛ مسیر پشتیبان کار نمی‌کنه'); return; }
    P.relay = true; say('🟡 اتصال مستقیم نشد؛ از مسیر پشتیبان وصل شدی (صدا کمی تأخیر داره)'); blip('up');
    startTx(); trackCall(); render();
  }
  function stopTxIfIdle() { if (tx && !Object.values(peers).some(p => p.relay)) { tx.stop = true; tx = null; } }
  async function startTx() {
    if (tx || !local || !WC()) return;
    const track = local.getAudioTracks()[0]; if (!track) return;
    const me = tx = { stop: false };
    try {
      const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
      let enc = null, pack = [], seq = 0, last = 0;
      const flush = () => {
        if (!pack.length) return;
        let n = 4; pack.forEach(p => { n += 1 + p.length; }); const u = new Uint8Array(n); const dv = new DataView(u.buffer); dv.setUint32(0, seq++);
        let o = 4; pack.forEach(p => { u[o++] = p.length; u.set(p, o); o += p.length; }); pack = [];
        try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'au', payload: { from: ID, s: b64(u) } }); diag.tx = (diag.tx || 0) + 1; } catch (e) {}
      };
      while (!me.stop) {
        const r = await reader.read(); if (r.done) break; const f = r.value;
        try {
          if (!enc) { enc = new AudioEncoder({ output: c => { const b = new Uint8Array(c.byteLength); c.copyTo(b); if (b.length < 255) pack.push(b); }, error: e => diag.errs.push('enc ' + e) }); enc.configure({ codec: 'opus', sampleRate: f.sampleRate, numberOfChannels: f.numberOfChannels, bitrate: 24000 }); }
          if (micOn) enc.encode(f);
        } catch (e) { diag.errs.push('tx ' + e); }
        f.close();
        const now = Date.now(); if (now - last >= 200) { last = now; flush(); }
      }
      try { reader.cancel(); if (enc) enc.close(); } catch (e) {}
    } catch (e) { diag.errs.push('relay tx: ' + e); }
    if (tx === me) tx = null;
  }
  function onAudio(p) {
    if (!p || p.from === ID || !joined || !p.s || !WC()) return;
    const P = peers[p.from]; if (!P || P.state === 'connected' || deaf) return;   // اگه مستقیم وصلیم، همون صدای مستقیم رو داریم
    if (!P.relay) { P.relay = true; trackCall(); render(); }
    let d = rxDec[p.from];
    if (!d) {
      playCtx = playCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (playCtx.state === 'suspended') playCtx.resume().catch(() => {});
      d = rxDec[p.from] = { ts: 0, dec: new AudioDecoder({ output: a => { try { const n = a.numberOfFrames, buf = playCtx.createBuffer(1, n, a.sampleRate), ar = new Float32Array(n); a.copyTo(ar, { planeIndex: 0, format: 'f32-planar' }); buf.copyToChannel(ar, 0); a.close();
        let m = 0; for (let i = 0; i < n; i += 8) m = Math.max(m, Math.abs(ar[i])); P.lvl = m;
        const src = playCtx.createBufferSource(); src.buffer = buf; src.connect(playCtx.destination); const now = playCtx.currentTime; if (playAt < now + 0.05) playAt = now + 0.2; src.start(playAt); playAt += buf.duration; diag.rx = (diag.rx || 0) + 1; } catch (e) { diag.errs.push('dec out ' + e); } }, error: e => diag.errs.push('dec ' + e) }) };
      d.dec.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1 });
    }
    try {
      const u = unb64(p.s); let o = 4;
      while (o < u.length) { const l = u[o++]; d.dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: d.ts, data: u.subarray(o, o + l) })); d.ts += 20000; o += l; }
    } catch (e) { diag.errs.push('rx ' + e); }
  }

  /* ---------- نشانگرها: «دارن حرف می‌زنن» و «صدای من داره می‌ره» ---------- */
  function analyser(stream) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an); return an;
  }
  const level = an => { const b = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b); let m = 0; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i] - 128)); return m; };
  function watch(P) { try { P.an = analyser(P.stream); } catch (e) {} }
  function startMeters() {
    clearInterval(meterT);
    try { myAn = local ? analyser(local) : null; } catch (e) { myAn = null; }
    meterT = setInterval(() => {
      myLvl = myAn && micOn ? level(myAn) : 0;
      const m = $('vcMeter'); if (m) m.style.width = Math.min(100, myLvl * 4) + '%';
      const me = document.querySelector('.vc-tile[data-who="me"]'); if (me) me.classList.toggle('speak', myLvl > 12);
      Object.keys(peers).forEach(id => { const P = peers[id], t = document.querySelector('.vc-tile[data-peer="' + id + '"]'); if (t) t.classList.toggle('speak', !deaf && ((P.an && level(P.an) > 12) || (P.relay && P.lvl > 0.05))); });
    }, 120);
    clearInterval(statT);
    statT = setInterval(async () => {   // آیا بایت‌های صدای من واقعاً داره ارسال می‌شه؟
      let sent = 0; for (const id of Object.keys(peers)) { try { (await peers[id].pc.getStats()).forEach(r => { if (r.type === 'outbound-rtp' && r.kind === 'audio') sent += r.bytesSent || 0; }); } catch (e) {} }
      try {
        let rl = false;
        for (const id of Object.keys(peers)) {
          const mp = {}; (await peers[id].pc.getStats()).forEach(r => { mp[r.id] = r; });
          Object.values(mp).forEach(r => { if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) { const lc = mp[r.localCandidateId], rc = mp[r.remoteCandidateId]; if ((lc && lc.candidateType === 'relay') || (rc && rc.candidateType === 'relay')) rl = true; } });
        }
        if (rl !== relayed) { relayed = rl; render(); }
      } catch (e) {}
      sending = sent > sentPrev && micOn; sentPrev = sent;
      const o = $('vcOut'); if (o && micOn) o.textContent = Object.keys(peers).length ? (sending ? (myLvl > 12 ? '✅ صدات داره می‌رسه' : '✅ وصلی؛ ولی صدایی از میکروفونت نمیاد (حرف بزن)') : '⚠️ صدایی نمی‌ره') : '🎙️ میکروفونت روشنه';
    }, 1500);
  }

  /* ---------- ورود / خروج ---------- */
  async function join() {
    if (joined) return;
    noMic = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { noMic = true; say('🎧 این مرورگر میکروفون نداره؛ فقط گوش می‌دی'); }
    else try { local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch (e) { local = null; noMic = true; say('🎧 بدون میکروفون وارد شدی؛ می‌تونی صدای اون یکی رو بشنوی و تو چت بنویسی'); }
    joined = true; micOn = true; deaf = false; t0 = Date.now(); sentPrev = 0;
    if (!ch) connectChannel();
    if (ch && subscribed) { track(); setTimeout(onPresence, 150); }
    startMeters();
    clearInterval(tickT); tickT = setInterval(() => { if (joined && Object.values(peers).some(p => p.state === 'connected' || p.relay)) render(); }, 1000);
    if (!inCallOthers().length && Date.now() - lastNotify > 10 * 60000) { lastNotify = Date.now(); try { notify('voice', 'اتاق صحبت', ''); } catch (e) {} }
    render();
  }
  function leave(quiet) {
    if (!joined) return;
    if (tx) { tx.stop = true; tx = null; } send({ t: 'bye' }); const fin = curCall ? finishCall() : null; Object.keys(peers).forEach(closePeer);
    try { if (local) local.getTracks().forEach(t => t.stop()); } catch (e) {} local = null;
    joined = false; duck(false); track();
    clearInterval(tickT); clearInterval(meterT); clearInterval(statT);
    if (!quiet) { say('📴 از اتاق صحبت خارج شدی'); blip('down'); }
    render();
  }
  function toggleMic() { if (noMic) return; micOn = !micOn; if (local) local.getAudioTracks().forEach(t => { t.enabled = micOn; }); render(); }
  function toggleDeaf() { deaf = !deaf; document.querySelectorAll('#vcAudios audio').forEach(a => { a.muted = deaf; }); render(); }

  /* ---------- 📞 تاریخچهٔ تماس‌ها ---------- */
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return fa(h) + ' ساعت' + (m ? ' و ' + fa(m) + ' دقیقه' : '');
    if (m) return fa(m) + ' دقیقه' + (s ? ' و ' + fa(s) + ' ثانیه' : '');
    return fa(s) + ' ثانیه';
  }
  let finishing = false, curCall = null, callPending = false, callT = null, warnedCalls = false, callRows = [];
  const connectedIds = () => Object.keys(peers).filter(k => peers[k].state === 'connected' || peers[k].relay);
  function saveCall(final) {
    const c = curCall; if (!c || !c.id) return Promise.resolve();
    const now = Date.now(), dur = Math.floor((now - c.start) / 1000);
    if (final && dur < 5) return Promise.resolve();
    return dbClient.from('calls').upsert({ id: c.id, started_at: c.start, ended_at: now, duration_sec: dur, names: c.names.join(' و ') }).then(r => {
      if (r && r.error && /calls|relation|schema cache/i.test(r.error.message || '') && !warnedCalls) { warnedCalls = true; say('⚠️ برای ثبت تاریخچهٔ تماس‌ها، بلوک ۲۰ فایل SQL رو توی Supabase اجرا کن'); }
    }).catch(() => {});
  }
  let ducked = false;
  function duck(on) { if (on === ducked) return; ducked = on; try { window.dispatchEvent(new CustomEvent('om-duck', { detail: { on } })); } catch (e) {} }
  function trackCall() {
    const ids = connectedIds();
    duck(!!(joined && ids.length));
    if (ids.length && !curCall && joined) {
      curCall = { id: null, start: Date.now(), names: [nm()].concat(ids.map(k => peers[k].name)) };
      const first = ids.slice().sort()[0];
      if (ID < first) { curCall.id = 'call_' + curCall.start + '_' + ID; send({ t: 'cid', id: curCall.id, start: curCall.start }, first); }
      clearInterval(callT); callT = setInterval(() => { if (curCall) { curCall.names = Array.from(new Set(curCall.names.concat(connectedIds().map(k => peers[k].name)))); saveCall(false); } }, 30000);
      setTimeout(() => saveCall(false), 1500);
    } else if (!ids.length && curCall) finishCall();
  }
  async function finishCall() {
    const c = curCall; clearInterval(callT);
    if (!c || finishing) return;
    finishing = true; await saveCall(true); curCall = null; finishing = false;
    const dur = Math.floor((Date.now() - c.start) / 1000);
    await loadCalls();
    if (dur >= 5) { const tot = callRows.reduce((a, r) => a + (r.duration_sec || 0), 0); say('📞 تماس تموم شد: ' + fmtDur(dur) + ' · در مجموع ' + fmtDur(Math.max(tot, dur)) + ' با هم حرف زدیم 💞'); }
  }
  async function loadCalls() {
    const box = $('vcHistory'); if (!box) return;
    let r; try { r = await dbClient.from('calls').select('*').order('started_at', { ascending: false }).limit(300); } catch (e) { r = { error: e }; }
    if (r && r.error) { box.innerHTML = '<div class="vc-empty">برای دیدن تاریخچهٔ تماس‌ها، بلوک ۲۰ فایل SQL رو یک بار توی Supabase اجرا کن.</div>'; return; }
    callRows = (r.data || []).filter(x => x && x.duration_sec > 0);
    const asc = callRows.slice().sort((a, b) => a.started_at - b.started_at); let cum = 0; const cumById = {};
    asc.forEach(x => { cum += x.duration_sec; cumById[x.id] = cum; });
    const items = callRows.map(x => {
      let when = ''; try { const w = Recur.epochToWall(x.started_at); when = Recur.fmtJalaliShort(w.iso) + ' · ساعت ' + fa(w.hhmm); } catch (e) {}
      return `<div class="vc-call"><div class="vc-call-t">📞 ${esc(when)}</div><div class="vc-call-d">⏱️ ${esc(fmtDur(x.duration_sec))}${x.names ? ' · ' + esc(x.names) : ''}</div><div class="vc-call-c">📊 مجموع تا پایان این تماس: <b>${esc(fmtDur(cumById[x.id] || 0))}</b></div></div>`;
    }).join('');
    box.innerHTML = '<div class="vc-chat-h">📞 تماس‌های ما</div><div class="vc-calls">' + (items || '<div class="vc-empty">هنوز تماسی ثبت نشده 🌙</div>') + '</div>' +
      (callRows.length ? '<div class="vc-total">در مجموع <b>' + esc(fmtDur(cum)) + '</b> با هم حرف زدیم 💞 <span>(' + fa(callRows.length) + ' تماس)</span></div>' : '');
  }

  /* 🔔 صداهای کوچولوی سایت (با WebAudio): send/recv = پیام، notif = اعلان سایت، up = تماس وصل شد، down = تماس قطع شد/نت خراب شد */
  const SND = {
    send:  [[880, 0, .09], [1318, .07, .12]],
    recv:  [[988, 0, .12], [1318, .11, .16]],
    notif: [[784, 0, .12], [988, .1, .12], [1318, .2, .2]],
    up:    [[523, 0, .12], [659, .1, .12], [784, .2, .12], [1047, .3, .22]],
    down:  [[784, 0, .16], [622, .14, .16], [466, .3, .16], [349, .46, .3]]
  };
  let lastBlip = 0;
  function blip(kind) {
    try {
      if (typeof muted !== 'undefined' && muted === true) return;
      const now = Date.now(); if (now - lastBlip < 250 && kind !== 'send') return; lastBlip = now;
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume().catch(() => {});
      const t = actx.currentTime;
      (SND[kind] || SND.notif).forEach(([f, d, len]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'down' ? 'triangle' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(kind === 'down' ? 0.16 : 0.14, t + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
        o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + len + 0.02);
      });
      window.__blips = (window.__blips || []).concat(kind);
    } catch (e) {}
  }
  window.OMSound = { play: blip };

  /* ---------- 💬 چت کوچولو ---------- */
  let msgs = [], warnedChat = false, chatMissing = false, chatOldest = 0, hasMore = false, loadingOld = false;
  const PAGE = 300;
  try { msgs = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); } catch (e) {}
  const saveMsgs = () => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60))); } catch (e) {} };
  const isMine = n => { try { return Recur.sameName(n, nm()); } catch (e) { return n === nm(); } };
  function addMsg(m) {
    if (!m || !m.id || msgs.some(x => x.id === m.id)) return false;
    msgs.push(m); msgs.sort((a, b) => a.ts - b.ts); if (msgs.length > 50000) msgs.splice(0, msgs.length - 50000); return true;
  }
  function dayLabel(ts) { try { return Recur.fmtJalaliLong(Recur.epochToWall(ts).iso); } catch (e) { return ''; } }
  /* جهت متن: هر پیامی که حتی یک حرف فارسی/عربی داره راست‌به‌چپه (انگلیسی‌هاش وسط جمله درست می‌شینن)؛ فقط پیام کاملاً انگلیسی چپ‌به‌راسته */
  const txDir = t => { t = String(t || ''); return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(t) || !/[A-Za-z]/.test(t) ? 'rtl' : 'ltr'; };
  function renderChat(keep) {
    const list = $('vcChatList'); if (!list) return;
    const prevH = list.scrollHeight, prevT = list.scrollTop;
    let last = '', html = hasMore ? '<button type="button" class="vc-older" id="vcOlder">' + (loadingOld ? '⏳ دارم پیام‌های قدیمی‌تر رو می‌گیرم…' : '⬆️ پیام‌های قدیمی‌تر') + '</button>' : '';
    msgs.forEach(m => {
      const d = dayLabel(m.ts); if (d && d !== last) { last = d; html += `<div class="vc-day">${esc(d)}</div>`; }
      const rp = m.reply ? `<div class="vc-rp" data-goto="${esc(m.reply.id)}"><b>${esc(m.reply.name)}</b><span dir="${txDir(m.reply.text)}">${esc((m.reply.text || '').slice(0, 80))}</span></div>` : '';
      const im = m.img ? `<img class="vc-img" src="${esc(m.img)}" alt="تصویر" loading="lazy" data-zoom="${esc(m.img)}">` : '';
      html += `<div class="vc-msg${isMine(m.name) ? ' me' : ''}${m.name === BOT ? ' bot' : ''}" data-mid="${esc(m.id)}"><b>${m.name === BOT ? '🧸 ' : ''}${esc(m.name)}</b>${rp}${im}${m.text ? `<span class="vc-tx" dir="${txDir(m.text)}">${linkify(m.text)}</span>` : ''}<i>${esc(fa(Recur.epochToWall(m.ts).hhmm))}${m.edited ? ' <small class="vc-ed">ویرایش‌شده</small>' : ''}${tick(m)}<button type="button" class="vc-re" data-reply="${esc(m.id)}" title="ریپلای" aria-label="ریپلای">↩︎</button>${isMine(m.name) && m.text ? `<button type="button" class="vc-re" data-edit="${esc(m.id)}" title="ویرایش" aria-label="ویرایش">✏️</button>` : ''}${isMine(m.name) || m.name === BOT ? `<button type="button" class="vc-re" data-del="${esc(m.id)}" title="حذف" aria-label="حذف">🗑️</button>` : ''}</i></div>`;
    });
    try { renderEmoFav(); } catch (e) {}
    list.innerHTML = html || '<div class="vc-empty">هنوز پیامی نیست؛ یه چیز قشنگ بنویس 💞</div>';
    if (chatMissing) list.innerHTML += '<div class="vc-empty">برای ماندگار شدن پیام‌ها، بلوک ۲۱ فایل SQL رو یک بار توی Supabase اجرا کن.</div>';
    if (keep) list.scrollTop = Math.max(0, list.scrollHeight - prevH + prevT); else list.scrollTop = list.scrollHeight;
  }
  async function loadOlder() {
    if (loadingOld || !hasMore || !chatOldest) return; loadingOld = true; renderChat(true);
    try {
      const r = await dbClient.from('voice_chat').select('*').lt('ts', chatOldest).order('ts', { ascending: false }).limit(PAGE);
      if (r.error) throw r.error; const rows = r.data || [];
      rows.forEach(x => { const id = String(x.id); if (id.startsWith('__')) return; addMsg({ edited: !!x.edited, id: x.id, name: x.name || 'ناشناس', text: x.text || '', ts: Number(x.ts) || 0, img: x.img || '', reply: x.reply_id ? { id: x.reply_id, name: x.reply_name || '', text: x.reply_text || '' } : null }); });
      if (rows.length) chatOldest = Math.min(chatOldest, ...rows.map(x => Number(x.ts) || chatOldest)); hasMore = rows.length >= PAGE;
    } catch (e) { say('⚠️ پیام‌های قدیمی‌تر لود نشد'); }
    loadingOld = false; renderChat(true);
  }
  async function loadChat() {
    try {
      const r = await dbClient.from('voice_chat').select('*').order('ts', { ascending: false }).limit(PAGE);
      if (r.error) { chatMissing = /voice_chat|relation|schema cache/i.test(r.error.message || ''); renderChat(); return; }
      chatMissing = false; { const ts = (r.data || []).map(x => Number(x.ts) || 0).filter(Boolean); if (ts.length) chatOldest = Math.min(...ts); hasMore = (r.data || []).length >= PAGE; }
      (r.data || []).filter(x => { const id = String(x.id); if (id.startsWith('__ls_')) return false; if (id === '__bg') { const v = x.text === '-' ? '' : String(x.text || ''); if (okBg(v)) { chatBg = v; try { localStorage.setItem('vc_bg', v); } catch (e) {} } return false; } if (id === '__bot') { botOn = x.text !== '0'; try { localStorage.setItem('vc_bot', botOn ? '1' : '0'); } catch (e) {} return false; } return !id.startsWith('__seen_') || (!isMine(x.name) && (seenBy[x.name] = Math.max(seenBy[x.name] || 0, Number(x.ts) || 0)) && false); }).forEach(x => addMsg({ edited: !!x.edited, id: x.id, name: x.name || 'ناشناس', text: x.text || '', ts: Number(x.ts) || 0, img: x.img || '', reply: x.reply_id ? { id: x.reply_id, name: x.reply_name || '', text: x.reply_text || '' } : null }));
      saveMsgs(); renderChat(); renderBot(); applyBg(); markSeen();
    } catch (e) {}
  }
  function onChat(p) {
    if (!p || p.from === ID || (!p.text && !p.img)) return;
    const m = { id: p.id || ('m_' + (p.ts || Date.now()) + '_' + p.from), name: String(p.name || 'اون یکی').slice(0, 30), text: String(p.text || '').slice(0, 1500), ts: p.ts || Date.now(),
      img: /^https?:\/\//.test(p.img || '') ? p.img : '', reply: p.reply && p.reply.id ? { id: String(p.reply.id), name: String(p.reply.name || '').slice(0, 30), text: String(p.reply.text || '').slice(0, 120) } : null };
    delete typers[p.from]; if (p.name === BOT) delete typers.bot;
    if (addMsg(m)) { saveMsgs(); renderChat(); renderTyping(); markSeen(); blip('recv'); if (window.ChatDock && !ChatDock.isOpen()) { ChatDock.bump(); say('💬 ' + m.name + ': ' + (m.text ? m.text.slice(0, 40) : '📷 تصویر')); } }
  }
  /* ---------- ✓✓ سین، ✍️ در حال نوشتن، 🧸 پفیلا (دستیار مشترک) ---------- */
  const BOT = 'پفیلا';
  let botOn = true, editing = null; try { botOn = localStorage.getItem('vc_bot') !== '0'; } catch (e) {}
  let seenBy = {}, typers = {}, lastTypeSent = 0, typeIdle = null, mySeenSent = 0;
  try { mySeenSent = Number(localStorage.getItem('vc_seen_sent')) || 0; } catch (e) {}

  /* ---------- پس‌زمینهٔ مشترک چت ---------- */
  const BGS = { night: 'linear-gradient(160deg,#1b1038,#3a1c5e 55%,#14213d)', rose: 'linear-gradient(160deg,#4a1635,#a23a6b 60%,#2b1240)', ocean: 'linear-gradient(160deg,#06243d,#0f6a8a 60%,#102a56)', forest: 'linear-gradient(160deg,#0d2a1f,#1f6b4d 60%,#1a2a45)', sunset: 'linear-gradient(160deg,#42204f,#d6567a 55%,#f2a65a)', dots: 'radial-gradient(rgba(255,255,255,.12) 1.5px,transparent 1.6px) 0 0/18px 18px,linear-gradient(160deg,#1c1530,#2a1f4a)' };
  let chatBg = ''; try { chatBg = localStorage.getItem('vc_bg') || ''; } catch (e) {}
  const okBg = v => typeof v === 'string' && (v === '' || (/^p:[a-z]+$/.test(v) && BGS[v.slice(2)]) || /^i:https?:\/\/[^\s"'()]+$/.test(v) || (/^i:data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(v) && v.length < 200000));
  function applyBg() {
    const l = $('vcChatList'); if (!l) return;
    let v = '';
    if (chatBg.startsWith('p:')) v = BGS[chatBg.slice(2)] || ''; else if (chatBg.startsWith('i:')) v = 'linear-gradient(rgba(10,6,24,.45),rgba(10,6,24,.45)),url("' + chatBg.slice(2) + '")';
    l.classList.toggle('hasbg', !!v); l.style.background = v; if (v) { l.style.backgroundSize = chatBg.startsWith('i:') ? 'cover' : ''; l.style.backgroundPosition = 'center'; }
    const pop = $('vcBgPop'); if (pop) pop.querySelectorAll('[data-bgp]').forEach(b => b.classList.toggle('on', 'p:' + b.dataset.bgp === chatBg));
  }
  function setBg(v, quiet) {
    if (!okBg(v)) return; chatBg = v; try { localStorage.setItem('vc_bg', v); } catch (e) {} applyBg();
    if (!quiet) { ctSend({ k: 'bg', v }); try { dbClient.from('voice_chat').upsert({ id: '__bg', name: nm(), text: v || '-', ts: Date.now() }).then(() => {}, () => {}); } catch (e) {} say(v ? '🎨 پس‌زمینهٔ چت عوض شد' : '🎨 پس‌زمینه برداشته شد'); }
  }
  async function pickBgImage(file) {
    if (!file || !/^image\//.test(file.type)) return;
    const pop = $('vcBgPop'), st = pop && pop.querySelector('[data-bgst]'), msg = t => { if (st) st.textContent = t; };
    msg('⏳ در حال آماده‌سازی عکس…');
    let big = '';
    try { big = await resizeImageFile(file, 1200, 0.8); } catch (e) { msg('⚠️ این عکس باز نشد'); return; }
    try {
      const up = await uploadMediaFile(dataUrlToBlob(big), 'jpg', 'chat-bg.jpg', { onProgress: (l, t) => msg('📤 در حال آپلود… ' + Math.round(l / t * 100).toLocaleString('fa-IR') + '٪') });
      await new Promise((res, rej) => { const im = new Image(); im.onload = res; im.onerror = () => rej(new Error('آدرس عکس باز نشد (bucket عمومی نیست؟)')); im.src = up.url; });
      setBg('i:' + up.url); msg('✅ پس‌زمینه گذاشته شد');
    } catch (e) {
      // اگه آپلود نشد، نسخهٔ کوچیک عکس مستقیم ذخیره می‌شه تا کار بیفته
      try { const small = await resizeImageFile(file, 720, 0.55); if (('i:' + small).length < 190000) { setBg('i:' + small); msg('✅ گذاشته شد (نسخهٔ سبک؛ آپلود نشد: ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'voice_chat') : (e && e.message || '')) + ')'); return; } } catch (e2) {}
      msg('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'voice_chat') : (e && e.message) || 'عکس آپلود نشد'));
    }
  }
  function toggleBgPop() {
    const dock = $('chatDock'); if (!dock) return; const old = $('vcBgPop'); if (old) { old.remove(); return; }
    const d = document.createElement('div'); d.id = 'vcBgPop'; d.className = 'vc-bgpop';
    d.innerHTML = '<h6>پس‌زمینهٔ مشترک چت (برای هر دو نفر)</h6><div class="vc-bgsw">' + Object.keys(BGS).map(k => '<button type="button" data-bgp="' + k + '" style="background:' + BGS[k] + '" aria-label="' + k + '"></button>').join('') + '</div><div class="vc-bgact"><button type="button" data-bgup>🖼️ عکس خودمون</button><button type="button" data-bgno>🚫 بدون پس‌زمینه</button></div><input type="file" accept="image/*" hidden id="vcBgFile"><h6 data-bgst></h6>';
    dock.appendChild(d); applyBg();
    d.addEventListener('click', e => {
      const p = e.target.closest('[data-bgp]'); if (p) { setBg('p:' + p.dataset.bgp); return; }
      if (e.target.closest('[data-bgno]')) { setBg(''); d.remove(); return; }
      if (e.target.closest('[data-bgup]')) { $('vcBgFile').click(); }
    });
    $('vcBgFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; pickBgImage(f); });
  }

  /* ---------- 😊 پنل ایموجی (کنار چت توی لپ‌تاپ، زیر چت توی موبایل) ---------- */
  const EMO = [
    ['😀', '😀😃😄😁😆😅😂🤣🥲😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🫣🤭🫢🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👻💀☠️👽🤖💩'],
    ['💜', '❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟♥️😻😽💌💋🫶🥹🤝👫💑💏🌹🥀💐🌷🌸🌺🌼🧸🎀🎁💍✨⭐🌟💫🔥🌈☀️🌙⚡❄️'],
    ['👍', '👍👎👌🤌✌️🤞🫰🤟🤘🤙👈👉👆👇☝️👋🤚🖐️✋🖖👏🙌🫶👐🤲🙏✍️💪🦾🫵🤏🤳💅👀👁️👅👄🫦🧠🫀'],
    ['🐱', '🐱🐶🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦆🦉🦄🐝🦋🐌🐞🐢🐍🐙🦑🐠🐬🐳🦈🐘🦒🦓🐎🐕🐈🐇🦔🦦🦥🌳🌴🌵🍀🍁🍂🌻🍄'],
    ['🍕', '🍕🍔🍟🌭🥪🌮🌯🥗🍝🍜🍣🍱🍤🍙🍚🍛🥘🍳🥞🧇🥓🍗🍖🥩🧀🍞🥐🥨🍩🍪🎂🍰🧁🍫🍬🍭🍮🍯🍎🍊🍋🍌🍉🍇🍓🫐🍑🍒🥭🍍🥝🍅🥑🌽🥕☕🍵🧋🥤🍹🍷🥂🍺'],
    ['✈️', '✈️🚗🚕🚌🚎🏎️🚓🚑🚲🛵🏍️🚂🚀🛸⛵🚤🏝️🏖️🏕️⛰️🗻🌋🏰🗼🗽🎡🎢🎠🌃🌆🌉🌅⛺🏠🏡'],
    ['⚽', '⚽🏀🏈⚾🎾🏐🏓🎱🥊🏆🥇🎮🕹️🎲🧩🎯🎳🎨🎭🎬🎤🎧🎸🎹🥁🎻📚📖✏️📷📱💻⌚💡🔮🎉🎊🎈🪄🧿']
  ];
  let emoOpen = false, emoTab = 0, emoUsedNow = [], pendEmoCounted = false;
  const splitEmo = str => { try { return Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(str), x => x.segment); } catch (e) { return Array.from(str); } };
  function renderEmoji() {
    const el = $('vcEmoji'); if (!el) return; el.style.display = emoOpen ? '' : 'none'; if (!emoOpen) return;
    if (!el.dataset.built) { el.dataset.built = '1'; el.innerHTML = '<div class="em-tabs">' + EMO.map((c, i) => '<button type="button" data-et="' + i + '">' + c[0] + '</button>').join('') + '</div><div class="em-grid" id="vcEmGrid"></div>'; el.addEventListener('click', e => { const t = e.target.closest('[data-et]'); if (t) { emoTab = +t.dataset.et; renderEmoji(); return; } const b = e.target.closest('[data-em]'); if (b) insertEmoji(b.dataset.em); }); }
    el.querySelectorAll('[data-et]').forEach(b => b.classList.toggle('on', +b.dataset.et === emoTab));
    $('vcEmGrid').innerHTML = splitEmo(EMO[emoTab][1]).filter(x => x.trim()).map(x => '<button type="button" data-em="' + x + '">' + x + '</button>').join('');
    $('vcEmGrid').scrollTop = 0;
  }
  function insertEmoji(e) {
    const i = $('vcChatInput'); if (!i) return; const a = i.selectionStart == null ? i.value.length : i.selectionStart, b = i.selectionEnd == null ? a : i.selectionEnd;
    if ((i.value.length + e.length) > (i.maxLength || 500)) return;
    i.value = i.value.slice(0, a) + e + i.value.slice(b); const pos = a + e.length; try { i.setSelectionRange(pos, pos); } catch (er) {} i.dispatchEvent(new Event('input')); emoUsedNow.push(e); bumpEmo([e]); if (window.innerWidth >= 1280) i.focus();
  }

  /* ---------- ⭐ ایموجی‌های پرکاربرد ---------- */
  const EMO_DEF = ['❤️', '😂', '🥰', '😍', '😘', '🥺', '😭', '💜', '🤣', '😊', '👍', '🙏'];
  let emoCnt = {}; try { emoCnt = JSON.parse(localStorage.getItem('vc_emo_cnt') || '{}') || {}; } catch (e) {}
  const emoRe = /(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)/gu;
  function bumpEmo(list) {
    if (!list || !list.length) return; list.forEach(e => { if (e && e.length < 16) emoCnt[e] = (emoCnt[e] || 0) + 1; });
    const top = Object.entries(emoCnt).sort((a, b) => b[1] - a[1]).slice(0, 40); emoCnt = Object.fromEntries(top);
    try { localStorage.setItem('vc_emo_cnt', JSON.stringify(emoCnt)); } catch (e) {} renderEmoFav();
  }
  const emoIn = t => String(t || '').match(emoRe) || [];
  let hCache = { n: -1, last: '', c: {} };
  function histCnt() {
    const last = msgs.length ? String(msgs[msgs.length - 1].id) : ''; if (hCache.n === msgs.length && hCache.last === last) return hCache.c;
    const c = {}; msgs.forEach(m => { if (m && m.name !== BOT && m.text) emoIn(m.text).forEach(e => { c[e] = (c[e] || 0) + 1; }); }); hCache = { n: msgs.length, last, c }; return c;
  }
  function favList() {
    const h = histCnt(), tot = Object.assign({}, emoCnt); Object.keys(h).forEach(k => { tot[k] = Math.max(tot[k] || 0, 0) + h[k] * 2; });
    const used = Object.entries(tot).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]); const out = used.slice(0, 12);
    for (const d of EMO_DEF) { if (out.length >= 12) break; if (!out.includes(d)) out.push(d); } return out;
  }
  function renderEmoFav() {
    const el = $('vcEmoFav'); if (!el) return;
    el.innerHTML = '<div class="sc">' + favList().map(e => '<button type="button" data-ef="' + e + '">' + e + '</button>').join('') + '</div><button type="button" class="more" data-efm="1">همه ▾</button>';
  }
  const ctSend = p => { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'ct', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  function onCt(p) {
    if (!p || p.from === ID) return;
    if (p.k === 'typing') { typers[p.who ? 'bot' : p.from] = { name: p.who ? BOT : String(p.name || 'اون یکی').slice(0, 30), until: p.on ? Date.now() + 4500 : 0 }; renderTyping(); }
    else if (p.k === 'del') { const n = msgs.length; msgs = msgs.filter(x => x.id !== p.id); if (msgs.length !== n) { saveMsgs(); renderChat(); } }
    else if (p.k === 'edit') { const m = msgs.find(x => x.id === p.id); if (m && typeof p.text === 'string') { m.text = p.text.slice(0, 500); m.edited = true; saveMsgs(); renderChat(); } }
    else if (p.k === 'bot') { botOn = !!p.on; try { localStorage.setItem('vc_bot', botOn ? '1' : '0'); } catch (e) {} renderBot(); say(botOn ? '🧸 پفیلا روشن شد' : '🧸 پفیلا خاموش شد'); }
    else if (p.k === 'bg') { if (okBg(p.v)) { chatBg = p.v; try { localStorage.setItem('vc_bg', chatBg); } catch (e) {} applyBg(); say('🎨 ' + (String(p.name || 'اون یکی').slice(0, 30)) + ' پس‌زمینهٔ چت رو عوض کرد'); } }
    else if (p.k === 'seen') { const n = String(p.name || ''); seenBy[n] = Math.max(seenBy[n] || 0, Number(p.upto) || 0); renderChat(); }
  }
  function renderTyping() {
    const el = $('vcTyping'); if (!el) return; const now = Date.now();
    const names = Object.keys(typers).filter(k => typers[k].until > now).map(k => typers[k].name);
    el.innerHTML = names.length ? '<span class="vc-dots"><i></i><i></i><i></i></span> ' + esc(names.join(' و ')) + ' داره می‌نویسه…' : '';
    el.style.visibility = names.length ? 'visible' : 'hidden';
    const lst = $('vcChatList'); if (names.length && lst && lst.scrollHeight - lst.scrollTop - lst.clientHeight < 80) lst.scrollTop = lst.scrollHeight;
  }
  setInterval(() => { if (Object.keys(typers).some(k => typers[k].until)) { renderTyping(); Object.keys(typers).forEach(k => { if (typers[k].until <= Date.now()) delete typers[k]; }); } }, 1000);
  const tick = m => { if (!isMine(m.name)) return ''; const done = Object.keys(seenBy).some(n => !isMine(n) && seenBy[n] >= m.ts); return ` <em class="vc-tk${done ? ' seen' : ''}" title="${done ? 'دیده شد' : 'ارسال شد'}">${done ? '✓✓' : '✓'}</em>`; };
  function latestOther() { let t = 0; msgs.forEach(m => { if (!isMine(m.name) && m.ts > t) t = m.ts; }); return t; }
  function markSeen() {
    if (!(window.ChatDock && ChatDock.isOpen()) || document.visibilityState !== 'visible') return;
    const t = latestOther(); if (!t || t <= mySeenSent) return; mySeenSent = t; try { localStorage.setItem('vc_seen_sent', String(t)); } catch (e) {}
    ctSend({ k: 'seen', upto: t });
    try { dbClient.from('voice_chat').upsert({ id: '__seen_' + nm(), name: nm(), text: '', ts: t }).then(() => {}, () => {}); } catch (e) {}
  }
  setInterval(markSeen, 1500);
  function onTyping() {
    const inp = $('vcChatInput'); if (!inp || !inp.value) return; const now = Date.now();
    if (now - lastTypeSent > 2500) { lastTypeSent = now; ctSend({ k: 'typing', on: 1 }); }
    clearTimeout(typeIdle); typeIdle = setTimeout(() => { lastTypeSent = 0; ctSend({ k: 'typing', on: 0 }); }, 3000);
  }
  const rndp = a => a[Math.floor(Math.random() * a.length)];
  const BOT_HELP = 'من پفیلام 🧸 دستیار مشترک شماها! بنویس «پفیلا، …» و از من بخواه: هر سوالی (علمی، تاریخی، آشپزی، برنامه‌نویسی، مشاوره…) 🧠 · ترجمه 🌐 · هوای هر شهر 🌤️ · ریاضی و تبدیل واحد 🧮 · تاریخ و ساعت ⏰ · رویدادها و شمارش معکوس تقویم 📅 · راهنمای همهٔ بخش‌های سایت 🗺️ · جوک 😂 · فال ✨ · ایده برای دیت 💡 · «پیتزا یا برگر؟» 🤔 · سکه 🪙 و تاس 🎲';
  const JOKES = ['به خرگوشه می‌گن چرا گوشات بلنده؟ می‌گه چون هر چی حرف می‌زنن، من اینا رو بلند گوش می‌دم 🐰', 'یارو می‌ره دکتر می‌گه همه‌ش حس می‌کنم نامرئی‌م. دکتر می‌گه: «بعدی!» 😅', 'به لاک‌پشته می‌گن چرا اینقدر آروم؟ می‌گه عجله نکن، خونه رو که همیشه با خودمه 🐢', 'دو تا ابر عاشق هم شدن؛ بعدش از خوشحالی بارون شدن ☁️💧', 'به کامپیوتره می‌گن چرا خسته‌ای؟ می‌گه امروز کلی «کوکی» خوردم 🍪', 'شنیدی ماه چرا همیشه سرحاله؟ چون هر شب «کامل» می‌شه! 🌕'];
  const QS = ['اگه فردا هیچ کاری نداشتیم، کجا می‌رفتیم؟', 'اولین چیزی که از من یادت می‌یاد چیه؟', 'یه خاطرهٔ خنده‌دار از ما که هیچ‌وقت یادت نمی‌ره؟', 'اگه می‌تونستیم یه روز جای هم باشیم، اول چیکار می‌کردی؟', 'یه آرزوی کوچیک که دوست داری با هم برآورده کنیم؟', 'کدوم آهنگ یاد من می‌ندازتت؟', 'بهترین هدیه‌ای که تا حالا گرفتی چی بوده؟', 'ده سال دیگه خودمون رو کجا می‌بینی؟'];
  const DATES = ['🍿 فیلم‌بازی توی اتاق تماشا با یه ظرف پاپ‌کورن', '🎨 هر دو یه طرح آماده رو توی بوم دو نیمه رنگ کنید', '🌙 پیاده‌روی شبانه و بستنی', '🍕 هرکی یه غذای مورد علاقه‌شو بپزه و عکسش رو برای اون یکی بفرسته', '🎧 یه پلی‌لیست مشترک با ۵ آهنگ از هر کدوم', '📞 یه تماس طولانی بدون هیچ دلیل، فقط برای حرف زدن', '🧩 یه بازی حدس کلمه توی بوم'];
  const FORT = ['امروز یه خبر خوب از یه جای غیرمنتظره می‌رسه ✨', 'یه لبخند ساده، یه روز کامل رو عوض می‌کنه 🌸', 'کسی که دوستش داری الان داره بهت فکر می‌کنه 💜', 'یه سورپرایز کوچیک تو راهه، چشماتو باز نگه دار 🎁', 'امشب خوابای قشنگ می‌بینی 🌙'];
  const SWEET = ['منم شماها رو دوست دارم! 🥹💜', 'قلبم رفت تو حالت لرزش 💓', 'این حرف رو بذارید توی دفترچه‌مون، قشنگ‌ترین جملهٔ امروزه 📖'];
  function botAnswer(q, strict) {
    const n = String(q || '').replace(/[؟?!.،,]/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim(), has = (...w) => w.some(x => n.includes(x));
    if (!n || has('راهنما', 'کمک', 'چی بلدی', 'چیکار میکنی', 'چیکار می‌کنی', 'چه کار')) return BOT_HELP;
    if (has('شیر یا خط', 'سکه')) return '🪙 ' + (Math.random() < .5 ? 'شیر' : 'خط') + ' اومد!';
    if (has('تاس')) return '🎲 ' + fa(1 + Math.floor(Math.random() * 6)) + ' اومد!';
    if (n.includes(' یا ')) { const parts = n.split(' یا ').map(s => s.trim()).filter(Boolean); if (parts.length >= 2) return '🤔 اگه من بودم «' + rndp(parts) + '» رو انتخاب می‌کردم! ' + rndp(['دلیلش؟ فقط حسمه 😌', 'چون خوشمزه‌تر به نظر می‌رسه 😋', 'قلبم اینو می‌گه 💜']); }
    if (has('دوستت دارم', 'عاشقتم', 'دوست دارم')) return rndp(SWEET);
    if (has('جوک', 'بخندون', 'شوخی', 'خنده')) return rndp(JOKES);
    if (has('فال')) return '🔮 ' + rndp(FORT);
    if (has('سوال', 'بپرس', 'بازی')) return '❓ ' + rndp(QS);
    if (has('ایده', 'دیت', 'چیکار کنیم', 'کجا بریم', 'برنامه', 'پیشنهاد')) return '💡 پیشنهاد من: ' + rndp(DATES);
    if (has('تاریخ', 'امروز', 'ساعت', 'چندمه', 'چند شنبه')) { try { const w = Recur.epochToWall(Date.now()); return '⏰ امروز ' + Recur.fmtJalaliLong(w.iso) + '، ساعت ' + fa(w.hhmm); } catch (e) { return '⏰ ساعتم خرابه 😅'; } }
    if (has('تشکر', 'مرسی', 'ممنون', 'دمت')) return 'قابل‌شما رو نداشت 🧸';
    if (has('اسم', 'کی هستی', 'تو کی', 'کی هستی')) return 'من پفیلا هستم 🧸 یه دستیار که اینجا بین شما دوتا زندگی می‌کنه. «راهنما» رو بنویس تا بگم چی بلدم.';
    if (has('سلام', 'درود', 'هلو', 'های', 'صبح بخیر', 'شب بخیر')) return rndp(['سلام سلام! 🧸', 'به به! چه خبرا؟ ☁️', 'سلام، من اینجام! 🍬']);
    if (has('خوبی', 'حالت', 'چطوری')) return rndp(['عالیم! امروز کلی پفک خوردم 🧸', 'خوبم، تو چطوری؟ 💜']);
    if (strict) return null;
    return rndp(['هنوز کوچولوام و همه‌چیز نمی‌دونم 🙈 «راهنما» رو بنویس ببین چی بلدم', 'این رو نفهمیدم، ولی دوستت دارم 🧸', 'بذار فکر کنم… نه، نشد! «راهنما» بنویس 😅']);
  }
  function renderBot() {
    const b = $('botToggle'); if (b) { b.classList.toggle('on', botOn); b.title = botOn ? 'پفیلا روشنه (برای خاموش کردن بزن)' : 'پفیلا خاموشه (برای روشن کردن بزن)'; b.setAttribute('aria-pressed', botOn ? 'true' : 'false'); }
    const c = $('vcBot'); if (c) c.style.display = botOn ? '' : 'none';
  }
  function setBot(on) {
    botOn = !!on; try { localStorage.setItem('vc_bot', botOn ? '1' : '0'); } catch (e) {} renderBot(); ctSend({ k: 'bot', on: botOn }); say(botOn ? '🧸 پفیلا روشن شد' : '🧸 پفیلا خاموش شد');
    try { dbClient.from('voice_chat').upsert({ id: '__bot', name: nm(), text: botOn ? '1' : '0', ts: Date.now() }).then(() => {}, () => {}); } catch (e) {}
  }
  function delMsg(id) {
    const m = msgs.find(x => x.id === id); if (!m || !confirm('این پیام برای هر دو حذف بشه؟')) return;
    msgs = msgs.filter(x => x.id !== id); saveMsgs(); renderChat(); ctSend({ k: 'del', id }); if (editing && editing.id === id) { editing = null; const i = $('vcChatInput'); if (i) i.value = ''; renderComposer(); }
    try { dbClient.from('voice_chat').delete().eq('id', id).then(() => {}, () => {}); } catch (e) {}
  }
  function startEdit(id) {
    const m = msgs.find(x => x.id === id); if (!m || !isMine(m.name) || !m.text) return; editing = { id }; replyTo = null; pendImg = null; renderComposer();
    const i = $('vcChatInput'); if (i) { i.value = m.text; i.focus(); }
  }
  function applyEdit(text) {
    const m = msgs.find(x => x.id === editing.id); const id = editing.id; editing = null; renderComposer();
    const i = $('vcChatInput'); if (i) { i.value = ''; i.focus(); }
    if (!m || !text) return; if (text === m.text) return; m.text = text; m.edited = true; saveMsgs(); renderChat(); ctSend({ k: 'edit', id, text });
    try { dbClient.from('voice_chat').update({ text, edited: true }).eq('id', id).then(r => { if (r && r.error) return dbClient.from('voice_chat').update({ text }).eq('id', id); }).then(() => {}, () => {}); } catch (e) {}
  }
  const BOT_RE = /^\s*[@＠]?\s*(?:chat\s*-?\s*gpt|چت\s*[‌-]?\s*جی\s*[‌-]?\s*پی\s*[‌-]?\s*تی|پفیلا)/i;
  const LOCAL_Q = /^(?:راهنما|سکه|تاس|help)/;
  let botBusy = false; const GPT_FN = 'chatgpt';
  async function gptAnswer(q, who) {
    const hist = msgs.filter(m => m.text && !String(m.id || '').startsWith('__')).slice(-14).map(m => ({ role: m.name === BOT ? 'assistant' : 'user', content: (m.name === BOT ? '' : (m.name || '') + ': ') + m.text }));
    if (!hist.length || hist[hist.length - 1].role !== 'user') hist.push({ role: 'user', content: who + ': ' + q });
    const call = n => dbClient.functions.invoke(n, { body: { messages: hist, context: botContext(who) } });
    const r = await Promise.race([call(GPT_FN).then(x => (x && x.error && /not found|404|Failed to send|fetch|relay/i.test(String(x.error.message || x.error))) ? call('dynamic-service') : x, () => call('dynamic-service')), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000))]);
    if (r && r.error) { let d = ''; try { const c = r.error.context; if (c && c.json) { const j = await c.json(); d = j && (j.error || j.message || j.msg) || ''; } else if (c && c.text) d = await c.text(); } catch (e2) {} const er = new Error((d ? String(d) : '') + ' | ' + String(r.error.message || r.error)); er.detail = d; er.status = r.error.context && r.error.context.status; throw er; } const t = r && r.data && r.data.reply; if (!t) throw new Error((r && r.data && r.data.error) || 'empty'); return String(t);
  }

  /* ---------- 🧠 پفیلای باهوش: ریاضی، هوا، ویکی‌پدیا (بدون کلید و رایگان) ---------- */
  const toEn = t => String(t || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[×✕]/g, '*').replace(/÷/g, '/').replace(/٫/g, '.').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  function mathAns(q) {
    let e = toEn(q).replace(/(\d+(?:\.\d+)?)\s*(?:درصد|%)\s*(?:از|ِ)?\s*(\d+(?:\.\d+)?)/, '($1/100*$2)').replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2').replace(/\^/g, '**').replace(/(\d)\s*(?:به توان)\s*(\d)/g, '$1**$2').replace(/(\d)\s+(?:بعلاوه|به علاوه|جمع)\s+(\d)/g, '$1+$2').replace(/(\d)\s+(?:منهای|تفریق)\s+(\d)/g, '$1-$2').replace(/(\d)\s+(?:ضربدر|ضرب در)\s+(\d)/g, '$1*$2').replace(/(\d)\s+(?:تقسیم بر|تقسیم)\s+(\d)/g, '$1/$2');
    const m = e.match(/[\d.(][\d\s+\-*/%().]*[\d)]/); if (!m) return null; let x = m[0].trim();
    if (!/\d\s*(?:\*\*|[-+*/%])\s*[\d(]|\(.*\)/.test(x) || /^\d+\/\d+\/\d+$/.test(x)) return null;
    try { const v = Function('"use strict";return (' + x + ')')(); if (typeof v !== 'number' || !isFinite(v)) return null; return '🧮 ' + x.replace(/\*\*/g, '^').replace(/\*/g, '×') + ' = ' + fa(Number(v.toFixed(6))); } catch (er) { return null; }
  }
  const WMO = { 0: 'آسمون صاف ☀️', 1: 'تقریباً صاف 🌤️', 2: 'کمی ابری ⛅', 3: 'ابری ☁️', 45: 'مه‌آلود 🌫️', 48: 'مه‌آلود 🌫️', 51: 'نم‌نم بارون 🌦️', 53: 'نم‌نم بارون 🌦️', 55: 'بارون ریز 🌦️', 61: 'بارون 🌧️', 63: 'بارون 🌧️', 65: 'بارون شدید 🌧️', 71: 'برفی 🌨️', 73: 'برف 🌨️', 75: 'برف سنگین ❄️', 80: 'رگبار 🌦️', 81: 'رگبار 🌧️', 82: 'رگبار شدید ⛈️', 95: 'رعدوبرق ⛈️', 96: 'رعدوبرق و تگرگ ⛈️', 99: 'رعدوبرق و تگرگ ⛈️' };
  const getJ = async (u, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 8000); try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('http'); return await r.json(); } finally { clearTimeout(t); } };
  async function weatherAns(n) {
    const mm = n.match(/هوا(?:ی)?\s+(?:شهر\s+)?([^\s]+(?:\s[^\s]+)?)/); let city = mm ? mm[1] : ''; city = city.replace(/\s*(?:چطوره|چطور|چجوریه|چیه|الان|امروز|فردا|چه)\b.*$/, '').trim(); if (!city) return null;
    const g = await getJ('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fa&name=' + encodeURIComponent(city)); const p = g.results && g.results[0]; if (!p) return null;
    const w = await getJ('https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&latitude=' + p.latitude + '&longitude=' + p.longitude).then(j => j.current); if (!w) return null;
    return '🌍 هوای ' + (p.name || city) + ' الان: ' + (WMO[w.weather_code] || 'نامشخص') + '، ' + fa(Math.round(w.temperature_2m)) + '° درجه، رطوبت ' + fa(Math.round(w.relative_humidity_2m)) + '٪، باد ' + fa(Math.round(w.wind_speed_10m)) + ' کیلومتر بر ساعت';
  }
  const WQ = /(چیه|چیست|کیه|کیست|کی بود|چی بود|چی هست|کجاست|کجا هست|یعنی چی|یعنی چه|معنی|درباره|توضیح|بگو|چه کسی|پایتخت|تاریخچه|رو بگو)/;
  async function wikiAns(n) {
    if (!WQ.test(n)) return null;
    let t = n.replace(/(معنی|یعنی چی|یعنی چه|چیه|چیست|کیه|کیست|کی بود|چی بود|چی هست|کجاست|کجا هست|درباره|توضیح بده|توضیح|بگو|بده|رو بگو|لطفا|پفیلا|chatgpt)/gi, ' ').replace(/\s(?:رو|را|ی|ـ)\s/g, ' ').replace(/\s+/g, ' ').trim(); if (t.length < 2) return null;
    const sr = await getJ('https://fa.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=' + encodeURIComponent(t)); const hit = sr.query && sr.query.search && sr.query.search[0]; if (!hit) return null;
    const sm = await getJ('https://fa.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(hit.title.replace(/ /g, '_'))); let x = String(sm.extract || '').trim(); if (!x || x.length < 20) return null;
    if (x.length > 420) { const cut = x.slice(0, 420), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('؛ '), cut.lastIndexOf('، ')); x = (i > 120 ? cut.slice(0, i + 1) : cut) + '…'; }
    return '📚 ' + (sm.title || hit.title) + ': ' + x + ' (ویکی‌پدیا)';
  }

  /* ---------- 🧠 دانش پفیلا ---------- */
  const SITE_KB = [
    [/منوی اصلی|صفحه اول|زنبور/, '✨ «منوی اصلی» صفحهٔ اوله: زنبور ناز، افکت‌های رنگی و کاشی‌های همهٔ بخش‌ها. به زنبور دست بزن تا بخنده، دو بار پشت‌سرهم بزنی پرواز می‌کنه 🐝'],
    [/دفترچه|خاطره|فصل/, '📖 «دفترچه» جاییه که خاطره‌ها و فصل‌هاتون رو می‌نویسید؛ زیر هر نوشته می‌شه کامنت گذاشت و آهنگ پس‌زمینهٔ آروم پخش می‌شه.'],
    [/پلی\s*لیست|آهنگ|موزیک/, '🎵 توی «پلی‌لیست» آهنگ‌هاتون رو آپلود می‌کنید یا لینک می‌دید و پلیر بالای صفحه پخششون می‌کنه. با «گوش دادن با هم» هر دو همزمان یک آهنگ رو می‌شنوید.'],
    [/گالری|عکس|ویدیو/, '🖼️ «گالری» برای عکس و ویدیوهاست. می‌شه چندتا رو با هم آپلود کرد (با نوار پیشرفت)، چندتایی انتخاب و حذف یا به پوشه منتقل کرد.'],
    [/پوشه/, '📁 پوشه: توی سینما، گیم، گالری، فایل‌ها و بوم بالای صفحه «➕ پوشهٔ جدید» رو بزن، اسم بنویس و Enter. داخل پوشه می‌شه پوشهٔ دیگه ساخت. برای انتقال از دکمهٔ 📂 روی هر مورد یا کشیدن و رها کردن روی پوشه استفاده کن، یا داخل پوشه «➕ افزودن از موجودها» رو بزن.'],
    [/فایل/, '📁 «فایل‌ها» برای هر نوع فایل (pdf، زیپ، …) که می‌خواید نگه دارید. موقع آپلود، درصد و سرعت دیده می‌شه و می‌شه توی پوشه گذاشتشون.'],
    [/گیم|بازی/, '🎮 «گیم» لینک و اسم گیم‌هاتونه. عکس هر گیم خودکار از روی اسم انگلیسیش میاد، پس اسم رو دقیق بنویس (مثلاً Minecraft).'],
    [/اتاق\s*تماشا|فیلم|سریال|سینما|زیرنویس/, '🍿 «سینما» لینک فیلم و سریاله. «اتاق تماشا» فیلم رو برای هر دو همزمان پخش می‌کنه: از آرشیو یا آپلود از سیستم (mp4، webm، mkv) یا لینک مستقیم. زیرنویس توی خود فایل mkv/webm خونده می‌شه و می‌شه اندازه و شکلش رو عوض کرد. برای چند لینک یک‌جا از «اضافهٔ چند لینک یک‌جا» استفاده کن.'],
    [/اسکرین\s*شیر|اشتراک\s*صفحه|صفحه\s*نمایش/, '🖥️ «اسکرین‌شیر» توی اتاق صحبته: صفحه‌ات رو زنده برای اون یکی نشون می‌دی. اگه وصل نشه خودش دوباره تلاش می‌کنه و اطلاعات فنی اتصال رو می‌تونی ببینی.'],
    [/اتاق\s*صحبت|تماس|مکالمه/, '🎙️ «اتاق صحبت» برای تماس صوتیه؛ وارد شو، میکروفن رو روشن کن و مدت تماس‌هاتون ثبت می‌شه.'],
    [/بوم|نقاشی|حدس\s*کلمه/, '🎨 «بوم» برای نقاشیه: قالب‌های محو برای پر رنگ کردن، قلم‌ها و رنگ‌ها، ذخیره توی گالری، کامنت زیر نقاشی‌ها و بازی «حدس کلمه».'],
    [/تقویم|رویداد|یادآوری|کلاس/, '📅 «تقویم» شمسیه و تاریخ میلادی هم کوچیک زیرش هست. روی هر روز بزن تا رویداد یا یادآوری بذاری (تکرارشونده هم می‌شه) و تب «کلاس‌ها» برنامهٔ زوج/فرد داره.'],
    [/باغ/, '🌳 «باغ» یه باغ مشترکه که با هم می‌کاریدش و بزرگ می‌شه.'],
    [/پازل/, '🧩 «پازل» یه بازی دونفرهٔ تصویریه که با عکس‌های خودتون درست می‌شه.'],
    [/سؤال\s*روز|سوال\s*روز/, '❓ «سؤال روز» هر روز یه سوال می‌پرسه و جواب هر دو بعد از ثبت دیده می‌شه.'],
    [/یادداشت/, '📝 «یادداشت‌ها» برای نوشته‌های کوتاه و لیست‌هاتونه.'],
    [/گربه/, '🐱 گربه‌های سایت (وقتی مهمونن یا توی «گربه‌های ما» توی پروفایل) با شما بازی می‌کنن.'],
    [/پروفایل/, '👤 «پروفایل» اسم، عکس و گربه‌هاتونه و ته صفحه‌اش امضای Created by Love 😇 هست.'],
    [/چت|پیام|لینک|ریپلای|ویرایش\s*پیام/, '💬 «چت کوچولو»: پیام و عکس بفرست (آپلود عکس از لحظهٔ انتخاب شروع می‌شه و می‌تونی همزمان چت کنی)، روی پیام ریپلای بزن، پیام خودت رو ویرایش کن و لینک‌ها قابل‌کلیک‌ان. من هم با «پفیلا، …» جواب می‌دم.'],
    [/آپدیت|بروزرسانی|چی\s*اضافه/, '✨ دکمهٔ ✨ بالای صفحه لیست آخرین آپدیت‌ها رو نشون می‌ده.']
  ];
  const siteAns = n => {
    if (!/(چطور|چجوری|چگونه|کجا|چیه|چی هست|چیکار|چه کار|بلدی|راهنما|کاربرد|میشه|می‌شه|چی بذارم|برای چیه|چه)/.test(n)) return null;
    const hit = SITE_KB.filter(([re]) => re.test(n)).slice(0, 2); return hit.length ? hit.map(h => h[1]).join('\n\n') : null;
  };
  const evList = (from, days) => {
    const out = []; try {
      const evs = (typeof eventsCache !== 'undefined' && eventsCache) || [];
      for (let i = 0; i <= days; i++) { const iso = Recur.addDaysIso(from, i); evs.forEach(e => { if (e.repeat === 'hours' ? e.event_date === iso : Recur.occursOn(e, iso)) out.push({ iso, e, i }); }); }
    } catch (er) {} return out;
  };
  function dateAns(n) {
    const w = Recur.epochToWall(Date.now()), d = new Date();
    if (/ساعت\s*(?:الان)?\s*(?:چنده|چند)|الان\s*ساعت|ساعت\s*چنده/.test(n)) return '⏰ الان ساعت ' + fa(w.hhmm) + ' است.';
    if (/(?:تاریخ|امروز|الان)[^.]*(?:چندمه|چنده|چندم|چه\s*روز|چی\s*هست)|چندمه|چه\s*روزیه|چند\s*شنبه|تاریخ\s*(?:امروز|میلادی|شمسی)|امروز\s*چه/.test(n)) return '📅 امروز ' + Recur.fmtJalaliLong(w.iso) + ' است (' + d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ') و ساعت ' + fa(w.hhmm) + '.';
    return null;
  }
  function eventsAns(n) {
    const asks = /(رویداد|مناسبت|یادآوری|برنامه|مونده|مانده|بعدی|قرار)/.test(n); if (!asks) return null;
    const today = Recur.todayIso();
    const m = n.match(/چند\s*روز\s*(?:مونده|مانده|دیگه)?\s*(?:به|تا)\s*(.+)$/);
    if (m) {
      const key = m[1].replace(/\s*(?:مونده|مانده)\s*$/, '').trim(); const f = evList(today, 366).find(x => x.e.title && (x.e.title.includes(key) || key.includes(x.e.title)));
      if (f) return '⏳ تا «' + f.e.title + '» ' + (f.i === 0 ? 'امروزه! 🎉' : fa(f.i) + ' روز مونده (' + Recur.fmtJalaliShort(f.iso) + ')');
      return null;
    }
    const days = /امروز/.test(n) ? 0 : /فردا/.test(n) ? 1 : /(هفته)/.test(n) ? 7 : /ماه/.test(n) ? 30 : 30;
    let list = evList(days === 1 ? Recur.addDaysIso(today, 1) : today, days === 1 ? 0 : days); if (!/امروز|فردا|هفته|ماه|بعدی|نزدیک|مونده/.test(n)) return null;
    if (/بعدی/.test(n)) list = list.slice(0, 1);
    if (!list.length) return '📅 ' + (days === 0 ? 'امروز' : days === 1 ? 'فردا' : 'توی این بازه') + ' رویدادی توی تقویم ثبت نشده 💜';
    return '📅 رویدادها:\n' + list.slice(0, 6).map(x => (x.e.emoji || '💜') + ' ' + x.e.title + ' — ' + (x.i === 0 && days !== 1 ? 'امروز' : Recur.fmtJalaliShort(x.iso))).join('\n');
  }
  const UNITS = { 'کیلومتر': ['l', 1000], 'کیلو متر': ['l', 1000], 'متر': ['l', 1], 'سانتی متر': ['l', .01], 'سانتیمتر': ['l', .01], 'مایل': ['l', 1609.344], 'فوت': ['l', .3048], 'اینچ': ['l', .0254], 'کیلوگرم': ['m', 1], 'کیلو': ['m', 1], 'گرم': ['m', .001], 'پوند': ['m', .45359237], 'اونس': ['m', .0283495], 'لیتر': ['v', 1], 'گالن': ['v', 3.785411784], 'سانتی گراد': ['t', 'c'], 'سانتیگراد': ['t', 'c'], 'درجه سانتی گراد': ['t', 'c'], 'فارنهایت': ['t', 'f'], 'کلوین': ['t', 'k'] };
  function unitAns(q) {
    const n = toEn(q).replace(/ي/g, 'ی').replace(/\s+/g, ' ');
    const num = n.match(/(-?\d+(?:\.\d+)?)/); if (!num) return null;
    const names = Object.keys(UNITS).sort((a, b) => b.length - a.length), found = [];
    let rest = n; names.forEach(k => { const i = rest.indexOf(k); if (i >= 0) { found.push({ k, i }); rest = rest.slice(0, i) + ' '.repeat(k.length) + rest.slice(i + k.length); } });
    if (found.length < 2) return null; found.sort((a, b) => a.i - b.i); const from = found[0].k, to = found[1].k, a = UNITS[from], b = UNITS[to]; if (a[0] !== b[0]) return null;
    const x = Number(num[1]); let r;
    if (a[0] === 't') { const c = a[1] === 'c' ? x : a[1] === 'f' ? (x - 32) * 5 / 9 : x - 273.15; r = b[1] === 'c' ? c : b[1] === 'f' ? c * 9 / 5 + 32 : c + 273.15; }
    else r = x * a[1] / b[1];
    return '📐 ' + fa(x) + ' ' + from + ' ≈ ' + fa(Number(r.toFixed(3))) + ' ' + to;
  }
  async function translateAns(q) {
    const m = q.match(/^(?:ترجمه(?:\s*کن)?|translate)\s*[:：]?\s*(.+)$/i) || q.match(/^(.+?)\s*(?:رو|را)?\s*(?:به|بە)\s*(انگلیسی|فارسی|عربی|ترکی|فرانسه|آلمانی|اسپانیایی|ایتالیایی|روسی)\s*(?:بگو|ترجمه کن|چی میشه|چی می‌شه|چی میگن|چی می‌گن|چیه)?\s*$/i);
    if (!m) return null; let txt = (m[1] || '').trim(), tl = m[2] || ''; if (!txt) return null;
    const CODE = { 'انگلیسی': 'en', 'فارسی': 'fa', 'عربی': 'ar', 'ترکی': 'tr', 'فرانسه': 'fr', 'آلمانی': 'de', 'اسپانیایی': 'es', 'ایتالیایی': 'it', 'روسی': 'ru' };
    const latin = (txt.match(/[A-Za-z]/g) || []).length > txt.length / 2; const to = CODE[tl] || (latin ? 'fa' : 'en'), from = latin ? 'en' : 'fa';
    if (from === to) return null;
    const j = await getJ('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(txt.slice(0, 400)) + '&langpair=' + from + '|' + to);
    const t = j && j.responseData && String(j.responseData.translatedText || '').trim(); if (!t || /MYMEMORY|INVALID/i.test(t)) return null;
    return '🌐 ' + t;
  }
  function botContext(who) {
    let c = '';
    try {
      const w = Recur.epochToWall(Date.now());
      c += 'زمان الان: ' + Recur.fmtJalaliLong(w.iso) + ' (' + new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ') ساعت ' + w.hhmm + ' به وقت ایران.\\n';
      c += 'کسی که الان باهات حرف می‌زنه: ' + (who || 'ناشناس') + '.\\n';
      const ev = evList(Recur.todayIso(), 21).slice(0, 6); if (ev.length) c += 'رویدادهای نزدیک تقویم‌شون: ' + ev.map(x => x.e.title + ' (' + Recur.fmtJalaliShort(x.iso) + ')').join('، ') + '.\\n';
    } catch (e) {}
    c += 'بخش‌های سایت Our Memories: منوی اصلی، دفترچه (خاطره)، پلی‌لیست (آهنگ و گوش دادن با هم)، گالری، فایل‌ها، گیم، سینما (فیلم، سریال، اتاق تماشا با زیرنویس)، بوم (نقاشی و حدس کلمه)، اتاق صحبت (تماس صوتی و اسکرین‌شیر)، باغ، پازل، سؤال روز، یادداشت‌ها، تقویم (شمسی با میلادی)، پروفایل، چت. در گیم/سینما/گالری/فایل‌ها/بوم می‌شه پوشه (تو در تو) ساخت.';
    return c.slice(0, 1800);
  }
  let gptDownUntil = 0;
  async function smartAnswer(q) {
    const n = toEn(q).replace(/[؟?!.،,]/g, ' ').replace(/\s+/g, ' ').trim();
    /* مهارت‌های دقیق و محلی اول؛ جواب‌شون قطعیه و به اینترنت یا کلید نیاز نداره */
    let r = mathAns(q); if (r) return r;
    r = dateAns(n); if (r) return r;
    r = eventsAns(n); if (r) return r;
    r = unitAns(q); if (r) return r;
    r = siteAns(n); if (r) return r;
    if (/هوا/.test(n)) { try { r = await weatherAns(n); if (r) return r; } catch (e) {} }
    try { r = await translateAns(q.trim()); if (r) return r; } catch (e) {}
    if (Date.now() > gptDownUntil) { try { return await gptAnswer(q, nm()); } catch (e) { gptDownUntil = Date.now() + 10 * 60000; } }
    r = botAnswer(q, true); if (r) return r;
    try { r = await wikiAns(n); if (r) return r; } catch (e) {}
    return botAnswer(q);
  }
  function botMaybe(text) {
    if (!botOn || !BOT_RE.test(text || '')) return; const q = text.replace(BOT_RE, '').replace(/^[\s،,:؛]+/, '');
    if (botBusy) { say('⏳ پفیلا هنوز داره جواب قبلی رو می‌نویسه'); return; } botBusy = true;
    typers.bot = { name: BOT, until: Date.now() + 30000 }; renderTyping(); ctSend({ k: 'typing', on: 1, who: BOT });
    const finish = ans => {
      botBusy = false; const ts = Date.now(), id = 'm_' + ts + '_bot' + ID, p = { from: ID, id, name: BOT, text: ans, ts, img: '', reply: null };
      delete typers.bot; ctSend({ k: 'typing', on: 0, who: BOT });
      try { ch.send({ type: 'broadcast', event: 'chat', payload: p }); } catch (e) {}
      addMsg({ id, name: BOT, text: ans, ts, img: '', reply: null }); saveMsgs(); renderChat(); renderTyping(); blip('recv');
      try { dbClient.from('voice_chat').upsert({ id, name: BOT, text: ans, ts }).then(() => {}, () => {}); } catch (e) {}
    };
    if (!q || LOCAL_Q.test(q)) { setTimeout(() => finish(botAnswer(q)), 700 + Math.random() * 500); return; }
    smartAnswer(q).then(finish).catch(() => finish(botAnswer(q)));
  }

  /* ---------- 📷 تصویر و ↩︎ ریپلای توی چت ---------- */
  let pendImg = null, replyTo = null, chatSending = false;
  function renderComposer() {
    const el = $('vcComposer'); if (!el) return;
    let h = '';
    if (editing) h += `<div class="vc-cmp"><span>✏️ ویرایش پیام</span><button type="button" data-cmp="noedit" aria-label="لغو ویرایش">✕</button></div>`;
    if (replyTo) h += `<div class="vc-cmp"><span>↩︎ پاسخ به <b>${esc(replyTo.name)}</b>: ${esc((replyTo.text || '📷 تصویر').slice(0, 60))}</span><button type="button" data-cmp="noreply" aria-label="لغو ریپلای">✕</button></div>`;
    if (pendImg) { const pi = pendImg, st = pi.failed ? '⚠️ آپلود نشد؛ دکمهٔ ارسال دوباره امتحان می‌کنه' : pi.up ? (pi.auto ? '⏳ بعد از آپلود خودش ارسال می‌شه · ' : '') + (pi.label || 'در حال آپلود…') : 'تصویر آماده ارسال'; h += `<div class="vc-cmp${pi.up ? ' up' : ''}"><img src="${esc(pi.preview)}" alt=""><span id="vcUpTxt">${st}</span><button type="button" data-cmp="noimg" aria-label="${pi.up ? 'لغو آپلود' : 'حذف تصویر'}">✕</button>${pi.up ? '<div class="vc-upb"><i id="vcUpBar" style="width:' + (pi.pct || 0) + '%"></i></div>' : ''}</div>`; }
    el.innerHTML = h; el.style.display = h ? '' : 'none';
  }
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' مگابایت' : Math.max(1, Math.round(n / 1024)).toLocaleString('fa-IR') + ' کیلوبایت';
  /* آپلود از همون لحظهٔ انتخاب عکس شروع می‌شه؛ تا تموم نشده هم می‌شه چت کرد. اگه «ارسال» رو قبل از تموم‌شدن بزنی، عکس (با متنی که نوشتی) بعد از آپلود خودش می‌ره */
  function startUpload(pi) {
    pi.up = true; pi.failed = false; pi.pct = 0; pi.label = 'در حال آپلود…'; pi.ctl = { abort() {} }; renderComposer();
    uploadMediaFile(pi.blob, 'jpg', 'chat.jpg', { ctl: pi.ctl, onProgress: (l, t) => { const pc = Math.min(100, Math.round(l / t * 100)); pi.pct = pc; pi.label = pc.toLocaleString('fa-IR') + '٪ · ' + kb(l) + ' از ' + kb(t); if (pendImg !== pi) return; const b = $('vcUpBar'), x = $('vcUpTxt'); if (b) b.style.width = pc + '%'; if (x) x.textContent = (pi.auto ? '⏳ بعد از آپلود خودش ارسال می‌شه · ' : '') + pi.label; } })
      .then(up => {
        pi.up = false; pi.url = up.url; if (pendImg !== pi) return;
        if (pi.auto) { const a = pi.auto; pendImg = null; renderComposer(); if (!ch || !subscribed) { say('⏳ وصل نشد؛ عکس ارسال نشد'); return; } postMsg(a.text, pi.url, a.reply); renderChat(); }
        else renderComposer();
      })
      .catch(e => {
        pi.up = false; if (pendImg !== pi) return;
        if (e && e.cancelled) { pendImg = null; say('⛔ آپلود لغو شد'); }
        else { pi.failed = true; pi.auto = null; say('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'voice_chat') : 'تصویر آپلود نشد')); }
        renderComposer();
      });
  }
  async function pickImage(file) {
    if (!file || !/^image\//.test(file.type)) return;
    try {
      const url = await resizeImageFile(file, 2000, 0.9);
      if (pendImg && pendImg.up && pendImg.ctl) pendImg.ctl.abort();
      const pi = pendImg = { blob: dataUrlToBlob(url), preview: url, up: true };
      startUpload(pi); const i = $('vcChatInput'); if (i) i.focus();
    } catch (e) { say('⚠️ این تصویر باز نشد'); }
  }
  function zoom(src) {
    const d = document.createElement('div'); d.className = 'vc-zoom'; d.innerHTML = '<img src="' + esc(src) + '" alt="">';
    d.addEventListener('click', () => d.remove()); document.body.appendChild(d);
  }
  const REPLY_COLS = /reply_id|reply_name|reply_text|img|column/i;
  async function sendChat() {
    const inp = $('vcChatInput'); if (!inp || chatSending) return; const text = inp.value.trim().slice(0, 500); if (editing) { if (!text) { delMsg(editing.id); return; } applyEdit(text); return; } if (!text && !pendImg) return;
    if (!ch || !subscribed) { say('⏳ هنوز وصل نشده؛ چند لحظه دیگه'); return; }
    let img = '';
    if (pendImg && !pendImg.auto) {
      const pi = pendImg, rp = replyTo ? { id: replyTo.id, name: replyTo.name, text: (replyTo.text || '').slice(0, 120) } : null;
      if (pi.failed) startUpload(pi);
      if (pi.up) { pi.auto = { text, reply: rp }; inp.value = ''; replyTo = null; renderComposer(); inp.focus(); return; }   // هنوز آپلود نشده: صف می‌شه و می‌شه چت کرد
      img = pi.url; pendImg = null;
    }
    if (!text && !img) return;
    postMsg(text, img, replyTo ? { id: replyTo.id, name: replyTo.name, text: (replyTo.text || '').slice(0, 120) } : null);
    replyTo = null; renderComposer(); renderChat(); inp.value = ''; inp.focus();
  }
  function postMsg(text, img, reply) {
    const inp = $('vcChatInput');
    if (!pendEmoCounted) bumpEmo(emoIn(text).filter(x => !emoUsedNow.includes(x))); emoUsedNow = []; pendEmoCounted = false;
    const ts = Date.now(), id = 'm_' + ts + '_' + ID, p = { from: ID, id, name: nm(), text, ts, img, reply };
    try { ch.send({ type: 'broadcast', event: 'chat', payload: p }); } catch (e) {}
    clearTimeout(typeIdle); lastTypeSent = 0; ctSend({ k: 'typing', on: 0 }); botMaybe(text);
    addMsg({ id, name: p.name, text, ts, img, reply }); saveMsgs(); blip('send');
    const full = { id, name: p.name, text, ts, img: img || null, reply_id: reply ? reply.id : null, reply_name: reply ? reply.name : null, reply_text: reply ? reply.text : null };
    const bad = r => r && r.error && /voice_chat|relation|schema cache/i.test(r.error.message || '');
    dbClient.from('voice_chat').upsert(full).then(r => {
      if (r && r.error && REPLY_COLS.test(r.error.message || '') && !/relation/i.test(r.error.message || '')) {   // ستون‌های جدید (SQL شمارهٔ ۲۳) هنوز ساخته نشدن؛ حداقل متن ذخیره بشه
        if (!warnedChat) { warnedChat = true; say('⚠️ برای ماندگار شدن تصویر و ریپلای، بلوک ۲۳ فایل SQL رو یک بار اجرا کن'); }
        return dbClient.from('voice_chat').upsert({ id, name: p.name, text: text || (img ? '📷 تصویر' : ''), ts });
      }
      return r;
    }).then(r => {
      if (bad(r)) { chatMissing = true; renderChat(); if (!warnedChat) { warnedChat = true; say('⚠️ برای ماندگار شدن پیام‌ها، بلوک ۲۱ فایل SQL رو یک بار توی Supabase اجرا کن'); } }
    }).catch(() => {});
  }

  function diagText() {
    const L = [];
    L.push('کانال: ' + (subscribed ? 'وصل' : 'وصل نیست') + ' | حضور (presence) دیگران: ' + (ch && subscribed ? others().length : '-') + ' | تو توی تماس: ' + (joined ? 'بله' : 'نه') + (noMic ? ' (بدون میکروفون)' : ''));
    L.push('مسیر پشتیبان: فرستاده ' + (diag.tx || 0) + ' بسته | دریافت‌شده ' + (diag.rx || 0) + ' تکه صدا | WebCodecs: ' + (WC() ? 'هست' : 'نیست'));
    L.push('پیام‌های سیگنال فرستاده: ' + JSON.stringify(diag.sent) + ' | گرفته: ' + JSON.stringify(diag.recv));
    Object.keys(peers).forEach(id => { const P = peers[id], pc = P.pc;
      L.push('— ' + P.name + ': اتصال=' + pc.connectionState + ' ice=' + pc.iceConnectionState + ' جمع‌آوری=' + pc.iceGatheringState + ' signaling=' + pc.signalingState + ' | کاندیدهای من ' + JSON.stringify(P.lc) + ' | کاندیدهای دریافتی ' + P.rc + ' | تلاش=' + (P.tries || 0)); });
    if (diag.errs.length) L.push('خطاهای ICE: ' + diag.errs.join(' ; '));
    L.push('مرورگر: ' + (navigator.userAgent || '').slice(0, 90));
    return L.join('\n');
  }
  function load() { connectChannel(); render(); renderChat(); loadCalls(); loadChat(); }
  function init() {
    const box = $('voiceBox'); if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-vc]'); if (!b) return;
      const a = b.dataset.vc;
      if (a === 'join') join(); else if (a === 'leave') leave(); else if (a === 'mic') toggleMic(); else if (a === 'retrymic') { leave(true); join(); } else if (a === 'retry') { Object.keys(peers).forEach(id => retryPeer(id, false)); } else if (a === 'deaf') toggleDeaf();
    });
    const f = $('vcChatForm'); if (f) f.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
    const ci = $('vcChatInput'); if (ci) { ci.addEventListener('input', () => { ci.dir = txDir(ci.value); }); ci.addEventListener('input', onTyping); }
    const ef = $('vcEmoFav'); if (ef) ef.addEventListener('click', e => { const b = e.target.closest('[data-ef]'); if (b) { insertEmoji(b.dataset.ef); return; } if (e.target.closest('[data-efm]')) { emoOpen = !emoOpen; renderEmoji(); } }); renderEmoFav();
    const eb = $('vcEmoBtn'); if (eb) eb.addEventListener('click', () => { emoOpen = !emoOpen; renderEmoji(); });
    const gb = $('bgBtn'); if (gb) gb.addEventListener('click', toggleBgPop); applyBg();
    const bb = $('vcBot'); if (bb) bb.addEventListener('click', e => { const b = e.target.closest('[data-bot]'); if (!b) return; const i = $('vcChatInput'); if (i) { i.value = 'پفیلا، ' + b.dataset.bot; sendChat(); } });
    const pk = $('vcImgPick'); if (pk) pk.addEventListener('change', () => { const fl = pk.files && pk.files[0]; pk.value = ''; pickImage(fl); });
    const imgOf = dt => { const it = dt && dt.items ? Array.from(dt.items).find(i => i.kind === 'file' && /^image\//.test(i.type)) : null; const f = it ? it.getAsFile() : (dt && dt.files ? Array.from(dt.files).find(x => /^image\//.test(x.type)) : null); return f || null; };
    const ci2 = $('vcChatInput'); if (ci2) ci2.addEventListener('paste', e => { const f = imgOf(e.clipboardData); if (f) { e.preventDefault(); pickImage(f); } });
    const cf = $('vcChatForm'); if (cf) { cf.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); }); cf.addEventListener('drop', e => { const f = imgOf(e.dataTransfer); if (f) { e.preventDefault(); pickImage(f); } }); }
    const cb = $('vcImgBtn'); if (cb && pk) cb.addEventListener('click', () => pk.click());
    const cmp = $('vcComposer'); if (cmp) cmp.addEventListener('click', e => { const b = e.target.closest('[data-cmp]'); if (!b) return; if (b.dataset.cmp === 'noreply') replyTo = null; else if (b.dataset.cmp === 'noedit') { editing = null; const i = $('vcChatInput'); if (i) i.value = ''; } else { if (pendImg && pendImg.up && pendImg.ctl) pendImg.ctl.abort(); pendImg = null; } renderComposer(); });
    const cl0 = $('vcChatList'); if (cl0) { cl0.addEventListener('click', e => { if (e.target.closest('#vcOlder')) loadOlder(); }); cl0.addEventListener('scroll', () => { if (cl0.scrollTop < 80 && hasMore && !loadingOld) loadOlder(); }, { passive: true }); }
    const cl = $('vcChatList'); if (cl) cl.addEventListener('click', e => {
      const z = e.target.closest('[data-zoom]'); if (z) { zoom(z.dataset.zoom); return; }
      const eb = e.target.closest('[data-edit]'); if (eb) { startEdit(eb.dataset.edit); return; }
      const db = e.target.closest('[data-del]'); if (db) { delMsg(db.dataset.del); return; }
      const rb = e.target.closest('[data-reply]'); if (rb) { const m = msgs.find(x => x.id === rb.dataset.reply); if (m) { replyTo = { id: m.id, name: m.name, text: m.text }; renderComposer(); const i = $('vcChatInput'); if (i) i.focus(); } return; }
      const g = e.target.closest('[data-goto]'); if (g) { const t = cl.querySelector('[data-mid="' + CSS.escape(g.dataset.goto) + '"]'); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1400); } }
    });
    const bt = $('botToggle'); if (bt) bt.addEventListener('click', () => setBot(!botOn));
    renderBot(); renderComposer();
    window.addEventListener('pagehide', () => leave(true));
    window.addEventListener('offline', () => { if (joined) { say('📶 اینترنتت قطع شد'); blip('down'); } });
    window.addEventListener('online', () => { if (joined) { say('📶 اینترنت برگشت'); blip('up'); } });
    render(); renderChat();
    setInterval(() => { const d = $('vcDiag'), box = $('vcDiagBox'); if (d && box && box.open) d.textContent = diagText(); }, 1000);
  }
  window.Voice = { _setRelayDelay: ms => { relayDelay = ms; }, _diag: diagText, busy: () => joined || (typeof currentScreen !== 'undefined' && currentScreen === 'voice'), _calls: () => callRows, _fmt: fmtDur, _peers: () => peers, load, join, leave, init, _state: () => ({ joined, micOn, deaf, id: ID, peers: Object.keys(peers).map(k => [k, peers[k].state]), sending }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
