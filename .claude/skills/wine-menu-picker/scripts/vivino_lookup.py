#!/usr/bin/env python3
"""Look up Vivino crowd scores for a wine via Vivino's public search page.

Usage: python3 -I vivino_lookup.py "simon bize savigny talmettes" ["another query" ...]

Prints the top matches per query as:
  vintage_avg (n ratings) | wine_avg across vintages (n) | name
Search is fuzzy: results can be other producers' wines. Check the name matches.
A 0 average means too few ratings to show a score.
Needs network access to www.vivino.com. Uses only the public search page, no login.
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
VINTAGE = re.compile(
    r'"id":(\d+),"seo_name":"[^"]*","name":"((?:[^"\\]|\\.)*)","statistics":(\{[^{}]*\})')


def lookup(query, limit=6):
    url = "https://www.vivino.com/search/wines?q=" + urllib.parse.quote_plus(query)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=20) as r:
        page = html.unescape(r.read().decode("utf-8", "replace"))
    seen, out = set(), []
    for m in VINTAGE.finditer(page):
        name = json.loads('"' + m.group(2) + '"')
        if name in seen:
            continue
        seen.add(name)
        st = json.loads(m.group(3))
        out.append((st.get("ratings_average"), st.get("ratings_count"),
                    st.get("wine_ratings_average"), st.get("wine_ratings_count"), name))
        if len(out) >= limit:
            break
    return out


if __name__ == "__main__":
    for q in sys.argv[1:]:
        print(f"## {q}")
        try:
            rows = lookup(q)
        except Exception as e:  # network blocked, layout changed, etc.
            print(f"  lookup failed: {e}")
            continue
        if not rows:
            print("  no matches (page layout may have changed)")
        for va, vn, wa, wn, name in rows:
            print(f"  {va} ({vn}) | wine {wa} ({wn}) | {name}")
