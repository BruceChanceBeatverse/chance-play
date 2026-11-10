/**
 * Child-facing trip and hike pickers.
 * After first-play, 我的飞行地图 and 爬山剖面 must let the child open
 * Tokyo, Paris, parent-added trips, sample mountains, and imported GPX.
 * No new cities are invented here — only trips and hikes already in the store.
 */
import { store } from "./store.js";
import { talk, unlockAudio, sfx } from "./audio.js";
import { el, screen, topbar } from "./ui.js";
import { airportByCode, routeDistanceKm } from "./data.js";
import { formatKm } from "./geo.js";
import { paintRouteThumb, fillSky, drawMountainPair } from "./art.js";

export function playableTrips() {
  return (store.get().trips || []).filter((t) => airportByCode(t.from) && airportByCode(t.to));
}

export function resolveTrip(tripId) {
  const trips = playableTrips();
  if (tripId) {
    const hit = trips.find((t) => t.id === tripId);
    if (hit) return hit;
  }
  return null;
}

export function shouldShowFlightPicker({ tripId, firstPlay } = {}) {
  return !firstPlay && !tripId;
}

export function playableHikes() {
  return (store.get().hikes || []).filter((h) => Array.isArray(h.points) && h.points.length >= 2);
}

export function resolveHike(hikeId) {
  const hikes = playableHikes();
  if (hikeId) {
    const hit = hikes.find((h) => h.id === hikeId);
    if (hit) return hit;
  }
  return null;
}

/** Default first-play hike: Shanghai 佘山, still clearly a sample profile. */
export const FIRST_PLAY_HIKE_ID = "sheshan";

export function shouldShowHikePicker({ hikeId, firstPlay } = {}) {
  return !firstPlay && !hikeId;
}

export function childAirportLabel(airport) {
  if (!airport) return "";
  const name = String(airport.name || "").trim();
  const city = String(airport.city || "").trim();
  // Use the airport name when it is more specific than the city
  // (东京羽田 vs 东京, 东京成田 vs 东京) so two airports in the same
  // city never share a picker title.
  if (name && city && name !== city) return name;
  return name || city;
}

export function childTripTitle(trip) {
  const to = airportByCode(trip?.to);
  const dest = childAirportLabel(to) || trip?.to || "";
  return dest ? "去" + dest : "去";
}

export function childHikeTitle(hike) {
  return String(hike.name || "").replace("（示例）", "");
}

export function thumbViewForRoute(from, to) {
  let lon0 = Math.min(from.lon, to.lon);
  let lon1 = Math.max(from.lon, to.lon);
  let lat0 = Math.min(from.lat, to.lat);
  let lat1 = Math.max(from.lat, to.lat);
  const padLon = Math.max(24, (lon1 - lon0) * 0.4);
  const padLat = Math.max(12, (lat1 - lat0) * 0.55);
  return { lon0: lon0 - padLon, lon1: lon1 + padLon, lat0: lat0 - padLat, lat1: lat1 + padLat };
}

export function flightAssumptionCopy(kmText) {
  return {
    sub: (kmText ? kmText + " · " : "") + "巡航 850 公里/小时（假设）",
    remainLabel: "还要多久",
    altLabel: "高度（假设）",
    note: "时间和高度按巡航 850 公里/小时、大约 11 公里来算，都是假设值。",
  };
}

export function illustratedTile(label, sub, kind, paint, onClick) {
  const cv = el("canvas", { "aria-hidden": "true" });
  const btn = el("button", {
    class: "choice-tile" + (kind ? " " + kind : ""),
    "aria-label": label,
    onClick: () => { unlockAudio(); sfx.tap(); onClick(); },
  },
    cv,
    el("div", { class: "tile-label" }, label),
    sub ? el("div", { class: "tile-sub" }, sub) : null,
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

export function renderTripPicker(app, { goHome, onPick } = {}) {
  const trips = playableTrips();
  const s = screen();
  s.classList.add("picker-screen");
  s.append(topbar({
    title: "选一趟飞行",
    sub: "去东京羽田、去巴黎，或爸爸加上的旅行",
    onBack: goHome,
  }));
  const row = el("div", { class: "choices choose-next-row picker-row" });
  for (const t of trips) {
    const from = airportByCode(t.from);
    const to = airportByCode(t.to);
    const km = routeDistanceKm(t.from, t.to);
    const view = thumbViewForRoute(from, to);
    row.append(illustratedTile(
      childTripTitle(t),
      km ? "约 " + formatKm(km) : "",
      t.featured ? "ok" : "",
      (ctx, w, h) => paintRouteThumb(ctx, w, h, t.from, t.to, view),
      () => onPick?.(t),
    ));
  }
  s.append(el("div", { class: "picker-ui" },
    el("p", { class: "picker-lead" }, "点一张图，就开始飞。"),
    row,
  ));
  app.replaceChildren(s);
  talk("选一趟飞行。去东京羽田，去巴黎，或者爸爸加上的旅行。");
  return s;
}

export function renderHikePicker(app, { goHome, onPick } = {}) {
  const hikes = playableHikes();
  const s = screen();
  s.classList.add("picker-screen");
  s.append(topbar({
    title: "选一座山",
    sub: "示例山，或导入的足迹",
    onBack: goHome,
  }));
  const row = el("div", { class: "choices choose-next-row picker-row" });
  for (const h of hikes) {
    const tag = h.sample ? "示例剖面" : "你的轨迹";
    const peak = Number.isFinite(h.peakM) ? "最高约 " + Math.round(h.peakM) + " 米" : "";
    row.append(illustratedTile(
      childHikeTitle(h),
      [tag, peak].filter(Boolean).join(" · "),
      h.sample ? "" : "ok",
      (ctx, w, hgt) => {
        fillSky(ctx, w, hgt, { top: "#7eb6e0", mid: "#b8d4c8", bot: "#163328" });
        const snow = (h.peakM || 0) > 1000;
        drawMountainPair(ctx, w * 0.5, hgt * 0.92, hgt * 0.78, { snow, color: h.color || "#2a6a55" });
      },
      () => onPick?.(h),
    ));
  }
  s.append(el("div", { class: "picker-ui" },
    el("p", { class: "picker-lead" }, "点一座山，把小人拖上去。示例山会标明不是你的足迹。"),
    row,
  ));
  app.replaceChildren(s);
  talk("选一座山。有示例，也有爸爸导进来的小路。");
  return s;
}

export function switchRouteButton(label, onClick) {
  return el("button", {
    class: "icon-btn pick-btn",
    title: label,
    "aria-label": label,
    onClick: () => { sfx.tap(); onClick(); },
  }, label);
}
