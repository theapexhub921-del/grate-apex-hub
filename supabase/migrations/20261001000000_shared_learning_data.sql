-- Shared, account-scoped learning data for GRATEAPEX.
-- This migration does not alter auth.users or the existing profiles table.

create table public.user_learning_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (length(btrim(lesson_id)) > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('lesson', 'quiz')),
  source_id text not null check (length(btrim(source_id)) > 0),
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint xp_events_user_source_unique unique (user_id, source_type, source_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_type text not null check (attempt_type in ('lesson', 'apex_challenge')),
  course_id text,
  lesson_id text,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  percentage integer not null check (percentage between 0 and 100),
  time_seconds integer not null check (time_seconds >= 0),
  wrong_concepts text[] not null default '{}'::text[],
  wrong_question_ids text[] not null default '{}'::text[],
  practice boolean not null default false,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint quiz_attempts_score_within_total check (score <= total),
  constraint quiz_attempts_subject_reference check (
    (attempt_type = 'lesson' and lesson_id is not null)
    or (attempt_type = 'apex_challenge' and course_id is not null)
  )
);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null check (length(btrim(question_id)) > 0),
  topic_id text not null check (length(btrim(topic_id)) > 0),
  lesson_id text not null check (length(btrim(lesson_id)) > 0),
  concept text not null check (length(btrim(concept)) > 0),
  correct boolean not null,
  mode text not null check (
    mode in ('interactive', 'interactive-retry', 'lesson-quiz', 'practice', 'review')
  ),
  attempted_at timestamptz not null default now()
);

create table public.review_schedule (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (length(btrim(lesson_id)) > 0),
  concept text not null check (length(btrim(concept)) > 0),
  stage integer not null check (stage between 0 and 4),
  due_at timestamptz not null,
  misses integer not null default 0 check (misses >= 0),
  last_reviewed_at timestamptz not null,
  first_tracked_at timestamptz not null,
  reason text not null default 'learned' check (reason in ('learned', 'missed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, concept)
);

-- Indexes for the user-scoped history and due-review queries.
create index quiz_attempts_user_completed_idx
  on public.quiz_attempts (user_id, completed_at desc);

create index question_attempts_user_question_time_idx
  on public.question_attempts (user_id, question_id, attempted_at desc);

create index question_attempts_user_time_idx
  on public.question_attempts (user_id, attempted_at desc);

create index review_schedule_user_due_idx
  on public.review_schedule (user_id, due_at);

create index xp_events_user_created_idx
  on public.xp_events (user_id, created_at desc);

-- Keep updated_at current when either summary or review rows are updated.
create or replace function public.grateapex_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_learning_stats_set_updated_at
  before update on public.user_learning_stats
  for each row execute function public.grateapex_set_updated_at();

create trigger review_schedule_set_updated_at
  before update on public.review_schedule
  for each row execute function public.grateapex_set_updated_at();

-- RLS is enabled on every account-scoped table. Policies below authorize
-- each operation only when the row belongs to the signed-in user.
alter table public.user_learning_stats enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.question_attempts enable row level security;
alter table public.review_schedule enable row level security;

grant select, insert, update, delete on table
  public.user_learning_stats,
  public.lesson_progress,
  public.xp_events,
  public.quiz_attempts,
  public.question_attempts,
  public.review_schedule
to authenticated;

create policy user_learning_stats_select_own
  on public.user_learning_stats for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_learning_stats_insert_own
  on public.user_learning_stats for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy user_learning_stats_update_own
  on public.user_learning_stats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_learning_stats_delete_own
  on public.user_learning_stats for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy lesson_progress_select_own
  on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy lesson_progress_insert_own
  on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy lesson_progress_update_own
  on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy lesson_progress_delete_own
  on public.lesson_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy xp_events_select_own
  on public.xp_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy xp_events_insert_own
  on public.xp_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy xp_events_update_own
  on public.xp_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy xp_events_delete_own
  on public.xp_events for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy quiz_attempts_select_own
  on public.quiz_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy quiz_attempts_insert_own
  on public.quiz_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy quiz_attempts_update_own
  on public.quiz_attempts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy quiz_attempts_delete_own
  on public.quiz_attempts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy question_attempts_select_own
  on public.question_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy question_attempts_insert_own
  on public.question_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy question_attempts_update_own
  on public.question_attempts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy question_attempts_delete_own
  on public.question_attempts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy review_schedule_select_own
  on public.review_schedule for select to authenticated
  using ((select auth.uid()) = user_id);
create policy review_schedule_insert_own
  on public.review_schedule for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy review_schedule_update_own
  on public.review_schedule for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy review_schedule_delete_own
  on public.review_schedule for delete to authenticated
  using ((select auth.uid()) = user_id);
