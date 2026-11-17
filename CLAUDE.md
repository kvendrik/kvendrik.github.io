# CLAUDE.md

Notes for working on this repo, kept up to date as we go: add what you learn.

# Koen's new site (`next/`): how to work on it

## The idea

**Simple, but it feels alive.** Every decision comes back to this. The page is a few lines of
text on cream, and the life comes from small, well-made details: live data in the words,
a hand-drawn underline, soft sounds under the controls. When in doubt, remove something rather than add it, and make what stays move well.

Koen is a Staff Engineer at Shopify with strong taste. He iterates fast in short messages,
often several in a row while you're still working. Fold each one into the work in progress
rather than finishing the old plan first.

## Articles are made together, one by one

Every blog article is its own HTML page in `next/writing/`, and Koen and Claude work on each one
together. Articles should each feel unique: not a template filled in, but a page shaped around
that piece, with its own details, imagery or interactions where the story calls for it.
- They share a few things so the site stays one place: the cream card, Allo at 20px, the back
  arrow, the title with its pen underline (it's where the transition lands), the signature,
  More writing, `controls.js`, `send.js`, `sounds.js` and `pen.*`.
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
| `next/canvas.js` | Pan-and-zoom canvas for diagrams (`.canvas-stage` > `.canvas-world` with `[data-node]` cards and `<path data-from data-to>` edges), styled after beautifului.dev's Flowchart (MIT). Drag pans with momentum, pinch or Ctrl/⌘-scroll zooms, it can't be thrown out of view. |
| `next/sounds.js` | UI sounds for the controls, synthesized with Web Audio: `window.uiSound(name)`. |
| `next/pen.css` / `pen.js` | The pen underline: under the article title (sized to its last line), and a variation under the home page's links. |
| `next/vendor/dialkit/` | DialKit (MIT, Josh Puckett), plain-JS build: `browser.global.js` and `styles.css`. |
| `next/fonts/` | Allo variable font (OFL), weights 100–900, roundness axis `ROND`. |
| `next/photos/` | Ten Unsplash photos (webp, w=900, credits in `CREDITS.txt`). Not used right now: Amsterdam's photos were switched off. |
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
- **Links on home** (Amsterdam, Shopify): a hand-drawn stroke instead of a ruled line, a
  variation of the pen underline in ink at 70%. Every link gets its *own* stroke
  (`data-stroke="2"`, `"3"`, default 1) so they look drawn one by one; add a new variation
  for new links rather than reusing one. It's a background image with
  `box-decoration-break: clone`, so it follows wrapped lines.
- **Pen underline width:** it sits under a title's *last line* only, as wide as that line.
  `sizePen` in `pen.js` measures the text and sets `--pen-left` and `--pen-width`.
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

- **KITT window (home):** the word KITT opens a Windows 95 dialog like the live site's (W95fa
  font in `next/fonts/w95fa.woff2`), with the scanner GIF and a line. It drags by its title bar
  and closes on OK, X or Esc. Elements that do something get `data-live` so the controls let
  clicks through, like real links.
- **Article media so far:** an image (`figure img`), a beautifului-style code block
  (`figure.code`, hand-marked `.k .f .s .c` tokens, Copy), a looping video, and the canvas.
  The GIF and video are original renders; there's no footage from the show (copyright).

- **Live words:**
  - "Good *afternoon*!" follows the visitor's clock.
  - "And greetings from *chilly* Amsterdam." comes from Open-Meteo, which is keyless and
    browser-side: `api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89&current=temperature_2m,weather_code,is_day`.
  - **The word** (`greetingWord`), in order:
    - stormy, rainy, snowy, foggy
    - hot (25°C and up)
    - sunny, or crisp when sunny at 8°C or below
    - warm (18°C and up)
    - chilly (8°C or below)
    - quiet when it's clear at night, otherwise grey
  - The text waits at most 1.5s for the weather and never changes once it's showing.
  - The fallback is "And greetings from Amsterdam."
  - The dynamic words are plain, not underlined.
- **Amsterdam photos: switched off.** Koen asked for no photos for now. The layout code
  (regions around the text on desktop, a tap-to-open pile on phones) is in git history
  before the commit that removed it.
- **Phones** (under 600px wide):
  - The intro drops its 50px block padding, so it shares one 24px edge with the Writing list.
    Spacing is scaled down: 40px between wave, name and paragraph.
  - The controls card spans the width just above the pill.
- **Scroll:**
  - On the home page, the cream intro (its own card on a black page) shrinks to 85%, dims and
    rounds its bottom corners up to 32px as you scroll.
  - The Writing content comes *towards* you, growing from 85% to 100%.
  - Articles do the same, but only once the black "More writing" section enters the view,
    and not at all while writing.
  - Articles always open at the top and are at least one screen tall.
- **Page transitions: removed for now** (Koen's call). Lessons from building them, if they
  come back:
  - Cross-document view transitions didn't work in the claude.ai viewer.
  - Self-animating pages worked best. The leaving page ends in the state the arriving page
    starts from, and they hand over through `#hash` with `sessionStorage` as backup.
  - A clip-path reveal beat a black-to-cream fade, which went grey.
  - Never fade `body > *` wholesale.
  - It's all in git history.
- **Controls, no edit mode:** there is no Edit button and no writing mode; Koen removed them.
  - The Figma-style controls are always on inside a Claude artifact, for its editors. They
    switch on only when the page sits in a frame (`window.top !== window`) and
    `claude.use('db')` resolves, which sets `controls-on` on `<html>`. The pill has the same
    check. On the real site neither ever appears.
  - **Sounds** (`sounds.js`, Web Audio, no files, quiet), using beautifului.dev's own recipes
    (press, tick, release, pulse):
    - a soft tap when selecting, and a lower one when deselecting
    - fine ticks while a slider moves (throttled to about 35 a second, pitched by position)
    - pops when panels open and close
    - two tones when editing starts
    - a two-note chime when sent, and a low double note on an error
    - The browser allows sound only after the first click.
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
