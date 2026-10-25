-- Forma stores one JSON document per authenticated user.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

revoke all on table public.user_data from anon, authenticated;
grant select, insert, update on table public.user_data to authenticated;

drop policy if exists "Users can read only their Forma data" on public.user_data;
create policy "Users can read only their Forma data"
  on public.user_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create only their Forma data" on public.user_data;
create policy "Users can create only their Forma data"
  on public.user_data
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update only their Forma data" on public.user_data;
create policy "Users can update only their Forma data"
  on public.user_data
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists user_data_updated_at_idx on public.user_data (updated_at desc);