#!/usr/bin/env python3
"""Builds public/investing/returns.js: one real (after-inflation) world stock return per year since 1900,
and world government bond returns built the same way.

1900 to the last JST year: the Jorda-Schularick-Taylor Macrohistory Database (macrohistory.net).
  For each country with stock returns, the equity total return in local currency is turned into US dollars with
  the exchange rate, the countries are weighted by the previous year's real GDP (Maddison GDP per head times population), and the result is
  deflated by US inflation. That is the return a US-dollar investor in a GDP-weighted world portfolio
  would have had. Countries without a return in a year drop out of that year.
After that: MSCI ACWI net total return in USD for stocks and the Bloomberg Global Aggregate in USD, unhedged,
for bonds, both deflated by US CPI-U (December to December).

Usage: python3 -I scripts/investing-returns.py JSTdatasetR6.xlsx > public/investing/returns.js
Standard library only; reads the .xlsx directly.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Calendar years after the JST data ends: (MSCI ACWI net total return in USD, US CPI-U December to December).
# ACWI: MSCI ACWI index factsheet, annual performance table. CPI-U: BLS series CUUR0000SA0, December values
# 2020 260.474, 2021 278.802, 2022 296.797, 2023 306.746, 2024 315.605, 2025 324.054.
_DEC = {2020: 260.474, 2021: 278.802, 2022: 296.797, 2023: 306.746, 2024: 315.605, 2025: 324.054}
_ACWI = {2021: 0.1854, 2022: -0.1836, 2023: 0.2220, 2024: 0.1749, 2025: 0.2234}
RECENT = {y: (_ACWI[y], _DEC[y] / _DEC[y - 1] - 1) for y in _ACWI}
# Bonds after the JST data ends: the Bloomberg Global Aggregate index, total return in USD, unhedged
# (the usual world bond benchmark; mostly government bonds). 2024 -1.69% and 2025 +8.17% from Bloomberg's
# "Looking back at" fixed income reviews; 2021-2023 from the index's published annual returns (YCharts ^BBGATR),
# matching the press at the time (2021 about -4.8%, 2022 a record -16.3%, 2023 a little under 6%).
_GLOBAL_AGG = {2021: -0.0471, 2022: -0.1625, 2023: 0.0572, 2024: -0.0169, 2025: 0.0817}

# The same portfolios as a Dutch investor saw them: dollar returns turned into guilders (euros from 1999,
# kept in guilder units at 2.20371) with the year-end exchange rate, then minus Dutch inflation.
# JST's guilder rate for 1946-1952 is a free-market rate (6.5 per dollar in 1946); the official rate was
# pegged at 2.65 until the September 1949 devaluation, then 3.80. A Dutch saver's foreign holdings were
# valued at the official rate, so those years use it.
NLG_OFFICIAL = {1946: 2.65, 1947: 2.65, 1948: 2.65, 1949: 3.80, 1950: 3.80, 1951: 3.80, 1952: 3.80}
NLG_PER_EUR = 2.20371
# after JST: ECB euro reference rate on the last business day of the year (dollars per euro), and
# CBS yearly average Dutch inflation (the JST price index is a yearly average too)
_EURUSD = {2020: 1.2271, 2021: 1.1326, 2022: 1.0666, 2023: 1.1050, 2024: 1.0389, 2025: 1.1750}
_NL_INFL = {2021: 0.027, 2022: 0.100, 2023: 0.038, 2024: 0.033, 2025: 0.033}

# Germany's hyperinflation (1923) and currency reform (1948) put the yearly return and the year-end
# exchange rate on different footings, which gives offsetting spikes (+830% then -87%, -87% then +700%).
# Each pair nets out close to flat, so leave both years of each pair out.
EXCLUDE = {("DEU", 1923), ("DEU", 1924), ("DEU", 1948), ("DEU", 1949)}


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    sheets = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
    root = ET.fromstring(z.read(sheets[0]))
    rows = []
    for row in root.iter("{%s}row" % NS["m"]):
        out = {}
        for c in row.findall("m:c", NS):
            col = re.match(r"[A-Z]+", c.get("r")).group(0)
            v = c.find("m:v", NS)
            if v is None:
                is_ = c.find("m:is", NS)
                val = "".join(t.text or "" for t in is_.iter("{%s}t" % NS["m"])) if is_ is not None else None
            elif c.get("t") == "s":
                val = shared[int(v.text)]
            elif c.get("t") in ("str", "inlineStr"):
                val = v.text
            else:
                try:
                    val = float(v.text)
                except (TypeError, ValueError):
                    val = None
            out[col] = val
        rows.append(out)
    header = rows[0]
    names = {col: str(name).strip() for col, name in header.items() if name is not None}
    return [{names[c]: r.get(c) for c in names} for r in rows[1:]]


def num(x):
    return x if isinstance(x, float) else None


def main(path):
    rows = read_xlsx(path)
    by = {}
    for r in rows:
        y, iso = num(r.get("year")), r.get("iso")
        if y is None or not iso:
            continue
        by[(iso, int(y))] = r
    isos = sorted({k[0] for k in by})
    years = sorted({k[1] for k in by})
    us_cpi = {y: num(by.get(("USA", y), {}).get("cpi")) for y in years}

    out, bonds, ever = [], [], set()
    real_eur, bonds_eur = [], []
    nl_xr = {y: NLG_OFFICIAL.get(y, num(by.get(("NLD", y), {}).get("xrusd"))) for y in years}
    nl_cpi = {y: num(by.get(("NLD", y), {}).get("cpi")) for y in years}

    def to_eur(nominal_usd, fx_ratio, infl_nl):
        return (1 + nominal_usd) * fx_ratio / (1 + infl_nl) - 1
    for y in range(1900, years[-1] + 1):
        tot_w, acc, used = 0.0, 0.0, []
        b_w, b_acc = 0.0, 0.0
        for iso in isos:
            cur, prev = by.get((iso, y)), by.get((iso, y - 1))
            if not cur or not prev or (iso, y) in EXCLUDE:
                continue
            tr, xr, xr0 = num(cur.get("eq_tr")), num(cur.get("xrusd")), num(prev.get("xrusd"))
            # weight: last year's real GDP in one shared unit (Maddison GDP per head x population).
            # JST's nominal "gdp" column uses different units per country, so it can't be compared.
            gpc0, pop0 = num(prev.get("rgdpmad")), num(prev.get("pop"))
            if None in (tr, xr, xr0, gpc0, pop0) or xr <= 0 or xr0 <= 0:
                continue
            usd = (1 + tr) * (xr0 / xr) - 1
            w = gpc0 * pop0
            acc += w * usd
            tot_w += w
            used.append(iso)
            ever.add(iso)
            btr = num(cur.get("bond_tr"))
            if btr is not None:
                b_acc += w * ((1 + btr) * (xr0 / xr) - 1)
                b_w += w
        if not tot_w or not us_cpi.get(y) or not us_cpi.get(y - 1):
            continue
        nominal = acc / tot_w
        infl = us_cpi[y] / us_cpi[y - 1] - 1
        real = (1 + nominal) / (1 + infl) - 1
        out.append((y, real))
        bonds.append((1 + b_acc / b_w) / (1 + infl) - 1)
        fx, infl_nl = nl_xr[y] / nl_xr[y - 1], nl_cpi[y] / nl_cpi[y - 1] - 1
        real_eur.append(to_eur(nominal, fx, infl_nl))
        bonds_eur.append(to_eur(b_acc / b_w, fx, infl_nl))

    last = out[-1][0]
    for y in sorted(RECENT):
        if y <= last:
            continue
        nominal, infl = RECENT[y]
        out.append((y, (1 + nominal) / (1 + infl) - 1))
        bonds.append((1 + _GLOBAL_AGG[y]) / (1 + infl) - 1)
        fx = (NLG_PER_EUR / _EURUSD[y]) / (NLG_PER_EUR / _EURUSD[y - 1])
        real_eur.append(to_eur(nominal, fx, _NL_INFL[y]))
        bonds_eur.append(to_eur(_GLOBAL_AGG[y], fx, _NL_INFL[y]))
    assert len(bonds) == len(out) == len(real_eur) == len(bonds_eur), "every series must cover the same years"
    # the hand-off from JST to the ECB rate must be seamless: JST's 2020 guilder rate is the ECB's 2020 rate
    assert abs(nl_xr[last] - NLG_PER_EUR / _EURUSD[last]) < 0.002, (nl_xr[last], NLG_PER_EUR / _EURUSD[last])

    first = out[0][0]
    assert [y for y, _ in out] == list(range(first, out[-1][0] + 1)), "gap in years"
    real = [round(r, 4) for _, r in out]
    # The page's source note (in i18n.js) names these: keep it in step if they change.
    sys.stderr.write(f"years {first}-{out[-1][0]}, JST until {last}, {len(ever)} countries\n")
    g = 1.0
    for r in real:
        g *= 1 + r
    sys.stderr.write(f"geometric real {g ** (1 / len(real)) - 1:.4f}, $1 -> {g:.1f}, min {min(real)}, max {max(real)}\n")
    print("/* Real yearly returns of a world stock portfolio and world government bonds: in US dollars after US inflation (real, bonds), and in guilders/euros after Dutch inflation (realEur, bondsEur). Built by scripts/investing-returns.py */")
    ge = 1.0
    for r in real_eur:
        ge *= 1 + r
    sys.stderr.write(f"euro series: geometric real {ge ** (1 / len(real_eur)) - 1:.4f}, 1 -> {ge:.1f}, min {min(real_eur):.4f}, max {max(real_eur):.4f}\n")
    r4 = lambda xs: [round(x, 4) for x in xs]
    print("window.WORLD = " + json.dumps({"first": first, "real": real, "bonds": r4(bonds), "realEur": r4(real_eur), "bondsEur": r4(bonds_eur)}) + ";")


if __name__ == "__main__":
    main(sys.argv[1])
