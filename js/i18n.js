/**
 * Chinese and English together on the same control, card, or line.
 * The child default is both languages at once — not a language switch,
 * and not two separate apps. Chinese first, English just under it.
 * Voice also speaks both when settings.bilingual is on (the child default).
 * Fonts stay system/local (PingFang / San Francisco / Noto / YaHei).
 */

export function splitCopy(zhOrPair, en) {
  if (zhOrPair && typeof zhOrPair === "object" && !zhOrPair.nodeType) {
    const zh = zhOrPair.zh != null ? zhOrPair.zh : (zhOrPair.label != null ? zhOrPair.label : (zhOrPair.name || ""));
    const enText = zhOrPair.en != null ? zhOrPair.en : (zhOrPair.labelEn != null ? zhOrPair.labelEn : (zhOrPair.nameEn || en || ""));
    return { zh: zh == null ? "" : String(zh), en: enText == null ? "" : String(enText) };
  }
  return {
    zh: zhOrPair == null ? "" : String(zhOrPair),
    en: en == null ? "" : String(en),
  };
}

export function isCopy(value) {
  return !!(value && typeof value === "object" && !value.nodeType && (value.zh != null || value.en != null || value.nameEn != null || value.labelEn != null));
}

export function pairedText(zhOrPair, en) {
  const { zh, en: e } = splitCopy(zhOrPair, en);
  if (zh && e) return zh + "\n" + e;
  return zh || e;
}

export function pairedAria(zhOrPair, en) {
  const { zh, en: e } = splitCopy(zhOrPair, en);
  if (zh && e) return zh + " / " + e;
  return zh || e;
}

/** Compact stacked Chinese-then-English node. */
export function bi(zhOrPair, en, attrs = {}) {
  const { zh, en: e } = splitCopy(zhOrPair, en);
  const wrap = document.createElement("span");
  wrap.className = "bi" + (attrs.class ? " " + attrs.class : "");
  const z = document.createElement("span");
  z.className = "zh";
  z.lang = "zh-CN";
  z.textContent = zh;
  wrap.append(z);
  if (e) {
    const n = document.createElement("span");
    n.className = "en";
    n.lang = "en";
    n.textContent = e;
    wrap.append(n);
  }
  return wrap;
}

export function fillBi(node, zhOrPair, en) {
  if (!node) return node;
  node.replaceChildren(bi(zhOrPair, en));
  return node;
}

/** Append a bilingual child onto a DOM node (or a plain string if no English). */
export function appendCopy(node, zhOrPair, en) {
  if (!node) return node;
  const { zh, en: e } = splitCopy(zhOrPair, en);
  if (e) node.append(bi({ zh, en: e }));
  else if (zh) node.append(document.createTextNode(zh));
  return node;
}

export const UI = {
  back: { zh: "返回", en: "Back" },
  goHome: { zh: "回主页", en: "Home" },
  goBackPlay: { zh: "回去玩", en: "Go back and play" },
  start: { zh: "开始", en: "Start" },
  pause: { zh: "暂停", en: "Pause" },
  keepGoing: { zh: "继续走", en: "Keep walking" },
  continue: { zh: "继续", en: "Continue" },
  fromStart: { zh: "从头走", en: "Start from the beginning" },
  keepCard: { zh: "收好", en: "Keep it" },
  worldCard: { zh: "一张世界卡", en: "A world card" },
  cardBack: { zh: "背面", en: "The other side" },
  flipHint: { zh: "点卡片翻一面", en: "Tap the card to flip it" },
  lookAgain: { zh: "再看一眼", en: "Look again" },
  ok: { zh: "好", en: "OK" },
  lockedMap: { zh: "这张地图还没打开", en: "This map is not open yet" },
  scaleJourney: { zh: "尺度之旅", en: "Scale journey" },
  goScale: { zh: "去尺度之旅", en: "Go to the scale journey" },
  myCards: { zh: "我的世界卡", en: "My world cards" },
  parentEntry: { zh: "家长入口", en: "Parent entry" },
  hello: { zh: "你好，", en: "Hello, " },
  pickNext: { zh: "下一站，你来选", en: "You pick the next stop" },
  tapPlane: { zh: "点飞机，开始", en: "Tap the plane to start" },
  shrink: { zh: "缩小 −", en: "Zoom in −" },
  grow: { zh: "放大 ＋", en: "Zoom out ＋" },
  switchFlight: { zh: "换一趟", en: "Another flight" },
  switchHike: { zh: "换一座山", en: "Another mountain" },
  climbAgain: { zh: "再爬一座", en: "Climb another" },
  walkAgain: { zh: "再走一次", en: "Walk it again" },
  flyAgain: { zh: "再飞一次", en: "Fly again" },
  times10: { zh: "×10", en: "×10" },
  div10: { zh: "÷10", en: "÷10" },
  lightPost: { zh: "光速快递", en: "Light post" },
  blackHole: { zh: "黑洞调节器", en: "Black-hole dial" },
  seeLight: { zh: "看光要走多久", en: "See how long light takes" },
  compareSpeed: { zh: "比一比速度", en: "Compare speeds" },
  flyTokyo: { zh: "飞去东京", en: "Fly to Tokyo" },
  flyParis: { zh: "飞去巴黎", en: "Fly to Paris" },
  climbThis: { zh: "爬这座山", en: "Climb this mountain" },
  summit: { zh: "到山顶了", en: "You reached the top" },
  footerWalk: { zh: "慢慢玩，走完尺度之旅", en: "Take your time, and walk the scale journey" },
  footerDone: { zh: "尺度之旅你已经走过了。还可以再走，或去看光。", en: "You've already walked the scale journey. You can walk it again, or go see light." },
};

export function levelCopy(n) {
  return { zh: "第 " + n + " 级", en: "Level " + n };
}

export function homeFooterCopy(state) {
  if (state && state.scaleJourneyComplete) return UI.footerDone;
  return UI.footerWalk;
}

/**
 * If the child scrubs past a quiz or card beat, stop on the first
 * unrevealed beat so it is not silently skipped.
 */
export function clampSeekToBeats(pos, beats) {
  const p = Number(pos);
  const list = (Array.isArray(beats) ? beats : [])
    .filter((b) => b && !b.done && Number.isFinite(Number(b.at)))
    .sort((a, b) => Number(a.at) - Number(b.at));
  const hit = list.find((b) => p >= Number(b.at));
  if (!hit) return { pos: p, beat: null };
  return { pos: Number(hit.at), beat: hit };
}

export function lingerShouldAutoPause(stop) {
  return !!(stop && stop.lingerMode);
}

export function lingerButtonCopy(stop) {
  if (!stop || !stop.lingerMode) return { zh: "停一停", en: "Stop here" };
  if (stop.lingerMode === "flight") return stop.id === "paris" ? UI.flyParis : UI.flyTokyo;
  if (stop.lingerMode === "hike") return UI.climbThis;
  if (stop.lingerMode === "race") return UI.compareSpeed;
  if (stop.lingerMode === "cosmos") return UI.seeLight;
  return { zh: "停一停", en: "Stop here" };
}

export const ZOOM_RESUME_KEY = "chance-zoom-resume";

export function serializeZoomResume(snap) {
  if (!snap || !Number.isFinite(Number(snap.logS))) return null;
  return {
    logS: Number(snap.logS),
    target: Number.isFinite(Number(snap.target)) ? Number(snap.target) : Number(snap.logS),
    cruiseDir: snap.cruiseDir === -1 ? -1 : 1,
    cruiseGoal: Number.isFinite(Number(snap.cruiseGoal)) ? Number(snap.cruiseGoal) : null,
    auto: snap.auto !== false,
    visited: Array.isArray(snap.visited) ? snap.visited.slice() : [...(snap.visited || [])],
    lastDwellId: snap.lastDwellId || "",
    lastSpokenId: snap.lastSpokenId || "",
  };
}

export function saveZoomResume(snap, storage) {
  const row = serializeZoomResume(snap);
  if (!row) return false;
  try {
    const bag = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (!bag) return false;
    bag.setItem(ZOOM_RESUME_KEY, JSON.stringify(row));
    return true;
  } catch {
    return false;
  }
}

export function loadZoomResume(storage) {
  try {
    const bag = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (!bag) return null;
    const raw = bag.getItem(ZOOM_RESUME_KEY);
    if (!raw) return null;
    return serializeZoomResume(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearZoomResume(storage) {
  try {
    const bag = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (!bag) return;
    bag.removeItem(ZOOM_RESUME_KEY);
  } catch {}
}

/** Cosmos opens after moon/sun or a finished scale walk — not a flight+race grind. */
export function cosmosUnlockFromScale(state) {
  if (!state) return false;
  if (state.scaleJourneyComplete) return true;
  const v = state.scaleVisited || [];
  return v.includes("moon") || v.includes("sun") || v.includes("universe");
}
