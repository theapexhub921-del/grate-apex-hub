-- Keep community-media private while allowing signed URLs for visible stories.
-- The previous read policy matched only community_posts, so storage returned
-- "Object not found" for story media even when the story row was visible.
drop policy if exists community_media_read_circle on storage.objects;
create policy community_media_read_circle on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-media'
    and (
      exists (
        select 1 from public.community_posts p
        where p.media_path = name and p.deleted_at is null
          and (p.author_id = (select auth.uid()) or public.grateapex_are_friends(p.author_id))
      )
      or exists (
        select 1 from public.community_stories s
        where s.media_path = name and s.expires_at > now()
          and (s.author_id = (select auth.uid()) or public.grateapex_are_friends(s.author_id))
      )
    )
  );
