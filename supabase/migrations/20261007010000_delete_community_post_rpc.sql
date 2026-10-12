-- Soft-delete a learner's own community post without requiring a client-side
-- UPDATE that can be rejected by the feed's row-level visibility policies.
create or replace function public.grateapex_delete_community_post(p_post_id uuid)
returns table(post_id uuid, media_path text)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  update public.community_posts p
  set deleted_at = now()
  where p.id = p_post_id
    and p.author_id = v_user
    and p.deleted_at is null
  returning p.id, p.media_path into post_id, media_path;

  if post_id is null then
    raise exception 'Post not found or you do not own this post';
  end if;

  return next;
end;
$$;

revoke all on function public.grateapex_delete_community_post(uuid) from public, anon;
grant execute on function public.grateapex_delete_community_post(uuid) to authenticated;
