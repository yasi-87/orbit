/* 🗺️ نقشهٔ خاطره‌ها: جاهایی که با هم رفتیم (یا دوست داریم بریم) رو روی نقشه سنجاق می‌کنیم، با عکس و یادداشت.
   نقشه: Leaflet (توی پوشهٔ vendor) + کاشی‌های OpenStreetMap؛ سنجاق‌ها مشترکن (جدول folder_items، بدون جدول جدید). */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const CATS = [['📍', 'جای خاطره'], ['❤️', 'اولین‌ها'], ['🍽️', 'خوردنی'], ['✈️', 'سفر'], ['🎬', 'سینما و تفریح'], ['🏞️', 'طبیعت'], ['🎁', 'سورپرایز']];
  let pins = [], map = null, layer = null, markers = {}, addMode = false, filt = 'all', loaded = false, missing = false, leafletP = null, tmpMarker = null;
  const me = () => (window.myName && myName()) || 'ناشناس';

  const CSS = `
.mp-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
.mp-bar input{flex:1;min-width:150px;background:rgba(10,10,15,.55);color:inherit;border:1px solid rgba(212,165,255,.3);border-radius:999px;padding:8px 14px;font:inherit}
.mp-b{border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.07);color:inherit;border-radius:999px;padding:8px 14px;font:inherit;font-size:.85rem;cursor:pointer;white-space:nowrap}.mp-b:hover{background:rgba(212,165,255,.22)}.mp-b.on{background:linear-gradient(135deg,#d4a5ff,#ff8fb8);color:#1b1026;font-weight:700;border-color:transparent}
#mpMap{height:min(62vh,520px);min-height:340px;border-radius:22px;overflow:hidden;border:1px solid rgba(212,165,255,.35);box-shadow:0 12px 36px rgba(0,0,0,.45);background:radial-gradient(circle at 30% 20%,#2b1d44,#120c20);position:relative;z-index:1}
#mpMap .leaflet-tile-pane{filter:invert(.92) hue-rotate(190deg) saturate(.7) brightness(.92) contrast(.92)}
#mpMap.mp-add{cursor:crosshair}
.leaflet-container{font-family:inherit}
.mp-pin{width:38px;height:38px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:linear-gradient(135deg,#d4a5ff,#ff8fb8);border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}.mp-pin span{transform:rotate(45deg);font-size:18px}
.mp-pin.wish{background:linear-gradient(135deg,#ffd45a,#ff9ed2);border-style:dashed}
.leaflet-popup-content-wrapper{background:#241a38;color:#f3ecff;border-radius:16px;border:1px solid rgba(212,165,255,.4)}.leaflet-popup-tip{background:#241a38}
.leaflet-popup-content{margin:12px 14px;direction:rtl;text-align:right;min-width:190px}.mp-pp img{width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-bottom:8px;display:block}.mp-pp b{font-size:1rem}.mp-pp p{margin:6px 0;font-size:.85rem;line-height:1.7;white-space:pre-wrap}.mp-pp small{opacity:.65;display:block}
.mp-pp .acts{display:flex;gap:6px;margin-top:8px}.mp-pp .acts button{flex:1;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:5px;font:inherit;font-size:.78rem;cursor:pointer}
.mp-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:14px}
.mp-card{display:flex;gap:10px;align-items:center;padding:10px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(212,165,255,.2);cursor:pointer;transition:.15s}.mp-card:hover{background:rgba(212,165,255,.16);transform:translateY(-2px)}
.mp-card .th{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:1.4rem;overflow:hidden;flex-shrink:0}.mp-card .th img{width:100%;height:100%;object-fit:cover}.mp-card b{font-size:.9rem;display:block}.mp-card small{opacity:.65;font-size:.72rem}
.mp-ov{position:fixed;inset:0;z-index:9300;background:rgba(8,5,16,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px}
.mp-dlg{width:min(440px,100%);max-height:90vh;overflow:auto;padding:18px;border-radius:22px;background:linear-gradient(160deg,#241a38,#171024);border:1px solid rgba(212,165,255,.4);box-shadow:0 24px 70px rgba(0,0,0,.6);animation:mgIn .25s ease}
.mp-dlg h3{margin:0 0 12px}.mp-dlg input[type=text],.mp-dlg textarea,.mp-dlg input[type=date]{width:100%;box-sizing:border-box;background:rgba(10,10,15,.55);color:inherit;border:1px solid rgba(212,165,255,.3);border-radius:12px;padding:9px 12px;font:inherit;margin-bottom:8px}.mp-dlg textarea{min-height:80px;resize:vertical}
.mp-cats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.mp-cats button{border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;border-radius:12px;padding:6px 10px;font:inherit;font-size:.82rem;cursor:pointer}.mp-cats button.on{background:linear-gradient(135deg,#d4a5ff,#ff8fb8);color:#1b1026;font-weight:700}
.mp-dlg label.chk{display:flex;gap:8px;align-items:center;margin:6px 0 12px;font-size:.88rem}.mp-dlg .row{display:flex;gap:8px}.mp-dlg .row button{flex:1}
.mp-note{padding:30px;text-align:center;opacity:.8}
`;
  function injectCss() { if (!document.getElementById('mpCss')) { const s = document.createElement('style'); s.id = 'mpCss'; s.textContent = CSS; document.head.appendChild(s); } }
  function loadLeaflet() {
    if (window.L && L.map) return Promise.resolve();
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = './vendor/leaflet/leaflet.css'; document.head.appendChild(l);
      const s = document.createElement('script'); s.src = './vendor/leaflet/leaflet.js'; s.onload = res; s.onerror = () => { leafletP = null; rej(new Error('leaflet')); }; document.head.appendChild(s);
    });
    return leafletP;
  }
  const icon = p => L.divIcon({ className: '', html: `<div class="mp-pin${p.wish ? ' wish' : ''}"><span>${esc(p.emoji || '📍')}</span></div>`, iconSize: [38, 38], iconAnchor: [4, 38], popupAnchor: [15, -34] });
  const when = p => p.date ? Recur.fmtJalaliShort(p.date) : '';
  function popup(p) {
    return `<div class="mp-pp">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : ''}<b>${esc(p.emoji || '📍')} ${esc(p.title || 'بدون اسم')}</b>${p.wish ? '<small>⭐ آرزوی ما: می‌خوایم بریم</small>' : ''}${p.note ? `<p>${esc(p.note)}</p>` : ''}<small>${esc(p.author || '')}${when(p) ? ' · ' + when(p) : ''}</small><div class="acts"><button onclick="MapMem.edit('${p.id}')">✏️ ویرایش</button><button onclick="MapMem.del('${p.id}')">🗑️ حذف</button></div></div>`;
  }
  function shown() { return pins.filter(p => filt === 'all' || (filt === 'wish' ? p.wish : !p.wish)); }
  function paint() {
    if (!map) return; Object.values(markers).forEach(m => m.remove()); markers = {};
    shown().forEach(p => { const m = L.marker([p.lat, p.lng], { icon: icon(p) }).addTo(map).bindPopup(popup(p)); markers[p.id] = m; });
    const list = document.getElementById('mpList'); if (list) list.innerHTML = shown().sort((a, b) => (b.ts || 0) - (a.ts || 0)).map(p => `<div class="mp-card" onclick="MapMem.go('${p.id}')"><div class="th">${p.photo ? `<img src="${esc(p.photo)}" loading="lazy" alt="">` : esc(p.emoji || '📍')}</div><div><b>${esc(p.title || 'بدون اسم')}</b><small>${p.wish ? '⭐ آرزو · ' : ''}${esc(p.author || '')}${when(p) ? ' · ' + when(p) : ''}</small></div></div>`).join('') || '<div class="mp-note">هنوز سنجاقی نیست. «➕ سنجاق جدید» رو بزن و روی نقشه یه جا رو انتخاب کن 📍</div>';
    const c = document.getElementById('mpCount'); if (c) c.textContent = fa(pins.length) + ' سنجاق';
  }
  function fit() { if (!map) return; const ps = shown(); if (ps.length) { try { map.fitBounds(ps.map(p => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 12 }); } catch (e) {} } }
  function build() {
    const box = document.getElementById('mapBox'); if (!box) return; injectCss();
    box.innerHTML = `<div class="mp-bar"><input id="mpQ" placeholder="🔎 دنبال یه شهر یا جا بگرد..." onkeydown="if(event.key==='Enter')MapMem.search()"><button class="mp-b" onclick="MapMem.search()">برو</button><button class="mp-b" onclick="MapMem.locate()">🎯 جای من</button><button class="mp-b" id="mpAddBtn" onclick="MapMem.toggleAdd()">➕ سنجاق جدید</button></div>
    <div class="mp-bar"><button class="mp-b on" data-f="all" onclick="MapMem.filter('all')">همه</button><button class="mp-b" data-f="mem" onclick="MapMem.filter('mem')">📍 خاطره‌ها</button><button class="mp-b" data-f="wish" onclick="MapMem.filter('wish')">⭐ آرزوها</button><span id="mpCount" style="margin-inline-start:auto;opacity:.7;font-size:.82rem"></span></div>
    <div id="mpMap"></div><div class="mp-list" id="mpList"></div>`;
  }
  async function refreshPins() { const r = await KV.list('x_pin'); missing = !!r.error; if (missing) { try { pins = JSON.parse(localStorage.getItem('pins_local_v1') || '[]'); } catch (e) { pins = []; } } else pins = r.rows; paint(); }
  async function load() {
    if (map && document.getElementById('mpMap')) { setTimeout(() => map.invalidateSize(), 150); return refreshPins(); }
    build();
    try { await loadLeaflet(); } catch (e) { document.getElementById('mapBox').innerHTML = '<div class="mp-note">⚠️ نقشه لود نشد. اینترنت رو چک کن و دوباره بیا.</div>'; return; }
    const el = document.getElementById('mpMap');
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView([32.4, 53.7], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    map.on('click', e => { if (addMode) { setAdd(false); form({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
    setTimeout(() => map && map.invalidateSize(), 250);
    const r = await KV.list('x_pin'); missing = !!r.error;
    if (missing) { try { pins = JSON.parse(localStorage.getItem('pins_local_v1') || '[]'); } catch (e) { pins = []; } toast('⚠️ ذخیرهٔ مشترک در دسترس نیست؛ سنجاق‌ها فقط روی همین دستگاه می‌مونن'); } else pins = r.rows;
    loaded = true; paint(); fit();
  }
  function setAdd(v) { addMode = v; const m = document.getElementById('mpMap'), b = document.getElementById('mpAddBtn'); if (m) m.classList.toggle('mp-add', v); if (b) { b.classList.toggle('on', v); b.textContent = v ? '👆 روی نقشه بزن...' : '➕ سنجاق جدید'; } }
  function form(p) {
    const edit = !!p.id; let emoji = p.emoji || '📍', photo = p.photo || '', file = null;
    const ov = document.createElement('div'); ov.className = 'mp-ov';
    ov.innerHTML = `<div class="mp-dlg"><h3>${edit ? '✏️ ویرایش سنجاق' : '📍 سنجاق تازه'}</h3><input type="text" id="mpT" placeholder="اسم جا یا خاطره (مثلاً: اولین قرارمون)" value="${esc(p.title || '')}"><textarea id="mpN" placeholder="چی یادته؟ یه یادداشت بنویس...">${esc(p.note || '')}</textarea>
    <div class="mp-cats">${CATS.map(c => `<button type="button" data-e="${c[0]}" class="${c[0] === emoji ? 'on' : ''}">${c[0]} ${c[1]}</button>`).join('')}</div>
    <input type="date" id="mpD" value="${esc(p.date || '')}" max="${Recur.todayIso()}"><label class="chk"><input type="checkbox" id="mpW" ${p.wish ? 'checked' : ''}> ⭐ هنوز نرفتیم، آرزوی ماست</label>
    <input type="file" id="mpF" accept="image/*" style="margin-bottom:10px">${photo ? '<div style="margin-bottom:8px;font-size:.8rem;opacity:.7">یه عکس از قبل داره؛ عکس جدید انتخاب کنی جایگزین می‌شه.</div>' : ''}
    <div class="row"><button class="mp-b on" id="mpS">💾 ذخیره</button><button class="mp-b" id="mpC">انصراف</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('.mp-cats button').forEach(b => b.onclick = () => { emoji = b.dataset.e; ov.querySelectorAll('.mp-cats button').forEach(x => x.classList.toggle('on', x === b)); });
    ov.querySelector('#mpF').onchange = e => { file = e.target.files[0] || null; };
    ov.querySelector('#mpC').onclick = () => ov.remove();
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('#mpS').onclick = async () => {
      const btn = ov.querySelector('#mpS'); btn.disabled = true; btn.textContent = '⏳ ...';
      try {
        if (file) { const dataUrl = await resizeImageFile(file, 900, .82), blob = await (await fetch(dataUrl)).blob(); photo = (await uploadMediaFile(blob, 'jpg', 'عکس سنجاق')).url; }
        const rec = { lat: p.lat, lng: p.lng, title: ov.querySelector('#mpT').value.trim() || 'یه جای خاص', note: ov.querySelector('#mpN').value.trim(), emoji, wish: ov.querySelector('#mpW').checked, date: ov.querySelector('#mpD').value || '', photo, author: p.author || me(), ts: p.ts || Date.now() };
        const id = p.id || KV.newId(); rec.id = id;
        if (missing) { try { const all = pins.filter(x => x.id !== id).concat([rec]); localStorage.setItem('pins_local_v1', JSON.stringify(all)); } catch (e) {} } else { const err = await KV.put('x_pin', id, rec); if (err) throw err; }
        pins = pins.filter(x => x.id !== id).concat([rec]); ov.remove(); paint(); if (map) { map.closePopup(); markers[id] && markers[id].openPopup(); } toast('📍 ذخیره شد');
        if (!edit && !p.wish) { try { notify('pin', rec.title, id); } catch (e) {} }
      } catch (e) { btn.disabled = false; btn.textContent = '💾 ذخیره'; toast('⚠️ ذخیره نشد' + (e && e.message ? ': ' + String(e.message).slice(0, 60) : '')); }
    };
  }
  window.MapMem = {
    load,
    toggleAdd() { setAdd(!addMode); if (addMode) toast('روی نقشه، جای سنجاق رو انتخاب کن 👆'); },
    filter(f) { filt = f; document.querySelectorAll('#mapBox [data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === f)); paint(); fit(); },
    go(id) { const p = pins.find(x => x.id === id); if (!p || !map) return; document.getElementById('mpMap').scrollIntoView({ behavior: 'smooth', block: 'center' }); map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 13), { duration: .9 }); setTimeout(() => markers[id] && markers[id].openPopup(), 950); },
    edit(id) { const p = pins.find(x => x.id === id); if (p) { map.closePopup(); form(p); } },
    async del(id) { if (!confirm('این سنجاق حذف بشه؟')) return; if (!missing) await KV.del('x_pin', id); pins = pins.filter(x => x.id !== id); if (missing) try { localStorage.setItem('pins_local_v1', JSON.stringify(pins)); } catch (e) {} map.closePopup(); paint(); toast('🗑️ حذف شد'); },
    locate() { if (!navigator.geolocation) return toast('مرورگرت موقعیت‌یابی نداره'); navigator.geolocation.getCurrentPosition(pos => { map.flyTo([pos.coords.latitude, pos.coords.longitude], 14); if (tmpMarker) tmpMarker.remove(); tmpMarker = L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 8, color: '#fff', fillColor: '#4da3ff', fillOpacity: 1 }).addTo(map).bindTooltip('تو اینجایی'); }, () => toast('اجازهٔ موقعیت داده نشد'), { timeout: 8000 }); },
    async search() { const q = (document.getElementById('mpQ').value || '').trim(); if (!q) return; try { const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fa&q=' + encodeURIComponent(q)); const j = await r.json(); if (!j.length) return toast('پیدا نشد 🤷'); map.flyTo([+j[0].lat, +j[0].lon], 12, { duration: 1 }); } catch (e) { toast('⚠️ جستجو انجام نشد (اینترنت؟)'); } },
    _pins: () => pins, _form: form
  };
})();
