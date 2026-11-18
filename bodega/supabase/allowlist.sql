-- Applied as migration friends_allowlist. Friends only: an allow-list of email addresses.
-- Add a friend:     insert into public.allowed_emails (email, note) values ('friend@example.com', 'Sam');
-- Remove a friend:  delete from public.allowed_emails where email = 'friend@example.com';
-- Addresses must be lowercase.

create table if not exists public.allowed_emails (
  email    text primary key check (email = lower(email)),
  note     text,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
-- No policies on purpose: browsers can't read or change the list.

insert into public.allowed_emails (email, note)
select lower(email), 'existing account' from auth.users where email is not null
on conflict (email) do nothing;

-- Is the signed-in user on the list? Only answers for the caller. Lives in a schema the API
-- doesn't serve (applied as migration allowlist_private_schema), so it has no /rpc endpoint.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create or replace function private.is_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
$$;
revoke all on function private.is_allowed() from public, anon;
grant execute on function private.is_allowed() to authenticated, service_role;

-- No account (and no email) for addresses that aren't on the list.
create or replace function public.guard_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Not on the list.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_signup() from public, anon, authenticated;
drop trigger if exists guard_signup on auth.users;
create trigger guard_signup before insert on auth.users for each row execute function public.guard_signup();

-- The shelf: only people on the list may read or write.
alter policy "notes_select_own" on public.notes
  using (user_id = (select auth.uid()) and (select private.is_allowed()));
alter policy "notes_insert_own" on public.notes
  with check (user_id = (select auth.uid()) and (select private.is_allowed()));
alter policy "notes_update_own" on public.notes
  using (user_id = (select auth.uid()) and (select private.is_allowed()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed()));
alter policy "notes_delete_own" on public.notes
  using (user_id = (select auth.uid()) and (select private.is_allowed()));

-- Applied as migration allowlist_select_own: a signed-in person can see their own row only,
-- so the page can sign out anyone who isn't on the list.
create policy "allowed_emails_select_own" on public.allowed_emails
  for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
