# Bodega reference: security checklist

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Go through it before **Runbook
step 10**, and tell the person the accepted risks.

- [ ] A dedicated Supabase project (the sign-up trigger affects the whole project).
- [ ] Sign-in that sends no email (Google or another OAuth provider), or custom SMTP.
- [ ] Allow-list on: sign-up trigger in place, owner seeded, and the page signs out anyone who isn't
      listed.
- [ ] RLS on every table; policies check ownership and the allow-list.
- [ ] Row cap per person.
- [ ] No secret keys in the page; the OpenRouter key is an Edge Function secret with a credit limit.
- [ ] Quota functions executable by `service_role` only.
- [ ] supabase-js served from the site at an exact version.
- [ ] No text from the URL or from the model is ever rendered as HTML, and `error_description` is
      never shown at all.
- [ ] Advisors run and every finding explained.

## Known and accepted at this scale (tell the person)

- **Shared origin.** If the page lives on a bigger site, every page on that domain can read the
  session in `localStorage`. A subdomain fixes it.
- **Google Fonts** sees visitors' IP addresses. Serving the fonts from the site avoids it.
- **The owner can read everything** in the dashboard. Tell friends.
- **Free Supabase projects pause** after about a week without activity; resume them in the
  dashboard.
- **AI cost:** with the default limits and cheap models it's cents a day; the credit limit on the
  key caps the worst case. The site-wide cap can overshoot slightly under concurrent requests.
