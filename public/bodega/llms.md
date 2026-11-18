---
name: bodega
description: Set up a friends-only static web page where people sign in with Google, read and write their own rows in Supabase (row-level security plus an allow-list), and optionally ask an AI model through OpenRouter without exposing the key. Hosted free on GitHub Pages. Use when someone wants sign-in plus per-user data, and maybe AI, on a static site with no server of their own.
---

# Bodega: Google sign-in, your own row, friends only

One static HTML page on GitHub Pages. A listed friend clicks "Continue with Google", lands back
signed in, and sees a value only they can read or change. An optional "ask" box calls an AI model
through a Supabase Edge Function, so the key never reaches the browser. Live example:
https://kvendrik.com/bodega/.

**This file is the core: follow the Runbook top to bottom.** Each step says which reference file to
read; read it before doing the step.

| Reference | Read at |
| --- | --- |
| [mistakes.md](https://kvendrik.com/bodega/llms/mistakes.md): what went wrong the first time | Before step 1 |
| [hosting.md](https://kvendrik.com/bodega/llms/hosting.md): GitHub Pages, custom domains, `.gitignore` | Steps 1, 4, 7 |
| [database.md](https://kvendrik.com/bodega/llms/database.md): all SQL, in order | Step 3 |
| [page.md](https://kvendrik.com/bodega/llms/page.md): files to copy, replacements, client code, messages | Step 4 |
| [sign-in.md](https://kvendrik.com/bodega/llms/sign-in.md): Google setup, URL configuration, the email alternative | Steps 5, 6 |
| [ai.md](https://kvendrik.com/bodega/llms/ai.md): quota SQL, Edge Function, OpenRouter key | Step 9 |
| [testing.md](https://kvendrik.com/bodega/llms/testing.md): rolled-back SQL tests, stubbed page tests, live checklist | After steps 3, 4, 8, 9 |
| [managing-users.md](https://kvendrik.com/bodega/llms/managing-users.md): add, list, remove, delete friends | Step 10 |
| [security.md](https://kvendrik.com/bodega/llms/security.md): checklist and accepted risks | Step 10 |
| [links.md](https://kvendrik.com/bodega/llms/links.md): every dashboard link, and the reference install | Whenever you send the person a link |

## Placeholders

Collect these first. **Never reuse the reference install's values** (`kvendrik.com`, the Supabase URL and key in its
page); they belong to someone else.

| Placeholder | Meaning | Where from |
| --- | --- | --- |
| `<ref>` | Supabase project ref | `create_project` / `list_projects`, or the dashboard URL |
| `<publishable-key>` | `sb_publishable_...` | `get_publishable_keys`, or Project Settings -> API keys |
| `<site-origin>` | Origin the page is served from, no path (`https://example.com`) | hosting.md: check for a `CNAME` |
| `<page-url>` | The page, with trailing slash (`https://example.com/bodega/`) | `<site-origin>` plus the folder |
| `<owner-email>` | The owner's Google account email, lowercase | Ask |
| `<repo>` | The GitHub repo that publishes the site | Ask, or the one attached to the session |

## Runbook

**(you)** = the agent. **(human)** = the person, in a browser, with the link and exact values you
give them. Don't move on until the check passes.

1. **(you) Capabilities and URLs.** Read mistakes.md. Check for a Supabase connector
   (`list_projects`), access to `<repo>`, and internet access. Read hosting.md and work out
   `<site-origin>` and `<page-url>`. Tell the person now which steps will be theirs (5, 6, and the
   key in 9). Without a Supabase connector, they paste each SQL block into
   `https://supabase.com/dashboard/project/<ref>/sql/new`, and you deploy the function with the
   Supabase CLI or have them paste it into the dashboard's editor.
   *Check:* you know `<site-origin>`, `<page-url>` and `<repo>`.
2. **(you, with a yes) A new, dedicated Supabase project.** Ask which organization
   (`list_organizations`), then `create_project` on the free plan; they approve any cost. Wait until
   `get_project` reports `ACTIVE_HEALTHY`. Don't reuse a project that serves another app: the sign-up trigger would block
   that app's sign-ups (database.md, "Use a dedicated project"). If they insist, explain that and ask
   before applying anything.
   *Check:* you have `<ref>` and `<publishable-key>`.
3. **(you) Database.** Read database.md and apply its blocks in order. The allow-list block seeds
   `<owner-email>`; without it the owner is locked out. Run both advisors.
   *Check:* the advisors show only the expected findings, and the database tests in testing.md pass.
4. **(you) The page.** Read page.md. Copy the files and make the replacements in its table. For a
   folder inside an existing site, follow hosting.md first.
   *Check:* the grep in page.md finds only the new values, and the stubbed page tests in testing.md
   pass.
5. **(human) Google sign-in.** Send "Google setup" from sign-in.md, with `<site-origin>` and
   `https://<ref>.supabase.co/auth/v1/callback` filled in.
   *Check:* they confirm the provider is saved in Supabase.
6. **(human) URL configuration.** `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`:
   Site URL and Redirect URL both `<page-url>`.
   *Check:* they confirm.
7. **(you) Deploy.** Ask once, then push to the publishing branch and check the Pages run finished.
   *Check:* the run succeeded.
8. **(human) First sign-in.** They open `<page-url>`, click Continue with Google, and pick
   `<owner-email>`.
   *Check:* signed in, and a stored value shows with its row number. If not, see Troubleshooting.
9. **(optional) AI.** Read ai.md. **(you)** apply the quota SQL, edit the four values, and deploy
   `ask` with `verify_jwt: true`. **(human)** creates an OpenRouter key with a credit limit and
   stores it as `OPENROUTER_API_KEY`.
   *Check:* one real question gets an answer and the count drops by one.
10. **(you) Hand over.** Send managing-users.md with their `<ref>` and `<page-url>` filled in, the
    security.md accepted risks, and what was and wasn't tested live.

## Troubleshooting

Key on the status, code or symptom, not on the message text: the copy may have been reworded. The
page's own messages are listed in page.md.

| Symptom (where to look) | Cause | Fix |
| --- | --- | --- |
| Lands on `localhost:3000` after Google | Redirect URL missing or different (trailing slash) | Runbook step 6, exactly `<page-url>` |
| Google shows `redirect_uri_mismatch` | Wrong redirect URI in the Google client | `https://<ref>.supabase.co/auth/v1/callback` |
| Back on the page with `error_description` containing "Database error saving new user" | Allow-list trigger refused the sign-up | Address not listed, or a different Google account; managing-users.md |
| Signed in, then signed straight out | The list guard found no row for this email | Same as above |
| Owner can't get in | `<owner-email>` not seeded, or capitals | `select * from public.allowed_emails;` and re-seed in lowercase |
| Store fails: "violates row-level security" (browser console) | Not listed, or wrong `<ref>` / key in the page | Check the list, then page.md's replacements |
| `ask` returns 403 `bad_origin` | `ORIGINS` doesn't match `<site-origin>` exactly | ai.md, then redeploy |
| `ask` returns 403 `not_listed` / 401 `no_session` | Not on the list / not signed in | managing-users.md |
| `ask` returns 503 `no_key` | `OPENROUTER_API_KEY` not set | ai.md, "The key" |
| `ask` returns 502 `upstream_error` | Model gone, no credit, or bad key | `https://supabase.com/dashboard/project/<ref>/functions/ask/logs`; set `OPENROUTER_MODELS` |
| `ask` returns 429 `user_limit` / `shop_limit` | Daily limit reached | managing-users.md, "Give someone their AI questions back" |
| A dashboard page or menu name doesn't match | The third party changed it | Follow its current docs (linked in the reference files) and tell the person |

## Working with the person

- **Act, don't ask.** Once they've said to build or deploy, keep going. Ask only for real decisions
  (a cost, a schema change they haven't approved, a choice between options) or when blocked.
- **Links, not menu paths.** Every manual step starts with a direct link containing their `<ref>`,
  then the exact field, value and button (links.md).
- **Say what you couldn't do or test, in the same message.** Never claim a step you couldn't do.
- **Don't guess URLs or facts.** Reference facts carry a "last verified" date; if something doesn't
  match, check the current docs.
- **Never take a secret in chat.** Keys go in Supabase secrets, typed by the person.

## Done means

- A dedicated project, with database.md applied in order, the owner seeded, and advisors run with every
  finding reported.
- Owner sign-in works live, and the page is live at `<page-url>` after a successful deploy.
- The person has links and exact values for every manual step, plus managing-users.md filled in.
- What wasn't tested live is stated, along with the live checklist from testing.md.
- If AI was added: no key in the page, repo or chat; `verify_jwt: true`; quota functions
  `service_role` only; a credit limit on the key.
