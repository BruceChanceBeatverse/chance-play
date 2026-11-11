import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, fitCanvas, bindDrag, afterReveal, promptBox, offerContinue } from "../ui.js";
import { clamp, formatNumber } from "../geo.js";
import { drawPlane, drawWater } from "../art.js";
import { routeDistanceKm, LIVED_FLIGHT_ROUTES, routeMidLabel } from "../data.js";
import { formatKm, formatKmEn } from "../geo.js";

export function livedNumberlineRoutes() {
  return LIVED_FLIGHT_ROUTES.map((r) => {
    const mid = routeMidLabel(r);
    return {
      ...r,
      mid: mid.zh,
      midEn: mid.en,
    };
  });
}

export function numberlineRouteForVariant(variant = 0) {
  const routes = livedNumberlineRoutes();
  const i = ((Number(variant) % routes.length) + routes.length) % routes.length;
  return routes[i] || routes[0];
}

export function rangeFor(level, variant = 0) {
  if (level <= 1) {
    const lived = numberlineRouteForVariant(variant);
    const mid = lived.mid || routeMidLabel(lived).zh;
    return {
      min: 0, max: 10, mid: true, ticks: [0, 5, 10], unit: "",
      route: { start: "上海", mid, midEn: lived.midEn, end: lived.end, endEn: lived.endEn },
      subtitle: "这是去" + lived.end + "的航线：0 是上海，10 是" + lived.end,
      subtitleEn: "This is the route to " + lived.endEn + ": 0 is Shanghai, 10 is " + lived.endEn,
      livedRoute: lived,
    };
  }
  if (level === 2) return { min: 0, max: 100, mid: true, ticks: [0, 50, 100], unit: "", route: { start: "家", mid: "一半", end: "更远" }, subtitle: "0 到 100 的一条路" };
  if (level === 3) return { min: 0, max: 100, mid: false, ticks: [0, 100], unit: "", route: { start: "家", end: "更远" }, subtitle: "0 到 100，中间先不标" };
  if (level === 4) return { min: 0, max: 1000, mid: true, ticks: [0, 500, 1000], unit: " 米", route: { start: "山脚", mid: "一半", end: "更高" }, subtitle: "把一座山当成 0 到 1,000 米" };
  return { min: 0, max: 10000, mid: false, ticks: [0, 10000], unit: " 公里", special: "routes", route: { start: "上海", end: "很远" }, subtitle: "0 到 10,000 公里的航线" };
}

function targetFor(range, level) {
  if (range.special === "routes") return null; // handled separately
  if (level <= 1) return 5;
  if (level === 2) return [50, 80][Math.random() < 0.5 ? 0 : 1];
  if (level === 3) return [25, 75, 60][Math.floor(Math.random() * 3)];
  return [100, 250, 500][Math.floor(Math.random() * 3)];
}

export function renderNumberline(app, { goHome, onDone, variant = 0 } = {}) {
  const s = screen();
  s.classList.add("mode-numberline");
  const level = store.level("numberline");
  const range = rangeFor(level, variant);
  let targets, placed, current;

  if (range.special === "routes") {
    const tokyo = routeDistanceKm("PVG", "HND");
    const paris = routeDistanceKm("PVG", "CDG");
    targets = [
      { name: "东京", value: tokyo, color: "#5ce1e6" },
      { name: "巴黎", value: paris, color: "#f5c84c" },
    ];
    placed = { 0: null, 1: null };
    current = 0;
  } else {
    const v = targetFor(range, level);
    targets = [{ name: String(v), value: v, color: "#f5c84c" }];
    placed = { 0: null };
    current = 0;
  }

  const canvas = el("canvas", { class: "fill", "aria-label": "数轴航线" });
  s.append(canvas);
  s.append(topbar({
    title: "数轴航线",
    sub: range.subtitle || (range.min + " 到 " + formatNumber(range.max) + (range.unit || "")),
    onBack: goHome,
  }));
  const hint = el("div", { class: "prompt dock-top" },
    el("h2", { text: "把 " + targets[0].name + " 放到航线上" }),
    el("p", { text: (range.route ? (range.route.start + " 在这一头，" + range.route.end + " 在那一头。") : "") + "拖到你觉得对的地方，再松手。" }),
  );
  s.append(hint);

  let dragging = false;
  let dragX = numberlineStartX(range, targets[current].value);
  let revealed = false;

  function layout(w, h) {
    const L = 80, R = w - 80, Y = h * 0.55;
    const labels = numberlineMidLabelLayout(Y);
    return { L, R, Y, ...labels, xOf: (v) => L + ((v - range.min) / (range.max - range.min)) * (R - L),
      vOf: (x) => range.min + ((x - L) / (R - L)) * (range.max - range.min) };
  }

  let running = true, raf = 0;
  const draw = () => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#173a5c");
    sky.addColorStop(0.55, "#0c2740");
    sky.addColorStop(1, "#0a3a30");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // sea band under the route
    const sea = ctx.createLinearGradient(0, h * 0.5, 0, h);
    sea.addColorStop(0, "rgba(20, 80, 110, 0.0)");
    sea.addColorStop(0.2, "rgba(20, 90, 120, 0.65)");
    sea.addColorStop(1, "rgba(8, 30, 48, 1)");
    ctx.fillStyle = sea;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    const L = layout(w, h);
    // land nubs at the ends (cities / mountains)
    if (range.route) {
      ctx.fillStyle = "#2a6a55";
      ctx.beginPath(); ctx.arc(L.L, L.Y + 18, 28, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(L.R, L.Y + 18, 34, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#f4efe4";
      ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(range.route.start, L.L, L.endLabelY);
      ctx.fillText(range.route.end, L.R, L.endLabelY);
      // 「海中间」 sits BELOW the route so feedback / 正确 / the gold marker
      // above the line cannot cover it, even when they pile up at the midpoint.
      if (range.route.mid) ctx.fillText(range.route.mid, (L.L + L.R) / 2, L.midLabelY);
    }
    // runway
    ctx.strokeStyle = "rgba(92,225,230,0.35)";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(L.L, L.Y); ctx.lineTo(L.R, L.Y); ctx.stroke();
    ctx.strokeStyle = "#f5c84c";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(L.L, L.Y); ctx.lineTo(L.R, L.Y); ctx.stroke();

    ctx.fillStyle = "#f4efe4";
    ctx.font = "700 20px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    for (const tick of range.ticks) {
      const x = L.xOf(tick);
      ctx.strokeStyle = "#f4efe4";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, L.Y - 16); ctx.lineTo(x, L.Y + 16); ctx.stroke();
      ctx.fillText(formatNumber(tick) + (range.unit || ""), x, L.tickY);
    }
    if (range.mid && !range.ticks.includes((range.min + range.max) / 2)) {
      const mid = (range.min + range.max) / 2;
      const x = L.xOf(mid);
      ctx.fillText(formatNumber(mid), x, L.tickY);
    }

    // already placed
    for (const [i, val] of Object.entries(placed)) {
      if (val == null) continue;
      const t = targets[i];
      const x = L.xOf(clamp(val, range.min, range.max));
      plane(ctx, x, L.Y - 28, t.color);
      ctx.fillStyle = t.color;
      ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
      const closeToTruth = Math.abs(val - t.value) <= Math.max(0.51, (range.max - range.min) * 0.04);
      const truthX = L.xOf(t.value);
      const placedLab = numberlinePlacedLabelLayout(x, truthX, L);
      // If the drop already sits on the answer, don't also write a gold mark on the truth.
      if (!(revealed && closeToTruth)) {
        ctx.fillText(numberlinePlacedLabel(Math.round(val)), placedLab.x, placedLab.y);
      }
      if (revealed) {
        ctx.strokeStyle = "rgba(125,255,179,0.8)";
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(truthX, L.Y - 78); ctx.lineTo(truthX, L.Y + 20); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#7dffb3";
        ctx.fillText("正确 " + formatNumber(Math.round(t.value)), truthX, L.truthY);
      }
    }

    if (!revealed && placed[current] == null) {
      const x = L.L + dragX * (L.R - L.L);
      plane(ctx, x, L.Y - 28, targets[current].color);
      const v = L.vOf(x);
      ctx.fillStyle = targets[current].color;
      ctx.font = "700 18px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(targets[current].name, x, L.Y - 54);
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const unbind = bindDrag(canvas, {
    down(pt) {
      if (revealed) return;
      dragging = true;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const L = layout(w, h);
      dragX = clamp((pt.x - L.L) / (L.R - L.L), 0, 1);
    },
    move(pt) {
      if (!dragging) return;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const L = layout(w, h);
      dragX = clamp((pt.x - L.L) / (L.R - L.L), 0, 1);
    },
    up() {
      if (!dragging) return;
      dragging = false;
      drop();
    },
  });

  function drop() {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    const L = layout(w, h);
    const val = L.vOf(L.L + dragX * (L.R - L.L));
    placed[current] = val;
    const truth = targets[current].value;
    const err = Math.abs(val - truth);
    const span = range.max - range.min;
    store.addNumberlineError({ range: range.max, target: truth, placed: val, error: err / span });
    sfx.soft();
    if (current < targets.length - 1) {
      current += 1;
      dragX = numberlineStartX(range, targets[current].value);
      hint.querySelector("h2").textContent = "再把 " + targets[current].name + " 放上去";
      talk("再把" + targets[current].name + "放到航线上。");
    } else {
      reveal();
    }
  }

  function reveal() {
    revealed = true;
    const span = range.max - range.min;
    let ok = true;
    let lines = [];
    for (let i = 0; i < targets.length; i++) {
      if (!numberlineScoreOk(level, placed[i], targets[i].value, range.min, range.max)) ok = false;
      lines.push(numberlineRevealLine(targets[i].name, placed[i], targets[i].value));
    }
    store.recordAnswer("numberline", ok);
    hint.querySelector("h2").textContent = numberlineFeedbackTitle(ok);
    hint.querySelector("p").textContent = lines.join("。");
    const btnRow = el("div", { class: "choices" },
      el("button", { class: "choice ok", onClick: () => {
        hint.remove();
        afterReveal("numberline", () => offerContinue(s, { title: "再放一个？", body: "还可以再玩一条航线。", tone: "ok", goHome, actions: [{ label: "再玩一次", kind: "ok", onClick: () => renderNumberline(app, { goHome, onDone, variant: variant + 1 }) }] }), numberlineRevealOpts(range));
      } }, "下一步"),
    );
    hint.append(btnRow);
    talk(ok ? "放得很好。" + lines.join("。") : "来看看正确的位置。" + lines.join("。"));
  }

  talk((range.route ? range.route.start + " 在这一头，" + range.route.end + " 在那一头。" : "0 在这一头，" + formatNumber(range.max) + " 在另一头。") + "把 " + targets[0].name + " 拖到你觉得对的地方。");
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); unbind(); };
  app.replaceChildren(s);
  store.markModePlayed("numberline");
}


/** Kid-facing reveal sentence. Do not lead with a bare target number ("5 你放在 6…"). */
export function numberlineRevealLine(name, placed, truth) {
  const p = formatNumber(Math.round(placed));
  return "你放在 " + p + "，" + name + " 在这里";
}

/** Portrait prompt sits a little further below the title pill; landscape stays at 88. */
export const NUMBERLINE_PROMPT_TOP = 88;
export const NUMBERLINE_PROMPT_TOP_PORTRAIT = 108;

export function numberlinePromptTop(w, h) {
  return h > w ? NUMBERLINE_PROMPT_TOP_PORTRAIT : NUMBERLINE_PROMPT_TOP;
}

function plane(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x - 12, y + 7);
  ctx.lineTo(x - 12, y - 7);
  ctx.closePath();
  ctx.fill();
}


/** Keep the midpoint readable for a 6-year-old: 「海中间」 below the line,
 *  tick numbers just under the line, feedback and 正确 above.
 *  Placed vs truth marks get extra vertical room so a nearby "放在 6"
 *  does not sit on 「正确 5」. */
export function numberlineMidLabelLayout(y) {
  return {
    tickY: y + 36,
    midLabelY: y + 70,
    endLabelY: y + 70,
    placedY: y - 70,
    truthY: y - 118,
  };
}

/** L1 0–10: an exact drop of 5 on the mark 6 must be a miss. */

/** Start clearly away from the target so a tiny drag cannot score as correct. */
export function numberlineStartX(range, target) {
  const min = Number(range && range.min);
  const max = Number(range && range.max);
  const span = max - min;
  const level = Number(range && range.level);
  const tol = 0.08; // matches L1 window; keep start outside even if tighter
  if (!(span > 0) || !Number.isFinite(target)) return 0.12;
  const t = (target - min) / span;
  const windowLow = t - tol;
  const windowHigh = t + tol;
  // Prefer a start near the left, clearly not in the success window.
  const left = 0.12;
  if (left < windowLow - 0.02) return left;
  const right = 0.88;
  if (right > windowHigh + 0.02) return right;
  return left < 0.5 ? 0.05 : 0.95;
}

export function numberlineCardIdFor(rangeOrRoute) {
  const lived = (rangeOrRoute && rangeOrRoute.livedRoute) || rangeOrRoute;
  if (lived && lived.cardId) return lived.cardId;
  const end = (rangeOrRoute && rangeOrRoute.route && rangeOrRoute.route.end) || (lived && lived.end);
  const hit = LIVED_FLIGHT_ROUTES.find((r) => r.end === end);
  return hit ? hit.cardId : "c-mid";
}

export function numberlineRevealOpts(range, extra = {}) {
  const prefer = numberlineCardIdFor(range);
  const opts = { ...extra };
  if (prefer) {
    opts.prefer = prefer;
    opts.allowOnly = [prefer];
    // Lived halfway cards must actually appear (maybeDropCard otherwise skips ~72%).
    if (opts.force === undefined && prefer !== "c-mid") opts.force = true;
  }
  return opts;
}

export function numberlineScoreOk(level, placed, target, min, max) {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(placed) || !Number.isFinite(target)) return false;
  const rel = Math.abs(placed - target) / span;
  const tol = level <= 1 ? 0.08 : level <= 2 ? 0.12 : level <= 4 ? 0.1 : 0.08;
  return rel <= tol;
}

export function numberlineFeedbackTitle(ok) {
  return ok ? "放得很好" : "再看一眼，飞机飞过去揭晓了";
}

export function numberlinePlacedLabel(val) {
  return "放在 " + formatNumber(val);
}

/** Nudge a placed label away from the truth tick when they would collide. */
export function numberlinePlacedLabelLayout(placedX, truthX, labels) {
  const y = labels?.placedY ?? -70;
  const minSep = 64;
  const dx = placedX - truthX;
  let x = placedX;
  if (Math.abs(dx) < minSep) {
    const dir = dx >= 0 ? 1 : -1;
    x = truthX + dir * minSep;
  }
  return { x, y, minSep };
}
