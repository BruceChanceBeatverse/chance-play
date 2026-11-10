import { store } from "./store.js";
import { talk, unlockAudio, sfx, stopTalk } from "./audio.js";
import { el, screen, toast, fitCanvas } from "./ui.js";
import { fillSky, drawSoftClouds, paintCardArt } from "./art.js";
import { TOMORROW_QUESTIONS, SESSION_MINUTES, SESSION_WINDDOWN_MIN } from "./data.js";

let watchTimer = 0;

export function startSessionWatch(goEnd) {
  stopSessionWatch();
  watchTimer = setInterval(() => {
    const st = store.ensureToday();
    if (st.endedToday) return;
    if ((st.todayMinutes || 0) >= SESSION_MINUTES) goEnd();
  }, 10000);
}

export function stopSessionWatch() {
  if (watchTimer) clearInterval(watchTimer);
  watchTimer = 0;
}

export function shouldWindDown() {
  const st = store.ensureToday();
  return !st.endedToday && (st.todayMinutes || 0) >= SESSION_WINDDOWN_MIN;
}

export function renderSessionEnd(app, go) {
  store.ensureToday();
  store.patch({ endedToday: true });
  store.recordSession({ endedBy: "winddown" });
  const qs = TOMORROW_QUESTIONS;
  const idx = (new Date(store.todayKey()).getDate() || 1) % qs.length;
  const q = qs[idx];
  store.patch({ tomorrowQuestionId: q.id, lastTomorrowAt: store.todayKey() });

  const s = screen();
  const card = el("div", { class: "end-card" },
    el("h2", { text: "今天就到这儿" }),
    el("p", { text: q.zh }),
    el("p", { style: { color: "var(--muted)", fontSize: "18px" }, text: "按住按钮，跟爸爸说一句“我发现……”" }),
  );
  const rec = el("button", { class: "rec-btn", "aria-label": "按住录音" }, "按住说");
  card.append(rec);
  const dad = store.get().parentReplies.filter((r) => (r.forDate === store.todayKey()) || true).slice(-1)[0];
  if (dad && dad.text) {
    card.append(el("p", { style: { marginTop: "18px" } }, "爸爸说：" + dad.text));
  }
  card.append(el("button", { class: "choice", style: { marginTop: "22px" }, onClick: () => go("home") }, "好"));
  s.append(card);
  app.replaceChildren(s);
  talk("今天就到这儿。" + q.zh);

  let media, recorder, chunks = [];
  rec.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    unlockAudio();
    rec.classList.add("rec");
    rec.textContent = "正在听…";
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      recorder = new MediaRecorder(media, { mimeType: mime });
      chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const dataUrl = await blobToDataUrl(blob);
        store.addRecording({ id: "r-" + Date.now(), at: Date.now(), date: store.todayKey(), duration: blob.size, dataUrl, note: "我发现……" });
        toast("已经收好，只留在这台 iPad 里");
        rec.textContent = "收好了";
      };
      recorder.start();
    } catch {
      rec.classList.remove("rec");
      rec.textContent = "没法录音";
      toast("没有麦克风权限的话，明天再试也行");
    }
  });
  const stop = () => {
    rec.classList.remove("rec");
    if (recorder && recorder.state === "recording") recorder.stop();
  };
  rec.addEventListener("pointerup", stop);
  rec.addEventListener("pointercancel", stop);
}

export function renderTeach(app, go) {
  const s = screen();
  const st = store.get();
  const lastCards = st.cards.slice(-3);
  const card = el("div", { class: "end-card" },
    el("h2", { text: "今天你来当老师" }),
    el("p", { text: "把这几天发现的，讲给爸爸听。" }),
  );
  if (lastCards.length) {
    for (const c of lastCards) {
      card.append(el("p", {}, c.title + " · " + c.value));
    }
  } else {
    card.append(el("p", { style: { color: "var(--muted)" } }, "先去玩几天，卡片会自己出现。"));
  }
  card.append(el("button", { class: "choice ok", style: { marginTop: "16px" }, onClick: () => go("mode", "flight") }, "带爸爸飞一趟"));
  card.append(el("button", { class: "choice", style: { marginTop: "8px" }, onClick: () => go("home") }, "回主页"));
  s.append(card);
  app.replaceChildren(s);
  talk("今天你来当老师。把你发现的讲给爸爸听。");
}

export function renderCards(app, go) {
  const s = screen();
  s.classList.add("cards-page");
  const canvas = el("canvas", { class: "fill", "aria-hidden": "true" });
  const ui = el("div", { class: "cards-ui" },
    el("button", { class: "icon-btn", onClick: () => go("home"), style: { marginBottom: "12px" } }, "←"),
    el("h1", { text: "我的世界卡" }),
    el("p", { text: "玩的时候偶尔会掉下来。不是积分，也不是打卡奖励。" }),
    el("div", { class: "bag", id: "bag" }),
  );
  s.append(canvas, ui);
  const bag = ui.querySelector("#bag");
  const cards = store.get().cards;
  if (!cards.length) bag.append(el("p", { text: "还没有卡片。去飞一趟，也许会掉下来。" }));
  for (const c of cards) {
    const art = el("canvas", { class: "card-art", "aria-hidden": "true" });
    const card = el("div", { class: "card-drop", style: { width: "100%", aspectRatio: "4/3", animation: "none" } },
      art,
      el("div", { class: "t" }, c.title),
      el("div", { class: "v" }, c.value),
    );
    bag.append(card);
    requestAnimationFrame(() => paintCardArt(art, c));
  }
  let running = true, raf = 0, t0 = performance.now();
  const tick = (now) => {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas);
    fillSky(ctx, w, h, { top: "#143a5c", mid: "#0c2740", bot: "#071018" });
    drawSoftClouds(ctx, w, h, (now - t0) / 1000);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  s._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  app.replaceChildren(s);
}

function blobToDataUrl(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}
