-- Recommend discoverable learners, prioritizing the same class and
-- semester, then shared friends. Class information is only used to rank
-- suggestions and is never returned to another learner.
create or replace function public.grateapex_recommend_friends()
returns table (
  user_id uuid,
  friendship_id uuid,
  username text,
  display_name text,
  avatar_url text,
  relationship text,
  same_class boolean,
  shared_connections integer
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
    with current_learner as (
      select u.raw_user_meta_data -> 'grateapex_academic_selection' as selection
      from auth.users u
      where u.id = v_user
    ), candidates as (
      select
        p.id,
        p.username,
        case
          when coalesce(prefs.privacy_preferences ->> 'profileVisibility', 'friends') = 'public' then p.display_name
          else null
        end as display_name,
        case
          when coalesce(prefs.privacy_preferences ->> 'profileVisibility', 'friends') = 'public' then p.avatar_url
          else null
        end as avatar_url,
        coalesce(
          u.raw_user_meta_data -> 'grateapex_academic_selection' ->> 'classId'
            = current_learner.selection ->> 'classId',
          false
        ) as same_class,
        coalesce(
          u.raw_user_meta_data -> 'grateapex_academic_selection' ->> 'semester'
            = current_learner.selection ->> 'semester',
          false
        ) as same_semester,
        (
          select count(distinct their_friend.user_id)::integer
          from public.friendships my_friend
          join lateral (
            select case when f.requester_id = p.id then f.addressee_id else f.requester_id end as user_id
            from public.friendships f
            where f.status = 'accepted'
              and (f.requester_id = p.id or f.addressee_id = p.id)
              and (case when f.requester_id = p.id then f.addressee_id else f.requester_id end)
                = (case when my_friend.requester_id = v_user then my_friend.addressee_id else my_friend.requester_id end)
          ) their_friend on true
          where my_friend.status = 'accepted'
            and (my_friend.requester_id = v_user or my_friend.addressee_id = v_user)
        ) as shared_connections
      from public.profiles p
      join auth.users u on u.id = p.id
      cross join current_learner
      left join public.user_preferences prefs on prefs.user_id = p.id
      where p.id <> v_user
        and coalesce(prefs.privacy_preferences ->> 'discoverable', 'true') <> 'false'
        and coalesce(prefs.privacy_preferences ->> 'friendRequestPermission', 'everyone') <> 'friends'
        and not exists (
          select 1 from public.friendships f
          where least(f.requester_id, f.addressee_id) = least(p.id, v_user)
            and greatest(f.requester_id, f.addressee_id) = greatest(p.id, v_user)
        )
        and not exists (
          select 1 from public.user_blocks b
          where (b.blocker_id = v_user and b.blocked_id = p.id)
            or (b.blocker_id = p.id and b.blocked_id = v_user)
        )
    )
    select
      c.id,
      null::uuid,
      c.username,
      c.display_name,
      c.avatar_url,
      'none'::text,
      c.same_class,
      c.shared_connections
    from candidates c
    order by c.same_class desc, c.same_semester desc, c.shared_connections desc, c.username nulls last
    limit 6;
end;
$$;

revoke all on function public.grateapex_recommend_friends() from public, anon;
grant execute on function public.grateapex_recommend_friends() to authenticated;
