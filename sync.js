/* 🔗 اتصال دو دستگاه یک حساب (مثلاً گوشی و لپ‌تاپِ ارشیا، یا گوشی و لپ‌تاپِ یاسی)
   سایت رمز نداره؛ حساب = اسم. هر دستگاهی که با همون اسم (یا املاهای هم‌ارزش مثل ارشیا/عرشیا) وارد بشه،
   عکس پروفایل، گربه (آیتم‌ها و ظاهرش) و «خوندنِ اعلان‌ها» رو از جدول profiles می‌گیره و تغییراتش رو هم می‌فرسته. */
(function () {
  'use strict';
  const AT_KEY = 'diary_avatar_at';
  let started = false, key = '', busy = false, missing = false, pushT = null, lastSig = '', warned = false;
  const avatarAt = () => { try { return Number(localStorage.getItem(AT_KEY)) || 0; } catch (e) { return 0; } };
  const setAvatarAt = v => { try { localStorage.setItem(AT_KEY, String(v)); } catch (e) {} };
  const nm = () => (typeof myName === 'function' ? myName() : '') || '';

  function row() {
    const cat = window.CatPal && CatPal.exportState ? CatPal.exportState() : null;
    const av = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    return {
      key, name: nm(), avatar: av && av.length < 200000 ? av : '', avatar_at: avatarAt(),
      cat: cat ? JSON.stringify(cat) : null,
      notif_seen: typeof notifSeen === 'number' && notifSeen ? notifSeen : 0,
      updated_at: Date.now()
    };
  }
  const sigOf = r => JSON.stringify([r.key, r.avatar_at, r.cat, r.notif_seen]);

  function noteMissing(error) {
    if (!/profiles|relation|schema cache/i.test(error.message || '')) return false;
    missing = true;
    if (!warned) { warned = true; toast('⚠️ برای اتصال دو دستگاه، بلوک ۱۹ فایل SQL رو توی Supabase اجرا کن'); }
    return true;
  }

  /* گرفتن اطلاعات از سرور و ادغام با این دستگاه */
  async function pull() {
    if (!key || busy || missing) return;
    busy = true;
    try {
      const { data, error } = await dbClient.from('profiles').select('*').eq('key', key).maybeSingle();
      if (error) { noteMissing(error); return; }
      let changed = false;
      if (data) {
        if (data.avatar && Number(data.avatar_at || 0) > avatarAt() && data.avatar !== userProfile.avatar) {
          userProfile.avatar = data.avatar; setAvatarAt(Number(data.avatar_at));
          try { localStorage.setItem('diary_user_avatar', data.avatar); } catch (e) {}
          try { updateProfileUI(); updateHomeGreeting(); updateCommentAvatar(); } catch (e) {}
          changed = true;
        }
        if (data.cat && window.CatPal && CatPal.importState) {
          let R = null; try { R = JSON.parse(data.cat); } catch (e) {}
          if (CatPal.importState(R)) changed = true;
        }
        const ns = Number(data.notif_seen || 0);
        if (ns && (typeof notifSeen !== 'number' || !notifSeen || ns > notifSeen)) {
          notifSeen = ns; try { saveNotifSeen(); updateBell(); } catch (e) {} changed = true;
        }
        if (changed && !pull._quiet) toast('🔗 اطلاعات حسابت از دستگاه دیگه‌ات به‌روز شد');
      }
    } catch (e) { console.warn('profile pull', e); }
    finally { busy = false; }
    push(true);
  }

  async function doPush() {
    if (!key || missing) return;
    const r = row(), sig = sigOf(r); if (sig === lastSig) return;
    try {
      const { error } = await dbClient.from('profiles').upsert(r);
      if (error) noteMissing(error); else lastSig = sig;
    } catch (e) { console.warn('profile push', e); }
  }
  function push(now) { clearTimeout(pushT); if (now) doPush(); else pushT = setTimeout(doPush, 2500); }

  /* شروع (یا شروع دوباره بعد از عوض شدن اسم) */
  async function start() {
    const n = nm(); if (!n) return;
    const k = Recur.nameKey(n);
    if (started && k === key) return;
    key = k; started = true; lastSig = ''; missing = false;
    if (typeof userProfile !== 'undefined' && userProfile.avatar && !avatarAt()) setAvatarAt(1);   // عکس قدیمی بدون زمان: قدیمی‌تر از هر عکس جدید
    pull._quiet = false; await pull();
  }
  function avatarChanged() { setAvatarAt(Date.now()); push(); }

  document.addEventListener('visibilitychange', () => { if (!document.hidden && started) { pull._quiet = true; pull(); } });
  window.ProfileSync = { start, push, pull, avatarChanged, _key: () => key, _row: row };
})();
