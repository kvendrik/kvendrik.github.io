#!/usr/bin/env python3
"""Look up Vivino crowd scores for wines on a menu.

Usage:
  python3 vivino_lookup.py "Producer :: wine or appellation" ["Producer :: wine" ...]
  e.g. python3 vivino_lookup.py "Simon Bize :: Savigny Talmettes" "Hubert Lamy :: Saint-Aubin"

Put the producer before "::" when you can: results must then contain the producer's name,
which filters out the unrelated popular wines Vivino's search returns when it has no match.
Without "::" most words of the query must appear in the result.

For each query it:
  1. checks Koen's own ratings (ratings.csv next to this script, if present),
  2. searches Vivino with several variants (full query, without accents, producer +
     appellation, producer only) until one gives a confident match, preferring the
     vintage in the query if there is one,
  3. as a last resort, a LOOSE MATCH on the producer's most distinctive word
     (e.g. "Claire Naudin" -> "Naudin-Ferrand"); check those by hand.
Output per match: vintage score (n ratings) | all-vintage score (n) | name.
"no confident match" means: don't use a Vivino score for this wine, try a web search instead.
Standard library only; needs network access to www.vivino.com.
"""
import csv
import html
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
VINTAGE = re.compile(
    r'"id":(\d+),"seo_name":"[^"]*","name":"((?:[^"\\]|\\.)*)","statistics":(\{[^{}]*\})')
FILLER = {"domaine", "dom", "chateau", "maison", "bodegas", "cantina", "tenuta", "weingut", "cave",
          "de", "des", "du", "la", "le", "les", "di", "del", "et", "and", "fils", "the",
          "vin", "wine", "aoc", "doc", "docg"}
RATINGS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ratings.csv")


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def words(s):
    # Years are left out: they only sort results, otherwise "2019" alone would match any 2019 wine.
    return [w for w in norm(s).split() if w not in FILLER and len(w) > 1 and not re.fullmatch(r"(19|20)\d\d", w)]


def closeness(name, rest):
    need, have = words(rest), set(norm(name).split())
    return sum(w in have for w in need) / len(need) if need else 1


def matches(name, producer, rest, loose=False):
    if loose and not words(rest):
        return False
    have = set(norm(name).split())
    if producer:
        pw = words(producer) or norm(producer).split()
        if loose:  # only the producer's most distinctive (longest) word, e.g. "Naudin" in "Naudin-Ferrand"
            pw = [max(pw, key=len)]
        if not all(w in have for w in pw):
            return False
        return closeness(name, rest) >= (0.75 if loose else 0.5)
    need = words(rest)
    return bool(need) and sum(w in have for w in need) / len(need) >= 0.6


def search(query):
    url = "https://www.vivino.com/search/wines?q=" + urllib.parse.quote_plus(query)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=20) as r:
        page = html.unescape(r.read().decode("utf-8", "replace"))
    seen = {}
    for m in VINTAGE.finditer(page):
        name = json.loads('"' + m.group(2) + '"')
        if name not in seen:
            seen[name] = json.loads(m.group(3))
    return seen


def own_ratings(producer, rest):
    try:
        with open(RATINGS, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return []
    out = []
    for r in rows:
        name = f"{r['winery']} {r['wine']} {r['vintage']}"
        if matches(name, producer, rest) or (producer and matches(r["winery"], producer, "")):
            out.append(r)
    return out


def variants(producer, rest):
    full = f"{producer} {rest}".strip()
    v = [full, norm(full)]
    if producer:
        p = " ".join(words(producer)) or norm(producer)
        r = " ".join(words(rest))
        v += [f"{p} {r}".strip(), p]
    return list(dict.fromkeys(x for x in v if x))


def lookup(arg, limit=5):
    producer, _, rest = arg.partition("::") if "::" in arg else ("", "", arg)
    producer, rest = producer.strip(), rest.strip()
    print(f"## {arg}")
    exact = False
    for r in own_ratings(producer, rest):
        same = closeness(f"{r['wine']} {r['vintage']}", rest) >= 0.75
        exact = exact or same
        tag = "KOEN RATED THIS WINE" if same else "Koen rated this producer"
        print(f"  {tag}: {r['my_rating']} (Vivino {r['vivino_avg']}) {r['winery']} {r['wine']} {r['vintage']}")
    if exact:
        return  # the crowd score is already in Koen's ratings
    year = re.search(r"\b(19|20)\d\d\b", rest)
    tries = [(q, False) for q in variants(producer, rest)]
    if producer:
        tries += [(q, True) for q in variants(producer, rest)[-1:]] + [(max(words(producer) or [producer], key=len), True)]
    cache = {}
    for q, loose in tries:
        try:
            results = cache[q] if q in cache else cache.setdefault(q, search(q))
        except Exception as e:  # network blocked, timeout, layout change
            print(f"  lookup failed ({e}); use a web search instead")
            return
        good = [(n, s) for n, s in results.items() if matches(n, producer, rest, loose)]
        good.sort(key=lambda x: (-closeness(x[0], rest), bool(year) and year.group(0) not in x[0]))
        if good:
            if loose:
                print(f"  LOOSE MATCH (query: {q}): check it is the same producer before using it")
            elif q != tries[0][0]:
                print(f"  (matched with query: {q})")
            for n, s in good[:limit]:
                few = " few ratings" if (s.get("ratings_count") or 0) < 50 else ""
                print(f"  {s.get('ratings_average')} ({s.get('ratings_count')}) | "
                      f"wine {s.get('wine_ratings_average')} ({s.get('wine_ratings_count')}) | {n}{few}")
            return
    print("  no confident match on Vivino; try a web search, or say 'no Vivino score'")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for a in sys.argv[1:]:
        lookup(a)
