# Bodega reference: database

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used in **Runbook step 3**.
Last verified: 2026-11-18, against a live Supabase project.

Apply each block as a migration (`apply_migration`) or have the person paste it into
`https://supabase.com/dashboard/project/<ref>/sql/new` and click Run. Apply them in the order of this
file. Keep a copy in the repo. After all of them, run the **security** and **performance** advisors
and report every finding with its remediation link.

## Use a dedicated project

Bodega changes things that are project-wide:
- a trigger on `auth.users` that **refuses every sign-up whose email isn't on the list**;
- tables and functions named `notes`, `allowed_emails`, `ai_usage`, `private.is_allowed()` and
  `guard_signup()`.

In a project that already serves another app, the trigger would block that app's sign-ups, and
the names could collide with existing ones. So create a new project for Bodega (the free plan
allows two). If the person insists on reusing one, tell them exactly this, and ask before
applying anything.

## Rows

```sql
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);
alter table public.notes enable row level security;
```

- `user_id` defaults to `auth.uid()`, so the page inserts `{ body }` only and can't forge an owner.
- In policies, wrap `auth.uid()` in `(select ...)` so it runs once per query, not once per row (the
  performance advisor flags the bare form as `auth_rls_initplan`).

## The allow-list (friends only)

RLS alone isn't enough: anyone could still create an account. Stop the account from being created
at all.

```sql
create table if not exists public.allowed_emails (
  email    text primary key check (email = lower(email)),
  note     text,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

-- Seed the owner. In a new project there are no accounts yet, so without this line the owner is
-- locked out. Use the Google account they'll sign in with, in lowercase.
insert into public.allowed_emails (email, note) values ('<owner-email>', 'owner')
on conflict (email) do nothing;

-- "Am I on the list?" for the caller only. It lives in a schema the API doesn't serve, so there's
-- no /rpc endpoint (in public, the advisor flags it as callable by signed-in users).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create or replace function private.is_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.allowed_emails
                 where email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
$$;
revoke all on function private.is_allowed() from public, anon;
grant execute on function private.is_allowed() to authenticated, service_role;

-- No account for unlisted addresses (email and OAuth sign-ups alike).
create or replace function public.guard_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Not on the list.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
revoke all on function public.guard_signup() from public, anon, authenticated;
create trigger guard_signup before insert on auth.users
  for each row execute function public.guard_signup();

-- Each person may see their own row only, so the page can sign out anyone who isn't listed.
create policy "allowed_emails_select_own" on public.allowed_emails for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
```

If the project already had accounts before Bodega (which only happens if they ignored "Use a
dedicated project"), seed them instead of locking them out:
`insert into public.allowed_emails (email, note) select lower(email), 'existing account' from auth.users where email is not null on conflict (email) do nothing;`
In a shared project this admits every user of the other app; ask first.

Three layers keep it friends-only:
1. **New accounts:** the trigger refuses unlisted addresses.
2. **Every read, write and AI call:** RLS and the Edge Function check the list each time, so removing
   someone takes effect at once.
3. **The page:** right after sign-in it reads the person's own row and signs them out if it's
   missing (see https://kvendrik.com/bodega/llms/page.md).

A Google sign-in for an address that already has an account (from email sign-in, say) is linked to
that account, so the trigger doesn't fire and nobody is locked out.

## Policies

```sql
create policy "notes_select_own" on public.notes for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed()));
create policy "notes_insert_own" on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_allowed()));
create policy "notes_update_own" on public.notes for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed()))
  with check (user_id = (select auth.uid()) and (select private.is_allowed()));
create policy "notes_delete_own" on public.notes for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.is_allowed()));
```

To change existing policies later, use `alter policy ... using (...) with check (...)`, never drop
and create, so there's no moment without one.

## A cap per person

Without it, one account can fill a free database.

```sql
create or replace function public.notes_enforce_cap()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));   -- no racing past it
  if (select count(*) from public.notes where user_id = new.user_id) >= 100 then
    raise exception 'The shelf is full. Throw something out first.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger notes_enforce_cap before insert on public.notes
  for each row execute function public.notes_enforce_cap();
revoke all on function public.notes_enforce_cap() from public, anon, authenticated;
```

## What the advisors say afterwards

- `unused_index` (INFO) on a new table: expected until there's data. Keep the index.
- `auth_leaked_password_protection` (WARN): not relevant, since there are no passwords.
- Anything else: report it and offer a fix. Don't apply schema changes the person didn't ask for.

Test every policy and trigger before moving on: see "The database" in
https://kvendrik.com/bodega/llms/testing.md.

Reference copies of the applied SQL:
https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/schema.sql and
https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/allowlist.sql.
Those are the reference install's history; follow this file, not them, for a new install.
