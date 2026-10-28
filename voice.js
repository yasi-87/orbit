/* 🎙️ اتاق صحبت (مثل دیسکورد): تماس صوتی و چت کوچولو.
   صدا مستقیم بین دستگاه‌ها (WebRTC، هر جفت یک اتصال) می‌ره؛ سیگنال‌دهی و چت با Supabase Realtime
   (broadcast + presence). هیچ جدول یا SQL جدیدی لازم نیست. بیشتر از دو نفر (مثلاً گوشی و لپ‌تاپ هر دو) هم کار می‌کنه. */
(function () {
  'use strict';
  const ID = Math.random().toString(36).slice(2, 9);
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  const CHAT_KEY = 'vc_chat';
  let ch = null, subscribed = false, joined = false, local = null, micOn = true, deaf = false, t0 = 0, tickT = null, meterT = null, statT = null;
  let noMic = false, lastHtml = '', lastNotify = 0, actx = null, myAn = null, myLvl = 0, sending = false, sentPrev = 0;
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
    const states = o.map(x => (peers[x.id] || {}).state || 'connecting');
    const allOk = o.length && states.every(s => s === 'connected'), anyBad = states.some(s => s === 'failed');
    const stTxt = !joined ? (o.length ? '💞 ' + esc(o.map(x => x.name).join(' و ')) + ' توی اتاقه؛ بیا تو!' : 'اتاق خالیه')
      : !o.length ? '⏳ منتظر اون یکی هستی…'
      : anyBad ? '🔴 اتصال با یکی‌تون برقرار نشد (شبکه جلوی ارتباط مستقیم رو گرفته)'
      : allOk ? '🟢 وصلید ' + dur : '⏳ در حال وصل شدن…';
    const tile = (id, n, me, muted, bad, av) => `<div class="vc-tile${muted ? ' muted' : ''}" data-who="${me ? 'me' : 'peer'}" data-peer="${id}"><div class="vc-av">${av ? '<img alt="" src="' + esc(av) + '">' : esc((n || '?').trim().slice(0, 1))}</div><div class="vc-nm">${esc(n)}${muted ? ' 🔇' : ''}${bad ? ' ⚠️' : ''}</div>${me ? '<div class="vc-meter"><i id="vcMeter"></i></div>' : ''}</div>`;
    const sendTxt = joined ? (noMic ? '🎧 بدون میکروفون؛ فقط صدای اون یکی رو می‌شنوی' : !micOn ? '🔇 میکروفونت خاموشه؛ صدایی نمی‌ره' : (o.length && allOk ? '<span id="vcOut">🎙️ صدات داره می‌ره…</span>' : '<span id="vcOut">🎙️ میکروفونت روشنه</span>')) : '';
    const html = `<div class="vc-room"><div class="vc-st" id="vcSt">${stTxt}</div>
      <div class="vc-tiles">${joined ? tile(ID, nm(), true, !micOn || noMic, false, (typeof userProfile !== 'undefined' && userProfile.avatar) || '') : ''}${o.map(x => tile(x.id, x.name, false, false, (peers[x.id] || {}).state === 'failed', x.av)).join('')}${!joined && !o.length ? '<div class="vc-empty">هنوز کسی توی اتاق نیست 🌙</div>' : ''}</div>
      ${joined ? '<div class="vc-out" id="vcOutBox">' + sendTxt + '</div>' : ''}
      <div class="vc-ctl">${joined
        ? (noMic ? '<button class="btn" data-vc="retrymic" type="button">🎙️ فعال‌کردن میکروفون</button>' : `<button class="btn ${micOn ? '' : 'ghost'}" data-vc="mic" type="button">${micOn ? '🎙️ میکروفون روشنه' : '🔇 میکروفون خاموشه'}</button>`) + `
           <button class="btn ghost" data-vc="deaf" type="button">${deaf ? '🔈 صدا رو باز کن' : '🔊 قطع صدای طرف مقابل'}</button>
           <button class="btn danger" data-vc="leave" type="button">📴 خروج از اتاق</button>`
        : `<button class="btn" data-vc="join" type="button">🎙️ ورود به اتاق صحبت</button>`}</div>
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
        .on('presence', { event: 'sync' }, onPresence)
        .subscribe(s => { if (s === 'SUBSCRIBED') { subscribed = true; if (joined) track(); setTimeout(onPresence, 200); render(); renderChat(); } });
    } catch (e) { console.warn('voice off', e); ch = null; }
  }
  const track = () => makeThumb(() => { try { ch.track({ name: nm(), call: joined, av: myThumb }); } catch (e) {} });
  function send(p, to) { try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'vc', payload: Object.assign({ from: ID, to: to || '' }, p) }); } catch (e) {} }

  function onPresence() {
    if (!ch) return;
    const o = inCallOthers();
    if (joined) {
      o.forEach(x => { if (!peers[x.id]) startPeer(x.id, x.name); else peers[x.id].name = x.name; });
      Object.keys(peers).forEach(id => { if (!o.some(x => x.id === id)) { const nmx = peers[id].name; closePeer(id); say('📴 ' + nmx + ' از اتاق رفت'); } });
    }
    render();
  }

  function startPeer(id, name) {
    if (peers[id] || !joined) return;
    const P = peers[id] = { pc: new RTCPeerConnection(ICE), state: 'connecting', remoteSet: false, pending: [], name, stream: null, an: null, lvl: 0 };
    const pc = P.pc;
    if (local) local.getTracks().forEach(t => pc.addTrack(t, local)); else pc.addTransceiver('audio', { direction: 'recvonly' });   // بدون میکروفون: فقط گوش می‌دیم
    pc.onicecandidate = e => { if (e.candidate) send({ t: 'ice', c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }, id); };
    pc.ontrack = e => { P.stream = e.streams[0] || new MediaStream([e.track]); attachAudio(id, P.stream); watch(P); render(); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') { if (P.state !== 'connected') say('💞 با ' + P.name + ' وصل شدی! حرف بزنین'); P.state = 'connected'; }
      else if (s === 'failed') P.state = 'failed'; else if (s === 'disconnected' || s === 'connecting') P.state = 'connecting';
      trackCall(); render();
    };
    if (ID < id) makeOffer(id); else send({ t: 'ready' }, id);
    render();
  }
  async function makeOffer(id) {
    const P = peers[id]; if (!P) return;
    try { const o = await P.pc.createOffer(); await P.pc.setLocalDescription(o); send({ t: 'offer', sdp: sd(P.pc.localDescription) }, id); } catch (e) { console.warn(e); }
  }
  async function onSignal(p) {
    if (!p || p.from === ID || !joined || (p.to && p.to !== ID)) return;
    const id = p.from;
    try {
      if (p.t === 'bye') { closePeer(id); render(); return; }
      if (p.t === 'cid') { if (curCall && !curCall.id && p.id) { curCall.id = p.id; curCall.start = Number(p.start) || curCall.start; saveCall(false); } return; }
      if (!peers[id]) { const o = others().find(x => x.id === id); startPeer(id, o ? o.name : 'اون یکی'); }
      const P = peers[id]; if (!P) return;
      if (p.t === 'ready') { if (ID < id && !P.pc.remoteDescription && P.pc.signalingState === 'stable') await makeOffer(id); }
      else if (p.t === 'offer') {
        await P.pc.setRemoteDescription(p.sdp); P.remoteSet = true;
        const a = await P.pc.createAnswer(); await P.pc.setLocalDescription(a); send({ t: 'answer', sdp: sd(P.pc.localDescription) }, id); flushIce(P);
      } else if (p.t === 'answer') { await P.pc.setRemoteDescription(p.sdp); P.remoteSet = true; flushIce(P); }
      else if (p.t === 'ice') { if (P.remoteSet) await P.pc.addIceCandidate(p.c).catch(() => {}); else P.pending.push(p.c); }
    } catch (e) { console.warn('voice signal', e); }
  }
  function flushIce(P) { const q = P.pending; P.pending = []; q.forEach(c => P.pc.addIceCandidate(c).catch(() => {})); }
  function closePeer(id) {
    const P = peers[id]; if (!P) return;
    try { P.pc.onconnectionstatechange = null; P.pc.close(); } catch (e) {}
    const a = $('vcA_' + id); if (a) a.remove();
    delete peers[id]; trackCall();
  }
  function attachAudio(id, stream) {
    let a = $('vcA_' + id);
    if (!a) { a = document.createElement('audio'); a.id = 'vcA_' + id; a.autoplay = true; a.setAttribute('playsinline', ''); ($('vcAudios') || document.body).appendChild(a); }
    a.srcObject = stream; a.muted = deaf; const p = a.play(); if (p && p.catch) p.catch(() => {});
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
      Object.keys(peers).forEach(id => { const P = peers[id], t = document.querySelector('.vc-tile[data-peer="' + id + '"]'); if (t && P.an) t.classList.toggle('speak', !deaf && level(P.an) > 12); });
    }, 120);
    clearInterval(statT);
    statT = setInterval(async () => {   // آیا بایت‌های صدای من واقعاً داره ارسال می‌شه؟
      let sent = 0; for (const id of Object.keys(peers)) { try { (await peers[id].pc.getStats()).forEach(r => { if (r.type === 'outbound-rtp' && r.kind === 'audio') sent += r.bytesSent || 0; }); } catch (e) {} }
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
    clearInterval(tickT); tickT = setInterval(() => { if (joined && Object.values(peers).some(p => p.state === 'connected')) render(); }, 1000);
    if (!inCallOthers().length && Date.now() - lastNotify > 10 * 60000) { lastNotify = Date.now(); try { notify('voice', 'اتاق صحبت', ''); } catch (e) {} }
    render();
  }
  function leave(quiet) {
    if (!joined) return;
    send({ t: 'bye' }); const fin = curCall ? finishCall() : null; Object.keys(peers).forEach(closePeer);
    try { if (local) local.getTracks().forEach(t => t.stop()); } catch (e) {} local = null;
    joined = false; track();
    clearInterval(tickT); clearInterval(meterT); clearInterval(statT);
    if (!quiet) say('📴 از اتاق صحبت خارج شدی');
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
  const connectedIds = () => Object.keys(peers).filter(k => peers[k].state === 'connected');
  function saveCall(final) {
    const c = curCall; if (!c || !c.id) return Promise.resolve();
    const now = Date.now(), dur = Math.floor((now - c.start) / 1000);
    if (final && dur < 5) return Promise.resolve();
    return dbClient.from('calls').upsert({ id: c.id, started_at: c.start, ended_at: now, duration_sec: dur, names: c.names.join(' و ') }).then(r => {
      if (r && r.error && /calls|relation|schema cache/i.test(r.error.message || '') && !warnedCalls) { warnedCalls = true; say('⚠️ برای ثبت تاریخچهٔ تماس‌ها، بلوک ۲۰ فایل SQL رو توی Supabase اجرا کن'); }
    }).catch(() => {});
  }
  function trackCall() {
    const ids = connectedIds();
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

  /* 🔔 صدای کوچولوی پیام: ارسال = «پاپ» نرم، دریافت = دو نت ملایم */
  function blip(kind) {
    try {
      if (typeof muted !== 'undefined' && muted === true) return;
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume().catch(() => {});
      const t = actx.currentTime, notes = kind === 'send' ? [[880, 0, .09], [1318, .07, .12]] : [[988, 0, .12], [1318, .11, .16]];
      notes.forEach(([f, d, len]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.14, t + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
        o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + len + 0.02);
      });
      window.__blips = (window.__blips || []).concat(kind);
    } catch (e) {}
  }

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
      html += `<div class="vc-msg${isMine(m.name) ? ' me' : ''}"><b>${esc(m.name)}</b><span>${esc(m.text)}</span><i>${esc(fa(Recur.epochToWall(m.ts).hhmm))}</i></div>`;
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
      (r.data || []).forEach(x => addMsg({ id: x.id, name: x.name || 'ناشناس', text: x.text || '', ts: Number(x.ts) || 0 }));
      saveMsgs(); renderChat();
    } catch (e) {}
  }
  function onChat(p) {
    if (!p || p.from === ID || !p.text) return;
    const m = { id: p.id || ('m_' + (p.ts || Date.now()) + '_' + p.from), name: String(p.name || 'اون یکی').slice(0, 30), text: String(p.text).slice(0, 500), ts: p.ts || Date.now() };
    if (addMsg(m)) { saveMsgs(); renderChat(); blip('recv'); if (typeof currentScreen !== 'undefined' && currentScreen !== 'voice') say('💬 ' + m.name + ': ' + m.text.slice(0, 40)); }
  }
  function sendChat() {
    const inp = $('vcChatInput'); if (!inp) return; const text = inp.value.trim().slice(0, 500); if (!text) return;
    if (!ch || !subscribed) { say('⏳ هنوز وصل نشده؛ چند لحظه دیگه'); return; }
    const ts = Date.now(), id = 'm_' + ts + '_' + ID, p = { from: ID, id, name: nm(), text, ts };
    try { ch.send({ type: 'broadcast', event: 'chat', payload: p }); } catch (e) {}
    addMsg({ id, name: p.name, text, ts }); saveMsgs(); renderChat(); blip('send'); inp.value = ''; inp.focus();
    dbClient.from('voice_chat').upsert({ id, name: p.name, text, ts }).then(r => {
      if (r && r.error && /voice_chat|relation|schema cache/i.test(r.error.message || '')) { chatMissing = true; renderChat(); if (!warnedChat) { warnedChat = true; say('⚠️ برای ماندگار شدن پیام‌ها، بلوک ۲۱ فایل SQL رو توی Supabase اجرا کن'); } }
    }).catch(() => {});
  }

  function load() { connectChannel(); render(); renderChat(); loadCalls(); loadChat(); }
  function init() {
    const box = $('voiceBox'); if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-vc]'); if (!b) return;
      const a = b.dataset.vc;
      if (a === 'join') join(); else if (a === 'leave') leave(); else if (a === 'mic') toggleMic(); else if (a === 'retrymic') { leave(true); join(); } else if (a === 'deaf') toggleDeaf();
    });
    const f = $('vcChatForm'); if (f) f.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
    window.addEventListener('pagehide', () => leave(true));
    render(); renderChat();
  }
  window.Voice = { _calls: () => callRows, _fmt: fmtDur, _peers: () => peers, load, join, leave, init, _state: () => ({ joined, micOn, deaf, id: ID, peers: Object.keys(peers).map(k => [k, peers[k].state]), sending }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
