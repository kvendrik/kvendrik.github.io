---
name: wine-menu-picker
description: Pick the wine Koen is most likely to enjoy from a photo of a restaurant or bar wine list. Use whenever Koen sends a photo, screenshot or PDF of a wine menu (or pastes one as text) and asks what to order, what they'd like, or which wine to pick — including with a food pairing, a budget, or "by the glass" constraint.
---

# Wine menu picker

The instructions and data live in `public/wine/` so they are also published at https://kvendrik.com/wine/
for any agent. Read the local copies (they may be newer than the live site):

1. `public/wine/llms.txt` — the full workflow, answer format and rules. Follow it.
2. `public/wine/taste-profile.md`, `public/wine/producers.md`, `public/wine/ratings.csv`,
   `public/wine/wishlist-and-cellar.csv` — the data it refers to.
3. Vivino scores: `python3 -I public/wine/vivino_lookup.py "<Producer> :: <wine> <vintage>" ...`

When Koen reports a new rating, offer to append it to `public/wine/ratings.csv`.

## Refreshing from a new Vivino export

When Koen uploads a new Vivino export zip (or asks to refresh their wine data):

1. Run `python3 -I scripts/wine-refresh.py <path-to-export.zip>`. It rewrites `public/wine/ratings.csv` and
   `public/wine/wishlist-and-cellar.csv` (no notes, reviews, prices paid or account data) and prints a report.
2. Use the report to update `public/wine/taste-profile.md`: the counts, averages, top scores, likes, dislikes
   and the "vs crowd" adjustments. Keep the "Eating out" section; those are Koen's own answers, not Vivino data.
3. For each of Pablo's producers Koen has now tasted, check the match is real, then add the rating to its
   row in `public/wine/producers.md` and adjust its fit stars.
4. Update the numbers in `scripts/wine-template.html` (the page at kvendrik.com/wine): the chart's
   `styles`, the top five in `fame`, the "85 wines rated" count, and any line in the copy the new data contradicts.
5. Show Koen what changed in their taste (a few lines), then commit and ask before pushing it live.
