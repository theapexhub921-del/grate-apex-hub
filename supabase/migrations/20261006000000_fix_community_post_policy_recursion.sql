-- Fix recursive RLS evaluation when publishing posts (including reposts).
-- The visibility check runs as this restricted SECURITY DEFINER helper so it
-- does not re-enter community_posts policies from community_posts' INSERT policy.
create or replace function public.grateapex_can_reshare_community_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.community_posts original
    where original.id = p_post_id
      and original.deleted_at is null
      and (original.author_id = auth.uid() or public.grateapex_are_friends(original.author_id))
  );
$$;
revoke all on function public.grateapex_can_reshare_community_post(uuid) from public, anon;
grant execute on function public.grateapex_can_reshare_community_post(uuid) to authenticated;

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and deleted_at is null
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
    and (reshared_post_id is null or public.grateapex_can_reshare_community_post(reshared_post_id)));
