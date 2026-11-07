/* 📂 پوشه‌ها: برای سینما، گیم، گالری، فایل‌ها و بوم
   دو جدول: folders (خود پوشه‌ها) و folder_items (هر مورد توی کدوم پوشه‌ست).
   جدول‌های اصلی (gallery / files / links / canvas_art) هیچ تغییری نمی‌کنن؛ پس مورد‌های قدیمی هم می‌تونن بیان توی پوشه. */
(function () {
  const st = { folders: [], items: {}, loaded: false, missing: false, at: 0, sig: '', busy: false, cur: {}, reg: {}, ids: {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { try { (window.toast || window.toast2)(m); } catch (e) {} };
  const key = (s, id) => s + ':' + id;
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const isFolder = c => !!c && c !== 'all' && c !== 'none';

  const css = document.createElement('style');
  css.textContent = `
.fld-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 12px}
.fld-bar:empty{display:none}
.fld-chip{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.fld-chip i{font-style:normal;opacity:.65;font-size:.75rem}
.fld-chip.on{background:linear-gradient(135deg,rgba(212,165,255,.38),rgba(255,160,200,.3));border-color:var(--accent,#d4a5ff)}
.fld-chip.act{border-style:dashed}
.fld-note{font-size:.8rem;opacity:.75}
.fld-ov{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
.fld-box{background:#1d1326;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:16px;max-width:360px;width:100%;max-height:80vh;overflow:auto;display:flex;flex-direction:column;gap:8px}
.fld-box h4{margin:0 0 4px}
.fld-box button{text-align:right}
.g-item .g-mv{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:0;opacity:0;transition:.2s;cursor:pointer}
.g-item:hover .g-mv,.g-item:focus-within .g-mv{opacity:1}
@media (hover:none){.g-item .g-mv,.g-item .g-del{opacity:1}}
`;
  document.head.appendChild(css);

  async function load(force) {
    if (st.busy || (!force && st.loaded && Date.now() - st.at < 15000)) return;
    st.busy = true;
    try {
      const a = await dbClient.from('folders').select('*').order('created_at', { ascending: true });
      let b = null;
      if (!a.error) b = await dbClient.from('folder_items').select('*').limit(5000);
      const er = a.error || (b && b.error);
      let sig;
      if (er) { st.missing = /folders|folder_items|relation|schema cache/i.test(er.message || ''); sig = 'missing'; }
      else {
        st.missing = false; sig = JSON.stringify([a.data, b.data]);
        st.folders = a.data || []; st.items = {}; (b.data || []).forEach(r => { st.items[r.key] = r.folder_id; });
      }
      st.loaded = true; st.at = Date.now();
      if (sig !== st.sig) { st.sig = sig; rerender(); }
    } catch (e) {} finally { st.busy = false; }
  }
  function rerender() {
    Object.keys(st.reg).forEach(sec => {
      const r = st.reg[sec];
      if (r && r.bar && r.bar.isConnected && r.bar.offsetParent !== null) { try { r.re(); } catch (e) {} }
    });
  }

  function cur(sec) { const c = st.cur[sec] || 'all'; return (isFolder(c) && !st.folders.some(f => f.id === c)) ? 'all' : c; }
  function draw(sec, bar) {
    if (st.missing) { bar.innerHTML = '<div class="fld-note">📂 برای پوشه‌ها باید SQL شمارهٔ ۲۷ رو یک بار توی Supabase اجرا کنی.</div>'; return; }
    const fs = st.folders.filter(f => f.section === sec), c = cur(sec), ids = st.ids[sec] || [];
    const inF = id => ids.filter(i => st.items[key(sec, i)] === id).length;
    const filed = ids.filter(i => fs.some(f => f.id === st.items[key(sec, i)])).length;
    bar.innerHTML = `<button type="button" class="fld-chip${c === 'all' ? ' on' : ''}" data-f="all">🗂️ همه <i>${fa(ids.length)}</i></button>`
      + (fs.length ? `<button type="button" class="fld-chip${c === 'none' ? ' on' : ''}" data-f="none">📄 بدون پوشه <i>${fa(ids.length - filed)}</i></button>` : '')
      + fs.map(f => `<button type="button" class="fld-chip${c === f.id ? ' on' : ''}" data-f="${esc(f.id)}">📁 ${esc(f.name)} <i>${fa(inF(f.id))}</i></button>`).join('')
      + '<button type="button" class="fld-chip act" data-act="new">➕ پوشهٔ جدید</button>'
      + (isFolder(c) ? '<button type="button" class="fld-chip act" data-act="ren" title="تغییر اسم پوشه">✏️</button><button type="button" class="fld-chip act" data-act="del" title="حذف پوشه">🗑️</button>' : '');
  }
  async function onBar(e) {
    const bar = e.currentTarget, sec = bar.dataset.sec;
    const b = e.target.closest('[data-f],[data-act]'); if (!b) return;
    if (b.dataset.f) { st.cur[sec] = b.dataset.f; return st.reg[sec] && st.reg[sec].re(); }
    const act = b.dataset.act;
    if (act === 'new') { const f = await create(sec); if (f) { st.cur[sec] = f.id; st.reg[sec] && st.reg[sec].re(); } }
    if (act === 'ren') {
      const f = st.folders.find(x => x.id === cur(sec)); if (!f) return;
      const n = prompt('اسم پوشه:', f.name); if (n === null || !n.trim()) return;
      const { error } = await dbClient.from('folders').update({ name: n.trim().slice(0, 40) }).eq('id', f.id);
      if (error) return toast('⚠️ ذخیره نشد');
      f.name = n.trim().slice(0, 40); st.reg[sec].re();
    }
    if (act === 'del') {
      const f = st.folders.find(x => x.id === cur(sec)); if (!f) return;
      if (!confirm('پوشهٔ «' + f.name + '» حذف بشه؟ (چیزی که توشه پاک نمی‌شه، فقط از پوشه درمیاد)')) return;
      const r1 = await dbClient.from('folder_items').delete().eq('folder_id', f.id);
      const r2 = await dbClient.from('folders').delete().eq('id', f.id);
      if (r1.error || r2.error) return toast('⚠️ حذف نشد');
      st.folders = st.folders.filter(x => x.id !== f.id);
      Object.keys(st.items).forEach(k => { if (st.items[k] === f.id) delete st.items[k]; });
      st.cur[sec] = 'all'; st.sig = ''; st.reg[sec].re(); toast('🗑️ پوشه حذف شد');
    }
  }
  async function create(sec, name) {
    if (st.missing) { toast('⚠️ اول SQL شمارهٔ ۲۷ رو توی Supabase اجرا کن'); return null; }
    const n = name || prompt('اسم پوشه (مثلاً اسم سریال یا سفر):', '');
    if (n === null || !String(n).trim()) return null;
    const me = (typeof myName === 'function' ? myName() : '') || '';
    const row = { id: 'fd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), section: sec, name: String(n).trim().slice(0, 40), created_at: Date.now() };
    const { error } = await dbClient.from('folders').insert(row);
    if (error) { toast('⚠️ پوشه ساخته نشد'); return null; }
    st.folders.push(row); st.sig = ''; return row;
  }

  /* نوار پوشه‌ها رو قبل از anchor می‌ذاره؛ ids = شناسهٔ همهٔ موردهای این بخش (برای شمارش) */
  function mount(sec, anchor, re, ids) {
    if (!anchor || !anchor.parentNode) return;
    st.ids[sec] = ids || [];
    let bar = anchor.previousElementSibling;
    if (!bar || !bar.classList || !bar.classList.contains('fld-bar')) {
      bar = document.createElement('div'); bar.className = 'fld-bar';
      anchor.parentNode.insertBefore(bar, anchor);
      bar.addEventListener('click', onBar);
    }
    bar.dataset.sec = sec;
    st.reg[sec] = { re, bar };
    draw(sec, bar);
    load();
  }
  function filter(sec, list, idf) {
    const c = cur(sec); if (c === 'all' || st.missing) return list;
    return list.filter(x => { const f = st.items[key(sec, x[idf || 'id'])]; return c === 'none' ? !f || !st.folders.some(z => z.id === f) : f === c; });
  }
  async function assign(sec, ids, fid) {
    if (st.missing) { toast('⚠️ اول SQL شمارهٔ ۲۷ رو توی Supabase اجرا کن'); return false; }
    try {
      if (!fid) {
        const { error } = await dbClient.from('folder_items').delete().in('key', ids.map(i => key(sec, i)));
        if (error) throw error; ids.forEach(i => { delete st.items[key(sec, i)]; });
      } else {
        const rows = ids.map(i => ({ key: key(sec, i), section: sec, item_id: String(i), folder_id: fid }));
        for (const r of rows) { const { error } = await dbClient.from('folder_items').upsert(r); if (error) throw error; }
        rows.forEach(r => { st.items[r.key] = fid; });
      }
      st.sig = ''; return true;
    } catch (e) { toast('⚠️ انتقال نشد'); return false; }
  }
  /* مورد تازه‌ای که وقتی یک پوشه بازه اضافه می‌شه، خودکار می‌ره توی همون پوشه */
  function addToCurrent(sec, id) { const c = cur(sec); if (isFolder(c) && id) return assign(sec, [id], c); }

  function move(sec, ids, done) {
    ids = [].concat(ids || []); if (!ids.length) return;
    if (st.missing) { toast('⚠️ اول SQL شمارهٔ ۲۷ رو توی Supabase اجرا کن'); return; }
    const ov = document.createElement('div'); ov.className = 'fld-ov';
    const fs = st.folders.filter(f => f.section === sec);
    ov.innerHTML = `<div class="fld-box"><h4>📂 انتقال ${fa(ids.length)} مورد به…</h4>`
      + fs.map(f => `<button type="button" class="fld-chip" data-to="${esc(f.id)}">📁 ${esc(f.name)}</button>`).join('')
      + '<button type="button" class="fld-chip act" data-to="__new">➕ پوشهٔ جدید…</button><button type="button" class="fld-chip" data-to="__none">📄 بیرون از پوشه</button><button type="button" class="fld-chip" data-to="__x">انصراف</button></div>';
    ov.addEventListener('click', async e => {
      if (e.target === ov) return ov.remove();
      const b = e.target.closest('[data-to]'); if (!b) return;
      let to = b.dataset.to;
      if (to === '__x') return ov.remove();
      if (to === '__new') { const f = await create(sec); if (!f) return; to = f.id; }
      ov.remove();
      const ok = await assign(sec, ids, to === '__none' ? null : to);
      if (ok) { toast(to === '__none' ? '📄 از پوشه دراومد' : '📁 منتقل شد'); if (st.reg[sec]) st.reg[sec].re(); if (done) done(); }
    });
    document.body.appendChild(ov);
  }

  window.Folders = { load, mount, filter, assign, move, create, addToCurrent, cur, isFolder, _state: () => st };
})();
