/* 🎙️ اتاق صحبت (مثل دیسکورد): تماس صوتی و چت کوچولو.
   صدا مستقیم بین دستگاه‌ها (WebRTC، هر جفت یک اتصال) می‌ره؛ سیگنال‌دهی و چت با Supabase Realtime
   (broadcast + presence). هیچ جدول یا SQL جدیدی لازم نیست. بیشتر از دو نفر (مثلاً گوشی و لپ‌تاپ هر دو) هم کار می‌کنه. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  /* STUN برای پیدا کردن آدرس؛ TURN (سرور واسطه) برای وقتی که شبکه‌ها (مثل اینترنت موبایل یا مودم‌های بسته) اجازهٔ اتصال مستقیم نمی‌دن.
   صدا رمزنگاری‌شده (DTLS-SRTP) رد می‌شه و سرور واسطه فقط داده‌ی رمز می‌بینه. */
  const ICE = { iceCandidatePoolSize: 2, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  const CHAT_KEY = 'vc_chat';
  let ch = null, subscribed = false, joined = false, local = null, micOn = true, deaf = false, t0 = 0, tickT = null, meterT = null, statT = null;
  const diag = { sent: {}, recv: {}, errs: [], subs: '' };
  let relayDelay = 12000, relayed = false, noMic = false, lastHtml = '', lastNotify = 0, actx = null, myAn = null, myLvl = 0, sending = false, sentPrev = 0;
  const peers = {};   // id -> { pc, stream, remoteSet, pending, state, an, lvl, name }
  const $ = id => document.getElementById(id);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'من';
  const say = m => { if (typeof toast === 'function') toast(m); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const okAv = s => (typeof s === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 30000) ? s : '';
  let myThumb = '', thumbSrc = '';
  /* عکس پروفایل کوچیک‌شده (۹۶ پیکسل) تا توی حضور (presence) جا بشه */
  function makeThumb(cb) {
    const src = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    if (!src) { myThumb = ''; thumbSrc = ''; return cb(); }
    if (src === thumbSrc) return cb();
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
        const s = Math.min(im.width, im.height), sx = (im.width - s) / 2, sy = (im.height - s) / 2;
        x.drawImage(im, sx, sy, s, s, 0, 0, 96, 96); myThumb = okAv(c.toDataURL('image/jpeg', 0.7)); thumbSrc = src;
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
  let msgs = [], warnedChat = false, chatMissing = false;
  try { msgs = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); } catch (e) {}
  const saveMsgs = () => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60))); } catch (e) {} };
  const isMine = n => { try { return Recur.sameName(n, nm()); } catch (e) { return n === nm(); } };
  function addMsg(m) {
    if (!m || !m.id || msgs.some(x => x.id === m.id)) return false;
    msgs.push(m); msgs.sort((a, b) => a.ts - b.ts); if (msgs.length > 400) msgs.splice(0, msgs.length - 400); return true;
  }
  function dayLabel(ts) { try { return Recur.fmtJalaliLong(Recur.epochToWall(ts).iso); } catch (e) { return ''; } }
  function renderChat() {
    const list = $('vcChatList'); if (!list) return;
    let last = '', html = '';
    msgs.forEach(m => {
      const d = dayLabel(m.ts); if (d && d !== last) { last = d; html += `<div class="vc-day">${esc(d)}</div>`; }
      const rp = m.reply ? `<div class="vc-rp" data-goto="${esc(m.reply.id)}"><b>${esc(m.reply.name)}</b><span>${esc((m.reply.text || '').slice(0, 80))}</span></div>` : '';
      const im = m.img ? `<img class="vc-img" src="${esc(m.img)}" alt="تصویر" loading="lazy" data-zoom="${esc(m.img)}">` : '';
      html += `<div class="vc-msg${isMine(m.name) ? ' me' : ''}${m.name === BOT ? ' bot' : ''}" data-mid="${esc(m.id)}"><b>${m.name === BOT ? '🧸 ' : ''}${esc(m.name)}</b>${rp}${im}${m.text ? `<span>${esc(m.text)}</span>` : ''}<i>${esc(fa(Recur.epochToWall(m.ts).hhmm))}${m.edited ? ' <small class="vc-ed">ویرایش‌شده</small>' : ''}${tick(m)}<button type="button" class="vc-re" data-reply="${esc(m.id)}" title="ریپلای" aria-label="ریپلای">↩︎</button>${isMine(m.name) && m.text ? `<button type="button" class="vc-re" data-edit="${esc(m.id)}" title="ویرایش" aria-label="ویرایش">✏️</button>` : ''}${isMine(m.name) || m.name === BOT ? `<button type="button" class="vc-re" data-del="${esc(m.id)}" title="حذف" aria-label="حذف">🗑️</button>` : ''}</i></div>`;
    });
    list.innerHTML = html || '<div class="vc-empty">هنوز پیامی نیست؛ یه چیز قشنگ بنویس 💞</div>';
    if (chatMissing) list.innerHTML += '<div class="vc-empty">برای ماندگار شدن پیام‌ها، بلوک ۲۱ فایل SQL رو یک بار توی Supabase اجرا کن.</div>';
    list.scrollTop = list.scrollHeight;
  }
  async function loadChat() {
    try {
      const r = await dbClient.from('voice_chat').select('*').order('ts', { ascending: false }).limit(300);
      if (r.error) { chatMissing = /voice_chat|relation|schema cache/i.test(r.error.message || ''); renderChat(); return; }
      chatMissing = false;
      (r.data || []).filter(x => { const id = String(x.id); if (id === '__bg') { const v = x.text === '-' ? '' : String(x.text || ''); if (okBg(v)) { chatBg = v; try { localStorage.setItem('vc_bg', v); } catch (e) {} } return false; } if (id === '__bot') { botOn = x.text !== '0'; try { localStorage.setItem('vc_bot', botOn ? '1' : '0'); } catch (e) {} return false; } return !id.startsWith('__seen_') || (!isMine(x.name) && (seenBy[x.name] = Math.max(seenBy[x.name] || 0, Number(x.ts) || 0)) && false); }).forEach(x => addMsg({ edited: !!x.edited, id: x.id, name: x.name || 'ناشناس', text: x.text || '', ts: Number(x.ts) || 0, img: x.img || '', reply: x.reply_id ? { id: x.reply_id, name: x.reply_name || '', text: x.reply_text || '' } : null }));
      saveMsgs(); renderChat(); renderBot(); applyBg(); markSeen();
    } catch (e) {}
  }
  function onChat(p) {
    if (!p || p.from === ID || (!p.text && !p.img)) return;
    const m = { id: p.id || ('m_' + (p.ts || Date.now()) + '_' + p.from), name: String(p.name || 'اون یکی').slice(0, 30), text: String(p.text || '').slice(0, 500), ts: p.ts || Date.now(),
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
  const okBg = v => typeof v === 'string' && (v === '' || (/^p:[a-z]+$/.test(v) && BGS[v.slice(2)]) || /^i:https?:\/\/[^\s"'()]+$/.test(v));
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
    const pop = $('vcBgPop'), st = pop && pop.querySelector('[data-bgst]');
    try {
      const blob = await resizeImageFile(file, 1200, 0.8);
      const up = await uploadMediaFile(blob, 'jpg', 'chat-bg.jpg', { onProgress: (l, t) => { if (st) st.textContent = 'در حال آپلود… ' + Math.round(l / t * 100).toLocaleString('fa-IR') + '٪'; } });
      setBg('i:' + up.url); if (st) st.textContent = '';
    } catch (e) { if (st) st.textContent = ''; say('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'voice_chat') : 'عکس آپلود نشد')); }
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
  const BOT_HELP = 'من پفیلام 🧸 دستیار کوچولوی مشترک شماها! بنویس «پفیلا، …» و یکی از اینا رو بخواه: جوک 😂 · فال ✨ · سوال دونفره ❓ · ایده برای دیت 💡 · سکه 🪙 · تاس 🎲 · «پیتزا یا برگر؟» (برات انتخاب می‌کنم) · تاریخ و ساعت ⏰';
  const JOKES = ['به خرگوشه می‌گن چرا گوشات بلنده؟ می‌گه چون هر چی حرف می‌زنن، من اینا رو بلند گوش می‌دم 🐰', 'یارو می‌ره دکتر می‌گه همه‌ش حس می‌کنم نامرئی‌م. دکتر می‌گه: «بعدی!» 😅', 'به لاک‌پشته می‌گن چرا اینقدر آروم؟ می‌گه عجله نکن، خونه رو که همیشه با خودمه 🐢', 'دو تا ابر عاشق هم شدن؛ بعدش از خوشحالی بارون شدن ☁️💧', 'به کامپیوتره می‌گن چرا خسته‌ای؟ می‌گه امروز کلی «کوکی» خوردم 🍪', 'شنیدی ماه چرا همیشه سرحاله؟ چون هر شب «کامل» می‌شه! 🌕'];
  const QS = ['اگه فردا هیچ کاری نداشتیم، کجا می‌رفتیم؟', 'اولین چیزی که از من یادت می‌یاد چیه؟', 'یه خاطرهٔ خنده‌دار از ما که هیچ‌وقت یادت نمی‌ره؟', 'اگه می‌تونستیم یه روز جای هم باشیم، اول چیکار می‌کردی؟', 'یه آرزوی کوچیک که دوست داری با هم برآورده کنیم؟', 'کدوم آهنگ یاد من می‌ندازتت؟', 'بهترین هدیه‌ای که تا حالا گرفتی چی بوده؟', 'ده سال دیگه خودمون رو کجا می‌بینی؟'];
  const DATES = ['🍿 فیلم‌بازی توی اتاق تماشا با یه ظرف پاپ‌کورن', '🎨 هر دو یه طرح آماده رو توی بوم دو نیمه رنگ کنید', '🌙 پیاده‌روی شبانه و بستنی', '🍕 هرکی یه غذای مورد علاقه‌شو بپزه و عکسش رو برای اون یکی بفرسته', '🎧 یه پلی‌لیست مشترک با ۵ آهنگ از هر کدوم', '📞 یه تماس طولانی بدون هیچ دلیل، فقط برای حرف زدن', '🧩 یه بازی حدس کلمه توی بوم'];
  const FORT = ['امروز یه خبر خوب از یه جای غیرمنتظره می‌رسه ✨', 'یه لبخند ساده، یه روز کامل رو عوض می‌کنه 🌸', 'کسی که دوستش داری الان داره بهت فکر می‌کنه 💜', 'یه سورپرایز کوچیک تو راهه، چشماتو باز نگه دار 🎁', 'امشب خوابای قشنگ می‌بینی 🌙'];
  const SWEET = ['منم شماها رو دوست دارم! 🥹💜', 'قلبم رفت تو حالت لرزش 💓', 'این حرف رو بذارید توی دفترچه‌مون، قشنگ‌ترین جملهٔ امروزه 📖'];
  function botAnswer(q) {
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
    if (has('اسم', 'کی هستی', 'تو کی', 'کی هستی')) return 'من پفیلا هستم 🧸 یه دستیار کوچولو که اینجا بین شما دوتا زندگی می‌کنه. «راهنما» رو بنویس تا بگم چی بلدم.';
    if (has('سلام', 'درود', 'هلو', 'های', 'صبح بخیر', 'شب بخیر')) return rndp(['سلام سلام! 🧸', 'به به! چه خبرا؟ ☁️', 'سلام، من اینجام! 🍬']);
    if (has('خوبی', 'حالت', 'چطوری')) return rndp(['عالیم! امروز کلی پفک خوردم 🧸', 'خوبم، تو چطوری؟ 💜']);
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
  const BOT_RE = /^\s*[@＠]?\s*پفیلا/;
  function botMaybe(text) {
    if (!botOn || !BOT_RE.test(text || '')) return; const q = text.replace(BOT_RE, '').replace(/^[\s،,:؛]+/, '');
    typers.bot = { name: BOT, until: Date.now() + 2600 }; renderTyping(); ctSend({ k: 'typing', on: 1, who: BOT });
    setTimeout(() => {
      const ts = Date.now(), id = 'm_' + ts + '_bot' + ID, ans = botAnswer(q), p = { from: ID, id, name: BOT, text: ans, ts, img: '', reply: null };
      delete typers.bot; ctSend({ k: 'typing', on: 0, who: BOT });
      try { ch.send({ type: 'broadcast', event: 'chat', payload: p }); } catch (e) {}
      addMsg({ id, name: BOT, text: ans, ts, img: '', reply: null }); saveMsgs(); renderChat(); renderTyping(); blip('recv');
      try { dbClient.from('voice_chat').upsert({ id, name: BOT, text: ans, ts }).then(() => {}, () => {}); } catch (e) {}
    }, 1100 + Math.random() * 700);
  }

  /* ---------- 📷 تصویر و ↩︎ ریپلای توی چت ---------- */
  let pendImg = null, replyTo = null, chatSending = false;
  function renderComposer() {
    const el = $('vcComposer'); if (!el) return;
    let h = '';
    if (editing) h += `<div class="vc-cmp"><span>✏️ ویرایش پیام</span><button type="button" data-cmp="noedit" aria-label="لغو ویرایش">✕</button></div>`;
    if (replyTo) h += `<div class="vc-cmp"><span>↩︎ پاسخ به <b>${esc(replyTo.name)}</b>: ${esc((replyTo.text || '📷 تصویر').slice(0, 60))}</span><button type="button" data-cmp="noreply" aria-label="لغو ریپلای">✕</button></div>`;
    if (pendImg) h += `<div class="vc-cmp${pendImg.up ? ' up' : ''}"><img src="${esc(pendImg.preview)}" alt=""><span id="vcUpTxt">${pendImg.up ? 'در حال آپلود…' : 'تصویر آماده ارسال'}</span><button type="button" data-cmp="noimg" aria-label="${pendImg.up ? 'لغو آپلود' : 'حذف تصویر'}">✕</button>${pendImg.up ? '<div class="vc-upb"><i id="vcUpBar"></i></div>' : ''}</div>`;
    el.innerHTML = h; el.style.display = h ? '' : 'none';
  }
  async function pickImage(file) {
    if (!file || !/^image\//.test(file.type)) return;
    try {
      const url = await resizeImageFile(file, 1600, 0.82);
      pendImg = { blob: dataUrlToBlob(url), preview: url };
      renderComposer(); const i = $('vcChatInput'); if (i) i.focus();
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
    chatSending = true; const sb = $('vcChatForm') && $('vcChatForm').querySelector('button[type=submit]'); if (sb) sb.disabled = true;
    let img = '';
    if (pendImg) {
      const pi = pendImg; pi.up = true; pi.ctl = { abort() {} }; renderComposer();
      const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' مگابایت' : Math.max(1, Math.round(n / 1024)).toLocaleString('fa-IR') + ' کیلوبایت';
      try { const up = await uploadMediaFile(pi.blob, 'jpg', 'chat.jpg', { ctl: pi.ctl, onProgress: (l, t) => { const pc = Math.min(100, Math.round(l / t * 100)), b = $('vcUpBar'), x = $('vcUpTxt'); if (b) b.style.width = pc + '%'; if (x) x.textContent = pc.toLocaleString('fa-IR') + '٪ · ' + kb(l) + ' از ' + kb(t); } }); img = up.url; }
      catch (e) { pi.up = false; renderComposer(); if (e && e.cancelled) { say('⛔ آپلود لغو شد'); chatSending = false; if (sb) sb.disabled = false; return; } say('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'voice_chat') : 'تصویر ارسال نشد')); chatSending = false; if (sb) sb.disabled = false; return; }
    }
    const reply = replyTo ? { id: replyTo.id, name: replyTo.name, text: (replyTo.text || '').slice(0, 120) } : null;
    const ts = Date.now(), id = 'm_' + ts + '_' + ID, p = { from: ID, id, name: nm(), text, ts, img, reply };
    try { ch.send({ type: 'broadcast', event: 'chat', payload: p }); } catch (e) {}
    clearTimeout(typeIdle); lastTypeSent = 0; ctSend({ k: 'typing', on: 0 }); botMaybe(text);
    addMsg({ id, name: p.name, text, ts, img, reply }); saveMsgs(); pendImg = null; replyTo = null; renderComposer(); renderChat(); blip('send'); inp.value = ''; inp.focus();
    chatSending = false; if (sb) sb.disabled = false;
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
    const ci = $('vcChatInput'); if (ci) ci.addEventListener('input', onTyping);
    const gb = $('bgBtn'); if (gb) gb.addEventListener('click', toggleBgPop); applyBg();
    const bb = $('vcBot'); if (bb) bb.addEventListener('click', e => { const b = e.target.closest('[data-bot]'); if (!b) return; const i = $('vcChatInput'); if (i) { i.value = 'پفیلا، ' + b.dataset.bot; sendChat(); } });
    const pk = $('vcImgPick'); if (pk) pk.addEventListener('change', () => { const fl = pk.files && pk.files[0]; pk.value = ''; pickImage(fl); });
    const imgOf = dt => { const it = dt && dt.items ? Array.from(dt.items).find(i => i.kind === 'file' && /^image\//.test(i.type)) : null; const f = it ? it.getAsFile() : (dt && dt.files ? Array.from(dt.files).find(x => /^image\//.test(x.type)) : null); return f || null; };
    const ci2 = $('vcChatInput'); if (ci2) ci2.addEventListener('paste', e => { const f = imgOf(e.clipboardData); if (f) { e.preventDefault(); pickImage(f); } });
    const cf = $('vcChatForm'); if (cf) { cf.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); }); cf.addEventListener('drop', e => { const f = imgOf(e.dataTransfer); if (f) { e.preventDefault(); pickImage(f); } }); }
    const cb = $('vcImgBtn'); if (cb && pk) cb.addEventListener('click', () => pk.click());
    const cmp = $('vcComposer'); if (cmp) cmp.addEventListener('click', e => { const b = e.target.closest('[data-cmp]'); if (!b) return; if (b.dataset.cmp === 'noreply') replyTo = null; else if (b.dataset.cmp === 'noedit') { editing = null; const i = $('vcChatInput'); if (i) i.value = ''; } else { if (pendImg && pendImg.ctl && pendImg.up) pendImg.ctl.abort(); else pendImg = null; } renderComposer(); });
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
