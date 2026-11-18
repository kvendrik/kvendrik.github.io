-- Run in Supabase: SQL Editor -> New query -> Run

create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

-- Each signed-in user can only see and change their own rows.
-- (select auth.uid()) runs once per query, not once per row.
create policy "notes_select_own" on public.notes
  for select to authenticated using (user_id = (select auth.uid()));

create policy "notes_insert_own" on public.notes
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "notes_update_own" on public.notes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "notes_delete_own" on public.notes
  for delete to authenticated using (user_id = (select auth.uid()));
