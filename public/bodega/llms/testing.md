# Bodega reference: testing

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used after **Runbook steps 3, 4, 8
and 9**.

## The database, without real users (after Runbook step 3)

Pretend to be a signed-in user inside a transaction, then roll everything back. Every policy and
trigger in the reference install was verified this way.

```sql
begin;
create temp table results (test text, outcome text) on commit drop;
grant all on results to authenticated, anon;
-- Use an existing user id if there is one; otherwise any UUID (RLS only compares it to user_id).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"<owner-email>"}';
insert into public.notes (user_id, body) values ('00000000-0000-4000-8000-000000000001', 'test');
insert into results values ('listed insert', 'ok');
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","email":"stranger@example.com"}';
do $$ begin
  begin insert into public.notes (user_id, body) values ('11111111-1111-4111-8111-111111111111', 'x');
        insert into results values ('stranger insert', 'ALLOWED (bad)');
  exception when others then insert into results values ('stranger insert', 'blocked'); end;
end $$;
reset role;
select * from results;
rollback;
```

In a new project there's no auth user yet, so the `insert into public.notes` above fails its foreign
key. Put a throwaway user right after `begin;` (before `set local role`):
`insert into auth.users (instance_id, id, aud, role, email) values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', '<owner-email>');`
It passes the sign-up trigger because the owner is seeded, and it's rolled back with everything
else. If the owner has already signed in, the email is taken: use their real `id` from `auth.users`
instead and skip this line. (This exact block was run against a live project on 2026-11-18.)

Cover these with the same pattern:
- The owner can insert and read; a stranger is blocked.
- The 101st row for one person is refused ("The shelf is full.").
- `insert into auth.users` for an unlisted address fails with "Not on the list."; a listed one
  (mixed case) succeeds.
- `select count(*) from public.allowed_emails`: the owner sees 1 row (their own), a stranger and
  `anon` see 0.

Afterwards, check that no test rows were left behind.

## The page, with Supabase stubbed (after Runbook step 4)

Playwright on the file directly (no background server), with the network stubbed. Nothing reaches
Google or Supabase.

```js
await page.route("https://fonts.googleapis.com/**", r => r.abort());   // optional
await page.route("**/auth/v1/authorize**", r => {                       // Google sign-in start
  console.log(new URL(r.request().url()).searchParams.get("provider"));  // expect "google"
  r.fulfill({ status: 200, body: "stub" });
});
```

- **Signed out:** the Google button calls `authorize` with `provider=google` and the right
  `redirect_to`.
- **Signed in:** put a fake session in `localStorage` under `sb-<ref>-auth-token` with
  `addInitScript`, and stub `**/rest/v1/notes**`, `**/rest/v1/ai_usage**`,
  `**/rest/v1/allowed_emails**` and `**/functions/v1/ask` (including a 429 with
  `code: "user_limit"`).
- **Not listed:** stub `allowed_emails` to return `[]`. Expect the page to sign out and show "Not on
  the list."; return the row and check it stays signed in.
- **Crafted errors:** open
  `?error=server_error&error_description=Database+error+saving+new+user#error_description=<your text>`
  on a fresh page. Expect "Not on the list.", with your text never shown and the URL cleaned.
- **Layout:** screenshot at 390px and desktop, and check `scrollWidth - innerWidth` is 0.

## Live (Runbook steps 8 and 9; the human, or an agent that can reach the site)

1. The page loads with no console errors.
2. The owner's Google account gets in; an unlisted one comes back to "Not on the list.".
3. It lands back on the page signed in, not on `localhost`.
4. Store a value; it shows with its row number.
5. A second listed account can't see the first one's value.
6. Ask a question: an answer appears and the count drops by one.
