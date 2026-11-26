#!/usr/bin/env python3
"""Refresh the /wine data from a new Vivino export.

Usage: python3 -I scripts/wine-refresh.py <vivino-export.zip>

Rewrites public/wine/ratings.csv and public/wine/wishlist-and-cellar.csv from the
export (personal notes, reviews, prices paid, locations and account data are left
out), then prints a report to update public/wine/taste-profile.md and
public/wine/producers.md by hand: new ratings, stats by style, and which of
Pablo's recommended producers Koen has now tasted.

Get the export on vivino.com: profile icon > Settings > Account management >
Export your data. It can take 24-48 hours to be ready.
"""
import collections
import csv
import io
import json
import re
import sys
import time
import unicodedata
import urllib.request
import zipfile

OUT = "public/wine"
RATINGS = f"{OUT}/ratings.csv"
LISTS = f"{OUT}/wishlist-and-cellar.csv"
PRODUCERS = f"{OUT}/producers.md"


def read_csv(zf, name):
    match = [n for n in zf.namelist() if n.endswith("/" + name) or n == name]
    if not match:
        return []
    with zf.open(match[0]) as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")))


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def old_rows():
    try:
        with open(RATINGS, encoding="utf-8") as f:
            return {(r["winery"], r["wine"], r["vintage"]): r for r in csv.DictReader(f)}
    except FileNotFoundError:
        return {}


UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")


def fetch_grapes(link):
    """Grapes of one wine from its public Vivino page, or "" if that fails (no network, layout change)."""
    try:
        req = urllib.request.Request(link, headers={"User-Agent": UA, "Accept-Language": "en"})
        with urllib.request.urlopen(req, timeout=25) as f:
            final, page = f.geturl(), f.read().decode("utf-8", "replace")
        wid = re.search(r"/w/(\d+)", final)
        for m in re.finditer(r'"id":%s,' % wid.group(1), page) if wid else []:
            g = re.search(r'"grapes":(\[(?:[^\[\]]|\[[^\]]*\])*\])', page[m.start():m.start() + 20000])
            if g:
                names = [x["name"] for x in json.loads(g.group(1))]
                if names:
                    return "; ".join(names)
    except Exception:
        pass
    return ""


def main(path):
    with zipfile.ZipFile(path) as zf:
        wines = read_csv(zf, "full_wine_list.csv")
        wish = read_csv(zf, "wishlisted.csv")
        cellar = read_csv(zf, "cellar.csv")
    if not wines:
        sys.exit("No full_wine_list.csv in that zip. Is it a Vivino export?")

    rated = [r for r in wines if r.get("Your rating")]
    rated.sort(key=lambda r: -float(r["Your rating"]))
    before = old_rows()
    fetched = 0
    for r in rated:
        old = before.get((r["Winery"], r["Wine name"].strip(), r["Vintage"]))
        r["grapes"] = old.get("grapes", "") if old else ""
        if not r["grapes"] and r.get("Link to wine"):
            r["grapes"] = fetch_grapes(r["Link to wine"])
            fetched += 1
            time.sleep(0.4)

    with open(RATINGS, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["my_rating", "vivino_avg", "winery", "wine", "vintage", "style", "region", "country", "type", "grapes"])
        for r in rated:
            w.writerow([r["Your rating"], r["Average rating"], r["Winery"], r["Wine name"].strip(), r["Vintage"],
                        r["Regional wine style"], r["Region"], r["Country"], r["Wine type"], r["grapes"]])
    with open(LISTS, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["list", "winery", "wine", "vintage", "style", "type", "vivino_avg"])
        for kind, rows in (("wishlist", wish), ("cellar", cellar)):
            for r in rows:
                w.writerow([kind, r["Winery"], r["Wine name"], r["Vintage"], r["Regional wine style"],
                            r["Wine type"], r["Average rating"]])

    score = lambda r: float(r["Your rating"])
    avg = lambda xs: sum(xs) / len(xs)
    total = avg([score(r) for r in rated])
    crowd = [score(r) - float(r["Average rating"]) for r in rated if r["Average rating"]]
    print(f"Wrote {len(rated)} ratings, {len(wish)} wishlist and {len(cellar)} cellar wines.")
    print(f"Average {total:.2f}; vs Vivino crowd {avg(crowd):+.2f}")
    print(f"Grapes: {sum(1 for r in rated if r['grapes'])} of {len(rated)} known ({fetched} looked up on Vivino)\n")

    new = [r for r in rated if (r["Winery"], r["Wine name"].strip(), r["Vintage"]) not in before]
    print(f"## New or changed since last refresh: {len(new) if before else 'n/a (first run)'}")
    for r in new if before else []:
        print(f"  {r['Your rating']} {r['Winery']} | {r['Wine name'].strip()} {r['Vintage']} | "
              f"{r['Regional wine style']} | crowd {r['Average rating']}")

    for r in rated:
        g = [x.strip() for x in r["grapes"].split(";") if x.strip()]
        r["Lead grape"] = {"Spätburgunder": "Pinot Noir", "Pinot Nero": "Pinot Noir"}.get(g[0], g[0]) if g else ""
    for key in ("Wine type", "Country", "Regional wine style", "Lead grape"):
        groups = collections.defaultdict(list)
        for r in rated:
            groups[r[key] or "?"].append(score(r))
        print(f"\n## By {key.lower()} (2+ wines; avg vs overall {total:.2f})")
        for name, xs in sorted(groups.items(), key=lambda x: -len(x[1])):
            if len(xs) >= 2:
                print(f"  {name}: {len(xs)} wines, avg {avg(xs):.2f}")

    print("\n## Top 10")
    for r in rated[:10]:
        print(f"  {r['Your rating']} {r['Winery']} | {r['Wine name'].strip()} {r['Vintage']} | {r['Regional wine style']}")
    print("\n## Bottom 8")
    for r in rated[-8:]:
        print(f"  {r['Your rating']} {r['Winery']} | {r['Wine name'].strip()} {r['Vintage']} | {r['Regional wine style']}")

    try:
        names = re.findall(r"^\| ([^|]+?) \| ★", open(PRODUCERS, encoding="utf-8").read(), re.M)
    except FileNotFoundError:
        names = []
    hits = []
    for name in dict.fromkeys(names):
        n = norm(re.sub(r"\(.*?\)", "", name))
        for r in rated:
            if n and re.search(rf"\b{re.escape(n)}\b", norm(r["Winery"])):
                hits.append((name, r))
    print("\n## Pablo's producers Koen has now tasted (check the match; update producers.md)")
    for name, r in hits:
        print(f"  {name}: {r['Your rating']} for {r['Winery']} | {r['Wine name'].strip()} {r['Vintage']}")
    if not hits:
        print("  none yet")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
