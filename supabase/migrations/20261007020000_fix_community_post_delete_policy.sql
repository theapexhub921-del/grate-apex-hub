-- The active-post read policy hides a post immediately after soft deletion.
-- Avoid UPDATE ... RETURNING so Postgres does not apply that read policy to
-- the newly hidden row while completing the delete.
create or replace function public.grateapex_delete_community_post(p_post_id uuid)
returns table(post_id uuid, media_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_media_path text;
  v_updated integer;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select p.media_path into v_media_path
  from public.community_posts p
  where p.id = p_post_id
    and p.author_id = v_user
    and p.deleted_at is null
  for update;

  if not found then
    raise exception 'Post not found or you do not own this post';
  end if;

  update public.community_posts p
  set deleted_at = now()
  where p.id = p_post_id
    and p.author_id = v_user
    and p.deleted_at is null;
  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Post could not be deleted';
  end if;

  post_id := p_post_id;
  media_path := v_media_path;
  return next;
end;
$$;

revoke all on function public.grateapex_delete_community_post(uuid) from public, anon;
grant execute on function public.grateapex_delete_community_post(uuid) to authenticated;
