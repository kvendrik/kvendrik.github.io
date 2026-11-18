# Bodega reference: sign-in

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used in **Runbook steps 5 and 6**.

## Use Google

**For friends, use Google (or another OAuth provider), not email.** Google sign-in sends no email,
so none of Supabase's email limits apply. It takes the person about 10 minutes in the Google Cloud
console, and the allow-list works unchanged because Google gives Supabase the account's email.

If Google doesn't suit:
- **Discord or GitHub:** the quickest OAuth setups (create an app, copy two values), if everyone
  uses them. The page code is the same with `provider: "discord"` or `"github"`.
- **Email:** possible, but it needs custom SMTP before anyone except the owner can sign in. See
  "Alternative: email sign-in" below.

Supabase supports Apple, Azure (Microsoft), Bitbucket, Discord, Facebook, Figma, GitHub, GitLab,
Google, Kakao, Keycloak, LinkedIn, Notion, Slack, Snapchat, Spotify, Twitch, X/Twitter, WorkOS and
Zoom. SAML SSO is meant for workplaces.

## Google setup (human, about 10 minutes)

Last verified: 2026-11-18 against Supabase's Google guide
(https://supabase.com/docs/guides/auth/social-sign-in/auth-google). Google renames these screens
now and then; if a name doesn't match, follow that guide.

1. **Project:** `https://console.cloud.google.com/projectcreate`.
2. **Consent screen:** Google Auth Platform at `https://console.cloud.google.com/auth/overview`.
   - App name, **External** audience, support email.
   - Under Data Access (scopes), add `openid`; email and profile are there by default.
   - Branding fields (home page, privacy policy, terms) can stay empty for basic email sign-in.
     Only if Google insists on them, add a short privacy page next to the app and link it.
   - Publish it ("In production") so it isn't limited to test users. Basic email sign-in needs no
     Google review.
3. **Client:** Clients -> Create client -> **Web application**.
   - Authorized JavaScript origins: `<site-origin>`.
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`.
   - Copy the client ID and secret.
4. **Supabase:** `https://supabase.com/dashboard/project/<ref>/auth/providers`, then Google: enable
   it, paste the ID and secret, and Save.

Google's screen will say "continue to <ref>.supabase.co". Showing the person's own domain there
needs a paid Supabase add-on.

## URL configuration (human, Runbook step 6)

`https://supabase.com/dashboard/project/<ref>/auth/url-configuration`
- **Site URL:** replace `http://localhost:3000` with `<page-url>`, then Save.
- **Redirect URLs:** Add URL, `<page-url>`, then Save.

Keep the trailing slash. This must match the page's `redirectTo` exactly. If it doesn't, Supabase
falls back to the Site URL, so people land on `localhost:3000`.

There are two different redirects; don't mix them up:
- Google's client redirects to **Supabase**: `https://<ref>.supabase.co/auth/v1/callback`.
- Supabase redirects to **the page**: `<page-url>`.

## Alternative: email sign-in

Only use this if the person can't use any OAuth provider. Last verified: 2026-11-18.

**Supabase's built-in mailer is for the owner only.** Since September 2024 it sends only to members
of the Supabase organization; anyone else gets `email_address_not_authorized` and no email. It also
sends at most **2 emails per hour for the whole project** (`over_email_send_rate_limit`).
`query_logs` on `auth_logs` shows both. Sources:
https://supabase.com/docs/guides/auth/auth-smtp and
https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider

So email sign-in needs custom SMTP first. Options for someone who won't touch DNS:
1. **Their Gmail.** Mail goes through Google's own servers, so it passes Gmail's sender checks
   (DMARC). Create an app password at `https://myaccount.google.com/apppasswords` (needs 2-Step
   Verification). At `https://supabase.com/dashboard/project/<ref>/auth/smtp`, turn on custom SMTP:
   sender and username = their Gmail address, host `smtp.gmail.com`, port `465`, password = the app
   password. Not in Supabase's docs and **not verified end to end**: send one test link.
2. **Brevo with a single verified sender.** Brevo verifies one address by email. For `@gmail.com`
   senders it swaps the sender to its own domain (`brevosend.com`), so recipients may see "via".
   SMTP host `smtp-relay.brevo.com`, port 587, with the SMTP login and key from Brevo's SMTP
   settings. Some new accounts must ask Brevo to enable SMTP. Verified only from search results.
3. **A service with domain verification** (Resend, Postmark, SES): the best deliverability, but it
   needs DNS records. Ask first.

Then raise "emails sent per hour" at `https://supabase.com/dashboard/project/<ref>/auth/rate-limits`.

Don't suggest these:
- **SendGrid single sender with a `@gmail.com` address:** it fails Gmail's DMARC check, and SendGrid
  itself calls it test-only.
- **Resend without a domain:** `onboarding@resend.dev` only delivers to the Resend account's own
  address.
- **Adding friends to the Supabase organization:** that gives them access to the project.

Email sign-in code and form details are under "Email sign-in" in
https://kvendrik.com/bodega/llms/page.md.

Other email gotchas:
- **Links work once and expire after an hour.** Corporate scanners can open a link first; then the
  page shows the expired message. The fix: put `{{ .Token }}` in the template and ask for the
  6-digit code with `verifyOtp({ email, token, type: "email" })`.
- **Resend cooldown:** about 60 seconds per address. Show a countdown.
- New addresses get "Confirm your signup" instead of the magic-link email; either one signs them in.
