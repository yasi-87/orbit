/* 🎨 Our Canvas: دو نفر، یک شاهکار.
   بوم نقاشی مشترک و زنده (Supabase Realtime) با ابزار، رنگ، استیکر، متن، حالت‌های بازی (نوبتی، نیمه‌نیمه، حدس بزن، زمان‌دار، مخفی)،
   ذخیرهٔ خودکار، گالری، پخش دوبارهٔ نقاشی، دانلود PNG، کامنت و علاقه‌مندی.
   جدول‌ها: canvas_live (بوم فعلی) و canvas_art (گالری) ← SQL شمارهٔ ۲۴. بخش‌های «هوش مصنوعی» اینجا نسخهٔ محلی/سرگرمی هستن (بدون سرویس هوش مصنوعی). */
(function () {
  'use strict';
  const W = 1200, H = 840, ID = Math.random().toString(36).slice(2, 9);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const nm = () => (typeof myName === 'function' ? myName() : '') || 'یکی از ما';
  const same = (a, b) => { try { return Recur.sameName(a, b); } catch (e) { return a === b; } };
  const toast2 = t => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let _bigc = null; const bigColors = () => _bigc || (_bigc = (() => { const o = []; ['#000000', '#3d3d3d', '#7a7a7a', '#b8b8b8', '#e6e6e6', '#ffffff'].forEach(c => o.push(c)); [0, 12, 24, 36, 48, 60, 80, 105, 140, 165, 185, 200, 215, 235, 255, 270, 285, 300, 320, 340].forEach(h => [[95, 78], [90, 66], [85, 55], [70, 42], [75, 30]].forEach(([sa, l]) => o.push(hsl(h, sa, l)))); ['#8b5a2b', '#c68b59', '#e8c9a0', '#5a3a22'].forEach(c => o.push(c)); return o; })());
  const COLORS = ['#1a1a1a', '#ffffff', '#ff4d6d', '#ff8fb8', '#ff9f43', '#ffd93d', '#6bcB77', '#2ec4b6', '#4d96ff', '#9b5de5', '#d4a5ff', '#8b5a2b'];
  const STK = [
    ['😀', 'صورتک‌ها', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 🤥 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😲 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 👻 👽 🤖 💩 🙈 🙉 🙊'],
    ['💖', 'دل و نماد', '❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💌 💋 💍 💎 🌹 ✨ ⭐ 🌟 💫 ⚡ 🔥 💥 💯 ✅ ❌ ❓ ❗ 🎵 🎶 ♾️ 🔔 🎉 🎊 🎁 🏆 🥇 👑'],
    ['🐱', 'حیوون‌ها', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦒 🐘 🦏 🐪 🐫 🦘 🐑 🐐 🦌 🐕 🐈 🐇 🦔 🦜 🦢 🦩 🕊️ 🐾 🦥 🦦 🦨'],
    ['🌸', 'طبیعت', '🌸 🌷 🌹 🌺 🌻 🌼 🌱 🌿 🍀 🍁 🍂 🍃 🌴 🌵 🌲 🌳 🎄 🍄 🌾 💐 🌙 🌛 🌜 ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ☃️ ⛄ 🌈 ☔ 💧 🌊 🌍 🪐 ☄️ 🌋 🏔️ ⛰️ 🏝️ 🌅 🌄 🌌'],
    ['🍓', 'خوراکی', '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥕 🌽 🌶️ 🥒 🥦 🍞 🥐 🥖 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍲 🍣 🍱 🍤 🍙 🍚 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍮 🍯 ☕ 🍵 🧋 🥤 🍷 🍹 🥂 🍼'],
    ['🎈', 'وسایل و بازی', '🎈 🎀 🎁 🎤 🎧 🎸 🎹 🥁 🎨 🖌️ ✏️ 📚 📖 📷 🎬 🎮 🎲 🧩 ⚽ 🏀 🏐 🎾 🏓 🏸 ⛳ 🎯 🎳 🛹 🚲 🛴 💡 🔮 🧸 🪄 🎭 🔑 🕯️ 📱 💻 ⌚ ☎️ ✉️ 💼 🎒 👓 🕶️ 👒 🎩 👗 👠 💄 🧣 🧤 🧦'],
    ['🚗', 'سفر و جا', '🚗 🚕 🚌 🚎 🏎️ 🚓 🚑 🚒 🚚 🚜 🏍️ ✈️ 🛫 🚀 🛸 🚁 ⛵ 🚤 🛳️ 🚂 🚆 🚇 🚉 🏠 🏡 🏰 🏯 🗼 🗽 ⛪ 🕌 🎡 🎢 🎠 ⛺ 🏖️ 🗺️ 🧭 🌉 🌃 🌆 🌇'],
    ['👍', 'آدم‌ها و دست', '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 👏 🙌 👐 🙏 💪 ✍️ 💅 🤳 👀 👣 🧠 👶 🧒 👦 👧 🧑 👨 👩 🧓 👸 🤴 🧙 🧚 🧜 🧞 🦸 🦹 💃 🕺 👫 👭 👬 💑 💏']
  ].map(c => ({ ic: c[0], n: c[1], l: c[2].split(' ') }));
  const BGS = { white: 'سفید', cream: 'کرم', night: 'شب', grid: 'شطرنجی', dots: 'نقطه‌ای', lines: 'خط‌دار', sky: 'آسمان', pink: 'صورتی' };
  const TOPICS = ['خونهٔ رویایی ما', 'سفر بعدی ما', 'یه گربهٔ بامزه', 'غروب کنار دریا', 'شهر بالای ابرها', 'پیک‌نیک توی باغ', 'ربات مهربون', 'جنگل جادویی', 'کافهٔ دنج', 'شب پر ستاره', 'حیوون خونگی رویایی', 'قلعهٔ شیرینی', 'باغ گل‌ها', 'فضانورد عاشق', 'بارون و چتر', 'ماشین قدیمی', 'کوه و برف', 'جزیرهٔ دنج', 'پرنده‌ای که حرف می‌زنه', 'اتاق مطالعهٔ ما', 'سوپرمن بامزه', 'کیک تولد', 'دوچرخه‌سواری', 'کوچه‌ای توی پاییز', 'اژدهای مهربون', 'غذای مورد علاقه‌مون', 'خواب‌های ما', 'عروسک بزرگ', 'ماهی‌های رنگی', 'دفتر خاطرات'];
  const WORDS = {
    easy: 'گربه خرگوش خونه|خانه ماه ستاره قلب گل درخت ماشین کیک چتر پروانه دوچرخه بستنی قایق کوه موز هواپیما ساعت کتاب گیتار کفش ابر خورشید ماهی مداد عینک تاج پیتزا بادکنک سیب مرغ فیل پنگوئن|پنگوین لیوان کلاه دندون|دندان انگشتر هندونه|هندوانه توپ صندلی تلفن|موبایل کلید پاپیون جوراب شمع کیف'.split(' '),
    med: 'فضانورد زرافه کوسه چراغ‌قوه|چراغقوه دوربین چادر قطار بالن اسکی پیانو ویولن روباه شترمرغ عنکبوت لاک‌پشت|لاکپشت عروسک برج قلعه کشتی زیردریایی هلیکوپتر|بالگرد چتر‌نجات|چترنجات مارمولک دایناسور اژدها جادوگر دلقک آدم‌برفی|آدمبرفی کاکتوس گردنبند فرش سماور پنجره نردبان قیچی آینه آسیاب|آسیاببادی ستاره‌دریایی|ستارهدریایی هشت‌پا|هشتپا شمشیر سطل‌آشغال|سطلآشغال تاب‌بازی|تاب فواره مجسمه ماسک|نقاب بلبل خفاش شیپور'.split(' '),
    hard: 'عشق آزادی دوستی رویا|خواب تنهایی خاطره شادی کابوس سورپرایز بی‌خوابی|بیخوابی رقص عروسی طوفان خورشیدگرفتگی|گرفتگیخورشید فانوس‌دریایی|فانوسدریایی|فانوس تخت‌جمشید|تختجمشید ماشین‌زمان|ماشینزمان کوله‌پشتی|کولهپشتی آتشفشان رنگین‌کمان|رنگینکمان|قوسقزح کهکشان تعطیلات سفر پیک‌نیک|پیکنیک تولد انتظار دلتنگی بوسه آغوش ستاره‌شناس|ستارهشناس سیرک آسانسور اینترنت ماراتن حباب گردباد سایه پژواک|اکو معما گنج نقشهٔ‌گنج|نقشه‌گنج|نقشهگنج کاروان پل غروب بیدار‌شدن|بیدارشدن شکلات‌داغ|شکلاتداغ آغاز مهمانی ناراحتی ترس خجالت کنجکاوی'.split(' ')
  };
  const WORDS_EXTRA = {
    easy: 'سگ|توله اسب گاو گوسفند بز خروس جوجه اردک قورباغه لاک‌پشت|لاکپشت مورچه زنبور کفشدوزک مار شیر خرس میمون موش پرنده کلاغ جغد کبوتر ستاره‌دریایی|ستارهدریایی نهنگ دلفین اختاپوس|هشتپا خرچنگ حلزون نارنگی پرتقال انگور گیلاس توت‌فرنگی|توتفرنگی هویج گوجه|گوجه‌فرنگی خیار قارچ نان تخم‌مرغ|تخممرغ شیر‌قهوه|قهوه چای فنجان قاشق چنگال بشقاب قابلمه تخت بالش پتو در پنجره پله مداد‌رنگی|مدادرنگی خودکار دفتر مداد‌تراش|مدادتراش قیچی چسب ماسک تلویزیون رادیو لپ‌تاپ|لپتاپ دوربین کلید‌ پرچم بالن|بادکنک‌هوایی اتوبوس قطار موتور تراکتور آتش‌نشانی|آتشنشانی چتر‌نجات|چترنجات پل جاده چراغ‌راهنما|چراغراهنما تاب سرسره دایره مربع مثلث خورشید‌ ستاره‌ها برف‌ آدم‌برفی|آدمبرفی باران رنگین‌کمان|رنگینکمان تگرگ آتش دست پا چشم گوش دماغ دهن لب لباس پیراهن شلوار کت دستکش شال|روسری کمربند عروسک|خرس‌عروسکی شانه مسواک صابون حوله|شونه',
    med: 'مجسمه‌ساز|مجسمهساز نقاش آشپز پزشک|دکتر آتش‌نشان|آتشنشان خلبان پلیس معلم دوچرخه‌سوار|دوچرخهسوار شناگر اسکی‌باز|اسکیباز ورزشکار فوتبالیست جادوگر پادشاه ملکه شاهزاده پری غول دزد دریایی|دزددریایی|دزد‌دریایی گنج‌یاب قطب‌نما|قطبنما دوربین‌دوچشمی تلسکوپ میکروسکوپ موشک سفینه ماهواره|ماهواره سیاره زمین مریخ ستاره‌دنباله‌دار|ستارهدنبالهدار آسمان‌خراش|آسمانخراش مسجد کلیسا کاخ پل‌معلق|پلمعلق بندر ایستگاه فرودگاه چرخ‌وفلک|چرخوفلک شهربازی کوه‌نوردی|کوهنوردی کمپ آتش‌کمپ|آتشکمپ چادر‌مسافرتی بوفالو پلنگ ببر کانگورو پاندا کرگدن اسب‌آبی|اسبآبی تمساح شتر گورخر لاما خفاش جوجه‌تیغی|جوجهتیغی سنجاب سمور خارپشت|جوجه‌تیغی طاووس فلامینگو پلیکان عقاب قو|قوی‌سفید اسب‌دریایی|اسبدریایی عروس‌دریایی|عروسدریایی ماهی‌مرکب|ماهیمرکب صدف مروارید مرجان لباس‌عروس|لباسعروس انگشتر‌الماس|الماس تاج‌شاه کتابخانه ویترین قفل‌وکلید|قفلوکلید گنجینه جعبه‌موسیقی|جعبهموسیقی فانوس چراغ‌جادو|چراغجادو فرش‌پران|فرشپران کتاب‌جادو|کتابجادو پیتزا‌ همبرگر ساندویچ کباب سوشی کیک‌تولد|کیکتولد بستنی‌قیفی|بستنیقیفی دونات پنکیک پاپ‌کورن|پاپکورن',
    hard: 'امید دلتنگی|نوستالژی اعتماد مهربانی صبر قدرت آرامش هیجان کنجکاوی حسادت افتخار غرور شجاعت ترس‌ازارتفاع|ارتفاع سکوت همدلی عصبانیت تردید وسوسه آرزو معجزه سرنوشت رازداری حقیقت دروغ خودخواهی قهرمان|قهرمان‌داستان فداکاری انتخاب تغییر آینده گذشته حال رؤیا|رویاپردازی بی‌وزنی|بیوزنی سقوط پرواز غرق‌شدن|غرقشدن گم‌شدن|گمشدن پیدا‌کردن|پیداکردن مسابقه برنده بازنده مهمان میزبان جشن شب‌نشینی|شبنشینی|شب‌یلدا یلدا نوروز هفت‌سین|هفتسین چهارشنبه‌سوری|چهارشنبهسوری عیدی|عیدانه سیزده‌به‌در|سیزدهبدر کارناوال ماسکه آتش‌بازی|آتشبازی|آتش‌بازی ستاره‌بارون|بارانستارگان|ستارگان رصدخانه سیاهچاله ماه‌گرفتگی|ماهگرفتگی شفق‌قطبی|شفققطبی طوفان‌برف|کولاک کولاک بهمن زلزله سیل خشکسالی سراب بیابان واحه کویر مه|مه‌غلیظ تونل غار|غارنشین دریاچه آبشار رودخانه|رود تپه مزرعه|مزرعه‌دار کشاورز ماهیگیر دریانورد|ملوان سفرنامه نقشه‌راه|نقشهراه چمدان پاسپورت|گذرنامه مسافرخانه|مهمانخانه|هتل چایخانه|قهوه‌خانه|قهوهخانه|کافه کتابفروشی|کتابفروش حراجی ساعت‌شنی|ساعتشنی آونگ کلاغ‌سیاه|ساعت‌دیواری|ساعتدیواری آسمان‌پرستاره|آسمانپرستاره'
  };
  Object.keys(WORDS_EXTRA).forEach(k => { WORDS[k] = Array.from(new Set(WORDS[k].concat(WORDS_EXTRA[k].split(' ').filter(w => w && w.length > 1)))); });
  const ADJ = ['رویایی', 'بامزه', 'عاشقانه', 'آسمونی', 'شیرین', 'جادویی', 'کوچولو', 'بی‌نظیر', 'خنده‌دار', 'دنج'];
  const NOUN = ['شاهکارِ ما', 'خاطرهٔ رنگی', 'قصهٔ یه روز', 'لبخندِ دو نفره', 'نقاشیِ دونفره', 'رنگینِ کمونِ ما', 'دنیای کوچولوی ما', 'باغِ خیال'];

  /* ---------- وضعیت ---------- */
  let ch = null, subscribed = false, inited = false, built = false, tab = 'draw';
  let strokes = [], secretStrokes = [], redo = [], secret = false;
  const META0 = () => ({ mode: 'free', topic: '', bg: 'cream', turn: '', half: null, timerEnd: 0, drawer: '', tpl: '', used: [], level: 'med', wlen: 0, hint: '', rid: '', gEnd: 0 });
  let meta = META0(), stkCat = 0, tplHow = 'solo', tplLine = (() => { try { return localStorage.getItem('cv_tplline') || 'faint'; } catch (e) { return 'faint'; } })(), z = { s: 1, x: 0, y: 0 }, zoomEl = null, tplc = null, guessWrong = 0;
  let tool = 'pen', color = '#ff4d6d', size = 6, alpha = 1, stickerPick = '❤️', sigMode = false;
  let peers = {}, cursors = {}, remote = {}, mine = null, guessWord = '', guessFeed = [];
  let base, bctx, work, wctx, bgc, bgctx, stage;
  let dirty = true, saveT = null, saveState = '', liveMissing = false, artMissing = false, gallery = [], galleryLoaded = false;
  let pend = [], sendT = null, curT = 0, timerI = null, timerDone = 0, theme = jget('diary_cv_theme', 'dream'), light = jget('diary_cv_light', false);
  const myThumbKey = 'diary_cv_partner';
  /* 👧 دو فضای جدا: «بوم ما» (ما دو نفر، و آیسا اگه دعوتش کنیم) و «بوم آیسا» (مخصوص خودش) */
  const guestNow = () => typeof guestMode !== 'undefined' && guestMode;
  let space = null, invited = false, ich = null, ghSpace = '';
  const spc = () => space || (space = guestNow() ? 'aisa' : 'us');
  const liveId = () => spc() === 'aisa' ? 'aisa' : 'current';
  const lsk = k => spc() === 'aisa' ? k + '_aisa' : k;
  const idp = () => spc() === 'aisa' ? 'ai_' : '';

  const send = p => { if (secret) return; try { if (ch && subscribed) ch.send({ type: 'broadcast', event: 'cv', payload: Object.assign({ from: ID, name: nm() }, p) }); } catch (e) {} };
  const cur = () => secret ? secretStrokes : strokes;

  /* ---------- رسم ---------- */
  function paintBg(ctx, id) {
    ctx.save();
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
    if (id === 'white') fill('#ffffff');
    else if (id === 'night') fill('#14122a');
    else if (id === 'sky') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9bd1ff'); g.addColorStop(1, '#fff3d6'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (id === 'pink') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffd6e8'); g.addColorStop(1, '#e6d4ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else {
      fill('#fff8ec');
      if (id === 'grid') { ctx.strokeStyle = 'rgba(120,100,160,.22)'; ctx.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
      if (id === 'dots') { ctx.fillStyle = 'rgba(120,100,160,.35)'; for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } }
      if (id === 'lines') { ctx.strokeStyle = 'rgba(80,120,200,.3)'; ctx.lineWidth = 1.5; for (let y = 60; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
    }
    ctx.restore();
  }
  function drawStroke(ctx, s, env) {
    ctx.save();
    if (s.t === 'fl') { ctx.restore(); fillRegion(ctx, s, env || { tpl: meta.tpl, bg: meta.bg }); return; }
    if (s.t === 'st') { ctx.font = s.size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.e, s.x, s.y); ctx.restore(); return; }
    if (s.t === 'tx') {
      ctx.font = (s.sig ? 'italic ' : 'bold ') + s.size + 'px ' + (s.sig ? '"Brush Script MT","Segoe Script",cursive' : '"Vazirmatn",Tahoma,sans-serif');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = s.color; ctx.direction = 'rtl'; ctx.fillText(s.text, s.x, s.y); ctx.restore(); return;
    }
    const pts = s.pts || []; if (!pts.length) { ctx.restore(); return; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    let lw = s.size, al = s.alpha == null ? 1 : s.alpha;
    if (s.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; al = 1; lw = s.size * 2.2; }
    else if (s.tool === 'hl') { al = Math.min(al, 0.4); lw = s.size * 3; ctx.lineCap = 'square'; }
    else if (s.tool === 'brush') { ctx.shadowBlur = s.size * 0.7; ctx.shadowColor = s.color; lw = s.size * 1.4; }
    ctx.globalAlpha = al; ctx.lineWidth = lw;
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], lw / 2, 0, 7); ctx.fill(); ctx.restore(); return; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke(); ctx.restore();
  }
  /* ---------- 🖍️ طرح‌های آماده + سطل رنگ + PDF ---------- */
  const LW = 5;
  const starPath = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; };
  const HEART = 'M600 700 C250 480 230 220 420 190 C520 175 580 230 600 290 C620 230 680 175 780 190 C970 220 950 480 600 700 Z';
  const TPLS = [
    { id: 'heart', n: 'قلب', d: g => { g.sh(HEART); g.T(600, 440, .62, () => g.sh(HEART)); g.T(600, 440, .3, () => g.sh(HEART)); [[170, 150], [1030, 150], [150, 720], [1050, 720]].forEach(p => g.T(p[0], p[1], .16, () => g.sh(HEART)));
      g.T(600, 440, .12, () => g.sh(HEART)); [[330, 330], [870, 330], [600, 560], [420, 480], [780, 480]].forEach(p => g.ci(p[0], p[1], 14)); [[250, 290], [950, 290], [430, 210], [770, 210]].forEach(p => g.T(p[0], p[1], .1, () => g.sh(HEART)));
      for (let i = 0; i < 9; i++) g.ci(120 + i * 120, 800, 12); for (let i = 0; i < 8; i++) g.ci(180 + i * 120, 55, 9); g.ln('M60 110 C60 70 100 50 140 50'); g.ln('M1140 110 C1140 70 1100 50 1060 50'); } },
    { id: 'flower', n: 'گل', d: g => {
      g.sh('M585 430 C580 560 590 680 580 810 L620 810 C610 680 620 560 615 430 Z');
      g.sh('M600 640 C500 570 430 590 400 650 C470 705 560 695 600 640 Z'); g.sh('M610 560 C700 500 770 520 800 580 C730 630 650 620 610 560 Z');
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.el(600 + Math.cos(a) * 165, 330 + Math.sin(a) * 165, 50, 105, a + Math.PI / 2); }
      g.ci(600, 330, 85); g.ci(600, 330, 45);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.el(600 + Math.cos(a) * 165, 330 + Math.sin(a) * 165, 22, 62, a + Math.PI / 2); }
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.ci(600 + Math.cos(a) * 65, 330 + Math.sin(a) * 65, 9); }
      g.ln('M590 600 C560 580 500 600 450 640'); g.ln('M610 520 C660 500 720 520 760 560');
      [[220, 700, .5], [980, 690, .45], [360, 740, .35]].forEach(f => { g.ln('M' + f[0] + ' 810 L' + f[0] + ' ' + (810 - 170 * f[2] * 2)); const cy = 810 - 190 * f[2] * 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.el(f[0] + Math.cos(a) * 42 * f[2] * 2, cy + Math.sin(a) * 42 * f[2] * 2, 17 * f[2] * 2, 30 * f[2] * 2, a + Math.PI / 2); } g.ci(f[0], cy, 14 * f[2] * 2); });
      for (let i = 0; i < 7; i++) { const x = 110 + i * 140; g.ln('M' + x + ' 810 L' + (x + 8) + ' 770 L' + (x + 20) + ' 810'); }
      g.ln('M120 810 L1080 810'); g.sh('M880 150 C850 120 900 90 920 120 C940 90 990 120 960 150 C950 170 900 175 880 150 Z'); g.ci(150, 130, 26); g.ci(150, 130, 12); } },
    { id: 'cat', n: 'گربه', d: g => {
      g.sh('M820 740 C960 740 1020 640 980 540 C960 500 920 520 940 560 C970 620 930 690 820 700 Z');
      g.sh('M390 560 C340 680 340 790 440 800 L760 800 C860 790 860 680 810 560 Z');
      g.sh('M390 300 L360 100 L560 210 Z'); g.sh('M810 300 L840 100 L640 210 Z'); g.sh('M410 250 L390 160 L500 215 Z'); g.sh('M790 250 L810 160 L700 215 Z');
      g.el(600, 400, 230, 200); g.el(520, 380, 34, 44); g.el(680, 380, 34, 44); g.ci(520, 392, 15); g.ci(680, 392, 15);
      g.sh('M575 450 L625 450 L600 482 Z'); g.ln('M600 482 L600 512'); g.ln('M600 512 C580 545 550 545 535 515'); g.ln('M600 512 C620 545 650 545 665 515');
      g.ln('M420 450 L300 430'); g.ln('M420 485 L300 495'); g.ln('M780 450 L900 430'); g.ln('M780 485 L900 495'); g.el(600, 640, 90, 60);
      g.sh('M520 330 L540 270 L560 335 Z'); g.sh('M580 320 L600 250 L620 320 Z'); g.sh('M640 335 L660 270 L680 330 Z');
      g.ln('M440 540 C530 580 670 580 760 540'); g.ci(600, 590, 24); g.ln('M600 566 L600 614');
      g.ci(470, 470, 5); g.ci(450, 485, 5); g.ci(730, 470, 5); g.ci(750, 485, 5); g.ci(520, 392, 5); g.ci(680, 392, 5);
      g.el(450, 790, 48, 22); g.el(750, 790, 48, 22); g.ln('M420 790 L420 800'); g.ln('M450 785 L450 800'); g.ln('M480 790 L480 800'); g.ln('M720 790 L720 800'); g.ln('M750 785 L750 800'); g.ln('M780 790 L780 800');
      g.ln('M900 590 L960 612'); g.ln('M930 540 L985 550'); g.ln('M950 520 L990 480');
      g.ci(190, 720, 80); g.ln('M120 690 C170 720 230 690 265 730'); g.ln('M125 750 C180 710 230 760 260 700'); g.ln('M190 640 C200 700 160 760 190 800'); g.ln('M270 740 C330 760 340 800 400 800');
      [[90, 110], [1090, 90], [1010, 250]].forEach(p => g.star(p[0], p[1], 30)); g.ln('M60 810 L1140 810'); } },
    { id: 'rabbit', n: 'خرگوش', d: g => {
      g.el(500, 170, 55, 150, -0.08); g.el(700, 170, 55, 150, 0.08); g.el(500, 180, 26, 108, -0.08); g.el(700, 180, 26, 108, 0.08);
      g.el(600, 700, 175, 125); g.el(480, 805, 75, 30); g.el(720, 805, 75, 30); g.el(600, 720, 90, 70);
      g.el(600, 420, 205, 175); g.ci(530, 400, 30); g.ci(670, 400, 30); g.ci(534, 404, 12); g.ci(666, 404, 12); g.ci(455, 480, 36); g.ci(745, 480, 36);
      g.sh('M577 455 L623 455 L600 482 Z'); g.ln('M600 482 L600 512'); g.ln('M600 512 C580 540 555 536 545 516'); g.ln('M600 512 C620 540 645 536 655 516');
      g.ln('M450 470 L330 450'); g.ln('M450 500 L330 510'); g.ln('M750 470 L870 450'); g.ln('M750 500 L870 510');
      g.sh('M880 560 C930 540 960 600 930 680 C910 740 880 790 860 800 C850 740 850 620 880 560 Z'); g.ln('M885 600 L915 610'); g.ln('M880 650 L920 660'); g.ln('M872 710 L905 715');
      g.sh('M880 560 C860 520 850 490 870 470 C880 500 900 520 910 550 Z'); g.sh('M900 565 C930 520 960 510 980 520 C960 550 930 570 900 565 Z');
      for (let i = 0; i < 6; i++) g.ln('M' + (120 + i * 70) + ' 830 L' + (130 + i * 70) + ' 790 L' + (145 + i * 70) + ' 830');
      for (let i = 0; i < 4; i++) { const x = 190 + i * 70, y = 760 - (i % 2) * 40; for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; g.ci(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 10); } g.ci(x, y, 8); }
      g.ci(600, 740, 30); g.ln('M500 700 C530 690 560 700 570 720'); g.ln('M700 700 C670 690 640 700 630 720'); g.sh(starPath(150, 150, 34)); g.sh(starPath(1050, 150, 28)); g.ci(1000, 330, 20); g.ci(200, 330, 16); } },
    { id: 'butterfly', n: 'پروانه', d: g => {
      g.sh('M580 380 C450 120 150 150 170 350 C185 470 400 480 580 430 Z'); g.sh('M620 380 C750 120 1050 150 1030 350 C1015 470 800 480 620 430 Z');
      g.sh('M585 450 C430 480 250 560 300 700 C350 780 520 700 585 520 Z'); g.sh('M615 450 C770 480 950 560 900 700 C850 780 680 700 615 520 Z');
      g.ci(320, 300, 70); g.ci(880, 300, 70); g.ci(380, 640, 45); g.ci(820, 640, 45); g.ci(320, 300, 30); g.ci(880, 300, 30);
      g.ln('M590 205 C570 150 540 120 520 110'); g.ln('M610 205 C630 150 660 120 680 110'); g.el(600, 440, 24, 190); g.ci(600, 225, 30);
      g.ci(320, 300, 14); g.ci(880, 300, 14); g.ci(380, 640, 22); g.ci(820, 640, 22); g.ci(380, 640, 8); g.ci(820, 640, 8);
      [[250, 230], [400, 210], [470, 330], [230, 380], [350, 400]].forEach(p => { g.ci(p[0], p[1], 20); g.ci(1200 - p[0], p[1], 20); });
      [[330, 700], [440, 650], [470, 590]].forEach(p => { g.ci(p[0], p[1], 14); g.ci(1200 - p[0], p[1], 14); });
      g.ln('M580 400 C500 330 400 300 330 300'); g.ln('M620 400 C700 330 800 300 870 300'); g.ln('M585 480 C500 530 420 570 380 640'); g.ln('M615 480 C700 530 780 570 820 640');
      g.ci(520, 110, 14); g.ci(680, 110, 14); for (let i = 0; i < 5; i++) g.ln('M' + (590 + i * 5) + ' ' + (520 + i * 28) + ' l20 -6');
      g.sh('M110 760 C80 700 150 690 160 740 C190 700 240 740 200 780 C180 800 130 800 110 760 Z'); g.sh('M1020 760 C990 700 1060 690 1070 740 C1100 700 1150 740 1110 780 C1090 800 1040 800 1020 760 Z'); g.ci(150, 90, 24); g.ci(1050, 90, 24); g.ln('M560 810 C580 780 620 780 640 810'); } },
    { id: 'house', n: 'خونه', d: g => {
      g.rc(730, 230, 60, 110); g.rc(330, 380, 540, 350); g.sh('M290 390 L600 160 L910 390 Z');
      g.sh('M555 730 L555 560 C555 500 645 500 645 560 L645 730 Z'); g.rc(400, 450, 100, 100); g.ln('M450 450 L450 550'); g.ln('M400 500 L500 500');
      g.rc(700, 450, 100, 100); g.ln('M750 450 L750 550'); g.ln('M700 500 L800 500');
      g.ci(1010, 140, 60); g.sh('M130 230 C100 230 90 190 120 180 C120 140 180 130 195 165 C230 145 270 170 260 205 C290 210 285 245 250 245 Z');
      g.rc(965, 600, 30, 130); g.ci(980, 540, 90); g.ln('M60 730 L1140 730'); g.ci(630, 640, 7);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8 - r; c++) { const y = 210 + r * 42, w = 62; g.ln('M' + (390 + r * 28 + c * w) + ' ' + y + ' q' + (w / 2) + ' 34 ' + w + ' 0'); }
      for (let r = 0; r < 6; r++) g.ln('M330 ' + (410 + r * 54) + ' L' + (r % 2 ? 400 : 380) + ' ' + (410 + r * 54)); for (let r = 0; r < 6; r++) g.ln('M870 ' + (410 + r * 54) + ' L' + (r % 2 ? 800 : 820) + ' ' + (410 + r * 54));
      g.rc(390, 560, 120, 24); [[410, 540], [450, 535], [490, 540]].forEach(p => g.ci(p[0], p[1], 12)); g.rc(690, 560, 120, 24); [[710, 540], [750, 535], [790, 540]].forEach(p => g.ci(p[0], p[1], 12));
      g.ci(600, 300, 42); g.ci(600, 300, 22); g.ln('M600 258 L600 342'); g.ln('M558 300 L642 300');
      [[560, 760], [620, 785], [590, 815], [650, 750]].forEach(p => g.el(p[0], p[1], 34, 14)); g.ln('M440 730 L440 690'); [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => { g.ln('M' + (70 + i * 30) + ' 730 L' + (70 + i * 30) + ' 650'); }); g.ln('M60 670 L300 670');
      g.ci(980, 540, 40); g.ci(940, 560, 20); g.ci(1020, 520, 20); g.sh('M1080 600 C1060 560 1110 550 1120 590 C1140 560 1170 600 1140 620 C1130 640 1090 640 1080 600 Z');
      g.ln('M120 880 L120 880'); g.sh(starPath(630, 90, 30)); g.sh(starPath(330, 90, 22)); } },
    { id: 'mandala', n: 'ماندالا', d: g => {
      const C = (n, r, rx, ry) => { for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; g.el(600 + Math.cos(a) * r, 420 + Math.sin(a) * r, rx, ry, a + Math.PI / 2); } };
      g.ci(600, 420, 392); C(16, 300, 42, 78); C(16, 300, 20, 46); g.ci(600, 420, 232); C(12, 165, 32, 58); C(12, 165, 14, 30); g.ci(600, 420, 100); C(8, 62, 18, 32); g.ci(600, 420, 28); g.ci(600, 420, 12);
      for (let i = 0; i < 16; i++) { const a = (i + .5) * 2 * Math.PI / 16; g.ci(600 + Math.cos(a) * 300, 420 + Math.sin(a) * 300, 13); g.ci(600 + Math.cos(a) * 365, 420 + Math.sin(a) * 365, 8); g.ci(600 + Math.cos(i * 2 * Math.PI / 16) * 265, 420 + Math.sin(i * 2 * Math.PI / 16) * 265, 7); }
      for (let i = 0; i < 12; i++) { const a = (i + .5) * 2 * Math.PI / 12; g.ci(600 + Math.cos(a) * 165, 420 + Math.sin(a) * 165, 8); g.ci(600 + Math.cos(a) * 218, 420 + Math.sin(a) * 218, 6); }
      for (let i = 0; i < 8; i++) { const a = (i + .5) * 2 * Math.PI / 8; g.ci(600 + Math.cos(a) * 62, 420 + Math.sin(a) * 62, 6); } } },
    { id: 'sunset', n: 'غروب', d: g => {
      g.rc(8, 8, 1184, 824); g.ci(600, 470, 140);
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i + .5) * Math.PI / 9; g.ln('M' + (600 + Math.cos(a) * 170) + ' ' + (470 + Math.sin(a) * 170) + ' L' + (600 + Math.cos(a) * 235) + ' ' + (470 + Math.sin(a) * 235)); }
      g.sh('M8 470 L140 330 L260 400 L390 470 Z'); g.sh('M810 470 L960 300 L1080 400 L1192 340 L1192 470 Z');
      g.rc(8, 470, 1184, 362); g.ln('M100 560 q30 -20 60 0 t60 0 t60 0 t60 0'); g.ln('M820 580 q30 -20 60 0 t60 0 t60 0 t60 0'); g.ln('M460 760 q30 -20 60 0 t60 0 t60 0 t60 0');
      g.sh('M560 650 L760 650 L720 705 L600 705 Z'); g.ln('M660 650 L660 540'); g.sh('M668 548 L668 640 L750 640 Z');
      g.sh('M130 150 C100 150 90 110 120 100 C120 60 180 50 195 85 C230 65 270 90 260 125 C290 130 285 165 250 165 Z');
      g.ci(600, 470, 90); g.ci(600, 470, 40); g.sh('M600 380 L630 330 L560 345 Z');
      g.sh('M560 300 C530 300 520 270 545 262 C548 235 590 230 600 255 C625 245 650 265 640 285 C660 290 655 310 635 310 Z'); g.sh('M860 220 C835 220 828 197 848 190 C850 168 886 164 893 186 C913 180 933 196 925 214 C942 218 938 235 920 235 Z');
      for (let i = 0; i < 8; i++) g.ln('M' + (40 + i * 150) + ' 800 q30 -30 60 0 t60 0'); for (let i = 0; i < 6; i++) g.ln('M' + (30 + i * 200) + ' 610 q40 -20 80 0 t80 0');
      [[330, 120], [450, 70], [750, 90], [1000, 120], [1100, 200], [60, 260]].forEach(p => g.sh(starPath(p[0], p[1], 22)));
      g.sh('M180 470 L200 380 L230 420 L250 360 L290 470 Z'); g.sh('M900 470 L940 380 L980 430 L1020 390 L1060 470 Z');
      g.sh('M670 650 L690 600 L720 650 Z'); g.ci(655, 700, 10); g.ci(700, 690, 10); } },
    { id: 'fish', n: 'ماهی', d: g => {
      g.sh('M830 420 L1050 280 C1000 400 1000 440 1050 560 Z'); g.sh('M480 270 C520 190 640 190 680 270 Z'); g.sh('M500 570 C530 645 600 655 640 575 Z');
      g.el(560, 420, 300, 170); g.ci(400, 380, 34); g.ci(405, 382, 14); g.ln('M470 300 C430 380 430 460 470 540'); g.ln('M262 430 C300 452 330 452 350 436');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 560 + c * 62 + (r % 2) * 30, y = 330 + r * 70; g.ln('M' + x + ' ' + y + ' a32 32 0 0 1 0 64'); }
      g.ci(200, 260, 30); g.ci(160, 170, 20); g.ci(235, 115, 14); g.ci(900, 700, 24); g.ci(950, 640, 15);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 560 + c * 62 + (r % 2) * 30; g.ci(x + 22, 362 + r * 70, 8); }
      for (let i = 0; i < 4; i++) g.ln('M' + (880 + i * 40) + ' ' + (360 + i * 16) + ' L' + (1010 + i * 6) + ' ' + (330 + i * 30)); g.ln('M930 380 L1000 400'); g.ln('M930 440 L1000 430');
      g.ci(405, 382, 5); g.ln('M360 500 C390 520 420 520 440 500');
      g.sh('M120 840 C100 760 150 700 130 620 C170 700 190 760 160 840 Z'); g.sh('M200 840 C180 780 220 730 205 660 C240 730 255 790 235 840 Z'); g.sh('M1000 840 C990 780 1030 740 1010 680 C1050 740 1060 790 1050 840 Z');
      g.sh('M720 760 C700 700 800 690 820 750 C850 770 850 800 800 810 L740 810 C700 810 690 780 720 760 Z'); g.ln('M740 790 C760 740 770 730 780 720'); g.ln('M770 800 C790 750 800 740 810 730'); g.ci(110, 560, 12); g.ci(80, 500, 8); g.ci(600, 110, 12); g.ci(660, 60, 8); } },
    { id: 'cupcake', n: 'کاپ‌کیک', d: g => {
      g.el(600, 800, 340, 30); g.sh('M400 520 L460 780 L740 780 L800 520 Z');
      g.ln('M480 520 L516 780'); g.ln('M560 520 L572 780'); g.ln('M640 520 L628 780'); g.ln('M720 520 L684 780');
      g.sh('M360 520 C340 440 400 400 440 410 C440 340 520 310 560 340 C590 280 700 280 730 340 C780 310 850 350 840 410 C880 410 870 470 840 520 Z');
      g.ci(630, 240, 42); g.ln('M630 198 C640 160 670 140 700 130'); [[500, 450], [610, 410], [720, 440], [560, 360], [690, 350], [790, 480]].forEach(p => g.ci(p[0], p[1], 15));
      [[430, 480], [540, 495], [660, 490], [760, 505], [470, 400], [610, 340], [760, 400], [580, 455]].forEach((p, i) => g.el(p[0], p[1], 14, 6, i * 0.8));
      g.ln('M370 480 C440 500 500 470 560 500 C620 470 700 510 770 490 C800 490 820 500 835 495'); g.ln('M410 420 C470 440 520 410 580 430'); g.ln('M650 410 C710 430 760 410 800 430');
      g.ln('M440 600 L720 600'); g.ln('M450 680 L730 680'); g.ln('M420 520 L800 520');
      g.sh('M630 200 C600 190 590 160 610 150 C620 175 640 180 650 195 Z'); g.ln('M400 790 L800 790');
      [[220, 150], [980, 140], [150, 480], [1060, 470], [260, 700], [960, 690]].forEach(p => g.sh(starPath(p[0], p[1], 28))); for (let i = 0; i < 9; i++) g.ci(180 + i * 105, 70, 10); g.ci(210, 760, 40); g.ci(1000, 770, 30); g.ln('M170 760 L250 760'); } },
    { id: 'rocket', n: 'موشک', d: g => {
      const body = 'M600 100 C720 200 760 380 740 560 L460 560 C440 380 480 200 600 100 Z';
      g.sh('M520 560 C500 680 560 740 600 810 C640 740 700 680 680 560 Z'); g.sh('M560 560 C555 630 585 670 600 705 C615 670 645 630 640 560 Z');
      g.sh('M465 440 C400 500 350 580 350 690 L475 595 Z'); g.sh('M735 440 C800 500 850 580 850 690 L725 595 Z');
      g.sh(body); g.clip(body, () => { g.ln('M400 450 L800 450'); g.ln('M400 505 L800 505'); }); g.ci(600, 320, 62); g.ci(600, 320, 38);
      [[150, 140, 40], [1050, 120, 34], [220, 400, 26], [1000, 420, 30], [160, 700, 34], [1040, 730, 28]].forEach(p => g.sh(starPath(p[0], p[1], p[2])));
      g.ci(600, 320, 20);
      g.ci(600, 455, 10); g.ci(540, 455, 10); g.ci(660, 455, 10); g.ci(600, 530, 12); g.ci(540, 530, 12); g.ci(660, 530, 12);
      g.sh('M465 600 L420 700 L475 680 Z'); g.sh('M735 600 L780 700 L725 680 Z'); g.ln('M455 480 L475 480'); g.ln('M725 480 L745 480');
      g.sh('M540 140 C560 120 580 110 600 100 C620 110 640 120 660 140 C640 150 560 150 540 140 Z'); g.ln('M520 810 L520 840'); g.ln('M600 840 L600 810'); g.ln('M680 810 L680 840');
      g.ci(190, 560, 70); g.ln('M110 560 C170 590 220 590 270 560'); g.ln('M130 520 C180 540 210 540 255 520'); g.ci(165, 540, 12); g.ci(215, 585, 10);
      g.ci(1020, 560, 54); g.el(1020, 560, 100, 20, -0.3); g.ci(300, 250, 8); g.ci(900, 330, 8); g.ci(120, 300, 6); g.ci(1100, 350, 6);
      g.sh('M930 740 C910 740 905 720 920 715 C922 695 950 692 956 708 C972 704 988 716 982 730 C996 733 994 748 978 748 Z'); g.sh('M230 790 C210 790 205 770 220 765 C222 745 250 742 256 758 C272 754 288 766 282 780 C296 783 294 798 278 798 Z'); } }
  ,
    { id: 'owl', n: 'جغد', d: g => {
      g.sh('M360 330 L330 130 L500 230 Z'); g.sh('M840 330 L870 130 L700 230 Z');
      g.el(600, 500, 260, 280); g.el(600, 550, 170, 200);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5 - (r % 2); c++) g.ln('M' + (505 + c * 48 + (r % 2) * 24) + ' ' + (470 + r * 62) + ' q24 34 48 0');
      g.ci(500, 380, 105); g.ci(700, 380, 105); g.ci(500, 380, 70); g.ci(700, 380, 70); g.ci(500, 380, 30); g.ci(700, 380, 30); g.ci(488, 366, 8); g.ci(688, 366, 8);
      g.sh('M565 430 L635 430 L600 520 Z');
      g.sh('M330 460 C230 520 220 680 300 760 C360 700 380 560 360 470 Z'); g.sh('M870 460 C970 520 980 680 900 760 C840 700 820 560 840 470 Z');
      for (let i = 0; i < 4; i++) { g.ln('M' + (310 - i * 8) + ' ' + (520 + i * 55) + ' q30 20 50 0'); g.ln('M' + (890 + i * 8) + ' ' + (520 + i * 55) + ' q-30 20 -50 0'); }
      g.sh('M480 765 L440 795 M480 765 L480 795 M480 765 L520 795'); g.sh('M720 765 L680 795 M720 765 L720 795 M720 765 L760 795');
      g.rc(60, 785, 1080, 45); g.ln('M60 808 L1140 808'); g.ln('M200 785 L200 830'); g.ln('M520 785 L520 830'); g.ln('M860 785 L860 830');
      g.sh(starPath(150, 110, 34)); g.sh(starPath(1050, 120, 30)); g.ci(1000, 330, 50); g.ci(1015, 320, 40); g.ln('M60 330 L100 330'); g.ci(150, 280, 12); g.ci(1080, 480, 10); g.ci(120, 400, 8);
      for (let i = 0; i < 3; i++) { g.el(560 + i * 40, 215, 14, 28, 0); } } },
    { id: 'mandala2', n: 'ماندالا گل‌دار', d: g => {
      const C = (n, r, rx, ry, off) => { for (let i = 0; i < n; i++) { const a = (i + (off || 0)) * 2 * Math.PI / n; g.el(600 + Math.cos(a) * r, 420 + Math.sin(a) * r, rx, ry, a + Math.PI / 2); } };
      const D = (n, r, rad, off) => { for (let i = 0; i < n; i++) { const a = (i + (off || 0)) * 2 * Math.PI / n; g.ci(600 + Math.cos(a) * r, 420 + Math.sin(a) * r, rad); } };
      g.ci(600, 420, 400); D(36, 372, 14); g.ci(600, 420, 340); C(24, 295, 28, 50); C(24, 295, 12, 26); D(24, 250, 9, .5); g.ci(600, 420, 232);
      C(12, 185, 36, 66); C(12, 185, 18, 38); C(12, 185, 7, 14); D(12, 128, 12, .5); g.ci(600, 420, 100); C(6, 66, 20, 38); C(6, 66, 9, 18); g.ci(600, 420, 36); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.ci(600 + Math.cos(a) * 20, 420 + Math.sin(a) * 20, 7); } g.ci(600, 420, 8);
      D(24, 318, 6, .5); D(12, 232, 10, .5); } }
  ];
  const tplCache = {};
  function tplData(id) {
    if (!id) return null; if (tplCache[id]) return tplCache[id];
    const def = TPLS.find(t => t.id === id); if (!def) return null;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.lineWidth = LW; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#201a30'; x.fillStyle = '#fff';
    const sh = p => { const P = new Path2D(p); x.fill(P); x.stroke(P); };
    const g = {
      sh, ln: p => x.stroke(new Path2D(p)), star: (cx, cy, r) => sh(starPath(cx, cy, r)),
      el: (cx, cy, rx, ry, rot) => { if (rx < 1) return; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); x.fill(); x.stroke(); },
      ci: (cx, cy, r) => g.el(cx, cy, r, r), rc: (a, b, w, h) => { x.beginPath(); x.rect(a, b, w, h); x.fill(); x.stroke(); },
      T: (cx, cy, k, fn) => { x.save(); x.translate(cx, cy); x.scale(k, k); x.translate(-600, -440); x.lineWidth = LW / k; fn(); x.restore(); },
      clip: (p, fn) => { x.save(); x.clip(new Path2D(p)); fn(); x.restore(); }
    };
    def.d(g);
    const dt = x.getImageData(0, 0, W, H).data, mask = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < dt.length; i += 4, j++) if (dt[i + 3] >= 110 && dt[i] < 120) mask[j] = 1;
    const f = document.createElement('canvas'); f.width = W; f.height = H; const fx = f.getContext('2d'); fx.fillStyle = '#fff'; fx.fillRect(0, 0, W, H); fx.globalAlpha = 0.16; fx.drawImage(c, 0, 0);
    return tplCache[id] = { canvas: c, faint: f, mask, inv: null, finv: null };
  }
  const tplSrc = t => tplLine === 'faint' ? t.faint : t.canvas;
  function tplInv(t) {
    const fa = tplLine === 'faint', key = fa ? 'finv' : 'inv'; if (t[key]) return t[key];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(fa ? t.faint : t.canvas, 0, 0);
    const d = x.getImageData(0, 0, W, H), a = d.data; for (let i = 0; i < a.length; i += 4) { a[i] = 255 - a[i]; a[i + 1] = 255 - a[i + 1]; a[i + 2] = 255 - a[i + 2]; } x.putImageData(d, 0, 0);
    return t[key] = c;
  }
  function drawTplOn(ctx, id, bg) {
    const t = tplData(id); if (!t) return; ctx.save();
    if (bg === 'night') { ctx.globalCompositeOperation = 'screen'; ctx.drawImage(tplInv(t), 0, 0); } else { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(tplSrc(t), 0, 0); }
    ctx.restore();
  }
  function paintTpl() {
    if (!tplc) return; const x = tplc.getContext('2d'); x.clearRect(0, 0, W, H); const t = tplData(meta.tpl);
    if (t) x.drawImage(meta.bg === 'night' ? tplInv(t) : tplSrc(t), 0, 0);
    tplc.className = meta.bg === 'night' ? 'night' : '';
  }
  const hexRgb = h => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  /* سطل رنگ: داخل طرح آماده فقط تا خط‌ها پر می‌کنه؛ روی بوم ساده، ناحیهٔ هم‌رنگ رو پر می‌کنه */
  function fillRegion(ctx, s, env) {
    const sx = Math.round(s.x), sy = Math.round(s.y); if (!(sx >= 0 && sy >= 0 && sx < W && sy < H)) return;
    const lo = s.lo == null ? 0 : Math.max(0, s.lo), hi = s.hi == null ? W : Math.min(W, s.hi); if (sx < lo || sx >= hi) return;
    const T = env && env.tpl ? tplData(env.tpl) : null; let barrier = null, px = null, sr = 0, sg = 0, sb = 0;
    if (T) { barrier = T.mask; if (barrier[sy * W + sx]) return; }
    else { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); paintBg(x, (env && env.bg) || 'cream'); x.drawImage(ctx.canvas, 0, 0); px = x.getImageData(0, 0, W, H).data; const k = (sy * W + sx) * 4; sr = px[k]; sg = px[k + 1]; sb = px[k + 2]; }
    const ok = (x, y) => { const i = y * W + x; if (vis[i]) return false; if (barrier) return !barrier[i]; const k = i * 4; return Math.abs(px[k] - sr) + Math.abs(px[k + 1] - sg) + Math.abs(px[k + 2] - sb) <= 96; };
    const vis = new Uint8Array(W * H), st = [sy * W + sx]; let x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (st.length) {
      const i = st.pop(), x = i % W, y = (i / W) | 0; if (vis[i] || !ok(x, y)) continue;
      let a = x, b = x; while (a > lo && ok(a - 1, y)) a--; while (b < hi - 1 && ok(b + 1, y)) b++;
      for (let k = a; k <= b; k++) vis[y * W + k] = 1;
      if (a < x0) x0 = a; if (b > x1) x1 = b; if (y < y0) y0 = y; if (y > y1) y1 = y;
      [y - 1, y + 1].forEach(yy => { if (yy < 0 || yy >= H) return; let run = false; for (let k = a; k <= b; k++) { const g = ok(k, yy); if (g && !run) { st.push(yy * W + k); run = true; } else if (!g) run = false; } });
    }
    if (x1 < x0) return;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, img = new ImageData(w, h), d = img.data, [r, g2, b2] = hexRgb(s.color);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x; let on = vis[i];
      if (!on && x >= lo && x < hi) on = (x > 0 && vis[i - 1]) || (x < W - 1 && vis[i + 1]) || (y > 0 && vis[i - W]) || (y < H - 1 && vis[i + W]);
      if (on) { const k = ((y - y0) * w + (x - x0)) * 4; d[k] = r; d[k + 1] = g2; d[k + 2] = b2; d[k + 3] = 255; }
    }
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(img, 0, 0); ctx.drawImage(tmp, x0, y0);
  }

  /* 📄 ساخت فایل PDF (بدون کتابخونه): یک صفحهٔ A4 افقی با تصویر نقاشی */
  async function pdfBlob(c) {
    const jb = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); const jpg = new Uint8Array(await jb.arrayBuffer());
    const PW = 842, PH = 595, m = 24, sc = Math.min((PW - 2 * m) / c.width, (PH - 2 * m) / c.height), w = +(c.width * sc).toFixed(2), h = +(c.height * sc).toFixed(2), x = +((PW - w) / 2).toFixed(2), y = +((PH - h) / 2).toFixed(2);
    const enc = s => new TextEncoder().encode(s), parts = [], off = []; let len = 0; const add = u => { parts.push(u); len += u.length; };
    add(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]));
    const o = (n, body) => { off[n] = len; add(enc(n + ' 0 obj\n' + body + '\nendobj\n')); };
    o(1, '<< /Type /Catalog /Pages 2 0 R >>'); o(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    o(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    off[4] = len; add(enc('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + c.width + ' /Height ' + c.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n')); add(jpg); add(enc('\nendstream\nendobj\n'));
    const cs = 'q ' + w + ' 0 0 ' + h + ' ' + x + ' ' + y + ' cm /Im0 Do Q'; o(5, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
    const xr = len; let t = 'xref\n0 6\n0000000000 65535 f \n'; for (let i = 1; i <= 5; i++) t += String(off[i]).padStart(10, '0') + ' 00000 n \n';
    add(enc(t + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n'));
    return new Blob(parts, { type: 'application/pdf' });
  }
  function saveBlob(b, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  async function downloadPdf() {
    if (!cur().length) { toast2('بوم خالیه؛ اول یه چیزی بکش 🎨'); return; }
    try { toast2('📄 در حال ساخت PDF…'); saveBlob(await pdfBlob(await exportCanvas(filterSel || '')), 'our-canvas-' + Date.now() + '.pdf'); } catch (e) { console.error(e); toast2('⚠️ ساخت PDF نشد'); }
  }
  async function pdfArt(id) {
    const g = gallery.find(x => x.id === id); if (!g) return;
    try {
      toast2('📄 در حال ساخت PDF…'); const r = await fetch(g.url), bm = await createImageBitmap(await r.blob());
      const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0);
      saveBlob(await pdfBlob(c), (g.title || 'canvas') + '.pdf');
    } catch (e) { console.error(e); toast2('⚠️ ساخت PDF نشد'); }
  }

  /* 🔍 زوم و جابجایی */
  const zClamp = () => { if (!stage) return; z.s = Math.max(1, Math.min(6, z.s)); z.x = Math.min(0, Math.max(stage.clientWidth * (1 - z.s), z.x)); z.y = Math.min(0, Math.max(stage.clientHeight * (1 - z.s), z.y)); };
  function zApply() {
    if (!zoomEl) return; zClamp(); zoomEl.style.transform = z.s === 1 ? '' : 'translate(' + z.x.toFixed(1) + 'px,' + z.y.toFixed(1) + 'px) scale(' + z.s.toFixed(3) + ')';
    stage.style.setProperty('--iz', (1 / z.s).toFixed(3)); stage.classList.toggle('zoomed', z.s > 1.001); const l = $('cvZl'); if (l) l.textContent = fa(Math.round(z.s * 100)) + '٪';
  }
  function zoomAt(cx, cy, ns) { ns = Math.max(1, Math.min(6, ns)); z.x = cx - (cx - z.x) * ns / z.s; z.y = cy - (cy - z.y) * ns / z.s; z.s = ns; zApply(); }
  const zoomBy = f => { if (!stage) return; zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, z.s * f); };
  function zoomReset() { z = { s: 1, x: 0, y: 0 }; zApply(); }
  const ptrs = new Map(); let pinch = null, panDrag = null, pinchLock = false;
  function cancelMine() { if (!mine) return; clearTimeout(sendT); sendT = null; send({ t: 'cancel', id: mine.id }); mine = null; pend = []; dirty = true; }
  function pinchStart() {
    cancelMine(); pinchLock = true; panDrag = null; const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect();
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, z: Object.assign({}, z) };
  }
  function pinchMove() {
    if (!pinch || ptrs.size < 2) return; const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top, ns = Math.max(1, Math.min(6, pinch.z.s * d / pinch.d));
    const qx = (pinch.cx - pinch.z.x) / pinch.z.s, qy = (pinch.cy - pinch.z.y) / pinch.z.s; z.s = ns; z.x = cx - qx * ns; z.y = cy - qy * ns; zApply();
  }
  function wireStage() {
    work.addEventListener('pointerdown', e => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size >= 2) { pinchStart(); return; }
      if (pinchLock) return;
      if (pop) { pop = null; renderPop(); renderRail(); }
      if (tool === 'pan' || e.button === 1) { e.preventDefault(); try { work.setPointerCapture(e.pointerId); } catch (_) {} panDrag = { x: e.clientX, y: e.clientY, zx: z.x, zy: z.y }; return; }
      pDown(e);
    });
    work.addEventListener('pointermove', e => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) { e.preventDefault(); pinchMove(); return; }
      if (panDrag) { e.preventDefault(); z.x = panDrag.zx + e.clientX - panDrag.x; z.y = panDrag.zy + e.clientY - panDrag.y; zApply(); return; }
      pMove(e);
    });
    const up = e => {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) pinchLock = false; panDrag = null;
      if (!pinchLock || !pinch) pUp();
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => work.addEventListener(ev, up));
    stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, z.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))); }, { passive: false });
    stage.querySelectorAll('[data-z]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.z; if (k === 'in') zoomBy(1.4); else if (k === 'out') zoomBy(1 / 1.4); else zoomReset(); });
    zApply();
  }

  function rebuild() { bctx.clearRect(0, 0, W, H); cur().forEach(s => drawStroke(bctx, s)); dirty = true; }
  function frame() {
    if (dirty && wctx) {
      wctx.clearRect(0, 0, W, H); wctx.drawImage(base, 0, 0);
      Object.keys(remote).forEach(k => drawStroke(wctx, remote[k]));
      if (mine) drawStroke(wctx, mine);
      if (meta.mode === 'half' && meta.half && !secret) { wctx.save(); wctx.setLineDash([14, 12]); wctx.strokeStyle = 'rgba(160,120,220,.7)'; wctx.lineWidth = 3; wctx.beginPath(); wctx.moveTo(W / 2, 0); wctx.lineTo(W / 2, H); wctx.stroke(); wctx.restore(); }
      dirty = false;
    }
    if (built) requestAnimationFrame(frame); else frameOn = false;
  }
  let frameOn = false;
  const startFrame = () => { if (!frameOn) { frameOn = true; requestAnimationFrame(frame); } };

  /* ---------- قوانین حالت‌ها ---------- */
  const partnerName = () => { const k = Object.keys(peers).find(k => !same(peers[k].name, nm())); return k ? peers[k].name : ''; };
  function deny(x) {
    if (secret) return '';
    if (meta.timerEnd && Date.now() > meta.timerEnd) return '⏰ وقت تموم شده';
    if (meta.mode === 'turn' && meta.turn && !same(meta.turn, nm())) return '⏳ نوبت ' + meta.turn + ' ـه';
    if (meta.mode === 'guess' && meta.drawer && !same(meta.drawer, nm())) return '🤔 تو باید حدس بزنی، نقاش ' + meta.drawer + ' ـه';
    if (meta.mode === 'half' && meta.half) {
      const L = same(meta.half.L, nm()), R = same(meta.half.R, nm());
      if (x != null && L && x > W / 2) return '↔️ این نیمهٔ اون یکیه';
      if (x != null && R && x < W / 2) return '↔️ این نیمهٔ اون یکیه';
      if (!L && !R) return '↔️ هر نیمه مال یک نفره';
    }
    return '';
  }

  /* ---------- پوینتر ---------- */
  const pos = e => { const r = work.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]; };
  function pDown(e) {
    if (e.button != null && e.button > 0) return; e.preventDefault();
    const p = pos(e), d = deny(p[0]); if (d) { toast2(d); return; }
    if (sigMode) { sigMode = false; place({ t: 'tx', text: jget('diary_cv_sig', '') || nm(), x: p[0], y: p[1], size: Math.max(64, size * 6), color, sig: true }); renderTools(); return; }
    if (tool === 'fill') { let lo = null, hi = null; if (meta.mode === 'half' && meta.half) { if (same(meta.half.L, nm())) hi = W / 2; else if (same(meta.half.R, nm())) lo = W / 2; } place({ t: 'fl', x: p[0], y: p[1], color, lo, hi }); return; }
    if (tool === 'sticker') { place({ t: 'st', e: stickerPick, x: p[0], y: p[1], size: Math.max(96, size * 9) }); return; }
    if (tool === 'text') { const t = prompt('چی بنویسم روی نقاشی؟'); if (t && t.trim()) place({ t: 'tx', text: t.trim().slice(0, 60), x: p[0], y: p[1], size: Math.max(52, size * 5), color }); return; }
    try { work.setPointerCapture(e.pointerId); } catch (_) {}
    mine = { id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by: nm(), t: 'p', tool, color, size, alpha, pts: [p], ts: Date.now() };
    pend = [p]; dirty = true; sendSeg(true);
  }
  function pMove(e) {
    const p = pos(e);
    const now = Date.now(); if (now - curT > 70 && !secret) { curT = now; send({ t: 'cur', x: p[0] / W, y: p[1] / H }); }
    if (!mine) return; e.preventDefault();
    // ✍️ نرم‌کننده: لرزش دست و نوسان موس رو می‌گیره تا دست‌خط خط‌خطی نشه (نقطه‌ها به‌صورت نمایی به‌سمت مکان واقعی می‌رن؛ هرچی سریع‌تر بکشی تأخیرش کمتره)
    const evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const r = ev === e ? p : pos(ev); if (deny(r[0])) return;
      let q = r;
      if (mine.tool !== 'eraser') {
        const a = mine.sm || mine.pts[mine.pts.length - 1], dd = Math.hypot(r[0] - a[0], r[1] - a[1]), k = Math.min(0.7, Math.max(0.14, dd / 36));
        q = [a[0] + (r[0] - a[0]) * k, a[1] + (r[1] - a[1]) * k];
      }
      mine.sm = q; mine.raw = r;
      const l = mine.pts[mine.pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) < 2.2) continue;
      q = [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10];
      mine.pts.push(q); pend.push(q); dirty = true;
    }
    if (pend.length && !sendT) sendT = setTimeout(() => { sendT = null; sendSeg(false); }, 50);
  }
  function pUp() {
    if (!mine) return;
    if (mine.raw && mine.pts.length > 1 && mine.tool !== 'eraser') { const l = mine.pts[mine.pts.length - 1], r = mine.raw; if (Math.hypot(r[0] - l[0], r[1] - l[1]) > 0.5) { const m = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2]; [m, r].forEach(q => { mine.pts.push(q); pend.push(q); }); } }
    clearTimeout(sendT); sendT = null; sendSeg(false);
    const s = mine; mine = null; commit(s); send({ t: 'end', id: s.id }); aisaPing();
  }
  function sendSeg(first) {
    if (!mine || (!pend.length && !first)) return;
    const m = { t: 'seg', id: mine.id, pts: pend };
    if (first) Object.assign(m, { tool: mine.tool, color: mine.color, size: mine.size, alpha: mine.alpha, by: mine.by, first: 1 });
    send(m); pend = [];
  }
  function commit(s) {
    if (!s || cur().some(x => x.id === s.id)) return;
    if (s.pts && s.pts.length > 1500) s.pts = s.pts.filter((_, i) => i % 2 === 0);
    cur().push(s); drawStroke(bctx, s); dirty = true; if (s.by && same(s.by, nm())) redo = []; changed();
  }
  function place(s) {
    s.id = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); s.by = nm(); s.ts = Date.now();
    commit(s); send({ t: 'add', s }); try { OMSound.play('send'); } catch (e) {}
    aisaPing();
  }
  /* وقتی آیسا توی بوم خودش نقاشی می‌کشه، برای ما اعلان می‌ره (حداکثر هر ۳۰ دقیقه یک بار) */
  function aisaPing() {
    if (!guestNow() || spc() !== 'aisa' || typeof notify !== 'function') return;
    let last = 0; try { last = Number(localStorage.getItem('aisa_ping') || 0); } catch (e) {}
    if (Date.now() - last < 30 * 60000) return;
    try { localStorage.setItem('aisa_ping', String(Date.now())); } catch (e) {}
    notify('canvas', 'بوم آیسا', 'aisa', { author: nm() });
  }

  /* ---------- پیام‌های زنده ---------- */
  function join() {
    if (ch || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ch = dbClient.channel(spc() === 'aisa' ? 'canvas-aisa' : 'our-canvas', { config: { broadcast: { self: false }, presence: { key: ID } } });
      ch.on('broadcast', { event: 'cv' }, m => recv(m && m.payload))
        .on('presence', { event: 'sync' }, presence)
        .subscribe(st => { if (st === 'SUBSCRIBED') { subscribed = true; track(); render(); } });
    } catch (e) { console.warn('canvas off', e); ch = null; }
  }
  let thumb = '', thumbSrc = '';
  function track() {
    const go = () => { try { ch.track({ name: nm(), av: thumb }); } catch (e) {} };
    const src = (typeof userProfile !== 'undefined' && userProfile.avatar) || '';
    if (!src || src === thumbSrc) return go();
    const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 112; const x = c.getContext('2d'); const s = Math.min(im.width, im.height); x.imageSmoothingQuality = "high"; x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 112, 112); const u = c.toDataURL("image/jpeg", 0.8); if (u.length < 20000) thumb = u; thumbSrc = src; } catch (e) {} go(); };
    im.onerror = go; im.src = src;
  }
  function presence() {
    if (!ch) return;
    let st = {}; try { st = ch.presenceState() || {}; } catch (e) {}
    const old = Object.keys(peers).length; peers = {};
    Object.keys(st).forEach(k => { if (k !== ID && st[k] && st[k][0]) peers[k] = { name: st[k][0].name || 'یکی از ما', av: st[k][0].av || '' }; });
    const pn = partnerName(); if (pn) { const k = Object.keys(peers).find(k => same(peers[k].name, pn)); jset(lsk(myThumbKey), { name: pn, av: peers[k].av }); }
    if (Object.keys(peers).length > old && built) { toast2('🎨 ' + (pn || 'اون یکی') + ' اومد توی بوم'); try { OMSound.play('up'); } catch (e) {} }
    if (meta.mode === 'half' && meta.half && !meta.half.R && meta.half.L && !same(meta.half.L, nm())) setMeta({ half: Object.assign({}, meta.half, { R: nm() }) });
    renderHeader();
  }
  function recv(p) {
    if (!p || p.from === ID) return;
    if (p.t === 'seg') {
      let s = remote[p.id];
      if (!s) { if (!p.first && !p.tool) return; s = remote[p.id] = { id: p.id, by: p.by || p.name, t: 'p', tool: p.tool || 'pen', color: p.color || '#000', size: p.size || 6, alpha: p.alpha == null ? 1 : p.alpha, pts: [], ts: Date.now(), at: Date.now() }; }
      (p.pts || []).forEach(q => s.pts.push(q)); s.at = Date.now(); dirty = true;
    } else if (p.t === 'end') { const s = remote[p.id]; if (s) { delete remote[p.id]; commit(s); } }
    else if (p.t === 'add') { if (p.s) { commit(p.s); } }
    else if (p.t === 'cancel') { if (remote[p.id]) { delete remote[p.id]; dirty = true; } }
    else if (p.t === 'undo') { const n = strokes.length; strokes = strokes.filter(s => s.id !== p.id); if (strokes.length !== n && !secret) { rebuild(); changed(true); } else if (strokes.length !== n) { changed(true); } }
    else if (p.t === 'clear') { strokes = []; if (!secret) rebuild(); changed(true); toast2('🧹 ' + p.name + ' بوم رو پاک کرد'); }
    else if (p.t === 'meta') { applyMeta(p.meta, true); }
    else if (p.t === 'cur') { showCursor(p); }
    else if (p.t === 'guess') { onGuess(p); }
    else if (p.t === 'gres') {
      if (p.en) recG(p.en); if (tab === 'gs') renderGuesses();
      if (p.en && (p.en.kind === 't' || p.en.kind === 's')) { guessFeed.push({ name: p.en.kind === 't' ? '⏰ وقت تموم شد' : '⏭️ رد شد', text: '«' + p.word + '» بود', ok: false }); toast2((p.en.kind === 't' ? '⏰ وقت تموم شد؛ ' : '⏭️ ') + 'کلمه «' + p.word + '» بود'); }
      else guessFeed.push({ name: p.name, text: p.text, ok: p.ok });
      guessFeed = guessFeed.slice(-6); if (p.ok) { win(p.word); } renderMode(); }
    else if (p.t === 'saved') { if (galleryLoaded) loadGallery(); toast2('💾 ' + p.name + ' نقاشی رو توی گالری ذخیره کرد'); fx(24); }
    else if (p.t === 'reload') { loadLive(true); }
  }
  setInterval(() => { const n = Date.now(); Object.keys(remote).forEach(k => { if (n - remote[k].at > 8000) { delete remote[k]; dirty = true; } }); Object.keys(cursors).forEach(k => { if (n - cursors[k].at > 3500) { cursors[k].el.style.display = 'none'; } }); }, 2000);
  function showCursor(p) {
    if (!stage) return; let c = cursors[p.from];
    if (!c) { const el = document.createElement('div'); el.className = 'cv-cur'; el.innerHTML = '<i></i><b></b>'; (zoomEl || stage).appendChild(el); c = cursors[p.from] = { el }; }
    c.el.style.display = ''; c.el.style.left = (p.x * 100) + '%'; c.el.style.top = (p.y * 100) + '%'; c.el.querySelector('b').textContent = p.name || ''; c.at = Date.now();
  }

  /* ---------- مِتا (حالت‌ها) ---------- */
  function setMeta(patch) { applyMeta(Object.assign({}, meta, patch), false); send({ t: 'meta', meta }); changed(true); }
  function applyMeta(m, fromRemote) {
    if (!m) return; const prevBg = meta.bg;
    meta = Object.assign(META0(), m);
    if (bgctx && meta.bg !== prevBg) { bgctx.clearRect(0, 0, W, H); paintBg(bgctx, meta.bg); }
    paintTpl();
    if (meta.mode !== 'guess') { guessWord = ''; }
    if (meta.mode === 'guess' && same(meta.drawer, nm()) && !guessWord) { guessWord = pickWord(); const L = wordLen(guessWord); if (meta.wlen !== L || meta.hint || !meta.gEnd) { meta.wlen = L; meta.hint = ''; Object.assign(meta, roundMeta()); setTimeout(() => send({ t: 'meta', meta }), 0); } }
    if (meta.mode === 'half' && meta.half && !meta.half.R && meta.half.L && !same(meta.half.L, nm()) && fromRemote) { meta.half = Object.assign({}, meta.half, { R: nm() }); send({ t: 'meta', meta }); }
    dirty = true; renderMode(); renderHeader(); renderBgs();
  }
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  function modeSet(mode) {
    if (secret) { toast2('اول از حالت مخفی بیا بیرون'); return; }
    const pn = partnerName();
    if (mode === 'free') setMeta({ mode, turn: '', half: null, drawer: '', timerEnd: 0 });
    else if (mode === 'turn') { setMeta({ mode, turn: nm(), half: null, drawer: '', timerEnd: 0 }); toast2('🖌️ نوبتی شد؛ اول تو بکش و بعد «نوبتم تموم شد» رو بزن'); }
    else if (mode === 'half') { setMeta({ mode, half: { L: nm(), R: pn || '' }, turn: '', drawer: '', timerEnd: 0 }); toast2('↔️ تو نیمهٔ چپ، اون یکی نیمهٔ راست'); }
    else if (mode === 'guess') { if (strokes.length && !confirm('برای بازی حدس بزن، بوم پاک بشه؟')) return; strokes = []; rebuild(); send({ t: 'clear' }); guessWord = pickWord(); guessFeed = []; guessWrong = 0; setMeta(Object.assign({ mode, drawer: nm(), turn: '', half: null, timerEnd: 0, tpl: '', wlen: wordLen(guessWord), hint: '' }, roundMeta())); }
    else if (mode === 'timed') { const m = timedMin || 2; timerDone = 0; setMeta({ mode: 'timed', timerEnd: Date.now() + m * 60000, turn: '', half: null, drawer: '' }); toast2('⏱️ ' + fa(m) + ' دقیقه وقت داریم؛ بکشیم!'); }
  }
  function passTurn() { const pn = partnerName(); if (!pn) { toast2('اون یکی توی بوم نیست'); return; } setMeta({ turn: pn }); toast2('✅ نوبت به ' + pn + ' رسید'); }
  function onGuess(p) {
    if (meta.mode !== 'guess' || !same(meta.drawer, nm()) || !guessWord) return;
    if (meta.gEnd && Date.now() > meta.gEnd + 2500) return;
    const ok = guessWord.split('|').some(a => wNorm(a) === wNorm(p.text)), shown = guessWord.split('|')[0];
    guessFeed.push({ name: p.name, text: p.text, ok }); guessFeed = guessFeed.slice(-6);
    const en = { id: idp() + 'g_' + Date.now().toString(36) + '_' + ID, who: p.name, text: String(p.text || '').slice(0, 60), ok, word: shown, rid: meta.rid, lvl: meta.level, kind: ok ? 'ok' : 'g', ts: Date.now() };
    logGuess(en); send({ t: 'gres', text: p.text, ok, word: ok ? shown : '', en: Object.assign({}, en, { word: ok ? shown : '' }) });
    if (ok) win(shown); else { guessWrong++; if (guessWrong >= 3 && !meta.hint) { setMeta({ hint: firstLetter() }); toast2('💡 حرف اول به راهنما اضافه شد'); } }
    renderMode();
  }
  const wNorm = s => String(s || '').replace(/[\s‌ـ]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();
  const wordLen = w => wNorm(String(w).split('|')[0]).length, firstLetter = () => String(guessWord).split('|')[0].charAt(0);
  /* کلمه‌ها تکراری نمی‌آن: کلمه‌های استفاده‌شده هم توی همین دستگاه و هم توی meta (بین دو نفر) ثبت می‌شن؛ وقتی همهٔ کلمه‌های یک سطح تموم شد از نو شروع می‌شه */
  const USED_KEY = 'cv_words_used';
  const usedLoad = () => { try { const o = JSON.parse(localStorage.getItem(USED_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const pickWord = () => {
    const lv = WORDS[meta.level] ? meta.level : 'med', l = WORDS[lv], store = usedLoad();
    const shared = Array.isArray(meta.used) ? meta.used : [], done = new Set((store[lv] || []).concat(shared));
    let pool = l.filter(w => !done.has(w) && w !== guessWord);
    if (!pool.length) { store[lv] = []; meta.used = shared.filter(w => !l.includes(w)); pool = l.filter(w => w !== guessWord); toast2('🔁 همهٔ کلمه‌های این سطح تموم شد؛ از اول شروع شد'); }
    const w = rnd(pool); store[lv] = (store[lv] || []).concat(w).slice(-600); try { localStorage.setItem(USED_KEY, JSON.stringify(store)); } catch (e) {}
    meta.used = (Array.isArray(meta.used) ? meta.used : []).concat(w).slice(-400); return w;
  };
  const LSEC = { easy: 120, med: 90, hard: 75 };
  const roundMeta = () => ({ rid: 'r' + Date.now().toString(36), gEnd: Date.now() + (LSEC[meta.level] || 90) * 1000 });
  function newWord() { guessWord = pickWord(); guessWrong = 0; setMeta(Object.assign({ wlen: wordLen(guessWord), hint: '' }, roundMeta())); }
  function finishRound(kind) {
    if (!guessWord) return; const shown = String(guessWord).split('|')[0];
    const en = { id: idp() + 'g_' + Date.now().toString(36) + '_' + ID, who: '', text: '', ok: false, word: shown, rid: meta.rid, lvl: meta.level, kind, ts: Date.now() };
    logGuess(en); send({ t: 'gres', text: '', ok: false, word: shown, en }); guessFeed.push({ name: kind === 't' ? '⏰ وقت تموم شد' : '⏭️ رد شد', text: '«' + shown + '» بود', ok: false }); guessFeed = guessFeed.slice(-6);
    toast2((kind === 't' ? '⏰ وقت تموم شد؛ ' : '⏭️ ') + 'کلمه «' + shown + '» بود'); newWord();
  }
  /* 🕘 تاریخچهٔ حدس‌ها (جدول canvas_guesses ← SQL شمارهٔ ۲۶؛ بدون جدول فقط روی همین دستگاه) */
  let gh = [], ghMissing = false;
  function recG(e) { if (!e || !e.id || gh.some(x => x.id === e.id)) return; gh.push(e); gh.sort((a, b) => a.ts - b.ts); if (gh.length > 500) gh.splice(0, gh.length - 500); jset(lsk('diary_cv_guesses'), gh); }
  function logGuess(e) {
    recG(e); try { dbClient.from('canvas_guesses').upsert({ id: e.id, who: e.who, text: e.text, ok: !!e.ok, word: e.word || '', rid: e.rid || '', lvl: e.lvl || '', kind: e.kind, ts: e.ts }).then(r => { if (r && r.error) ghMissing = /canvas_guesses|relation|schema cache/i.test(r.error.message || ''); }, () => {}); } catch (x) {}
    if (tab === 'gs') renderGuesses();
  }
  async function loadGH() {
    try { const r = await dbClient.from('canvas_guesses').select('*').order('ts', { ascending: false }).limit(400); if (r.error) ghMissing = /canvas_guesses|relation|schema cache/i.test(r.error.message || ''); else { ghMissing = false; (r.data || []).filter(x => spc() === 'aisa' ? String(x.id).startsWith('ai_') : !String(x.id).startsWith('ai_')).forEach(x => recG({ id: x.id, who: x.who || '', text: x.text || '', ok: !!x.ok, word: x.word || '', rid: x.rid || '', lvl: x.lvl || '', kind: x.kind || 'g', ts: Number(x.ts) || 0 })); } } catch (e) {}
    renderGuesses();
  }
  function renderGuesses() {
    const el = $('cvGs'); if (!el) return;
    const per = {}; gh.forEach(e => { if (e.kind === 'g' || e.kind === 'ok') { const k = e.who || '؟'; (per[k] = per[k] || { n: 0, ok: 0 }).n++; if (e.kind === 'ok') per[k].ok++; } });
    const R2 = {};
    gh.forEach(e => { const k = e.rid || ('old' + e.id); const r = R2[k] = R2[k] || { ts: 0, es: [], res: null, lvl: e.lvl }; r.ts = Math.max(r.ts, e.ts); if (e.kind === 'g') r.es.push(e); else { r.res = e; r.es.push(e); } });
    const list = Object.keys(R2).map(k => R2[k]).filter(r => r.res || r.es.length).sort((a, b) => b.ts - a.ts);
    const lab = { ok: '✅', t: '⏰', s: '⏭️' };
    const stat = Object.keys(per).map(k => `<div class="cv-st"><b>${esc(k)}</b><span>${fa(per[k].n)} حدس</span><span>✅ ${fa(per[k].ok)} درست</span><span>${fa(per[k].n ? Math.round(per[k].ok / per[k].n * 100) : 0)}٪ دقت</span></div>`).join('');
    el.innerHTML = (ghMissing ? '<div class="cv-empty">🛠️ برای اینکه حدس‌ها روی هر دو دستگاه ذخیره بمونن، SQL شمارهٔ ۲۶ رو یک بار اجرا کن؛ فعلاً فقط روی همین دستگاه ثبت می‌شن.</div>' : '')
      + (list.length ? `<div class="cv-sts">${stat}</div>` + list.map(r => {
        const res = r.res, word = res ? res.word : '', head = res ? `${lab[res.kind] || ''} <b>${esc(word)}</b>` : '🤫 دور در جریان…';
        const gs = r.es.filter(e => e.kind === 'g' || e.kind === 'ok').map(e => `<span class="${e.ok ? 'ok' : ''}">${esc(e.who)}: ${esc(e.text)} ${e.ok ? '✅' : '❌'}</span>`).join('');
        return `<div class="cv-rd"><div class="h">${head}<small>${esc(LVL[r.lvl] || '')} · ${esc(dateOf(r.ts))}${res && res.kind === 't' ? ' · وقت تموم شد' : res && res.kind === 's' ? ' · رد شد' : ''}</small></div><div class="gl">${gs || '<small>حدسی زده نشد</small>'}</div></div>`;
      }).join('') : '<div class="cv-empty">هنوز حدسی ثبت نشده؛ یه دور «حدس بزن» بازی کنید 🤔</div>');
  }
  const LVL = { easy: 'آسان', med: 'متوسط', hard: 'سخت' };
  function win(word) { toast2('🎉 درست حدس زده شد: «' + word + '»'); fx(36); try { OMSound.play('up'); } catch (e) {} if (same(meta.drawer, nm())) newWord(); }
  function myGuess() {
    const i = $('cvGuessIn'); const t = i && i.value.trim(); if (!t) return;
    if (meta.gEnd && Date.now() > meta.gEnd) { toast2('⏰ وقت این دور تموم شده؛ منتظر کلمهٔ بعدی باش'); return; }
    guessFeed.push({ name: nm(), text: t, ok: false }); guessFeed = guessFeed.slice(-6); send({ t: 'guess', text: t }); i.value = ''; renderMode();
  }

  /* ---------- ذخیره و بارگذاری ---------- */
  function changed(silent) { redoUi(); if (secret) return; scheduleSave(); }
  function scheduleSave() { clearTimeout(saveT); setSave('⏳'); saveT = setTimeout(saveLive, 1500); }
  const setSave = s => { saveState = s; const e = $('cvSaveDot'); if (e) { e.classList.toggle('ok', s === '✓'); e.title = s === '✓' ? 'ذخیره شد' : s === '!' ? 'فقط روی همین دستگاه ذخیره شد' : s ? 'در حال ذخیره…' : 'ذخیرهٔ خودکار'; } };
  async function saveLive() {
    const row = { id: liveId(), strokes: JSON.stringify(strokes), meta: JSON.stringify(meta), updated_at: Date.now() };
    jset(lsk('diary_cv_live'), { strokes, meta });
    try { const { error } = await dbClient.from('canvas_live').upsert(row); if (error) { liveMissing = /canvas_live|relation|schema cache/i.test(error.message || ''); setSave('!'); render(); return; } liveMissing = false; setSave('✓'); } catch (e) { setSave('!'); }
  }
  async function loadLive(quiet) {
    let data = null;
    try { const r = await dbClient.from('canvas_live').select('*').eq('id', liveId()).maybeSingle(); if (r.error) { liveMissing = /canvas_live|relation|schema cache/i.test(r.error.message || ''); } else { liveMissing = false; data = r.data; } } catch (e) {}
    if (data) { try { strokes = JSON.parse(data.strokes || '[]'); applyMeta(JSON.parse(data.meta || '{}'), true); } catch (e) {} }
    else { const l = jget(lsk('diary_cv_live'), null); if (l && !strokes.length) { strokes = l.strokes || []; applyMeta(l.meta || meta, true); } else applyMeta(meta, true); }
    if (!secret) rebuild(); redoUi(); render();
  }

  async function exportCanvas(filter) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    paintBg(x, meta.bg); x.drawImage(base, 0, 0); drawTplOn(x, meta.tpl, meta.bg);
    if (filter) applyFilter(c, filter);
    return c;
  }
  function applyFilter(c, f) {
    const x = c.getContext('2d');
    try {
      if (f === 'cartoon') {
        const d = x.getImageData(0, 0, W, H), a = d.data, lv = 5, st = 255 / (lv - 1);
        for (let i = 0; i < a.length; i += 4) { a[i] = Math.round(a[i] / st) * st; a[i + 1] = Math.round(a[i + 1] / st) * st; a[i + 2] = Math.round(a[i + 2] / st) * st; }
        x.putImageData(d, 0, 0); x.save(); x.globalCompositeOperation = 'multiply'; x.filter = 'saturate(1.5) contrast(1.1)'; x.drawImage(c, 0, 0); x.restore();
      } else if (f === 'sketch') {
        const g = document.createElement('canvas'); g.width = W; g.height = H; const gx = g.getContext('2d');
        gx.filter = 'grayscale(1)'; gx.drawImage(c, 0, 0); gx.filter = 'none';
        const iv = document.createElement('canvas'); iv.width = W; iv.height = H; const ix = iv.getContext('2d'); ix.filter = 'grayscale(1) invert(1) blur(5px)'; ix.drawImage(c, 0, 0);
        x.clearRect(0, 0, W, H); x.drawImage(g, 0, 0); x.globalCompositeOperation = 'color-dodge'; x.drawImage(iv, 0, 0); x.globalCompositeOperation = 'source-over';
      } else if (f === 'soft') { const t = document.createElement('canvas'); t.width = W; t.height = H; t.getContext('2d').drawImage(c, 0, 0); x.clearRect(0, 0, W, H); x.filter = 'blur(1.5px) saturate(1.25) brightness(1.06)'; x.drawImage(t, 0, 0); x.filter = 'none'; }
    } catch (e) { console.warn('filter', e); }
  }
  const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));
  const titleIdea = () => (Math.random() < .5 ? rnd(NOUN) + ' ' + rnd(ADJ) : rnd(ADJ) + ' ' + rnd(NOUN).replace('ِ ما', '')) + (meta.topic && Math.random() < .5 ? ' · ' + meta.topic : '');

  async function saveToGallery(opts) {
    opts = opts || {};
    if (!cur().length) { toast2('بوم خالیه؛ اول یه چیزی بکش 🎨'); return; }
    const filter = filterSel || '';
    const ex = editId && !secret ? gallery.find(x => x.id === editId) : null;
    const replace = !!ex && confirm('نسخهٔ قبلی «' + ex.title + '» با این نسخه جایگزین بشه؟ (لغو = ذخیره به‌عنوان نقاشی جدید)');
    let title = opts.title; if (title == null) { title = prompt('اسم این نقاشی چی باشه؟', replace ? ex.title : titleIdea()); if (title === null) return; }
    title = (title.trim() || titleIdea()).slice(0, 80);
    let reveal = 0;
    if (secret) { const h = prompt('چند ساعت دیگه برای نفر مقابل نمایش داده بشه؟', '24'); if (h === null) return; reveal = Date.now() + Math.max(0.05, Number(h) || 24) * 3600000; }
    toast2('⏳ در حال ذخیره…');
    try {
      const blob = await blobOf(await exportCanvas(filter));
      const up = await uploadMediaFile(blob, 'png', 'canvas.png');
      const row = { id: replace ? ex.id : (opts.id || (idp() + 'cv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5))), title, url: up.url, path: up.path, strokes: JSON.stringify(cur()), bg: meta.bg, author: secret ? nm() : (partnerName() ? nm() + ' و ' + partnerName() : nm()), created_at: replace ? ex.created_at : Date.now(), fav: replace ? !!ex.fav : false, comments: replace ? (ex.comments || '[]') : '[]', reveal_at: reveal || null, topic: meta.topic || '', mode: secret ? 'secret' : (meta.tpl ? 'tpl:' + meta.tpl : meta.mode) };
      const { error } = await dbClient.from('canvas_art').upsert(row);
      if (error) { artMissing = /canvas_art|relation|schema cache/i.test(error.message || ''); try { await dbClient.storage.from('songs').remove([up.path]); } catch (e) {} throw error; }
      if (guestNow() && spc() === 'aisa' && !secret) {
        try {
          const up2 = await uploadMediaFile(blob, 'png', 'canvas.png');
          const cp = Object.assign({}, row, { id: row.id.replace(/^ai_/, ''), url: up2.url, path: up2.path, author: nm() + ' 👧' });
          const r2 = await dbClient.from('canvas_art').upsert(cp);
          if (r2 && r2.error) { try { await dbClient.storage.from('songs').remove([up2.path]); } catch (e) {} } else if (!replace && typeof notify === 'function') notify('canvas_art', title, cp.id, { author: nm() });
        } catch (e) { console.warn(e); }
      }
      if (!secret && canShare() && (shareOn() || (replace && sharedSet.has(row.id)))) { try { await putAisaCopy(Object.assign({}, row), row.strokes, blob); } catch (e) { console.warn(e); } }
      artMissing = false; if (replace && ex.path && ex.path !== up.path) { try { dbClient.storage.from('songs').remove([ex.path]); } catch (e) {} } gallery = gallery.filter(g => g.id !== row.id); gallery.unshift(Object.assign({}, row, { strokes: undefined })); if (replace || opts.finish) { editId = null; renderMode(); }
      fx(opts.finish ? 40 : 18); toast2(secret ? '🔒 نقاشی مخفی ذخیره شد و سر وقتش نمایش داده می‌شه' : (opts.finish ? '🏁 نقاشی تموم شد و توی گالری ذخیره شد 💞' : '💾 توی گالری ذخیره شد ✨'));
      if (!secret) send({ t: 'saved' });
      if (secret) { secret = false; secretStrokes = []; rebuild(); renderMode(); renderTools(); renderAct(); }
      try { window.CatPal && CatPal.act('link'); } catch (e) {}
      renderGallery();
    } catch (e) { console.error(e); toast2('⚠️ ' + (typeof uploadErrorHint === 'function' ? uploadErrorHint(e, 'canvas_art') : 'ذخیره نشد') + (artMissing ? ' (SQL شمارهٔ ۲۴ اجرا نشده)' : '')); }
  }
  async function download() {
    const c = await exportCanvas(filterSel || ''); const b = await blobOf(c);
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'our-canvas-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- گالری ---------- */
  async function loadGallery() {
    try {
      const r = await dbClient.from('canvas_art').select('id,title,url,path,bg,author,created_at,fav,comments,reveal_at,topic,mode').order('created_at', { ascending: false }).limit(200);
      if (r.error) { artMissing = /canvas_art|relation|schema cache/i.test(r.error.message || ''); } else { artMissing = false; sharedSet = new Set((r.data || []).filter(g => String(g.id).startsWith('ai_sh_')).map(g => String(g.id).slice(6))); gallery = (r.data || []).filter(g => spc() === 'aisa' ? String(g.id).startsWith('ai_') : !String(g.id).startsWith('ai_')); galleryLoaded = true; }
    } catch (e) {}
    renderGallery();
  }
  const dateOf = ts => { try { const w = Recur.epochToWall(ts); return Recur.fmtJalaliShort(w.iso); } catch (e) { return ''; } };
  const locked = g => g.reveal_at && Number(g.reveal_at) > Date.now() && !same(g.author, nm());
  function renderGallery() {
    const el = $('cvGal'); if (!el) return;
    if (artMissing) { el.innerHTML = '<div class="cv-empty">🛠️ برای گالری باید SQL شمارهٔ ۲۴ رو یک بار توی Supabase اجرا کنی.</div>'; return; }
    if (!gallery.length) { el.innerHTML = '<div class="cv-empty">هنوز نقاشی‌ای ذخیره نکردیم… اولین شاهکارمون رو بکشیم 🎨</div>'; return; }
    const favs = gallery.filter(g => g.fav).length;
    el.innerHTML = `<div class="cv-gal-top">${fa(gallery.length)} نقاشی · ❤️ ${fa(favs)} مورد علاقه <label><input type="checkbox" id="cvFavOnly" ${galFav ? 'checked' : ''}/> فقط علاقه‌مندی‌ها</label></div><div class="cv-grid">` + gallery.filter(g => !galFav || g.fav).map(g => {
      const lk = locked(g); const left = lk ? Math.ceil((Number(g.reveal_at) - Date.now()) / 3600000) : 0;
      let cm = 0; try { cm = JSON.parse(g.comments || '[]').length; } catch (e) {}
      return `<div class="cv-card" data-id="${esc(g.id)}">${lk ? `<div class="cv-lock">🔒<small>غافلگیری! حدود ${fa(left)} ساعت دیگه</small></div>` : `<img src="${esc(g.url)}" alt="${esc(g.title)}" loading="lazy" data-open="${esc(g.id)}">`}
        <div class="cv-ct"><b>${esc(lk ? 'نقاشی مخفی' : g.title)}</b><small>${esc(g.author || '')} · ${esc(dateOf(g.created_at))}</small></div>
        <div class="cv-ca"><button type="button" data-fav="${esc(g.id)}" title="علاقه‌مندی">${g.fav ? '❤️' : '🤍'}</button>${lk ? '' : `<button type="button" data-open="${esc(g.id)}" title="دیدن و کامنت">💬${cm ? ' ' + fa(cm) : ''}</button><button type="button" data-edit="${esc(g.id)}" title="ویرایش دوباره">✏️</button><button type="button" data-dl="${esc(g.id)}" title="دانلود">⬇️</button><button type="button" data-pdf="${esc(g.id)}" title="ذخیره PDF">📄</button>`}${canShare() && !lk ? `<button type="button" data-aish="${esc(g.id)}" class="${sharedSet.has(g.id) ? 'on' : ''}" title="${sharedSet.has(g.id) ? 'الان برای آیسا نمایش داده می‌شه (برای پنهان کردن بزن)' : 'نمایش برای آیسا'}">${sharedSet.has(g.id) ? '👧✅' : '👧'}</button>` : ''}<button type="button" data-del="${esc(g.id)}" title="حذف">🗑️</button></div></div>`;
    }).join('') + '</div>';
    const fo = $('cvFavOnly'); if (fo) fo.onchange = () => { galFav = fo.checked; renderGallery(); };
  }
  let galFav = false, sharedSet = new Set();
  const shareOn = () => { try { return localStorage.getItem('cv_share_aisa') === '1'; } catch (e) { return false; } };
  const canShare = () => !guestNow() && spc() === 'us';
  /* 👧 نمایش یک نقاشیِ ما برای آیسا (یک نسخه توی گالری خودش؛ با زدن دوباره، پنهان می‌شه) */
  async function putAisaCopy(g, strokesJson, blob) {
    const up = await uploadMediaFile(blob, 'png', 'canvas.png');
    const row = { id: 'ai_sh_' + g.id, title: g.title, url: up.url, path: up.path, strokes: strokesJson || '[]', bg: g.bg || 'cream', author: g.author || '', created_at: g.created_at || Date.now(), fav: false, comments: '[]', reveal_at: null, topic: g.topic || '', mode: g.mode && g.mode !== 'secret' ? g.mode : 'free' };
    const { error } = await dbClient.from('canvas_art').upsert(row);
    if (error) { try { await dbClient.storage.from('songs').remove([up.path]); } catch (e) {} throw error; }
    sharedSet.add(g.id); return row;
  }
  async function shareArt(id) {
    const g = gallery.find(x => x.id === id); if (!g || locked(g)) return;
    const sid = 'ai_sh_' + id;
    if (sharedSet.has(id)) {
      if (!confirm('«' + g.title + '» از گالری آیسا برداشته بشه؟')) return;
      try { const r = await dbClient.from('canvas_art').select('path').eq('id', sid).maybeSingle(); const { error } = await dbClient.from('canvas_art').delete().eq('id', sid); if (error) throw error; if (r && r.data && r.data.path) dbClient.storage.from('songs').remove([r.data.path]); sharedSet.delete(id); renderGallery(); toast2('👧 از گالری آیسا برداشته شد'); } catch (e) { toast2('⚠️ برداشته نشد'); }
      return;
    }
    toast2('⏳ دارم برای آیسا می‌فرستم…');
    try {
      const rs = await dbClient.from('canvas_art').select('strokes').eq('id', id).maybeSingle();
      const blob = await (await fetch(g.url)).blob();
      await putAisaCopy(g, rs && rs.data && rs.data.strokes, blob);
      renderGallery(); toast2('👧 «' + g.title + '» حالا توی گالری آیسا هم هست 💞');
    } catch (e) { console.error(e); toast2('⚠️ برای آیسا فرستاده نشد'); }
  }
  async function toggleFav(id) { const g = gallery.find(x => x.id === id); if (!g) return; g.fav = !g.fav; renderGallery(); try { await dbClient.from('canvas_art').update({ fav: g.fav }).eq('id', id); } catch (e) {} }
  async function delArt(id) {
    if (!confirm('این نقاشی برای هر دو حذف بشه؟')) return; const g = gallery.find(x => x.id === id); if (!g) return;
    try { const { error } = await dbClient.from('canvas_art').delete().eq('id', id); if (error) throw error; if (g.path) dbClient.storage.from('songs').remove([g.path]); if (sharedSet.has(id)) { try { const r2 = await dbClient.from('canvas_art').select('path').eq('id', 'ai_sh_' + id).maybeSingle(); await dbClient.from('canvas_art').delete().eq('id', 'ai_sh_' + id); if (r2 && r2.data && r2.data.path) dbClient.storage.from('songs').remove([r2.data.path]); sharedSet.delete(id); } catch (e) {} } gallery = gallery.filter(x => x.id !== id); renderGallery(); toast2('🗑️ حذف شد'); } catch (e) { toast2('⚠️ حذف نشد'); }
  }
  async function dlArt(id) { const g = gallery.find(x => x.id === id); if (!g) return; try { const r = await fetch(g.url); const b = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (g.title || 'canvas') + '.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) { window.open(g.url, '_blank'); } }

  /* نمایش یک نقاشی + پخش دوبارهٔ مراحل + کامنت */
  let rpTimer = null;
  async function openArt(id) {
    const g = gallery.find(x => x.id === id); if (!g || locked(g)) return;
    const d = document.createElement('div'); d.className = 'cv-modal'; d.innerHTML = `<div class="cv-mbox"><button type="button" class="cv-x" aria-label="بستن">✕</button><h3>${esc(g.title)}</h3><small>${esc(g.author || '')} · ${esc(dateOf(g.created_at))}${g.topic ? ' · موضوع: ' + esc(g.topic) : ''}</small>
      <div class="cv-mstage"><img src="${esc(g.url)}" alt=""><canvas width="${W}" height="${H}" class="cv-rp" style="display:none"></canvas></div>
      <div class="cv-row"><button type="button" class="cv-ib pri" data-m="replay" title="پخش دوبارهٔ نقاشی" aria-label="پخش دوباره">${ico('play')}</button><button type="button" class="cv-ib" data-m="edit" title="ویرایش دوباره" aria-label="ویرایش">${ico('pen')}</button><button type="button" class="cv-ib" data-m="dl" title="دانلود" aria-label="دانلود">${ico('dl')}</button><button type="button" class="cv-ib" data-m="pdf" title="ذخیره PDF" aria-label="PDF">${ico('pdf')}</button></div>
      <div class="cv-cm" id="cvCm"></div><form class="cv-cmf"><input type="text" maxlength="200" placeholder="یه نظر قشنگ بنویس…"><button class="btn" type="submit">ارسال</button></form></div>`;
    document.body.appendChild(d);
    const close = () => { clearTimeout(rpTimer); d.remove(); };
    d.querySelector('.cv-x').onclick = close; d.addEventListener('click', e => { if (e.target === d) close(); });
    const getL = () => { let l = []; try { l = JSON.parse(g.comments || '[]'); } catch (e) {} return Array.isArray(l) ? l : []; };
    const saveL = async l => { g.comments = JSON.stringify(l); renderCm(); try { await dbClient.from('canvas_art').update({ comments: g.comments }).eq('id', id); } catch (_) {} renderGallery(); };
    const same = (a, b) => typeof sameName === 'function' ? sameName(a, b) : String(a || '').trim() === String(b || '').trim();
    function renderCm() {
      const l = getL(), box = d.querySelector('#cvCm');
      box.innerHTML = l.length ? l.map((c, k) => `<div class="cv-c" data-k="${k}"><div class="cv-ch"><span class="cv-cav">${esc(String(c.by || '?').trim().charAt(0).toUpperCase())}</span><b class="cv-cn">${esc(c.by || 'ناشناس')}</b><small>${esc(dateOf(c.ts))}${c.edited ? ' · ویرایش‌شده' : ''}</small><span class="cv-cb">${same(c.by, nm()) ? `<button type="button" data-ce="${k}" title="ویرایش">✏️</button>` : ''}<button type="button" data-cd="${k}" title="حذف">✕</button></span></div><div class="cv-ctx">${esc(c.text)}</div></div>`).join('') : '<div class="cv-empty" style="padding:6px">هنوز نظری نیست 💬</div>';
      box.querySelectorAll('[data-cd]').forEach(b => b.onclick = async () => { if (!confirm('این کامنت حذف بشه؟')) return; const l2 = getL(); l2.splice(+b.dataset.cd, 1); await saveL(l2); });
      box.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => {
        const k = +b.dataset.ce, row = box.querySelector('.cv-c[data-k="' + k + '"]'), tx = row.querySelector('.cv-ctx'); if (row.querySelector('.cv-ed')) return;
        const ed = document.createElement('div'); ed.className = 'cv-ed'; ed.innerHTML = '<textarea maxlength="200" rows="2"></textarea><div><button type="button" class="btn">💾 ذخیره</button><button type="button" class="btn ghost">انصراف</button></div>';
        const ta = ed.querySelector('textarea'); ta.value = getL()[k] ? getL()[k].text : ''; tx.style.display = 'none'; tx.after(ed); ta.focus();
        const [sv, cn] = ed.querySelectorAll('button'); cn.onclick = () => { ed.remove(); tx.style.display = ''; };
        sv.onclick = async () => { const t = ta.value.trim(); if (!t) { toast2('⚠️ متن نمی‌تونه خالی باشه'); return; } const l2 = getL(); if (!l2[k]) return; l2[k].text = t.slice(0, 200); l2[k].edited = true; await saveL(l2); };
        ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); cn.click(); } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sv.click(); } });
      });
    }
    renderCm();
    d.querySelector('.cv-cmf').onsubmit = async e => { e.preventDefault(); const i = e.target.querySelector('input'), t = i.value.trim(); if (!t) return; const l = getL(); l.push({ by: nm(), text: t.slice(0, 200), ts: Date.now() }); i.value = ''; await saveL(l); const b = d.querySelector('#cvCm'); b.scrollTop = b.scrollHeight; };
    d.querySelector('[data-m=dl]').onclick = () => dlArt(id);
    d.querySelector('[data-m=pdf]').onclick = () => pdfArt(id);
    d.querySelector('[data-m=edit]').onclick = () => editArt(id);
    d.querySelector('[data-m=replay]').onclick = async () => {
      let sts = null; try { const r = await dbClient.from('canvas_art').select('strokes').eq('id', id).maybeSingle(); sts = r.data && JSON.parse(r.data.strokes || '[]'); } catch (e) {}
      if (!sts || !sts.length) { toast2('مراحل این نقاشی ذخیره نشده'); return; }
      const cv = d.querySelector('.cv-rp'), img = d.querySelector('.cv-mstage img'); img.style.display = 'none'; cv.style.display = 'block'; replay(cv, sts, g.bg || 'cream', () => { img.style.display = ''; cv.style.display = 'none'; }, tplOf(g));
    };
  }
  /* ✏️ ویرایش دوبارهٔ یک نقاشی ذخیره‌شده: مراحلش روی بوم مشترک بارگذاری می‌شه و با ذخیره، همون نقاشی (یا یک نسخهٔ جدید) به‌روز می‌شه */
  let editId = null;
  const tplOf = g => { const m = String(g && g.mode || ''); return m.startsWith('tpl:') && TPLS.some(t => t.id === m.slice(4)) ? m.slice(4) : ''; };
  async function editArt(id) {
    const g = gallery.find(x => x.id === id); if (!g || locked(g)) return;
    if (strokes.length && !confirm('بوم فعلی با این نقاشی جایگزین می‌شه. ادامه بدم؟ (اگه بوم فعلی رو می‌خوای، اول ذخیره‌اش کن)')) return;
    let sts = null; try { const r = await dbClient.from('canvas_art').select('strokes').eq('id', id).maybeSingle(); sts = r.data && JSON.parse(r.data.strokes || '[]'); } catch (e) {}
    if (!sts || !sts.length) { toast2('مراحل این نقاشی ذخیره نشده؛ نمی‌شه ویرایشش کرد'); return; }
    document.querySelectorAll('.cv-modal').forEach(x => x.remove()); clearTimeout(rpTimer);
    secret = false; strokes = sts; redo = []; editId = id; tab = 'draw'; pop = null;
    applyMeta(Object.assign({}, meta, { mode: 'free', turn: '', half: null, drawer: '', timerEnd: 0, bg: g.bg || 'cream', topic: g.topic || '', tpl: tplOf(g) }), false);
    rebuild(); render(); send({ t: 'meta', meta }); clearTimeout(saveT); await saveLive(); send({ t: 'reload' });
    toast2('✏️ «' + g.title + '» روی بوم باز شد؛ ویرایشش کن و ذخیره بزن');
  }
  function replay(cv, sts, bg, done, tplId) {
    clearTimeout(rpTimer);
    const x = cv.getContext('2d'), bc = document.createElement('canvas'); bc.width = W; bc.height = H; const bx = bc.getContext('2d');
    const total = sts.reduce((a, s) => a + (s.pts ? s.pts.length : 8), 0), per = Math.max(2, Math.ceil(total / (14 * 60)));
    let i = 0, n = 0;
    const env = { tpl: tplId || '', bg }, draw = tmp => { x.clearRect(0, 0, W, H); paintBg(x, bg); const w = document.createElement('canvas'); w.width = W; w.height = H; const wx = w.getContext('2d'); wx.drawImage(bc, 0, 0); if (tmp) drawStroke(wx, tmp, env); x.drawImage(w, 0, 0); drawTplOn(x, tplId, bg); };
    (function step() {
      if (i >= sts.length) { draw(null); rpTimer = setTimeout(done, 1500); return; }
      const s = sts[i];
      if (s.t !== 'p') { drawStroke(bx, s, env); i++; draw(null); rpTimer = setTimeout(step, 260); return; }
      n += per; if (n >= s.pts.length) { drawStroke(bx, s, env); i++; n = 0; draw(null); rpTimer = setTimeout(step, 16); return; }
      draw(Object.assign({}, s, { pts: s.pts.slice(0, n) })); rpTimer = setTimeout(step, 16);
    })();
  }

  /* ---------- افکت‌ها ---------- */
  function fx(n) {
    const host = document.body, em = ['❤️', '⭐', '💜', '✨', '🌸', '💖'];
    for (let i = 0; i < n; i++) { const e = document.createElement('div'); e.className = 'cv-fx'; e.textContent = rnd(em); e.style.left = (5 + Math.random() * 90) + 'vw'; e.style.animationDelay = (Math.random() * .6) + 's'; e.style.fontSize = (16 + Math.random() * 22) + 'px'; host.appendChild(e); setTimeout(() => e.remove(), 3200); }
  }

  /* ---------- صفحه ---------- */
  const CSS = `
#screen-canvas{--cvA:#d4a5ff;--cvB:#ff8fb8;--cvP:rgba(255,255,255,.05);--cvT:var(--text,#eee)}
#screen-canvas[data-cvt=sunset]{--cvA:#ffb07a;--cvB:#ff6f91}#screen-canvas[data-cvt=mint]{--cvA:#7fe0c4;--cvB:#6fb7ff}
#screen-canvas.cv-light{--cvP:rgba(255,255,255,.85);--cvT:#2a2038}
.cv-title{text-align:center;margin:0 0 10px}.cv-title h2{margin:0}.cv-title small{color:var(--muted,#aaa)}
.cv-tabs{display:flex;gap:8px;justify-content:center;margin:8px 0 12px}
.cv-tab{padding:8px 18px;border-radius:999px;border:1px solid rgba(212,165,255,.3);background:var(--cvP);color:var(--cvT);cursor:pointer;font:inherit}
.cv-tab.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent;font-weight:700}
.cv-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:8px}
.cv-av{position:relative;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--cvA),var(--cvB));display:grid;place-items:center;font-weight:700;color:#1a1030;overflow:visible}
.cv-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.cv-av i{position:absolute;bottom:0;left:0;width:12px;height:12px;border-radius:50%;background:#7a7a8a;border:2px solid var(--bg,#0a0a0f)}.cv-av.on i{background:#4cd964}
.cv-av small{position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:.62rem;white-space:nowrap;color:var(--muted,#aaa)}
.cv-amp{font-size:1.3rem}
.cv-topic{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0;font-size:.85rem}
.cv-topic .pill{padding:5px 12px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25)}
.cv-modes{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0}
.cv-modes button,.cv-bar button,.cv-row button,.cv-topic button,.cv-ctl button{padding:7px 11px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:var(--cvP);color:var(--cvT);cursor:pointer;font:inherit;font-size:.85rem}
.cv-modes button.on,.cv-bar button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent;font-weight:700}
.cv-banner{text-align:center;padding:8px 12px;border-radius:12px;background:rgba(212,165,255,.14);border:1px dashed rgba(212,165,255,.4);margin:6px 0;font-size:.86rem;line-height:1.8}
.cv-timer{font-weight:700;font-size:1.1rem;direction:ltr;display:inline-block}
.cv-bar{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center;margin:8px 0}
.cv-sw{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0}
.cv-sw button{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.35);cursor:pointer;padding:0}
.cv-sw button.on{outline:3px solid var(--cvA);outline-offset:1px}
.cv-sw input[type=color]{width:34px;height:30px;border:0;background:none;padding:0;cursor:pointer}
.cv-ctl{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;align-items:center;margin:6px 0;font-size:.82rem}
.cv-ctl label{display:flex;align-items:center;gap:6px}.cv-ctl input[type=range]{width:110px}
.cv-stks{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin:6px 0}
.cv-stks button{font-size:1.25rem;padding:3px 7px}.cv-stks button.on{background:rgba(212,165,255,.35)}
.cv-stage{position:relative;width:100%;max-width:960px;margin:8px auto;aspect-ratio:${W}/${H};border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.45);border:2px solid rgba(212,165,255,.35);touch-action:none;background:#fff}
.cv-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cv-stage canvas.draw{touch-action:none;cursor:crosshair}
.cv-stage.intro{animation:cvIntro 1s ease-out}@keyframes cvIntro{from{clip-path:circle(0% at 50% 50%);transform:scale(.9) rotate(-2deg)}to{clip-path:circle(80% at 50% 50%);transform:none}}
.cv-cur{position:absolute;pointer-events:none;transform:translate(-4px,-4px);z-index:5;transition:left .07s linear,top .07s linear}
.cv-cur i{display:block;width:14px;height:14px;border-radius:50%;background:var(--cvB);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.cv-cur b{position:absolute;top:16px;left:6px;font-size:.7rem;background:rgba(0,0,0,.65);color:#fff;border-radius:8px;padding:1px 6px;white-space:nowrap}
.cv-sel{padding:7px 10px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:#241a3a;color:#f3ecff;font:inherit;font-size:.85rem}
#screen-canvas.cv-light .cv-sel{background:#fff;color:#2a2038}
.cv-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:8px 0}
.cv-save{text-align:center;font-size:.78rem;color:var(--muted,#aaa);min-height:1.2em}
.cv-gg{display:flex;gap:6px;justify-content:center;align-items:center;margin:6px 0;flex-wrap:wrap}.cv-gg input{padding:8px 12px;border-radius:12px;border:1px solid rgba(212,165,255,.35);background:rgba(10,10,15,.5);color:inherit;font:inherit}
.cv-feed{font-size:.8rem;color:var(--muted,#aaa);text-align:center;line-height:1.8}.cv-feed .ok{color:#7fe0a0;font-weight:700}
.cv-empty{text-align:center;color:var(--muted,#aaa);padding:30px 12px;line-height:1.9}
.cv-gal-top{text-align:center;color:var(--muted,#aaa);font-size:.85rem;margin-bottom:10px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.cv-card{border-radius:16px;overflow:hidden;background:var(--cvP);border:1px solid rgba(212,165,255,.22);display:flex;flex-direction:column}
.cv-card img{width:100%;aspect-ratio:${W}/${H};object-fit:cover;cursor:pointer;display:block;background:#fff}
.cv-lock{aspect-ratio:${W}/${H};display:grid;place-items:center;text-align:center;font-size:2.4rem;background:linear-gradient(135deg,rgba(212,165,255,.2),rgba(255,143,184,.15))}.cv-lock small{display:block;font-size:.72rem;color:var(--muted,#aaa)}
.cv-ct{padding:8px 10px 2px;display:flex;flex-direction:column;gap:2px}.cv-ct small{color:var(--muted,#aaa);font-size:.72rem}
.cv-ca{display:flex;flex-wrap:wrap;gap:2px;padding:4px 8px 8px;justify-content:space-between}.cv-ca button{background:none;border:0;cursor:pointer;font-size:1.05rem;color:inherit;padding:4px 5px;border-radius:8px}.cv-ca button:hover{background:rgba(212,165,255,.18)}
.cv-modal{position:fixed;inset:0;z-index:2600;background:rgba(0,0,0,.82);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow-y:auto}
.cv-mbox{position:relative;width:min(760px,100%);background:#17122a;border:1px solid rgba(212,165,255,.35);border-radius:18px;padding:16px;color:#f3ecff}
.cv-mbox h3{margin:0 0 2px}.cv-mbox small{color:#b9a8d8}
.cv-x{position:absolute;top:10px;left:12px;background:none;border:0;color:inherit;font-size:1.2rem;cursor:pointer}
.cv-mstage{margin:10px 0;border-radius:12px;overflow:hidden;background:#fff}.cv-mstage img,.cv-mstage canvas{width:100%;display:block}
.cv-cm{max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin:8px 0}.cv-c{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:9px 12px;font-size:.9rem}.cv-c:hover{background:rgba(212,165,255,.06);border-color:rgba(212,165,255,.2)}
.cv-ch{display:flex;align-items:center;gap:8px;margin-bottom:5px}.cv-cav{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#d4a5ff,#ff9ecb);color:#1a0a20;font-weight:700;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cv-cn{color:#d4a5ff;font-weight:600;font-size:.85rem}.cv-c small{margin-right:auto;font-size:.7rem;opacity:.6}.cv-cb{display:flex;gap:4px;opacity:.35;transition:.2s}.cv-c:hover .cv-cb{opacity:1}
.cv-cb button{width:24px;height:24px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:inherit;font-size:.72rem;cursor:pointer}.cv-cb button:hover{background:rgba(212,165,255,.35)}.cv-cb button[data-cd]{color:#ff7ba0;background:rgba(255,80,120,.15)}
.cv-ctx{line-height:1.7;white-space:pre-wrap;word-break:break-word}.cv-ed textarea{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,165,255,.35);background:rgba(10,10,15,.5);color:inherit;font:inherit;resize:vertical}.cv-ed div{display:flex;gap:6px;margin-top:6px}
.cv-cmf{display:flex;gap:8px}.cv-cmf input{flex:1;min-width:0;padding:9px 12px;border-radius:12px;border:1px solid rgba(212,165,255,.35);background:rgba(10,10,15,.5);color:inherit;font:inherit}
.cv-fx{position:fixed;bottom:-30px;z-index:3000;pointer-events:none;animation:cvFly 2.6s ease-out forwards}
@keyframes cvFly{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(-95vh) rotate(40deg);opacity:0}}
@media (max-width:600px){.cv-ctl input[type=range]{width:90px}.cv-grid{grid-template-columns:repeat(2,1fr)}}`;

  function buildCanvases() {
    if (built) return;
    const st = document.createElement('style'); st.id = 'cvCss'; st.textContent = CSS; document.head.appendChild(st);
    base = document.createElement('canvas'); base.width = W; base.height = H; bctx = base.getContext('2d');
    built = true;
  }

  /* ---------- 🎛️ رابط: نوار ابزار آیکونی + پنجره‌های کوچیک ---------- */
  const IC = {
    pen: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    brush: '<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>',
    hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    sticker: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    sig: '<path d="m21 17-2.156-1.868A.5.5 0 0 0 18 15.5v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.545-3.991-3.97-8.5-4a1 1 0 0 0 0 5c4.153 0 4.745-11.295 5.708-13.5a2.5 2.5 0 1 1 3.31 3.284"/><path d="M3 21h18"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
    clear: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    mode: '<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/>',
    bg: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    set: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    wand: '<path d="m15 4 5 5L9 20l-5-5z"/><path d="M5 3v4M3 5h4M19 15v4M17 17h4"/>',
    brushes: '<circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>',
    gal: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    fill: '<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/>',
    pan: '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>',
    zin: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
    zout: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
    tpl: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    canvas: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>'
  };
  const ico = (n, s) => `<svg viewBox="0 0 24 24" width="${s || 20}" height="${s || 20}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  const BG_CSS = { white: '#fff', cream: '#fff8ec', night: '#14122a', grid: 'repeating-linear-gradient(0deg,#fff8ec 0 7px,#d9cfe6 7px 8px),#fff8ec', dots: 'radial-gradient(#9b8bb8 1.2px,#fff8ec 1.4px) 0 0/8px 8px', lines: 'repeating-linear-gradient(0deg,#fff8ec 0 9px,#a9c3ee 9px 10px)', sky: 'linear-gradient(#9bd1ff,#fff3d6)', pink: 'linear-gradient(135deg,#ffd6e8,#e6d4ff)' };
  const MODES = [['free', 'pen', 'آزاد'], ['turn', 'redo', 'کاملش کن (نوبتی)'], ['half', 'gal', 'نیمه‌نیمه'], ['guess', 'bulb', 'حدس بزن'], ['timed', 'cal', 'زمان‌دار'], ['secret', 'sig', 'نقاشی مخفی']];
  let pop = null, timedMin = 2, filterSel = '';
  const toolSizes = { pen: 6, brush: 16, hl: 14, eraser: 24 };

  function CSS2() {
    return `
#screen-canvas .cv-app{max-width:1060px;margin:0 auto}
.cv-seg{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25)}
.cv-seg button{width:38px;height:32px;border-radius:999px;border:0;background:none;color:var(--cvT);cursor:pointer;display:grid;place-items:center;opacity:.65}
.cv-seg button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;opacity:1}
.cv-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.cv-top .sp{flex:1}
.cv-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:var(--cvP);border:1px solid rgba(212,165,255,.25);font-size:.82rem;max-width:100%}
.cv-chip b{max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cv-ib{width:36px;height:36px;border-radius:12px;border:1px solid rgba(212,165,255,.28);background:var(--cvP);color:var(--cvT);cursor:pointer;display:inline-grid;place-items:center;padding:0;font-size:1rem;transition:.15s}
.cv-ib:hover{border-color:var(--cvA);transform:translateY(-1px)}.cv-ib.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent}
.cv-ib.sm{width:30px;height:30px;border-radius:10px}
.cv-ib.pri{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030;border-color:transparent}
.cv-dot{position:relative;width:10px;height:10px;border-radius:50%;background:#7a7a8a;display:inline-block}.cv-dot.ok{background:#4cd964}
.cv-avs{display:flex;align-items:center}
.cv-av{width:34px;height:34px;font-size:.9rem;margin-left:-8px;border:2px solid var(--bg,#0a0a0f)}.cv-av small{display:none}.cv-av i{width:10px;height:10px;bottom:-1px;left:-1px}
.cv-main{position:relative;display:flex;gap:10px;align-items:flex-start}
.cv-rail{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:18px;background:var(--cvP);border:1px solid rgba(212,165,255,.22);position:sticky;top:76px;z-index:6;backdrop-filter:none}
.cv-rail .div{height:1px;background:rgba(212,165,255,.22);margin:2px 4px}
.cv-rail .cv-ib{border-color:transparent;background:none}.cv-rail .cv-ib:hover{background:rgba(212,165,255,.14)}.cv-rail .cv-ib.on{background:linear-gradient(135deg,var(--cvA),var(--cvB))}
.cv-sw1{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
.cv-wrap{flex:1;min-width:0;position:relative}
.cv-pop{position:absolute;z-index:20;top:0;right:0;width:min(300px,100%);padding:12px;border-radius:16px;background:#1b1530;color:#f3ecff;border:1px solid rgba(212,165,255,.35);box-shadow:0 14px 40px rgba(0,0,0,.55);display:none}
#screen-canvas.cv-light .cv-pop{background:#fff;color:#2a2038}
.cv-pop h6{margin:0 0 8px;font-size:.74rem;opacity:.7;font-weight:600}
.cv-grid2{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
.cv-grid2 button{aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.4);cursor:pointer;padding:0}
.cv-grid2 button.on{outline:3px solid var(--cvA);outline-offset:1px}
.cv-grid2.cv-big{grid-template-columns:repeat(10,1fr);gap:5px;max-height:46vh;overflow-y:auto;padding:2px}.cv-grid2.cv-big button{border-width:1.5px}.cv-grid2.cv-big button.on{outline-width:2px}
.cv-grid2.sq{grid-template-columns:repeat(4,1fr)}.cv-grid2.sq button{border-radius:12px;aspect-ratio:1.4}
.cv-grid2.em{grid-template-columns:repeat(6,1fr)}.cv-grid2.em button{border:0;background:rgba(255,255,255,.07);border-radius:10px;font-size:1.3rem;aspect-ratio:1}.cv-grid2.em button.on{background:rgba(212,165,255,.4)}
.cv-prow{display:flex;gap:8px;align-items:center;margin:8px 0}.cv-prow input[type=range]{flex:1}
.cv-prow input[type=color]{width:100%;height:34px;border:0;background:none;padding:0;cursor:pointer}
.cv-pv{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.07);display:grid;place-items:center}.cv-pv i{display:block;border-radius:50%}
.cv-sizes{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:6px}.cv-sizes button{aspect-ratio:1;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);cursor:pointer;display:grid;place-items:center;padding:0}.cv-sizes button.on{background:rgba(212,165,255,.4);border-color:var(--cvA)}.cv-sizes i{display:block;border-radius:50%}
.cv-mg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cv-mg button{height:46px;border-radius:12px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;display:grid;place-items:center}.cv-mg button.on{background:linear-gradient(135deg,var(--cvA),var(--cvB));color:#1a1030}
.cv-chips{display:flex;gap:6px;margin-top:8px}.cv-chips button{flex:1;padding:6px 0;border-radius:10px;border:1px solid rgba(212,165,255,.3);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font:inherit;font-size:.78rem}.cv-chips button.on{background:var(--cvA);color:#1a1030}
.cv-banner{font-size:.82rem;padding:7px 12px;margin:0 0 8px;border-radius:12px}
.cv-banner .cv-ib{vertical-align:middle;margin:0 6px}
.cv-gg input{min-width:0;flex:1}
.cv-stage{margin:0}
.cv-save{display:none}
.cv-zoom{position:absolute;inset:0;transform-origin:0 0}
.cv-stage canvas#cvTpl{pointer-events:none;mix-blend-mode:multiply}.cv-stage canvas#cvTpl.night{mix-blend-mode:screen}
.cv-cur{transform:translate(-4px,-4px) scale(var(--iz,1));transform-origin:0 0}
.cv-stage[data-tool=pan] canvas.draw{cursor:grab}.cv-stage[data-tool=fill] canvas.draw{cursor:cell}
.cv-zb{position:absolute;left:8px;bottom:8px;z-index:7;display:flex;gap:4px;align-items:center;padding:4px;border-radius:14px;background:rgba(20,16,36,.62);color:#fff}
.cv-zb .cv-ib{width:30px;height:30px;border-radius:10px;background:none;border-color:transparent;color:#fff}.cv-zb span{font-size:.72rem;min-width:36px;text-align:center;direction:ltr}
.cv-rail{max-height:calc(100vh - 100px);overflow-y:auto;scrollbar-width:none}.cv-rail::-webkit-scrollbar{display:none}
.cv-cats{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}.cv-cats button{width:32px;height:32px;border-radius:10px;border:1px solid rgba(212,165,255,.25);background:rgba(255,255,255,.06);cursor:pointer;font-size:1.05rem;padding:0}.cv-cats button.on{background:rgba(212,165,255,.4);border-color:var(--cvA)}
.cv-grid2.em.scr{max-height:210px;overflow-y:auto;padding:2px}
.cv-tpls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-height:300px;overflow-y:auto}.cv-tpls button{border:2px solid transparent;border-radius:10px;background:#fff;padding:0;cursor:pointer;overflow:hidden;position:relative}.cv-tpls button.on{border-color:var(--cvA)}.cv-tpls img{width:100%;display:block}.cv-tpls small{position:absolute;bottom:0;left:0;right:0;background:rgba(27,21,48,.75);color:#fff;font-size:.62rem;padding:1px 0;text-align:center}
.cv-wd{display:flex;gap:6px;justify-content:center;margin:6px 0;font-weight:700;font-size:1.15rem;flex-wrap:wrap}.cv-wd span{min-width:26px;border-bottom:3px solid var(--cvA);text-align:center;line-height:1.5}
.cv-sts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}
.cv-st{padding:12px;border-radius:16px;background:var(--cvP);border:1px solid rgba(212,165,255,.25);display:flex;flex-direction:column;gap:3px;font-size:.84rem}.cv-st b{font-size:1rem}
.cv-rd{padding:10px 14px;border-radius:14px;background:var(--cvP);border:1px solid rgba(212,165,255,.2);margin-bottom:8px}
.cv-rd .h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.cv-rd .h b{font-size:1.05rem}.cv-rd small{color:var(--muted,#aaa);font-size:.72rem}
.cv-rd .gl{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.cv-rd .gl span{padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.07);font-size:.8rem}.cv-rd .gl span.ok{background:rgba(76,217,100,.22)}
@media (max-width:760px){
  .cv-main{flex-direction:column-reverse;align-items:stretch}
  .cv-wrap{flex:none;width:100%}
  .cv-rail{flex-direction:row;overflow-x:auto;width:100%;position:static;padding:6px;gap:4px;border-radius:16px;scrollbar-width:none}
  .cv-rail::-webkit-scrollbar{display:none}.cv-rail .div{width:1px;height:26px;margin:4px 2px;flex:none}.cv-rail .cv-ib{flex:none}
  .cv-pop{left:0;right:0;top:0;width:auto}
  .cv-stage{touch-action:none}
}`;
  }
  function buildCanvases2() { if (!$('cvCss2')) { const st = document.createElement('style'); st.id = 'cvCss2'; st.textContent = CSS2(); document.head.appendChild(st); } }
  const ib = (attr, name, title, cls) => `<button type="button" class="cv-ib${cls ? ' ' + cls : ''}" ${attr} title="${esc(title)}" aria-label="${esc(title)}">${ico(name)}</button>`;

  function render() {
    const root = $('canvasBox'); if (!root) return;
    buildCanvases(); buildCanvases2();
    const scr = $('screen-canvas'); if (scr) { scr.dataset.cvt = theme; scr.classList.toggle('cv-light', !!light); }
    const seg = `<div class="cv-seg"><button type="button" class="${tab === 'draw' ? 'on' : ''}" data-tab="draw" title="بوم" aria-label="بوم">${ico('canvas', 18)}</button><button type="button" class="${tab === 'gal' ? 'on' : ''}" data-tab="gal" title="گالری" aria-label="گالری">${ico('gal', 18)}</button><button type="button" class="${tab === 'gs' ? 'on' : ''}" data-tab="gs" title="تاریخچهٔ حدس‌ها" aria-label="حدس‌ها">${ico('bulb', 18)}</button></div>` + ((guestNow() ? invited : true) ? `<div class="cv-seg"><button type="button" style="width:auto;padding:0 12px" class="${spc() === 'aisa' ? 'on' : ''}" data-sp="aisa">${guestNow() ? 'بوم من' : 'بوم آیسا 👧'}</button><button type="button" style="width:auto;padding:0 12px" class="${spc() === 'us' ? 'on' : ''}" data-sp="us">${guestNow() ? 'بوم ما' : 'بوم ما'}</button></div>` : '');
    if (tab === 'gs') { root.innerHTML = `<div class="cv-app"><div class="cv-top">${seg}</div><div id="cvGs"></div></div>`; bindTabs(); renderGuesses(); return; }
    if (tab === 'gal') { root.innerHTML = `<div class="cv-app"><div class="cv-top">${seg}</div><div id="cvGal"></div></div>`; bindTabs(); renderGallery(); return; }
    root.innerHTML = `<div class="cv-app">
      <div class="cv-top">${seg}<div class="cv-avs" id="cvHead"></div><span id="cvTopic" class="cv-top" style="margin:0;gap:6px"></span><span class="sp"></span><span class="cv-dot" id="cvSaveDot" title="ذخیرهٔ خودکار"></span><span id="cvAct" style="display:flex;gap:6px"></span></div>
      <div id="cvModeInfo"></div>
      <div class="cv-main">
        <div class="cv-rail" id="cvRail"></div>
        <div class="cv-wrap"><div class="cv-pop" id="cvPop"></div>
          <div class="cv-stage intro" id="cvStage"><div class="cv-zoom" id="cvZoom"><canvas id="cvBg" width="${W}" height="${H}"></canvas><canvas id="cvWork" class="draw" width="${W}" height="${H}"></canvas><canvas id="cvTpl" width="${W}" height="${H}"></canvas></div><div class="cv-zb"><button type="button" class="cv-ib" data-z="out" title="کوچیک‌تر">${ico('zout', 16)}</button><span id="cvZl">۱۰۰٪</span><button type="button" class="cv-ib" data-z="in" title="زوم">${ico('zin', 16)}</button><button type="button" class="cv-ib" data-z="fit" title="اندازهٔ اصلی">${ico('fit', 16)}</button></div></div>
        </div>
      </div>
      ${liveMissing ? '<div class="cv-empty">برای ذخیرهٔ خودکار روی هر دو دستگاه، SQL شمارهٔ ۲۴ رو یک بار اجرا کن؛ فعلاً روی همین دستگاه ذخیره می‌شه.</div>' : ''}</div>`;
    bindTabs();
    stage = $('cvStage'); bgc = $('cvBg'); bgctx = bgc.getContext('2d'); work = $('cvWork'); wctx = work.getContext('2d');
    zoomEl = $('cvZoom'); tplc = $('cvTpl'); ptrs.clear(); pinch = null; panDrag = null; pinchLock = false;
    cursors = {}; paintBg(bgctx, meta.bg); paintTpl(); wireStage();
    setTimeout(() => stage && stage.classList.remove('intro'), 1100);
    renderHeader(); renderTopic(); renderMode(); renderRail(); renderAct(); renderPop(); dirty = true; startFrame();
  }
  function bindTabs() { document.querySelectorAll('#canvasBox [data-sp]').forEach(b => b.onclick = () => switchSpace(b.dataset.sp)); document.querySelectorAll('#canvasBox [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; pop = null; render(); if (tab === 'gal') loadGallery(); if (tab === 'gs') loadGH(); }); }
  function avHtml(name, av, on) { const ini = esc((name || '؟').trim().charAt(0)); return `<div class="cv-av${on ? ' on' : ''}" title="${esc(name || '')}">${av ? `<img src="${esc(av)}" alt="">` : ini}<i></i></div>`; }
  function renderHeader() {
    const el = $('cvHead'); if (!el) return;
    const me = (typeof userProfile !== 'undefined' && userProfile.avatar) || thumb || '';
    const pn = partnerName(), pk = Object.keys(peers).find(k => same(peers[k].name, pn)), last = jget(lsk(myThumbKey), null);
    const others = Object.keys(peers).filter(k => !same(peers[k].name, nm())).map(k => avHtml(peers[k].name, peers[k].av, true)).join('');
    el.innerHTML = (others || avHtml(last ? last.name : 'اون یکی', last ? last.av : '', false)) + avHtml(nm(), me, true);
  }
  function renderTopic() {
    const el = $('cvTopic'); if (!el) return;
    const day = Math.floor((Date.now() + 12600000) / 86400000), daily = TOPICS[day % TOPICS.length];
    el.innerHTML = (meta.topic ? `<span class="cv-chip">${ico('bulb', 14)}<b>${esc(meta.topic)}</b></span>` : '') + `<button type="button" class="cv-ib sm" data-tp="rnd" title="موضوع تصادفی">${ico('dice', 16)}</button><button type="button" class="cv-ib sm" data-tp="daily" title="موضوع امروز: ${esc(daily)}">${ico('cal', 16)}</button><button type="button" class="cv-ib sm" data-tp="title" title="اسم بامزه">${ico('wand', 16)}</button>${meta.topic ? `<button type="button" class="cv-ib sm" data-tp="off" title="حذف موضوع">${ico('x', 14)}</button>` : ''}`;
    el.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => {
      const a = b.dataset.tp;
      if (a === 'rnd') setMeta({ topic: rnd(TOPICS) }); else if (a === 'daily') setMeta({ topic: daily }); else if (a === 'off') setMeta({ topic: '' });
      else if (a === 'title') toast2('💡 ' + titleIdea());
      renderTopic();
    });
  }
  const renderModes = () => refreshPop();
  function renderRail() {
    const el = $('cvRail'); if (!el) return;
    const T = [['pen', 'قلم'], ['brush', 'قلم‌مو'], ['hl', 'هایلایتر'], ['eraser', 'پاک‌کن'], ['fill', 'سطل رنگ'], ['sticker', 'استیکر'], ['text', 'متن'], ['pan', 'جابجایی (دست)']];
    const dotSize = Math.max(4, Math.min(18, size / 3 + 4));
    if (stage) stage.dataset.tool = sigMode ? 'sig' : tool;
    el.innerHTML = T.map(t => ib(`data-t="${t[0]}"`, t[0], t[1], tool === t[0] && !sigMode ? 'on' : '')).join('') + ib('data-t="sig"', 'sig', 'امضا', sigMode ? 'on' : '')
      + '<div class="div"></div>' + ib('data-t="undo"', 'undo', 'برگرد') + ib('data-t="redo" id="cvRedo"', 'redo', 'جلو') + ib('data-t="clear"', 'clear', 'پاک کردن بوم')
      + '<div class="div"></div>'
      + `<button type="button" class="cv-ib${pop === 'color' ? ' on' : ''}" data-pop="color" title="رنگ"><span class="cv-sw1" style="background:${esc(color)}"></span></button>`
      + `<button type="button" class="cv-ib${pop === 'size' ? ' on' : ''}" data-pop="size" title="ضخامت و شفافیت"><span style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:currentColor;opacity:${.35 + alpha * .65};display:block"></span></button>`
      + '<div class="div"></div>' + ib('data-pop="tpl"', 'tpl', 'طرح آماده برای رنگ‌آمیزی', pop === 'tpl' || meta.tpl ? 'on' : '') + ib('data-pop="mode"', 'mode', 'حالت‌های بازی', pop === 'mode' || secret ? 'on' : '') + ib('data-pop="bg"', 'bg', 'پس‌زمینه', pop === 'bg' ? 'on' : '') + ib('data-pop="set"', 'set', 'تنظیمات', pop === 'set' ? 'on' : '');
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const t = b.dataset.t;
      if (t === 'undo') undo(); else if (t === 'redo') redoOp(); else if (t === 'clear') clearAll();
      else if (t === 'sig') { const c0 = jget('diary_cv_sig', '') || nm(); const v = prompt('امضات چی باشه؟ (بعد روی بوم بزن تا جاش مشخص بشه)', c0); if (v !== null && v.trim()) { jset('diary_cv_sig', v.trim().slice(0, 30)); sigMode = true; pop = null; renderRail(); renderPop(); toast2('✍️ روی بوم بزن تا امضا بشینه'); } }
      else {
        const draws = ['pen', 'brush', 'hl', 'eraser'], was = tool === t && !sigMode;
        if (tool !== t) { toolSizes[tool] = size; if (toolSizes[t]) size = toolSizes[t]; }
        tool = t; sigMode = false;
        pop = t === 'sticker' ? 'stk' : draws.includes(t) ? (was && pop === 'size' ? null : 'size') : (pop === 'stk' || pop === 'size' ? null : pop);
        renderRail(); renderPop();
      }
    });
    el.querySelectorAll('[data-pop]').forEach(b => b.onclick = e => { e.stopPropagation(); pop = pop === b.dataset.pop ? null : b.dataset.pop; renderRail(); renderPop(); });
    redoUi();
  }
  const renderTools = renderRail;
  function popHtml(n) {
    if (n === 'color') return `<h6>رنگ</h6><div class="cv-grid2 cv-big">${COLORS.concat(bigColors().filter(c => COLORS.indexOf(c) < 0)).map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${color.toLowerCase() === c ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div>
      <div class="cv-prow"><input type="color" id="cvPick" value="${/^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d'}" title="رنگ دلخواه"><button type="button" class="cv-ib" data-pal="1" title="پالت هماهنگ با این رنگ">${ico('wand')}</button></div><div class="cv-grid2" id="cvSug"></div>`;
    if (n === 'size') { const PRE = tool === 'eraser' ? [8, 14, 24, 36, 50, 60] : [2, 4, 8, 14, 24, 40]; const pv = tool === 'eraser' ? '#999' : esc(color);
      return `<h6>اندازه</h6><div class="cv-sizes">${PRE.map(v => `<button type="button" data-sz="${v}" class="${size === v ? 'on' : ''}" title="${fa(v)}"><i style="width:${Math.max(3, Math.min(30, v * (tool === 'hl' ? 1.6 : tool === 'eraser' ? 0.7 : 1)))}px;height:${Math.max(3, Math.min(30, v * (tool === 'hl' ? 1.6 : tool === 'eraser' ? 0.7 : 1)))}px;background:${pv}"></i></button>`).join('')}</div>
      <div class="cv-prow"><div class="cv-pv"><i id="cvPvDot" style="width:${Math.min(40, size)}px;height:${Math.min(40, size)}px;background:${pv};opacity:${tool === 'eraser' ? 1 : alpha}"></i></div><input type="range" id="cvSize" min="1" max="60" value="${size}"></div>
      ${tool === 'eraser' ? '' : `<h6>شفافیت</h6><div class="cv-prow"><input type="range" id="cvAlpha" min="5" max="100" value="${Math.round(alpha * 100)}"></div>`}`; }
    if (n === 'stk') return `<h6>استیکر</h6><div class="cv-cats">${STK.map((c, i) => `<button type="button" data-sc="${i}" title="${esc(c.n)}" class="${i === stkCat ? 'on' : ''}">${c.ic}</button>`).join('')}</div><div class="cv-grid2 em scr">${STK[stkCat].l.map(s => `<button type="button" data-s="${s}" class="${s === stickerPick ? 'on' : ''}">${s}</button>`).join('')}</div>`;
    if (n === 'tpl') return `<h6>طرح آماده · رنگ‌آمیزی</h6><div class="cv-chips" style="margin:0 0 8px"><button type="button" data-th2="solo" class="${tplHow === 'solo' ? 'on' : ''}">با هم رنگ کنیم</button><button type="button" data-th2="half" class="${tplHow === 'half' ? 'on' : ''}">دو نیمه (هرکی یه طرف)</button></div><div class="cv-chips" style="margin:0 0 8px"><button type="button" data-tl="faint" class="${tplLine === 'faint' ? 'on' : ''}">✏️ خط محو (خودمون پررنگ کنیم)</button><button type="button" data-tl="bold" class="${tplLine === 'bold' ? 'on' : ''}">خط پررنگ</button></div><div class="cv-tpls">${TPLS.map(t => `<button type="button" data-tp2="${t.id}" class="${meta.tpl === t.id ? 'on' : ''}" title="${esc(t.n)}"><img alt="" src="${tplThumb(t.id)}"><small>${esc(t.n)}</small></button>`).join('')}</div>${meta.tpl ? `<div class="cv-chips"><button type="button" data-tp2="">برداشتن طرح</button></div>` : ''}<h6 style="margin-top:8px">با سطل رنگ 🪣 داخل خط‌ها رو پر کن</h6>`;
    if (n === 'bg') return `<h6>پس‌زمینه</h6><div class="cv-grid2 sq">${Object.keys(BGS).map(k => `<button type="button" data-bg="${k}" title="${BGS[k]}" style="background:${BG_CSS[k]}" class="${meta.bg === k ? 'on' : ''}"></button>`).join('')}</div>`;
    if (n === 'mode') return `<h6>حالت بازی</h6><div class="cv-mg">${MODES.map(m => `<button type="button" data-md="${m[0]}" title="${m[2]}" aria-label="${m[2]}" class="${(m[0] === 'secret' ? secret : (!secret && meta.mode === m[0])) ? 'on' : ''}">${ico(m[1], 22)}</button>`).join('')}</div>
      <div class="cv-chips">${[1, 2, 3, 5].map(m => `<button type="button" data-tm="${m}" title="${m} دقیقه" class="${timedMin === m ? 'on' : ''}">${fa(m)}</button>`).join('')}</div>
      <h6 style="margin-top:8px">سطح بازی حدس زدن</h6><div class="cv-chips">${['easy', 'med', 'hard'].map(l => `<button type="button" data-lv="${l}" class="${meta.level === l ? 'on' : ''}">${LVL[l]}</button>`).join('')}</div>`;
    if (n === 'set') return `<h6>ظاهر</h6><div class="cv-prow" style="justify-content:space-between">${['dream', 'sunset', 'mint'].map(t => `<button type="button" class="cv-ib${theme === t ? ' on' : ''}" data-th="${t}" title="تم" style="background:${t === 'dream' ? 'linear-gradient(135deg,#d4a5ff,#ff8fb8)' : t === 'sunset' ? 'linear-gradient(135deg,#ffb07a,#ff6f91)' : 'linear-gradient(135deg,#7fe0c4,#6fb7ff)'}"></button>`).join('')}
      <button type="button" class="cv-ib" data-set="light" title="روشن / تاریک">${ico(light ? 'moon' : 'sun')}</button><button type="button" class="cv-ib" data-set="music" title="موسیقی">${ico('music')}</button></div>
      ${guestNow() ? '' : `<h6>آیسا 👧</h6><div class="cv-chips"><button type="button" data-shr="1" class="${shareOn() ? 'on' : ''}">${shareOn() ? '✅ نقاشی‌های ذخیره‌شده‌ی ما برای آیسا هم ذخیره بشن' : '🖼️ نقاشی‌های ذخیره‌شده برای آیسا هم ذخیره بشن'}</button></div><div class="cv-chips"><button type="button" data-inv="1" class="${invited ? 'on' : ''}">${invited ? '✅ آیسا توی بوم ماست (برای بیرون کردن بزن)' : '➕ آیسا رو به بوم ما اضافه کن'}</button></div>`}
      <h6>فیلتر خروجی</h6><div class="cv-chips">${[['', '○'], ['cartoon', '◐'], ['sketch', '✎'], ['soft', '✿']].map(f => `<button type="button" data-f="${f[0]}" title="${{ '': 'بدون فیلتر', cartoon: 'کارتونی', sketch: 'مدادی', soft: 'نرم و رویایی' }[f[0]]}" class="${filterSel === f[0] ? 'on' : ''}">${f[1]}</button>`).join('')}</div>`;
    return '';
  }
  function renderPop() {
    const el = $('cvPop'); if (!el) return;
    if (!pop) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = popHtml(pop);
    el.onclick = e => e.stopPropagation();
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; if (window.matchMedia && matchMedia('(max-width:760px)').matches) { pop = null; render(); } else { renderRail(); renderPop(); } });
    const pk = $('cvPick'); if (pk) pk.oninput = e => { color = e.target.value; const d = $('cvPvDot'); if (d) d.style.background = color; renderRail(); };
    el.querySelectorAll('[data-pal]').forEach(b => b.onclick = suggestPalette);
    el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { size = +b.dataset.sz; toolSizes[tool] = size; renderPop(); renderRailDot(); });
    const sz = $('cvSize'); if (sz) sz.oninput = e => { size = +e.target.value; toolSizes[tool] = size; el.querySelectorAll('[data-sz]').forEach(b => b.classList.toggle('on', +b.dataset.sz === size)); const d = $('cvPvDot'); if (d) { d.style.width = d.style.height = Math.min(40, size) + 'px'; } renderRailDot(); };
    const al = $('cvAlpha'); if (al) al.oninput = e => { alpha = +e.target.value / 100; const d = $('cvPvDot'); if (d) d.style.opacity = alpha; renderRailDot(); };
    el.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { stkCat = +b.dataset.sc; renderPop(); });
    el.querySelectorAll('[data-th2]').forEach(b => b.onclick = () => { tplHow = b.dataset.th2; renderPop(); });
    el.querySelectorAll('[data-tl]').forEach(b => b.onclick = () => { tplLine = b.dataset.tl; try { localStorage.setItem('cv_tplline', tplLine); } catch (e) {} paintTpl(); renderPop(); });
    el.querySelectorAll('[data-tp2]').forEach(b => b.onclick = () => { useTpl(b.dataset.tp2); });
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { setMeta({ level: b.dataset.lv }); if (meta.mode === 'guess' && same(meta.drawer, nm())) newWord(); renderPop(); });
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { stickerPick = b.dataset.s; pop = null; renderPop(); renderRail(); });
    el.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setMeta({ bg: b.dataset.bg }));
    el.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { const m = b.dataset.md; if (m === 'secret') toggleSecret(); else modeSet(m); pop = null; renderRail(); renderPop(); });
    el.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { timedMin = +b.dataset.tm; modeSet('timed'); pop = null; renderRail(); renderPop(); });
    el.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { theme = b.dataset.th; jset('diary_cv_theme', theme); $('screen-canvas').dataset.cvt = theme; renderPop(); });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { if (b.dataset.set === 'light') { light = !light; jset('diary_cv_light', light); $('screen-canvas').classList.toggle('cv-light', light); renderPop(); } else { const m = $('mpPlay'); if (m) m.click(); } });
    el.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => setInvite(!invited));
    el.querySelectorAll('[data-shr]').forEach(b => b.onclick = () => { try { localStorage.setItem('cv_share_aisa', shareOn() ? '0' : '1'); } catch (e) {} toast2(shareOn() ? '👧 از این به بعد هر نقاشی‌ای ذخیره کنیم، برای آیسا هم ذخیره می‌شه' : '👧 ذخیرهٔ خودکار برای آیسا خاموش شد'); renderPop(); });
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filterSel = b.dataset.f; renderPop(); });
  }
  const refreshPop = () => { if (pop === 'mode' || pop === 'bg') renderPop(); };
  const thumbs = {};
  function tplThumb(id) { if (thumbs[id]) return thumbs[id]; const t = tplData(id); if (!t) return ''; const c = document.createElement('canvas'); c.width = 150; c.height = 105; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 150, 105); x.drawImage(t.canvas, 0, 0, 150, 105); return thumbs[id] = c.toDataURL('image/png'); }
  function useTpl(id) {
    if (secret) { toast2('اول از حالت مخفی بیا بیرون'); return; }
    if (!id) { setMeta({ tpl: '' }); pop = null; renderPop(); renderRail(); return; }
    if (strokes.length && !confirm('بوم فعلی پاک بشه و طرح تازه باز بشه؟ (اگه می‌خوای نگهش داری اول ذخیره‌اش کن)')) return;
    strokes = []; redo = []; editId = null; rebuild(); send({ t: 'clear' });
    const patch = { tpl: id, turn: '', drawer: '', timerEnd: 0, bg: ['grid', 'dots', 'lines'].includes(meta.bg) ? 'white' : meta.bg };
    if (tplHow === 'half') { Object.assign(patch, { mode: 'half', half: { L: nm(), R: partnerName() || '' } }); tool = 'fill'; toast2('↔️ هرکی یه نیمه رو رنگ می‌کنه؛ تو نیمهٔ چپ'); } else { Object.assign(patch, { mode: 'free', half: null }); tool = 'fill'; toast2('🖍️ با سطل رنگ یا قلم رنگش کنید'); }
    setMeta(patch); pop = null; renderPop(); renderRail();
  }
  const wordBoxes = () => { const n = meta.wlen || 0, a = []; for (let i = 0; i < n; i++) a.push(i === 0 && meta.hint ? meta.hint : '&nbsp;'); return a.map(x => `<span>${x}</span>`).join(''); };
  function renderRailDot() { const b = document.querySelector('#cvRail [data-pop=size] span'); if (b) { const d = Math.max(4, Math.min(18, size / 3 + 4)); b.style.width = b.style.height = d + 'px'; b.style.opacity = .35 + alpha * .65; } }
  document.addEventListener('click', e => { if (!pop) return; const path = e.composedPath ? e.composedPath() : []; if (path.some(n => n && (n.id === 'cvRail' || n.id === 'cvPop'))) return; pop = null; renderPop(); renderRail(); });
  function renderAct() {
    const el = $('cvAct'); if (!el) return;
    el.innerHTML = secret ? ib('data-x="save"', 'save', 'ذخیره و ارسال مخفی', 'pri') + ib('data-x="exit"', 'x', 'خروج از حالت مخفی')
      : ib('data-x="save"', 'save', 'ذخیره در گالری') + ib('data-x="finish"', 'flag', 'تموم شد!', 'pri') + ib('data-x="dl"', 'dl', 'دانلود PNG') + ib('data-x="pdf"', 'pdf', 'ذخیره به‌صورت PDF') + ib('data-x="new"', 'plus', 'بوم تازه');
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const a = b.dataset.x; if (a === 'save') saveToGallery(); else if (a === 'finish') saveToGallery({ finish: true }); else if (a === 'dl') download(); else if (a === 'pdf') downloadPdf(); else if (a === 'exit') toggleSecret(); else if (a === 'new') { if (confirm('بوم تازه شروع بشه؟ (نقاشی فعلی پاک می‌شه؛ اگه می‌خوای نگهش داری اول ذخیره کن)')) { editId = null; strokes = []; redo = []; rebuild(); send({ t: 'clear' }); setMeta({ mode: 'free', turn: '', half: null, drawer: '', timerEnd: 0, topic: '', tpl: '' }); } } });
  }
  const renderBgs = refreshPop, renderSw = () => { renderRail(); };
  function suggestPalette() {
    const base0 = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ff4d6d', [h, s] = hexToHsl(base0), S = Math.max(45, s), P = [hsl(h, S, 35), hsl(h, S, 55), hsl(h, S, 78), hsl((h + 30) % 360, S, 60), hsl((h + 180) % 360, S, 58), hsl((h + 210) % 360, S, 70)];
    const d = $('cvSug'); if (!d) return; d.innerHTML = P.map(c => `<button type="button" data-s2="${c}" style="background:${c}"></button>`).join('');
    d.querySelectorAll('[data-s2]').forEach(b => b.onclick = () => { color = b.dataset.s2; renderRail(); renderPop(); });
  }
  const redoUi = () => { const b = $('cvRedo'); if (b) b.style.opacity = redo.length ? 1 : .35; };

  function toggleSecret() {
    secret = !secret; redo = []; rebuild(); renderMode(); renderRail(); renderAct();
    toast2(secret ? '🔒 حالت مخفی: هیچ‌چیز برای اون یکی فرستاده نمی‌شه' : 'برگشتیم به بوم مشترک');
  }
  function renderMode() {
    refreshPop(); const el = $('cvModeInfo'); if (!el) return; let h = '';
    if (secret) h = '<div class="cv-banner">🔒 <b>نقاشی مخفی</b> — فقط تو می‌بینی. وقتی تموم شد «ذخیره و ارسال مخفی» رو بزن و بگو چند ساعت دیگه برای اون یکی نمایش داده بشه.</div>';
    else if (meta.tpl && !secret && meta.mode !== 'guess') h = `<div class="cv-banner">🖍️ رنگ‌آمیزی «${esc((TPLS.find(t => t.id === meta.tpl) || {}).n || '')}» ${meta.mode === 'half' ? '(نیمه‌نیمه)' : '(با هم)'} <button type="button" class="cv-ib sm" data-a="notpl" title="برداشتن طرح">${ico('x', 14)}</button></div>`;
    if (secret) {}
    else if (meta.mode === 'turn') h += `<div class="cv-banner">🔄 <b>کاملش کن</b> — نوبت: <b>${esc(meta.turn || '—')}</b>${same(meta.turn, nm()) ? ' <button type="button" class="cv-ib" data-a="pass" title="نوبتم تموم شد">✅</button>' : ''}</div>`;
    else if (meta.mode === 'half') h = `<div class="cv-banner">↔️ <b>نیمه‌نیمه</b> — چپ: <b>${esc(meta.half && meta.half.L || '—')}</b> · راست: <b>${esc(meta.half && meta.half.R || 'منتظر نفر دوم')}</b></div>`;
    else if (meta.mode === 'guess') {
      const dr = same(meta.drawer, nm());
      h = `<div class="cv-banner">🤔 <b>حدس بزن</b> · ${LVL[meta.level] || ''} · ⏳ <span class="cv-timer" id="cvGT">…</span> — نقاش: <b>${esc(meta.drawer)}</b>${dr ? `<br>🤫 چیزی که باید بکشی: <b>${esc(String(guessWord).split('|')[0])}</b> <button type="button" class="cv-ib" data-a="newword" title="کلمهٔ دیگه">🎲</button><button type="button" class="cv-ib" data-a="hint" title="حرف اول رو به راهنما اضافه کن">💡</button>` : '<div class="cv-wd" dir="rtl">' + wordBoxes() + '</div><div class="cv-gg"><input id="cvGuessIn" placeholder="چی کشیده؟ حدس بزن…"><button type="button" class="cv-ib" data-a="guess" title="ارسال حدس">➤</button></div>'}</div><div class="cv-feed">${guessFeed.map(g => `<div class="${g.ok ? 'ok' : ''}">${esc(g.name)}: ${esc(g.text)} ${g.ok ? '✅' : ''}</div>`).join('')}</div>`;
    }
    else if (meta.mode === 'timed' && meta.timerEnd) h = '<div class="cv-banner">⏱️ <b>زمان‌دار</b> — <span class="cv-timer" id="cvTimer">…</span></div>';
    if (editId && !secret) { const eg = gallery.find(x => x.id === editId); h = '<div class="cv-banner">✏️ در حال ویرایش «' + esc(eg ? eg.title : '') + '» <button type="button" class="cv-ib sm" data-a="noedit" title="لغو ویرایش">' + ico('x', 14) + '</button></div>' + h; }
    el.innerHTML = h;
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'pass') passTurn(); else if (a === 'guess') myGuess(); else if (a === 'newword') finishRound('s'); else if (a === 'hint') { if (!meta.hint) setMeta({ hint: firstLetter() }); } else if (a === 'notpl') setMeta({ tpl: '' }); else if (a === 'noedit') { editId = null; renderMode(); } });
    const gi = $('cvGuessIn'); if (gi) gi.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); myGuess(); } };
    tickTimer(); tickGuess();
  }
  let gI = null, gEnded = '';
  function tickGuess() {
    clearInterval(gI); gI = null; if (!(meta.mode === 'guess' && meta.gEnd)) return;
    const upd = () => {
      const left = meta.gEnd - Date.now(), e = $('cvGT');
      if (left <= 0) { if (e) e.textContent = '⏰ ۰۰:۰۰'; if (same(meta.drawer, nm()) && guessWord && gEnded !== meta.rid) { gEnded = meta.rid; clearInterval(gI); gI = null; finishRound('t'); } return; }
      if (e) { const s = Math.ceil(left / 1000); e.textContent = fa(String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')); if (left < 15000) e.style.color = '#ff6b81'; }
    };
    upd(); gI = setInterval(upd, 500);
  }
  function tickTimer() {
    clearInterval(timerI); timerI = null; if (!(meta.mode === 'timed' && meta.timerEnd)) return;
    const upd = () => {
      const left = meta.timerEnd - Date.now(), e = $('cvTimer');
      if (left <= 0) { clearInterval(timerI); timerI = null; if (e) e.textContent = '⏰ تموم شد!'; if (timerDone !== meta.timerEnd) { timerDone = meta.timerEnd; toast2('⏰ وقت تموم شد!'); saveToGallery({ id: idp() + 'cv_t' + meta.timerEnd, title: titleIdea(), finish: true }); } return; }
      if (e) { const s = Math.ceil(left / 1000); e.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    };
    upd(); timerI = setInterval(upd, 500);
  }
    function undo() {
    const arr = cur(); for (let i = arr.length - 1; i >= 0; i--) { if (same(arr[i].by, nm())) { const [s] = arr.splice(i, 1); redo.push(s); rebuild(); send({ t: 'undo', id: s.id }); changed(); return; } }
    toast2('چیزی برای برگردوندن نیست');
  }
  function redoOp() { const s = redo.pop(); if (!s) return; s.ts = Date.now(); cur().push(s); drawStroke(bctx, s); dirty = true; send({ t: 'add', s }); scheduleSaveIfShared(); redoUi(); }
  const scheduleSaveIfShared = () => { if (!secret) scheduleSave(); };
  function clearAll() { if (!confirm('کل بوم پاک بشه؟' + (secret ? '' : ' (برای هر دو)'))) return; if (secret) secretStrokes = []; else { strokes = []; send({ t: 'clear' }); } redo = []; rebuild(); changed(); }
  function hexToHsl(h) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0, l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s * 100, l * 100]; }
  const hsl = (h, s, l) => '#' + [0, 8, 4].map(n => { const a = s / 100 * Math.min(l / 100, 1 - l / 100), k = (n + h / 30) % 12, c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); }).join('');
  /* ---------- راه‌اندازی ---------- */
  function joinInv() {
    if (ich || typeof dbClient === 'undefined' || !dbClient || !dbClient.channel) return;
    try {
      ich = dbClient.channel('canvas-invite', { config: { broadcast: { self: false } } });
      ich.on('broadcast', { event: 'inv' }, m => {
        const on = !!(m && m.payload && m.payload.on); invited = on;
        if (guestNow()) { if (!on && spc() === 'us') { switchSpace('aisa'); toast2('👋 دعوت به بوم ما تموم شد؛ برگشتی به بوم خودت'); } else if (on) toast2('💌 تو رو به بوم ما دعوت کردن! بالا می‌تونی بین «بوم من» و «بوم ما» جابه‌جا بشی'); render(); }
        else renderPop();
      }).subscribe();
    } catch (e) { ich = null; }
  }
  async function loadInvite() {
    try { const r = await dbClient.from('canvas_live').select('*').eq('id', 'invite').maybeSingle(); if (r && r.data) { const on = !!(JSON.parse(r.data.meta || '{}').on); if (on !== invited) { invited = on; if (built) { render(); } } } } catch (e) {}
  }
  function setInvite(on) {
    invited = !!on; try { if (ich) ich.send({ type: 'broadcast', event: 'inv', payload: { on: invited } }); } catch (e) {}
    try { dbClient.from('canvas_live').upsert({ id: 'invite', strokes: '', meta: JSON.stringify({ on: invited }), updated_at: Date.now() }).then(() => {}, () => {}); } catch (e) {}
    toast2(invited ? '👧 آیسا دعوت شد؛ می‌تونه بیاد توی بوم ما' : '👧 آیسا از بوم ما بیرون رفت'); renderPop();
  }
  function switchSpace(s) {
    if (s === spc() || (guestNow() && s === 'us' && !invited)) return;
    try { if (ch) { try { ch.unsubscribe(); } catch (e) {} try { dbClient.removeChannel(ch); } catch (e) {} } } catch (e) {}
    clearTimeout(saveT); space = s; ch = null; subscribed = false; peers = {}; remote = {}; mine = null; strokes = []; secretStrokes = []; secret = false; redo = []; meta = META0(); gallery = []; galleryLoaded = false; editId = null; tab = 'draw'; pop = null; guessWord = ''; guessFeed = [];
    ghSpace = spc(); gh = jget(lsk('diary_cv_guesses'), []);
    if (bctx) rebuild(); join(); render(); loadLive(); loadGallery();
    toast2(s === 'aisa' ? (guestNow() ? '🎨 بوم خودت' : '👧 بوم آیسا؛ اینجا هر چی بکشی خودش هم می‌بینه') : '👥 بوم ما');
  }
  function load() {
    if (ghSpace !== spc()) { ghSpace = spc(); gh = jget(lsk('diary_cv_guesses'), []); }
    joinInv(); loadInvite();
    join();
    if (!$('canvasBox')) return;
    if (!$('cvCss')) buildCanvases();
    render(); if (tab === 'gal') loadGallery(); if (tab === 'gs') loadGH();
    loadLive(); if (!galleryLoaded) loadGallery();
    if (subscribed) track();
  }
  function init() {
    if (inited) return; inited = true;
    document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = String(e.key || '').toLowerCase(); if (k !== 'z' && k !== 'y') return;
      const a = document.activeElement, tg = a && a.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (a && a.isContentEditable)) return;
      const box = $('canvasBox'); if (!box || !box.offsetParent || !$('cvWork') || document.querySelector('.cv-modal')) return;
      if (typeof guessWord !== 'undefined' && false) return;
      e.preventDefault();
      if (k === 'y' || (k === 'z' && e.shiftKey)) redoOp(); else undo();
    });
    const g = $('canvasBox'); if (g) g.addEventListener('click', e => {
      const f = e.target.closest('[data-fav]'); if (f) return toggleFav(f.dataset.fav);
      const o = e.target.closest('[data-open]'); if (o) return openArt(o.dataset.open);
      const ed = e.target.closest('[data-edit]'); if (ed) return editArt(ed.dataset.edit);
      const d = e.target.closest('[data-dl]'); if (d) return dlArt(d.dataset.dl);
      const pf = e.target.closest('[data-pdf]'); if (pf) return pdfArt(pf.dataset.pdf);
      const ash = e.target.closest('[data-aish]'); if (ash) return shareArt(ash.dataset.aish);
      const x = e.target.closest('[data-del]'); if (x) return delArt(x.dataset.del);
    });
  }
  window.Canvas2 = { _space: () => spc(), _invited: () => invited, _gEnd: ms => setMeta({ gEnd: Date.now() + ms }), _gh: () => gh, load, init, saveToGallery, _state: () => ({ strokes, secretStrokes, meta, tool, peers, secret, gallery, remote: Object.keys(remote), liveMissing }), _id: ID, W, H };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
