# Bodega reference: managing users

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Hand this to the owner at the end
(**Runbook step 10**), with their real `<ref>` and `<page-url>` filled in.

Everything runs in the SQL editor: `https://supabase.com/dashboard/project/<ref>/sql/new`. Paste,
then click **Run**. An agent with the Supabase connector can run the same SQL with `execute_sql`,
but only when the owner asks.

**How it works:** the owner puts an address on the list; the friend creates their own account by
signing in on the page. Nobody creates accounts for anyone. Until they're on the list, they see
"Not on the list." and no account is created.

## Add a friend

```sql
insert into public.allowed_emails (email, note) values ('friend@example.com', 'Sam');
```
- Lowercase only (the table rejects capitals; sign-in matches either way). `note` is optional.
- Use the address of their **Google account**. If they pick another account on Google's screen,
  they'll see "Not on the list.".
- Then send them `<page-url>`.
- Without SQL: `https://supabase.com/dashboard/project/<ref>/editor`, table `allowed_emails`, then
  Insert -> Insert row, type the email, Save.

## See who's on the list, and who has signed in

```sql
select a.email, a.note, a.added_at, u.created_at as joined, u.last_sign_in_at
from public.allowed_emails a
left join auth.users u on lower(u.email) = a.email
order by a.added_at;
```
A blank `joined` means they're on the list but haven't signed in yet.

## Remove a friend (they lose access, their data stays)

```sql
delete from public.allowed_emails where email = 'friend@example.com';
```
Takes effect at once: the page signs them out, and the database and AI refuse them. Add them back
and everything is still there.

## Delete a friend completely (account and everything they stored)

1. Remove them from the list (above).
2. `https://supabase.com/dashboard/project/<ref>/auth/users`: find them, then Delete user. Their rows
   and AI usage go with the account (`on delete cascade`). This can't be undone.

## AI usage today, per person

```sql
select u.email, a.requests from public.ai_usage a join auth.users u on u.id = a.user_id
where a.day = (now() at time zone 'utc')::date order by a.requests desc;
```

## Give someone their AI questions back for today

```sql
delete from public.ai_usage
where day = (now() at time zone 'utc')::date
  and user_id = (select id from auth.users where lower(email) = 'friend@example.com');
```

## Change someone's address

They switched Google accounts: add the new address, then remove the old one. Their stored data
belongs to the old account. To keep it, the agent can move the rows to the new account's `user_id`
after they've signed in once with it; ask the owner first.

## Change the limits

- Row cap: `100` in `public.notes_enforce_cap()` (re-run that `create or replace function` with a
  new number).
- AI: `PER_USER_PER_DAY` and `SHOP_PER_DAY` at the top of the Edge Function. Redeploy after
  changing them.

All of the SQL above was run against a live project on 2026-11-18 (the data-changing parts in a
rolled-back transaction).
