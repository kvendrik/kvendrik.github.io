---
name: wine-menu-picker
description: Pick the wine the user is most likely to enjoy from a photo of a restaurant or bar wine list. Use whenever the user sends a photo, screenshot or PDF of a wine menu (or pastes one as text) and asks what to order, what they'd like, or which wine to pick — including with a food pairing, a budget, or "by the glass" constraint.
---

# Wine menu picker

The instructions and data live in `public/wine/` so they are also published at https://kvendrik.com/wine/
for any agent. Read the local copies (they may be newer than the live site):

1. `public/wine/llms.txt` — the full workflow, answer format and rules. Follow it.
2. `public/wine/taste-profile.md`, `public/wine/producers.md`, `public/wine/ratings.csv`,
   `public/wine/wishlist-and-cellar.csv` — the data it refers to.
3. Vivino scores: `python3 -I public/wine/vivino_lookup.py "<producer> <wine>" ...`

When the user reports a new rating, offer to append it to `public/wine/ratings.csv`.
