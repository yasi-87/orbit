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
