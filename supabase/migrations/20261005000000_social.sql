-- GRATEAPEX Social: usernames, friend requests/friendships, notifications,
-- and a server-side cap on XP awards.
--
-- Security model: other learners' rows are NEVER readable directly. Public
-- profile fields (username, display name, avatar, rank XP, weekly XP,
-- streak) are only returned by the SECURITY DEFINER functions below, which
-- always use auth.uid() for identity. Clients cannot insert/update
-- friendships or notifications directly — only through these functions.

-- ── Profiles: username + updated_at ─────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format
      check (username is null or username ~ '^[a-z0-9_]{3,20}$');
  end if;
end;
$$;

create unique index if not exists profiles_username_unique on public.profiles (username);
create index if not exists profiles_display_name_lower_idx on public.profiles (lower(display_name));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.grateapex_set_updated_at();

-- Clients may edit only their name and avatar; username goes through
-- grateapex_set_username (validation + uniqueness).
revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

-- Faster RLS check (Supabase advisor: auth.uid() evaluated once).
drop policy if exists "Enable users to view their own data only" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- ── Friendships (one canonical row per pair) ────────────────────────
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;
grant select on table public.friendships to authenticated;

drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- ── Notifications ───────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted')),
  friendship_id uuid references public.friendships (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_once unique (user_id, type, friendship_id)
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists notifications_friendship_idx on public.notifications (friendship_id);

alter table public.notifications enable row level security;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── Functions ───────────────────────────────────────────────────────

-- Claim or change your username (3–20 chars: a–z, 0–9, _).
create or replace function public.grateapex_set_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_username, '')));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_name !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid_username'; end if;
  begin
    insert into public.profiles (id, username) values (v_user, v_name)
    on conflict (id) do update set username = excluded.username;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  return v_name;
end;
$$;

-- Find learners by username or name. Returns only public fields.
create or replace function public.grateapex_search_profiles(p_query text)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  relationship text, friendship_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_q text := lower(btrim(coalesce(p_query, '')));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(v_q) < 2 then return; end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.id, p.username, p.display_name, p.avatar_url,
      case
        when f.id is null then 'none'
        when f.status = 'accepted' then 'friends'
        when f.requester_id = v_user then 'outgoing'
        else 'incoming'
      end,
      f.id
    from public.profiles p
    left join public.friendships f
      on least(f.requester_id, f.addressee_id) = least(p.id, v_user)
     and greatest(f.requester_id, f.addressee_id) = greatest(p.id, v_user)
    where p.id <> v_user
      and (p.username like v_q || '%' or lower(p.display_name) like '%' || v_q || '%')
    order by (p.username = v_q) desc nulls last, p.username nulls last, p.display_name
    limit 20;
end;
$$;

-- Send a request. If they already asked you, this accepts theirs.
create or replace function public.grateapex_send_friend_request(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_existing public.friendships%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_user_id is null or p_user_id = v_user then raise exception 'invalid_friend'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'invalid_friend'; end if;

  select * into v_existing from public.friendships
  where least(requester_id, addressee_id) = least(v_user, p_user_id)
    and greatest(requester_id, addressee_id) = greatest(v_user, p_user_id)
  for update;

  if found then
    if v_existing.status = 'accepted' then return 'friends'; end if;
    if v_existing.requester_id = v_user then return 'outgoing'; end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = v_existing.id;
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (p_user_id, v_user, 'friend_accepted', v_existing.id)
    on conflict on constraint notifications_once do nothing;
    delete from public.notifications where user_id = v_user and type = 'friend_request' and friendship_id = v_existing.id;
    return 'friends';
  end if;

  begin
    insert into public.friendships (requester_id, addressee_id) values (v_user, p_user_id)
    returning id into v_id;
  exception when unique_violation then
    return 'outgoing';
  end;
  insert into public.notifications (user_id, actor_id, type, friendship_id)
  values (p_user_id, v_user, 'friend_request', v_id)
  on conflict on constraint notifications_once do nothing;
  return 'outgoing';
end;
$$;

-- Accept or decline a request sent to you.
create or replace function public.grateapex_respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.friendships%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.friendships
  where id = p_friendship_id and addressee_id = v_user and status = 'pending'
  for update;
  if not found then raise exception 'request_not_found'; end if;

  delete from public.notifications where user_id = v_user and type = 'friend_request' and friendship_id = v_row.id;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = v_row.id;
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (v_row.requester_id, v_user, 'friend_accepted', v_row.id)
    on conflict on constraint notifications_once do nothing;
    return 'friends';
  end if;
  delete from public.friendships where id = v_row.id;
  return 'none';
end;
$$;

-- Cancel your request, or remove a friend (either side).
create or replace function public.grateapex_remove_friendship(p_friendship_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  delete from public.friendships
  where id = p_friendship_id
    and (requester_id = v_user or (addressee_id = v_user and status = 'accepted'));
  return 'none';
end;
$$;

-- Your friends and pending requests, with public progress figures.
create or replace function public.grateapex_list_friends()
returns table (
  friendship_id uuid, user_id uuid, username text, display_name text, avatar_url text,
  relationship text, total_xp integer, weekly_xp integer, current_streak integer,
  since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query
    select f.id, o.other, p.username, p.display_name, p.avatar_url,
      case when f.status = 'accepted' then 'friends'
           when f.requester_id = v_user then 'outgoing' else 'incoming' end,
      case when f.status = 'accepted' then coalesce(s.total_xp, 0) end,
      case when f.status = 'accepted' then coalesce((
        select sum(e.amount)::integer from public.xp_events e
        where e.user_id = o.other and e.created_at >= date_trunc('week', now())
      ), 0) end,
      case when f.status = 'accepted' then coalesce(s.current_streak, 0) end,
      coalesce(f.responded_at, f.created_at)
    from public.friendships f
    cross join lateral (select case when f.requester_id = v_user then f.addressee_id else f.requester_id end as other) o
    left join public.profiles p on p.id = o.other
    left join public.user_learning_stats s on s.user_id = o.other
    where v_user in (f.requester_id, f.addressee_id)
    order by f.status, coalesce(f.responded_at, f.created_at) desc
    limit 500;
end;
$$;

-- Notifications with the other learner's public name.
create or replace function public.grateapex_list_notifications()
returns table (
  id uuid, type text, friendship_id uuid, actor_id uuid, actor_username text,
  actor_display_name text, actor_avatar_url text, read_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query
    select n.id, n.type, n.friendship_id, n.actor_id, p.username, p.display_name, p.avatar_url, n.read_at, n.created_at
    from public.notifications n
    left join public.profiles p on p.id = n.actor_id
    where n.user_id = v_user
    order by n.created_at desc
    limit 50;
end;
$$;

revoke all on function public.grateapex_set_username(text) from public, anon;
revoke all on function public.grateapex_search_profiles(text) from public, anon;
revoke all on function public.grateapex_send_friend_request(uuid) from public, anon;
revoke all on function public.grateapex_respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.grateapex_remove_friendship(uuid) from public, anon;
revoke all on function public.grateapex_list_friends() from public, anon;
revoke all on function public.grateapex_list_notifications() from public, anon;
grant execute on function public.grateapex_set_username(text) to authenticated;
grant execute on function public.grateapex_search_profiles(text) to authenticated;
grant execute on function public.grateapex_send_friend_request(uuid) to authenticated;
grant execute on function public.grateapex_respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.grateapex_remove_friendship(uuid) to authenticated;
grant execute on function public.grateapex_list_friends() to authenticated;
grant execute on function public.grateapex_list_notifications() to authenticated;

-- grateapex_set_updated_at is a trigger function; nobody needs to call it.
revoke all on function public.grateapex_set_updated_at() from public, anon, authenticated;

-- ── XP: cap each award server-side ──────────────────────────────────
-- Task XP is 10–50 (power-ups may multiply gains up to ×3), so no single
-- event may exceed 150. Stops clients from awarding themselves huge XP,
-- which now matters because friends compare weekly XP.
create or replace function public.grateapex_record_xp_event(
  p_source_type text,
  p_source_id text,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_total_xp integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_source_type not in ('lesson', 'quiz')
     or p_source_id is null
     or length(btrim(p_source_id)) = 0
     or p_amount is null
     or p_amount <= 0
     or p_amount > 150 then
    raise exception 'Invalid XP event';
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (v_user_id, p_source_type, p_source_id, p_amount)
  on conflict (user_id, source_type, source_id) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    insert into public.user_learning_stats (user_id, total_xp)
    values (v_user_id, p_amount)
    on conflict (user_id) do update
      set total_xp = public.user_learning_stats.total_xp + excluded.total_xp
    returning total_xp into v_total_xp;
  else
    select total_xp into v_total_xp
    from public.user_learning_stats
    where user_id = v_user_id;
  end if;

  return coalesce(v_total_xp, 0);
end;
$$;

-- Direct inserts would bypass the cap; XP events go through the functions.
revoke insert, update on table public.xp_events from authenticated;
drop policy if exists xp_events_insert_own on public.xp_events;
drop policy if exists xp_events_update_own on public.xp_events;

-- The app writes only streak fields to user_learning_stats (learning-sync
-- mergeStats); total_xp changes only through the XP functions above.
revoke insert, update on table public.user_learning_stats from authenticated;
grant insert (user_id, current_streak, last_activity_date) on table public.user_learning_stats to authenticated;
grant update (user_id, current_streak, last_activity_date) on table public.user_learning_stats to authenticated;

-- ── Realtime: live friend requests and notifications ────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friendships') then
      alter publication supabase_realtime add table public.friendships;
    end if;
  end if;
end;
$$;
