-- Account-scoped Apex Coins and one-time streak recovery purchases.
create table public.apex_coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.apex_coin_wallets enable row level security;
grant select on public.apex_coin_wallets to authenticated;
create policy apex_coin_wallets_read_own on public.apex_coin_wallets
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.apex_coin_wallets from authenticated;

create table public.apex_coin_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('apex_challenge', 'topic_completion', 'streak_recovery')),
  source_id text not null check (length(btrim(source_id)) between 1 and 200),
  amount integer not null check (
    (event_type = 'apex_challenge' and amount = 5)
    or (event_type = 'topic_completion' and amount = 10)
    or (event_type = 'streak_recovery' and amount = -100)
  ),
  created_at timestamptz not null default now(),
  unique (user_id, event_type, source_id)
);
create index apex_coin_events_user_recent_idx on public.apex_coin_events(user_id, created_at desc);
alter table public.apex_coin_events enable row level security;
grant select on public.apex_coin_events to authenticated;
create policy apex_coin_events_read_own on public.apex_coin_events
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.apex_coin_events from authenticated;

create table public.streak_recovery_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lost_streak integer not null check (lost_streak > 0),
  lost_on date not null,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lost_on)
);
create index streak_recovery_offers_pending_idx on public.streak_recovery_offers(user_id, lost_streak desc, lost_on desc)
  where recovered_at is null;
alter table public.streak_recovery_offers enable row level security;
grant select on public.streak_recovery_offers to authenticated;
create policy streak_recovery_offers_read_own on public.streak_recovery_offers
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.streak_recovery_offers from authenticated;

create or replace function public.grateapex_capture_lapsed_streak()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.current_streak > 0 and old.last_activity_date is not null
     and new.last_activity_date > old.last_activity_date + 1
     and new.current_streak < old.current_streak then
    insert into public.streak_recovery_offers(user_id, lost_streak, lost_on)
      values (old.user_id, old.current_streak, old.last_activity_date + 1)
      on conflict (user_id, lost_on) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.grateapex_capture_lapsed_streak() from public, anon, authenticated;
create trigger user_learning_stats_capture_lapsed_streak
  before update of current_streak, last_activity_date on public.user_learning_stats
  for each row execute function public.grateapex_capture_lapsed_streak();

create or replace function public.grateapex_award_apex_coins(p_reward text, p_source_id text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_amount integer;
  v_event uuid;
  v_balance integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_source_id is null or length(btrim(p_source_id)) = 0 then raise exception 'Invalid completion reference'; end if;
  if p_reward = 'apex_challenge' then
    v_amount := 5;
    if not exists (select 1 from public.quiz_attempts a where a.id::text = p_source_id
      and a.user_id = v_user and a.attempt_type = 'apex_challenge' and not a.practice and a.total > 0) then
      raise exception 'Completed Apex Challenge not found';
    end if;
  elsif p_reward = 'topic_completion' then
    v_amount := 10;
    if not exists (select 1 from public.learning_events e where e.user_id = v_user
      and e.event_type = 'TOPIC_COMPLETED' and e.topic_id = p_source_id) then
      raise exception 'Completed topic not found';
    end if;
  else
    raise exception 'Invalid Apex Coin reward';
  end if;

  insert into public.apex_coin_events(user_id, event_type, source_id, amount)
    values (v_user, p_reward, p_source_id, v_amount)
    on conflict (user_id, event_type, source_id) do nothing returning id into v_event;
  if v_event is not null then
    insert into public.apex_coin_wallets(user_id, balance)
      values (v_user, v_amount)
      on conflict (user_id) do update set balance = public.apex_coin_wallets.balance + excluded.balance,
        updated_at = now()
      returning balance into v_balance;
  else
    select w.balance into v_balance from public.apex_coin_wallets w where w.user_id = v_user;
  end if;
  return coalesce(v_balance, 0);
end;
$$;
revoke all on function public.grateapex_award_apex_coins(text, text) from public, anon;
grant execute on function public.grateapex_award_apex_coins(text, text) to authenticated;

create or replace function public.grateapex_buy_streak_recovery(p_today date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_streak integer;
  v_last_date date;
  v_balance integer;
  v_event uuid;
  v_offer_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_today is null or p_today < current_date - 1 or p_today > current_date + 1 then
    raise exception 'Invalid local date';
  end if;
  select o.id, o.lost_streak, o.lost_on into v_offer_id, v_streak, v_last_date
    from public.streak_recovery_offers o where o.user_id = v_user and o.recovered_at is null
    order by o.lost_streak desc, o.lost_on desc limit 1 for update;
  if v_offer_id is null then
    select s.current_streak, s.last_activity_date into v_streak, v_last_date
      from public.user_learning_stats s where s.user_id = v_user for update;
    if coalesce(v_streak, 0) <= 0 or v_last_date is null or v_last_date >= p_today - 1 then
      raise exception 'There is no lapsed streak to recover';
    end if;
    insert into public.streak_recovery_offers(user_id, lost_streak, lost_on)
      values (v_user, v_streak, v_last_date + 1)
      on conflict (user_id, lost_on) do nothing;
    select o.id, o.lost_streak, o.lost_on into v_offer_id, v_streak, v_last_date
      from public.streak_recovery_offers o where o.user_id = v_user and o.recovered_at is null
      order by o.lost_streak desc, o.lost_on desc limit 1 for update;
  end if;
  select w.balance into v_balance from public.apex_coin_wallets w where w.user_id = v_user for update;
  if coalesce(v_balance, 0) < 100 then raise exception '100 Apex Coins are required'; end if;

  insert into public.apex_coin_events(user_id, event_type, source_id, amount)
    values (v_user, 'streak_recovery', v_offer_id::text, -100)
    on conflict (user_id, event_type, source_id) do nothing returning id into v_event;
  if v_event is null then raise exception 'This lapsed streak has already been recovered'; end if;
  update public.apex_coin_wallets set balance = balance - 100, updated_at = now() where user_id = v_user returning balance into v_balance;
  update public.streak_recovery_offers set recovered_at = now() where id = v_offer_id;
  update public.user_learning_stats set current_streak = v_streak, last_activity_date = p_today where user_id = v_user;
  return jsonb_build_object('balance', v_balance, 'streak', v_streak);
end;
$$;
revoke all on function public.grateapex_buy_streak_recovery(date) from public, anon;
grant execute on function public.grateapex_buy_streak_recovery(date) to authenticated;
