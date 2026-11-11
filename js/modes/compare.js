import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, afterReveal, promptBox, offerContinue, markAnswer } from "../ui.js";
import { routeDistanceKm } from "../data.js";
import { formatKm, formatNumber } from "../geo.js";

export function comparePairsForLevel(level) {
  const tokyo = routeDistanceKm("PVG", "HND");
  const paris = routeDistanceKm("PVG", "CDG");
  const racers = store.get().racers;
  const hikes = store.get().hikes;
  const sheshan = hikes.find((h) => h.id === "sheshan")?.peakM || 99;
  const huang = hikes.find((h) => h.id === "huangshan")?.peakM || 1864;
  const fuji = hikes.find((h) => h.id === "fuji")?.peakM || 3776;
  const bike = racers.find((r) => r.id === "bike");
  const car = racers.find((r) => r.id === "car");
  const hsr = racers.find((r) => r.id === "hsr");
  const plane = racers.find((r) => r.id === "plane");

  const pool = {
    1: [
      { kind: "更快", a: { name: bike.name, emoji: bike.emoji, value: bike.kmh, unit: " 公里/小时", assumed: true }, b: { name: car.name, emoji: car.emoji, value: car.kmh, unit: " 公里/小时", assumed: true } },
      { kind: "更高", a: { name: "佘山", emoji: "⛰️", value: sheshan, unit: " 米" }, b: { name: "黄山", emoji: "🏔️", value: huang, unit: " 米" } },
    ],
    2: [
      { kind: "更长", a: { name: "去东京", emoji: "✈️", value: tokyo, unit: " 公里" }, b: { name: "去巴黎", emoji: "✈️", value: paris, unit: " 公里" } },
      { kind: "更快", a: { name: hsr.name, emoji: hsr.emoji, value: hsr.kmh, unit: " 公里/小时", assumed: true }, b: { name: plane.name, emoji: plane.emoji, value: plane.kmh, unit: " 公里/小时", assumed: true } },
    ],
    3: [
      { kind: "更高", a: { name: "黄山", emoji: "🏔️", value: huang, unit: " 米" }, b: { name: "富士山", emoji: "🗻", value: fuji, unit: " 米" } },
    ],
    4: [
      { kind: "更快", a: { name: car.name, emoji: car.emoji, value: car.kmh, unit: " 公里/小时", assumed: true }, b: { name: hsr.name, emoji: hsr.emoji, value: hsr.kmh, unit: " 公里/小时", assumed: true } },
    ],
    5: [
      { kind: "更快", a: { name: "飞机 A", emoji: "✈️", value: 850, unit: " 公里/小时", assumed: true }, b: { name: "飞机 B", emoji: "🛫", value: 850 * 1.1, unit: " 公里/小时", assumed: true } },
    ],
  };
  return pool[Math.min(5, Math.max(1, level))] || pool[1];
}

function pairFor(level) {
  const list = comparePairsForLevel(level);
  return list[Math.floor(Math.random() * list.length)];
}

/** Revealed compare values: assumed figures keep 「假设」; sourced ones do not. */
export function compareValueText(side) {
  const core = formatNumber(side.value) + side.unit;
  return side.assumed ? core + "（假设）" : core;
}

export function renderCompare(app, { goHome, onDone } = {}) {
  const s = screen();
  s.classList.add("mode-compare");
  const level = store.level("compare");
  const pair = pairFor(level);
  const hi = pair.a.value >= pair.b.value ? "a" : "b";
  const lo = hi === "a" ? "b" : "a";
  const ratio = pair[hi].value / pair[lo].value;

  s.append(topbar({ title: "谁" + pair.kind + "？", sub: "先看一看，再选", onBack: goHome }));
  const stage = el("div", { class: "compare-flash" });
  const btnA = el("button", { class: "cmp", "data-side": "a" },
    el("div", { class: "emoji" }, pair.a.emoji),
    el("div", { class: "name" }, pair.a.name),
    el("div", { class: "val", style: { opacity: "0" } }, compareValueText(pair.a)),
  );
  const btnB = el("button", { class: "cmp", "data-side": "b" },
    el("div", { class: "emoji" }, pair.b.emoji),
    el("div", { class: "name" }, pair.b.name),
    el("div", { class: "val", style: { opacity: "0" } }, compareValueText(pair.b)),
  );
  // Visible magnitude: the picture itself must show the difference
  // (Huangshan much taller than Sheshan; car clearly faster than bike).
  const maxV = Math.max(pair.a.value, pair.b.value);
  function visual(side, btn) {
    const v = pair[side].value;
    const rel = Math.max(0.12, v / maxV);
    const art = el("div", { class: "cmp-art", "data-kind": pair.kind });
    const glyph = compareGlyphSize(rel);
    if (pair.kind === "更高") {
      const hill = el("div", { class: "cmp-hill", style: { height: glyph.hillPx + "px" } });
      art.append(hill);
    } else if (pair.kind === "更快") {
      const bar = el("div", { class: "cmp-speed" },
        el("div", { class: "cmp-speed-fill", style: { width: Math.round(rel * 100) + "%" } }),
      );
      art.append(bar);
    } else {
      const bar = el("div", { class: "cmp-len" },
        el("div", { class: "cmp-len-fill", style: { width: Math.round(rel * 100) + "%" } }),
      );
      art.append(bar);
    }
    btn.insertBefore(art, btn.querySelector(".name"));
    const em = btn.querySelector(".emoji");
    if (em) em.style.fontSize = glyph.emojiPx + "px";
  }
  visual("a", btnA);
  visual("b", btnB);
  stage.append(btnA, btnB);
  s.append(stage);

  // Brief flash of values at higher levels? Design: flash then choose, then slow-mo explain.
  // For a 6-year-old we show names/icons first, values after the choice.
  let chosen = false;
  function pick(side) {
    if (chosen) return;
    chosen = true;
    sfx.tap();
    const ok = side === hi;
    store.recordAnswer("compare", ok);
    store.addCompare({ ratio, correct: ok });
    btnA.querySelector(".val").style.opacity = "1";
    btnB.querySelector(".val").style.opacity = "1";
    (side === "a" ? btnA : btnB).classList.add("win");
    s.classList.add("revealed");
    const times = ratio.toFixed(ratio >= 2 ? 1 : 2).replace(/\.0$/, "");
    const box = promptBox(
      ok ? "选对了" : "再看一眼",
      pair[hi].name + " 更" + pair.kind.slice(1) + "，大约是 " + pair[lo].name + " 的 " + times + " 倍。",
      [{ label: "下一步", kind: "ok" }],
      () => { box.remove(); afterReveal("compare", () => offerContinue(s, { title: "再比一对？", body: "还可以再看一座山，或两条航线。", tone: "ok", goHome, actions: [{ label: "再来一对", kind: "ok", onClick: () => renderCompare(app, { goHome, onDone }) }] })); },
    );
    s.append(box);
    talk((ok ? "对了。" : "其实是" + pair[hi].name + "。") + "差大约 " + times + " 倍。");
  }
  btnA.addEventListener("click", () => pick("a"));
  btnB.addEventListener("click", () => pick("b"));
  talk("谁" + pair.kind + "？左边是" + pair.a.name + "，右边是" + pair.b.name + "。选一个。");
  app.replaceChildren(s);
  store.markModePlayed("compare");
}

/** Slightly larger glyphs so the cards are not mostly empty padding. */
export function compareGlyphSize(rel) {
  const r = Math.max(0, Math.min(1, Number(rel) || 0));
  return {
    emojiPx: Math.round(60 + r * 48),
    hillPx: Math.round(48 + r * 160),
  };
}

/** After a pick, portrait docks the explanation at the bottom and keeps
 *  revealed values in the card body above it. Landscape keeps the existing dock. */
export const COMPARE_REVEAL_PROMPT_BOTTOM_PORTRAIT = 20;
export const COMPARE_REVEAL_CONTENT_GAP = 16;

export function compareRevealLayout(w, h, { promptHeight, valHeight = 28 } = {}) {
  const portrait = h > w;
  if (!portrait) {
    const ph = promptHeight ?? 150;
    const prompt = { top: h - 118 - ph, bottom: h - 118 };
    const content = { top: 100, bottom: prompt.top - 16 };
    return {
      portrait: false,
      prompt,
      content,
      val: { top: content.bottom - valHeight, bottom: content.bottom },
      gap: prompt.top - content.bottom,
      nextInPrompt: true,
    };
  }
  const ph = promptHeight ?? 200;
  const prompt = {
    top: h - COMPARE_REVEAL_PROMPT_BOTTOM_PORTRAIT - ph,
    bottom: h - COMPARE_REVEAL_PROMPT_BOTTOM_PORTRAIT,
  };
  const content = { top: 128, bottom: prompt.top - COMPARE_REVEAL_CONTENT_GAP };
  return {
    portrait: true,
    prompt,
    content,
    val: { top: content.bottom - valHeight, bottom: content.bottom },
    gap: prompt.top - content.bottom,
    nextInPrompt: true,
  };
}
