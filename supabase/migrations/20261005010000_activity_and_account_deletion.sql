-- GRATEAPEX: friend activity feed and account deletion.
--
-- Activity: friends see only accomplishments — lesson completed, topic
-- completed, Apex Challenge completed — never scores, answers or anything
-- else in learning_events. Learners can opt out (profiles.share_activity).
--
-- Account deletion: deletes the auth user; every GRATEAPEX table references
-- auth.users ON DELETE CASCADE (profiles, learning stats, progress, quiz /
-- question history, reviews, XP events, learning events, friendships,
-- notifications), so no personal rows are left behind.

alter table public.profiles add column if not exists share_activity boolean not null default true;
grant update (share_activity) on table public.profiles to authenticated;

create or replace function public.grateapex_friend_activity()
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  event_type text, topic_id text, lesson_id text, occurred_at timestamptz
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
    select e.user_id, p.username, p.display_name, p.avatar_url,
      e.event_type, e.topic_id, e.lesson_id, e.occurred_at
    from public.friendships f
    cross join lateral (select case when f.requester_id = v_user then f.addressee_id else f.requester_id end as other) o
    join public.profiles p on p.id = o.other and p.share_activity
    join public.learning_events e on e.user_id = o.other
    where f.status = 'accepted'
      and v_user in (f.requester_id, f.addressee_id)
      and e.event_type in ('LESSON_COMPLETED', 'TOPIC_COMPLETED', 'APEX_CHALLENGE_COMPLETED')
      and e.occurred_at >= now() - interval '14 days'
    order by e.occurred_at desc
    limit 40;
end;
$$;

-- Permanently delete the signed-in learner's account and all their data.
create or replace function public.grateapex_delete_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = v_user;
  return true;
end;
$$;

revoke all on function public.grateapex_friend_activity() from public, anon;
revoke all on function public.grateapex_delete_account() from public, anon;
grant execute on function public.grateapex_friend_activity() to authenticated;
grant execute on function public.grateapex_delete_account() to authenticated;

-- Defence in depth: these tables are written only through the social
-- functions (RLS already blocks direct writes).
revoke insert, update, delete on table public.friendships from authenticated;
revoke insert on table public.notifications from authenticated;
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;
