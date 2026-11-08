/* 📂 پوشه‌ها: برای سینما، گیم، گالری، فایل‌ها و بوم
   دو جدول: folders (خود پوشه‌ها) و folder_items (هر مورد توی کدوم پوشه‌ست).
   جدول‌های اصلی (gallery / files / links / canvas_art) هیچ تغییری نمی‌کنن؛ پس مورد‌های قدیمی هم می‌تونن بیان توی پوشه. */
(function () {
  const st = { folders: [], items: {}, loaded: false, missing: false, at: 0, sig: '', busy: false, cur: {}, reg: {}, ids: {}, lab: {}, creating: {}, sel: {}, opts: {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { try { (window.toast || window.toast2)(m); } catch (e) {} };
  const key = (s, id) => s + ':' + id;
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const isFolder = c => !!c && c !== 'all' && c !== 'none';

  const css = document.createElement('style');
  css.textContent = `
.fld-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 12px}.fld-bar .fld-list{margin-bottom:4px}
.fld-bar:empty{display:none}
.fld-chip{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.fld-chip i{font-style:normal;opacity:.65;font-size:.75rem}
.fld-chip.on{background:linear-gradient(135deg,rgba(212,165,255,.38),rgba(255,160,200,.3));border-color:var(--accent,#d4a5ff)}
.fld-chip.act{border-style:dashed}
.fld-note{font-size:.8rem;opacity:.75}
.fld-newin{display:inline-flex;gap:6px;align-items:center;flex:1;min-width:200px}
.fld-inp{flex:1;min-width:0;padding:8px 12px;border-radius:12px;border:1px solid rgba(212,165,255,.4);background:rgba(0,0,0,.3);color:inherit;font:inherit}
.fld-ok,.fld-no{width:34px;height:34px;border-radius:50%;border:0;color:inherit;cursor:pointer;background:rgba(90,214,125,.3)}.fld-no{background:rgba(255,255,255,.1)}
.fld-sep{opacity:.5}.fld-path a[data-act=go]{opacity:.85;color:var(--accent,#d4a5ff)}
.fld-over{outline:2px dashed var(--accent,#d4a5ff);background:rgba(212,165,255,.22)!important}
.fld-picklist{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.fld-pk{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.05);cursor:pointer}.fld-pk img{width:40px;height:40px;object-fit:cover;border-radius:8px}.fld-pk span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fld-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;padding:8px 4px}
.fld-path{display:inline-flex;align-items:center;gap:8px;font-size:1rem}.fld-path a{cursor:pointer;opacity:.6;padding:0 4px}
.fld-meta{flex:1;color:var(--muted,#aaa);font-size:.78rem}
.fld-up,.fld-acts button{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:inherit;cursor:pointer;font-size:.9rem}
.fld-up:hover,.fld-acts button:hover{background:rgba(212,165,255,.3)}.fld-acts button[data-ract=del]:hover{background:rgba(255,77,109,.5)}
.fld-new{border:1px solid rgba(212,165,255,.4);background:rgba(212,165,255,.12);color:inherit;border-radius:999px;padding:7px 14px;font:inherit;font-size:.84rem;cursor:pointer}.fld-new:hover{background:rgba(212,165,255,.28)}
.fld-list{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;background:rgba(0,0,0,.18)}
.fld-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.07);cursor:pointer;transition:background .15s}
.fld-row:last-child{border-bottom:0}.fld-row:hover,.fld-row:focus-visible{background:rgba(212,165,255,.1);outline:none}
.fld-ic{display:inline-flex;flex-shrink:0}.fld-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.fld-by,.fld-ct,.fld-dt{color:var(--muted,#aaa);font-size:.78rem;white-space:nowrap}.fld-acts{display:inline-flex;gap:6px}
@media (max-width:620px){.fld-row{flex-wrap:wrap;row-gap:4px}.fld-nm{flex-basis:calc(100% - 110px)}.fld-by,.fld-ct,.fld-dt{font-size:.72rem}}
.fld-ov{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
.fld-box{background:#1d1326;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:16px;max-width:360px;width:100%;max-height:80vh;overflow:auto;display:flex;flex-direction:column;gap:8px}
.fld-box h4{margin:0 0 4px}
.fld-box button{text-align:right}
.fld-selbtn.on{background:rgba(90,214,125,.3);border-color:rgba(90,214,125,.7)}
.fld-selbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%;padding:8px 12px;margin:6px 0;border-radius:14px;background:rgba(90,214,125,.12);border:1px solid rgba(90,214,125,.4);position:sticky;top:6px;z-index:5;backdrop-filter:blur(8px)}
.fld-selbar b{flex:1;min-width:90px}.fld-selbar .fld-chip{padding:6px 10px}.fld-selbar .fld-chip.dng{background:rgba(255,77,109,.25);border-color:rgba(255,77,109,.6)}
.fld-cb{width:22px;height:22px;border-radius:7px;border:2px solid rgba(255,255,255,.5);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.8rem}
.fld-row.fld-sel .fld-cb,.fld-sel .fld-cb{background:#5ad67d;border-color:#5ad67d;color:#0b2}
.fld-sel{outline:3px solid #5ad67d!important;outline-offset:-3px;box-shadow:0 0 0 3px rgba(90,214,125,.35)!important}
.fld-selon [data-dsec]{cursor:pointer}
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

  const ICON = '<svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><path fill="#e3b341" d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"/></svg>';
  const dateOf = ts => { try { const w = Recur.epochToWall(ts); return Recur.fmtJalaliShort(w.iso); } catch (e) { return ''; } };
  function cur(sec) { const c = st.cur[sec] || 'all'; return (isFolder(c) && !st.folders.some(f => f.id === c)) ? 'all' : c; }
  const inFolder = sec => isFolder(cur(sec));
  const hasFolders = sec => st.folders.some(f => f.section === sec);
  /* پوشه توی پوشه: والدِ هر پوشه به‌صورت یک «مورد» با کلید fd_<بخش>:<شناسه> نگه‌داری می‌شه (بدون نیاز به SQL تازه) */
  const pkey = (sec, id) => 'fd_' + sec + ':' + id;
  const parentOf = (sec, id) => { const p = st.items[pkey(sec, id)]; return (p && p !== id && st.folders.some(f => f.id === p && f.section === sec)) ? p : null; };
  const childrenOf = (sec, pid) => st.folders.filter(f => f.section === sec && (parentOf(sec, f.id) || null) === (pid || null));
  const descendants = (sec, id) => { const out = []; const walk = p => childrenOf(sec, p).forEach(c => { out.push(c.id); walk(c.id); }); walk(id); return out; };
  const pathOf = (sec, id) => { const out = []; let c = id, n = 0; while (c && n++ < 20) { const f = st.folders.find(x => x.id === c); if (!f) break; out.unshift(f); c = parentOf(sec, c); } return out; };
  const S = sec => { const c = cur(sec); let x = st.sel[sec]; if (!x) x = st.sel[sec] = { on: false, items: new Set(), fds: new Set(), at: c }; if (x.at !== c) { x.at = c; x.items.clear(); x.fds.clear(); } return x; };
  function mark(sec) {
    const x = S(sec), r = st.reg[sec], bar = r && r.bar; if (!bar) return;
    const host = bar.parentNode; if (!host) return;
    host.classList.toggle('fld-selon', !!x.on);
    host.querySelectorAll('[data-dsec="' + sec + '"]').forEach(el => el.classList.toggle('fld-sel', x.on && x.items.has(String(el.dataset.did))));
    bar.querySelectorAll('.fld-row[data-did]').forEach(el => { el.classList.toggle('fld-sel', x.on && x.fds.has(el.dataset.did)); const cb = el.querySelector('.fld-cb'); if (cb) cb.textContent = el.classList.contains('fld-sel') ? '✓' : ''; });
    const b = bar.querySelector('.fld-selbar b'); if (b) b.textContent = fa(x.items.size + x.fds.size) + ' مورد انتخاب شد';
  }
  function draw(sec, bar) {
    if (st.missing) { bar.innerHTML = '<div class="fld-note">📂 برای پوشه‌ها باید SQL شمارهٔ ۲۷ رو یک بار توی Supabase اجرا کنی.</div>'; return; }
    const c = cur(sec), ids = st.ids[sec] || [];
    const f = isFolder(c) ? st.folders.find(x => x.id === c) : null;
    const kids = childrenOf(sec, f ? f.id : null);
    const countOf = id => ids.filter(i => st.items[key(sec, i)] === id).length;
    const sx = S(sec); const selBtn = `<button type="button" class="fld-new fld-selbtn${sx.on ? ' on' : ''}" data-act="sel">☑️ ${sx.on ? 'پایان انتخاب' : 'انتخاب'}</button>`;
    const rowBtns = id => `<span class="fld-acts"><button type="button" data-ract="ren" data-id="${esc(id)}" title="تغییر اسم">✏️</button><button type="button" data-ract="del" data-id="${esc(id)}" title="حذف پوشه">🗑️</button></span>`;
    const newBtn = st.creating[sec] ? '<span class="fld-newin"><input type="text" class="fld-inp" maxlength="40" placeholder="اسم پوشه…" /><button type="button" class="fld-ok" data-act="ok" title="ساخت">✓</button><button type="button" class="fld-no" data-act="cancel" title="انصراف">✕</button></span>' : '<button type="button" class="fld-new" data-act="new">➕ پوشهٔ جدید</button>';
    let h;
    if (f) {
      const pth = pathOf(sec, f.id), par = parentOf(sec, f.id);
      h = `<div class="fld-head"><button type="button" class="fld-up" data-act="up" data-f="${esc(par || '')}" title="برگشت">↑</button><span class="fld-path"><a data-act="root">/</a>`
        + pth.map((x, i) => i === pth.length - 1 ? `<span class="fld-ic">${ICON}</span><b>${esc(x.name)}</b>` : `<a data-act="go" data-id="${esc(x.id)}">${esc(x.name)}</a><span class="fld-sep">/</span>`).join('')
        + `</span><span class="fld-meta">${f.author ? '👤 ' + esc(f.author) + ' · ' : ''}${fa(countOf(f.id))} مورد${kids.length ? ' · ' + fa(kids.length) + ' پوشه' : ''}${f.created_at ? ' · ' + esc(dateOf(f.created_at)) : ''}</span>${newBtn}<button type="button" class="fld-new" data-act="pick">➕ افزودن از موجودها</button>${selBtn}${rowBtns(f.id)}</div>`;
    } else {
      h = `<div class="fld-head"><span class="fld-path">📂 <b>پوشه‌ها</b></span><span class="fld-meta">${kids.length ? fa(kids.length) + ' پوشه' : 'هنوز پوشه‌ای نداریم'}</span>${newBtn}${selBtn}</div>`;
    }
    if (sx.on) {
      h += '<div class="fld-selbar"><b></b><button type="button" class="fld-chip" data-act="selall">✔️ انتخاب همه</button><button type="button" class="fld-chip" data-act="selmove">📂 انتقال به پوشه</button>'
        + (f ? '<button type="button" class="fld-chip" data-act="selout">📄 خارج‌کردن از پوشه</button><button type="button" class="fld-chip" data-act="pick">➕ افزودن از موجودها</button>' : '')
        + '<button type="button" class="fld-chip dng" data-act="seldel">🗑️ حذف</button></div>';
    }
    if (kids.length) h += '<div class="fld-list">' + kids.map(x => {
      const nk = childrenOf(sec, x.id).length;
      return `<div class="fld-row" data-f="${esc(x.id)}" data-dsec="fd_${esc(sec)}" data-did="${esc(x.id)}" draggable="true" tabindex="0">${sx.on ? '<span class="fld-cb"></span>' : ''}<span class="fld-ic">${ICON}</span><span class="fld-nm">${esc(x.name)}</span>`
        + `<span class="fld-by">${x.author ? '👤 ' + esc(x.author) : ''}</span><span class="fld-ct">${fa(countOf(x.id))} مورد${nk ? ' · ' + fa(nk) + ' پوشه' : ''}</span><span class="fld-dt">${esc(dateOf(x.created_at))}</span>${rowBtns(x.id)}</div>`;
    }).join('') + '</div>';
    bar.innerHTML = h; mark(sec);
    if (st.creating[sec]) { const i = bar.querySelector('.fld-inp'); if (i) { i.focus(); i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submitNew(sec, i.value); } else if (e.key === 'Escape') { st.creating[sec] = false; draw(sec, bar); } }; } }
  }
  async function submitNew(sec, v) {
    if (!String(v || '').trim()) return;
    const c = cur(sec), f = await create(sec, v, isFolder(c) ? c : null); if (!f) return;
    st.creating[sec] = false; st.cur[sec] = f.id; st.reg[sec] && st.reg[sec].re();
  }
  async function renameF(sec, id) {
    const f = st.folders.find(x => x.id === id); if (!f) return;
    const n = prompt('اسم پوشه:', f.name); if (n === null || !n.trim()) return;
    const { error } = await dbClient.from('folders').update({ name: n.trim().slice(0, 40) }).eq('id', f.id);
    if (error) return toast('⚠️ ذخیره نشد');
    f.name = n.trim().slice(0, 40); st.sig = ''; st.reg[sec] && st.reg[sec].re();
  }
  async function deleteF(sec, id, quiet) {
    const f = st.folders.find(x => x.id === id); if (!f) return true;
    if (!quiet && !confirm('پوشهٔ «' + f.name + '» حذف بشه؟' + (descendants(sec, f.id).length ? ' (پوشه‌های داخلش هم حذف می‌شن)' : '') + ' (فایل و لینک‌های داخلش پاک نمی‌شن، فقط از پوشه درمیان)')) return false;
    const gone = [f.id].concat(descendants(sec, f.id)), par = parentOf(sec, f.id);
    let bad = false;
    for (const g of gone) {
      const r1 = await dbClient.from('folder_items').delete().eq('folder_id', g);
      const r3 = await dbClient.from('folder_items').delete().eq('key', pkey(sec, g));
      const r2 = await dbClient.from('folders').delete().eq('id', g);
      if (r1.error || r2.error || r3.error) bad = true;
    }
    if (bad) { toast('⚠️ حذف نشد'); return false; }
    st.folders = st.folders.filter(x => !gone.includes(x.id));
    Object.keys(st.items).forEach(k => { if (gone.includes(st.items[k]) || gone.some(g => k === pkey(sec, g))) delete st.items[k]; });
    if (gone.includes(st.cur[sec])) st.cur[sec] = par || 'all';
    st.sig = ''; if (!quiet) { st.reg[sec] && st.reg[sec].re(); toast('🗑️ پوشه حذف شد'); }
    return true;
  }
  const selEnd = sec => { const x = S(sec); x.on = false; x.items.clear(); x.fds.clear(); };
  async function selAct(sec, act) {
    const x = S(sec), items = [...x.items], fds = [...x.fds], re = () => st.reg[sec] && st.reg[sec].re();
    if (act === 'selall') {
      const all = (st.ids[sec] || []).filter(i => { const f = st.items[key(sec, i)]; const c = cur(sec); return isFolder(c) ? f === c : (!f || !st.folders.some(z => z.id === f)); });
      const c = cur(sec); childrenOf(sec, isFolder(c) ? c : null).forEach(f => x.fds.add(f.id));
      all.forEach(i => x.items.add(String(i))); return mark(sec);
    }
    if (!items.length && !fds.length) return toast('اول چند مورد رو انتخاب کن');
    if (act === 'selmove') {
      if (!items.length) return toast('برای انتقال، فایل/آیتم انتخاب کن (پوشه‌ها رو بکش توی پوشهٔ دیگه)');
      return move(sec, items, () => { selEnd(sec); re(); });
    }
    if (act === 'selout') {
      if (!items.length) return toast('آیتمی انتخاب نشده');
      if (await assign(sec, items, null)) { toast('📄 ' + fa(items.length) + ' مورد از پوشه دراومد'); selEnd(sec); re(); }
      return;
    }
    if (act === 'seldel') {
      const o = st.opts[sec] || {};
      if (items.length && !o.del) return toast('حذف دسته‌جمعی برای این بخش در دسترس نیست');
      if (!confirm('🗑️ ' + fa(items.length + fds.length) + ' مورد حذف بشن؟' + (items.length ? ' (' + fa(items.length) + ' آیتم برای همیشه پاک می‌شن)' : '') + (fds.length ? ' (' + fa(fds.length) + ' پوشه؛ محتوای پوشه‌ها پاک نمی‌شه)' : ''))) return;
      let ok = true;
      for (const d of fds) { if (st.folders.some(f => f.id === d)) ok = (await deleteF(sec, d, true)) && ok; }
      if (items.length) {
        try { const r = await o.del(items); if (r === false) ok = false; else { await dbClient.from('folder_items').delete().in('key', items.map(i => key(sec, i))); items.forEach(i => { delete st.items[key(sec, i)]; }); } } catch (e) { ok = false; }
      }
      st.sig = ''; selEnd(sec); re();
      toast(ok ? '🗑️ حذف شد' : '⚠️ بعضی‌ها حذف نشدن');
    }
  }
  async function onBar(e) {
    const bar = e.currentTarget, sec = bar.dataset.sec;
    if (e.target.closest('.fld-inp')) return;
    const rb = e.target.closest('[data-ract]');
    if (rb) { e.stopPropagation(); return rb.dataset.ract === 'ren' ? renameF(sec, rb.dataset.id) : deleteF(sec, rb.dataset.id); }
    const a = e.target.closest('[data-act]');
    if (a) {
      if (a.dataset.act === 'sel') { const x = S(sec); x.on = !x.on; if (!x.on) { x.items.clear(); x.fds.clear(); } st.reg[sec] && st.reg[sec].re(); return draw(sec, bar); }
      if (/^sel(all|move|out|del)$/.test(a.dataset.act)) return selAct(sec, a.dataset.act);
      if (a.dataset.act === 'up') { st.cur[sec] = a.dataset.f || 'all'; return st.reg[sec] && st.reg[sec].re(); }
      if (a.dataset.act === 'root') { st.cur[sec] = 'all'; return st.reg[sec] && st.reg[sec].re(); }
      if (a.dataset.act === 'go') { st.cur[sec] = a.dataset.id; return st.reg[sec] && st.reg[sec].re(); }
      if (a.dataset.act === 'new') { st.creating[sec] = true; return draw(sec, bar); }
      if (a.dataset.act === 'cancel') { st.creating[sec] = false; return draw(sec, bar); }
      if (a.dataset.act === 'ok') { const i = bar.querySelector('.fld-inp'); return submitNew(sec, i && i.value); }
      if (a.dataset.act === 'pick') return pick(sec);
      return;
    }
    const r = e.target.closest('[data-f]');
    if (r && S(sec).on) { const x = S(sec), id = r.dataset.f; x.fds.has(id) ? x.fds.delete(id) : x.fds.add(id); return mark(sec); }
    if (r) { st.cur[sec] = r.dataset.f; if (st.reg[sec]) st.reg[sec].re(); }
  }
  async function create(sec, name, parent) {
    if (st.missing) { toast('⚠️ اول SQL شمارهٔ ۲۷ رو توی Supabase اجرا کن'); return null; }
    const n = name || prompt('اسم پوشه (مثلاً اسم سریال یا سفر):', '');
    if (n === null || !String(n).trim()) return null;
    const me = (typeof myName === 'function' ? myName() : '') || '';
    const row = { id: 'fd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), section: sec, name: String(n).trim().slice(0, 40), author: me, created_at: Date.now() };
    let { error } = await dbClient.from('folders').insert(row);
    if (error && /author/i.test(error.message || '')) { const r2 = Object.assign({}, row); delete r2.author; ({ error } = await dbClient.from('folders').insert(r2)); }
    if (error) { toast('⚠️ پوشه ساخته نشد'); return null; }
    st.folders.push(row);
    if (parent) { const r = await dbClient.from('folder_items').upsert({ key: pkey(sec, row.id), section: 'fd_' + sec, item_id: row.id, folder_id: parent }); if (!r.error) st.items[pkey(sec, row.id)] = parent; }
    st.sig = ''; return row;
  }

  /* نوار پوشه‌ها رو قبل از anchor می‌ذاره؛ ids = شناسهٔ همهٔ موردهای این بخش (برای شمارش) */
  function mount(sec, anchor, re, ids, opts) {
    if (opts) st.opts[sec] = opts;
    if (!anchor || !anchor.parentNode) return;
    const arr = ids || []; st.lab[sec] = arr.map(x => (x && typeof x === 'object') ? x : { id: x, label: String(x) }); st.ids[sec] = st.lab[sec].map(x => x.id);
    let bar = anchor.previousElementSibling;
    if (!bar || !bar.classList || !bar.classList.contains('fld-bar')) {
      bar = document.createElement('div'); bar.className = 'fld-bar';
      anchor.parentNode.insertBefore(bar, anchor);
      bar.addEventListener('click', onBar);
    }
    bar.dataset.sec = sec;
    st.reg[sec] = { re, bar };
    draw(sec, bar); setTimeout(() => mark(sec), 0);
    load();
  }
  function filter(sec, list, idf) {
    if (st.missing) return list;
    const c = cur(sec), fs = st.folders;
    return list.filter(x => { const f = st.items[key(sec, x[idf || 'id'])]; return isFolder(c) ? f === c : (!f || !fs.some(z => z.id === f)); });
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
      + fs.map(f => `<button type="button" class="fld-chip" data-to="${esc(f.id)}"><span class="fld-ic">${ICON}</span>${esc(pathOf(sec, f.id).map(x => x.name).join(' / '))}</button>`).join('')
      + '<div class="fld-newin"><input type="text" class="fld-inp" maxlength="40" placeholder="➕ اسم پوشهٔ جدید…" /><button type="button" class="fld-ok" data-to="__new" title="بساز و منتقل کن">✓</button></div><button type="button" class="fld-chip" data-to="__none">📄 بیرون از پوشه</button><button type="button" class="fld-chip" data-to="__x">انصراف</button></div>';
    ov.addEventListener('click', async e => {
      if (e.target === ov) return ov.remove();
      const b = e.target.closest('[data-to]'); if (!b) return;
      let to = b.dataset.to;
      if (to === '__x') return ov.remove();
      if (to === '__new') { const i = ov.querySelector('.fld-inp'); if (!i || !i.value.trim()) { if (i) i.focus(); return; } const f = await create(sec, i.value); if (!f) return; to = f.id; }
      ov.remove();
      const ok = await assign(sec, ids, to === '__none' ? null : to);
      if (ok) { toast(to === '__none' ? '📄 از پوشه دراومد' : '📁 منتقل شد'); if (st.reg[sec]) st.reg[sec].re(); if (done) done(); }
    });
    document.body.appendChild(ov);
  }

  /* افزودن موردهای موجود (که توی هیچ پوشه‌ای نیستن) به پوشهٔ بازِ همین بخش */
  function pick(sec) {
    const c = cur(sec); if (!isFolder(c)) return;
    const free = (st.lab[sec] || []).filter(x => { const f = st.items[key(sec, x.id)]; return !f || !st.folders.some(z => z.id === f); });
    const ov = document.createElement('div'); ov.className = 'fld-ov';
    ov.innerHTML = '<div class="fld-box"><h4>➕ چی بیاد توی این پوشه؟</h4>' + (free.length
      ? '<div class="fld-picklist">' + free.map(x => `<label class="fld-pk"><input type="checkbox" value="${esc(x.id)}" />${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy">` : ''}<span>${esc(x.label)}</span></label>`).join('') + '</div><button type="button" class="fld-new" data-go="1">✓ اضافه کن</button>'
      : '<div class="fld-note">چیزی بیرون از پوشه نمونده؛ یا همه‌شون توی پوشه‌ان یا هنوز چیزی اضافه نکردین.</div>')
      + '<button type="button" class="fld-chip" data-x="1">بستن</button></div>';
    ov.addEventListener('click', async e => {
      if (e.target === ov || e.target.closest('[data-x]')) return ov.remove();
      if (!e.target.closest('[data-go]')) return;
      const ids = [...ov.querySelectorAll('input:checked')].map(i => i.value); if (!ids.length) return toast('یکی رو انتخاب کن');
      ov.remove();
      if (await assign(sec, ids, c)) { toast('📁 ' + fa(ids.length) + ' مورد اضافه شد'); st.reg[sec] && st.reg[sec].re(); }
    });
    document.body.appendChild(ov);
  }
  /* انتخاب آیتم‌ها با کلیک وقتی حالت انتخاب روشنه */
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-dsec]'); if (!t || /^fd_/.test(t.dataset.dsec)) return;
    const sec = t.dataset.dsec, r = st.reg[sec]; if (!r) return;
    const x = S(sec); if (!x.on) return;
    e.preventDefault(); e.stopPropagation();
    const id = String(t.dataset.did); x.items.has(id) ? x.items.delete(id) : x.items.add(id); mark(sec);
  }, true);
  /* کشیدن و رها کردن روی پوشه (کامپیوتر) */
  let drag = null;
  const dropEl = e => e.target && e.target.closest && e.target.closest('.fld-row[data-f],.fld-head [data-act=up]');
  const isFd = d => d && /^fd_/.test(d.sec);
  document.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('[data-dsec]'); if (!t) return; drag = { sec: t.dataset.dsec, id: t.dataset.did }; try { e.dataTransfer.setData('text/plain', drag.id); e.dataTransfer.effectAllowed = 'move'; } catch (_) {} });
  document.addEventListener('dragend', () => { drag = null; document.querySelectorAll('.fld-over').forEach(x => x.classList.remove('fld-over')); });
  document.addEventListener('dragover', e => { const r = drag && dropEl(e); if (r) { e.preventDefault(); r.classList.add('fld-over'); } });
  document.addEventListener('dragleave', e => { const r = dropEl(e); if (r) r.classList.remove('fld-over'); });
  document.addEventListener('drop', async e => {
    const r = drag && dropEl(e); if (!r) return; e.preventDefault(); r.classList.remove('fld-over');
    const bar = r.closest('.fld-bar'), sec = bar && bar.dataset.sec, d = drag; drag = null;
    if (isFd(d)) {
      if (!sec || d.sec !== 'fd_' + sec) return toast('این پوشه مال بخش دیگه‌ست');
      const to = r.dataset.f || null;
      if (to === d.id || (to && descendants(sec, d.id).includes(to))) return toast('نمی‌شه پوشه رو بندازی توی خودش');
      let ok = true;
      if (to) { const x = await dbClient.from('folder_items').upsert({ key: pkey(sec, d.id), section: 'fd_' + sec, item_id: d.id, folder_id: to }); ok = !x.error; if (ok) st.items[pkey(sec, d.id)] = to; }
      else { const x = await dbClient.from('folder_items').delete().eq('key', pkey(sec, d.id)); ok = !x.error; if (ok) delete st.items[pkey(sec, d.id)]; }
      if (ok) { st.sig = ''; toast('📁 جابه‌جا شد'); st.reg[sec] && st.reg[sec].re(); } else toast('⚠️ جابه‌جا نشد');
      return;
    }
    if (!sec || sec !== d.sec) return toast('این مورد مال بخش دیگه‌ست');
    const fid = r.dataset.f || null;
    if (await assign(sec, [d.id], fid)) { toast(fid ? '📁 توی پوشه رفت' : '📄 از پوشه دراومد'); st.reg[sec] && st.reg[sec].re(); }
  });

  window.Folders = { load, mount, filter, assign, move, create, addToCurrent, cur, isFolder, inFolder, hasFolders, _state: () => st };
})();
