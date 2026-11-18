---
name: bodega
description: Build a static web page where people sign in with an emailed magic link and read their own row from a Supabase database, hosted free on GitHub Pages. Use when someone wants sign-in plus per-user data on a static site, with no server and no paid developer accounts.
---

# Bodega: magic-link sign-in, one value from the database

A single static HTML page. A visitor types their email, clicks the link Supabase sends them,
and lands back on the page signed in, looking at a value from the database that only they can
see. There is no server: Supabase handles auth and data, and GitHub Pages serves the file.
Nothing here costs money or needs a paid developer account.

- Live reference: https://kvendrik.com/bodega/
- Full source (one file, copy it): https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/public/bodega/index.html
- Schema: https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/schema.sql

```
browser (static page on GitHub Pages)
  │  supabase-js, publishable key
  ├─► Supabase Auth: signInWithOtp(email) ──► email with a link
  │      link ──► Supabase verifies ──► redirect to the page, session in the URL hash
  └─► Supabase Postgres (row level security: each user reads only their own rows)
```

## Mistakes made on the first build, so you don't repeat them

Each of these cost the person a round trip. Read them before you start.

1. **Gave menu paths instead of links.** "Go to Authentication -> URL Configuration" made the person
   hunt and ask for links. Always send the direct dashboard link with their project ID, then the
   exact values. See "Links to give the human" below.
2. **Built for the wrong URL.** Planned around `<user>.github.io/<repo>/`, but the account had a
   custom domain (`CNAME`), so the real URL was `https://<domain>/<repo>/`. Check for a `CNAME`
   before you hand out any redirect URL.
3. **Started with Sign in with Apple.** It needs the paid Apple Developer Program and a secret that
   expires every 6 months; the person didn't want that. Start with magic links (free, nothing to
   register), and offer OAuth providers only if asked.
4. **Asked "should I push?" again and again.** Once the person has said to deploy, keep pushing to the
   branch that deploys. Ask once per session, not once per change.
5. **Assumed the connector could do everything.** The Supabase connector can't set auth URLs, and its
   secret form was paused, so the key had to be set by hand. Say up front which steps need the human
   and send their links in the same message.
6. **Guessed a URL I couldn't check.** I wrote an OpenRouter keys link from memory; the real one was
   different. Use links you have verified or the person gave you, and say when you couldn't check one.
7. **Broke `.gitignore` by appending.** The file had no trailing newline, so the new rule was glued
   onto the last one and silently stopped ignoring build output. Check for a final newline, then run
   `git status` after the build.
8. **Broke the phone layout with a later CSS override.** A desktop rule declared after a `@media`
   block overrode it. Put breakpoint overrides after the rules they change, and screenshot at 390px
   wide, checking for horizontal overflow.
9. **Shipped "done" without a real end-to-end test.** The sandbox couldn't reach the live site,
   Supabase functions or OpenRouter, so testing used stubbed responses. Say plainly what was and
   wasn't tested, and give the person the exact steps to check it live.
10. **Rule, not a mistake (keep it that way): no API keys in the page.** Any key in a static page is
    public. Keys belong in Edge Function secrets, typed in by the person, never pasted into chat.

## Links to give the human

Whenever the person has to do something in a dashboard, lead your message with a **direct link**
that includes their project or workspace ID. Never send a menu path ("Authentication -> URL
Configuration"). Put the exact values on the next lines: the field name, the value (or where to get
it), and the button. Add one line on why, and where to look if it fails. If a tool that was
supposed to do it for them fails (a form is paused, say), give the link in that same reply. Don't
guess URLs you can't check; when the person gives you a link, use theirs.

Replace `<ref>` with the Supabase project ref.

| Task | Link | What to enter |
| --- | --- | --- |
| Auth URL configuration | `https://supabase.com/dashboard/project/<ref>/auth/url-configuration` | Site URL: the final page URL. Redirect URLs: Add URL, the same address. Save both. |
| Edge Function secrets | `https://supabase.com/dashboard/project/<ref>/functions/secrets` | Name `OPENROUTER_API_KEY`, value the OpenRouter key, Save. Optional: `OPENROUTER_MODELS`. |
| OpenRouter keys | `https://openrouter.ai/workspaces/default/keys` | Create a key (it starts with `sk-or-`) and give it a credit limit. |
| Function logs | `https://supabase.com/dashboard/project/<ref>/functions/ask/logs` | Where OpenRouter errors show up. |
| SMTP (before real traffic) | `https://supabase.com/dashboard/project/<ref>/auth/smtp` | Any email provider's SMTP details. |
| Deploy runs | `https://github.com/<owner>/<repo>/actions` | Check the Pages deploy finished. |

### The reference install

| | |
| --- | --- |
| Live page | https://kvendrik.com/bodega/ (from `public/bodega/` in `kvendrik/kvendrik.github.io`; `kvendrik.github.io/bodega/` redirects here because of the account's `CNAME`) |
| Brand guide | https://kvendrik.com/bodega/brand/ |
| Supabase project | `Bodega`, ref `ukxogodszvwxzlfxlgtv`, eu-central-1 |
| Migrations | `create_notes_with_rls`, `notes_rls_select_auth_uid`, `ai_usage_quota` |
| Schema files | `bodega/supabase/schema.sql`, `bodega/supabase/ai_usage.sql` |
| Edge Function | `ask` (verify_jwt on), source in `bodega/supabase/functions/ask/index.ts` |
| AI limits | 20 questions per person per UTC day, 500 for the whole site |
| URL configuration | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/auth/url-configuration (Site URL and Redirect URL: `https://kvendrik.com/bodega/`) |
| Edge Function secrets | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/secrets |
| Function logs | https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/ask/logs |
| OpenRouter keys | https://openrouter.ai/workspaces/default/keys |
| Fonts | Allo, Instrument Serif and Space Mono, served from `public/bodega/fonts/`, copied from the Bodega brand guide |

## 0. Before you start

Ask for, or look up, these three things:
1. **The Supabase project.** Use `list_projects` and confirm the project ref with the person. People
   often have several projects. Never touch the others, and check every call's `project_id`.
2. **Where it will be hosted, and the final URL.** See step 3. The final URL is needed in step 4,
   and getting it wrong is the most common reason sign-in breaks.
3. **What you can and can't do in this session.** Find out early and tell the person up front:

| Step | Agent with Supabase and GitHub connectors | Needs the human |
| --- | --- | --- |
| Create the project, table and RLS | yes (`apply_migration`) | approving cost, for a new project |
| Run the advisors | yes (`get_advisors`) | |
| Write the page and push it | yes, to repos the session can reach | permission to push to `main` |
| Create a new GitHub repo | often not: sessions are commonly scoped to existing repos | creating the empty repo |
| Turn on GitHub Pages | not through the GitHub MCP tools | Settings -> Pages |
| Auth URL configuration | **no:** the Supabase MCP connector has no auth-config tool | Supabase dashboard, one screen |
| Third-party sign-in (Apple, Google, GitHub) | no | their developer consoles |
| AI: deploy the Edge Function, create the quota table | yes (`deploy_edge_function`, `apply_migration`) | |
| AI: store the OpenRouter key | **sometimes:** `create_edge_function_secret` opens a form for the human, and Supabase can pause it | Edge Functions -> Secrets |
| AI: spending limit on the key | no | openrouter.ai |

Never say you did a step you couldn't do. When you're blocked, give the exact link and the exact
values to enter (see step 4).

## 1. Database

Apply this as a migration (for example `create_notes_with_rls`). Wrap `auth.uid()` in
`(select ...)` so Postgres evaluates it once per query instead of once per row. The bare form
triggers the performance advisor's `auth_rls_initplan` warning.

```sql
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notes_insert_own" on public.notes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notes_update_own" on public.notes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes_delete_own" on public.notes
  for delete to authenticated using (user_id = (select auth.uid()));
```

- `user_id` defaults to `auth.uid()`, so the page inserts `{ body }` only and can't forge an owner.
- Run the **security** and **performance** advisors afterwards and report every finding, with
  its remediation link.
- Expect one INFO finding: `unused_index` on `notes_user_created_idx`. It shows up on an empty
  table. Keep the index; the page's query uses it.
- To fix existing policies, use `alter policy ... using (...) with check (...)`, not drop and
  create. Then there is no moment without a policy. Check the result with
  `select policyname, qual, with_check from pg_policies where tablename = 'notes'`.
- Apply no schema changes the person didn't ask for. Report advisor findings and offer fixes.
- Keep a copy of the SQL in the repo (`supabase/schema.sql`) and update it when a migration
  changes the database.

## 2. The page

One HTML file, with no build step. Copy the reference source and change only the URL, the key and
the copy. These parts matter:

### Client

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const sb = supabase.createClient("https://<ref>.supabase.co", "sb_publishable_...");
</script>
```

- Use the **publishable** key (`sb_publishable_...`, or the legacy `anon` key), which
  `get_publishable_keys` returns. It is meant to ship in the browser; row level security is what
  protects the data. Never put the `service_role` or secret key in a page.
- Keep the default (implicit) auth flow. The link then works even when it opens in a different
  browser from the one that asked for it, for example a phone's mail app. `flowType: "pkce"`
  breaks that.

### Sign in

```js
const { error } = await sb.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: location.origin + location.pathname },
});
```

- `emailRedirectTo` must match an entry in Supabase's Redirect URLs exactly, trailing slash
  included (step 4).
- Links that fail come back as `#error=...&error_description=...`. Read the hash, show the
  reason with "Send a new one.", then clear it with `history.replaceState`.
- Map errors into plain words:
  - Status 429, or a message containing "rate limit": "Too many links sent. Give it an hour."
  - "...after N seconds": "Try again in N seconds", and start a countdown.
  - "fetch" or "network": "No connection. Try again."

### Read and write

```js
// RLS returns only this user's rows, so no user filter is needed.
const { data, error } = await sb.from("notes").select("id, body, created_at")
  .order("created_at", { ascending: false }).limit(1).maybeSingle();

await sb.from("notes").insert({ body });   // user_id fills itself in
```

Set text with `textContent`, never `innerHTML`: the value is user input.

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

Without the guard, `onAuthStateChange` firing again (on a token refresh, say) would throw the
person off the "check your inbox" screen.

### The form: make it feel good

This is what makes the reference feel finished. Keep it.

- **Labels and attributes:** a visible label, then `type="email" inputmode="email"
  autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false"
  enterkeyhint="send" required`. Put `novalidate` on the form so your own messages replace the
  browser's bubbles.
- **Font size:** input text at 18px. Anything under 16px makes iOS zoom in on focus.
- **One block:** the input and button share one border and one hard shadow. `:focus-within`
  lifts the block (`translate(-3px,-3px)`, larger shadow). `:has(.btn:active)` presses it in
  (`translate(3px,3px)`, no shadow, 40ms).
- **Ready state:** the button stays outlined until the value matches
  `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`, then fills solid. Don't disable it: pressing it early should
  explain what's wrong.
- **Errors:** inline, in the hint line under the field (`aria-describedby`, `aria-invalid`). The
  border goes dashed, and the block shakes once (240ms, using the `translate` property so it
  doesn't fight the `transform` lift). The error clears when the person types.
- **Sending:** lock the input (`readOnly`), set `aria-busy`, and show "Sending" with three dots
  stepped in by `steps(4)`. Give the button a `min-width` so the label change doesn't make it
  jump.
- **Sent:** swap the form for a receipt showing the address (monospace, `overflow-wrap:anywhere`
  for long addresses), an "Open Gmail" style shortcut, "Resend in 60" counting down (tabular
  numbers), and "Use another email". Move focus to the receipt.
- **Inbox shortcuts:** match on the email's domain.

  | Domain | Button | Link |
  | --- | --- | --- |
  | gmail.com, googlemail.com | Open Gmail | https://mail.google.com/mail/u/0/#inbox |
  | outlook, hotmail, live, msn | Open Outlook | https://outlook.live.com/mail/ |
  | icloud.com, me.com, mac.com | Open iCloud Mail | https://www.icloud.com/mail |
  | proton.me, protonmail.com, pm.me | Open Proton Mail | https://mail.proton.me/ |
  | yahoo | Open Yahoo Mail | https://mail.yahoo.com/ |
  | fastmail | Open Fastmail | https://app.fastmail.com/ |

- **Remember the address:** save the last-used email in `localStorage` and prefill it. Wrap every
  storage call in try/catch, because private modes throw.
- **Motion:**
  - Easing: `cubic-bezier(0.23, 1, 0.32, 1)` everywhere.
  - Presses: 120ms, and 40ms while held.
  - Exits faster than entrances: the old view leaves in 90ms (opacity 0, scale .98), and the new
    one rises in over 300ms (from translateY 8px, scale .97, never from scale 0). Stagger its
    children by 40ms.
  - Animate `transform` and `box-shadow` only, never `transition: all`.
  - Wrap hover effects in `@media (hover:hover)`. Set `-webkit-tap-highlight-color: transparent`
    and `touch-action: manipulation` on buttons.
  - Turn all of it off under `prefers-reduced-motion: reduce`.
- **Phone layout:** under 420px, the button stacks under the input. Use
  `viewport-fit=cover` with `env(safe-area-inset-*)` padding.

## 3. Hosting on GitHub Pages

Choose one:
- **A new public repo** (`<user>/<repo>`). It must be public for free Pages. Turn on Pages from
  `main` at the root. The URL is `https://<user>.github.io/<repo>/`. If the session can't create
  repos, ask the person to create an empty one, then attach it.
- **A folder in an existing Pages site.** This works when you can't create repos. Before you do it:
  - Read the site's build script. Check that it doesn't delete or overwrite your folder. Some
    builds remove every `.html` file in the output directory.
  - Read `.gitignore`. Output folders often ignore `**/*.html`, so add a negation such as
    `!public/bodega/index.html`. When you append to the file, make sure it ends with a newline
    first, or your line gets joined onto the last rule and silently breaks it. Run
    `git check-ignore -v <file>` and `git status` after the build.
  - Keep notes and schema files out of the published folder unless they should be public.

**Custom domains:** if the account's `<user>.github.io` repo has a `CNAME` file, every Pages site on
that account is served from that domain, and `<user>.github.io/<repo>/` redirects there. The final
URL is then `https://<custom-domain>/<repo-or-folder>/`. Use that address in step 4.

Push to the working branch first. Push to `main`, which deploys, only once the person says so.
Then check that the deploy succeeded: list the Pages workflow runs, or the `pages-build-deployment`
run.

## 4. Supabase Auth URL configuration (human)

Give the person the direct link and the exact values:

- Link: `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`
  (or Authentication -> URL Configuration)
- **Site URL:** replace `http://localhost:3000` with the final page URL, e.g.
  `https://kvendrik.com/bodega/`, then Save.
- **Redirect URLs:** Add URL, enter the same address, then Save.

Keep the trailing slash in both. If the redirect URL doesn't match, Supabase quietly falls back to
the Site URL, so the link in the email opens `localhost:3000`. That's the classic symptom.

The email provider is on by default with "Confirm email" enabled, so nothing else needs switching
on. A new address gets "Confirm your signup" rather than the magic-link email, and either one
signs the person in.

## 5. Testing

**Before deploy, without sending real email:** use Playwright with the file opened directly.
Don't start a background server. Stub the network:

```js
// If the CDN is blocked, serve supabase-js from the npm package:
//   npm pack @supabase/supabase-js@2 && tar xzf supabase-supabase-js-*.tgz
await page.route("https://cdn.jsdelivr.net/**", r =>
  r.fulfill({ path: "package/dist/umd/supabase.js", contentType: "text/javascript" }));
await page.route("https://fonts.googleapis.com/**", r => r.abort());   // optional
await page.route("**/auth/v1/otp**", r =>                               // fake a slow send
  setTimeout(() => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }), 1200));
```

Then click Send with the field empty (expect the error and shake), type a valid address (the
button fills), and submit. Check the sending state, then the receipt with "Open Gmail" and
"Resend in 59". Screenshot each one. The only console error should be the request you aborted.
Test long addresses too.

**After deploy (human, or an agent with a real browser):**
1. The page loads and shows the signed-out panel with no console errors.
2. Send a link to a real address. The email arrives.
3. The link lands back on the page signed in, not on `localhost`.
4. Store a value. It shows with its row number.
5. Sign out, then sign in as someone else. The first person's value must not be visible.

## 6. Optional: AI through OpenRouter, without leaking the key

**The rule: an API key in a static page is a public key.** Anyone can open the source, copy it
and spend your credit. So the page never holds the OpenRouter key. A Supabase Edge Function holds
it, and the page talks only to that function.

```
page ──(signed-in user's session token)──► Edge Function "ask" ──(secret key)──► OpenRouter
                                                 │
                                                 └─ ai_take_quota(): one request off today's count
```

Every layer has its own guard:

| Layer | Guard |
| --- | --- |
| Key | Stored as an Edge Function secret (`OPENROUTER_API_KEY`). Never in the page, the repo or the chat. |
| Who | `verify_jwt: true`, and the function resolves the user from the session token. Signed-out callers get 401. |
| Where | The function only answers requests whose `Origin` is the site (`https://kvendrik.com`). |
| What | The server picks the model (a short fallback list), caps `max_tokens` (400) and the prompt (1000 characters), and sets the system prompt. The page sends only `{ prompt }`. |
| How much | 20 requests per user per UTC day, and 500 for the whole site per day, counted atomically in Postgres. A failed model call refunds the request. |
| Worst case | A credit limit on the OpenRouter key itself. This is the real backstop: anyone can make accounts, so per-user limits slow abuse but don't stop it. |

### The quota table

Clients can read their own count. They can't write it: there are no insert, update or delete
policies, and the quota functions are executable by `service_role` only.

```sql
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default ((now() at time zone 'utc')::date),
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- New count, null when this user is over p_limit, -1 when the whole site is over p_global_limit.
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

`on conflict ... do update ... where u.requests < p_limit` is what makes the limit hold under
parallel requests: when the row is already at the limit, the update doesn't happen and
`returning` gives null.

### The Edge Function

Deploy with `verify_jwt: true`. Full source: https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/bodega/supabase/functions/ask/index.ts. The shape is:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGINS = ["https://kvendrik.com"];
const MODELS = (Deno.env.get("OPENROUTER_MODELS") ?? "openai/gpt-4o-mini,google/gemini-2.0-flash-001")
  .split(",").map((m) => m.trim()).filter(Boolean).slice(0, 3);

Deno.serve(async (req) => {
  // 1. CORS preflight; reject anything not POST or not from ORIGINS.
  // 2. No OPENROUTER_API_KEY secret yet? 503 "We're closed."
  // 3. admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)   (both are set automatically)
  //    user = (await admin.auth.getUser(bearerToken)).data.user         otherwise 401
  // 4. prompt: a non-empty string of at most 1000 characters            otherwise 400 or 413
  // 5. used = await admin.rpc("ai_take_quota", { p_user: user.id, p_limit: 20, p_global_limit: 500 })
  //    null -> 429 "That's enough for today."   -1 -> 429 "We're closed for the day."
  // 6. POST https://openrouter.ai/api/v1/chat/completions with
  //    { models: MODELS, max_tokens: 400, messages: [system, user] }, a 30s timeout,
  //    and headers Authorization: Bearer <key>, HTTP-Referer: <site>, X-Title: Bodega
  // 7. Failure or empty answer: admin.rpc("ai_refund_quota"), then 502 or 504.
  // 8. 200 { answer, model, used, limit }
});
```

- `models` (plural) is OpenRouter's fallback routing: if the first model is unavailable it tries the
  next. Model IDs change over time, so make the list overridable with an `OPENROUTER_MODELS` secret
  rather than hard-coding a single ID.
- CORS must allow the headers supabase-js sends: `authorization, x-client-info, apikey, content-type`.
- Log OpenRouter errors with `console.error` (visible under Edge Functions -> Logs), but never send
  them to the browser, since they can describe your account.

### The page

```js
const { data, error } = await sb.functions.invoke("ask", { body: { prompt } });   // adds the session
if (error) {
  const body = await error.context.json().catch(() => null);   // { error, used?, limit? }
  // show "✕ " + body.error
} else {
  answerEl.textContent = data.answer;   // model output is untrusted: textContent, never innerHTML
}
// Remaining today (the browser may read its own row):
const { data: row } = await sb.from("ai_usage").select("requests")
  .eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
```

Treat the answer exactly like user input. A model can be talked into producing `<script>` or a fake
link, and `textContent` makes that harmless.

### Storing the key (human)

- Direct link: `https://supabase.com/dashboard/project/<ref>/functions/secrets`
- Name: `OPENROUTER_API_KEY`. Value: the key from https://openrouter.ai/workspaces/default/keys (starts
  with `sk-or-`). Save. The function reads it on every request, so no redeploy is needed.
- On openrouter.ai, give that key a **credit limit**.
- `create_edge_function_secret` shows the person a secure form instead. If it comes back
  `declined` (Supabase can pause it), give them the link and values above. Never ask for the key
  in chat.

### Testing it

- Without a key, the function answers 503 "We're closed.", which proves the route and CORS work.
- With the key: ask a question, and check that the count goes down and the answer appears.
- Signed out: calling the function directly must give 401.
- From another origin: 403.
- Quota: set `p_limit` to 1 temporarily, or check that the second request after the limit gets 429.

## Gotchas

- **Email limit:** Supabase's built-in mailer sends only a few emails per hour per project and is
  meant for testing. Before real traffic, add custom SMTP under Authentication -> Emails -> SMTP
  settings.
- **Links work once and expire** after 1 hour by default. Corporate email scanners can open the
  link before the person does, and the page then shows "Email link is invalid or has expired".
  The fix: add `{{ .Token }}` to the email template and ask for the 6-digit code with
  `verifyOtp({ email, token, type: "email" })`.
- **Resend cooldown:** Supabase refuses another link to the same address for about 60 seconds.
  Show a countdown instead of letting the request fail.
- **Sign in with Apple on the web needs the paid Apple Developer Program** ($99 a year), plus a
  client secret JWT that expires within 6 months. Google and GitHub sign-in are free, but each
  needs an OAuth app and a secret pasted into Supabase. Magic links need none of that, which is
  why this guide uses them.
- **An empty result while signed in** is normal for a new user. An RLS error on insert means
  `user_id` doesn't match `auth.uid()`; let the column default fill it in.
- **The `supabase-js@2` CDN URL** follows the latest 2.x release. For a page that must never
  change underneath you, pin an exact version.

## Done means

- The table and RLS are applied, the advisors have been run, and every finding is reported.
- The page is live at its final URL, and the deploy run succeeded.
- The person has the dashboard link and the exact Site URL and Redirect URL values, or has
  confirmed they're set.
- They know what isn't verified (for example, if you couldn't load the live page) and how to
  check it: the five steps under "After deploy".
- Nothing was done to other projects, and no schema changes were made beyond what was asked.
- If AI was added: no API key appears in the page, the repo or the chat. The function is deployed
  with `verify_jwt: true`, the quota functions are `service_role` only, and the person knows to set
  a credit limit on the key.

## Bodega look and voice (if you reuse the brand)

- Strictly black and white, with no accent colour. Dark (white on black) is the default:
  `color-scheme: dark` and `<meta name="theme-color" content="#000000">`.
- Instrument Serif for display, Allo for text, Space Mono for small receipts and hints.
- Square corners, 3px borders, hard drop shadows (`3px 3px 0 0`, and `6px 6px 0 0` when lifted)
  and a double-rule frame on panels. No header: the panel is the page. The footer fades in after 1s.
- Sentence case for text. ALL CAPS tracked labels (`letter-spacing: .18em`) for buttons and labels.
- No emoji and no exclamation marks. Deadpan: "Who sent you?", "Send link", "Done.",
  "Nothing on the shelf.", "Too many links sent. Give it an hour."
