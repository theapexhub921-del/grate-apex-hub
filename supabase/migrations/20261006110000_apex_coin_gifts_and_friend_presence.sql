-- Let learners gift earned Apex Coins to accepted friends and control
-- whether friends can see their online status.

create table if not exists public.apex_coin_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint apex_coin_transfers_not_self check (sender_id <> recipient_id)
);
create index if not exists apex_coin_transfers_sender_recent_idx
  on public.apex_coin_transfers(sender_id, created_at desc);
create index if not exists apex_coin_transfers_recipient_recent_idx
  on public.apex_coin_transfers(recipient_id, created_at desc);
alter table public.apex_coin_transfers enable row level security;
grant select on public.apex_coin_transfers to authenticated;
revoke insert, update, delete on public.apex_coin_transfers from authenticated;
drop policy if exists apex_coin_transfers_participant_read on public.apex_coin_transfers;
create policy apex_coin_transfers_participant_read on public.apex_coin_transfers
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create or replace function public.grateapex_send_apex_coins(p_recipient_id uuid, p_amount integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_sender uuid := auth.uid();
  v_balance integer;
  v_new_balance integer;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'Enter a whole number of coins greater than zero'; end if;
  if not public.grateapex_are_friends(p_recipient_id) then raise exception 'Apex Coins can only be sent to an accepted friend'; end if;

  insert into public.apex_coin_wallets(user_id, balance)
    values (v_sender, 0) on conflict (user_id) do nothing;
  select w.balance into v_balance from public.apex_coin_wallets w
    where w.user_id = v_sender for update;
  if coalesce(v_balance, 0) < p_amount then raise exception 'Not enough Apex Coins'; end if;

  insert into public.apex_coin_transfers(sender_id, recipient_id, amount)
    values (v_sender, p_recipient_id, p_amount);
  update public.apex_coin_wallets set balance = balance - p_amount, updated_at = now()
    where user_id = v_sender returning balance into v_new_balance;
  insert into public.apex_coin_wallets(user_id, balance)
    values (p_recipient_id, p_amount)
    on conflict (user_id) do update set balance = public.apex_coin_wallets.balance + excluded.balance,
      updated_at = now();
  return v_new_balance;
end;
$$;
revoke all on function public.grateapex_send_apex_coins(uuid, integer) from public, anon;
grant execute on function public.grateapex_send_apex_coins(uuid, integer) to authenticated;

alter table public.profiles add column if not exists online_at timestamptz;

create or replace function public.grateapex_set_online_status(p_is_online boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_can_share boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select coalesce(p.privacy_preferences->>'shareOnlineStatus' = 'true', false)
    into v_can_share
    from public.user_preferences p where p.user_id = v_user;
  update public.profiles
    set online_at = case when coalesce(p_is_online, false) and coalesce(v_can_share, false) then now() else null end
    where id = v_user;
end;
$$;
revoke all on function public.grateapex_set_online_status(boolean) from public, anon;
grant execute on function public.grateapex_set_online_status(boolean) to authenticated;

create or replace function public.grateapex_friend_presence()
returns table(user_id uuid, is_online boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return query
    select other.user_id,
      coalesce(pref.privacy_preferences->>'shareOnlineStatus' = 'true', false)
        and p.online_at >= now() - interval '2 minutes' as is_online
    from public.friendships f
    cross join lateral (select case when f.requester_id = v_user then f.addressee_id else f.requester_id end as user_id) other
    left join public.profiles p on p.id = other.user_id
    left join public.user_preferences pref on pref.user_id = other.user_id
    where f.status = 'accepted'
      and v_user in (f.requester_id, f.addressee_id)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_user and b.blocked_id = other.user_id)
           or (b.blocker_id = other.user_id and b.blocked_id = v_user)
      );
end;
$$;
revoke all on function public.grateapex_friend_presence() from public, anon;
grant execute on function public.grateapex_friend_presence() to authenticated;
