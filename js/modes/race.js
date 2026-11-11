import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, hud, promptBox, fitCanvas, afterReveal, offerContinue } from "../ui.js";
import { airportByCode, routeDistanceKm } from "../data.js";
import { formatKm, formatHours, clamp } from "../geo.js";

function tracks() {
  const p = store.get().profile;
  const tokyo = routeDistanceKm("PVG", "HND");
  const paris = routeDistanceKm("PVG", "CDG");
  return [
    { id: "school", name: "家到学校", km: p.schoolKm, assumption: true },
    { id: "airport", name: "开车去机场", km: p.cityAirportKm, assumption: true },
    { id: "tokyo", name: "上海 → 东京", km: tokyo, assumption: false },
    { id: "paris", name: "上海 → 巴黎", km: paris, assumption: false },
  ];
}

function pickTrack(level) {
  const all = tracks();
  if (level <= 1) return all[0];
  if (level === 2) return all[1];
  if (level === 3) return all[2];
  return all[level >= 5 ? 3 : 2];
}

function racersFor(level) {
  const all = store.get().racers;
  if (level <= 1) return all.filter((r) => r.id === "bike" || r.id === "car");
  if (level === 2) return all.filter((r) => r.id === "car" || r.id === "hsr" || r.id === "bike");
  return all;
}

/** CSS-pixel layout of the track. Every lane and the 起点/终点 labels
 *  must sit above a docked question card (promptTop) and the HUD. */
export function raceLaneLayout(w, h, { promptTop, hudTop } = {}) {
  const top = Math.max(100, Math.min(130, h * 0.12));
  const labelSpace = 28;
  const defaultClear = h < w ? 160 : 230;
  let ceiling = h - defaultClear;
  if (Number.isFinite(promptTop)) ceiling = Math.min(ceiling, promptTop - labelSpace);
  if (Number.isFinite(hudTop)) ceiling = Math.min(ceiling, hudTop - labelSpace);
  const bot = Math.max(top + 90, ceiling);
  return { top, bot, labelSpace, left: 220, right: w - 48 };
}

/** Child-facing assumption labels for the guess screen (not only after the race). */
export function raceChildCopy(track, racers) {
  const dist = track.name + " · " + formatKm(track.km) + (track.assumption ? "（假设）" : "");
  const speeds = (racers || []).map((r) => r.emoji + " " + r.kmh + " 公里/小时（假设）");
  const guessNote = track.assumption
    ? "先选一个，再看比赛。这段路的长度和速度都是假设值。"
    : "先选一个，再看比赛。速度是假设值。";
  return { dist, speeds, guessNote };
}

/** Name the route just raced — never say Tokyo after a Paris race. */
export function raceImpossibleNote(track) {
  if (!track || (track.id !== "tokyo" && track.id !== "paris")) return "";
  const dest = track.id === "paris" ? "巴黎" : "东京";
  return " 这也是为什么骑自行车其实去不了" + dest + "。";
}

export function racerById(id, racers) {
  const list = racers || [];
  return list.find((r) => r.id === id) || null;
}

/** Hours (and kid-facing days) for a solo bike (or walk) journey. */
export function bikeJourneyHours(km, kmh = 15) {
  const speed = Number(kmh) > 0 ? Number(kmh) : 15;
  const dist = Number(km) || 0;
  return dist / speed;
}

export function raceContinueStartsBikeJourney(action) {
  return !!(action && action.soloId === "bike");
}

export function renderRace(app, { goHome, onDone, trackId, allRacers = false, soloId = null } = {}) {
  const s = screen();
  s.classList.add("mode-race");
  const level = store.level("race");
  const track = tracks().find((t) => t.id === trackId) || pickTrack(level);
  const pack = store.get().racers;
  const solo = soloId ? racerById(soloId, pack) : null;
  const racers = solo ? [solo] : (allRacers ? pack : racersFor(level));
  const times = racers.map((r) => ({ ...r, hours: track.km / r.kmh }));
  times.sort((a, b) => a.hours - b.hours);
  const winner = times[0];

  const canvas = el("canvas", { class: "fill", "aria-label": "速度比赛" });
  s.append(canvas);
  const copy = raceChildCopy(track, racers);
  const destName = track.id === "paris" ? "巴黎" : track.id === "tokyo" ? "东京" : track.name;
  s.append(topbar({
    title: solo ? ("骑车去" + destName) : "速度大比拼",
    sub: copy.dist,
    onBack: goHome,
  }));
  const board = hud([
    { label: "这段路", value: formatKm(track.km), tone: "cyan" },
    { label: "最快的", value: "？", tone: "" },
    { label: "要多久", value: "先猜", tone: "mint" },
  ]);
  s.append(board);

  // Speed labels sit on the lanes so a question card cannot cover a legend.
  function racePrompt(title, body, choices, onPick) {
    return promptBox(title, body, choices, onPick, { dock: "bottom", compact: true });
  }


  let phase = "guess"; // guess | run | done
  let tRun = 0; // 0..1 animation clock, mapped so the winner finishes at t=1
  let running = true, raf = 0;
  let picked = null;

  function ask() {
    if (solo) {
      const hours = track.km / solo.kmh;
      const actual = hours;
      const choices = shuffle([
        { label: formatHours(actual), ok: true, value: actual },
        { label: formatHours(actual * 0.5), value: actual * 0.5 },
        { label: formatHours(actual * 2), value: actual * 2 },
      ]);
      const box = racePrompt("骑车去" + destName + "要多久？", "先猜几天，再看这一趟。速度是假设值。", choices, (c) => {
        picked = c;
        store.recordAnswer("race", !!c.ok);
        store.addPrediction({ mode: "race", guessed: c.value, actual, ratio: c.value / actual });
        box.remove();
        startRun();
      });
      s.append(box);
      talk("骑自行车去" + destName + "，大约 " + formatKm(track.km) + "，要多久？先猜。");
      return;
    }
    if (level <= 2) {
      const choices = racers.map((r) => ({ label: r.emoji + " " + r.name, id: r.id, ok: r.id === winner.id }));
      const box = racePrompt("谁先到？", copy.guessNote, choices, (c) => {
        picked = c;
        store.recordAnswer("race", !!c.ok);
        box.remove();
        startRun();
      });
      s.append(box);
      talk("这段路是" + track.name + "，大约 " + formatKm(track.km) + "。谁先到？");
    } else if (level <= 4) {
      const actual = winner.hours;
      const choices = shuffle([
        { label: formatHours(actual), ok: true, value: actual },
        { label: formatHours(actual * 2), value: actual * 2 },
        { label: formatHours(actual * 0.5), value: actual * 0.5 },
      ]);
      const box = racePrompt(winner.name + " 要多久？", "先猜一个时间，再看比赛。", choices, (c) => {
        picked = c;
        store.recordAnswer("race", !!c.ok);
        store.addPrediction({ mode: "race", guessed: c.value, actual, ratio: c.value / actual });
        box.remove();
        startRun();
      });
      s.append(box);
      talk("用" + winner.name + "跑完 " + track.name + "，要多久？先猜。");
    } else {
      // Level 5: given a time, infer speed.
      const targetH = track.id === "tokyo" ? 5 : 2;
      const need = track.km / targetH;
      const choices = shuffle([
        { label: Math.round(need) + " 公里/小时", ok: true, value: need },
        { label: Math.round(need / 2) + " 公里/小时", value: need / 2 },
        { label: Math.round(need * 2) + " 公里/小时", value: need * 2 },
      ]);
      const box = racePrompt("要在 " + formatHours(targetH) + " 内跑完，速度得是多少？",
        "距离 ÷ 时间 = 速度。这段路 " + formatKm(track.km) + "。", choices, (c) => {
        picked = c;
        store.recordAnswer("race", !!c.ok);
        store.addPrediction({ mode: "race", guessed: c.value, actual: need, ratio: c.value / need });
        box.remove();
        startRun();
      });
      s.append(box);
      talk("要在 " + formatHours(targetH) + " 内走完 " + formatKm(track.km) + "，速度得是多少？");
    }
  }

  function startRun() {
    phase = "run";
    tRun = 0;
    sfx.whoosh();
    talk("看好了，开始比。");
  }

  const draw = () => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#143a5c");
    sky.addColorStop(0.45, "#0b1a28");
    sky.addColorStop(1, "#071018");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Measure the docked question / HUD so every lane and 起点/终点 stay clear.
    const sr = s.getBoundingClientRect();
    let promptTop, hudTop;
    const promptEl = s.querySelector(".prompt");
    if (promptEl) promptTop = promptEl.getBoundingClientRect().top - sr.top;
    if (board) hudTop = board.getBoundingClientRect().top - sr.top;
    const { top, bot, left, right } = raceLaneLayout(w, h, { promptTop, hudTop });
    s.dataset.trackTop = String(top);
    s.dataset.trackBot = String(bot);
    const lanes = racers.length;
    const laneH = (bot - top) / lanes;

    // track
    for (let i = 0; i < lanes; i++) {
      const y = top + (i + 0.5) * laneH;
      ctx.fillStyle = i % 2 === 0 ? "rgba(20, 50, 70, 0.45)" : "rgba(12, 30, 44, 0.45)";
      ctx.fillRect(left - 16, y - laneH * 0.42, (right - left) + 32, laneH * 0.84);
      ctx.strokeStyle = "rgba(92,225,230,0.22)";
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      ctx.fillStyle = "#f4efe4";
      ctx.font = "700 15px -apple-system, PingFang SC, sans-serif";
      ctx.textAlign = "left";
      ctx.font = "700 13px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(racers[i].emoji + " " + racers[i].kmh + " 公里/小时", 18, y - 2);
      ctx.font = "700 12px -apple-system, PingFang SC, sans-serif";
      ctx.fillStyle = "#f5c84c";
      ctx.fillText("（假设）", 18, y + 14);
      ctx.fillStyle = "#f4efe4";
    }
    // start / finish
    ctx.strokeStyle = "#f5c84c";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right, top); ctx.lineTo(right, bot); ctx.stroke();
    ctx.fillStyle = "#f5c84c";
    ctx.font = "700 14px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("起点", left, bot + 22);
    ctx.fillText("终点", right, bot + 22);

    const maxH = Math.max(...racers.map((r) => track.km / r.kmh));
    const animT = phase === "run" || phase === "done" ? tRun : 0;
    // Winner reaches the end at animT=1. Time along the course is animT * winner.hours
    const simH = animT * winner.hours;

    racers.forEach((r, i) => {
      const hours = track.km / r.kmh;
      const frac = phase === "guess" ? 0 : clamp(simH / hours, 0, 1);
      const y = top + (i + 0.5) * laneH;
      const x = left + frac * (right - left);
      ctx.beginPath();
      ctx.fillStyle = r.color;
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#071018";
      ctx.font = "22px -apple-system";
      ctx.textAlign = "center";
      ctx.fillText(r.emoji, x, y + 8);
      if (phase !== "guess") {
        ctx.fillStyle = "#f4efe4";
        ctx.font = "600 14px -apple-system, PingFang SC, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(frac >= 1 ? formatHours(hours) : formatKm(frac * track.km), x + 22, y + 5);
      }
    });

    if (phase === "guess") {
      // A tiny preview crawl so the track is not frozen while guessing.
      tRun = (tRun + 0.00045) % 0.12;
    }
    if (phase === "run") {
      tRun = clamp(tRun + 0.0065, 0, 1);
      if (tRun >= 1) finish();
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  function finish() {
    if (phase === "done") return;
    phase = "done";
    board.update([formatKm(track.km), winner.emoji + " " + winner.name, formatHours(winner.hours)]);
    const note = track.assumption
      ? "这段路的长度是假设值。"
      : "按直线距离、不停歇的固定速度来算。真正路上没有这样一条直路。";
    const box = racePrompt(
      solo
        ? ("骑车去" + destName + "要 " + formatHours(winner.hours))
        : (winner.name + " 最先到，用了 " + formatHours(winner.hours)),
      note + raceImpossibleNote(track),
      [{ label: "看好了", kind: "ok" }],
      () => {
        box.remove();
        afterReveal("race", () => offerContinue(s, {
          title: solo ? "要这么多天" : "再比一次？",
          body: solo
            ? ("骑自行车去" + destName + "大约要 " + formatHours(winner.hours) + "。这是按假设速度、不停歇算的。也可以再比一次速度。")
            : (track.id === "paris"
              ? "可以再比一次，或者看看骑车去巴黎要多久。"
              : "可以加上飞机，或者骑车去东京看看要几天。"),
          tone: "ok",
          goHome,
          actions: solo
            ? [
                { label: "再看一次", kind: "ok", onClick: () => renderRace(app, { goHome, onDone, trackId: track.id, soloId: "bike" }) },
                { label: "加上飞机再比", onClick: () => renderRace(app, { goHome, onDone, trackId: track.id, allRacers: true }) },
              ]
            : [
                { label: "加上飞机再比", kind: "ok", onClick: () => renderRace(app, { goHome, onDone, trackId: track.id, allRacers: true }) },
                { label: track.id === "paris" ? "骑车去巴黎" : "骑车去东京", onClick: () => renderRace(app, { goHome, onDone, trackId: track.id === "paris" ? "paris" : "tokyo", soloId: "bike" }) },
                { label: track.id === "paris" ? "去东京比一比" : "去巴黎比一比", onClick: () => renderRace(app, { goHome, onDone, trackId: track.id === "paris" ? "tokyo" : "paris", allRacers: true }) },
              ],
        }));
      },
    );
    s.append(box);
    talk(solo
      ? ("骑自行车去" + destName + "要 " + formatHours(winner.hours) + "。")
      : (winner.name + "最先到，要 " + formatHours(winner.hours) + "。还可以再比一次。"));
  }

  ask();
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  app.replaceChildren(s);
  store.markModePlayed("race");
}

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
