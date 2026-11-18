---
name: bodega
description: Build a static web page where people sign in with Apple and read their own row from a Supabase database, hosted free on GitHub Pages. Use when someone wants "Sign in with Apple" plus per-user data on a static site with no server of their own.
---

# Bodega: Sign in with Apple, one value from the database

A single static HTML page. A visitor signs in with their Apple ID, and the page shows them a value
from the database that only they can see. There is no server: Supabase handles auth and data,
GitHub Pages serves the file.

Reference implementation: https://kvendrik.com/bodega/ (view source; it is one file).

## What you are building

```
browser (static page on GitHub Pages)
  │  supabase-js, publishable key
  ├─► Supabase Auth ──► Apple ──► back to Supabase callback ──► back to the page with a session
  └─► Supabase Postgres (table with row level security: each user reads only their own rows)
```

- **Supabase:** a project, one table, row level security, the Apple provider.
- **Apple Developer** (paid program): an App ID, a Services ID, a Sign in with Apple key.
- **GitHub Pages:** serves `index.html`. No build step needed.

## Who can do which step

Agents can usually do the database, the page and the deploy. Some steps need a human's
dashboard login. Say which ones up front, and don't claim you did them.

| Step | Agent with a Supabase/GitHub connector | Needs the human |
| --- | --- | --- |
| Create project, table, RLS | yes (migration) | |
| Write and deploy the page | yes | turning on Pages, if no API access |
| Auth URL configuration | usually not: MCP connectors expose no auth-config tool | Supabase dashboard |
| Apple Services ID, key | no | Apple Developer account |
| Apple provider + client secret | no | Supabase dashboard |

## 1. Database

Run as a migration (for example `create_notes_with_rls`). Wrap `auth.uid()` in `(select ...)` so
Postgres evaluates it once per query instead of once per row; the Supabase performance advisor
flags the bare form (`auth_rls_initplan`).

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

Afterwards, run the security and performance advisors and report every finding.

## 2. The page

Load supabase-js from a CDN and create a client with the project URL and the **publishable**
key (`sb_publishable_...`, or the legacy `anon` key). That key is meant to ship in the browser:
row level security is what protects the data. Never put the `service_role` / secret key in a page.

The core of it:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const sb = supabase.createClient("https://<ref>.supabase.co", "sb_publishable_...");

  // Sign in: Apple redirects back to wherever the page was loaded from.
  signInButton.onclick = () => sb.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: location.origin + location.pathname },
  });

  // Read: no user filter needed, RLS returns only this user's rows.
  async function loadValue() {
    const { data, error } = await sb.from("notes").select("id, body, created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    // show data.body, or an empty state
  }

  // Write: user_id defaults to auth.uid() in the table.
  await sb.from("notes").insert({ body });

  sb.auth.onAuthStateChange((_e, session) => render(session));
  sb.auth.getSession().then(({ data }) => render(data.session));
</script>
```

Render three states: loading, signed out (the Apple button), signed in (the value, a field to
store a new one, sign out). Set text with `textContent`, never `innerHTML`, since the value
is user input.

## 3. Deploy to GitHub Pages

- A project repo (`<user>/<repo>`) must be **public** for free Pages. Turn on Pages from `main`,
  root, or deploy with a Pages workflow.
- It can also live in a folder of an existing Pages site (`public/bodega/` here). Check the site's
  build doesn't wipe the folder, and that `.gitignore` doesn't ignore the HTML.
- **Custom domains:** if the user's `<user>.github.io` repo has a `CNAME`, every Pages site of
  that account is served from that domain, and `<user>.github.io/<repo>/` redirects there. Use the
  final address (here `https://kvendrik.com/bodega/`) everywhere below, or sign-in will bounce.
- Load the live URL in a browser: the signed-out panel must appear, with no console errors.

## 4. Supabase Auth URL configuration (human)

Authentication -> URL Configuration:
- Site URL: the live page URL, e.g. `https://kvendrik.com/bodega/`
- Redirect URLs: add the same URL. `redirectTo` must match an entry here exactly.

## 5. Apple Developer (human, paid program)

1. Identifiers -> App IDs: create one with Sign in with Apple enabled.
2. Identifiers -> Services IDs: create one, e.g. `com.example.bodega.web`. This is the **client ID**.
   Turn on Sign in with Apple, then Configure:
   - Primary App ID: the one above
   - Domains: `<ref>.supabase.co`
   - Return URLs: `https://<ref>.supabase.co/auth/v1/callback`
3. Keys: create a key with Sign in with Apple, download the `.p8` (once only), note the Key ID
   and the Team ID.

The return URL is Supabase's callback, not the page. Apple hands the user to Supabase, and
Supabase sends them on to the page.

## 6. Connect Apple to Supabase (human)

Authentication -> Providers -> Apple: enable it, set Client IDs to the Services ID, and paste a
client secret: a JWT signed with the `.p8` (Team ID, Key ID, Services ID). Supabase's Apple auth
docs have a generator.

**The secret expires after at most 6 months.** Sign-in stops working when it does. Offer to set
a calendar reminder a couple of weeks before.

## Gotchas

- Apple sends the name and email only on the **first** sign-in. Store them then if you need them.
- "Hide My Email" gives an `@privaterelay.appleid.com` address. Show it as is.
- A sign-in that returns to the page with `?error=` in the URL usually means the redirect URL
  isn't in Supabase's list, or the Apple return URL or domain doesn't match.
- Empty results while signed in are normal for a new user. An RLS policy failure on insert means
  `user_id` doesn't match `auth.uid()`; let the column default fill it in.
- Never apply schema changes the person didn't ask for. Report advisor findings instead.

## Bodega look and voice (if you reuse the brand)

- Strictly black and white. No accent colour. Dark mode swaps them.
- Instrument Serif for display, Allo for text, Space Mono for small receipts.
- Square corners, 3px borders, hard drop shadows (`6px 6px 0 0`), a striped awning on top.
- Sentence case for text. ALL CAPS tracked labels for buttons.
- No emoji, no exclamation marks. Deadpan: "Done.", "Nothing on the shelf.", "Who sent you?"
