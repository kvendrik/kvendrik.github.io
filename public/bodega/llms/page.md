# Bodega reference: the page

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used in **Runbook step 4**.

## Files to copy, and what to replace

Copy these into the person's repo, in the folder that becomes `<page-url>`:

| File | Source | Replace |
| --- | --- | --- |
| `index.html` | https://raw.githubusercontent.com/kvendrik/kvendrik.github.io/main/public/bodega/index.html | `SUPABASE_URL` -> `https://<ref>.supabase.co`; `SUPABASE_KEY` -> `<publishable-key>`; `<title>` and copy if wanted |
| `vendor/supabase-js-<version>.js` and its license | npm (see "Client") | nothing |
| `fonts/` (optional) | https://github.com/kvendrik/kvendrik.github.io/tree/main/public/bodega/fonts | nothing. Without it the page falls back to system fonts |

**Not adding AI (Runbook step 9)?** Then remove the "Ask the shop" panel (the `<div class="panel ask">`
block) and the script from `// ---------- Ask the shop ----------` up to (not including)
`// ---------- Start-up ----------`, and remove the `loadQuota();` call in `render()`. Otherwise the panel
shows errors.

Those two constants are the only values tied to the reference install in `index.html`. Check with
`grep -n "supabase.co\|sb_publishable_" index.html` after editing: only the new values
should appear. The page links to `llms.md`; copy that too, or remove the footer link.

## Client

```html
<!-- An exact supabase-js build served from your own site, not a CDN. -->
<script src="vendor/supabase-js-2.118.0.js"></script>
<script>
  const sb = supabase.createClient("https://<ref>.supabase.co", "<publishable-key>");
</script>
```

- **Vendoring:** run `npm pack @supabase/supabase-js@<version>` (pick one that's been out for at
  least two weeks), copy `package/dist/umd/supabase.js` to `vendor/supabase-js-<version>.js`, and keep
  its MIT `LICENSE` next to it. A floating CDN version (`@2`) would let a compromised package or CDN
  run code on the page.
- **Keys:** use the **publishable** key (`sb_publishable_...` or the legacy `anon` key;
  `get_publishable_keys` returns it). It's meant to ship; RLS protects the data. Never put a
  `service_role` or secret key in a page.

## Sign in with Google

```js
const { error } = await sb.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: location.origin + location.pathname },   // must equal <page-url>
});
```

- The browser leaves for Google. On success it comes back with the session in the hash, and
  supabase-js picks it up.
- Failures come back as `?error=...&error_description=...` (in the query string, the hash or both).
  **Never show `error_description`**: anyone can craft such a URL. Read it only to pick your own
  message:
  - contains "Database error saving new user": the allow-list trigger. Show "Not on the list. Ask
    whoever sent you."
  - `error=access_denied`: "Sign-in was cancelled."
  - anything else: "That didn't work. Try again."
  Then clear the URL with `history.replaceState(null, "", location.pathname)`.
- Re-enable the button on `pageshow`, or the browser's back button restores a disabled
  "One moment" button.

## The list guard (after sign-in)

```js
async function guardList() {
  const { data, error } = await sb.from("allowed_emails").select("email").maybeSingle();
  if (error || data) return;          // network error: leave it to the server-side checks
  await sb.auth.signOut();
  showHint("Not on the list. Ask whoever sent you.");
}
```

## Session handling

```js
let current = null, rendered = false;
function render(session) {
  const id = session ? session.user.id : null;
  if (rendered && id === current) return;   // a token refresh must not reset the UI
  rendered = true; current = id;
  // show the loading, signed-out or signed-in state; when signed in, call guardList()
}
sb.auth.onAuthStateChange((_e, s) => render(s));
sb.auth.getSession().then(({ data }) => render(data.session));
```

## Read and write

```js
// RLS returns only this user's rows, so no user filter is needed.
const { data, error } = await sb.from("notes").select("id, body, created_at")
  .order("created_at", { ascending: false }).limit(1).maybeSingle();
await sb.from("notes").insert({ body });   // user_id fills itself in
```

- Set text with `textContent`, never `innerHTML`: the value is user input.
- An error containing "violates row-level security" for a signed-in user means they aren't on the
  list: show "Not on the list."

## The app's messages

Troubleshooting is keyed on HTTP status and code, but these are the reference copy. If you reword
them, keep this table up to date in your notes to the person.

| Where | Message | Meaning |
| --- | --- | --- |
| Sign-in | Not on the list. Ask whoever sent you. | Trigger refused the sign-up, or the guard signed them out |
| Sign-in | Sign-in was cancelled. | `access_denied` from Google |
| Sign-in | That didn't work. Try again. | Any other sign-in error |
| Sign-in | Google sign-in didn't start. Try again. / No connection. Try again. | `signInWithOAuth` failed before leaving |
| Shelf | Not on the list. | RLS refused a read or write |
| Shelf | The shelf is full. Throw something out first. | Row cap (100) |
| Shelf | Can't find it. | Any other database error |
| Ask | the function's `error` text | See the codes in https://kvendrik.com/bodega/llms/ai.md |
| Ask | Can't reach the counter. Try again. | The function call itself failed (network, CORS) |

## The fields: make them feel good

These apply to every input on the page (the value and the AI question).

- **Google button:** full width, the same hard-shadow button as the rest. While redirecting it shows
  "One moment" with stepped dots and is disabled.
- **Font size:** input text at 18px. Under 16px, iOS zooms in on focus.
- **One block:** input and button share one border and one hard shadow. `:focus-within` lifts it
  (`translate(-3px,-3px)`, bigger shadow); `:has(.btn:active)` presses it in (`translate(3px,3px)`,
  no shadow, 40ms).
- **Ready state:** the button stays outlined until there's something to send, then fills. Don't
  disable it: pressing early should explain why nothing happened.
- **Errors:** inline under the field (`aria-describedby`, `aria-invalid`), a dashed border and one
  240ms shake (on the `translate` property, so it doesn't fight `transform`). Clear on typing.
- **Busy:** `readOnly` input, `aria-busy`, a label with three dots stepped in by `steps(4)`, and a
  `min-width` on the button so it doesn't jump.
- **Motion:** one curve, `cubic-bezier(0.23, 1, 0.32, 1)`. Presses 120ms, 40ms while held. Exits
  90ms (opacity 0, scale .98); entrances 300ms (from 8px and scale .97, never from 0), children 40ms
  apart. Animate `transform` and `box-shadow` only. Hover only under `@media (hover:hover)`;
  `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` on buttons. All of it
  off under `prefers-reduced-motion`.
- **Phone:** under 420px, the button stacks under the input; `viewport-fit=cover` with
  `env(safe-area-inset-*)` padding.

## Email sign-in (alternative only)

Only with custom SMTP in place (see https://kvendrik.com/bodega/llms/sign-in.md).

```js
const { error } = await sb.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: location.origin + location.pathname },
});
```

- Map errors: "Database error saving new user" -> "Not on the list."; status 429 or "rate limit"
  -> "Too many links sent. Give it an hour."; "...after N seconds" -> a countdown; "fetch" or
  "network" -> "No connection. Try again."
- Failed links come back as `#error=...&error_code=...`. Map `otp_expired` to "That link has
  expired or was already used.", anything else to "That link didn't work.", then clear the hash.
- Keep the default (implicit) auth flow so a link opened in another browser still works;
  `flowType: "pkce"` breaks that.
- The link usually opens in a new tab, so call `getSession()` on `visibilitychange`.
- Form: `type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off"
  spellcheck="false" enterkeyhint="send"`, `novalidate` on the form, and a ready state on
  `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`. After sending, swap the form for a receipt with the address
  (`overflow-wrap:anywhere`), "Resend in 60" and "Use another email", plus an "Open Gmail" style
  inbox shortcut by domain:

  | Domain | Button | Link |
  | --- | --- | --- |
  | gmail.com, googlemail.com | Open Gmail | https://mail.google.com/mail/u/0/#inbox |
  | outlook, hotmail, live, msn | Open Outlook | https://outlook.live.com/mail/ |
  | icloud.com, me.com, mac.com | Open iCloud Mail | https://www.icloud.com/mail |
  | proton.me, protonmail.com, pm.me | Open Proton Mail | https://mail.proton.me/ |
  | yahoo | Open Yahoo Mail | https://mail.yahoo.com/ |
  | fastmail | Open Fastmail | https://app.fastmail.com/ |
