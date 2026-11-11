/**
 * Child-facing trip and hike pickers.
 * After first-play, 我的飞行地图 and 爬山剖面 let the child open
 * Tokyo (Haneda) and Paris, and the sample mountains.
 * Parent-added trips and imported GPX stay in the parent view only.
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

/** Built-in featured trips only — parent-added routes stay off the child picker. */
export function childPlayableTrips() {
  return playableTrips().filter((t) => t.featured);
}

export function childFlightPickerCopy() {
  return {
    sub: "去东京羽田、去巴黎",
    subEn: "To Tokyo Haneda, to Paris",
    talk: "选一趟飞行。去东京羽田，或去巴黎。",
    talkEn: "Pick a flight. To Tokyo Haneda, or to Paris.",
    lead: "点一张图，就开始飞。",
    leadEn: "Tap a picture, and the plane starts flying.",
  };
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

/** Sample mountains only — imported GPX stays off the child picker. */
export function childPlayableHikes() {
  const list = playableHikes().filter((h) => h.sample !== false && h.child !== false);
  const order = ["fuji", "dolomites"];
  return list.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function childHikePickerCopy() {
  return {
    sub: "富士山、多洛米蒂的一天",
    subEn: "Mount Fuji, a day in the Dolomites",
    talk: "选一座山。有你来过的富士山，还有你能走的那种多洛米蒂的路。",
    talkEn: "Pick a mountain. There is Fuji, which you have been to, and a Dolomites walk of the kind you can do.",
    lead: "点一座山，小人会自己走。示例山路会标明还不是你自己的足迹。",
    leadEn: "Tap a mountain, and the little walker will start moving. Sample paths are labelled as not your own GPS track.",
  };
}

export function resolveHike(hikeId) {
  const hikes = playableHikes();
  if (hikeId) {
    const hit = hikes.find((h) => h.id === hikeId);
    if (hit) return hit;
  }
  return null;
}

/** Default first-play hike: Fuji, which Chance has been to. Path is still schematic. */
export const FIRST_PLAY_HIKE_ID = "fuji";

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
  const zh = String(hike.name || "").replace("（示例）", "");
  const en = String(hike.nameEn || "").replace(" (sample)", "").replace(" (example)", "");
  return en ? { zh, en } : zh;
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

export const PLANE_CRUISE_KMH = 850;

export function flightAssumptionCopy(kmText, kmTextEn) {
  const zhKm = typeof kmText === "object" && kmText ? (kmText.zh || "") : (kmText || "");
  const enKm = typeof kmText === "object" && kmText
    ? (kmText.en || kmTextEn || "")
    : (kmTextEn || "");
  return {
    sub: (zhKm ? zhKm + " · " : "") + "巡航 850 公里/小时（假设）",
    subEn: (enKm ? enKm + " · " : "") + "cruise 850 km/h (assumed)",
    remainLabel: "还要多久",
    remainLabelEn: "Time left",
    altLabel: "高度（假设）",
    altLabelEn: "Height (assumed)",
    note: "时间和高度按巡航 850 公里/小时、大约 11 公里来算，都是假设值。",
    noteEn: "Time and height use a cruise of 850 km/h and about 11 km. Both are assumed figures.",
  };
}

export function illustratedTile(label, sub, kind, paint, onClick) {
  const cv = el("canvas", { "aria-hidden": "true" });
  const aria = (label && typeof label === "object")
    ? [label.zh, label.en || label.labelEn].filter(Boolean).join(" / ")
    : String(label || "");
  const btn = el("button", {
    class: "choice-tile" + (kind ? " " + kind : ""),
    "aria-label": aria,
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
  const trips = childPlayableTrips();
  const copy = childFlightPickerCopy();
  const s = screen();
  s.classList.add("picker-screen");
  s.append(topbar({
    title: "选一趟飞行",
    sub: copy.sub,
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
    el("p", { class: "picker-lead" }, copy.leadEn ? { zh: copy.lead, en: copy.leadEn } : copy.lead),
    row,
  ));
  app.replaceChildren(s);
  talk(copy.talkEn ? { zh: copy.talk, en: copy.talkEn } : copy.talk);
  return s;
}

export function renderHikePicker(app, { goHome, onPick } = {}) {
  const hikes = childPlayableHikes();
  const copy = childHikePickerCopy();
  const s = screen();
  s.classList.add("picker-screen");
  s.append(topbar({
    title: { zh: "选一座山", en: "Pick a mountain" },
    sub: { zh: copy.sub, en: copy.subEn },
    onBack: goHome,
  }));
  const row = el("div", { class: "choices choose-next-row picker-row" });
  for (const h of hikes) {
    const tag = h.sample ? { zh: "示例剖面", en: "A sample path" } : { zh: "你的轨迹", en: "Your own track" };
    const peak = Number.isFinite(h.peakM) ? { zh: "最高约 " + Math.round(h.peakM) + " 米", en: "About " + Math.round(h.peakM) + " m at the top" } : null;
    const sub = peak
      ? { zh: tag.zh + " · " + peak.zh, en: tag.en + " · " + peak.en }
      : tag;
    row.append(illustratedTile(
      childHikeTitle(h),
      sub,
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
    el("p", { class: "picker-lead" }, copy.leadEn ? { zh: copy.lead, en: copy.leadEn } : copy.lead),
    row,
  ));
  app.replaceChildren(s);
  talk(copy.talkEn ? { zh: copy.talk, en: copy.talkEn } : copy.talk);
  return s;
}

export function switchRouteButton(label, onClick) {
  const aria = (label && typeof label === "object")
    ? [label.zh || label.label, label.en || label.labelEn].filter(Boolean).join(" / ")
    : String(label || "");
  return el("button", {
    class: "icon-btn pick-btn",
    title: aria,
    "aria-label": aria,
    onClick: () => { sfx.tap(); onClick(); },
  }, label);
}
