(function () {
"use strict";
const W = window.WORLD;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

/* ---------- data ---------- */
const YEARS = W.real.map((_, i) => W.first + i);
const R = W.real;
const N = R.length;
const LAST = YEARS[N - 1];
const CUM = []; // value of $1 invested at the start of 1900, at the end of each year
R.reduce((v, r, i) => (CUM[i] = v * (1 + r)), 1);
const logs = R.map((r) => Math.log(1 + r));
const MU = logs.reduce((a, b) => a + b, 0) / N; // mean log return
const SIG = Math.sqrt(logs.reduce((a, b) => a + (b - MU) ** 2, 0) / (N - 1));
const GEO = Math.exp(MU) - 1; // the compound yearly rate history actually delivered
const ARITH = R.reduce((a, b) => a + b, 0) / N;

/* ---------- formatting ---------- */
let CUR = store.get("invest-cur") || "$";
if (!["$", "€", "£"].includes(CUR)) CUR = "$";
const pct = (r, d = 1) => (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(d) + "%";
const pctU = (r, d = 1) => (r * 100).toFixed(d) + "%";
const int = (n) => Math.round(n).toLocaleString("en-US");
function money(v, exact) {
  const s = v < 0 ? "−" : "";
  v = Math.abs(v);
  if (!exact && v >= 1e9) return s + CUR + (v / 1e9).toFixed(v >= 1e10 ? 1 : 2) + "B";
  if (!exact && v >= 1e6) return s + CUR + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + "M";
  if (!exact && v >= 1e4) return s + CUR + int(Math.round(v / 100) * 100);
  return s + CUR + int(v);
}
const dollars = (v) => "$" + (v >= 100 ? int(v) : v >= 10 ? v.toFixed(0) : v.toFixed(2));
const num = (el, fb) => { const n = parseFloat(String(el.value).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : fb; };

/* ---------- events ---------- */
const EVENTS = [
  { y: 1914, to: 1918, name: "First World War", short: "WWI", text: "Stock exchanges from London to New York close for months. Inflation in the war years eats away at what stocks earn." },
  { y: 1917, name: "Russian Revolution", short: "Russia", text: "The new government takes the companies. Russian shareholders lose everything, a reminder of why you don’t bet on one country." },
  { y: 1918, name: "Spanish flu", short: "Flu", text: "A pandemic that kills tens of millions, in the last year of the war." },
  { y: 1929, to: 1932, name: "Great Depression", short: "Depression", text: "The Wall Street crash, then bank failures across the world. US stocks fall almost 90% from top to bottom." },
  { y: 1939, to: 1945, name: "Second World War", short: "WWII", text: "Investors in Germany and Japan are nearly wiped out by the end of the war. Markets elsewhere recover before it is over." },
  { y: 1974, name: "Oil crisis", short: "Oil", text: "Oil prices quadruple and inflation runs into double digits. 1973 and 1974 together are among the worst two-year runs on record." },
  { y: 1987, name: "Black Monday", short: "1987", text: "Stocks fall more than 20% in a single October day. The year as a whole ended {dir}." },
  { y: 1990, name: "Japan’s bubble bursts", short: "Japan", text: "Japan, then the world’s biggest stock market, starts a slide that takes decades to undo." },
  { y: 2000, to: 2002, name: "Dot-com crash", short: "Dot-com", text: "Internet stocks collapse. Three down years in a row." },
  { y: 2008, name: "Financial crisis", short: "2008", text: "Banks fail and world stocks have their worst year in decades." },
  { y: 2020, name: "Covid", short: "Covid", text: "Stocks fall by a third in five weeks, then finish the year {dir}." },
  { y: 2022, name: "Inflation returns", short: "Inflation", text: "Inflation hits 40-year highs and stocks and bonds fall together." },
].filter((e) => e.y >= W.first && e.y <= LAST);
const idx = (y) => y - W.first;
const evText = (e) => e.text.replace("{dir}", R[idx(e.y)] >= 0 ? "up" : "down");
const eventsFor = (y) => EVENTS.filter((e) => y >= e.y && y <= (e.to || e.y));

/* ---------- svg helpers ---------- */
const svgNS = "http://www.w3.org/2000/svg";
function ticksLin(min, max, n) {
  const step0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
function placeTip(tip, box, x, y) {
  const w = tip.offsetWidth, h = tip.offsetHeight, bw = box.clientWidth;
  let left = x + 14;
  if (left + w > bw) left = x - w - 14;
  left = Math.max(0, Math.min(left, bw - w));
  tip.style.transform = `translate(${left}px,${Math.max(0, y - h - 12)}px)`;
}
function whenVisible(el, fn) {
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "0px 0px -15% 0px" });
  io.observe(el);
}
function onResize(el, fn) {
  let w = el.clientWidth, t;
  if (!("ResizeObserver" in window)) return addEventListener("resize", () => fn());
  new ResizeObserver(() => { if (el.clientWidth === w) return; w = el.clientWidth; clearTimeout(t); t = setTimeout(fn, 80); }).observe(el);
}

/* ---------- hero line ---------- */
function drawHero() {
  const svg = $("#heroLine"), w = svg.clientWidth || 760, h = w < 500 ? 150 : 200;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const lmin = Math.log(Math.min(1, ...CUM)), lmax = Math.log(Math.max(...CUM));
  const pad = w < 500 ? 70 : 96;
  const X = (i) => (i + 1) / N * (w - pad);
  const Y = (v) => h - 14 - (Math.log(v) - lmin) / (lmax - lmin) * (h - 40);
  let d = `M0 ${Y(1).toFixed(1)}`;
  CUM.forEach((v, i) => (d += ` L${X(i).toFixed(1)} ${Y(v).toFixed(1)}`));
  const end = CUM[N - 1];
  svg.innerHTML =
    `<path d="${d}" pathLength="1" class="${reduced ? "" : "drawn"}" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<circle cx="0" cy="${Y(1)}" r="3" fill="var(--ink)"/>` +
    `<circle cx="${X(N - 1)}" cy="${Y(end)}" r="3.5" fill="var(--ink)" style="${reduced ? "" : "animation:rise .5s var(--ease) 2.4s backwards"}"/>` +
    `<text x="0" y="${h}" font-family="Space Mono, monospace" font-size="10" letter-spacing=".08em" fill="var(--muted)">$1 IN ${W.first}</text>` +
    `<text x="${X(N - 1) + 10}" y="${Y(end) + 8}" font-family="Instrument Serif, serif" font-size="${w < 500 ? 22 : 30}" fill="var(--ink)" style="${reduced ? "" : "animation:rise .6s var(--ease) 2.5s backwards"}">${dollars(end)}</text>` +
    `<text x="${X(N - 1) + 10}" y="${Y(end) + 24}" font-family="Space Mono, monospace" font-size="10" letter-spacing=".08em" fill="var(--muted)" style="${reduced ? "" : "animation:rise .6s var(--ease) 2.6s backwards"}">IN ${LAST}</text>`;
}

/* ---------- history chart ---------- */
const H = { view: "bars", sel: -1, animated: { bars: false, growth: false }, geo: null };
function drawHistory() {
  const box = $("#histChart"), svg = $("#histSvg"), w = box.clientWidth, narrow = w < 560;
  const h = narrow ? 320 : 380;
  const m = { t: narrow ? 50 : 58, r: 6, b: 22, l: narrow ? 34 : 40 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b, step = iw / N;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  const X = (i) => m.l + i * step;
  let Y, ticks, out = "";
  const anim = !reduced && !H.animated[H.view];
  H.animated[H.view] = true;

  if (H.view === "bars") {
    const lo = Math.floor(Math.min(...R) * 10) / 10, hi = Math.ceil(Math.max(...R) * 10) / 10;
    Y = (r) => m.t + (hi - r) / (hi - lo) * ih;
    ticks = ticksLin(lo, hi, narrow ? 4 : 6).map((v) => [v, Y(v), (v > 0 ? "+" : "") + Math.round(v * 100) + "%"]);
  } else {
    const lmin = Math.log(Math.min(...CUM) * 0.8), lmax = Math.log(Math.max(...CUM) * 1.25);
    Y = (v) => m.t + (lmax - Math.log(v)) / (lmax - lmin) * ih;
    ticks = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
      .filter((v) => Math.log(v) >= lmin && Math.log(v) <= lmax)
      .filter((v, _, a) => !narrow || a.length < 7 || [1, 10, 100, 1000].includes(v))
      .map((v) => [v, Y(v), "$" + int(v)]);
  }

  // war & crisis spans
  EVENTS.filter((e) => e.to).forEach((e) => {
    out += `<rect x="${X(idx(e.y)).toFixed(1)}" y="${m.t}" width="${((e.to - e.y + 1) * step).toFixed(1)}" height="${ih}" fill="var(--band)"/>`;
  });
  // gridlines
  ticks.forEach(([v, y, l]) => {
    const zero = H.view === "bars" ? v === 0 : v === 1;
    out += `<line x1="${m.l}" x2="${w - m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${zero ? "var(--ink)" : "var(--rule)"}" stroke-width="${zero ? 1 : 0.75}"/>`;
    out += `<text x="${m.l - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${l}</text>`;
  });
  // decade labels
  for (let y = Math.ceil(W.first / 25) * 25; y <= LAST; y += narrow ? 25 : 25) {
    out += `<text x="${(X(idx(y)) + step / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle">${y}</text>`;
  }
  // data
  if (H.view === "bars") {
    const bw = Math.max(1, step - (step > 4 ? 1.5 : 0.6)), y0 = Y(0);
    R.forEach((r, i) => {
      const y = Y(r), top = Math.min(y, y0), hh = Math.max(0.75, Math.abs(y - y0));
      const up = r >= 0;
      out += `<rect class="bar ${up ? "up" : "dn"}${i === H.sel ? " sel" : ""}" data-i="${i}" x="${(X(i) + (step - bw) / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${hh.toFixed(2)}" rx="${bw > 4 ? 1 : 0}" fill="${up ? "var(--ink)" : "var(--down)"}"${anim ? ` style="animation-delay:${(i * 7)}ms"` : ' style="animation:none"'}/>`;
    });
  } else {
    let d = "";
    CUM.forEach((v, i) => (d += (i ? " L" : "M") + (X(i) + step).toFixed(1) + " " + Y(v).toFixed(1)));
    d = `M${m.l} ${Y(1).toFixed(1)} L` + d.slice(1);
    out += `<path d="${d}" pathLength="1" class="${anim ? "drawn" : ""}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>`;
  }

  // event labels: spans first, then single years, packed into rows above the plot
  const rows = [[], [], []], rowY = [m.t - 36, m.t - 20, m.t - 6];
  const fs = 12, cw = narrow ? 7 : 7.4;
  const ordered = EVENTS.slice().sort((a, b) => (b.to ? 1 : 0) - (a.to ? 1 : 0));
  ordered.forEach((e) => {
    const label = narrow ? e.short : e.name;
    const cx = X(idx(e.y)) + ((e.to || e.y) - e.y + 1) * step / 2;
    const tw = label.length * cw;
    let x0 = Math.max(m.l, Math.min(cx - tw / 2, w - m.r - tw));
    const row = rows.findIndex((r) => r.every(([a, b]) => x0 + tw + 8 < a || x0 > b + 8));
    if (row < 0) return;
    rows[row].push([x0, x0 + tw]);
    const ly = rowY[row];
    const target = H.view === "bars" ? Math.min(Y(Math.max(0, R[idx(e.y)])), Y(0)) - 3 : Y(CUM[idx(e.y)]) - 6;
    out += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${ly + 4}" y2="${e.to ? m.t : target.toFixed(1)}" stroke="var(--muted)" stroke-width=".75" stroke-dasharray="${e.to ? "0" : "2 2"}"/>`;
    out += `<text class="ev" x="${(x0 + tw / 2).toFixed(1)}" y="${ly}" text-anchor="middle" style="font-size:${fs}px">${esc(label)}</text>`;
  });

  // selection marker + hit area
  out += `<line id="histCross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="var(--ink)" stroke-width="1" opacity="0"/>`;
  out += `<circle id="histDot" r="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" opacity="0"/>`;
  out += `<rect id="histHit" x="${m.l}" y="0" width="${iw}" height="${h}" fill="transparent"/>`;
  svg.innerHTML = out;
  H.geo = { X, Y, step, m, ih, w, h };
  if (H.sel >= 0) select(H.sel, false);
}
function select(i, fromPointer, py) {
  if (i < 0 || i >= N) return;
  H.sel = i;
  const { X, Y, step, m } = H.geo, cx = X(i) + step / 2;
  const cross = $("#histCross"), dot = $("#histDot"), tip = $("#histTip");
  $$("#histSvg .bar").forEach((b) => b.setAttribute("opacity", +b.dataset.i === i ? 1 : 0.45));
  cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("opacity", H.view === "growth" ? 0.35 : 0);
  if (H.view === "growth") { dot.setAttribute("cx", X(i) + step); dot.setAttribute("cy", Y(CUM[i])); dot.setAttribute("opacity", 1); } else dot.setAttribute("opacity", 0);
  const ev = eventsFor(YEARS[i]);
  tip.innerHTML = `<div class="y">${YEARS[i]}</div><div class="v">${pct(R[i])} after inflation</div>` +
    (ev.length ? `<div class="e">${ev.map((e) => `<b>${esc(e.name)}.</b> ${esc(evText(e))}`).join("<br>")}</div>` : "") +
    `<div class="m">$1 from ${W.first} → ${dollars(CUM[i])}</div>`;
  tip.classList.add("on");
  const ty = H.view === "bars" ? Math.min(Y(Math.max(R[i], 0)), Y(0)) : Y(CUM[i]);
  placeTip(tip, $("#histChart"), cx, fromPointer && py != null ? Math.min(py, ty) : ty);
}
function clearSel() {
  H.sel = -1;
  $("#histTip").classList.remove("on");
  $$("#histSvg .bar").forEach((b) => b.removeAttribute("opacity"));
  const c = $("#histCross"), d = $("#histDot");
  if (c) c.setAttribute("opacity", 0);
  if (d) d.setAttribute("opacity", 0);
}
function bindHistory() {
  const svg = $("#histSvg");
  svg.setAttribute("tabindex", "0");
  const at = (e) => {
    const r = svg.getBoundingClientRect(), x = e.clientX - r.left;
    return [Math.floor((x - H.geo.m.l) / H.geo.step), e.clientY - r.top];
  };
  svg.addEventListener("pointermove", (e) => { const [i, y] = at(e); if (i >= 0 && i < N) select(i, true, y); });
  svg.addEventListener("pointerdown", (e) => { const [i, y] = at(e); if (i >= 0 && i < N) select(i, true, y); });
  svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") clearSel(); });
  svg.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -10, ArrowUp: 10 }[e.key];
    if (k == null) { if (e.key === "Escape") clearSel(); return; }
    e.preventDefault();
    select(Math.max(0, Math.min(N - 1, (H.sel < 0 ? N : H.sel) + k)), false);
  });
  svg.addEventListener("blur", clearSel);
  $$("[data-view]").forEach((b) => b.addEventListener("click", () => {
    H.view = b.dataset.view;
    $$("[data-view]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    $("#histHint").textContent = H.view === "bars" ? "After inflation · hover or tap a year" : "After inflation · log scale, so equal steps are equal % growth";
    clearSel();
    drawHistory();
  }));
}
function historyText() {
  const up = R.filter((r) => r >= 0).length;
  let worst = 0; R.forEach((r, i) => { if (r < R[worst]) worst = i; });
  // the longest time from a real-terms peak to the next new high
  // peakI = the year-end of the last high (-1 = the start of the data); a wait is the years until a higher year-end
  let peak = 1, peakI = -1, best = { len: 0, from: W.first, open: false };
  const fromYear = (pi) => (pi < 0 ? W.first - 1 : YEARS[pi]);
  CUM.forEach((v, i) => {
    if (v >= peak) {
      if (i - peakI > best.len) best = { len: i - peakI, from: fromYear(peakI), open: false };
      peak = v; peakI = i;
    }
  });
  if (N - 1 - peakI > best.len) best = { len: N - 1 - peakI, from: fromYear(peakI), open: true };
  const wEv = eventsFor(YEARS[worst])[0];
  $("#histStats").innerHTML = [
    ["Up years", `${up} of ${N}`, `years ended higher than they started, after inflation`],
    ["A year, on average", pct(GEO), `compound growth after inflation, ${W.first}–${LAST}`],
    ["Worst year", pct(R[worst], 0), `${YEARS[worst]}${wEv ? ", " + wEv.name.toLowerCase() : ""}`],
    ["Longest wait", `${best.len} years`, best.open ? `since the ${best.from} peak, and still waiting` : `for a new high after the ${best.from} peak. It happens; be ready for it`],
  ].map(([k, n, p]) => `<div><span class="mono">${k}</span><div class="n tab">${n}</div><p>${p}</p></div>`).join("");

  $("#histDesc").textContent = `Bar chart of world stock market returns after inflation for each year from ${W.first} to ${LAST}. ${up} of ${N} years were positive. Average compound growth ${pctU(GEO)} a year. Worst year ${YEARS[worst]} at ${pct(R[worst], 0)}. One dollar grew to ${dollars(CUM[N - 1])}.`;

  $("#evList").innerHTML = EVENTS.map((e) => {
    const span = e.to ? `${e.y}–${String(e.to).slice(2)}` : String(e.y);
    const tot = e.to ? CUM[idx(e.to)] / (idx(e.y) ? CUM[idx(e.y) - 1] : 1) - 1 : R[idx(e.y)];
    return `<li><span class="yr">${span}</span><span><b>${esc(e.name)}.</b> ${esc(evText(e))}</span><span class="rv tab">${pct(tot, 0)}${e.to ? " total" : ""}</span></li>`;
  }).join("");
  $("#histTable").innerHTML = `<thead><tr><th style="text-align:left">Year</th><th>After inflation</th><th>$1 from ${W.first}</th></tr></thead><tbody>` +
    R.map((r, i) => `<tr><td style="text-align:left">${YEARS[i]}</td><td>${pct(r)}</td><td>${dollars(CUM[i])}</td></tr>`).join("") + "</tbody>";
  $("#histSource").innerHTML = W.sourceHtml;
}

/* ---------- haystack ---------- */
function haystack() {
  const WIN = [13, 38, 66, 87];
  const g = $("#grid100");
  g.innerHTML = Array.from({ length: 100 }, (_, i) => `<i class="${WIN.includes(i) ? "win" : ""}"></i>`).join("");
  const cells = Array.from(g.children);
  let tries = 0, missed = 0;
  const pick10 = () => { const a = Array.from({ length: 100 }, (_, i) => i); for (let i = 0; i < 10; i++) { const j = i + Math.floor(Math.random() * (100 - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 10); };
  $("#pickBtn").addEventListener("click", () => {
    const p = pick10(), hit = p.filter((i) => WIN.includes(i)).length;
    g.classList.add("picking");
    cells.forEach((c, i) => c.classList.toggle("pk", p.includes(i)));
    tries++; if (!hit) missed++;
    $("#hayOut").textContent = hit === 0 ? "You missed all four. Your ten stocks, together, would likely have done no better than cash."
      : hit === 1 ? "You found one winner. Lucky, and it’s only one tenth of your money."
      : `You found ${hit}. Very lucky. Try again and see if it lasts.`;
    $("#hayTally").textContent = `${tries} ${tries === 1 ? "try" : "tries"} · missed every winner ${missed} ${missed === 1 ? "time" : "times"}`;
  });
  $("#pick1000").addEventListener("click", () => {
    let none = 0, all = 0;
    for (let k = 0; k < 1000; k++) { const h = pick10().filter((i) => WIN.includes(i)).length; if (!h) none++; if (h === 4) all++; }
    $("#hayOut").textContent = `Out of 1,000 random portfolios, ${int(none)} missed every winner. ${all ? int(all) + " found all four." : "Not one found all four."} The index fund found all four, every time.`;
  });
}

/* ---------- fees ---------- */
function fees() {
  const rows = [["Index fund", 0.002], ["Typical active fund", 0.01], ["Fund + adviser", 0.02]];
  const vals = rows.map(([, f]) => 10000 * ((1 + GEO) * (1 - f)) ** 40);
  $("#feeBars").innerHTML = rows.map(([l, f], i) =>
    `<div class="r"><span>${l} <span class="mono">${(f * 100).toFixed(1)}%</span></span><span class="t"><span class="f" style="display:block;width:${(vals[i] / vals[0] * 100).toFixed(1)}%"></span></span><span class="v tab">${money(vals[i])}</span></div>`
  ).join("") + `<p class="note">At 1% a year you keep ${Math.round(vals[1] / vals[0] * 100)}% of what the index fund would have made you. At 2%, ${Math.round(vals[2] / vals[0] * 100)}%. The market’s return was the same for all three.</p>`;
}

/* ---------- what you own ---------- */
const OWN = {
  countries: { note: "Approximate weights in a total world index (MSCI ACWI IMI, FTSE Global All Cap), late 2025. They shift every day.", rows: [
    ["United States", 63], ["Japan", 5], ["United Kingdom", 3], ["China", 3], ["Canada", 3], ["Taiwan", 2], ["France", 2], ["Germany", 2], ["Switzerland", 2], ["India", 2], ["About 40 other countries", 13, 1]] },
  sectors: { note: "Approximate sector weights in a total world index, late 2025. Technology’s share has roughly doubled in fifteen years; in 1900 railways were the biggest sector.", rows: [
    ["Information technology", 27], ["Financials", 17], ["Industrials", 11], ["Consumer discretionary", 10], ["Communication services", 9], ["Health care", 9], ["Consumer staples", 5], ["Energy", 4], ["Materials", 3], ["Utilities", 3], ["Real estate", 2]] },
  companies: { note: "Approximate weights of the largest holdings in a total world index, late 2025. The top ten are under a quarter of the fund; the rest is spread across about 9,000 companies.", rows: [
    ["Nvidia", 4.8], ["Apple", 4.0], ["Microsoft", 3.6], ["Alphabet", 2.9], ["Amazon", 2.2], ["Broadcom", 1.6], ["Meta", 1.4], ["TSMC", 1.2], ["Tesla", 1.2], ["Berkshire Hathaway", 0.7], ["About 9,000 others", 76.4, 1]] },
};
let ownBy = "countries";
function own() {
  const amt = num($("#ownAmt"), 0), set = OWN[ownBy], max = Math.max(...set.rows.filter((r) => !r[2]).map((r) => r[1]));
  const scale = Math.max(max, ...set.rows.map((r) => r[1]));
  $("#ownRows").innerHTML = set.rows.map(([n, p, rest]) =>
    `<div class="r${rest ? " rest" : ""}"><span class="nm">${esc(n)}</span><span class="t"><span class="f" style="display:block;width:${(p / scale * 100).toFixed(1)}%"></span></span><span class="p tab">${p < 10 && p % 1 ? p.toFixed(1) : p}%</span><span class="a tab">${money(amt * p / 100, true)}</span></div>`
  ).join("");
  $("#ownNote").textContent = set.note;
}
function bindOwn() {
  $$("[data-own]").forEach((b) => b.addEventListener("click", () => {
    ownBy = b.dataset.own;
    $$("[data-own]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    own();
  }));
  $("#ownAmt").addEventListener("input", own);
  $("#ownAmt").addEventListener("blur", (e) => { e.target.value = int(num(e.target, 0)); });
}

/* ---------- Monte Carlo ---------- */
const SIMS = 10000;
let MODE = "boot", EXP = "hist", MC = null;
// "Cautious" shifts every year down by the same amount, so the compound average lands on 5%,
// about what the Dimson-Marsh-Staunton data (which includes the markets that went to zero) shows.
const SHIFT = () => (EXP === "cautious" ? Math.log(1.05) - MU : 0);
const geoNow = () => Math.exp(MU + SHIFT()) - 1;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function simulate() {
  const start = Math.max(0, num($("#cStart"), 0));
  const monthly = Math.max(0, num($("#cMonthly"), 0));
  const Y = Math.round(Math.max(1, Math.min(60, num($("#cYears"), 30))));
  const fee = Math.max(0, Math.min(5, num($("#cFee"), 0))) / 100;
  const yearly = monthly * 12, rand = rng(1900), k = Math.exp(SHIFT()), mu = MU + SHIFT();
  const vals = new Float64Array(SIMS * (Y + 1));
  let z2 = null;
  const normal = () => { if (z2 != null) { const z = z2; z2 = null; return z; } let u = 0, v = 0; while (!u) u = rand(); v = rand(); const r = Math.sqrt(-2 * Math.log(u)); z2 = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); };
  for (let s = 0; s < SIMS; s++) {
    let v = start, o = s * (Y + 1);
    vals[o] = v;
    for (let t = 1; t <= Y; t++) {
      const g = (MODE === "boot" ? (1 + R[Math.floor(rand() * N)]) * k : Math.exp(mu + SIG * normal())) * (1 - fee);
      // deposits arrive through the year, so on average they get half a year of growth
      v = v * g + yearly * Math.sqrt(g);
      vals[o + t] = v;
    }
  }
  const Q = [0.1, 0.25, 0.5, 0.75, 0.9], q = Q.map(() => new Float64Array(Y + 1)), col = new Float64Array(SIMS);
  for (let t = 0; t <= Y; t++) {
    for (let s = 0; s < SIMS; s++) col[s] = vals[s * (Y + 1) + t];
    col.sort();
    Q.forEach((p, k) => (q[k][t] = col[Math.floor(p * (SIMS - 1))]));
  }
  const paid = Array.from({ length: Y + 1 }, (_, t) => start + yearly * t);
  let below = 0;
  for (let s = 0; s < SIMS; s++) if (vals[s * (Y + 1) + Y] < paid[Y]) below++;
  const gNet = (1 + geoNow()) * (1 - fee), steady = [start];
  for (let t = 1; t <= Y; t++) steady.push(steady[t - 1] * gNet + yearly * Math.sqrt(gNet));
  const paths = Array.from({ length: 28 }, (_, k) => { const s = Math.floor(k * SIMS / 28); return Array.from(vals.subarray(s * (Y + 1), (s + 1) * (Y + 1))); });
  MC = { Y, q, paid, steady, paths, below: below / SIMS, fee };
}
let mcAnimated = false;
function drawMC() {
  if (!MC) return;
  const box = $("#mcChart"), svg = $("#mcSvg"), w = box.clientWidth, narrow = w < 560, h = narrow ? 300 : 360;
  const m = { t: 12, r: narrow ? 8 : 12, b: 24, l: narrow ? 52 : 64 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b, { Y, q, paid, steady, paths } = MC;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  const top = Math.max(q[4][Y], steady[Y], paid[Y]) * 1.08 || 1;
  const X = (t) => m.l + t / Y * iw, Yp = (v) => m.t + ih - Math.min(v, top * 1.5) / top * ih;
  const line = (arr) => Array.from(arr).map((v, t) => (t ? "L" : "M") + X(t).toFixed(1) + " " + Yp(v).toFixed(1)).join(" ");
  const area = (a, b) => line(a) + " " + Array.from(b).map((v, t) => "L" + X(t).toFixed(1) + " " + Yp(v).toFixed(1)).reverse().join(" ") + " Z";
  const anim = !reduced && !mcAnimated; mcAnimated = true;
  let out = `<defs><clipPath id="mcClip"><rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></clipPath></defs>`;
  ticksLin(0, top, narrow ? 4 : 5).forEach((v) => {
    out += `<line x1="${m.l}" x2="${w - m.r}" y1="${Yp(v).toFixed(1)}" y2="${Yp(v).toFixed(1)}" stroke="${v === 0 ? "var(--ink)" : "var(--rule)"}" stroke-width="${v === 0 ? 1 : 0.75}"/>`;
    out += `<text x="${m.l - 6}" y="${(Yp(v) + 3.5).toFixed(1)}" text-anchor="end">${v === 0 ? 0 : money(v)}</text>`;
  });
  ticksLin(0, Y, narrow ? 4 : 6).filter((t) => t % 1 === 0).forEach((t) => {
    out += `<text x="${X(t).toFixed(1)}" y="${h - 6}" text-anchor="middle">${t === 0 ? "Now" : "Year " + t}</text>`;
  });
  out += `<g clip-path="url(#mcClip)">`;
  out += `<path d="${area(q[0], q[4])}" fill="var(--band)"/>`;
  out += `<path d="${area(q[1], q[3])}" fill="#CFC5B2"/>`;
  paths.forEach((p, k) => (out += `<path d="${line(p)}" fill="none" stroke="var(--ink)" stroke-width=".7" opacity=".1"${anim ? ` pathLength="1" class="drawn" style="animation-duration:1.6s;animation-delay:${(k * 25)}ms"` : ""}/>`));
  out += `</g>`;
  out += `<path d="${line(paid)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="1.5 3.5" stroke-linecap="round"/>`;
  out += `<path d="${line(steady)}" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  out += `<path d="${line(q[2])}" fill="none" stroke="var(--ink)" stroke-width="2.25" stroke-linejoin="round"${anim ? ` pathLength="1" class="drawn" style="animation-duration:1.4s"` : ""}/>`;
  out += `<circle cx="${X(Y)}" cy="${Yp(q[2][Y])}" r="4" fill="var(--ink)"/>`;
  out += `<line id="mcCross" y1="${m.t}" y2="${m.t + ih}" stroke="var(--ink)" stroke-width="1" opacity="0"/><circle id="mcDot" r="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" opacity="0"/>`;
  out += `<rect id="mcHit" x="${m.l - 6}" y="0" width="${iw + 12}" height="${h}" fill="transparent"/>`;
  svg.innerHTML = out;
  MC.geo = { X, Yp, m, iw };

  const f = (k) => q[k][Y];
  $("#outcomes").innerHTML = [
    ["Middle outcome", money(f(2)), "half of the futures end above this, half below"],
    ["A bad future", money(f(0)), "1 in 10 futures end below this"],
    ["A good future", money(f(4)), "1 in 10 futures end above this"],
    ["You put in", money(paid[Y]), paid[Y] > 0 ? `the middle outcome is ${(f(2) / paid[Y]).toFixed(1)}× that` : "nothing yet"],
  ].map(([k, n, p]) => `<div><span class="mono">${k}</span><div class="n tab">${n}</div><p>${p}</p></div>`).join("");
  const b = MC.below;
  $("#verdict").textContent = paid[Y] <= 0 ? "Put something in to see what it could become."
    : b < 0.01 ? `In fewer than 1 in 100 futures do you end up with less than you put in. Over ${Y} years, time does most of the work.`
    : `In ${Math.round(b * 100)} of 100 futures you end up with less than you put in, after inflation. ${Y < 15 ? "Over short stretches, stocks can and do lose. Time is what makes them safer." : "Rare, but it happens. That is the price of the higher return."}`;
}
function mcTip(t, py) {
  if (!MC || !MC.geo) return;
  const { X, Yp } = MC.geo, tip = $("#mcTip");
  t = Math.max(0, Math.min(MC.Y, t));
  const c = $("#mcCross"), d = $("#mcDot"), x = X(t);
  c.setAttribute("x1", x); c.setAttribute("x2", x); c.setAttribute("opacity", 0.35);
  d.setAttribute("cx", x); d.setAttribute("cy", Yp(MC.q[2][t])); d.setAttribute("opacity", 1);
  tip.innerHTML = `<div class="y">${t === 0 ? "Now" : "Year " + t}</div><div class="v">Middle ${money(MC.q[2][t])}</div>` +
    `<div class="e">8 in 10 futures between ${money(MC.q[0][t])} and ${money(MC.q[4][t])}</div><div class="m">Put in so far ${money(MC.paid[t])}</div>`;
  tip.classList.add("on");
  placeTip(tip, $("#mcChart"), x, Math.min(py, Yp(MC.q[2][t])));
}
function bindMC() {
  const svg = $("#mcSvg");
  svg.setAttribute("tabindex", "0");
  let cur = -1;
  const at = (e) => { const r = svg.getBoundingClientRect(); return [Math.round((e.clientX - r.left - MC.geo.m.l) / MC.geo.iw * MC.Y), e.clientY - r.top]; };
  const mv = (e) => { const [t, y] = at(e); cur = Math.max(0, Math.min(MC.Y, t)); mcTip(cur, y); };
  svg.addEventListener("pointermove", mv);
  svg.addEventListener("pointerdown", mv);
  const hide = () => { $("#mcTip").classList.remove("on"); const c = $("#mcCross"), d = $("#mcDot"); if (c) c.setAttribute("opacity", 0); if (d) d.setAttribute("opacity", 0); };
  svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (k == null) return;
    e.preventDefault(); cur = Math.max(0, Math.min(MC.Y, (cur < 0 ? MC.Y : cur) + k)); mcTip(cur, MC.geo.Yp(MC.q[4][cur]));
  });
  let t;
  const run = () => { clearTimeout(t); t = setTimeout(() => { simulate(); drawMC(); }, 120); };
  $$("#calc input").forEach((el) => {
    el.addEventListener("input", run);
    el.addEventListener("blur", () => { if (el.id === "cStart" || el.id === "cMonthly") el.value = int(num(el, 0)); });
  });
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    MODE = b.dataset.mode;
    $$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    modeNote(); simulate(); drawMC();
  }));
  $$("[data-exp]").forEach((b) => b.addEventListener("click", () => {
    EXP = b.dataset.exp;
    $$("[data-exp]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    modeNote(); simulate(); drawMC();
  }));
  $("#expHist").textContent = "History · " + pctU(GEO);
}
function modeNote() {
  const how = MODE === "boot"
    ? `Each future year is a real year from ${W.first}–${LAST}, picked at random. So 1931 or 2008 can happen to you, maybe twice, and so can the great years.`
    : `Each future year comes from a smooth bell curve with an average of ${pctU(geoNow())} a year compounded and history’s spread (${pctU(SIG, 0)} up or down in a typical year).`;
  const exp = EXP === "cautious"
    ? ` Every year is nudged down so the average is 5%, closer to what the full record shows once markets that went to zero are counted.`
    : ` History as recorded averages ${pctU(GEO)} after inflation, which flatters it a little (see the sources above).`;
  $("#modeNote").textContent = how + exp;
}

/* ---------- currency ---------- */
function setCur(c) {
  CUR = c; store.set("invest-cur", c);
  $$(".cur").forEach((el) => (el.textContent = c));
  $$("[data-cur]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.cur === c));
  own(); fees(); drawMC();
}
$$("[data-cur]").forEach((b) => b.addEventListener("click", () => setCur(b.dataset.cur)));

/* ---------- start ---------- */
drawHero();
historyText();
bindHistory();
haystack();
bindOwn();
bindMC();
modeNote();
simulate();
setCur(CUR);
const hc = $("#histChart");
$("#histSvg").setAttribute("height", hc.clientWidth < 560 ? 320 : 380);
whenVisible(hc, () => { drawHistory(); onResize(hc, drawHistory); });
let mcShown = false;
whenVisible($("#mcChart"), () => { mcShown = true; mcAnimated = false; drawMC(); onResize($("#mcChart"), drawMC); });
onResize($("#heroLine").parentElement, drawHero);
})();
