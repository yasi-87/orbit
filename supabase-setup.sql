-- ============================================================
-- یک بار این فایل رو توی Supabase اجرا کن:
-- Supabase Dashboard  ←  SQL Editor  ←  New query  ←  Paste  ←  Run
-- (چند بار اجرا کردنش مشکلی درست نمی‌کنه)
-- ============================================================

-- 1) کاور آهنگ‌ها
alter table public.songs add column if not exists cover_url text;

-- 2) رویدادهای تقویم (تاریخ به‌صورت میلادی YYYY-MM-DD ذخیره می‌شه و توی سایت شمسی نشون داده می‌شه)
create table if not exists public.events (
  id          text primary key,
  title       text not null,
  note        text,
  emoji       text,
  event_date  text not null,
  author      text,
  created_at  bigint not null
);
create index if not exists events_event_date_idx on public.events (event_date);

-- 3) اعلان‌ها
create table if not exists public.notifications (
  id          text primary key,
  type        text not null,      -- chapter | song | note | event
  title       text,
  author      text,
  ref_id      text,
  created_at  bigint not null
);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- 4) دسترسی (همون سبک بقیهٔ جدول‌های سایت: بدون لاگین، با کلید عمومی)
alter table public.events enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "events_public_all" on public.events;
create policy "events_public_all" on public.events
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "notifications_public_all" on public.notifications;
create policy "notifications_public_all" on public.notifications
  for all to anon, authenticated using (true) with check (true);

-- 5) اعلان لحظه‌ای (Realtime) برای جدول notifications
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- نسخهٔ جدید: یادآوری‌های تکرارشونده + اعلان پس‌زمینه + گالری
-- (می‌شه چندبار اجراش کرد؛ مشکلی پیش نمیاد)
-- ============================================================

-- 6) رویدادهای تکرارشونده
alter table public.events add column if not exists repeat       text    default 'none';  -- none|hours|daily|weekly|monthly|yearly
alter table public.events add column if not exists repeat_every int     default 1;
alter table public.events add column if not exists remind       boolean default false;
alter table public.events add column if not exists remind_time  text    default '09:00';
alter table public.events add column if not exists audience     text    default 'both';  -- both|me
alter table public.events add column if not exists until_date   text;
alter table public.events add column if not exists last_fired   bigint;
alter table public.events add column if not exists start_at     bigint;

-- 7) اعلان‌ها: مخاطب مشخص + وضعیت ارسال push
alter table public.notifications add column if not exists target text;
alter table public.notifications add column if not exists pushed boolean default false;
update public.notifications set pushed = true where pushed is null;

-- 8) دستگاه‌هایی که اعلان پس‌زمینه رو فعال کردن
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  name       text,
  updated_at bigint
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_public_all" on public.push_subscriptions;
create policy "push_subscriptions_public_all" on public.push_subscriptions
  for all to anon, authenticated using (true) with check (true);

-- 9) گالری عکس و ویدیو
create table if not exists public.gallery (
  id         text primary key,
  kind       text not null,        -- image | video
  url        text not null,
  file_path  text,
  author     text,
  created_at bigint not null
);
create index if not exists gallery_created_at_idx on public.gallery (created_at desc);
alter table public.gallery enable row level security;
drop policy if exists "gallery_public_all" on public.gallery;
create policy "gallery_public_all" on public.gallery
  for all to anon, authenticated using (true) with check (true);

-- 10) فایل‌ها (آپلود هر نوع فایل)
create table if not exists public.files (
  id         text primary key,
  name       text not null,
  url        text not null,
  file_path  text,
  size       bigint,
  mime       text,
  author     text,
  created_at bigint not null
);
create index if not exists files_created_at_idx on public.files (created_at desc);
alter table public.files enable row level security;
drop policy if exists "files_public_all" on public.files;
create policy "files_public_all" on public.files
  for all to anon, authenticated using (true) with check (true);

-- 11) سرگرمی: لینک گیم / فیلم / سریال
create table if not exists public.links (
  id         text primary key,
  category   text not null,        -- game | movie | series
  title      text not null,
  url        text not null,
  author     text,
  created_at bigint not null
);
create index if not exists links_category_idx on public.links (category, created_at);
alter table public.links enable row level security;
drop policy if exists "links_public_all" on public.links;
create policy "links_public_all" on public.links
  for all to anon, authenticated using (true) with check (true);

-- 12) سؤال روز (هر روز یه سؤال مشترک؛ هر نفر جداگانه جواب می‌ده)
create table if not exists public.daily_answers (
  id         text primary key,
  day        text not null,        -- مثلاً 2026-10-13
  q_idx      int,
  question   text,
  author     text,
  text       text not null,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists daily_answers_day_idx on public.daily_answers (day);
alter table public.daily_answers enable row level security;
drop policy if exists "daily_answers_public_all" on public.daily_answers;
create policy "daily_answers_public_all" on public.daily_answers
  for all to anon, authenticated using (true) with check (true);

-- 13) صورت‌های فلکی (آسمان شب)
create table if not exists public.constellations (
  id         text primary key,
  name       text not null,
  days       text not null,        -- روزهای انتخاب‌شده به ترتیب، جداشده با کاما؛ مثلاً 2026-10-13,2026-10-20
  author     text,
  created_at bigint not null
);
alter table public.constellations enable row level security;
drop policy if exists "constellations_public_all" on public.constellations;
create policy "constellations_public_all" on public.constellations
  for all to anon, authenticated using (true) with check (true);

-- 14) گربه‌ها (دیدن گربهٔ همدیگه توی پروفایل)
create table if not exists public.cats (
  id         text primary key,
  name       text,
  worn       text,          -- لباس‌ها و رنگ (JSON)
  mood       text,
  pets       int,
  items      int,
  streak     int,
  visits     int,
  avatar     text,
  updated_at bigint
);
alter table public.cats enable row level security;
drop policy if exists "cats_public_all" on public.cats;
create policy "cats_public_all" on public.cats
  for all to anon, authenticated using (true) with check (true);

-- 15) باغ خاطره‌ها: علاقه‌مندی‌ها
create table if not exists public.garden_favs (
  id         text primary key,
  key        text not null,        -- مثلاً chapter:ch_123 یا song:sg_9
  author     text,
  created_at bigint not null
);
create index if not exists garden_favs_key_idx on public.garden_favs (key);
alter table public.garden_favs enable row level security;
drop policy if exists "garden_favs_public_all" on public.garden_favs;
create policy "garden_favs_public_all" on public.garden_favs
  for all to anon, authenticated using (true) with check (true);
