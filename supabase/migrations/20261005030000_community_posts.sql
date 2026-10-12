-- Friend-visible feed posts, comments, reactions, resharing and private media.
-- Uploads are limited to a private bucket; clients cannot publish outside
-- their own folder or read media belonging to non-friends.

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '' check (length(body) <= 5000),
  media_path text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  reshared_post_id uuid references public.community_posts (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (length(btrim(body)) > 0 or media_path is not null or reshared_post_id is not null),
  check ((media_path is null) = (media_type is null))
);
create index community_posts_recent_idx on public.community_posts (created_at desc) where deleted_at is null;
create index community_posts_author_idx on public.community_posts (author_id, created_at desc) where deleted_at is null;
alter table public.community_posts enable row level security;
grant select, insert, update on public.community_posts to authenticated;
create policy community_posts_read_friends on public.community_posts for select to authenticated
  using (deleted_at is null and (author_id = (select auth.uid()) or public.grateapex_are_friends(author_id)));

-- Check repost visibility outside the caller's community_posts RLS policies.
-- Querying community_posts directly from its own INSERT policy recurses back
-- into that policy on PostgreSQL, even when the post is a regular text post.
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

create policy community_posts_insert_own on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and deleted_at is null
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
    and (reshared_post_id is null or public.grateapex_can_reshare_community_post(reshared_post_id)));
create policy community_posts_edit_own on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and length(body) <= 5000);

create table public.community_post_reactions (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like', 'love', 'funny', 'fire', 'wow', 'applause')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.community_post_reactions enable row level security;
grant select, insert, update, delete on public.community_post_reactions to authenticated;
create policy community_post_reactions_read on public.community_post_reactions for select to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id));
create policy community_post_reactions_insert on public.community_post_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.community_posts p where p.id = post_id));
create policy community_post_reactions_update on public.community_post_reactions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy community_post_reactions_delete on public.community_post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index community_post_comments_recent_idx on public.community_post_comments (post_id, created_at asc);
alter table public.community_post_comments enable row level security;
grant select, insert, update on public.community_post_comments to authenticated;
create policy community_post_comments_read on public.community_post_comments for select to authenticated
  using (deleted_at is null and exists (select 1 from public.community_posts p where p.id = post_id));
create policy community_post_comments_insert on public.community_post_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and deleted_at is null
    and exists (select 1 from public.community_posts p where p.id = post_id));
create policy community_post_comments_edit_own on public.community_post_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', false, 104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy community_media_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy community_media_read_circle on storage.objects for select to authenticated
  using (bucket_id = 'community-media' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.grateapex_are_friends(((storage.foldername(name))[1])::uuid)
  ));
create policy community_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_posts') then
    alter publication supabase_realtime add table public.community_posts;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_post_comments') then
    alter publication supabase_realtime add table public.community_post_comments;
  end if;
end;
$$;
