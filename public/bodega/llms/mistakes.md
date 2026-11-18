# Bodega reference: mistakes made on the first build

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Read once before starting. Each of
these cost the person a round trip.

1. **Gave menu paths instead of links.** "Go to Authentication -> URL Configuration" made the person
   ask for links. Send the direct link with their project ID, then the values.
2. **Built for the wrong URL.** Planned around `<user>.github.io/<repo>/`, but the account had a
   custom domain (`CNAME`), so the real URL was different. Work out `<site-origin>` first
   (see https://kvendrik.com/bodega/llms/hosting.md).
3. **Started with Sign in with Apple, then switched to email.** Apple needs the paid developer
   program and a secret that expires every 6 months. Email brought the org-only mailer, a limit of 2
   emails an hour, SMTP and DNS. Start with Google (see https://kvendrik.com/bodega/llms/sign-in.md).
4. **Asked "should I push?" after every change.** Ask once; after a yes, keep deploying.
5. **Assumed the connector could do everything.** The Supabase connector can't set auth URLs,
   providers or SMTP, and its secret form was paused, so those steps were manual. Say so up front,
   with links.
6. **Guessed a URL.** An OpenRouter keys link written from memory was wrong; the right one is
   `https://openrouter.ai/workspaces/default/keys`. Use links you've verified or been given.
7. **Broke `.gitignore` by appending** to a file without a trailing newline: the new rule was glued
   onto the last one. Check for the newline, then run `git status` after the build.
8. **Broke the phone layout** with a desktop rule declared after a `@media` block. Put breakpoint
   overrides last, and screenshot at 390px wide.
9. **Called it done without an end-to-end test.** Everything was tested against stubs. Say so, and
   hand over the live checklist.
10. **Missed that Supabase's built-in mailer only reaches the Supabase organization** (and sends 2
    emails an hour). The person was told "it's fine for a few friends", which was wrong.
11. **Left sign-ups open on an app for friends.** Anyone with an email could create an account. Build
    the allow-list from the start.
12. **Loaded supabase-js from a CDN with a floating version (`@2`).** Serve an exact build from the
    site.
13. **Echoed `error_description` from the URL.** Anyone can craft a link that puts their own text on
    the page. Show fixed messages only.
14. **Suggested an email service that needs domain verification.** The person didn't want to add
    their domain anywhere. Lead with the options that need no DNS.
15. **Shipped a default AI model that had already been shut down** (`gemini-2.0-flash-001`, retired
    2026-06-01). Check https://openrouter.ai/models; keep the list overridable by a secret.
16. **Let the guide allow reusing an existing Supabase project.** The sign-up trigger would block that
    project's other apps, and seeding the list from `auth.users` would admit all their users. Use a
    dedicated project.
