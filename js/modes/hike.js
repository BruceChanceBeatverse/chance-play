import { store } from "../store.js";
import { talk } from "../audio.js";
import { el, screen, topbar, hud, promptBox, fitCanvas, bindDrag, afterReveal, offerContinue, markAnswer, toast, questionHudLayout, HUD_LAYOUT, playHint, goToScaleJourney } from "../ui.js";
import { hikeTempC, formatTemp, clamp } from "../geo.js";
import { shouldShowHikePicker, resolveHike, renderHikePicker, switchRouteButton, FIRST_PLAY_HIKE_ID } from "../pickers.js";
import { bi, UI, clampSeekToBeats } from "../i18n.js";


/** Watchable play duration for the full trail (not a real hike). */
export const HIKE_PLAY_SECONDS = 20;
/** Fuji felt rushed at 20 s; give the official 3,776 m climb more time. */
export const FUJI_PLAY_SECONDS = 40;

export function hikePlaySeconds(hike) {
  if (hike && hike.id === "fuji") return FUJI_PLAY_SECONDS;
  return HIKE_PLAY_SECONDS;
}

/**
 * Speed up long flat approaches (Fuji's first kilometres barely climb)
 * so a child is not forced to drag, without teleporting to the summit.
 */
export function hikeAutoPace(t, hike) {
  if (!hike || !Array.isArray(hike.points) || hike.points.length < 2) return 1;
  const here = hikeHereAt(hike, t);
  const ahead = hikeHereAt(hike, Math.min(1, Number(t) + 0.05));
  const dElev = Math.abs((ahead.elev ?? 0) - (here.elev ?? 0));
  const dDist = Math.abs((ahead.dist ?? 0) - (here.dist ?? 0));
  const climbPerKm = dDist > 1e-6 ? dElev / dDist : 0;
  // Keep a modest boost on long flats, but never shoot the walker to the top.
  if (climbPerKm < 40) return 2;
  if (climbPerKm < 100) return 1.45;
  return 1;
}

/** Advance the walker when it is not being dragged and no question is holding it. */
export function autoHikeProgress(prev, dtSec, { dragging = false, asked = false, celebrated = false, hike = null } = {}) {
  if (dragging || asked || celebrated) return prev;
  const dt = Math.max(0, Math.min(0.05, dtSec));
  const pace = hikeAutoPace(prev, hike);
  const seconds = hikePlaySeconds(hike);
  return Math.min(1, prev + (dt / seconds) * pace);
}

/** Keep the walker on the official summit while the finish dialog is open. */
export function hikePinnedT(hike, t, { celebrated = false } = {}) {
  if (!celebrated || !hike) return t;
  const pts = hike.points || [];
  const totalKm = pts.length ? pts[pts.length - 1].distKm : 1;
  const peak = hikePeakPoint(hike);
  if (!totalKm) return t;
  return (peak.distKm || 0) / totalKm;
}

export function hikeProgressHeld({ dragging = false, asked = false, celebrated = false, revealOpen = false, finishOpen = false } = {}) {
  return !!(dragging || asked || celebrated || revealOpen || finishOpen);
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
    if (hike.peakAlign === "end" || hike.livedAbility) return top[top.length - 1];
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
    distKm: here?.dist ?? 0,
    deg: atSummit ? 0 : (here?.deg ?? 0),
    slopeWord: hikeSlopeWord(here?.deg ?? 0, { atSummit }),
  };
}

/** Kid-facing trail distance. At the end of a lived 12 km walk, show 12 公里, not 11.96. */
export function hikeDistLabel(distKm, hike) {
  const d = Number(distKm);
  const total = Number(hike?.lengthKm);
  const fallback = (hike?.points && hike.points.length) ? hike.points[hike.points.length - 1].distKm : NaN;
  const end = Number.isFinite(total) && total > 0 ? total : fallback;
  if (Number.isFinite(end) && Number.isFinite(d) && Math.abs(d - end) <= 0.15) {
    const nice = Math.abs(end - Math.round(end)) < 0.05 ? String(Math.round(end)) : end.toFixed(1).replace(/\.0$/, "");
    return { zh: nice + " 公里", en: nice + " km" };
  }
  const shown = Number.isFinite(d) ? d.toFixed(2) : "0.00";
  return { zh: shown + " 公里", en: shown + " km" };
}

/** Mid-path height choices must match the HUD at the moment the question is asked. */
export function hikeMidHeightChoices(here, hike) {
  const elev = Math.round(Number(here?.elev) || 0);
  const peak = Math.round(hikeDisplayPeakM(hike));
  let low = Math.round(elev * 0.5);
  if (low === elev) low = Math.max(0, elev - Math.max(20, Math.round(elev * 0.2)));
  let high = peak;
  if (high === elev) high = elev + Math.max(20, Math.round(elev * 0.2));
  return [
    { label: elev + " 米", labelEn: elev + " m", ok: true, metres: elev },
    { label: high + " 米", labelEn: high + " m", metres: high },
    { label: low + " 米", labelEn: low + " m", metres: low },
  ];
}

/** A mid-trail quiz (which mountain, temperature, slope, halfway height) never finishes the hike. */
export function hikeAfterQuizAction({ atSummit = false } = {}) {
  return atSummit ? "celebrate" : "continue";
}

/** Mid-trail identification / temperature / slope quizzes always offer a way to finish the climb. */
export function hikeMidTrailContinueLabels() {
  return ["继续走到山顶", "再爬一座"];
}

/** Today's 「坡度快」 prompt must become a real question, even on a gentle hill like 佘山. */
export function hikeShouldAskSlope({ taskId, level, steep = false, already = false } = {}) {
  if (already) return false;
  if (taskId === "t30") return true;
  return !!steep && Number(level) >= 5;
}

/** 「这是哪一座山」 belongs near the summit, not a third of the way up. */
export function hikeWhichAskReady(here, hike) {
  if (hikeAtOfficialSummit(here, hike)) return true;
  const w = hikeSummitWindow(hike);
  const dist = here?.dist ?? 0;
  const toPeak = w.peakDistKm - dist;
  return toPeak >= -w.distTol && toPeak <= Math.max(0.35, w.totalKm * 0.15);
}

/**
 * Never open a peak-quiz modal that freezes auto-walk.
 * Asking on the approach stretch (the old hikeWhichAskReady window)
 * stopped 佘山 at about 81 m, so the figure never reached the official 99 m summit.
 * L1 learns "where is the highest point" by watching the figure arrive
 * and seeing 「到山顶了！最高 99 米」.
 */
export function hikePeakAskReady(here, hike, { already = false } = {}) {
  return false;
}

/** Mountain world cards drop at the summit, never mid-trail after a quiz. */
export function hikeQuizRevealOpts(hike, { atSummit = false, force = false } = {}) {
  if (!atSummit) return {};
  return hikeRevealOpts(hike, { force });
}

/** After a mid-trail answer, keep walking even if the child does not tap 继续走到山顶. */
export const HIKE_MID_QUIZ_RESUME_MS = 2500;

export const HIKE_MOUNTAIN_CARDS = {
  sheshan: "c-sheshan",
  huangshan: "c-huangshan",
  fuji: "c-fuji",
  dolomites: "c-dolomites",
};

export function hikeTrailNote(hike) {
  if (!hike) return { zh: "示例山路，还不是你自己走的足迹", en: "A sample path, not your own GPS track yet" };
  if (hike.id === "fuji") {
    return { zh: "你来过这座山。官方 3,776 米。你记得它大概是三千八百米；官方数字比三千八百要少一点点。这条线还不是你自己走的足迹。", en: "You've been to this mountain. Officially 3,776 m. You remember it as about 3,800 m. The official number is a little less than 3,800. This path is not your own GPS track." };
  }
  if (hike.id === "dolomites" || hike.livedAbility) {
    return { zh: "这座平顶山像你认识的大板凳山，斯西利亚尔（Schlern / Sciliar）。一次大约 12 公里，爬升大约 900 米。不是 2,563 米的登顶，也不是一条量过的足迹。", en: "This flat top looks like the table-top mountain you know, 大板凳山, Schlern / Sciliar. About 12 km, with about 900 m of climbing. Not a 2,563 m summit, and not a measured GPS track." };
  }
  if (hike.id === "sheshan" || hike.contrastOnly) {
    return { zh: "上海附近一座大约 99 米的小山，用来比一比。不是你爬过的山。", en: "A small hill near Shanghai, about 99 m, for contrast. Not a mountain you have climbed." };
  }
  if (hike.sample) return { zh: "示例山路，还不是你自己走的足迹", en: "A sample path, not your own GPS track yet" };
  return { zh: "你的轨迹", en: "Your track" };
}

export function hikeCelebrateCopy(hike, officialPeak) {
  const name = String(hike?.name || "").replace("（示例）", "");
  const nameEn = hike?.nameEn || name;
  if (hike && (hike.id === "dolomites" || hike.livedAbility)) {
    const gain = Math.round(hike.gainM || 900);
    const km = hike.lengthKm || 12;
    return {
      bannerZh: "走完了！",
      bannerEn: "You finished it!",
      title: { zh: "走完了", en: "You finished it" },
      body: { zh: "这座平顶山像你认识的大板凳山，斯西利亚尔（Schlern / Sciliar）。官方最高点大约 2,563 米，那是你认识的那座山。今天大约 " + km + " 公里，爬升大约 " + gain + " 米，是你能走的那种路，不是 2,563 米的登顶。", en: "This flat top looks like the table-top mountain you know, 大板凳山, Schlern / Sciliar. The official high point is about 2,563 m — that is the mountain you know. Today is about " + km + " km, with about " + gain + " m of climbing: the kind of walk you can do, not a summit of that 2,563 m peak." },
      talkZh: "走完了！大约 " + km + " 公里，爬升大约 " + gain + " 米。这座平顶山像你认识的大板凳山，斯西利亚尔。不是 2,563 米的登顶，也不是一条量过的足迹。",
      talkEn: "You finished it! About " + km + " km, with about " + gain + " m of climbing. This flat top looks like 大板凳山, Schlern / Sciliar, the mountain you know. It is not a 2,563 m summit, and not a measured GPS track.",
      smallZh: name + "，大约 " + km + " 公里，爬升大约 " + gain + " 米",
      smallEn: nameEn + ", about " + km + " km, about " + gain + " m of climbing",
    };
  }
  const peak = Math.round(officialPeak);
  const fujiNote = hike && hike.id === "fuji"
    ? "官方高度 3,776 米。你记得它大概是三千八百米；官方数字比三千八百要少一点点。"
    : "";
  const fujiEn = hike && hike.id === "fuji"
    ? " The official height is 3,776 m. You remember it as about 3,800 m. The official number is a little less than 3,800."
    : "";
  const trail = hike && hike.sample === false ? "" : "这是示例山路，还不是你自己走的足迹。";
  const trailEn = hike && hike.sample === false ? "" : " This is a sample path, not your own GPS track yet.";
  const contrast = hike && (hike.id === "sheshan" || hike.contrastOnly) ? "这不是你爬过的山，只用来比一比。" : "";
  const contrastEn = hike && (hike.id === "sheshan" || hike.contrastOnly) ? " This is not a mountain you have climbed; it is only for contrast." : "";
  return {
    bannerZh: "到山顶了！",
    bannerEn: "You reached the top!",
    title: { zh: "到山顶了", en: "You reached the top" },
    body: { zh: name + "最高 " + peak + " 米。" + fujiNote + trail + contrast, en: nameEn + " is " + peak + " m at the top." + fujiEn + trailEn + contrastEn },
    talkZh: "到山顶了！最高 " + peak + " 米。" + fujiNote + trail + contrast,
    talkEn: "You reached the top! " + peak + " m at the highest point." + fujiEn + trailEn + contrastEn,
    smallZh: name + "，最高 " + peak + " 米",
    smallEn: nameEn + ", " + peak + " m at the top",
  };
}

export function hikeQuizBeats({ hike, level, askedKinds, taskId, celebrated, peakT, askedSession }) {
  const beats = [];
  const asked = askedKinds instanceof Set ? askedKinds : new Set(askedKinds || []);
  const hasAsked = (key) => (askedSession && askedSession.has && askedSession.has(key)) || false;
  const slopeAlready = asked.has("slope") || hasAsked("hike:slope");
  const steep = true; // the beat exists if the slope question will be asked; hikeShouldAskSlope decides at fire time
  if (hikeShouldAskSlope({ taskId, level, steep, already: slopeAlready })) {
    beats.push({ id: "slope", at: 0.12, done: asked.has("slope") });
  }
  if (level === 2) beats.push({ id: "mid", at: 0.45, done: asked.has("mid") || hasAsked("hike:mid") });
  if (level >= 3) beats.push({ id: "temp", at: 0.3, done: asked.has("temp") || hasAsked("hike:temp") });
  if (!celebrated && Number.isFinite(Number(peakT))) beats.push({ id: "summit", at: Number(peakT), done: false });
  return beats;
}


/** World card for the mountain under the child's feet — never a different sample peak. */
export function hikeCardIdFor(hike) {
  if (!hike) return null;
  return HIKE_MOUNTAIN_CARDS[hike.id] || null;
}

export function hikeRevealOpts(hike, extra = {}) {
  const prefer = hikeCardIdFor(hike);
  const opts = { ...extra };
  if (prefer) {
    opts.prefer = prefer;
    opts.allowOnly = [prefer];
  }
  return opts;
}

export function slopeRateQuestion() {
  return {
    title: "坡度快是什么意思？",
    titleEn: "What does a steep slope mean?",
    body: "看一看：走同样远的路，是不是升得更多。",
    bodyEn: "Look: for the same distance walked, did we climb more?",
    talk: "坡度快是什么意思？走同样远，升得更高，山就更陡。",
    choices: [
      { id: "steep", label: "走同样远，升得更高，山就更陡", labelEn: "For the same distance, climbing more means a steeper hill", ok: true },
      { id: "fast", label: "走得越快，坡度就越快", labelEn: "The faster you walk, the steeper the slope" },
      { id: "cold", label: "外面越冷，坡度就越快", labelEn: "The colder it is, the steeper the slope" },
    ],
    okLine: "对。走同样远的路，升得越多，坡度就越快，山就越陡。",
    noLine: "坡度快不是走得快。是走同样远的路，升得更高，山就更陡。",
  };
}

export function renderHike(app, { goHome, onDone, goZoom, hikeId, firstPlay = false, taskId = null } = {}) {
  if (shouldShowHikePicker({ hikeId, firstPlay })) {
    return renderHikePicker(app, {
      goHome,
      onPick: (hike) => renderHike(app, { goHome, onDone, goZoom, hikeId: hike.id, taskId }),
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
  const trailNote = hikeTrailNote(hike);
  s.append(topbar({
    title: { zh: hike.name, en: hike.nameEn || hike.name },
    sub: trailNote,
    onBack: goHome,
    extra: switchRouteButton({ zh: "换一座山", en: "Switch mountain" }, () => renderHike(app, { goHome, onDone, goZoom })),
  }));
  const board = hud([
    { label: "走了多远", labelEn: "How far", value: "0 公里", tone: "cyan" },
    { label: "现在海拔", labelEn: "Altitude now", value: Math.round(pts[0].elevM) + " 米", tone: "" },
    { label: "坡度", labelEn: "Slope", value: "平", tone: "mint" },
    { label: "外面气温", labelEn: "Outside temp", value: formatTemp(hikeTempC(pts[0].elevM)), tone: "coral" },
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
  const hint = playHint({ zh: "小人会自己往前走。你也可以用手拉他。", en: "The little walker will move on his own. You can also drag him." });
  s.append(hint);
  const draw = (now) => {
    if (!running) return;
    if (!lastTs) lastTs = now || performance.now();
    const ts = now || performance.now();
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    if (asked || celebrated) hint.dismiss();
    if (celebrated) {
      t = hikePinnedT(hike, t, { celebrated: true });
    } else if (!dragging && !asked && t < 1) {
      t = autoHikeProgress(t, dt, { dragging, asked, celebrated, hike });
    }
    const hereNow = at(t);
    // Celebrate arrival before any quiz, so the peak question cannot steal the summit.
    if (!celebrated && !dragging) maybeCelebrate(hereNow);
    if (!dragging && !asked && !celebrated) maybeAsk();
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
    const lab = hikePeakLabelPos(px, py, w, fig, { x: hx, y: hy - fig.lift }, { switchBox: hikeSwitchBtnBox(w), titleBox: hikeTitleChipBox(w) });
    ctx.fillStyle = "#0b1520";
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = lab.align;
    const peakText = hike && hike.officialSummit === false
      ? "今天走到约 " + Math.round(officialPeak) + " 米"
      : "最高 " + Math.round(officialPeak) + " 米";
    ctx.fillText(peakText, lab.x, lab.y);

    const reading = hikeHudReading(here, hike);
    const hideElev = asked && (quizKind === "mid" || quizKind === "slope");
    const hideTemp = asked && (quizKind === "temp" || quizKind === "mid");
    const hideSlope = asked && quizKind === "slope";
    board.update([
      hikeDistLabel(here.dist, hike).zh,
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
    const desired = clamp((pt.x - L.L) / span, 0, 1);
    const peakT = totalKm ? (peak.distKm / totalKm) : 1;
    const beats = hikeQuizBeats({ hike, level, askedKinds, taskId, celebrated, peakT, askedSession: { has: (k) => store.hasAsked(k) } });
    const held = clampSeekToBeats(desired, beats);
    t = held.pos;
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
    if (level <= 1 && !askedKinds.has("peakHint") && hikeWhichAskReady(here, hike) && !hikeAtOfficialSummit(here, hike)) {
      askedKinds.add("peakHint");
      talk("最高的地方在曲线最高的那个点。小人会自己走到那儿。你也可以用手拉他。");
    }
    if (level === 2 && t > 0.45 && !askedKinds.has("mid") && !store.hasAsked("hike:mid")) askMid();
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
    const copy0 = hikeCelebrateCopy(hike, officialPeak);
    const banner = el("div", { class: "summit-banner" },
      bi(copy0.bannerZh, copy0.bannerEn),
      el("small", {}, bi(copy0.smallZh, copy0.smallEn)),
    );
    s.append(banner);
    setTimeout(() => banner.remove(), 4000);
    store.recordJourneyComplete("hike");
    const copy = hikeCelebrateCopy(hike, officialPeak);
    const line = copy.talkZh;
    talk(copy.talkZh, copy.talkEn);
    const cont = () => offerContinue(s, {
      title: copy.title,
      body: copy.body,
      tone: "ok",
      goHome,
      actions: [
        { label: "再爬一座", labelEn: "Climb another", kind: "ok", onClick: () => renderHike(app, { goHome, onDone, goZoom, taskId }) },
        { label: "再走一次", labelEn: "Walk it again", onClick: () => renderHike(app, { goHome, onDone, goZoom, hikeId: hike.id }) },
        { label: "去尺度之旅", labelEn: "Go to the scale journey", onClick: () => goToScaleJourney({ goZoom, onDone, goHome }) },
      ],
    });
    afterReveal("hike", cont, hikeRevealOpts(hike, { force: true }));
  }

  function resumeTrail() {
    if (!running || celebrated) return;
    asked = false;
    quizKind = null;
    s.querySelectorAll(".prompt").forEach((n) => n.remove());
  }

  function offerMidTrailContinue({ title, body, tone }) {
    offerContinue(s, {
      title,
      body,
      tone,
      goHome,
      actions: [
        { label: "继续走到山顶", labelEn: "Keep walking to the top", kind: "ok", onClick: () => resumeTrail() },
        { label: "再爬一座", labelEn: "Climb another", onClick: () => renderHike(app, { goHome, onDone, goZoom, taskId }) },
      ],
    });
    setTimeout(() => {
      if (!running || celebrated || !asked) return;
      resumeTrail();
    }, HIKE_MID_QUIZ_RESUME_MS);
  }

  function askPeak() {
    asked = true;
    quizKind = "peak";
    askedKinds.add("peak");
    const box = promptBox(
      { zh: "最高的地方在哪儿？", en: "Where is the highest place?" },
      { zh: "把小人走到山顶。还没到的话，就再说一声。", en: "Walk the little person to the top. If you are not there yet, say so." },
      [
      { label: "我走到山顶了", labelEn: "I reached the top", id: "done", icon: "⛰️" },
      { label: "还在走", labelEn: "Still walking", id: "retry", icon: "🔄" },
    ], (c) => {
      if (c.id === "retry") {
        box.remove();
        asked = false;
        quizKind = null;
        askedKinds.add("peak");
        talk("继续走，找到曲线最高的那个点。");
        return;
      }
      const here = at(t);
      if (!atSummit(here)) {
        box.remove();
        asked = false;
        quizKind = null;
        askedKinds.add("peak");
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
    const mid = at(t);
    const box = promptBox(
      { zh: "走到一半，大约有多高？", en: "About how high are we at the halfway point?" },
      { zh: "先猜，不要看角落里的数。", en: "Guess first. Don't look at the number in the corner." },
      shuffle(hikeMidHeightChoices(mid, hike)), (c) => {
      store.recordAnswer("hike", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = "走到一半，高度大约 " + Math.round(mid.elev) + " 米，外面大约 " + formatTemp(mid.temp) + "。";
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        asked = true;
        offerMidTrailContinue({
          title: c.ok ? "对了" : "是 " + Math.round(mid.elev) + " 米",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
        });
      }, 1400);
    });
    s.append(box);
    talk({ zh: "走到一半，现在大约有多高？先猜。", en: "About how high are we at the halfway point? Guess first." });
  }

  function askTemp() {
    asked = true;
    quizKind = "temp";
    askedKinds.add("temp");
    store.rememberAsked("hike:temp");
    const box = promptBox(
      { zh: "爬得越高，气温会怎样？", en: "As we climb higher, what happens to the temperature?" },
      { zh: "先想一想，不要看角落里的温度。", en: "Think first. Don't look at the temperature in the corner." },
      [
      { label: "更冷", labelEn: "It gets colder", ok: true },
      { label: "更暖", labelEn: "It gets warmer" },
    ], (c) => {
      store.recordAnswer("hike", !!c.ok);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? "对。每升高 100 米，大约凉 0.65 度。" : "其实会更冷。每升高 100 米，大约凉 0.65 度。";
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        offerMidTrailContinue({
          title: c.ok ? "对了" : "会更冷",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
        });
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
      labelEn: (h.nameEn || "").replace(" (sample)", "") || undefined,
      ok: h.id === hike.id,
    }));
    const box = promptBox(
      { zh: "只看这座山的形状，它是哪一座？", en: "Just from this mountain's shape, which one is it?" },
      { zh: "看高度和长度。还没到山顶，答完还可以继续走。", en: "Look at the height and the length. You can keep walking after you answer." },
      options, (c) => {
      store.recordAnswer("hike", !!c.ok);
      box.remove();
      const shortName = hike.name.replace("（示例）", "");
      const line = c.ok ? "对，这是" + shortName + "。" : "这是" + shortName + "，最高 " + Math.round(officialPeak) + " 米。";
      talk(line);
      const hereNow = at(t);
      // Identifying the mountain must never complete the hike mid-climb.
      if (hikeAfterQuizAction({ atSummit: atSummit(hereNow) }) === "celebrate") {
        afterReveal("hike", () => celebrateSummit(), hikeRevealOpts(hike));
        return;
      }
      offerMidTrailContinue({
        title: c.ok ? "对了，这是" + shortName : "这是" + shortName,
        body: line + "还可以继续走到山顶。",
        tone: c.ok ? "ok" : "no",
      });
    });
    s.append(box);
  }

  function askSlope() {
    asked = true;
    quizKind = "slope";
    askedKinds.add("slope");
    store.rememberAsked("hike:slope");
    const q = slopeRateQuestion();
    const box = promptBox({ zh: q.title, en: q.titleEn }, { zh: q.body, en: q.bodyEn }, q.choices, (c) => {
      store.recordAnswer("hike", !!c.ok);
      store.completeTodayTask("t30");
      if (taskId) store.completeTodayTask(taskId);
      markAnswer(box, c, !!c.ok);
      const line = c.ok ? q.okLine : q.noLine;
      talk(line);
      setTimeout(() => {
        box.remove();
        quizKind = null;
        offerMidTrailContinue({
          title: c.ok ? "对了" : "再看一眼",
          body: line + "还可以继续走到山顶。",
          tone: c.ok ? "ok" : "no",
        });
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
  // Leave a clear gap for 「换一座山」 and for 「最高 N 米」.
  const maxW = Math.max(0, Math.min(560, w - 18 - 72 - 12 - 170));
  const top = 14, height = 88;
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
  const title = chrome.titleBox;
  const hitsBox = (lab, box) => box && !(lab.right < box.left - 6 || lab.left > box.right + 6 || lab.bottom < box.top - 6 || lab.top > box.bottom + 6);
  const hitsChrome = (lab) => hitsBox(lab, sw) || hitsBox(lab, title);
  const belowTitle = title ? (title.bottom + 18) : 96;
  for (const lab of candidates) {
    if (onCanvas(lab) && !overlaps(lab) && !hitsChrome(lab) && lab.top >= belowTitle) return lab;
  }
  for (const lab of candidates) {
    if (onCanvas(lab) && !overlaps(lab) && !hitsChrome(lab)) return lab;
  }
  // Prefer below the title chip, left of a right-hand peak, so 「最高 N 米」 cannot sit under "GPS track".
  const safeY = Math.max(py - 8, belowTitle + 16);
  const leftSafe = pack("right", Math.max(16 + textW, Math.min(px, wx - r) - pad), safeY);
  if (hitsChrome(leftSafe)) {
    leftSafe.y = belowTitle + 16;
    leftSafe.top = leftSafe.y - textH;
    leftSafe.bottom = leftSafe.y;
  }
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
