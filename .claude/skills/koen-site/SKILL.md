---
name: koen-site
description: Everything learned building Koen Vendrik's new personal site concept in next/ (cream intro, live Amsterdam weather and photos, black Writing list, article pages with an iA Writer-style editor, Figma-style controls, Send to Claude, page transitions). Use whenever working on anything in next/, previewing it, or applying an edit Koen sent from the preview.
---

# Koen's site: how to work on it

## The idea

**Simple, but it feels alive.** Every decision comes back to this. The page is a few lines of
text on cream, and the life comes from small, well-made details: live data in the words,
photos that appear when you hover Amsterdam, a title that glides into its article, a hand-drawn
underline. When in doubt, remove something rather than add it, and make what stays move well.

Koen is a Staff Engineer at Shopify with strong taste. He iterates fast in short messages,
often several in a row while you're still working. Fold each one into the work in progress
rather than finishing the old plan first.

## Where things are

The concept lives in `next/` on the dev branch. The live Win95 site at the repo root stays
untouched.

| File | What it is |
| --- | --- |
| `next/index.html` | Home: intro (wave, name, tagline, live paragraph), Amsterdam photos, black Writing list. Inline CSS and JS. |
| `next/writing/<slug>.html` | One page per article (`what-kitt-taught-me.html`). `new.html` is a blank one that opens in writing mode. |
| `next/controls.js` / `controls.css` | Figma-style controls: select a `.layer`, tune padding, margin, font size and weight in a DialKit panel, double-click to edit text. Tracks every change in `window.pageEdits`. |
| `next/editor.js` / `editor.css` | Article editor (iA Writer style) and the floating pill with Send to Claude. |
| `next/page-edit.js` | Edit mode for non-article pages (the home page): Edit button, pill with change count, Send to Claude. |
| `next/transitions.css` / `transitions.js` | Cross-document view transitions between home and articles, plus hover preloading. |
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
- **Links:** a thin 1px underline with a 0.2em offset. Writing titles get a *pen* underline on
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
- **Scroll:**
  - On the home page, the cream intro (its own card on a black page) shrinks to 85%, dims and
    rounds its bottom corners up to 32px as you scroll.
  - The Writing content comes *towards* you, growing from 85% to 100%.
  - Articles do the same, but only once the black "More writing" section enters the view,
    and not at all while writing.
  - Articles always open at the top and are at least one screen tall.
- **Transitions** (view transitions, Chrome, Edge and Safari 18.2+):
  - Clicking a title fades everything else, a fixed stand-in keeps the title in place, and
    navigation starts immediately (no waiting).
  - The title glides to the article heading while the article rises in with a little blur.
  - Hovering preloads the article (speculation rules prerender, else prefetch).
  - Back to home: the article slides right, scaling and fading, and home comes in from the
    left (view transition type `back`). This was built last and not yet checked frame by
    frame.
- **Edit mode:**
  - Only shown where Send to Claude works: in the claude.ai preview, for its editors. On the
    real site there is no Edit button.
  - The controls only work in edit mode, and the panel starts collapsed.
  - On articles, edit mode is the writing mode. There is no Done button and no "Saved". The
    draft in `localStorage` exists only so a refresh doesn't lose work. A page with a draft
    always shows it, with "Showing your draft" next to Edit.
  - The signature and "More writing" are hidden while writing.
  - Esc deselects first, then leaves edit mode.

## Applying an edit Koen sends from the preview

Send to Claude stores the edit in the artifact database and comments on the artifact, which
wakes the session.
1. Read the comment and the document, e.g.
   `ArtifactData get collection=edits doc_id=<id> out_dir=<scratchpad>`.
2. Article edits are `{slug, title, meta, body (clean HTML), words, styles[]}`. Page edits are
   `{kind: 'page', page, changes: [{path, tag, text, style, html?}]}`, where `path` is a CSS
   path from `body` and `style` is the full inline style the controls set.
3. Apply to `next/…`: put article body blocks back with `class="layer"`, and move style
   changes into the page's CSS rather than inline styles where it reads cleanly.
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
- Don't take screenshots *during* a view transition when checking for errors: they can abort
  it ("invalid state").
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
