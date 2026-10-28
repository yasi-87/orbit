/* 🐱 گربهٔ تعاملی سایت «خاطره‌های ما» — امضای اختصاصی سایت
   - با کلیک واکنش نشون می‌ده، حرف می‌زنه و یه خاطرهٔ تصادفی نشون می‌ده
   - هر بار که وارد سایت می‌شی پیام متفاوتی داره
   - با فعالیت‌ها (نوشتن فصل، کامنت، یادداشت، عکس، آهنگ…) لباس، رنگ و حالت جدید باز می‌شه
   - گاهی جای دیگه‌ای از صفحه ظاهر می‌شه
   فقط به چند تابع سایت وصله: CatPal.start() موقع ورود و CatPal.act(type) موقع فعالیت‌ها. */
(function () {
  'use strict';
  const KEY = 'cat_state_v1';
  const fa = n => Number(n).toLocaleString('fa-IR');
  let asleep = false, lastTouch = Date.now(), sleepAud = null, sleepIdx = 0;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- وضعیت ذخیره‌شده (برای هر نفر توی مرورگر خودش) ---------- */
  let S = { pets: 0, visits: 0, streak: 0, lastDay: '', acts: {}, unlocked: [], worn: { acc: [], fur: 'cream' }, mood: 'normal', lastGreet: -1, lastMem: '' };
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') S = Object.assign(S, v); } catch (e) {}
  S.worn = S.worn || { acc: [], fur: 'cream' }; S.acts = S.acts || {}; S.unlocked = (S.unlocked || []).filter(x => x !== 'm_sleep');
  if (S.mood === 'sleepy') S.mood = 'normal'; delete S.sleepy;     // خواب دیگه آیتم کمد نیست؛ بخشی از خود گربه‌ست
  /* «upd» فقط وقتی عوض می‌شه که ظاهر گربه (لباس/رنگ) عوض بشه؛ وگرنه هر دستگاهی که تازه باز می‌شه (و فقط بازدیدش رو ثبت می‌کنه) ظاهر دستگاه دیگه رو بازنویسی می‌کرد */
  let lastLook = JSON.stringify(S.worn);
  const save = () => { const lk = JSON.stringify(S.worn); if (lk !== lastLook) { lastLook = lk; S.upd = Date.now(); } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} scheduleSync(); };
  const totalActs = () => Object.values(S.acts).reduce((a, b) => a + b, 0);
  const actN = (...t) => t.reduce((a, k) => a + (S.acts[k] || 0), 0);

  /* ---------- آیتم‌ها و شرط باز شدنشون ---------- */
  const ITEMS = {
    bow:       { kind: 'acc', ico: '🎀', name: 'پاپیون',     hint: '۳ بار گربه رو نوازش کن',       ok: () => S.pets >= 3 },
    hat:       { kind: 'acc', ico: '🎉', name: 'کلاه تولد',  hint: 'یه کامنت بذار',                 ok: () => actN('comment') >= 1 },
    glasses:   { kind: 'acc', ico: '🤓', name: 'عینک',       hint: 'یه یادداشت بنویس',              ok: () => actN('note') >= 1 },
    scarf:     { kind: 'acc', ico: '🧣', name: 'شال‌گردن',   hint: 'یه فصل بنویس یا ویرایش کن',      ok: () => actN('chapter', 'chapter_update') >= 1 },
    flower:    { kind: 'acc', ico: '🌸', name: 'گل',         hint: 'یه عکس یا فیلم به گالری اضافه کن', ok: () => actN('gallery') >= 1 },
    phones:    { kind: 'acc', ico: '🎧', name: 'هدفون',      hint: 'یه آهنگ اضافه کن',              ok: () => actN('song') >= 1 },
    crown:     { kind: 'acc', ico: '👑', name: 'تاج',        hint: '۳ روز پشت سر هم سر بزن',        ok: () => S.streak >= 3 },
    fur_black: { kind: 'fur', ico: '🖤', name: 'سیاه',       hint: '۱۰ بار نوازش',                  ok: () => S.pets >= 10, fur: 'black' },
    fur_purple:{ kind: 'fur', ico: '💜', name: 'بنفش',       hint: 'یه فایل یا لینک اضافه کن',       ok: () => actN('files', 'link') >= 1, fur: 'purple' },
    fur_pink:  { kind: 'fur', ico: '💗', name: 'صورتی',      hint: 'یه رویداد توی تقویم بساز',       ok: () => actN('event') >= 1, fur: 'pink' },
    fur_white: { kind: 'fur', ico: '🤍', name: 'سفید',       hint: '۴۰ بار نوازش',                  ok: () => S.pets >= 40, fur: 'white' },
    m_love:    { kind: 'mood', ico: '😻', name: 'عاشق',      hint: '۸ بار نوازش',                   ok: () => S.pets >= 8, mood: 'love' },
    m_dance:   { kind: 'mood', ico: '💃', name: 'رقصان',     hint: '۲۰ بار نوازش',                  ok: () => S.pets >= 20, mood: 'dance' },
    m_star:    { kind: 'mood', ico: '🤩', name: 'ستاره‌چشم', hint: '۵ فعالیت توی سایت',              ok: () => totalActs() >= 5, mood: 'star' },
  };
  const FUR = {
    cream:  { fur: '#f2c894', dark: '#d9a46a' }, black: { fur: '#40374d', dark: '#29222f' },
    purple: { fur: '#c9a8ff', dark: '#a07fe0' }, pink:  { fur: '#ffb3d1', dark: '#ee8db4' },
    white:  { fur: '#f5f2fa', dark: '#d6cfe2' }
  };
  const isOpen = id => S.unlocked.includes(id);

  /* ---------- شکل گربه (طرح اختصاصی) ---------- */
  function svg(st) {
    st = st || S; const f = FUR[(st.worn || {}).fur] || FUR.cream, w = (st.worn || {}).acc || [], mood = st.asleep ? 'sleepy' : (st.mood === 'sleepy' ? 'normal' : st.mood || 'normal');
    const eyes = mood === 'love' ? '<path class="heart" d="M40 52 C33 46 34 41 38 41 C40 41 40 43 40 43 C40 43 40 41 42 41 C46 41 47 46 40 52Z" fill="#ff4f7b"/><path class="heart" d="M60 52 C53 46 54 41 58 41 C60 41 60 43 60 43 C60 43 60 41 62 41 C66 41 67 46 60 52Z" fill="#ff4f7b"/>'
      : mood === 'sleepy' ? '<path d="M35 49 q5 4 10 0 M55 49 q5 4 10 0" stroke="#2a1a35" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      : mood === 'star' ? '<path class="spin" d="M40 42 l2 4.5 5 .6 -3.7 3.3 1 4.8 -4.3 -2.5 -4.3 2.5 1 -4.8 -3.7 -3.3 5 -.6z M60 42 l2 4.5 5 .6 -3.7 3.3 1 4.8 -4.3 -2.5 -4.3 2.5 1 -4.8 -3.7 -3.3 5 -.6z" fill="#ffd54f"/>'
      : mood === 'happy' ? '<path d="M35 50 q5 -7 10 0 M55 50 q5 -7 10 0" stroke="#2a1a35" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
      : '<g class="eyes"><ellipse cx="40" cy="48" rx="3.6" ry="4.8" fill="#2a1a35"/><ellipse cx="60" cy="48" rx="3.6" ry="4.8" fill="#2a1a35"/><circle cx="41.2" cy="46.4" r="1.3" fill="#fff"/><circle cx="61.2" cy="46.4" r="1.3" fill="#fff"/></g>';
    const acc = {
      scarf: '<path d="M28 67 Q50 80 72 67 L73 74 Q50 87 27 74Z" fill="#e8567a"/><path d="M62 77 L68 92 L58 90Z" fill="#cf3f63"/><path d="M36 74 l2 5 M46 78 l1 5" stroke="#ffd0dc" stroke-width="1.6"/>',
      bow: '<path d="M50 70 L36 63 L36 77Z M50 70 L64 63 L64 77Z" fill="#ff6fa5"/><circle cx="50" cy="70" r="4" fill="#ff3d86"/>',
      phones: '<path d="M25 47 A25 25 0 0 1 75 47" stroke="#44385a" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="20" y="43" width="9" height="15" rx="4" fill="#6f58b8"/><rect x="71" y="43" width="9" height="15" rx="4" fill="#6f58b8"/>',
      glasses: '<circle cx="40" cy="48" r="9" fill="rgba(180,220,255,.22)" stroke="#2f2540" stroke-width="2"/><circle cx="60" cy="48" r="9" fill="rgba(180,220,255,.22)" stroke="#2f2540" stroke-width="2"/><path d="M49 48 h2" stroke="#2f2540" stroke-width="2"/>',
      hat: '<path d="M36 28 L50 -4 L64 28Z" fill="#b57bff"/><path d="M41 18 L59 18 M38.5 24 L61.5 24" stroke="#ffd54f" stroke-width="2.4"/><circle cx="50" cy="-4" r="4" fill="#ff7eb6"/>',
      crown: '<path d="M33 27 L36 6 L44 19 L50 3 L56 19 L64 6 L67 27Z" fill="#ffc83d" stroke="#e0a000" stroke-width="1.2"/><circle cx="36" cy="6" r="2.2" fill="#ff5d8f"/><circle cx="50" cy="3" r="2.2" fill="#6ec9ff"/><circle cx="64" cy="6" r="2.2" fill="#ff5d8f"/>',
      flower: '<g transform="translate(70 24)"><circle r="3.6" cx="0" cy="-6" fill="#ff8fc0"/><circle r="3.6" cx="5.7" cy="-1.9" fill="#ff8fc0"/><circle r="3.6" cx="3.5" cy="4.9" fill="#ff8fc0"/><circle r="3.6" cx="-3.5" cy="4.9" fill="#ff8fc0"/><circle r="3.6" cx="-5.7" cy="-1.9" fill="#ff8fc0"/><circle r="3" fill="#ffd54f"/></g>'
    };
    const order = ['scarf', 'bow', 'phones', 'glasses', 'flower', 'hat', 'crown'];
    const accHtml = order.filter(k => w.includes(k) && !(k === 'hat' && w.includes('crown'))).map(k => acc[k]).join('');
    const mouth = mood === 'love' || mood === 'happy' || mood === 'dance' ? '<path d="M44 58 Q50 66 56 58Z" fill="#c2415f"/>' : '<path d="M50 56.5 q-4 5 -8 2 M50 56.5 q4 5 8 2" stroke="#7a4a5c" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    return `<svg viewBox="0 -8 100 108" width="100%" height="100%" aria-hidden="true">
      <g class="tail"><path d="M70 82 C98 82 99 56 84 50" stroke="${f.fur}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M84 50 l0 0" stroke="${f.dark}" stroke-width="10" stroke-linecap="round"/></g>
      <ellipse cx="50" cy="80" rx="24" ry="18" fill="${f.fur}"/>
      <ellipse cx="38" cy="94" rx="9" ry="5.5" fill="${f.fur}"/><ellipse cx="62" cy="94" rx="9" ry="5.5" fill="${f.fur}"/>
      <g class="head">
        <polygon points="24,38 28,9 47,27" fill="${f.fur}"/><polygon points="76,38 72,9 53,27" fill="${f.fur}"/>
        <polygon points="30,31 32,17 41,27" fill="#ffb7cc"/><polygon points="70,31 68,17 59,27" fill="#ffb7cc"/>
        <ellipse cx="50" cy="48" rx="27" ry="23" fill="${f.fur}"/>
        <path d="M50 26 v7 M43 27.5 l2 6 M57 27.5 l-2 6" stroke="${f.dark}" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="32" cy="56" r="4.6" fill="#ff8fb0" opacity=".45"/><circle cx="68" cy="56" r="4.6" fill="#ff8fb0" opacity=".45"/>
        ${eyes}
        <path d="M47.5 53 h5 l-2.5 3.2z" fill="#ff7a9c"/>${mouth}
        <path d="M30 54 l-14 -3 M30 57 l-14 3 M70 54 l14 -3 M70 57 l14 3" stroke="${f.dark}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
        ${accHtml}
      </g></svg>`;
  }

  /* ---------- متن‌ها ---------- */
  const CLICK_LINES = [
    'میو! 🐾', 'نوازشم کن بازم 😽', 'پرررر… خرخر 💜', 'اینجا رو بخار، پشت گوشم!', 'من نگهبان خاطره‌هاتونم 🐱',
    'می‌دونستی؟ شما دوتا بهترین چیزِ این سایتین', 'میو میو! (یعنی دوستت دارم)', 'گشنمه… ولی خاطره هم می‌خورم 😼',
    'بیا یه خاطره بخونیم باهم 📖', 'دم‌م رو نکش، فقط قلقلکش بده 🐈', 'ایشالا همیشه کنار هم باشین ✨', 'امروز چقدر خوشگل شدی!',
    'یه چیزی بنویس برام، لطفاً ✍️', 'من یه گربهٔ خیلی باهوشم، ولی تنبل 😴', 'قلب‌ات رو به من بسپار، مراقبشم 💗',
    'هر بار که نازم می‌کنی، یه ستاره توی دلم روشن می‌شه 🌟', 'عاشقی قشنگ‌ترین خاطره‌ست، و شما دوتا توش غرق شدین 💞',
    'می‌دونی چرا خرخر می‌کنم؟ چون کنار شما دوتا آرومم 😽', 'من فقط یه گربه‌ام، ولی عشق شما رو از دور هم حس می‌کنم 💘',
    'هیچ خاطره‌ای قشنگ‌تر از لحظه‌ای نیست که کنار همین‌ن 🌷', 'یه نفر توی این دنیا هست که فقط با فکر کردن بهش لبخند می‌زنی… میدونم کیه 😏💜',
    'دوست داشتن یعنی همین: دو نفر، یه دفترچه، کلی خاطره 📖💕', 'میو… یعنی «دلم برای نگاهت تنگ شده» 🥺', 'قلبتون با هم یه ریتم می‌زنه، من می‌شنوم 🎶',
    'اگه عشق وزن داشت، این سایت از سنگینی‌ش می‌شکست 💗', 'امشب یه چیز قشنگ بنویس، از اونی که دوستش داری ✨', 'تو بخند، من هم برات می‌رقصم 💃🐈',
    'عشق شما دوتا گرم‌ترین گوشهٔ دنیاست؛ من اونجا می‌خوابم 🧡', 'یه بغل بزرگ برات دارم، فقط بیا نزدیک‌تر 🤗', 'هر روزی که با هم باشین، عیده 🎀',
    'من نگهبان عشق شمام، پس خیالتون راحت 🛡️💞', 'می‌دونستی توی هر خاطره یه ذره از دل شما جا مونده؟ 🫶', 'نوازشت مثل بوسهٔ نرم‌ه… بازم لطفاً 😻',
    'یه رازی بگم؟ عاشق‌ها قشنگ‌ترین چیزی‌ان که دیدم 🙊', 'ستاره‌ها هم به شما حسودی می‌کنن 🌌💜', 'امروز هم به هم بگین دوستت دارم، من شاهدم 📜💗',
    'پنجه‌هام کوچیکه ولی قلبم بزرگه، همش مال شماست 🐾❤️', 'هر خاطره یه نامهٔ عاشقانه‌ست که به آینده می‌فرستین 💌', 'کنار هم بودن، قشنگ‌ترین هنری‌ه که بلدین 🎨',
    'گربه‌ها رو می‌گن هفت جان دارن؛ منم هر هفتاش رو برای شادی شما می‌دم 😽', 'دلتنگی یعنی نصف دل اونجاست، نصفش اینجا… زنگ بزن بهش 📞💞'
  ];
  const WAKE_LINES = [
    'هوم؟ بیدار شدم… نازم کردی؟ 🥺💜', 'آخیش، چه نوازش خوبی! خوابم پرید 😽', 'میو؟ داشتم تو خواب شما دوتا رو می‌دیدم 💭💗', 'اوووم… دست‌ت گرمه، بیدار شدم ☺️',
    'خواب دیدم کنار هم نشسته بودین و من وسطتون بودم 🌙💞', 'هووم… یه لحظه چشم‌ام گرم شده بود 😴➡️😻', 'نازم کنی بیدار می‌شم؛ این یه قانونه 🐾',
    'ای جانم، با این نوازش دیگه خواب‌م نمی‌بره 💘', 'صبح بخیر… یا هر وقتی که هست! حالا که اومدی، بیدارم ✨', 'پرررر… خرخر… باز هم بکن، خواب نمی‌خوام 💤🚫'
  ];
  const SLEEP_LINES = [
    'هوووم… خوابم گرفت 😴', 'زیاد نازم نکردی… دارم خوابم می‌بره 💤', 'من یه چرتی بزنم، بیدارم کن با نوازش 🌙', 'zzz… خواب شما دوتا رو می‌بینم 💭',
    'چشمام داره گرم می‌شه… شب‌بخیر 🌛', 'یه خواب شیرین می‌رم؛ نازم کنی بیدار می‌شم 🐾', 'خوابم برد… اگه دلتنگم شدی بیدارم کن 💜', 'میو… (یعنی یه کم می‌خوابم، دوستت دارم) 😽💤'
  ];
  const MOVE_LINES = [
    'اینجام! 🐾', 'کوچ کردم 😼', 'منو پیدا کردی؟ 🙈', 'اینجا بهتر می‌بینم 👀', 'میو~ جام عوض شد', 'از اینجا شما رو بهتر می‌بینم، عاشقا 👀💞',
    'یه گوشهٔ دیگه از دلتون رو بگردم 💗', 'دارم خونه‌تون رو قدم می‌زنم، شما فقط عاشق بمونین 🏡', 'اینجا نور بهتره، برای عکس‌های قشنگتون 📸',
    'جام عوض شد ولی عشقم به شما عوض نشد 😽', 'یه پرش کردم تا بیشتر ببینمتون 🐈‍⬛', 'بو کشیدم، اینجا بوی عشقه 👃💞', 'پنهون شدم ولی همیشه مراقبتونم 🫣'
  ];
  const ACT_LINES = [
    'آفرین! 👏', 'چه کار قشنگی 💜', 'میو! دیدم چیکار کردی 🐾', 'ایول! ✨', 'یه خاطرهٔ دیگه به عشقتون اضافه شد 💞', 'دمت گرم، دفترچه‌تون داره پر می‌شه 📖💗',
    'همین کارای کوچیکه که عشق رو بزرگ می‌کنه 🌱💕', 'ببین چقدر قشنگ ساختین‌ش! 🥹', 'من که عاشق این دفترچه‌م، مثل خودتون 😻', 'ثبتش کردم توی قلبم 📌💜',
    'اینم یه ستارهٔ دیگه برای آسمون عشق شما 🌟', 'نوشتن از عشق، خودش یه جور عاشقی کردنه ✍️💘'
  ];
  /* انتخاب بدون تکرار: چند جملهٔ اخیر دوباره نمیان */
  const recentLines = {};
  function pickLine(key, pool) {
    const rc = recentLines[key] = recentLines[key] || [], keep = Math.min(pool.length - 1, 12);
    const cand = pool.filter(x => !rc.includes(x)), v = rnd(cand.length ? cand : pool);
    rc.push(v); while (rc.length > keep) rc.shift(); return v;
  }
  const nameOr = d => { try { const n = (myName() || '').trim(); return n || d; } catch (e) { return d; } };
  function greeting() {
    const hr = new Date().getHours(), nm = nameOr('عزیزم'), L = [];
    const part = hr < 5 ? 'night' : hr < 12 ? 'morning' : hr < 17 ? 'noon' : hr < 21 ? 'evening' : 'night';
    const pool = {
      morning: [`صبح بخیر ${nm}! قهوه‌ت رو بردار بیا خاطره بنویسیم ☕`, 'صبح شد و من قبل از همه بیدار شدم 🌅', 'امروز یه خاطرهٔ خوب بسازین، من شاهدم 🐾', `صبح تو رو بخیر ${nm}، امروز هم دنیا با عشق شما قشنگ‌تره 🌷`, 'امروز اولین پیامت رو برای عشقت بفرست، بعد بیا خاطره بنویس 💌', 'صبح که چشم باز می‌کنم، اول به شما دوتا فکر می‌کنم ☀️💞', 'یه صبح خوب با یه لبخند شروع می‌شه… لبخندِ تو 😊'],
      noon: [`ظهر بخیر ${nm}! ناهار خوردی؟ 🍚`, 'نیمهٔ روزه، یه لحظه بیا پیش من 🐱', 'هوای دفترچه امروز عالیه ✨', 'نیمروزه و دلم هنوز پیش شماست 💗', 'یه پیام کوچیک به اونی که دوستش داری، همین الان 📩💜', 'ناهار رو با یاد عشقت بخور، قشنگ‌تر می‌شه 🍽️💞'],
      evening: [`عصر بخیر ${nm}! بریم سراغ یه خاطرهٔ قشنگ؟ 🌇`, 'غروبه… وقت نوشتن از امروزه 🧡', 'آهنگ بذاریم و بخونیم؟ 🎵', 'غروب‌ها رنگ عشق می‌گیرن، مثل دفترچهٔ شما 🌆💞', 'بیا امروز رو با یه آهنگ عاشقانه تموم کنیم 🎶💗', 'عصرِ تو به‌خیر، دلم می‌خواد از امروزتون بشنوم ☕💜'],
      night: [`شب بخیر ${nm}… هنوز بیداری؟ 🌙`, 'شبا خاطره‌ها قشنگ‌تر می‌شن 🌌', 'من نگهبانِ شب‌م، تو بنویس 🕯️', 'شب‌ها دلتنگی بلندتر می‌شه… بیا برات یه خاطره بخونم 🌙💞', 'قبل از خواب به عشقت بگو «دوستت دارم» 💤💌', 'ستاره‌ها بیدارن تا به عشق شما نگاه کنن ✨🌌']
    }[part];
    L.push(...pool);
    L.push(`${nm}! دلم برات تنگ شده بود 😽`, 'میو! اومدی؟ خوشحال شدم 💜', 'امروز می‌خوام یه خاطره‌ت رو بخونم 📖', 'به به! کی اومده اینجا 🐾', 'یه سورپرایز داخل سایت هست، پیداش کن 🎁',
      `${nm}، هر وقت میای، قلب این دفترچه تندتر می‌زنه 💓`, 'دلم برای شما دوتا تنگ می‌شه وقتی نیستین 🥺💜', 'بهترین بخش روزم لحظه‌ایه که شما میاین 😻', 'تو که میای، خاطره‌ها هم لبخند می‌زنن 🌸',
      'می‌دونستی عشق شما این سایت رو زنده نگه می‌داره؟ 💞', `${nm}، امروز هم عاشق‌تر از دیروزی؟ 😏💗`, 'یه خاطرهٔ جدید از عشقتون می‌خوام، لطفاً 🥰', 'دفترچه منتظر بود که بیای و یه صفحهٔ قشنگ دیگه بنویسی 📖💕');
    if (S.streak >= 2) L.push(`${fa(S.streak)} روزه پشت سر هم میای! آفرین 🔥`);
    if (S.visits > 1 && S.gapDays >= 4) L.push(`${fa(S.gapDays)} روز نبودی! کجا بودی؟ 😿`);
    if (S.pets >= 20) L.push(`تا الان ${fa(S.pets)} بار نوازشم کردی، دوستت دارم 💗`);
    try { const u = typeof unreadCount === 'function' ? unreadCount() : 0; if (u > 0) L.push(`${fa(u)} تا خبر جدید توی 🔔 داری!`); } catch (e) {}
    const v = pickLine('greet', L); S.lastGreet = v; return v;
  }

  /* ---------- خاطرهٔ تصادفی ---------- */
  const strip = h => { try { return stripHtml(h); } catch (e) { return String(h || '').replace(/<[^>]*>/g, ' '); } };
  async function pickMemory() {
    let kinds = ['chapter', 'chapter', 'chapter', 'gallery', 'gallery', 'note'];
    for (let t = 0; t < 8 && kinds.length; t++) {
      const kind = rnd(kinds);
      if (t >= 3) kinds = kinds.filter(k => k !== kind);   // نوعی که چند بار خالی در اومد رو کنار بذار
      try {
        if (kind === 'chapter') {
          let list = (typeof chaptersCache !== 'undefined' && chaptersCache && chaptersCache.list) || [];
          if (!list.length) list = await dbGetAll(false);
          if (!list.length) continue;
          const c = rnd(list), full = await dbGet(c.id); if (!full) continue;
          const text = strip(full.content).replace(/\s+/g, ' ').trim();
          if (!text && !(full.title || '').trim()) continue;
          const id = 'c' + c.id; if (id === S.lastMem && list.length > 1) continue; S.lastMem = id;
          return { kind, id: c.id, title: full.title || 'بی‌عنوان', text: text.slice(0, 150) + (text.length > 150 ? '…' : ''), date: full.jalali_date || '' };
        }
        if (kind === 'gallery') {
          let list = (typeof galleryList !== 'undefined' && galleryList.length) ? galleryList : null;
          if (!list) { const r = await dbClient.from('gallery').select('*').order('created_at', { ascending: false }); list = (r.data || []); if (typeof galleryList !== 'undefined' && !galleryList.length) { galleryList = list; } }
          if (!list.length) continue;
          const g = rnd(list); const id = 'g' + g.id; if (id === S.lastMem && list.length > 1) continue; S.lastMem = id;
          return { kind, id: g.id, g, title: g.kind === 'video' ? 'یه فیلم از خاطره‌هامون 🎬' : 'یه عکس از خاطره‌هامون 📸', text: g.author ? 'از طرف ' + g.author : '' };
        }
        if (kind === 'note') {
          const list = await notesGetAll(); if (!list.length) continue;
          const n = rnd(list); const id = 'n' + n.id; if (id === S.lastMem && list.length > 1) continue; S.lastMem = id;
          return { kind, id: n.id, title: 'یه یادداشت 📝', text: (n.text || '').slice(0, 150) };
        }
      } catch (e) { console.warn('cat memory', e); }
    }
    return null;
  }
  async function openMemory(m) {
    if (!m) return;
    if (m.kind === 'chapter') { showScreen('chapters'); setTimeout(() => openChapter(m.id), 120); }
    else if (m.kind === 'gallery') {
      showScreen('gallery');
      const go = () => { const g = galleryList.find(x => x.id === m.id) || m.g; if (galleryList.indexOf(g) < 0) galleryList.unshift(g); openLightbox(g); };
      setTimeout(go, 500);
    } else if (m.kind === 'note') showScreen('notes');
  }

  /* ---------- رابط کاربری ---------- */
  let root, bubble, body, hideT, curMem = null, moveT, busy = false, spot = null, started = false;
  function css() {
    if (document.getElementById('catStyle')) return;
    const st = document.createElement('style'); st.id = 'catStyle';
    st.textContent = `
.catpal{position:fixed;z-index:120;width:88px;height:93px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .55s cubic-bezier(.3,1.4,.5,1),opacity .35s;filter:drop-shadow(0 6px 12px rgba(0,0,0,.5));outline:none}
.catpal.hidden{opacity:0;pointer-events:none}
.catpal.out{transform:translateY(130%) !important;opacity:0}
.catpal .cp-body{width:100%;height:100%;transform-origin:50% 90%;animation:cpIdle 4.5s ease-in-out infinite}
.catpal.face-l .cp-body svg{transform:scaleX(-1)}
.catpal .tail{transform-origin:70px 82px;animation:cpTail 2.4s ease-in-out infinite}
.catpal .eyes{transform-origin:50px 48px;animation:cpBlink 4.6s infinite}
.catpal .head{transform-origin:50px 62px;animation:cpHead 6s ease-in-out infinite}
.catpal .spin{transform-origin:50px 46px;animation:cpTwinkle 1.2s ease-in-out infinite}
.catpal .heart{transform-origin:50px 46px;animation:cpBeat .9s ease-in-out infinite}
.catpal.peek{transform:translateX(var(--peek,0)) rotate(var(--rot,0deg))}
.catpal:hover,.catpal:focus-visible{transform:translateX(0) rotate(0) scale(1.06)}
.catpal.poke .cp-body{animation:cpJump .6s cubic-bezier(.3,1.5,.5,1)}
.catpal.dance .cp-body{animation:cpDance .7s ease-in-out 6}
.catpal.sleepy .cp-body{animation:cpSleep 3.6s ease-in-out infinite}
.catpal.sleepy::after{content:'z Z';position:absolute;top:-6px;right:8px;font:700 13px sans-serif;color:#cdb8ff;animation:cpZ 2.6s ease-in-out infinite}
@keyframes cpIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes cpTail{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(11deg)}}
@keyframes cpBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes cpHead{0%,45%,100%{transform:rotate(0)}55%{transform:rotate(-5deg)}75%{transform:rotate(4deg)}}
@keyframes cpTwinkle{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.2) rotate(12deg)}}
@keyframes cpBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
@keyframes cpJump{0%{transform:translateY(0) scale(1,1)}25%{transform:translateY(2px) scale(1.12,.86)}55%{transform:translateY(-22px) scale(.92,1.1) rotate(-6deg)}80%{transform:translateY(0) scale(1.08,.92)}100%{transform:none}}
@keyframes cpDance{0%,100%{transform:rotate(-10deg) translateY(0)}50%{transform:rotate(10deg) translateY(-10px)}}
@keyframes cpSleep{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.95) translateY(2px)}}
@keyframes cpZ{0%{opacity:0;transform:translateY(8px)}40%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.cp-bubble{position:absolute;bottom:calc(100% + 10px);width:min(290px,calc(100vw - 24px));padding:12px 14px;border-radius:18px;background:rgba(24,16,38,.97);color:#f3ecff;border:1px solid rgba(212,165,255,.45);box-shadow:0 12px 34px rgba(0,0,0,.6);font-size:.93rem;line-height:1.7;text-align:right;direction:rtl;cursor:default;opacity:0;visibility:hidden;transform:translateY(8px) scale(.96);transition:opacity .25s,transform .25s,visibility .25s;filter:none}
.cp-bubble.show{opacity:1;visibility:visible;transform:none}
.catpal.below .cp-bubble{bottom:auto;top:calc(100% + 10px)}
.catpal.bl .cp-bubble{left:0}.catpal.br .cp-bubble{right:0}
.cp-bubble::after{content:'';position:absolute;bottom:-7px;width:12px;height:12px;background:rgba(24,16,38,.97);border-right:1px solid rgba(212,165,255,.45);border-bottom:1px solid rgba(212,165,255,.45);transform:rotate(45deg)}
.catpal.bl .cp-bubble::after{left:30px}.catpal.br .cp-bubble::after{right:30px}
.catpal.below .cp-bubble::after{bottom:auto;top:-7px;transform:rotate(225deg)}
.cp-say{font-weight:700}
.cp-mem{margin-top:9px;padding:9px 10px;border-radius:12px;background:rgba(212,165,255,.1);border:1px solid rgba(212,165,255,.22)}
.cp-mem b{display:block;color:var(--accent,#d4a5ff);margin-bottom:2px}
.cp-mem small{display:block;opacity:.65;margin-top:3px}
.cp-mem img{display:block;width:100%;max-height:130px;object-fit:cover;border-radius:10px;margin-bottom:6px}
.cp-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
.cp-btn{border:0;border-radius:999px;padding:6px 12px;font:inherit;font-size:.8rem;cursor:pointer;background:rgba(212,165,255,.16);color:#f3ecff}
.cp-btn:hover{background:rgba(212,165,255,.32)}
.cp-btn.main{background:linear-gradient(135deg,#d4a5ff,#ff9ec7);color:#1a0a20;font-weight:700}
.cp-sec{margin-top:10px;font-size:.78rem;opacity:.7}
.cp-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
.cp-chip{width:38px;height:38px;border-radius:12px;border:1.5px solid rgba(212,165,255,.25);background:rgba(255,255,255,.04);font-size:1.2rem;cursor:pointer;display:grid;place-items:center;position:relative;padding:0}
.cp-chip.on{border-color:#d4a5ff;background:rgba(212,165,255,.28)}
.cp-chip.lock{opacity:.45;filter:grayscale(1)}
.cp-chip.lock::after{content:'🔒';position:absolute;bottom:-4px;right:-4px;font-size:.7rem}
.cp-chip.new{animation:cpNew 1s ease-in-out infinite}
@keyframes cpNew{0%,100%{box-shadow:0 0 0 0 rgba(255,214,102,.8)}50%{box-shadow:0 0 0 6px rgba(255,214,102,0)}}
.cp-conf{position:fixed;z-index:121;pointer-events:none;font-size:16px;will-change:transform,opacity}
@media (prefers-reduced-motion:reduce){.catpal,.catpal *{animation:none !important}.catpal{transition:opacity .2s}}
@media (max-width:640px){.catpal{width:64px;height:68px}}
body.reading-mode .catpal{opacity:.55}
.catfam-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.catfam-card{background:rgba(255,255,255,.05);border:1px solid rgba(212,165,255,.25);border-radius:20px;padding:16px;text-align:center}
.catfam-card.me{border-color:rgba(255,158,199,.5)}
.cf-top{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px}
.cf-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#d4a5ff,#ff9ec7);color:#1a0a20;display:grid;place-items:center;font-weight:700;overflow:hidden}
.cf-av img{width:100%;height:100%;object-fit:cover}
.catview{width:120px;height:127px;margin:6px auto 0;cursor:pointer;transform-origin:50% 90%;outline:none;filter:drop-shadow(0 6px 12px rgba(0,0,0,.45))}
.catview .tail{transform-origin:70px 82px;animation:cpTail 2.4s ease-in-out infinite}
.catview .eyes{transform-origin:50px 48px;animation:cpBlink 4.6s infinite}
.catview .head{transform-origin:50px 62px;animation:cpHead 6s ease-in-out infinite}
.catview .spin{transform-origin:50px 46px;animation:cpTwinkle 1.2s ease-in-out infinite}
.catview .heart{transform-origin:50px 46px;animation:cpBeat .9s ease-in-out infinite}
.catview.poke{animation:cpJump .6s cubic-bezier(.3,1.5,.5,1)}
.cf-line{min-height:1.6em;font-weight:700;color:var(--accent,#d4a5ff);font-size:.9rem}
.cf-stats{display:flex;flex-direction:column;gap:2px;font-size:.82rem;color:var(--muted,#aaa)}
.cf-wear{margin-top:6px;font-size:1.1rem}
.catfam-note{text-align:center;padding:14px;color:var(--muted,#aaa);border:1px dashed rgba(212,165,255,.3);border-radius:14px}
@media (prefers-reduced-motion:reduce){.catview,.catview *{animation:none !important}}
body.reading-mode .catpal:hover{opacity:1}`;
    document.head.appendChild(st);
  }
  function build() {
    if (root) return;
    css();
    root = document.createElement('div'); root.className = 'catpal hidden'; root.id = 'catPal';
    root.setAttribute('role', 'button'); root.tabIndex = 0; root.setAttribute('aria-label', 'گربهٔ سایت؛ برای نوازش کلیک کن');
    root.innerHTML = '<div class="cp-body"></div><div class="cp-bubble" role="status"></div>';
    body = root.firstChild; bubble = root.lastChild;
    document.body.appendChild(root);
    root.addEventListener('click', e => { if (bubble.contains(e.target)) return; poke(); });
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !bubble.contains(e.target)) { e.preventDefault(); poke(); } });
    bubble.addEventListener('mouseenter', () => clearTimeout(hideT));
    bubble.addEventListener('mouseleave', () => armHide(4000));
    document.addEventListener('pointerdown', e => { if (root && !root.contains(e.target)) closeBubble(); }, true);
    window.addEventListener('resize', () => { if (spot) place(spot, true); });
    redraw();
  }
  const redraw = () => { if (!body) return; body.innerHTML = svg(asleep ? Object.assign({}, S, { asleep: true }) : S); root.classList.toggle('sleepy', asleep); };

  /* جاهایی که گربه می‌تونه ظاهر بشه (px از لبه‌ها). side = سمتی که گربه بهش چسبیده */
  function spots() {
    const mob = window.innerWidth < 640, b = mob ? 96 : 18, h = window.innerHeight;
    const list = [
      { side: 'r', x: 14, b }, { side: 'l', x: 14, b: b + (mob ? 0 : 84) },
      { side: 'r', x: -34, b: Math.round(h * .34), peek: true }, { side: 'l', x: -34, b: Math.round(h * .46), peek: true },
      { side: 'r', x: 14, b: Math.round(h * .22) }, { side: 'l', x: 14, b: Math.round(h * .3) }
    ];
    return list.filter(s => s.b + 300 < h || s.b < 140);
  }
  function place(s, instant) {
    spot = s; root.style.left = root.style.right = ''; root.style[s.side === 'l' ? 'left' : 'right'] = (s.peek ? 0 : s.x) + 'px';
    root.style.bottom = s.b + 'px';
    root.classList.toggle('peek', !!s.peek); root.classList.toggle('face-l', s.side === 'r');
    root.style.setProperty('--peek', s.peek ? (s.side === 'l' ? '-52px' : '52px') : '0px');
    root.style.setProperty('--rot', s.peek ? (s.side === 'l' ? '-14deg' : '14deg') : '0deg');
    root.classList.remove('bl', 'br'); root.classList.add(s.side === 'l' ? 'bl' : 'br');
    const top = window.innerHeight - s.b - 80;
    root.classList.toggle('below', top < 250);
  }
  function relocate() {
    if (!root || busy || asleep || bubble.classList.contains('show') || document.hidden) return;
    const open = document.querySelector('.lightbox[style*="flex"], .fv');
    if (open) return;
    busy = true; root.classList.add('out');
    setTimeout(() => {
      let s, tries = 0; const all = spots();
      do { s = rnd(all); tries++; } while (spot && s.side === spot.side && s.b === spot.b && tries < 6);
      place(s); void root.offsetWidth; root.classList.remove('out'); busy = false;
      if (Math.random() < .45) say(pickLine('move', MOVE_LINES), 3400);
    }, reduced() ? 50 : 600);
  }
  function scheduleMove() { clearTimeout(moveT); moveT = setTimeout(() => { relocate(); scheduleMove(); }, 50000 + Math.random() * 60000); }

  /* ---------- 🔊 صدای میو: ویس‌های خودمون (یاسی و عرشیا)؛ هر بار یکی از دو نفر به‌صورت تصادفی ----------
     v2 = ویس خواب گربه. who فقط برای پخش نوبتی بین صدای دو نفره (حدسی از روی زیر و بمی صدا؛ اگه جابه‌جاست فقط این‌جا عوضش کن) */
  const VOICES = [
    { f: 'v1', who: 'yasna' }, { f: 'v5', who: 'yasna' }, { f: 'v6', who: 'yasna' }, { f: 'v7', who: 'yasna' }, { f: 'v8', who: 'yasna' }, { f: 'v9', who: 'yasna' },
    { f: 'v3', who: 'arshia' }, { f: 'v4', who: 'arshia' },
    // میوهای جدید (صاحب صدا نامشخص؛ توی هر دو نوبت پخش می‌شن)
    ...['v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17'].map(f => ({ f, who: 'any' }))
  ];
  const SLEEP_VOICES = ['v2', 'l1', 'l2'];      // ویس‌های لالایی/خواب؛ یکی‌یکی و پشت‌سرهم پخش می‌شن
  const SND_KEY = 'diary_cat_sound';
  const soundOn = () => { try { return localStorage.getItem(SND_KEY) !== '0'; } catch (e) { return true; } };
  const siteMuted = () => { try { return typeof muted !== 'undefined' && muted === true; } catch (e) { return false; } };
  const audios = {}; let curSnd = null, lastSnd = 0, lastWho = '', lastFile = '';
  function playFile(f, vol) {
    try {
      let a = audios[f]; if (!a) { a = audios[f] = new Audio('./sounds/' + f + '.mp3'); a.preload = 'auto'; }
      if (curSnd && curSnd !== a) { curSnd.pause(); }
      a.currentTime = 0; a.volume = vol == null ? 0.9 : vol; curSnd = a;
      const p = a.play(); if (p && p.catch) p.catch(() => {});
      return a;
    } catch (e) { return null; }
  }
  /* یه میو (نوبتی بین دو نفر، بدون تکرار پشت‌سرهم) */
  function pickVoice() {
    const who = lastWho === 'yasna' ? 'arshia' : lastWho === 'arshia' ? 'yasna' : rnd(['yasna', 'arshia']);
    const w2 = Math.random() < .25 ? (who === 'yasna' ? 'arshia' : 'yasna') : who;       // گاهی ترتیب بهم می‌خوره تا حدس‌زدنی نباشه
    const pool = VOICES.filter(v => (v.who === w2 || v.who === 'any') && v.f !== lastFile);
    const v = rnd(pool.length ? pool : VOICES); if (v.who !== 'any') lastWho = v.who; lastFile = v.f; return v;
  }
  function meow(force) {
    if (!soundOn() || siteMuted()) return false;
    const now = Date.now(); if (!force && now - lastSnd < 1500) return false;
    lastSnd = now; playFile(pickVoice().f); return true;
  }
  /* صدا برای هر حالت: خواب → ویس خواب، وگرنه میو */
  function voiceFor(force) { return asleep ? false : meow(force); }


  /* ---------- 😴 خواب: وقتی کم نازش می‌کنی خودش می‌خوابه، ویس خواب پشت‌سرهم پخش می‌شه، با نوازش بیدار می‌شه ---------- */
  const IDLE_MS = 150000, IDLE_NIGHT_MS = 75000;           // بدون نوازش: ۲٫۵ دقیقه (شب‌ها ۱٫۲۵ دقیقه) تا خوابش ببره
  function syncSleepAudio() {
    const want = asleep && soundOn() && !siteMuted() && !document.hidden;
    try {
      if (want) {
        if (!sleepAud) {
          sleepAud = new Audio(); sleepAud.volume = 0.5; sleepAud.loop = false;
          sleepAud.addEventListener('ended', () => { sleepIdx = (sleepIdx + 1) % SLEEP_VOICES.length; sleepAud.src = './sounds/' + SLEEP_VOICES[sleepIdx] + '.mp3'; syncSleepAudio(); });
          sleepIdx = Math.floor(Math.random() * SLEEP_VOICES.length); sleepAud.src = './sounds/' + SLEEP_VOICES[sleepIdx] + '.mp3';
        }
        if (sleepAud.paused) { const p = sleepAud.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (sleepAud && !sleepAud.paused) sleepAud.pause();
    } catch (e) {}
  }
  function fallAsleep(force) {
    if (!root || asleep) return false;
    if (!force && (busy || bubble.classList.contains('show') || document.hidden)) return false;
    asleep = true; redraw(); closeBubble();
    openBubble('<div class="cp-say">' + esc(pickLine('sleep', SLEEP_LINES)) + '</div>', 3500); syncSleepAudio(); return true;
  }
  function wake() {
    if (!asleep) return false;
    asleep = false; lastTouch = Date.now(); redraw(); syncSleepAudio(); return true;
  }
  function sleepTick() {
    syncSleepAudio();
    if (!root || asleep) return;
    const h = new Date().getHours(), lim = (h >= 23 || h < 5) ? IDLE_NIGHT_MS : IDLE_MS;
    if (Date.now() - Math.max(lastTouch, S.lastPet || 0) > lim) fallAsleep(false);
  }
  setInterval(sleepTick, 5000);
  document.addEventListener('visibilitychange', syncSleepAudio);

  function armHide(ms) { clearTimeout(hideT); hideT = setTimeout(closeBubble, ms); }
  function closeBubble() { if (bubble) bubble.classList.remove('show'); clearTimeout(hideT); }
  function openBubble(html, ms) { bubble.innerHTML = html; bubble.classList.add('show'); armHide(ms || 7000); }
  function say(t, ms) { if (!root) return; openBubble('<div class="cp-say">' + esc(t) + '</div>', ms); if (!asleep && Math.random() < .7) voiceFor(false); }
  function sparkle(emoji, n) {
    if (reduced() || !root) return;
    const r = root.getBoundingClientRect();
    for (let i = 0; i < (n || 7); i++) {
      const el = document.createElement('span'); el.className = 'cp-conf'; el.textContent = rnd(emoji);
      el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + 10) + 'px'; document.body.appendChild(el);
      const dx = (Math.random() - .5) * 140, dy = -50 - Math.random() * 90;
      el.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(1.2)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'ease-out' }).onfinish = () => el.remove();
    }
  }

  /* کلیک روی گربه: واکنش + حرف + خاطرهٔ تصادفی */
  async function poke() {
    const wasAsleep = wake();
    S.pets++; S.lastPet = Date.now(); lastTouch = S.lastPet; save();
    voiceFor(true);
    root.classList.remove('poke'); void root.offsetWidth; root.classList.add('poke');
    sparkle(S.mood === 'love' ? ['💗', '💖', '💕'] : ['💜', '✨', '🐾'], 6);
    if (S.mood === 'dance') { root.classList.add('dance'); setTimeout(() => root.classList.remove('dance'), 4300); }
    const line = wasAsleep ? pickLine('wake', WAKE_LINES) : pickLine('click', CLICK_LINES);
    openBubble('<div class="cp-say">' + esc(line) + '</div><div class="cp-mem"><small>⏳ دارم یه خاطره پیدا می‌کنم…</small></div>', 14000);
    const fresh = checkUnlocks();
    const m = await pickMemory(); curMem = m;
    const memHtml = m
      ? `<div class="cp-mem">${m.kind === 'gallery' && m.g && m.g.kind !== 'video' ? `<img src="${esc(m.g.url)}" alt="">` : ''}<b>${esc(m.title)}</b>${m.text ? esc(m.text) : ''}${m.date ? `<small>📅 ${esc(m.date)}</small>` : ''}</div>`
      : '<div class="cp-mem">هنوز خاطره‌ای نداریم… بیا اولین رو بسازیم 💜</div>';
    openBubble(`<div class="cp-say">${esc(line)}</div>${memHtml}${fresh.length ? `<div class="cp-mem"><b>🎁 آیتم جدید باز شد!</b>${esc(fresh.map(i => ITEMS[i].ico + ' ' + ITEMS[i].name).join('، '))}</div>` : ''}<div class="cp-row">${m ? '<button class="cp-btn main" data-a="open">📖 بازش کن</button><button class="cp-btn" data-a="more">🎲 یکی دیگه</button>' : '<button class="cp-btn main" data-a="new">✍️ فصل جدید</button>'}<button class="cp-btn" data-a="wardrobe">👗 کمد من</button></div>`, 15000);
    wire(); if (fresh.length) sparkle(['🎉', '✨', '⭐', '💛'], 12);
  }
  function wire() {
    bubble.querySelectorAll('[data-a]').forEach(b => b.onclick = async e => {
      e.stopPropagation(); const a = b.dataset.a;
      if (a === 'open') { closeBubble(); openMemory(curMem); }
      else if (a === 'new') { closeBubble(); showScreen('chapters'); setTimeout(() => { try { createChapter(); } catch (er) {} }, 150); }
      else if (a === 'more') { b.disabled = true; b.textContent = '⏳'; poke(); S.pets--; save(); }
      else if (a === 'wardrobe') wardrobe();
      else if (a === 'snd') { try { localStorage.setItem(SND_KEY, soundOn() ? '0' : '1'); } catch (er) {} b.textContent = soundOn() ? '🔊 صدای میو: روشن' : '🔇 صدای میو: خاموش'; syncSleepAudio(); if (soundOn() && !asleep) meow(true); }
      else if (a === 'close') closeBubble();
    });
  }

  /* ---------- باز شدن آیتم‌ها ---------- */
  function checkUnlocks() {
    const fresh = [];
    Object.keys(ITEMS).forEach(id => { if (!isOpen(id) && ITEMS[id].ok()) { S.unlocked.push(id); fresh.push(id); } });
    if (fresh.length) { S.newItems = (S.newItems || []).concat(fresh); save(); }
    return fresh;
  }
  function announce(ids) {
    const first = ITEMS[ids[0]];
    sparkle(['🎉', '✨', '⭐', '💛'], 12);
    setTimeout(() => {
      openBubble(`<div class="cp-say">🎁 ${ids.length > 1 ? fa(ids.length) + ' آیتم جدید باز شد!' : 'آیتم جدید باز شد!'}</div><div class="cp-mem"><b>${first.ico} ${esc(first.name)}</b>${ids.length > 1 ? 'و ' + esc(ids.slice(1).map(i => ITEMS[i].name).join('، ')) : 'بریم تنش کنم؟'}</div><div class="cp-row"><button class="cp-btn main" data-a="wardrobe">👗 کمد من</button><button class="cp-btn" data-a="close">بعداً</button></div>`, 12000);
      wire();
    }, 400);
  }
  function wardrobe() {
    S.newItems = [];
    const chip = (id) => {
      const it = ITEMS[id], op = isOpen(id);
      const on = it.kind === 'acc' ? S.worn.acc.includes(id.replace('fur_', '')) : it.kind === 'fur' ? S.worn.fur === it.fur : S.mood === it.mood;
      return `<button class="cp-chip${on ? ' on' : ''}${op ? '' : ' lock'}" data-id="${id}" title="${esc(it.name + (op ? '' : ' — ' + it.hint))}">${it.ico}</button>`;
    };
    const ids = k => Object.keys(ITEMS).filter(i => ITEMS[i].kind === k);
    const furCream = `<button class="cp-chip${S.worn.fur === 'cream' ? ' on' : ''}" data-id="fur_cream" title="کرمی">🧡</button>`;
    const moodNormal = `<button class="cp-chip${S.mood === 'normal' ? ' on' : ''}" data-id="m_normal" title="عادی">😺</button>`;
    openBubble(`<div class="cp-say">👗 کمد گربه</div>
      <div class="cp-sec">لباس و وسایل</div><div class="cp-chips">${ids('acc').map(chip).join('')}</div>
      <div class="cp-sec">رنگ</div><div class="cp-chips">${furCream}${ids('fur').map(chip).join('')}</div>
      <div class="cp-sec">حالت</div><div class="cp-chips">${moodNormal}${ids('mood').map(chip).join('')}</div>
      <div class="cp-sec" id="cpHint">روی آیتم‌های 🔒 بزن تا بفهمی چطور باز می‌شن</div>
      <div class="cp-row"><button class="cp-btn" data-a="snd">${soundOn() ? '🔊 صدای میو: روشن' : '🔇 صدای میو: خاموش'}</button><button class="cp-btn" data-a="close">بستن</button></div>`, 30000);
    bubble.querySelectorAll('.cp-chip').forEach(c => c.onclick = e => { e.stopPropagation(); pick(c.dataset.id); });
    wire();
  }
  function pick(id) {
    const it = ITEMS[id];
    if (id === 'fur_cream') S.worn.fur = 'cream';
    else if (id === 'm_normal') S.mood = 'normal';
    else if (!isOpen(id)) { const h = document.getElementById('cpHint'); if (h) h.textContent = '🔒 ' + it.name + ': ' + it.hint; return; }
    else if (it.kind === 'acc') { const k = id; const i = S.worn.acc.indexOf(k); i >= 0 ? S.worn.acc.splice(i, 1) : S.worn.acc.push(k); }
    else if (it.kind === 'fur') S.worn.fur = it.fur;
    else if (it.kind === 'mood') { S.mood = it.mood; if (it.mood === 'dance') { root.classList.add('dance'); setTimeout(() => root.classList.remove('dance'), 4300); } }
    save(); redraw(); sparkle(['✨', '💜'], 4); wardrobe();
  }


  /* ---------- دیدن گربه‌های همدیگه (توی پروفایل) ---------- */
  const catId = n => 'cat_' + Recur.nameKey(n);
  let syncT = 0, lastSynced = '';
  function myRow() {
    const nm = (typeof myName === 'function' ? myName() : '') || '';
    if (!nm) return null;
    let av = ''; try { const a = (typeof userProfile !== 'undefined' && userProfile.avatar) || ''; if (a && a.length < 60000) av = a; } catch (e) {}
    return { id: catId(nm), name: nm, worn: JSON.stringify(S.worn), mood: S.mood || 'normal', pets: S.pets || 0, items: S.unlocked.length, streak: S.streak || 0, visits: S.visits || 0, avatar: av, updated_at: Date.now() };
  }
  function scheduleSync() { if (!started) return; clearTimeout(syncT); syncT = setTimeout(sync, 1800); }
  async function sync() {
    try {
      const r = myRow(); if (!r) return;
      const sig = JSON.stringify([r.name, r.worn, r.mood, r.pets, r.items, r.streak, r.visits, r.avatar.length]);
      if (sig === lastSynced) return;
      const { error } = await dbClient.from('cats').upsert(r);
      if (!error) lastSynced = sig;
    } catch (e) { console.warn('cat sync', e); }
  }
  async function family(el) {
    if (!el) el = document.getElementById('catFamily'); if (!el) return;
    css();
    const mine = myRow(); let rows = [], missing = false;
    try { const r = await dbClient.from('cats').select('*'); if (r.error) missing = /cats|relation|schema cache/i.test(r.error.message || ''); else rows = r.data || []; } catch (e) {}
    // هر نفر فقط یک گربه: ردیف‌های قدیمیِ هم‌اسم (املاهای مختلف، گوشی/لپ‌تاپ) یکی می‌شن و تازه‌ترین می‌مونه
    const byKey = {};
    rows.forEach(x => { const k = Recur.nameKey(x.name || ''); if (!k) return; if (!byKey[k] || (x.updated_at || 0) > (byKey[k].updated_at || 0)) byKey[k] = x; });
    rows = Object.keys(byKey).map(k => byKey[k]);
    if (mine) { const mk = Recur.nameKey(mine.name); rows = rows.filter(x => Recur.nameKey(x.name || '') !== mk); rows.unshift(mine); }
    const pr = x => { let w = { acc: [], fur: 'cream' }; try { w = JSON.parse(x.worn) || w; } catch (e) {} return { worn: w, mood: x.mood || 'normal' }; };
    const total = Object.keys(ITEMS).length;
    const card = (x, me) => {
      const st = pr(x), av = x.avatar ? `<img src="${esc(x.avatar)}" alt="">` : esc((x.name || '?').trim().charAt(0).toUpperCase());
      const wear = (st.worn.acc || []).map(k => ITEMS[k] ? ITEMS[k].ico : '').join(' ');
      return `<div class="catfam-card${me ? ' me' : ''}"><div class="cf-top"><span class="cf-av">${av}</span><b>${esc(x.name || 'ناشناس')}${me ? ' <small>(تو)</small>' : ''}</b></div>
        <div class="catview" data-name="${esc(x.name || '')}" role="button" tabindex="0" aria-label="گربهٔ ${esc(x.name || '')}">${svg(st)}</div>
        <div class="cf-line" data-say></div>
        <div class="cf-stats"><span>🐾 ${fa(x.pets || 0)} نوازش</span><span>🎁 ${fa(x.items || 0)} از ${fa(total)} آیتم</span>${x.streak > 1 ? `<span>🔥 ${fa(x.streak)} روز پشت‌سرهم</span>` : ''}</div>${wear ? `<div class="cf-wear">${wear}</div>` : ''}</div>`;
    };
    if (missing) { el.innerHTML = '<div class="catfam-note">برای دیدن گربه‌های همدیگه باید فایل supabase-setup.sql رو یک بار توی Supabase اجرا کنی.</div>'; return; }
    if (!rows.length) { el.innerHTML = '<div class="catfam-note">اسمت رو بنویس تا گربه‌ات اینجا بیاد 🐱</div>'; return; }
    el.innerHTML = '<div class="catfam-grid">' + rows.map(x => card(x, mine && x.id === mine.id)).join('') + '</div>';
    const LINES = ['میو! 🐾', 'پرررر 💜', 'سلام! من گربهٔ %s‌ام 😺', 'نوازشم کن~ 😽', 'امروز چقدر خوشگلی!', 'یه خاطره بنویس برام ✍️'];
    el.querySelectorAll('.catview').forEach(v => {
      const go = () => {
        v.classList.remove('poke'); void v.offsetWidth; v.classList.add('poke');
        const say = v.parentNode.querySelector('[data-say]'); say.textContent = rnd(LINES).replace('%s', v.dataset.name); clearTimeout(v._t); v._t = setTimeout(() => { say.textContent = ''; }, 2600);
      };
      v.addEventListener('click', go); v.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  /* ---------- API بیرونی ---------- */
  function act(type) {
    try {
      S.acts[type] = (S.acts[type] || 0) + 1; save();
      const fresh = checkUnlocks();
      if (fresh.length && root) { root.classList.remove('poke'); void root.offsetWidth; root.classList.add('poke'); announce(fresh); }
      else if (root && !asleep && Math.random() < .3 && !bubble.classList.contains('show')) say(pickLine('act', ACT_LINES), 3200);
    } catch (e) { console.warn(e); }
  }
  function start() {
    if (started) { if (root) root.classList.remove('hidden'); return; }
    started = true;
    const now = new Date(), day = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    if (S.lastDay !== day) {
      const prev = S.lastDay ? new Date(S.lastDay.replace(/-/g, '/')) : null;
      const gap = prev ? Math.round((new Date(day.replace(/-/g, '/')) - prev) / 864e5) : 0;
      S.gapDays = gap; S.streak = prev && gap === 1 ? (S.streak || 1) + 1 : 1; S.visits++; S.lastDay = day;
    }
    const fresh = checkUnlocks(); save();
    build();
    const mob = window.innerWidth < 640; place({ side: 'r', x: 14, b: mob ? 96 : 18 });
    setTimeout(() => { root.classList.remove('hidden'); }, 800);
    setTimeout(() => { if (fresh.length) announce(fresh); else say(greeting(), 6500); save(); }, 3200);
    scheduleMove();
  }
  /* همگام‌سازی بین دو دستگاه یک حساب: ادغام بی‌خطر (بیشینه‌ها، اجتماع آیتم‌ها، آخرین ظاهر) */
  function exportState() { return JSON.parse(JSON.stringify(S)); }
  function importState(R) {
    if (!R || typeof R !== 'object') return false;
    let ch = false;
    ['pets', 'visits'].forEach(k => { if ((R[k] || 0) > (S[k] || 0)) { S[k] = R[k]; ch = true; } });
    const un = [...new Set(S.unlocked.concat((R.unlocked || []).filter(x => x !== 'm_sleep')))]; if (un.length !== new Set(S.unlocked).size) { S.unlocked = un; ch = true; }
    Object.keys(R.acts || {}).forEach(k => { if ((R.acts[k] || 0) > (S.acts[k] || 0)) { S.acts[k] = R.acts[k]; ch = true; } });
    if (R.lastDay && R.lastDay > (S.lastDay || '')) { S.lastDay = R.lastDay; S.streak = R.streak || S.streak; ch = true; }
    if ((R.upd || 0) > (S.upd || 0)) { if (R.worn) { S.worn = R.worn; lastLook = JSON.stringify(S.worn); } S.upd = R.upd; ch = true; }
    if (ch) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} try { redraw(); } catch (e) {} }
    return ch;
  }
  window.CatPal = { family, meow, _sleep: on => on === false ? wake() : fallAsleep(true), _asleep: () => asleep, _idle: ms => { lastTouch = Date.now() - ms; S.lastPet = 0; }, _sleepAudio: () => sleepAud, _voices: VOICES, _sleepVoices: SLEEP_VOICES, exportState, importState, start, act, family, _sync: sync, _row: myRow, _pick: pickMemory, say: (t, ms) => { if (root && !bubble.classList.contains('show')) say(t, ms); }, _greet: greeting, _relocate: relocate, _spots: spots, poke: () => root && poke(), _state: () => S, _items: ITEMS };
})();
