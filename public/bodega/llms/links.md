# Bodega reference: links to give the human

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Lead your message with the link,
then the exact values on the next lines. Replace `<ref>` with the person's Supabase project ref.
Last verified: 2026-11-18. If a page has moved, find it from the dashboard and say so.

| Task | Link | What to enter |
| --- | --- | --- |
| Google provider | `https://supabase.com/dashboard/project/<ref>/auth/providers` | Google: enable, paste the client ID and secret, then Save. |
| Google Cloud | `https://console.cloud.google.com/auth/overview` | See https://kvendrik.com/bodega/llms/sign-in.md. Redirect URI `https://<ref>.supabase.co/auth/v1/callback`. |
| URL configuration | `https://supabase.com/dashboard/project/<ref>/auth/url-configuration` | Site URL and Redirect URL: `<page-url>`. |
| SQL editor (add a friend, run SQL) | `https://supabase.com/dashboard/project/<ref>/sql/new` | See https://kvendrik.com/bodega/llms/managing-users.md. |
| Users (delete an account) | `https://supabase.com/dashboard/project/<ref>/auth/users` | Delete user. |
| Edge Function secrets | `https://supabase.com/dashboard/project/<ref>/functions/secrets` | `OPENROUTER_API_KEY`; optional `OPENROUTER_MODELS`. |
| Function logs | `https://supabase.com/dashboard/project/<ref>/functions/ask/logs` | Where AI errors show up. |
| OpenRouter keys | `https://openrouter.ai/workspaces/default/keys` | Create a key and set a credit limit. |
| SMTP (email sign-in only) | `https://supabase.com/dashboard/project/<ref>/auth/smtp` | See the email section of sign-in.md. |
| Email rate limit (email sign-in only) | `https://supabase.com/dashboard/project/<ref>/auth/rate-limits` | Raise "emails sent per hour" once SMTP is on. |
| Deploy runs | `https://github.com/<owner>/<repo>/actions` | Check the Pages deploy finished. |

## The reference install

**Example values only.** They belong to the original builder's project. Never use them for someone
else's setup.

| | |
| --- | --- |
| Live page | https://kvendrik.com/bodega/ (from `public/bodega/` in `kvendrik/kvendrik.github.io`; `kvendrik.github.io/bodega/` redirects there because of a `CNAME`) |
| Supabase project | a dedicated project, free plan |
| Sign-in | Google only |
| Migrations | `create_notes_with_rls`, `notes_rls_select_auth_uid`, `ai_usage_quota`, `notes_per_user_cap`, `friends_allowlist`, `allowlist_private_schema`, `allowlist_select_own` |
| Edge Function | `ask` (verify_jwt on) |
| supabase-js | 2.118.0, vendored |
| Limits | 100 rows per person; 20 AI questions per person per UTC day, 500 for the whole site |
