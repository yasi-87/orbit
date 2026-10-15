/* ============================================================
   recur.js — تاریخ شمسی + قواعد تکرار رویدادها/یادآوری‌ها
   هم توی سایت (مرورگر) استفاده می‌شه، هم توی اسکریپت اعلان‌های سرور (Node).
   تبدیل تاریخ بر پایهٔ الگوریتم jalaali-js.
   ساعت‌ها همیشه «ساعت تهران» حساب می‌شن (UTC+03:30، بدون ساعت تابستانی).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Recur = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const _jd = (a, b) => ~~(a / b);
  const _jm = (a, b) => a - ~~(a / b) * b;
  const JAL_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function jalCal(jy, withoutLeap) {
    const bl = JAL_BREAKS.length, gy = jy + 621;
    let leapJ = -14, jp = JAL_BREAKS[0], jm, jump = 0, leap, n, i;
    if (jy < jp || jy >= JAL_BREAKS[bl - 1]) throw new Error('سال نامعتبر');
    for (i = 1; i < bl; i += 1) {
      jm = JAL_BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + _jd(jump, 33) * 8 + _jd(_jm(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + _jd(n, 33) * 8 + _jd(_jm(n, 33) + 3, 4);
    if (_jm(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = _jd(gy, 4) - _jd((_jd(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + _jd(jump + 4, 33) * 33;
      leap = _jm(_jm(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }
    return { leap, gy, march };
  }
  function g2d(gy, gm, gd) {
    let d = _jd((gy + _jd(gm - 8, 6) + 100100) * 1461, 4) + _jd(153 * _jm(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - _jd(_jd(gy + 100100 + _jd(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + _jd(_jd(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = _jd(_jm(j, 1461), 4) * 5 + 308;
    const gd = _jd(_jm(i, 153), 5) + 1;
    const gm = _jm(_jd(i, 153), 12) + 1;
    const gy = _jd(j, 1461) - 100100 + _jd(8 - gm, 6);
    return { gy, gm, gd };
  }
  function j2d(jy, jm, jd) {
    const r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - _jd(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    const r = jalCal(jy, false);
    const jdn1f = g2d(gy, 3, r.march);
    let k = jdn - jdn1f, jd, jm;
    if (k >= 0) {
      if (k <= 185) return { jy, jm: 1 + _jd(k, 31), jd: _jm(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + _jd(k, 30);
    jd = _jm(k, 30) + 1;
    return { jy, jm, jd };
  }
  const gregorianToJalali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
  const jalaliToGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return jalCal(jy).leap === 0 ? 30 : 29;
  }

  const JAL_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const JAL_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const pad2 = n => String(n).padStart(2, '0');
  const parseIso = iso => iso.split('-').map(Number);
  const isoOf = (y, m, d) => y + '-' + pad2(m) + '-' + pad2(d);

  function isoFromJalali(jy, jm, jd) { const g = jalaliToGregorian(jy, jm, jd); return isoOf(g.gy, g.gm, g.gd); }
  function jalaliFromIso(iso) { const [y, m, d] = parseIso(iso); return gregorianToJalali(y, m, d); }
  function weekdayIndex(iso) { const [y, m, d] = parseIso(iso); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1) % 7; } // شنبه = ۰
  function daysBetween(a, b) {
    const [ya, ma, da] = parseIso(a), [yb, mb, db] = parseIso(b);
    return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
  }
  function addDaysIso(iso, n) {
    const [y, m, d] = parseIso(iso);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  function fmtJalaliLong(iso) {
    const j = jalaliFromIso(iso);
    return JAL_WEEKDAYS[weekdayIndex(iso)] + ' ' + toFa(j.jd) + ' ' + JAL_MONTHS[j.jm - 1] + ' ' + toFa(j.jy);
  }
  function fmtJalaliShort(iso) { const j = jalaliFromIso(iso); return toFa(j.jd) + ' ' + JAL_MONTHS[j.jm - 1] + ' ' + toFa(j.jy); }

  /* ---------- ساعت تهران ---------- */
  const TEHRAN_OFFSET_MIN = 210;
  function wallToEpoch(iso, hhmm) {
    const [y, m, d] = parseIso(iso);
    const [hh, mm] = String(hhmm || '00:00').split(':').map(Number);
    return Date.UTC(y, m - 1, d, hh || 0, mm || 0) - TEHRAN_OFFSET_MIN * 60000;
  }
  function epochToWall(ms) {
    const t = new Date(ms + TEHRAN_OFFSET_MIN * 60000);
    return {
      iso: isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()),
      hh: t.getUTCHours(), mm: t.getUTCMinutes(),
      hhmm: pad2(t.getUTCHours()) + ':' + pad2(t.getUTCMinutes())
    };
  }
  const todayIso = (nowMs) => epochToWall(nowMs == null ? Date.now() : nowMs).iso;

  /* ---------- قواعد تکرار ----------
     ev: { event_date, repeat, repeat_every, remind, remind_time, start_at, until_date }
     repeat: none | hours | daily | weekly | monthly | yearly
     ------------------------------------------------------------ */
  const everyN = ev => Math.max(1, parseInt(ev.repeat_every, 10) || 1);

  function hoursOccursOn(ev, iso) {
    const start = Number(ev.start_at);
    if (!start) return iso === ev.event_date;
    const step = everyN(ev) * 3600000;
    let dayStart = wallToEpoch(iso, '00:00'), dayEnd = dayStart + 86400000;
    if (ev.until_date) dayEnd = Math.min(dayEnd, wallToEpoch(ev.until_date, '23:59') + 60000);
    if (dayEnd <= start || dayEnd <= dayStart) return false;
    const k = Math.max(0, Math.ceil((dayStart - start) / step));
    return start + k * step < dayEnd;
  }

  function occursOn(ev, iso) {
    const rep = ev.repeat || 'none', n = everyN(ev), start = ev.event_date;
    if (!start || iso < start) return false;
    if (ev.until_date && iso > ev.until_date) return false;
    if (rep === 'none') return iso === start;
    if (rep === 'hours') return hoursOccursOn(ev, iso);
    const dd = daysBetween(start, iso);
    if (rep === 'daily') return dd % n === 0;
    if (rep === 'weekly') return dd % (7 * n) === 0;
    const s = jalaliFromIso(start), j = jalaliFromIso(iso);
    const dayOk = j.jd === Math.min(s.jd, jalaliMonthLength(j.jy, j.jm));
    if (rep === 'monthly') {
      const md = (j.jy - s.jy) * 12 + (j.jm - s.jm);
      return md >= 0 && md % n === 0 && dayOk;
    }
    if (rep === 'yearly') {
      const yd = j.jy - s.jy;
      return yd >= 0 && yd % n === 0 && j.jm === s.jm && dayOk;
    }
    return false;
  }

  /* جدیدترین یادآوریِ سررسیده که هنوز اعلام نشده (بعد از sinceMs و تا الان).
     فقط «آخرین» رو برمی‌گردونه تا بعد از مدتی خاموش بودن، اعلان‌ها تلنبار نشن. */
  function latestDue(ev, nowMs, sinceMs) {
    if (!ev || !ev.remind) return null;
    const since = sinceMs || 0;
    if (ev.repeat === 'hours') {
      const start = Number(ev.start_at);
      if (!start || nowMs < start) return null;
      const step = everyN(ev) * 3600000;
      let k = Math.floor((nowMs - start) / step);
      if (ev.until_date) {
        const kMax = Math.floor((wallToEpoch(ev.until_date, '23:59') - start) / step);
        if (kMax < 0) return null;
        k = Math.min(k, kMax);
      }
      const ts = start + k * step;
      return ts > since ? { ts, key: String(ts) } : null;
    }
    const today = epochToWall(nowMs).iso;
    const sinceIso = since ? epochToWall(since).iso : addDaysIso(today, -2);
    let iso = today;
    for (let i = 0; i < 800 && iso >= sinceIso; i++, iso = addDaysIso(iso, -1)) {
      if (!occursOn(ev, iso)) continue;
      const ts = wallToEpoch(iso, ev.remind_time || '09:00');
      if (ts > nowMs) continue;       // امروز، ولی ساعتش هنوز نرسیده
      if (ts <= since) break;         // قدیمی‌تر از این‌ها قبلاً اعلام شده
      return { ts, key: iso };
    }
    return null;
  }

  /* ---------- یادآوری کلاس ---------- */
  const CLASS_GRACE_MS = 10 * 60000;   // تا ۱۰ دقیقه بعد از شروع کلاس هنوز اعلام می‌شه
  function classDue(c, nowMs, sinceMs) {
    const rb = parseInt(c && c.remind_before, 10);
    if (!(rb > 0) || !c.start_time) return null;
    const days = String(c.days || '').split(',').filter(x => x !== '').map(Number);
    const since = Math.max(Number(sinceMs) || 0, nowMs - 3 * 3600000);
    const today = epochToWall(nowMs).iso;
    let best = null;
    for (const off of [-1, 0, 1]) {
      const iso = addDaysIso(today, off);
      if (!days.includes(weekdayIndex(iso))) continue;
      const startTs = wallToEpoch(iso, c.start_time), at = startTs - rb * 60000;
      if (at > nowMs || at <= since || nowMs > startTs + CLASS_GRACE_MS) continue;
      if (!best || at > best.ts) best = { ts: at, startTs, key: iso };
    }
    return best;
  }
  function classRemindText(c, startTs, nowMs) {
    const min = Math.max(0, Math.round((startTs - (nowMs == null ? Date.now() : nowMs)) / 60000));
    const when = min > 0 ? toFa(min) + ' دقیقه دیگه' : 'الان';
    return (String(c.title || '').slice(0, 40)) + ' · ' + toFa(c.start_time) + (c.place ? ' · ' + String(c.place).slice(0, 20) : '') + ' (' + when + ')';
  }

  /* اولین رخداد از fromMs به بعد (برای نمایش «بعدی») */
  function nextOccurrence(ev, fromMs) {
    if (!ev || !ev.event_date) return null;
    if (ev.repeat === 'hours' && Number(ev.start_at)) {
      const start = Number(ev.start_at), step = everyN(ev) * 3600000;
      const k = fromMs <= start ? 0 : Math.ceil((fromMs - start) / step);
      const ts = start + k * step;
      if (ev.until_date && ts > wallToEpoch(ev.until_date, '23:59')) return null;
      return { ts, iso: epochToWall(ts).iso };
    }
    let iso = epochToWall(fromMs).iso;
    for (let i = 0; i < 3800; i++, iso = addDaysIso(iso, 1)) {
      if (ev.until_date && iso > ev.until_date) return null;
      if (!occursOn(ev, iso)) continue;
      const ts = wallToEpoch(iso, ev.remind_time || '00:00');
      if (ts >= fromMs || iso > epochToWall(fromMs).iso) return { ts, iso };
    }
    return null;
  }

  function describe(ev) {
    const rep = ev.repeat || 'none', n = everyN(ev);
    const s = ev.event_date ? jalaliFromIso(ev.event_date) : null;
    let t;
    if (rep === 'none') t = 'یک بار';
    else if (rep === 'hours') t = n === 1 ? 'هر ساعت' : 'هر ' + toFa(n) + ' ساعت';
    else if (rep === 'daily') t = n === 1 ? 'هر روز' : 'هر ' + toFa(n) + ' روز';
    else if (rep === 'weekly') t = (n === 1 ? 'هر هفته' : 'هر ' + toFa(n) + ' هفته') + ' (' + JAL_WEEKDAYS[weekdayIndex(ev.event_date)] + ')';
    else if (rep === 'monthly') t = (n === 1 ? 'هر ماه' : 'هر ' + toFa(n) + ' ماه') + ' (روز ' + toFa(s.jd) + ')';
    else if (rep === 'yearly') t = (n === 1 ? 'هر سال' : 'هر ' + toFa(n) + ' سال') + ' (' + toFa(s.jd) + ' ' + JAL_MONTHS[s.jm - 1] + ')';
    else t = '';
    if (ev.until_date) t += ' تا ' + fmtJalaliShort(ev.until_date);
    return t;
  }

  const NOTIF_TEXT = {
    chapter: { icon: '📖', text: 'یه فصل جدید نوشت' },
    chapter_update: { icon: '✏️', text: 'یه فصل رو آپدیت کرد' },
    comment: { icon: '💬', text: 'یه کامنت گذاشت' },
    song: { icon: '🎵', text: 'یه آهنگ اضافه کرد' },
    note: { icon: '📝', text: 'یه یادداشت اضافه کرد' },
    event: { icon: '📅', text: 'یه رویداد توی تقویم ثبت کرد' },
    files: { icon: '📁', text: 'یه فایل آپلود کرد' },
    gallery: { icon: '🖼️', text: 'یه عکس/ویدیو به گالری اضافه کرد' },
    daily: { icon: '❓', text: 'به سؤال امروز جواب داد' },
    class: { icon: '🎓', text: 'یه کلاس اضافه کرد' },
    class_rem: { icon: '🎓', text: null },
    reminder: { icon: '⏰', text: null }
  };
  function notifLine(n) {
    const t = NOTIF_TEXT[n.type] || { icon: '🔔', text: 'یه چیز جدید اضافه کرد' };
    if (n.type === 'reminder') return { icon: t.icon, line: 'یادآوری' };
    if (n.type === 'class_rem') return { icon: t.icon, line: 'کلاس داره شروع می‌شه!' };
    return { icon: t.icon, line: (n.author || 'ناشناس') + ' ' + t.text };
  }

  return {
    gregorianToJalali, jalaliToGregorian, jalaliMonthLength,
    JAL_MONTHS, JAL_WEEKDAYS, toFa, pad2, parseIso,
    isoFromJalali, jalaliFromIso, weekdayIndex, daysBetween, addDaysIso,
    fmtJalaliLong, fmtJalaliShort,
    TEHRAN_OFFSET_MIN, wallToEpoch, epochToWall, todayIso,
    occursOn, latestDue, nextOccurrence, describe, classDue, classRemindText,
    NOTIF_TEXT, notifLine
  };
});
