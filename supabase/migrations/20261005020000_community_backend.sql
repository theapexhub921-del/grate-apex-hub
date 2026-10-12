-- GrAte Apex community backend (local migration; review before live apply).
-- Media storage policies and trusted challenge scoring need separate setup.

create or replace function public.grateapex_are_friends(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_other is not null and p_other <> auth.uid()
    and exists (select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = p_other)
        or (f.addressee_id = auth.uid() and f.requester_id = p_other)));
$$;

revoke all on function public.grateapex_are_friends(uuid) from public, anon;
grant execute on function public.grateapex_are_friends(uuid) to authenticated;

-- 24-hour stories; only the author and accepted friends can see live rows.
create table public.community_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  body text check (body is null or length(btrim(body)) between 1 and 500),
  media_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (body is not null or media_path is not null),
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);
create index community_stories_author_idx on public.community_stories (author_id, created_at desc);
create index community_stories_expiry_idx on public.community_stories (expires_at);
alter table public.community_stories enable row level security;
grant select, insert, delete on public.community_stories to authenticated;
create policy community_stories_read on public.community_stories for select to authenticated
  using (expires_at > now() and (author_id = (select auth.uid()) or public.grateapex_are_friends(author_id)));
create policy community_stories_insert on public.community_stories for insert to authenticated
  with check (author_id = (select auth.uid()) and (body is not null or media_path is not null)
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
    and expires_at <= now() + interval '24 hours');
create policy community_stories_delete on public.community_stories for delete to authenticated
  using (author_id = (select auth.uid()));

-- Open/friends/private study spaces and threaded group discussions.
create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 80),
  description text not null default '' check (length(description) <= 1000),
  visibility text not null default 'friends' check (visibility in ('open', 'friends', 'private')),
  created_at timestamptz not null default now()
);
create index study_groups_open_idx on public.study_groups (created_at desc) where visibility = 'open';
alter table public.study_groups enable row level security;

create table public.group_memberships (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_memberships_user_idx on public.group_memberships (user_id, status);
alter table public.group_memberships enable row level security;
grant select on public.group_memberships to authenticated;
create or replace function public.grateapex_is_group_member(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.group_memberships m
    where m.group_id = p_group and m.user_id = auth.uid() and m.status = 'active'
  );
$$;
revoke all on function public.grateapex_is_group_member(uuid) from public, anon;
grant execute on function public.grateapex_is_group_member(uuid) to authenticated;
grant select on public.study_groups to authenticated;
create policy study_groups_read on public.study_groups for select to authenticated
  using (visibility = 'open' or public.grateapex_is_group_member(id)
    or (visibility = 'friends' and public.grateapex_are_friends(owner_id))
    or exists (select 1 from public.group_memberships i where i.group_id = id
      and i.user_id = (select auth.uid()) and i.status = 'invited'));
create policy group_memberships_read on public.group_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.grateapex_is_group_member(group_id));

create table public.group_discussions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.group_discussions (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index group_discussions_recent_idx on public.group_discussions (group_id, created_at desc);
alter table public.group_discussions enable row level security;
grant select, insert on public.group_discussions to authenticated;
create policy group_discussions_read on public.group_discussions for select to authenticated
  using (public.grateapex_is_group_member(group_id));
create policy group_discussions_insert on public.group_discussions for insert to authenticated
  with check (author_id = (select auth.uid()) and public.grateapex_is_group_member(group_id));

create or replace function public.grateapex_create_study_group(p_title text, p_description text default '', p_visibility text default 'friends')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_group uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(btrim(coalesce(p_title, ''))) not between 2 and 80 then raise exception 'Invalid group title'; end if;
  if length(coalesce(p_description, '')) > 1000 then raise exception 'Group description is too long'; end if;
  if coalesce(p_visibility, '') not in ('open', 'friends', 'private') then raise exception 'Invalid group visibility'; end if;
  insert into public.study_groups (owner_id, title, description, visibility)
    values (v_user, btrim(p_title), coalesce(p_description, ''), p_visibility) returning id into v_group;
  insert into public.group_memberships (group_id, user_id, role, status)
    values (v_group, v_user, 'owner', 'active');
  return v_group;
end;
$$;

create or replace function public.grateapex_join_open_study_group(p_group uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_visibility text; v_owner uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select g.visibility, g.owner_id into v_visibility, v_owner from public.study_groups g where g.id = p_group;
  if not (v_visibility = 'open' or (v_visibility = 'friends' and public.grateapex_are_friends(v_owner))) then
    raise exception 'You cannot join this group';
  end if;
  insert into public.group_memberships (group_id, user_id, status) values (p_group, v_user, 'active')
    on conflict (group_id, user_id) do update set status = 'active', joined_at = now()
    where public.group_memberships.status in ('left', 'invited');
  return true;
end;
$$;

create or replace function public.grateapex_invite_group_friend(p_group uuid, p_friend uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_role text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select m.role into v_role from public.group_memberships m
    where m.group_id = p_group and m.user_id = v_user and m.status = 'active';
  if v_role is null or v_role not in ('owner', 'moderator') then raise exception 'Only group moderators can invite'; end if;
  if not public.grateapex_are_friends(p_friend) then raise exception 'You can invite accepted friends only'; end if;
  insert into public.group_memberships (group_id, user_id, role, status)
    values (p_group, p_friend, 'member', 'invited')
    on conflict (group_id, user_id) do nothing;
  return true;
end;
$$;

create or replace function public.grateapex_respond_group_invite(p_group uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_accept then
    update public.group_memberships set status = 'active', joined_at = now()
      where group_id = p_group and user_id = v_user and status = 'invited';
    if not found then raise exception 'Invitation not found'; end if;
  else
    delete from public.group_memberships
      where group_id = p_group and user_id = v_user and status = 'invited';
  end if;
  return true;
end;
$$;

revoke all on function public.grateapex_create_study_group(text, text, text) from public, anon;
revoke all on function public.grateapex_join_open_study_group(uuid) from public, anon;
revoke all on function public.grateapex_invite_group_friend(uuid, uuid) from public, anon;
revoke all on function public.grateapex_respond_group_invite(uuid, boolean) from public, anon;
grant execute on function public.grateapex_create_study_group(text, text, text) to authenticated;
grant execute on function public.grateapex_join_open_study_group(uuid) to authenticated;
grant execute on function public.grateapex_invite_group_friend(uuid, uuid) to authenticated;
grant execute on function public.grateapex_respond_group_invite(uuid, boolean) to authenticated;

-- Private direct-message conversations. The RPC below creates one only
-- between accepted friends; all message reads/writes require membership.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references auth.users (id) on delete cascade,
  member_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (member_a < member_b),
  unique (member_a, member_b)
);
alter table public.conversations enable row level security;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id, joined_at desc);
alter table public.conversation_members enable row level security;
grant select on public.conversations, public.conversation_members to authenticated;
create or replace function public.grateapex_is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1
    from public.conversation_members m
    join public.conversation_members other_m
      on other_m.conversation_id = m.conversation_id and other_m.user_id <> m.user_id
    where m.conversation_id = p_conversation and m.user_id = auth.uid()
      and public.grateapex_are_friends(other_m.user_id)
  );
$$;
revoke all on function public.grateapex_is_conversation_member(uuid) from public, anon;
grant execute on function public.grateapex_is_conversation_member(uuid) to authenticated;
create policy conversations_read on public.conversations for select to authenticated
  using (public.grateapex_is_conversation_member(id));
create policy conversation_members_read on public.conversation_members for select to authenticated
  using (user_id = (select auth.uid()) or public.grateapex_is_conversation_member(conversation_id));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index messages_conversation_recent_idx on public.messages (conversation_id, created_at desc);
alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (public.grateapex_is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.grateapex_is_conversation_member(conversation_id));

create or replace function public.grateapex_get_or_create_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_a uuid; v_b uuid; v_conversation uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.grateapex_are_friends(p_other) then raise exception 'Messaging is for accepted friends'; end if;
  v_a := least(v_user, p_other); v_b := greatest(v_user, p_other);
  perform pg_advisory_xact_lock(hashtextextended(v_a::text || ':' || v_b::text, 0));
  insert into public.conversations (member_a, member_b) values (v_a, v_b)
    on conflict (member_a, member_b) do nothing returning id into v_conversation;
  if v_conversation is null then
    select c.id into v_conversation from public.conversations c where c.member_a = v_a and c.member_b = v_b;
  end if;
  insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation, v_a), (v_conversation, v_b) on conflict do nothing;
  return v_conversation;
end;
$$;
revoke all on function public.grateapex_get_or_create_dm(uuid) from public, anon;
grant execute on function public.grateapex_get_or_create_dm(uuid) to authenticated;

-- Friend challenge invitations. Scores are deliberately absent until a
-- server-side grader can validate them against trusted question data.
create table public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Study challenge' check (length(btrim(title)) between 2 and 80),
  topic_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'completed', 'expired')),
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  check (challenger_id <> opponent_id),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index friend_challenges_challenger_idx on public.friend_challenges (challenger_id, created_at desc);
create index friend_challenges_opponent_idx on public.friend_challenges (opponent_id, created_at desc);
alter table public.friend_challenges enable row level security;
grant select on public.friend_challenges to authenticated;
create policy friend_challenges_read_participant on public.friend_challenges for select to authenticated
  using ((select auth.uid()) in (challenger_id, opponent_id));

create or replace function public.grateapex_create_friend_challenge(p_opponent uuid, p_title text default 'Study challenge', p_topic_id text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.grateapex_are_friends(p_opponent) then raise exception 'Challenges are for accepted friends'; end if;
  if length(btrim(coalesce(p_title, ''))) not between 2 and 80 then raise exception 'Invalid challenge title'; end if;
  insert into public.friend_challenges (challenger_id, opponent_id, title, topic_id)
    values (v_user, p_opponent, btrim(p_title), nullif(btrim(coalesce(p_topic_id, '')), ''))
    returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.grateapex_respond_friend_challenge(p_challenge uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_status text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  update public.friend_challenges
    set status = case when p_accept then 'active' else 'declined' end,
        starts_at = case when p_accept then now() else starts_at end,
        ends_at = case when p_accept then now() + interval '7 days' else ends_at end
    where id = p_challenge and opponent_id = v_user and status = 'pending'
    returning status into v_status;
  if v_status is null then raise exception 'Challenge not found or already answered'; end if;
  return v_status;
end;
$$;
revoke all on function public.grateapex_create_friend_challenge(uuid, text, text) from public, anon;
revoke all on function public.grateapex_respond_friend_challenge(uuid, boolean) from public, anon;
grant execute on function public.grateapex_create_friend_challenge(uuid, text, text) to authenticated;
grant execute on function public.grateapex_respond_friend_challenge(uuid, boolean) to authenticated;

-- Freeze balances can only be changed by trusted server functions/service
-- role. The client can display its own balance but cannot mint or spend one.
create table public.streak_freeze_inventory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  available integer not null default 0 check (available between 0 and 2),
  updated_at timestamptz not null default now()
);
create table public.streak_freeze_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('earned', 'used', 'expired', 'adjusted')),
  amount integer not null check (amount <> 0),
  source text not null,
  created_at timestamptz not null default now()
);
create index streak_freeze_events_user_idx on public.streak_freeze_events (user_id, created_at desc);
alter table public.streak_freeze_inventory enable row level security;
alter table public.streak_freeze_events enable row level security;
grant select on public.streak_freeze_inventory, public.streak_freeze_events to authenticated;
create policy streak_freeze_inventory_read_own on public.streak_freeze_inventory for select to authenticated
  using (user_id = (select auth.uid()));
create policy streak_freeze_events_read_own on public.streak_freeze_events for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.streak_freeze_inventory, public.streak_freeze_events from authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_stories') then
    alter publication supabase_realtime add table public.community_stories;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'group_discussions') then
    alter publication supabase_realtime add table public.group_discussions;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friend_challenges') then
    alter publication supabase_realtime add table public.friend_challenges;
  end if;
end;
$$;
