/* 💼 ظاهر حرفه‌ای‌تر: جستجوی سریع (Ctrl+K)، نوار پیشرفت اسکرول، اعلان آفلاین، عنوان تب هر بخش، حلقهٔ فوکوس و اسکرول‌بار قشنگ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const norm = s => String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ٟ‌]/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `
::selection{background:rgba(212,165,255,.45);color:#fff}
:focus-visible{outline:2px solid #d4a5ff;outline-offset:2px;border-radius:6px}
html{scrollbar-width:thin;scrollbar-color:rgba(212,165,255,.45) transparent}
::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(212,165,255,.35);border-radius:9px;border:2px solid transparent;background-clip:padding-box}::-webkit-scrollbar-thumb:hover{background:rgba(212,165,255,.6);background-clip:padding-box;border:2px solid transparent}
.pr-bar{position:fixed;top:0;left:0;right:0;height:3px;z-index:9000;pointer-events:none;background:transparent}
.pr-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd45a,#ff9ed2,#c9a2ff);box-shadow:0 0 10px rgba(255,158,210,.7);border-radius:0 3px 3px 0;transition:width .12s}
.pr-off{position:fixed;left:50%;top:12px;transform:translate(-50%,-90px);z-index:9100;padding:9px 18px;border-radius:999px;background:#2a1d3c;border:1px solid rgba(255,200,100,.5);color:#ffd45a;font-size:.88rem;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:transform .35s cubic-bezier(.2,1.2,.4,1)}
.pr-off.show{transform:translate(-50%,0)}.pr-off.ok{color:#5ad67d;border-color:rgba(90,214,125,.5)}
.pr-ov{position:fixed;inset:0;z-index:9200;background:rgba(8,5,16,.66);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:10vh 14px 14px;animation:prFade .18s ease}
@keyframes prFade{from{opacity:0}to{opacity:1}}
.pr-box{width:min(620px,100%);max-height:76vh;display:flex;flex-direction:column;border-radius:20px;background:linear-gradient(160deg,#241a38,#171024);border:1px solid rgba(212,165,255,.4);box-shadow:0 24px 70px rgba(0,0,0,.65);overflow:hidden;animation:prUp .22s cubic-bezier(.2,1,.3,1)}
@keyframes prUp{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}
.pr-in{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(212,165,255,.2)}
.pr-in input{flex:1;background:none;border:0;outline:0;color:#fff;font:inherit;font-size:1.05rem;min-width:0}.pr-in kbd{font:inherit;font-size:.7rem;color:#bda7dc;border:1px solid rgba(212,165,255,.3);border-radius:6px;padding:2px 7px}
.pr-list{overflow-y:auto;padding:6px}.pr-g{font-size:.72rem;color:#a592c6;padding:10px 12px 4px;letter-spacing:.5px}
.pr-it{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;color:#f3ecff}.pr-it .ic{font-size:1.15rem;width:26px;text-align:center}.pr-it .tt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pr-it small{color:#a592c6;font-size:.72rem}
.pr-it.on{background:linear-gradient(90deg,rgba(212,165,255,.28),rgba(255,143,184,.18))}
.pr-empty{padding:26px;text-align:center;color:#a592c6}
.pr-ft{display:flex;gap:14px;justify-content:center;padding:8px;border-top:1px solid rgba(212,165,255,.15);font-size:.7rem;color:#a592c6}
#cmdBtn{font-size:1.05rem}
`;
  let ov = null, items = [], sel = 0;
  function screens() {
    const out = []; document.querySelectorAll('.nav-btn[data-screen]').forEach(b => { const t = (b.textContent || '').trim(); if (t) out.push({ g: 'بخش‌ها', ic: t.split(' ')[0], t: t.split(' ').slice(1).join(' ') || t, k: norm(t), go: () => showScreen(b.dataset.screen) }); });
    return out;
  }
  function data() {
    const out = [];
    try { if (typeof chaptersCache !== 'undefined' && chaptersCache && chaptersCache.list) chaptersCache.list.forEach(c => out.push({ g: 'دفترچه', ic: '📖', t: c.title || 'بدون عنوان', k: norm(c.title), go: () => { showScreen('diary'); try { openChapter(c.id); } catch (e) {} } })); } catch (e) {}
    try { if (typeof funList !== 'undefined') funList.forEach(l => out.push({ g: l.category === 'game' ? 'گیم' : 'سینما', ic: l.category === 'game' ? '🎮' : '🍿', t: l.title || l.url, k: norm(l.title), go: () => showScreen(l.category === 'game' ? 'games' : 'cinema') })); } catch (e) {}
    try { if (typeof filesList !== 'undefined') filesList.forEach(f => out.push({ g: 'فایل‌ها', ic: '📁', t: f.name, k: norm(f.name), go: () => showScreen('files') })); } catch (e) {}
    try { if (typeof playlist !== 'undefined') playlist.forEach(s => out.push({ g: 'پلی‌لیست', ic: '🎵', t: s.title || s.name, k: norm(s.title || s.name), go: () => showScreen('playlist') })); } catch (e) {}
    return out;
  }
  function render() {
    const q = norm(($('prQ') || {}).value || '').trim(), all = screens().concat(q ? data() : []);
    items = all.filter(x => !q || x.k.includes(q)).slice(0, 40);
    if (sel >= items.length) sel = 0;
    let h = '', last = '';
    items.forEach((x, i) => { if (x.g !== last) { h += `<div class="pr-g">${esc(x.g)}</div>`; last = x.g; } h += `<div class="pr-it${i === sel ? ' on' : ''}" data-i="${i}"><span class="ic">${esc(x.ic)}</span><span class="tt">${esc(x.t)}</span></div>`; });
    $('prL').innerHTML = h || '<div class="pr-empty">چیزی پیدا نشد 🔍</div>';
    const on = $('prL').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function run(i) { const x = items[i]; if (!x) return; close(); try { x.go(); } catch (e) {} }
  function close() { if (ov) { ov.remove(); ov = null; } }
  function open() {
    if (ov) return close(); sel = 0;
    ov = document.createElement('div'); ov.className = 'pr-ov';
    ov.innerHTML = '<div class="pr-box"><div class="pr-in"><span>🔍</span><input id="prQ" type="text" placeholder="برو به یه بخش یا دنبال یه فایل، فیلم، آهنگ و فصل دفترچه بگرد..." autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="pr-list" id="prL"></div><div class="pr-ft"><span>↑↓ حرکت</span><span>Enter باز کردن</span><span>Ctrl+K</span></div></div>';
    document.body.appendChild(ov); render(); $('prQ').focus();
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    $('prL').addEventListener('click', e => { const it = e.target.closest('.pr-it'); if (it) run(+it.dataset.i); });
    $('prL').addEventListener('mousemove', e => { const it = e.target.closest('.pr-it'); if (it && +it.dataset.i !== sel) { sel = +it.dataset.i; $('prL').querySelectorAll('.pr-it').forEach((n, i) => n.classList.toggle('on', i === sel)); } });
    $('prQ').addEventListener('input', () => { sel = 0; render(); });
    $('prQ').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
  }
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    /* نوار پیشرفت اسکرول */
    const bar = document.createElement('div'); bar.className = 'pr-bar'; bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
    let tk = 0; const upd = () => { tk = 0; const d = document.documentElement, m = d.scrollHeight - innerHeight; bar.firstChild.style.width = (m > 0 ? Math.min(100, scrollY / m * 100) : 0) + '%'; };
    addEventListener('scroll', () => { if (!tk) tk = requestAnimationFrame(upd); }, { passive: true });
    /* آفلاین */
    const off = document.createElement('div'); off.className = 'pr-off'; document.body.appendChild(off); let ot = 0;
    const net = on => { clearTimeout(ot); off.className = 'pr-off show' + (on ? ' ok' : ''); off.textContent = on ? '✅ دوباره آنلاین شدی' : '📡 اینترنت قطع شد؛ بعضی بخش‌ها کار نمی‌کنن'; if (on) ot = setTimeout(() => off.classList.remove('show'), 2500); };
    addEventListener('offline', () => net(false)); addEventListener('online', () => net(true)); if (navigator.onLine === false) net(false);
    /* دکمهٔ جستجو + میانبر */
    const ub = $('updatesBtn'); if (ub) { const b = document.createElement('button'); b.className = 'icon-btn'; b.id = 'cmdBtn'; b.title = 'جستجوی سریع (Ctrl+K)'; b.textContent = '🔍'; b.onclick = open; ub.parentNode.insertBefore(b, ub); }
    addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && ov) close();
      else if (e.key === '/' && !ov && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && !(document.activeElement || {}).isContentEditable) { e.preventDefault(); open(); }
    });
    /* عنوان تب = نام بخش */
    if (typeof window.showScreen === 'function') {
      const orig = window.showScreen;
      window.showScreen = function (name) { const r = orig.apply(this, arguments); try { const b = document.querySelector('.nav-btn[data-screen="' + name + '"]'); const t = b ? b.textContent.trim().split(' ').slice(1).join(' ') : ''; document.title = (t && name !== 'menu' ? t + ' · ' : '') + 'Our Memories'; } catch (e) {} return r; };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
