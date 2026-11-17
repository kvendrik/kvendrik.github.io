# CLAUDE.md

Notes for working on this repo, kept up to date as we go: add what you learn.

# Koen's new site (`next/`): how to work on it

## The idea

**Simple, but it feels alive.** Every decision comes back to this. The page is a few lines of
text on cream, and the life comes from small, well-made details: live data in the words,
photos that appear when you hover Amsterdam, a title that glides into its article, a hand-drawn
underline. When in doubt, remove something rather than add it, and make what stays move well.

Koen is a Staff Engineer at Shopify with strong taste. He iterates fast in short messages,
often several in a row while you're still working. Fold each one into the work in progress
rather than finishing the old plan first.

## Articles are made together, one by one

Every blog article is its own HTML page in `next/writing/`, and Koen and Claude work on each one
together. Articles should each feel unique: not a template filled in, but a page shaped around
that piece, with its own details, imagery or interactions where the story calls for it.
- They share a few things so the site stays one place: the cream card, Allo at 20px, the back
  arrow, the title with its pen underline (it's where the transition lands), the signature,
  More writing, `controls.js`, `send.js` and `transitions.*`.
- Everything else is open per article.
- When Koen starts a new piece, ask what it should feel like before building. Don't just copy
  `what-kitt-taught-me.html`.
- Add each new article to the Writing list on the home page.

## Where things are

The concept lives in `next/` on the dev branch. The live Win95 site at the repo root stays
untouched.

| File | What it is |
| --- | --- |
| `next/index.html` | Home: intro (wave, name, tagline, live paragraph), Amsterdam photos, black Writing list. Inline CSS and JS. |
| `next/writing/<slug>.html` | One page per article (`what-kitt-taught-me.html`). |
| `next/controls.js` / `controls.css` | Figma-style controls, always on in the preview: click a `.layer`, tune padding, margin, font size and weight in a native-looking inspector card (DialKit underneath), double-click to edit text. Tracks every change in `window.pageEdits`. |
| `next/send.js` / `send.css` | The Send to Claude pill: appears once something has changed. |
| `next/transitions.css` / `transitions.js` | Page transitions between home and articles (each page animates itself), plus preloading. |
| `next/vendor/dialkit/` | DialKit (MIT, Josh Puckett), plain-JS build: `browser.global.js` and `styles.css`. |
| `next/fonts/` | Allo variable font (OFL), weights 100–900, roundness axis `ROND`. |
| `next/photos/` | Ten Unsplash photos (webp, w=900), credits in `CREDITS.txt`. |
| `.claude/skills/` | Emil Kowalski's design skills (animate, emil-design-eng, review-animations…). Use them for motion and polish. |

## Design system

- **Font:** Allo, `font-weight: 300`, `font-variation-settings: 'ROND' 100` (fully rounded).
  Koen picked rounded; keep it.
- **One size:** all text is 20px. Exceptions: the 👋 is `2em`, and the article's date line
  and the signature place are 16px. No big headings: the article title is 20px too.
- **Colours:**
  - **cream:** `#f5f2ea` (backgrounds). Koen tuned it: "slightly creamier", but not `#f6f1e6`.
  - **ink:** `#353535` (text).
  - **muted:** `#8a867f` (subdued text).
  - **black:** `#111110` (Writing section and page background behind the cards).
  - **selection blue:** `#0d99ff`, Figma's. Selected text uses a light tint of it, `#cfe6fd`.
- **Easing:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. For gliding motion use
  `cubic-bezier(0.32, 0.72, 0, 1)`. Avoid stiff ease-in-out curves: Koen called them "stiff".
- **Spacing he set:** 50px between wave, name block and paragraph. Text sits 100px from the
  page top and 150px from the black section. Article titles in the list are 25px apart, with
  no dividers or dates. Article paragraphs are 1.8em apart.
- **Links:** a thin 1px underline with a 0.2em offset.
- **Pen underline width:** it sits under a title's *last line* only, as wide as that line.
  `sizePen` in `transitions.js` measures the text and sets `--pen-left` and `--pen-width`.
  Wrapped titles otherwise get an underline across the whole box. Writing titles get a *pen* underline on
  hover: an inline SVG, slightly uneven, thicker in the middle with a flick at the end. It
  fades in and does **not** draw left to right ("too slow"). The article title carries the
  same pen underline in ink.
- **Opacity:**
  - Writing titles are at 90%, and the signature at 90%.
  - "Showing your draft" is at 60%.
- **No dots** next to "Showing your draft" or "Draft restored".
  - The black list's text is cream.
- **Signature:** "Koen" in Cedarville Cursive (option 5), converted to an inline SVG path with
  a hand-drawn underline stroke, and "Amsterdam" below. He compared it with a ballpoint style
  and went back to 5. Drawing letterforms point by point looked fake ("trash"); starting from
  a real-handwriting font, converted to paths and tweaked, works.

## Behaviours worth keeping

- **Live words:**
  - "Good *afternoon*!" follows the visitor's clock.
  - "And greetings from *rainy* Amsterdam." comes from Open-Meteo, which is keyless and
    browser-side: `api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89&current=temperature_2m,weather_code,is_day`.
  - The text waits at most 1.5s for the weather and never changes once it's showing.
  - The fallback is "And greetings from Amsterdam."
  - The dynamic words are plain, not underlined.
- **Amsterdam photos:**
  - Hovering the link shows natural, sunny photos with people in them around the text, laid
    out by JS into regions around the measured text box, never overlapping it.
  - They fade in in a random order (a different first photo each time), with a subtle tilt,
    glint and per-photo parallax.
  - Koen picks photos from contact sheets of about 20 numbered options.
- **Phones** (under 600px wide):
  - The intro drops its 50px block padding, so it shares one 24px edge with the Writing list.
    Spacing is scaled down: 40px between wave, name and paragraph.
  - Tapping Amsterdam doesn't leave for Maps. It opens the photos as a pile of slightly
    tilted prints over a cream veil (`layoutPile`, two or three columns, whichever shows them
    bigger), and a tap anywhere closes it.
  - The controls card spans the width just above the pill.
- **Scroll:**
  - On the home page, the cream intro (its own card on a black page) shrinks to 85%, dims and
    rounds its bottom corners up to 32px as you scroll.
  - The Writing content comes *towards* you, growing from 85% to 100%.
  - Articles do the same, but only once the black "More writing" section enters the view,
    and not at all while writing.
  - Articles always open at the top and are at least one screen tall.
- **Transitions** (`transitions.js` and `transitions.css`): each page animates itself. No
  cross-document view transitions: they didn't work in the claude.ai viewer, which changes
  pages its own way.
  - **The rule:** the leaving page ends in exactly the state the arriving page starts from, so
    the cut between documents is invisible.
  - **Opening an article:** a fixed stand-in keeps the clicked title in place.
    - A circle of cream grows out of the title and covers the page (`.pt-veil`, a clip-path,
      400ms). A reveal never passes through grey, and a black-to-cream fade always did.
    - The title turns to ink as the circle starts, and the page changes at 300ms.
    - The article starts on cream with only its title, placed where the title was. It glides
      the title into its heading on a `cubic-bezier(0.32, 0.72, 0, 1)` curve while the rest
      rises in 90ms behind.
  - **Back home:** the back arrow or the browser back button. It all happens on black, where
    you're going.
    - The article slides right, shrinking and fading.
    - Home restores your spot in the list (the scroll position travels in the hand-over) and
      comes in from the left. Its intro shows at once (`pt-skip-intro`).
    - In the viewer there's a ~180ms black beat while home loads. That's the load itself.
  - **Only fade what you mean to:** never apply a blanket `opacity` override to `body > *`.
    It made the hidden edit pill and controls visible mid-transition.
  - **Hand-over:** the arriving page learns what's happening and where the title was through
    `#pt=…` in the address, which it tidies straight away. `sessionStorage` is the backup.
    The back arrow goes to the home page you came from (stored, else `document.referrer`),
    never just `../`.
  - **Preloading:** hovering a title prefetches its article, and an article prefetches home
    once idle.
  - **`html` is cream:** it shows behind the pages. The body keeps its black for the scroll
    effect.
  - **Load order:** `transitions.js` loads in `<head>`. It sets the arriving state before
    anything is painted, and places the title in a frame callback as soon as it exists.
- **Controls, no edit mode:** there is no Edit button and no writing mode; Koen removed them.
  - The Figma-style controls are always on inside the claude.ai preview, for its editors.
    They switch on when `claude.use('db')` resolves, which sets `controls-on` on `<html>`. On
    the real site they never switch on.
  - Click a layer to select it. Real links still work; Alt-click a link to select it instead.
    Double-click edits text, and Esc deselects.
  - **The inspector card:** native-feeling. It's a frosted translucent material
    (`blur(30px) saturate(180%)` over cream at 84%) with a hairline edge, a bright top
    highlight and layered shadows. It uses system type, compact 28px rows and tabular
    figures, and its title is the selected layer's name ("Tagline", "Paragraph"…). It starts
    collapsed. On phones it spans the width just above the pill.
  - **The pill:** appears bottom centre as soon as something has changed, with "3 changes" and
    Send to Claude.

## Applying an edit Koen sends from the preview

Send to Claude stores the edit in the artifact database and comments on the artifact, which
wakes the session.
1. Read the comment and the document, e.g.
   `ArtifactData get collection=edits doc_id=<id> out_dir=<scratchpad>`.
2. Edits are `{kind: 'page', page, changes: [{path, tag, text, style, html?}]}`. `page` is
   `index.html` or `writing/<slug>.html`. `path` is a CSS path from `body`, and `style` is
   the full inline style the controls set. `html` is present when the text was edited.
3. Apply to `next/…`: move style changes into the page's CSS rather than inline styles where
   it reads cleanly. Keep `class="layer"` on blocks.
4. Commit, push and republish. Reply in the comment thread, then resolve it.
5. **Ask before applying when unsure:** once Koen sent a test edit and then said "dont
   actually do that".

## Preview (claude.ai artifact) gotchas

- **The preview:** `https://claude.ai/artifact/2xYC9Kt98kB4pyB3eXjTBU`. Its main page is
  `next/index.html`, and the other files are published through `files`.
- **Always republish `index.html` as the page.** Pass `url` and add changed supporting files
  under `files`. Using `edits` or `file_path` on an article file makes *that* file the main
  page. This happened twice. Leaving out `url` creates a new artifact instead of updating.
- **Capabilities** are `db` (rule: `edits` read and write at `admin`), `comments` and `user`.
  Omitting `capabilities` on a republish carries them forward.
- **The page can't call `claude.use()` outside the preview.** Feature-detect
  `window.claude?.use` and hide edit features when it's missing.
- **Scroll position:** the preview viewer can keep its scroll position across page changes.
  Article pages reset to the top themselves, with `scrollIntoView` reaching the viewer.

## Testing

- Serve `next/` with `python3 -m http.server` and drive it with Playwright scripts kept in the
  scratchpad. Use `deviceScaleFactor: 2` for screenshots shown to Koen and 1 for your own
  checks.
- Fake the claude.ai runtime with `addInitScript` (a `window.claude.use` returning stub `db`,
  `comments` and `user`) to test Edit and Send to Claude locally.
- Test the photo layout for overlaps at 1280×720 up to 2560×1440. Test transitions with
  screenshot strips.
- **Check transitions in the real viewer:**
  1. Bootstrap the artifact emulator (`anthropic-skills:artifact-emulator`) and serve
     `next/` through it.
  2. Drive the artifact frame, and record a CDP screencast of the *shell* page, with each
     frame's `metadata.timestamp`.
  3. Turn the frames into a timed contact sheet.
- **What the viewer does:** it changes pages as normal iframe navigations, keeps `#hash`
  hand-overs, allows `sessionStorage`, and restores the previous scroll on home.
- **Weather in the viewer:** its CSP blocks Open-Meteo, so the preview always shows the
  weather fallback. Only the real site has live weather.
- **Watch transitions at real speed:** use a CDP screencast (`Page.startScreencast`) into a
  contact sheet.
- **Watch motion slowed down:** use a CDP session
  (`Animation.setPlaybackRate {playbackRate: 0.25}`) and grab frames with
  `Page.captureScreenshot` into a contact sheet. That's how muddy crossfades and overlaps
  show up.
- **Checking transitions for errors:** do runs *without* screenshots (repeat about 6 times),
  since screenshots during a transition can abort it.
- Mock the weather with `page.route('**/api.open-meteo.com/**')`, because the sandbox network
  to Open-Meteo is flaky.

## Bugs already hit (don't repeat)

- **Font shorthand:** `getComputedStyle(el).font` is empty for this variable font. Copy
  `fontFamily`, `fontSize`, `fontWeight` and `lineHeight` one by one.
- **Synthetic keys:** a synthetic `KeyboardEvent('keydown', {key:'Escape'})` also triggers your
  own Esc handlers. Check `e.isTrusted`, and mark handled keys with `preventDefault()` so the
  next handler can check `defaultPrevented`.
- **Inline styles win:** inline styles set by the scroll effect beat stylesheet rules. Use
  `!important` for temporary states like the transition fade-out.
- **Keyframes beat inline styles:** a CSS `animation` with `fill: both` overrides inline
  opacity. Keep load animations off the elements that scroll effects drive.
- **Empty contenteditable:** typing into an empty contenteditable creates bare text. Start it
  with `<p><br></p>`. Chrome keeps a heading going after Enter, so convert it back to `p`.
- **Order of definitions:** calling a `const` function before its line throws (temporal dead
  zone). Run startup code at the end of the script.
- **Blocked network:** the proxy blocks many hosts (graphicalui.com, dialkit.dev). npm, the
  Google Fonts CSS API and the Unsplash MCP work.

## Commits

- Work on `claude/jolly-pasteur-7te9pu`. Push with
  `git -c push.negotiate=true push -q origin claude/jolly-pasteur-7te9pu`.
- End commit messages with the attribution lines from the session's system reminder. No model
  names in commits.
