-- Keep community reaction counts current in active social feeds.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'community_post_reactions') then
    alter publication supabase_realtime add table public.community_post_reactions;
  end if;
end;
$$;
