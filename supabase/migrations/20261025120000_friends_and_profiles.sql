-- Forma public profiles and privacy-preserving friends system.
-- Run this migration in the Supabase SQL Editor after 20261025000000_user_data.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default 'Forma user',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 32)
);

create unique index if not exists profiles_username_lower_unique_idx on public.profiles (lower(username));
create index if not exists profiles_display_name_idx on public.profiles (display_name);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

drop policy if exists "Authenticated users can see public profiles" on public.profiles;
create policy "Authenticated users can see public profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> recipient_id),
  constraint friend_requests_unique_pair unique (sender_id, recipient_id)
);

create index if not exists friend_requests_recipient_idx
  on public.friend_requests (recipient_id, created_at desc);
create index if not exists friend_requests_sender_idx
  on public.friend_requests (sender_id, created_at desc);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (user_id <> friend_id),
  primary key (user_id, friend_id)
);

create index if not exists friendships_friend_id_idx on public.friendships (friend_id, user_id);

alter table public.friend_requests enable row level security;
revoke all on table public.friend_requests from anon, authenticated;
grant select, insert, delete on table public.friend_requests to authenticated;

drop policy if exists "Users can view their own friend requests" on public.friend_requests;
create policy "Users can view their own friend requests"
  on public.friend_requests for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists "Users can send friend requests as themselves" on public.friend_requests;
create policy "Users can send friend requests as themselves"
  on public.friend_requests for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and recipient_id <> (select auth.uid())
    and not exists (
      select 1 from public.friendships f
      where f.user_id = (select auth.uid()) and f.friend_id = recipient_id
    )
  );

drop policy if exists "Request participants can cancel or decline" on public.friend_requests;
create policy "Request participants can cancel or decline"
  on public.friend_requests for delete to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);


alter table public.friendships enable row level security;
revoke all on table public.friendships from anon, authenticated;
grant select on table public.friendships to authenticated;

drop policy if exists "Users can see their own friend list" on public.friendships;
create policy "Users can see their own friend list"
  on public.friendships for select to authenticated
  using ((select auth.uid()) = user_id);

-- Create an initial discoverable profile for new Email and Google signups.
create or replace function public.handle_new_forma_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_base text;
  v_username text;
  v_avatar text;
begin
  v_name := left(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    'Forma user'
  ), 32);
  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_username', ''), ''),
    '[^a-zA-Z0-9_]', '_', 'g'
  ));
  v_base := trim(both '_' from v_base);
  if length(v_base) < 3 then
    v_base := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  end if;
  v_username := left(v_base, 20);
  if exists (select 1 from public.profiles p where lower(p.username) = lower(v_username) and p.id <> new.id) then
    v_username := left(v_base, 11) || '_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  end if;
  if char_length(trim(v_name)) < 2 then v_name := 'Forma user'; end if;
  v_avatar := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '');
  if v_avatar !~ '^https://' then v_avatar := null; end if;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, v_username, v_name, v_avatar)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_forma_profile on auth.users;
create trigger on_auth_user_created_forma_profile
  after insert on auth.users
  for each row execute function public.handle_new_forma_profile();


-- Backfill profiles for users who registered before the friends feature existed.
-- Username collisions are resolved with a short, deterministic suffix from the auth user ID.
do $
declare
  u record;
  v_name text;
  v_base text;
  v_username text;
  v_avatar text;
begin
  for u in select id, email, raw_user_meta_data from auth.users loop
    if exists (select 1 from public.profiles p where p.id = u.id) then
      continue;
    end if;

    v_name := left(coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      'Forma user'
    ), 32);
    if char_length(trim(v_name)) < 2 then v_name := 'Forma user'; end if;

    v_base := lower(regexp_replace(
      coalesce(nullif(u.raw_user_meta_data ->> 'preferred_username', ''), ''),
      '[^a-zA-Z0-9_]', '_', 'g'
    ));
    v_base := trim(both '_' from v_base);
    if length(v_base) < 3 then
      v_base := 'user_' || substring(replace(u.id::text, '-', '') from 1 for 8);
    end if;
    v_username := left(v_base, 20);
    if exists (select 1 from public.profiles p where lower(p.username) = lower(v_username) and p.id <> u.id) then
      v_username := left(v_base, 11) || '_' || substring(replace(u.id::text, '-', '') from 1 for 8);
    end if;

    v_avatar := coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '');
    if v_avatar !~ '^https://' then v_avatar := null; end if;
    insert into public.profiles (id, username, display_name, avatar_url)
    values (u.id, v_username, v_name, v_avatar)
    on conflict (id) do nothing;
  end loop;
end;
$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sender uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select r.sender_id into v_sender
  from public.friend_requests r
  where r.id = p_request_id and r.recipient_id = v_uid
  for update;
  if v_sender is null then raise exception 'Friend request not found or not addressed to this user'; end if;

  insert into public.friendships (user_id, friend_id)
  values (v_uid, v_sender), (v_sender, v_uid)
  on conflict (user_id, friend_id) do nothing;

  delete from public.friend_requests r
  where (r.sender_id = v_uid and r.recipient_id = v_sender)
     or (r.sender_id = v_sender and r.recipient_id = v_uid);
end;
$$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_friend_id = v_uid then raise exception 'Cannot remove yourself'; end if;
  delete from public.friendships f
  where (f.user_id = v_uid and f.friend_id = p_friend_id)
     or (f.user_id = p_friend_id and f.friend_id = v_uid);
  delete from public.friend_requests r
  where (r.sender_id = v_uid and r.recipient_id = p_friend_id)
     or (r.sender_id = p_friend_id and r.recipient_id = v_uid);
end;
$$;

revoke all on function public.handle_new_forma_profile() from public, anon, authenticated;

-- This RPC exposes only aggregate progress for accepted friends.
-- Habit names, daily notes, journal entries, and email addresses are never returned.
create or replace function public.friend_progress(p_today date, p_week_start date)
returns table (
  friend_id uuid,
  username text,
  display_name text,
  avatar_url text,
  habit_count integer,
  done_today integer,
  progress_percent integer,
  weekly_percent integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_today is null or p_week_start is null or p_week_start <> p_today - 6
     or p_today < current_date - 1 or p_today > current_date + 1 then
    raise exception 'Invalid progress date range';
  end if;

  return query
  with friend_payload as (
    select
      f.friend_id,
      p.username,
      p.display_name,
      p.avatar_url,
      coalesce(ud.payload, '{}'::jsonb) as payload,
      ud.updated_at
    from public.friendships f
    join public.profiles p on p.id = f.friend_id
    left join public.user_data ud on ud.user_id = f.friend_id
    where f.user_id = auth.uid()
  ),
  counts as (
    select
      fp.friend_id,
      fp.username,
      fp.display_name,
      fp.avatar_url,
      fp.updated_at,
      (
        select count(*)::integer
        from jsonb_array_elements(
          case when jsonb_typeof(fp.payload -> 'habits') = 'array'
               then fp.payload -> 'habits' else '[]'::jsonb end
        ) as h(value)
      ) as habit_count,
      (
        select count(*)::integer
        from jsonb_array_elements(
          case when jsonb_typeof(fp.payload -> 'habits') = 'array'
               then fp.payload -> 'habits' else '[]'::jsonb end
        ) as h(value)
        where coalesce(fp.payload -> 'logs' -> to_char(p_today, 'YYYY-MM-DD') ->> (h.value ->> 'id'), 'false') = 'true'
      ) as done_today,
      (
        select count(*)::integer
        from generate_series(p_week_start, p_today, interval '1 day') as d(day)
        cross join lateral jsonb_array_elements(
          case when jsonb_typeof(fp.payload -> 'habits') = 'array'
               then fp.payload -> 'habits' else '[]'::jsonb end
        ) as h(value)
        where coalesce(fp.payload -> 'logs' -> to_char(d.day::date, 'YYYY-MM-DD') ->> (h.value ->> 'id'), 'false') = 'true'
      ) as weekly_done
    from friend_payload fp
  )
  select
    c.friend_id,
    c.username,
    c.display_name,
    c.avatar_url,
    c.habit_count,
    c.done_today,
    case when c.habit_count = 0 then 0 else round(c.done_today * 100.0 / c.habit_count)::integer end as progress_percent,
    case when c.habit_count = 0 then 0 else least(100, round(c.weekly_done * 100.0 / (c.habit_count * 7))::integer) end as weekly_percent,
    c.updated_at
  from counts c
  order by c.display_name asc, c.username asc;
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;
revoke all on function public.friend_progress(date, date) from public, anon;
grant execute on function public.friend_progress(date, date) to authenticated;
