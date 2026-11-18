---
name: bodega
description: Build a static web page where people sign in with an emailed magic link and read their own row from a Supabase database, hosted free on GitHub Pages. Use when someone wants sign-in plus per-user data on a static site, with no server and no paid developer accounts.
---

# Bodega: magic-link sign-in, one value from the database

A single static HTML page. A visitor types their email, clicks the link Supabase sends them,
and lands back on the page signed in, looking at a value from the database that only they can
see. There is no server: Supabase handles auth and data, GitHub Pages serves the file.
Nothing here costs money or needs a third-party developer account.

Reference implementation: https://kvendrik.com/bodega/ (view source; it is one file).

## What you are building

```
browser (static page on GitHub Pages)
  │  supabase-js, publishable key
  ├─► Supabase Auth: signInWithOtp(email) ──► email with a link
  │      link ──► Supabase verifies ──► redirect to the page with a session in the URL hash
  └─► Supabase Postgres (table with row level security: each user reads only their own rows)
```

## Who can do which step

| Step | Agent with Supabase and GitHub connectors | Needs the human |
| --- | --- | --- |
| Create the project, table and RLS | yes (migration) | |
| Write and deploy the page | yes | turning on Pages, if there's no API access |
| Auth URL configuration | usually not: MCP connectors have no auth-config tool | Supabase dashboard, one screen |

Say up front which steps the human has to do, and never claim you did them.

## 1. Database

Run as a migration (for example `create_notes_with_rls`). Wrap `auth.uid()` in `(select ...)` so
Postgres evaluates it once per query instead of once per row. The Supabase performance advisor
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
row level security is what protects the data. Never put the `service_role` or secret key in a page.

The core of it:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const sb = supabase.createClient("https://<ref>.supabase.co", "sb_publishable_...");

  // Sign in: email a link that returns to wherever this page was loaded from.
  emailForm.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({
      email: emailInput.value.trim(),
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    // on success: "Check your inbox."
  };

  // A bad or expired link comes back as #error=...&error_description=...
  const back = new URLSearchParams(location.hash.slice(1));
  if (back.get("error_description")) { /* show it, then clear the hash */ }

  // Read: no user filter needed, RLS returns only this user's rows.
  async function loadValue() {
    const { data, error } = await sb.from("notes").select("id, body, created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    // show data.body, or an empty state
  }

  // Write: user_id defaults to auth.uid() in the table.
  await sb.from("notes").insert({ body });

  // supabase-js picks the session up from the URL on load.
  sb.auth.onAuthStateChange((_e, session) => render(session));
  sb.auth.getSession().then(({ data }) => render(data.session));
</script>
```

Show three states: loading, signed out (the email form), and signed in (the value, a field to
store a new one, sign out). Set text with `textContent`, never `innerHTML`, since the value
is user input.

## 3. Deploy to GitHub Pages

- A project repo (`<user>/<repo>`) must be **public** for free Pages. Turn on Pages from `main`,
  root, or deploy with a Pages workflow.
- It can also live in a folder of an existing Pages site (`public/bodega/` here). Check that the
  site's build doesn't wipe the folder and that `.gitignore` doesn't ignore the HTML.
- **Custom domains:** if the user's `<user>.github.io` repo has a `CNAME`, every Pages site on that
  account is served from that domain, and `<user>.github.io/<repo>/` redirects there. Use the
  final address (here `https://kvendrik.com/bodega/`) in step 4, or the link will bounce.
- Load the live URL in a browser: the signed-out panel must appear, with no console errors.

## 4. Supabase Auth URL configuration (human, one screen)

Authentication -> URL Configuration:
- Site URL: the live page URL, e.g. `https://kvendrik.com/bodega/`
- Redirect URLs: add the same URL.

`emailRedirectTo` must match a Redirect URL entry. If it doesn't, Supabase quietly sends the user
to the Site URL instead, which defaults to `http://localhost:3000`. That's the usual
"the link opens localhost" bug.

The email provider is on by default in new projects, with "Confirm email" on. A first-time
address gets a "Confirm your signup" email instead of the magic-link email. Clicking either one
signs the user in.

## Gotchas

- **Email rate limit:** Supabase's built-in mailer sends only a few emails per hour per project
  and is meant for testing. Before real traffic, add custom SMTP (Authentication -> Emails ->
  SMTP settings) with any email provider.
- **Links work once and expire** (1 hour by default). Email scanners that prefetch links can use
  them up before the person clicks; the page then shows "Email link is invalid or has expired".
  Changing the email template to include `{{ .Token }}` and asking for the 6-digit code with
  `verifyOtp({ email, token, type: "email" })` avoids that.
- **Other browsers:** with the default (implicit) flow, the link works even when it opens in a
  different browser than the one that asked for it. If you switch to `flowType: "pkce"`, it must
  open in the same browser.
- **Other providers:** Sign in with Apple on the web needs the paid Apple Developer Program.
  GitHub and Google sign-in are free but each needs an OAuth app and a secret pasted into Supabase.
  Magic links need none of that.
- Empty results while signed in are normal for a new user. An RLS failure on insert means
  `user_id` doesn't match `auth.uid()`; let the column default fill it in.
- Never apply schema changes the person didn't ask for. Report advisor findings instead.

## Bodega look and voice (if you reuse the brand)

- Strictly black and white. No accent colour. Dark (white on black) is the default.
- Instrument Serif for display, Allo for text, Space Mono for small receipts.
- Square corners, 3px borders, hard drop shadows (`6px 6px 0 0`), and a striped awning on top.
- Sentence case for text. ALL CAPS tracked labels for buttons.
- No emoji and no exclamation marks. Deadpan: "Done.", "Nothing on the shelf.", "Who sent you?"
