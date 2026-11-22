import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSql(path) {
  return readFileSync(new URL(`../supabase/${path}`, import.meta.url), 'utf8')
    .replace(/^\s*--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const coalition = readSql('migration-drafts/01_coalition_project_ownership.sql');
const messages = readSql('migration-drafts/02_bidirectional_message_blocks.sql');
const placement = readSql('migrations/202609300001_marketplace_security_hardening.sql');
const marketplace = readSql('migrations/202609300002_marketplace_operations.sql');

test('Coalition draft replaces both write checks and preserves standalone inserts', () => {
  const ownerCheck = 'with check ( created_by = (select auth.uid()) and ( project_id is null or exists ( select 1 from public.projects as project where project.id = coalitions.project_id and project.client_id = (select auth.uid()) ) ) );';

  assert.ok(coalition.includes(
    'alter policy "users can create coalitions" on public.coalitions to authenticated ' + ownerCheck,
  ));
  assert.ok(coalition.includes(
    'alter policy "users can update coalitions they created" on public.coalitions to authenticated using (created_by = (select auth.uid())) ' + ownerCheck,
  ));
});

test('Coalition draft rejects every changed project link with a null-safe UPDATE trigger', () => {
  assert.match(coalition, /returns trigger language plpgsql security invoker .* raise exception .* using errcode = '23514'/);
  assert.ok(coalition.includes(
    'before update on public.coalitions for each row when (old.project_id is distinct from new.project_id) execute function private.reject_coalition_project_change()',
  ));
});

test('Placement RPC creates or reuses the coalition without updating its project link', () => {
  assert.match(placement, /insert into coalitions \(name, description, status, created_by, project_id\).*v_client_id, v_project_id \) on conflict \(project_id\) where project_id is not null do nothing returning id into v_coalition_id/);
  assert.doesNotMatch(placement, /update (?:public\.)?coalitions\b/);
});

test('Message block reader uses scoped grants and RLS with no application role membership', () => {
  assert.match(messages, /create role collacrew_message_block_reader nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;/);
  assert.ok(messages.includes('grant select (blocker_id, blocked_id) on public.user_blocks to collacrew_message_block_reader;'));
  assert.ok(messages.includes('for select to collacrew_message_block_reader using ( blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()) );'));
  assert.deepEqual(
    messages.match(/grant collacrew_message_block_reader to [^;]+;/g),
    ['grant collacrew_message_block_reader to current_user with inherit false, set true;'],
  );
  assert.match(messages, /reset role; revoke create on schema private from collacrew_message_block_reader; revoke collacrew_message_block_reader from current_user;/);
});

test('Private message helper uses the session identity and checks both block directions', () => {
  assert.match(messages, /create function private\.can_send_unblocked_direct_message\(p_receiver_id uuid\) returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp set row_security = on/);
  assert.ok(messages.includes('caller.id is not null and p_receiver_id is not null and not exists'));
  assert.ok(messages.includes(
    'where (block.blocker_id = caller.id and block.blocked_id = p_receiver_id) or (block.blocker_id = p_receiver_id and block.blocked_id = caller.id) ) from (select auth.uid() as id) as caller;',
  ));
  assert.match(messages, /revoke all on function private\.can_send_unblocked_direct_message\(uuid\) from public, anon, authenticated; grant execute on function private\.can_send_unblocked_direct_message\(uuid\) to authenticated;/);
});

test('Message draft tightens the restrictive INSERT policy and leaves team sends to their own policy', () => {
  assert.ok(marketplace.includes('create policy "blocked users cannot exchange messages" on public.messages as restrictive for insert'));
  assert.ok(messages.includes(
    'alter policy "blocked users cannot exchange messages" on public.messages to authenticated with check ( receiver_id is null or ( sender_id = (select auth.uid()) and private.can_send_unblocked_direct_message(receiver_id) ) );',
  ));
});
