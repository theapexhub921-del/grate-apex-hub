-- GRATEAPEX learning engine — schema extensions.
--
-- Applied to the live project on 2026-10-05. The app also works without it
-- (it falls back to the older schema and keeps the extra data on the
-- device); with it, the app detects the new capabilities automatically:
--   1. question_attempts accepts the new answer modes
--      (topic-quiz, recall, apex, mastery-check)
--   2. quiz_attempts stores topic quizzes and review sessions
--   3. XP penalties (negative XP) are stored via
--      grateapex_record_xp_adjustment, so totals match across devices
--   4. learning_events stores the learning timeline (lesson started /
--      completed, quiz / review / Apex completed, concept mastered…)
--
-- Safe to re-run: every change is guarded. No data is deleted or
-- rewritten; existing rows remain valid under every new constraint.

-- ── 1. Answer modes ─────────────────────────────────────────────────
alter table public.question_attempts
  drop constraint if exists question_attempts_mode_check;

alter table public.question_attempts
  add constraint question_attempts_mode_check check (
    mode in (
      'interactive', 'interactive-retry', 'lesson-quiz', 'topic-quiz',
      'practice', 'review', 'recall', 'apex', 'mastery-check'
    )
  );

-- ── 2. Quiz attempt kinds ───────────────────────────────────────────
alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_attempt_type_check;

alter table public.quiz_attempts
  add constraint quiz_attempts_attempt_type_check check (
    attempt_type in ('lesson', 'apex_challenge', 'topic', 'review')
  );

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_subject_reference;

alter table public.quiz_attempts
  add constraint quiz_attempts_subject_reference check (
    (attempt_type = 'lesson' and lesson_id is not null)
    or (attempt_type in ('apex_challenge', 'topic') and course_id is not null)
    or attempt_type = 'review'
  );

-- ── 3. XP penalties ─────────────────────────────────────────────────
-- Allow negative 'adjustment' events next to the existing positive
-- lesson/quiz events. Positive awards keep using
-- grateapex_record_xp_event unchanged.
alter table public.xp_events
  drop constraint if exists xp_events_source_type_check;

alter table public.xp_events
  add constraint xp_events_source_type_check check (
    source_type in ('lesson', 'quiz', 'adjustment')
  );

alter table public.xp_events
  drop constraint if exists xp_events_amount_check;

alter table public.xp_events
  add constraint xp_events_amount_check check (
    (source_type = 'adjustment' and amount < 0)
    or (source_type <> 'adjustment' and amount > 0)
  );

-- Record an XP deduction once per source and lower the total (never
-- below zero). Identity always comes from the authenticated session.
create or replace function public.grateapex_record_xp_adjustment(
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

  if p_source_id is null
     or length(btrim(p_source_id)) = 0
     or p_amount is null
     or p_amount >= 0
     or p_amount < -100000 then
    raise exception 'Invalid XP adjustment';
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (v_user_id, 'adjustment', p_source_id, p_amount)
  on conflict (user_id, source_type, source_id) do nothing
  returning id into v_event_id;

  if v_event_id is not null then
    insert into public.user_learning_stats (user_id, total_xp)
    values (v_user_id, 0)
    on conflict (user_id) do update
      set total_xp = greatest(0, public.user_learning_stats.total_xp + p_amount)
    returning total_xp into v_total_xp;
  else
    select total_xp into v_total_xp
    from public.user_learning_stats
    where user_id = v_user_id;
  end if;

  return coalesce(v_total_xp, 0);
end;
$$;

revoke all on function public.grateapex_record_xp_adjustment(text, integer)
  from public, anon;
grant execute on function public.grateapex_record_xp_adjustment(text, integer)
  to authenticated;

-- ── 4. Learning events ──────────────────────────────────────────────
create table if not exists public.learning_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'LESSON_STARTED', 'LESSON_COMPLETED', 'QUIZ_STARTED', 'QUIZ_COMPLETED',
      'REVIEW_STARTED', 'REVIEW_COMPLETED', 'CONCEPT_MASTERED',
      'TOPIC_COMPLETED', 'APEX_CHALLENGE_STARTED', 'APEX_CHALLENGE_COMPLETED'
    )
  ),
  occurred_at timestamptz not null,
  topic_id text,
  lesson_id text,
  ref_id text,
  data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_user_time_idx
  on public.learning_events (user_id, occurred_at desc);

alter table public.learning_events enable row level security;

grant select, insert, delete on table public.learning_events to authenticated;

drop policy if exists learning_events_select_own on public.learning_events;
create policy learning_events_select_own
  on public.learning_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists learning_events_insert_own on public.learning_events;
create policy learning_events_insert_own
  on public.learning_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists learning_events_delete_own on public.learning_events;
create policy learning_events_delete_own
  on public.learning_events for delete to authenticated
  using ((select auth.uid()) = user_id);
