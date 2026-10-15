/* 🎓 برنامهٔ کلاس‌ها (روزهای فرد و زوج) — داخل صفحهٔ تقویم
   روزهای هفته مثل دانشگاه‌های ایران: زوج = شنبه، دوشنبه، چهارشنبه، جمعه | فرد = یکشنبه، سه‌شنبه، پنجشنبه
   هر کلاس: عنوان، استاد، مکان، روزها، ساعت شروع و پایان، رنگ؛ اضافه، ویرایش و حذف می‌شه. */
(function () {
  'use strict';
  const esc = s => (window.escapeHtml ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fa = n => Recur.toFa(n);
  const ODD = [1, 3, 5], EVEN = [0, 2, 4, 6];                 // شنبه=۰ ... جمعه=۶
  const DAY_NAMES = Recur.JAL_WEEKDAYS;                     // ['شنبه', 'یکشنبه', ...]
  const COLORS = ['#b57bff', '#ff8fc0', '#6fe3ff', '#ffd54f', '#7ae09a', '#ff9d6b', '#8b9bff', '#ff6f91'];
  const hhmmFa = t => fa(t);
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const me = () => (typeof myName === 'function' && myName()) || 'ناشناس';

  let remCols = true, list = [], missing = false, loaded = false, loading = false;
  let filter = { parity: 'all', who: 'all' };
  let editing = null;      // null | 'new' | id
  let draft = null;
  let tab = 'cal';

  const parityOf = days => days.every(d => ODD.includes(d)) ? 'odd' : days.every(d => EVEN.includes(d)) ? 'even' : 'mixed';
  const parityLabel = p => p === 'odd' ? 'فرد' : p === 'even' ? 'زوج' : '';
  const dayList = c => String(c.days || '').split(',').filter(x => x !== '').map(Number).filter(n => n >= 0 && n <= 6);
  const norm = r => Object.assign({}, r, { _days: dayList(r) });

  async function load() {
    if (loading) return; loading = true;
    try {
      const { data, error } = await dbClient.from('classes').select('*');
      if (error) { missing = /classes|relation|schema cache/i.test(error.message || ''); }
      else { missing = false; list = (data || []).map(norm); }
      loaded = true;
    } finally { loading = false; }
    render(); if (typeof renderDayPanel === 'function') { try { renderDayPanel(); } catch (e) {} }
  }

  /* ---------- جستجوی برنامهٔ یه روز ---------- */
  const dayClasses = wd => list.filter(c => c._days.includes(wd)).sort((a, b) => (toMin(a.start_time) || 0) - (toMin(b.start_time) || 0));
  const overlaps = (c, wd) => dayClasses(wd).some(o => o.id !== c.id && (o.author || '') === (c.author || '') && (toMin(o.start_time) || 0) < (toMin(c.end_time) || 0) && (toMin(c.start_time) || 0) < (toMin(o.end_time) || 0));
  const timeStr = c => (c.start_time ? hhmmFa(c.start_time) : '') + (c.end_time ? '–' + hhmmFa(c.end_time) : '');

  /* خلاصه‌ای از کلاس‌های یه تاریخ، برای پنل روز توی تقویم */
  function dayHtml(iso) {
    if (!list.length) return '';
    const wd = Recur.weekdayIndex(iso), cs = dayClasses(wd); if (!cs.length) return '';
    return `<div class="cls-mini"><div class="cls-mini-h">🎓 کلاس‌های این روز (${parityLabel(ODD.includes(wd) ? 'odd' : 'even')})</div>${cs.map(c => `<button type="button" class="cls-mini-i" style="--c:${esc(c.color || COLORS[0])}" onclick="Classes.setTab('classes')"><b>${timeStr(c)}</b> ${esc(c.title)}${c.place ? ' · ' + esc(c.place) : ''}<small>${esc(c.author || '')}</small></button>`).join('')}</div>`;
  }

  /* ---------- نمایش ---------- */
  function nextClass() {
    if (!list.length) return null;
    const now = Recur.epochToWall(Date.now()), nowMin = (+now.hhmm.slice(0, 2)) * 60 + (+now.hhmm.slice(3));
    const wd0 = Recur.weekdayIndex(now.iso);
    for (let k = 0; k < 7; k++) {
      const wd = (wd0 + k) % 7;
      const c = dayClasses(wd).filter(c => filterOk(c)).find(c => k > 0 || (toMin(c.start_time) || 0) >= nowMin);
      if (c) return { c, k, wd };
    }
    return null;
  }
  const filterOk = c => (filter.who === 'all' || (c.author || '') === filter.who);
  function render() {
    const box = document.getElementById('classesBox'); if (!box) return;
    if (missing) { box.innerHTML = '<div class="empty-state"><div class="emoji">🛠️</div><p>برای برنامهٔ کلاس‌ها باید فایل supabase-setup.sql رو یک بار توی Supabase اجرا کنی.</p></div>'; return; }
    const authors = [...new Set(list.map(c => c.author).filter(Boolean))];
    const chip = (on, attr, label) => `<button type="button" class="gd-chip${on ? ' on' : ''}" ${attr}>${label}</button>`;
    const showDays = filter.parity === 'odd' ? ODD : filter.parity === 'even' ? EVEN : [0, 1, 2, 3, 4, 5, 6];
    const today = Recur.weekdayIndex(Recur.todayIso()), nx = nextClass();
    let h = `<div class="cls-bar"><div class="gd-row"><span class="gd-lab">روزها</span>${chip(filter.parity === 'all', 'data-parity="all"', 'همه')}${chip(filter.parity === 'odd', 'data-parity="odd"', '🔵 فرد <small>ی · س · پ</small>')}${chip(filter.parity === 'even', 'data-parity="even"', '🟣 زوج <small>ش · د · چ · ج</small>')}</div>
      ${authors.length > 1 ? `<div class="gd-row"><span class="gd-lab">برنامهٔ</span>${chip(filter.who === 'all', 'data-who=""', 'همه')}${authors.map(a => chip(filter.who === a, `data-who="${esc(a)}"`, esc(a))).join('')}</div>` : ''}
      <button type="button" class="btn" data-cls="new">➕ کلاس جدید</button></div>`;
    if (nx) h += `<div class="cls-next">⏭️ کلاس بعدی: <b>${esc(nx.c.title)}</b> · ${nx.k === 0 ? 'امروز' : nx.k === 1 ? 'فردا' : DAY_NAMES[nx.wd]} ساعت ${hhmmFa(nx.c.start_time || '')}${nx.c.place ? ' · ' + esc(nx.c.place) : ''}</div>`;
    if (editing) h += formHtml();
    const any = list.filter(filterOk).length;
    h += `<div class="cls-week">${showDays.map(wd => {
      const cs = dayClasses(wd).filter(filterOk), par = ODD.includes(wd) ? 'odd' : 'even';
      
      return `<div class="cls-day${wd === today ? ' today' : ''}"><div class="cls-dh"><b>${DAY_NAMES[wd]}</b>${par ? `<span class="cls-par ${par}">${parityLabel(par)}</span>` : ''}${wd === today ? '<span class="cls-today">امروز</span>' : ''}</div>
        ${cs.length ? cs.map(c => `<div class="cls-item" style="--c:${esc(c.color || COLORS[0])}"><div class="cls-time">${timeStr(c) || '—'}</div><div class="cls-body"><div class="cls-title">${esc(c.title)}${overlaps(c, wd) ? ' <span class="cls-warn" title="با کلاس دیگه‌ای از همین نفر تداخل داره">⚠️ تداخل</span>' : ''}</div>
          <div class="cls-meta">${[c.teacher ? '👤 ' + esc(c.teacher) : '', c.place ? '📍 ' + esc(c.place) : '', c.author ? '💜 ' + esc(c.author) : '', c.remind_before > 0 ? '🔔 ' + fa(c.remind_before) + ' دقیقه قبل' + (c.remind_who === 'me' ? ' (فقط ' + esc(c.author || 'خودش') + ')' : '') : ''].filter(Boolean).join(' · ')}</div></div>
          <div class="cls-act"><button type="button" data-cls="edit" data-id="${esc(c.id)}" title="ویرایش">✏️</button><button type="button" data-cls="del" data-id="${esc(c.id)}" title="حذف">🗑️</button></div></div>`).join('') : '<div class="cls-empty">کلاسی نیست 🌿</div>'}</div>`;
    }).join('')}</div>`;
    if (!any && !editing) h += '<div class="cls-hint">هنوز کلاسی ثبت نشده؛ با «➕ کلاس جدید» برنامهٔ هفتگی‌تون رو بچینید.</div>';
    const keep = document.activeElement && document.activeElement.id && box.contains(document.activeElement) ? document.activeElement.id : null;
    box.innerHTML = h;
    if (keep) { const el = document.getElementById(keep); if (el) el.focus(); }
  }
  function formHtml() {
    const d = draft;
    return `<div class="cls-form"><h4>${editing === 'new' ? '➕ کلاس جدید' : '✏️ ویرایش کلاس'}</h4>
      <input id="clsTitle" type="text" maxlength="80" placeholder="اسم درس (مثلاً ریاضی ۲)" value="${esc(d.title)}">
      <div class="cls-two"><input id="clsTeacher" type="text" maxlength="60" placeholder="استاد (اختیاری)" value="${esc(d.teacher)}"><input id="clsPlace" type="text" maxlength="60" placeholder="کلاس / مکان (اختیاری)" value="${esc(d.place)}"></div>
      <div class="evf-lbl">روزهای هفته</div>
      <div class="evf-chips cls-dchips">${DAY_NAMES.map((n, i) => `<button type="button" data-day="${i}" class="${d.days.includes(i) ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="evf-chips"><button type="button" data-quick="odd">🔵 همهٔ روزهای فرد</button><button type="button" data-quick="even">🟣 همهٔ روزهای زوج</button><button type="button" data-quick="clear">پاک کن</button></div>
      <div class="cls-two"><label>⏰ شروع <input id="clsStart" type="time" value="${esc(d.start_time)}"></label><label>🏁 پایان <input id="clsEnd" type="time" value="${esc(d.end_time)}"></label></div>
      <div class="evf-lbl">🔔 یادآوری و آلارم قبل از شروع کلاس</div>
      <div class="evf-chips cls-rem">${[[0, 'بدون'], [5, '۵ دقیقه'], [10, '۱۰ دقیقه'], [15, '۱۵ دقیقه'], [30, '۳۰ دقیقه'], [60, '۱ ساعت']].map(([m, t]) => `<button type="button" data-rem="${m}" class="${d.remind_before === m ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${d.remind_before > 0 ? `<div class="evf-chips cls-who"><button type="button" data-rwho="both" class="${d.remind_who !== 'me' ? 'on' : ''}">👫 هر دو نفرمون</button><button type="button" data-rwho="me" class="${d.remind_who === 'me' ? 'on' : ''}">🙋 فقط من</button></div>` : ''}
      <div class="evf-lbl">رنگ</div><div class="cls-colors">${COLORS.map(c => `<button type="button" data-color="${c}" class="${d.color === c ? 'on' : ''}" style="background:${c}" aria-label="رنگ"></button>`).join('')}</div>
      <div class="cls-row"><button class="btn" type="button" data-cls="save">💾 ${editing === 'new' ? 'ذخیره' : 'ذخیرهٔ ویرایش'}</button><button class="btn ghost" type="button" data-cls="cancel">انصراف</button></div></div>`;
  }
  function readDraft() {
    const g = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    if (!document.getElementById('clsTitle')) return;
    draft.title = g('clsTitle'); draft.teacher = g('clsTeacher'); draft.place = g('clsPlace'); draft.start_time = g('clsStart'); draft.end_time = g('clsEnd');
  }

  /* ---------- عملیات ---------- */
  function openForm(c) {
    editing = c ? c.id : 'new';
    draft = c ? { title: c.title || '', teacher: c.teacher || '', place: c.place || '', days: c._days.slice(), start_time: c.start_time || '', end_time: c.end_time || '', color: c.color || COLORS[0], remind_before: parseInt(c.remind_before, 10) || 0, remind_who: c.remind_who || 'both' }
              : { title: '', teacher: '', place: '', days: [], start_time: '', end_time: '', color: COLORS[list.length % COLORS.length], remind_before: 15, remind_who: 'both' };
    render(); const t = document.getElementById('clsTitle'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  async function save() {
    readDraft(); const d = draft, title = d.title.trim();
    if (!title) { toast('اسم درس رو بنویس 📚'); return; }
    if (!d.days.length) { toast('حداقل یه روز هفته رو انتخاب کن 📅'); return; }
    const s = toMin(d.start_time), e = toMin(d.end_time);
    if (s == null) { toast('ساعت شروع رو بذار ⏰'); return; }
    if (e != null && e <= s) { toast('ساعت پایان باید بعد از شروع باشه'); return; }
    const row = { title: title.slice(0, 80), teacher: d.teacher.trim().slice(0, 60), place: d.place.trim().slice(0, 60), days: d.days.slice().sort().join(','), start_time: d.start_time, end_time: d.end_time || '', color: d.color, remind_before: d.remind_before > 0 ? d.remind_before : null, remind_who: d.remind_who === 'me' ? 'me' : 'both' };
    if (editing === 'new') {
      const full = Object.assign({ id: 'cl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), author: me(), created_at: Date.now() }, row);
      let { error } = await dbClient.from('classes').insert(full);
      if (error && /remind_|last_fired|column|schema cache/i.test(error.message || '') && !/relation/i.test(error.message || '')) {
        remCols = false; toast('⚠️ برای یادآوری کلاس، بلوک ۱۸ فایل SQL رو توی Supabase اجرا کن');
        const f2 = Object.assign({}, full); delete f2.remind_before; delete f2.remind_who; ({ error } = await dbClient.from('classes').insert(f2));
      }
      if (error) { missing = /classes|relation|schema cache/i.test(error.message || ''); toast('⚠️ ذخیره نشد' + (missing ? ' (فایل SQL اجرا نشده)' : '')); render(); return; }
      list.push(norm(full)); toast('🎓 کلاس اضافه شد'); try { notify('class', full.title, full.id); } catch (er) {}
    } else {
      let { error } = await dbClient.from('classes').update(row).eq('id', editing);
      if (error && /remind_|last_fired|column|schema cache/i.test(error.message || '')) {
        remCols = false; toast('⚠️ برای یادآوری کلاس، بلوک ۱۸ فایل SQL رو توی Supabase اجرا کن');
        const r2 = Object.assign({}, row); delete r2.remind_before; delete r2.remind_who; ({ error } = await dbClient.from('classes').update(r2).eq('id', editing));
      }
      if (error) { toast('⚠️ ذخیره نشد'); return; }
      const i = list.findIndex(x => x.id === editing); if (i >= 0) list[i] = norm(Object.assign({}, list[i], row)); toast('✅ کلاس ویرایش شد');
    }
    editing = null; draft = null; render(); if (typeof renderDayPanel === 'function') { try { renderDayPanel(); } catch (er) {} }
  }
  async function del(id) {
    const c = list.find(x => x.id === id); if (!c) return;
    if (!confirm('کلاس «' + c.title + '» حذف بشه؟')) return;
    const { error } = await dbClient.from('classes').delete().eq('id', id);
    if (error) { toast('⚠️ حذف نشد'); return; }
    list = list.filter(x => x.id !== id); if (editing === id) { editing = null; draft = null; } toast('🗑️ کلاس حذف شد'); render(); if (typeof renderDayPanel === 'function') { try { renderDayPanel(); } catch (er) {} }
  }

  function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.parity) { filter.parity = b.dataset.parity; render(); }
    else if ('who' in b.dataset) { filter.who = b.dataset.who || 'all'; render(); }
    else if (b.dataset.cls === 'new') openForm(null);
    else if (b.dataset.cls === 'edit') openForm(list.find(x => x.id === b.dataset.id));
    else if (b.dataset.cls === 'del') del(b.dataset.id);
    else if (b.dataset.cls === 'save') save();
    else if (b.dataset.cls === 'cancel') { editing = null; draft = null; render(); }
    else if (b.dataset.day != null && draft) { readDraft(); const n = +b.dataset.day, i = draft.days.indexOf(n); i >= 0 ? draft.days.splice(i, 1) : draft.days.push(n); render(); }
    else if (b.dataset.quick && draft) { readDraft(); draft.days = b.dataset.quick === 'odd' ? ODD.slice() : b.dataset.quick === 'even' ? EVEN.slice() : []; render(); }
    else if (b.dataset.rem != null && draft) { readDraft(); draft.remind_before = +b.dataset.rem; render(); }
    else if (b.dataset.rwho && draft) { readDraft(); draft.remind_who = b.dataset.rwho; render(); }
    else if (b.dataset.color && draft) { readDraft(); draft.color = b.dataset.color; render(); }
  }

  /* ---------- زبانهٔ «تقویم / کلاس‌ها» ---------- */
  function setTab(t) {
    tab = t; const m = document.getElementById('calMain'), c = document.getElementById('classesBox');
    if (!m || !c) return;
    m.style.display = t === 'cal' ? '' : 'none'; c.style.display = t === 'classes' ? '' : 'none';
    document.querySelectorAll('#calTabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    const tb = document.getElementById('calTodayBtn'); if (tb) tb.style.display = t === 'cal' ? '' : 'none';
    if (t === 'classes') { render(); load(); }
  }
  function mount() {
    const c = document.getElementById('classesBox'); if (!c || c.dataset.bound) return; c.dataset.bound = '1';
    c.addEventListener('click', onClick);
    document.getElementById('calTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  }
  /* ---------- یادآوری: هر دقیقه از حلقهٔ checkReminders صدا زده می‌شه ---------- */
  let tickBusy = false, loadedAt = 0;
  async function tick() {
    if (tickBusy) return; tickBusy = true;
    try {
      if (!loaded || Date.now() - loadedAt > 5 * 60000) { await load(); loadedAt = Date.now(); }
      const now = Date.now();
      for (const c of list.slice()) {
        if (!(parseInt(c.remind_before, 10) > 0)) continue;
        const since = Math.max(Number(c.last_fired) || 0, Number(c.created_at) || 0);
        const due = Recur.classDue(c, now, since); if (!due) continue;
        let q = dbClient.from('classes').update({ last_fired: due.ts }).eq('id', c.id);
        q = c.last_fired == null ? q.is('last_fired', null) : q.eq('last_fired', c.last_fired);
        const { data, error } = await q.select('id');
        if (error || !data || !data.length) { if (!error) loadedAt = 0; continue; }   // یه دستگاه دیگه زودتر اعلام کرد
        c.last_fired = due.ts;
        const text = Recur.classRemindText(c, due.startTs, now), mine = c.remind_who !== 'me' || String(c.author || '').trim().toLowerCase() === me().trim().toLowerCase();
        await notify('class_rem', text, c.id, { author: '⏰', target: c.remind_who === 'me' ? c.author : null });
        if (mine && typeof classAlarm === 'function') { classAlarm({ title: text, created_at: Date.now() }); toast('🎓 ' + text); }   // دستگاهی که اعلام کرد، خودش آلارم می‌زنه
      }
    } catch (e) { console.warn('class reminders:', e); }
    finally { tickBusy = false; }
  }
  function init() { mount(); if (!loaded) load(); else { if (tab === 'classes') render(); } }
  window.Classes = { init, load, tick, dayHtml, setTab, _list: () => list, _state: () => ({ filter, editing, draft, tab }) };
})();
