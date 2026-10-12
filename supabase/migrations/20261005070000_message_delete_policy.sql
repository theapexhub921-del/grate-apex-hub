-- Let a sender soft-delete only their own direct messages.
grant update (deleted_at) on public.messages to authenticated;

create policy messages_sender_soft_delete on public.messages
  for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));
