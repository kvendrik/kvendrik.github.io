(function () {
"use strict";
const W = window.WORLD, I = window.I18N;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

/* Haptics on touch screens. Android: the Vibration API. iOS Safari 18+: clicking a hidden switch
   control plays the system tick. At most one tick every 35ms, so a fast drag doesn't buzz. */
const haptic = (() => {
  let last = 0;
  const tick = () => {
    if (typeof navigator.vibrate === "function") return void navigator.vibrate(6);
    const label = document.createElement("label"), input = document.createElement("input");
    label.setAttribute("aria-hidden", "true"); label.style.display = "none";
    input.type = "checkbox"; input.setAttribute("switch", "");
    label.appendChild(input); document.head.appendChild(label); label.click(); label.remove();
  };
  return (strong) => {
    if (!COARSE) return;
    const now = performance.now();
    if (now - last < 35) return;
    last = now;
    try {
      if (strong && typeof navigator.vibrate === "function") navigator.vibrate(14);
      else { tick(); if (strong) setTimeout(tick, 70); }
    } catch {}
  };
})();

/* ---------- data ---------- */
const R = W.real, N = R.length, FIRST = W.first, YEARS = R.map((_, i) => FIRST + i), LAST = YEARS[N - 1];
const CUM = []; // what $1 put in at the start of FIRST was worth at the end of each year, after inflation
R.reduce((v, r, i) => (CUM[i] = v * (1 + r)), 1);
const GEO = CUM[N - 1] ** (1 / N) - 1; // the compound yearly rate history delivered
const MU = Math.log(1 + GEO);
const PLAN = 0.05; // the planning return: about what the full record (DMS) shows once lost markets count
const START = 10000; // Bogle's chart: what $10,000 became

/* ---------- language & formatting ---------- */
// /beleggen/ is the Dutch page; /investing/ follows ?lang=, then the reader's last choice, then the browser
const ON_SITE = /^\/(investing|beleggen)(\/|$)/.test(location.pathname);
let LANG = (() => {
  if (ON_SITE && /^\/beleggen(\/|$)/.test(location.pathname)) return "nl";
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "nl") return q;
  const s = store.get("investing-lang");
  if (s === "en" || s === "nl") return s;
  return /^nl\b/i.test(navigator.language || "") ? "nl" : "en";
})();
const L = () => I[LANG];
const t = (k, ...a) => { const v = I[LANG][k]; return typeof v === "function" ? v(...a) : v; };
const nf = (v, d = 0) => v.toLocaleString(L().locale, { minimumFractionDigits: d, maximumFractionDigits: d });
const int = (v) => nf(Math.round(v));
const pct = (r, d = 1) => (r >= 0 ? "+" : "−") + nf(Math.abs(r * 100), d) + "%";
const pctU = (r, d = 1) => nf(r * 100, d) + "%";
function compact(sym, v) {
  const s = v < 0 ? "−" : "";
  v = Math.abs(v);
  if (v >= 1e9) return s + sym + nf(v / 1e9, v >= 1e10 ? 1 : 2) + L().B;
  if (v >= 1e6) return s + sym + nf(v / 1e6, v >= 1e7 ? 1 : 2) + L().M;
  if (v >= 1e5) return s + sym + int(Math.round(v / 1000) * 1000);
  if (v >= 1e4) return s + sym + int(Math.round(v / 100) * 100);
  return s + sym + int(v);
}
const money = (v) => compact(L().cur, v);
const usdBig = (v) => (v >= 1e6 ? L().cur + nf(v / 1e6, 1) + L().Mlong : L().cur + int(v >= 1e5 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100));
const usdTick = (v) => (v >= 1e6 ? L().cur + nf(v / 1e6, v % 1e6 ? 1 : 0) + L().M : L().cur + nf(v / 1e3, v % 1e3 ? 1 : 0) + L().K);
// Read what someone typed in the current language: "10,000.5" in English, "10.000,5" in Dutch.
function parse(s, lang = LANG) {
  s = String(s).trim();
  if (lang === "nl") {
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 10.000 is ten thousand; 0.2 stays a decimal
  } else s = s.replace(/,/g, "");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(n) ? n : NaN;
}
const num = (el, fb) => { const n = parse(el.value); return isFinite(n) ? n : fb; };

// the English text of each data-t element: read from the page once, or, on the Dutch page, shipped alongside it
const EN = (() => { try { return JSON.parse($("#i18n-en").textContent); } catch { return {}; } })();
function applyStatic() {
  const NL = I.html.nl, nl = LANG === "nl";
  $$("[data-t]").forEach((el) => {
    const k = el.dataset.t;
    if (!(k in EN)) EN[k] = el.innerHTML;
    el.innerHTML = nl && NL[k] != null ? NL[k] : EN[k];
  });
  $$("[data-ta]").forEach((el) => {
    const k = el.dataset.ta, attr = k.split("@")[1];
    if (!(k in EN)) EN[k] = el.getAttribute(attr);
    el.setAttribute(attr, nl && NL[k] != null ? NL[k] : EN[k]);
  });
  document.documentElement.lang = LANG;
  document.title = t("title");
  $('meta[name="description"]').setAttribute("content", t("description"));
  $$(".cur").forEach((el) => (el.textContent = L().cur));
  $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
}

/* ---------- events ---------- */
const eventsFor = (y) => I.events.filter((e) => y >= e.y && y <= (e.to || e.y));
const evName = (e) => e[LANG][0];
const evText = (e) => e[LANG][2].replace("{dir}", t("dir", R[e.y - FIRST] >= 0));

/* ---------- chart helpers ---------- */
function ticksLin(min, max, n) {
  const step0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= step0);
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
// The finest set of "round" log-scale ticks that still fits in `max` labels.
function logTicks(lo, hi, max) {
  const sets = [[1], [1, 3], [1, 2, 5], [1, 1.5, 2, 3, 5, 7], [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8]];
  let best = [];
  for (const set of sets) {
    const out = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const k of set) { const v = k * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    if (out.length > max) break;
    best = out;
  }
  return best;
}
function placeTip(tip, box, x, y, touch) {
  const w = tip.offsetWidth, h = tip.offsetHeight, bw = box.clientWidth;
  if (touch) { // a finger covers what's under it, so the readout rides above the chart
    tip.style.transform = `translate(${clamp(x - w / 2, 0, bw - w)}px,${-h + 36}px)`;
    return;
  }
  let left = x + 14;
  if (left + w > bw) left = x - w - 14;
  tip.style.transform = `translate(${clamp(left, 0, bw - w)}px,${Math.max(0, y - h - 12)}px)`;
}
function whenVisible(el, fn) {
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "0px 0px -15% 0px" });
  io.observe(el);
}
function onResize(el, fn) {
  let w = el.clientWidth, timer;
  if (!("ResizeObserver" in window)) return addEventListener("resize", fn);
  new ResizeObserver(() => { if (el.clientWidth === w) return; w = el.clientWidth; clearTimeout(timer); timer = setTimeout(fn, 80); }).observe(el);
}

function heroText() {
  $("#calloutFrom").textContent = L().cur + int(START);
  if (H.intro < 1) paintIntro(); else paintBrush();
}

/* ---------- history: chart ---------- */
const measure = document.createElement("canvas").getContext("2d");
const H = { view: "growth", a: 0, b: N - 1, sel: -1, pt: "mouse", animated: { growth: true }, geo: null, shown: false, intro: reduced ? 1 : 0, labIn: false };
const MINSPAN = 5;
const margins = (w) => ({ t: w < 560 ? 50 : 58, r: 8, b: 22, l: w < 560 ? 42 : 50 });

function drawHistory() {
  const box = $("#histChart"), svg = $("#histSvg"), w = box.clientWidth, narrow = w < 560;
  const h = narrow ? 320 : 380, m = margins(w);
  const { a, b } = H, n = b - a + 1, ih = h - m.t - m.b;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  let iw = 0, step = 0;
  const X = (i) => m.l + (i - a) * step; // left edge of year i (step is set once the margin is known)
  const base = a ? CUM[a - 1] : 1;
  const V = (i) => (i < a ? 1 : CUM[i] / base); // $1 put in at the start of the period, at the end of year i
  const anim = !reduced && !H.animated[H.view];
  H.animated[H.view] = true;
  const intro = H.intro < 1 && H.view === "growth" && a === 0 && b === N - 1;

  let vmin = 1, vmax = 1;
  for (let i = a; i <= b; i++) { vmin = Math.min(vmin, V(i)); vmax = Math.max(vmax, V(i)); }
  let out = "", Y = null, LY, ticks;
  if (H.view === "growth") {
    const span = Math.log(vmax / vmin) || 0.1, pad = Math.max(0.03, span * 0.08);
    const lo = Math.log(vmin) - pad, hi = Math.log(vmax) + pad * 2;
    LY = (v) => m.t + (hi - Math.log(v)) / (hi - lo) * ih;
    ticks = logTicks(START * Math.exp(lo), START * Math.exp(hi), narrow ? 4 : 5).map((d) => [LY(d / START), usdTick(d), d === START]);
  } else {
    let lo = 0, hi = 0;
    for (let i = a; i <= b; i++) { lo = Math.min(lo, R[i]); hi = Math.max(hi, R[i]); }
    const unit = hi - lo > 0.4 ? 0.1 : 0.05;
    lo = Math.floor(lo / unit) * unit; hi = Math.ceil(hi / unit) * unit || unit;
    Y = (r) => m.t + (hi - r) / (hi - lo) * ih;
    ticks = ticksLin(lo, hi, narrow ? 4 : 6).map((v) => [Y(v), (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v * 100)) + "%", Math.abs(v) < 1e-9]);
    // The line keeps its own log scale here, stretched over the plot. It has no second axis:
    // its values are written on it, so nobody reads it against the % scale.
    let llo = Math.log(vmin), lhi = Math.log(vmax);
    if (lhi - llo < 0.1) { llo -= 0.05; lhi += 0.05; }
    const top = m.t + 30, bot = m.t + ih - 10;
    LY = (v) => bot - (Math.log(v) - llo) / (lhi - llo) * (bot - top);
  }
  measure.font = "10px 'Space Mono', ui-monospace, monospace";
  m.l = Math.max(m.l, Math.ceil(Math.max(...ticks.map(([, label]) => measure.measureText(label).width))) + 14);
  iw = w - m.l - m.r; step = iw / n;

  // shaded spans for the wars and the depression
  I.events.forEach((e) => {
    if (!e.to) return;
    const s = Math.max(e.y, YEARS[a]), f = Math.min(e.to, YEARS[b]);
    if (s <= f) out += `<rect x="${X(s - FIRST).toFixed(1)}" y="${m.t}" width="${((f - s + 1) * step).toFixed(1)}" height="${ih}" fill="var(--band)"/>`;
  });
  ticks.forEach(([y, label, strong]) => {
    out += `<line x1="${m.l}" x2="${w - m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${strong ? "var(--ink)" : "var(--rule)"}" stroke-width="${strong ? 1 : 0.75}"/>`;
    out += `<text x="${m.l - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${label}</text>`;
  });
  // year labels: round years, as many as fit
  const every = [1, 2, 5, 10, 20, 25, 50].find((s) => n / s <= (narrow ? 5 : 8)) || 50;
  for (let y = Math.ceil(YEARS[a] / every) * every; y <= YEARS[b]; y += every) {
    let x = X(y - FIRST) + step / 2, anchor = "middle";
    if (x - m.l < 14) { x = X(y - FIRST); anchor = "start"; }
    if (w - m.r - x < 14) { x = X(y - FIRST) + step; anchor = "end"; }
    out += `<text x="${x.toFixed(1)}" y="${h - 4}" text-anchor="${anchor}">${y}</text>`;
  }

  if (H.view === "bars") {
    const bw = Math.max(1, step - (step > 4 ? Math.min(step * 0.3, 6) : 0.6)), y0 = Y(0), delay = Math.min(7, 900 / n);
    for (let i = a; i <= b; i++) {
      const y = Y(R[i]), up = R[i] >= 0;
      out += `<rect class="bar ${up ? "up" : "dn"}" data-i="${i}" x="${(X(i) + (step - bw) / 2).toFixed(2)}" y="${Math.min(y, y0).toFixed(2)}" width="${bw.toFixed(2)}" height="${Math.max(0.75, Math.abs(y - y0)).toFixed(2)}" rx="${bw > 4 ? 1 : 0}" fill="${up ? "var(--ink)" : "var(--down)"}"${anim ? ` style="animation-delay:${((i - a) * delay).toFixed(0)}ms"` : ' style="animation:none"'}/>`;
    }
  }
  let d = `M${m.l} ${LY(1).toFixed(1)}`;
  for (let i = a; i <= b; i++) d += ` L${(X(i) + step).toFixed(1)} ${LY(V(i)).toFixed(1)}`;
  if (H.view === "bars") out += `<path d="${d}" fill="none" stroke="var(--paper)" stroke-width="6" stroke-linejoin="round" opacity=".85"/>`;
  if (intro) out += `<defs><clipPath id="introClip"><rect id="introClipR" x="0" y="0" width="0" height="${h}"/></clipPath></defs>`;
  out += `<path d="${d}"${intro ? ' clip-path="url(#introClip)"' : anim ? ` pathLength="1" class="drawn"${H.view === "bars" ? ' style="animation-delay:.8s"' : ""}` : ""} fill="none" stroke="var(--ink)" stroke-width="2.25" stroke-linejoin="round"/>`;
  // where the money started and where it ended up, written on the line
  const lab = (x, y, text, anchor) => `<text class="lab${H.labIn ? " lab-in" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" paint-order="stroke" stroke="var(--paper)" stroke-width="5" stroke-linejoin="round">${text}</text>`;
  const dot = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--ink)" stroke="var(--paper)" stroke-width="2"/>`;
  const pts = [[m.l, LY(1)]];
  for (let i = a; i <= b; i++) pts.push([X(i) + step, LY(V(i))]);
  // put a label above its dot or below it, whichever side the line doesn't run through
  const side = (x0, x1, y) => {
    const hits = (top, bot) => { // walk each segment, so a line crossing between two years still counts
      let n = 0;
      for (let k = 1; k < pts.length; k++) for (let s = 0; s <= 8; s++) {
        const px = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * s / 8, py = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * s / 8;
        if (px >= x0 && px <= x1 && py >= top && py <= bot) n++;
      }
      return n;
    };
    const room = (ty) => ty - 14 > m.t - 4 && ty < m.t + ih - 4;
    // nearest spots first; a farther one only wins if it is clearly clearer
    let best = y - 12, score = 1e9;
    [y - 12, y + 24, y - 34, y + 46].forEach((ty, k) => {
      if (!room(ty)) return;
      const sc = hits(ty - 16, ty + 5) * 10 + k;
      if (sc < score) { score = sc; best = ty; }
    });
    return best;
  };
  const y1 = LY(1), xN = X(b) + step, yN = LY(V(b));
  const t1 = t("at", money(START), YEARS[a]), tN = t("at", money(START * V(b)), YEARS[b]);
  measure.font = "italic 16px 'Instrument Serif', Georgia, serif";
  const tw = (s) => measure.measureText(s).width + 4;
  out += dot(m.l, y1);
  out += lab(m.l + 6, side(m.l, m.l + 6 + tw(t1), y1), t1, "start");
  if (intro) out += `<circle id="introDot" r="5" fill="var(--ink)" stroke="var(--paper)" stroke-width="2"/>`;
  else out += dot(xN, yN) + lab(xN - 2, side(xN - 2 - tw(tN), xN, yN), tN, "end");
  H.labIn = false;

  // event names, packed into three rows above the plot; spans get theirs first
  const rows = [[], [], []], rowY = [m.t - 36, m.t - 20, m.t - 6], cw = 7.3;
  I.events.filter((e) => (e.to || e.y) >= YEARS[a] && e.y <= YEARS[b])
    .sort((p, q) => (q.to ? 1 : 0) - (p.to ? 1 : 0))
    .forEach((e) => {
      const s = Math.max(e.y, YEARS[a]), f = Math.min(e.to || e.y, YEARS[b]);
      const cx = X(s - FIRST) + (f - s + 1) * step / 2;
      const names = narrow && n > 40 ? [e[LANG][1]] : [e[LANG][0], e[LANG][1]];
      let fit = null;
      for (const label of names) {
        const tw = label.length * cw, x0 = clamp(cx - tw / 2, m.l, w - m.r - tw);
        const row = rows.findIndex((r) => r.every(([p, q]) => x0 + tw + 12 < p || x0 > q + 12));
        if (row >= 0) { fit = { label, tw, x0, row }; break; }
      }
      if (!fit) return; // no room: the name is still in the tooltip and the list below
      rows[fit.row].push([fit.x0, fit.x0 + fit.tw]);
      const ly = rowY[fit.row], i = s - FIRST;
      const target = H.view === "bars" ? Math.min(Y(Math.max(0, R[i])), Y(0)) - 3 : LY(V(i)) - 6;
      out += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${ly + 4}" y2="${(e.to ? m.t : target).toFixed(1)}" stroke="var(--muted)" stroke-width=".75" stroke-dasharray="${e.to ? "0" : "2 2"}"/>`;
      out += `<text class="ev" x="${(fit.x0 + fit.tw / 2).toFixed(1)}" y="${ly}" text-anchor="middle">${esc(fit.label)}</text>`;
    });

  out += `<line id="histCross" y1="${m.t}" y2="${m.t + ih}" stroke="var(--ink)" stroke-width="1" opacity="0"/>`;
  out += `<circle id="histDot" r="4.5" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" opacity="0"/>`;
  out += `<rect x="${m.l}" y="0" width="${iw}" height="${h}" fill="transparent"/>`;
  svg.innerHTML = out;
  H.geo = { X, Y, LY, V, step, m };
  if (H.sel >= a && H.sel <= b) select(H.sel, false); else clearSel();
  drawSpark(m);
  if (intro) paintIntro();
}
function paintIntro() {
  const g = H.geo;
  if (!g || H.intro >= 1) return;
  const f = H.intro * N, k = Math.min(N - 1, Math.floor(f)), r = f - k;
  const v0 = k ? CUM[k - 1] : 1, v = v0 * (CUM[k] / v0) ** r; // grow smoothly within the year
  const x = g.m.l + f * g.step, clip = $("#introClipR"), dot = $("#introDot");
  if (clip) clip.setAttribute("width", x.toFixed(1));
  if (dot) { dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", g.LY(v).toFixed(1)); }
  const yr = Math.min(LAST, FIRST + Math.floor(f));
  $("#calloutTo").textContent = usdBig(START * v);
  $("#period").textContent = t("period", FIRST, yr, yr - FIRST + 1);
}
function playIntro() {
  if (H.intro >= 1) return;
  const t0 = performance.now() + 550, dur = 3200;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const step = (now) => {
    if (H.intro >= 1) return;
    const x = clamp((now - t0) / dur, 0, 1);
    H.intro = Math.min(ease(x), 0.99999);
    paintIntro();
    if (x < 1) requestAnimationFrame(step); else finishIntro();
  };
  requestAnimationFrame(step);
}
// The intro never makes anyone wait: touching the chart, the window or the views ends it.
function finishIntro() {
  if (H.intro >= 1) return;
  H.intro = 1; H.labIn = true;
  if (H.shown) drawHistory();
  paintBrush();
}
function select(i, fromPointer, py) {
  const g = H.geo;
  if (!g || i < H.a || i > H.b) return;
  const touch = fromPointer && H.pt === "touch";
  if (touch && i !== H.sel) haptic(eventsFor(YEARS[i]).length > 0); // a firmer tick on the years something happened
  H.sel = i;
  const cx = g.X(i) + g.step / 2, lx = g.X(i) + g.step, ly = g.LY(g.V(i));
  $$("#histSvg .bar").forEach((el) => el.setAttribute("opacity", +el.dataset.i === i ? 1 : 0.45));
  const cross = $("#histCross"), dot = $("#histDot"), tip = $("#histTip");
  cross.setAttribute("x1", lx); cross.setAttribute("x2", lx); cross.setAttribute("opacity", H.view === "growth" ? 0.35 : 0);
  dot.setAttribute("cx", lx); dot.setAttribute("cy", ly); dot.setAttribute("opacity", 1);
  const ev = eventsFor(YEARS[i]);
  tip.innerHTML = `<div class="y">${YEARS[i]}</div><div class="v">${esc(t("tipReturn", pct(R[i])))}</div>` +
    (ev.length ? `<div class="e">${ev.map((e) => `<b>${esc(evName(e))}.</b> ${esc(evText(e))}`).join("<br>")}</div>` : "") +
    `<div class="m">${esc(t("tipGrowth", YEARS[H.a], money(START * g.V(i))))}</div>`;
  tip.classList.add("on");
  const ty = H.view === "bars" ? Math.min(g.Y(Math.max(R[i], 0)), g.Y(0)) : ly;
  placeTip(tip, $("#histChart"), cx, fromPointer && py != null ? Math.min(py, ty) : ty, touch);
}
function clearSel() {
  H.sel = -1;
  $("#histTip").classList.remove("on");
  $$("#histSvg .bar").forEach((el) => el.removeAttribute("opacity"));
  const c = $("#histCross"), d = $("#histDot");
  if (c) c.setAttribute("opacity", 0);
  if (d) d.setAttribute("opacity", 0);
}
function bindHistory() {
  const svg = $("#histSvg");
  svg.setAttribute("tabindex", "0");
  const at = (e) => {
    const r = svg.getBoundingClientRect();
    return [H.a + Math.floor((e.clientX - r.left - H.geo.m.l) / H.geo.step), e.clientY - r.top];
  };
  const move = (e) => { if (e.type === "pointerdown" || e.pointerType === "mouse") finishIntro(); if (!H.geo) return; H.pt = e.pointerType; const [i, y] = at(e); select(i, true, y); };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") clearSel(); });
  svg.addEventListener("blur", clearSel);
  svg.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -10, ArrowUp: 10 }[e.key];
    if (k == null) { if (e.key === "Escape") clearSel(); return; }
    e.preventDefault();
    select(clamp((H.sel < 0 ? H.b + 1 : H.sel) + k, H.a, H.b), false);
  });
  $$("[data-view]").forEach((btn) => btn.addEventListener("click", () => {
    finishIntro();
    H.view = btn.dataset.view;
    $$("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    $("#histKey").hidden = H.view !== "bars";
    clearSel();
    drawHistory();
  }));
}

/* ---------- history: the period window ---------- */
let sparkKey = "";
function drawSpark(m) {
  const el = $("#brush");
  el.style.marginLeft = m.l + "px";
  el.style.marginRight = m.r + "px";
  const w = el.clientWidth, h = el.clientHeight, key = w + "x" + h;
  paintBrush();
  if (key === sparkKey) return;
  sparkKey = key;
  const lo = Math.log(Math.min(1, ...CUM)), hi = Math.log(Math.max(...CUM));
  const y = (v) => h - 8 - (Math.log(v) - lo) / (hi - lo) * (h - 16);
  let d = `M0 ${y(1).toFixed(1)}`;
  CUM.forEach((v, i) => (d += ` L${((i + 1) / N * w).toFixed(1)} ${y(v).toFixed(1)}`));
  $("#brushSvg").innerHTML = `<rect width="${w}" height="${h}" fill="var(--card)"/><path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.25" stroke-linejoin="round"/>`;
}
function paintBrush() {
  const bw = $("#brush").clientWidth, xa = H.a / N * bw, xb = (H.b + 1) / N * bw;
  const win = $("#brushWin");
  win.style.left = xa.toFixed(1) + "px";
  win.style.width = (xb - xa).toFixed(1) + "px";
  $("#shadeL").style.cssText = `left:0;width:${xa.toFixed(1)}px`;
  $("#shadeR").style.cssText = `left:${xb.toFixed(1)}px;width:${(bw - xb).toFixed(1)}px`;
  const set = (el, label, lo, hi, now) => { el.setAttribute("aria-label", label); el.setAttribute("aria-valuemin", lo); el.setAttribute("aria-valuemax", hi); el.setAttribute("aria-valuenow", now); };
  set($("#hL"), t("startOf"), FIRST, YEARS[H.b] - MINSPAN + 1, YEARS[H.a]);
  set($("#hR"), t("endOf"), YEARS[H.a] + MINSPAN - 1, LAST, YEARS[H.b]);
  $("#resetZoom").hidden = H.a === 0 && H.b === N - 1;
  if (H.intro < 1) return;
  $("#period").textContent = t("period", YEARS[H.a], YEARS[H.b], H.b - H.a + 1);
  $("#calloutTo").textContent = usdBig(START * CUM[H.b] / (H.a ? CUM[H.a - 1] : 1));
}
let periodFrame = 0;
function setPeriod(a, b) {
  if (a === H.a && b === H.b) return;
  H.a = a; H.b = b;
  paintBrush();
  if (!periodFrame) periodFrame = requestAnimationFrame(() => { periodFrame = 0; drawHistory(); periodStats(); });
}
function bindBrush() {
  const el = $("#brush"), win = $("#brushWin");
  let id = null, mode = null, x0 = 0, a0 = 0, b0 = 0, moved = false;
  el.addEventListener("pointerdown", (e) => {
    if (id !== null || e.button > 0) return; // one finger at a time
    finishIntro();
    const handle = e.target.closest(".brush-h");
    mode = handle ? handle.dataset.h : e.target.closest(".brush-win") ? "pan" : "jump";
    id = e.pointerId; x0 = e.clientX; a0 = H.a; b0 = H.b; moved = false;
    if (handle) handle.classList.add("active");
    if (mode !== "jump") win.classList.add("dragging");
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id || mode === "jump") return;
    const dx = e.clientX - x0;
    if (!moved) { if (Math.abs(dx) < 3) return; moved = true; try { el.setPointerCapture(id); } catch {} }
    const dy = Math.round(dx / el.clientWidth * N);
    let a = a0, b = b0;
    if (mode === "l") a = clamp(a0 + dy, 0, b0 - MINSPAN + 1);
    else if (mode === "r") b = clamp(b0 + dy, a0 + MINSPAN - 1, N - 1);
    else { const s = b0 - a0; a = clamp(a0 + dy, 0, N - 1 - s); b = a + s; }
    if (a !== H.a || b !== H.b) { haptic(a === 0 || b === N - 1); setPeriod(a, b); }
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    if (!moved && mode === "jump" && e.type === "pointerup") { // a tap outside the window moves the window there
      const r = el.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / r.width * N), s = H.b - H.a;
      const a = clamp(c - Math.floor(s / 2), 0, N - 1 - s);
      setPeriod(a, a + s); haptic();
    }
    id = null;
    $$(".brush-h").forEach((x) => x.classList.remove("active"));
    win.classList.remove("dragging");
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  [["#hL", "l"], ["#hR", "r"]].forEach(([sel, side]) => $(sel).addEventListener("keydown", (e) => {
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
    if (!d) return;
    e.preventDefault();
    if (side === "l") setPeriod(clamp(H.a + d, 0, H.b - MINSPAN + 1), H.b);
    else setPeriod(H.a, clamp(H.b + d, H.a + MINSPAN - 1, N - 1));
  }));
  $("#resetZoom").addEventListener("click", () => { setPeriod(0, N - 1); haptic(); });
}

/* ---------- history: numbers for the chosen period ---------- */
function periodStats() {
  const { a, b } = H, n = b - a + 1, base = a ? CUM[a - 1] : 1;
  let up = 0, worst = a;
  for (let i = a; i <= b; i++) { if (R[i] >= 0) up++; if (R[i] < R[worst]) worst = i; }
  const geo = (CUM[b] / base) ** (1 / n) - 1;
  // the longest stretch from a high (or the start) to the next new high, after inflation
  let peak = base, pk = a - 1, best = { len: 0, pk: a - 1, open: false };
  for (let i = a; i <= b; i++) if (CUM[i] >= peak) { if (i - pk > best.len) best = { len: i - pk, pk, open: false }; peak = CUM[i]; pk = i; }
  if (b - pk > best.len) best = { len: b - pk, pk, open: true };
  const fromStart = best.pk < a, py = fromStart ? YEARS[a] : YEARS[best.pk];
  const none = best.len <= 1 && !best.open;
  const ev = eventsFor(YEARS[worst])[0];
  $("#histStats").innerHTML = [
    [t("up"), t("upN", up, n), t("upP")],
    [t("avg"), pct(geo), t("avgP", YEARS[a], YEARS[b])],
    [t("worst"), pct(R[worst], 0), YEARS[worst] + (ev ? " · " + evName(ev) : "")],
    [t("wait"), none ? t("waitNone") : t("waitN", best.len), none ? t("waitNoneP") : best.open ? t("waitOpen", py, fromStart) : t("waitDone", py, fromStart)],
  ].map(([k, v, p]) => `<div><span class="mono">${esc(k)}</span><div class="n tab">${esc(v)}</div><p>${esc(p)}</p></div>`).join("");
  $("#histDesc").textContent = t("desc", YEARS[a], YEARS[b], up, n, pctU(geo), YEARS[worst], pct(R[worst], 0), money(START * CUM[b] / base));
}
function historyLists() {
  $("#evList").innerHTML = I.events.map((e) => {
    const span = e.to ? `${e.y}–${String(e.to).slice(2)}` : String(e.y);
    const i = e.y - FIRST, tot = e.to ? CUM[e.to - FIRST] / (i ? CUM[i - 1] : 1) - 1 : R[i];
    return `<li><span class="yr">${span}</span><span><b>${esc(evName(e))}.</b> ${esc(evText(e))}</span><span class="rv tab">${pct(tot, 0)}${e.to ? t("total") : ""}</span></li>`;
  }).join("");
  const [hy, hr, hv] = t("head");
  $("#histTable").innerHTML = `<thead><tr><th>${hy}</th><th>${hr}</th><th>${hv}</th></tr></thead><tbody>` +
    R.map((r, i) => `<tr><td>${YEARS[i]}</td><td>${pct(r)}</td><td>${money(CUM[i] * START)}</td></tr>`).join("") + "</tbody>";
  $("#histHint").textContent = t("hint", COARSE);
}

/* ---------- the haystack game ---------- */
const hay = { msg: () => t("hayIntro"), tally: () => "" };
function haystack() {
  const WIN = [13, 38, 66, 87];
  const g = $("#grid100"), out = $("#hayOut"), tally = $("#hayTally"), key = $("#hayKey");
  g.innerHTML = Array.from({ length: 100 }, () => `<button type="button" aria-pressed="false"></button>`).join("");
  const cells = Array.from(g.children);
  let picks = [], done = false, busy = false, tries = 0, missed = 0;
  const say = () => { out.textContent = hay.msg(); tally.textContent = hay.tally(); };
  hay.relabel = () => { cells.forEach((c, i) => c.setAttribute("aria-label", t("stock", i + 1))); say(); };
  const counting = () => { hay.tally = () => (picks.length ? t("picked", picks.length) : ""); };
  function clear() {
    picks = []; done = false;
    g.classList.remove("revealed"); key.hidden = true;
    cells.forEach((c) => { c.className = ""; c.style.animationDelay = ""; c.setAttribute("aria-pressed", "false"); });
    hay.msg = () => t("hayIntro"); counting(); say();
  }
  function showWinners() {
    g.classList.add("revealed"); key.hidden = false;
    WIN.forEach((w, k) => { cells[w].classList.add("win"); cells[w].style.animationDelay = `${k * 70}ms`; });
  }
  function reveal() {
    done = true;
    const hit = picks.filter((i) => WIN.includes(i)).length;
    tries++; if (!hit) missed++;
    showWinners();
    const r = tries, m = missed;
    hay.msg = () => t("hit", hit); hay.tally = () => t("rounds", r, m); say();
    setTimeout(() => haptic(hit > 0), 140);
  }
  function add(i) {
    picks.push(i);
    cells[i].classList.add("pk"); cells[i].setAttribute("aria-pressed", "true");
    haptic(); say();
  }
  g.addEventListener("click", (e) => {
    const c = e.target.closest("button");
    if (!c || busy) return;
    if (done) clear();
    const i = cells.indexOf(c);
    if (picks.includes(i)) {
      picks = picks.filter((p) => p !== i);
      c.classList.remove("pk"); c.setAttribute("aria-pressed", "false"); haptic(); say();
      return;
    }
    if (picks.length >= 10) return;
    add(i);
    if (picks.length === 10) { busy = true; setTimeout(() => { busy = false; reveal(); }, 280); }
  });
  $("#pickBtn").addEventListener("click", () => {
    if (busy) return;
    if (done) clear();
    const pool = cells.map((_, i) => i).filter((i) => !picks.includes(i));
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const todo = pool.slice(0, 10 - picks.length);
    if (reduced) { todo.forEach(add); return reveal(); }
    busy = true; // fill the rest in a quick wave that speeds up, then reveal
    let at = 0;
    todo.forEach((i, k) => { at += 90 * 0.86 ** k; setTimeout(() => add(i), at); });
    setTimeout(() => { busy = false; reveal(); }, at + 260);
  });
  $("#pick1000").addEventListener("click", () => {
    if (busy) return;
    let none = 0, all = 0;
    for (let k = 0; k < 1000; k++) {
      const a = Array.from({ length: 100 }, (_, i) => i);
      for (let i = 0; i < 10; i++) { const j = i + Math.floor(Math.random() * (100 - i)); [a[i], a[j]] = [a[j], a[i]]; }
      const h = a.slice(0, 10).filter((i) => WIN.includes(i)).length;
      if (!h) none++;
      if (h === 4) all++;
    }
    clear(); done = true; showWinners(); haptic(true);
    hay.msg = () => t("thousand", int(none), all ? int(all) : 0); hay.tally = () => ""; say();
  });
  counting();
  hay.relabel();
}

/* ---------- fees ---------- */
function fees() {
  const rates = [0.002, 0.01, 0.02], vals = rates.map((f) => 10000 * ((1 + PLAN) * (1 - f)) ** 40), names = t("feeRows");
  $("#feeIntro").textContent = t("feeIntro", L().cur + int(10000));
  $("#feeBars").innerHTML = rates.map((f, i) =>
    `<div class="r"><span>${esc(names[i])} <span class="mono">${nf(f * 100, 1)}%</span></span><span class="t"><span class="f" style="width:${(vals[i] / vals[0] * 100).toFixed(1)}%"></span></span><span class="v tab">${money(vals[i])}</span></div>`
  ).join("");
  $("#feeNote").textContent = t("feeNote", Math.round(vals[1] / vals[0] * 100), Math.round(vals[2] / vals[0] * 100));
}

/* ---------- what you own ---------- */
let ownBy = "countries";
function own() {
  const amt = num($("#ownAmt"), 0), set = I.own[ownBy], col = LANG === "nl" ? 1 : 0;
  const scale = Math.max(...set.rows.map((r) => r[2]));
  $("#ownRows").innerHTML = set.rows.map((r) =>
    `<div class="r${r[3] ? " rest" : ""}"><span class="nm">${esc(r[col])}</span><span class="t"><span class="f" style="width:${(r[2] / scale * 100).toFixed(1)}%"></span></span><span class="p tab">${nf(r[2], r[2] % 1 ? 1 : 0)}%</span><span class="a tab">${L().cur}${int(amt * r[2] / 100)}</span></div>`
  ).join("");
  $("#ownNote").textContent = set[LANG];
}
function bindOwn() {
  $$("[data-own]").forEach((btn) => btn.addEventListener("click", () => {
    ownBy = btn.dataset.own;
    $$("[data-own]").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    own();
  }));
  const amt = $("#ownAmt");
  amt.addEventListener("input", own);
  amt.addEventListener("blur", () => { amt.value = int(num(amt, 0)); });
}

/* ---------- risk: a mix of stocks and bonds, 1950-2025 ---------- */
const BONDS = W.bonds || [], MIX_FROM = 1950, M0 = MIX_FROM - FIRST, M1 = BONDS.length; // bonds: JST to 2020, then the Bloomberg Global Aggregate
const CHART_FROM = 1995; // the chart: recent enough to remember, with two big crashes in it
function mixRun(w, from = MIX_FROM) {
  let v = 1, peak = 1, fall = 0, worst = Infinity, wy = from, down = 0;
  const path = [1], rs = [], i0 = from - FIRST;
  for (let i = i0; i < M1; i++) {
    const r = w * R[i] + (1 - w) * BONDS[i];
    v *= 1 + r; path.push(v); rs.push(r);
    peak = Math.max(peak, v); fall = Math.min(fall, v / peak - 1);
    if (r < worst) { worst = r; wy = YEARS[i]; }
    if (r < 0) down++;
  }
  return { geo: v ** (1 / (M1 - i0)) - 1, worst, wy, fall, down, n: M1 - i0, path, rs, end: v };
}
function drawMix() {
  if (!BONDS.length) return;
  const s = Math.round(clamp(num($("#mixStocks"), 60), 0, 100)), b = 100 - s, mix = mixRun(s / 100), all = mixRun(1);
  $("#mixRest").textContent = t("mixRest", b);
  $("#mixKey").textContent = t("mixKey", s, b);
  const last = YEARS[M1 - 1];
  $("#mixStats").innerHTML = [
    [t("avg"), pct(mix.geo), t("mixAvgP", MIX_FROM, last)],
    [t("worst"), pct(mix.worst, 0), String(mix.wy)],
    [t("mixFall"), pct(mix.fall, 0), t("mixFallP")],
    [t("mixDown"), t("upN", mix.down, mix.n), t("mixDownP")],
  ].map(([k, v, p]) => `<div><span class="mono">${esc(k)}</span><div class="n tab">${esc(v)}</div><p>${esc(p)}</p></div>`).join("");
  $("#mixDesc").textContent = t("mixDesc", s, b, pctU(mix.geo), pct(mix.worst, 0), pct(mix.fall, 0));
  // $10,000 put in at the start of 1995, on a normal scale: over 25 years the swings show in the line itself.
  // (on a log scale over 70 years even a −41% year is only a kink, and every mix looks smooth)
  const cm = mixRun(s / 100, CHART_FROM), ca = mixRun(1, CHART_FROM);
  const svg = $("#mixSvg"), w = $("#mixChart").clientWidth, h = w < 560 ? 240 : 300, n = cm.path.length - 1;
  const m = { t: 40, r: 8, b: 22, l: 8 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
  const lo = Math.min(...cm.path, ...ca.path) * 0.85, hi = Math.max(...cm.path, ...ca.path);
  const X = (k) => m.l + k / n * iw, Y = (v) => m.t + (hi - v) / (hi - lo) * ih;
  const line = (p) => p.map((v, k) => (k ? "L" : "M") + X(k).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  let out = `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(1).toFixed(1)}" y2="${Y(1).toFixed(1)}" stroke="var(--rule)"/>`;
  for (let y = 2000; y <= last; y += 5) { const x = X(y - CHART_FROM), end = w - m.r - x < 16; out += `<text x="${(end ? w - m.r : x).toFixed(1)}" y="${h - 4}" text-anchor="${end ? "end" : "middle"}">${y}</text>`; }
  if (s < 100) out += `<path d="${line(ca.path)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  out += `<path d="${line(cm.path)}" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>`;
  out += `<circle cx="${X(n).toFixed(1)}" cy="${Y(cm.end).toFixed(1)}" r="4" fill="var(--ink)"/><circle cx="${m.l}" cy="${Y(1).toFixed(1)}" r="3.5" fill="var(--ink)"/>`;
  // the headline sits in the top left corner: the line starts low on the left, so that corner is free
  out += `<text class="lab" x="${m.l}" y="${m.t - 18}" text-anchor="start">${esc(t("mixEnd", L().cur + int(START), CHART_FROM, usdBig(START * cm.end), last))}</text>`;
  svg.innerHTML = out;
}

/* ---------- ESG: the strictest world ESG index against the world index, year by year ---------- */
// MSCI factsheet, 30 Oct 2026, net returns in USD (%): [year, MSCI ACWI SRI, MSCI ACWI]
const ESG = [[2014, 4.00, 4.16], [2015, -2.72, -2.36], [2016, 8.23, 7.86], [2017, 24.66, 23.97], [2018, -7.07, -9.41], [2019, 28.46, 26.60],
  [2020, 20.81, 16.25], [2021, 23.92, 18.54], [2022, -22.46, -18.36], [2023, 25.58, 22.20], [2024, 14.66, 17.49], [2025, 15.91, 22.34]];
function drawEsg() {
  const svg = $("#esgSvg"), box = $("#esgChart");
  if (!svg || !box) return;
  const w = box.clientWidth;
  if (!w) return; // folded away; drawn when it opens
  const small = w < 560, h = small ? 210 : 240, m = { t: 22, r: 4, b: 26, l: 4 }, ih = h - m.t - m.b;
  const gaps = ESG.map(([y, a, b]) => [y, a - b]), top = 8.5; // the widest gap is 6.4 points; room for its label
  const slot = (w - m.l - m.r) / gaps.length, bw = Math.min(28, slot * 0.6);
  const Y = (v) => m.t + (top - v) / (2 * top) * ih, zero = Y(0);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  let out = "";
  for (const g of [-5, 5]) out += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(g).toFixed(1)}" y2="${Y(g).toFixed(1)}" stroke="var(--rule)" stroke-dasharray="2 4"/>`;
  gaps.forEach(([y, d], k) => {
    const cx = m.l + slot * (k + 0.5), y0 = Math.min(Y(d), zero), hh = Math.max(1, Math.abs(Y(d) - zero));
    out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" fill="${d >= 0 ? "var(--ink)" : "var(--down)"}"/>`;
    // on a phone only the big gaps get a number, so the labels never collide
    if (!small || Math.abs(d) >= 2) out += `<text class="gap" x="${cx.toFixed(1)}" y="${(d >= 0 ? Y(d) - 6 : Y(d) + 13).toFixed(1)}" text-anchor="middle">${esc(pct(d / 100, 1))}</text>`;
    if (!small || k % 2 === 0 || k === gaps.length - 1) out += `<text x="${cx.toFixed(1)}" y="${h - 4}" text-anchor="middle">${small ? "’" + String(y).slice(2) : y}</text>`;
  });
  out += `<line x1="${m.l}" x2="${w - m.r}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}" stroke="var(--ink)"/>`;
  svg.innerHTML = out;
}
// the 24 kept companies light up one after another when the grid scrolls into view
function revealGrid() {
  const g = $("#esgGrid");
  if (!g || reduced || !("IntersectionObserver" in window) || g.getBoundingClientRect().top < innerHeight) return;
  g.classList.add("pre");
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    g.classList.add("go");
    requestAnimationFrame(() => requestAnimationFrame(() => g.classList.remove("pre")));
  }), { rootMargin: "0px 0px -20% 0px" });
  io.observe(g);
}

/* ---------- the future: 10,000 runs ---------- */
let EXP = "plan", MC = null, mcAnimated = false;
// "Plan" lowers every historical year by the same amount, so the compound average lands on 5%.
const SHIFT = () => (EXP === "plan" ? Math.log(1 + PLAN) - MU : 0);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function simulate(S = 10000) {
  const start = Math.max(0, num($("#cStart"), 0));
  const yearly = Math.max(0, num($("#cMonthly"), 0)) * 12;
  const Y = Math.round(clamp(num($("#cYears"), 30), 1, 60));
  const fee = clamp(num($("#cFee"), 0), 0, 5) / 100;
  const rand = rng(1900), k = Math.exp(SHIFT()), vals = new Float64Array(S * (Y + 1));
  for (let s = 0; s < S; s++) {
    let v = start, o = s * (Y + 1);
    vals[o] = v;
    for (let y = 1; y <= Y; y++) {
      const g = (1 + R[Math.floor(rand() * N)]) * k * (1 - fee); // a random real year from history
      v = v * g + yearly * Math.sqrt(g); // deposits arrive through the year: on average half a year of growth
      vals[o + y] = v;
    }
  }
  const P = [0.1, 0.25, 0.5, 0.75, 0.9], q = P.map(() => new Float64Array(Y + 1)), col = new Float64Array(S);
  for (let y = 0; y <= Y; y++) {
    for (let s = 0; s < S; s++) col[s] = vals[s * (Y + 1) + y];
    col.sort();
    P.forEach((p, j) => (q[j][y] = col[Math.floor(p * (S - 1))]));
  }
  const paid = Array.from({ length: Y + 1 }, (_, y) => start + yearly * y);
  let below = 0;
  for (let s = 0; s < S; s++) if (vals[s * (Y + 1) + Y] < paid[Y]) below++;
  const paths = Array.from({ length: 28 }, (_, j) => { const s = Math.floor(j * S / 28); return Array.from(vals.subarray(s * (Y + 1), (s + 1) * (Y + 1))); });
  MC = { Y, q, paid, paths, below: below / S };
}
function drawMC() {
  if (!MC) return;
  const box = $("#mcChart"), svg = $("#mcSvg"), w = box.clientWidth, narrow = w < 560, h = narrow ? 300 : 360;
  const { Y, q, paid, paths } = MC;
  const top = Math.max(q[4][Y], paid[Y]) * 1.08 || 1;
  // axis labels: round amounts without trailing zeros ("€1 mln", "$1.5M"); the margin fits the widest one
  const tickLabel = (v) => (v === 0 ? "0" : v >= 1e6 ? L().cur + (v / 1e6).toLocaleString(L().locale, { maximumFractionDigits: 2 }) + L().M : L().cur + int(v));
  const yTicks = ticksLin(0, top, narrow ? 4 : 5);
  measure.font = "10px 'Space Mono', ui-monospace, monospace";
  const m = { t: 12, r: narrow ? 8 : 12, b: 24, l: Math.ceil(Math.max(...yTicks.map((v) => measure.measureText(tickLabel(v)).width))) + 14 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("height", h);
  const X = (y) => m.l + y / Y * iw, Yp = (v) => m.t + ih - Math.min(v, top * 1.5) / top * ih;
  const line = (arr) => Array.from(arr).map((v, y) => (y ? "L" : "M") + X(y).toFixed(1) + " " + Yp(v).toFixed(1)).join(" ");
  const area = (lo, hi) => line(lo) + " " + Array.from(hi).map((v, y) => "L" + X(y).toFixed(1) + " " + Yp(v).toFixed(1)).reverse().join(" ") + " Z";
  const anim = !reduced && !mcAnimated;
  mcAnimated = true;
  let out = `<defs><clipPath id="mcClip"><rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></clipPath></defs>`;
  yTicks.forEach((v) => {
    out += `<line x1="${m.l}" x2="${w - m.r}" y1="${Yp(v).toFixed(1)}" y2="${Yp(v).toFixed(1)}" stroke="${v === 0 ? "var(--ink)" : "var(--rule)"}" stroke-width="${v === 0 ? 1 : 0.75}"/>`;
    out += `<text x="${m.l - 6}" y="${(Yp(v) + 3.5).toFixed(1)}" text-anchor="end">${tickLabel(v)}</text>`;
  });
  ticksLin(0, Y, narrow ? 4 : 6).filter((y) => y % 1 === 0).forEach((y) => {
    out += `<text x="${X(y).toFixed(1)}" y="${h - 6}" text-anchor="${y === 0 ? "start" : y === Y ? "end" : "middle"}">${y === 0 ? t("now") : t("year", y)}</text>`;
  });
  out += `<g clip-path="url(#mcClip)"><path d="${area(q[0], q[4])}" fill="var(--band)"/><path d="${area(q[1], q[3])}" fill="#CFC5B2"/>`;
  paths.forEach((p, j) => (out += `<path d="${line(p)}" fill="none" stroke="var(--ink)" stroke-width=".7" opacity=".1"${anim ? ` pathLength="1" class="drawn" style="animation-duration:1.6s;animation-delay:${j * 25}ms"` : ""}/>`));
  out += `</g><path d="${line(paid)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="1.5 3.5" stroke-linecap="round"/>`;
  out += `<path d="${line(q[2])}" fill="none" stroke="var(--ink)" stroke-width="2.25" stroke-linejoin="round"${anim ? ` pathLength="1" class="drawn" style="animation-duration:1.4s"` : ""}/>`;
  out += `<circle cx="${X(Y)}" cy="${Yp(q[2][Y])}" r="4" fill="var(--ink)"/>`;
  out += `<line id="mcCross" y1="${m.t}" y2="${m.t + ih}" stroke="var(--ink)" stroke-width="1" opacity="0"/><circle id="mcDot" r="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" opacity="0"/>`;
  out += `<rect x="${m.l - 6}" y="0" width="${iw + 12}" height="${h}" fill="transparent"/>`;
  svg.innerHTML = out;
  MC.geo = { X, Yp, m, iw };

  const end = (j) => q[j][Y];
  $("#outcomes").innerHTML = [
    [t("mid"), money(end(2)), t("midP")],
    [t("bad"), money(end(0)), t("badP")],
    [t("good"), money(end(4)), t("goodP")],
    [t("paid"), money(paid[Y]), paid[Y] > 0 ? t("paidP", nf(end(2) / paid[Y], 1)) : t("paidNone")],
  ].map(([k, v, p]) => `<div><span class="mono">${esc(k)}</span><div class="n tab">${esc(v)}</div><p>${esc(p)}</p></div>`).join("");
  $("#verdict").textContent = paid[Y] <= 0 ? t("verdictNone") : t("verdict", MC.below < 0.01 ? 0 : Math.round(MC.below * 100), money(end(0)));
}
let mcLast = -1, mcPt = "mouse";
function mcTip(y, py) {
  if (!MC || !MC.geo) return;
  y = clamp(y, 0, MC.Y);
  if (mcPt === "touch" && y !== mcLast) haptic(y === 0 || y === MC.Y);
  mcLast = y;
  const { X, Yp } = MC.geo, tip = $("#mcTip"), x = X(y), c = $("#mcCross"), d = $("#mcDot");
  c.setAttribute("x1", x); c.setAttribute("x2", x); c.setAttribute("opacity", 0.35);
  d.setAttribute("cx", x); d.setAttribute("cy", Yp(MC.q[2][y])); d.setAttribute("opacity", 1);
  tip.innerHTML = `<div class="y">${esc(y === 0 ? t("now") : t("year", y))}</div><div class="v">${esc(t("tipMid", money(MC.q[2][y])))}</div>` +
    `<div class="e">${esc(t("tipRange", money(MC.q[0][y]), money(MC.q[4][y])))}</div><div class="m">${esc(t("tipPaid", money(MC.paid[y])))}</div>`;
  tip.classList.add("on");
  placeTip(tip, $("#mcChart"), x, Math.min(py, Yp(MC.q[2][y])), mcPt === "touch");
}
function expText() {
  $("#expHist").textContent = t("expHist", pctU(GEO));
  $("#expNote").textContent = t("note", EXP, FIRST, LAST, pctU(GEO));
}
function bindMC() {
  const svg = $("#mcSvg");
  svg.setAttribute("tabindex", "0");
  let cur = -1;
  const at = (e) => { const r = svg.getBoundingClientRect(); return [Math.round((e.clientX - r.left - MC.geo.m.l) / MC.geo.iw * MC.Y), e.clientY - r.top]; };
  const move = (e) => { if (!MC || !MC.geo) return; mcPt = e.pointerType; const [y, py] = at(e); cur = clamp(y, 0, MC.Y); mcTip(cur, py); };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  const hide = () => { $("#mcTip").classList.remove("on"); const c = $("#mcCross"), d = $("#mcDot"); if (c) c.setAttribute("opacity", 0); if (d) d.setAttribute("opacity", 0); };
  svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (k == null) return;
    e.preventDefault(); cur = clamp((cur < 0 ? MC.Y : cur) + k, 0, MC.Y); mcTip(cur, MC.geo.Yp(MC.q[4][cur]));
  });
  // While a finger drags, run 2,000 futures once a frame; on release, all 10,000.
  let raf = 0, timer = 0;
  const update = (fast) => {
    if (fast) { if (!raf) raf = requestAnimationFrame(() => { raf = 0; simulate(2000); drawMC(); }); return; }
    clearTimeout(timer);
    timer = setTimeout(() => { cancelAnimationFrame(raf); raf = 0; simulate(); drawMC(); }, fast === false ? 0 : 140);
  };
  bindSliders(update);
  $$("[data-exp]").forEach((btn) => btn.addEventListener("click", () => {
    EXP = btn.dataset.exp;
    $$("[data-exp]").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    expText(); simulate(); drawMC();
  }));
}

/* Sliders: drag anywhere on the box, relative to where the finger lands (iOS Control Center style),
   so a tap never makes the value jump. 1:1 while down, rubber-band past the ends, a tick per step. */
const snapTo = (v, s) => Math.round(v / s) * s;
const SL = {
  cStart: { to: (x) => { const v = 1e6 * x ** 3; return v < 1e4 ? snapTo(v, 500) : v < 1e5 ? snapTo(v, 1000) : snapTo(v, 10000); },
    from: (v) => Math.cbrt(Math.min(v, 1e6) / 1e6), fmt: (v) => int(v), tick: (v) => (v < 1e4 ? 1000 : v < 1e5 ? 10000 : 50000), min: 0 },
  cMonthly: { to: (x) => { const v = 1e4 * x ** 2; return v < 1000 ? snapTo(v, 25) : snapTo(v, 100); },
    from: (v) => Math.sqrt(Math.min(v, 1e4) / 1e4), fmt: (v) => int(v), tick: (v) => (v < 1000 ? 100 : 500), min: 0 },
  cYears: { to: (x) => Math.round(1 + 59 * x), from: (v) => (clamp(v, 1, 60) - 1) / 59, fmt: (v) => String(Math.round(v)), tick: () => 1, min: 1, max: 60 },
  mixStocks: { to: (x) => Math.round(x * 10) * 10, from: (v) => clamp(v, 0, 100) / 100, fmt: (v) => String(Math.round(v)), tick: () => 10, min: 0, max: 100, update: () => drawMix() },
  cFee: { to: (x) => Math.round(x * 40) / 20, from: (v) => Math.min(v, 2) / 2, fmt: (v) => v.toLocaleString(L().locale, { maximumFractionDigits: 2 }), tick: () => 0.05, min: 0, max: 5 },
};
const SLIDERS = [];
function bindSliders(onUpdate) {
  $$(".slider").forEach((el) => {
    const input = el.querySelector("input"), cfg = SL[input.id];
    const fill = el.querySelector(".slider-fill"), grip = el.querySelector(".slider-grip");
    let x = 0, id = null, x0 = 0, s0 = 0, w = 1, dragging = false, bucket = null, edge = null, val = null;
    const update = cfg.update || onUpdate;
    const paint = () => {
      fill.style.clipPath = `inset(0 ${((1 - x) * 100).toFixed(2)}% 0 0)`;
      grip.style.transform = `translateX(${(x * w).toFixed(1)}px)`;
    };
    // size the number to its text so the currency and unit sit right against it (field-sizing does this where supported)
    const fit = () => { if (CSS.supports("field-sizing", "content")) return; measure.font = getComputedStyle(input).font; input.style.width = Math.ceil(measure.measureText(input.value || "0").width) + 2 + "px"; };
    const sync = () => { w = el.clientWidth; x = clamp(cfg.from(num(input, 0)), 0, 1); paint(); fit(); };
    SLIDERS.push(sync);
    sync();
    el.addEventListener("pointerdown", (e) => {
      if (id !== null || e.button > 0 || e.target === input) return; // one finger at a time; the number is for typing
      id = e.pointerId; x0 = e.clientX; s0 = x; w = el.clientWidth; dragging = false;
      el.classList.add("pressed");
    });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      if (!dragging) {
        if (Math.abs(e.clientX - x0) < 4) return;
        dragging = true; x0 = e.clientX; // count from here, so the dead zone doesn't make the value jump
        try { el.setPointerCapture(id); } catch {}
        el.classList.remove("pressed"); el.classList.add("dragging");
        if (document.activeElement === input) input.blur();
        bucket = null; edge = null;
      }
      const raw = s0 + (e.clientX - x0) / w;
      x = clamp(raw, 0, 1);
      const over = raw - x, stretch = 0.05 * (1 - Math.exp(-Math.abs(over) * 5));
      el.style.transformOrigin = over < 0 ? "right center" : "left center";
      el.style.transform = `translate(2px,2px) scaleX(${(1 + stretch).toFixed(4)})`;
      paint();
      const v = cfg.to(x), bk = Math.floor(v / cfg.tick(v) + 1e-6), atEdge = x === 0 ? 0 : x === 1 ? 1 : null;
      if (atEdge !== null && atEdge !== edge) haptic(true);
      else if (bucket !== null && bk !== bucket) haptic();
      bucket = bk; edge = atEdge;
      if (v !== val) { val = v; input.value = cfg.fmt(v); fit(); update(true); }
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove("pressed", "dragging");
      el.style.transform = ""; // the CSS transition springs the stretch back
      if (dragging) update(false);
      else if (e.type === "pointerup") { input.focus(); input.select(); }
      dragging = false;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    input.addEventListener("input", () => { sync(); update(); });
    input.addEventListener("keydown", (e) => {
      const d = { ArrowUp: 1, ArrowDown: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const v = num(input, 0), step = cfg.tick(v);
      const nv = clamp(Math.round((v + d * step) / step) * step, cfg.min, cfg.max ?? Infinity);
      input.value = cfg.fmt(+nv.toFixed(2)); sync(); update(false);
    });
    input.addEventListener("blur", () => { input.value = cfg.fmt(clamp(num(input, cfg.min), cfg.min, cfg.max ?? Infinity)); sync(); });
  });
  if ("ResizeObserver" in window) new ResizeObserver(() => SLIDERS.forEach((f) => f())).observe($("#calc"));
  if (document.fonts) document.fonts.ready.then(() => SLIDERS.forEach((f) => f())); // web fonts change the measured widths
}

/* Segmented controls: a thumb glides to the chosen option. Its position is written on the thumb itself. */
const SEGS = [];
function segThumbs() {
  $$(".seg").forEach((seg) => {
    const thumb = document.createElement("span");
    thumb.className = "seg-thumb instant";
    thumb.setAttribute("aria-hidden", "true");
    seg.prepend(thumb);
    seg.classList.add("has-thumb");
    const place = () => {
      const btn = seg.querySelector('[aria-pressed="true"]');
      if (!btn) return;
      const r = btn.getBoundingClientRect(), sr = seg.getBoundingClientRect();
      thumb.style.width = r.width + "px";
      thumb.style.transform = `translateX(${r.left - sr.left - seg.clientLeft}px)`;
    };
    const jump = () => { thumb.classList.add("instant"); place(); requestAnimationFrame(() => requestAnimationFrame(() => thumb.classList.remove("instant"))); };
    SEGS.push(jump);
    jump();
    new MutationObserver(place).observe(seg, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
    if ("ResizeObserver" in window) new ResizeObserver(jump).observe(seg);
    seg.addEventListener("click", (e) => { const btn = e.target.closest("button"); if (btn && btn.getAttribute("aria-pressed") !== "true") haptic(); }, true);
  });
}

/* ---------- videos and quotes ---------- */
function bindVideos() {
  // On a computer, resting on a video starts it without sound; a click plays it with sound from about
  // where the preview got to. Phones: tap to play. No previews with reduced motion or data saver on.
  const preview = matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced && !(navigator.connection && navigator.connection.saveData);
  const send = (f, func) => { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*"); } catch {} };
  $$(".vid-play[data-yt]").forEach((btn) => {
    const frame = btn.parentElement;
    let f = null, timer = 0, since = 0, seen = 0;
    const make = (sound, start = 0) => {
      if (f) f.remove();
      frame.classList.remove("ready");
      f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.yt)}?autoplay=1&mute=${sound ? 0 : 1}&playsinline=1&rel=0&enablejsapi=1${start ? "&start=" + start : ""}`;
      f.title = btn.dataset.title;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      f.addEventListener("load", () => frame.classList.add("ready"));
      frame.prepend(f);
    };
    if (preview) {
      btn.addEventListener("pointerenter", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!f) make(false); else send(f, "playVideo");
          frame.classList.add("previewing");
          since = performance.now();
        }, 250);
      });
      btn.addEventListener("pointerleave", () => {
        clearTimeout(timer);
        if (!frame.classList.contains("previewing")) return;
        seen += (performance.now() - since) / 1000;
        if (f) send(f, "pauseVideo");
        frame.classList.remove("previewing");
      });
    }
    btn.addEventListener("click", () => {
      clearTimeout(timer);
      haptic();
      if (frame.classList.contains("previewing")) seen += (performance.now() - since) / 1000;
      // a fresh player with sound, from where the silent one got to (the click is what allows the sound)
      make(true, Math.max(0, Math.floor(seen - 1)));
      frame.classList.add("playing");
      btn.remove();
    });
  });
}
// Books turn toward you: on a computer they follow the pointer, on a phone a tap turns one to face you.
function bindBooks() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  $$(".book-card").forEach((card) => {
    const book = card.querySelector(".book");
    if (fine) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        book.style.transform = `rotateY(${(14 - x * 26).toFixed(1)}deg) rotateX(${(-y * 10).toFixed(1)}deg)`;
      });
      card.addEventListener("pointerleave", () => { book.style.transform = ""; });
    } else {
      card.addEventListener("click", () => { book.classList.toggle("open"); haptic(); });
    }
  });
}
// Quotes further down rise in once as they come into view. They start visible; the script only
// hides the ones below the fold, so the page is complete without it.
function revealQuotes() {
  if (reduced || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.classList.add("reveal");
    requestAnimationFrame(() => e.target.classList.remove("pre"));
  }), { rootMargin: "0px 0px -12% 0px" });
  $$(".pull, .sage").forEach((el) => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); } });
}

/* ---------- words you can tap for their meaning ---------- */
// one bubble for the whole page; the text comes from the dictionary, so it follows the language
function bindTerms() {
  const pop = document.createElement("div");
  pop.className = "term-pop"; pop.id = "termPop"; pop.setAttribute("role", "tooltip"); pop.hidden = true;
  document.body.appendChild(pop);
  let open = null;
  const close = () => {
    if (!open) return;
    open.setAttribute("aria-expanded", "false"); open.removeAttribute("aria-describedby");
    pop.hidden = true; open = null;
  };
  const show = (btn) => {
    close();
    pop.textContent = t("term_" + btn.dataset.term) || "";
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, pad = 16;
    const left = clamp(r.left + r.width / 2 - pw / 2, pad, innerWidth - pw - pad);
    const below = r.bottom + 10 + ph < innerHeight || r.top < ph + 20;
    pop.style.left = left + scrollX + "px";
    pop.style.top = (below ? r.bottom + 10 : r.top - ph - 10) + scrollY + "px";
    pop.style.setProperty("--ox", (r.left + r.width / 2 - left) + "px");
    btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-describedby", "termPop");
    open = btn;
    haptic();
  };
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".term");
    if (btn) { e.preventDefault(); e.stopPropagation(); open === btn ? close() : show(btn); return; }
    if (!e.target.closest(".term-pop")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { const b = open; close(); b.focus(); } });
  addEventListener("resize", close);
  return close;
}
const closeTerm = bindTerms();

/* ---------- switching language ---------- */
// the address follows the language: /investing/ or /beleggen/ (an old ?lang= link is tidied up too)
function syncUrl() {
  if (!ON_SITE) return;
  try {
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    u.pathname = LANG === "nl" ? "/beleggen/" : "/investing/";
    if (u.href !== location.href) history.replaceState(null, "", u);
  } catch {}
}
const FIELDS = ["cStart", "cMonthly", "cYears", "cFee", "ownAmt", "mixStocks"];
const fmtField = (id, v) => (SL[id] ? SL[id].fmt(v) : int(v));
function setLang(lang) {
  if (lang === LANG) return;
  const vals = FIELDS.map((id) => num($("#" + id), 0)); // read in the old language, write in the new one
  LANG = lang;
  store.set("investing-lang", lang);
  syncUrl();
  closeTerm();
  applyStatic();
  FIELDS.forEach((id, k) => ($("#" + id).value = fmtField(id, vals[k])));
  historyLists(); periodStats(); paintBrush(); heroText();
  if (H.shown) drawHistory();
  hay.relabel(); fees(); own(); expText(); drawMC(); drawMix(); drawEsg();
  SLIDERS.forEach((f) => f());
  SEGS.forEach((f) => f());
}

/* ---------- start ---------- */
const typed = FIELDS.map((id) => parse($("#" + id).value, "en")); // the page ships with English-formatted values
applyStatic(); syncUrl();
FIELDS.forEach((id, k) => ($("#" + id).value = fmtField(id, typed[k])));
segThumbs();
heroText();
$$("[data-lang]").forEach((btn) => btn.addEventListener("click", () => setLang(btn.dataset.lang)));
bindHistory(); bindBrush(); historyLists(); periodStats();
drawSpark(margins($("#histChart").clientWidth));
haystack(); fees(); bindOwn(); own();
bindMC(); expText(); simulate();
bindVideos(); bindBooks(); revealQuotes();
drawMix(); onResize($("#mixChart"), drawMix);
drawEsg(); onResize($("#esgChart"), drawEsg); revealGrid();
$("#esgChart")?.closest("details")?.addEventListener("toggle", (e) => e.target.open && drawEsg());
const hc = $("#histChart");
$("#histSvg").setAttribute("height", hc.clientWidth < 560 ? 320 : 380);
// the chart is the hero: it draws straight away and the number counts up with it
H.shown = true; drawHistory(); playIntro(); onResize(hc, drawHistory);
whenVisible($("#mcChart"), () => { mcAnimated = false; drawMC(); onResize($("#mcChart"), drawMC); });
})();
