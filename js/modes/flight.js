import { store } from "../store.js";
import { talk } from "../audio.js";
import { el, screen, topbar, hud, promptBox, fitCanvas, bindDrag, afterReveal, toast, offerContinue, playHint, isRevealOpen, goToScaleJourney } from "../ui.js";
import {
  airportByCode, routeDistanceKm,
} from "../data.js";
import {
  greatCirclePoints, flightAltitudeKm, isaTempC, formatKm, formatKmEn, formatHours, formatHoursEn, formatHoursPair, formatTemp,
  lonLatToXY, clamp, lerp, smoothstep, interpolateGreatCircle,
} from "../geo.js";
import { drawWater, drawLand, drawGrid, drawCityGlow, drawRoute, drawPlane, drawSoftClouds, drawGlobe, drawMoon, drawSeaCloseup, drawEiffelTower } from "../art.js";
import { shouldShowFlightPicker, resolveTrip, renderTripPicker, switchRouteButton, flightAssumptionCopy } from "../pickers.js";
import { clampSeekToBeats, bi, UI } from "../i18n.js";

const CRUISE_KMH = 850; // ASSUMPTION: typical jet cruise, same as the plane racer.

/** Paris arrivals (and the last stretch toward CDG) should show the Eiffel Tower. */
export function flightShowsEiffel(to) {
  if (!to) return false;
  const city = String(to.city || to.name || "");
  const code = String(to.icao || to.code || to.id || "").toUpperCase();
  return city.includes("巴黎") || /paris/i.test(String(to.cityEn || to.nameEn || "")) || code === "LFPG" || code === "CDG";
}

export function flightArrivalCopy(city, km) {
  const isParis = city === "巴黎" || /paris/i.test(String(city));
  const isTokyo = city === "东京" || /tokyo/i.test(String(city));
  const title = isParis ? UI.arrivedParis : (isTokyo ? UI.arrivedTokyo : { zh: "到" + city + "了", en: "We've arrived in " + city });
  const kmZh = formatKm(km);
  const kmEn = formatKmEn(km);
  return {
    title,
    firstBody: { zh: "这趟一共 " + kmZh + "。下一站，你来选。", en: "This flight was " + kmEn + " in all. You pick the next stop." },
    body: isParis
      ? { zh: "这趟一共 " + kmZh + "。你去过巴黎，今年也去了米兰。还可以再飞一次，去看米兰大教堂，或换一趟。", en: "This flight was " + kmEn + " in all. You have been to Paris, and you went to Milan this year. You can fly again, go see the Milan Duomo, or pick another flight." }
      : { zh: "这趟一共 " + kmZh + "。还可以再飞一次，或换一趟。", en: "This flight was " + kmEn + " in all. You can fly again, or pick another flight." },
    talkZh: "到" + city + "了！一共 " + kmZh + "。",
    talkEn: "We've arrived in " + (isParis ? "Paris" : isTokyo ? "Tokyo" : city) + "! " + kmEn + " in all.",
    isParis,
  };
}

export function flightArrivalActions(city, { app, goHome, onDone, goZoom, tripId } = {}) {
  const isParis = city === "巴黎" || /paris/i.test(String(city));
  const actions = [
    { label: UI.flyAgain.zh, labelEn: UI.flyAgain.en, kind: "ok", onClick: () => renderFlight(app, { goHome, onDone, goZoom, tripId, firstPlay: false }) },
    { label: isParis ? "去东京" : "去巴黎", labelEn: isParis ? "Fly to Tokyo" : "Fly to Paris", onClick: () => renderFlight(app, { goHome, onDone, goZoom, tripId: isParis ? "pvg-hnd" : "pvg-cdg", firstPlay: false }) },
  ];
  if (isParis) {
    actions.push({ label: UI.seeDuomo.zh, labelEn: UI.seeDuomo.en, onClick: () => goToScaleJourney({ goZoom, onDone, goHome, stopId: "duomo" }) });
  }
  actions.push({ label: UI.goScale.zh, labelEn: UI.goScale.en, onClick: () => goToScaleJourney({ goZoom, onDone, goHome }) });
  return actions;
}

export function flightQuizBeats({ askArmed, asked, arrived }) {
  const beats = [];
  if (askArmed === "half" && !asked) beats.push({ id: "half", at: 0.48, done: false });
  if (askArmed === "temp" && !asked) beats.push({ id: "temp", at: 0.2, done: false });
  if (askArmed === "quarters" && !asked) beats.push({ id: "quarters", at: 0.24, done: false });
  if (!arrived) beats.push({ id: "arrive", at: 0.995, done: false });
  return beats;
}

export function clampFlightSeek(desired, opts) {
  return clampSeekToBeats(desired, flightQuizBeats(opts));
}


/** Watchable play duration for the full route (not real flight time). */
export const FLIGHT_PLAY_SECONDS = 28;

/** Advance the plane when it is not being dragged and no question is holding it. */
export function autoFlightProgress(prev, dtSec, { dragging = false, frozen = false } = {}) {
  if (dragging || frozen) return prev;
  const dt = Math.max(0, Math.min(0.05, dtSec));
  return Math.min(1, prev + dt / FLIGHT_PLAY_SECONDS);
}


function tripOf(id) {
  const trips = store.get().trips;
  return trips.find((t) => t.id === id) || trips[0];
}

function routeView(from, to) {
  const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 64);
  let lon0 = 180, lon1 = -180, lat0 = 90, lat1 = -90;
  // Handle antimeridian simply by not wrapping these two featured routes (both stay east-of-west).
  for (const p of pts) {
    lon0 = Math.min(lon0, p.lon); lon1 = Math.max(lon1, p.lon);
    lat0 = Math.min(lat0, p.lat); lat1 = Math.max(lat1, p.lat);
  }
  const padLon = Math.max(8, (lon1 - lon0) * 0.25);
  const padLat = Math.max(6, (lat1 - lat0) * 0.4);
  lon0 -= padLon; lon1 += padLon; lat0 -= padLat; lat1 += padLat;
  // Keep aspect later in draw.
  return { lon0, lon1, lat0, lat1 };
}

function metrics(progress, km) {
  const flown = km * progress;
  const remainH = ((1 - progress) * km) / CRUISE_KMH;
  const alt = flightAltitudeKm(progress, 11);
  const temp = isaTempC(alt);
  return { flown, remainH, alt, temp };
}

export function renderFlight(app, { goHome, tripId, onDone, goZoom, firstPlay = false } = {}) {
  if (shouldShowFlightPicker({ tripId, firstPlay })) {
    return renderTripPicker(app, {
      goHome,
      onPick: (trip) => renderFlight(app, { goHome, tripId: trip.id, onDone, goZoom, firstPlay: false }),
    });
  }
  const s = screen();
  s.classList.add("mode-flight");
  const trip = resolveTrip(tripId) || tripOf(tripId || "pvg-hnd");
  const from = airportByCode(trip.from);
  const to = airportByCode(trip.to);
  const km = routeDistanceKm(trip.from, trip.to);
  const view0 = routeView(from, to);
  const ptsGC = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 200);

  let progress = 0;
  let dragging = false;
  let frozen = false;
  let arrived = false;
  let askArmed = firstPlay ? "half" : autoAsk(store.level("flight"));
  let asked = false;
  let compare = false;

  const assume = flightAssumptionCopy("约 " + formatKm(km), "About " + formatKmEn(km));
  const canvas = el("canvas", { class: "fill", "aria-label": "飞行地图 / Flight map" });
  const switchBtn = firstPlay ? null : switchRouteButton(UI.switchFlight, () => {
    renderFlight(app, { goHome, onDone, goZoom });
  });
  const bar = topbar({
    title: { zh: trip.label, en: trip.labelEn || trip.label },
    sub: { zh: assume.sub, en: assume.subEn || "cruise 850 km/h (assumed)" },
    onBack: goHome,
    extra: switchBtn,
  });
  const board = hud([
    { label: "已经飞了", labelEn: "Distance flown", value: "0 公里", tone: "cyan" },
    { label: assume.remainLabel, labelEn: assume.remainLabelEn || "Time left", value: formatHours(km / CRUISE_KMH), tone: "" },
    { label: assume.altLabel, labelEn: assume.altLabelEn || "Height (assumed)", value: "0.0 公里", tone: "mint" },
    { label: "外面气温", labelEn: "Outside temp", value: formatTemp(isaTempC(0)), tone: "coral" },
  ]);

  s.append(canvas, bar, board);

  function project(lon, lat, w, h) {
    // Fit view to canvas aspect.
    const view = { ...view0 };
    const vAsp = (view.lon1 - view.lon0) / (view.lat1 - view.lat0);
    const cAsp = w / h;
    if (cAsp > vAsp) {
      const mid = (view.lon0 + view.lon1) / 2;
      const half = ((view.lat1 - view.lat0) * cAsp) / 2;
      view.lon0 = mid - half; view.lon1 = mid + half;
    } else {
      const mid = (view.lat0 + view.lat1) / 2;
      const half = ((view.lon1 - view.lon0) / cAsp) / 2;
      view.lat0 = mid - half; view.lat1 = mid + half;
    }
    return { ...lonLatToXY(lon, lat, w, h, view), view };
  }

  function pathXY(w, h) {
    return ptsGC.map((p) => project(p.lon, p.lat, w, h));
  }

  function nearestProgress(x, y, w, h) {
    const xy = pathXY(w, h);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < xy.length; i++) {
      const d = (xy[i].x - x) ** 2 + (xy[i].y - y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best / (xy.length - 1);
  }

  let raf = 0, running = true, lastTs = 0;
  const hint = playHint({ zh: "飞机会自己飞。你也可以用手拉它。", en: "The plane will fly by itself. You can also drag it." });
  s.append(hint);
  const draw = (now) => {
    if (!running) return;
    if (!lastTs) lastTs = now || performance.now();
    const ts = now || performance.now();
    const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
    lastTs = ts;
    const revealOpen = isRevealOpen();
    const held = frozen || revealOpen;
    if (held) hint.dismiss();
    if (!dragging && !held && progress < 1) {
      progress = autoFlightProgress(progress, dt, { dragging, frozen: held });
      maybeAsk();
    }
    if (!arrived && progress >= 0.995 && !revealOpen) maybeArrive();
    const { ctx, w, h } = fitCanvas(canvas);
    const { view } = project(from.lon, from.lat, w, h);
    drawWater(ctx, w, h, view);
    drawLand(ctx, w, h, view);
    drawGrid(ctx, w, h, view);
    drawSoftClouds(ctx, w, h, progress * 40);

    const xy = pathXY(w, h);
    drawRoute(ctx, xy, progress);
    const start = xy[0], end = xy[xy.length - 1];
    if (start && Number.isFinite(start.x) && Number.isFinite(start.y)) drawCityGlow(ctx, start.x, start.y, from.city);
    if (end && Number.isFinite(end.x) && Number.isFinite(end.y)) {
      drawCityGlow(ctx, end.x, end.y, to.city);
      if (flightShowsEiffel(to)) {
        const arrivedHere = arrived || progress >= 0.995;
        const hgt = arrivedHere ? 90 : 52;
        drawEiffelTower(ctx, end.x, end.y - 8, hgt);
      }
    }

    const p = interpolateGreatCircle(from.lat, from.lon, to.lat, to.lon, progress);
    const here = project(p.lon, p.lat, w, h);
    const ahead = interpolateGreatCircle(from.lat, from.lon, to.lat, to.lon, Math.min(1, progress + 0.01));
    const ah = project(ahead.lon, ahead.lat, w, h);
    const ang = Math.atan2(ah.y - here.y, ah.x - here.x);
    drawPlane(ctx, here.x, here.y, ang, 1.45);

    const m = metrics(progress, km);
    const qOpen = asked && !!s.querySelector(".prompt:not(.continue-box)");
    const maskRemain = qOpen && (askArmed === "half" || askArmed === "quarters");
    const maskTemp = qOpen && askArmed === "temp";
    board.update([
      formatKm(m.flown),
      flightRemainHudValue(m.remainH, { mask: maskRemain }),
      m.alt.toFixed(1) + " 公里",
      maskTemp ? "？" : formatTemp(m.temp),
    ]);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  const onR = () => {};
  window.addEventListener("resize", onR);

  const unbind = bindDrag(canvas, {
    down(pt) {
      hint.dismiss();
      // A world card or mid-flight question must not move the plane.
      if (!flightPointerShouldSeek({ frozen, revealOpen: isRevealOpen(), arrived })) return;
      dragging = true;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      progress = clampFlightSeek(nearestProgress(pt.x, pt.y, w, h), { askArmed, asked, arrived }).pos;
    },
    move(pt) {
      if (!dragging || !flightPointerShouldSeek({ frozen, revealOpen: isRevealOpen(), arrived })) return;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      progress = clampFlightSeek(nearestProgress(pt.x, pt.y, w, h), { askArmed, asked, arrived }).pos;
      maybeAsk();
    },
    up() { dragging = false; if (flightPointerShouldSeek({ frozen, revealOpen: isRevealOpen(), arrived })) maybeAsk(); },
  });

  function resumeFlight() {
    // Stay on this route until the plane actually arrives.
    frozen = false;
    s.querySelectorAll(".continue-box").forEach((n) => n.remove());
  }

  function maybeArrive() {
    if (arrived) return;
    if (s.querySelector(".prompt:not(.continue-box)") || document.querySelector(".reveal")) return;
    if (progress < 0.995) return;
    arrived = true;
    frozen = true;
    progress = 1;
    const city = to.city || "目的地";
    const arrival = flightArrivalCopy(city, km);
    talk(arrival.talkZh, arrival.talkEn);
    if (firstPlay) {
      afterReveal("flight", () => offerContinue(s, {
        title: arrival.title,
        body: arrival.firstBody,
        tone: "ok",
        actions: [
          { label: UI.nextStopYouPick.zh, labelEn: UI.nextStopYouPick.en, kind: "ok", onClick: () => onDone?.() },
        ],
      }));
      return;
    }
    afterReveal("flight", () => offerContinue(s, {
      title: arrival.title,
      body: arrival.body,
      tone: "ok",
      goHome,
      actions: flightArrivalActions(city, { app, goHome, onDone, goZoom, tripId }),
    }));
  }

  function afterFlight(host) {
    // After the welcome midpoint (zoom-out + card), keep flying to Tokyo.
    // The chooser waits until the plane has actually arrived.
    resumeFlight();
  }

  function maybeAsk() {

    if (asked || !askArmed) return;
    if (askArmed === "half" && progress >= 0.48) fireHalf();
    if (askArmed === "temp" && progress >= 0.2) fireTemp();
    if (askArmed === "quarters" && progress >= 0.24) fireQuarter();
  }

  function fireHalf() {
    asked = true;
    frozen = true;
    // Use the progress that actually triggered the prompt so the HUD
    // "还要多久" matches the correct button (fires at >= 0.48, not exactly 0.5).
    const remain = metrics(progress, km).remainH;
    const choices = shuffle(halfTimeChoiceList(progress, km));
    const box = promptBox(UI.halfwayQuiz, UI.halfwayQuizBody, choices, (c) => {
      const correct = !!c.ok;
      store.recordAnswer("flight", correct);
      store.addPrediction({ mode: "flight", guessed: c.value, actual: remain, ratio: c.value / remain });
      box.remove();
      talk(correct ? "对了。一半的路，就要一半的时间。" : "看看数字。一半的路，就要一半的时间。现在还要 " + formatHours(remain) + "。");
      if (!firstPlay) toast(correct ? "正好是一半的时间" : "再看一眼：是 " + formatHours(remain));
      if (firstPlay) {
        // Big picture first (plane → sea → Earth → Moon), then a possible world card, then "下一站".
        startZoomOut(s, { from, to, km, goNext: () => afterReveal("flight", () => afterFlight(s)) });
      } else {
        afterReveal("flight", () => resumeFlight());
      }
    });
    s.append(box);
    talk(UI.halfwayQuiz.zh, UI.halfwayQuiz.en);
  }

  function fireTemp() {
    asked = true;
    frozen = true;
    const box = promptBox(
      { zh: "飞得更高，外面会更冷还是更暖？", en: "As we fly higher, will it get colder or warmer outside?" },
      { zh: "先猜。先不要看外面气温。", en: "Guess first. Don't look at the outside temperature yet." },
      [
      { label: "更冷", labelEn: "Colder", ok: true },
      { label: "更暖", labelEn: "Warmer", ok: false },
    ], (c) => {
      store.recordAnswer("flight", !!c.ok);
      box.remove();
      talk(c.ok
        ? "对了。每升高 1 公里，外面大约会凉 6.5 度。"
        : "其实会更冷。每升高 1 公里，外面大约凉 6.5 度。");
      afterReveal("flight", () => resumeFlight());
    });
    s.append(box);
    talk("飞得更高，外面会更冷还是更暖？");
  }

  function fireQuarter() {
    asked = true;
    frozen = true;
    const r = metrics(progress, km).remainH;
    const choices = shuffle(quarterChoiceList(progress, km));
    const box = promptBox(
      { zh: "飞了四分之一，还要多久？", en: "We've flown a quarter of the way. How much longer?" },
      { zh: "已经走了四分之一，剩下四分之三。", en: "A quarter of the way is done, three quarters are left." },
      choices, (c) => {
      store.recordAnswer("flight", !!c.ok);
      store.addPrediction({ mode: "flight", guessed: c.value, actual: r, ratio: c.value / r });
      box.remove();
      talk(c.ok ? "对了。剩下四分之三的路。" : "剩下四分之三，所以时间也大约是全程的四分之三。");
      afterReveal("flight", () => resumeFlight());
    });
    s.append(box);
    talk("飞了四分之一，还要多久？");
  }

  function maybeCompare() {
    const lv = store.level("flight");
    if (lv < 4 || compare) { return; }
    compare = true;
    const tokyo = routeDistanceKm("PVG", "HND");
    const paris = routeDistanceKm("PVG", "CDG");
    const ratio = paris / tokyo;
    const choices = shuffle([
      { label: "大约 5 倍", ok: Math.abs(ratio - 5) < Math.abs(ratio - 2) && Math.abs(ratio - 5) <= Math.abs(ratio - 10), value: 5 },
      { label: "大约 2 倍", ok: false, value: 2 },
      { label: "大约 10 倍", ok: false, value: 10 },
    ]);
    // Mark the closest as ok.
    let best = 0, bestD = Infinity;
    choices.forEach((c, i) => {
      const d = Math.abs(c.value - ratio);
      if (d < bestD) { bestD = d; best = i; }
    });
    choices.forEach((c, i) => { c.ok = i === best; });
    const box = promptBox(
      { zh: "去巴黎比去东京远几倍？", en: "How many times farther is Paris than Tokyo?" },
      { zh: "东京约 " + formatKm(tokyo) + "，巴黎约 " + formatKm(paris) + "。", en: "Tokyo is about " + formatKmEn(tokyo) + ", Paris about " + formatKmEn(paris) + "." },
      choices, (c) => {
      store.recordAnswer("flight", !!c.ok);
      store.addPrediction({ mode: "flight", guessed: c.value, actual: ratio, ratio: c.value / ratio });
      box.remove();
      talk("去巴黎大约是去东京的 " + ratio.toFixed(1) + " 倍。");
      afterReveal("flight", () => resumeFlight());
    });
    s.append(box);
    talk("去巴黎比去东京远几倍？");
  }

  talk(firstPlay
    ? "Chance，还记得我们飞去东京吗？飞机会自己飞。你也可以用手拉它，看四个数字一起变。"
    : "飞机会自己飞去" + to.city + "。你也可以用手拉它，看四个数字一起变。");

  s._cleanup = () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onR);
    unbind();
  };
  app.replaceChildren(s);
  store.markModePlayed("flight");
  return s;
}


/** While a remain-time question is open, keep the 「还要多久」 tile but hide the number. */
export const FLIGHT_REMAIN_MASK = "？";

export function flightRemainHudValue(remainH, { mask } = {}) {
  if (mask) return FLIGHT_REMAIN_MASK;
  if (!Number.isFinite(remainH) || remainH <= 0) return "到了";
  return formatHours(remainH);
}

function autoAsk(level) {
  if (level <= 1) return "temp";
  if (level === 2) return "half";
  if (level === 3) return "quarters";
  return "half";
}

/** Mid-route quizzes must resume the flight, not end it. Arrival only at the destination. */
export function afterQuizFlightAction(progress) {
  return (Number(progress) >= 0.995) ? "arrive" : "resume";
}

/** Welcome midpoint (half-time quiz / card) continues the Tokyo flight; the chooser waits for arrival. */
export function firstPlayAfterMidpointAction() {
  return "resume";
}

/** While a card or question is up, leave the plane where it was. */
export function flightPointerShouldSeek({ frozen = false, revealOpen = false, arrived = false } = {}) {
  return !frozen && !revealOpen && !arrived;
}

/** Dismissing a mid-flight card keeps the same progress; it must not jump to arrival. */
export function flightProgressAfterCard(progressBefore) {
  const p = Number(progressBefore);
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(1, p));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Distinct wrong answers for the L3 "quarter remaining" question.
 *  Previously formatHours(r * 2/3) equalled the half-trip remainder. */
export function quarterChoiceList(progress, km, cruise = CRUISE_KMH) {
  const remain = ((1 - progress) * km) / cruise;
  const full = km / cruise;
  const halfRemain = remain * 0.5;
  return [
    { label: formatHours(remain), labelEn: formatHoursEn(remain), ok: true, value: remain },
    { label: formatHours(full), labelEn: formatHoursEn(full), value: full },
    { label: formatHours(halfRemain), labelEn: formatHoursEn(halfRemain), value: halfRemain },
  ];
}

export function halfTimeChoiceList(progress, km, cruise = CRUISE_KMH) {
  const remain = ((1 - progress) * km) / cruise;
  const full = km / cruise;
  const halfRemain = remain * 0.5;
  return [
    { label: formatHours(remain), labelEn: formatHoursEn(remain), ok: true, value: remain },
    { label: formatHours(full), labelEn: formatHoursEn(full), value: full },
    { label: formatHours(halfRemain), labelEn: formatHoursEn(halfRemain), value: halfRemain },
  ];
}

/** Place Earth and the Moon so both disks, and the 「光要走 1.28 秒」 label,
 *  stay fully on screen in portrait and landscape. CSS pixels. */
export function pullbackLayout(w, h) {
  const portrait = h > w;
  const pad = 28;
  const labelH = 36;
  const textHalf = 90; // 「光要走 1.28 秒」 is ~7 glyphs at 22px
  const maxR = portrait
    ? Math.min((w - pad * 2) * 0.28, h * 0.22)
    : Math.min(w, h) * 0.30;
  const moonR = Math.max(18, maxR * 0.32);
  const gap = portrait ? 22 : Math.max(18, maxR * 0.18);
  const cx = portrait
    ? pad + maxR
    : Math.min(w * 0.40, w - pad - Math.max(moonR, textHalf) - gap - maxR);
  const cy = portrait ? h * 0.50 : h * 0.52;
  const mx = Math.min(
    w - pad - Math.max(moonR, textHalf),
    cx + maxR + gap + moonR,
  );
  const my = Math.max(pad + moonR, Math.min(cy - maxR * 0.22, h - pad - moonR - labelH));
  return { cx, cy, maxR, mx, my, moonR, portrait };
}

/** Short child-facing sea-beat caption. Not a reading wall. */
export const SEA_BEAT_CAPTION = "飞在海上";
export const SEA_BEAT_CAPTION_EN = "Flying over the sea";

export function seaBeatCaptionPos(w, h, horizonY) {
  const hy = Number.isFinite(horizonY) ? horizonY : h * 0.46;
  // Sit clearly in the sky, not on the (larger) plane.
  const y = Math.max(56, hy - 130);
  return { x: w / 2, y, text: SEA_BEAT_CAPTION, textEn: SEA_BEAT_CAPTION_EN };
}

/** First-play big-picture: pull back plane → sea → Earth → Moon. */
function startZoomOut(s, { from, to, km, goNext }) {
  const overlay = el("canvas", { class: "fill", style: { zIndex: 7, pointerEvents: "none" } });
  overlay.dataset.pullback = "1";
  s.append(overlay);
  let t = 0, raf = 0;
  const start = performance.now();
  const route = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 48);
  talk("我们从座位往外看。飞机，海，地球，然后是月亮。");
  const tick = (now) => {
    t = (now - start) / 1000;
    const { ctx, w, h } = fitCanvas(overlay);
    ctx.clearRect(0, 0, w, h);
    // Phase 0–1.8: darken over the sea, plane still visible then shrinks.
    // Phase 1.0–3.2: Earth grows.
    // Phase 3.0–6.0: Moon appears at a clearly smaller scale, fully framed.
    const fade = clamp(t / 0.5, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#02040c");
    sky.addColorStop(1, "#071018");
    ctx.fillStyle = sky;
    ctx.globalAlpha = 0.35 + 0.65 * fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    // stars
    ctx.fillStyle = "#f4efe4";
    for (let i = 0; i < 80; i++) {
      ctx.globalAlpha = 0.15 + (i % 5) * 0.12 * fade;
      ctx.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
    }
    ctx.globalAlpha = 1;

    const lay = pullbackLayout(w, h);
    const { cx, cy, mx, my } = lay;
    const earthT = smoothstep(0, 1, clamp((t - 0.8) / 2.2, 0, 1));
    const R = lerp(36, lay.maxR, earthT);
    const moonR = Math.max(16, R * (lay.moonR / lay.maxR));
    const planeY = cy - 10;
    if (t < 1.9) {
      // Horizon sits under the plane so it reads as flying over the sea, not swimming.
      const hy = Math.min(h * 0.64, planeY + 52);
      drawSeaCloseup(ctx, w, h, { horizonY: hy });
      const cap = seaBeatCaptionPos(w, h, hy);
      ctx.fillStyle = "#f4efe4";
      ctx.font = "800 32px -apple-system, PingFang SC, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cap.text, cap.x, cap.y);
      if (cap.textEn) {
        ctx.font = "700 18px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(244,239,228,0.85)";
        ctx.fillText(cap.textEn, cap.x, cap.y + 26);
      }
    }
    // Earth grows after the sea beat so a still can show the shrinking plane clearly.
    if (t >= 1.6) {
      drawGlobe(ctx, cx, cy, R, { lonC: 130, latC: 28, route });
    }
    if (t < 1.9) {
      // Stay large through the early sea still (~0.8s), then shrink as Earth grows.
      const ps = t < 1.0 ? 2.8 : lerp(2.8, 0.45, clamp((t - 1.0) / 0.8, 0, 1));
      drawPlane(ctx, cx, planeY, -0.3, ps);
    }
    const moonA = smoothstep(0, 1, clamp((t - 3.0) / 1.3, 0, 1));
    if (moonA > 0) {
      ctx.globalAlpha = moonA;
      drawMoon(ctx, mx, my, moonR);
      ctx.globalAlpha = 1;
    }
    if (moonA > 0.6) {
      ctx.fillStyle = "#f5c84c";
      ctx.font = "700 22px -apple-system, PingFang SC, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("光要走 1.28 秒", mx, my + moonR + 28);
    }
    ctx.fillStyle = "#f4efe4";
    ctx.font = "700 26px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    if (t > 1.4) ctx.fillText("这一趟大约 " + formatKm(km), cx, 64);
    if (t < 6.4) raf = requestAnimationFrame(tick);
    else {
      overlay.remove();
      goNext?.();
    }
  };
  raf = requestAnimationFrame(tick);
}

