import { store } from "../store.js";
import { talk } from "../audio.js";
import { el, screen, topbar, hud, promptBox, fitCanvas, bindDrag, afterReveal, finishMode, questionHudLayout, HUD_LAYOUT } from "../ui.js";
import { hikeTempC, formatTemp, clamp } from "../geo.js";
import { shouldShowHikePicker, resolveHike, renderHikePicker, switchRouteButton, FIRST_PLAY_HIKE_ID } from "../pickers.js";

export function renderHike(app, { goHome, onDone, hikeId, firstPlay = false } = {}) {
  if (shouldShowHikePicker({ hikeId, firstPlay })) {
    return renderHikePicker(app, {
      goHome,
      onPick: (hike) => renderHike(app, { goHome, onDone, hikeId: hike.id }),
    });
  }
  const s = screen();
  s.classList.add("mode-hike");
  const resolvedId = hikeId || (firstPlay ? FIRST_PLAY_HIKE_ID : null);
  const hike = resolveHike(resolvedId) || (store.get().hikes || [])[0];
  const pts = hike.points;
  const peak = pts.reduce((a, p) => p.elevM > a.elevM ? p : a, pts[0]);
  const totalKm = pts[pts.length - 1].distKm;
  const minE = Math.min(...pts.map((p) => p.elevM));
  const maxE = Math.max(...pts.map((p) => p.elevM));

  // Portrait starts a little up the visible slope, clear of the HUD.
  // Landscape stays at 0 — that start is already clear.
  let t = hikeStartT(typeof window !== "undefined" ? window.innerWidth : 834,
                     typeof window !== "undefined" ? window.innerHeight : 1194);
  let dragging = false;
  const level = store.level("hike");
  let asked = false;

  const canvas = el("canvas", { class: "fill", "aria-label": "爬山剖面" });
  s.append(canvas);
  s.append(topbar({
    title: hike.name,
    sub: hike.sample ? "示例剖面，不是你的足迹" : "你的轨迹",
    onBack: goHome,
    extra: switchRouteButton("换一座山", () => renderHike(app, { goHome, onDone })),
  }));
  const board = hud([
    { label: "走了多远", value: "0 公里", tone: "cyan" },
    { label: "有多高", value: Math.round(pts[0].elevM) + " 米", tone: "" },
    { label: "坡度", value: "平", tone: "mint" },
    { label: "外面气温", value: formatTemp(hikeTempC(pts[0].elevM)), tone: "coral" },
  ]);
  s.append(board);

  function at(tt) {
    const d = clamp(Number.isFinite(tt) ? tt : 0, 0, 1) * totalKm;
    if (!pts.length) return { dist: 0, elev: 0, deg: 0, temp: hikeTempC(0) };
    let i = 0;
    while (i < pts.length - 2 && pts[i + 1].distKm < d) i++;
    const a = pts[i], b = pts[i + 1];
    const u = (d - a.distKm) / Math.max(1e-6, b.distKm - a.distKm);
    const elev = a.elevM + (b.elevM - a.elevM) * u;
    const slope = (b.elevM - a.elevM) / Math.max(1e-6, (b.distKm - a.distKm) * 1000); // m/m
    const deg = Math.atan(slope) * 180 / Math.PI;
    return { dist: d, elev, deg, temp: hikeTempC(elev) };
  }

  function layout(w, h) {
    return hikePathLayout(w, h, { minE, maxE, totalKm });
  }

  let running = true, raf = 0;
  const draw = () => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5aa0d0");
    sky.addColorStop(0.45, "#b7d4ea");
    sky.addColorStop(1, "#1a3d2a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = hikeSunPos(w, h);
    ctx.fillStyle = "rgba(255, 230, 140, 0.85)";
    ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2); ctx.fill();
    const L = layout(w, h);
    // ground fill
    ctx.beginPath();
    ctx.moveTo(L.L, L.B);
    for (const p of pts) ctx.lineTo(L.x(p.distKm), L.y(p.elevM));
    ctx.lineTo(L.R, L.B);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, L.T, 0, L.B);
    g.addColorStop(0, "rgba(90, 160, 90, 0.95)");
    g.addColorStop(0.6, "rgba(46, 100, 60, 0.95)");
    g.addColorStop(1, "rgba(26, 61, 40, 0.95)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#f5c84c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(L.x(p.distKm), L.y(p.elevM)) : ctx.moveTo(L.x(p.distKm), L.y(p.elevM)));
    ctx.stroke();
    // peak mark
    ctx.fillStyle = "#ff7a59";
    ctx.beginPath(); ctx.arc(L.x(peak.distKm), L.y(peak.elevM), 6, 0, Math.PI * 2); ctx.fill();
    const px = L.x(peak.distKm), py = L.y(peak.elevM);
    const here = at(t);
    const hx = L.x(here.dist), hy = L.y(here.elev);
    const fig = hikeFigureSize();
    ctx.fillStyle = "#5ce1e6";
    ctx.beginPath(); ctx.arc(hx, hy - fig.lift, fig.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#071018";
    ctx.font = fig.emojiPx + "px -apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚶", hx, hy - fig.lift);
    ctx.textBaseline = "alphabetic";
    // Label after the figure so 「最高 N 米」 stays fully legible at the summit.
    const lab = hikePeakLabelPos(px, py, w, fig, { x: hx, y: hy - fig.lift });
    ctx.fillStyle = "#0b1520";
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = lab.align;
    ctx.fillText("最高 " + Math.round(peak.elevM) + " 米", lab.x, lab.y);

    const slopeWord = Math.abs(here.deg) < 3 ? "平" : here.deg > 8 ? "很陡" : here.deg > 3 ? "上坡" : here.deg < -8 ? "很陡的下坡" : "下坡";
    board.update([
      here.dist.toFixed(2) + " 公里",
      Math.round(here.elev) + " 米",
      slopeWord + " " + Math.round(here.deg) + "°",
      formatTemp(here.temp),
    ]);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const unbind = bindDrag(canvas, {
    down(pt) { dragging = true; seek(pt); },
    move(pt) { if (dragging) seek(pt); },
    up() { dragging = false; maybeAsk(); },
  });
  function seek(pt) {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (!w || !Number.isFinite(pt.x)) return;
    const L = layout(w, h);
    const span = L.R - L.L;
    if (span <= 0) return;
    t = clamp((pt.x - L.L) / span, 0, 1);
  }

  function maybeAsk() {
    if (asked) return;
    if (level <= 1 && t > 0.2) askPeak();
    else if (level === 2 && t > 0.45) askMid();
    else if (level >= 3 && t > 0.3) askTemp();
  }

  function askPeak() {
    asked = true;
    const box = promptBox("最高的地方在哪儿？", "把小人拖到山顶，再选。", [
      { label: "我拖到山顶了", id: "done", icon: "⛰️" },
      { label: "再试试", id: "retry", icon: "🔄" },
    ], (c) => {
      if (c.id === "retry") {
        box.remove();
        asked = false;
        talk("再拖一次，找到曲线最高的那个点。");
        return;
      }
      const close = Math.abs(at(t).elev - peak.elevM) < Math.max(8, peak.elevM * 0.05);
      store.recordAnswer("hike", close);
      box.remove();
      talk(close ? "对，这是最高的地方，大约 " + Math.round(peak.elevM) + " 米。" : "最高的地方大约 " + Math.round(peak.elevM) + " 米。");
      afterReveal("hike", () => finishMode(onDone, goHome));
    });
    s.append(box);
    talk("找出最高的地方，把小人拖到那儿。");
  }

  function askMid() {
    asked = true;
    const mid = at(0.5);
    const box = promptBox("走到一半，大约有多高？", "先猜，再看数字。", shuffle([
      { label: Math.round(mid.elev) + " 米", ok: true },
      { label: Math.round(peak.elevM) + " 米" },
      { label: Math.round(mid.elev * 0.5) + " 米" },
    ]), (c) => {
      store.recordAnswer("hike", !!c.ok);
      box.remove();
      talk("走到一半，高度大约 " + Math.round(mid.elev) + " 米，外面大约 " + formatTemp(mid.temp) + "。");
      afterReveal("hike", () => finishMode(onDone, goHome));
    });
    s.append(box);
    talk("走到一半，现在大约有多高？");
  }

  function askTemp() {
    asked = true;
    const box = promptBox("爬得越高，气温会怎样？", "每升高 100 米，大约凉 0.65 度。", [
      { label: "更冷", ok: true },
      { label: "更暖" },
    ], (c) => {
      store.recordAnswer("hike", !!c.ok);
      box.remove();
      talk(c.ok ? "对。每升高 100 米，大约凉 0.65 度。" : "其实会更冷。每升高 100 米，大约凉 0.65 度。");
      if (level >= 5) askWhich();
      else afterReveal("hike", () => finishMode(onDone, goHome));
    });
    s.append(box);
    talk("爬得越高，外面是更冷还是更暖？");
  }

  function askWhich() {
    const options = store.get().hikes.slice(0, 3).map((h) => ({
      label: h.name.replace("（示例）", ""),
      ok: h.id === hike.id,
    }));
    const box = promptBox("只看这座山的形状，它是哪一座？", "看高度和长度。", options, (c) => {
      store.recordAnswer("hike", !!c.ok);
      box.remove();
      talk(c.ok ? "对，这是" + hike.name + "。" : "这是" + hike.name + "，最高大约 " + Math.round(peak.elevM) + " 米。");
      afterReveal("hike", () => finishMode(onDone, goHome));
    });
    s.append(box);
  }

  if (level <= 1) talk("拖着小人沿山走。找出最高的地方。");
  else talk("拖着小人走。看高度、距离、坡度和气温一起变。");

  s._cleanup = () => { running = false; cancelAnimationFrame(raf); unbind(); };
  app.replaceChildren(s);
  store.markModePlayed("hike");
}

export function hikeSwitchBtnBox(w) {
  const width = 150, height = 72, right = 18, top = 14;
  return { left: w - right - width, right: w - right, top, bottom: top + height };
}

export function hikeTitleChipBox(w) {
  const left = 18 + 72 + 12;
  const maxW = Math.max(0, w - 160);
  const top = 14, height = 72;
  return { left, right: left + maxW, top, bottom: top + height };
}

/** Hiker on the ridge. Large enough to spot, still sitting on the path. */
export function hikeFigureSize() {
  return { radius: 20, emojiPx: 24, lift: 22 };
}

/** Keep 「最高 N 米」 clear of the figure at the summit, even if the walker is a little past the peak. */
export function hikePeakLabelPos(px, py, w, fig = hikeFigureSize(), walker) {
  const textW = 110;
  const textH = 18;
  const pad = 12;
  const wx = walker?.x ?? px;
  const wy = walker?.y ?? (py - fig.lift);
  const r = fig.radius;
  const pack = (align, x, y) => ({
    x, y, align, textW, textH,
    left: align === "left" ? x : x - textW,
    right: align === "left" ? x + textW : x,
    top: y - textH,
    bottom: y,
  });
  const overlaps = (lab) => {
    const box = { left: lab.left - 4, right: lab.right + 4, top: lab.top - 2, bottom: lab.bottom + 2 };
    const nx = Math.min(box.right, Math.max(box.left, wx));
    const ny = Math.min(box.bottom, Math.max(box.top, wy));
    const dx = wx - nx, dy = wy - ny;
    return dx * dx + dy * dy < (r + 2) * (r + 2);
  };
  const onCanvas = (lab) => lab.left >= 8 && lab.right <= w - 8 && lab.top >= 8;
  const rightX = Math.max(px, wx + r) + pad;
  const leftX = Math.min(px, wx - r) - pad;
  const candidates = [
    pack("left", rightX, py - 8),
    pack("left", rightX, wy + r + textH + 4),
    pack("left", rightX, wy - r - 6),
    pack("right", leftX, py - 8),
    pack("right", leftX, wy - r - 6),
    pack("right", leftX, wy + r + textH + 4),
    pack("left", Math.min(w - 16 - textW, rightX + 24), py - 8),
  ];
  for (const lab of candidates) {
    if (onCanvas(lab) && !overlaps(lab)) return lab;
  }
  return pack("left", Math.min(w - 16 - textW, rightX), py - 8);
}

/** Keep the sun in open sky, clear of the title chip and 「换一座山」. */
export function hikeSunPos(w, h) {
  const r = 28;
  const btn = hikeSwitchBtnBox(w);
  const landscape = w > h;
  // Landscape has a gap between the title and the switch; portrait's title
  // chip is wide, so drop the sun below the top bar.
  const x = Math.min(w * 0.62, btn.left - r - 8);
  const y = landscape ? 70 : btn.bottom + r + 18;
  return { x, y, r };
}

/** Portrait 2-column HUD is tall; keep the path (and the walker) above it. */
export const HIKE_HUD_CLEARANCE = 20;
/** Stay below the L1 ask trigger (t > 0.2) so the peak question does not fire at start. */
export const HIKE_PORTRAIT_START_T = 0.1;

export function hikeHudBox(w, h, { items = 4 } = {}) {
  const lay = questionHudLayout(w, h, { items });
  return {
    left: 18,
    right: w - 18,
    top: lay.hudTop,
    bottom: h - HUD_LAYOUT.bottom,
    height: lay.hudHeight,
  };
}

export function hikePathLayout(w, h, { minE = 0, maxE = 100, totalKm = 1 } = {}) {
  const L = 70, R = w - 30, T = 110;
  const hud = hikeHudBox(w, h);
  const portrait = h > w;
  // Landscape already clears the one-row HUD with B = h - 140. Do not change it.
  const B = portrait ? Math.min(h - 140, hud.top - HIKE_HUD_CLEARANCE) : (h - 140);
  const spanE = Math.max(1, maxE - minE + 40);
  return {
    L, R, T, B, portrait, hud,
    x: (d) => L + (d / Math.max(1e-6, totalKm)) * (R - L),
    y: (e) => B - ((e - minE) / spanE) * (B - T),
  };
}

export function hikeStartT(w, h) {
  return h > w ? HIKE_PORTRAIT_START_T : 0;
}

export function hikePointAt(pts, totalKm, tt) {
  const d = clamp(Number.isFinite(tt) ? tt : 0, 0, 1) * totalKm;
  if (!pts.length) return { dist: 0, elev: 0 };
  let i = 0;
  while (i < pts.length - 2 && pts[i + 1].distKm < d) i++;
  const a = pts[i], b = pts[i + 1] || pts[i];
  const u = (d - a.distKm) / Math.max(1e-6, (b.distKm - a.distKm) || 1);
  const elev = a.elevM + (b.elevM - a.elevM) * u;
  return { dist: d, elev };
}

/** CSS-pixel circle of the walker (head + body mark) at progress t. */
export function hikeWalkerBox(w, h, t, hike) {
  const pts = hike.points || [];
  const totalKm = pts.length ? pts[pts.length - 1].distKm : 1;
  const minE = pts.length ? Math.min(...pts.map((p) => p.elevM)) : 0;
  const maxE = pts.length ? Math.max(...pts.map((p) => p.elevM)) : 1;
  const L = hikePathLayout(w, h, { minE, maxE, totalKm });
  const here = hikePointAt(pts, totalKm, t);
  const fig = hikeFigureSize();
  const hx = L.x(here.dist);
  const hy = L.y(here.elev);
  return {
    x: hx,
    y: hy - fig.lift,
    r: fig.radius,
    footY: hy,
    dist: here.dist,
    elev: here.elev,
    layout: L,
  };
}

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
