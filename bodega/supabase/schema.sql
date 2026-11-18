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

-- Applied as migration notes_per_user_cap: at most 100 rows per person.
create or replace function public.notes_enforce_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Serialise inserts per user so parallel requests can't slip past the cap.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.notes where user_id = new.user_id) >= 100 then
    raise exception 'The shelf is full. Throw something out first.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists notes_enforce_cap on public.notes;
create trigger notes_enforce_cap
  before insert on public.notes
  for each row execute function public.notes_enforce_cap();

revoke all on function public.notes_enforce_cap() from public, anon, authenticated;
