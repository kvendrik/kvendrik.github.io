# Bodega: Sign in with Apple setup

Already done: Supabase project `Bodega` (`ukxogodszvwxzlfxlgtv`, eu-central-1), `notes` table with row level security, site wired to the project.
Schema: `bodega/supabase/schema.sql` (applied as migration `create_notes_with_rls`).

Site URL: https://kvendrik.com/bodega/ (served from this repo at `public/bodega/`; `kvendrik.github.io/bodega/` redirects here)
Supabase callback: https://ukxogodszvwxzlfxlgtv.supabase.co/auth/v1/callback

## 1. Supabase redirect URLs
Authentication -> URL Configuration:
- Site URL: `https://kvendrik.com/bodega/`
- Redirect URLs: add `https://kvendrik.com/bodega/`

## 2. Apple Developer (paid program)
1. Identifiers -> App IDs: create one with "Sign in with Apple" enabled.
2. Identifiers -> Services IDs: create one (e.g. `com.kvendrik.bodega.web`). This is the **client ID**.
   - Enable Sign in with Apple, then Configure:
     - Primary App ID: the one above
     - Domains: `ukxogodszvwxzlfxlgtv.supabase.co`
     - Return URLs: `https://ukxogodszvwxzlfxlgtv.supabase.co/auth/v1/callback`
3. Keys: create a key with Sign in with Apple enabled and download the `.p8` (one download only). Note the Key ID and your Team ID.

## 3. Connect Apple to Supabase
Authentication -> Providers -> Apple: enable it, set Client IDs to the Services ID, and paste a client secret.
The secret is a JWT signed with your `.p8` (Team ID, Key ID, Services ID). Supabase's Apple auth docs include a generator. It expires after 6 months at most, so set a reminder.

## 4. Font
`public/bodega/fonts/AlloVariable.woff2` comes from the Bodega brand guide.

## Notes
- Apple shares name and email only on the first sign-in.
- "Hide My Email" gives a privaterelay address.
