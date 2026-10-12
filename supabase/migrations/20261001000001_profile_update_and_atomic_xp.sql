-- Allow signed-in learners to edit their own existing profile row.
-- The row checks preserve the existing profile SELECT and ownership rules.
grant update on table public.profiles to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Record an XP event and increment its summary in one transaction. The user
-- identity always comes from the authenticated Supabase session, never from
-- a client-supplied user_id. The existing unique key makes retries harmless.
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
     or p_amount <= 0 then
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

revoke all on function public.grateapex_record_xp_event(text, text, integer)
  from public, anon;
grant execute on function public.grateapex_record_xp_event(text, text, integer)
  to authenticated;
