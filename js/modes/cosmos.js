import { store } from "../store.js";
import { bi, UI } from "../i18n.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, hud, fitCanvas, bindDrag, afterReveal, promptBox, toast, questionHudLayout, HUD_LAYOUT } from "../ui.js";
import {
  LIGHT_MOON_S, LIGHT_SUN_S, PROXIMA_LY, SUN_SCHWARZSCHILD_KM,
  SGR_A_SOLAR_MASSES, SGR_A_SCHWARZSCHILD_KM, EARTH_MEAN_DIAMETER_KM, EARTH_MOON_KM, formatNumber, clamp,
} from "../geo.js";
import { drawGlobe, drawMoon, drawSun } from "../art.js";

export function cosmosLightDestinations() {
  return [
    { id: "moon", name: "月亮", nameEn: "the Moon", seconds: LIGHT_MOON_S, note: "月亮离我们大约 38.4 万公里。光走完这段路，只要 1.28 秒。", noteEn: "The Moon is about 384,000 km away. Light covers that in only 1.28 seconds." },
    { id: "sun", name: "太阳", nameEn: "the Sun", seconds: LIGHT_SUN_S, note: "太阳远多了。光要走 8 分 19 秒才到地球。", noteEn: "The Sun is much farther. Light takes 8 minutes 19 seconds to reach Earth." },
    { id: "proxima", name: "最近的恒星", nameEn: "the nearest star", seconds: PROXIMA_LY * 365.25 * 24 * 3600, note: "最近的恒星叫比邻星，光要走大约 4.25 年。光一年跑的路，就叫 1 光年。", noteEn: "The nearest star is Proxima Centauri. Light takes about 4.25 years. A light-year is how far light travels in one year." },
  ];
}

export function cosmosArrivalTitle(dest) {
  const name = (dest && dest.name) || "目的地";
  return "光从" + name + "到了地球";
}

export function cosmosArrivalTitleEn(dest) {
  const nameEn = (dest && dest.nameEn) || "the destination";
  return "Light from " + nameEn + " has reached Earth";
}

export function cosmosArrivalTalk(dest) {
  const name = (dest && dest.name) || "目的地";
  const nameEn = (dest && dest.nameEn) || "the destination";
  const time = dest ? prettyTime(dest.seconds) : "";
  return {
    zh: "光从" + name + "到了地球。这一段光要走 " + time + "。",
    en: "Light from " + nameEn + " has reached Earth. This stretch takes " + time + ".",
  };
}

export function cosmosCardForBeat(beat) {
  if (beat === "hole" || beat === "blackhole") return "c-blackhole";
  if (beat === "moon") return "c-moon";
  if (beat === "sun") return "c-sun";
  if (beat === "proxima") return "c-ly";
  return null;
}

export function cosmosHolePrompt() {
  return {
    title: "如果黑洞变重 10 倍，它会变得多宽？",
    titleEn: "If a black hole becomes 10 times heavier, how much wider does it get?",
    body: "先想一想。先不要看上面的数字。",
    bodyEn: "Think first. Don't look at the number above yet.",
    choices: [
      { label: "也变成 10 倍那么宽", labelEn: "It also becomes 10 times as wide", ok: true },
      { label: "变成 100 倍那么宽", labelEn: "It becomes 100 times as wide" },
      { label: "还是一样宽", labelEn: "It stays the same width" },
    ],
    okLine: "对。变重几倍，就变得几倍宽。",
    noLine: "变重几倍，黑洞就变得几倍宽。",
  };
}

export function cosmosStartButtonSpec(phase) {
  if (phase === "arrived") {
    return { label: "再看一次", labelEn: "Watch again", className: "pill light-replay", phase: "arrived" };
  }
  if (phase === "playing") {
    return { label: "暂停", labelEn: "Pause", className: "pill", phase: "playing" };
  }
  if (phase === "paused") {
    return { label: "继续", labelEn: "Continue", className: "choice ok", phase: "paused" };
  }
  return { label: "开始", labelEn: "Start", className: "choice ok", phase: "idle" };
}

/** Light should already be on the way when 光速快递 opens. */
export const COSMOS_LIGHT_STARTS_MOVING = true;

export function applyCosmosStartButton(btn, phase) {
  const spec = cosmosStartButtonSpec(phase);
  if (!btn) return spec;
  btn.className = spec.className;
  if (typeof btn.replaceChildren === "function") {
    btn.replaceChildren(bi(spec.label, spec.labelEn));
  } else {
    btn.textContent = spec.labelEn ? spec.label + "\n" + spec.labelEn : spec.label;
  }
  btn.dataset.phase = spec.phase;
  btn.setAttribute("aria-label", spec.labelEn ? spec.label + " / " + spec.labelEn : spec.label);
  return spec;
}


/** Landscape arrival card sits a little higher so HUD tiles stay fully clear. Portrait is unchanged. */
export const COSMOS_PROMPT_BOTTOM_LANDSCAPE = 140;
export const COSMOS_ARRIVAL_HUD_GAP = 16;

export function cosmosArrivalLayout(w, h) {
  const portrait = h > w;
  const hud = questionHudLayout(w, h, { items: 3 });
  const promptBottomOffset = portrait ? HUD_LAYOUT.promptBottomPortrait : COSMOS_PROMPT_BOTTOM_LANDSCAPE;
  const promptBottom = h - promptBottomOffset;
  return {
    portrait,
    hudTop: hud.hudTop,
    promptBottom,
    gap: hud.hudTop - promptBottom,
    promptBottomOffset,
  };
}

export function renderCosmos(app, { goHome, onDone, destId, tab, forceOpen } = {}) {
  const back = typeof onDone === "function" ? onDone : goHome;
  const open = forceOpen || store.cosmosUnlocked();
  if (!open) {
    const s = screen();
    s.append(topbar({ title: { zh: "宇宙延伸", en: "Cosmos" }, onBack: back }));
    s.append(el("div", { class: "end-card" },
      el("h2", {}, UI.lockedMap),
      el("p", {}, { zh: "先走到月亮或太阳，或走完整条尺度之旅，就可以看光要走多久，也可以看黑洞。", en: "Walk to the Moon or the Sun, or finish the scale journey, and you can see how long light takes, and look at black holes." }),
      el("button", { class: "btn", onClick: back }, UI.goBackPlay),
    ));
    app.replaceChildren(s);
    talk("这张地图还没打开。先走到月亮或太阳，或走完整条尺度之旅。", "This map is not open yet. First walk to the Moon or the Sun, or finish the scale journey.");
    return;
  }

  const s = screen();
  s.classList.add("mode-cosmos");
  s.append(topbar({ title: { zh: "宇宙延伸", en: "Cosmos" }, sub: { zh: "光速快递 · 黑洞调节器", en: "Light post · Black-hole dial" }, onBack: back }));
  const tabs = el("div", { class: "bottom-bar", style: { justifyContent: "center" } },
    el("button", { class: "btn", id: "tab-light" }, UI.lightPost),
    el("button", { class: "btn ghost", id: "tab-hole" }, UI.blackHole),
  );
  const stage = el("div", { class: "stage" });
  s.append(stage, tabs);
  app.replaceChildren(s);
  store.markModePlayed("cosmos");

  function switchTab(which) {
    stage.querySelectorAll(".prompt").forEach((n) => n.remove());
    if (typeof stage._cleanup === "function") {
      try { stage._cleanup(); } catch {}
      stage._cleanup = null;
    }
    if (which === "light") {
      tabs.querySelector("#tab-light").className = "btn";
      tabs.querySelector("#tab-hole").className = "btn ghost";
      renderLight(stage, onDone, goHome, destId);
    } else {
      tabs.querySelector("#tab-hole").className = "btn";
      tabs.querySelector("#tab-light").className = "btn ghost";
      renderHole(stage, onDone, goHome);
    }
  }
  tabs.querySelector("#tab-light").addEventListener("click", () => switchTab("light"));
  tabs.querySelector("#tab-hole").addEventListener("click", () => switchTab("hole"));
  renderLight(stage, onDone, goHome, destId);
}

function renderLight(stage, onDone, goHome, destId) {
  stage.replaceChildren();
  const canvas = el("canvas", { class: "fill", "aria-label": "光速快递 / Light post" });
  stage.append(canvas);
  const board = hud([
    { label: "目的地", labelEn: "Destination", value: "月亮", tone: "cyan" },
    { label: "光要走", labelEn: "Light takes", value: LIGHT_MOON_S.toFixed(2) + " 秒", tone: "" },
    { label: "已经走了", labelEn: "Time so far", value: "0 秒", tone: "mint" },
  ]);
  stage.append(board);
  const dests = cosmosLightDestinations();
  let dest = dests.find((d) => d.id === destId) || dests[0];
  let t = 0, playing = false, done = false;
  const chips = el("div", { class: "bottom-bar", style: { justifyContent: "center" } });
  const startBtn = el("button", { id: "light-start", class: "choice ok", "aria-label": "开始 / Start" }, bi("开始", "Start"));
  applyCosmosStartButton(startBtn, "playing");

  function clearArrivalUi() {
    stage.querySelectorAll(".prompt").forEach((n) => n.remove());
  }

  function startLight(reset) {
    if (reset) t = 0;
    playing = true;
    done = false;
    applyCosmosStartButton(startBtn, "playing");
    sfx.whoosh();
  }

  for (const d of dests) {
    chips.append(el("button", { class: "pill", onClick: () => {
      dest = d;
      done = false;
      // Switching destination must drop a leftover arrival dialog (e.g. the Sun card).
      clearArrivalUi();
      startLight(true);
      talk("光从" + d.name + "到地球，要 " + prettyTime(d.seconds) + "。");
    } }, d.nameEn ? { zh: d.name, en: d.nameEn } : d.name));
  }
  const onStartBtn = () => {
    if (playing) {
      playing = false;
      applyCosmosStartButton(startBtn, "paused");
      return;
    }
    const atEnd = t >= dest.seconds && dest.seconds > 0;
    startLight(atEnd || startBtn.dataset.phase === "arrived");
  };
  startBtn.addEventListener("click", onStartBtn);
  chips.append(startBtn);
  stage.append(chips);
  // Already moving on open — the child should see light on the way, not a still frame.
  t = 0;
  playing = true;
  done = false;

  let running = true, raf = 0, last = performance.now();
  const draw = (now) => {
    if (!running) return;
    const dt = (now - last) / 1000; last = now;
    // Scale playback: moon in real-time (1.28s), sun sped 40× (so ~12.5s), proxima logarithmic / symbolic.
    let rate = 1;
    if (dest.id === "sun") rate = 40;
    if (dest.id === "proxima") rate = dest.seconds / 12; // 12 second symbol of 4.25 years
    if (playing) t = Math.min(dest.seconds, t + dt * rate);
    if (playing && t >= dest.seconds && !done) finish();

    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, w, h);
    // stars
    ctx.fillStyle = "#f4efe4";
    for (let i = 0; i < 60; i++) {
      const x = ((i * 97) % w), y = ((i * 53) % (h - 160));
      ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    const y = h * 0.42;
    const L = dest.id === "sun" ? 110 : 90, R = w - 90;
    ctx.strokeStyle = "rgba(245,200,76,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    // Bodies suggest scale: Moon clearly smaller than Earth, Sun clearly larger.
    // True ratios (Moon 0.27, Sun ~109) cannot all fit; we keep the order obvious.
    const earthR = dest.id === "sun" ? 22 : 36;
    if (dest.id === "moon") drawMoon(ctx, L, y, Math.max(10, earthR * 0.27));
    else if (dest.id === "sun") drawSun(ctx, L, y, 64);
    else {
      ctx.fillStyle = "#ff7a59";
      ctx.beginPath(); ctx.arc(L, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,122,89,0.25)";
      ctx.beginPath(); ctx.arc(L, y, 22, 0, Math.PI * 2); ctx.fill();
    }
    drawGlobe(ctx, R, y, earthR, { lonC: 125, latC: 28 });
    ctx.fillStyle = "#f4efe4";
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    const destY = y + (dest.id === "sun" ? 84 : 58);
    ctx.fillText(dest.name, L, destY);
    if (dest.nameEn) {
      ctx.font = "650 13px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(dest.nameEn, L, destY + 16);
      ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    }
    ctx.fillText("地球", R, y + 58);
    ctx.font = "650 13px -apple-system, PingFang SC, sans-serif";
    ctx.fillText("Earth", R, y + 74);
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    const p = dest.seconds === 0 ? 1 : t / dest.seconds;
    const x = L + p * (R - L);
    ctx.fillStyle = "#fff4c2";
    ctx.shadowColor = "#f5c84c";
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    board.update([
      dest.nameEn ? { zh: dest.name, en: dest.nameEn } : dest.name,
      prettyTime(dest.seconds),
      prettyTime(t),
    ]);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  function finish() {
    done = true; playing = false;
    applyCosmosStartButton(startBtn, "arrived");
    // Every destination (moon, sun, nearest star) gets its own arrival title,
    // including after switching away from the moon or pressing 再看一次.
    clearArrivalUi();
    talk(cosmosArrivalTalk(dest));
    const box = promptBox({ zh: cosmosArrivalTitle(dest), en: cosmosArrivalTitleEn(dest) }, { zh: dest.note, en: dest.noteEn }, [{ label: "下一步", labelEn: "Next", kind: "ok" }], () => {
      box.remove();
      afterReveal("cosmos", () => {
        talk(cosmosStayTalk());
      }, { prefer: cosmosCardForBeat(dest.id) });
    });
    stage.append(box);
    store.recordAnswer("cosmos", true);
  }

  talk("光已经从月亮出发了。到地球只要 1.28 秒。也可以换成太阳，或按暂停。");
  stage._cleanup = () => { running = false; cancelAnimationFrame(raf); };
}

export function blackHoleCompare(rKm, earthKm = EARTH_MEAN_DIAMETER_KM) {
  const r = Number(rKm);
  const earth = Number(earthKm) || 12742;
  if (!(r > 0)) return { zh: "—", en: "—" };
  if (r < 10) return {
    zh: "大约一座小山那么宽（太阳质量黑洞约 3 公里）",
    en: "About as wide as a small hill (a one-sun black hole is about 3 km)",
  };
  if (r < 200) return {
    zh: "大约一座大城市那么宽",
    en: "About as wide as a big city",
  };
  if (r < earth) return {
    zh: "还不到地球那么宽（地球平均直径约 " + Math.round(earth).toLocaleString("zh-CN") + " 公里）",
    en: "Not as wide as Earth yet (Earth's mean diameter is about " + Math.round(earth).toLocaleString("en-US") + " km)",
  };
  const moon = Number.isFinite(Number(EARTH_MOON_KM)) ? Number(EARTH_MOON_KM) : 384400;
  const moonZh = "月亮大约 38.4 万公里";
  const moonEn = "the Moon is about 384,000 km away";
  // Wider than Earth but clearly short of the Moon (~0.7 × 384,400 ≈ 269,000 km).
  if (r < moon * 0.7) return {
    zh: "比地球还宽（地球平均直径约 " + Math.round(earth).toLocaleString("zh-CN") + " 公里），但还不到地球到月亮那么远",
    en: "Wider than Earth (mean diameter about " + Math.round(earth).toLocaleString("en-US") + " km), but still well short of the Earth–Moon distance",
  };
  if (r <= moon * 1.2) return {
    zh: "快到地球到月亮的距离了（" + moonZh + "）",
    en: "Getting close to the distance from Earth to the Moon (" + moonEn + ")",
  };
  if (r < 2e7) return {
    zh: "已经比地球到月亮的距离还远（" + moonZh + "）",
    en: "Already farther than the Earth–Moon distance (" + moonEn + ")",
  };
  return { zh: "非常大", en: "Very large" };
}

function renderHole(stage, onDone, goHome) {
  stage.replaceChildren();
  const canvas = el("canvas", { class: "fill", "aria-label": "黑洞调节器" });
  stage.append(canvas);
  // Mass in solar masses, log slider from 1 to 4.3e6 (Sgr A*)
  let logM = 0; // 10^logM solar masses
  const minL = 0, maxL = Math.log10(SGR_A_SOLAR_MASSES);
  const board = hud([
    { label: "有多重", labelEn: "Mass", value: "1 个太阳", tone: "cyan" },
    { label: "有多宽", labelEn: "Width", value: SUN_SCHWARZSCHILD_KM.toFixed(2) + " 公里", tone: "" },
    { label: "对照", labelEn: "Compare", value: blackHoleCompare(SUN_SCHWARZSCHILD_KM).zh, tone: "mint" },
  ]);
  stage.append(board);
  const sliderWrap = el("div", { class: "bottom-bar", style: { flexDirection: "column", alignItems: "stretch" } },
    el("input", { type: "range", min: "0", max: "1000", value: "0", id: "mass", style: { width: "100%", height: "44px" } }),
    el("div", { style: { textAlign: "center", color: "var(--muted)" } }, "向右拖，看黑洞变得多大"),
  );
  stage.append(sliderWrap);
  const range = sliderWrap.querySelector("#mass");
  range.addEventListener("input", () => {
    logM = minL + (range.value / 1000) * (maxL - minL);
  });

  function compare(rKm) {
    return blackHoleCompare(rKm).zh;
  }

  let running = true, raf = 0;
  const draw = () => {
    if (!running) return;
    const mass = Math.pow(10, logM);
    const rKm = mass * SUN_SCHWARZSCHILD_KM;
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.42;
    // Scale radius visually on a log scale so 3 km and 12.7e6 km both fit.
    const logR = Math.log10(Math.max(0.3, rKm));
    const rad = 20 + (logR - Math.log10(2.95)) / (Math.log10(SGR_A_SCHWARZSCHILD_KM) - Math.log10(2.95)) * Math.min(w, h) * 0.28;
    // accretion disk
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "#f5c84c";
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(0, 0, rad * 1.55, rad * 0.45, 0.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(0, 0, Math.max(8, rad), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(92,225,230,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    const massLabel = mass >= 1e6
      ? (mass / 1e6).toFixed(2).replace(/\.00$/, "") + " 百万个太阳"
      : mass >= 1000
        ? formatNumber(Math.round(mass)) + " 个太阳"
        : mass.toFixed(mass >= 10 ? 0 : 1) + " 个太阳";
    const hideHint = !!stage.querySelector(".prompt");
    board.update([
      hideHint ? "？" : massLabel,
      hideHint ? "？" : formatNumber(rKm, rKm >= 100 ? 0 : 2) + " 公里",
      hideHint ? "？" : compare(rKm),
    ]);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  talk("向右拖，看黑洞变大。太阳那么重的黑洞，大约 3 公里宽。");

  let asked = false;
  range.addEventListener("change", () => {
    if (asked) return;
    if (logM > 2) {
      asked = true;
      const q = cosmosHolePrompt();
      const box = promptBox(q.title, q.body, q.choices, (c) => {
        store.recordAnswer("cosmos", !!c.ok);
        box.remove();
        talk(c.ok ? q.okLine : q.noLine);
        afterReveal("cosmos", () => {
          talk("还可以再拉拉看，或去光速快递。");
        }, { prefer: "c-blackhole", force: true });
      });
      stage.append(box);
      talk(q.title);
    }
  });
  stage._cleanup = () => { running = false; cancelAnimationFrame(raf); };
}

export const COSMOS_STAY_AFTER_CARD = true;

export function cosmosAfterArrivalAction() {
  return "stay";
}

export function cosmosStayTalk() {
  return "还可以把光送到太阳，或最近的恒星。也可以去看黑洞。";
}

function prettyTime(s) {
  if (s < 60) return s.toFixed(s < 10 ? 2 : 1) + " 秒";
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = Math.round(s - m * 60);
    return m + " 分 " + sec + " 秒";
  }
  const days = s / 86400;
  if (days < 400) return (days / 365.25).toFixed(2) + " 年";
  return (s / (365.25 * 86400)).toFixed(2) + " 年";
}
