# Bodega: setup

Sign in with an emailed magic link, then see your own value from the database.

- Live page: https://kvendrik.com/bodega/ (served from `public/bodega/`; `kvendrik.github.io/bodega/` redirects here)
- Build guide for models: https://kvendrik.com/bodega/llms.md
- Supabase project: `Bodega` (`ukxogodszvwxzlfxlgtv`, eu-central-1)
- Schema: `bodega/supabase/schema.sql`, applied as migration `create_notes_with_rls`

## The one manual step
Supabase -> Authentication -> URL Configuration:
- Site URL: `https://kvendrik.com/bodega/`
- Redirect URLs: add `https://kvendrik.com/bodega/`

Without it, the emailed link sends people to `localhost:3000`.

## Notes
- The built-in mailer sends only a few emails per hour. Add custom SMTP before real traffic.
- Links work once and expire after an hour.
- The email provider is on by default. New addresses get a "Confirm your signup" email, which also signs them in.
- `public/bodega/fonts/AlloVariable.woff2` comes from the Bodega brand guide.
