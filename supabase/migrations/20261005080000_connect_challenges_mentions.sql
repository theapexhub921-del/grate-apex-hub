-- Connect progression: automatic one-day streak freezes, weekly challenge
-- rewards, same-rank weekly leagues, friendly topic-battle results and @mentions.

-- Streak freezes are earned by completing the shared weekly lesson challenge.
-- A missed single day consumes one freeze automatically on the next study day.
create table if not exists public.weekly_challenge_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.weekly_challenge_claims enable row level security;
grant select on public.weekly_challenge_claims to authenticated;
create policy weekly_challenge_claims_read_own on public.weekly_challenge_claims
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.weekly_challenge_claims from authenticated;

create or replace function public.grateapex_record_streak_activity(p_today date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_streak integer := 0;
  v_last date;
  v_freezes integer := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_today is null or p_today < current_date - 1 or p_today > current_date + 1 then
    raise exception 'Invalid local date';
  end if;
  select s.current_streak, s.last_activity_date into v_streak, v_last
    from public.user_learning_stats s where s.user_id = v_user for update;
  if not found then
    insert into public.user_learning_stats(user_id, current_streak, last_activity_date)
      values (v_user, 1, p_today) on conflict (user_id) do nothing;
    select s.current_streak, s.last_activity_date into v_streak, v_last
      from public.user_learning_stats s where s.user_id = v_user for update;
  end if;

  if v_last is null then
    v_streak := 1;
  elsif p_today <= v_last then
    return v_streak;
  elsif p_today = v_last + 1 then
    v_streak := v_streak + 1;
  elsif p_today = v_last + 2 and v_streak > 0 then
    select i.available into v_freezes from public.streak_freeze_inventory i where i.user_id = v_user for update;
    if coalesce(v_freezes, 0) > 0 then
      update public.streak_freeze_inventory set available = available - 1, updated_at = now() where user_id = v_user;
      insert into public.streak_freeze_events(user_id, event_type, amount, source)
        values (v_user, 'used', -1, 'missed-day:' || v_last::text);
      v_streak := v_streak + 1;
    else
      v_streak := 1;
    end if;
  else
    v_streak := 1;
  end if;

  update public.user_learning_stats set current_streak = v_streak, last_activity_date = p_today, updated_at = now()
    where user_id = v_user;
  return v_streak;
end;
$$;
revoke all on function public.grateapex_record_streak_activity(date) from public, anon;
grant execute on function public.grateapex_record_streak_activity(date) to authenticated;

create or replace function public.grateapex_weekly_challenge_status()
returns table (week_start date, lessons_completed integer, lesson_target integer, freeze_balance integer, reward_claimed boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_week date := date_trunc('week', now())::date;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query select v_week,
    (select count(distinct e.source_id)::integer from public.xp_events e where e.user_id = v_user
      and e.source_type = 'lesson' and e.created_at >= v_week::timestamptz),
    5,
    coalesce((select i.available from public.streak_freeze_inventory i where i.user_id = v_user), 0),
    exists(select 1 from public.weekly_challenge_claims c where c.user_id = v_user and c.week_start = v_week);
end;
$$;
revoke all on function public.grateapex_weekly_challenge_status() from public, anon;
grant execute on function public.grateapex_weekly_challenge_status() to authenticated;

create or replace function public.grateapex_claim_weekly_challenge()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_week date := date_trunc('week', now())::date;
  v_count integer;
  v_freezes integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select count(distinct e.source_id)::integer into v_count from public.xp_events e
    where e.user_id = v_user and e.source_type = 'lesson' and e.created_at >= v_week::timestamptz;
  if v_count < 5 then raise exception 'Complete five lessons this week to earn the reward'; end if;

  insert into public.streak_freeze_inventory(user_id, available) values (v_user, 0)
    on conflict (user_id) do nothing;
  select i.available into v_freezes from public.streak_freeze_inventory i where i.user_id = v_user for update;
  if v_freezes >= 2 then raise exception 'Your streak freeze inventory is full'; end if;
  insert into public.weekly_challenge_claims(user_id, week_start) values (v_user, v_week)
    on conflict (user_id, week_start) do nothing;
  if not found then raise exception 'This weekly reward was already claimed'; end if;
  update public.streak_freeze_inventory set available = available + 1, updated_at = now()
    where user_id = v_user returning available into v_freezes;
  insert into public.streak_freeze_events(user_id, event_type, amount, source)
    values (v_user, 'earned', 1, 'weekly-lesson-challenge:' || v_week::text);
  return jsonb_build_object('available', v_freezes, 'week_start', v_week);
end;
$$;
revoke all on function public.grateapex_claim_weekly_challenge() from public, anon;
grant execute on function public.grateapex_claim_weekly_challenge() to authenticated;

-- Weekly league results include only the viewer's current lifetime-XP rank.
create or replace function public.grateapex_weekly_league()
returns table (
  rank_id text, rank_name text, user_id uuid, username text, display_name text, avatar_url text,
  lifetime_xp integer, weekly_xp integer, league_position bigint, league_size bigint, is_viewer boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query
    with learners as (
      select p.id, p.username, p.display_name, p.avatar_url, coalesce(s.total_xp, 0) as lifetime_xp,
        coalesce((select sum(e.amount)::integer from public.xp_events e
          where e.user_id = p.id and e.created_at >= date_trunc('week', now())), 0) as weekly_xp,
        case when coalesce(s.total_xp, 0) >= 1000000 then 'consultant'
             when coalesce(s.total_xp, 0) >= 416446 then 'senior-specialist'
             when coalesce(s.total_xp, 0) >= 173298 then 'specialist'
             when coalesce(s.total_xp, 0) >= 71987 then 'resident'
             when coalesce(s.total_xp, 0) >= 29774 then 'principal-medical-officer'
             when coalesce(s.total_xp, 0) >= 12185 then 'senior-medical-officer'
             when coalesce(s.total_xp, 0) >= 4856 then 'medical-officer'
             when coalesce(s.total_xp, 0) >= 1802 then 'house-officer'
             when coalesce(s.total_xp, 0) >= 530 then 'senior-medical-student'
             else 'medical-student' end as learner_rank
      from public.profiles p left join public.user_learning_stats s on s.user_id = p.id
      where (p.share_activity is true or p.id = v_user)
        and (coalesce(s.total_xp, 0) > 0 or p.id = v_user)
    ), viewer as (select l.learner_rank from learners l where l.id = v_user), cohort as (
      select l.*, row_number() over (order by l.weekly_xp desc, l.lifetime_xp desc, l.id) as place,
        count(*) over () as cohort_size
      from learners l where l.learner_rank = (select v.learner_rank from viewer v)
    )
    select c.learner_rank,
      case c.learner_rank when 'medical-student' then 'Medical Student'
        when 'senior-medical-student' then 'Senior Medical Student' when 'house-officer' then 'House Officer'
        when 'medical-officer' then 'Medical Officer' when 'senior-medical-officer' then 'Senior Medical Officer'
        when 'principal-medical-officer' then 'Principal Medical Officer' when 'resident' then 'Resident'
        when 'specialist' then 'Specialist' when 'senior-specialist' then 'Senior Specialist' else 'Consultant' end,
      c.id, c.username, c.display_name, c.avatar_url, c.lifetime_xp, c.weekly_xp, c.place, c.cohort_size, c.id = v_user
    from cohort c where c.place <= 50 or c.id = v_user order by c.place;
end;
$$;
revoke all on function public.grateapex_weekly_league() from public, anon;
grant execute on function public.grateapex_weekly_league() to authenticated;

-- Compare each participant's server-recorded learning XP during the accepted
-- seven-day round. Scores are visible only to challenge participants.
create or replace function public.grateapex_friend_battle_results(p_challenge uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_battle public.friend_challenges%rowtype;
  v_challenger jsonb;
  v_opponent jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_battle from public.friend_challenges c
    where c.id = p_challenge and v_user in (c.challenger_id, c.opponent_id);
  if not found then raise exception 'Challenge not found'; end if;
  if v_battle.status not in ('active', 'completed') or v_battle.starts_at is null then
    raise exception 'Challenge results are available after the invitation is accepted';
  end if;
  select jsonb_build_object('xp', coalesce(sum(e.amount), 0)) into v_challenger
    from public.xp_events e where e.user_id = v_battle.challenger_id
      and e.created_at >= coalesce(v_battle.starts_at, v_battle.created_at)
      and (v_battle.ends_at is null or e.created_at <= v_battle.ends_at);
  select jsonb_build_object('xp', coalesce(sum(e.amount), 0)) into v_opponent
    from public.xp_events e where e.user_id = v_battle.opponent_id
      and e.created_at >= coalesce(v_battle.starts_at, v_battle.created_at)
      and (v_battle.ends_at is null or e.created_at <= v_battle.ends_at);
  return jsonb_build_object('challenger', coalesce(v_challenger, 'null'::jsonb), 'opponent', coalesce(v_opponent, 'null'::jsonb));
end;
$$;
revoke all on function public.grateapex_friend_battle_results(uuid) from public, anon;
grant execute on function public.grateapex_friend_battle_results(uuid) to authenticated;

-- Stored mentions and private in-app notices. The trigger only notifies when
-- both people can already see the containing conversation or post.
create table if not exists public.community_mentions (
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (recipient_id, source_type, source_id)
);
alter table public.community_mentions enable row level security;
grant select on public.community_mentions to authenticated;
create policy community_mentions_read_own on public.community_mentions
  for select to authenticated using (recipient_id = (select auth.uid()));
revoke insert, update, delete on public.community_mentions from authenticated;

create or replace function public.grateapex_notify_connect_mentions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_match record;
  v_recipient uuid;
  v_visible boolean;
  v_context text := tg_table_name;
  v_context_id uuid;
  v_actor uuid;
  v_actor_name text;
begin
  if tg_table_name = 'messages' then v_actor := new.sender_id;
  else v_actor := new.author_id; end if;
  if tg_table_name = 'community_post_comments' then v_context_id := new.post_id;
  elsif tg_table_name = 'group_discussions' then v_context_id := new.group_id;
  elsif tg_table_name = 'messages' then v_context_id := new.conversation_id;
  elsif tg_table_name = 'table_conference_messages' then v_context_id := new.conference_id;
  else v_context_id := new.id; end if;
  select coalesce(p.display_name, p.username, 'A friend') into v_actor_name from public.profiles p where p.id = v_actor;

  for v_match in
    select distinct lower((matches.parts)[2]) as username
    from regexp_matches(coalesce(new.body, ''), '(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,20})', 'g') as matches(parts)
  loop
    select p.id into v_recipient from public.profiles p where lower(p.username) = v_match.username and p.id <> v_actor;
    if v_recipient is null then continue; end if;
    if tg_table_name in ('community_posts', 'community_post_comments') then
      v_visible := public.grateapex_are_friends(v_recipient);
    elsif tg_table_name = 'messages' then
      v_visible := public.grateapex_are_friends(v_recipient)
        and exists(select 1 from public.conversation_members m where m.conversation_id = new.conversation_id and m.user_id = v_actor)
        and exists(select 1 from public.conversation_members m where m.conversation_id = new.conversation_id and m.user_id = v_recipient);
    elsif tg_table_name = 'group_discussions' then
      v_visible := exists(select 1 from public.group_memberships m where m.group_id = new.group_id and m.user_id = new.author_id and m.status = 'active')
        and exists(select 1 from public.group_memberships m where m.group_id = new.group_id and m.user_id = v_recipient and m.status = 'active');
    elsif tg_table_name = 'table_conference_messages' then
      v_visible := exists(select 1 from public.table_conference_participants p where p.conference_id = new.conference_id and p.user_id = new.author_id and p.status = 'joined')
        and exists(select 1 from public.table_conference_participants p where p.conference_id = new.conference_id and p.user_id = v_recipient and p.status = 'joined');
    else
      v_visible := false;
    end if;
    if not v_visible then continue; end if;
    insert into public.community_mentions(recipient_id, actor_id, source_type, source_id)
      values (v_recipient, v_actor, v_context, new.id) on conflict do nothing;
    if found then
      insert into public.in_app_notifications(recipient_id, actor_id, kind, title, body, data)
        values (v_recipient, v_actor, 'mention', 'You were mentioned',
          left(v_actor_name || ' mentioned you in ' || replace(v_context, '_', ' ') || '.', 500),
          jsonb_build_object('source_type', v_context, 'source_id', v_context_id));
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.grateapex_notify_connect_mentions() from public, anon, authenticated;

drop trigger if exists community_posts_mentions on public.community_posts;
create trigger community_posts_mentions after insert on public.community_posts for each row execute function public.grateapex_notify_connect_mentions();
drop trigger if exists community_post_comments_mentions on public.community_post_comments;
create trigger community_post_comments_mentions after insert on public.community_post_comments for each row execute function public.grateapex_notify_connect_mentions();
drop trigger if exists group_discussions_mentions on public.group_discussions;
create trigger group_discussions_mentions after insert on public.group_discussions for each row execute function public.grateapex_notify_connect_mentions();
drop trigger if exists messages_mentions on public.messages;
create trigger messages_mentions after insert on public.messages for each row execute function public.grateapex_notify_connect_mentions();
drop trigger if exists table_conference_messages_mentions on public.table_conference_messages;
create trigger table_conference_messages_mentions after insert on public.table_conference_messages for each row execute function public.grateapex_notify_connect_mentions();
