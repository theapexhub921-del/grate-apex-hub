-- Profiles for GRATEAPEX learners (display name and avatar).
--
-- The live project's profiles table, select policy and sign-up trigger were
-- first created in the dashboard. This file records them so the database can
-- be rebuilt from the repo, and is safe to run on the live project:
--   * the table and select policy are only created if missing;
--   * display_name becomes optional (it was required, which broke sign-up)
--     and profiles are linked to their account (deleted with it);
--   * handle_new_user now also copies the learner's name (sign-up form
--     "display_name", or Google's "full_name"/"name") into the profile;
--   * handle_new_user can no longer be called directly by visitors or
--     signed-in users (Supabase security advisor lints 0028/0029) — it only
--     runs from the trigger;
--   * existing accounts without a profile row get one.
-- The app only ever UPDATES its own profile row (see src/lib/profiles.ts).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- The live table was created with display_name NOT NULL and no default,
-- while the original sign-up trigger inserted only the id — so every new
-- sign-up failed. A name is optional at sign-up (the app treats an empty
-- name as "not set yet" and asks for it during onboarding).
alter table public.profiles alter column display_name drop not null;

-- The live table had no link to auth.users; deleting an account should
-- delete its profile too.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'f'
  ) then
    delete from public.profiles p
    where not exists (select 1 from auth.users u where u.id = p.id);
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end;
$$;

alter table public.profiles enable row level security;

grant select on table public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  ) then
    create policy "Enable users to view their own data only"
      on public.profiles for select to authenticated
      using ((select auth.uid()) = id);
  end if;
end;
$$;

-- Create a profile row for every new account, with the learner's name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger functions need no EXECUTE grant; only the trigger may run it.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that already exist get a profile row too (names filled only
-- where the profile has none yet).
insert into public.profiles (id, display_name)
select
  u.id,
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
from auth.users u
on conflict (id) do nothing;

update public.profiles p
set display_name = nullif(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
from auth.users u
where u.id = p.id and p.display_name is null;
