# Bodega reference: hosting on GitHub Pages

Part of the Bodega guide (https://kvendrik.com/bodega/llms.md). Used in **Runbook steps 1, 4 and 7**.

## Work out `<site-origin>` and `<page-url>` first

If the account's `<user>.github.io` repo has a `CNAME` file, every Pages site on that account is
served from that domain, and `<user>.github.io/<repo>/` redirects there. Then `<site-origin>` is
`https://<that domain>`, not `github.io`. Getting this wrong breaks sign-in (the redirect URLs
won't match), so check before handing out any URL.

## Two ways to host

- **A new public repo** (`<user>/<repo>`). It must be public for free Pages. Turn on Pages from
  `main`, root (the person does this under the repo's Settings -> Pages if you can't). Then
  `<page-url>` is `<site-origin>/<repo>/`. If the session can't create repos, have the person create
  an empty one, then attach it.
- **A folder in an existing Pages site.** This works when you can't create repos. First:
  - Read the build script: some builds delete every `.html` in the output folder.
  - Read `.gitignore`: output folders often ignore `**/*.html`, so add a negation such as
    `!public/bodega/index.html`. Make sure the file ends in a newline before you append, or your
    rule gets glued onto the last one. Then run `git check-ignore -v <file>` and `git status` after a
    build.
  - Keep SQL and notes out of the published folder unless they should be public.

## Deploying

Ask once whether to deploy. After that, push to the publishing branch and check that the Pages run
finished (`https://github.com/<owner>/<repo>/actions`, or list the workflow runs).
