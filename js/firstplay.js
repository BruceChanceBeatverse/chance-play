import { store } from "./store.js";
import { talk, unlockAudio, sfx } from "./audio.js";
import { el, screen, fitCanvas } from "./ui.js";
import { renderFlight } from "./modes/flight.js";
import { renderRace } from "./modes/race.js";
import { renderHike } from "./modes/hike.js";
import { renderZoom } from "./modes/zoom.js";
import { airportByCode, routeDistanceKm } from "./data.js";
import { thumbViewForRoute } from "./pickers.js";
import { greatCirclePoints, lonLatToXY } from "./geo.js";
import { fillSky, drawWater, drawLand, drawRoute, drawCityGlow, drawPlane, drawSoftClouds, paintRouteThumb, drawMountainPair } from "./art.js";

export function renderWelcome(app, go) {
  const s = screen();
  const canvas = el("canvas", { class: "fill welcome-map", "aria-hidden": "true" });
  const ui = el("div", { class: "welcome" },
    el("div", { class: "welcome-copy" },
      el("div", { class: "welcome-title" }, "Chance，还记得我们飞去东京吗？"),
      el("div", { class: "welcome-sub" }, "上海浦东 → 东京羽田  ·  约 1,740 公里"),
    ),
    el("button", {
      class: "plane-start",
      "aria-label": "开始",
      onClick: () => {
        unlockAudio();
        sfx.whoosh();
        go("firstplay");
      },
    }, "✈️"),
    el("div", { class: "hint" }, "点飞机，开始"),
  );
  s.append(canvas, ui);
  let running = true, raf = 0, t0 = performance.now();
  const from = airportByCode("PVG"), to = airportByCode("HND");
  const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 80);
  const view0 = { lon0: 110, lon1: 150, lat0: 20, lat1: 46 };
  const tick = (now) => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const t = (now - t0) / 1000;
    drawWater(ctx, w, h, view0);
    drawLand(ctx, w, h, view0);
    drawSoftClouds(ctx, w, h, t);
    const xy = pts.map((p) => lonLatToXY(p.lon, p.lat, w, h, view0));
    drawRoute(ctx, xy, 0.42);
    const a = xy[0], b = xy[xy.length - 1];
    // Labels sit under the cities so they cannot crush the gold route line at the top.
    drawCityGlow(ctx, a.x, a.y, "上海", { labelY: 24 });
    drawCityGlow(ctx, b.x, b.y, "东京", { labelY: 24 });
    const prog = (t * 0.06) % 2;
    const u = prog <= 1 ? prog : 2 - prog;
    const i = Math.max(0, Math.min(xy.length - 2, Math.floor(u * (xy.length - 1))));
    const here = xy[i], nxt = xy[Math.min(xy.length - 1, i + 1)];
    const ang = Math.atan2(nxt.y - here.y, nxt.x - here.x);
    drawPlane(ctx, here.x, here.y, ang, 1.6);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  app.replaceChildren(s);
}

export function renderFirstPlay(app, go) {
  // 0–10s dad voice, 10–60s his flight, 1–2 min first question he can get right,
  // 2–4 min big picture, 4–5 min he chooses the next stop.
  renderFlight(app, {
    firstPlay: true,
    tripId: "pvg-hnd",
    goHome: () => go("home"),
    onDone: () => chooseNext(app, go),
  });
}

function chooseNext(app, go) {
  const s = screen();
  s.classList.add("welcome");
  const canvas = el("canvas", { class: "fill", "aria-hidden": "true" });
  const parisBtn = choiceTile("去巴黎", "ok", (ctx, w, h) => {
    paintRouteThumb(ctx, w, h, "PVG", "CDG", thumbViewForRoute(airportByCode("PVG"), airportByCode("CDG")));
  }, () => { unlockAudio(); goFlightParis(app, go); });
  const hikeBtn = choiceTile("爬山", "", (ctx, w, h) => {
    fillSky(ctx, w, h, { top: "#7eb6e0", mid: "#b8d4c8", bot: "#163328" });
    drawMountainPair(ctx, w * 0.5, h * 0.85, h * 0.7, { snow: true, color: "#2a6a55" });
  }, () => {
    unlockAudio();
    // First-play: go straight into a default sample hike, like 去巴黎 / 速度大比拼.
    // Later/home entry still opens the mountain picker.
    renderHike(app, { goHome: () => go("home"), onDone: () => wrap(app, go), hikeId: "sheshan", firstPlay: true });
  });
  const raceBtn = choiceTile("速度大比拼", "", (ctx, w, h) => {
    fillSky(ctx, w, h, { top: "#143a5c", mid: "#0b1a28", bot: "#071018" });
    ctx.strokeStyle = "rgba(92,225,230,0.35)";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(12, h * 0.38); ctx.lineTo(w - 12, h * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, h * 0.68); ctx.lineTo(w - 12, h * 0.68); ctx.stroke();
    ctx.font = "28px -apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚲", w * 0.35, h * 0.38);
    ctx.fillText("🚗", w * 0.62, h * 0.68);
  }, () => { unlockAudio(); renderRace(app, { goHome: () => go("home"), onDone: () => wrap(app, go), trackId: "tokyo" }); });

  const journeyBtn = choiceTile("尺度之旅", "ok", (ctx, w, h) => {
    fillSky(ctx, w, h, { top: "#071018", mid: "#143a5c", bot: "#0b1520" });
    ctx.fillStyle = "#f5c84c";
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.52, Math.min(w, h) * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#071018";
    ctx.font = "28px -apple-system";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔎", w * 0.5, h * 0.52);
  }, () => { unlockAudio(); renderZoom(app, { goHome: () => go("home"), onDone: () => wrap(app, go) }); });

  const ui = el("div", { class: "welcome choose-next-ui" },
    el("h2", { class: "welcome-title" }, "下一站，你来选"),
    el("div", { class: "choices choose-next-row" }, parisBtn, hikeBtn, raceBtn, journeyBtn),
  );
  s.append(canvas, ui);
  let running = true, raf = 0, t0 = performance.now();
  const from = airportByCode("PVG"), to = airportByCode("HND");
  const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 80);
  const view0 = { lon0: 110, lon1: 150, lat0: 20, lat1: 46 };
  const tick = (now) => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const t = (now - t0) / 1000;
    drawWater(ctx, w, h, view0);
    drawLand(ctx, w, h, view0);
    drawSoftClouds(ctx, w, h, t);
    const xy = pts.map((p) => lonLatToXY(p.lon, p.lat, w, h, view0));
    drawRoute(ctx, xy, 1);
    const a = xy[0], b = xy[xy.length - 1];
    // Dots only — writing 上海/东京 here sat on the 爬山 tile in portrait.
    drawCityGlow(ctx, a.x, a.y, "");
    drawCityGlow(ctx, b.x, b.y, "");
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  app.replaceChildren(s);
  talk("下一站你来选。去巴黎的航线，爬过的山，还是速度大比拼？");
}

function choiceTile(label, kind, paint, onClick) {
  const cv = el("canvas", { "aria-hidden": "true" });
  const btn = el("button", { class: "choice-tile" + (kind ? " " + kind : ""), onClick },
    cv,
    el("div", { class: "tile-label" }, label),
  );
  const draw = () => {
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, r.width || 216);
    const h = Math.max(1, r.height || 110);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx, w, h);
  };
  requestAnimationFrame(draw);
  return btn;
}

function goFlightParis(app, go) {
  renderFlight(app, { tripId: "pvg-cdg", goHome: () => go("home"), onDone: () => wrap(app, go) });
}

function wrap(app, go) {
  store.patch({ firstPlayDone: true, tomorrowQuestionId: "q1", lastTomorrowAt: store.todayKey(), endedToday: false });
  const s = screen();
  const q = "还可以继续。去走一趟从很小到宇宙的尺度之旅？也可以先想：骑自行车去东京要几天？";
  s.append(el("div", { class: "end-card" },
    el("h2", { text: "还可以继续" }),
    el("p", { text: "尺度之旅可以从很小一直走到宇宙，路上会经过你的飞机和山。" }),
    el("p", { style: { color: "var(--muted)", fontSize: "18px" }, text: "想一想也可以：骑自行车去东京要几天？" }),
    el("button", { class: "choice ok", style: { marginTop: "18px" }, onClick: () => {
      unlockAudio();
      renderZoom(app, { goHome: () => go("home") });
    } }, "去尺度之旅"),
    el("button", { class: "choice", style: { marginTop: "8px" }, onClick: () => go("home") }, "回主页"),
  ));
  app.replaceChildren(s);
  talk(q);
  return true; // truthy sentinel so onDone?.() || goHome?.() does not wipe this screen
}
