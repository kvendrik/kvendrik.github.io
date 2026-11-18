---
name: bodega
description: Build a static web page where friends sign in with an emailed magic link, read and write their own rows in a Supabase database, and optionally ask an AI model through OpenRouter without exposing the key. Hosted free on GitHub Pages. Use when someone wants sign-in plus per-user data (and maybe AI) on a static site, with no server of their own and no paid developer accounts.
---

# Bodega: magic-link sign-in, your own row, friends only

A single static HTML page. A visitor types their email, clicks the link Supabase sends them, and
lands back on the page signed in, looking at a value from the database that only they can see.
Only addresses on an allow-list can get in. Optionally, they can ask an AI model a question; the
API key stays on the server. There is no server of your own: Supabase handles auth, data and the
one server function, and GitHub Pages serves the file. Nothing here needs a paid account.

- Live reference: https://kvendrik.com/bodega/
- Full page source (one file): https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/public/bodega/index.html
- SQL: https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/schema.sql,
  [`allowlist.sql`](https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/allowlist.sql),
  [`ai_usage.sql`](https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/ai_usage.sql)
- Edge Function: https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/functions/ask/index.ts

```
browser (static page on GitHub Pages, supabase-js served from the same site)
  │  publishable key + the user's session
  ├─► Supabase Auth: signInWithOtp(email) ──► allow-list trigger ──► email with a link
  │      link ──► Supabase verifies ──► redirect to the page, session in the URL hash
  ├─► Supabase Postgres (RLS: your own rows only, and only if you're on the list)
  └─► Edge Function "ask" (optional) ──(secret key)──► OpenRouter
```

## How to work with the person

These cost the first build the most round trips:

- **Act, don't ask.** Once they've said to build or deploy, keep going: apply, deploy, push to the
  branch that publishes. Ask only when something is truly theirs to decide (a schema change they
  haven't approved, a cost, which option they prefer) or when you're blocked.
- **Give links, not menu paths.** Every dashboard step starts with a direct link that includes
  their project or workspace ID, then the exact values: field, value, button. See "Links to give
  the human".
- **Say what you couldn't do, in the same message.** If a tool fails or a step needs their login,
  say so and give the link right there. Never claim a step you couldn't do.
- **Say what you couldn't test.** Sandboxes often can't reach the live site, Supabase Functions or
  OpenRouter. Say what was stubbed, and give them the exact steps to check it live.
- **Don't guess URLs.** Use links you've verified or that they gave you. When you can't open a
  third party's docs, say the menu names may differ.
- **Keep a durable record.** You won't remember the next session, so the repo is the memory: this
  file, plus the SQL and function source next to it.

## Mistakes made on the first build, so you don't repeat them

1. **Gave menu paths instead of links.** "Go to Authentication -> URL Configuration" made the person
   ask for links. Send the direct link with their project ID, then the values.
2. **Built for the wrong URL.** Planned around `<user>.github.io/<repo>/`, but the account had a
   custom domain (`CNAME`), so the real URL was `https://<domain>/<repo>/`. Check for a `CNAME`
   before handing out any redirect URL.
3. **Started with Sign in with Apple.** It needs the paid Apple Developer Program and a secret that
   expires every 6 months. Start with magic links; offer OAuth only if asked.
4. **Asked "should I push?" after every change.** Ask once; after a yes, keep deploying.
5. **Assumed the connector could do everything.** The Supabase connector can't set auth URLs or SMTP,
   and its secret form was paused, so those steps were manual. Say so up front, with links.
6. **Guessed a URL.** An OpenRouter keys link written from memory was wrong; the person's was
   `https://openrouter.ai/workspaces/default/keys`.
7. **Broke `.gitignore` by appending** to a file without a trailing newline: the new rule was glued
   onto the last one. Check for the newline, then `git status` after the build.
8. **Broke the phone layout** with a desktop rule declared after a `@media` block. Put breakpoint
   overrides last, and screenshot at 390px wide checking for horizontal overflow.
9. **Called it done without an end-to-end test.** Everything was tested against stubs. Say so, and
   hand over the live checklist.
10. **Hit Supabase's email limit on the very first test, and missed the bigger catch.** The built-in
    mailer sends **2 emails per hour for the whole project**, and it **only sends to members of the
    Supabase organization**, so friends get no email at all. I told the person "leave it, it's fine
    for a few friends", which was wrong. Custom SMTP is required before anyone else can sign in. See
    "Email".
11. **Left sign-ups open on an app for friends.** Anyone with an email could create an account,
    store rows and use the AI quota. For anything friends-only, build the allow-list from the start.
12. **Loaded supabase-js from a CDN with a floating version (`@2`).** A compromised package or CDN
    would run on the page and could steal sessions. Serve an exact build from the site.
13. **Echoed `error_description` from the URL.** Anyone can craft a link that puts their own text
    on your page. Show fixed messages only.
14. **Suggested an email provider that needs domain verification.** The person didn't want to add
    their domain anywhere. Lead with options that need no domain (see "Email").

## Links to give the human

Lead with the link, then the exact values on the next lines. Replace `<ref>` with the Supabase
project ref.

| Task | Link | What to enter |
| --- | --- | --- |
| Auth URL configuration | `https://supabase.com/dashboard/project/<ref>/auth/url-configuration` | Site URL: the final page URL. Redirect URLs: Add URL, the same address. Save both. |
| Add a friend | `https://supabase.com/dashboard/project/<ref>/sql/new` | `insert into public.allowed_emails (email, note) values ('friend@example.com', 'Sam');` then Run. Lowercase. They then sign in themselves. Remove, list and no-SQL options under "Managing the list". |
| Edge Function secrets | `https://supabase.com/dashboard/project/<ref>/functions/secrets` | Name `OPENROUTER_API_KEY`, value the OpenRouter key, Save. Optional: `OPENROUTER_MODELS`. |
| OpenRouter keys | `https://openrouter.ai/workspaces/default/keys` | Create a key (starts with `sk-or-`) and give it a credit limit. |
| Function logs | `https://supabase.com/dashboard/project/<ref>/functions/ask/logs` | Where OpenRouter errors show up. |
| SMTP | `https://supabase.com/dashboard/project/<ref>/auth/smtp` | **Required before friends can sign in** (the built-in mailer only reaches the Supabase organization). See "Email". |
| Email rate limit | `https://supabase.com/dashboard/project/<ref>/auth/rate-limits` | Raise "emails sent per hour" (only possible once custom SMTP is on). |
| Gmail app password | `https://myaccount.google.com/apppasswords` | For sending through Gmail. Needs 2-Step Verification. |
| Deploy runs | `https://github.com/<owner>/<repo>/actions` | Check the Pages deploy finished. |

### The reference install

| | |
| --- | --- |
| Live page | https://kvendrik.com/bodega/ (from `public/bodega/` in `kvendrik/kvendrik.github.io`; `kvendrik.github.io/bodega/` redirects here because of the account's `CNAME`) |
| Supabase project | `Bodega`, ref `ukxogodszvwxzlfxlgtv`, eu-central-1, free plan |
| Migrations | `create_notes_with_rls`, `notes_rls_select_auth_uid`, `ai_usage_quota`, `notes_per_user_cap`, `friends_allowlist`, `allowlist_private_schema` |
| SQL in the repo | `bodega/supabase/schema.sql` (notes and cap), `allowlist.sql`, `ai_usage.sql` |
| Edge Function | `ask` (verify_jwt on), source in `bodega/supabase/functions/ask/index.ts` |
| supabase-js | 2.118.0, served from `public/bodega/vendor/` with its MIT license |
| Limits | 100 rows per person; 20 AI questions per person per UTC day, 500 for the whole site |
| URL configuration | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/auth/url-configuration (Site URL and Redirect URL: `https://kvendrik.com/bodega/`) |
| Add a friend | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/sql/new |
| Edge Function secrets | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/secrets |
| Function logs | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/ask/logs |
| OpenRouter keys | https://openrouter.ai/workspaces/default/keys |

## 0. Before you start

Look up or ask:
1. **The Supabase project.** Use `list_projects` and confirm the ref. People often have several
   projects. Never touch the others, and check every call's `project_id`.
2. **The final URL.** Check for a `CNAME` (step 3). Sign-in breaks if this is wrong.
3. **Who it's for.** Friends only (build the allow-list) or anyone?
4. **What you can and can't do in this session**, and tell them up front:

| Step | Agent with Supabase and GitHub connectors | Needs the human |
| --- | --- | --- |
| Tables, RLS, triggers, allow-list | yes (`apply_migration`) | approving schema changes |
| Run the advisors, read logs | yes (`get_advisors`, `query_logs`) | |
| Write the page and push it | yes, to repos the session can reach | one yes to deploy |
| Create a new GitHub repo | often not: sessions are scoped to existing repos | creating the empty repo |
| Turn on GitHub Pages | not through the GitHub MCP tools | Settings -> Pages |
| Auth URL configuration, SMTP, rate limits | **no:** the connector has no auth-config tool | dashboard, links below |
| Third-party sign-in (Apple, Google, GitHub) | no | their developer consoles |
| Deploy the Edge Function | yes (`deploy_edge_function`) | |
| Store the OpenRouter key | **sometimes:** `create_edge_function_secret` opens a form for the human, and Supabase can pause it | Edge Functions secrets page |
| Spending limit on the key | no | openrouter.ai |

## 1. Database

Apply each block as a migration and keep a copy in the repo. After every migration, run the
**security** and **performance** advisors and report each finding with its remediation link.

### Rows

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
- Wrap `auth.uid()` in `(select ...)` in policies so it runs once per query, not once per row (the
  performance advisor flags the bare form as `auth_rls_initplan`).

### Friends only: the allow-list

RLS alone isn't enough: anyone can still create an account and get emails. Stop the account from
being created at all:

```sql
create table if not exists public.allowed_emails (
  email    text primary key check (email = lower(email)),
  note     text,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;   -- no policies: browsers can't see it

insert into public.allowed_emails (email, note)                 -- don't lock out existing accounts
select lower(email), 'existing account' from auth.users where email is not null
on conflict (email) do nothing;

-- "Am I on the list?" for the caller only. In a schema the API doesn't serve, so there's no
-- /rpc endpoint (in public, the advisor flags it as callable by signed-in users).
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

-- No account, and so no email, for unlisted addresses.
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
```

#### Managing the list (give the owner this, with their real links)

The owner only adds an address. The friend still creates their own account by signing in on the
page; until they're added, they see "Not on the list." and get no email.

- **Add:** open `https://supabase.com/dashboard/project/<ref>/sql/new`, paste, Run:
  `insert into public.allowed_emails (email, note) values ('friend@example.com', 'Sam');`
  The address must be lowercase (the table rejects capitals; sign-in matches either way). The note
  is optional.
- **Without SQL:** `https://supabase.com/dashboard/project/<ref>/editor`, pick `allowed_emails`, then
  Insert -> Insert row, type the email, Save.
- **Remove:** `delete from public.allowed_emails where email = 'friend@example.com';` They're
  locked out at once (RLS and the function check the list); their account stays.
- **See the list:** `select * from public.allowed_emails;`
- Then send the friend the page link. **This only works once custom SMTP is set up**: Supabase's
  built-in mailer doesn't send to anyone outside the Supabase organization (see "Email").

### Policies

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

To change existing policies, use `alter policy ... using (...) with check (...)`, never drop and
create, so there's no moment without one.

### A cap per person

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

### What the advisors will say afterwards

- `rls_enabled_no_policy` (INFO) on `allowed_emails`: intended. No policies means no browser access.
- `unused_index` (INFO) on a new table: expected until there's data. Keep the index.
- `auth_leaked_password_protection` (WARN): not relevant, since there are no passwords.
- Anything else: report it and offer a fix.

## 2. The page

One HTML file, with no build step. Copy the reference source and change only the URL, the key and
the copy.

### Client

```html
<!-- An exact supabase-js build served from your own site, not a CDN. -->
<script src="vendor/supabase-js-2.118.0.js"></script>
<script>
  const sb = supabase.createClient("https://<ref>.supabase.co", "sb_publishable_...");
</script>
```

- To vendor it: `npm pack @supabase/supabase-js@<version>` (pick one that's been out for at least
  two weeks), copy `package/dist/umd/supabase.js` to `vendor/supabase-js-<version>.js`, and keep
  its MIT `LICENSE` next to it.
- Use the **publishable** key (`sb_publishable_...` or the legacy `anon` key; `get_publishable_keys`
  returns it). It's meant to ship; RLS protects the data. Never put a `service_role` or secret key
  in a page.
- Keep the default (implicit) auth flow, so a link opened in another browser (a phone's mail app,
  say) still works. `flowType: "pkce"` breaks that.

### Sign in

```js
const { error } = await sb.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: location.origin + location.pathname },
});
```

- `emailRedirectTo` must match a Redirect URL exactly, trailing slash included (step 4).
- Map errors into your own words:
  - "Database error saving new user": the allow-list trigger. Show "Not on the list. Ask whoever
    sent you."
  - Status 429 or "rate limit": "Too many links sent. Give it an hour."
  - "...after N seconds": "Try again in N seconds", and start a countdown.
  - "fetch" or "network": "No connection. Try again."
- Links that fail come back as `#error=...&error_code=...&error_description=...`. **Never show
  `error_description`.** Map `error_code` (`otp_expired`: "That link has expired or was already
  used."; anything else: "That link didn't work."), add "Send a new one.", then clear the hash with
  `history.replaceState`.

### Read and write

```js
// RLS returns only this user's rows, so no user filter is needed.
const { data, error } = await sb.from("notes").select("id, body, created_at")
  .order("created_at", { ascending: false }).limit(1).maybeSingle();
await sb.from("notes").insert({ body });   // user_id fills itself in
```

- Set text with `textContent`, never `innerHTML`: the value is user input.
- An RLS error ("violates row-level security") for a signed-in user means they're not on the
  list: show "Not on the list."

### Session handling

```js
let current = null, rendered = false;
function render(session) {
  const id = session ? session.user.id : null;
  if (rendered && id === current) return;   // a token refresh must not reset the UI
  rendered = true; current = id;
  // show the loading, signed-out or signed-in state
}
sb.auth.onAuthStateChange((_e, s) => render(s));
sb.auth.getSession().then(({ data }) => render(data.session));
// The link usually opens in a new tab. Pick that session up when this tab comes back into view.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !current)
    sb.auth.getSession().then(({ data }) => data.session && render(data.session));
});
```

### The form: make it feel good

- **Labels and attributes:** a visible label, then `type="email" inputmode="email"
  autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false"
  enterkeyhint="send" required`, and `novalidate` on the form so your messages replace the
  browser's.
- **Font size:** input text at 18px. Under 16px, iOS zooms in on focus.
- **One block:** input and button share one border and one hard shadow. `:focus-within` lifts it
  (`translate(-3px,-3px)`, bigger shadow); `:has(.btn:active)` presses it in (`translate(3px,3px)`,
  no shadow, 40ms).
- **Ready state:** the button stays outlined until the value matches
  `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`, then fills. Don't disable it: pressing early should explain.
- **Errors:** inline under the field (`aria-describedby`, `aria-invalid`), dashed border, one
  240ms shake (on the `translate` property, so it doesn't fight `transform`). Clear on typing.
- **Sending:** `readOnly` input, `aria-busy`, "Sending" with three dots stepped in by `steps(4)`,
  and a `min-width` on the button so it doesn't jump.
- **Sent:** swap the form for a receipt with the address (monospace, `overflow-wrap:anywhere`), an
  "Open Gmail" style shortcut, "Resend in 60" counting down (tabular numbers) and "Use another
  email". Move focus to it.
- **Inbox shortcuts** by domain:

  | Domain | Button | Link |
  | --- | --- | --- |
  | gmail.com, googlemail.com | Open Gmail | https://mail.google.com/mail/u/0/#inbox |
  | outlook, hotmail, live, msn | Open Outlook | https://outlook.live.com/mail/ |
  | icloud.com, me.com, mac.com | Open iCloud Mail | https://www.icloud.com/mail |
  | proton.me, protonmail.com, pm.me | Open Proton Mail | https://mail.proton.me/ |
  | yahoo | Open Yahoo Mail | https://mail.yahoo.com/ |
  | fastmail | Open Fastmail | https://app.fastmail.com/ |

- **Remember the address** in `localStorage` (inside try/catch, since private modes throw) and
  prefill it.
- **Motion:** one curve, `cubic-bezier(0.23, 1, 0.32, 1)`. Presses 120ms, 40ms while held. Exits
  90ms (opacity 0, scale .98); entrances 300ms (from 8px and scale .97, never from 0), children 40ms
  apart. Animate `transform` and `box-shadow` only. Hover only under `@media (hover:hover)`;
  `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` on buttons. All of it
  off under `prefers-reduced-motion`.
- **Phone:** under 420px the button stacks under the input; `viewport-fit=cover` with
  `env(safe-area-inset-*)` padding.

## 3. Hosting on GitHub Pages

- **A new public repo** (`<user>/<repo>`). It must be public for free Pages. Pages from `main`, root.
  If the session can't create repos, have the person create an empty one, then attach it.
- **A folder in an existing Pages site.** This works when you can't create repos. First:
  - Read the build script: some builds delete every `.html` in the output folder.
  - Read `.gitignore`: output folders often ignore `**/*.html`, so add a negation such as
    `!public/bodega/index.html`. Make sure the file ends in a newline before you append. Then run
    `git check-ignore -v <file>` and `git status` after a build.
  - Keep SQL and notes out of the published folder unless they should be public.

**Custom domains:** if the account's `<user>.github.io` repo has a `CNAME`, every Pages site on the
account is served from that domain, and `<user>.github.io/<repo>/` redirects there. Use the final
URL everywhere.

Ask once whether to deploy. After that, push to the publishing branch and check the Pages workflow
run finished.

## 4. Supabase Auth URL configuration (human)

- Link: `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`
- **Site URL:** replace `http://localhost:3000` with the final page URL (e.g.
  `https://kvendrik.com/bodega/`), then Save.
- **Redirect URLs:** Add URL, the same address, then Save.

Keep the trailing slash. If the redirect doesn't match, Supabase falls back to the Site URL, so the
email link opens `localhost:3000`: the classic symptom.

The email provider and "Confirm email" are on by default. A new address gets "Confirm your signup"
rather than the magic-link email; either one signs them in.

## 5. Email

**Supabase's built-in mailer is for the owner only.** Since September 2024 it sends only to members
of the Supabase organization; anyone else gets `email_address_not_authorized` and no email. It also
sends at most **2 emails per hour for the whole project** (`over_email_send_rate_limit`).
`query_logs` on `auth_logs` shows both errors. So the owner can test, but **friends can't sign in
until custom SMTP is set up**. Say this before the first test, not after.
(Source: https://supabase.com/docs/guides/auth/auth-smtp and
https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider)

Options, for someone who won't touch DNS first:

1. **Send through their Gmail (no DNS, best deliverability of the no-DNS options).** Mail goes
   through Google's own servers, so it passes Gmail's sender checks (DMARC). Create an app password at
   `https://myaccount.google.com/apppasswords` (needs 2-Step Verification), then at
   `https://supabase.com/dashboard/project/<ref>/auth/smtp` turn on custom SMTP: sender = their Gmail
   address, host `smtp.gmail.com`, port `465`, username = their Gmail address, password = the app
   password. Raise the limit at `https://supabase.com/dashboard/project/<ref>/auth/rate-limits`.
   Gmail allows a few hundred messages a day. Send one test link afterwards; this route isn't in
   Supabase's docs.
2. **Brevo with a single verified sender (no DNS).** Brevo verifies one address by email instead of
   the domain. For free addresses like `@gmail.com` it swaps the sender to its own domain
   (`brevosend.com`), so recipients may see a "via" label. SMTP host `smtp-relay.brevo.com`, login
   = the Brevo account email plus an SMTP key.
3. **A service with domain verification** (Resend, Postmark, SES and the like). Best deliverability,
   but it needs DNS records on the domain. Ask first; some people don't want that.
4. **No email at all:** GitHub or Google sign-in. The allow-list still works on the account's email.
   Needs an OAuth app and a secret pasted into Supabase.

Don't suggest these:
- **SendGrid single-sender verification with a `@gmail.com` sender.** It isn't signed for gmail.com,
  so Gmail's DMARC checks reject it or send it to spam. SendGrid itself says it's for testing.
- **Resend without a domain.** `onboarding@resend.dev` only delivers to the Resend account's own
  address.
- **Adding friends to the Supabase organization** so the built-in mailer reaches them. That gives
  them access to the project.

Other email gotchas:
- **Links work once and expire after 1 hour.** Corporate scanners can open a link before the person
  does; the page then shows the expired message. Fix: add `{{ .Token }}` to the template and ask for
  the 6-digit code with `verifyOtp({ email, token, type: "email" })`.
- **Resend cooldown:** about 60 seconds per address. Show a countdown.

## 6. Optional: AI through OpenRouter, without leaking the key

**An API key in a static page is a public key.** So a Supabase Edge Function holds it, and the page
only talks to that function.

```
page ──(session token)──► Edge Function "ask" ──(secret key)──► OpenRouter
                              ├─ on the allow-list?
                              └─ ai_take_quota(): one request off today's count
```

| Layer | Guard |
| --- | --- |
| Key | Edge Function secret `OPENROUTER_API_KEY`. Never in the page, the repo or the chat. |
| Who | `verify_jwt: true`; the function resolves the user from the token (401 if none) and checks `allowed_emails` (403 "Not on the list."). |
| Where | Only answers `Origin: https://<site>`. A script can fake this; it only stops other websites. |
| What | The server picks the models (a fallback list), caps `max_tokens` (400) and the prompt (1000 characters), and owns the system prompt. The page sends `{ prompt }` only. |
| How much | 20 per person per UTC day, 500 for the whole site, counted atomically. Failed calls are refunded. |
| Worst case | A credit limit on the OpenRouter key. This is the real backstop. |

### The quota

```sql
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default ((now() at time zone 'utc')::date),
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));   -- read own count; no writes

-- New count; null when this user is at p_limit; -1 when the whole site is at p_global_limit.
create or replace function public.ai_take_quota(p_user uuid, p_limit integer, p_global_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date; v_count integer;
begin
  if (select coalesce(sum(requests), 0) from public.ai_usage where day = v_today) >= p_global_limit then
    return -1;
  end if;
  insert into public.ai_usage as u (user_id, day, requests) values (p_user, v_today, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1 where u.requests < p_limit
  returning u.requests into v_count;
  return v_count;
end; $$;

create or replace function public.ai_refund_quota(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage set requests = greatest(requests - 1, 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.ai_take_quota(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.ai_refund_quota(uuid) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid, integer, integer) to service_role;
grant execute on function public.ai_refund_quota(uuid) to service_role;
```

`on conflict ... do update ... where u.requests < p_limit` is what holds under parallel requests:
at the limit the update doesn't happen, and `returning` gives null.

### The function

Deploy with `verify_jwt: true`. Full source is linked at the top. The shape:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGINS = ["https://<site>"];
const MODELS = (Deno.env.get("OPENROUTER_MODELS") ?? "openai/gpt-4o-mini,google/gemini-2.0-flash-001")
  .split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3);

Deno.serve(async (req) => {
  // 1. CORS preflight; reject anything not POST or not from ORIGINS.
  // 2. No OPENROUTER_API_KEY secret? 503 "We're closed."
  // 3. admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)   (both set automatically)
  //    user = (await admin.auth.getUser(bearerToken)).data.user         otherwise 401
  // 4. allowed_emails has lower(user.email)?                             otherwise 403
  // 5. prompt: non-empty, at most 1000 characters                        otherwise 400 / 413
  // 6. used = await admin.rpc("ai_take_quota", { p_user: user.id, p_limit: 20, p_global_limit: 500 })
  //    null -> 429 "That's enough for today."   -1 -> 429 "We're closed for the day."
  // 7. POST https://openrouter.ai/api/v1/chat/completions
  //    { models: MODELS, max_tokens: 400, messages: [system, user] }, 30s timeout,
  //    headers Authorization: Bearer <key>, HTTP-Referer: <site>, X-Title: <name>
  // 8. Failure or empty answer: admin.rpc("ai_refund_quota"), then 502 / 504.
  // 9. 200 { answer, model, used, limit }
});
```

- `models` (plural) is OpenRouter's fallback list. Model IDs go stale, and a sandbox often can't
  check OpenRouter's list, so make it overridable with an `OPENROUTER_MODELS` secret and tell the
  person the default list is unverified.
- CORS must allow `authorization, x-client-info, apikey, content-type` (what supabase-js sends).
- Log OpenRouter errors with `console.error` (they show in the function's logs); never send them
  to the browser.

### The page

```js
const { data, error } = await sb.functions.invoke("ask", { body: { prompt } });   // adds the session
if (error) {
  const body = await error.context.json().catch(() => null);   // { error, used?, limit? }
  // show "✕ " + body.error
} else {
  answerEl.textContent = data.answer;   // model output is untrusted: textContent, never innerHTML
}
const { data: row } = await sb.from("ai_usage").select("requests")   // remaining today
  .eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
```

### Storing the key (human)

- `https://supabase.com/dashboard/project/<ref>/functions/secrets`: name `OPENROUTER_API_KEY`, value
  from `https://openrouter.ai/workspaces/default/keys`, then Save. No redeploy needed.
- Put a **credit limit** on that key at OpenRouter.
- `create_edge_function_secret` shows a secure form instead. If it comes back `declined` (Supabase
  can pause it), give the link above in the same message. Never take a key in chat.

## 7. Testing

### The database, without real users

Pretend to be a signed-in user inside a transaction, then roll it all back. This is how every policy
and trigger here was verified:

```sql
begin;
create temp table results (test text, outcome text) on commit drop;
grant all on results to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<a real user id>","role":"authenticated","email":"<their email>"}';
insert into public.notes (body) values ('test');                       -- listed user: should work
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

The same pattern covers: the 101st row being refused, an `insert into auth.users` for an unlisted
address failing with "Not on the list.", and a listed one (mixed case) succeeding. Afterwards,
check that no test rows were left behind.

### The page, without sending email

Playwright on the file directly (no background server). Stub the network:

```js
await page.route("https://fonts.googleapis.com/**", r => r.abort());   // optional
await page.route("**/auth/v1/otp**", r =>                               // fake a slow send
  setTimeout(() => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }), 1200));
```

- Signed out: send with the field empty (error and shake), type an address (button fills), submit
  (sending, then the receipt with "Open Gmail" and "Resend in 59").
- Signed in: put a fake session in `localStorage` under `sb-<ref>-auth-token` with `addInitScript`,
  and stub `**/rest/v1/notes**`, `**/rest/v1/ai_usage**` and `**/functions/v1/ask`, including a
  429 answer.
- Crafted links: open `#error=access_denied&error_code=otp_expired&error_description=<your text>` on
  a fresh page and check that your text never appears.
- Screenshot at 390px and desktop, and check `scrollWidth - innerWidth` is 0.

### Live (human, or an agent that can reach the site)

1. The page loads, with no console errors.
2. A listed address gets a link; an unlisted one sees "Not on the list." and gets no email.
3. The link lands back signed in, not on `localhost`.
4. Store a value; it shows with its row number.
5. A second listed account can't see the first one's value.
6. Ask a question: an answer appears and the count drops by one.

## Security checklist for a small app among friends

- [ ] Allow-list on, sign-up trigger in place, existing accounts seeded.
- [ ] RLS on every table; policies check ownership and the allow-list.
- [ ] Row cap per person.
- [ ] No secret keys in the page; the OpenRouter key is an Edge Function secret with a credit limit.
- [ ] Quota functions executable by `service_role` only.
- [ ] supabase-js served from the site at an exact version.
- [ ] No text from the URL or from the model is ever rendered as HTML, or shown at all for
      `error_description`.
- [ ] Advisors run and every finding explained.

Known and accepted at this scale (tell the person):
- **Shared origin.** If the page lives on a bigger site, every page on that domain can read the
  session in `localStorage`. A subdomain fixes it.
- **Google Fonts** sees visitors' IP addresses. Serve the fonts yourself to avoid it.
- **The owner can read everything** in the dashboard. Tell friends.
- **Free Supabase projects pause** after about a week without activity; resume them in the
  dashboard.

## Done means

- Tables, policies, allow-list and cap applied; advisors run; every finding reported.
- The page is live at its final URL, and the deploy run succeeded.
- The person has the direct links and exact values for every manual step, or has confirmed them.
- The person knows how to add a friend (link and ready-to-run SQL).
- What wasn't tested live is stated, with the live checklist.
- Nothing was done to other projects; no schema changes beyond what was asked.
- If AI was added: no key in the page, repo or chat; `verify_jwt: true`; quota functions
  `service_role` only; credit limit set on the key.
