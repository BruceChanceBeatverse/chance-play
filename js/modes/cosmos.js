import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, hud, fitCanvas, bindDrag, afterReveal, promptBox, toast, finishMode, questionHudLayout, HUD_LAYOUT } from "../ui.js";
import {
  LIGHT_MOON_S, LIGHT_SUN_S, PROXIMA_LY, SUN_SCHWARZSCHILD_KM,
  SGR_A_SOLAR_MASSES, SGR_A_SCHWARZSCHILD_KM, EARTH_MEAN_DIAMETER_KM, formatNumber, clamp,
} from "../geo.js";
import { drawGlobe, drawMoon, drawSun } from "../art.js";

export function cosmosLightDestinations() {
  return [
    { id: "moon", name: "月亮", seconds: LIGHT_MOON_S, note: "月亮离我们大约 38.4 万公里。光走完这段路，只要 1.28 秒。" },
    { id: "sun", name: "太阳", seconds: LIGHT_SUN_S, note: "太阳远多了。光要走 8 分 19 秒才到地球。" },
    { id: "proxima", name: "最近的恒星", seconds: PROXIMA_LY * 365.25 * 24 * 3600, note: "最近的恒星叫比邻星，光要走大约 4.25 年。光一年跑的路，就叫 1 光年。" },
  ];
}

export function cosmosArrivalTitle(dest) {
  const name = (dest && dest.name) || "目的地";
  return "光到了" + name;
}

export function cosmosArrivalTalk(dest) {
  const name = (dest && dest.name) || "目的地";
  const time = dest ? prettyTime(dest.seconds) : "";
  return "光到了" + name + "。这一段光要走 " + time + "。";
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
    body: "先想一想。先不要看上面的数字。",
    choices: [
      { label: "也变成 10 倍那么宽", ok: true },
      { label: "变成 100 倍那么宽" },
      { label: "还是一样宽" },
    ],
    okLine: "对。变重几倍，就变得几倍宽。",
    noLine: "变重几倍，黑洞就变得几倍宽。",
  };
}

export function cosmosStartButtonSpec(phase) {
  if (phase === "arrived") {
    return { label: "再看一次", className: "pill light-replay", phase: "arrived" };
  }
  if (phase === "playing") {
    return { label: "暂停", className: "pill", phase: "playing" };
  }
  if (phase === "paused") {
    return { label: "继续", className: "choice ok", phase: "paused" };
  }
  return { label: "开始", className: "choice ok", phase: "idle" };
}

/** Light should already be on the way when 光速快递 opens. */
export const COSMOS_LIGHT_STARTS_MOVING = true;

export function applyCosmosStartButton(btn, phase) {
  const spec = cosmosStartButtonSpec(phase);
  if (!btn) return spec;
  btn.className = spec.className;
  btn.textContent = spec.label;
  btn.dataset.phase = spec.phase;
  btn.setAttribute("aria-label", spec.label);
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

export function renderCosmos(app, { goHome, onDone } = {}) {
  if (!store.cosmosUnlocked()) {
    const s = screen();
    s.append(topbar({ title: "宇宙延伸", onBack: goHome }));
    s.append(el("div", { class: "end-card" },
      el("h2", { text: "这张地图还没打开" }),
      el("p", { text: "先在「我的飞行地图」和「速度大比拼」里玩到第 3 级，它就会作为新地图出现。" }),
      el("button", { class: "btn", onClick: goHome }, "回去玩"),
    ));
    app.replaceChildren(s);
    talk("这张地图还没打开。先在飞行地图和速度大比拼里玩到第三级。");
    return;
  }

  const s = screen();
  s.classList.add("mode-cosmos");
  s.append(topbar({ title: "宇宙延伸", sub: "光速快递 · 黑洞调节器", onBack: goHome }));
  const tabs = el("div", { class: "bottom-bar", style: { justifyContent: "center" } },
    el("button", { class: "btn", id: "tab-light" }, "光速快递"),
    el("button", { class: "btn ghost", id: "tab-hole" }, "黑洞调节器"),
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
      renderLight(stage, onDone, goHome);
    } else {
      tabs.querySelector("#tab-hole").className = "btn";
      tabs.querySelector("#tab-light").className = "btn ghost";
      renderHole(stage, onDone, goHome);
    }
  }
  tabs.querySelector("#tab-light").addEventListener("click", () => switchTab("light"));
  tabs.querySelector("#tab-hole").addEventListener("click", () => switchTab("hole"));
  renderLight(stage, onDone, goHome);
}

function renderLight(stage, onDone, goHome) {
  stage.replaceChildren();
  const canvas = el("canvas", { class: "fill", "aria-label": "光速快递" });
  stage.append(canvas);
  const board = hud([
    { label: "目的地", value: "月亮", tone: "cyan" },
    { label: "光要走", value: LIGHT_MOON_S.toFixed(2) + " 秒", tone: "" },
    { label: "已经走了", value: "0 秒", tone: "mint" },
  ]);
  stage.append(board);
  const dests = cosmosLightDestinations();
  let dest = dests[0];
  let t = 0, playing = false, done = false;
  const chips = el("div", { class: "bottom-bar", style: { justifyContent: "center" } });
  const startBtn = el("button", { id: "light-start", class: "choice ok", "aria-label": "开始" }, "开始");
  applyCosmosStartButton(startBtn, "playing");
  let finishedOnce = false;

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
    } }, d.name));
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
    ctx.fillText(dest.name, L, y + (dest.id === "sun" ? 84 : 58));
    ctx.fillText("地球", R, y + 58);
    const p = dest.seconds === 0 ? 1 : t / dest.seconds;
    const x = L + p * (R - L);
    ctx.fillStyle = "#fff4c2";
    ctx.shadowColor = "#f5c84c";
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    board.update([dest.name, prettyTime(dest.seconds), prettyTime(t)]);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  function finish() {
    done = true; playing = false;
    applyCosmosStartButton(startBtn, "arrived");
    if (finishedOnce) return;
    finishedOnce = true;
    talk(cosmosArrivalTalk(dest));
    const box = promptBox(cosmosArrivalTitle(dest), dest.note, [{ label: "下一步", kind: "ok" }], () => {
      box.remove();
      afterReveal("cosmos", () => finishMode(onDone, goHome), { prefer: cosmosCardForBeat(dest.id) });
    });
    stage.append(box);
    store.recordAnswer("cosmos", true);
  }

  talk("光已经从月亮出发了。到地球只要 1.28 秒。也可以换成太阳，或按暂停。");
  stage._cleanup = () => { running = false; cancelAnimationFrame(raf); };
}

function renderHole(stage, onDone, goHome) {
  stage.replaceChildren();
  const canvas = el("canvas", { class: "fill", "aria-label": "黑洞调节器" });
  stage.append(canvas);
  // Mass in solar masses, log slider from 1 to 4.3e6 (Sgr A*)
  let logM = 0; // 10^logM solar masses
  const minL = 0, maxL = Math.log10(SGR_A_SOLAR_MASSES);
  const board = hud([
    { label: "有多重", value: "1 个太阳", tone: "cyan" },
    { label: "有多宽", value: SUN_SCHWARZSCHILD_KM.toFixed(2) + " 公里", tone: "" },
    { label: "对照", value: "大约一座小山那么宽", tone: "mint" },
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
    if (rKm < 10) return "大约一座小山那么宽（太阳质量黑洞约 3 公里）";
    if (rKm < 200) return "大约一座大城市那么宽";
    if (rKm < 13000) return "比地球还宽（地球平均直径约 " + Math.round(EARTH_MEAN_DIAMETER_KM).toLocaleString("zh-CN") + " 公里）";
    if (rKm < 4e5) return "快到地球到月亮的距离了";
    if (rKm < 2e7) return "人马座 A* 大约 1,270 万公里";
    return "非常大";
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
        afterReveal("cosmos", () => finishMode(onDone, goHome), { prefer: "c-blackhole", force: true });
      });
      stage.append(box);
      talk(q.title);
    }
  });
  stage._cleanup = () => { running = false; cancelAnimationFrame(raf); };
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
