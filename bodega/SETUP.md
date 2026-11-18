# Bodega: setup

Sign in with an emailed magic link, then see your own value from the database.

- Live page: https://kvendrik.com/bodega/ (served from `public/bodega/`; `kvendrik.github.io/bodega/` redirects here)
- Build guide for models: https://kvendrik.com/bodega/llms.md
- Supabase project: `Bodega` (`ukxogodszvwxzlfxlgtv`, eu-central-1)
- Schema: `bodega/supabase/schema.sql`, applied as migrations `create_notes_with_rls` and `notes_rls_select_auth_uid`

## The one manual step
Supabase -> Authentication -> URL Configuration:
- Site URL: `https://kvendrik.com/bodega/`
- Redirect URLs: add `https://kvendrik.com/bodega/`

Without it, the emailed link sends people to `localhost:3000`.

## AI (Ask the shop)
- Edge Function secrets: https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/secrets
  - `OPENROUTER_API_KEY`: from https://openrouter.ai/settings/keys, with a credit limit set on the key.
  - `OPENROUTER_MODELS` (optional): comma-separated model IDs, to change the models without redeploying.
- Function logs: https://supabase.com/dashboard/project/ukxogodszvwxzlfxlgtv/functions/ask/logs
- Source: `bodega/supabase/functions/ask/index.ts` (deployed as `ask`, verify_jwt on). Quota: `bodega/supabase/ai_usage.sql`, applied as migration `ai_usage_quota`.
- Limits: 20 questions per person per UTC day, 500 for the whole site.

## Notes
- The built-in mailer sends only a few emails per hour. Add custom SMTP before real traffic.
- Links work once and expire after an hour.
- The email provider is on by default. New addresses get a "Confirm your signup" email, which also signs them in.
- `public/bodega/fonts/AlloVariable.woff2` comes from the Bodega brand guide.
