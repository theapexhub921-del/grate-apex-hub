-- Allow a signed-in learner to clear their own learning history across devices.
-- Profile, social, preference, and currency data are intentionally untouched.
create or replace function public.grateapex_reset_learning_progress()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.learning_events where user_id = v_user_id;
  delete from public.question_attempts where user_id = v_user_id;
  delete from public.quiz_attempts where user_id = v_user_id;
  delete from public.review_schedule where user_id = v_user_id;
  delete from public.xp_events where user_id = v_user_id;
  delete from public.lesson_progress where user_id = v_user_id;

  update public.user_learning_stats
  set total_xp = 0,
      current_streak = 0,
      last_activity_date = null
  where user_id = v_user_id;
end;
$$;

revoke all on function public.grateapex_reset_learning_progress() from public;
revoke all on function public.grateapex_reset_learning_progress() from anon;
grant execute on function public.grateapex_reset_learning_progress() to authenticated;
