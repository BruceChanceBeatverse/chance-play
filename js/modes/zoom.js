import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, fitCanvas, bindPinch, afterReveal, promptBox, offerContinue, markAnswer } from "../ui.js";
import { DEFAULT_PROFILE } from "../data.js";
import { log10, pow10, clamp, formatNumber } from "../geo.js";
import { drawGlobe, drawMoon, drawSun, drawMountainPair } from "../art.js";
import { renderFlight } from "./flight.js";
import { renderHike } from "./hike.js";
import { renderRace } from "./race.js";
import { renderCosmos } from "./cosmos.js";
import {
  resolveScaleStops, nearestScaleStop, prettyScaleLine, formatScaleMetres,
  SCALE_WAYSTATIONS, PLANCK_LENGTH_M, OBSERVABLE_UNIVERSE_DIAMETER_M,
} from "../scale-data.js";


function mountainVisited(id) {
  return id === "mountain" || id === "sheshan" || id === "huangshan" || id === "fuji";
}

export function renderZoom(app, { goHome, onDone } = {}) {
  const s = screen();
  s.classList.add("mode-zoom");
  const stops = resolveScaleStops(store.get().profile, store.get().hikes);
  const minL = log10(PLANCK_LENGTH_M);
  const maxL = log10(OBSERVABLE_UNIVERSE_DIAMETER_M * 1.15);
  const me = stops.find((l) => l.id === "me") || stops[0];
  let logS = log10(me.metres);
  let target = logS;
  const level = store.level("zoom");
  let asked = false;
  const visited = new Set(["me"]);
  let auto = true;
  let holdPause = false;
  let resumeAt = 0;
  let cruiseDir = 1;
  let dwellLeft = 1.6;
  let lastDwellId = "me";
  let lastSpokenId = "";
  let pointers = 0;

  const canvas = el("canvas", { class: "fill", "aria-label": "从普朗克长度到宇宙的尺度之旅" });
  s.append(canvas);
  s.append(topbar({ title: "尺度之旅", sub: "自己会走。也可以捏，或跳到熟悉的一站", onBack: goHome }));
  const readout = el("div", { class: "zoom-readout" },
    el("div", { class: "pow", id: "pow" }, ""),
    el("div", { class: "name", id: "lname" }, ""),
    el("div", { class: "blurb", id: "lblurb" }, ""),
  );
  s.append(readout);
  const stepper = el("div", { class: "zoom-stepper" },
    el("button", { class: "zoom-btn in", "aria-label": "缩小" }, "缩小 −"),
    el("button", { class: "zoom-btn out", "aria-label": "放大" }, "放大 ＋"),
  );
  s.append(stepper);

  const ways = el("div", { class: "zoom-ways", "aria-label": "熟悉的站点" });
  const wayBtns = {};
  for (const w of SCALE_WAYSTATIONS) {
    const b = el("button", { "data-id": w.id }, w.label);
    b.addEventListener("click", () => jumpTo(w.id, true));
    ways.append(b);
    wayBtns[w.id] = b;
  }
  s.append(ways);

  const cruiseBox = el("div", { class: "zoom-cruise" });
  const pauseBtn = el("button", { "aria-label": "暂停或继续" }, "暂停");
  const fullBtn = el("button", {}, "从头走");
  pauseBtn.addEventListener("click", () => toggleAuto());
  fullBtn.addEventListener("click", () => {
    jumpTo("planck", false);
    cruiseDir = 1;
    auto = true;
    holdPause = false;
    dwellLeft = 2.5;
    pauseBtn.textContent = "暂停";
    talk("从最小的普朗克长度出发，一路走到宇宙。");
    sfx.whoosh();
  });
  cruiseBox.append(pauseBtn, fullBtn);
  s.append(cruiseBox);

  const linger = el("div", { class: "zoom-cruise", style: { right: "auto", left: "16px", top: "auto", bottom: "120px", display: "none" } });
  s.append(linger);

  function toggleAuto() {
    auto = !auto;
    holdPause = false;
    pauseBtn.textContent = auto ? "暂停" : "继续走";
    if (auto) talk("好，继续走。");
    else talk("先停在这里。");
  }

  function jumpTo(id, speak) {
    const stop = stops.find((l) => l.id === id);
    if (!stop) return;
    target = clamp(log10(stop.metres), minL, maxL);
    visited.add(id);
    if (mountainVisited(id)) visited.add("mountain");
    lastDwellId = id;
    dwellLeft = stop.familiar ? 7 : 4;
    auto = true;
    holdPause = false;
    pauseBtn.textContent = "暂停";
    sfx.tick();
    if (speak) talk("来看" + stop.name + "。" + (stop.correlate || stop.blurb));
    maybeAsk();
  }

  function nearest(ls) {
    const metres = pow10(ls);
    const { stop, close } = nearestScaleStop(stops, metres);
    return { layer: stop, metres, close };
  }

  function speakStop(stop) {
    if (!stop || lastSpokenId === stop.id) return;
    lastSpokenId = stop.id;
    const line = (stop.name + "。" + (stop.correlate || stop.blurb)).slice(0, 80);
    talk(line);
  }

  function showLinger(stop) {
    linger.replaceChildren();
    if (!stop || !stop.lingerMode) {
      linger.style.display = "none";
      return;
    }
    const label = {
      flight: stop.id === "paris" ? "飞去巴黎" : "飞去东京",
      hike: "爬这座山",
      race: "比一比速度",
      cosmos: "看光要走多久",
    }[stop.lingerMode] || "停一停";
    const btn = el("button", {}, label);
    btn.addEventListener("click", () => {
      auto = false;
      if (stop.lingerMode === "flight") {
        renderFlight(app, { goHome, onDone: () => renderZoom(app, { goHome, onDone }), tripId: stop.tripId || "pvg-hnd" });
      } else if (stop.lingerMode === "hike") {
        renderHike(app, { goHome, onDone: () => renderZoom(app, { goHome, onDone }), hikeId: stop.hikeId || "sheshan" });
      } else if (stop.lingerMode === "race") {
        renderRace(app, { goHome, onDone: () => renderZoom(app, { goHome, onDone }), trackId: "tokyo", allRacers: true });
      } else if (stop.lingerMode === "cosmos") {
        renderCosmos(app, { goHome, onDone: () => renderZoom(app, { goHome, onDone }) });
      }
    });
    linger.append(btn);
    linger.style.display = "flex";
  }

  let running = true, raf = 0, lastTs = 0;
  const draw = (now) => {
    if (!running) return;
    const ts = now || performance.now();
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;

    const userIdle = performance.now() > resumeAt && !holdPause && pointers < 2;
    if (auto && userIdle && !asked) {
      if (dwellLeft > 0) dwellLeft -= dt;
      else {
        target = clamp(target + cruiseDir * 0.12 * dt, minL, maxL);
        if (target >= maxL - 0.01 && cruiseDir === 1) {
          cruiseDir = -1;
          dwellLeft = 8;
          talk("已经到了能看到的宇宙这么大。现在往回走，一直走到最小。");
        } else if (target <= minL + 0.01 && cruiseDir === -1) {
          cruiseDir = 1;
          dwellLeft = 8;
          auto = false;
          pauseBtn.textContent = "继续走";
          talk("这是最小的普朗克长度。还可以再往外走一遍。");
        }
      }
    }

    logS += (target - logS) * 0.18;
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, w, h);
    const hasPrompt = !!s.querySelector(".prompt");
    const landscape = w > h;
    const hero = zoomHeroLayout(w, h, { hasPrompt, landscape });
    const cx = hero.cx;
    const cy = hero.cy;
    const { layer, metres, close } = nearest(logS);
    visited.add(layer.id);
    if (mountainVisited(layer.id)) visited.add("mountain");

    if (close && layer.id !== lastDwellId) {
      lastDwellId = layer.id;
      dwellLeft = layer.familiar ? 7 : (layer.generated ? 2.6 : 5);
      speakStop(layer);
      showLinger(layer);
    }
    for (const [id, b] of Object.entries(wayBtns)) {
      b.classList.toggle("here", layer.id === id || (id === "sheshan" && mountainVisited(layer.id) && layer.id !== "tokyo"));
    }

    const cap = zoomScaleCap(w, h, { hasPrompt, landscape });
    const decade0 = Math.floor(logS) - 3;
    let usedCap = false;
    for (let d = decade0; d <= decade0 + 7; d++) {
      const rel = d - logS;
      let rad = 40 * pow10(rel + 2);
      if (rad < 8) continue;
      if (rad > Math.max(w, h)) continue;
      if (rad > cap) {
        if (usedCap || cap < 8) continue;
        rad = cap;
        usedCap = true;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(92,225,230,${clamp(1.2 - Math.abs(rel) * 0.4, 0.08, 0.45)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const lab = zoomDecadeLabelPos(cx, cy, rad, 96, zoomReadoutBox(w, h, { hasPrompt, landscape }));
      if (lab && rad > 28 && rad < Math.min(w, h) * 0.45) {
        ctx.fillStyle = "rgba(200,230,255,0.9)";
        ctx.font = "700 14px -apple-system, PingFang SC, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("10" + sup(d) + " 米", lab.x, lab.y);
      }
    }

    const axis = zoomAxisLayout(w, h, { hasPrompt, landscape });
    const axisY = axis.axisY;
    const axisSpan = Math.max(1, axis.right - axis.left);
    ctx.strokeStyle = "rgba(245,200,76,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(axis.left, axisY); ctx.lineTo(axis.right, axisY); ctx.stroke();
    for (const l of stops) {
      if (l.generated) continue;
      const x = axis.left + ((log10(l.metres) - minL) / (maxL - minL)) * axisSpan;
      if (x < axis.left - 2 || x > axis.right + 2) continue;
      ctx.beginPath();
      ctx.fillStyle = l.id === layer.id ? "#f5c84c" : (l.familiar ? "rgba(244,239,228,0.7)" : "rgba(244,239,228,0.35)");
      ctx.arc(x, axisY, l.id === layer.id ? 8 : (l.familiar ? 5 : 3), 0, Math.PI * 2);
      ctx.fill();
    }
    const nx = axis.left + ((logS - minL) / (maxL - minL)) * axisSpan;
    ctx.fillStyle = "#5ce1e6";
    ctx.beginPath(); ctx.arc(nx, axisY, 7, 0, Math.PI * 2); ctx.fill();

    drawHero(ctx, cx, cy, layer, close);

    const powEl = readout.querySelector("#pow");
    const nameEl = readout.querySelector("#lname");
    const blurbEl = readout.querySelector("#lblurb");
    const shown = close ? layer.metres : metres;
    powEl.textContent = prettyScale(shown);
    nameEl.textContent = layer.name + (close ? "" : " 附近");
    const extra = layer.assumption ? "" : "";
    blurbEl.textContent = (layer.correlate || layer.blurb || "") + extra;

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  function bump(deltaLog) {
    target = clamp(target + deltaLog, minL, maxL);
    auto = true;
    resumeAt = performance.now() + 2600;
    dwellLeft = 0;
    sfx.tick();
    maybeAsk();
  }
  const unPinch = bindPinch(canvas, (factor) => {
    pointers = 2;
    resumeAt = performance.now() + 2600;
    bump(log10(factor) * 1.15);
  });
  stepper.querySelector(".out").addEventListener("click", () => bump(0.55));
  stepper.querySelector(".in").addEventListener("click", () => bump(-0.55));

  canvas.addEventListener("pointerdown", () => {
    pointers += 1;
    holdPause = true;
  });
  const release = () => {
    pointers = Math.max(0, pointers - 1);
    holdPause = false;
    resumeAt = performance.now() + 1600;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  function maybeAsk() {
    if (asked) return;
    if (level <= 1 && canAskOrder(visited)) askOrder();
    else if (level === 2 && canAskDecades(visited)) askDecades();
    else if (level >= 3 && visited.has("tokyo") && visited.has("paris")) askTimes();
  }

  function afterZoomQuestion(ok, line) {
    afterReveal("zoom", () => offerContinue(s, {
      title: ok ? "对了" : "看一下",
      body: line + "旅程还会继续走。",
      tone: ok ? "ok" : "no",
      goHome,
      actions: [
        { label: "继续走", kind: "ok", onClick: () => { asked = false; auto = true; } },
        { label: "从头走", onClick: () => { asked = false; jumpTo("planck", true); } },
      ],
    }));
  }

  function askOrder() {
    asked = true;
    auto = false;
    const opts = zoomL1OrderChoices();
    const box = promptBox("从小到大，哪一行是对的？", "听一听，再点那一行图画。", opts, (c) => {
      store.recordAnswer("zoom", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? "对。每一层都用上一层的东西来量。" : "正确的顺序是：蚂蚁，我，山，去东京。";
      talk(line);
      setTimeout(() => { box.remove(); afterZoomQuestion(!!c.ok, line); }, 900);
    });
    s.append(box);
    talk(zoomL1OrderTalk(opts));
  }

  function askDecades() {
    asked = true;
    auto = false;
    const box = promptBox("从你的身高到一座山，大约差几个 10 倍？", "数一数中间经过了几层。", [
      { label: "大约 2 个 10 倍", ok: true, icon: "⛰️" },
      { label: "大约 10 个 10 倍" },
      { label: "差不多一样高" },
    ], (c) => {
      store.recordAnswer("zoom", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? "对。1 米到 10 米再到大约 100 米，两个 10 倍，就到一座小山。" : "从大约 1 米到大约 100 米，是两个 10 倍。";
      talk(line);
      setTimeout(() => { box.remove(); afterZoomQuestion(!!c.ok, line); }, 900);
    });
    s.append(box);
    talk("从你的身高到一座山，大约差几个 10 倍？");
  }

  function askTimes() {
    asked = true;
    auto = false;
    const box = promptBox("去巴黎比去东京远几个 10 倍？", "差大约 5 倍，还不到一个 10 倍。", [
      { label: "不到一个 10 倍", ok: true },
      { label: "大约 10 倍" },
      { label: "大约 100 倍" },
    ], (c) => {
      store.recordAnswer("zoom", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? "对。大约 5 倍，还不到一个 10 倍。" : "大约 5 倍，还不到一个 10 倍。";
      talk(line);
      setTimeout(() => { box.remove(); afterZoomQuestion(!!c.ok, line); }, 900);
    });
    s.append(box);
    talk("去巴黎比去东京，差几个 10 倍？");
  }

  talk("从你的身高开始，尺度会自己往外走。两指也可以捏。想看最小，就点从头走。");
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); unPinch(); };
  app.replaceChildren(s);
  store.markModePlayed("zoom");
}

export function prettyMetres(m) {
  return formatScaleMetres(m);
}

/** Kid-facing scale readout. Never show "10 的 0.2 次方". */
export function prettyScale(m) {
  return prettyScaleLine(m);
}

/** City-scale figure is an editable assumption until a parent types a real distance. */
export function zoomCityBlurb(km = DEFAULT_PROFILE.cityAirportKm) {
  const n = Number.isFinite(Number(km)) ? Number(km) : DEFAULT_PROFILE.cityAirportKm;
  const assumed = Math.abs(n - DEFAULT_PROFILE.cityAirportKm) < 1e-6;
  const tag = assumed ? "（假设，路上会更绕）" : "（路上会更绕）";
  return "从市区开车去浦东机场，大约 " + n + " 公里" + tag + "。";
}

export function createZoomL1Trail({ onGuide } = {}) {
  const trail = el("div", { class: "zoom-trail hidden", "aria-label": "要看的尺度" });
  const chipsWrap = el("div", { class: "zoom-trail-chips" });
  const chips = {};
  for (const id of ZOOM_L1_REQUIRED) {
    const chip = el("div", { class: "zoom-chip", "data-layer": id }, zoomL1Label(id));
    chips[id] = chip;
    chipsWrap.append(chip);
  }
  const guideBtn = el("button", {
    class: "zoom-guide hidden",
    "aria-label": "去看",
  }, "去看");
  guideBtn.addEventListener("click", () => {
    const next = guideBtn.dataset.target;
    if (next) onGuide?.(next);
  });
  trail.append(chipsWrap, guideBtn);

  function refresh({ visited, asked, level } = {}) {
    if ((level ?? 1) > 1 || asked) {
      trail.classList.add("hidden");
      return;
    }
    trail.classList.remove("hidden");
    const ids = visited instanceof Set ? visited : new Set(visited || []);
    for (const id of ZOOM_L1_REQUIRED) {
      const seen = ids.has(id);
      const chip = chips[id];
      chip.classList.toggle("seen", seen);
      chip.textContent = (seen ? "✓ " : "") + zoomL1Label(id);
    }
    const next = zoomL1GuideTarget(ids);
    if (next) {
      const label = "去看" + zoomL1Label(next);
      guideBtn.classList.remove("hidden");
      if (guideBtn.dataset.target !== next) {
        guideBtn.dataset.target = next;
        guideBtn.setAttribute("aria-label", label);
        guideBtn.textContent = label;
      }
    } else {
      guideBtn.classList.add("hidden");
      guideBtn.dataset.target = "";
    }
  }

  return { trail, guideBtn, chips, refresh };
}

export function zoomAskKind(level) {
  if (level <= 1) return "order";
  if (level === 2) return "decades";
  return "times";
}

export const ZOOM_L1_REQUIRED = ["ant", "me", "mountain", "tokyo"];

export function zoomL1Label(id) {
  return { ant: "蚂蚁", me: "我", mountain: "山", tokyo: "东京" }[id] || id;
}

export const ZOOM_L1_ORDER_ICONS = { ant: "🐜", me: "🧒", mountain: "⛰️", tokyo: "✈️" };

/** Pictorial L1 closer: a non-reader can pick a row of pictures. Voice also reads each row. */
export function zoomL1OrderChoices() {
  const rows = [
    { ids: ["ant", "me", "mountain", "tokyo"], ok: true },
    { ids: ["mountain", "ant", "me", "tokyo"] },
    { ids: ["me", "tokyo", "mountain", "ant"] },
  ];
  return rows.map((row) => ({
    ...row,
    icons: row.ids.map((id) => ZOOM_L1_ORDER_ICONS[id]),
    spoken: row.ids.map((id) => zoomL1Label(id)).join("、"),
    label: row.ids.map((id) => ZOOM_L1_ORDER_ICONS[id]).join(" → "),
    ariaLabel: row.ids.map((id) => zoomL1Label(id)).join("，"),
  }));
}

export function zoomL1OrderTalk(choices = zoomL1OrderChoices()) {
  const ordinals = ["一", "二", "三", "四", "五"];
  const parts = choices.map((c, i) => "第" + (ordinals[i] || String(i + 1)) + "行是" + c.spoken);
  return "把蚂蚁、你自己、山、去东京，按从小到大排。哪一行是对的？" + parts.join("。") + "。";
}

export function missingZoomL1(visited) {
  const ids = visited instanceof Set ? visited : new Set(visited);
  return ZOOM_L1_REQUIRED.filter((id) => !ids.has(id));
}

export function zoomL1GuideTarget(visited) {
  return missingZoomL1(visited)[0] || null;
}

export function zoomL1HasFinishPath(visited) {
  // Even if the child only zoomed one direction, a guide target remains
  // until every required layer has been visited, then the question can fire.
  const ids = visited instanceof Set ? visited : new Set(visited);
  return canAskOrder(ids) || !!zoomL1GuideTarget(ids);
}

/** CSS-pixel axis. Landscape + question: keep the slider clear of the right panel.
 *  Guide (no quiz), both orientations: stop short of the 缩小 / 放大 stack. */
export function zoomAxisLayout(w, h, { hasPrompt, landscape } = {}) {
  const left = 40;
  let right = w - 40;
  if (landscape && hasPrompt) right = Math.min(right, w * 0.64);
  if (!hasPrompt) {
    const step = zoomStepperBox(w, h, { landscape: !!landscape });
    right = Math.min(right, step.left - 12);
  }
  return { left, right, axisY: h - 28 };
}

/** Both orientations dock 缩小 / 放大 above the tick scale, not on it. */
export const ZOOM_GUIDE_AXIS_Y_OFFSET = 28;
export const ZOOM_GUIDE_BTN_H = 72;
export const ZOOM_GUIDE_BTN_GAP = 12;
export const ZOOM_GUIDE_PORTRAIT_BOTTOM = 48;
export const ZOOM_GUIDE_LANDSCAPE_BOTTOM = 48;
export const ZOOM_GUIDE_TRAIL_HEIGHT = 88;
export const ZOOM_GUIDE_SCALE_RADIUS = 280;

export function zoomStepperBox(w, h, { landscape } = {}) {
  const land = landscape ?? (w > h);
  const btnW = w <= 900 ? 100 : 120;
  const rightPad = w <= 900 ? 12 : 18;
  const bottom = land ? ZOOM_GUIDE_LANDSCAPE_BOTTOM : ZOOM_GUIDE_PORTRAIT_BOTTOM;
  const stackH = ZOOM_GUIDE_BTN_H * 2 + ZOOM_GUIDE_BTN_GAP;
  return {
    left: w - rightPad - btnW,
    right: w - rightPad,
    top: h - bottom - stackH,
    bottom: h - bottom,
  };
}

export function zoomTrailBox(w, h, { landscape } = {}) {
  const land = landscape ?? (w > h);
  const height = ZOOM_GUIDE_TRAIL_HEIGHT;
  if (land) {
    const step = zoomStepperBox(w, h, { landscape: true });
    const bottom = ZOOM_GUIDE_LANDSCAPE_BOTTOM;
    return { left: 16, right: Math.min(w - 16, step.left - 16), top: h - bottom - height, bottom: h - bottom };
  }
  const step = zoomStepperBox(w, h, { landscape: false });
  const bottom = ZOOM_GUIDE_PORTRAIT_BOTTOM;
  // CSS: left 16px, max-width calc(100% - 148px)
  const maxRight = 16 + (w - 148);
  return { left: 16, right: Math.min(maxRight, step.left - 16), top: h - bottom - height, bottom: h - bottom };
}

/** Guide (no quiz) chrome vs the scale circle. Used so the waypoint bar and zoom keys stay clear. */
export function zoomGuideLayout(w, h) {
  const landscape = w > h;
  const hero = zoomHeroLayout(w, h, { hasPrompt: false, landscape });
  const axis = zoomAxisLayout(w, h, { hasPrompt: false, landscape });
  const trail = zoomTrailBox(w, h, { landscape });
  const stepper = zoomStepperBox(w, h, { landscape });
  const readout = zoomReadoutBox(w, h);
  return { landscape, hero, axis, trail, stepper, readout, reservedRadius: ZOOM_GUIDE_SCALE_RADIUS };
}

function circleHitsRect(c, box) {
  if (!box) return false;
  const nx = Math.min(box.right, Math.max(box.left, c.x));
  const ny = Math.min(box.bottom, Math.max(box.top, c.y));
  const dx = c.x - nx, dy = c.y - ny;
  return dx * dx + dy * dy < c.r * c.r;
}

export function zoomGuideCircleClear(w, h, radius = ZOOM_GUIDE_SCALE_RADIUS) {
  const g = zoomGuideLayout(w, h);
  const c = { x: g.hero.cx, y: g.hero.cy, r: radius };
  return !circleHitsRect(c, g.trail) && !circleHitsRect(c, g.stepper) && !circleHitsRect(c, g.readout);
}

/** Distance from a point to a CSS box. Negative if the point is inside. */
function distToRect(x, y, box) {
  if (!box) return Infinity;
  const dx = x < box.left ? box.left - x : x > box.right ? x - box.right : 0;
  const dy = y < box.top ? box.top - y : y > box.bottom ? y - box.bottom : 0;
  if (dx === 0 && dy === 0) {
    return -Math.min(x - box.left, box.right - x, y - box.top, box.bottom - y);
  }
  return Math.hypot(dx, dy);
}

/** Largest scale-circle radius that stays clear of the info card, quiz, and (in the guide) the waypoint bar. */
export const ZOOM_SCALE_CAP_GAP = 12;

export function zoomScaleCap(w, h, { hasPrompt, landscape } = {}) {
  const play = zoomPlayLayout(w, h, { hasPrompt, landscape });
  let cap = Math.max(0, play.visibleScaleRadius - ZOOM_SCALE_CAP_GAP);
  if (!hasPrompt) {
    const g = zoomGuideLayout(w, h);
    cap = Math.min(
      cap,
      Math.max(0, distToRect(play.hero.cx, play.hero.cy, g.trail) - ZOOM_SCALE_CAP_GAP),
      Math.max(0, distToRect(play.hero.cx, play.hero.cy, g.stepper) - ZOOM_SCALE_CAP_GAP),
    );
  }
  return cap;
}

/** Portrait L1 closer: compact quiz docked just above the scale axis. */
export const ZOOM_PORTRAIT_PROMPT_BOTTOM = 56;
export const ZOOM_PORTRAIT_PROMPT_HEIGHT = 200;

export function zoomPortraitPromptBox(w, h, { promptHeight } = {}) {
  const ph = promptHeight ?? ZOOM_PORTRAIT_PROMPT_HEIGHT;
  const width = Math.min(860, Math.max(40, w - 32));
  return {
    left: (w - width) / 2,
    right: (w + width) / 2,
    top: h - ZOOM_PORTRAIT_PROMPT_BOTTOM - ph,
    bottom: h - ZOOM_PORTRAIT_PROMPT_BOTTOM,
  };
}

/** Hero sits in the free play band. Landscape + quiz stays left of the side panel.
 *  Landscape guide / closer rings are centered in the band so the scale circle
 *  can stay clear of the info card and the waypoint bar. Portrait is unchanged. */
export function zoomHeroLayout(w, h, { hasPrompt, landscape } = {}) {
  if (landscape && hasPrompt) {
    const top = zoomReadoutBox(w, h, { hasPrompt: true, landscape: true }).bottom + 12;
    const bot = zoomAxisLayout(w, h, { hasPrompt: true, landscape: true }).axisY - 8;
    return { cx: w * 0.34, cy: (top + bot) / 2 };
  }
  if (!landscape && hasPrompt) {
    const top = zoomReadoutBox(w, h, { hasPrompt: true, landscape: false }).bottom + 8;
    const bot = zoomPortraitPromptBox(w, h).top - 8;
    const mid = (top + bot) / 2;
    return { cx: w / 2, cy: mid };
  }
  if (landscape && !hasPrompt) {
    const top = zoomReadoutBox(w, h, { hasPrompt: false, landscape: true }).bottom + 12;
    const bot = zoomTrailBox(w, h, { landscape: true }).top - 12;
    return { cx: w / 2, cy: (top + bot) / 2 };
  }
  return { cx: w / 2, cy: h / 2 + 36 };
}

/** Play surface vs quiz chrome. Used to keep the plane and enough of the scale visible. */
export function zoomPlayLayout(w, h, { hasPrompt, landscape, promptHeight } = {}) {
  const hero = zoomHeroLayout(w, h, { hasPrompt, landscape });
  const axis = zoomAxisLayout(w, h, { hasPrompt, landscape });
  const readout = zoomReadoutBox(w, h, { hasPrompt, landscape });
  let prompt = null;
  if (hasPrompt && landscape) {
    prompt = zoomLandscapePromptBox(w, h);
  } else if (hasPrompt) {
    prompt = zoomPortraitPromptBox(w, h, { promptHeight });
  }
  const playTop = readout.bottom;
  const playBottom = (prompt && !landscape) ? prompt.top : (axis.axisY - 8);
  const playRight = (prompt && landscape) ? prompt.left : w;
  const visibleScaleRadius = Math.max(0, Math.min(
    hero.cx,
    playRight - hero.cx,
    hero.cy - playTop,
    playBottom - hero.cy,
  ));
  return { hero, prompt, axis, playTop, playBottom, playRight, visibleScaleRadius };
}

export const ZOOM_LANDSCAPE_PROMPT_RIGHT = 16;
export const ZOOM_LANDSCAPE_PROMPT_MAX_W = 360;
export const ZOOM_LANDSCAPE_PROMPT_FRAC = 0.34;
export const ZOOM_QUIZ_READOUT_GAP = 12;

/** Landscape quiz panel, matching the CSS: right 16px, width min(360px, 34%). */
export function zoomLandscapePromptBox(w, h) {
  const pw = Math.min(ZOOM_LANDSCAPE_PROMPT_MAX_W, w * ZOOM_LANDSCAPE_PROMPT_FRAC);
  return {
    left: w - ZOOM_LANDSCAPE_PROMPT_RIGHT - pw,
    right: w - ZOOM_LANDSCAPE_PROMPT_RIGHT,
    top: 88,
    bottom: h - 20,
  };
}

/** Approximate CSS box of the top info card, used to keep scale marks readable.
 *  Landscape + quiz: the card sits in the play band left of the panel, with a 12px gap.
 *  Portrait (and landscape without a quiz) keep the original centered box. */
export function zoomReadoutBox(w, h, { hasPrompt, landscape } = {}) {
  const height = 150;
  const top = 92;
  let width = Math.min(Math.max(280, 420), Math.max(40, w - 40));
  let left = w / 2 - width / 2;
  if (landscape && hasPrompt) {
    const prompt = zoomLandscapePromptBox(w, h);
    const limit = prompt.left - ZOOM_QUIZ_READOUT_GAP;
    const pad = 20;
    const maxW = Math.max(40, limit - pad);
    width = Math.min(width, maxW);
    const cx = (pad + limit) / 2;
    left = cx - width / 2;
    if (left + width > limit) left = limit - width;
    if (left < pad) left = pad;
  }
  return { left, right: left + width, top, bottom: top + height };
}

function labelHitsBox(x, y, box, padX = 36, padY = 14) {
  if (!box) return false;
  return x + padX >= box.left && x - padX <= box.right && y + padY >= box.top && y - padY <= box.bottom;
}

/** Skip decade labels under the hero, and keep them out from under the info card. */
export function zoomDecadeLabelPos(cx, cy, rad, heroR = 96, avoid) {
  if (!Number.isFinite(rad) || rad < heroR + 12) return null;
  // Prefer lower-left / sides so a landscape "10⁵ 米" does not sit under the card.
  const angles = [Math.PI * 1.15, Math.PI * 0.82, -Math.PI * 0.72, -Math.PI * 0.28, Math.PI * 0.2];
  for (const ang of angles) {
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (!labelHitsBox(x, y, avoid)) return { x, y };
  }
  return null;
}

export function canAskOrder(visited) {
  const ids = visited instanceof Set ? visited : new Set(visited);
  // L1 wording: 蚂蚁 → 我 → 山 → 东京. Do not ask on 一粒沙 before those layers.
  return ids.has("ant") && ids.has("me") && ids.has("mountain") && ids.has("tokyo");
}

export function canAskDecades(visited) {
  const ids = visited instanceof Set ? visited : new Set(visited);
  // L2 wording: 从你的身高到一座山. Steps alone is not enough; city is past mountain scale.
  return ids.has("me") && (ids.has("mountain") || ids.has("city"));
}

function sup(n) {
  const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => map[c] || c).join("");
}

function drawHero(ctx, cx, cy, layer, close) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = close ? 1 : 0.7;
  const id = layer.id;
  if (id === "me") {
    ctx.font = "120px -apple-system";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🧒", 0, 0);
  } else if (id === "ant") {
    ctx.font = "80px -apple-system";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐜", 0, 0);
  } else if (id === "sand") {
    ctx.fillStyle = "#d2b48c";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc((-3 + i) * 14, (i % 2) * 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "cell") {
    ctx.fillStyle = "rgba(255,122,89,0.8)";
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a1020";
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  } else if (id === "atom") {
    ctx.strokeStyle = "#5ce1e6"; ctx.lineWidth = 2;
    for (const a of [0, 1.047, 2.094]) {
      ctx.beginPath(); ctx.ellipse(0, 0, 70, 28, a, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#f5c84c";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  } else if (id === "mountain") {
    drawMountainPair(ctx, 0, 30, 110, { snow: true, color: "#2a6a55" });
  } else if (id === "city" || id === "tokyo" || id === "paris") {
    // simple skyline so the layer is a place, not only an emoji
    ctx.fillStyle = "#1a3a50";
    const hs = id === "city" ? [40, 70, 50, 90, 60, 45] : [30, 50, 40, 80, 55, 35];
    hs.forEach((hh, i) => {
      ctx.fillRect(-90 + i * 30, 40 - hh, 26, hh);
    });
    ctx.font = "64px -apple-system";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(id === "city" ? "🏙️" : "✈️", 0, -20);
  } else if (id === "earth") {
    drawGlobe(ctx, 0, 0, 88, { lonC: 125, latC: 28 });
  } else if (id === "moon") {
    drawMoon(ctx, 0, 0, 52);
  } else if (id === "sun") {
    drawSun(ctx, 0, 0, 70);
  } else if (id === "proxima") {
    ctx.fillStyle = "#ff7a59"; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,122,89,0.25)"; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
  } else if (id === "blackhole") {
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f5c84c"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 16, 0.2, 0, Math.PI * 2); ctx.stroke();
  } else if (id === "steps") {
    ctx.font = "90px -apple-system";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("👣", 0, 0);
  } else if (id === "sheshan" || id === "huangshan" || id === "fuji" || id === "everest") {
    drawMountainPair(ctx, 0, 30, 110, { snow: id !== "sheshan", color: "#2a6a55" });
  } else if (id === "planck") {
    ctx.fillStyle = "#f5c84c";
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(245,200,76,0.5)"; ctx.lineWidth = 2;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, 10 + i * 14, 0, Math.PI * 2); ctx.stroke(); }
  } else if (id === "universe" || id === "milkyway" || id === "andromeda" || id === "laniakea" || id === "filament") {
    for (let i = 0; i < 40; i++) {
      const a = i * 1.7, r = 10 + (i * 17) % 80;
      ctx.fillStyle = "rgba(244,239,228," + (0.3 + (i % 5) * 0.12) + ")";
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.45, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(92,225,230,0.35)";
    ctx.beginPath(); ctx.ellipse(0, 0, 90, 36, 0.4, 0, Math.PI * 2); ctx.stroke();
  } else if (id === "proton" || id === "nucleus" || id === "quark") {
    ctx.fillStyle = id === "quark" ? "#ff7a59" : "#f5c84c";
    ctx.beginPath(); ctx.arc(0, 0, id === "quark" ? 8 : 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5ce1e6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.font = "100px -apple-system";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(layer.emoji || "🔹", 0, 0);
  }
  ctx.restore();
}
