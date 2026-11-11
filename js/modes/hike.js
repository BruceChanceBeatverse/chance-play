import { store } from "../store.js";
import { talk } from "../audio.js";
import { el, screen, topbar, hud, promptBox, fitCanvas, bindDrag, afterReveal, offerContinue, markAnswer, toast, questionHudLayout, HUD_LAYOUT, playHint } from "../ui.js";
import { hikeTempC, formatTemp, clamp } from "../geo.js";
import { shouldShowHikePicker, resolveHike, renderHikePicker, switchRouteButton, FIRST_PLAY_HIKE_ID } from "../pickers.js";


/** Watchable play duration for the full trail (not a real hike). */
export const HIKE_PLAY_SECONDS = 24;

/** Advance the walker when it is not being dragged and no question is holding it. */
export function autoHikeProgress(prev, dtSec, { dragging = false, asked = false } = {}) {
  if (dragging || asked) return prev;
  const dt = Math.max(0, Math.min(0.05, dtSec));
  return Math.min(1, prev + dt / HIKE_PLAY_SECONDS);
}

/** Always show the official peak, not a noisy sample-point rounding. */
export function hikeDisplayPeakM(hike) {
  const official = Number(hike?.peakM);
  if (Number.isFinite(official)) return official;
  const pts = hike?.points || [];
  return pts.reduce((m, p) => Math.max(m, p.elevM || 0), 0);
}

/** The official summit mark sits in the middle of the ridge, not on the first equal-height sample. */
export function hikePeakPoint(hike) {
  const pts = hike?.points || [];
  const official = hikeDisplayPeakM(hike);
  const top = pts.filter((p) => Math.abs((p.elevM || 0) - official) < 0.05);
  if (top.length) {
    const mid = (top[0].distKm + top[top.length - 1].distKm) / 2;
    return top.reduce((a, p) => Math.abs(p.distKm - mid) < Math.abs(a.distKm - mid) ? p : a);
  }
  return pts.reduce((a, p) => ((p.elevM || 0) > (a?.elevM || -Infinity) ? p : a), pts[0] || { distKm: 0, elevM: 0 });
}

/** Tight official-summit window: close in both height and distance along the trail. */
export function hikeSummitWindow(hike) {
  const official = hikeDisplayPeakM(hike);
  const pts = hike?.points || [];
  const peak = hikePeakPoint(hike);
  const totalKm = pts.length ? pts[pts.length - 1].distKm : 1;
  return {
    official,
    peakDistKm: peak?.distKm ?? 0,
    totalKm,
    elevTol: Math.max(8, official * 0.004),
    distTol: Math.max(0.12, totalKm * 0.025),
  };
}

export function hikeAtOfficialSummit(here, hike) {
  const w = hikeSummitWindow(hike);
  if (!here) return false;
  const closeElev = Math.abs((here.elev ?? 0) - w.official) <= w.elevTol;
  const nearDist = Math.abs((here.dist ?? 0) - w.peakDistKm) <= w.distTol;
  const onPlateau = here.plateau === true;
  return onPlateau || (closeElev && nearDist);
}

export function hikeSlopeWord(deg, { atSummit = false } = {}) {
  if (atSummit) return "山顶";
  const d = Number(deg) || 0;
  if (Math.abs(d) < 3) return "平";
  if (d > 8) return "很陡";
  if (d > 3) return "上坡";
  if (d < -8) return "很陡的下坡";
  return "下坡";
}

/** HUD height and slope at the official summit must match the peak, never a downhill leftover. */
export function hikeHudReading(here, hike) {
  const official = hikeDisplayPeakM(hike);
  const atSummit = hikeAtOfficialSummit(here, hike);
  return {
    atSummit,
    elevM: atSummit ? official : (here?.elev ?? 0),
    deg: atSummit ? 0 : (here?.deg ?? 0),
    slopeWord: hikeSlopeWord(here?.deg ?? 0, { atSummit }),
  };
}

/** A mid-trail quiz (which mountain, temperature, slope, halfway height) never finishes the hike. */
export function hikeAfterQuizAction({ atSummit = false } = {}) {
  return atSummit ? "celebrate" : "continue";
}

/** Mid-trail identification / temperature / slope quizzes always offer a way to finish the climb. */
export function hikeMidTrailContinueLabels() {
  return ["继续走到山顶", "再爬一座"];
}

/** Ask "坡度快是什么意思" on a steep stretch when it is today's task, or at the task's level. */
export function hikeShouldAskSlope({ taskId, level, steep = false, already = false } = {}) {
  if (already) return false;
  if (!steep) return false;
  return taskId === "t30" || Number(level) >= 5;
}

/** 「这是哪一座山」 belongs near the summit, not a third of the way up. */
export function hikeWhichAskReady(here, hike) {
  if (hikeAtOfficialSummit(here, hike)) return true;
  const w = hikeSummitWindow(hike);
  const dist = here?.dist ?? 0;
  const toPeak = w.peakDistKm - dist;
  return toPeak >= -w.distTol && toPeak <= Math.max(0.35, w.totalKm * 0.15);
}

export function slopeRateQuestion() {
  return {
    title: "坡度快是什么意思？",
    body: "看一看：走同样远的路，是不是升得更多。",
    talk: "坡度快是什么意思？走同样远，升得更高，山就更陡。",
    choices: [
      { id: "steep", label: "走同样远，升得更高，山就更陡", ok: true },
      { id: "fast", label: "走得越快，坡度就越快" },
      { id: "cold", label: "外面越冷，坡度就越快" },
    ],
    okLine: "对。走同样远的路，升得越多，坡度就越快，山就越陡。",
    noLine: "坡度快不是走得快。是走同样远的路，升得更高，山就更陡。",
  };
}

export function renderHike(app, { goHome, onDone, hikeId, firstPlay = false, taskId = null } = {}) {
  if (shouldShowHikePicker({ hikeId, firstPlay })) {
    return renderHikePicker(app, {
      goHome,
      onPick: (hike) => renderHike(app, { goHome, onDone, hikeId: hike.id, taskId }),
    });
  }
  const s = screen();
  s.classList.add("mode-hike");
  const resolvedId = hikeId || (firstPlay ? FIRST_PLAY_HIKE_ID : null);
  const hike = resolveHike(resolvedId) || (store.get().hikes || [])[0];
  const pts = hike.points;
  const peak = hikePeakPoint(hike);
  const totalKm = pts[pts.length - 1].distKm;
  const minE = Math.min(...pts.map((p) => p.elevM));
  const maxE = Math.max(...pts.map((p) => p.elevM));

  // Always start at the trail foot (t = 0), so Fuji/Huangshan are not
  // already halfway up the mountain when the figure looks like it is at the start.
  let t = hikeStartT(typeof window !== "undefined" ? window.innerWidth : 834,
                     typeof window !== "undefined" ? window.innerHeight : 1194);
  let dragging = false;
  const level = store.level("hike");
  let asked = false;
  let celebrated = false;
  let quizKind = null;
  const askedKinds = new Set();
  const officialPeak = hikeDisplayPeakM(hike);

  const canvas = el("canvas", { class: "fill", "aria-label": "爬山剖面" });
  s.append(canvas);
  s.append(topbar({
    title: hike.name,
    sub: hike.sample ? "示例山路，还不是你自己走的足迹" : "你的轨迹",
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
    const plateau = !!(a.plateau && b.plateau) || !!(a.plateau && Math.abs(b.elevM - a.elevM) < 0.05);
    const slope = plateau ? 0 : (b.elevM - a.elevM) / Math.max(1e-6, (b.distKm - a.distKm) * 1000); // m/m
    const deg = Math.atan(slope) * 180 / Math.PI;
    return { dist: d, elev, deg, temp: hikeTempC(elev), plateau };
  }

  function layout(w, h) {
    return hikePathLayout(w, h, { minE, maxE, totalKm });
  }

  let running = true, raf = 0, lastTs = 0;
  const hint = playHint("小人会自己往前走。你也可以用手拉他。");
  s.append(hint);
  const draw = (now) => {
    if (!running) return;
    if (!lastTs) lastTs = now || performance.now();
    const ts = now || performance.now();
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    if (asked) hint.dismiss();
    if (!dragging && !asked && t < 1) {
      t = autoHikeProgress(t, dt, { dragging, asked });
      maybeAsk();
    }
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
    const lab = hikePeakLabelPos(px, py, w, fig, { x: hx, y: hy - fig.lift }, { switchBox: hikeSwitchBtnBox(w) });
    ctx.fillStyle = "#0b1520";
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = lab.align;
    ctx.fillText("最高 " + Math.round(officialPeak) + " 米", lab.x, lab.y);

    const reading = hikeHudReading(here, hike);
    const hideElev = asked && (quizKind === "mid" || quizKind === "slope");
    const hideTemp = asked && (quizKind === "temp" || quizKind === "mid");
    const hideSlope = asked && quizKind === "slope";
    board.update([
      here.dist.toFixed(2) + " 公里",
      hideElev ? "？" : Math.round(reading.elevM) + " 米",
      hideSlope ? "？" : (reading.atSummit ? "山顶" : reading.slopeWord + " " + Math.round(reading.deg) + "°"),
      hideTemp ? "？" : formatTemp(here.temp),
    ]);
    if (!celebrated && !dragging) maybeCelebrate(here);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const unbind = bindDrag(canvas, {
    down(pt) { dragging = true; hint.dismiss(); seek(pt); },
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
    if (asked || celebrated) return;
    const here = at(t);
    const steep = Math.abs(here.deg) > 8;
    const slopeAlready = askedKinds.has("slope") || store.hasAsked("hike:slope");
    if (hikeShouldAskSlope({ taskId, level, steep, already: slopeAlready }) && t > 0.12) {
      askSlope();
      return;
    }
    if (level <= 1 && t > 0.2) askPeak();
    else if (level === 2 && t > 0.45 && !askedKinds.has("mid") && !store.hasAsked("hike:mid")) askMid();
    else if (level >= 3 && t > 0.3 && !askedKinds.has("temp") && !store.hasAsked("hike:temp")) askTemp();
    else if (level >= 5 && !askedKinds.has("which") && !store.hasAsked("hike:which:" + hike.id) && hikeWhichAskReady(here, hike)) askWhich();
  }

  function atSummit(here) {
    return hikeAtOfficialSummit(here, hike);
  }

  function maybeCelebrate(here) {
    if (celebrated || asked) return;
    if (!atSummit(here)) return;
    celebrateSummit();
  }

  function celebrateSummit() {
    if (celebrated) return;
    celebrated = true;
    asked = true;
    quizKind = null;
    // Hold the figure on the official summit so the height tile matches the peak.
    const peakT = totalKm ? (peak.distKm / totalKm) : t;
    t = peakT;
    s.querySelectorAll(".prompt").forEach((n) => n.remove());
    const banner = el("div", { class: "summit-banner" },
      "到山顶了！",
      el("small", {}, hike.name.replace("（示例）", "") + "，最高 " + Math.round(officialPeak) + " 米"),
    );
    s.append(banner);
    setTimeout(() => banner.remove(), 4000);
    store.recordAnswer("hike", true);
    const line = "到山顶了！最高 " + Math.round(officialPeak) + " 米。这是示例山路，还不是你自己走的足迹。";
    talk(line);
    const cont = () => offerContinue(s, {
      title: "到山顶了",
      body: hike.name.replace("（示例）", "") + "最高 " + Math.round(officialPeak) + " 米。还可以再爬一座，或去尺度之旅。",
      tone: "ok",
      goHome,
      actions: [
        { label: "再爬一座", kind: "ok", onClick: () => renderHike(app, { goHome, onDone, taskId }) },
        { label: "再走一次", onClick: () => renderHike(app, { goHome, onDone, hikeId: hike.id }) },
        { label: "去尺度之旅", onClick: () => onDone?.() || goHome?.() },
      ],
    });
    afterReveal("hike", cont, { force: true });
  }

  function askPeak() {
    asked = true;
    quizKind = "peak";
    const box = promptBox("最高的地方在哪儿？", "把小人走到山顶。还没到的话，就再说一声。", [
      { label: "我走到山顶了", id: "done", icon: "⛰️" },
      { label: "还在走", id: "retry", icon: "🔄" },
    ], (c) => {
      if (c.id === "retry") {
        box.remove();
        asked = false;
        quizKind = null;
        talk("继续走，找到曲线最高的那个点。");
        return;
      }
      const here = at(t);
      if (!atSummit(here)) {
        box.remove();
        asked = false;
        quizKind = null;
        toast("还没到山顶，再往上走走", 2600);
        talk("还没到山顶。再往上走走，找到最高的地方。");
        return;
      }
      box.remove();
      celebrateSummit();
    });
    s.append(box);
    talk("找出最高的地方，把小人走到那儿。还没到就继续走。");
  }

  function askMid() {
    asked = true;
    quizKind = "mid";
    askedKinds.add("mid");
    store.rememberAsked("hike:mid");
    const mid = at(0.5);
    const box = promptBox("走到一半，大约有多高？", "先猜，不要看角落里的数。", shuffle([
      { label: Math.round(mid.elev) + " 米", ok: true },
      { label: Math.round(peak.elevM) + " 米" },
      { label: Math.round(mid.elev * 0.5) + " 米" },
    ]), (c) => {
      store.recordAnswer("hike", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = "走到一半，高度大约 " + Math.round(mid.elev) + " 米，外面大约 " + formatTemp(mid.temp) + "。";
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        asked = true;
        afterReveal("hike", () => offerContinue(s, {
          title: c.ok ? "对了" : "是 " + Math.round(mid.elev) + " 米",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
          goHome,
          actions: [
            { label: "继续走到山顶", kind: "ok", onClick: () => { asked = false; } },
            { label: "再爬一座", onClick: () => renderHike(app, { goHome, onDone, taskId }) },
          ],
        }));
      }, 900);
    });
    s.append(box);
    talk("走到一半，现在大约有多高？先猜。");
  }

  function askTemp() {
    asked = true;
    quizKind = "temp";
    askedKinds.add("temp");
    store.rememberAsked("hike:temp");
    const box = promptBox("爬得越高，气温会怎样？", "先想一想，不要看角落里的温度。", [
      { label: "更冷", ok: true },
      { label: "更暖" },
    ], (c) => {
      store.recordAnswer("hike", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? "对。每升高 100 米，大约凉 0.65 度。" : "其实会更冷。每升高 100 米，大约凉 0.65 度。";
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        afterReveal("hike", () => offerContinue(s, {
          title: c.ok ? "对了" : "会更冷",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
          goHome,
          actions: [
            { label: "继续走到山顶", kind: "ok", onClick: () => { asked = false; } },
            { label: "再爬一座", onClick: () => renderHike(app, { goHome, onDone, taskId }) },
          ],
        }));
      }, 900);
    });
    s.append(box);
    talk("爬得越高，外面是更冷还是更暖？");
  }

  function askWhich() {
    asked = true;
    quizKind = "which";
    askedKinds.add("which");
    store.rememberAsked("hike:which:" + hike.id);
    const options = store.get().hikes.slice(0, 3).map((h) => ({
      label: h.name.replace("（示例）", ""),
      ok: h.id === hike.id,
    }));
    const box = promptBox("只看这座山的形状，它是哪一座？", "看高度和长度。还没到山顶，答完还可以继续走。", options, (c) => {
      store.recordAnswer("hike", !!c.ok);
      box.remove();
      const shortName = hike.name.replace("（示例）", "");
      const line = c.ok ? "对，这是" + shortName + "。" : "这是" + shortName + "，最高 " + Math.round(officialPeak) + " 米。";
      talk(line);
      const hereNow = at(t);
      // Identifying the mountain must never complete the hike mid-climb.
      if (hikeAfterQuizAction({ atSummit: atSummit(hereNow) }) === "celebrate") {
        afterReveal("hike", () => celebrateSummit());
        return;
      }
      afterReveal("hike", () => offerContinue(s, {
        title: c.ok ? "对了，这是" + shortName : "这是" + shortName,
        body: line + "还可以继续走到山顶。",
        tone: c.ok ? "ok" : "no",
        goHome,
        actions: [
          { label: "继续走到山顶", kind: "ok", onClick: () => { asked = false; quizKind = null; } },
          { label: "再爬一座", onClick: () => renderHike(app, { goHome, onDone, taskId }) },
        ],
      }));
    });
    s.append(box);
  }

  function askSlope() {
    asked = true;
    quizKind = "slope";
    askedKinds.add("slope");
    store.rememberAsked("hike:slope");
    const q = slopeRateQuestion();
    const box = promptBox(q.title, q.body, q.choices, (c) => {
      store.recordAnswer("hike", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? q.okLine : q.noLine;
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        afterReveal("hike", () => offerContinue(s, {
          title: c.ok ? "对了" : "再看一眼",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
          goHome,
          actions: [
            { label: "继续走到山顶", kind: "ok", onClick: () => { asked = false; } },
            { label: "再爬一座", onClick: () => renderHike(app, { goHome, onDone, taskId }) },
          ],
        }));
      }, 900);
    });
    s.append(box);
    talk(q.talk);
  }

  if (level <= 1) talk("小人会自己往前走。你也可以用手拉他，找出最高的地方。");
  else talk("小人会自己往前走。你也可以用手拉他，看高度、距离、坡度和气温一起变。");

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
export function hikePeakLabelPos(px, py, w, fig = hikeFigureSize(), walker, chrome = {}) {
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
  const sw = chrome.switchBox;
  const hitsSwitch = (lab) => sw && !(lab.right < sw.left - 6 || lab.left > sw.right + 6 || lab.bottom < sw.top - 6 || lab.top > sw.bottom + 6);
  for (const lab of candidates) {
    if (onCanvas(lab) && !overlaps(lab) && !hitsSwitch(lab) && lab.top >= 96) return lab;
  }
  for (const lab of candidates) {
    if (onCanvas(lab) && !overlaps(lab) && !hitsSwitch(lab)) return lab;
  }
  // Prefer the left of a right-hand peak, below the top bar, so 「换一座山」 cannot cover it.
  const safeY = Math.max(py - 8, 110);
  const leftSafe = pack("right", Math.max(16 + textW, Math.min(px, wx - r) - pad), safeY);
  return leftSafe;
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
export const HIKE_PORTRAIT_START_T = 0;

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

export function hikeStartT(_w, _h) {
  return 0;
}

export function hikePointAt(pts, totalKm, tt) {
  const here = hikeHereFromPoints(pts, totalKm, tt);
  return { dist: here.dist, elev: here.elev };
}

export function hikeHereFromPoints(pts, totalKm, tt) {
  const d = clamp(Number.isFinite(tt) ? tt : 0, 0, 1) * (totalKm || 0);
  if (!pts.length) return { dist: 0, elev: 0, deg: 0, plateau: false };
  let i = 0;
  while (i < pts.length - 2 && pts[i + 1].distKm < d) i++;
  const a = pts[i], b = pts[i + 1] || pts[i];
  const u = (d - a.distKm) / Math.max(1e-6, (b.distKm - a.distKm) || 1);
  const elev = a.elevM + (b.elevM - a.elevM) * u;
  const plateau = !!(a.plateau && (b.plateau || Math.abs((b.elevM || 0) - (a.elevM || 0)) < 0.05));
  const slope = plateau ? 0 : (b.elevM - a.elevM) / Math.max(1e-6, (b.distKm - a.distKm) * 1000);
  const deg = Math.atan(slope) * 180 / Math.PI;
  return { dist: d, elev, deg, plateau };
}

export function hikeHereAt(hike, tt) {
  const pts = hike?.points || [];
  const totalKm = pts.length ? pts[pts.length - 1].distKm : 1;
  return hikeHereFromPoints(pts, totalKm, tt);
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
