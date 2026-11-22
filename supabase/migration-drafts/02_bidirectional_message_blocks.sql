-- TASLAK. private, Data API'nin acik semalari arasinda olmamalidir.
-- Hedef migration rolu, rol olusturabilmeli ve asagidaki izinleri verebilmelidir.
begin;

create role collacrew_message_block_reader
  nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;

grant usage on schema public, auth, private to collacrew_message_block_reader;
grant execute on function auth.uid() to collacrew_message_block_reader;
grant select (blocker_id, blocked_id)
  on public.user_blocks to collacrew_message_block_reader;

create policy "Message block reader sees caller's block relationships"
on public.user_blocks
for select
to collacrew_message_block_reader
using (
  blocker_id = (select auth.uid())
  or blocked_id = (select auth.uid())
);

-- CREATE ve SET ROLE yetkileri yalnizca fonksiyonu olusturmak icin kullanilir.
grant collacrew_message_block_reader to current_user with inherit false, set true;
grant create on schema private to collacrew_message_block_reader;
set local role collacrew_message_block_reader;

create function private.can_send_unblocked_direct_message(p_receiver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
set row_security = on
as $function$
  select caller.id is not null
    and p_receiver_id is not null
    and not exists (
      select 1
      from public.user_blocks as block
      where (block.blocker_id = caller.id and block.blocked_id = p_receiver_id)
         or (block.blocker_id = p_receiver_id and block.blocked_id = caller.id)
    )
  from (select auth.uid() as id) as caller;
$function$;

revoke all on function private.can_send_unblocked_direct_message(uuid)
  from public, anon, authenticated;
grant execute on function private.can_send_unblocked_direct_message(uuid)
  to authenticated;

reset role;
revoke create on schema private from collacrew_message_block_reader;
revoke collacrew_message_block_reader from current_user;

-- ALTER POLICY mevcut RESTRICTIVE INSERT niteligini korur.
alter policy "Blocked users cannot exchange messages"
on public.messages
to authenticated
with check (
  receiver_id is null
  or (
    sender_id = (select auth.uid())
    and private.can_send_unblocked_direct_message(receiver_id)
  )
);

commit;
