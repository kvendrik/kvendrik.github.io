---
name: wine-menu-picker
description: Pick the wine the user is most likely to enjoy from a photo of a restaurant or bar wine list. Use whenever the user sends a photo, screenshot or PDF of a wine menu (or pastes one as text) and asks what to order, what they'd like, or which wine to pick — including with a food pairing, a budget, or "by the glass" constraint.
---

# Wine menu picker

The user sends a photo of a wine list. Your job: read every wine on it, score each against the user's
known taste, and recommend what to order — fast, because they are sitting at a table.

## Reference files (read before scoring)

- `taste-profile.md` — what the user likes and dislikes, distilled from 85 Vivino ratings. Read it first.
- `producers.md` — the user's curated list of producers they want to explore, with notes on which fit their taste.
- `data/ratings.csv` — every wine the user has rated (my_rating, vivino_avg, winery, wine, vintage, style, region).
  Grep it for each producer on the menu: an exact past rating beats any inference.
- `data/wishlist_and_cellar.csv` — wishlisted wines, and cellar bottles.
- `scripts/vivino_lookup.py` — fetches Vivino crowd scores from Vivino's public search page (needs
  `www.vivino.com` allowed on the network).

## Workflow

1. **Read the menu.** Open the image with the Read tool. Transcribe every wine: section (glass /
   bottle / Coravin), producer, wine or cuvée, appellation, vintage, price(s). If a line is hard to read,
   give your best reading and mark it `(?)` — never invent a wine that isn't there. If the photo is
   cropped, blurry, or only shows part of the list, say so and ask for another photo of the missing part.
2. **Ask nothing you don't need.** Only ask if a constraint would flip the answer and you can't infer it
   (e.g. two very different dishes). Otherwise state assumptions: one bottle, for the table, no stated budget.
   If the user mentions food, budget, glass vs bottle, or colour, apply it as a hard filter.
3. **Match against history.** For each wine, grep `data/ratings.csv` and `data/wishlist_and_cellar.csv`
   by producer (case-insensitive, accent-insensitive; try the distinctive part of the name).
   - Same wine already rated → use that rating directly (say "you gave this 4.3 on Vivino").
   - Same producer, different wine → strong signal, say which wine it was.
   - On the wishlist → big bonus; they already want it.
   - In `producers.md` → bonus, and note which section it came from.
4. **Cross-reference Vivino scores.** Look up the crowd score for every serious candidate (at least
   your top 5, ideally all bottles on the list) in one call:
   `python3 -I scripts/vivino_lookup.py "<producer> <wine/appellation>" "<next wine>" ...`
   (run from this skill's folder). It prints the vintage score, the all-vintage score and the number of ratings.
   - Search is fuzzy. Only use a result whose producer and wine match the menu line. Prefer the
     menu's vintage; otherwise use the all-vintage score and say so.
   - If a search returns nothing, retry once with a shorter query (producer + appellation). If it still
     misses, use `vivino_avg` from `data/ratings.csv` when the wine is there, else write "no Vivino score".
     Never make up a score.
   - Fewer than ~50 ratings = weak signal; say "few ratings".
   - **How to weigh it:** The user's ratings track the crowd closely overall (+0.05), so the Vivino score is
     a solid baseline. Adjust it with `taste-profile.md`: the user scores red Burgundy and Southern Italian
     reds *above* the crowd (up to +0.6), and natural/funky wines and Barolo *below* it (up to −0.6).
     So a 4.0 Hautes-Côtes red can beat a 4.3 natural white for the user. Say so when it happens.
5. **Score the rest by style** using `taste-profile.md`: likes, dislikes, and the "red flags" list.
   Use your own wine knowledge for producer reputation and house style (whole-cluster, oaky, natural, etc.).
   Combine with the Vivino score into a predicted the user rating (e.g. "Vivino 4.1 → you ≈ 4.3").
6. **Check value.** Restaurant markup is usually 2.5–4× retail. The user's comfort zone is €20–70 retail,
   so roughly €60–200 on a list. Flag a clear bargain or a clear rip-off if you know the retail price;
   if unsure about price, don't guess numbers.
   Vivino score per euro is a useful tiebreaker between similar-fit wines.
7. **Answer** in the format below. Keep it short enough to read at a table on a phone.

## Answer format

```
**Order this:** <Producer> <Wine> <Vintage> — <price> — Vivino <score> (<n> ratings) → you ≈ <predicted>
<one or two sentences: why it fits the user specifically, tied to their ratings or list>

**Also good:**
- <Wine> — <price> — Vivino <score> — <short reason> (e.g. "cheaper option", "by the glass", "if you want white")
- <Wine> — <price> — Vivino <score> — <short reason>

**Skip:** <wine(s) that look tempting but match the dislikes, one-line reason each> (only if relevant)
```

Then, only if useful: a one-line note on anything you couldn't read, or a food pairing tip.

Rules:
- Recommend wines that are actually on the menu. Never suggest something off-list as the main pick.
- Prefer the user's known loves over "objectively best" wines. A €60 Hautes-Côtes de Nuits beats a
  €140 Barolo for this drinker.
- Be honest about confidence: "you've rated this producer" > "fits your style" > "a guess".
- If nothing on the list fits well, say so and pick the least risky option.

## After the meal

If the user tells you what they ordered and how they liked it, suggest they rate it on Vivino, and offer to
add it to `data/ratings.csv` (append a row; keep the header) so future picks get better.
