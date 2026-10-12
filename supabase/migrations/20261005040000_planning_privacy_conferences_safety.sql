-- Additive planning, account preferences, conferences, and safety primitives.
-- This migration intentionally preserves all existing rows and tables.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance text not null default 'apex' check (appearance in ('apex','light','dark','system')),
  font_size text not null default 'default' check (font_size in ('small','default','large','extra_large')),
  zoom integer not null default 100 check (zoom in (80,90,100,110,125)),
  navigation_auto_hide boolean not null default true,
  notification_preferences jsonb not null default '{}'::jsonb,
  privacy_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
grant select, insert, update on public.user_preferences to authenticated;
drop policy if exists user_preferences_own on public.user_preferences;
create policy user_preferences_own on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.personal_study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My study plan' check (length(btrim(title)) between 1 and 100),
  topic_ids text[] not null default '{}',
  duration_days integer not null default 14 check (duration_days between 1 and 365),
  goal text not null default '' check (length(goal) <= 500),
  progress_lesson_ids text[] not null default '{}',
  status text not null default 'active' check (status in ('active','completed','archived')),
  starts_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_study_plans_owner_idx on public.personal_study_plans(user_id, updated_at desc);
alter table public.personal_study_plans enable row level security;
grant select, insert, update, delete on public.personal_study_plans to authenticated;
drop policy if exists personal_study_plans_own on public.personal_study_plans;
create policy personal_study_plans_own on public.personal_study_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.timetable_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  subject text not null default '' check (length(subject) <= 100),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  recurrence text not null default 'weekly' check (recurrence in ('once','weekly')),
  event_date date,
  study_plan_id uuid references public.personal_study_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check ((recurrence = 'once' and event_date is not null) or recurrence = 'weekly')
);
create index if not exists timetable_blocks_owner_idx on public.timetable_blocks(user_id, weekday, start_time);
alter table public.timetable_blocks enable row level security;
grant select, insert, update, delete on public.timetable_blocks to authenticated;
drop policy if exists timetable_blocks_own on public.timetable_blocks;
create policy timetable_blocks_own on public.timetable_blocks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  goal_type text not null check (goal_type in ('lessons','xp','questions','streak','topic','study_plan')),
  target numeric not null check (target > 0),
  current numeric not null default 0 check (current >= 0),
  deadline date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_goals_owner_idx on public.personal_goals(user_id, deadline nulls last);
alter table public.personal_goals enable row level security;
grant select, insert, update, delete on public.personal_goals to authenticated;
drop policy if exists personal_goals_own on public.personal_goals;
create policy personal_goals_own on public.personal_goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.table_conferences (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete set null,
  name text not null check (length(btrim(name)) between 2 and 100),
  topic text not null default '' check (length(topic) <= 300),
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists table_conferences_host_idx on public.table_conferences(host_id, starts_at desc);
create index if not exists table_conferences_group_idx on public.table_conferences(group_id, starts_at desc);
alter table public.table_conferences enable row level security;
grant select, insert, update, delete on public.table_conferences to authenticated;
create table if not exists public.table_conference_participants (
  conference_id uuid not null references public.table_conferences(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'invited' check (status in ('invited','joined','left')),
  joined_at timestamptz,
  primary key (conference_id, user_id)
);
create or replace function public.grateapex_can_read_conference_participants(p_conference uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.table_conferences c where c.id = p_conference and c.host_id = auth.uid())
    or exists(select 1 from public.table_conference_participants p where p.conference_id = p_conference and p.user_id = auth.uid() and p.status = 'joined')
  );
$$;
revoke all on function public.grateapex_can_read_conference_participants(uuid) from public, anon;
grant execute on function public.grateapex_can_read_conference_participants(uuid) to authenticated;
alter table public.table_conference_participants enable row level security;
grant select, insert, update, delete on public.table_conference_participants to authenticated;
revoke update on public.table_conference_participants from authenticated;
grant update (status, joined_at) on public.table_conference_participants to authenticated;
drop policy if exists table_conference_participants_read on public.table_conference_participants;
create policy table_conference_participants_read on public.table_conference_participants for select to authenticated using (
  user_id = (select auth.uid()) or public.grateapex_can_read_conference_participants(conference_id)
);
drop policy if exists table_conference_participants_host_manage on public.table_conference_participants;
create policy table_conference_participants_host_manage on public.table_conference_participants for all to authenticated using (
  exists(select 1 from public.table_conferences c where c.id = conference_id and c.host_id = (select auth.uid()))
) with check (
  exists(select 1 from public.table_conferences c where c.id = conference_id and c.host_id = (select auth.uid()))
);
drop policy if exists table_conference_participants_self_respond on public.table_conference_participants;
create policy table_conference_participants_self_respond on public.table_conference_participants for update to authenticated using (
  user_id = (select auth.uid()) and status in ('invited','joined')
) with check (user_id = (select auth.uid()) and status in ('joined','left'));

create or replace function public.grateapex_join_conference(p_conference uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_group uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select group_id into v_group from public.table_conferences where id = p_conference;
  if not found then raise exception 'Conference not found'; end if;
  if not exists(select 1 from public.table_conference_participants p where p.conference_id = p_conference and p.user_id = v_user)
    and (v_group is null or not public.grateapex_is_group_member(v_group)) then raise exception 'This conference is invitation-only'; end if;
  insert into public.table_conference_participants(conference_id,user_id,invited_by,status,joined_at)
    values(p_conference,v_user,v_user,'joined',now())
    on conflict(conference_id,user_id) do update set status='joined',joined_at=now()
      where public.table_conference_participants.status in ('invited','left');
end $$;
revoke all on function public.grateapex_join_conference(uuid) from public, anon;
grant execute on function public.grateapex_join_conference(uuid) to authenticated;

drop policy if exists table_conferences_read on public.table_conferences;
create policy table_conferences_read on public.table_conferences for select to authenticated using (
  host_id = (select auth.uid()) or exists (
    select 1 from public.table_conference_participants p where p.conference_id = id and p.user_id = (select auth.uid())
  ) or (group_id is not null and public.grateapex_is_group_member(group_id))
);
drop policy if exists table_conferences_host_manage on public.table_conferences;
create policy table_conferences_host_manage on public.table_conferences for all to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));

create table if not exists public.table_conference_messages (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references public.table_conferences(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists table_conference_messages_page_idx on public.table_conference_messages(conference_id, created_at desc, id desc);
alter table public.table_conference_messages enable row level security;
grant select, insert on public.table_conference_messages to authenticated;
drop policy if exists table_conference_messages_participant on public.table_conference_messages;
create policy table_conference_messages_participant on public.table_conference_messages for all to authenticated using (
  exists(select 1 from public.table_conference_participants p where p.conference_id = conference_id and p.user_id = (select auth.uid()) and p.status = 'joined')
) with check (
  author_id = (select auth.uid()) and exists(select 1 from public.table_conference_participants p where p.conference_id = conference_id and p.user_id = (select auth.uid()) and p.status = 'joined')
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;
drop policy if exists user_blocks_own on public.user_blocks;
create policy user_blocks_own on public.user_blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

-- A block ends the friendship boundary everywhere that calls this helper.
create or replace function public.grateapex_are_friends(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_other is not null and p_other <> auth.uid()
    and exists (select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = p_other)
        or (f.addressee_id = auth.uid() and f.requester_id = p_other)))
    and not exists (select 1 from public.user_blocks b where
      (b.blocker_id = auth.uid() and b.blocked_id = p_other)
      or (b.blocker_id = p_other and b.blocked_id = auth.uid()));
$$;
revoke all on function public.grateapex_are_friends(uuid) from public, anon;
grant execute on function public.grateapex_are_friends(uuid) to authenticated;

create or replace function public.grateapex_search_profiles(p_query text)
returns table (user_id uuid, username text, display_name text, avatar_url text, relationship text, friendship_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_q text := lower(btrim(coalesce(p_query, '')));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(v_q) < 2 then return; end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.id, p.username,
      case when coalesce(prefs.privacy_preferences->>'profileVisibility', 'friends') = 'public' or f.id is not null then p.display_name else null end,
      case when coalesce(prefs.privacy_preferences->>'profileVisibility', 'friends') = 'public' or f.id is not null then p.avatar_url else null end,
      case when f.id is null then 'none' when f.status = 'accepted' then 'friends' when f.requester_id = v_user then 'outgoing' else 'incoming' end,
      f.id
    from public.profiles p
    left join public.user_preferences prefs on prefs.user_id = p.id
    left join public.friendships f on least(f.requester_id, f.addressee_id) = least(p.id, v_user)
      and greatest(f.requester_id, f.addressee_id) = greatest(p.id, v_user)
    where p.id <> v_user
      and (p.username like v_q || '%' or lower(p.display_name) like '%' || v_q || '%')
      and (f.id is not null or coalesce(prefs.privacy_preferences->>'discoverable', 'true') <> 'false')
      and not exists (select 1 from public.user_blocks b where
        (b.blocker_id = v_user and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = v_user))
    order by (p.username = v_q) desc nulls last, p.username nulls last, p.display_name limit 20;
end $$;
revoke all on function public.grateapex_search_profiles(text) from public, anon;
grant execute on function public.grateapex_search_profiles(text) to authenticated;

create or replace function public.grateapex_send_friend_request(p_user_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_existing public.friendships%rowtype; v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_user_id is null or p_user_id = v_user or not exists(select 1 from public.profiles where id = p_user_id) then raise exception 'invalid_friend'; end if;
  if exists(select 1 from public.user_blocks b where
    (b.blocker_id = v_user and b.blocked_id = p_user_id) or (b.blocker_id = p_user_id and b.blocked_id = v_user)) then raise exception 'invalid_friend'; end if;
  select * into v_existing from public.friendships where
    least(requester_id, addressee_id) = least(v_user, p_user_id) and greatest(requester_id, addressee_id) = greatest(v_user, p_user_id) for update;
  if found then
    if v_existing.status = 'accepted' then return 'friends'; end if;
    if v_existing.requester_id = v_user then return 'outgoing'; end if;
    update public.friendships set status = 'accepted', responded_at = now() where id = v_existing.id;
    insert into public.notifications (user_id, actor_id, type, friendship_id) values (p_user_id, v_user, 'friend_accepted', v_existing.id) on conflict on constraint notifications_once do nothing;
    delete from public.notifications where user_id = v_user and type = 'friend_request' and friendship_id = v_existing.id;
    return 'friends';
  end if;
  if exists(select 1 from public.user_preferences p where p.user_id = p_user_id and p.privacy_preferences->>'friendRequestPermission' = 'friends') then raise exception 'invalid_friend'; end if;
  insert into public.friendships (requester_id, addressee_id) values (v_user, p_user_id) returning id into v_id;
  insert into public.notifications (user_id, actor_id, type, friendship_id) values (p_user_id, v_user, 'friend_request', v_id) on conflict on constraint notifications_once do nothing;
  return 'outgoing';
end $$;
revoke all on function public.grateapex_send_friend_request(uuid) from public, anon;
grant execute on function public.grateapex_send_friend_request(uuid) to authenticated;

-- A recipient who chose "everyone" can receive a DM from a non-friend;
-- blocks and accepted-friend access are still checked on every read/write.
create or replace function public.grateapex_is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversation_members me
    join public.conversation_members other on other.conversation_id = me.conversation_id and other.user_id <> me.user_id
    where me.conversation_id = p_conversation and me.user_id = auth.uid()
      and (public.grateapex_are_friends(other.user_id) or exists(select 1 from public.user_preferences pref where pref.user_id = other.user_id and pref.privacy_preferences->>'messagingPermission' = 'everyone'))
      and not exists(select 1 from public.user_blocks b where
        (b.blocker_id = auth.uid() and b.blocked_id = other.user_id) or (b.blocker_id = other.user_id and b.blocked_id = auth.uid()))
  );
$$;
revoke all on function public.grateapex_is_conversation_member(uuid) from public, anon;
grant execute on function public.grateapex_is_conversation_member(uuid) to authenticated;

create or replace function public.grateapex_get_or_create_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_conversation uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_other is null or p_other = v_user then raise exception 'Invalid conversation member'; end if;
  if not public.grateapex_are_friends(p_other)
    and not exists(select 1 from public.user_preferences pref where pref.user_id = p_other and pref.privacy_preferences->>'messagingPermission' = 'everyone') then
    raise exception 'Messaging is limited by the recipient privacy settings';
  end if;
  if exists(select 1 from public.user_blocks b where
    (b.blocker_id = v_user and b.blocked_id = p_other) or (b.blocker_id = p_other and b.blocked_id = v_user)) then raise exception 'This conversation is unavailable'; end if;
  v_a := least(v_user, p_other); v_b := greatest(v_user, p_other);
  perform pg_advisory_xact_lock(hashtextextended(v_a::text || ':' || v_b::text, 0));
  insert into public.conversations(member_a, member_b) values(v_a, v_b) on conflict(member_a, member_b) do nothing returning id into v_conversation;
  if v_conversation is null then select c.id into v_conversation from public.conversations c where c.member_a = v_a and c.member_b = v_b; end if;
  insert into public.conversation_members(conversation_id, user_id) values(v_conversation, v_a), (v_conversation, v_b) on conflict do nothing;
  return v_conversation;
end $$;
revoke all on function public.grateapex_get_or_create_dm(uuid) from public, anon;
grant execute on function public.grateapex_get_or_create_dm(uuid) to authenticated;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user','group','message')),
  target_id text not null check (length(btrim(target_id)) between 1 and 200),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at);
alter table public.content_reports enable row level security;
grant insert on public.content_reports to authenticated;
drop policy if exists content_reports_create_own on public.content_reports;
create policy content_reports_create_own on public.content_reports for insert to authenticated with check (reporter_id = (select auth.uid()));

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('message','friend_request','group_activity','mention','comment','study_reminder','goal','streak','friend_streak','announcement','social_activity')),
  title text not null check(length(title) between 1 and 160),
  body text not null default '' check(length(body) <= 500),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists in_app_notifications_recipient_page_idx on public.in_app_notifications(recipient_id, created_at desc);
alter table public.in_app_notifications enable row level security;
grant select, update on public.in_app_notifications to authenticated;
revoke update on public.in_app_notifications from authenticated;
grant update (read_at) on public.in_app_notifications to authenticated;
drop policy if exists in_app_notifications_recipient on public.in_app_notifications;
create policy in_app_notifications_recipient on public.in_app_notifications for select to authenticated using(recipient_id = (select auth.uid()));
drop policy if exists in_app_notifications_mark_read on public.in_app_notifications;
create policy in_app_notifications_mark_read on public.in_app_notifications for update to authenticated using(recipient_id = (select auth.uid())) with check(recipient_id = (select auth.uid()));

-- Recheck community media against a real, visible post instead of casting an
-- arbitrary storage path segment to UUID (which can error for malformed paths).
drop policy if exists community_media_read_circle on storage.objects;
create policy community_media_read_circle on storage.objects for select to authenticated using (
  bucket_id = 'community-media' and exists (
    select 1 from public.community_posts p where p.media_path = name and p.deleted_at is null
      and (p.author_id = (select auth.uid()) or public.grateapex_are_friends(p.author_id))
  )
);

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'table_conference_messages') then
    alter publication supabase_realtime add table public.table_conference_messages;
  end if;
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'in_app_notifications') then
    alter publication supabase_realtime add table public.in_app_notifications;
  end if;
end $$;
